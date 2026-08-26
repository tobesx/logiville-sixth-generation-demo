require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { VoiceResponse } = require('twilio').twiml;

const { initiateCallSingle } = require('./orchestrator');
const { handleStatus, handleAmd } = require('./call-handler');
const { handleMediaStream } = require('./realtime-bridge');
const { handleLogin, requireAuth } = require('./auth');
const db = require('./db');

const app = express();

// WEB_ORIGIN is een komma-gescheiden lijst; zonder waarde alleen de Vite
// dev-server, zodat een vergeten variabele in productie niet stilzwijgend
// iedereen binnenlaat.
const allowedOrigins = (process.env.WEB_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Auth ---

app.post('/api/auth/login', handleLogin);

// Alles onder /api hierna vereist een token. De /voice/*-webhooks staan
// bewust buiten deze middleware: die roept Twilio aan, niet de browser.
app.use('/api', requireAuth);

// --- REST API ---

app.post('/api/runs', async (req, res) => {
  try {
    const { total } = req.body;
    if (!total || total < 1) return res.status(400).json({ error: 'total required' });
    const runId = await db.createRun(total);
    res.json({ runId });
  } catch (err) {
    console.error('createRun error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/runs/:runId', async (req, res) => {
  try {
    const run = await db.getRun(req.params.runId);
    if (!run) return res.status(404).json({ error: 'not found' });
    res.json(run);
  } catch (err) {
    console.error('getRun error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/outbound/call', async (req, res) => {
  try {
    const { person, runId } = req.body;
    const result = await initiateCallSingle(person, runId);
    res.json(result);
  } catch (err) {
    console.error('Single call error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Twilio webhooks ---

app.post('/voice/start', (req, res) => {
  const { personId } = req.query;
  const wsUrl = `${process.env.BASE_URL.replace('https://', 'wss://')}/media-stream`;
  const twiml = new VoiceResponse();
  const connect = twiml.connect();
  const stream = connect.stream({ url: wsUrl });
  stream.parameter({ name: 'personId', value: personId });
  res.type('text/xml').send(twiml.toString());
});

// --- People ---

app.get('/api/people', async (req, res) => {
  try {
    res.json(await db.listPeople());
  } catch (err) {
    console.error('listPeople error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/people', async (req, res) => {
  try {
    const { name, phone, shift_start_at, shift_end_at } = req.body;
    if (!name || !phone || !shift_start_at || !shift_end_at) {
      return res.status(400).json({ error: 'name, phone, shift_start_at en shift_end_at zijn verplicht' });
    }
    res.status(201).json(await db.createPerson(req.body));
  } catch (err) {
    console.error('createPerson error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/people/:id', async (req, res) => {
  try {
    const person = await db.updatePerson(req.params.id, req.body);
    if (!person) return res.status(404).json({ error: 'not found' });
    res.json(person);
  } catch (err) {
    console.error('updatePerson error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/people/:id', async (req, res) => {
  try {
    const removed = await db.deletePerson(req.params.id);
    if (!removed) return res.status(404).json({ error: 'not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error('deletePerson error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/voice/status', handleStatus);
app.post('/voice/amd', handleAmd);

// --- WebSocket server (Twilio Media Streams) ---

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/media-stream') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      handleMediaStream(ws);
    });
  } else {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3001;
db.init()
  .then(() => server.listen(PORT, () => {
    console.log(`Sixth Generation voice server → http://localhost:${PORT}`);
    console.log(`Public URL: ${process.env.BASE_URL || '(BASE_URL niet ingesteld)'}`);
  }))
  .catch(err => {
    console.error('[DB] Init failed, exiting:', err.message);
    process.exit(1);
  });
