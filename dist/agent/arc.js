// Μόνιμο αρχείο κεριών (συλλογή "barsarc"): προσθέτει νέα κεριά από απαντήσεις gemini_list_candles
// στα μηνιαία έγγραφα <COIN>__<TF>__<YYYY-MM> και ενημερώνει το _index. Δεν σβήνει ποτέ κεριά.
// Χρήση: node arc.js <dumpDir>/barsarc <outDir> BTC:1h=/path/result.txt BTC:1D=/path/... ETH:1h=...
// Γράφει <outDir>/<docId>.json (μόνο τα πεδία του εγγράφου) και <outDir>/writes.json
// = [{doc_id, file, if_version|null}] για ένα ArtifactData batch (set) στη συλλογή "barsarc".
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), dump = args.shift(), out = args.shift();
fs.mkdirSync(out, { recursive: true });
const MS = { '15m': 9e5, '1h': 36e5, '6h': 216e5, '1D': 864e5 }, now = Date.now();
const mo = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); };
const safe = s => String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
function readDoc(id) {
  try { let o = JSON.parse(fs.readFileSync(path.join(dump, id + '.json'), 'utf8')); const ver = o.version || null; if (o.data && o.version) o = o.data; return { d: o, v: ver }; }
  catch (e) { return { d: null, v: null }; }
}
const idx = readDoc('_index'), K = (idx.d && idx.d.k) || {}, writes = [];
for (const a of args) {
  const [ct, file] = a.split('='), [coinRaw, tf] = ct.split(':'), coin = coinRaw.toUpperCase(), ms = MS[tf];
  if (!ms || !file) { console.log('SKIP', a); continue; }
  const s = fs.readFileSync(file, 'utf8'), i0 = s.indexOf('[['), i1 = s.lastIndexOf(']]');
  if (i0 < 0 || i1 < i0) { console.log(coin, tf, 'SKIP: no candles'); continue; }
  const rows = JSON.parse(s.slice(i0, i1 + 2)).map(r => { const t = +r[0] < 1e12 ? +r[0] * 1000 : +r[0]; return [t, +r[1], +r[2], +r[3], +r[4], +r[5] || 0]; })
    .filter(r => r[0] + ms <= now + 30000 && isFinite(r[4]) && r[4] > 0 && r[2] >= r[3]);
  const g = {}; rows.forEach(r => { (g[mo(r[0])] = g[mo(r[0])] || []).push(r); });
  const key = safe(coin + '__' + tf), E = K[key] || { coin, tf, mo: {} }; E.mo = E.mo || {}; let added = 0;
  for (const m of Object.keys(g)) {
    const id = safe(coin + '__' + tf + '__' + m), ex = readDoc(id), map = new Map();
    ((ex.d && ex.d.b) || []).forEach(r => map.set(r[0], r)); const before = map.size;
    g[m].forEach(r => { if (!map.has(r[0])) map.set(r[0], r); });
    const arr = [...map.values()].sort((x, y) => x[0] - y[0]), f = arr[0][0], l = arr[arr.length - 1][0], gaps = Math.max(0, Math.round((l - f) / ms) + 1 - arr.length);
    E.mo[m] = { n: arr.length, f, l, g: gaps };
    if (arr.length === before && ex.d) continue;
    added += arr.length - before;
    const src = String((ex.d && ex.d.src) || ''), doc = { coin, tf, mo: m, n: arr.length, f, l, g: gaps, src: src.includes('Gemini') ? src : (src ? src + ', Gemini' : 'Gemini'), at: now, by: 'daily', b: arr };
    fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify(doc));
    writes.push({ doc_id: id, file: path.join(out, id + '.json'), if_version: ex.v });
  }
  const L = Object.keys(E.mo).sort(); E.coin = coin; E.tf = tf; E.from = E.mo[L[0]].f; E.to = E.mo[L[L.length - 1]].l;
  E.n = L.reduce((s2, m) => s2 + E.mo[m].n, 0); E.gaps = L.reduce((s2, m) => s2 + (E.mo[m].g || 0), 0); E.at = now; if (!String(E.src || '').includes('Gemini')) E.src = E.src ? E.src + ', Gemini' : 'Gemini';
  K[key] = E; console.log(coin, tf, '+' + added, 'κεριά · σύνολο', E.n, '· από', new Date(E.from).toISOString().slice(0, 10), 'έως', new Date(E.to).toISOString().slice(0, 16), '· κενά', E.gaps);
}
fs.writeFileSync(path.join(out, '_index.json'), JSON.stringify({ k: K, at: now }));
writes.push({ doc_id: '_index', file: path.join(out, '_index.json'), if_version: idx.v });
fs.writeFileSync(path.join(out, 'writes.json'), JSON.stringify(writes, null, 1));
console.log('έγγραφα για εγγραφή:', writes.length);
