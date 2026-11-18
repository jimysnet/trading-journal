// 🫀 Παρακολούθηση (κάθε 30′, χωρίς browser, μόνο ανάγνωση): αν ο Καθηγητής σταμάτησε, αν τα δεδομένα είναι παλιά ή αν το ledger
// ρίσκου δεν συμφωνεί με τις θέσεις, η εκτέλεση ΑΠΟΤΥΓΧΑΝΕΙ → το GitHub στέλνει email ειδοποίηση.
const URL = (process.env.TJ_URL || '').replace(/\/+$/, ''), EMAIL = process.env.TJ_BOT_EMAIL || '', PASS = process.env.TJ_BOT_PASSWORD || '';
const cfg = await fetch(URL + '/api/config').then(r => r.json());
const fb = cfg.firebase || {}, KEY = fb.apiKey, PID = fb.projectId;
const auth = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + KEY, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }) }).then(r => r.json());
if (!auth.idToken) { console.log('❌ Δεν συνδέθηκε το bot: ' + JSON.stringify(auth.error || {}).slice(0, 200)); process.exit(1) }
const H = { authorization: 'Bearer ' + auth.idToken, 'content-type': 'application/json' }, BASE = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`;
const val = v => v == null ? null : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? +v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'mapValue' in v ? obj(v.mapValue.fields || {}) : 'arrayValue' in v ? (v.arrayValue.values || []).map(val) : 'timestampValue' in v ? Date.parse(v.timestampValue) : null;
const obj = f => { const o = {}; for (const k in f) o[k] = val(f[k]); return o };
const get = async p => { const r = await fetch(BASE + '/' + p, { headers: H }); if (r.status === 404) return null; if (!r.ok) throw new Error(p + ' ' + r.status); return obj((await r.json()).fields || {}) };
const now = Date.now(), ago = t => t ? Math.round((now - t) / 60000) + '′' : '–', bad = [], warn = [], info = [];
const [lease, main, led] = await Promise.all([get('apstate/lease'), get('apstate/main'), get('apstate/ledger')]);
const c = (main && main.cfg) || {};
info.push(`Αυτόματος: ${c.on ? 'ενεργός' : 'ανενεργός'} · κάθε ${c.iv || '?'}′ · τελευταία σάρωση πριν ${ago(main && (main.scanAt || main.last))}`);
if (main && main.kill && main.kill.on) warn.push(`⛔ Kill switch ενεργό από ${main.kill.name || '?'} (πριν ${ago(main.kill.at)})`);
if (c.on && !(main && main.kill && main.kill.on)) {
  if (!lease || !(lease.until > now - 10 * 60000)) bad.push(`Κανείς δεν κρατά τον Καθηγητή (lease έληξε πριν ${lease ? ago(lease.until) : '–'})`);
  else info.push(`Lease #${lease.epoch} · ${lease.bot ? 'φύλακας' : 'σελίδα μέλους'} · ανανέωση πριν ${ago(lease.at)}`);
  const last = main && (main.scanAt || main.last), lim = ((+c.iv || 15) * 2 + 20) * 60000;
  if (!last || now - last > lim) bad.push(`Καμία σάρωση εδώ και ${ago(last)} (όριο ${Math.round(lim / 60000)}′)`);
}
// ledger ↔ πραγματικές ανοιχτές θέσεις
const q = await fetch(BASE + ':runQuery', { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'demo' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'open' } } } } }) }).then(r => r.json());
const open = (q || []).filter(x => x.document).map(x => Object.assign({ _id: x.document.name.split('/').pop() }, obj(x.document.fields || {}))).filter(t => t.by === 'prof' && !t.ttl);
const L = (led && led.open) || {}, miss = open.filter(t => !L[t._id] && t.src === 'auto' && (t.at || 0) > (+(led && led.since) || 0));
info.push(`Ανοιχτές θέσεις: ${open.length} · στο ledger: ${Object.keys(L).length} · ρίσκο ledger ${led ? led.risk : '–'} USDT`);
if (led && miss.length) bad.push(`Ledger ρίσκου: ${miss.length} αυτόματη/ες θέση/εις λείπουν (${miss.map(t => t.symbol).join(', ')})`);
if (!led && open.some(t => t.src === 'auto')) warn.push('Δεν υπάρχει ακόμα ledger ρίσκου (θα φτιαχτεί στην επόμενη σάρωση)');
// φρεσκάδα αξιολόγησης: οι ανοιχτές πρέπει να ελέγχονται τακτικά
const stale = open.filter(t => t.src === 'auto' && now - (t.checkedAt || t.at || 0) > 45 * 60000);
if (stale.length) bad.push(`${stale.length} ανοιχτή/ές δεν έχει/ουν ελεγχθεί με τιμές εδώ και 45′+ (${stale.slice(0, 5).map(t => t.symbol + ' ' + ago(t.checkedAt || t.at)).join(', ')})`);
console.log(info.map(x => 'ℹ️ ' + x).join('\n'));
warn.forEach(x => console.log('⚠️ ' + x));
bad.forEach(x => console.log('❌ ' + x));
console.log(bad.length ? `\n${bad.length} πρόβλημα/τα: η εκτέλεση αποτυγχάνει ώστε το GitHub να στείλει ειδοποίηση.` : '\n✅ Όλα καλά.');
process.exit(bad.length ? 1 : 0);
