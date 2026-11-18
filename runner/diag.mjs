// 🩺 Διάγνωση του Αυτόματου: συνδέεται ως bot και τυπώνει τι βλέπει ο Αυτόματος (ρυθμίσεις, τελευταία σάρωση,
// τι παρακολουθεί και γιατί δεν μπαίνει, ημερολόγιο ημέρας, ανοιχτές demo). Δεν αλλάζει τίποτα.
import { chromium } from 'playwright';
const URL = (process.env.TJ_URL || '').replace(/\/+$/, ''), EMAIL = process.env.TJ_BOT_EMAIL || '', PASS = process.env.TJ_BOT_PASSWORD || '';
const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'el-GR', timezoneId: 'Europe/Athens' });
await ctx.addInitScript(([e, p]) => { window.__TJ_BOT = { email: e, password: p }; window.__TJ_DIAG = 1 }, [EMAIL, PASS]);
const page = await ctx.newPage();
await page.goto(URL + '/?diag=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.firebase && firebase.auth && firebase.auth().currentUser, null, { timeout: 90000 });
const out = await page.evaluate(async () => {
  const db = firebase.firestore(), T = t => t ? new Date(t).toLocaleString('el-GR', { timeZone: 'Europe/Athens' }) : '–';
  const st = (await db.collection('apstate').doc('main').get()).data() || {};
  const c = st.cfg || {};
  const L = [];
  L.push('ΡΥΘΜΙΣΕΙΣ: ενεργός=' + !!c.on + ' · νομίσματα=' + (st.coins || c.coins || []).length + ' · tf=' + JSON.stringify(c.tfs || c.tf) + ' · maxOpen=' + c.maxOpen + ' · maxDay=' + c.maxDay + ' · minEdge=' + c.minEdge + ' · sess=' + c.sess + ' · έγκριση=' + c.approve + ' · mode=' + c.mode);
  L.push('ΤΡΕΧΕΙ ΑΠΟ: ' + (st.runner || '–') + ' · τελευταία σάρωση ' + T(st.last) + ' · scanAt ' + T(st.scanAt));
  L.push('ΠΑΡΑΚΟΛΟΥΘΕΙ (' + (st.watch || []).length + '):');
  (st.watch || []).forEach(w => L.push('  ' + w.coin + ' ' + w.tf + ' · ' + (w.name || '—') + ' · ' + (w.dir > 0 ? 'L' : w.dir < 0 ? 'S' : '-') + ' · σήμα=' + !!w.sig + ' · test ' + w.testR + 'R/' + w.testN + ' · βαθμός ' + w.grade + (w.weak ? ' (αδύναμο)' : '') + (w.block ? ' · ΜΠΛΟΚ: ' + w.block : '') + (w.wait ? ' · περιμένει: ' + w.wait.slice(0, 120) : '')));
  L.push('ΠΡΟΤΑΣΕΙΣ: ' + JSON.stringify(st.props || []));
  const lg = await db.collection('aplog').orderBy('date', 'desc').limit(4).get();
  lg.docs.forEach(d => { const x = d.data(); L.push('ΗΜΕΡΟΛΟΓΙΟ ' + d.id + ': σαρώσεις ' + x.scans + ' · άνοιξε ' + x.opened + ' · προτάσεις ' + x.props + ' · μπλοκ ' + x.blocked + ' · τελευταία ' + T(x.last)); (x.ev || []).slice(0, 25).forEach(e => L.push('   ' + T(e.t) + ' [' + e.k + '] ' + (e.c || '') + ' ' + e.m)) });
  const dm = await db.collection('demo').orderBy('at', 'desc').limit(300).get();
  const D = dm.docs.map(d => d.data()), auto = D.filter(t => t.src === 'auto' || t.auto);
  { const by = {}; D.filter(t => t.src === 'auto').forEach(t => { const k = (t.auto && t.auto.profile && t.auto.profile.name || '?') + ' | ' + (t.auto && t.auto.tf || '?'); by[k] = (by[k] || 0) + 1 }); Object.keys(by).sort().forEach(k => L.push('TF ' + k + ': ' + by[k])) }
  L.push('DEMO: τελευταίες ' + D.length + ' · αυτόματες ' + auto.length + ' · ανοιχτές αυτόματες ' + auto.filter(t => t.status === 'open' || t.status === 'pending').length);
  auto.slice(0, 12).forEach(t => L.push('   ' + T(t.at) + ' ' + t.symbol + ' ' + t.dir + ' ' + (t.status || '') + ' ' + (t.auto && t.auto.strat || '') + ' ' + (t.auto && t.auto.profile && t.auto.profile.name || '')));
  const pf = await db.collection('approfiles').get().catch(() => null);
  if (pf) pf.docs.forEach(d => { const x = d.data(); const c2 = x.cfg || {}; L.push('ΠΡΟΦΙΛ ' + d.id + ': ' + (x.name || '') + ' · run=' + x.run + ' · kind=' + (x.kind || '') + ' · tf=' + c2.tf + ' · strats=' + c2.strats + (c2.pick ? ' (' + c2.pick + ')' : '') + ' · minEdge=' + c2.minEdge + ' · lab=' + !!c2.lab) });
  const bt = await db.collection('bigtr').get().catch(() => null);
  if (bt) { let bytes = 0, n = 0, per = {}; bt.docs.forEach(d => { const x = d.data(); const sz = JSON.stringify(x).length; bytes += sz; n += (x.t || []).length; const dy = x.day || '?'; per[dy] = per[dy] || { docs: 0, n: 0, b: 0 }; per[dy].docs++; per[dy].n += (x.t || []).length; per[dy].b += sz });
    L.push('BIGTR: ' + bt.size + ' έγγραφα · ' + n + ' συναλλαγές · ~' + (bytes / 1048576).toFixed(2) + ' MB'); Object.keys(per).sort().forEach(k => L.push('   ' + k + ': ' + per[k].docs + ' νομ. · ' + per[k].n + ' συναλ. · ' + (per[k].b / 1024).toFixed(0) + ' KB')) }
  return L.join('\n');
}).catch(e => 'σφάλμα: ' + e);
console.log(out);
await browser.close();
