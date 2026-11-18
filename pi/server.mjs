/* Trading Journal · Pi: συλλέκτης Big trades (Binance Futures + Spot) σε SQLite + μικρό API μόνο για μέλη.
   - Μαζεύει 24/7 κάθε μεγάλη εντολή των νομισμάτων της λίστας και τη γράφει στον δίσκο (/data/bigtrades.db).
   - GET /health                       → κατάσταση (χωρίς στοιχεία συναλλαγών)
   - GET /bigtr?mk=f|s&pair=BTCUSDT&from=ms&to=ms&min=usd   → ιστορικό (θέλει Firebase ID token μέλους)
   - Με τον λογαριασμό του bot: ανακοινώνει τη διεύθυνσή του στη βάση (pi/main), ώστε να τη βρίσκει η σελίδα,
     και μεταφέρει μία φορά ό,τι είχε ήδη μαζευτεί στο Firebase (bigtr). Καμία εξωτερική βιβλιοθήκη. */
import { DatabaseSync } from 'node:sqlite';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';

const E = process.env;
const DATA = E.DATA_DIR || '/data';
const PORT = +E.PORT || 8787;
const COINS = (E.COINS || 'BTC,ETH,SOL,XRP,HBAR,DOGE,ADA,AVAX,LINK,SUI,LTC,ZEC,HYPE').split(',').map(s => s.trim().toUpperCase().replace(/USDT$/, '')).filter(Boolean);
const PAIRS = COINS.map(c => c + 'USDT');
const PROJECT = E.FIREBASE_PROJECT_ID || '';
const API_KEY = E.FIREBASE_API_KEY || '';
const PUBLIC_URL = (E.PUBLIC_URL || '').replace(/\/+$/, '');
const MIN_USD = +E.MIN_USD || 5000;      // κάτω όριο σε $ για να κρατηθεί μια εντολή
const VOL_DIV = +E.VOL_DIV || 300000;    // όριο ανά νόμισμα = όγκος 24ω / VOL_DIV (≈ το κορυφαίο 1% των εντολών)
const LIMIT = +E.MAX_ROWS || 150000;     // μέγιστες γραμμές ανά απάντηση
const JWKS = E.JWKS_URL || 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FS = (E.FIRESTORE_BASE || 'https://firestore.googleapis.com/v1') + '/projects/' + PROJECT + '/databases/(default)/documents';
const log = (...a) => console.log(new Date().toLocaleString('sv-SE'), ...a);

