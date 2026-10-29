// Μετατρέπει απαντήσεις gemini_list_candles (1hr) σε έγγραφα της συλλογής "bars" του ημερολογίου.
// Χρήση: node bars.js <outDir> BTC=/path/to/result.txt ETH=/path/... [--old <dumpDir>/bars]
// Γράφει <outDir>/<COIN>_USD__1h.json και <outDir>/index_patch.json ({key:{inst,tf,at,n}})
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2); const out = args.shift(); let oldDir = null;
const pairs = []; for (let i = 0; i < args.length; i++) { if (args[i] === '--old') { oldDir = args[++i]; continue } const [c, f] = args[i].split('='); if (c && f) pairs.push([c.toUpperCase(), f]); }
fs.mkdirSync(out, { recursive: true }); const now = Date.now(), H = 3600000, idx = {};
for (const [coin, file] of pairs) {
  const s = fs.readFileSync(file, 'utf8'); const a = s.indexOf('[['), z = s.lastIndexOf(']]');
  if (a < 0 || z < a) { console.log(coin, 'SKIP: no candles in', file); continue; }
  const m = new Map();
  if (oldDir) { try { let o = JSON.parse(fs.readFileSync(path.join(oldDir, coin + '_USD__1h.json'), 'utf8')); if (o.data && o.version) o = o.data; (o.b || []).forEach(r => m.set(+r[0], r)); } catch (e) { } }
  JSON.parse(s.slice(a, z + 2)).forEach(r => { const t = +r[0] < 1e12 ? +r[0] * 1000 : +r[0]; if (t + H <= now && isFinite(+r[4])) m.set(t, [t, +r[1], +r[2], +r[3], +r[4], +r[5] || 0]); });
  const b = [...m.values()].sort((x, y) => x[0] - y[0]).slice(-1500);
  let gaps = 0; for (let i = 1; i < b.length; i++) if (b[i][0] - b[i - 1][0] !== H) gaps++;
  const k = coin + '_USD__1h';
  fs.writeFileSync(path.join(out, k + '.json'), JSON.stringify({ inst: coin + '_USD', tf: '1h', at: now, n: b.length, b, src: 'Gemini' }));
  idx[k] = { inst: coin + '_USD', tf: '1h', at: now, n: b.length };
  console.log(coin, b.length, 'candles, last', new Date(b[b.length - 1][0]).toISOString(), 'gaps', gaps);
}
fs.writeFileSync(path.join(out, 'index_patch.json'), JSON.stringify(idx));
