// 🔎 Βήμα 0: έλεγχος ακεραιότητας του Αυτόματου. ΜΟΝΟ ΑΝΑΓΝΩΣΗ: δεν γράφει τίποτα στη βάση.
// Διπλές θέσεις · ρίσκο έναντι κανόνων · αποτέλεσμα SL/TP με Binance spot έναντι του καταγεγραμμένου (Crypto.com)
// · ελλιπή δεδομένα · υπερβάσεις ορίων · επικαλυπτόμενες βάρδιες του φύλακα.
import { chromium } from 'playwright';
import fs from 'fs';
const URL = (process.env.TJ_URL || '').replace(/\/+$/, ''), EMAIL = process.env.TJ_BOT_EMAIL || '', PASS = process.env.TJ_BOT_PASSWORD || '';
const out = [];
const P = (...a) => { const s = a.join(' '); out.push(s); console.log(s) };

/* ---- φύλακας: επικαλυπτόμενες βάρδιες (GitHub API) ---- */
try {
  const repo = process.env.GITHUB_REPOSITORY, tok = process.env.GH_TOKEN;
  if (repo && tok) {
    const j = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/runner.yml/runs?per_page=100`, { headers: { authorization: 'Bearer ' + tok, accept: 'application/vnd.github+json' } }).then(r => r.json());
    const R = (j.workflow_runs || []).map(r => ({ id: r.id, a: Date.parse(r.run_started_at || r.created_at), b: r.status === 'completed' ? Date.parse(r.updated_at) : Date.now(), st: r.status, c: r.conclusion })).sort((x, y) => x.a - y.a);
    let ov = [];
    for (let i = 0; i < R.length; i++) for (let k = i + 1; k < R.length && R[k].a < R[i].b; k++) ov.push([R[i], R[k], Math.round((Math.min(R[i].b, R[k].b) - R[k].a) / 60000)]);
    const fail = R.filter(r => r.c && r.c !== 'success' && r.c !== 'cancelled').length;
    P('## ΦΥΛΑΚΑΣ');
    P(`βάρδιες (τελευταίες ${R.length}): από ${new Date(R[0] ? R[0].a : 0).toISOString().slice(0, 16)} · αποτυχίες ${fail}`);
    P(`επικαλύψεις: ${ov.length}` + (ov.length ? ' · ' + ov.slice(0, 8).map(o => `${o[0].id}/${o[1].id} ${o[2]}′`).join(', ') : ''));
    let gaps = []; for (let i = 1; i < R.length; i++) { const g = (R[i].a - R[i - 1].b) / 60000; if (g > 15) gaps.push(Math.round(g)) }
    P(`κενά > 15′ ανάμεσα σε βάρδιες: ${gaps.length}` + (gaps.length ? ' (λεπτά: ' + gaps.slice(-10).join(', ') + ')' : ''));
  } else P('## ΦΥΛΑΚΑΣ: χωρίς GH_TOKEN, παραλείπεται');
} catch (e) { P('## ΦΥΛΑΚΑΣ: σφάλμα ' + e.message) }

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'el-GR', timezoneId: 'Europe/Athens' });
await ctx.addInitScript(([e, p]) => { window.__TJ_BOT = { email: e, password: p }; window.__TJ_DIAG = 1 }, [EMAIL, PASS]);
const page = await ctx.newPage();
await page.goto(URL + '/?diag=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.firebase && firebase.apps && firebase.apps.length && firebase.auth().currentUser, null, { timeout: 90000 });
const rep = await page.evaluate(async () => {
  const db = firebase.firestore(), L = [], T = t => t ? new Date(t).toLocaleString('el-GR', { timeZone: 'Europe/Athens' }) : '–';
  const [dmS, pfS, stS] = await Promise.all([db.collection('demo').get(), db.collection('approfiles').get(), db.collection('apstate').doc('main').get()]);
  const D = dmS.docs.map(d => Object.assign({ _id: d.id }, d.data())), PF = {}; pfS.docs.forEach(d => PF[d.id] = d.data());
  const st = stS.exists ? stS.data() : {}, gcfg = st.cfg || {};
  const A = D.filter(t => t.src === 'auto'), pid = t => (t.auto && t.auto.profile && t.auto.profile.id) || 'p_start';
  const closed = t => !!t.status && t.status !== 'open', sym = t => String(t.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  L.push('## ΣΥΝΟΛΑ');
  L.push(`demo έγγραφα ${D.length} · αυτόματες ${A.length} (ανοιχτές ${A.filter(t => !closed(t)).length}) · προφίλ ${Object.keys(PF).length} · πρώτη αυτόματη ${T(Math.min(...A.map(t => t.at || Infinity)))}`);
  const byP = {}; A.forEach(t => { const k = pid(t); byP[k] = (byP[k] || 0) + 1 }); L.push('ανά προφίλ: ' + Object.keys(byP).map(k => `${(PF[k] && PF[k].name) || k} ${byP[k]}`).join(' · '));

  /* 1. διπλές θέσεις */
  L.push('## 1. ΔΙΠΛΕΣ ΘΕΣΕΙΣ');
  const key = t => [pid(t), sym(t), t.auto && t.auto.strat, t.dir, t.auto && t.auto.tf, t.auto && t.auto.sigT].join('|'), G = {};
  A.filter(t => t.auto && t.auto.sigT).forEach(t => { (G[key(t)] = G[key(t)] || []).push(t) });
  const dup = Object.keys(G).filter(k => G[k].length > 1);
  L.push(`ίδιο σήμα (προφίλ+νόμισμα+στρατηγική+κατεύθυνση+tf+κερί) περισσότερες από 1 φορές: ${dup.length} ομάδες, ${dup.reduce((s, k) => s + G[k].length - 1, 0)} επιπλέον θέσεις`);
  dup.slice(0, 10).forEach(k => L.push('   ' + k + ' → ' + G[k].map(t => T(t.at) + ' ' + (t.status || '')).join(' / ')));
  const noSig = A.filter(t => !(t.auto && t.auto.sigT)).length; L.push(`αυτόματες χωρίς κερί σήματος (δεν ελέγχονται εδώ): ${noSig}`);
  /* ίδιο προφίλ + ίδιο νόμισμα ανοιχτά ταυτόχρονα (ο κανόνας λέει μία θέση ανά νόμισμα ανά προφίλ) */
  const iv = t => [t.filledAt || t.at || 0, closed(t) ? (t.exitAt || t.at || 0) : Date.now()];
  let ovl = []; const byPC = {}; A.filter(t => !t.ttl && !t.nofill).forEach(t => { const k = pid(t) + '|' + sym(t); (byPC[k] = byPC[k] || []).push(t) });
  Object.keys(byPC).forEach(k => { const a = byPC[k].sort((x, y) => (x.at || 0) - (y.at || 0)); for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { const p = iv(a[i]), q = iv(a[j]); if (q[0] < p[1] - 1000) ovl.push([k, a[i], a[j]]) } });
  L.push(`ίδιο προφίλ + ίδιο νόμισμα ανοιχτά ταυτόχρονα: ${ovl.length}`); ovl.slice(0, 8).forEach(o => L.push(`   ${o[0]}: ${T(o[1].at)} ${o[1].dir} (${o[1].auto && o[1].auto.strat}) και ${T(o[2].at)} ${o[2].dir} (${o[2].auto && o[2].auto.strat})`));

  /* 2. ταυτόχρονα ανοίγματα και όρια */
  L.push('## 2. ΤΑΥΤΟΧΡΟΝΑ ΑΝΟΙΓΜΑΤΑ ΚΑΙ ΟΡΙΑ');
  let near = 0, nearX = []; Object.keys(byP).forEach(p => { const a = A.filter(t => pid(t) === p).sort((x, y) => (x.at || 0) - (y.at || 0)); for (let i = 1; i < a.length; i++) if ((a[i].at || 0) - (a[i - 1].at || 0) < 5000) { near++; if (nearX.length < 6) nearX.push(`${p} ${sym(a[i - 1])}/${sym(a[i])} ${T(a[i].at)}`) } });
  L.push(`δύο ανοίγματα του ίδιου προφίλ μέσα σε 5″: ${near}` + (nearX.length ? ' · ' + nearX.join(' · ') : ''));
  const cfgOf = p => Object.assign({}, gcfg, (PF[p] && PF[p].cfg) || {});
  let overOpen = 0, overDay = 0, ex = [];
  Object.keys(byP).forEach(p => { const c = cfgOf(p), a = A.filter(t => pid(t) === p && !t.ttl), mo = +c.maxOpen || 0, md = +c.maxDay || 0;
    a.forEach(t => { const t0 = t.at || 0, open = a.filter(u => u !== t && (u.at || 0) < t0 && iv(u)[1] > t0 && !u.nofill).length, day = a.filter(u => u !== t && u.date === t.date && (u.at || 0) < t0).length;
      if (mo && open >= mo) { overOpen++; if (ex.length < 6) ex.push(`${p} ${T(t0)} ανοιχτές ${open}/${mo}`) } if (md && day >= md) overDay++ }) });
  L.push(`άνοιγμα ενώ ήταν ήδη γεμάτο το όριο ανοιχτών: ${overOpen} · πάνω από το όριο ημέρας: ${overDay}` + (ex.length ? ' · ' + ex.join(' · ') : ''));
  L.push('(τα όρια ελέγχονται με τις ΤΩΡΙΝΕΣ ρυθμίσεις· αν άλλαξαν στο μεταξύ, μερικές «υπερβάσεις» είναι παλιοί κανόνες)');

  /* 3. ρίσκο έναντι κανόνων */
  L.push('## 3. ΡΙΣΚΟ ΑΝΑ ΘΕΣΗ');
  let std = 0, stdBad = [], nonStd = 0, nsBad = [], noRisk = 0;
  A.filter(t => !t.ttl).forEach(t => { const e = +t.entry, s = +t.stop, q = +t.qty, ra = +t.riskAmt; if (!(ra > 0)) { noRisk++; return }
    const calc = Math.abs(e - s) * q; if (isFinite(calc) && Math.abs(calc - ra) / ra > 0.05) nsBad.push(`${pid(t)} ${sym(t)} ${T(t.at)} riskAmt ${ra.toFixed(1)} ≠ |e−s|×qty ${calc.toFixed(1)}`);
    if (t.auto && t.auto.std) { std++; const exp = (+t.margin) * (+t.lev) * 0.01; if (Math.abs(ra - exp) / exp > 0.05) stdBad.push(`${pid(t)} ${sym(t)} ${T(t.at)} ${ra.toFixed(1)} αντί ${exp.toFixed(1)}`) } else nonStd++ });
  const rp = A.filter(t => isFinite(+t.riskPct)).map(t => +t.riskPct).sort((a, b) => a - b), q = f => rp.length ? rp[Math.floor(f * (rp.length - 1))].toFixed(2) : '–';
  L.push(`ενιαίο μοτίβο (TP 2% / SL 1%): ${std} θέσεις, εκτός μοτίβου ρίσκου ${stdBad.length}` + (stdBad.length ? ' · ' + stdBad.slice(0, 4).join(' · ') : ''));
  L.push(`με ρίσκο από προφίλ: ${nonStd} · χωρίς riskAmt: ${noRisk} · riskAmt που δεν ταιριάζει με |είσοδος−stop|×ποσότητα: ${nsBad.length}` + (nsBad.length ? ' · ' + nsBad.slice(0, 4).join(' · ') : ''));
  L.push(`ρίσκο % κεφαλαίου ανά θέση: ελάχ. ${q(0)} · διάμεσο ${q(0.5)} · 90% ${q(0.9)} · μέγ. ${q(1)}`);
  /* ταυτόχρονο συνολικό ανοιχτό ρίσκο, όλα τα προφίλ μαζί */
  let peak = { v: 0, t: 0, n: 0 }; const ev = []; A.filter(t => !t.nofill && !t.ttl && +t.riskAmt > 0).forEach(t => { const i2 = iv(t); ev.push([i2[0], +t.riskAmt, 1], [i2[1], -(+t.riskAmt), -1]) }); ev.sort((a, b) => a[0] - b[0]);
  let cur = 0, cn = 0; ev.forEach(e => { cur += e[1]; cn += e[2]; if (cur > peak.v) peak = { v: cur, t: e[0], n: cn } });
  L.push(`μέγιστο ΣΥΝΟΛΙΚΟ ανοιχτό ρίσκο ως το stop (όλα τα προφίλ): ${peak.v.toFixed(0)} USDT σε ${peak.n} θέσεις, στις ${T(peak.t)}`);

  /* 4. ελλιπή δεδομένα */
  L.push('## 4. ΕΛΛΙΠΗ ΔΕΔΟΜΕΝΑ');
  const miss = { 'κλειστή χωρίς exitAt': t => closed(t) && !t.nofill && !t.exitAt, 'κλειστή χωρίς R': t => closed(t) && !t.nofill && !isFinite(+t.r), 'κλειστή χωρίς τιμή εξόδου': t => closed(t) && !t.nofill && !t.cancelled && !isFinite(+t.exit), 'χωρίς είσοδο/stop/στόχο': t => !(+t.entry > 0 && +t.stop > 0 && +t.target > 0), 'χωρίς προφίλ': t => !(t.auto && t.auto.profile), 'ανοιχτή πάνω από 7 μέρες': t => !closed(t) && Date.now() - (t.at || 0) > 7 * 864e5, 'limit γεμάτη χωρίς filledAt (ανοιχτή)': t => !closed(t) && t.ord === 'limit' && t.checkedAt && t.curR != null && !t.filledAt, 'χωρίς πλαίσιο απόφασης (βαθμός)': t => !(t.auto && t.auto.score != null) };
  Object.keys(miss).forEach(k => { const f = A.filter(miss[k]); L.push(`${k}: ${f.length}` + (f.length && f.length <= 6 ? ' · ' + f.map(t => `${pid(t)} ${sym(t)} ${T(t.at)} ${t.status || ''} ${t.ord || ''}${t.ttl ? ' turtle' : ''}${t.src === 'auto' ? '' : ' ' + t.src}`).join(' | ') : '')) });
  const big = A.filter(t => +t.riskPct > 3); L.push('ρίσκο > 3% του κεφαλαίου: ' + big.map(t => `${pid(t)} ${sym(t)} ${T(t.at)} ${(+t.riskPct).toFixed(2)}% (riskAmt ${(+t.riskAmt).toFixed(0)}, ${t.auto && t.auto.std ? 'μοτίβο' : 'προφίλ'})`).join(' | '));
  L.push('evalSrc: ' + Object.entries(A.reduce((m, t) => { const k = t.evalSrc || '–'; m[k] = (m[k] || 0) + 1; return m }, {})).map(x => x[0] + ' ' + x[1]).join(' · '));

  /* 5. αποτέλεσμα με Binance spot έναντι του καταγεγραμμένου */
  L.push('## 5. SL/TP: BINANCE SPOT ΕΝΑΝΤΙ ΚΑΤΑΓΕΓΡΑΜΜΕΝΟΥ (Crypto.com)');
  const C = A.filter(t => (t.status === 'win' || t.status === 'loss') && !t.nofill && !t.ttl && (t.filledAt || t.at) && t.exitAt).sort((a, b) => (b.exitAt || 0) - (a.exitAt || 0));
  const plain = C.filter(t => !t.mgmt || t.mgmt === 'none'), withMg = C.length - plain.length, S = plain.slice(0, 250);
  const kl = async (s, a, b) => { let o = [], t = a; for (let p = 0; p < 6 && t < b; p++) { const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${s}&interval=1m&startTime=${t}&endTime=${b}&limit=1000`); if (!r.ok) throw new Error('bn ' + r.status); const k = await r.json(); if (!k.length) break; o = o.concat(k.map(x => ({ t: +x[0], h: +x[2], l: +x[3] }))); t = +k[k.length - 1][0] + 60000; if (k.length < 1000) break } return o };
  const res = { same: 0, diff: 0, none: 0, amb: 0, err: 0, long: 0, dt: [] }, dx = [];
  for (let i = 0; i < S.length; i += 5) {
    await Promise.all(S.slice(i, i + 5).map(async t => {
      const f = t.filledAt || t.at, a = Math.ceil(f / 60000) * 60000, b = (t.exitAt || 0) + 65 * 60000, d = t.dir === 'short' ? -1 : 1, s = +t.stop, g = +t.target;
      if (b - a > 6000 * 60000) { res.long++; return }
      let bars; try { bars = await kl(sym(t).replace(/(USDT|USDC|USD)$/, '') + 'USDT', a, b) } catch (e) { res.err++; return }
      let hit = null, ht = 0, amb = false;
      for (const x of bars) { const hs = d > 0 ? x.l <= s : x.h >= s, hg = d > 0 ? x.h >= g : x.l <= g; if (hs || hg) { hit = hs ? 'loss' : 'win'; amb = hs && hg; ht = x.t; break } }
      if (amb) res.amb++;
      if (!hit) { res.none++; if (dx.length < 12) dx.push(`ΔΕΝ ΑΓΓΙΞΕ στο Binance: ${sym(t)} ${t.dir} ${T(t.at)} καταγράφηκε ${t.status} (${(+t.r).toFixed(2)}R)`); return }
      if (hit === t.status) { res.same++; res.dt.push((ht - t.exitAt) / 60000) } else { res.diff++; if (dx.length < 12) dx.push(`ΔΙΑΦΟΡΕΤΙΚΟ: ${sym(t)} ${t.dir} ${T(t.at)} καταγράφηκε ${t.status}, Binance ${hit} στις ${T(ht)}`) }
    }));
  }
  const n5 = res.same + res.diff + res.none, dts = res.dt.sort((a, b) => a - b), md = dts.length ? dts[Math.floor(dts.length / 2)] : NaN;
  L.push(`κλειστές win/loss: ${C.length} · με κινούμενο stop (δεν συγκρίνονται): ${withMg} · ελέγχθηκαν ${S.length}`);
  L.push(`ίδιο αποτέλεσμα: ${res.same} (${n5 ? Math.round(res.same / n5 * 100) : 0}%) · διαφορετικό: ${res.diff} (${n5 ? Math.round(res.diff / n5 * 100) : 0}%) · δεν άγγιξε τίποτα στο Binance ως την έξοδο: ${res.none} · stop+στόχος στο ίδιο λεπτό: ${res.amb} · πολύ μεγάλες: ${res.long} · σφάλματα: ${res.err}`);
  L.push(`διάμεση διαφορά χρόνου εξόδου (Binance − καταγεγραμμένο), όπου συμφωνούν: ${isFinite(md) ? md.toFixed(1) + '′' : '–'}`);
  dx.forEach(x => L.push('   ' + x));
  L.push('(σύγκριση: Binance spot κεριά 1m από το πρώτο ολόκληρο λεπτό μετά το γέμισμα ως 65′ μετά την καταγεγραμμένη έξοδο (ο αξιολογητής γράφει την αρχή του κεριού 15′/1h)· ίδιος κανόνας: αν πιάνονται και τα δύο στο ίδιο κερί, μετράει το stop)');

  /* 6. ποιος γράφει: εκτελέσεις από ποια καρτέλα/χρήστη */
  L.push('## 6. ΠΟΙΟΣ ΑΝΟΙΓΕΙ');
  const rb = {}; A.forEach(t => { const k = t.runBy || '?'; rb[k] = (rb[k] || 0) + 1 }); L.push('runBy: ' + Object.keys(rb).map(k => k.slice(0, 8) + '… ' + rb[k]).join(' · '));
  L.push('κοινή κατάσταση: τρέχει από ' + (st.runner || '–').slice(0, 8) + '… · tab ' + String(st.tab || '–').slice(0, 10) + ' · τελευταία ενημέρωση ' + T(st.at));
  return L.join('\n');
}).catch(e => 'σφάλμα: ' + e);
P(rep);
await browser.close();
fs.writeFileSync('audit-report.txt', out.join('\n'));
