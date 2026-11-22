/* 🔬 Order Flow — επαγγελματική ανάλυση ροής εντολών, δωρεάν, με τα δημόσια δεδομένα των ανταλλακτηρίων.
   Footprint (Bid×Ask, Delta, Volume), Heatmap βάθους, Big Trades, Sweeps, Icebergs, Ρευστοποιήσεις (stop runs),
   Volume Profile, VWAP, DOM, Time & Sales, Delta / CVD / Open Interest, Options X-Ray (Deribit: OI, GEX, Max Pain).
   Πηγές: Binance (WebSocket + REST, χωρίς κλειδί), Deribit (REST). Τίποτα δεν εκτελεί εντολές. */
(function () {
  'use strict';
  var D = document, W = window;
  var TF = { '1m': 6e4, '5m': 3e5, '15m': 9e5, '1h': 36e5, '4h': 144e5, '1d': 864e5, '1w': 6048e5 };
  var COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX', 'LINK', 'LTC', 'SUI', 'HBAR', 'ZEC', 'HYPE', 'TRX', 'DOT', 'NEAR', 'APT', 'ARB', 'OP', 'PEPE', 'WIF', 'TON', 'BCH'];
  var C = { bg: '#0a0e13', panel: '#0e141b', grid: '#17212c', axis: '#8597a8', txt: '#d6e2ee', mut: '#6f8192', up: '#22c27f', dn: '#ef4f5f', vah: '#5cb3ff', poc: '#ffc443', val: '#d08bff', vwap: '#c77dff', liq: '#ffb020', ice: '#5ef0ff', sw: '#ff6bd6', cur: '#ffffff' };
  var MULTS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000];
  var FONT = '11px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

  /* ---------- ρυθμίσεις (ανά browser) ---------- */
  var CFG = { follow: false, lang: 'el', lines: {}, al: { big: 0, bigx: 3, off: 0 }, csMin: 0, sym: 'BTC', venue: 'f', tf: '1m', mode: 'fp_ba', mult: 'auto', big: 0, sub: { delta: 1, cvd: 1, oi: 1, spd: 0, stat: 1 }, sh: { heat: 1, big: 1, liq: 1, sw: 1, ice: 1, vp: 1, vwap: 1, mlv: 1, opt: 1, imb: 1, stk: 1, cs: 1, sig: 1, vpd: 1, fvg: 1, ob: 1, bos: 1, liqd: 1 }, view: 'chart', oc: 'BTC', oexp: 'all', tapeMin: 0 };
  function cfgMerge(sv) { if (sv) { for (var k in sv) if (k in CFG) CFG[k] = (typeof CFG[k] === 'object' && !Array.isArray(CFG[k]) && CFG[k]) ? Object.assign({}, CFG[k], sv[k]) : sv[k] } }
  var CFG_AT = 0;
  try { var sv = JSON.parse(localStorage.getItem('tj-flow') || 'null'); cfgMerge(sv); CFG_AT = +localStorage.getItem('tj-flow-at') || 0 } catch (e) { }
  var EN = {"φόρτωση…": "loading…", " δεν υπάρχει στο Binance ": " is not listed on Binance ", ". Δοκίμασε την άλλη αγορά.": ". Try the other market.", "Δεν ήρθαν δεδομένα από το Binance (": "No data from Binance (", "δίκτυο": "network", "⏸ ΠΑΓΩΜΕΝΟ": "⏸ FROZEN", "φορτώνω footprint… ": "loading footprint… ", "Όγκος ": "Volume ", "Στο ": "At ", "σύνδεση στο βιβλίο…": "connecting to the order book…", "Τιμή": "Price", "<span style=\"flex:1\"></span><span style=\"font-size:.74rem;color:var(--fmu)\">Δωρεάν δημόσια δεδομένα Binance · Deribit · τίποτα δεν εκτελεί εντολές</span></div>": "<span style=\"flex:1\"></span><span style=\"font-size:.74rem;color:var(--fmu)\">Free public data from Binance · Deribit · nothing places orders</span></div>", "\" size=\"6\" title=\"Νόμισμα\"><datalist id=\"flowCoins\">": "\" size=\"6\" title=\"Coin\"><datalist id=\"flowCoins\">", "Binance USDⓈ-M perpetual (περισσότερος όγκος, ρευστοποιήσεις, OI)": "Binance USDⓈ-M perpetual (more volume, liquidations, OI)", "Κεριά": "Candles", "Footprint: πωλήσεις αγοράς (αριστερά) × αγορές αγοράς (δεξιά) σε κάθε τιμή": "Footprint: market sells (left) × market buys (right) at each price", "Footprint: αγορές − πωλήσεις σε κάθε τιμή": "Footprint: buys − sells at each price", "Όγκος": "Volume", "Footprint: συνολικός όγκος σε κάθε τιμή": "Footprint: total volume at each price", "<select id=\"fMult\" title=\"Βήμα τιμής (cluster)\"><option value=\"auto\">Βήμα: αυτόματο</option>": "<select id=\"fMult\" title=\"Price step (cluster size)\"><option value=\"auto\">Step: auto</option>", "\" placeholder=\"αυτόματο\" style=\"width:7em\"></label>": "\" placeholder=\"auto\" style=\"width:7em\"></label>", "<button class=\"fbtn\" id=\"fPause\" title=\"Πάγωμα της εικόνας (τα δεδομένα συνεχίζουν να καταγράφονται)\">⏸ Πάγωμα</button></div>": "<button class=\"fbtn\" id=\"fPause\" title=\"Freeze the picture (data keeps recording)\">⏸ Freeze</button></div>", "Ιστορικό βάθους βιβλίου εντολών (από τη στιγμή που άνοιξε η σελίδα)": "Order book depth history (since the page was opened)", "Μεγάλες εντολές αγοράς/πώλησης": "Large market buy/sell orders", "Εντολές που «σάρωσαν» πολλά επίπεδα μαζί": "Orders that swept several price levels at once", "Κρυφές εντολές: εκτελέστηκε πολύ περισσότερο από όσο έδειχνε το βιβλίο": "Hidden orders: far more was filled than the book showed", "Ρευστοποιήσεις futures": "Futures liquidations", "Προφίλ όγκου ορατού εύρους με POC/VAH/VAL": "Visible-range volume profile with POC/VAH/VAL", "VWAP ημέρας": "Daily VWAP", "Διαγώνιες ανισορροπίες ×3 στο footprint": "Diagonal ×3 imbalances in the footprint", "M/POC μήνα": "Monthly M/POC", "Επίπεδα μηνιαίου Market Profile (καρτέλα Αγορές)": "Monthly Market Profile levels (Markets tab)", "<div class=\"fgrid\"><div class=\"fmain\"><canvas id=\"fCv\"></canvas><div class=\"fzm\"><button data-fz=\"-\" title=\"Σμίκρυνση\">−</button><button data-fz=\"+\" title=\"Μεγέθυνση\">+</button><button data-fz=\"y\" title=\"Αυτόματη κλίμακα τιμής\">↕</button><button data-fz=\"0\" title=\"Επαναφορά\">⟲</button></div><button class=\"ffs\" data-ffull title=\"Πλήρης οθόνη (Esc για έξοδο)\">⛶</button></div>": "<div class=\"fgrid\"><div class=\"fmain\"><canvas id=\"fCv\"></canvas><div class=\"fzm\"><button data-fz=\"-\" title=\"Zoom out\">−</button><button data-fz=\"+\" title=\"Zoom in\">+</button><button data-fz=\"y\" title=\"Auto price scale\">↕</button><button data-fz=\"0\" title=\"Reset\">⟲</button></div><button class=\"ffs\" data-ffull title=\"Full screen (Esc to exit)\">⛶</button></div>", "<div class=\"fleg\"><span><i style=\"color:#ff8f9b\">Bid</i> × <i style=\"color:#6dffb8\">Ask</i>: πωλήσεις × αγορές «στην αγορά» σε κάθε τιμή</span><span><i style=\"color:#ffc443\">▭</i> POC κεριού</span><span><i style=\"color:#6dffb8\">έντονο</i> = ανισορροπία ×3</span><span>🫧 Big trade</span><span><i style=\"color:#ff6bd6\">↕</i> Sweep</span><span><i style=\"color:#5ef0ff\">⊟</i> Iceberg</span><span><i style=\"color:#ffb020\">◆</i> ρευστοποίηση long · <i style=\"color:#5ef0ff\">◆</i> short</span><span><i style=\"color:#c77dff\">—</i> VWAP</span><span><i style=\"color:#5cb3ff\">VAH</i> · <i style=\"color:#ffc443\">POC</i> · <i style=\"color:#d08bff\">VAL</i></span></div>": "<div class=\"fleg\"><span><i style=\"color:#ff8f9b\">Bid</i> × <i style=\"color:#6dffb8\">Ask</i>: market sells × market buys at each price</span><span><i style=\"color:#ffc443\">▭</i> candle POC</span><span><i style=\"color:#6dffb8\">bold</i> = ×3 imbalance</span><span>🫧 Big trade</span><span><i style=\"color:#ff6bd6\">↕</i> Sweep</span><span><i style=\"color:#5ef0ff\">⊟</i> Iceberg</span><span><i style=\"color:#ffb020\">◆</i> long liquidation · <i style=\"color:#5ef0ff\">◆</i> short</span><span><i style=\"color:#c77dff\">—</i> VWAP</span><span><i style=\"color:#5cb3ff\">VAH</i> · <i style=\"color:#ffc443\">POC</i> · <i style=\"color:#d08bff\">VAL</i></span></div>", "<div class=\"fnote\">Ροδέλα: ζουμ στον χρόνο · Ctrl/⌘ + ροδέλα ή σύρσιμο στον άξονα τιμών: ζουμ στην τιμή · σύρσιμο: μετακίνηση · διπλό κλικ: επαναφορά. Τα αριθμητικά footprint εμφανίζονται όταν μεγεθύνεις (+). Το footprint χτίζεται από τις πραγματικές συναλλαγές (aggTrades): τα τελευταία λεπτά φορτώνονται αμέσως, και όσο η καρτέλα μένει ανοιχτή φυλάγεται στον browser για 3 μέρες. Το heatmap καταγράφει το βάθος από τη στιγμή που ανοίγεις την καρτέλα.</div>": "<div class=\"fnote\">Wheel: zoom time · Ctrl/⌘ + wheel or drag on the price axis: zoom price · drag: pan · double-click: reset. Footprint numbers appear when you zoom in (+). The footprint is built from real trades (aggTrades): the last minutes load instantly, and while the tab stays open it is kept in your browser for 3 days. The heatmap records depth from the moment you open the tab.</div>", "<select id=\"fExp\"></select><button class=\"fbtn\" id=\"fOptR\">↻ Ανανέωση</button><span style=\"font-size:.74rem;color:var(--fmu)\">Deribit · όλα τα options · ενημέρωση ανά λεπτό</span></div><div id=\"fOpt\"><p style=\"padding:1rem;color:var(--fmu)\">φόρτωση…</p></div></div>": "<select id=\"fExp\"></select><button class=\"fbtn\" id=\"fOptR\">↻ Refresh</button><span style=\"font-size:.74rem;color:var(--fmu)\">Deribit · all options · updated every minute</span></div><div id=\"fOpt\"><p style=\"padding:1rem;color:var(--fmu)\">loading…</p></div></div>", "Όγκος 24ω": "24h volume", "% 1ω)": "% 1h)", "CVD σήμερα": "CVD today", "Βιβλίο ±1%": "Book ±1%", "αγοραστές +": "buyers +", "πωλητές ": "sellers ", " (αυτ.)": " (auto)", "Footprint από": "Footprint since", "Ώρα": "Time", "Ποσότ.": "Qty", "<span class=\"em\">περιμένω συναλλαγές…</span>": "<span class=\"em\">waiting for trades…</span>", "<span class=\"em\">Καμία εντολή ≥ ": "<span class=\"em\">No order ≥ ", " ακόμα.</span>": " yet.</span>", "Από→Έως": "From→To", "Επίπεδα": "Levels", "<span class=\"em\">Κανένα sweep ακόμα. Sweep = μία εντολή που χτύπησε 4+ επίπεδα τιμής ταυτόχρονα.</span>": "<span class=\"em\">No sweeps yet. Sweep = one order that hit 4+ price levels at once.</span>", "Εκτελ./Φαιν.": "Filled/Shown", "<span class=\"em\">Κανένα iceberg ακόμα. Iceberg = σε μία τιμή εκτελέστηκε πάνω από 2,5× όσο έδειχνε το βιβλίο και η τιμή κράτησε (κρυφός μεγάλος αγοραστής/πωλητής).</span>": "<span class=\"em\">No icebergs yet. Iceberg = at one price more than 2.5× the displayed size was filled and the level held (hidden large buyer/seller).</span>", "Θέση": "Position", "<span class=\"em\">Οι ρευστοποιήσεις υπάρχουν μόνο στα Futures.</span>": "<span class=\"em\">Liquidations exist only on Futures.</span>", "<span class=\"em\">Καμία ρευστοποίηση από τότε που άνοιξε η καρτέλα.</span>": "<span class=\"em\">No liquidations since the tab was opened.</span>", "▶ Συνέχεια": "▶ Resume", "⏸ Πάγωμα": "⏸ Freeze", "<option value=\"all\">Όλες οι λήξεις</option>": "<option value=\"all\">All expiries</option>", " μέρες</option>": " days</option>", "Τιμή (υποκείμενο)": "Price (underlying)", " · μέγιστο OI calls (αντίσταση)": " · max call OI (resistance)", " · μέγιστο OI puts (στήριξη)": " · max put OI (support)", " · λήξη ": " · expiry ", "από πάνω: θετικό gamma (ήρεμη αγορά)": "above it: positive gamma (calm market)", "από κάτω: αρνητικό gamma (απότομες κινήσεις)": "below it: negative gamma (sharp moves)", "χωρίς αλλαγή πρόσημου ±20%": "no sign change within ±20%", "Αναμενόμενη κίνηση": "Expected move", "Συνολικό GEX": "Total GEX", "ανά 1% κίνηση · ": "per 1% move · ", "οι dealers φρενάρουν την τιμή": "dealers dampen price", "οι dealers ενισχύουν την κίνηση": "dealers amplify moves", "<div class=\"opg\"><div class=\"opc\"><h4>Strike Profile · Open Interest (puts ← → calls)</h4><canvas id=\"fOiCv\"></canvas></div><div class=\"opc\"><h4>GEX Profile ανά strike (Gamma Exposure, $ ανά 1%)</h4><canvas id=\"fGxCv\"></canvas></div></div>": "<div class=\"opg\"><div class=\"opc\"><h4>Strike Profile · Open Interest (puts ← → calls)</h4><canvas id=\"fOiCv\"></canvas></div><div class=\"opc\"><h4>GEX Profile by strike (Gamma Exposure, $ per 1%)</h4><canvas id=\"fGxCv\"></canvas></div></div>", "<div class=\"opg\"><div class=\"opc\"><h4>Αναμενόμενη κίνηση ανά λήξη (από το ATM implied volatility)</h4><table class=\"opt\"><thead><tr><th>Λήξη</th><th>Μέρες</th><th>ATM IV</th><th>±Κίνηση</th><th>Εύρος</th></tr></thead><tbody>": "<div class=\"opg\"><div class=\"opc\"><h4>Expected move by expiry (from ATM implied volatility)</h4><table class=\"opt\"><thead><tr><th>Expiry</th><th>Days</th><th>ATM IV</th><th>±Move</th><th>Range</th></tr></thead><tbody>", "<div class=\"opc\"><h4>Τι σημαίνουν</h4><p style=\"font-size:.8rem;color:var(--fmu);margin:.2rem .3rem;line-height:1.45\"><b style=\"color:#22c27f\">Call wall</b>: το strike με τα περισσότερα ανοιχτά calls πάνω από την τιμή. Συχνά λειτουργεί σαν αντίσταση.<br><b style=\"color:#ef4f5f\">Put wall</b>: τα περισσότερα puts κάτω από την τιμή, συχνά στήριξη.<br><b>Max pain</b>: η τιμή λήξης όπου χάνουν τα περισσότερα options. Κοντά στη λήξη η τιμή τείνει προς τα εκεί.<br><b style=\"color:#ff6bd6\">Gamma flip</b>: πάνω από αυτό οι dealers (θετικό gamma) πουλούν στις ανόδους και αγοράζουν στις πτώσεις, οπότε η αγορά ηρεμεί. Κάτω από αυτό κάνουν το αντίθετο και οι κινήσεις επιταχύνονται.<br><b>Αναμενόμενη κίνηση</b>: το ±1σ εύρος μέχρι τη λήξη, όπως το «τιμολογεί» η αγορά options.<br>Υπόθεση GEX: οι dealers είναι long calls/short puts από την πλευρά του πελάτη (συνήθης παραδοχή).</p></div></div>": "<div class=\"opc\"><h4>What they mean</h4><p style=\"font-size:.8rem;color:var(--fmu);margin:.2rem .3rem;line-height:1.45\"><b style=\"color:#22c27f\">Call wall</b>: the strike with the most open calls above price. Often acts as resistance.<br><b style=\"color:#ef4f5f\">Put wall</b>: the most puts below price, often support.<br><b>Max pain</b>: the expiry price where the most options lose. Near expiry price tends to drift there.<br><b style=\"color:#ff6bd6\">Gamma flip</b>: above it dealers (positive gamma) sell rallies and buy dips, so the market calms down. Below it they do the opposite and moves accelerate.<br><b>Expected move</b>: the ±1σ range to expiry as priced by the options market.<br>GEX assumption: dealers are long calls/short puts against customers (the usual convention).</p></div></div>", "<p style=\"padding:0 .7rem .7rem;font-size:.74rem;color:var(--fmu)\">Πηγή: Deribit, δημόσιο API (": "<p style=\"padding:0 .7rem .7rem;font-size:.74rem;color:var(--fmu)\">Source: Deribit public API (", " συμβόλαια). Ενημέρωση ": " contracts). Updated ", ". Το gamma υπολογίζεται με Black-Scholes από το mark IV κάθε συμβολαίου. Τα επίπεδα εμφανίζονται και στο διάγραμμα Order Flow (κουμπί «Options levels»).</p>": ". Gamma is computed with Black-Scholes from each contract's mark IV. The levels also appear on the Order Flow chart (\"Options levels\" button).</p>", "<p style=\"padding:1rem;color:#ef4f5f\">Δεν ήρθαν δεδομένα από το Deribit. Δοκίμασε ↻ σε λίγο.</p>": "<p style=\"padding:1rem;color:#ef4f5f\">No data from Deribit. Try ↻ in a moment.</p>", "Τιμή ": "Price ", "← αρνητικό   θετικό →": "← negative   positive →"};
  function LX(s) { return CFG.lang === 'en' && EN[s] != null ? EN[s] : s }
  function T(el, en) { return CFG.lang === 'en' ? en : el }
  /* οι ρυθμίσεις (νόμισμα, timeframe, δείκτες, Big trade ≥ $, γραμμές 🔔…) αποθηκεύονται ΚΑΙ στο προφίλ του μέλους στη βάση
     (uprefs/{uid}_flow): σε άλλη συσκευή ή μετά από καθάρισμα του browser συνεχίζεις από εκεί που σταμάτησες */
  var RC = { t: 0, done: false };
  function rcDoc() { try { var u = W.firebase && firebase.auth && firebase.auth().currentUser, db = fsdb(); return u && db && !W.__TJ_BOT ? db.collection('uprefs').doc(u.uid + '_flow') : null } catch (e) { return null } }
  function saveCfg() {
    CFG_AT = Date.now(); try { localStorage.setItem('tj-flow', JSON.stringify(CFG)); localStorage.setItem('tj-flow-at', String(CFG_AT)) } catch (e) { }
    clearTimeout(RC.t); RC.t = setTimeout(function () { var r = rcDoc(); if (r) r.set({ cfg: JSON.stringify(CFG), at: CFG_AT }).catch(function () { }) }, 4000)
  }
  function rcLoad() {
    var r = rcDoc(); if (!r) return Promise.resolve(false);
    return Promise.race([r.get().then(function (sn) { var d = sn.exists ? sn.data() : null; if (!d || !d.cfg) { if (CFG_AT || localStorage.getItem('tj-flow')) r.set({ cfg: JSON.stringify(CFG), at: CFG_AT || Date.now() }).catch(function () { }); return false } if (!(+d.at > CFG_AT)) return false; var o = JSON.parse(d.cfg); cfgMerge(o); CFG_AT = +d.at; try { localStorage.setItem('tj-flow', JSON.stringify(CFG)); localStorage.setItem('tj-flow-at', String(CFG_AT)) } catch (e) { } return true }), new Promise(function (ok) { setTimeout(function () { ok(false) }, 2500) })]).catch(function () { return false })
  }

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
      icew: {}, icen: 0, bd1: {}, tps: [], fpVer: 0, rc: {}, alerts: [], status: LX('φόρτωση…'), err: '', ws: null, wsTry: 0, conn: false, created: Date.now()
    }
  }

  function key(p) { return Math.round(p / M.bucket) }
  function barT(t, tf) { tf = tf || M.tf; var ms = TF[tf]; if (tf === '1w') return Math.floor((t - 4 * 864e5) / ms) * ms + 4 * 864e5; return Math.floor(t / ms) * ms }

  /* ---------- φόρτωση ---------- */
  function start() {
    stop(); M = newM(); var m = M; V.off = 0; V.yAuto = true; V.follow = !!CFG.follow; DIRTY = true; renderHead();
    var p1 = bn(m.venue, m.venue === 'f' ? '/fapi/v1/depth' : '/api/v3/depth', 'symbol=' + m.pair + '&limit=1000').then(function (d) {
      if (m !== M) return; var bp = (d.bids || []).map(function (x) { return +x[0] }), mid = bp[0] || NaN, tk = Infinity;
      for (var i = 1; i < Math.min(60, bp.length); i++) { var df = Math.abs(bp[i - 1] - bp[i]); if (df > 0 && df < tk) tk = df }
      m.tick = isFinite(tk) ? +tk.toPrecision(6) : 0; m.snap = d; m.mid0 = mid;
    }).catch(function () { });
    var p2 = bn(m.venue, m.venue === 'f' ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr', 'symbol=' + m.pair).then(function (t) { if (m === M) { m.t24 = t; if (!isFinite(m.mid0)) m.mid0 = +t.lastPrice } }).catch(function (e) { if (m === M) m.noSym = true });
    Promise.all([p1, p2]).then(function () {
      if (m !== M) return;
      if (m.noSym && !m.snap) { m.status = ''; m.err = m.pair + LX(' δεν υπάρχει στο Binance ') + (m.venue === 'f' ? 'Futures' : 'Spot') + LX('. Δοκίμασε την άλλη αγορά.'); renderHead(); DIRTY = true; return }
      var px = m.mid0 || 1; m.bucket = nice(px * 2e-4); if (m.tick && m.bucket < m.tick) m.bucket = m.tick; m.dec = pdec(Math.min(m.bucket, m.tick || m.bucket));
      m.heat.half = Math.ceil(px * 0.04 / m.bucket);
      if (m.snap) bookSnap(m.snap);
      return loadBars().then(function () { connect(); backfill(); bigHist(); loadOI(); idbLoad(); OPT.lv = null; if (CFG.sh.opt) optLevels(); if (CFG.sh.mlv && !mpRow()) { try { W.__E9 && W.__E9.mp && !W.__E9.mpRows() && W.__E9.mp() } catch (x) { } } })
    }).catch(function (e) { if (m === M) { m.err = LX('Δεν ήρθαν δεδομένα από το Binance (') + (e && e.status || LX('δίκτυο')) + ').'; renderHead() } });
  }
  function stop() { if (M) { M.dead = true; (M.wss || []).forEach(function (w) { try { w.onclose = null; w.close() } catch (e) { } }); clearTimeout(M.rt); clearInterval(M.wd); clearInterval(M.hi); clearInterval(M.oit); clearInterval(M.si); clearTimeout(M.book && M.book.rsT); idbSave() } }

  function loadBars() {
    var m = M, ms = TF[m.tf];
    return bn(m.venue, m.venue === 'f' ? '/fapi/v1/klines' : '/api/v3/klines', 'symbol=' + m.pair + '&interval=' + m.tf + '&limit=' + (m.venue === 'f' ? 1500 : 1000)).then(function (k) {
      if (m !== M) return;
      m.bars = k.map(function (x) { return { t: +x[0], o: +x[1], h: +x[2], l: +x[3], c: +x[4], v: +x[5], bv: +x[9], usd: +x[7], n: +x[8] } });
      var l = m.bars[m.bars.length - 1]; if (l) m.last = l.c; m.status = ''; DIRTY = true; renderHead()
    })
  }
  /* footprint προηγούμενων λεπτών: τα τελευταία aggTrades (πηγαίνει πίσω όσο επιτρέπει ένα λογικό όριο αιτημάτων) */
  /* κατέβασμα ιστορικού συναλλαγών στο άνοιγμα (footprint, big trades): σελίδες των 1000 με αριθμό συναλλαγής, 6 παράλληλα,
     έως 12 ώρες πίσω. Spot έως 240 σελίδες (βάρος 2 η καθεμία), Futures έως 48 (βάρος 20: κάτω από το όριο της Binance) */
  function backfill() {
    var m = M, path = m.venue === 'f' ? '/fapi/v1/aggTrades' : '/api/v3/aggTrades', n = 0, MAX = m.venue === 'f' ? 48 : 240, PAR = 6, oldest = Date.now() - 12 * 36e5, top = null, stop = false;
    m.bf = { n: 0, from: NaN };
    var get = function (fromId) { return bn(m.venue, path, 'symbol=' + m.pair + '&limit=1000' + (fromId != null ? '&fromId=' + fromId : '')).catch(function () { return null }) };
    var eat = function (a) {
      if (m !== M || !a || !a.length) return; var lim = m.liveFrom || Infinity;
      a.forEach(function (x) { if (x.T < lim) addTrade(+x.p, +x.q, x.T, x.m, true) });
      n++; m.bf.n = n; if (!(a[0].T >= m.bf.from)) m.bf.from = a[0].T; m.fpVer++; DIRTY = true;
      if (a[0].T <= oldest || a[0].a <= 0) stop = true
    };
    var batch = function (k) {
      if (m !== M || stop || k >= MAX) return Promise.resolve(); var ids = [];
      for (var j = 0; j < PAR && k + j < MAX; j++) { var id = top - 1000 * (k + j); if (id < 0) break; ids.push(id) }
      if (!ids.length) return Promise.resolve();
      return Promise.all(ids.map(get)).then(function (R) { for (var i = 0; i < R.length; i++) { if (!R[i] || !R[i].length) { stop = true; break } eat(R[i]); if (stop) break } return batch(k + ids.length) })
    };
    get(null).then(function (a) { if (m !== M || !a || !a.length) return; eat(a); top = a[0].a; return batch(1) })
      .then(function () { if (m === M) { if (m.grpH) { flushOrder(m.grpH); m.grpH = null } var by = function (a, b) { return a.t - b.t }; m.big.sort(by); m.sw.sort(by); m.bfDone = true; DIRTY = true; renderSide(true); renderHead() } }).catch(function () { if (m === M) m.bfDone = true })
  }
  function loadOI() {
    var m = M; if (m.venue !== 'f') return;
    var per = { '1m': '5m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1d' }[m.tf];
    bn('f', '/futures/data/openInterestHist', 'symbol=' + m.pair + '&period=' + per + '&limit=500').then(function (a) { if (m !== M) return; m.oi = (a || []).map(function (x) { return { t: +x.timestamp, v: +x.sumOpenInterest } }); DIRTY = true }).catch(function () { });
    var poll = function () { bn('f', '/fapi/v1/openInterest', 'symbol=' + m.pair).then(function (x) { if (m !== M) return; m.oi.push({ t: +x.time || Date.now(), v: +x.openInterest }); if (m.oi.length > 3000) m.oi.shift(); DIRTY = true; renderHead() }).catch(function () { }) };
    poll(); m.oit = setInterval(poll, 20000)
  }

  /* ---------- WebSocket ---------- */
  /* Binance Futures (από 2026): οι συναλλαγές/ρευστοποιήσεις/mark price έρχονται από το /market και το βιβλίο από το /public.
     Τα παλιά /ws και /stream στέλνουν πλέον μόνο το βιβλίο, γι' αυτό ανοίγουμε δύο συνδέσεις (με εφεδρεία το παλιό URL). */
  var FWS = { mk: 'wss://fstream.binance.com/market/stream?streams=', pb: 'wss://fstream.binance.com/public/stream?streams=', old: 'wss://fstream.binance.com/stream?streams=' };
  function connect() {
    var m = M; if (m.dead) return; if (!m.liveFrom) m.liveFrom = Date.now(); var s = m.pair.toLowerCase(), groups;
    if (m.venue === 'f') {
      var mk = [s + '@aggTrade', s + '@forceOrder', s + '@markPrice@1s'], dp = [s + '@depth@100ms'];
      groups = [[FWS.mk, mk], [FWS.pb, dp]];
    } else { var hosts = WSH.s; groups = [[hosts[m.wsTry % hosts.length], [s + '@aggTrade', s + '@depth@100ms', s + '@ticker']]] }
    var open = 0, gone = false; m.wss = []; m.lastMsg = Date.now();
    var down = function () { if (m !== M || gone) return; gone = true; m.conn = false; m.book.ok = false; m.wss.forEach(function (w) { try { w.onclose = null; w.close() } catch (e) { } }); renderHead(); retry() };
    groups.forEach(function (gp) {
      var ws; try { ws = new WebSocket(gp[0] + gp[1].join('/')) } catch (e) { down(); return } m.wss.push(ws);
      ws.onopen = function () { if (m !== M) return ws.close(); open++; if (open === groups.length) { m.conn = true; m.status = ''; renderHead() } if (gp[1].some(function (x) { return x.indexOf('@depth') > 0 })) { m.book.ok = false; m.book.buf = []; m.book.sync = 0; resync() } };
      ws.onmessage = function (ev) { if (m !== M) return; var j; try { j = JSON.parse(ev.data) } catch (e) { return } var d = j.data || j; if (d.e === 'aggTrade') m.lastTrade = Date.now(); try { onMsg(d) } catch (e) { } };
      ws.onclose = down; ws.onerror = function () { try { ws.close() } catch (e) { } };
    });
    function retry() { if (m !== M || m.dead) return; m.wsTry++; m.rt = setTimeout(connect, Math.min(15000, 1000 * m.wsTry)) }
    clearInterval(m.hi); m.hi = setInterval(heatCap, m.heat.dt);
    // φύλακας: αν σε 90″ δεν ήρθε καμία συναλλαγή ενώ το βιβλίο κινείται, δοκίμασε την άλλη διαδρομή
    clearInterval(m.wd); m.wd = setInterval(function () { if (m !== M || m.dead) { clearInterval(m.wd); return } if (m.conn && m.book.ok && Date.now() - (m.lastTrade || m.liveFrom) > 90000 && Date.now() - m.liveFrom > 90000) { m.lastTrade = Date.now(); down() } }, 15000);
  }
  function onMsg(d) {
    var m = M;
    if (d.e === 'aggTrade') { addTrade(+d.p, +d.q, +d.T, !!d.m, false); return }
    if (d.e === 'depthUpdate') { onDepth(d); return }
    if (d.e === 'forceOrder') { var o = d.o; if (m.liq.length && +o.T < m.liq[m.liq.length - 1].t) m.liq._u = 1; m.liq.push({ t: +o.T, side: o.S === 'SELL' ? 'L' : 'S', p: +o.ap || +o.p, q: +o.z || +o.q, usd: (+o.ap || +o.p) * (+o.z || +o.q) }); if (m.liq.length > 800) m.liq.shift(); DIRTY = true; renderSide(); return }
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
  /* νέο αντίγραφο του βιβλίου. Όσο περιμένουμε (και στο όριο των 3″ μεταξύ αιτημάτων) οι ενημερώσεις ΚΡΑΤΙΟΥΝΤΑΙ στην άκρη και
     εφαρμόζονται πάνω στο αντίγραφο· αν το αίτημα αργήσει ή αποτύχει, ξαναδοκιμάζει μόνο του */
  function resync() {
    var m = M, b = m.book; b.ok = false;
    var later = function (ms) { if (b.rsT) return; b.rsT = setTimeout(function () { b.rsT = 0; if (m === M && !m.dead && !b.ok) resync() }, ms) };
    var wait = b.sync ? 3000 - (Date.now() - b.sync) : 0; if (wait > 0) { later(wait + 20); return }
    b.sync = Date.now();
    bn(m.venue, m.venue === 'f' ? '/fapi/v1/depth' : '/api/v3/depth', 'symbol=' + m.pair + '&limit=1000').then(function (d) { if (m === M) bookSnap(d) }).catch(function () { if (m === M) later(3000) })
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
      var prev = m.last; m.last = p; var bars = m.bars, L = bars[bars.length - 1], sq = side ? q : -q;
      if (!L || bt > L.t) { bars.push({ t: bt, o: p, h: p, l: p, c: p, v: q, bv: side ? q : 0, usd: p * q, n: 1, dl: sq, dmx: Math.max(0, sq), dmn: Math.min(0, sq) }); if (bars.length > 3000) bars.shift() }
      else if (bt === L.t) { L.h = Math.max(L.h, p); L.l = Math.min(L.l, p); L.c = p; L.v += q; if (side) L.bv += q; L.usd += p * q; L.n = (L.n || 0) + 1; L.dl = 2 * L.bv - L.v; L.dmx = Math.max(L.dmx == null ? L.dl : L.dmx, L.dl); L.dmn = Math.min(L.dmn == null ? L.dl : L.dmn, L.dl) }
      var sec = Math.floor(T / 1000), tp = m.tps[m.tps.length - 1]; if (tp && tp[0] === sec) tp[1]++; else { m.tps.push([sec, 1]); if (m.tps.length > 120) m.tps.shift() }
      if (isFinite(prev)) lineCross(prev, p);
      m.tape.push({ t: T, p: p, q: q, s: side }); if (m.tape.length > 4000) m.tape.splice(0, 1000);
      iceCheck(p, q, side, T);
    }
    // ομαδοποίηση σε εντολές αγοράς/πώλησης (ίδιο ms, ίδια πλευρά = μία εντολή που «σάρωσε» επίπεδα)
    var gk = hist ? 'grpH' : 'grp', g = m[gk];
    if (g && g.T === T && g.s === side) { g.q += q; g.usd += p * q; g.pmin = Math.min(g.pmin, p); g.pmax = Math.max(g.pmax, p); g.n++; g.pe = p }
    else { if (g) flushOrder(g); m[gk] = { T: T, s: side, q: q, usd: p * q, pmin: p, pmax: p, n: 1, ps: p, pe: p, live: !hist } }
    if (!hist) { clearTimeout(m.gt); m.gt = setTimeout(function () { if (m === M && m.grp) { flushOrder(m.grp); m.grp = null } }, 60) }
    DIRTY = true
  }
  function bigTh() { if (CFG.big > 0) return CFG.big; var g = M.t24 && +M.t24.quoteVolume ? +M.t24.quoteVolume / 60000 : 0; return Math.max(M.bigAuto || g || 0, 5000) }
  function flushOrder(g) {
    var m = M; m.sizes.push(g.usd); if (m.sizes.length > 4000) m.sizes.splice(0, 1000);
    if (m.sizes.length % 500 === 0 && m.sizes.length >= 1500) { var s = m.sizes.slice().sort(function (a, b) { return a - b }), nv = s[Math.floor(s.length * 0.995)]; m.bigAuto = m.bigAuto ? m.bigAuto * 0.8 + nv * 0.2 : nv }
    var th = bigTh(), o = { t: g.T, s: g.s, q: g.q, usd: g.usd, p: g.usd / g.q, pmin: g.pmin, pmax: g.pmax, n: g.n };
    if (g.usd >= th) { if (m.big.length && o.t < m.big[m.big.length - 1].t) m.big._u = 1; m.big.push(o); if (m.big.length > 60000) { m.big.sort(function (a, b) { return a.t - b.t }); m.big.splice(0, m.big.length - 50000) } var t1 = Math.floor(g.T / 6e4) * 6e4; m.bd1[t1] = (m.bd1[t1] || 0) + (g.s ? g.q : -g.q) }
    if (g.live && CFG.al.big && !CFG.al.off && g.usd >= th * (CFG.al.bigx || 3)) fire((g.s ? '🟢 ' : '🔴 ') + T('Μεγάλη ', 'Big ') + (g.s ? T('αγορά ', 'buy ') : T('πώληση ', 'sell ')) + usd(g.usd) + ' @ ' + (g.usd / g.q).toFixed(m.dec), 1)
    var lv = Math.round((g.pmax - g.pmin) / (m.tick || m.bucket)) + 1;
    if (lv >= 4 && g.usd >= th * 0.35) { o.lv = lv; if (m.sw.length && o.t < m.sw[m.sw.length - 1].t) m.sw._u = 1; m.sw.push(o); if (m.sw.length > 3000) { m.sw.sort(function (a, b) { return a.t - b.t }); m.sw.splice(0, m.sw.length - 2000) } }
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
    clearInterval(m.si); m.si = setInterval(function () { if (m !== M) { clearInterval(m.si); return } idbSave(); prune() }, 60000)
  }
  function idbSave() {
    var m = M; if (!m || !m.bucket) return; var o = {}, cut = Date.now() - 3 * 864e5, now = Math.floor(Date.now() / 6e4) * 6e4;
    for (var t in m.fp1) if (+t >= cut && +t < now) o[t] = m.fp1[t];
    idb().then(function (db) { var tx = db.transaction('fp', 'readwrite'); tx.objectStore('fp').put(o, m.venue + '|' + m.pair + '|' + m.bucket) }).catch(function () { })
  }
  /* η μνήμη δεν μεγαλώνει χωρίς όριο όσο μένει ανοιχτή η καρτέλα: κρατά 3 μέρες footprint (έως 7, όσο δείχνουν τα κεριά σε μεγάλο TF) */
  function prune() {
    var m = M; if (!m) return; var now = Date.now(), b0 = m.bars.length ? m.bars[0].t : now, cut = Math.max(now - 7 * 864e5, Math.min(now - 3 * 864e5, b0)), n = 0;
    for (var t in m.fp1) if (+t < cut) { delete m.fp1[t]; n++ }
    for (var t2 in m.bd1) if (+t2 < cut) delete m.bd1[t2];
    if (m.tf !== '1m') { var bc = barT(cut, m.tf); for (var t3 in m.fp) if (+t3 < bc) { delete m.fp[t3]; n++ } }
    if (n) { if (m.fpFrom < cut) m.fpFrom = cut; m.rc = {}; m.fpVer++; DIRTY = true }
  }
  function rebuildFp() { var m = M; if (m.tf === '1m') return; var ms = TF[m.tf]; m.fp = {}; for (var t in m.fp1) { var bt = barT(+t, m.tf), f = m.fp[bt] || (m.fp[bt] = { l: {} }), L = m.fp1[t].l; for (var k in L) { var c = f.l[k] || (f.l[k] = [0, 0]); c[0] += L[k][0]; c[1] += L[k][1] } } }
  function fpOf(t) { return M.tf === '1m' ? M.fp1[t] : M.fp[t] }

  /* =================================================================== ΓΡΑΦΗΜΑ */
  var V = { follow: false, bw: 12, off: 0, yAuto: true, y0: 0, y1: 1, mx: -1, my: -1, drag: null };
  var cv, cx, dom, dx, Lay = {};
  function layout() {
    var r = cv.getBoundingClientRect(), dpr = W.devicePixelRatio || 1, w = Math.max(300, r.width), h = Math.max(260, r.height);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr) }
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var subs = []; if (CFG.sub.delta) subs.push('delta'); if (CFG.sub.cvd) subs.push('cvd'); if (CFG.sub.oi && M && M.venue === 'f') subs.push('oi'); if (CFG.sub.spd) subs.push('spd'); if (CFG.sub.stat) subs.push('stat');
    var sh = h < 520 ? 48 : 64, ax = 74, tb = 22, hs = subs.map(function (k) { return k === 'stat' ? 84 : sh }), tot = hs.reduce(function (p, q) { return p + q }, 0), mainH = h - tb - tot, acc0 = mainH + tb;
    Lay = { w: w, h: h, L: 0, R: w - ax, T: 0, B: mainH, ax: ax, subs: subs.map(function (s, i) { var o = { k: s, T: acc0, B: acc0 + hs[i] - 2 }; acc0 += hs[i]; return o }), tb: mainH, pad: Math.min(140, (w - ax) * 0.16) };
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
  function rowsC(k, f, step) { var m = M; if (m.rcs !== step || m.rcv !== m.fpVer) { m.rc = {}; m.rcs = step; m.rcv = m.fpVer } var last = m.bars[m.bars.length - 1]; if (k === last) return fpRows(f, step); return m.rc[k.t] || (m.rc[k.t] = fpRows(f, step)) }
  function fpRows(f, step) { var o = {}, b = M.bucket; for (var k in f.l) { var p = +k * b, r = Math.floor(p / step + 1e-9), c = o[r] || (o[r] = [0, 0]); c[0] += f.l[k][0]; c[1] += f.l[k][1] } return o }

  function draw() {
    if (!M || !cv || !VIS) return; layout(); var g = cx, w = Lay.w, h = Lay.h;
    var fb = ROOT.querySelector('.ffs'); if (fb) { var tp = Math.max(40, Lay.tb - 44) + 'px'; if (fb.style.top !== tp) { fb.style.top = tp; fb.style.bottom = 'auto' } }
    g.fillStyle = C.bg; g.fillRect(0, 0, w, h); g.font = FONT; g.textBaseline = 'middle';
    var bars = M.bars, n = bars.length;
    if (!n) { g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText(M.err || M.status || LX('φόρτωση…'), w / 2, h / 2); return }
    var fb = ROOT && ROOT.querySelector('.ffol'); if (fb && (fb !== V.fsEl || V.fs !== V.follow)) { fb.classList.toggle('on', V.follow); V.fsEl = fb; V.fs = V.follow }
    /* ● Live: το τελευταίο κερί στο ~60% του πλάτους και η τρέχουσα τιμή στη μέση του ύψους, σε κάθε καρέ */
    if (V.follow) { V.off = Math.max(-60, -(Lay.R * 0.4 - Lay.pad - V.bw / 2) / V.bw); V.yAuto = true }
    var vr = visRange(), a = vr[0], b = vr[1];
    if (V.follow) { var flo = Infinity, fhi = -Infinity; for (var fi = a; fi <= b; fi++) { flo = Math.min(flo, bars[fi].l); fhi = Math.max(fhi, bars[fi].h) } var fc = M.last || bars[n - 1].c; if (!isFinite(flo)) { flo = bars[n - 1].l; fhi = bars[n - 1].h } var fh = Math.max(fhi - fc, fc - flo) * 1.1 || fc * 0.002; V.y0 = fc - fh; V.y1 = fc + fh }
    else if (V.yAuto) { var lo = Infinity, hi = -Infinity; for (var i = a; i <= b; i++) { lo = Math.min(lo, bars[i].l); hi = Math.max(hi, bars[i].h) } if (!isFinite(lo)) { lo = bars[n - 1].l; hi = bars[n - 1].h } var pd = (hi - lo) * 0.06 || hi * 0.002; V.y0 = lo - pd; V.y1 = hi + pd }
    var step = rowStep(), dec = Math.max(M.dec, pdec(step));
    // πλέγμα τιμών
    var gs = nice((V.y1 - V.y0) / Math.max(3, (Lay.B - Lay.T) / 60)), gdec = Math.max(pdec(gs), 0);
    g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath();
    for (var p = Math.ceil(V.y0 / gs) * gs; p <= V.y1; p += gs) { var y = Math.round(yOf(p)) + 0.5; g.moveTo(0, y); g.lineTo(Lay.R, y) }
    var tg = Math.max(1, Math.round(110 / V.bw)); for (i = a - a % tg; i <= b; i += tg) { var x = Math.round(xOf(i)) + 0.5; g.moveTo(x, 0); g.lineTo(x, Lay.B) }
    g.stroke();
    g.save(); g.beginPath(); g.rect(0, 0, Lay.R, Lay.B); g.clip();
    if (CFG.sh.heat) drawHeat(g);
    drawSMC(g, a, b);
    if (CFG.sh.vwap) drawVwap(g, a, b);
    drawBars(g, a, b, step, dec);
    if (CFG.sh.stk) drawStacked(g, a, b, step);
    if (CFG.sh.cs) drawCS(g, a, b, step);
    if (CFG.sh.vp) drawVP(g, a, b, step);
    drawBook(g, step);
    drawLevels(g);
    drawLines(g);
    if (CFG.sh.sig) drawSig(g, a, b, step);
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
    for (i = a - a % tg; i <= b; i += tg) { if (i < 0) continue; var t = bars[i].t, lb = TF[M.tf] >= 864e5 ? dm(t) + '/' + String(new Date(t).getFullYear()).slice(2) : (new Date(t).getHours() === 0 && new Date(t).getMinutes() === 0) || TF[M.tf] >= 36e5 ? dm(t) + ' ' + hm(t) : hm(t); g.fillText(lb, xOf(i), Lay.tb + 11) }
    Lay.subs.forEach(function (s) { drawSub(g, s, a, b) });
    drawCross(g, step, dec);
    if (PAUSE) { g.fillStyle = 'rgba(255,196,67,.9)'; g.textAlign = 'left'; g.fillText(LX('⏸ ΠΑΓΩΜΕΝΟ'), 10, 14) }
    if (M.bf && !M.bfDone) { g.fillStyle = C.mut; g.textAlign = 'left'; g.fillText(LX('φορτώνω footprint… ') + M.bf.n, 10, Lay.B - 10) }
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
    var R = rowsC(k, f, step), rows = Object.keys(R).map(Number).sort(function (p, q) { return p - q }), mx = 0, pocR = null, pocV = -1, tot = 0;
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
    if (CFG.sh.vpd) { var mdl = 0; pr.ks.forEach(function (r) { mdl = Math.max(mdl, Math.abs(pr.P[r][1] - pr.P[r][0])) }); pr.ks.forEach(function (r) { var dd = pr.P[r][1] - pr.P[r][0], ww = 46 * Math.abs(dd) / (mdl || 1), y = yOf((r + 1) * st); g.fillStyle = dd >= 0 ? 'rgba(34,194,127,.7)' : 'rgba(239,79,95,.7)'; g.fillRect(W0 + 6, y, ww, rh) }); g.fillStyle = C.mut; g.textAlign = 'left'; g.fillText('Δ', W0 + 8, 12) }
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
  /* ---------- Smart Money Concepts: FVG / iFVG, Order Blocks, BOS / CHoCH, ρευστότητα (PDH/PDL, PWH/PWL, EQH/EQL) ---------- */
  var SMC = { sig: '', r: null };
  function smcCalc() {
    var B = M.bars, N = B.length, sig = M.tf + '|' + N + '|' + (N ? B[0].t + '|' + B[N - 1].t + '|' + B[N - 1].c : ''); if (SMC.sig === sig) return SMC.r;
    var atr = [], a = 0; for (var i = 0; i < N; i++) { var tr = i ? Math.max(B[i].h - B[i].l, Math.abs(B[i].h - B[i - 1].c), Math.abs(B[i].l - B[i - 1].c)) : B[i].h - B[i].l; a = i < 14 ? (a * i + tr) / (i + 1) : a + (tr - a) / 14; atr.push(a) }
    // FVG: κενό ανάμεσα στο 1ο και το 3ο κερί· γεμίζει όταν η τιμή το ξαναδιασχίσει, «αντιστρέφεται» (iFVG) αν κλείσει κερί από την άλλη πλευρά
    var fvg = [];
    for (i = 2; i < N; i++) {
      if (B[i].l > B[i - 2].h && B[i].l - B[i - 2].h > 0.15 * atr[i]) fvg.push({ s: i - 1, top: B[i].l, bot: B[i - 2].h, up: 1 });
      if (B[i].h < B[i - 2].l && B[i - 2].l - B[i].h > 0.15 * atr[i]) fvg.push({ s: i - 1, top: B[i - 2].l, bot: B[i].h, up: 0 })
    }
    fvg.forEach(function (g) { g.e = N; for (var j = g.s + 2; j < N; j++) { if (g.inv == null && ((g.up && B[j].c < g.bot) || (!g.up && B[j].c > g.top))) { g.inv = j; g.e = j } if (g.inv != null) { if ((g.up && B[j].c > g.top) || (!g.up && B[j].c < g.bot)) { g.ie = j; break } } else if ((g.up && B[j].l <= g.bot) || (!g.up && B[j].h >= g.top)) { g.e = j; g.fill = 1; break } } if (g.inv != null && g.ie == null) g.ie = N });
    // swing highs / lows (fractal 3 κεριών) → δομή
    var K = 3, sh = [], sl = []; for (i = K; i < N - K; i++) { var hi = true, lo = true; for (var j = i - K; j <= i + K; j++) { if (j === i) continue; if (B[j].h >= B[i].h) hi = false; if (B[j].l <= B[i].l) lo = false } if (hi) sh.push(i); if (lo) sl.push(i) }
    var brk = [], ob = [], trend = 0, lh = null, ll = null, si = 0, li = 0;
    for (i = 0; i < N; i++) {
      while (si < sh.length && sh[si] + K <= i) { lh = { i: sh[si], p: B[sh[si]].h, used: 0 }; si++ }
      while (li < sl.length && sl[li] + K <= i) { ll = { i: sl[li], p: B[sl[li]].l, used: 0 }; li++ }
      if (lh && !lh.used && B[i].c > lh.p) { lh.used = 1; brk.push({ i0: lh.i, i: i, p: lh.p, up: 1, t: trend === 1 ? 'BOS' : 'CHoCH' }); trend = 1;
        for (var k = i - 1; k >= Math.max(0, (ll ? ll.i : i - 20) - 1); k--) if (B[k].c < B[k].o) { ob.push({ s: k, top: B[k].h, bot: B[k].l, up: 1 }); break } }
      if (ll && !ll.used && B[i].c < ll.p) { ll.used = 1; brk.push({ i0: ll.i, i: i, p: ll.p, up: 0, t: trend === -1 ? 'BOS' : 'CHoCH' }); trend = -1;
        for (k = i - 1; k >= Math.max(0, (lh ? lh.i : i - 20) - 1); k--) if (B[k].c > B[k].o) { ob.push({ s: k, top: B[k].h, bot: B[k].l, up: 0 }); break } }
    }
    ob.forEach(function (o) { o.e = N; for (var j = o.s + 1; j < N; j++) { if ((o.up && B[j].c < o.bot) || (!o.up && B[j].c > o.top)) { o.e = j; o.dead = 1; break } } });
    // ίσα υψηλά / χαμηλά (ρευστότητα που «περιμένει» να σαρωθεί)
    var eq = [], chk = function (L2, isH) { for (var x = 1; x < L2.length; x++) { var p1 = isH ? B[L2[x - 1]].h : B[L2[x - 1]].l, p2 = isH ? B[L2[x]].h : B[L2[x]].l; if (Math.abs(p1 - p2) <= 0.12 * atr[L2[x]]) { var lv = isH ? Math.max(p1, p2) : Math.min(p1, p2), e = N; for (var j = L2[x] + 1; j < N; j++) if ((isH && B[j].h > lv) || (!isH && B[j].l < lv)) { e = j; break } eq.push({ s: L2[x - 1], e: e, p: lv, h: isH, swept: e < N }) } } };
    chk(sh, 1); chk(sl, 0);
    // προηγούμενη μέρα / εβδομάδα
    var lv2 = [], day = 864e5, now = B.length ? B[N - 1].t : Date.now(), d0 = Math.floor(now / day) * day, wd = (new Date(d0).getUTCDay() + 6) % 7, w0 = d0 - wd * day;
    var rng = function (t0, t1) { var h = -Infinity, l = Infinity; B.forEach(function (b) { if (b.t >= t0 && b.t < t1) { h = Math.max(h, b.h); l = Math.min(l, b.l) } }); return isFinite(h) ? [h, l] : null };
    var pd = rng(d0 - day, d0), pw = (B[0] && B[0].t <= w0 - 6 * day) ? rng(w0 - 7 * day, w0) : null, cdo = B.find(function (b) { return b.t >= d0 });
    if (pd) lv2.push([pd[0], 'PDH', '#f0b429'], [pd[1], 'PDL', '#f0b429']); if (pw) lv2.push([pw[0], 'PWH', '#e07b39'], [pw[1], 'PWL', '#e07b39']); if (cdo) lv2.push([cdo.o, T('Άνοιγμα ημέρας', 'Day open'), '#9aa8b6']);
    SMC.sig = sig; SMC.r = { fvg: fvg, ob: ob, brk: brk, eq: eq, lv: lv2 }; return SMC.r
  }
  function drawSMC(g, a, b) {
    if (!(CFG.sh.fvg || CFG.sh.ob || CFG.sh.bos || CFG.sh.liqd) || M.bars.length < 10) return; var S = smcCalc(), xe = function (e) { return e >= M.bars.length ? Lay.R - Lay.pad : xOf(e) }, vis = function (s0, e) { return e >= a - 1 && s0 <= b + 1 };
    var box = function (s0, e, top, bot, fill, stroke, dash, lbl) { var x0 = xOf(s0) - V.bw / 2, x1 = xe(e), y0 = yOf(top), y1 = yOf(bot); if (x1 - x0 < 1) return; g.fillStyle = fill; g.fillRect(x0, y0, x1 - x0, Math.max(1, y1 - y0)); if (stroke) { g.strokeStyle = stroke; if (dash) g.setLineDash([4, 3]); g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, Math.max(1, y1 - y0)); g.setLineDash([]) } if (lbl && x1 - x0 > 30 && y1 - y0 > 9) { g.fillStyle = stroke || '#fff'; g.textAlign = 'left'; g.fillText(lbl, x0 + 3, y0 + Math.min(8, (y1 - y0) / 2)) } };
    if (CFG.sh.fvg) S.fvg.slice(-80).forEach(function (f) {
      if (vis(f.s, f.e)) box(f.s, f.e, f.top, f.bot, f.up ? 'rgba(38,166,154,.16)' : 'rgba(239,83,80,.16)', f.up ? 'rgba(38,166,154,.55)' : 'rgba(239,83,80,.55)', 0, 'FVG');
      if (f.inv != null && vis(f.inv, f.ie)) box(f.inv, f.ie, f.top, f.bot, 'rgba(255,196,67,.08)', 'rgba(255,196,67,.6)', 1, 'iFVG')
    });
    if (CFG.sh.ob) S.ob.slice(-40).forEach(function (o) { if (vis(o.s, o.e)) box(o.s, o.e, o.top, o.bot, o.up ? 'rgba(66,135,245,.18)' : 'rgba(199,125,255,.18)', o.up ? '#4287f5' : '#c77dff', o.dead, (o.up ? 'Bull OB' : 'Bear OB')) });
    if (CFG.sh.bos) S.brk.slice(-60).forEach(function (k) { if (!vis(k.i0, k.i)) return; var y = yOf(k.p), x0 = xOf(k.i0), x1 = xOf(k.i), col = k.up ? '#26a69a' : '#ef5350'; g.strokeStyle = col; g.lineWidth = k.t === 'CHoCH' ? 1.6 : 1; if (k.t === 'BOS') g.setLineDash([5, 3]); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]); g.lineWidth = 1; g.fillStyle = col; g.textAlign = 'center'; g.font = 'bold ' + FONT; g.fillText(k.t, (x0 + x1) / 2, k.up ? y - 7 : y + 8); g.font = FONT });
    if (CFG.sh.liqd) {
      S.eq.slice(-30).forEach(function (q) { if (!vis(q.s, q.e)) return; var y = yOf(q.p), x0 = xOf(q.s), x1 = xe(q.e); g.strokeStyle = q.swept ? 'rgba(154,168,182,.5)' : '#ffd166'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.textAlign = 'left'; g.fillText((q.h ? 'EQH' : 'EQL') + (q.swept ? ' ✓' : ' $$$'), x0 + 2, q.h ? y - 7 : y + 8) });
      S.lv.forEach(function (l) { var y = yOf(l[0]); if (y < 0 || y > Lay.B) return; g.strokeStyle = l[2]; g.setLineDash([10, 4]); g.beginPath(); g.moveTo(0, y); g.lineTo(Lay.R, y); g.stroke(); g.setLineDash([]); g.fillStyle = l[2]; g.textAlign = 'right'; g.font = 'bold ' + FONT; g.fillText(l[1], Lay.R - Lay.pad - 6, y - 7); g.font = FONT })
    }
  }
  /* Stacked imbalances: 3+ διαδοχικές ανισορροπίες στο ίδιο κερί → ζώνη που μένει ενεργή μέχρι να κλείσει κερί μέσα από αυτή */
  function drawStacked(g, a, b, step) {
    var bars = M.bars, Z = [], s0 = Math.max(0, a - 240);
    for (var i = s0; i <= b; i++) {
      var k = bars[i], f = fpOf(k.t); if (!f) continue; var R = rowsC(k, f, step), rows = Object.keys(R).map(Number).sort(function (p, q) { return p - q });
      [1, 0].forEach(function (sd) {
        var run = [], flush = function () { if (run.length >= 3) Z.push({ i: i, lo: run[0] * step, hi: (run[run.length - 1] + 1) * step, s: sd }); run = [] };
        rows.forEach(function (r) { var c = R[r], ok = sd ? (R[r - 1] && c[1] > 3 * R[r - 1][0] && c[1] > 0) : (R[r + 1] && c[0] > 3 * R[r + 1][1] && c[0] > 0); if (ok && (!run.length || run[run.length - 1] === r - 1)) run.push(r); else { flush(); if (ok) run.push(r) } }); flush()
      })
    }
    Z.slice(-60).forEach(function (z) {
      var e = b + 1; for (var j = z.i + 1; j < bars.length; j++) { if ((z.s && bars[j].c < z.lo) || (!z.s && bars[j].c > z.hi)) { e = j; break } }
      var x0 = xOf(z.i) - V.bw / 2, x1 = e > b ? Lay.R - Lay.pad : xOf(e), y0 = yOf(z.hi), y1 = yOf(z.lo); if (x1 < 0 || x0 > Lay.R) return;
      g.fillStyle = z.s ? 'rgba(34,194,127,.14)' : 'rgba(239,79,95,.14)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = z.s ? 'rgba(109,255,184,.7)' : 'rgba(255,143,155,.7)'; g.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0, y1 - y0);
      if (x1 - x0 > 26) { g.fillStyle = z.s ? '#6dffb8' : '#ff8f9b'; g.textAlign = 'left'; g.fillText('SI', x0 + 3, y0 + 7) }
    })
  }
  /* Cluster search: τα «κελιά» με τον μεγαλύτερο όγκο του ορατού εύρους (κορυφαίο 1% ή το όριο που βάζεις) */
  function drawCS(g, a, b, step) {
    var bars = M.bars, all = [], hits = [];
    for (var i = a; i <= b; i++) { var k = bars[i], f = fpOf(k.t); if (!f) continue; var R = rowsC(k, f, step); for (var r in R) { var v = R[r][0] + R[r][1]; all.push(v); hits.push([i, +r, v, R[r][1] - R[r][0]]) } }
    if (all.length < 30) return; var th = CFG.csMin > 0 ? CFG.csMin : all.slice().sort(function (p, q) { return p - q })[Math.floor(all.length * 0.99)], mx = Math.max.apply(null, all);
    hits.forEach(function (h) {
      if (h[2] < th) return; var x = xOf(h[0]), y = yOf((h[1] + 0.5) * step);
      if (V.bw >= 46) { var rh = Math.abs(yOf(0) - yOf(step)); g.strokeStyle = '#ffe14d'; g.lineWidth = 2; g.strokeRect(x - V.bw / 2 + 4, y - rh / 2 + 1, V.bw - 7, rh - 2); g.lineWidth = 1; return }
      var rr = 4 + 10 * Math.sqrt(h[2] / mx); g.beginPath(); g.arc(x, y, rr, 0, 7); g.fillStyle = h[3] >= 0 ? 'rgba(255,225,77,.28)' : 'rgba(255,150,60,.28)'; g.fill(); g.strokeStyle = '#ffe14d'; g.stroke()
    })
  }
  /* Σήματα: απορρόφηση (absorption) και απόκλιση delta (delta divergence) */
  function drawSig(g, a, b, step) {
    var bars = M.bars, mk = function (x, y, txt, col) { g.font = 'bold ' + FONT; var w = g.measureText(txt).width + 8; g.fillStyle = col; g.fillRect(x - w / 2, y - 8, w, 16); g.fillStyle = '#0a0e13'; g.textAlign = 'center'; g.fillText(txt, x, y); g.font = FONT };
    for (var i = Math.max(a, 5); i <= b; i++) {
      var k = bars[i], d = 2 * k.bv - k.v, hh = -Infinity, ll = Infinity, up = 0, dn = 0; for (var j = i - 5; j < i; j++) { hh = Math.max(hh, bars[j].h); ll = Math.min(ll, bars[j].l) }
      if (k.h > hh && d < 0) { mk(xOf(i), yOf(k.h) - 12, '÷', '#ff8f9b'); up++ }
      if (k.l < ll && d > 0) { mk(xOf(i), yOf(k.l) + 12, '÷', '#6dffb8'); dn++ }
      var f = fpOf(k.t); if (!f) continue; var R = rowsC(k, f, step), rows = Object.keys(R).map(Number).sort(function (p, q) { return p - q }); if (rows.length < 4) continue;
      var tot = 0; rows.forEach(function (r) { tot += R[r][0] + R[r][1] }); var avg = tot / rows.length, mid = (k.h + k.l) / 2;
      var sb2 = R[rows[0]][0] + R[rows[1]][0], ab2 = R[rows[rows.length - 1]][1] + R[rows[rows.length - 2]][1];
      if (sb2 > 2.5 * avg && k.c > mid) mk(xOf(i), yOf(k.l) + 12 + dn * 18, 'A', '#6dffb8');
      if (ab2 > 2.5 * avg && k.c < mid) mk(xOf(i), yOf(k.h) - 12 - up * 18, 'A', '#ff8f9b');
    }
  }
  /* οριζόντιες γραμμές με ειδοποίηση */
  function lk() { return M.venue + '|' + M.sym }
  function myLines() { return CFG.lines[lk()] || (CFG.lines[lk()] = []) }
  function alBtns() {
    var off = !!CFG.al.off, n = 0; for (var k in CFG.lines) n += (CFG.lines[k] || []).length;
    return '<span class="falb" style="display:inline-flex;gap:.3rem"><button class="fbtn' + (V.place ? ' on' : '') + '" id="fLine"' + (off ? ' disabled style="opacity:.45"' : '') + ' title="' + T('Πάτα και μετά κλικ στο διάγραμμα: οριζόντια γραμμή με ειδοποίηση (ήχος + μήνυμα) όταν την αγγίξει η τιμή. Ξαναπάτα ή Esc για ακύρωση.', 'Press, then click on the chart: horizontal line with an alert (sound + message) when price touches it. Press again or Esc to cancel.') + '">' + (V.place ? T('✕ Άκυρο γραμμής', '✕ Cancel line') : T('➖ Γραμμή 🔔', '➖ Line 🔔')) + '</button>' +
      '<button class="fbtn' + (off ? '' : ' on') + '" id="fAlOff" title="' + T('Ειδοποιήσεις ανοιχτές/κλειστές: όταν είναι κλειστές δεν ακούγεται τίποτα και κρύβονται οι γραμμές (δεν σβήνονται)', 'Alerts on/off: when off, nothing sounds and the lines are hidden (not deleted)') + '">' + (off ? T('🔕 Ειδοπ. κλειστές', '🔕 Alerts off') : T('🔔 Ειδοπ. ανοιχτές', '🔔 Alerts on')) + (n ? ' · ' + n : '') + '</button></span>'
  }
  function alRefresh() { var w = D.getElementById('fLine'); if (w) { var sp = w.parentNode, tmp = D.createElement('span'); tmp.innerHTML = alBtns(); sp.parentNode.replaceChild(tmp.firstChild, sp) } var cv = D.getElementById('fCv'); if (cv) cv.style.cursor = V.place ? 'copy' : 'crosshair'; DIRTY = true }
  var LHIT = [];
  function lineAt(x, y) { for (var i = LHIT.length - 1; i >= 0; i--) { var h = LHIT[i]; if (Math.abs(y - h.y) <= 9 && x >= h.x0 && x <= h.x1) return { id: h.id, del: true }; if (Math.abs(y - h.y) <= 5 && x < Lay.R) return { id: h.id } } return null }
  function drawLines(g) {
    LHIT = []; if (CFG.al.off) return;
    myLines().forEach(function (l) { var y = yOf(l.p); if (y < 0 || y > Lay.B) return; var col = l.al === 1 ? '#ffd166' : l.al === 2 ? '#8ff0c0' : '#9aa8b6'; g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash([8, 4]); g.beginPath(); g.moveTo(0, y); g.lineTo(Lay.R, y); g.stroke(); g.setLineDash([]); g.lineWidth = 1; g.font = 'bold ' + FONT; var txt = (l.al === 1 ? '🔔 ' : l.al === 2 ? '✔ ' : '') + l.p.toFixed(M.dec), w = g.measureText(txt).width + 10; g.fillStyle = col; g.fillRect(Lay.R - w - 2, y - 8, w, 16); g.fillStyle = '#0a0e13'; g.textAlign = 'left'; g.fillText(txt, Lay.R - w + 3, y); var xx = Lay.R - w - 22; g.fillStyle = V.lhov === l.id ? '#ff5d6c' : 'rgba(255,93,108,.75)'; g.fillRect(xx, y - 8, 18, 16); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText('✕', xx + 9, y); g.textAlign = 'left'; g.font = FONT; LHIT.push({ id: l.id, y: y, x0: xx - 2, x1: xx + 20 }) })
  }
  function addLine(p) { var st = M.tick || M.bucket, v = Math.round(p / st) * st; myLines().push({ id: Date.now().toString(36), p: +v.toFixed(8), al: 1 }); saveCfg(); alRefresh(); askNotif(); DIRTY = true; SIDE = 'al'; ROOT.querySelectorAll('[data-fside]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-fside') === 'al') }); renderSide(true) }
  function lineCross(a, b) { var L2 = CFG.lines[lk()]; if (!L2 || CFG.al.off) return; L2.forEach(function (l) { if (l.al === 1 && ((a < l.p && b >= l.p) || (a > l.p && b <= l.p))) { l.al = 2; saveCfg(); fire('🔔 ' + M.sym + ' ' + T('άγγιξε', 'hit') + ' ' + l.p.toFixed(M.dec)) } }) }
  var AC = null;
  function beep(n) { try { AC = AC || new (W.AudioContext || W.webkitAudioContext)(); var t0 = AC.currentTime; for (var i = 0; i < (n || 2); i++) { var o = AC.createOscillator(), gn = AC.createGain(); o.frequency.value = 880 + i * 220; gn.gain.setValueAtTime(0.0001, t0 + i * 0.18); gn.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.18 + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.15); o.connect(gn); gn.connect(AC.destination); o.start(t0 + i * 0.18); o.stop(t0 + i * 0.18 + 0.16) } } catch (e) { } }
  function askNotif() { try { if (W.Notification && Notification.permission === 'default') Notification.requestPermission() } catch (e) { } }
  function fire(msg, soft) {
    M.alerts.push({ t: Date.now(), msg: msg }); if (M.alerts.length > 100) M.alerts.shift(); beep(soft ? 1 : 3);
    try { if (!soft && W.Notification && Notification.permission === 'granted' && D.hidden) new Notification('Order Flow', { body: msg }) } catch (e) { }
    var h = D.getElementById('fHead'); if (h) { h.classList.remove('fflash'); void h.offsetWidth; h.classList.add('fflash') }
    var tt = D.getElementById('fToast'); if (tt) { tt.textContent = msg; tt.hidden = false; clearTimeout(tt._t); tt._t = setTimeout(function () { tt.hidden = true }, 6000) }
    if (SIDE === 'al') renderSide(true)
  }
  function inView(t) { var x = xOfT(t); return x > -20 && x < Lay.R + 20 }
  /* μόνο ό,τι φαίνεται: οι λίστες είναι ταξινομημένες κατά ώρα, βρίσκουμε με δυαδική αναζήτηση την αρχή και σταματάμε στο τέλος της οθόνης */
  function tSpan() { var b = M.bars, ms = TF[M.tf]; if (!b.length) return [0, -1]; return [b[0].t + (iOfX(-60) - 1) * ms, b[0].t + (iOfX(Lay.R + 60) + 2) * ms] }
  function lbT(A, t) { var lo = 0, hi = A.length; while (lo < hi) { var mid = (lo + hi) >> 1; if (A[mid].t < t) lo = mid + 1; else hi = mid } return lo }
  function eachVis(A, fn) { if (!A.length) return; if (A._u || A[A.length - 1].t < (A._lt || 0)) { A.sort(function (a, b) { return a.t - b.t }); A._u = 0 } A._lt = A[A.length - 1].t; var r = tSpan(); for (var i = lbT(A, r[0]); i < A.length && A[i].t <= r[1]; i++) { if (inView(A[i].t)) fn(A[i]) } }
  function drawBig(g) {
    var th = bigTh(); eachVis(M.big, function (o) {
      if (o.usd < th) return; var x = xOfT(o.t), y = yOf(o.p), r = clamp(5 * Math.sqrt(o.usd / th), 4, 34);
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = o.s ? 'rgba(34,194,127,.42)' : 'rgba(239,79,95,.42)'; g.fill(); g.strokeStyle = o.s ? '#6dffb8' : '#ff8f9b'; g.stroke();
      if (r >= 13) { g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(usd(o.usd), x, y) }
    })
  }
  function drawSweeps(g) { eachVis(M.sw, function (o) { var x = xOfT(o.t), ya = yOf(o.s ? o.pmin : o.pmax), yb = yOf(o.s ? o.pmax : o.pmin); g.strokeStyle = C.sw; g.lineWidth = 2; g.beginPath(); g.moveTo(x, ya); g.lineTo(x, yb); g.stroke(); g.beginPath(); var d = o.s ? -1 : 1; g.moveTo(x - 5, yb - d * 7); g.lineTo(x, yb); g.lineTo(x + 5, yb - d * 7); g.stroke(); g.lineWidth = 1 }) }
  function drawIce(g) { M.ice.forEach(function (o) { if (!inView(o.t)) return; var x = xOfT(o.t), y = yOf(o.p); g.strokeStyle = C.ice; g.lineWidth = 1.5; g.strokeRect(x - 5, y - 5, 10, 10); g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.stroke(); g.lineWidth = 1 }) }
  function drawLiq(g) {
    eachVis(M.liq, function (o) {
      var x = xOfT(o.t), y = yOf(o.p), r = clamp(4 * Math.sqrt(o.usd / 20000), 4, 22);
      g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fillStyle = o.side === 'L' ? 'rgba(255,176,32,.75)' : 'rgba(94,240,255,.6)'; g.fill(); g.strokeStyle = '#000'; g.stroke();
      if (r >= 12) { g.fillStyle = '#000'; g.textAlign = 'center'; g.fillText(fv(o.usd), x, y) }
    })
  }
  function drawSub(g, s, a, b) {
    var bars = M.bars, T0 = s.T, B = s.B, H = B - T0; g.fillStyle = '#0c1218'; g.fillRect(0, T0 - 2, Lay.w, H + 4); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(0, T0 - 2.5); g.lineTo(Lay.w, T0 - 2.5); g.stroke();
    g.save(); g.beginPath(); g.rect(0, T0, Lay.R, H); g.clip();
    var lbl = '', lastV = NaN;
    if (s.k === 'delta') {
      var mx = 0; for (var i = a; i <= b; i++) mx = Math.max(mx, Math.abs(2 * bars[i].bv - bars[i].v)); var y0 = T0 + H / 2;
      for (i = a; i <= b; i++) { var d = 2 * bars[i].bv - bars[i].v, hh = d / (mx || 1) * (H / 2 - 2), bw = Math.max(1, V.bw * 0.66); g.fillStyle = d >= 0 ? C.up : C.dn; g.fillRect(xOf(i) - bw / 2, d >= 0 ? y0 - hh : y0, bw, Math.max(1, Math.abs(hh))); if (V.bw >= 46) { g.fillStyle = '#c9d6e2'; g.textAlign = 'center'; g.fillText(fv(d), xOf(i), d >= 0 ? y0 + 8 : y0 - 8) } }
      lbl = 'Delta'; lastV = 2 * bars[b].bv - bars[b].v
    } else if (s.k === 'cvd') {
      var cv2 = [], acc = 0, lo = Infinity, hi = -Infinity; for (i = 0; i <= b; i++) { acc += 2 * bars[i].bv - bars[i].v; if (i >= a) { cv2.push([i, acc]); lo = Math.min(lo, acc); hi = Math.max(hi, acc) } }
      var yv = function (v) { return B - 3 - (v - lo) / ((hi - lo) || 1) * (H - 6) }; g.strokeStyle = '#ffc443'; g.lineWidth = 1.5; g.beginPath(); cv2.forEach(function (p, j) { var x = xOf(p[0]), y = yv(p[1]); if (j) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); g.lineWidth = 1; lbl = 'CVD'; lastV = acc;
      // CVD μόνο των μεγάλων εντολών (≥ όριο Big trade): τι κάνουν τα «φάλαινες»
      var ms = TF[M.tf], bacc = 0, bl = Infinity, bh = -Infinity, bp = [], any = false; for (i = 0; i <= b; i++) { var tt0 = bars[i].t; if (tt0 + ms < M.fpFrom) continue; for (var tm = tt0; tm < tt0 + ms; tm += 6e4) { var bd = M.bd1[tm]; if (bd) { bacc += bd; any = true } } if (i >= a) { bp.push([i, bacc]); bl = Math.min(bl, bacc); bh = Math.max(bh, bacc) } }
      if (any && bp.length > 1) { g.strokeStyle = '#5ef0ff'; g.lineWidth = 1.3; g.beginPath(); bp.forEach(function (p, j) { var x = xOf(p[0]), y = B - 3 - (p[1] - bl) / ((bh - bl) || 1) * (H - 6); if (j) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); g.lineWidth = 1; g.fillStyle = '#5ef0ff'; g.textAlign = 'left'; g.fillText(T('μεγάλες εντολές ', 'big orders ') + (bacc > 0 ? '+' : '') + fv(bacc), 6, T0 + 22) }
    } else if (s.k === 'oi') {
      var t0 = bars[a].t, t1 = bars[b].t + TF[M.tf], pts = M.oi.filter(function (o) { return o.t >= t0 - 6e5 && o.t <= t1 }); if (pts.length > 1) { var l2 = Infinity, h2 = -Infinity; pts.forEach(function (o) { l2 = Math.min(l2, o.v); h2 = Math.max(h2, o.v) }); g.strokeStyle = '#5cb3ff'; g.lineWidth = 1.5; g.beginPath(); pts.forEach(function (o, j) { var x = xOfT(o.t), y = B - 3 - (o.v - l2) / ((h2 - l2) || 1) * (H - 6); if (j) g.lineTo(x, y); else g.moveTo(x, y) }); g.stroke(); g.lineWidth = 1; lastV = pts[pts.length - 1].v } lbl = 'Open Interest'
    } else if (s.k === 'spd') {
      var mn = 0; for (i = a; i <= b; i++) mn = Math.max(mn, bars[i].n || 0);
      for (i = a; i <= b; i++) { var nn = bars[i].n || 0, av = 0, c3 = 0; for (var j = Math.max(0, i - 20); j < i; j++) { av += bars[j].n || 0; c3++ } av = c3 ? av / c3 : nn; var hh2 = nn / (mn || 1) * (H - 4), bw3 = Math.max(1, V.bw * 0.66); g.fillStyle = nn > 2 * av ? '#ff9f43' : '#3d6a8f'; g.fillRect(xOf(i) - bw3 / 2, B - hh2, bw3, hh2) }
      lbl = T('Ταχύτητα (συναλλαγές/κερί · πορτοκαλί = 2× του μέσου)', 'Tape speed (trades/bar · orange = 2× average)'); lastV = bars[b].n
    } else if (s.k === 'stat') {
      var rowsN = [T('Όγκος', 'Volume'), 'Delta', 'Delta %', T('Συναλλαγές', 'Trades'), 'Max Δ', 'Min Δ'], rhh = (H - 2) / 6, mxs = [0, 0, 0, 0, 0, 0];
      var val = function (k, r) { var d = 2 * k.bv - k.v; return r === 0 ? k.v : r === 1 ? d : r === 2 ? (k.v ? d / k.v * 100 : 0) : r === 3 ? k.n : r === 4 ? k.dmx : k.dmn };
      for (i = a; i <= b; i++) for (var r = 0; r < 6; r++) { var vv = val(bars[i], r); if (vv != null && isFinite(vv)) mxs[r] = Math.max(mxs[r], Math.abs(vv)) }
      for (i = a; i <= b; i++) { var xx = xOf(i), bw4 = Math.max(1, V.bw - 1);
        for (r = 0; r < 6; r++) { var v4 = val(bars[i], r), yy = T0 + 1 + r * rhh; if (v4 == null || !isFinite(v4)) continue; var al4 = (0.12 + 0.6 * Math.abs(v4) / (mxs[r] || 1)).toFixed(3);
          g.fillStyle = (r === 0 || r === 3) ? 'rgba(92,179,255,' + al4 + ')' : (v4 >= 0 ? 'rgba(34,194,127,' : 'rgba(239,79,95,') + al4 + ')'; g.fillRect(xx - bw4 / 2, yy, bw4, rhh - 1);
          if (V.bw >= 40) { g.fillStyle = '#e9eef3'; g.textAlign = 'center'; g.fillText(r === 2 ? v4.toFixed(0) + '%' : fv(v4), xx, yy + rhh / 2) } } }
      lbl = ''
    }
    g.restore(); g.fillStyle = C.mut; g.textAlign = 'left'; if (lbl) g.fillText(lbl + (isFinite(lastV) ? '  ' + (lastV > 0 && s.k !== 'oi' && s.k !== 'spd' ? '+' : '') + fv(lastV) : ''), 6, T0 + 9);
    g.fillStyle = C.panel; g.fillRect(Lay.R, T0 - 2, Lay.ax, H + 4);
    if (s.k === 'stat') { var rl = [T('Όγκος', 'Volume'), 'Delta', 'Delta %', T('Συναλλ.', 'Trades'), 'Max Δ', 'Min Δ'], rh5 = (H - 2) / 6; g.fillStyle = C.axis; g.textAlign = 'left'; rl.forEach(function (t5, r5) { g.fillText(t5, Lay.R + 5, T0 + 1 + r5 * rh5 + rh5 / 2) }) }
  }
  /* 🔎 ποια φούσκα / ρευστοποίηση / sweep / iceberg είναι κάτω από το ποντίκι (μόνο όσα φαίνονται, με δυαδική αναζήτηση) */
  function hitObj(x, y) {
    var best = null, cand = function (k, o, d, r) { var sc = d / Math.max(r, 1); if (d <= r && (!best || sc < best.sc)) best = { k: k, o: o, sc: sc, r: r } };
    if (CFG.sh.big) { var th = bigTh(); eachVis(M.big, function (o) { if (o.usd < th) return; var r = clamp(5 * Math.sqrt(o.usd / th), 4, 34); cand('big', o, Math.hypot(xOfT(o.t) - x, yOf(o.p) - y), r + 4) }) }
    if (CFG.sh.liq && M.venue === 'f') eachVis(M.liq, function (o) { var r = clamp(4 * Math.sqrt(o.usd / 20000), 4, 22); cand('liq', o, Math.hypot(xOfT(o.t) - x, yOf(o.p) - y), r + 4) });
    if (CFG.sh.ice) M.ice.forEach(function (o) { if (inView(o.t)) cand('ice', o, Math.hypot(xOfT(o.t) - x, yOf(o.p) - y), 9) });
    if (CFG.sh.sw) eachVis(M.sw, function (o) { var xs = xOfT(o.t), y1 = yOf(o.pmax), y2 = yOf(o.pmin); if (Math.abs(xs - x) <= 7 && y >= y1 - 7 && y <= y2 + 7) cand('sw', o, Math.abs(xs - x), 8) });
    return best
  }
  function barOfT(t) { var b = M.bars, lo = 0, hi = b.length - 1, ms = TF[M.tf]; while (lo <= hi) { var mid = (lo + hi) >> 1; if (b[mid].t + ms <= t) lo = mid + 1; else if (b[mid].t > t) hi = mid - 1; else return b[mid] } return null }
  function hitLines(h, dec) {
    var o = h.o, L = [], cn = M.sym, ex = function (v) { return '$' + Math.round(v).toLocaleString('el-GR') }, when = dm(o.t) + ' ' + hm(o.t, 1);
    if (h.k === 'big') {
      L.push((o.s ? '🟢 ' + T('Επιθετική ΑΓΟΡΑ', 'Aggressive BUY') : '🔴 ' + T('Επιθετική ΠΩΛΗΣΗ', 'Aggressive SELL')) + '  ' + ex(o.usd));
      L.push(T('Ποσότητα ', 'Size ') + fv(o.q) + ' ' + cn + ' · ' + T('μέση τιμή ', 'avg ') + o.p.toFixed(dec));
      if (o.pmax > o.pmin) L.push(T('Έφαγε από ', 'Swept ') + o.pmin.toFixed(dec) + ' ' + T('ως', 'to') + ' ' + o.pmax.toFixed(dec));
      L.push(T('Ώρα ', 'Time ') + when + (o.n > 1 ? ' · ' + o.n + T(' γεμίσματα μαζί', ' fills together') : ''));
      var k = barOfT(o.t); if (k && k.v > 0) L.push(T('= ', '= ') + Math.round(o.q / k.v * 100) + T('% του όγκου του κεριού', '% of the candle volume'));
      L.push((o.usd / bigTh()).toFixed(1) + '× ' + T('το όριο Big', 'the Big threshold') + ' · ' + (o.h ? T('από το ιστορικό', 'from history') : T('ζωντανά', 'live')));
    } else if (h.k === 'liq') {
      L.push('💥 ' + T('Ρευστοποίηση ', 'Liquidation ') + (o.side === 'L' ? 'LONG' : 'SHORT') + '  ' + ex(o.usd));
      L.push(fv(o.q) + ' ' + cn + ' @ ' + o.p.toFixed(dec) + ' · ' + when);
    } else if (h.k === 'ice') {
      L.push('🧊 Iceberg: ' + T('κρυφή εντολή ', 'hidden ') + (o.s ? T('ΠΩΛΗΣΗΣ', 'SELL') : T('ΑΓΟΡΑΣ', 'BUY')) + ' @ ' + o.p.toFixed(dec));
      L.push(T('Εκτελέστηκαν ', 'Filled ') + fv(o.q) + ' (' + ex(o.usd) + ')' + T(' ενώ φαίνονταν ', ' while showing ') + fv(o.shown));
      L.push(T('Ώρα ', 'Time ') + when);
    } else if (h.k === 'sw') {
      L.push('⚡ Sweep ' + (o.s ? T('προς τα πάνω', 'up') : T('προς τα κάτω', 'down')) + '  ' + ex(o.usd));
      L.push((o.lv || '') + T(' επίπεδα σε ένα χτύπημα: ', ' levels in one hit: ') + o.pmin.toFixed(dec) + '–' + o.pmax.toFixed(dec));
      L.push(T('Ώρα ', 'Time ') + when);
    }
    return L
  }
  function drawCross(g, step, dec) {
    if (V.mx < 0 || V.my < 0 || V.mx > Lay.R || V.my > Lay.B) return; var x = V.mx, y = V.my;
    g.strokeStyle = 'rgba(214,226,238,.35)'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, Lay.h); g.moveTo(0, y + 0.5); g.lineTo(Lay.R, y + 0.5); g.stroke(); g.setLineDash([]);
    var p = pOfY(y); tag(g, Lay.R, y, p.toFixed(dec), '#d6e2ee', '#0a0e13');
    var i = Math.round(iOfX(x)), k = M.bars[i]; if (!k) return;
    var d = 2 * k.bv - k.v, lines = [dm(k.t) + ' ' + hm(k.t) + ' · ' + M.tf, 'O ' + k.o.toFixed(M.dec) + '  H ' + k.h.toFixed(M.dec), 'L ' + k.l.toFixed(M.dec) + '  C ' + k.c.toFixed(M.dec), LX('Όγκος ') + fv(k.v) + ' (' + usd(k.usd || k.v * k.c) + ')', 'Delta ' + (d > 0 ? '+' : '') + fv(d)];
    var f = fpOf(k.t); if (f) { var R = fpRows(f, step), r = Math.floor(p / step + 1e-9), c = R[r]; if (c) lines.push(LX('Στο ') + (r * step).toFixed(dec) + ': ' + fv(c[0]) + ' × ' + fv(c[1])) }
    /* πάνω σε φούσκα: πρώτα τα στοιχεία της (ποσό, ποσότητα, τιμή…), μετά του κεριού· και λευκό περίγραμμα για να φαίνεται ποια διαβάζεις */
    var hh = hitObj(x, y), hl = 0; if (hh) { var HL = hitLines(hh, Math.max(dec, M.dec)); hl = HL.length; lines = HL.concat(['']).concat(lines);
      var ho = hh.o; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); if (hh.k === 'sw') { g.moveTo(xOfT(ho.t), yOf(ho.pmax) - 4); g.lineTo(xOfT(ho.t), yOf(ho.pmin) + 4) } else g.arc(xOfT(ho.t), yOf(ho.p), hh.r - 2, 0, 7); g.stroke(); g.lineWidth = 1 }
    var tw = 0; lines.forEach(function (l) { tw = Math.max(tw, g.measureText(l).width) }); var bx = x + 14 + tw + 16 > Lay.R ? x - tw - 30 : x + 14, by = Math.min(y + 14, Lay.B - lines.length * 15 - 10);
    g.fillStyle = 'rgba(14,20,27,.94)'; g.strokeStyle = '#2a3a4a'; g.fillRect(bx, by, tw + 16, lines.length * 15 + 8); g.strokeRect(bx + 0.5, by + 0.5, tw + 15, lines.length * 15 + 7);
    g.textAlign = 'left'; lines.forEach(function (l, j) { g.fillStyle = j === 0 && hl ? (hh.k === 'big' ? (hh.o.s ? '#6dffb8' : '#ff8f9b') : '#ffd27a') : j < hl ? '#e8eef5' : C.txt; if (j === 0 && hl) g.font = 'bold ' + g.font.replace(/^bold /, ''); g.fillText(l, bx + 8, by + 11 + j * 15); if (j === 0 && hl) g.font = g.font.replace(/^bold /, '') })
  }

  /* ---------- DOM (σκάλα τιμών) ---------- */
  function drawDom() {
    if (!dom || !M || !VIS) return; var r = dom.getBoundingClientRect(), dpr = W.devicePixelRatio || 1, w = r.width, h = r.height; if (w < 10) return;
    if (dom.width !== Math.round(w * dpr) || dom.height !== Math.round(h * dpr)) { dom.width = Math.round(w * dpr); dom.height = Math.round(h * dpr) } dx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = dx; g.fillStyle = C.bg; g.fillRect(0, 0, w, h); g.font = FONT; g.textBaseline = 'middle';
    if (!M.book.ok || !M.bucket) { g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText(LX('σύνδεση στο βιβλίο…'), w / 2, h / 2); return }
    var ba = bestBA(), mid = (ba[0] + ba[1]) / 2, rh = 17, n = Math.floor((h - 20) / rh), step = M.bucket * (CFG.mult === 'auto' ? domMult() : CFG.mult), dec = Math.max(M.dec, pdec(step));
    var cR = Math.floor(mid / step), R = {}, add = function (s) { return function (q, p) { var rr = Math.floor(p / step + 1e-9); if (Math.abs(rr - cR) > n) return; var c = R[rr] || (R[rr] = [0, 0]); c[s] += q } };
    M.book.b.forEach(add(0)); M.book.a.forEach(add(1));
    var VOL = {}, now = M.bars[M.bars.length - 1], f = now && fpOf(now.t); if (f) VOL = fpRows(f, step);
    var mx = 0, mv = 0; for (var k in R) mx = Math.max(mx, R[k][0], R[k][1]); for (k in VOL) mv = Math.max(mv, VOL[k][0] + VOL[k][1]);
    var c1 = w * 0.36, c2 = w * 0.64; g.fillStyle = C.mut; g.textAlign = 'center'; g.fillText('Bid', c1 / 2, 9); g.fillText(LX('Τιμή'), (c1 + c2) / 2, 9); g.fillText('Ask', (c2 + w) / 2, 9);
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
    '#flowRoot .fzm{position:absolute;right:82px;top:8px;display:flex;gap:.25rem;z-index:2}#flowRoot .fzm .ffol{width:auto!important;padding:0 .5rem;font-size:.74rem;color:#8fa1b3}#flowRoot .fzm .ffol.on{background:rgba(34,194,127,.22);border-color:#22c27f;color:#6dffb8}#flowRoot .fzm button{width:1.9rem;height:1.7rem;border-radius:7px;border:1px solid var(--fln);background:rgba(14,20,27,.85);color:var(--ftx);font-weight:800;cursor:pointer}' +
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
    '#flowRoot .fcnt{font-weight:800;opacity:.75;margin-left:.15rem}#flowRoot .ftg.na{opacity:.45!important;text-decoration:line-through}#flowRoot .ftoast{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:5;background:#ffd166;color:#111;font-weight:800;padding:.4rem .8rem;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.5)}#flowRoot .fw{position:relative}#flowRoot .fflash{animation:fflash 1.2s ease 2}@keyframes fflash{0%,100%{background:transparent}50%{background:rgba(255,209,102,.25)}}' +
    '#flowRoot .fal{display:grid!important;grid-template-columns:1.6em 1fr auto auto!important;align-items:center;cursor:default!important}#flowRoot .fal .fbtn{padding:.1rem .45rem;font-size:.72rem}#flowRoot .fchk{display:block;padding:.5rem .6rem;font-size:.76rem;color:var(--fmu);border-bottom:1px solid var(--fln)}#flowRoot .fchk select{padding:.1rem .3rem}' +
    '#flowRoot .fhelp{position:absolute;inset:0;z-index:20;background:rgba(5,8,11,.82);display:flex;align-items:flex-start;justify-content:center;padding:1rem;overflow:auto}#flowRoot .fhb{background:#0e141b;border:1px solid #2a3a4a;border-radius:14px;max-width:980px;width:100%;padding:.8rem 1rem}#flowRoot .fhh{display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;font-size:1.05rem}#flowRoot .fhg{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.6rem}#flowRoot .fhg>div{background:#0a1016;border:1px solid #1d2935;border-radius:10px;padding:.5rem .65rem}#flowRoot .fhg b{color:#fff}#flowRoot .fhg p{margin:.25rem 0 0;font-size:.8rem;line-height:1.45;color:#a9b8c6}' +
    '@media (max-width:900px){#flowRoot .fw.ffull .fmain{height:75vh;flex:none}#flowRoot .fgrid{grid-template-columns:1fr}#flowRoot .fmain{height:68vh;border-right:0;border-bottom:1px solid var(--fln)}#flowRoot .fside{height:auto}#flowRoot .fdom{height:360px;flex:none}#flowRoot .flist{max-height:320px}#flowRoot .fzm{right:80px}}';

  var SIDE = 'tape';
  function shell() {
    if (!D.getElementById('flowCss')) { var st = D.createElement('style'); st.id = 'flowCss'; st.textContent = CSS; D.head.appendChild(st) }
    var seg = function (name, opts, cur) { return '<span class="fseg" data-fseg="' + name + '">' + opts.map(function (o) { return '<button data-v="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' class="on"' : '') + ' title="' + esc(o[2] || '') + '">' + esc(o[1]) + '</button>' }).join('') + '</span>' };
    var tg = function (k, l, t) { return '<button class="ftg' + (CFG.sh[k] ? ' on' : '') + '" data-fsh="' + k + '" data-tip="' + esc(t) + '" title="' + esc(t) + '">' + esc(l) + '<b class="fcnt" data-fc="' + k + '"></b></button>' };
    var sb = function (k, l) { return '<button class="ftg' + (CFG.sub[k] ? ' on' : '') + '" data-fsub="' + k + '">' + esc(l) + '</button>' };
    ROOT.innerHTML = '<div class="fw">' +
      '<div class="fbar">' + seg('view', [['chart', '📊 Order Flow'], ['opt', '🧬 Options X-Ray']], CFG.view) + ' ' + seg('lang', [['el', '🇬🇷 EL'], ['en', '🇬🇧 EN']], CFG.lang) + ' <button class="fbtn" data-fhelp>' + T('❓ Οδηγός', '❓ Guide') + '</button>' +
      LX('<span style="flex:1"></span><span style="font-size:.74rem;color:var(--fmu)">Δωρεάν δημόσια δεδομένα Binance · Deribit · τίποτα δεν εκτελεί εντολές</span></div>') +
      '<div data-fv="chart"' + (CFG.view === 'chart' ? '' : ' hidden') + '>' +
      '<div class="fbar"><input list="flowCoins" id="fSym" value="' + esc(CFG.sym) + LX('" size="6" title="Νόμισμα"><datalist id="flowCoins">') + COINS.map(function (c) { return '<option value="' + c + '">' }).join('') + '</datalist>' +
      seg('venue', [['f', 'Futures', LX('Binance USDⓈ-M perpetual (περισσότερος όγκος, ρευστοποιήσεις, OI)')], ['s', 'Spot', 'Binance Spot']], CFG.venue) +
      seg('tf', [['1m', '1m'], ['5m', '5m'], ['15m', '15m'], ['1h', '1h'], ['4h', '4h'], ['1d', '1D'], ['1w', '1W']], CFG.tf) +
      seg('mode', [['candle', LX('Κεριά')], ['fp_ba', 'Bid×Ask', LX('Footprint: πωλήσεις αγοράς (αριστερά) × αγορές αγοράς (δεξιά) σε κάθε τιμή')], ['fp_delta', 'Delta', LX('Footprint: αγορές − πωλήσεις σε κάθε τιμή')], ['fp_vol', LX('Όγκος'), LX('Footprint: συνολικός όγκος σε κάθε τιμή')]], CFG.mode) +
      LX('<select id="fMult" title="Βήμα τιμής (cluster)"><option value="auto">Βήμα: αυτόματο</option>') + MULTS.map(function (m) { return '<option value="' + m + '"' + (String(CFG.mult) === String(m) ? ' selected' : '') + '>×' + m + '</option>' }).join('') + '</select>' +
      alBtns() + '<label style="font-size:.76rem;color:var(--fmu)">Big trade ≥ $<input id="fBig" type="number" min="0" step="1000" value="' + (CFG.big || '') + LX('" placeholder="αυτόματο" style="width:7em"></label>') +
      LX('<button class="fbtn" id="fPause" title="Πάγωμα της εικόνας (τα δεδομένα συνεχίζουν να καταγράφονται)">⏸ Πάγωμα</button></div>') +
      '<div class="fbar" style="padding-top:.35rem;padding-bottom:.35rem">' + tg('heat', '🌡️ Heatmap', LX('Ιστορικό βάθους βιβλίου εντολών (από τη στιγμή που άνοιξε η σελίδα)')) + tg('big', '🫧 Big Trades', LX('Μεγάλες εντολές αγοράς/πώλησης')) + tg('sw', '⚡ Sweeps', LX('Εντολές που «σάρωσαν» πολλά επίπεδα μαζί')) + tg('ice', '🧊 Icebergs', LX('Κρυφές εντολές: εκτελέστηκε πολύ περισσότερο από όσο έδειχνε το βιβλίο')) + tg('liq', '💥 Stop runs / Liq.', LX('Ρευστοποιήσεις futures')) + tg('vp', '📶 Volume Profile', LX('Προφίλ όγκου ορατού εύρους με POC/VAH/VAL')) + tg('vwap', 'VWAP', LX('VWAP ημέρας')) + tg('imb', 'Imbalance', LX('Διαγώνιες ανισορροπίες ×3 στο footprint')) + tg('mlv', LX('M/POC μήνα'), LX('Επίπεδα μηνιαίου Market Profile (καρτέλα Αγορές)')) + tg('opt', 'Options levels', 'Call/Put wall, Max pain, Gamma flip (BTC, ETH)') + tg('fvg', 'FVG / iFVG', T('Fair Value Gaps: κενά τιμής ανάμεσα σε 3 κεριά (πράσινο/κόκκινο). Κίτρινο διακεκομμένο = αντεστραμμένο (iFVG)', 'Fair Value Gaps: price gaps across 3 bars (green/red). Yellow dashed = inverted (iFVG)')) + tg('ob', 'Order Blocks', T('Το τελευταίο αντίθετο κερί πριν από σπάσιμο δομής: ζώνη θεσμικών εντολών', 'The last opposite candle before a structure break: institutional order zone')) + tg('bos', 'BOS / CHoCH', T('Σπάσιμο δομής (BOS = συνέχεια τάσης, CHoCH = αλλαγή τάσης)', 'Break of structure (BOS = continuation, CHoCH = change of character)')) + tg('liqd', T('💧 Ρευστότητα', '💧 Liquidity'), T('PDH/PDL, PWH/PWL, άνοιγμα ημέρας, ίσα υψηλά/χαμηλά (EQH/EQL) όπου κάθονται stop', 'PDH/PDL, PWH/PWL, day open, equal highs/lows (EQH/EQL) where stops sit')) + tg('stk', '▤ Stacked imb.', T('3+ διαδοχικές ανισορροπίες στο ίδιο κερί: ζώνη στήριξης/αντίστασης μέχρι να σπάσει', '3+ consecutive imbalances in one bar: support/resistance zone until broken')) + tg('cs', '◎ Cluster search', T('Τα κελιά με τον μεγαλύτερο όγκο (κορυφαίο 1%)', 'Cells with the highest volume (top 1%)')) + tg('sig', T('A ÷ Σήματα', 'A ÷ Signals'), T('A = απορρόφηση (absorption) · ÷ = απόκλιση delta', 'A = absorption · ÷ = delta divergence')) + tg('vpd', T('Δ στο VP', 'Δ in VP'), T('Delta ανά τιμή δίπλα στο Volume Profile', 'Delta per price next to the Volume Profile')) +
      '<span style="width:.6rem"></span>' + sb('delta', 'Delta') + sb('cvd', 'CVD') + sb('oi', 'OI') + sb('spd', T('Ταχύτητα', 'Speed')) + sb('stat', T('Στατιστικά', 'Statistics')) + '</div>' +
      '<div class="fhd" id="fHead"></div><div id="fToast" class="ftoast" hidden></div>' +
      LX('<div class="fgrid"><div class="fmain"><canvas id="fCv"></canvas><div class="fzm"><button data-fz="-" title="Σμίκρυνση">−</button><button data-fz="+" title="Μεγέθυνση">+</button><button data-fz="y" title="Αυτόματη κλίμακα τιμής">↕</button><button data-fz="0" title="Επαναφορά">⟲</button><button data-fz="f" class="ffol" title="Live: κεντράρει την τιμή και την ακολουθεί μόνο του (για να το αφήνεις σαν οθόνη παρακολούθησης). Σταματά αν σύρεις το διάγραμμα.">● Live</button></div><button class="ffs" data-ffull title="Πλήρης οθόνη (Esc για έξοδο)">⛶</button></div>') +
      '<div class="fside"><div class="fdom"><canvas id="fDom"></canvas></div><div class="ftabs">' + [['tape', 'Tape'], ['big', 'Big'], ['sw', 'Sweeps'], ['ice', 'Iceberg'], ['liq', 'Liq.'], ['al', '🔔']].map(function (x) { return '<button data-fside="' + x[0] + '"' + (SIDE === x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>' }).join('') + '</div><div class="flist" id="fList"></div></div></div>' +
      LX('<div class="fleg"><span><i style="color:#ff8f9b">Bid</i> × <i style="color:#6dffb8">Ask</i>: πωλήσεις × αγορές «στην αγορά» σε κάθε τιμή</span><span><i style="color:#ffc443">▭</i> POC κεριού</span><span><i style="color:#6dffb8">έντονο</i> = ανισορροπία ×3</span><span>🫧 Big trade</span><span><i style="color:#ff6bd6">↕</i> Sweep</span><span><i style="color:#5ef0ff">⊟</i> Iceberg</span><span><i style="color:#ffb020">◆</i> ρευστοποίηση long · <i style="color:#5ef0ff">◆</i> short</span><span><i style="color:#c77dff">—</i> VWAP</span><span><i style="color:#5cb3ff">VAH</i> · <i style="color:#ffc443">POC</i> · <i style="color:#d08bff">VAL</i></span></div>') +
      LX('<div class="fnote">Ροδέλα: ζουμ στον χρόνο · Ctrl/⌘ + ροδέλα ή σύρσιμο στον άξονα τιμών: ζουμ στην τιμή · σύρσιμο: μετακίνηση · διπλό κλικ: επαναφορά. Τα αριθμητικά footprint εμφανίζονται όταν μεγεθύνεις (+). Το footprint χτίζεται από τις πραγματικές συναλλαγές (aggTrades): τα τελευταία λεπτά φορτώνονται αμέσως, και όσο η καρτέλα μένει ανοιχτή φυλάγεται στον browser για 3 μέρες. Το heatmap καταγράφει το βάθος από τη στιγμή που ανοίγεις την καρτέλα.</div>') +
      '</div>' +
      '<div data-fv="opt"' + (CFG.view === 'opt' ? '' : ' hidden') + '><div class="fbar">' + seg('oc', [['BTC', 'BTC'], ['ETH', 'ETH']], CFG.oc) + LX('<select id="fExp"></select><button class="fbtn" id="fOptR">↻ Ανανέωση</button><span style="font-size:.74rem;color:var(--fmu)">Deribit · όλα τα options · ενημέρωση ανά λεπτό</span></div><div id="fOpt"><p style="padding:1rem;color:var(--fmu)">φόρτωση…</p></div></div>') +
      '</div>';
    cv = D.getElementById('fCv'); cx = cv.getContext('2d'); dom = D.getElementById('fDom'); dx = dom.getContext('2d');
    bindChart(); renderHead(); renderSide(true)
  }

  /* τι δείχνει κάθε κουμπί αυτή τη στιγμή: πλήθος, ή γιατί δεν έχει τι να δείξει */
  function mpRow() { try { var rows = W.__E9 && W.__E9.mpRows && W.__E9.mpRows(); return rows && rows.find(function (x) { return x.coin === M.sym && x.P }) } catch (e) { return null } }
  function avail(k) {
    if (!M) return ''; var th = bigTh();
    if (k === 'liq') return M.venue !== 'f' ? T('Οι ρευστοποιήσεις υπάρχουν μόνο στα Futures.', 'Liquidations exist only on Futures.') : !M.liq.length ? T('Ενεργό. Καμία ρευστοποίηση στο ', 'On. No liquidation on ') + M.sym + T(' από τότε που άνοιξε η καρτέλα. Θα εμφανιστούν ◆ μόλις γίνουν.', ' since the tab opened. ◆ will appear as they happen.') : '';
    if (k === 'ice') return !M.ice.length ? T('Ενεργό. Κανένα iceberg ακόμα στο ', 'On. No iceberg yet on ') + M.sym + T('. Ψάχνει συνέχεια· θα εμφανιστεί ⊟ μόλις βρεθεί.', '. It keeps scanning; ⊟ appears when one is found.') : '';
    if (k === 'sw') return !M.sw.length ? T('Ενεργό. Κανένα sweep ακόμα στο ', 'On. No sweep yet on ') + M.sym + '.' : '';
    if (k === 'big') return !M.big.some(function (o) { return o.usd >= th }) ? T('Ενεργό. Καμία εντολή ≥ ', 'On. No order ≥ ') + usd(th) + T(' ακόμα. Μίκρυνε το όριο «Big trade ≥ $».', ' yet. Lower the "Big trade ≥ $" threshold.') : '';
    if (k === 'mlv') return !mpRow() ? T('Τα επίπεδα M/POC υπάρχουν μόνο για τα νομίσματα του πίνακα «Market Profile μήνα» (καρτέλα Αγορές). Το ', 'Monthly M/POC levels exist only for coins in the "Monthly Market Profile" table (Markets tab). ') + M.sym + T(' δεν είναι εκεί.', ' is not there.') : '';
    if (k === 'opt') return (M.sym !== 'BTC' && M.sym !== 'ETH') ? T('Τα επίπεδα options υπάρχουν μόνο για BTC και ETH (Deribit).', 'Options levels exist only for BTC and ETH (Deribit).') : !OPT.lv ? T('Φορτώνω τα options από το Deribit…', 'Loading options from Deribit…') : '';
    if (k === 'heat') return M.heat.cols.length < 3 ? T('Ενεργό. Το heatmap μόλις ξεκίνησε να καταγράφει· θα φαίνεται σε λίγα δευτερόλεπτα στη δεξιά άκρη.', 'On. The heatmap just started recording; it will show at the right edge in a few seconds.') : '';
    return ''
  }
  function counts() {
    if (!ROOT || !M) return; var th = bigTh(), C2 = { big: M.big.filter(function (o) { return o.usd >= th }).length, sw: M.sw.length, ice: M.ice.length, liq: M.venue === 'f' ? M.liq.length : null };
    ROOT.querySelectorAll('.fcnt').forEach(function (b) { var k = b.getAttribute('data-fc'), v = C2[k], na = (k === 'mlv' && !mpRow()) || (k === 'opt' && M.sym !== 'BTC' && M.sym !== 'ETH') || (k === 'liq' && M.venue !== 'f'); b.textContent = v != null ? ' ' + v : na ? ' –' : ''; b.parentNode.classList.toggle('na', !!na); b.parentNode.title = (na ? avail(k) + ' · ' : '') + (b.parentNode.getAttribute('data-tip') || '') })
  }
  function toast(msg) { var tt = D.getElementById('fToast'); if (!tt || !msg) return; tt.textContent = msg; tt.hidden = false; clearTimeout(tt._t); tt._t = setTimeout(function () { tt.hidden = true }, 6000) }
  function renderHead() {
    counts();
    var el = D.getElementById('fHead'); if (!el || !M) return;
    var t = M.t24 || {}, ch = +t.priceChangePercent, px = M.last, mk = M.mark, oi = M.oi.length ? M.oi[M.oi.length - 1].v : NaN, oi1 = NaN;
    if (M.oi.length > 2) { var tt = Date.now() - 36e5, o0 = M.oi.find(function (o) { return o.t >= tt }); if (o0) oi1 = (oi / o0.v - 1) * 100 }
    var imb = M.imb && (M.imb.b + M.imb.a) ? (M.imb.b - M.imb.a) / (M.imb.b + M.imb.a) * 100 : NaN;
    var bars = M.bars, cvd = 0, day = Math.floor(Date.now() / 864e5) * 864e5; bars.forEach(function (k) { if (k.t >= day) cvd += 2 * k.bv - k.v });
    var it = function (l, v, cl) { return '<span><small>' + l + '</small><span class="' + (cl || '') + '">' + v + '</span></span>' };
    el.innerHTML = '<span><span class="fdot' + (M.conn ? ' on' : '') + '"></span><b>' + esc(M.sym) + '/USDT</b> <small>' + (M.venue === 'f' ? 'Perp' : 'Spot') + '</small></span>' +
      '<span><b>' + (isFinite(px) ? px.toFixed(M.dec) : '–') + '</b> ' + (isFinite(ch) ? '<span class="' + (ch >= 0 ? 'pos' : 'neg') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(2) + '%</span>' : '') + '</span>' +
      it(LX('Όγκος 24ω'), t.quoteVolume ? usd(+t.quoteVolume) : '–') +
      (M.venue === 'f' ? it('Funding', mk ? (mk.r * 100).toFixed(4) + '% · ' + Math.max(0, Math.round((mk.T - Date.now()) / 6e4)) + '′' : '–', mk && mk.r < 0 ? 'neg' : 'pos') + it('Open Interest', isFinite(oi) ? fv(oi) + ' ' + esc(M.sym) + (isFinite(oi1) ? ' (' + (oi1 >= 0 ? '+' : '') + oi1.toFixed(2) + LX('% 1ω)') : '') : '–') : '') +
      it(LX('CVD σήμερα'), (cvd >= 0 ? '+' : '') + fv(cvd), cvd >= 0 ? 'pos' : 'neg') +
      it(LX('Βιβλίο ±1%'), isFinite(imb) ? (imb >= 0 ? LX('αγοραστές +') : LX('πωλητές ')) + Math.abs(imb).toFixed(0) + '%' : '–', imb >= 0 ? 'pos' : 'neg') +
      it(T('Ταχύτητα', 'Speed'), (function () { var now = Math.floor(Date.now() / 1000), c = 0; M.tps.forEach(function (x) { if (x[0] > now - 10 && x[0] <= now) c += x[1] }); return (c / 10).toFixed(1) + T('/δευτ.', '/s') })()) +
      it('Big ≥', usd(bigTh()) + (CFG.big ? '' : LX(' (αυτ.)'))) +
      (M.bhFrom ? it(T('Ιστορικό Big από', 'Big history since'), dm(M.bhFrom) + ' (' + fv(M.bhN) + (M.bhSrc ? ' · 🏠 ' + M.bhSrc : '') + ')') : '') +
      it(LX('Footprint από'), isFinite(M.fpFrom) ? dm(M.fpFrom) + ' ' + hm(M.fpFrom) : '–') +
      (M.err ? '<span class="neg">' + esc(M.err) + '</span>' : M.status ? '<span><small>' + esc(M.status) + '</small></span>' : '')
  }
  var SLT = 0;
  function renderSide(force) {
    var el = D.getElementById('fList'); if (!el || !M || !VIS) return; if (!force && Date.now() - SLT < 400) return; if (!force && D.activeElement && D.activeElement.id === 'fTapeMin') return; SLT = Date.now();
    var dec = M.dec, row = function (t, s, p, q, x, hl, at) { return '<div class="' + (s ? 'b' : 's') + (hl ? ' hl' : '') + '"' + (at ? ' data-fat="' + at + '"' : '') + '><span>' + hm(t, true) + '</span><span>' + p + '</span><span>' + q + '</span><span>' + x + '</span></div>' };
    var hd = function (a, b, c, d) { return '<div class="hd"><span>' + a + '</span><span>' + b + '</span><span>' + c + '</span><span>' + d + '</span></div>' }, html = '', th = bigTh();
    if (SIDE === 'tape') { var tm = CFG.tapeMin === 'big' ? th : +CFG.tapeMin || 0, src = tm > 0 ? M.tape : M.tape.slice(-140), L = src.filter(function (x) { return x.p * x.q >= tm }).slice(-140).reverse(); html = '<label class="fchk" style="padding:.3rem .5rem">' + T('Φίλτρο:', 'Filter:') + ' <select id="fTapeMin">' + [[0, T('όλες', 'all')], [1000, '≥ $1k'], [10000, '≥ $10k'], [50000, '≥ $50k'], ['big', 'Big ≥ ' + usd(th)]].map(function (o) { return '<option value="' + o[0] + '"' + (String(CFG.tapeMin || 0) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>' }).join('') + '</select></label>'; html += hd(LX('Ώρα'), LX('Τιμή'), LX('Ποσότ.'), '$') + (L.length ? L.map(function (x) { return row(x.t, x.s, x.p.toFixed(dec), fv(x.q), usd(x.p * x.q), x.p * x.q >= th * 0.5) }).join('') : LX('<span class="em">περιμένω συναλλαγές…</span>')) }
    else if (SIDE === 'big') { L = M.big.filter(function (o) { return o.usd >= th }).slice(-150).reverse(); html = hd(LX('Ώρα'), LX('Τιμή'), LX('Ποσότ.'), '$') + (L.length ? L.map(function (o) { return row(o.t, o.s, o.p.toFixed(dec), fv(o.q), usd(o.usd), o.usd >= th * 4, o.t) }).join('') : LX('<span class="em">Καμία εντολή ≥ ') + usd(th) + LX(' ακόμα.</span>')) }
    else if (SIDE === 'sw') { L = M.sw.slice(-150).reverse(); html = hd(LX('Ώρα'), LX('Από→Έως'), LX('Επίπεδα'), '$') + (L.length ? L.map(function (o) { return row(o.t, o.s, (o.s ? o.pmin : o.pmax).toFixed(dec) + '→' + (o.s ? o.pmax : o.pmin).toFixed(dec), o.lv, usd(o.usd), o.usd >= th, o.t) }).join('') : LX('<span class="em">Κανένα sweep ακόμα. Sweep = μία εντολή που χτύπησε 4+ επίπεδα τιμής ταυτόχρονα.</span>')) }
    else if (SIDE === 'ice') { L = M.ice.slice(-150).reverse(); html = hd(LX('Ώρα'), LX('Τιμή'), LX('Εκτελ./Φαιν.'), '$') + (L.length ? L.map(function (o) { return row(o.t, !o.s, o.p.toFixed(dec), fv(o.q) + '/' + fv(o.shown), usd(o.usd), o.usd >= th, o.t) }).join('') : LX('<span class="em">Κανένα iceberg ακόμα. Iceberg = σε μία τιμή εκτελέστηκε πάνω από 2,5× όσο έδειχνε το βιβλίο και η τιμή κράτησε (κρυφός μεγάλος αγοραστής/πωλητής).</span>')) }
    else if (SIDE === 'liq') { L = M.liq.slice(-150).reverse(); html = hd(LX('Ώρα'), LX('Τιμή'), LX('Θέση'), '$') + (M.venue !== 'f' ? LX('<span class="em">Οι ρευστοποιήσεις υπάρχουν μόνο στα Futures.</span>') : L.length ? L.map(function (o) { return row(o.t, o.side === 'S', o.p.toFixed(dec), o.side === 'L' ? 'long ✕' : 'short ✕', usd(o.usd), o.usd >= 100000, o.t) }).join('') : LX('<span class="em">Καμία ρευστοποίηση από τότε που άνοιξε η καρτέλα.</span>')) }
    else if (SIDE === 'al') {
      var LN = myLines(); html = '<div style="display:flex;gap:.4rem;flex-wrap:wrap;padding:.45rem .6rem"><button class="fbtn' + (CFG.al.off ? '' : ' on') + '" id="fAlOff">' + (CFG.al.off ? T('🔕 Κλειστές · άνοιξέ τες', '🔕 Off · turn on') : T('🔔 Ανοιχτές · κλείσε τες', '🔔 On · turn off')) + '</button>' + (LN.length ? '<button class="fbtn" id="fAlClr">' + T('🗑 Σβήσε όλες', '🗑 Delete all') + '</button>' : '') + '</div>' + (CFG.al.off ? '<span class="em" style="padding:0 .6rem .4rem">' + T('Οι ειδοποιήσεις είναι κλειστές: δεν ακούγεται τίποτα και οι γραμμές δεν φαίνονται στο διάγραμμα.', 'Alerts are off: no sounds and lines are hidden on the chart.') + '</span>' : '') + '<span class="em" style="padding:.2rem .6rem .5rem">' + T('Πάτα «➖ Γραμμή 🔔» και μετά κλικ στο διάγραμμα για νέα γραμμή-ειδοποίηση. Στο διάγραμμα: το κόκκινο ✕ δίπλα στην τιμή τη σβήνει, και τη σέρνεις πάνω-κάτω για να τη μετακινήσεις.', 'Press "➖ Line 🔔", then click on the chart to add an alert line. On the chart: the red ✕ next to the price deletes it; drag it up/down to move it.') + '</span>' +
        LN.map(function (l) { return '<div class="fal"><span>' + (l.al === 1 ? '🔔' : l.al === 2 ? '✔' : '🔕') + '</span><span>' + l.p.toFixed(dec) + '</span><span><button class="fbtn" data-fln="' + l.id + '" data-act="tog">' + (l.al === 1 ? T('Σίγαση', 'Mute') : T('Όπλισε', 'Arm')) + '</button></span><span><button class="fbtn" data-fln="' + l.id + '" data-act="del">✕</button></span></div>' }).join('') +
        '<label class="fchk"><input type="checkbox" id="fAlBig"' + (CFG.al.big ? ' checked' : '') + '> ' + T('Ήχος για Big trades ≥', 'Sound for big trades ≥') + ' <select id="fAlBigX">' + [2, 3, 5, 10].map(function (x) { return '<option value="' + x + '"' + (+CFG.al.bigx === x ? ' selected' : '') + '>' + x + '×</option>' }).join('') + '</select> ' + T('το όριο', 'the threshold') + ' (' + usd(bigTh() * (CFG.al.bigx || 3)) + ')</label>' +
        '<div class="hd" style="display:block">' + T('Πρόσφατες ειδοποιήσεις', 'Recent alerts') + '</div>' + (M.alerts.length ? M.alerts.slice().reverse().map(function (x) { return '<div style="display:block"><span>' + hm(x.t, true) + '</span> · ' + esc(x.msg) + '</div>' }).join('') : '<span class="em">–</span>')
    }
    el.innerHTML = html
  }

  /* ---------- αλληλεπίδραση ---------- */
  function zoomX(f, ax) { if (!M || !M.bars.length) return; var x = ax == null ? Lay.R - Lay.pad : ax, i = iOfX(x); V.bw = clamp(V.bw * f, 1, 480); V.off = cOff(V.off + (iOfX(x) - i)); DIRTY = true }
  function setFollow(on) { V.follow = !!on; if (on) { V.yAuto = true } if (CFG.follow !== V.follow) { CFG.follow = V.follow; saveCfg() } var b = ROOT && ROOT.querySelector('.ffol'); if (b) b.classList.toggle('on', V.follow); DIRTY = true }
  function zoomY(f, ay) { if (V.follow) setFollow(false); var p = ay == null ? (V.y0 + V.y1) / 2 : pOfY(ay); V.yAuto = false; V.y0 = p - (p - V.y0) * f; V.y1 = p + (V.y1 - p) * f; DIRTY = true }
  function bindChart() {
    var pts = new Map(), pinch = null;
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015); if (e.ctrlKey || e.metaKey || x > Lay.R) zoomY(1 / f, y); else if (e.shiftKey) { V.off = cOff(V.off + e.deltaY / V.bw * 0.5); DIRTY = true } else zoomX(f, x) }, { passive: false });
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); var r = cv.getBoundingClientRect(); pts.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top }); if (pts.size === 1 && !V.place) { var hl = lineAt(e.clientX - r.left, e.clientY - r.top); if (hl) { if (hl.del) { var LN0 = myLines(), ix0 = LN0.findIndex(function (l) { return l.id === hl.id }); if (ix0 >= 0) LN0.splice(ix0, 1); saveCfg(); alRefresh(); renderSide(true); V.drag = null; V.lhov = null; return } V.ldrag = hl.id; V.drag = null; return } } if (pts.size === 2) { var a = Array.from(pts.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), bw: V.bw }; V.drag = null } else V.drag = { x: e.clientX - r.left, y: e.clientY - r.top, off: V.off, y0: V.y0, y1: V.y1, axis: e.clientX - r.left > Lay.R } });
    cv.addEventListener('pointermove', function (e) {
      var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; V.mx = x; V.my = y; DIRTY = true;
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: x, y: y });
      if (pinch && pts.size === 2) { var a = Array.from(pts.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mxp = (a[0].x + a[1].x) / 2, i = iOfX(mxp); V.bw = clamp(pinch.bw * d / pinch.d, 1, 480); V.off = cOff(V.off + (iOfX(mxp) - i)); return }
      if (V.ldrag) { var lm = myLines().find(function (l) { return l.id === V.ldrag }); if (lm) { var st0 = M.tick || M.bucket; lm.p = +(Math.round(pOfY(y) / st0) * st0).toFixed(8); lm.al = 1; V.lmoved = true } cv.style.cursor = 'ns-resize'; return }
      if (!V.drag && !V.place) { var hv = lineAt(x, y), nh = hv ? hv.id : null; if (nh !== V.lhov) V.lhov = nh; cv.style.cursor = hv ? (hv.del ? 'pointer' : 'ns-resize') : 'crosshair' }
      var dg = V.drag; if (!dg) return;
      if (V.follow && (Math.abs(x - dg.x) > 4 || Math.abs(y - dg.y) > 4)) setFollow(false);
      if (dg.axis) { var f = Math.exp((y - dg.y) * 0.01), mid = (dg.y0 + dg.y1) / 2, hh = (dg.y1 - dg.y0) / 2 * f; V.yAuto = false; V.y0 = mid - hh; V.y1 = mid + hh; return }
      V.off = cOff(dg.off + (x - dg.x) / V.bw);
      if (!V.yAuto) { var dp = (y - dg.y) / (Lay.B - Lay.T - 16) * (dg.y1 - dg.y0); V.y0 = dg.y0 + dp; V.y1 = dg.y1 + dp }
    });
    var up = function (e) { if (V.ldrag) { V.ldrag = null; if (V.lmoved) { V.lmoved = false; saveCfg(); renderSide(true) } pts.delete(e.pointerId); return } var dg = V.drag, r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; if (V.place && dg && Math.hypot(x - dg.x, y - dg.y) < 6 && x < Lay.R && y < Lay.B) { V.place = false; addLine(pOfY(y)) } pts.delete(e.pointerId); if (pts.size < 2) pinch = null; V.drag = null };
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
      if (sg === 'lang') { reshell(); return }
      if (sg === 'venue' || sg === 'tf') { if (sg === 'tf' && M && M.venue === CFG.venue && M.sym === CFG.sym) { switchTf() } else start(); return }
      DIRTY = true; return }
    if (t.hasAttribute('data-fsh')) { var k = t.getAttribute('data-fsh'); CFG.sh[k] = CFG.sh[k] ? 0 : 1; t.classList.toggle('on', !!CFG.sh[k]); saveCfg(); if (k === 'opt' && CFG.sh.opt) optLevels(); if (k === 'mlv' && CFG.sh.mlv && !mpRow()) { try { W.__E9 && W.__E9.mp && W.__E9.mp() } catch (x) { } } if (CFG.sh[k]) toast(avail(k)); else toast(T('Κρυμμένο: ', 'Hidden: ') + t.textContent.replace(/\s*[\d–]+$/, '')); DIRTY = true; return }
    if (t.hasAttribute('data-fsub')) { k = t.getAttribute('data-fsub'); CFG.sub[k] = CFG.sub[k] ? 0 : 1; t.classList.toggle('on', !!CFG.sub[k]); saveCfg(); DIRTY = true; return }
    if (t.hasAttribute('data-fz')) { var z = t.getAttribute('data-fz'); if (z === '+') zoomX(1.35); else if (z === '-') zoomX(1 / 1.35); else if (z === 'y') { V.yAuto = true; DIRTY = true } else if (z === 'f') { setFollow(!V.follow) } else { V.off = 0; V.yAuto = true; V.bw = CFG.mode === 'candle' ? 8 : 12; DIRTY = true } return }
    if (t.hasAttribute('data-fside')) { SIDE = t.getAttribute('data-fside'); ROOT.querySelectorAll('[data-fside]').forEach(function (b) { b.classList.toggle('on', b === t) }); renderSide(true); return }
    if (t.hasAttribute('data-fat')) { var at = +t.getAttribute('data-fat'), b0 = M.bars[0]; if (!b0) return; if (V.follow) setFollow(false); var i = (at - b0.t) / TF[M.tf]; if (V.bw < 30) V.bw = 30; V.off = cOff(M.bars.length - 1 - i - (Lay.R / 2 - Lay.pad - V.bw / 2) / V.bw); V.yAuto = true; DIRTY = true; return }
    if (t.hasAttribute('data-ffull')) { fullTog(); return }
    if (t.id === 'fPause') { PAUSE = !PAUSE; t.textContent = PAUSE ? LX('▶ Συνέχεια') : LX('⏸ Πάγωμα'); DIRTY = true; return }
    if (t.id === 'fOptR') { optRender(true); return }
    if (t.id === 'fLine') { V.place = !V.place; alRefresh(); return }
    if (t.id === 'fAlOff') { CFG.al.off = CFG.al.off ? 0 : 1; V.place = false; saveCfg(); alRefresh(); renderSide(true); return }
    if (t.id === 'fAlClr') { CFG.lines[lk()] = []; saveCfg(); alRefresh(); renderSide(true); return }
    if (t.hasAttribute('data-fln')) { var LN = myLines(), id = t.getAttribute('data-fln'), ix = LN.findIndex(function (l) { return l.id === id }); if (ix < 0) return; if (t.getAttribute('data-act') === 'del') { LN.splice(ix, 1); alRefresh() } else { LN[ix].al = LN[ix].al === 1 ? 0 : 1; if (LN[ix].al) askNotif() } saveCfg(); DIRTY = true; renderSide(true); return }
    if (t.hasAttribute('data-fhelp')) { help(true); return }
    if (t.hasAttribute('data-fhx')) { help(false); return }
  }
  function reshell() { var full = ROOT.querySelector('.fw.ffull'); ROOT.innerHTML = ''; shell(); if (full) { ROOT.querySelector('.fw').classList.add('ffull'); ROOT.querySelector('[data-ffull]').textContent = '✕' } renderHead(); renderSide(true); if (CFG.view === 'opt') optRender(); DIRTY = true }
  function help(on) {
    var fw = ROOT.querySelector('.fw'), h = D.getElementById('fHelp'); if (!on) { if (h) h.remove(); return } if (h) return;
    var it = function (t, d) { return '<div><b>' + t + '</b><p>' + d + '</p></div>' };
    h = D.createElement('div'); h.id = 'fHelp'; h.className = 'fhelp';
    h.innerHTML = '<div class="fhb"><div class="fhh"><b>' + T('❓ Οδηγός Order Flow', '❓ Order Flow guide') + '</b><button class="fbtn" data-fhx>✕</button></div><div class="fhg">' +
      it('Footprint (Bid×Ask / Delta / ' + T('Όγκος', 'Volume') + ')', T('Μέσα σε κάθε κερί: πόσα πουλήθηκαν (αριστερά) και πόσα αγοράστηκαν (δεξιά) «στην αγορά» σε κάθε τιμή. Μεγέθυνε (+) για να δεις τα νούμερα. Χρυσό πλαίσιο = POC του κεριού.', 'Inside each bar: how much was sold (left) and bought (right) at market at each price. Zoom in (+) to see the numbers. Gold box = the bar\'s POC.')) +
      it('Imbalance / ▤ Stacked', T('Ανισορροπία: οι αγορές σε μια τιμή είναι 3× οι πωλήσεις της αμέσως χαμηλότερης (διαγώνια), ή το αντίθετο. 3+ στη σειρά = stacked imbalance: ζώνη που συχνά λειτουργεί σαν στήριξη (πράσινη) ή αντίσταση (κόκκινη) μέχρι να κλείσει κερί μέσα από αυτή.', 'Imbalance: buys at a price are 3× the sells one level below (diagonal), or the reverse. 3+ in a row = stacked imbalance: a zone that often acts as support (green) or resistance (red) until a bar closes through it.')) +
      it('◎ Cluster search', T('Κύκλοι στα σημεία με τον μεγαλύτερο όγκο (κορυφαίο 1% του ορατού εύρους). Εκεί μπήκαν τα «μεγάλα χέρια». Συχνά η τιμή επιστρέφει σε αυτά.', 'Circles where volume was largest (top 1% of the visible range). That is where big players were active. Price often revisits them.')) +
      it(T('A ÷ Σήματα', 'A ÷ Signals'), T('<b>A</b> = απορρόφηση: πολλές πωλήσεις στο κάτω άκρο του κεριού αλλά κλείσιμο ψηλά (κάποιος τις «απορρόφησε» με limit αγορές), ή το αντίθετο στην κορυφή. <b>÷</b> = απόκλιση delta: νέο υψηλό με αρνητικό delta (αδύναμη άνοδος) ή νέο χαμηλό με θετικό delta (αδύναμη πτώση).', '<b>A</b> = absorption: heavy selling at the bar\'s low but a high close (someone absorbed it with limit buys), or the reverse at the top. <b>÷</b> = delta divergence: new high with negative delta (weak rally) or new low with positive delta (weak drop).')) +
      it('🌡️ Heatmap', T('Το βιβλίο εντολών στον χρόνο. Φωτεινές γραμμές = μεγάλες εντολές limit που περιμένουν. Αν εξαφανιστούν λίγο πριν τις φτάσει η τιμή, ήταν «ψεύτικες» (spoofing).', 'The order book over time. Bright lines = large resting limit orders. If they vanish just before price reaches them, they were fake (spoofing).')) +
      it('🫧 Big Trades · ⚡ Sweeps · 🧊 Icebergs', T('Φούσκες = μεγάλες εντολές αγοράς (πράσινες) ή πώλησης (κόκκινες). Sweep = μία εντολή που «έφαγε» 4+ επίπεδα μαζί (βιασύνη). Iceberg = κρυφή εντολή: εκτελέστηκε πολύ περισσότερο από όσο φαινόταν και η τιμή κράτησε.', 'Bubbles = large buy (green) or sell (red) orders. Sweep = one order that ate 4+ levels at once (urgency). Iceberg = hidden order: far more was filled than was shown, and the level held.')) +
      it('💥 Stop runs / Liq.', T('Ρευστοποιήσεις futures. Πολλές μαζί = «κυνήγι stop»: συχνά σημάδι εξάντλησης της κίνησης.', 'Futures liquidations. Many at once = stop run: often a sign the move is exhausted.')) +
      it('📶 Volume Profile · Δ', T('Πόσος όγκος έγινε σε κάθε τιμή στο ορατό εύρος, με POC (χρυσό), VAH/VAL (70% του όγκου). Η στήλη Δ δείχνει ποιος κυριάρχησε σε κάθε τιμή.', 'Volume at each price in the visible range, with POC (gold) and VAH/VAL (70% of volume). The Δ column shows who dominated at each price.')) +
      it('Delta · CVD · OI', T('Delta = αγορές − πωλήσεις ανά κερί. CVD = το άθροισμά του (χρυσή γραμμή) και, γαλάζια, μόνο των μεγάλων εντολών: αν η τιμή ανεβαίνει ενώ οι μεγάλοι πουλάνε, πρόσεχε. OI = ανοιχτές θέσεις futures.', 'Delta = buys − sells per bar. CVD = its running total (gold), and in cyan the big orders only: if price rises while big players sell, be careful. OI = open futures positions.')) +
      it(T('Ταχύτητα · Στατιστικά', 'Speed · Statistics'), T('Ταχύτητα = πόσες συναλλαγές ανά κερί (πορτοκαλί όταν διπλασιάζεται: έρχεται κίνηση). Στατιστικά = πίνακας κάτω από κάθε κερί: όγκος, delta, delta %, συναλλαγές, μέγιστο/ελάχιστο delta μέσα στο κερί.', 'Speed = trades per bar (orange when it doubles: a move is coming). Statistics = table under each bar: volume, delta, delta %, trades, max/min intrabar delta.')) +
      it('➖ ' + T('Γραμμή 🔔', 'Line 🔔'), T('Πάτα «➖ Γραμμή 🔔» και κλικ στο διάγραμμα. Όταν η τιμή την αγγίξει ακούς ήχο και βλέπεις μήνυμα (και ειδοποίηση του browser αν η καρτέλα είναι κρυμμένη). Διαχείριση στην καρτέλα 🔔 δεξιά, όπου βάζεις και ήχο για πολύ μεγάλες εντολές.', 'Press "➖ Line 🔔" and click on the chart. When price touches it you hear a sound and see a message (plus a browser notification if the tab is hidden). Manage them in the 🔔 tab on the right, where you can also enable a sound for very large orders.')) +
      it('FVG · Order Blocks · BOS/CHoCH', T('<b>FVG</b>: κενό τιμής ανάμεσα στο 1ο και 3ο κερί μιας απότομης κίνησης. Η τιμή συχνά γυρίζει να το «γεμίσει». Όταν γεμίσει, το κουτί σταματά. Αν κλείσει κερί από την άλλη πλευρά, γίνεται <b>iFVG</b> (κίτρινο) και δουλεύει ανάποδα. <b>Order Block</b>: το τελευταίο αντίθετο κερί πριν από σπάσιμο δομής (μπλε = αγοραστικό, μωβ = πωλητικό). Διακεκομμένο σημαίνει ότι ακυρώθηκε. <b>BOS</b> = η τιμή έσπασε το τελευταίο swing προς την ίδια κατεύθυνση (συνέχεια). <b>CHoCH</b> = το έσπασε προς την αντίθετη (πιθανή αλλαγή τάσης).', '<b>FVG</b>: a price gap between bar 1 and bar 3 of a sharp move. Price often returns to fill it. Once filled, the box stops. If a bar closes beyond it, it becomes an <b>iFVG</b> (yellow) and works the other way. <b>Order Block</b>: the last opposite candle before a structure break (blue = bullish, purple = bearish). Dashed means invalidated. <b>BOS</b> = price broke the last swing in the same direction (continuation). <b>CHoCH</b> = broke it in the opposite direction (possible trend change).')) +
      it(T('💧 Ρευστότητα', '💧 Liquidity'), T('<b>PDH/PDL</b> = υψηλό/χαμηλό χθεσινής ημέρας, <b>PWH/PWL</b> = προηγούμενης εβδομάδας, και το άνοιγμα της ημέρας. <b>EQH/EQL $$$</b> = ίσα υψηλά/χαμηλά: εκεί κάθονται πολλά stop, γι\'αυτό η τιμή συχνά πάει να τα «σαρώσει». ✓ = σαρώθηκαν. Δες αν εκεί εμφανίζονται ρευστοποιήσεις, sweeps και απορρόφηση: αυτό είναι το κλασικό «liquidity grab».', '<b>PDH/PDL</b> = previous day high/low, <b>PWH/PWL</b> = previous week, plus the day open. <b>EQH/EQL $$$</b> = equal highs/lows: many stops sit there, so price often goes to sweep them. ✓ = swept. Watch for liquidations, sweeps and absorption there: the classic liquidity grab.')) +
      it('🧬 Options X-Ray', T('Από το Deribit: call/put wall, max pain, gamma flip, αναμενόμενη κίνηση. Τα επίπεδα μπαίνουν και στο διάγραμμα (BTC, ETH).', 'From Deribit: call/put wall, max pain, gamma flip, expected move. The levels are also drawn on the chart (BTC, ETH).')) +
      '</div></div>';
    fw.appendChild(h)
  }
  function fullTog() {
    var fw = ROOT.querySelector('.fw'), on = !fw.classList.contains('ffull'), fsEl = D.fullscreenElement || D.webkitFullscreenElement;
    fw.classList.toggle('ffull', on); ROOT.querySelector('[data-ffull]').textContent = on ? '✕' : '⛶';
    try { if (on && !fsEl) { var rq = fw.requestFullscreen || fw.webkitRequestFullscreen; if (rq) { var pr = rq.call(fw); if (pr && pr.catch) pr.catch(function () { }) } } else if (!on && fsEl) { (D.exitFullscreen || D.webkitExitFullscreen).call(D) } } catch (e) { }
    DIRTY = true; setTimeout(function () { DIRTY = true }, 300)
  }
  function onFsChange() { var fw = ROOT && ROOT.querySelector('.fw'); if (fw && !(D.fullscreenElement || D.webkitFullscreenElement) && fw.classList.contains('ffull')) { fw.classList.remove('ffull'); var b = ROOT.querySelector('[data-ffull]'); if (b) b.textContent = '⛶'; DIRTY = true } }
  function switchTf() { var m = M; m.tf = CFG.tf; m.bars = []; m.fp = {}; rebuildFp(); V.off = 0; V.yAuto = true; loadBars().then(function () { if (m === M) { loadOIhist(); bigHist(); DIRTY = true } }) }
  function loadOIhist() { var m = M; if (m.venue !== 'f') return; var per = { '1m': '5m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1d' }[m.tf]; bn('f', '/futures/data/openInterestHist', 'symbol=' + m.pair + '&period=' + per + '&limit=500').then(function (a) { if (m === M) { m.oi = (a || []).map(function (x) { return { t: +x.timestamp, v: +x.sumOpenInterest } }); DIRTY = true } }).catch(function () { }) }
  function onChange(e) {
    if (!ROOT || !ROOT.contains(e.target)) return; var t = e.target;
    if (t.id === 'fSym') { var s = String(t.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, ''); if (!s || s === CFG.sym) return; CFG.sym = s; t.value = s; saveCfg(); start(); return }
    if (t.id === 'fMult') { CFG.mult = t.value === 'auto' ? 'auto' : +t.value; saveCfg(); DIRTY = true; return }
    if (t.id === 'fBig') { CFG.big = Math.max(0, +t.value || 0); saveCfg(); DIRTY = true; renderSide(true); renderHead(); return }
    if (t.id === 'fAlBig') { CFG.al.big = t.checked ? 1 : 0; saveCfg(); if (t.checked) { askNotif(); beep(1) } return }
    if (t.id === 'fAlBigX') { CFG.al.bigx = +t.value; saveCfg(); renderSide(true); return }
    if (t.id === 'fTapeMin') { CFG.tapeMin = t.value === 'big' ? 'big' : +t.value; saveCfg(); renderSide(true); return }
    if (t.id === 'fExp') { CFG.oexp = t.value; saveCfg(); optRender(); return }
  }

  /* ---------- Options X-Ray: σελίδα ---------- */
  function optLevels() { var c = M && M.sym; if (c !== 'BTC' && c !== 'ETH') { OPT.lv = null; return } optLoad(c).then(function (d) { var v = optView(d, 'all'); OPT.lv = { c: c, cw: v.cw, pw: v.pw, mp: v.mp, flip: v.flip, emH: v.e0 ? v.S + v.e0.mv : null, emL: v.e0 ? v.S - v.e0.mv : null }; DIRTY = true }).catch(function () { }) }
  function optRender(force) {
    var el = D.getElementById('fOpt'); if (!el) return; var c = CFG.oc;
    optLoad(c, force).then(function (d) {
      if (CFG.oc !== c) return; var sel = D.getElementById('fExp'), ex = CFG.oexp; if (ex !== 'all' && !d.exps.some(function (x) { return x.e === ex })) ex = 'all';
      sel.innerHTML = LX('<option value="all">Όλες οι λήξεις</option>') + d.exps.map(function (x) { return '<option value="' + x.e + '"' + (x.e === ex ? ' selected' : '') + '>' + x.e + ' · ' + Math.max(0, (x.T - Date.now()) / 864e5).toFixed(1) + LX(' μέρες</option>') }).join('');
      var v = optView(d, ex), S = v.S, fp = function (p) { return p == null ? '–' : '$' + Math.round(p).toLocaleString('el-GR') }, pc = function (p) { return p == null ? '' : ((p / S - 1) * 100 >= 0 ? '+' : '') + ((p / S - 1) * 100).toFixed(1) + '%' };
      var kp = function (col, l, val, sub) { return '<div style="--c:' + col + '"><small>' + l + '</small><b>' + val + '</b><i>' + sub + '</i></div>' };
      el.innerHTML = '<div class="opk">' + kp('#d6e2ee', LX('Τιμή (υποκείμενο)'), fp(S), 'Deribit') + kp('#22c27f', 'Call wall', fp(v.cw), pc(v.cw) + LX(' · μέγιστο OI calls (αντίσταση)')) + kp('#ef4f5f', 'Put wall', fp(v.pw), pc(v.pw) + LX(' · μέγιστο OI puts (στήριξη)')) + kp('#ffffff', 'Max pain', fp(v.mp), pc(v.mp) + LX(' · λήξη ') + esc(v.pe || '')) + kp('#ff6bd6', 'Gamma flip', fp(v.flip), v.flip ? (S > v.flip ? LX('από πάνω: θετικό gamma (ήρεμη αγορά)') : LX('από κάτω: αρνητικό gamma (απότομες κινήσεις)')) : LX('χωρίς αλλαγή πρόσημου ±20%')) +
        kp('#8597a8', LX('Αναμενόμενη κίνηση'), v.e0 ? '±' + fp(v.e0.mv) : '–', v.e0 ? esc(v.e0.e) + ' · IV ' + (v.e0.iv * 100).toFixed(0) + '% · ' + fp(S - v.e0.mv) + '–' + fp(S + v.e0.mv) : '') + kp('#ffc443', 'Put/Call OI', v.tc ? (v.tp / v.tc).toFixed(2) : '–', fv(v.tc) + ' calls · ' + fv(v.tp) + ' puts') + kp(v.tg >= 0 ? '#22c27f' : '#ef4f5f', LX('Συνολικό GEX'), (v.tg >= 0 ? '+' : '−') + usd(Math.abs(v.tg)), LX('ανά 1% κίνηση · ') + (v.tg >= 0 ? LX('οι dealers φρενάρουν την τιμή') : LX('οι dealers ενισχύουν την κίνηση'))) + '</div>' +
        LX('<div class="opg"><div class="opc"><h4>Strike Profile · Open Interest (puts ← → calls)</h4><canvas id="fOiCv"></canvas></div><div class="opc"><h4>GEX Profile ανά strike (Gamma Exposure, $ ανά 1%)</h4><canvas id="fGxCv"></canvas></div></div>') +
        LX('<div class="opg"><div class="opc"><h4>Αναμενόμενη κίνηση ανά λήξη (από το ATM implied volatility)</h4><table class="opt"><thead><tr><th>Λήξη</th><th>Μέρες</th><th>ATM IV</th><th>±Κίνηση</th><th>Εύρος</th></tr></thead><tbody>') + v.em.map(function (x) { return '<tr><td>' + esc(x.e) + '</td><td>' + x.days.toFixed(1) + '</td><td>' + (x.iv * 100).toFixed(1) + '%</td><td>±' + fp(x.mv) + ' (' + (x.mv / S * 100).toFixed(1) + '%)</td><td>' + fp(S - x.mv) + ' – ' + fp(S + x.mv) + '</td></tr>' }).join('') + '</tbody></table></div>' +
        LX('<div class="opc"><h4>Τι σημαίνουν</h4><p style="font-size:.8rem;color:var(--fmu);margin:.2rem .3rem;line-height:1.45"><b style="color:#22c27f">Call wall</b>: το strike με τα περισσότερα ανοιχτά calls πάνω από την τιμή. Συχνά λειτουργεί σαν αντίσταση.<br><b style="color:#ef4f5f">Put wall</b>: τα περισσότερα puts κάτω από την τιμή, συχνά στήριξη.<br><b>Max pain</b>: η τιμή λήξης όπου χάνουν τα περισσότερα options. Κοντά στη λήξη η τιμή τείνει προς τα εκεί.<br><b style="color:#ff6bd6">Gamma flip</b>: πάνω από αυτό οι dealers (θετικό gamma) πουλούν στις ανόδους και αγοράζουν στις πτώσεις, οπότε η αγορά ηρεμεί. Κάτω από αυτό κάνουν το αντίθετο και οι κινήσεις επιταχύνονται.<br><b>Αναμενόμενη κίνηση</b>: το ±1σ εύρος μέχρι τη λήξη, όπως το «τιμολογεί» η αγορά options.<br>Υπόθεση GEX: οι dealers είναι long calls/short puts από την πλευρά του πελάτη (συνήθης παραδοχή).</p></div></div>') +
        LX('<p style="padding:0 .7rem .7rem;font-size:.74rem;color:var(--fmu)">Πηγή: Deribit, δημόσιο API (') + d.O.length + LX(' συμβόλαια). Ενημέρωση ') + hm(d.at, true) + LX('. Το gamma υπολογίζεται με Black-Scholes από το mark IV κάθε συμβολαίου. Τα επίπεδα εμφανίζονται και στο διάγραμμα Order Flow (κουμπί «Options levels»).</p>');
      optCharts(v);
      if (M && M.sym === c) optLevels()
    }).catch(function () { el.innerHTML = LX('<p style="padding:1rem;color:#ef4f5f">Δεν ήρθαν δεδομένα από το Deribit. Δοκίμασε ↻ σε λίγο.</p>') })
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
      ln(S, '#ffffff', LX('Τιμή ') + Math.round(S).toLocaleString('el-GR')); ln(v.mp, '#ffc443', 'Max pain'); ln(v.flip, '#ff6bd6', 'Gamma flip'); if (z[1] === 'oi') { ln(v.cw, '#22c27f', 'Call wall'); ln(v.pw, '#ef4f5f', 'Put wall') }
      g.fillStyle = C.mut; g.textAlign = 'left'; g.fillText(z[1] === 'oi' ? '← Puts   Calls →' : LX('← αρνητικό   θετικό →'), lw + 4, h - 8)
    })
  }

  /* ---------- βρόχος σχεδίασης ---------- */
  var lastDom = 0, lastHead = 0;
  function loop() {
    RAF = 0; if (!VIS) return; var now = Date.now();
    if (CFG.view === 'chart') { if ((DIRTY && !PAUSE) || V.drag || V.mx >= 0) { DIRTY = false; try { draw() } catch (e) { console.error(e) } } if (!PAUSE && now - lastDom > 220) { lastDom = now; try { drawDom() } catch (e) { } } if (now - lastHead > 1000) { lastHead = now; renderHead(); if (SIDE === 'tape' && !PAUSE) renderSide() } }
    RAF = setTimeout(function () { requestAnimationFrame(loop) }, 66)
  }
  /* ======================= Ιστορικό Big Trades =======================
     Ο «φύλακας» (GitHub, 24/7) μαζεύει τις μεγάλες εντολές των Futures για όλα τα νομίσματα του αρχείου
     και τις γράφει στη βάση σε ένα έγγραφο ανά νόμισμα ανά μέρα (bigtr/BTCUSDT_20261117).
     Όταν ανοίγεις το διάγραμμα, φορτώνονται μαζί με τα κεριά, για όσες μέρες καλύπτουν. */
  function fsdb() { try { return W.firebase && firebase.apps && firebase.apps.length ? firebase.firestore() : null } catch (e) { return null } }
  function dayKey(t) { var d = new Date(t); return d.getUTCFullYear() + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2) }
  /* Pi στο σπίτι: αν έχει δηλώσει τη διεύθυνσή του (pi/main) τα τελευταία 45′, το ιστορικό Big trades έρχεται από εκεί */
  var PIC = { at: 0, p: null };
  function piCfg() {
    var db = fsdb(); if (!db) return Promise.resolve(null);
    if (PIC.p && Date.now() - PIC.at < 20 * 6e4) return PIC.p; PIC.at = Date.now();
    PIC.p = db.collection('pi').doc('main').get().then(function (sn) { var d = sn.exists ? sn.data() : null; return d && d.url && Date.now() - (+d.at || 0) < 45 * 6e4 ? d : null }).catch(function () { return null });
    return PIC.p
  }
  function piHist(m, pi) {
    var u = W.firebase && firebase.auth && firebase.auth().currentUser; if (!u) return Promise.reject('auth');
    var from = m.bars[0].t, to = m.piLo || Date.now() + 864e5; if (m.piLo && from >= m.piLo) return Promise.resolve(true);
    var min = Math.round(Math.max(5000, bigTh() * 0.5));
    return u.getIdToken().then(function (tok) { return fetch(pi.url.replace(/\/+$/, '') + '/bigtr?mk=' + m.venue + '&pair=' + m.pair + '&from=' + from + '&to=' + to + '&min=' + min, { headers: { authorization: 'Bearer ' + tok } }) })
      .then(function (r) { if (!r.ok) throw r.status; return r.json() }).then(function (d) {
        if (m !== M) return true; m.piLo = from; var seen = {}, n = 0, lo = Infinity; m.big.forEach(function (o) { seen[o.t + '|' + o.s] = 1 });
        for (var i = 0; i < d.t.length; i++) { var key = d.t[i] + '|' + d.s[i]; if (seen[key]) continue; seen[key] = 1; var p = d.p[i], q = d.q[i]; m.big.push({ t: d.t[i], s: d.s[i], q: q, usd: p * q, p: p, pmin: p, pmax: p, n: 1, h: 1 }); n++; if (d.t[i] < lo) lo = d.t[i] }
        m.bhSrc = 'Pi'; if (n) { m.big.sort(function (a, b) { return a.t - b.t }); if (m.big.length > 60000) m.big.splice(0, m.big.length - 60000); m.bhFrom = Math.min(lo, m.bhFrom || Infinity); m.bhN = (m.bhN || 0) + n; DIRTY = true; renderHead(); renderSide(true) }
        return true
      })
  }
  function bigHist() {
    var m0 = M; if (!m0 || !m0.bars.length) return;
    piCfg().then(function (pi) { if (m0 !== M) return; if (!pi) return bigHistFb(); return piHist(m0, pi).catch(function (e) { try { console.warn('Pi', e) } catch (x) { } bigHistFb() }) })
  }
  function bigHistFb() {
    /* όλο το ιστορικό που έχει μαζέψει ο φύλακας, όσο πίσω καλύπτουν τα κεριά (ένα ερώτημα: διαβάζει μόνο τις μέρες που υπάρχουν) */
    var m = M, db = fsdb(); if (!db || !m.bars.length) return;
    var pre = (m.venue === 's' ? 'S_' : '') + m.pair + '_', fp = firebase.firestore.FieldPath.documentId(), lo;
    var seen = {}; m.big.forEach(function (o) { seen[o.t + '|' + o.s] = 1 });
    lo = dayKey(m.bars[0].t); if (m.bhLo && lo >= m.bhLo) return; var hi = m.bhLo; m.bhLo = lo;
    db.collection('bigtr').where(fp, '>=', pre + lo).where(fp, hi ? '<' : '<=', pre + (hi || '99999999')).limit(400).get().then(function (qs) {
      if (m !== M) return; var n = 0, from = Infinity, days = 0;
      qs.forEach(function (sn) { var d = sn.data(); if (!d || !d.t) return; days++; for (var i = 0; i < d.t.length; i++) { var key = d.t[i] + '|' + d.s[i]; if (seen[key]) continue; seen[key] = 1; var p = d.p[i], q = d.q[i]; m.big.push({ t: d.t[i], s: d.s[i], q: q, usd: p * q, p: p, pmin: p, pmax: p, n: 1, h: 1 }); n++; if (d.t[i] < from) from = d.t[i] } });
      if (n) { m.big.sort(function (a, b) { return a.t - b.t }); if (m.big.length > 60000) m.big.splice(0, m.big.length - 60000); m.bhFrom = Math.min(from, m.bhFrom || Infinity); m.bhN = (m.bhN || 0) + n; m.bhDays = (m.bhDays || 0) + days; DIRTY = true; renderHead(); renderSide(true) }
    }).catch(function (e) { try { console.warn('bigHist', e) } catch (x) { } })
  }
  /* ο συλλέκτης (τρέχει μόνο στον φύλακα): μία σύνδεση WebSocket για όλα τα νομίσματα */
  var COL = null;
  function collect(coins) {
    /* Futures (έγγραφα BTCUSDT_ημέρα) και Spot (έγγραφα S_BTCUSDT_ημέρα): μία σύνδεση για κάθε αγορά */
    var db = fsdb(); if (!db || COL) return;
    if (!collect.go && !collect.wait) { collect.wait = 1; piCfg().then(function (pi) { collect.wait = 0; if (pi) { PIC.at = 0; console.log('[flow] συλλογή Big trades: την κάνει το Pi (' + pi.url + ')'); setTimeout(function () { collect(coins) }, 30 * 6e4) } else { collect.go = 1; collect(coins) } }); return }
    if (!collect.go) return;
    COL = { b: {}, th: {}, g: {}, dirty: {}, ws: {}, try: { f: 0, s: 0 } };
    var pairs = coins.map(function (c) { return String(c).toUpperCase().replace(/USDT$/, '') + 'USDT' });
    var pk = function (v, pr) { return (v === 's' ? 'S_' : '') + pr };
    var buf = function (key, pair, day) { var k = key + '_' + day, B = COL.b[k]; if (!B) { B = COL.b[k] = { key: key, pair: pair, day: day, t: [], p: [], q: [], s: [], loaded: false }; db.collection('bigtr').doc(k).get().then(function (sn) { var d = sn.exists ? sn.data() : null; if (d && d.t) { var have = {}; B.t.forEach(function (t, i) { have[t + '|' + B.s[i]] = 1 }); for (var i = 0; i < d.t.length; i++) if (!have[d.t[i] + '|' + d.s[i]]) { B.t.push(d.t[i]); B.p.push(d.p[i]); B.q.push(d.q[i]); B.s.push(d.s[i]) } } B.loaded = true }).catch(function () { B.loaded = true }) } return B };
    // όριο ανά νόμισμα και αγορά: από τον όγκο 24 ωρών (≈ το κορυφαίο 0,5-1% των εντολών), τουλάχιστον $10k
    var ths = function () { pairs.forEach(function (pr) { ['f', 's'].forEach(function (v) { bn(v, v === 'f' ? '/fapi/v1/ticker/24hr' : '/api/v3/ticker/24hr', 'symbol=' + pr).then(function (t) { COL.th[pk(v, pr)] = Math.max(10000, (+t.quoteVolume || 0) / 150000) }).catch(function () { }) }) }) };
    ths(); setInterval(ths, 6 * 36e5);
    var flush = function (g) { var th = COL.th[g.key] || 25000; if (g.usd < th) return; var day = dayKey(g.T), B = buf(g.key, g.pair, day); if (B.t.length >= 15000) return; B.t.push(g.T); B.p.push(+(g.usd / g.q).toPrecision(8)); B.q.push(+g.q.toPrecision(8)); B.s.push(g.s); COL.dirty[g.key + '_' + day] = 1 };
    var URL0 = { f: [FWS.mk], s: ['wss://data-stream.binance.vision/stream?streams=', 'wss://stream.binance.com:9443/stream?streams='] };
    var open = function (v) {
      var hosts = URL0[v], url = hosts[COL.try[v] % hosts.length] + pairs.map(function (p) { return p.toLowerCase() + '@aggTrade' }).join('/'), ws; try { ws = new WebSocket(url) } catch (e) { return retry(v) } COL.ws[v] = ws;
      ws.onopen = function () { COL.try[v] = 0 };
      ws.onmessage = function (ev) { var j; try { j = JSON.parse(ev.data) } catch (e) { return } var d = j.data || j; if (d.e !== 'aggTrade') return; var pr = d.s, key = pk(v, pr), T = +d.T, side = d.m ? 0 : 1, p = +d.p, q = +d.q, g = COL.g[key];
        if (g && g.T === T && g.s === side) { g.q += q; g.usd += p * q } else { if (g) flush(g); COL.g[key] = { key: key, pair: pr, T: T, s: side, q: q, usd: p * q } } };
      ws.onclose = function () { retry(v) }; ws.onerror = function () { try { ws.close() } catch (e) { } };
    };
    var retry = function (v) { COL.try[v]++; setTimeout(function () { open(v) }, Math.min(30000, 2000 * COL.try[v])) };
    open('f'); open('s');
    // κάθε 10′: γράφει όσα έγγραφα άλλαξαν (ένα ανά νόμισμα ανά αγορά ανά μέρα)
    setInterval(function () { Object.keys(COL.g).forEach(function (k) { var g = COL.g[k]; if (g && Date.now() - g.T > 2000) { flush(g); COL.g[k] = null } });
      Object.keys(COL.dirty).forEach(function (k) { var B = COL.b[k]; if (!B || !B.loaded) return; delete COL.dirty[k]; db.collection('bigtr').doc(k).set({ v: 1, pair: B.pair, mk: B.key.indexOf('S_') === 0 ? 's' : 'f', day: B.day, th: Math.round(COL.th[B.key] || 0), n: B.t.length, at: Date.now(), t: B.t, p: B.p, q: B.q, s: B.s }).catch(function () { COL.dirty[k] = 1 }) });
      Object.keys(COL.b).forEach(function (k) { if (COL.b[k].day < dayKey(Date.now() - 2 * 864e5)) delete COL.b[k] }) }, 10 * 6e4);
    return true
  }
  W.FLOW = {
    collect: collect, _col: function () { return COL },
    show: function () {
      if (!RC.done) { RC.done = true; var self = this; VIS = true; rcLoad().then(function () { if (VIS) self.show() }); return }
      ROOT = D.getElementById('flowRoot'); if (!ROOT) return; VIS = true; clearTimeout(HIDE_T);
      if (!ROOT.firstChild) { shell(); D.addEventListener('click', onClick); D.addEventListener('change', onChange); D.addEventListener('fullscreenchange', onFsChange); D.addEventListener('webkitfullscreenchange', onFsChange); D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && V.place) { V.place = false; alRefresh(); return } if (e.key === 'Escape') { var fw = ROOT && ROOT.querySelector('.fw.ffull'); if (fw && !(D.fullscreenElement || D.webkitFullscreenElement)) fullTog() } }); W.addEventListener('resize', function () { DIRTY = true; if (CFG.view === 'opt') optRender() }) }
      if (!M || M.dead) { start(); setTimeout(optLevels, 1500) }
      if (CFG.view === 'opt') optRender();
      DIRTY = true; if (!RAF) loop()
    },
    hide: function () { VIS = false; clearTimeout(HIDE_T); HIDE_T = setTimeout(function () { if (!VIS) stop() }, 20 * 6e4) },
    _m: function () { return M }, _v: V, _cfg: CFG, _xy: function (t, p) { return [xOfT(t), yOf(p)] }
  };
})();
