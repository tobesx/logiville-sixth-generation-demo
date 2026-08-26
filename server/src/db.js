const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS runs (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      total      INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'in_progress',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id         UUID REFERENCES runs(id) ON DELETE SET NULL,
      call_sid       TEXT UNIQUE NOT NULL,
      person_id      TEXT,
      name           TEXT,
      time_slot      TEXT,
      phone          TEXT,
      status         TEXT NOT NULL DEFAULT 'pending',
      classification TEXT,
      follow_up      BOOLEAN,
      raw_response   TEXT,
      answered_call  BOOLEAN,
      voice          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS
      run_id UUID REFERENCES runs(id) ON DELETE SET NULL
  `);

  await pool.query(`
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS voice TEXT
  `);

  // Shifts staan bewust als TEXT. De frontend bewaart datetime-local-strings
  // en leest er alleen de klokttijd van af; TIMESTAMPTZ zou die naar UTC
  // normaliseren en een shift van 06:00 als 05:00 teruggeven.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS people (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           TEXT NOT NULL,
      phone          TEXT NOT NULL,
      shift_start_at TEXT NOT NULL,
      shift_end_at   TEXT NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await seedPeopleIfEmpty();

  console.log('[DB] schema ready');
}

// De frontend leest hier alleen de klokttijd van af en projecteert die op
// morgen, maar de waarde moet wel parseerbaar zijn: `new Date('06:00')` is
// Invalid Date en valt stil terug op een standaarduur.
function shiftValue(hour) {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// De twee nummers die echt gebeld worden. Stonden als DEFAULT_WORKERS in de
// frontend; hier alleen om een lege database bruikbaar te maken.
async function seedPeopleIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM people');
  if (parseInt(rows[0].count) > 0) return;

  await pool.query(
    `INSERT INTO people (name, phone, shift_start_at, shift_end_at)
     VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
    [
      'Dennis De Reyer', '+32474311413', shiftValue(6), shiftValue(14),
      'Michiel Schepers', '+32493197138', shiftValue(6), shiftValue(14),
    ]
  );
  console.log('[DB] people geseed met 2 werknemers');
}

/**
 * Bestaat dit nummer in het rooster? Spaties en streepjes eruit, want de
 * frontend levert ze soms mee en `+32 471 00 00 00` is hetzelfde nummer.
 */
async function personExistsByPhone(phone) {
  const normalised = String(phone || '').replace(/[\s-]/g, '');
  if (!normalised) return false;

  const { rows } = await pool.query(
    `SELECT 1 FROM people
     WHERE REPLACE(REPLACE(phone, ' ', ''), '-', '') = $1
     LIMIT 1`,
    [normalised]
  );
  return rows.length > 0;
}

async function listPeople() {
  const { rows } = await pool.query(
    'SELECT * FROM people ORDER BY created_at ASC'
  );
  return rows;
}

async function createPerson({ name, phone, shift_start_at, shift_end_at }) {
  const { rows } = await pool.query(
    `INSERT INTO people (name, phone, shift_start_at, shift_end_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, phone, shift_start_at, shift_end_at]
  );
  return rows[0];
}

// Alleen meegestuurde velden wijzigen; COALESCE laat de rest staan.
async function updatePerson(id, { name, phone, shift_start_at, shift_end_at }) {
  const { rows } = await pool.query(
    `UPDATE people
     SET name           = COALESCE($2, name),
         phone          = COALESCE($3, phone),
         shift_start_at = COALESCE($4, shift_start_at),
         shift_end_at   = COALESCE($5, shift_end_at),
         updated_at     = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name ?? null, phone ?? null, shift_start_at ?? null, shift_end_at ?? null]
  );
  return rows[0] || null;
}

async function deletePerson(id) {
  const { rowCount } = await pool.query('DELETE FROM people WHERE id = $1', [id]);
  return rowCount > 0;
}

async function createRun(total) {
  const { rows } = await pool.query(
    'INSERT INTO runs (total) VALUES ($1) RETURNING id',
    [total]
  );
  return rows[0].id;
}

async function createCall(callSid, person, runId, voice) {
  const { rows } = await pool.query(
    `INSERT INTO calls (call_sid, person_id, name, time_slot, phone, run_id, voice)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [callSid, String(person.id), person.name, person.time_slot, person.phone, runId || null, voice || null]
  );
  return rows[0].id;
}

async function updateCallBySid(callSid, { classification, followUp, rawResponse, answeredCall }) {
  const { rows } = await pool.query(
    `UPDATE calls
     SET status         = 'completed',
         classification = $2,
         follow_up      = $3,
         raw_response   = $4,
         answered_call  = $5,
         updated_at     = NOW()
     WHERE call_sid = $1
     RETURNING run_id`,
    [callSid, classification, followUp ?? false, rawResponse ?? null, answeredCall ?? false]
  );

  const runId = rows[0]?.run_id;
  if (runId) {
    const { rows: runRows } = await pool.query('SELECT total FROM runs WHERE id = $1', [runId]);
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) FROM calls WHERE run_id = $1 AND status = 'completed'",
      [runId]
    );
    if (parseInt(countRows[0].count) >= runRows[0]?.total) {
      await pool.query(
        "UPDATE runs SET status = 'completed', updated_at = NOW() WHERE id = $1",
        [runId]
      );
    }
  }
}

async function getRun(runId) {
  const { rows: runRows } = await pool.query('SELECT * FROM runs WHERE id = $1', [runId]);
  if (!runRows[0]) return null;
  const run = runRows[0];

  const { rows: calls } = await pool.query(
    'SELECT * FROM calls WHERE run_id = $1 ORDER BY created_at ASC',
    [runId]
  );

  const complete = calls.length >= run.total &&
    calls.every(c => c.status === 'completed');

  return { ...run, calls, complete };
}

async function getCall(callId) {
  const { rows } = await pool.query('SELECT * FROM calls WHERE id = $1', [callId]);
  return rows[0] || null;
}

module.exports = {
  init,
  createRun,
  createCall,
  updateCallBySid,
  getRun,
  getCall,
  personExistsByPhone,
  listPeople,
  createPerson,
  updatePerson,
  deletePerson,
};
