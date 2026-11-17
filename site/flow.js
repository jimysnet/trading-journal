/* 🔬 Order Flow — επαγγελματική ανάλυση ροής εντολών, δωρεάν, με τα δημόσια δεδομένα των ανταλλακτηρίων.
   Footprint (Bid×Ask, Delta, Volume), Heatmap βάθους, Big Trades, Sweeps, Icebergs, Ρευστοποιήσεις (stop runs),
   Volume Profile, VWAP, DOM, Time & Sales, Delta / CVD / Open Interest, Options X-Ray (Deribit: OI, GEX, Max Pain).
   Πηγές: Binance (WebSocket + REST, χωρίς κλειδί), Deribit (REST). Τίποτα δεν εκτελεί εντολές. */
(function () {
  'use strict';
  var D = document, W = window;
  var TF = { '1m': 6e4, '5m': 3e5, '15m': 9e5, '1h': 36e5 };
  var COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX', 'LINK', 'LTC', 'SUI', 'HBAR', 'ZEC', 'HYPE', 'TRX', 'DOT', 'NEAR', 'APT', 'ARB', 'OP', 'PEPE', 'WIF', 'TON', 'BCH'];
  var C = { bg: '#0a0e13', panel: '#0e141b', grid: '#17212c', axis: '#8597a8', txt: '#d6e2ee', mut: '#6f8192', up: '#22c27f', dn: '#ef4f5f', vah: '#5cb3ff', poc: '#ffc443', val: '#d08bff', vwap: '#c77dff', liq: '#ffb020', ice: '#5ef0ff', sw: '#ff6bd6', cur: '#ffffff' };
  var MULTS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000];
  var FONT = '11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

  /* ---------- ρυθμίσεις (ανά browser) ---------- */
  var CFG = { sym: 'BTC', venue: 'f', tf: '1m', mode: 'fp_ba', mult: 'auto', big: 0, sub: { delta: 1, cvd: 1, oi: 1 }, sh: { heat: 1, big: 1, liq: 1, sw: 1, ice: 1, vp: 1, vwap: 1, mlv: 1, opt: 1, imb: 1 }, view: 'chart', oc: 'BTC', oexp: 'all', tapeMin: 0 };
  try { var sv = JSON.parse(localStorage.getItem('tj-flow') || 'null'); if (sv) { for (var k in sv) if (k in CFG) CFG[k] = (typeof CFG[k] === 'object' && !Array.isArray(CFG[k])) ? Object.assign({}, CFG[k], sv[k]) : sv[k] } } catch (e) { }
  function saveCfg() { try { localStorage.setItem('tj-flow', JSON.stringify(CFG)) } catch (e) { } }

  /* ---------- βοηθητικά ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function nice(x) { var e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f < 1.5 ? 1 : f < 2.25 ? 2 : f < 3.5 ? 2.5 : f < 7.5 ? 5 : 10) * e }
  function fv(v) { var a = Math.abs(v); if (!isFinite(v)) return '–'; if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M'; if (a >= 1e4) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1) + 'k'; if (a >= 100) return v.toFixed(0); if (a >= 10) return v.toFixed(1); if (a >= 1) return v.toFixed(2); if (a === 0) return '0'; return v.toPrecision(2) }
  function usd(v) { return '$' + fv(v) }
  function hm(t, sec) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + (sec ? ':' + ('0' + d.getSeconds()).slice(-2) : '') }
  function dm(t) { var d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1) }
  function pdec(step) { return Math.max(0, Math.min(8, Math.ceil(-Math.log10(step) - 1e-9))) }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v }
  function lerp(a, b, t) { return a + (b - a) * t }

  /* χρωματική κλίμακα heatmap (σκούρο μπλε → κυανό → πράσινο → κίτρινο → πορτοκαλί → λευκό) */
  var LUT = (function () {
    var st = [[0, 10, 14, 19, 0], [0.06, 12, 30, 80, 150], [0.22, 20, 80, 200, 220], [0.42, 20, 185, 215, 235], [0.6, 60, 225, 120, 245], [0.76, 245, 225, 60, 250], [0.9, 255, 135, 30, 255], [1, 255, 255, 255, 255]], o = new Uint8ClampedArray(256 * 4);
    for (var i = 0; i < 256; i++) { var x = i / 255, j = 0; while (j < st.length - 2 && x > st[j + 1][0]) j++; var a = st[j], b = st[j + 1], t = (x - a[0]) / (b[0] - a[0]); for (var c = 0; c < 4; c++)o[i * 4 + c] = lerp(a[c + 1], b[c + 1], clamp(t, 0, 1)) }
    return o
  })();

  /* ---------- δίκτυο: πρώτα απευθείας από τον browser, αλλιώς μέσω /api/flow ---------- */
  var REST = { f: 'https://fapi.binance.com', s: 'https://data-api.binance.vision' };
  function bn(venue, path, qs) {
    var url = REST[venue] + path + '?' + qs;
    return fetch(url).then(function (r) { if (!r.ok) throw { status: r.status }; return r.json() }).catch(function (e) {
      if (e && e.status === 400) throw e;
      return fetch('/api/flow?src=bn&h=' + venue + '&p=' + encodeURIComponent(path) + '&q=' + encodeURIComponent(qs)).then(function (r) { if (!r.ok) throw { status: r.status }; return r.json() })
    })
  }
  var WSH = { f: ['wss://fstream.binance.com/stream?streams='], s: ['wss://stream.binance.com:9443/stream?streams=', 'wss://data-stream.binance.vision/stream?streams='] };

  /* ---------- κατάσταση αγοράς ---------- */
  var M = null, ROOT = null, VIS = false, RAF = 0, DIRTY = true, HIDE_T = 0, PAUSE = false;
  function newM() {
    return {
      id: Math.random(), sym: CFG.sym, venue: CFG.venue, tf: CFG.tf, pair: CFG.sym + 'USDT', bucket: 0, tick: 0, dec: 2,
      bars: [], fp: {}, fp1: {}, fpFrom: Infinity, last: NaN, mark: null, t24: null,
      book: { b: new Map(), a: new Map(), u: 0, ok: false, buf: [], sync: 0 },
      heat: { dt: 2000, cols: [], half: 0 },
      tape: [], orders: [], big: [], sw: [], ice: [], liq: [], oi: [], grp: null, sizes: [], bigAuto: 0,
      icew: {}, icen: 0, status: 'φόρτωση…', err: '', ws: null, wsTry: 0, conn: false, created: Date.now()
    }
  }

  function key(p) { return Math.round(p / M.bucket) }
  function barT(t) { var ms = TF[M.tf]; return Math.floor(t / ms) * ms }

  /* ---------- φόρτωση ---------- */
  function start() {
    stop(); M = newM(); var m = M; V.off = 0; V.yAuto = true; DIRTY = true; renderHead();
    var p1 = bn(m.venue, m.venue === 'f' ? '/fapi/v1/depth' : '/api/v3/depth', 'symbol=' + m.pair + '&limit=1000').then(function (d) {
      if (m !== M) return; var bp = (d.bids || []).map(function (x) { return +x[0] }), mid = bp[0] || NaN, tk = Infinity;
      for (var i = 1; i < Math.min(60, bp.length); i++) { var df = Math.abs(bp[i - 1] - bp[i]); if (df > 0 && df < tk) tk = df }
      m.tick = isFinite(tk) ? +tk.toPrecision(6) : 0; m.snap = d; m.mid0 = mid;
    }).catch(function () { });
    var p2 = bn(m.venue, m.venue === 'f' ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr', 'symbol=' + m.pair).then(function (t) { if (m === M) { m.t24 = t; if (!isFinite(m.mid0)) m.mid0 = +t.lastPrice } }).catch(function (e) { if (m === M) m.noSym = true });
    Promise.all([p1, p2]).then(function () {
      if (m !== M) return;
      if (m.noSym && !m.snap) { m.status = ''; m.err = m.pair + ' δεν υπάρχει στο Binance ' + (m.venue === 'f' ? 'Futures' : 'Spot') + '. Δοκίμασε την άλλη αγορά.'; renderHead(); DIRTY = true; return }
      var px = m.mid0 || 1; m.bucket = nice(px * 2e-4); if (m.tick && m.bucket < m.tick) m.bucket = m.tick; m.dec = pdec(Math.min(m.bucket, m.tick || m.bucket));
      m.heat.half = Math.ceil(px * 0.04 / m.bucket);
      if (m.snap) bookSnap(m.snap);
      return loadBars().then(function () { connect(); backfill(); loadOI(); idbLoad() })
    }).catch(function (e) { if (m === M) { m.err = 'Δεν ήρθαν δεδομένα από το Binance (' + (e && e.status || 'δίκτυο') + ').'; renderHead() } });
  }
  function stop() { if (M) { M.dead = true; try { M.ws && M.ws.close() } catch (e) { } clearTimeout(M.rt); clearInterval(M.hi); clearInterval(M.oit); idbSave() } }

  function loadBars() {
    var m = M, ms = TF[m.tf];
    return bn(m.venue, m.venue === 'f' ? '/fapi/v1/klines' : '/api/v3/klines', 'symbol=' + m.pair + '&interval=' + m.tf + '&limit=' + (m.venue === 'f' ? 1500 : 1000)).then(function (k) {
      if (m !== M) return;
      m.bars = k.map(function (x) { return { t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], bv: +x[9], usd: +x[7] } });
      var l = m.bars[m.bars.length - 1]; if (l) m.last = l.c; m.status = ''; DIRTY = true; renderHead()
    })
  }
  /* footprint προηγούμενων λεπτών: τα τελευταία aggTrades (πηγαίνει πίσω όσο επιτρέπει ένα λογικό όριο αιτημάτων) */
  function backfill() {
    var m = M, path = m.venue === 'f' ? '/fapi/v1/aggTrades' : '/api/v3/aggTrades', n = 0, MAX = m.venue === 'f' ? 24 : 40, oldest = Date.now() - 12 * 36e5;
    m.bf = { n: 0, from: NaN };
    function page(fromId) {
      return bn(m.venue, path, 'symbol=' + m.pair + '&limit=1000' + (fromId != null ? '&fromId=' + fromId : '')).then(function (a) {
        if (m !== M || !a || !a.length) return;
        var lim = m.liveFrom || Infinity;
        a.forEach(function (x) { if (x.T < lim) addTrade(+x.p, +x.q, x.T, x.m, true) });
        n++; m.bf.n = n; m.bf.from = a[0].T; DIRTY = true;
        if (n < MAX && a[0].T > oldest && a[0].a > 0) return page(Math.max(0, a[0].a - 1000));
      })
    }
    page(null).then(function () { if (m === M) { if (m.grpH) { flushOrder(m.grpH); m.grpH = null } var by = function (a, b) { return a.t - b.t }; m.big.sort(by); m.sw.sort(by); m.bfDone = true; DIRTY = true; renderSide(true); renderHead() } }).catch(function () { if (m === M) m.bfDone = true })
  }
  function loadOI() {
    var m = M; if (m.venue !== 'f') return;
    var per = { '1m': '5m', '5m': '5m', '15m': '15m', '1h': '1h' }[m.tf];
    bn('f', '/futures/data/openInterestHist', 'symbol=' + m.pair + '&period=' + per + '&limit=500').then(function (a) { if (m !== M) return; m.oi = (a || []).map(function (x) { return { t: +x.timestamp, v: +x.sumOpenInterest } }); DIRTY = true }).catch(function () { });
    var poll = function () { bn('f', '/fapi/v1/openInterest', 'symbol=' + m.pair).then(function (x) { if (m !== M) return; m.oi.push({ t: +x.time || Date.now(), v: +x.openInterest }); if (m.oi.length > 3000) m.oi.shift(); DIRTY = true; renderHead() }).catch(function () { }) };
    poll(); m.oit = setInterval(poll, 20000)
  }

  /* ---------- WebSocket ---------- */
  function connect() {
    var m = M; if (m.dead) return; if (!m.liveFrom) m.liveFrom = Date.now(); var s = m.pair.toLowerCase(), st = [s + '@aggTrade', s + '@depth@100ms'];
    if (m.venue === 'f') st.push(s + '@forceOrder', s + '@markPrice@1s'); else st.push(s + '@ticker');
    var hosts = WSH[m.venue], url = hosts[m.wsTry % hosts.length] + st.join('/'), ws;
    try { ws = new WebSocket(url) } catch (e) { return retry() }
    m.ws = ws;
    ws.onopen = function () { if (m !== M) return ws.close(); m.conn = true; m.status = ''; renderHead(); m.book.ok = false; m.book.buf = []; m.book.sync = 0; resync() };
    ws.onmessage = function (ev) { if (m !== M) return; var j; try { j = JSON.parse(ev.data) } catch (e) { return } var d = j.data || j; onMsg(d) };
    ws.onclose = function () { if (m !== M) return; m.conn = false; m.book.ok = false; renderHead(); retry() };
    ws.onerror = function () { try { ws.close() } catch (e) { } };
    function retry() { if (m !== M || m.dead) return; m.wsTry++; m.rt = setTimeout(connect, Math.min(15000, 1000 * m.wsTry)) }
    clearInterval(m.hi); m.hi = setInterval(heatCap, m.heat.dt);
  }
  function onMsg(d) {
    var m = M;
    if (d.e === 'aggTrade') { addTrade(+d.p, +d.q, +d.T, !!d.m, false); return }
    if (d.e === 'depthUpdate') { onDepth(d); return }
    if (d.e === 'forceOrder') { var o = d.o; m.liq.push({ t: +o.T, side: o.S === 'SELL' ? 'L' : 'S', p: +o.ap || +o.p, q: +o.z || +o.q, usd: (+o.ap || +o.p) * (+o.z || +o.q) }); if (m.liq.length > 800) m.liq.shift(); DIRTY = true; renderSide(); return }
    if (d.e === 'markPriceUpdate') { m.mark = { p: +d.p, i: +d.i, r: +d.r, T: +d.T }; return }
    if (d.e === '24hrTicker') { m.t24 = { lastPrice: d.c, priceChangePercent: d.P, quoteVolume: d.q }; return }
  }

  /* ---------- βιβλίο εντολών (τοπικό αντίγραφο από snapshot + διαφορές) ---------- */
  function bookSnap(d) {
    var b = M.book; b.b.clear(); b.a.clear();
    (d.bids || []).forEach(function (x) { var q = +x[1]; if (q > 0) b.b.set(+x[0], q) });
    (d.asks || []).forEach(function (x) { var q = +x[1]; if (q > 0) b.a.set(+x[0], q) });
    b.u = d.lastUpdateId; b.last = 0; b.ok = true;
    var buf = b.buf; b.buf = []; buf.forEach(function (e) { if (e.u >= b.u) applyDepth(e) })
  }
  function resync() {
    var m = M; if (m.book.sync && Date.now() - m.book.sync < 3000) return; m.book.sync = Date.now(); m.book.ok = false;
    bn(m.venue, m.venue === 'f' ? '/fapi/v1/depth' : '/api/v3/depth', 'symbol=' + m.pair + '&limit=1000').then(function (d) { if (m === M) bookSnap(d) }).catch(function () { })
  }
  function onDepth(e) {
    var b = M.book; if (!b.ok) { b.buf.push(e); if (b.buf.length > 400) b.buf.shift(); return }
    if (e.u < b.u) return;
    if (M.venue === 'f' && b.last && e.pu != null && e.pu !== b.last) { b.buf = [e]; resync(); return }
    if (M.venue === 's' && b.last && e.U > b.last + 1) { b.buf = [e]; resync(); return }
    applyDepth(e)
  }
  function applyDepth(e) {
    var b = M.book;
    (e.b || []).forEach(function (x) { var p = +x[0], q = +x[1]; if (q > 0) b.b.set(p, q); else b.b.delete(p) });
    (e.a || []).forEach(function (x) { var p = +x[0], q = +x[1]; if (q > 0) b.a.set(p, q); else b.a.delete(p) });
    b.last = e.u; b.u = e.u; b.dirty = true;
  }
  function bestBA() { var bb = -Infinity, ba = Infinity; M.book.b.forEach(function (q, p) { if (p > bb) bb = p }); M.book.a.forEach(function (q, p) { if (p < ba) ba = p }); return [bb, ba] }
  /* στήλη heatmap: όλο το βιβλίο (±4%) σε σκαλοπάτια του bucket */
  function heatCap() {
    var m = M; if (!m || !m.book.ok || !m.bucket) return; var px = m.last || m.mid0; if (!isFinite(px)) return;
    var H = m.heat, k0 = key(px) - H.half, n = H.half * 2 + 1, a = new Float32Array(n), add = function (q, p) { var i = key(p) - k0; if (i >= 0 && i < n) a[i] += q };
    m.book.b.forEach(add); m.book.a.forEach(add);
    H.cols.push({ t: Date.now(), k0: k0, a: a }); if (H.cols.length > 5400) H.cols.shift(); H.ver = (H.ver || 0) + 1; DIRTY = true
  }

  /* ---------- συναλλαγές → κεριά, footprint, εντολές (big / sweep), icebergs ---------- */
  function addTrade(p, q, T, isSell, hist) {
    var m = M; if (!m.bucket) return; var k = key(p), side = isSell ? 0 : 1;
    // footprint 1 λεπτού (για αποθήκευση/άλλα TF) και τρέχοντος TF
    var t1 = Math.floor(T / 6e4) * 6e4, f1 = m.fp1[t1] || (m.fp1[t1] = { l: {} }), c1 = f1.l[k] || (f1.l[k] = [0, 0]); c1[side] += q;
    if (T < m.fpFrom) m.fpFrom = T;
    var bt = barT(T); if (m.tf !== '1m') { var f = m.fp[bt] || (m.fp[bt] = { l: {} }), c = f.l[k] || (f.l[k] = [0, 0]); c[side] += q }
    if (!hist) {
      m.last = p; var bars = m.bars, L = bars[bars.length - 1];
      if (!L || bt > L.t) { bars.push({ t: bt, o: p, h: p, l: p, c: p, v: q, bv: side ? q : 0, usd: p * q }); if (bars.length > 3000) bars.shift() }
      else if (bt === L.t) { L.h = Math.max(L.h, p); L.l = Math.min(L.l, p); L.c = p; L.v += q; if (side) L.bv += q; L.usd += p * q }
      m.tape.push({ t: T, p: p, q: q, s: side }); if (m.tape.length > 400) m.tape.shift();
      iceCheck(p, q, side, T);
    }
    // ομαδοποίηση σε εντολές αγοράς/πώλησης (ίδιο ms, ίδια πλευρά = μία εντολή που «σάρωσε» επίπεδα)
    var gk = hist ? 'grpH' : 'grp', g = m[gk];
    if (g && g.T === T && g.s === side) { g.q += q; g.usd += p * q; g.pmin = Math.min(g.pmin, p); g.pmax = Math.max(g.pmax, p); g.n++; g.pe = p }
    else { if (g) flushOrder(g); m[gk] = { T: T, s: side, q: q, usd: p * q, pmin: p, pmax: p, n: 1, ps: p, pe: p } }
    if (!hist) { clearTimeout(m.gt); m.gt = setTimeout(function () { if (m === M && m.grp) { flushOrder(m.grp); m.grp = null } }, 60) }
    DIRTY = true
  }
  function bigTh() { return CFG.big > 0 ? CFG.big : Math.max(M.bigAuto || 0, 5000) }
  function flushOrder(g) {
    var m = M; m.sizes.push(g.usd); if (m.sizes.length > 4000) m.sizes.splice(0, 1000);
    if (m.sizes.length % 300 === 0 && m.sizes.length >= 300) { var s = m.sizes.slice().sort(function (a, b) { return a - b }); m.bigAuto = s[Math.floor(s.length * 0.995)] }
    var th = bigTh(), o = { t: g.T, s: g.s, q: g.q, usd: g.usd, p: g.usd / g.q, pmin: g.pmin, pmax: g.pmax, n: g.n };
    if (g.usd >= th) { m.big.push(o); if (m.big.length > 1500) m.big.shift() }
    var lv = Math.round((g.pmax - g.pmin) / (m.tick || m.bucket)) + 1;
    if (lv >= 4 && g.usd >= th * 0.35) { o.lv = lv; m.sw.push(o); if (m.sw.length > 600) m.sw.shift() }
  }
  /* iceberg: σε ένα επίπεδο εκτελέστηκε πολύ περισσότερο από όσο έδειχνε το βιβλίο, και το επίπεδο ακόμα κρατά */
  function iceCheck(p, q, side, T) {
    var m = M; if (!m.book.ok) return; var w = m.icew, id = (side ? 'a' : 'b') + p, rest = side ? m.book.a.get(p) : m.book.b.get(p), x = w[id];
    if (!x || T - x.t0 > 30000) x = w[id] = { t0: T, ex: 0, seen: rest || 0, hit: false };
    x.ex += q; if (rest > x.seen) x.seen = rest;
    if (!x.hit && x.seen > 0 && x.ex > x.seen * 2.5 && x.ex * p > bigTh() * 0.5 && rest > 0) { x.hit = true; m.ice.push({ t: T, s: side, p: p, q: x.ex, shown: x.seen, usd: x.ex * p }); if (m.ice.length > 400) m.ice.shift(); renderSide() }
    if (++m.icen > 5000) { m.icew = {}; m.icen = 0 }
  }

  /* ---------- αποθήκευση footprint 1 λεπτού στον browser (IndexedDB), για να «μεγαλώνει» το ιστορικό ---------- */
  var IDB = null;
  function idb() { if (IDB) return IDB; IDB = new Promise(function (ok, no) { try { var r = indexedDB.open('tj-flow', 1); r.onupgradeneeded = function () { r.result.createObjectStore('fp') }; r.onsuccess = function () { ok(r.result) }; r.onerror = function () { no(r.error) } } catch (e) { no(e) } }); return IDB }
  function idbKey() { return M.venue + '|' + M.pair + '|' + M.bucket }
  function idbLoad() {
    var m = M; idb().then(function (db) { var tx = db.transaction('fp', 'readonly'), r = tx.objectStore('fp').get(idbKey()); r.onsuccess = function () { if (m !== M || !r.result) return; var o = r.result, cut = Date.now() - 3 * 864e5; for (var t in o) { if (+t < cut || m.fp1[t]) continue; m.fp1[t] = o[t]; if (+t < m.fpFrom) m.fpFrom = +t } m.fpVer = (m.fpVer || 0) + 1; rebuildFp(); DIRTY = true } }).catch(function () { });
    clearInterval(m.si); m.si = setInterval(idbSave, 60000)
  }
  function idbSave() {
    var m = M; if (!m || !m.bucket) return; var o = {}, cut = Date.now() - 3 * 864e5, now = Math.floor(Date.now() / 6e4) * 6e4;
    for (var t in m.fp1) if (+t >= cut && +t < now) o[t] = m.fp1[t];
    idb().then(function (db) { var tx = db.transaction('fp', 'readwrite'); tx.objectStore('fp').put(o, m.venue + '|' + m.pair + '|' + m.bucket) }).catch(function () { })
  }
  function rebuildFp() { var m = M; if (m.tf === '1m') return; var ms = TF[m.tf]; m.fp = {}; for (var t in m.fp1) { var bt = Math.floor(+t / ms) * ms, f = m.fp[bt] || (m.fp[bt] = { l: {} }), L = m.fp1[t].l; for (var k in L) { var c = f.l[k] || (f.l[k] = [0, 0]); c[0] += L[k][0]; c[1] += L[k][1] } } }
  function fpOf(t) { return M.tf === '1m' ? M.fp1[t] : M.fp[t] }

  /* =================================================================== ΓΡΑΦΗΜΑ */
  var V = { bw: 12, off: 0, yAuto: true, y0: 0, y1: 1, mx: -1, my: -1, drag: null };
  var cv, cx, dom, dx, Lay = {};
  function layout() {
    var r = cv.getBoundingClientRect(), dpr = W.devicePixelRatio || 1, w = Math.max(300, r.width), h = Math.max(260, r.height);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var subs = []; if (CFG.sub.delta) subs.push('delta'); if (CFG.sub.cvd) subs.push('cvd'); if (CFG.sub.oi && M && M.venue === 'f') subs.push('oi');
    var sh = h < 520 ? 52 : 70, ax = 74, tb = 22, mainH = h - tb - subs.length * sh;
    Lay = { w: w, h: h, L: 0, R: w - ax, T: 0, B: mainH, ax: ax, subs: subs.map(function (s, i) { return { k: s, T: mainH + tb + i * sh, B: mainH + tb + (i + 1) * sh - 2 } }), tb: mainH, pad: Math.min(140, (w - ax) * 0.16) };
  }
  function xOf(i) { var n = M.bars.length; return Lay.R - Lay.pad - (n - 1 - i - V.off) * V.bw - V.bw / 2 }
  function cOff(v) { return clamp(v, -60, Math.max(0, M.bars.length - 5)) }
  function iOfX(x) { var n = M.bars.length; return n - 1 - V.off - (Lay.R - Lay.pad - V.bw / 2 - x) / V.bw }
  function xOfT(t) { var b = M.bars; if (!b.length) return 0; return xOf((t - b[0].t) / TF[M.tf] - 0.5) }
  function yOf(p) { return Lay.T + 8 + (V.y1 - p) / (V.y1 - V.y0) * (Lay.B - Lay.T - 16) }
  function pOfY(y) { return V.y1 - (y - Lay.T - 8) / (Lay.B - Lay.T - 16) * (V.y1 - V.y0) }
  function visRange() { var n = M.bars.length, a = Math.max(0, Math.floor(iOfX(Lay.L))), b = Math.min(n - 1, Math.ceil(iOfX(Lay.R))); return [a, b] }
  function rowStep() {
    var b = M.bucket; if (CFG.mult !== 'auto') return b * CFG.mult;
    var target = (V.y1 - V.y0) / Math.max(8, (Lay.B - Lay.T) / (V.bw >= 46 ? 15 : 7)); for (var i = 0; i < MULTS.length; i++)if (b * MULTS[i] >= target) return b * MULTS[i]; return b * MULTS[MULTS.length - 1]
  }
  function fpRows(f, step) { var o = {}, b = M.bucket; for (var k in f.l) { var p = +k * b, r = Math.floor(p / step + 1e-9), c = o[r] || (o[r] = [0, 0]); c[0] += f.l[k][0]; c[1] += f.l[k][1] } return o }

  function draw() {
    if (!M || !cv || !VIS) return; layout(); var g = cx, w = Lay.w, h = Lay.h;
    g.fillStyle = C.bg; g.fillRect(0, 0, w, h); g.font = FONT; g.textBaseline = 'middle';
    var bars = M.bars, n = bars.length;
    if (!n) { g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText(M.err || M.status || 'φόρτωση…', w / 2, h / 2); return }
    var vr = visRange(), a = vr[0], b = vr[1];
    if (V.yAuto) { var lo = Infinity, hi = -Infinity; for (var i = a; i <= b; i++) { lo = Math.min(lo, bars[i].l); hi = Math.max(hi, bars[i].h) } if (!isFinite(lo)) { lo = bars[n - 1].l; hi = bars[n - 1].h } var pd = (hi - lo) * 0.06 || hi * 0.002; V.y0 = lo - pd; V.y1 = hi + pd }
    var step = rowStep(), dec = Math.max(M.dec, pdec(step));
    // πλέγμα τιμών
    var gs = nice((V.y1 - V.y0) / Math.max(3, (Lay.B - Lay.T) / 60)), gdec = Math.max(pdec(gs), 0);
    g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
    for (var p = Math.ceil(V.y0 / gs) * gs; p <= V.y1; p += gs) { var y = Math.round(yOf(p)) + 0.5; g.moveTo(0, y); g.lineTo(Lay.R, y) }
    var tg = Math.max(1, Math.round(110 / V.bw)); for (i = a - a % tg; i <= b; i += tg) { var x = Math.round(xOf(i)) + 0.5; g.moveTo(x, 0); g.lineTo(x, Lay.B) }
    g.stroke();
    g.save(); g.beginPath(); g.rect(0, 0, Lay.R, Lay.B); g.clip();
    if (CFG.sh.heat) drawHeat(g);
    if (CFG.sh.vwap) drawVwap(g, a, b);
    drawBars(g, a, b, step, dec);
    if (CFG.sh.vp) drawVP(g, a, b, step);
    drawBook(g, step);
    drawLevels(g);
    if (CFG.sh.sw) drawSweeps(g);
    if (CFG.sh.big) drawBig(g);
    if (CFG.sh.ice) drawIce(g);
    if (CFG.sh.liq && M.venue === 'f') drawLiq(g);
    g.restore();
    // άξονας τιμών
    g.fillStyle = C.panel; g.fillRect(Lay.R, 0, Lay.ax, Lay.B); g.fillStyle = C.axis; g.textAlign = 'left';
    for (p = Math.ceil(V.y0 / gs) * gs; p <= V.y1; p += gs) g.fillText(p.toFixed(gdec), Lay.R + 6, yOf(p));
    (Lay.vpt || []).forEach(function (v) { var y = yOf(v[0]); if (y > 8 && y < Lay.B - 8) tag(g, Lay.R, y, v[0].toFixed(Math.max(M.dec, pdec(step))), v[1], '#0a0e13') }); Lay.vpt = null;
    var lp = M.last; if (isFinite(lp)) { var yl = yOf(lp), up = bars[n - 1].c >= bars[n - 1].o; g.setLineDash([2, 3]); g.strokeStyle = up ? C.up : C.dn; g.beginPath(); g.moveTo(0, yl); g.lineTo(Lay.R, yl); g.stroke(); g.setLineDash([]); tag(g, Lay.R, yl, lp.toFixed(M.dec), up ? C.up : C.dn, '#04120b') }
    // άξονας χρόνου
    g.fillStyle = C.panel; g.fillRect(0, Lay.tb, w, 22); g.fillStyle = C.axis; g.textAlign = 'center';
    for (i = a - a % tg; i <= b; i += tg) { if (i < 0) continue; var t = bars[i].t, lb = (new Date(t).getHours() === 0 && new Date(t).getMinutes() === 0) || M.tf === '1h' ? dm(t) + ' ' + hm(t) : hm(t); g.fillText(lb, xOf(i), Lay.tb + 11) }
    Lay.subs.forEach(function (s) { drawSub(g, s, a, b) });
    drawCross(g, step, dec);
    if (PAUSE) { g.fillStyle = 'rgba(255,196,67,.9)'; g.textAlign = 'left'; g.fillText('⏸ ΠΑΓΩΜΕΝΟ', 10, 14) }
    if (M.bf && !M.bfDone) { g.fillStyle = C.mut; g.textAlign = 'left'; g.fillText('φορτώνω footprint… ' + M.bf.n, 10, Lay.B - 10) }
  }
  function tag(g, x, y, txt, bg, fg) { g.font = 'bold ' + FONT; var tw = g.measureText(txt).width + 10; g.fillStyle = bg; g.fillRect(x, y - 9, Math.max(tw, Lay.ax), 18); g.fillStyle = fg || '#000'; g.textAlign = 'left'; g.fillText(txt, x + 5, y); g.font = FONT }

  function drawBars(g, a, b, step, dec) {
    var bars = M.bars, bw = V.bw, mode = CFG.mode, fpOn = mode !== 'candle';
    for (var i = a; i <= b; i++) {
      var k = bars[i], x = xOf(i), f = fpOn ? fpOf(k.t) : null, up = k.c >= k.o;
      if (f && bw >= 6) { drawFp(g, k, f, x, step, dec, bw); continue }
      var yh = yOf(k.h), yl = yOf(k.l), yo = yOf(k.o), yc = yOf(k.c), bwB = Math.max(1, bw * 0.66);
      g.strokeStyle = g.fillStyle = up ? C.up : C.dn; g.beginPath(); g.moveTo(Math.round(x) + 0.5, yh); g.lineTo(Math.round(x) + 0.5, yl); g.stroke();
      g.fillRect(x - bwB / 2, Math.min(yo, yc), bwB, Math.max(1, Math.abs(yc - yo)))
    }
  }
  /* ένα κερί footprint: γραμμές τιμής με bid×ask (ή delta / όγκο), POC, ανισορροπίες, λεπτό κερί αριστερά */
  function drawFp(g, k, f, x, step, dec, bw) {
    var R = fpRows(f, step), rows = Object.keys(R).map(Number).sort(function (p, q) { return p - q }), mx = 0, pocR = null, pocV = -1, tot = 0;
    rows.forEach(function (r) { var c = R[r], v = c[0] + c[1]; tot += v; if (v > pocV) { pocV = v; pocR = r } mx = Math.max(mx, c[0], c[1]) });
    var md = 0, mvv = 0; rows.forEach(function (q) { md = Math.max(md, Math.abs(R[q][1] - R[q][0])); mvv = Math.max(mvv, R[q][0] + R[q][1]) });
    var x0 = x - bw / 2 + 1, cw = bw - 2, rh = Math.abs(yOf(0) - yOf(step)), txt = rh >= 10 && cw >= 46, mode = CFG.mode, half = cw / 2;
    rows.forEach(function (r) {
      var c = R[r], yT = yOf((r + 1) * step), hh = Math.max(1, rh - (rh > 4 ? 1 : 0)), bid = c[0], ask = c[1], v = bid + ask, d = ask - bid;
      if (mode === 'fp_ba') {
        g.fillStyle = 'rgba(239,79,95,' + (0.08 + 0.62 * bid / (mx || 1)).toFixed(3) + ')'; g.fillRect(x0 + 4, yT, half - 4, hh);
        g.fillStyle = 'rgba(34,194,127,' + (0.08 + 0.62 * ask / (mx || 1)).toFixed(3) + ')'; g.fillRect(x0 + half, yT, half, hh);
      } else if (mode === 'fp_delta') {
        var al = 0.1 + 0.75 * Math.abs(d) / (md || 1);
        g.fillStyle = (d >= 0 ? 'rgba(34,194,127,' : 'rgba(239,79,95,') + al.toFixed(3) + ')'; g.fillRect(x0 + 4, yT, cw - 4, hh)
      } else {
        var mv = mvv; g.fillStyle = 'rgba(92,179,255,.16)'; g.fillRect(x0 + 4, yT, cw - 4, hh);
        g.fillStyle = 'rgba(92,179,255,.55)'; g.fillRect(x0 + 4, yT, (cw - 4) * v / (mv || 1), hh)
      }
      if (r === pocR) { g.strokeStyle = C.poc; g.lineWidth = 1.2; g.strokeRect(x0 + 4.5, yT + 0.5, cw - 5, hh - 1); g.lineWidth = 1 }
      // ανισορροπίες (διαγώνια σύγκριση, ×3)
      var imbA = false, imbB = false;
      if (CFG.sh.imb && mode === 'fp_ba') { var lo = R[r - 1], hiR = R[r + 1]; if (lo && ask > 3 * lo[0] && ask > 0) imbA = true; if (hiR && bid > 3 * hiR[1] && bid > 0) imbB = true; if (!lo && ask > 0 && rows.length > 2 && r !== rows[0]) { } }
      if (txt) {
        g.textAlign = 'center';
        if (mode === 'fp_ba') { g.fillStyle = imbB ? '#ff8f9b' : '#e9eef3'; g.font = (imbB ? 'bold ' : '') + FONT; g.fillText(fv(bid), x0 + 2 + half / 2, yT + hh / 2); g.fillStyle = imbA ? '#6dffb8' : '#e9eef3'; g.font = (imbA ? 'bold ' : '') + FONT; g.fillText(fv(ask), x0 + half + half / 2, yT + hh / 2); g.font = FONT }
        else if (mode === 'fp_delta') { g.fillStyle = '#eef3f7'; g.fillText((d > 0 ? '+' : '') + fv(d), x0 + 2 + cw / 2, yT + hh / 2) }
        else { g.fillStyle = '#eef3f7'; g.fillText(fv(v), x0 + 2 + cw / 2, yT + hh / 2) }
      } else if (imbA || imbB) { g.fillStyle = imbA ? '#6dffb8' : '#ff8f9b'; g.fillRect(imbA ? x0 + cw - 2 : x0 + 4, yT, 2, hh) }
    });
    // λεπτό κερί (OHLC) στην αριστερή άκρη
    var up = k.c >= k.o; g.fillStyle = g.strokeStyle = up ? C.up : C.dn; g.beginPath(); g.moveTo(x0 + 1.5, yOf(k.h)); g.lineTo(x0 + 1.5, yOf(k.l)); g.stroke(); g.fillRect(x0, Math.min(yOf(k.o), yOf(k.c)), 3, Math.max(1, Math.abs(yOf(k.c) - yOf(k.o))));
    // περίγραμμα του κεριού
    if (bw >= 30) { g.strokeStyle = 'rgba(255,255,255,.07)'; g.strokeRect(x0 + 0.5, yOf(k.h), cw - 0.5, Math.max(1, yOf(k.l) - yOf(k.h))) }
  }

  /* heatmap: εικόνα (στήλες χρόνου × σκαλοπάτια τιμής) σε offscreen canvas, τεντωμένη στο διάγραμμα */
  var HC = { cv: null, sig: '' };
  function drawHeat(g) {
    var H = M.heat, cols = H.cols; if (!cols.length) return;
    var tA = M.bars[0].t, x0 = xOfT(cols[0].t), x1 = xOfT(cols[cols.length - 1].t + H.dt);
    var c0 = 0, c1 = cols.length - 1; while (c0 < c1 && xOfT(cols[c0].t + H.dt) < 0) c0++; while (c1 > c0 && xOfT(cols[c1].t) > Lay.R) c1--;
    var b = M.bucket, kLo = Math.floor(V.y0 / b), kHi = Math.ceil(V.y1 / b), rows = kHi - kLo + 1, rs = Math.max(1, Math.ceil(rows / 500)), nr = Math.ceil(rows / rs);
    var pxW = Math.max(1, xOfT(cols[c1].t + H.dt) - xOfT(cols[c0].t)), ncol = c1 - c0 + 1, cs = Math.max(1, Math.ceil(ncol / Math.max(1, pxW))), nc = Math.ceil(ncol / cs);
    var sig = [H.ver, c0, c1, kLo, kHi, rs, cs].join('|');
    if (HC.sig !== sig) {
      HC.sig = sig; if (!HC.cv) HC.cv = D.createElement('canvas'); HC.cv.width = nc; HC.cv.height = nr; var hx = HC.cv.getContext('2d'), img = hx.createImageData(nc, nr), A = new Float32Array(nc * nr), vals = [];
      for (var c = c0; c <= c1; c++) { var col = cols[c], ci = Math.floor((c - c0) / cs); for (var r = 0; r < nr; r++) { var s = 0; for (var q = 0; q < rs; q++) { var kk = kHi - r * rs - q - col.k0; if (kk >= 0 && kk < col.a.length) s += col.a[kk] } var j = r * nc + ci; if (s > A[j]) A[j] = s } }
      for (var z = 0; z < A.length; z += Math.max(1, Math.floor(A.length / 4000))) if (A[z] > 0) vals.push(A[z]);
      vals.sort(function (p, q) { return p - q }); var vmax = vals.length ? vals[Math.floor(vals.length * 0.985)] : 1;
      for (z = 0; z < A.length; z++) { var li = A[z] > 0 ? Math.min(255, Math.floor(255 * Math.sqrt(A[z] / vmax))) : 0; img.data[z * 4] = LUT[li * 4]; img.data[z * 4 + 1] = LUT[li * 4 + 1]; img.data[z * 4 + 2] = LUT[li * 4 + 2]; img.data[z * 4 + 3] = LUT[li * 4 + 3] }
      hx.putImageData(img, 0, 0); HC.y0 = (kHi + 0.5) * b; HC.y1 = (kHi + 0.5 - nr * rs) * b
    }
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = 0.9;
    var X0 = xOfT(cols[c0].t), X1 = xOfT(cols[c1].t + H.dt), Y0 = yOf(HC.y0), Y1 = yOf(HC.y1);
    g.drawImage(HC.cv, X0, Y0, Math.max(1, X1 - X0), Y1 - Y0); g.restore();
  }
  /* τρέχον βιβλίο: οριζόντιες μπάρες δεξιά (όπως στο DOM) */
  function drawBook(g, step) {
    if (!M.book.ok) return; var R = {}, mx = 0, add = function (s) { return function (q, p) { if (p < V.y0 || p > V.y1) return; var r = Math.floor(p / step + 1e-9), c = R[r] || (R[r] = [0, 0]); c[s] += q } };
    M.book.b.forEach(add(0)); M.book.a.forEach(add(1)); for (var r in R) mx = Math.max(mx, R[r][0], R[r][1]);
    var W0 = Lay.pad * 0.85, xr = Lay.R, rh = Math.max(1, Math.abs(yOf(0) - yOf(step)) - 1);
    for (r in R) { var c = R[r], y = yOf((+r + 1) * step); if (c[0]) { g.fillStyle = 'rgba(34,194,127,.45)'; g.fillRect(xr - W0 * c[0] / mx, y, W0 * c[0] / mx, rh) } if (c[1]) { g.fillStyle = 'rgba(239,79,95,.45)'; g.fillRect(xr - W0 * c[1] / mx, y, W0 * c[1] / mx, rh) } }
  }
  function drawVwap(g, a, b) {
    var bars = M.bars, pv = 0, vv = 0, day = -1, pts = [];
    for (var i = 0; i <= b; i++) { var k = bars[i], d = Math.floor(k.t / 864e5); if (d !== day) { day = d; pv = 0; vv = 0; if (i > a) pts.push(null) } pv += (k.h + k.l + k.c) / 3 * k.v; vv += k.v; if (i >= a) pts.push([xOf(i), yOf(pv / vv)]) }
    g.strokeStyle = C.vwap; g.lineWidth = 1.6; g.beginPath(); var on = false; pts.forEach(function (p) { if (!p) { on = false; return } if (on) g.lineTo(p[0], p[1]); else { g.moveTo(p[0], p[1]); on = true } }); g.stroke(); g.lineWidth = 1;
    var l = pts[pts.length - 1]; if (l) { g.fillStyle = C.vwap; g.textAlign = 'left'; g.fillText('VWAP', l[0] + 6, l[1] - 8) }
  }
  /* Volume Profile ορατού εύρους (με footprint όπου υπάρχει, αλλιώς μοιρασμένος όγκος στο εύρος του κεριού) */
  function profile(a, b, step) {
    var P = {}, bars = M.bars, tot = 0;
    for (var i = a; i <= b; i++) {
      var k = bars[i], f = fpOf(k.t);
      if (f) { var R = fpRows(f, step); for (var r in R) { var c = P[r] || (P[r] = [0, 0]); c[0] += R[r][0]; c[1] += R[r][1]; tot += R[r][0] + R[r][1] } }
      else { var r0 = Math.floor(k.l / step + 1e-9), r1 = Math.floor(k.h / step + 1e-9), nn = r1 - r0 + 1, sv = (k.v - k.bv) / nn, bv = k.bv / nn; for (var q = r0; q <= r1; q++) { var c2 = P[q] || (P[q] = [0, 0]); c2[0] += sv; c2[1] += bv } tot += k.v }
    }
    var ks = Object.keys(P).map(Number).sort(function (x, y) { return x - y }); if (!ks.length) return null;
    var poc = ks[0]; ks.forEach(function (r) { if (P[r][0] + P[r][1] > P[poc][0] + P[poc][1]) poc = r });
    var lo = ks.indexOf(poc), hi = lo, acc = P[poc][0] + P[poc][1];
    while (acc < tot * 0.7 && (lo > 0 || hi < ks.length - 1)) { var u = hi < ks.length - 1 ? P[ks[hi + 1]][0] + P[ks[hi + 1]][1] : -1, dn = lo > 0 ? P[ks[lo - 1]][0] + P[ks[lo - 1]][1] : -1; if (u >= dn) { hi++; acc += u } else { lo--; acc += dn } }
    return { P: P, ks: ks, poc: poc, vah: ks[hi], val: ks[lo], step: step }
  }
  function drawVP(g, a, b, step) {
    var st = step; while ((V.y1 - V.y0) / st > 160) st *= 2;
    var pr = profile(a, b, st); if (!pr) return; var mx = 0; pr.ks.forEach(function (r) { mx = Math.max(mx, pr.P[r][0] + pr.P[r][1]) });
    var W0 = Math.min(220, Lay.R * 0.2), x0 = 0, rh = Math.max(1, Math.abs(yOf(0) - yOf(st)) - 1);
    pr.ks.forEach(function (r) {
      var c = pr.P[r], v = c[0] + c[1], w = W0 * v / mx, y = yOf((r + 1) * st), inVA = r >= pr.val && r <= pr.vah;
      if (r === pr.poc) { g.fillStyle = 'rgba(255,196,67,.75)'; g.fillRect(x0, y, w, rh); return }
      g.fillStyle = inVA ? 'rgba(92,179,255,.38)' : 'rgba(140,155,170,.22)'; g.fillRect(x0, y, w * c[1] / v, rh);
      g.fillStyle = inVA ? 'rgba(92,179,255,.22)' : 'rgba(140,155,170,.13)'; g.fillRect(x0 + w * c[1] / v, y, w * c[0] / v, rh)
    });
    var ln = function (p, col, nm) { var y = yOf(p); g.strokeStyle = col; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(0, y); g.lineTo(Lay.R, y); g.stroke(); g.setLineDash([]); g.font = 'bold ' + FONT; g.fillStyle = col; g.textAlign = 'left'; g.fillText(nm, 4, y - 7); g.font = FONT };
    ln((pr.vah + 1) * st, C.vah, 'VAH'); ln((pr.poc + 0.5) * st, C.poc, 'POC'); ln(pr.val * st, C.val, 'VAL'); M.vp = pr; Lay.vpt = [[(pr.vah + 1) * st, C.vah], [(pr.poc + 0.5) * st, C.poc], [pr.val * st, C.val]]
  }
  /* επίπεδα: μηνιαίο Market Profile (από την καρτέλα Αγορές) και Options (Deribit) */
  function drawLevels(g) {
    var L = [];
    if (CFG.sh.mlv) { try { var rows = W.__E9 && W.__E9.mpRows && W.__E9.mpRows(); var r = rows && rows.find(function (x) { return x.coin === M.sym && x.P }); if (r) L.push([r.P.vah, C.vah, 'M/VAH'], [r.P.poc, C.poc, 'M/POC'], [r.P.val, C.val, 'M/VAL']) } catch (e) { } }
    if (CFG.sh.opt && OPT.lv && OPT.lv.c === M.sym) { var o = OPT.lv; if (o.cw) L.push([o.cw, '#22c27f', 'Call wall']); if (o.pw) L.push([o.pw, '#ef4f5f', 'Put wall']); if (o.mp) L.push([o.mp, '#ffffff', 'Max pain']); if (o.flip) L.push([o.flip, '#ff6bd6', 'Gamma flip']); if (o.emH) { L.push([o.emH, '#8597a8', 'Exp. move ↑'], [o.emL, '#8597a8', 'Exp. move ↓']) } }
    L.forEach(function (l) { var y = yOf(l[0]); if (y < 0 || y > Lay.B) return; g.strokeStyle = l[1]; g.lineWidth = 1.4; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(0, y); g.lineTo(Lay.R, y); g.stroke(); g.globalAlpha = 1; g.lineWidth = 1; g.font = 'bold ' + FONT; var tw = g.measureText(l[2]).width + 10; g.fillStyle = l[1]; g.fillRect(Lay.R - Lay.pad - tw - 4, y - 8, tw, 16); g.fillStyle = '#0a0e13'; g.textAlign = 'left'; g.fillText(l[2], Lay.R - Lay.pad - tw + 1, y); g.font = FONT })
  }
  function inView(t) { var x = xOfT(t); return x > -20 && x < Lay.R + 20 }
  function drawBig(g) {
    var th = bigTh(); M.big.forEach(function (o) {
      if (!inView(o.t) || o.usd < th) return; var x = xOfT(o.t), y = yOf(o.p), r = clamp(5 * Math.sqrt(o.usd / th), 4, 34);
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = o.s ? 'rgba(34,194,127,.42)' : 'rgba(239,79,95,.42)'; g.fill(); g.strokeStyle = o.s ? '#6dffb8' : '#ff8f9b'; g.stroke();
      if (r >= 13) { g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(usd(o.usd), x, y) }
    })
  }
  function drawSweeps(g) { M.sw.forEach(function (o) { if (!inView(o.t)) return; var x = xOfT(o.t), ya = yOf(o.s ? o.pmin : o.pmax), yb = yOf(o.s ? o.pmax : o.pmin); g.strokeStyle = C.sw; g.lineWidth = 2; g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.stroke(); g.beginPath(); var d = o.s ? -1 : 1; g.moveTo(x - 5, yb - d * 7); g.lineTo(x, yb); g.lineTo(x + 5, yb - d * 7); g.stroke(); g.lineWidth = 1 }) }
  function drawIce(g) { M.ice.forEach(function (o) { if (!inView(o.t)) return; var x = xOfT(o.t), y = yOf(o.p); g.strokeStyle = C.ice; g.lineWidth = 1.5; g.strokeRect(x - 5, y - 5, 10, 10); g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.stroke(); g.lineWidth = 1 }) }
  function drawLiq(g) {
    M.liq.forEach(function (o) {
      if (!inView(o.t)) return; var x = xOfT(o.t), y = yOf(o.p), r = clamp(4 * Math.sqrt(o.usd / 20000), 4, 22);
      g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fillStyle = o.side === 'L' ? 'rgba(255,176,32,.75)' : 'rgba(94,240,255,.6)'; g.fill(); g.strokeStyle = '#000'; g.stroke();
      if (r >= 12) { g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(fv(o.usd), x, y) }
    })
  }
  function drawSub(g, s, a, b) {
    var bars = M.bars, T = s.T, B = s.B, H = B - T; g.fillStyle = '#0c1218'; g.fillRect(0, T - 2, Lay.w, H + 4); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(0, T - 2.5); g.lineTo(Lay.w, T - 2.5); g.stroke();
    g.save(); g.beginPath(); g.rect(0, T, Lay.R, H); g.clip();
    var lbl = '', lastV = NaN;
    if (s.k === 'delta') {
      var mx = 0; for (var i = a; i <= b; i++) mx = Math.max(mx, Math.abs(2 * bars[i].bv - bars[i].v)); var y0 = T + H / 2;
      for (i = a; i <= b; i++) { var d = 2 * bars[i].bv - bars[i].v, hh = d / (mx || 1) * (H / 2 - 2), bw = Math.max(1, V.bw * 0.66); g.fillStyle = d >= 0 ? C.up : C.dn; g.fillRect(xOf(i) - bw / 2, d >= 0 ? y0 - hh : y0, bw, Math.max(1, Math.abs(hh))); if (V.bw >= 46) { g.fillStyle = '#c9d6e2'; g.textAlign = 'center'; g.fillText(fv(d), xOf(i), d >= 0 ? y0 + 8 : y0 - 8) } }
      lbl = 'Delta'; lastV = 2 * bars[b].bv - bars[b].v
    } else if (s.k === 'cvd') {
      var cv2 = [], acc = 0, lo = Infinity, hi = -Infinity; for (i = 0; i <= b; i++) { acc += 2 * bars[i].bv - bars[i].v; if (i >= a) { cv2.push([i, acc]); lo = Math.min(lo, acc); hi = Math.max(hi, acc) } }
      var yv = function (v) { return B - 3 - (v - lo) / ((hi - lo) || 1) * (H - 6) }; g.strokeStyle = '#ffc443'; g.lineWidth = 1.5; g.beginPath(); cv2.forEach(function (p, j) { var x = xOf(p[0]), y = yv(p[1]); if (j) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); g.lineWidth = 1; lbl = 'CVD'; lastV = acc
    } else if (s.k === 'oi') {
      var t0 = bars[a].t, t1 = bars[b].t + TF[M.tf], pts = M.oi.filter(function (o) { return o.t >= t0 - 6e5 && o.t <= t1 }); if (pts.length > 1) { var l2 = Infinity, h2 = -Infinity; pts.forEach(function (o) { l2 = Math.min(l2, o.v); h2 = Math.max(h2, o.v) }); g.strokeStyle = '#5cb3ff'; g.lineWidth = 1.5; g.beginPath(); pts.forEach(function (o, j) { var x = xOfT(o.t), y = B - 3 - (o.v - l2) / ((h2 - l2) || 1) * (H - 6); if (j) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); g.lineWidth = 1; lastV = pts[pts.length - 1].v } lbl = 'Open Interest'
    }
    g.restore(); g.fillStyle = C.mut; g.textAlign = 'left'; g.fillText(lbl + (isFinite(lastV) ? '  ' + (lastV > 0 && s.k !== 'oi' ? '+' : '') + fv(lastV) : ''), 6, T + 9);
    g.fillStyle = C.panel; g.fillRect(Lay.R, T - 2, Lay.ax, H + 4)
  }
  function drawCross(g, step, dec) {
    if (V.mx < 0 || V.my < 0 || V.mx > Lay.R || V.my > Lay.B) return; var x = V.mx, y = V.my;
    g.strokeStyle = 'rgba(214,226,238,.35)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, Lay.h); g.moveTo(0, y + 0.5); g.lineTo(Lay.R, y + 0.5); g.stroke(); g.setLineDash([]);
    var p = pOfY(y); tag(g, Lay.R, y, p.toFixed(dec), '#d6e2ee', '#0a0e13');
    var i = Math.round(iOfX(x)), k = M.bars[i]; if (!k) return;
    var d = 2 * k.bv - k.v, lines = [dm(k.t) + ' ' + hm(k.t) + ' · ' + M.tf, 'O ' + k.o.toFixed(M.dec) + '  H ' + k.h.toFixed(M.dec), 'L ' + k.l.toFixed(M.dec) + '  C ' + k.c.toFixed(M.dec), 'Όγκος ' + fv(k.v) + ' (' + usd(k.usd || k.v * k.c) + ')', 'Delta ' + (d > 0 ? '+' : '') + fv(d)];
    var f = fpOf(k.t); if (f) { var R = fpRows(f, step), r = Math.floor(p / step + 1e-9), c = R[r]; if (c) lines.push('Στο ' + (r * step).toFixed(dec) + ': ' + fv(c[0]) + ' × ' + fv(c[1])) }
    var tw = 0; lines.forEach(function (l) { tw = Math.max(tw, g.measureText(l).width) }); var bx = x + 14 + tw + 16 > Lay.R ? x - tw - 30 : x + 14, by = Math.min(y + 14, Lay.B - lines.length * 15 - 10);
    g.fillStyle = 'rgba(14,20,27,.94)'; g.strokeStyle = '#2a3a4a'; g.fillRect(bx, by, tw + 16, lines.length * 15 + 8); g.strokeRect(bx + 0.5, by + 0.5, tw + 15, lines.length * 15 + 7);
    g.fillStyle = C.txt; g.textAlign = 'left'; lines.forEach(function (l, j) { g.fillText(l, bx + 8, by + 11 + j * 15) })
  }

  /* ---------- DOM (σκάλα τιμών) ---------- */
  function drawDom() {
    if (!dom || !M || !VIS) return; var r = dom.getBoundingClientRect(), dpr = W.devicePixelRatio || 1, w = r.width, h = r.height; if (w < 10) return;
    if (dom.width !== Math.round(w * dpr) || dom.height !== Math.round(h * dpr)) { dom.width = Math.round(w * dpr); dom.height = Math.round(h * dpr) } dx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = dx; g.fillStyle = C.bg; g.fillRect(0, 0, w, h); g.font = FONT; g.textBaseline = 'middle';
    if (!M.book.ok || !M.bucket) { g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText('σύνδεση στο βιβλίο…', w / 2, h / 2); return }
    var ba = bestBA(), mid = (ba[0] + ba[1]) / 2, rh = 17, n = Math.floor((h - 20) / rh), step = M.bucket * (CFG.mult === 'auto' ? domMult() : CFG.mult), dec = Math.max(M.dec, pdec(step));
    var cR = Math.floor(mid / step), R = {}, add = function (s) { return function (q, p) { var rr = Math.floor(p / step + 1e-9); if (Math.abs(rr - cR) > n) return; var c = R[rr] || (R[rr] = [0, 0]); c[s] += q } };
    M.book.b.forEach(add(0)); M.book.a.forEach(add(1));
    var VOL = {}, now = M.bars[M.bars.length - 1], f = now && fpOf(now.t); if (f) VOL = fpRows(f, step);
    var mx = 0, mv = 0; for (var k in R) mx = Math.max(mx, R[k][0], R[k][1]); for (k in VOL) mv = Math.max(mv, VOL[k][0] + VOL[k][1]);
    var c1 = w * 0.36, c2 = w * 0.64; g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText('Bid', c1 / 2, 9); g.fillText('Τιμή', (c1 + c2) / 2, 9); g.fillText('Ask', (c2 + w) / 2, 9);
    var top = cR + Math.floor(n / 2), lastR = Math.floor(M.last / step + 1e-9);
    for (var i = 0; i < n; i++) {
      var rr = top - i, y = 20 + i * rh, c = R[rr] || [0, 0], vl = VOL[rr];
      if (rr === lastR) { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y, w, rh) }
      if (vl && mv) { g.fillStyle = 'rgba(92,179,255,.18)'; g.fillRect(c1, y + 1, (c2 - c1) * (vl[0] + vl[1]) / mv, rh - 2) }
      if (c[0]) { g.fillStyle = 'rgba(34,194,127,.35)'; var bwid = (c1 - 4) * c[0] / mx; g.fillRect(c1 - bwid, y + 1, bwid, rh - 2); g.fillStyle = '#bff5da'; g.textAlign = 'right'; g.fillText(fv(c[0]), c1 - 4, y + rh / 2) }
      if (c[1]) { g.fillStyle = 'rgba(239,79,95,.35)'; var awid = (w - c2 - 4) * c[1] / mx; g.fillRect(c2, y + 1, awid, rh - 2); g.fillStyle = '#ffd0d5'; g.textAlign = 'left'; g.fillText(fv(c[1]), c2 + 4, y + rh / 2) }
      g.fillStyle = rr === lastR ? '#fff' : (rr * step >= ba[1] ? '#ff9aa5' : rr * step <= ba[0] ? '#8ff0c0' : C.txt); g.textAlign = 'center'; g.fillText((rr * step).toFixed(dec), (c1 + c2) / 2, y + rh / 2)
    }
    // ανισορροπία βιβλίου ±1%
    var sb = 0, sa = 0; M.book.b.forEach(function (q, p) { if (p > mid * 0.99) sb += q * p }); M.book.a.forEach(function (q, p) { if (p < mid * 1.01) sa += q * p });
    M.imb = { b: sb, a: sa }
  }
  function domMult() { var t = M.last * 0.00012 / M.bucket; for (var i = 0; i < MULTS.length; i++)if (MULTS[i] >= t) return MULTS[i]; return 1 }

  /* =================================================================== OPTIONS X-RAY (Deribit) */
  var OPT = { data: {}, lv: null, busy: false };
  function optLoad(c, force) {
    var o = OPT.data[c]; if (o && !force && Date.now() - o.at < 60000) return Promise.resolve(o);
    var mapRows = function (rows) { return rows.map(function (r) { return { n: r[0], oi: +r[1] || 0, iv: +r[2] || 0, S: +r[3] || 0, vol: +r[4] || 0, mk: +r[5] || 0 } }) };
    var direct = fetch('https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=' + c + '&kind=option').then(function (r) { if (!r.ok) throw 0; return r.json() }).then(function (j) { return mapRows((j.result || []).map(function (x) { return [x.instrument_name, x.open_interest, x.mark_iv, x.underlying_price, x.volume, x.mark_price] })) });
    return direct.catch(function () { return fetch('/api/flow?src=deribit&c=' + c).then(function (r) { if (!r.ok) throw 0; return r.json() }).then(function (j) { return mapRows(j.rows || []) }) }).then(function (rows) { var d = optCalc(c, rows); OPT.data[c] = d; return d })
  }
  var MON = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
  function ncdf(x) { var t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return x > 0 ? 1 - p : p }
  function gam(S, K, T, s) { if (!(T > 0 && s > 0 && S > 0)) return 0; var d1 = (Math.log(S / K) + 0.5 * s * s * T) / (s * Math.sqrt(T)); return Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) / (S * s * Math.sqrt(T)) }
  function optCalc(c, rows) {
    var now = Date.now(), O = [], ex = {};
    rows.forEach(function (r) { var m = /^[A-Z]+-(\d{1,2})([A-Z]{3})(\d{2})-([\d.d]+)-([CP])$/.exec(r.n); if (!m) return; var T = Date.UTC(2000 + +m[3], MON[m[2]], +m[1], 8), K = +m[4].replace('d', '.'); if (T <= now) return; var o = { K: K, T: T, cp: m[5], oi: r.oi, iv: r.iv / 100, S: r.S, vol: r.vol, e: m[1] + m[2] + m[3] }; O.push(o); ex[o.e] = T });
    var exps = Object.keys(ex).sort(function (a, b) { return ex[a] - ex[b] }).map(function (e) { return { e: e, T: ex[e] } });
    var S = 0, nS = 0; O.forEach(function (o) { if (o.S && exps[0] && o.e === exps[0].e) { S += o.S; nS++ } }); if (!nS) O.forEach(function (o) { if (o.S) { S += o.S; nS++ } }); S = nS ? S / nS : 0;
    return { c: c, at: now, O: O, S: S, exps: exps }
  }
  function optView(d, exp) {
    var O = exp === 'all' ? d.O : d.O.filter(function (o) { return o.e === exp }), S = d.S, now = Date.now(), st = {};
    O.forEach(function (o) { var yr = (o.T - now) / (365 * 864e5), g = gam(o.S || S, o.K, yr, o.iv), gex = g * o.oi * S * S * 0.01 * (o.cp === 'C' ? 1 : -1), x = st[o.K] || (st[o.K] = { K: o.K, c: 0, p: 0, g: 0, cv: 0, pv: 0 }); if (o.cp === 'C') { x.c += o.oi; x.cv += o.vol } else { x.p += o.oi; x.pv += o.vol } x.g += gex });
    var L = Object.keys(st).map(function (k) { return st[k] }).sort(function (a, b) { return a.K - b.K });
    var cw = null, pw = null, mp = null, best = Infinity, tc = 0, tp = 0, tg = 0;
    L.forEach(function (x) { tc += x.c; tp += x.p; tg += x.g; if (x.K >= S * 0.98 && (!cw || x.c > cw.c)) cw = x; if (x.K <= S * 1.02 && (!pw || x.p > pw.p)) pw = x });
    var pe = exp === 'all' ? (d.exps[0] && d.exps[0].e) : exp, PO = d.O.filter(function (o) { return o.e === pe }), Ks = {}; PO.forEach(function (o) { Ks[o.K] = 1 });
    Object.keys(Ks).forEach(function (k) { var K = +k, pain = 0; PO.forEach(function (o) { pain += o.oi * (o.cp === 'C' ? Math.max(0, K - o.K) : Math.max(0, o.K - K)) }); if (pain < best) { best = pain; mp = K } });
    // gamma flip: σε ποια τιμή το συνολικό GEX αλλάζει πρόσημο
    var flip = null, prev = null; for (var s = S * 0.8; s <= S * 1.2; s += S * 0.004) { var tot = 0; O.forEach(function (o) { var yr = (o.T - now) / (365 * 864e5); tot += gam(s, o.K, yr, o.iv) * o.oi * s * s * 0.01 * (o.cp === 'C' ? 1 : -1) }); if (prev && (prev[1] < 0) !== (tot < 0)) { var f = prev[0] + (s - prev[0]) * (-prev[1]) / (tot - prev[1]); if (flip == null || Math.abs(f - S) < Math.abs(flip - S)) flip = f } prev = [s, tot] }
    // αναμενόμενη κίνηση (ATM IV) ανά λήξη
    var em = d.exps.slice(0, 8).map(function (x) { var P = d.O.filter(function (o) { return o.e === x.e }), atm = null; P.forEach(function (o) { if (!atm || Math.abs(o.K - S) < Math.abs(atm.K - S)) atm = o }); var iv = 0, n = 0; P.forEach(function (o) { if (atm && o.K === atm.K) { iv += o.iv; n++ } }); iv = n ? iv / n : 0; var yr = (x.T - now) / (365 * 864e5), mv = S * iv * Math.sqrt(yr); return { e: x.e, T: x.T, iv: iv, mv: mv, days: (x.T - now) / 864e5 } });
    var e0 = exp === 'all' ? em[0] : em.find(function (x) { return x.e === exp }) || em[0];
    return { L: L, S: S, cw: cw && cw.K, pw: pw && pw.K, mp: mp, flip: flip, tc: tc, tp: tp, tg: tg, em: em, e0: e0, pe: pe }
  }

  /* =================================================================== HTML */
  var CSS = '#flowRoot button{box-shadow:none!important;transform:none!important;background-image:none!important;text-shadow:none!important}#flowRoot .ftg:not(.on){background:#0a1016!important;color:#6f8192!important;border-color:#1d2935!important;opacity:.75}#flowRoot .ftg.on{background:rgba(47,143,232,.2)!important;color:#fff!important;border-color:#2f8fe8!important}#flowRoot .fseg button{background:transparent!important;color:#7f92a4!important}#flowRoot .fseg button.on{background:#1b5f8f!important;color:#fff!important}#flowRoot .fbtn,#flowRoot .fzm button{background:#132030!important;color:#d6e2ee!important}#flowRoot{--fbg:#0a0e13;--fpn:#0e141b;--fln:#1d2935;--ftx:#d6e2ee;--fmu:#7f92a4;color:var(--ftx)}' +
    '#flowRoot .fw{background:var(--fbg);border:1px solid var(--fln);border-radius:14px;overflow:hidden;box-shadow:0 18px 40px -22px rgba(0,0,0,.7)}' +
    '#flowRoot .fbar{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;padding:.5rem .6rem;background:var(--fpn);border-bottom:1px solid var(--fln)}' +
    '#flowRoot select,#flowRoot input{width:auto;min-width:0;background:#0a1016;color:var(--ftx);border:1px solid var(--fln);border-radius:8px;padding:.28rem .45rem;font:inherit;font-size:.82rem}' +
    '#flowRoot .fseg{display:inline-flex;border:1px solid var(--fln);border-radius:9px;overflow:hidden}#flowRoot .fseg button{background:transparent;color:var(--fmu);border:0;padding:.3rem .55rem;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer}#flowRoot .fseg button+button{border-left:1px solid var(--fln)}#flowRoot .fseg button.on{background:#1b5f8f;color:#fff}' +
    '#flowRoot .ftg{background:#0a1016;color:var(--fmu);border:1px solid var(--fln);border-radius:999px;padding:.22rem .55rem;font:inherit;font-size:.76rem;font-weight:700;cursor:pointer}#flowRoot .ftg.on{color:#fff;border-color:#2f8fe8;background:rgba(47,143,232,.18)}' +
    '#flowRoot .fbtn{background:#132030;color:var(--ftx);border:1px solid var(--fln);border-radius:8px;padding:.28rem .55rem;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer}#flowRoot .fbtn:hover{border-color:#2f8fe8}' +
    '#flowRoot .fhd{display:flex;flex-wrap:wrap;gap:.25rem 1.1rem;padding:.45rem .7rem;border-bottom:1px solid var(--fln);font-size:.8rem;align-items:baseline}#flowRoot .fhd b{font-size:1.15rem;font-variant-numeric:tabular-nums}#flowRoot .fhd small{color:var(--fmu);margin-right:.3rem}#flowRoot .fhd .pos{color:#22c27f}#flowRoot .fhd .neg{color:#ef4f5f}' +
    '#flowRoot .fdot{display:inline-block;width:.55rem;height:.55rem;border-radius:50%;background:#ef4f5f;margin-right:.3rem}#flowRoot .fdot.on{background:#22c27f;box-shadow:0 0 8px #22c27f}' +
    '#flowRoot .fgrid{display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:0}#flowRoot .fmain{position:relative;height:min(78vh,820px);min-height:420px;border-right:1px solid var(--fln)}#flowRoot .fmain canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}' +
    '#flowRoot .fzm{position:absolute;right:82px;top:8px;display:flex;gap:.25rem;z-index:2}#flowRoot .fzm button{width:1.9rem;height:1.7rem;border-radius:7px;border:1px solid var(--fln);background:rgba(14,20,27,.85);color:var(--ftx);font-weight:800;cursor:pointer}' +
    '#flowRoot .fside{display:flex;flex-direction:column;min-height:0;height:min(78vh,820px);min-height:420px}#flowRoot .fdom{flex:0 0 46%;position:relative;border-bottom:1px solid var(--fln)}#flowRoot .fdom canvas{position:absolute;inset:0;width:100%;height:100%}' +
    '#flowRoot .ftabs{display:flex;border-bottom:1px solid var(--fln)}#flowRoot .ftabs button{flex:1;background:transparent;border:0;color:var(--fmu);padding:.4rem .2rem;font:inherit;font-size:.74rem;font-weight:800;cursor:pointer;border-bottom:2px solid transparent}#flowRoot .ftabs button.on{color:#fff;border-bottom-color:#2f8fe8}' +
    '#flowRoot .flist{flex:1;overflow:auto;font:11.5px ui-monospace,Menlo,Consolas,monospace}#flowRoot .flist div{display:grid;grid-template-columns:4.6em 1fr 1fr 1fr;gap:.3rem;padding:.12rem .5rem;border-bottom:1px solid rgba(29,41,53,.6);cursor:pointer}#flowRoot .flist div:hover{background:#111b25}#flowRoot .flist .b{color:#5ff0a8}#flowRoot .flist .s{color:#ff8f9b}#flowRoot .flist .hl{background:rgba(255,196,67,.08);font-weight:800}#flowRoot .flist .hd{color:var(--fmu);cursor:default;position:sticky;top:0;background:var(--fbg)}#flowRoot .flist .em{display:block;color:var(--fmu);padding:.8rem;font-family:inherit;cursor:default}' +
    '#flowRoot .fleg{display:flex;flex-wrap:wrap;gap:.3rem .9rem;padding:.45rem .7rem;font-size:.74rem;color:var(--fmu);border-top:1px solid var(--fln)}#flowRoot .fleg i{font-style:normal;font-weight:800}' +
    '#flowRoot .fnote{padding:.5rem .7rem;font-size:.76rem;color:var(--fmu);border-top:1px solid var(--fln)}' +
    '#flowRoot .opk{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.45rem;padding:.6rem}#flowRoot .opk>div{background:var(--fpn);border:1px solid var(--fln);border-left:4px solid var(--c,#2f8fe8);border-radius:10px;padding:.4rem .55rem}#flowRoot .opk small{display:block;color:var(--fmu);font-size:.7rem;font-weight:800}#flowRoot .opk b{font-size:1rem;font-variant-numeric:tabular-nums}#flowRoot .opk i{display:block;font-style:normal;font-size:.7rem;color:var(--fmu)}' +
    '#flowRoot .opg{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:.6rem;padding:0 .6rem .6rem}#flowRoot .opc{background:var(--fpn);border:1px solid var(--fln);border-radius:12px;padding:.5rem}#flowRoot .opc h4{margin:.1rem .2rem .4rem;font-size:.85rem}#flowRoot .opc canvas{width:100%;height:440px;display:block}' +
    '#flowRoot table.opt{width:100%;border-collapse:collapse;font-size:.8rem}#flowRoot table.opt th,#flowRoot table.opt td{padding:.3rem .45rem;border-bottom:1px solid var(--fln);text-align:right}#flowRoot table.opt th:first-child,#flowRoot table.opt td:first-child{text-align:left}#flowRoot table.opt th{color:var(--fmu);font-size:.72rem}' +
    '#flowRoot .ffs{position:absolute;right:82px;bottom:8px;z-index:3;width:2.3rem;height:2.1rem;border-radius:8px;border:1px solid #2f8fe8!important;background:rgba(14,20,27,.9)!important;color:#fff!important;font-size:1.15rem;font-weight:800;cursor:pointer}' +
    '#flowRoot .fw.ffull{position:fixed;inset:0;z-index:2147483000;border-radius:0;display:flex;flex-direction:column;overflow:auto}#flowRoot .fw.ffull>[data-fv="chart"]{flex:1;display:flex;flex-direction:column;min-height:0}#flowRoot .fw.ffull>[data-fv="chart"][hidden]{display:none}#flowRoot .fw.ffull .fgrid{flex:1;min-height:0}#flowRoot .fw.ffull .fmain,#flowRoot .fw.ffull .fside{height:auto;min-height:0}#flowRoot .fw.ffull .fleg,#flowRoot .fw.ffull .fnote{display:none}' +
    '@media (max-width:900px){#flowRoot .fw.ffull .fmain{height:75vh;flex:none}#flowRoot .fgrid{grid-template-columns:1fr}#flowRoot .fmain{height:68vh;border-right:0;border-bottom:1px solid var(--fln)}#flowRoot .fside{height:auto}#flowRoot .fdom{height:360px;flex:none}#flowRoot .flist{max-height:320px}#flowRoot .fzm{right:80px}}';

  var SIDE = 'tape';
  function shell() {
    if (!D.getElementById('flowCss')) { var st = D.createElement('style'); st.id = 'flowCss'; st.textContent = CSS; D.head.appendChild(st) }
    var seg = function (name, opts, cur) { return '<span class="fseg" data-fseg="' + name + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' class="on"' : '') + ' title="' + esc(o[2] || '') + '">' + esc(o[1]) + '</button>' }).join('') + '</span>' };
    var tg = function (k, l, t) { return '<button class="ftg' + (CFG.sh[k] ? ' on' : '') + '" data-fsh="' + k + '" title="' + esc(t) + '">' + esc(l) + '</button>' };
    var sb = function (k, l) { return '<button class="ftg' + (CFG.sub[k] ? ' on' : '') + '" data-fsub="' + k + '">' + esc(l) + '</button>' };
    ROOT.innerHTML = '<div class="fw">' +
      '<div class="fbar">' + seg('view', [['chart', '📊 Order Flow'], ['opt', '🧬 Options X-Ray']], CFG.view) +
      '<span style="flex:1"></span><span style="font-size:.74rem;color:var(--fmu)">Δωρεάν δημόσια δεδομένα Binance · Deribit · τίποτα δεν εκτελεί εντολές</span></div>' +
      '<div data-fv="chart"' + (CFG.view === 'chart' ? '' : ' hidden') + '>' +
      '<div class="fbar"><input list="flowCoins" id="fSym" value="' + esc(CFG.sym) + '" size="6" title="Νόμισμα"><datalist id="flowCoins">' + COINS.map(function (c) { return '<option value="' + c + '">' }).join('') + '</datalist>' +
      seg('venue', [['f', 'Futures', 'Binance USDⓈ-M perpetual (περισσότερος όγκος, ρευστοποιήσεις, OI)'], ['s', 'Spot', 'Binance Spot']], CFG.venue) +
      seg('tf', [['1m', '1m'], ['5m', '5m'], ['15m', '15m'], ['1h', '1h']], CFG.tf) +
      seg('mode', [['candle', 'Κεριά'], ['fp_ba', 'Bid×Ask', 'Footprint: πωλήσεις αγοράς (αριστερά) × αγορές αγοράς (δεξιά) σε κάθε τιμή'], ['fp_delta', 'Delta', 'Footprint: αγορές − πωλήσεις σε κάθε τιμή'], ['fp_vol', 'Όγκος', 'Footprint: συνολικός όγκος σε κάθε τιμή']], CFG.mode) +
      '<select id="fMult" title="Βήμα τιμής (cluster)"><option value="auto">Βήμα: αυτόματο</option>' + MULTS.map(function (m) { return '<option value="' + m + '"' + (String(CFG.mult) === String(m) ? ' selected' : '') + '>×' + m + '</option>' }).join('') + '</select>' +
      '<label style="font-size:.76rem;color:var(--fmu)">Big trade ≥ $<input id="fBig" type="number" min="0" step="1000" value="' + (CFG.big || '') + '" placeholder="αυτόματο" style="width:7em"></label>' +
      '<button class="fbtn" id="fPause" title="Πάγωμα της εικόνας (τα δεδομένα συνεχίζουν να καταγράφονται)">⏸ Πάγωμα</button></div>' +
      '<div class="fbar" style="padding-top:.35rem;padding-bottom:.35rem">' + tg('heat', '🌡️ Heatmap', 'Ιστορικό βάθους βιβλίου εντολών (από τη στιγμή που άνοιξε η σελίδα)') + tg('big', '🫧 Big Trades', 'Μεγάλες εντολές αγοράς/πώλησης') + tg('sw', '⚡ Sweeps', 'Εντολές που «σάρωσαν» πολλά επίπεδα μαζί') + tg('ice', '🧊 Icebergs', 'Κρυφές εντολές: εκτελέστηκε πολύ περισσότερο από όσο έδειχνε το βιβλίο') + tg('liq', '💥 Stop runs / Liq.', 'Ρευστοποιήσεις futures') + tg('vp', '📶 Volume Profile', 'Προφίλ όγκου ορατού εύρους με POC/VAH/VAL') + tg('vwap', 'VWAP', 'VWAP ημέρας') + tg('imb', 'Imbalance', 'Διαγώνιες ανισορροπίες ×3 στο footprint') + tg('mlv', 'M/POC μήνα', 'Επίπεδα μηνιαίου Market Profile (καρτέλα Αγορές)') + tg('opt', 'Options levels', 'Call/Put wall, Max pain, Gamma flip (BTC, ETH)') +
      '<span style="width:.6rem"></span>' + sb('delta', 'Delta') + sb('cvd', 'CVD') + sb('oi', 'OI') + '</div>' +
      '<div class="fhd" id="fHead"></div>' +
      '<div class="fgrid"><div class="fmain"><canvas id="fCv"></canvas><div class="fzm"><button data-fz="-" title="Σμίκρυνση">−</button><button data-fz="+" title="Μεγέθυνση">+</button><button data-fz="y" title="Αυτόματη κλίμακα τιμής">↕</button><button data-fz="0" title="Επαναφορά">⟲</button></div><button class="ffs" data-ffull title="Πλήρης οθόνη (Esc για έξοδο)">⛶</button></div>' +
      '<div class="fside"><div class="fdom"><canvas id="fDom"></canvas></div><div class="ftabs">' + [['tape', 'Tape'], ['big', 'Big'], ['sw', 'Sweeps'], ['ice', 'Iceberg'], ['liq', 'Liq.']].map(function (x) { return '<button data-fside="' + x[0] + '"' + (SIDE === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>' }).join('') + '</div><div class="flist" id="fList"></div></div></div>' +
      '<div class="fleg"><span><i style="color:#ff8f9b">Bid</i> × <i style="color:#6dffb8">Ask</i>: πωλήσεις × αγορές «στην αγορά» σε κάθε τιμή</span><span><i style="color:#ffc443">▭</i> POC κεριού</span><span><i style="color:#6dffb8">έντονο</i> = ανισορροπία ×3</span><span>🫧 Big trade</span><span><i style="color:#ff6bd6">↕</i> Sweep</span><span><i style="color:#5ef0ff">⊟</i> Iceberg</span><span><i style="color:#ffb020">◆</i> ρευστοποίηση long · <i style="color:#5ef0ff">◆</i> short</span><span><i style="color:#c77dff">—</i> VWAP</span><span><i style="color:#5cb3ff">VAH</i> · <i style="color:#ffc443">POC</i> · <i style="color:#d08bff">VAL</i></span></div>' +
      '<div class="fnote">Ροδέλα: ζουμ στον χρόνο · Ctrl/⌘ + ροδέλα ή σύρσιμο στον άξονα τιμών: ζουμ στην τιμή · σύρσιμο: μετακίνηση · διπλό κλικ: επαναφορά. Τα αριθμητικά footprint εμφανίζονται όταν μεγεθύνεις (+). Το footprint χτίζεται από τις πραγματικές συναλλαγές (aggTrades): τα τελευταία λεπτά φορτώνονται αμέσως, και όσο η καρτέλα μένει ανοιχτή φυλάγεται στον browser για 3 μέρες. Το heatmap καταγράφει το βάθος από τη στιγμή που ανοίγεις την καρτέλα.</div>' +
      '</div>' +
      '<div data-fv="opt"' + (CFG.view === 'opt' ? '' : ' hidden') + '><div class="fbar">' + seg('oc', [['BTC', 'BTC'], ['ETH', 'ETH']], CFG.oc) + '<select id="fExp"></select><button class="fbtn" id="fOptR">↻ Ανανέωση</button><span style="font-size:.74rem;color:var(--fmu)">Deribit · όλα τα options · ενημέρωση ανά λεπτό</span></div><div id="fOpt"><p style="padding:1rem;color:var(--fmu)">φόρτωση…</p></div></div>' +
      '</div>';
    cv = D.getElementById('fCv'); cx = cv.getContext('2d'); dom = D.getElementById('fDom'); dx = dom.getContext('2d');
    bindChart(); renderHead(); renderSide(true)
  }

  function renderHead() {
    var el = D.getElementById('fHead'); if (!el || !M) return;
    var t = M.t24 || {}, ch = +t.priceChangePercent, px = M.last, mk = M.mark, oi = M.oi.length ? M.oi[M.oi.length - 1].v : NaN, oi1 = NaN;
    if (M.oi.length > 2) { var tt = Date.now() - 36e5, o0 = M.oi.find(function (o) { return o.t >= tt }); if (o0) oi1 = (oi / o0.v - 1) * 100 }
    var imb = M.imb && (M.imb.b + M.imb.a) ? (M.imb.b - M.imb.a) / (M.imb.b + M.imb.a) * 100 : NaN;
    var bars = M.bars, cvd = 0, day = Math.floor(Date.now() / 864e5) * 864e5; bars.forEach(function (k) { if (k.t >= day) cvd += 2 * k.bv - k.v });
    var it = function (l, v, cl) { return '<span><small>' + l + '</small><span class="' + (cl || '') + '">' + v + '</span></span>' };
    el.innerHTML = '<span><span class="fdot' + (M.conn ? ' on' : '') + '"></span><b>' + esc(M.sym) + '/USDT</b> <small>' + (M.venue === 'f' ? 'Perp' : 'Spot') + '</small></span>' +
      '<span><b>' + (isFinite(px) ? px.toFixed(M.dec) : '–') + '</b> ' + (isFinite(ch) ? '<span class="' + (ch >= 0 ? 'pos' : 'neg') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%</span>' : '') + '</span>' +
      it('Όγκος 24ω', t.quoteVolume ? usd(+t.quoteVolume) : '–') +
      (M.venue === 'f' ? it('Funding', mk ? (mk.r * 100).toFixed(4) + '% · ' + Math.max(0, Math.round((mk.T - Date.now()) / 6e4)) + '′' : '–', mk && mk.r < 0 ? 'neg' : 'pos') + it('Open Interest', isFinite(oi) ? fv(oi) + ' ' + esc(M.sym) + (isFinite(oi1) ? ' (' + (oi1 >= 0 ? '+' : '') + oi1.toFixed(2) + '% 1ω)' : '') : '–') : '') +
      it('CVD σήμερα', (cvd >= 0 ? '+' : '') + fv(cvd), cvd >= 0 ? 'pos' : 'neg') +
      it('Βιβλίο ±1%', isFinite(imb) ? (imb >= 0 ? 'αγοραστές +' : 'πωλητές ') + Math.abs(imb).toFixed(0) + '%' : '–', imb >= 0 ? 'pos' : 'neg') +
      it('Big ≥', usd(bigTh()) + (CFG.big ? '' : ' (αυτ.)')) +
      it('Footprint από', isFinite(M.fpFrom) ? dm(M.fpFrom) + ' ' + hm(M.fpFrom) : '–') +
      (M.err ? '<span class="neg">' + esc(M.err) + '</span>' : M.status ? '<span><small>' + esc(M.status) + '</small></span>' : '')
  }
  var SLT = 0;
  function renderSide(force) {
    var el = D.getElementById('fList'); if (!el || !M || !VIS) return; if (!force && Date.now() - SLT < 400) return; SLT = Date.now();
    var dec = M.dec, row = function (t, s, p, q, x, hl, at) { return '<div class="' + (s ? 'b' : 's') + (hl ? ' hl' : '') + '"' + (at ? ' data-fat="' + at + '"' : '') + '><span>' + hm(t, true) + '</span><span>' + p + '</span><span>' + q + '</span><span>' + x + '</span></div>' };
    var hd = function (a, b, c, d) { return '<div class="hd"><span>' + a + '</span><span>' + b + '</span><span>' + c + '</span><span>' + d + '</span></div>' }, html = '', th = bigTh();
    if (SIDE === 'tape') { var L = M.tape.slice(-140).reverse().filter(function (x) { return x.p * x.q >= (CFG.tapeMin || 0) }); html = hd('Ώρα', 'Τιμή', 'Ποσότ.', '$') + (L.length ? L.map(function (x) { return row(x.t, x.s, x.p.toFixed(dec), fv(x.q), usd(x.p * x.q), x.p * x.q >= th * 0.5) }).join('') : '<span class="em">περιμένω συναλλαγές…</span>') }
    else if (SIDE === 'big') { L = M.big.filter(function (o) { return o.usd >= th }).slice(-150).reverse(); html = hd('Ώρα', 'Τιμή', 'Ποσότ.', '$') + (L.length ? L.map(function (o) { return row(o.t, o.s, o.p.toFixed(dec), fv(o.q), usd(o.usd), o.usd >= th * 4, o.t) }).join('') : '<span class="em">Καμία εντολή ≥ ' + usd(th) + ' ακόμα.</span>') }
    else if (SIDE === 'sw') { L = M.sw.slice(-150).reverse(); html = hd('Ώρα', 'Από→Έως', 'Επίπεδα', '$') + (L.length ? L.map(function (o) { return row(o.t, o.s, (o.s ? o.pmin : o.pmax).toFixed(dec) + '→' + (o.s ? o.pmax : o.pmin).toFixed(dec), o.lv, usd(o.usd), o.usd >= th, o.t) }).join('') : '<span class="em">Κανένα sweep ακόμα. Sweep = μία εντολή που χτύπησε 4+ επίπεδα τιμής ταυτόχρονα.</span>') }
    else if (SIDE === 'ice') { L = M.ice.slice(-150).reverse(); html = hd('Ώρα', 'Τιμή', 'Εκτελ./Φαιν.', '$') + (L.length ? L.map(function (o) { return row(o.t, !o.s, o.p.toFixed(dec), fv(o.q) + '/' + fv(o.shown), usd(o.usd), o.usd >= th, o.t) }).join('') : '<span class="em">Κανένα iceberg ακόμα. Iceberg = σε μία τιμή εκτελέστηκε πάνω από 2,5× όσο έδειχνε το βιβλίο και η τιμή κράτησε (κρυφός μεγάλος αγοραστής/πωλητής).</span>') }
    else { L = M.liq.slice(-150).reverse(); html = hd('Ώρα', 'Τιμή', 'Θέση', '$') + (M.venue !== 'f' ? '<span class="em">Οι ρευστοποιήσεις υπάρχουν μόνο στα Futures.</span>' : L.length ? L.map(function (o) { return row(o.t, o.side === 'S', o.p.toFixed(dec), o.side === 'L' ? 'long ✕' : 'short ✕', usd(o.usd), o.usd >= 100000, o.t) }).join('') : '<span class="em">Καμία ρευστοποίηση από τότε που άνοιξε η καρτέλα.</span>') }
    el.innerHTML = html
  }

  /* ---------- αλληλεπίδραση ---------- */
  function zoomX(f, ax) { if (!M || !M.bars.length) return; var x = ax == null ? Lay.R - Lay.pad : ax, i = iOfX(x); V.bw = clamp(V.bw * f, 1.5, 240); V.off = cOff(V.off + (iOfX(x) - i)); DIRTY = true }
  function zoomY(f, ay) { var p = ay == null ? (V.y0 + V.y1) / 2 : pOfY(ay); V.yAuto = false; V.y0 = p - (p - V.y0) * f; V.y1 = p + (V.y1 - p) * f; DIRTY = true }
  function bindChart() {
    var pts = new Map(), pinch = null;
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015); if (e.ctrlKey || e.metaKey || x > Lay.R) zoomY(1 / f, y); else if (e.shiftKey) { V.off = cOff(V.off + e.deltaY / V.bw * 0.5); DIRTY = true } else zoomX(f, x) }, { passive: false });
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); var r = cv.getBoundingClientRect(); pts.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top }); if (pts.size === 2) { var a = Array.from(pts.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), bw: V.bw }; V.drag = null } else V.drag = { x: e.clientX - r.left, y: e.clientY - r.top, off: V.off, y0: V.y0, y1: V.y1, axis: e.clientX - r.left > Lay.R } });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; V.mx = x; V.my = y; DIRTY = true;
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: x, y: y });
      if (pinch && pts.size === 2) { var a = Array.from(pts.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mxp = (a[0].x + a[1].x) / 2, i = iOfX(mxp); V.bw = clamp(pinch.bw * d / pinch.d, 1.5, 240); V.off = cOff(V.off + (iOfX(mxp) - i)); return }
      var dg = V.drag; if (!dg) return;
      if (dg.axis) { var f = Math.exp((y - dg.y) * 0.01), mid = (dg.y0 + dg.y1) / 2, hh = (dg.y1 - dg.y0) / 2 * f; V.yAuto = false; V.y0 = mid - hh; V.y1 = mid + hh; return }
      V.off = cOff(dg.off + (x - dg.x) / V.bw);
      if (!V.yAuto) { var dp = (y - dg.y) / (Lay.B - Lay.T - 16) * (dg.y1 - dg.y0); V.y0 = dg.y0 + dp; V.y1 = dg.y1 + dp }
    });
    var up = function (e) { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; V.drag = null };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', function () { V.mx = V.my = -1; DIRTY = true });
    cv.addEventListener('dblclick', function () { V.off = 0; V.yAuto = true; DIRTY = true });
  }
  function onClick(e) {
    if (!ROOT || !ROOT.contains(e.target)) return; var t = e.target.closest('button,[data-fat]'); if (!t) return;
    var sg = t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute('data-fseg');
    if (sg) { var v = t.getAttribute('data-v'); if (CFG[sg] === v) return; CFG[sg] = v; saveCfg(); t.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === t) });
      if (sg === 'view') { ROOT.querySelectorAll('[data-fv]').forEach(function (s) { s.hidden = s.getAttribute('data-fv') !== v }); if (v === 'opt') optRender(); DIRTY = true; return }
      if (sg === 'oc') { optRender(); return }
      if (sg === 'venue' || sg === 'tf') { if (sg === 'tf' && M && M.venue === CFG.venue && M.sym === CFG.sym) { switchTf() } else start(); return }
      DIRTY = true; return }
    if (t.hasAttribute('data-fsh')) { var k = t.getAttribute('data-fsh'); CFG.sh[k] = CFG.sh[k] ? 0 : 1; t.classList.toggle('on', !!CFG.sh[k]); saveCfg(); if (k === 'opt' && CFG.sh.opt) optLevels(); DIRTY = true; return }
    if (t.hasAttribute('data-fsub')) { k = t.getAttribute('data-fsub'); CFG.sub[k] = CFG.sub[k] ? 0 : 1; t.classList.toggle('on', !!CFG.sub[k]); saveCfg(); DIRTY = true; return }
    if (t.hasAttribute('data-fz')) { var z = t.getAttribute('data-fz'); if (z === '+') zoomX(1.35); else if (z === '-') zoomX(1 / 1.35); else if (z === 'y') { V.yAuto = true; DIRTY = true } else { V.off = 0; V.yAuto = true; V.bw = CFG.mode === 'candle' ? 8 : 12; DIRTY = true } return }
    if (t.hasAttribute('data-fside')) { SIDE = t.getAttribute('data-fside'); ROOT.querySelectorAll('[data-fside]').forEach(function (b) { b.classList.toggle('on', b === t) }); renderSide(true); return }
    if (t.hasAttribute('data-fat')) { var at = +t.getAttribute('data-fat'), b0 = M.bars[0]; if (!b0) return; var i = (at - b0.t) / TF[M.tf]; if (V.bw < 30) V.bw = 30; V.off = cOff(M.bars.length - 1 - i - (Lay.R / 2 - Lay.pad - V.bw / 2) / V.bw); V.yAuto = true; DIRTY = true; return }
    if (t.hasAttribute('data-ffull')) { fullTog(); return }
    if (t.id === 'fPause') { PAUSE = !PAUSE; t.textContent = PAUSE ? '▶ Συνέχεια' : '⏸ Πάγωμα'; DIRTY = true; return }
    if (t.id === 'fOptR') { optRender(true); return }
  }
  function fullTog() {
    var fw = ROOT.querySelector('.fw'), on = !fw.classList.contains('ffull'), fsEl = D.fullscreenElement || D.webkitFullscreenElement;
    fw.classList.toggle('ffull', on); ROOT.querySelector('[data-ffull]').textContent = on ? '✕' : '⛶';
    try { if (on && !fsEl) { var rq = fw.requestFullscreen || fw.webkitRequestFullscreen; if (rq) { var pr = rq.call(fw); if (pr && pr.catch) pr.catch(function () { }) } } else if (!on && fsEl) { (D.exitFullscreen || D.webkitExitFullscreen).call(D) } } catch (e) { }
    DIRTY = true; setTimeout(function () { DIRTY = true }, 300)
  }
  function onFsChange() { var fw = ROOT && ROOT.querySelector('.fw'); if (fw && !(D.fullscreenElement || D.webkitFullscreenElement) && fw.classList.contains('ffull')) { fw.classList.remove('ffull'); var b = ROOT.querySelector('[data-ffull]'); if (b) b.textContent = '⛶'; DIRTY = true } }
  function switchTf() { var m = M; m.tf = CFG.tf; m.bars = []; m.fp = {}; rebuildFp(); V.off = 0; V.yAuto = true; loadBars().then(function () { if (m === M) { loadOIhist(); DIRTY = true } }) }
  function loadOIhist() { var m = M; if (m.venue !== 'f') return; var per = { '1m': '5m', '5m': '5m', '15m': '15m', '1h': '1h' }[m.tf]; bn('f', '/futures/data/openInterestHist', 'symbol=' + m.pair + '&period=' + per + '&limit=500').then(function (a) { if (m === M) { m.oi = (a || []).map(function (x) { return { t: +x.timestamp, v: +x.sumOpenInterest } }); DIRTY = true } }).catch(function () { }) }
  function onChange(e) {
    if (!ROOT || !ROOT.contains(e.target)) return; var t = e.target;
    if (t.id === 'fSym') { var s = String(t.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, ''); if (!s || s === CFG.sym) return; CFG.sym = s; t.value = s; saveCfg(); start(); return }
    if (t.id === 'fMult') { CFG.mult = t.value === 'auto' ? 'auto' : +t.value; saveCfg(); DIRTY = true; return }
    if (t.id === 'fBig') { CFG.big = Math.max(0, +t.value || 0); saveCfg(); DIRTY = true; renderSide(true); renderHead(); return }
    if (t.id === 'fExp') { CFG.oexp = t.value; saveCfg(); optRender(); return }
  }

  /* ---------- Options X-Ray: σελίδα ---------- */
  function optLevels() { var c = M && M.sym; if (c !== 'BTC' && c !== 'ETH') { OPT.lv = null; return } optLoad(c).then(function (d) { var v = optView(d, 'all'); OPT.lv = { c: c, cw: v.cw, pw: v.pw, mp: v.mp, flip: v.flip, emH: v.e0 ? v.S + v.e0.mv : null, emL: v.e0 ? v.S - v.e0.mv : null }; DIRTY = true }).catch(function () { }) }
  function optRender(force) {
    var el = D.getElementById('fOpt'); if (!el) return; var c = CFG.oc;
    optLoad(c, force).then(function (d) {
      if (CFG.oc !== c) return; var sel = D.getElementById('fExp'), ex = CFG.oexp; if (ex !== 'all' && !d.exps.some(function (x) { return x.e === ex })) ex = 'all';
      sel.innerHTML = '<option value="all">Όλες οι λήξεις</option>' + d.exps.map(function (x) { return '<option value="' + x.e + '"' + (x.e === ex ? ' selected' : '') + '>' + x.e + ' · ' + Math.max(0, (x.T - Date.now()) / 864e5).toFixed(1) + ' μέρες</option>' }).join('');
      var v = optView(d, ex), S = v.S, fp = function (p) { return p == null ? '–' : '$' + Math.round(p).toLocaleString('el-GR') }, pc = function (p) { return p == null ? '' : ((p / S - 1) * 100 >= 0 ? '+' : '') + ((p / S - 1) * 100).toFixed(1) + '%' };
      var kp = function (col, l, val, sub) { return '<div style="--c:' + col + '"><small>' + l + '</small><b>' + val + '</b><i>' + sub + '</i></div>' };
      el.innerHTML = '<div class="opk">' + kp('#d6e2ee', 'Τιμή (υποκείμενο)', fp(S), 'Deribit') + kp('#22c27f', 'Call wall', fp(v.cw), pc(v.cw) + ' · μέγιστο OI calls (αντίσταση)') + kp('#ef4f5f', 'Put wall', fp(v.pw), pc(v.pw) + ' · μέγιστο OI puts (στήριξη)') + kp('#ffffff', 'Max pain', fp(v.mp), pc(v.mp) + ' · λήξη ' + esc(v.pe || '')) + kp('#ff6bd6', 'Gamma flip', fp(v.flip), v.flip ? (S > v.flip ? 'από πάνω: θετικό gamma (ήρεμη αγορά)' : 'από κάτω: αρνητικό gamma (απότομες κινήσεις)') : 'χωρίς αλλαγή πρόσημου ±20%') +
        kp('#8597a8', 'Αναμενόμενη κίνηση', v.e0 ? '±' + fp(v.e0.mv) : '–', v.e0 ? esc(v.e0.e) + ' · IV ' + (v.e0.iv * 100).toFixed(0) + '% · ' + fp(S - v.e0.mv) + '–' + fp(S + v.e0.mv) : '') + kp('#ffc443', 'Put/Call OI', v.tc ? (v.tp / v.tc).toFixed(2) : '–', fv(v.tc) + ' calls · ' + fv(v.tp) + ' puts') + kp(v.tg >= 0 ? '#22c27f' : '#ef4f5f', 'Συνολικό GEX', (v.tg >= 0 ? '+' : '−') + usd(Math.abs(v.tg)), 'ανά 1% κίνηση · ' + (v.tg >= 0 ? 'οι dealers φρενάρουν την τιμή' : 'οι dealers ενισχύουν την κίνηση')) + '</div>' +
        '<div class="opg"><div class="opc"><h4>Strike Profile · Open Interest (puts ← → calls)</h4><canvas id="fOiCv"></canvas></div><div class="opc"><h4>GEX Profile ανά strike (Gamma Exposure, $ ανά 1%)</h4><canvas id="fGxCv"></canvas></div></div>' +
        '<div class="opg"><div class="opc"><h4>Αναμενόμενη κίνηση ανά λήξη (από το ATM implied volatility)</h4><table class="opt"><thead><tr><th>Λήξη</th><th>Μέρες</th><th>ATM IV</th><th>±Κίνηση</th><th>Εύρος</th></tr></thead><tbody>' + v.em.map(function (x) { return '<tr><td>' + esc(x.e) + '</td><td>' + x.days.toFixed(1) + '</td><td>' + (x.iv * 100).toFixed(1) + '%</td><td>±' + fp(x.mv) + ' (' + (x.mv / S * 100).toFixed(1) + '%)</td><td>' + fp(S - x.mv) + ' – ' + fp(S + x.mv) + '</td></tr>' }).join('') + '</tbody></table></div>' +
        '<div class="opc"><h4>Τι σημαίνουν</h4><p style="font-size:.8rem;color:var(--fmu);margin:.2rem .3rem;line-height:1.45"><b style="color:#22c27f">Call wall</b>: το strike με τα περισσότερα ανοιχτά calls πάνω από την τιμή. Συχνά λειτουργεί σαν αντίσταση.<br><b style="color:#ef4f5f">Put wall</b>: τα περισσότερα puts κάτω από την τιμή, συχνά στήριξη.<br><b>Max pain</b>: η τιμή λήξης όπου χάνουν τα περισσότερα options. Κοντά στη λήξη η τιμή τείνει προς τα εκεί.<br><b style="color:#ff6bd6">Gamma flip</b>: πάνω από αυτό οι dealers (θετικό gamma) πουλούν στις ανόδους και αγοράζουν στις πτώσεις, οπότε η αγορά ηρεμεί. Κάτω από αυτό κάνουν το αντίθετο και οι κινήσεις επιταχύνονται.<br><b>Αναμενόμενη κίνηση</b>: το ±1σ εύρος μέχρι τη λήξη, όπως το «τιμολογεί» η αγορά options.<br>Υπόθεση GEX: οι dealers είναι long calls/short puts από την πλευρά του πελάτη (συνήθης παραδοχή).</p></div></div>' +
        '<p style="padding:0 .7rem .7rem;font-size:.74rem;color:var(--fmu)">Πηγή: Deribit, δημόσιο API (' + d.O.length + ' συμβόλαια). Ενημέρωση ' + hm(d.at, true) + '. Το gamma υπολογίζεται με Black-Scholes από το mark IV κάθε συμβολαίου. Τα επίπεδα εμφανίζονται και στο διάγραμμα Order Flow (κουμπί «Options levels»).</p>';
      optCharts(v);
      if (M && M.sym === c) optLevels()
    }).catch(function () { el.innerHTML = '<p style="padding:1rem;color:#ef4f5f">Δεν ήρθαν δεδομένα από το Deribit. Δοκίμασε ↻ σε λίγο.</p>' })
  }
  function optCharts(v) {
    var S = v.S, L = v.L.filter(function (x) { return x.K >= S * 0.7 && x.K <= S * 1.3 && (x.c + x.p > 0 || x.g) });
    [['fOiCv', 'oi'], ['fGxCv', 'gx']].forEach(function (z) {
      var c = D.getElementById(z[0]); if (!c) return; var r = c.getBoundingClientRect(), dpr = W.devicePixelRatio || 1, w = r.width, h = r.height; c.width = w * dpr; c.height = h * dpr; var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = C.bg; g.fillRect(0, 0, w, h); g.font = FONT; g.textBaseline = 'middle'; if (!L.length) return;
      var lo = Math.min(L[0].K, S), hi = Math.max(L[L.length - 1].K, S), pd = (hi - lo) * 0.03; lo -= pd; hi += pd; var y = function (p) { return 8 + (hi - p) / (hi - lo) * (h - 16) }, lw = 70, cx0 = lw + (w - lw - 8) / 2, half = (w - lw - 8) / 2 - 4;
      var bh = Math.max(2, Math.min(14, (h - 16) / L.length - 1));
      if (z[1] === 'oi') { var mx = 0; L.forEach(function (x) { mx = Math.max(mx, x.c, x.p) }); L.forEach(function (x) { var yy = y(x.K) - bh / 2; g.fillStyle = 'rgba(239,79,95,.75)'; g.fillRect(cx0 - half * x.p / mx, yy, half * x.p / mx, bh); g.fillStyle = 'rgba(34,194,127,.75)'; g.fillRect(cx0, yy, half * x.c / mx, bh) }); g.strokeStyle = '#2a3a4a'; g.beginPath(); g.moveTo(cx0, 0); g.lineTo(cx0, h); g.stroke() }
      else { var mg = 0; L.forEach(function (x) { mg = Math.max(mg, Math.abs(x.g)) }); L.forEach(function (x) { var yy = y(x.K) - bh / 2, ww = half * Math.abs(x.g) / (mg || 1); g.fillStyle = x.g >= 0 ? 'rgba(79,194,184,.85)' : 'rgba(255,107,214,.8)'; g.fillRect(x.g >= 0 ? cx0 : cx0 - ww, yy, ww, bh) }); g.strokeStyle = '#2a3a4a'; g.beginPath(); g.moveTo(cx0, 0); g.lineTo(cx0, h); g.stroke() }
      var stp = nice((hi - lo) / 14); g.fillStyle = C.axis; g.textAlign = 'right'; for (var p = Math.ceil(lo / stp) * stp; p <= hi; p += stp) g.fillText(Math.round(p).toLocaleString('el-GR'), lw - 6, y(p));
      var used = [], ln = function (p, col, nm) { if (p == null) return; var yy = y(p), ty = yy - 7; while (used.some(function (u) { return Math.abs(u - ty) < 12 })) ty -= 12; used.push(ty); g.strokeStyle = col; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(lw, yy); g.lineTo(w, yy); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.textAlign = 'right'; g.fillText(nm, w - 6, ty) };
      ln(S, '#ffffff', 'Τιμή ' + Math.round(S).toLocaleString('el-GR')); ln(v.mp, '#ffc443', 'Max pain'); ln(v.flip, '#ff6bd6', 'Gamma flip'); if (z[1] === 'oi') { ln(v.cw, '#22c27f', 'Call wall'); ln(v.pw, '#ef4f5f', 'Put wall') }
      g.fillStyle = C.mut; g.textAlign = 'left'; g.fillText(z[1] === 'oi' ? '← Puts   Calls →' : '← αρνητικό   θετικό →', lw + 4, h - 8)
    })
  }

  /* ---------- βρόχος σχεδίασης ---------- */
  var lastDom = 0, lastHead = 0;
  function loop() {
    RAF = 0; if (!VIS) return; var now = Date.now();
    if (CFG.view === 'chart') { if ((DIRTY && !PAUSE) || V.drag || V.mx >= 0) { DIRTY = false; try { draw() } catch (e) { console.error(e) } } if (!PAUSE && now - lastDom > 220) { lastDom = now; try { drawDom() } catch (e) { } } if (now - lastHead > 1000) { lastHead = now; renderHead(); if (SIDE === 'tape' && !PAUSE) renderSide() } }
    RAF = setTimeout(function () { requestAnimationFrame(loop) }, 66)
  }
  W.FLOW = {
    show: function () {
      ROOT = D.getElementById('flowRoot'); if (!ROOT) return; VIS = true; clearTimeout(HIDE_T);
      if (!ROOT.firstChild) { shell(); D.addEventListener('click', onClick); D.addEventListener('change', onChange); D.addEventListener('fullscreenchange', onFsChange); D.addEventListener('webkitfullscreenchange', onFsChange); D.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var fw = ROOT && ROOT.querySelector('.fw.ffull'); if (fw && !(D.fullscreenElement || D.webkitFullscreenElement)) fullTog() } }); W.addEventListener('resize', function () { DIRTY = true; if (CFG.view === 'opt') optRender() }) }
      if (!M || M.dead) { start(); setTimeout(optLevels, 1500) }
      if (CFG.view === 'opt') optRender();
      DIRTY = true; if (!RAF) loop()
    },
    hide: function () { VIS = false; clearTimeout(HIDE_T); HIDE_T = setTimeout(function () { if (!VIS) stop() }, 20 * 6e4) },
    _m: function () { return M }, _v: V, _cfg: CFG
  };
})();