/* ---------- βάση ---------- */
fs.mkdirSync(DATA + '/backup', { recursive: true });
const db = new DatabaseSync(DATA + '/bigtrades.db');
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;
CREATE TABLE IF NOT EXISTS tr (mk TEXT NOT NULL, pair TEXT NOT NULL, t INTEGER NOT NULL, s INTEGER NOT NULL, p REAL NOT NULL, q REAL NOT NULL, usd REAL NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS tr_u ON tr(mk, pair, t, s, p);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);`);
const ins = db.prepare('INSERT OR IGNORE INTO tr (mk, pair, t, s, p, q, usd) VALUES (?, ?, ?, ?, ?, ?, ?)');
const qry = db.prepare('SELECT t, p, q, s FROM tr WHERE mk = ? AND pair = ? AND t >= ? AND t < ? AND usd >= ? ORDER BY t DESC LIMIT ?');
const getMeta = k => { const r = db.prepare('SELECT v FROM meta WHERE k = ?').get(k); return r ? r.v : null };
const setMeta = (k, v) => db.prepare('INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)').run(k, String(v));
let PEND = [];
function writeRows(rows) { if (!rows.length) return 0; let n = 0; db.exec('BEGIN'); try { for (const r of rows) n += Number(ins.run(r[0], r[1], r[2], r[3], r[4], r[5], r[4] * r[5]).changes) ; db.exec('COMMIT') } catch (e) { db.exec('ROLLBACK'); log('db', e.message) } return n }
setInterval(() => { const r = PEND; PEND = []; writeRows(r) }, 3000);
function dbSize() { let b = 0; for (const f of ['bigtrades.db', 'bigtrades.db-wal']) { try { b += fs.statSync(DATA + '/' + f).size } catch (e) { } } return b }

/* αντίγραφο ασφαλείας κάθε νύχτα (κρατάει τα 7 τελευταία) */
function backup() {
  const d = new Date().toISOString().slice(0, 10), f = DATA + '/backup/bigtrades-' + d + '.db';
  if (fs.existsSync(f)) return;
  try { db.exec(`VACUUM INTO '${f}'`); log('backup', f) } catch (e) { log('backup', e.message) }
  const L = fs.readdirSync(DATA + '/backup').filter(x => x.endsWith('.db')).sort(); while (L.length > 7) fs.unlinkSync(DATA + '/backup/' + L.shift());
}
setInterval(() => { if (new Date().getHours() === 4) backup() }, 30 * 60e3);

/* ---------- συλλέκτης ---------- */
const TH = {}, G = {}, ST = { f: { at: 0, n: 0, up: 0 }, s: { at: 0, n: 0, up: 0 } };
async function getJson(u) { const r = await fetch(u); if (!r.ok) throw new Error(r.status + ' ' + u.split('?')[0]); return r.json() }
async function thresholds() {
  for (const pr of PAIRS) for (const mk of ['f', 's']) {
    const u = mk === 'f' ? 'https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=' + pr : 'https://data-api.binance.vision/api/v3/ticker/24hr?symbol=' + pr;
    try { const t = await getJson(u); TH[mk + pr] = Math.max(MIN_USD, (+t.quoteVolume || 0) / VOL_DIV) } catch (e) { }
  }
}
function flush(g) { if (g.usd >= (TH[g.mk + g.pair] || 25000)) { PEND.push([g.mk, g.pair, g.T, g.s, +(g.usd / g.q).toPrecision(10), +g.q.toPrecision(10)]); ST[g.mk].n++ } }
setInterval(() => { const now = Date.now(); for (const k in G) { const g = G[k]; if (g && now - g.T > 2000) { flush(g); G[k] = null } } }, 2000);
const WSU = {
  f: ['wss://fstream.binance.com/market/stream?streams='],
  s: ['wss://stream.binance.com:9443/stream?streams=', 'wss://data-stream.binance.vision/stream?streams=']
};
function open(mk, tries = 0) {
  const url = WSU[mk][tries % WSU[mk].length] + PAIRS.map(p => p.toLowerCase() + '@aggTrade').join('/');
  let ws, last = Date.now(), dead = false;
  const again = () => { if (dead) return; dead = true; clearInterval(dog); try { ws.close() } catch (e) { } setTimeout(() => open(mk, tries + 1), Math.min(30000, 2000 * (tries + 1))) };
  try { ws = new WebSocket(url) } catch (e) { return again() }
  const dog = setInterval(() => { if (Date.now() - last > 90e3) { log(mk, 'σιωπή 90″, ξανασύνδεση'); again() } }, 15e3);
  ws.onopen = () => { tries = 0; ST[mk].up = Date.now(); log(mk, 'συνδέθηκε', PAIRS.length, 'νομίσματα') };
  ws.onmessage = ev => {
    last = Date.now(); let j; try { j = JSON.parse(ev.data) } catch (e) { return }
    const d = j.data || j; if (d.e !== 'aggTrade') return; ST[mk].at = last;
    const k = mk + d.s, T = +d.T, s = d.m ? 0 : 1, p = +d.p, q = +d.q, g = G[k];
    if (g && g.T === T && g.s === s) { g.q += q; g.usd += p * q } else { if (g) flush(g); G[k] = { mk, pair: d.s, T, s, q, usd: p * q } }
  };
  ws.onclose = again; ws.onerror = () => { };
}

/* ---------- έλεγχος ταυτότητας (Firebase ID token + μέλος) ---------- */
let KEYS = { at: 0, k: {} };
async function keys() { if (Date.now() - KEYS.at < 3600e3) return KEYS.k; const j = await getJson(JWKS); const k = {}; (j.keys || []).forEach(x => { k[x.kid] = crypto.createPublicKey({ key: x, format: 'jwk' }) }); KEYS = { at: Date.now(), k }; return k }
const b64 = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const MEM = new Map();
async function auth(req) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); const P = tok.split('.'); if (P.length !== 3) return null;
  let h, p; try { h = JSON.parse(b64(P[0])); p = JSON.parse(b64(P[1])) } catch (e) { return null }
  if (h.alg !== 'RS256' || p.aud !== PROJECT || p.iss !== 'https://securetoken.google.com/' + PROJECT || !(p.exp * 1000 > Date.now()) || !p.sub) return null;
  let K = (await keys())[h.kid]; if (!K) { KEYS.at = 0; K = (await keys())[h.kid] } if (!K) return null;
  if (!crypto.verify('RSA-SHA256', Buffer.from(P[0] + '.' + P[1]), K, b64(P[2]))) return null;
  const c = MEM.get(p.sub); if (c && Date.now() - c.at < 10 * 60e3) return c.ok ? p.sub : null;
  // μέλος = μπορεί να διαβάσει μια συλλογή μόνο-για-μέλη (οι ίδιοι κανόνες του Firestore)
  let ok = false; try { const r = await fetch(FS + '/pi/main', { headers: { authorization: 'Bearer ' + tok } }); ok = r.status === 200 || r.status === 404 } catch (e) { }
  MEM.set(p.sub, { ok, at: Date.now() }); if (MEM.size > 500) MEM.delete(MEM.keys().next().value);
  return ok ? p.sub : null;
}

/* ---------- API ---------- */
function send(res, code, obj) { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)) }
function health() {
  const r = db.prepare('SELECT COUNT(*) n, MIN(t) a, MAX(t) b FROM tr').get();
  return { ok: true, rows: Number(r.n), from: r.a, last: r.b, mb: +(dbSize() / 1048576).toFixed(1), coins: COINS.length,
    live: { f: !!ST.f.at && Date.now() - ST.f.at < 60e3, s: !!ST.s.at && Date.now() - ST.s.at < 60e3 }, since: START };
}
const START = Date.now();
http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization', 'access-control-max-age': '86400' }); return res.end() }
    const u = new URL(req.url, 'http://x'), path = u.pathname.replace(/\/+$/, '') || '/';
    if (path === '/health' || path === '/') return send(res, 200, health());
    if (path === '/bigtr') {
      if (!PROJECT) return send(res, 500, { ok: false, message: 'FIREBASE_PROJECT_ID' });
      if (!(await auth(req))) return send(res, 403, { ok: false, message: 'forbidden' });
      const mk = u.searchParams.get('mk') === 's' ? 's' : 'f', pair = String(u.searchParams.get('pair') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const from = +u.searchParams.get('from') || 0, to = +u.searchParams.get('to') || 9e15, min = +u.searchParams.get('min') || 0;
      const rows = qry.all(mk, pair, from, to, min, LIMIT).reverse(), o = { ok: true, n: rows.length, full: rows.length < LIMIT, t: [], p: [], q: [], s: [] };
      for (const r of rows) { o.t.push(r.t); o.p.push(r.p); o.q.push(r.q); o.s.push(r.s) }
      return send(res, 200, o);
    }
    send(res, 404, { ok: false });
  } catch (e) { log('api', e.message); send(res, 500, { ok: false }) }
}).listen(PORT, () => log('API στη θύρα', PORT));

/* ---------- λογαριασμός bot: ανακοίνωση διεύθυνσης + μεταφορά από Firebase ---------- */
const BOT = { tok: '', exp: 0, ref: '' };
async function botToken() {
  if (BOT.tok && Date.now() < BOT.exp - 300e3) return BOT.tok;
  let r;
  if (BOT.ref) r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(BOT.ref) }).then(x => x.json()).then(j => ({ idToken: j.id_token, refreshToken: j.refresh_token, expiresIn: j.expires_in }));
  if (!r || !r.idToken) r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: E.TJ_BOT_EMAIL, password: E.TJ_BOT_PASSWORD, returnSecureToken: true }) }).then(x => x.json());
  if (!r.idToken) throw new Error('σύνδεση bot: ' + JSON.stringify(r.error || r).slice(0, 120));
  BOT.tok = r.idToken; BOT.ref = r.refreshToken; BOT.exp = Date.now() + (+r.expiresIn || 3600) * 1000; return BOT.tok;
}
async function heartbeat() {
  if (!PUBLIC_URL) return;
  try {
    const h = health(), tok = await botToken();
    const body = { fields: { url: { stringValue: PUBLIC_URL }, at: { integerValue: String(Date.now()) }, rows: { integerValue: String(h.rows) }, mb: { doubleValue: h.mb }, from: { integerValue: String(h.from || 0) }, coins: { stringValue: COINS.join(',') } } };
    const r = await fetch(FS + '/pi/main', { method: 'PATCH', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) log('heartbeat', r.status, (await r.text()).slice(0, 150));
  } catch (e) { log('heartbeat', e.message) }
}
const num = v => +(v && (v.integerValue != null ? v.integerValue : v.doubleValue)) || 0;
const arr = f => ((f && f.arrayValue && f.arrayValue.values) || []).map(num);
async function importFirebase() {
  if (getMeta('imported')) return;
  let page = '', docs = 0, n = 0;
  try {
    do {
      const tok = await botToken();
      const j = await fetch(FS + '/bigtr?pageSize=20' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { headers: { authorization: 'Bearer ' + tok } }).then(r => r.json());
      if (j.error) throw new Error(j.error.message);
      for (const d of j.documents || []) {
        const id = d.name.split('/').pop(), mk = id.startsWith('S_') ? 's' : 'f', pair = id.replace(/^S_/, '').split('_')[0], F = d.fields || {};
        const t = arr(F.t), p = arr(F.p), q = arr(F.q), s = arr(F.s), rows = [];
        for (let i = 0; i < t.length; i++) rows.push([mk, pair, t[i], s[i], p[i], q[i]]);
        n += writeRows(rows); docs++;
      }
      page = j.nextPageToken || '';
    } while (page);
    setMeta('imported', Date.now()); log('μεταφορά από Firebase:', docs, 'έγγραφα,', n, 'συναλλαγές');
  } catch (e) { log('μεταφορά', e.message, '(θα ξαναδοκιμάσει σε 1 ώρα)'); setTimeout(importFirebase, 3600e3) }
}

/* ---------- εκκίνηση ---------- */
log('Νομίσματα:', COINS.join(' '));
thresholds().then(() => { open('f'); open('s') }); setInterval(thresholds, 6 * 3600e3);
if (PROJECT && API_KEY && E.TJ_BOT_EMAIL && E.TJ_BOT_PASSWORD) {
  setTimeout(() => { heartbeat(); importFirebase() }, 5000); setInterval(heartbeat, 15 * 60e3);
} else log('Χωρίς στοιχεία bot: η σελίδα δεν θα βρει αυτόματα το Pi (συμπλήρωσε το .env)');
process.on('SIGTERM', () => { writeRows(PEND); PEND = []; process.exit(0) });
