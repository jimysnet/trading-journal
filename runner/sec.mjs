// 🔒 Έλεγχος ασφαλείας: μπορεί κάποιος ΧΩΡΙΣ έγκριση να διαβάσει ή να γράψει δεδομένα;
// Δοκιμάζει (1) χωρίς σύνδεση και (2) με έναν προσωρινό, μη εγκεκριμένο λογαριασμό που σβήνεται στο τέλος.
const U = String(process.env.TJ_URL || '').replace(/\/$/, '');
if (!U) { console.log('Λείπει το TJ_URL'); process.exit(1) }
const cfg = await (await fetch(U + '/api/config')).json();
const pid = cfg.firebase.projectId, key = cfg.firebase.apiKey;
const base = `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/`;
const COLS = ['trades', 'demo', 'chat', 'settings', 'strategies', 'members', 'requests', 'users', 'reviews', 'checkins', 'accounts', 'bigtr', 'pi'];
let bad = 0;
let shown = 0;
const rd = async (c, tok) => { const r = await fetch(base + c + '?pageSize=1', { headers: tok ? { authorization: 'Bearer ' + tok } : {} }); if (r.status === 429 && !shown++) { const j = await r.json().catch(() => ({})); console.log('ℹ️ 429:', (j.error && j.error.message || '').slice(0, 200)) } return r.status };
const wr = async (c, tok) => (await fetch(base + c + '?documentId=sec_probe_' + Date.now(), { method: 'POST', headers: Object.assign({ 'content-type': 'application/json' }, tok ? { authorization: 'Bearer ' + tok } : {}), body: JSON.stringify({ fields: { x: { stringValue: 'probe' } } }) })).status;
const chk = (what, st, ok) => { const pass = ok.includes(st); if (st === 429) { console.log('⚠️ ' + what + ' → HTTP 429 (το ημερήσιο όριο αναγνώσεων του Firebase εξαντλήθηκε· η ανάγνωση δεν πέρασε)'); return } if (!pass) bad++; console.log((pass ? '✅' : '❌') + ' ' + what + ' → HTTP ' + st) };
console.log('— 1. Χωρίς σύνδεση —');
for (const c of COLS) chk('ανάγνωση ' + c, await rd(c), [403, 401, 429]);
chk('εγγραφή trades', await wr('trades'), [403, 401]);
console.log('— 2. Συνδεδεμένος αλλά ΧΩΡΙΣ έγκριση (προσωρινός λογαριασμός) —');
const em = `sec-probe-${Date.now()}@example.com`;
const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: em, password: 'Probe-' + Math.random().toString(36).slice(2) + '9!', returnSecureToken: true }) })).json();
if (!su.idToken) { console.log('Δεν φτιάχτηκε δοκιμαστικός λογαριασμός:', su.error && su.error.message) }
else {
  const tok = su.idToken;
  for (const c of COLS) chk('ανάγνωση ' + c, await rd(c, tok), [403, 429]);
  for (const c of ['trades', 'members', 'settings', 'demo']) chk('εγγραφή ' + c, await wr(c, tok), [403]);
  const own = await fetch(base + 'requests?documentId=' + su.localId, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: JSON.stringify({ fields: { email: { stringValue: em }, at: { integerValue: String(Date.now()) } } }) });
  console.log('ℹ️ αίτημα έγκρισης για τον εαυτό του (επιτρέπεται) → HTTP ' + own.status);
  if (own.ok) await fetch(base + 'requests/' + su.localId, { method: 'DELETE', headers: { authorization: 'Bearer ' + tok } });
  const del = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${key}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: tok }) });
  console.log('🧹 ο δοκιμαστικός λογαριασμός σβήστηκε → HTTP ' + del.status);
}
console.log('— 3. Καθηγητής (AI) χωρίς σύνδεση —');
chk('/api/ai', (await fetch(U + '/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, [401, 403, 503]);
console.log(bad ? `\n❌ ${bad} έλεγχοι απέτυχαν` : '\n✅ Κανείς χωρίς έγκριση δεν έχει πρόσβαση στα δεδομένα');
process.exit(bad ? 1 : 0);
