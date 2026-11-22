/* 🧪 Backtest Pro — πολλές στρατηγικές × νομίσματα × timeframes, σε όλο το ιστορικό κεριών (Binance, cache στον browser).
   Φορτώνεται μόνο όταν ανοίξει η καρτέλα Backtest των Αναλύσεων. Δεν γράφει τίποτα στο Firebase εκτός από τις ρυθμίσεις σου (μία εγγραφή ανά εκτέλεση).
   Δύο φάσεις: (1) σήματα ανά στρατηγική/νόμισμα/TF (ακριβό, μένει στη μνήμη) και (2) προσομοίωση εξόδων με τις ρυθμίσεις σου (φθηνό) —
   γι' αυτό ο «Χάρτης παραμέτρων» δοκιμάζει δεκάδες συνδυασμούς στόχου × stop σε λίγα δευτερόλεπτα. */
(function () {
  'use strict';
  var W = window, D = document, A = null, ROOT = null;
  var TFS = ['15m', '1h', '4h', '1D'], TFMS = { '15m': 9e5, '1h': 36e5, '4h': 144e5, '1D': 864e5 };
  var CFG = { strats: [], coins: ['BTC', 'ETH', 'SOL'], tfs: ['1h', '4h'], period: 'all', from: '', to: '', dir: 'both',
    tgt: 2, tgtMode: 'strat', stopMode: 'strat', stopK: 1.5, stopPct: 1, be: false, maxBars: 0, fee: 0.05, slip: 0.02,
    cap: 10000, risk: 1, oos: 30, view3d: 'sum' };
  var SIG = {}, BARS = {}, RUN = { busy: false, stop: false, res: null, grid: null };
  try { var sv = JSON.parse(localStorage.getItem('tj-bp') || 'null'); if (sv) for (var k in sv) if (k in CFG) CFG[k] = sv[k] } catch (e) { }

  function $(s, r) { return (r || ROOT).querySelector(s) }
  function $$(s, r) { return Array.prototype.slice.call((r || ROOT).querySelectorAll(s)) }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function fR(x, d) { return !isFinite(x) ? '–' : (x >= 0 ? '+' : '') + x.toFixed(d == null ? 2 : d) + 'R' }
  function fP(x, d) { return !isFinite(x) ? '–' : (x >= 0 ? '+' : '') + x.toFixed(d == null ? 1 : d) + '%' }
  function cls(x) { return !isFinite(x) || Math.abs(x) < 1e-9 ? '' : x > 0 ? 'pos' : 'neg' }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms) }) }
  function save() {
    try { localStorage.setItem('tj-bp', JSON.stringify(CFG)) } catch (e) { }
    try { var db = A.db(), u = A.uid(); if (db && u && u !== 'me' && !W.__TJ_BOT) db.collection('uprefs').doc(u + '_bt').set({ cfg: JSON.stringify(CFG), at: Date.now() }).catch(function () { }) } catch (e) { }
  }
  var TTLS = [{ id: 'ttl1', t: '🐢 Turtle Σύστημα 1 (20/10)', fit: 'trend', ttl: 1, rule: 'Είσοδος στο σπάσιμο υψηλού/χαμηλού 20 κεριών, έξοδος στο αντίθετο κανάλι 10 κεριών, stop 2N, έως 4 μονάδες ανά +0,5N. Οι κανόνες της είναι δικοί της: στόχος/stop/breakeven των ρυθμίσεων δεν εφαρμόζονται.' }, { id: 'ttl2', t: '🐢 Turtle Σύστημα 2 (55/20)', fit: 'trend', ttl: 2, rule: 'Είσοδος στο σπάσιμο υψηλού/χαμηλού 55 κεριών, έξοδος στο αντίθετο κανάλι 20 κεριών, stop 2N, έως 4 μονάδες ανά +0,5N (όπως το προφίλ 🐢 Turtle 1D). Οι κανόνες της είναι δικοί της: στόχος/stop/breakeven των ρυθμίσεων δεν εφαρμόζονται.' }];
  function stratList() { return (A.ttl ? TTLS : []).concat(A.BT.map(function (s) { return { id: s.id, t: s.t, fit: A.FIT[s.id] || (s.gen ? (s.fit || 'trend') : 'trend'), gen: !!s.gen, rule: s.rule || '' } })) }
  function llv(b, a, c) { var m = Infinity; for (var k = Math.max(0, a); k <= c; k++)m = Math.min(m, b[k].l); return m }
  function hhv(b, a, c) { var m = -Infinity; for (var k = Math.max(0, a); k <= c; k++)m = Math.max(m, b[k].h); return m }

  /* ---------------- data ---------------- */
  function bars(coin, tf, prog) {
    var k = coin + '|' + tf; if (BARS[k]) return Promise.resolve(BARS[k]);
    return A.kl(coin, tf, prog).then(function (b) { return b && b.length ? b : A.fallback(coin, tf) }, function () { return A.fallback(coin, tf) })
      .then(function (b) { b = (b || []).filter(function (x) { return isFinite(x.c) && x.c > 0 }); var o = { b: b, I: b.length > 150 ? A.ind(b) : null }; BARS[k] = o; return o })
  }
  /* φάση 1: όλα τα σήματα μιας στρατηγικής σε ένα νόμισμα/TF (μία φορά, μετά μένουν στη μνήμη) */
  function signals(id, coin, tf) {
    var key = id + '|' + coin + '|' + tf; if (SIG[key]) return Promise.resolve(SIG[key]);
    if (/^ttl[12]$/.test(id)) return bars(coin, tf).then(function () { SIG[key] = { L: [], n: 0, ttl: 1 }; return SIG[key] });
    return bars(coin, tf).then(function (o) {
      var b = o.b, I = o.I, L = []; if (!I) { SIG[key] = { L: L, n: 0 }; return SIG[key] }
      return new Promise(function (res) {
        var i = 130, step = function () {
          if (RUN.stop) { res({ L: L, n: b.length, partial: true }); return }
          var end = Math.min(b.length, i + 4000);
          for (; i < end; i++) {
            for (var dd = 1; dd >= -1; dd -= 2) {
              var st = A.sig(id, b, I, i, dd); if (st != null && isFinite(st) && Math.abs(b[i].c - st) > 0) { L.push({ i: i, d: dd, st: st }); break }
            }
          }
          if (i < b.length) setTimeout(step, 0); else { SIG[key] = { L: L, n: b.length }; res(SIG[key]) }
        }; step()
      })
    })
  }
  /* φάση 2: είσοδος στο κλείσιμο του κεριού του σήματος, έξοδος με τις ρυθμίσεις (stop/στόχος/breakeven/μέγιστη διάρκεια/κόστη) */
  function simulate(job, P) {
    var o = BARS[job.coin + '|' + job.tf], b = o.b, I = o.I, S = SIG[job.id + '|' + job.coin + '|' + job.tf], out = [], busyTo = -1, notgt = A.NOTGT[job.id] && P.tgtMode === 'strat';
    if (/^ttl[12]$/.test(job.id)) { /* 🐢 η μηχανή Turtle της σελίδας (ίδια με το προφίλ Turtle 1D): pyramiding έως 4 μονάδες, έξοδος στο κανάλι */
      if (!A.ttl || b.length < 80) return out; var R0 = A.ttl(b, { sys: job.id === 'ttl2' ? 2 : 1, units: 4, fee: (P.fee || 0) + (P.slip || 0), dirs: P.dir });
      (R0.tr || []).forEach(function (t) { if (t.t < P.from || t.t > P.to) return; out.push({ id: job.id, coin: job.coin, tf: job.tf, d: t.d, t: t.t, xt: t.xt, r: t.r, rg: t.gross, cost: t.gross - t.r, e: t.e, s: t.e - t.d * 2 * t.N, x: t.x, bars: t.bars || Math.round((t.xt - t.t) / TFMS[job.tf]), hit: t.why === 'stop' ? 'stop' : 'exit', units: t.units }) });
      return out }
    var cost = (P.fee + P.slip) / 100;
    for (var s = 0; s < S.L.length; s++) {
      var g = S.L[s], i = g.i, d = g.d; if (i <= busyTo) continue;
      if (P.dir === 'long' && d < 0 || P.dir === 'short' && d > 0) continue;
      var x = b[i]; if (x.t < P.from || x.t > P.to) continue;
      var e = x.c, atr = I.atr[i], st = P.stopMode === 'atr' && isFinite(atr) ? e - d * P.stopK * atr : P.stopMode === 'pct' ? e * (1 - d * P.stopPct / 100) : g.st;
      var rk = Math.abs(e - st); if (!(rk > 0)) continue;
      var tg = notgt ? NaN : e + d * P.tgt * rk, sl = st, be = false, ex = null, xi = i, hit = '', pos = { hc: e };
      for (var j = i + 1; j < b.length; j++) {
        var y = b[j];
        if (d > 0) { if (y.o <= sl) { ex = y.o; hit = 'stop' } else if (y.l <= sl) { ex = sl; hit = 'stop' } else if (isFinite(tg) && y.o >= tg) { ex = y.o; hit = 'tgt' } else if (isFinite(tg) && y.h >= tg) { ex = tg; hit = 'tgt' } }
        else { if (y.o >= sl) { ex = y.o; hit = 'stop' } else if (y.h >= sl) { ex = sl; hit = 'stop' } else if (isFinite(tg) && y.o <= tg) { ex = y.o; hit = 'tgt' } else if (isFinite(tg) && y.l <= tg) { ex = tg; hit = 'tgt' } }
        if (ex == null && P.tgtMode === 'strat' && A.exitOnClose(job.id, b, I, j, d, pos)) { ex = y.c; hit = 'exit' }
        if (ex == null) pos.hc = d > 0 ? Math.max(pos.hc, y.c) : Math.min(pos.hc, y.c);
        if (ex == null && P.maxBars > 0 && j - i >= P.maxBars) { ex = y.c; hit = 'time' }
        if (ex != null) { xi = j; break }
        if (P.be && !be && (y.c - e) * d >= rk) { sl = e; be = true }
      }
      if (ex == null) break; /* ανοιχτή στο τέλος του ιστορικού: δεν μετράει */
      var r = (ex - e) * d / rk - (e + ex) * cost / rk; if (hit === 'stop' && be) hit = 'be';
      out.push({ id: job.id, coin: job.coin, tf: job.tf, d: d, t: x.t, xt: b[xi].t, r: r, rg: (ex - e) * d / rk, cost: (e + ex) * cost / rk, e: e, s: st, x: ex, bars: xi - i, hit: hit });
      busyTo = xi
    }
    return out
  }
  function metrics(T, P) {
    var n = T.length, m = { n: n }; if (!n) return m;
    var w = 0, gp = 0, gl = 0, sum = 0, sq = 0, streak = 0, worst = 0, hold = 0, sg = 0, sc = 0;
    T.forEach(function (t) { sg += t.rg || 0; sc += t.cost || 0; sum += t.r; sq += t.r * t.r; hold += t.bars; if (t.r > 0) { w++; gp += t.r; streak = 0 } else { gl -= t.r; streak++; worst = Math.max(worst, streak) } });
    var avg = sum / n, sd = Math.sqrt(Math.max(0, sq / n - avg * avg));
    var E = [...T].sort(function (a, b) { return a.xt - b.xt }), eq = P.cap, peak = P.cap, dd = 0, cR = 0, pkR = 0, ddR = 0, curve = [{ t: E[0].t, v: P.cap, r: 0 }];
    E.forEach(function (t) { eq *= 1 + t.r * P.risk / 100; if (eq < 0) eq = 0; peak = Math.max(peak, eq); dd = Math.max(dd, (peak - eq) / peak); cR += t.r; pkR = Math.max(pkR, cR); ddR = Math.max(ddR, pkR - cR); curve.push({ t: t.xt, v: eq, r: cR }) });
    var yrs = Math.max(1 / 52, (E[E.length - 1].xt - E[0].t) / (365.25 * 864e5));
    var mon = {}; E.forEach(function (t) { var dt = new Date(t.xt), k = dt.getFullYear() * 100 + dt.getMonth(); mon[k] = (mon[k] || 0) + t.r });
    var mk = Object.keys(mon), mp = mk.filter(function (k) { return mon[k] > 0 }).length;
    m.wr = w / n * 100; m.avg = avg; m.avgG = sg / n; m.avgC = sc / n; m.sum = sum; m.pf = gl > 0 ? gp / gl : gp > 0 ? Infinity : 0; m.sqn = sd > 0 ? Math.sqrt(Math.min(n, 100)) * avg / sd : 0;
    m.dd = dd * 100; m.ddR = ddR; m.ret = (eq / P.cap - 1) * 100; m.cagr = (Math.pow(Math.max(eq, 1e-9) / P.cap, 1 / yrs) - 1) * 100; m.streak = worst; m.hold = hold / n; m.curve = curve; m.mon = mon; m.monPos = mk.length ? mp / mk.length * 100 : NaN; m.yrs = yrs;
    return m
  }
  function group(T, key) { var o = {}; T.forEach(function (t) { var k = key(t); (o[k] || (o[k] = [])).push(t) }); return o }

  /* ---------------- run ---------------- */
  function params() {
    var now = Date.now(), pf = { '3m': 91, '6m': 182, '1y': 365, '2y': 730, '4y': 1461 }[CFG.period];
    var from = CFG.period === 'custom' && CFG.from ? new Date(CFG.from + 'T00:00:00').getTime() : pf ? now - pf * 864e5 : -Infinity;
    var to = CFG.period === 'custom' && CFG.to ? new Date(CFG.to + 'T23:59:59').getTime() : Infinity;
    return { from: from, to: to, dir: CFG.dir, tgt: +CFG.tgt || 2, tgtMode: CFG.tgtMode, stopMode: CFG.stopMode, stopK: +CFG.stopK || 1.5, stopPct: +CFG.stopPct || 1, be: !!CFG.be, maxBars: +CFG.maxBars || 0, fee: +CFG.fee || 0, slip: +CFG.slip || 0, cap: +CFG.cap || 10000, risk: +CFG.risk || 1 }
  }
  function jobs() { var J = []; CFG.strats.forEach(function (id) { CFG.coins.forEach(function (c) { CFG.tfs.forEach(function (tf) { J.push({ id: id, coin: c, tf: tf }) }) }) }); return J }
  function prog(t, p) { var e = $('#bpProg'); if (e) { e.hidden = !t; e.querySelector('span').textContent = t || ''; e.querySelector('i').style.width = Math.round((p || 0) * 100) + '%' } }
  function run() {
    if (RUN.busy) { RUN.stop = true; return }
    var J = jobs(); if (!J.length) { A.toast('Διάλεξε τουλάχιστον μία στρατηγική, ένα νόμισμα και ένα timeframe.'); return }
    save(); RUN.busy = true; RUN.stop = false; RUN.grid = null; RUN.chk = null; btnState(); var t0 = Date.now(), k = 0;
    var next = function () {
      if (RUN.stop || k >= J.length) return Promise.resolve();
      var j = J[k++]; prog('Σήματα ' + j.id.toUpperCase() + ' · ' + j.coin + ' ' + j.tf + ' (' + k + '/' + J.length + ')…', (k - 1) / J.length);
      return bars(j.coin, j.tf, function (n) { prog('Κατεβάζω ιστορικό ' + j.coin + ' ' + j.tf + ' · ' + n.toLocaleString('el-GR') + ' κεριά…', (k - 1) / J.length) })
        .then(function () { return signals(j.id, j.coin, j.tf) }).catch(function () { }).then(function () { return sleep(0) }).then(next)
    };
    next().then(function () {
      var P = params(), T = []; J.forEach(function (j) { if (SIG[j.id + '|' + j.coin + '|' + j.tf] && BARS[j.coin + '|' + j.tf]) T = T.concat(simulate(j, P)) });
      T.sort(function (a, b) { return a.t - b.t });
      var cut = T.length ? T[Math.floor(T.length * (1 - CFG.oos / 100))] : null, ts = cut ? cut.t : Infinity;
      RUN.res = { T: T, P: P, J: J, all: metrics(T, P), ins: metrics(T.filter(function (t) { return t.t < ts }), P), oos: metrics(T.filter(function (t) { return t.t >= ts }), P), oosFrom: ts, sec: (Date.now() - t0) / 1000, partial: RUN.stop };
      RUN.busy = false; RUN.stop = false; prog(''); btnState(); render()
    }).catch(function (e) { RUN.busy = false; prog(''); btnState(); A.toast('Σφάλμα backtest: ' + (e && e.message || e)) })
  }
  /* 🗻 Χάρτης παραμέτρων: στόχος (R) × stop (ATR) → μέσο R· ξαναχρησιμοποιεί τα σήματα, μόνο οι έξοδοι ξανατρέχουν */
  function grid() {
    if (!RUN.res) return; var TG = [1, 1.5, 2, 2.5, 3, 4], SK = [0.75, 1, 1.5, 2, 2.5, 3], G = [], best = null;
    TG.forEach(function (tg) {
      var row = []; SK.forEach(function (sk) {
        var P = Object.assign({}, RUN.res.P, { tgt: tg, tgtMode: 'fixed', stopMode: 'atr', stopK: sk }), T = [];
        RUN.res.J.forEach(function (j) { if (!/^ttl/.test(j.id) && SIG[j.id + '|' + j.coin + '|' + j.tf] && BARS[j.coin + '|' + j.tf]) T = T.concat(simulate(j, P)) });
        var m = metrics(T, P), c = { tg: tg, sk: sk, avg: m.avg || 0, n: m.n, pf: m.pf || 0, sum: m.sum || 0 }; row.push(c); if (m.n >= 30 && (!best || c.avg > best.avg)) best = c
      }); G.push(row)
    });
    RUN.grid = { TG: TG, SK: SK, G: G, best: best }; render(); setTimeout(function () { var e = $('#bpGrid'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 50)
  }

  /* ---------------- UI ---------------- */
  function chip(attr, v, on, lbl, title) { return '<button type="button" class="bpc' + (on ? ' on' : '') + '" ' + attr + '="' + esc(v) + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + lbl + '</button>' }
  function shell() {
    var SL = stratList(), coins = A.coins(); CFG.coins.forEach(function (c) { if (coins.indexOf(c) < 0) coins.push(c) });
    if (!CFG.strats.length) CFG.strats = SL.filter(function (s) { return !s.gen }).slice(0, 4).map(function (s) { return s.id });
    var grp = function (lbl, L) { return L.length ? '<div class="bpg"><span class="bpgl">' + lbl + '</span>' + L.map(function (s) { return chip('data-bps', s.id, CFG.strats.indexOf(s.id) >= 0, esc(s.t), s.rule) }).join('') + '</div>' : '' };
    ROOT.innerHTML = '<div class="bp">' +
      '<p class="muted bpintro">Διάλεξε <b>όσες στρατηγικές θες</b>, νομίσματα και timeframes, όρισε στόχο, stop και κόστη, και τρέξε τες <b>σε όλο το ιστορικό</b> (Binance: 15m έως 3 μήνες, 1h έως 1,5 χρόνο, 4h έως 4 χρόνια, 1D έως 7 χρόνια). Είσοδος στο κλείσιμο του κεριού του σήματος· όλα τα κεριά είναι κλειστά, χωρίς ματιά στο μέλλον.</p>' +
      '<div class="bpsec"><div class="bph">1 · Στρατηγικές <span class="muted" id="bpSN"></span><span class="bpq"><button type="button" class="linkbtn" data-bpq="all">όλες</button> · <button type="button" class="linkbtn" data-bpq="trend">τάσης</button> · <button type="button" class="linkbtn" data-bpq="range">εύρους</button> · <button type="button" class="linkbtn" data-bpq="gen">του Εργαστηρίου</button> · <button type="button" class="linkbtn" data-bpq="none">καμία</button></span></div>' +
      grp('🐢 Turtle', SL.filter(function (s) { return /^ttl/.test(s.id) })) + grp('↗ Τάσης', SL.filter(function (s) { return !s.gen && s.fit === 'trend' && !/^ttl/.test(s.id) })) + grp('↔ Εύρους / αντιστροφής', SL.filter(function (s) { return !s.gen && s.fit !== 'trend' })) + grp('🧬 Εργαστήριο', SL.filter(function (s) { return s.gen })) + '</div>' +
      '<div class="bpsec"><div class="bph">2 · Νομίσματα και timeframes <span class="bpq"><button type="button" class="linkbtn" data-bpcq="all">όλα</button> · <button type="button" class="linkbtn" data-bpcq="top">BTC/ETH/SOL</button></span></div><div class="bpg">' + coins.map(function (c) { return chip('data-bpco', c, CFG.coins.indexOf(c) >= 0, esc(c)) }).join('') + '<input id="bpAddC" class="bpin" placeholder="+ νόμισμα" maxlength="10" aria-label="Πρόσθεσε νόμισμα"></div>' +
      '<div class="bpg">' + TFS.map(function (t) { return chip('data-bptf', t, CFG.tfs.indexOf(t) >= 0, t) }).join('') + '</div></div>' +
      '<div class="bpsec"><div class="bph">3 · Κανόνες</div><div class="bpf">' +
      '<label>Περίοδος<select data-bpk="period"><option value="all">Όλο το ιστορικό</option><option value="4y">4 χρόνια</option><option value="2y">2 χρόνια</option><option value="1y">1 χρόνος</option><option value="6m">6 μήνες</option><option value="3m">3 μήνες</option><option value="custom">Από… έως…</option></select></label>' +
      '<label class="bpcus">Από<input type="date" data-bpk="from"></label><label class="bpcus">Έως<input type="date" data-bpk="to"></label>' +
      '<label>Κατεύθυνση<select data-bpk="dir"><option value="both">Long και Short</option><option value="long">Μόνο Long</option><option value="short">Μόνο Short</option></select></label>' +
      '<label>Έξοδος<select data-bpk="tgtMode"><option value="strat">Της στρατηγικής + στόχος</option><option value="fixed">Μόνο stop / στόχος</option></select></label>' +
      '<label>Στόχος (R)<input type="number" step="0.25" min="0.5" max="10" data-bpk="tgt"></label>' +
      '<label>Stop<select data-bpk="stopMode"><option value="strat">Της στρατηγικής</option><option value="atr">ATR ×</option><option value="pct">Σταθερό %</option></select></label>' +
      '<label class="bpatr">ATR ×<input type="number" step="0.25" min="0.25" max="6" data-bpk="stopK"></label><label class="bppct">Stop %<input type="number" step="0.1" min="0.1" max="20" data-bpk="stopPct"></label>' +
      '<label>Μέγιστη διάρκεια (κεριά, 0 = χωρίς)<input type="number" min="0" max="2000" data-bpk="maxBars"></label>' +
      '<label class="bpchk"><input type="checkbox" data-bpk="be"> Breakeven στο +1R</label>' +
      '</div></div>' +
      '<div class="bpsec"><div class="bph">4 · Κόστη και χρήματα</div><div class="bpf">' +
      '<label>Προμήθεια ανά πλευρά %<input type="number" step="0.01" min="0" max="1" data-bpk="fee"></label><label>Slippage ανά πλευρά %<input type="number" step="0.01" min="0" max="1" data-bpk="slip"></label>' +
      '<label>Αρχικό κεφάλαιο<input type="number" step="100" min="100" data-bpk="cap"></label><label>Ρίσκο ανά συναλλαγή %<input type="number" step="0.25" min="0.1" max="10" data-bpk="risk"></label>' +
      '<label title="Τα τελευταία X% των συναλλαγών μένουν στην άκρη ως «τεστ σε δεδομένα που δεν είδες» (out-of-sample)">Τεστ εκτός δείγματος %<input type="number" step="5" min="0" max="60" data-bpk="oos"></label>' +
      '</div></div>' +
      '<div class="bprun"><button type="button" class="btn primary" id="bpRun">▶ Τρέξε backtest</button><span class="muted" id="bpJobs"></span><div class="bpprog" id="bpProg" hidden><i></i><span></span></div></div>' +
      '<div id="bpOut"></div></div>';
    $$('[data-bpk]').forEach(function (e) { var k = e.getAttribute('data-bpk'); if (e.type === 'checkbox') e.checked = !!CFG[k]; else e.value = CFG[k] });
    vis(); counts()
  }
  function vis() { $$('.bpcus').forEach(function (e) { e.hidden = CFG.period !== 'custom' }); $$('.bpatr').forEach(function (e) { e.hidden = CFG.stopMode !== 'atr' }); $$('.bppct').forEach(function (e) { e.hidden = CFG.stopMode !== 'pct' }) }
  function counts() { var n = jobs().length, e = $('#bpJobs'), sn = $('#bpSN'); if (sn) sn.textContent = '(' + CFG.strats.length + ' επιλεγμένες)'; if (e) e.textContent = n ? CFG.strats.length + ' στρατηγικές × ' + CFG.coins.length + ' νομ. × ' + CFG.tfs.length + ' TF = ' + n + ' δοκιμές' : ''; btnState() }
  function btnState() { var b = $('#bpRun'); if (b) { b.textContent = RUN.busy ? '■ Σταμάτα' : '▶ Τρέξε backtest'; b.classList.toggle('danger', RUN.busy) } }
  function bind() {
    ROOT.addEventListener('click', function (ev) {
      var t = ev.target.closest('button'); if (!t || !ROOT.contains(t)) return;
      var tog = function (arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); t.classList.toggle('on', i < 0); counts() };
      if (t.hasAttribute('data-bps')) return tog(CFG.strats, t.getAttribute('data-bps'));
      if (t.hasAttribute('data-bpco')) return tog(CFG.coins, t.getAttribute('data-bpco'));
      if (t.hasAttribute('data-bptf')) return tog(CFG.tfs, t.getAttribute('data-bptf'));
      if (t.hasAttribute('data-bpq')) { var q = t.getAttribute('data-bpq'), SL = stratList(); CFG.strats = q === 'none' ? [] : SL.filter(function (s) { return q === 'all' ? true : q === 'gen' ? s.gen : !s.gen && (q === 'trend' ? s.fit === 'trend' : s.fit !== 'trend') }).map(function (s) { return s.id }); $$('[data-bps]').forEach(function (b) { b.classList.toggle('on', CFG.strats.indexOf(b.getAttribute('data-bps')) >= 0) }); counts(); return }
      if (t.hasAttribute('data-bpcq')) { var all = $$('[data-bpco]').map(function (b) { return b.getAttribute('data-bpco') }); CFG.coins = t.getAttribute('data-bpcq') === 'all' ? all : ['BTC', 'ETH', 'SOL']; $$('[data-bpco]').forEach(function (b) { b.classList.toggle('on', CFG.coins.indexOf(b.getAttribute('data-bpco')) >= 0) }); counts(); return }
      if (t.id === 'bpRun') return run();
      if (t.id === 'bpGridBtn') { t.disabled = true; t.textContent = '⏳ Υπολογίζω 36 συνδυασμούς…'; setTimeout(grid, 30); return }
      if (t.hasAttribute('data-bp3')) { CFG.view3d = t.getAttribute('data-bp3'); save3(); render(); return }
      if (t.id === 'bpAsk') return ask();
      if (t.id === 'bpChkBtn') { t.disabled = true; t.textContent = '⏳ Ελέγχω…'; setTimeout(check, 30); return }
      if (t.hasAttribute('data-bpsort')) { RUN.sort = t.getAttribute('data-bpsort'); render(); return }
    });
    ROOT.addEventListener('change', function (ev) {
      var e = ev.target, k = e.getAttribute && e.getAttribute('data-bpk'); if (k) { CFG[k] = e.type === 'checkbox' ? e.checked : e.type === 'number' ? +e.value : e.value; vis(); try { localStorage.setItem('tj-bp', JSON.stringify(CFG)) } catch (x) { } return }
      if (e.id === 'bpAddC') { var c = String(e.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, ''); e.value = ''; if (c.length >= 2 && CFG.coins.indexOf(c) < 0) { CFG.coins.push(c); var b = D.createElement('button'); b.type = 'button'; b.className = 'bpc on'; b.setAttribute('data-bpco', c); b.textContent = c; e.parentNode.insertBefore(b, e); counts() } }
    })
  }
  function save3() { try { localStorage.setItem('tj-bp', JSON.stringify(CFG)) } catch (e) { } }
  function ask() {
    var R = RUN.res; if (!R || !A.ask) return; var a = R.all, by = group(R.T, function (t) { return t.id }), nm = {}; stratList().forEach(function (s) { nm[s.id] = s.t });
    var L = Object.keys(by).map(function (k) { var m = metrics(by[k], R.P); return nm[k] + ': ' + m.n + ' συν., ' + fR(m.avg) + ' μέσο, PF ' + (isFinite(m.pf) ? m.pf.toFixed(2) : '∞') }).join('; ');
    A.ask('Έτρεξα backtest (' + R.J.length + ' δοκιμές, ' + CFG.coins.join('/') + ', ' + CFG.tfs.join('/') + '). Σύνολο: ' + a.n + ' συναλλαγές, επιτυχία ' + (a.wr || 0).toFixed(0) + '%, μέσο ' + fR(a.avg) + ', PF ' + (isFinite(a.pf) ? a.pf.toFixed(2) : '∞') + ', μέγιστη πτώση ' + (a.dd || 0).toFixed(1) + '%. Εκτός δείγματος: ' + (R.oos.n || 0) + ' συν., μέσο ' + fR(R.oos.avg) + '. Ανά στρατηγική: ' + L + '. Τι συμπεραίνεις και τι να δοκιμάσω μετά;')
  }

  /* ---------------- results ---------------- */
  function kpi(lbl, v, c, sub) { return '<div class="bpk"><span>' + lbl + '</span><b class="num ' + (c || '') + '">' + v + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' }
  function render() {
    var O = $('#bpOut'), R = RUN.res; if (!O) return; if (!R) { O.innerHTML = ''; return }
    var a = R.all, nm = {}; stratList().forEach(function (s) { nm[s.id] = s.t });
    if (!a.n) { O.innerHTML = '<div class="empty">Καμία συναλλαγή με αυτές τις ρυθμίσεις. Δοκίμασε περισσότερα νομίσματα, μεγαλύτερη περίοδο ή άλλο timeframe.</div>'; return }
    var verdict = a.n < 30 ? ['⚪', 'Λίγες συναλλαγές (' + a.n + '): κανένα συμπέρασμα ακόμα.'] : R.oos.n >= 15 && R.oos.avg > 0.05 && a.avg > 0.05 && a.pf > 1.15 ? ['🟢', 'Θετικό και μέσα και έξω από το δείγμα. Αξίζει δοκιμή στο demo.'] : a.avg > 0 && (R.oos.avg || 0) <= 0 ? ['🟠', 'Κερδίζει στο παλιό κομμάτι αλλά όχι στο τελευταίο ' + CFG.oos + '%: πιθανό overfitting ή άλλαξε η αγορά.'] : a.avg > 0 ? ['🟡', 'Οριακά θετικό: μικρό πλεονέκτημα που μπορεί να το φάνε τα κόστη.'] : ['🔴', 'Αρνητικό μετά τα κόστη.'];
    var h = '<div class="bpverd">' + verdict[0] + ' <b>' + verdict[1] + '</b> <span class="muted">· ' + R.J.length + ' δοκιμές σε ' + R.sec.toFixed(1) + '″' + (R.partial ? ' · σταμάτησε νωρίτερα' : '') + '</span></div>';
    h += '<div class="bpkpis">' + kpi('Συναλλαγές', a.n.toLocaleString('el-GR'), '', a.yrs.toFixed(1) + ' χρόνια') + kpi('Επιτυχία', a.wr.toFixed(1) + '%') + kpi('Μέσο R', fR(a.avg), cls(a.avg), 'σύνολο ' + fR(a.sum, 1)) + kpi('Χωρίς κόστη', fR(a.avgG), cls(a.avgG), 'τα κόστη τρώνε ' + (a.avgC || 0).toFixed(2) + 'R/συν.') + kpi('Profit factor', isFinite(a.pf) ? a.pf.toFixed(2) : '∞', a.pf >= 1 ? 'pos' : 'neg') +
      kpi('Απόδοση', fP(a.ret, 0), cls(a.ret), 'CAGR ' + fP(a.cagr)) + kpi('Μέγιστη πτώση', '−' + a.dd.toFixed(1) + '%', 'neg', fR(-a.ddR, 1)) + kpi('SQN', a.sqn.toFixed(2), a.sqn >= 2 ? 'pos' : a.sqn < 1 ? 'neg' : '', a.sqn >= 3 ? 'εξαιρετικό' : a.sqn >= 2 ? 'καλό' : a.sqn >= 1 ? 'μέτριο' : 'αδύναμο') + kpi('Χειρότερο σερί', a.streak + ' ήττες', '', 'μέση διάρκεια ' + a.hold.toFixed(0) + ' κεριά') + kpi('Θετικοί μήνες', isFinite(a.monPos) ? a.monPos.toFixed(0) + '%' : '–') + '</div>';
    h += '<div class="bpsplit"><div><b>Μέσα στο δείγμα</b> (' + (100 - CFG.oos) + '%): ' + (R.ins.n || 0) + ' συν. · <span class="num ' + cls(R.ins.avg) + '">' + fR(R.ins.avg) + '</span> · PF ' + (isFinite(R.ins.pf) ? (R.ins.pf || 0).toFixed(2) : '∞') + '</div><div><b>Εκτός δείγματος</b> (τελευταίο ' + CFG.oos + '%' + (isFinite(R.oosFrom) ? ', από ' + new Date(R.oosFrom).toLocaleDateString('el-GR') : '') + '): ' + (R.oos.n || 0) + ' συν. · <span class="num ' + cls(R.oos.avg) + '">' + fR(R.oos.avg) + '</span> · PF ' + (isFinite(R.oos.pf) ? (R.oos.pf || 0).toFixed(2) : '∞') + '</div></div>';
    h += '<div class="bpcharts"><div class="bpbox"><div class="bpbt">📈 Κεφάλαιο (με ρίσκο ' + CFG.risk + '% ανά συναλλαγή) και πτώση από κορυφή</div><canvas id="bpEq" height="230"></canvas></div><div class="bpbox"><div class="bpbt">📊 Κατανομή αποτελεσμάτων (R)</div><canvas id="bpHist" height="230"></canvas></div></div>';
    h += '<div class="bpbox"><div class="bpbt">🧊 3D: στρατηγική × νόμισμα <span class="bpq"><button type="button" class="linkbtn' + (CFG.view3d === 'sum' ? ' on' : '') + '" data-bp3="sum">σύνολο R</button> · <button type="button" class="linkbtn' + (CFG.view3d === 'avg' ? ' on' : '') + '" data-bp3="avg">μέσο R</button> · <button type="button" class="linkbtn' + (CFG.view3d === 'n' ? ' on' : '') + '" data-bp3="n">πλήθος</button></span> <span class="muted">σύρε για περιστροφή · ροδέλα για ζουμ</span></div><div id="bp3d" class="bp3d"></div><div id="bp3dTip" class="bp3tip" hidden></div></div>';
    h += '<div class="bpbox"><div class="bpbt">🗓 Μήνες (σύνολο R)</div>' + monthGrid(a.mon) + '</div>';
    /* tables */
    var srt = RUN.sort || 'sum', tbl = function (title, G, lab) {
      var rows = Object.keys(G).map(function (k) { var m = metrics(G[k], R.P); m.k = k; return m }).sort(function (x, y) { return (y[srt] || 0) - (x[srt] || 0) });
      return '<div class="bpbox"><div class="bpbt">' + title + '</div><div class="bptw"><table class="bpt"><thead><tr><th>' + esc(lab) + '</th>' + [['n', 'Συν.'], ['wr', 'Επιτ.'], ['avg', 'Μέσο R'], ['avgG', 'Χωρίς κόστη'], ['sum', 'Σύνολο R'], ['pf', 'PF'], ['dd', 'Πτώση'], ['sqn', 'SQN']].map(function (c) { return '<th><button type="button" class="linkbtn' + (srt === c[0] ? ' on' : '') + '" data-bpsort="' + c[0] + '">' + c[1] + (srt === c[0] ? ' ▾' : '') + '</button></th>' }).join('') + '</tr></thead><tbody>' +
        rows.map(function (m) { return '<tr><td>' + esc(lab === 'Στρατηγική' ? (nm[m.k] || m.k) : m.k) + '</td><td class="num">' + m.n + '</td><td class="num">' + m.wr.toFixed(0) + '%</td><td class="num ' + cls(m.avg) + '">' + fR(m.avg) + '</td><td class="num ' + cls(m.avgG) + '">' + fR(m.avgG) + '</td><td class="num ' + cls(m.sum) + '">' + fR(m.sum, 1) + '</td><td class="num">' + (isFinite(m.pf) ? m.pf.toFixed(2) : '∞') + '</td><td class="num neg">−' + m.dd.toFixed(1) + '%</td><td class="num">' + m.sqn.toFixed(2) + '</td></tr>' }).join('') + '</tbody></table></div></div>'
    };
    h += tbl('🏆 Ανά στρατηγική', group(R.T, function (t) { return t.id }), 'Στρατηγική') + '<div class="bpcharts">' + tbl('Ανά νόμισμα', group(R.T, function (t) { return t.coin }), 'Νόμισμα') + tbl('Ανά timeframe', group(R.T, function (t) { return t.tf }), 'TF') + '</div>';
    h += tbl('Ανά στρατηγική × timeframe', group(R.T, function (t) { return (nm[t.id] || t.id) + ' · ' + t.tf }), 'Συνδυασμός');
    /* parameter map */
    h += '<div class="bpbox" id="bpGrid"><div class="bpbt">🗻 Χάρτης παραμέτρων: στόχος × stop (ATR)</div>' + (RUN.grid ? gridHtml() : '<p class="muted">Δοκιμάζει 36 συνδυασμούς (στόχος 1–4R × stop 0,75–3 ATR) με τα ίδια σήματα και δείχνει αν το αποτέλεσμα είναι «σταθερό οροπέδιο» (καλό) ή «μυτερή κορυφή» (επικίνδυνο: τυχαίο). <button type="button" class="btn small" id="bpGridBtn">🗻 Φτιάξε τον χάρτη</button></p>') + '</div>';
    h += '<div class="bpbox" id="bpChk"><div class="bpbt">🔍 Έλεγχος ορθότητας</div>' + (RUN.chk ? RUN.chk : '<p class="muted">Ξανατρέχει τις ίδιες δοκιμές με την <b>κλασική μηχανή</b> της σελίδας (το παλιό backtest), συγκρίνει πλήθος και μέσο R, και σου δίνει <b>πραγματικές συναλλαγές με ημερομηνία και τιμές</b> για να τις δεις στο TradingView. <button type="button" class="btn small" id="bpChkBtn">🔍 Έλεγξε</button></p>') + '</div>';
    h += '<div class="bprun"><button type="button" class="btn small" id="bpAsk">🎓 Ρώτα τον Καθηγητή για τα αποτελέσματα</button><span class="muted">Τα αποτελέσματα του παρελθόντος δεν εγγυώνται τα μελλοντικά· το demo είναι η επόμενη δοκιμή.</span></div>';
    O.innerHTML = h; RUN.drawnW = 0; charts()
  }
  /* τα γραφήματα θέλουν πλάτος: αν η καρτέλα είναι κρυφτή τη στιγμή του render, ζωγραφίζονται μόλις φανεί (και ξανά σε αλλαγή μεγέθους) */
  function charts() { var R = RUN.res, w = ROOT && ROOT.clientWidth; if (!R || !R.all.n || !w || !D.getElementById('bpEq')) return; if (Math.abs(w - (RUN.drawnW || 0)) < 8) return; RUN.drawnW = w; drawEq(R.all.curve); drawHist(R.T); draw3d(R); if (RUN.grid) drawSurf() }
  function monthGrid(mon) {
    var ks = Object.keys(mon).map(Number).sort(function (a, b) { return a - b }); if (!ks.length) return '';
    var y0 = Math.floor(ks[0] / 100), y1 = Math.floor(ks[ks.length - 1] / 100), M = ['Ι', 'Φ', 'Μ', 'Α', 'Μ', 'Ι', 'Ι', 'Α', 'Σ', 'Ο', 'Ν', 'Δ'], mx = 0;
    ks.forEach(function (k) { mx = Math.max(mx, Math.abs(mon[k])) });
    var h = '<div class="bptw"><table class="bpm"><thead><tr><th></th>' + M.map(function (m) { return '<th>' + m + '</th>' }).join('') + '<th>Έτος</th></tr></thead><tbody>';
    for (var y = y1; y >= y0; y--) {
      var tot = 0; h += '<tr><th>' + y + '</th>'; for (var m = 0; m < 12; m++) { var v = mon[y * 100 + m]; if (v != null) tot += v; var a = v == null ? 0 : Math.min(1, Math.abs(v) / (mx || 1)); h += '<td style="background:' + (v == null ? 'transparent' : v >= 0 ? 'rgba(34,194,127,' + (0.15 + 0.6 * a) + ')' : 'rgba(239,83,80,' + (0.15 + 0.6 * a) + ')') + '">' + (v == null ? '' : (v >= 0 ? '+' : '') + v.toFixed(1)) + '</td>' }
      h += '<td class="num ' + cls(tot) + '"><b>' + (tot >= 0 ? '+' : '') + tot.toFixed(1) + '</b></td></tr>'
    }
    return h + '</tbody></table></div>'
  }
  function ctx2(id) { var c = D.getElementById(id); if (!c) return null; var w = c.parentNode.clientWidth - 2, dpr = W.devicePixelRatio || 1, hh = +c.getAttribute('height'); c.style.width = w + 'px'; c.style.height = hh + 'px'; c.width = w * dpr; c.height = hh * dpr; var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { g: g, w: w, h: hh } }
  function css(v, f) { try { var x = getComputedStyle(D.documentElement).getPropertyValue(v).trim(); return x || f } catch (e) { return f } }
  function drawEq(C) {
    var o = ctx2('bpEq'); if (!o || C.length < 2) return; var g = o.g, w = o.w, h = o.h, pad = 44, top = 10, eqH = (h - 30) * 0.72, ddT = top + eqH + 8, ddH = h - 22 - ddT;
    var t0 = C[0].t, t1 = C[C.length - 1].t, lo = Infinity, hi = -Infinity; C.forEach(function (p) { lo = Math.min(lo, p.v); hi = Math.max(hi, p.v) }); if (hi === lo) hi = lo + 1;
    var X = function (t) { return pad + (t - t0) / (t1 - t0 || 1) * (w - pad - 8) }, Y = function (v) { return top + (hi - v) / (hi - lo) * eqH };
    var fg = css('--muted', '#8a96a3'), ln = css('--line', '#2a3340'); g.font = '11px system-ui'; g.fillStyle = fg; g.strokeStyle = ln; g.lineWidth = 1;
    for (var k = 0; k <= 4; k++) { var v = lo + (hi - lo) * k / 4, y = Y(v); g.beginPath(); g.moveTo(pad, y); g.lineTo(w - 8, y); g.stroke(); g.fillText(Math.round(v).toLocaleString('el-GR'), 2, y + 4) }
    var up = C[C.length - 1].v >= C[0].v; g.strokeStyle = up ? '#22c27f' : '#ef5350'; g.lineWidth = 2; g.beginPath(); C.forEach(function (p, i) { var x = X(p.t), y = Y(p.v); if (i) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke();
    g.lineTo(X(t1), top + eqH); g.lineTo(X(t0), top + eqH); g.closePath(); g.fillStyle = up ? 'rgba(34,194,127,.10)' : 'rgba(239,83,80,.10)'; g.fill();
    var pk = C[0].v, mdd = 0, DD = C.map(function (p) { pk = Math.max(pk, p.v); var d = (pk - p.v) / pk; mdd = Math.max(mdd, d); return d }); mdd = mdd || 0.01;
    g.fillStyle = 'rgba(239,83,80,.45)'; g.beginPath(); g.moveTo(X(t0), ddT); C.forEach(function (p, i) { g.lineTo(X(p.t), ddT + DD[i] / mdd * ddH) }); g.lineTo(X(t1), ddT); g.closePath(); g.fill(); g.fillStyle = fg; g.fillText('−' + (mdd * 100).toFixed(1) + '%', 2, ddT + ddH);
    var yrs = (t1 - t0) / (365.25 * 864e5), step = yrs > 3 ? 365.25 * 864e5 : yrs > 0.8 ? 91.3 * 864e5 : 30.4 * 864e5;
    for (var tt = Math.ceil(t0 / step) * step; tt < t1; tt += step) { var d = new Date(tt); g.fillText((d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2), X(tt) - 12, h - 4) }
  }
  function drawHist(T) {
    var o = ctx2('bpHist'); if (!o) return; var g = o.g, w = o.w, h = o.h, B = {}, lo = -2, hi = 5, bw = 0.25;
    T.forEach(function (t) { var r = Math.max(lo, Math.min(hi - 0.001, t.r)), k = Math.floor(r / bw); B[k] = (B[k] || 0) + 1 });
    var ks = []; for (var k = Math.floor(lo / bw); k < hi / bw; k++)ks.push(k); var mx = 1; ks.forEach(function (k) { mx = Math.max(mx, B[k] || 0) });
    var pw = (w - 40) / ks.length, fg = css('--muted', '#8a96a3'); g.font = '11px system-ui';
    ks.forEach(function (k, i) { var v = B[k] || 0, bh = v / mx * (h - 34), x = 30 + i * pw; g.fillStyle = k * bw >= 0 ? '#22c27f' : '#ef5350'; g.fillRect(x + 1, h - 20 - bh, Math.max(1, pw - 2), bh) });
    g.fillStyle = fg; [-2, -1, 0, 1, 2, 3, 4, 5].forEach(function (r) { var x = 30 + (r / bw - Math.floor(lo / bw)) * pw; g.fillText((r > 0 ? '+' : '') + r + 'R', x - 8, h - 5) }); g.fillText(mx, 2, 14)
  }

  /* ---------------- 3D (three.js) ---------------- */
  var THREE_P = null, T3 = {};
  function three() { if (W.THREE) return Promise.resolve(W.THREE); if (THREE_P) return THREE_P; THREE_P = new Promise(function (ok, no) { var s = D.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = function () { ok(W.THREE) }; s.onerror = no; D.head.appendChild(s) }); return THREE_P }
  function scene3(el, build, tipFn) {
    if (T3[el.id]) T3[el.id].stop();
    return three().then(function (THREE) {
      var w = el.clientWidth || 600, h = el.clientHeight || 380, R = new THREE.WebGLRenderer({ antialias: true, alpha: true }); R.setPixelRatio(Math.min(2, W.devicePixelRatio || 1)); R.setSize(w, h); el.innerHTML = ''; el.appendChild(R.domElement);
      var S = new THREE.Scene(), C = new THREE.PerspectiveCamera(40, w / h, 0.1, 500); S.add(new THREE.AmbientLight(0xffffff, 0.55)); var dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(8, 20, 12); S.add(dl);
      var info = build(THREE, S), rad = info.r || 18, th = 0.8, ph = 0.95, zoom = 1, drag = null, run = true, hov = null, ray = new THREE.Raycaster(), mv = new THREE.Vector2();
      var place = function () { C.position.set(Math.sin(th) * Math.cos(ph) * rad * zoom, Math.sin(ph) * rad * zoom, Math.cos(th) * Math.cos(ph) * rad * zoom); C.lookAt(0, info.cy || 0, 0) };
      var cv = R.domElement; cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, th: th, ph: ph }; cv.setPointerCapture(e.pointerId) });
      cv.addEventListener('pointermove', function (e) {
        if (drag) { th = drag.th - (e.clientX - drag.x) * 0.008; ph = Math.max(0.1, Math.min(1.45, drag.ph + (e.clientY - drag.y) * 0.006)); return }
        var r = cv.getBoundingClientRect(); mv.x = (e.clientX - r.left) / r.width * 2 - 1; mv.y = -(e.clientY - r.top) / r.height * 2 + 1; ray.setFromCamera(mv, C);
        var hit = ray.intersectObjects(info.pick || [])[0], tip = D.getElementById('bp3dTip'); hov = hit ? hit.object : null;
        if (tip) { if (hov && hov.userData && tipFn) { tip.hidden = false; tip.innerHTML = tipFn(hov.userData); tip.style.left = (e.clientX - el.getBoundingClientRect().left + 14) + 'px'; tip.style.top = (e.clientY - el.getBoundingClientRect().top + 10) + 'px' } else tip.hidden = true }
      });
      cv.addEventListener('pointerup', function () { drag = null }); cv.addEventListener('pointerleave', function () { var tip = D.getElementById('bp3dTip'); if (tip) tip.hidden = true });
      cv.addEventListener('wheel', function (e) { e.preventDefault(); zoom = Math.max(0.45, Math.min(2.2, zoom * (e.deltaY > 0 ? 1.08 : 0.93))) }, { passive: false });
      var loop = function () { if (!run || !D.body.contains(cv)) { run = false; R.dispose(); return } if (!drag) th += 0.0015; place(); R.render(S, C); requestAnimationFrame(loop) }; loop();
      T3[el.id] = { stop: function () { run = false } }; return T3[el.id]
    })
  }
  function label3(THREE, txt, col, sz) { var c = D.createElement('canvas'), g = c.getContext('2d'), f = 44; g.font = 'bold ' + f + 'px system-ui'; var tw = g.measureText(txt).width + 16; c.width = tw; c.height = f + 16; g.font = 'bold ' + f + 'px system-ui'; g.fillStyle = col || '#cfd8e3'; g.textBaseline = 'middle'; g.fillText(txt, 8, c.height / 2); var t = new THREE.CanvasTexture(c), m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }), s = new THREE.Sprite(m); var k = (sz || 0.9) / c.height * 1.0; s.scale.set(c.width * k, c.height * k, 1); return s }
  function draw3d(R) {
    var el = D.getElementById('bp3d'); if (!el) return; var nm = {}; stratList().forEach(function (s) { nm[s.id] = s.t });
    var by = {}, ss = [], cs = []; R.T.forEach(function (t) { var k = t.id + '|' + t.coin; (by[k] || (by[k] = [])).push(t); if (ss.indexOf(t.id) < 0) ss.push(t.id); if (cs.indexOf(t.coin) < 0) cs.push(t.coin) });
    var V = {}, mx = 0, mode = CFG.view3d; Object.keys(by).forEach(function (k) { var m = metrics(by[k], R.P), v = mode === 'avg' ? m.avg : mode === 'n' ? m.n : m.sum; V[k] = { v: v, m: m }; mx = Math.max(mx, Math.abs(v)) }); mx = mx || 1;
    scene3(el, function (THREE, S) {
      var gap = 1.6, ox = (ss.length - 1) * gap / 2, oz = (cs.length - 1) * gap / 2, pick = [], H = 7;
      var floor = new THREE.Mesh(new THREE.PlaneGeometry(ss.length * gap + 2, cs.length * gap + 2), new THREE.MeshPhongMaterial({ color: 0x1b2430, transparent: true, opacity: 0.85, side: THREE.DoubleSide })); floor.rotation.x = -Math.PI / 2; S.add(floor);
      var grid = new THREE.GridHelper(Math.max(ss.length, cs.length) * gap + 2, Math.max(ss.length, cs.length) * 2, 0x334155, 0x253040); grid.position.y = 0.01; S.add(grid);
      ss.forEach(function (id, i) { cs.forEach(function (c, j) { var o = V[id + '|' + c]; if (!o) return; var v = o.v, hh = Math.max(0.06, Math.abs(v) / mx * H), pos = mode === 'n' ? true : v >= 0;
        var col = mode === 'n' ? 0x4f8cff : pos ? (o.m.pf >= 1.3 ? 0x22c27f : 0x7fd8a8) : (o.m.pf < 0.8 ? 0xef5350 : 0xf3a3a1);
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(1.05, hh, 1.05), new THREE.MeshPhongMaterial({ color: col, transparent: true, opacity: 0.92, shininess: 60 }));
        mesh.position.set(i * gap - ox, pos ? hh / 2 : -hh / 2, j * gap - oz); mesh.userData = { s: nm[id] || id, c: c, m: o.m }; S.add(mesh); pick.push(mesh) }) });
      ss.forEach(function (id, i) { var l = label3(THREE, (nm[id] || id).slice(0, 22), '#cfd8e3', 0.55); l.position.set(i * gap - ox, 0.2, oz + 1.6); S.add(l) });
      cs.forEach(function (c, j) { var l = label3(THREE, c, '#9fb3c8', 0.6); l.position.set(-ox - 1.8, 0.2, j * gap - oz); S.add(l) });
      return { pick: pick, r: Math.max(14, Math.max(ss.length, cs.length) * gap * 1.6), cy: 1 }
    }, function (u) { var m = u.m; return '<b>' + esc(u.s) + '</b> · ' + esc(u.c) + '<br>' + m.n + ' συν. · επιτ. ' + m.wr.toFixed(0) + '%<br>μέσο <b class="' + cls(m.avg) + '">' + fR(m.avg) + '</b> · σύνολο ' + fR(m.sum, 1) + '<br>PF ' + (isFinite(m.pf) ? m.pf.toFixed(2) : '∞') + ' · πτώση −' + m.dd.toFixed(1) + '%' })
      .catch(function () { el.innerHTML = '<p class="muted" style="padding:1rem">Το 3D δεν φορτώθηκε (χωρίς WebGL ή χωρίς σύνδεση στο cdnjs). Οι πίνακες από κάτω έχουν τα ίδια νούμερα.</p>' })
  }
  /* 🔍 σύγκριση με την κλασική μηχανή (runBt) στις ίδιες συνθήκες: έξοδος και stop της στρατηγικής, ίδιος στόχος/κόστη */
  function check() {
    var R = RUN.res; if (!R || !A.run) { RUN.chk = '<p class="muted">Δεν γίνεται έλεγχος σε αυτή την έκδοση.</p>'; render(); return }
    var nm = {}; stratList().forEach(function (s) { nm[s.id] = s.t }); var dirs = R.P.dir === 'long' ? [1] : R.P.dir === 'short' ? [-1] : [1, -1];
    var P = Object.assign({}, R.P, { tgtMode: 'strat', stopMode: 'strat', be: false, maxBars: 0 }), rows = [], ok = 0, all = 0, sample = [];
    R.J.slice(0, 12).forEach(function (j) {
      var o = BARS[j.coin + '|' + j.tf]; if (/^ttl/.test(j.id) || !o || !o.I || !SIG[j.id + '|' + j.coin + '|' + j.tf]) return;
      var mine = simulate(j, P), old = A.run(o.b, j.id, dirs, P.tgt, P.fee + P.slip, P.from === -Infinity ? null : P.from, P.to === Infinity ? null : P.to);
      var ma = mine.length ? mine.reduce(function (s2, t) { return s2 + t.r }, 0) / mine.length : 0, oa = old.length ? old.reduce(function (s2, t) { return s2 + t.r }, 0) / old.length : 0;
      var same = Math.abs(mine.length - old.length) <= 1 && Math.abs(ma - oa) < 0.02; all++; if (same) ok++;
      rows.push('<tr><td>' + esc(nm[j.id] || j.id) + ' · ' + j.coin + ' ' + j.tf + '</td><td class="num">' + mine.length + ' / ' + old.length + '</td><td class="num">' + fR(ma) + ' / ' + fR(oa) + '</td><td>' + (same ? '✅' : '⚠️') + '</td></tr>');
      mine.slice(-2).forEach(function (t) { sample.push(t) })
    });
    var f = function (x) { return !isFinite(x) ? '–' : Math.abs(x) >= 100 ? x.toFixed(2) : Math.abs(x) >= 1 ? x.toFixed(4) : x.toPrecision(5) }, dt = function (t) { var d = new Date(t); return d.toLocaleDateString('el-GR') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') };
    RUN.chk = '<p><b>' + (ok === all ? '✅ Η νέα μηχανή δίνει τα ίδια αποτελέσματα με την κλασική σε ' + ok + '/' + all + ' δοκιμές.' : '⚠️ Διαφορά σε ' + (all - ok) + '/' + all + ' δοκιμές: στείλε μου φωτογραφία.') + '</b> <span class="muted">(Pro / κλασική)</span></p>' +
      '<div class="bptw"><table class="bpt"><thead><tr><th>Δοκιμή</th><th>Συναλλαγές</th><th>Μέσο R</th><th></th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="muted" style="margin-top:.6rem">Δείγμα πραγματικών συναλλαγών για έλεγχο στο TradingView (ώρα Ελλάδας· η είσοδος γίνεται στο <b>κλείσιμο</b> του κεριού του σήματος):</p><div class="bptw"><table class="bpt"><thead><tr><th>Στρατηγική</th><th>Νόμισμα</th><th>Είσοδος</th><th>Κατ.</th><th>Τιμή</th><th>Stop</th><th>Έξοδος</th><th>Πώς</th><th>R καθαρό</th></tr></thead><tbody>' +
      sample.slice(0, 12).map(function (t) { return '<tr><td>' + esc(nm[t.id] || t.id) + '</td><td>' + t.coin + ' ' + t.tf + '</td><td>' + dt(t.t + TFMS[t.tf]) + '</td><td>' + (t.d > 0 ? '▲ Long' : '▼ Short') + '</td><td class="num">' + f(t.e) + '</td><td class="num">' + f(t.s) + '</td><td class="num">' + f(t.x) + ' · ' + dt(t.xt) + '</td><td>' + ({ stop: 'stop', tgt: 'στόχος', exit: 'κανόνας', time: 'χρόνος', be: 'breakeven' }[t.hit] || t.hit) + '</td><td class="num ' + cls(t.r) + '">' + fR(t.r) + '</td></tr>' }).join('') + '</tbody></table></div>';
    render(); setTimeout(function () { var e = $('#bpChk'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 50)
  }

  function gridHtml() {
    var G = RUN.grid, b = G.best, mx = 0; G.G.forEach(function (r) { r.forEach(function (c) { mx = Math.max(mx, Math.abs(c.avg)) }) }); mx = mx || 1;
    var h = '<div class="bpcharts"><div><div id="bpSurf" class="bp3d" style="height:340px"></div></div><div class="bptw"><table class="bpm bpgrid"><thead><tr><th>Στόχος ↓ / Stop →</th>' + G.SK.map(function (k) { return '<th>' + k + ' ATR</th>' }).join('') + '</tr></thead><tbody>' +
      G.G.map(function (r, i) { return '<tr><th>' + G.TG[i] + 'R</th>' + r.map(function (c) { var a = Math.min(1, Math.abs(c.avg) / mx), isB = b && c === b; return '<td title="' + c.n + ' συναλλαγές · PF ' + (isFinite(c.pf) ? c.pf.toFixed(2) : '∞') + '" style="background:' + (c.avg >= 0 ? 'rgba(34,194,127,' + (0.12 + 0.6 * a) + ')' : 'rgba(239,83,80,' + (0.12 + 0.6 * a) + ')') + (isB ? ';outline:2px solid #ffd27a' : '') + '">' + fR(c.avg) + '</td>' }).join('') + '</tr>' }).join('') + '</tbody></table>' +
      (b ? '<p class="muted">Καλύτερο: <b>στόχος ' + b.tg + 'R, stop ' + b.sk + ' ATR</b> → ' + fR(b.avg) + ' σε ' + b.n + ' συναλλαγές. Κοίτα αν και οι <b>γειτονικές</b> τιμές είναι πράσινες: αν ναι, το αποτέλεσμα είναι σταθερό· αν μόνο αυτή, είναι μάλλον τύχη.</p>' : '<p class="muted">Λίγες συναλλαγές για συμπέρασμα (χρειάζονται ≥ 30 ανά συνδυασμό).</p>') + '</div></div>';
    return h
  }
  function drawSurf() {
    var el = D.getElementById('bpSurf'), G = RUN.grid; if (!el || !G) return; var mx = 0; G.G.forEach(function (r) { r.forEach(function (c) { mx = Math.max(mx, Math.abs(c.avg)) }) }); mx = mx || 1;
    scene3(el, function (THREE, S) {
      var nx = G.SK.length, nz = G.TG.length, sx = 1.6, H = 5, geo = new THREE.PlaneGeometry((nx - 1) * sx, (nz - 1) * sx, nx - 1, nz - 1), pos = geo.attributes.position, cols = [];
      for (var k = 0; k < pos.count; k++) { var ix = k % nx, iz = Math.floor(k / nx), c = G.G[nz - 1 - iz][ix], y = c.avg / mx * H; pos.setZ(k, y); var a = Math.min(1, Math.abs(c.avg) / mx); cols.push(c.avg >= 0 ? 0.15 : 0.55 + 0.4 * a, c.avg >= 0 ? 0.45 + 0.5 * a : 0.2, c.avg >= 0 ? 0.35 : 0.2) }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
      var m = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, shininess: 30, transparent: true, opacity: 0.95 })); m.rotation.x = -Math.PI / 2; S.add(m);
      var wf = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.15 })); wf.rotation.x = -Math.PI / 2; S.add(wf);
      var zero = new THREE.Mesh(new THREE.PlaneGeometry((nx - 1) * sx + 1, (nz - 1) * sx + 1), new THREE.MeshBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.08, side: THREE.DoubleSide })); zero.rotation.x = -Math.PI / 2; S.add(zero);
      G.SK.forEach(function (k, i) { var l = label3(THREE, k + ' ATR', '#9fb3c8', 0.45); l.position.set(i * sx - (nx - 1) * sx / 2, 0, (nz - 1) * sx / 2 + 1); S.add(l) });
      G.TG.forEach(function (t, i) { var l = label3(THREE, t + 'R', '#9fb3c8', 0.45); l.position.set(-(nx - 1) * sx / 2 - 1.2, 0, (nz - 1 - i) * sx - (nz - 1) * sx / 2); S.add(l) });
      return { r: 14, cy: 0 }
    }).then(function () { /* η επιφάνεια έχει δικό της loop· το 3D των στρατηγικών ξαναχτίζεται στο επόμενο render */ })
  }

  /* ---------------- styles ---------------- */
  function styles() {
    if (D.getElementById('bpCss')) return; var s = D.createElement('style'); s.id = 'bpCss';
    s.textContent = '.bp{display:flex;flex-direction:column;gap:.7rem}.bpintro{margin:.2rem 0}.bpsec{border:1px solid var(--line);border-radius:12px;padding:.6rem .7rem;background:var(--surface)}' +
      '.bph{font-weight:700;margin-bottom:.4rem;display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline}.bpq{font-weight:400;font-size:.8rem;margin-left:auto}.bpq .on{font-weight:700;text-decoration:underline}' +
      '.bpg{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:.25rem 0}.bpgl{font-size:.74rem;color:var(--muted);min-width:7.5rem}' +
      '.bpc{border:1px solid var(--line);background:var(--sunk,transparent);color:var(--fg);border-radius:999px;padding:.25rem .65rem;font:inherit;font-size:.8rem;cursor:pointer;transition:.12s}.bpc:hover{border-color:var(--accent)}.bpc.on{background:color-mix(in srgb,var(--accent) 22%,transparent);border-color:var(--accent);color:var(--fg);font-weight:600}' +
      '.bpin{width:7rem;border:1px dashed var(--line);border-radius:999px;padding:.22rem .6rem;background:transparent;color:var(--fg);font:inherit;font-size:.8rem}' +
      '.bpf{display:grid;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));gap:.5rem}.bpf label{display:flex;flex-direction:column;gap:.15rem;font-size:.78rem;color:var(--muted)}.bpf input,.bpf select{font:inherit;font-size:.86rem;color:var(--fg);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:.35rem .45rem}.bpf .bpchk{flex-direction:row;align-items:center;gap:.4rem;color:var(--fg)}' +
      '.bprun{display:flex;flex-wrap:wrap;align-items:center;gap:.7rem}.bprun .danger{background:#ef5350;border-color:#ef5350}.bpprog{flex:1 1 16rem;position:relative;height:1.6rem;border:1px solid var(--line);border-radius:8px;overflow:hidden}.bpprog i{position:absolute;inset:0 auto 0 0;background:color-mix(in srgb,var(--accent) 30%,transparent);transition:width .2s}.bpprog span{position:relative;font-size:.76rem;padding:0 .5rem;line-height:1.6rem}' +
      '.bpverd{padding:.55rem .7rem;border-radius:10px;background:var(--surface);border:1px solid var(--line)}.bpkpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.45rem}.bpk{border:1px solid var(--line);border-radius:10px;padding:.45rem .6rem;background:var(--surface);display:flex;flex-direction:column}.bpk span{font-size:.72rem;color:var(--muted)}.bpk b{font-size:1.15rem}.bpk small{font-size:.7rem;color:var(--muted)}' +
      '.bpsplit{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;font-size:.82rem}.bpsplit>div{border:1px solid var(--line);border-radius:10px;padding:.45rem .6rem}' +
      '.bpcharts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:.6rem}.bpbox{border:1px solid var(--line);border-radius:12px;padding:.55rem .6rem;background:var(--surface);position:relative;min-width:0}.bpbt{font-weight:700;font-size:.86rem;margin-bottom:.4rem;display:flex;flex-wrap:wrap;gap:.5rem;align-items:baseline}' +
      '.bp3d{height:400px;border-radius:10px;background:radial-gradient(ellipse at 50% 30%,#1c2633,#0b1016);overflow:hidden;cursor:grab}.bp3d:active{cursor:grabbing}.bp3tip{position:absolute;pointer-events:none;background:rgba(10,15,22,.94);color:#e8eef5;border:1px solid #334155;border-radius:8px;padding:.4rem .55rem;font-size:.76rem;line-height:1.45;z-index:5}.bp3tip .pos{color:#6dffb8}.bp3tip .neg{color:#ff8f9b}' +
      '.bptw{overflow:auto;max-width:100%}.bpt{width:100%;border-collapse:collapse;font-size:.8rem}.bpt th,.bpt td{padding:.28rem .45rem;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}.bpt th:first-child,.bpt td:first-child{text-align:left;white-space:normal}.bpt .linkbtn.on{font-weight:700}' +
      '.bpm{border-collapse:separate;border-spacing:2px;font-size:.72rem}.bpm th{color:var(--muted);font-weight:600;padding:.15rem .3rem}.bpm td{min-width:2.6rem;text-align:center;padding:.22rem .2rem;border-radius:4px}.bpgrid td{min-width:3.6rem}' +
      '@media (max-width:640px){.bpsplit{grid-template-columns:1fr}.bp3d{height:300px}.bpgl{min-width:100%}}';
    D.head.appendChild(s)
  }

  W.BTPRO = {
    mount: function (el, api) {
      A = api; ROOT = el; styles(); shell(); if (!ROOT.__bound) { bind(); ROOT.__bound = 1; try { new ResizeObserver(function () { charts() }).observe(ROOT) } catch (e) { } }
      try { var db = A.db(), u = A.uid(); if (db && u && u !== 'me') db.collection('uprefs').doc(u + '_bt').get().then(function (sn) { var d = sn.exists && sn.data(); if (d && d.cfg && !RUN.busy && !RUN.res) { var o = JSON.parse(d.cfg); for (var k in o) if (k in CFG) CFG[k] = o[k]; shell() } }).catch(function () { }) } catch (e) { }
      if (RUN.res) render()
    },
    _cfg: CFG, _run: RUN, _sig: SIG
  };
})();
