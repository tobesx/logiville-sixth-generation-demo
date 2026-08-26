const crypto = require('crypto');

/**
 * Eén gedeeld wachtwoord voor de hele demo-omgeving. Geen accounts, geen
 * rollen: dit is een demo voor prospects, niet een systeem waarin per persoon
 * verantwoording nodig is.
 *
 * Het token is een HMAC over een vervaltijd — stateless, dus het overleeft een
 * herstart. Dat is hier belangrijker dan het lijkt: `sessions.js` verliest bij
 * een deploy al zijn inhoud, en een tokenstore in het geheugen zou iedereen
 * midden in een belronde uitloggen.
 */

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is niet ingesteld');
  return value;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function issueToken() {
  const expiresAt = String(Date.now() + TOKEN_TTL_MS);
  return `${expiresAt}.${sign(expiresAt)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return false;

  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) return false;

  const expected = sign(expiresAt);
  // Lengtes moeten gelijk zijn voor timingSafeEqual; ongelijk is sowieso fout.
  if (signature.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  return Number(expiresAt) > Date.now();
}

/** Vergelijkt zonder vroeg af te breken op het eerste verschillende teken. */
function passwordMatches(given) {
  const expected = process.env.DEMO_PASSWORD;
  if (!expected) throw new Error('DEMO_PASSWORD is niet ingesteld');
  if (typeof given !== 'string' || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function handleLogin(req, res) {
  try {
    if (!passwordMatches(req.body?.password)) {
      return res.status(401).json({ error: 'Onjuist wachtwoord' });
    }
    res.json({ token: issueToken(), expiresIn: TOKEN_TTL_MS });
  } catch (err) {
    console.error('[AUTH] login mislukt:', err.message);
    res.status(500).json({ error: 'Auth is niet geconfigureerd' });
  }
}

/**
 * Beschermt `/api/*`. Twilio's `/voice/*`-webhooks vallen hier bewust buiten:
 * die komen van Twilio, niet uit de browser, en horen met `validateRequest`
 * beveiligd te worden in plaats van met dit token.
 */
function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  try {
    if (!token || !verifyToken(token)) {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }
  } catch (err) {
    console.error('[AUTH] verificatie mislukt:', err.message);
    return res.status(500).json({ error: 'Auth is niet geconfigureerd' });
  }

  next();
}

module.exports = { handleLogin, requireAuth };
