/* Ημερολόγιο Συναλλαγών — έκδοση Vercel.
   Η σελίδα γράφτηκε για το claude.ai, που της δίνει το window.claude (db, user, sample, mcp).
   Εδώ φτιάχνουμε το ίδιο window.claude πάνω σε:
     db     → Firebase Firestore (κοινή βάση της ομάδας)
     user   → Firebase Auth (Google ή email/κωδικός)
     sample → /api/ai (Claude μέσω του Anthropic API, με το κλειδί στο Vercel)
     mcp    → /api/mcp (δημόσιες τιμές Crypto.com / CoinGecko και ειδήσεις)
   Μέσα στο claude.ai το αρχείο δεν κάνει τίποτα. */
(function () {
  'use strict';
  if (window.claude && window.claude.use) return;

  var BOT = window.__TJ_BOT || null; /* ο αυτόματος «φύλακας» (GitHub Actions) περνάει εδώ τα στοιχεία του */
  var Q = new URLSearchParams(location.search);
  /* μέχρι να επιβεβαιωθεί εγκεκριμένο μέλος, η σελίδα μένει κρυμμένη πίσω από μαύρη οθόνη */
  if (!BOT) { try { document.documentElement.classList.add('tj-lock'); var lk = document.createElement('style'); lk.id = 'tj-lock-css'; lk.textContent = 'html.tj-lock body>*:not(#tj-login):not(#tj-msg){visibility:hidden!important}html.tj-lock,html.tj-lock body{background:#000!important}html.tj-lock::after{content:"🔐 ΕΛΕΓΧΟΣ ΠΡΟΣΒΑΣΗΣ…";position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99998;font:700 13px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;color:#00e5ff;text-shadow:0 0 12px rgba(0,229,255,.6);padding:14px 18px 14px 44px;border:1px solid rgba(0,229,255,.35);border-radius:10px;background:radial-gradient(circle at 22px 50%,transparent 7px,rgba(0,229,255,.9) 8px,transparent 9px) no-repeat,rgba(4,10,16,.9);animation:tjpulse 1.2s ease-in-out infinite}html.tj-lock:has(#tj-login)::after{display:none}@keyframes tjpulse{50%{opacity:.45}}'; (document.head || document.documentElement).appendChild(lk) } catch (e) {} }
  function unlock() { try { document.documentElement.classList.remove('tj-lock') } catch (e) {} }
  var log = function () { try { console.log.apply(console, ['[tj]'].concat([].slice.call(arguments))) } catch (e) {} };

  /* ---------- ρυθμίσεις & Firebase ---------- */
  var cfgNet = fetch('/api/config', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (c) { try { if (c && c.firebase && c.firebase.apiKey) localStorage.setItem('tj-cfg', JSON.stringify(c)) } catch (e) {} return c }).catch(function () { return {} });
  var cfgC = null; try { cfgC = JSON.parse(localStorage.getItem('tj-cfg') || 'null') } catch (e) {}
  var cfgP = cfgC && cfgC.firebase && cfgC.firebase.apiKey ? Promise.resolve(cfgC) : cfgNet;
  var appP = cfgP.then(function (c) {
    if (!c || !c.firebase || !c.firebase.apiKey) throw { code: 'not_configured', message: 'Λείπει το FIREBASE_CONFIG στο Vercel' };
    if (!window.firebase) throw { code: 'not_configured', message: 'Δεν φορτώθηκε το Firebase' };
    firebase.initializeApp(c.firebase);
    try { firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function () {}) } catch (e) {}
    var fs = firebase.firestore();
    try { fs.settings({ ignoreUndefinedProperties: true, merge: true }) } catch (e) {}
    /* τοπικό αντίγραφο της βάσης στον browser: σε κάθε ξαναφόρτωμα διαβάζονται μόνο όσα άλλαξαν (λιγότερες αναγνώσεις στο Firebase) */
    try { fs.enablePersistence({ synchronizeTabs: true }).catch(function () {}) } catch (e) {}
    return { cfg: c, fs: fs, auth: firebase.auth() };
  });
  appP.catch(function (e) { showMsg('⚠️ Η σελίδα δεν έχει ρυθμιστεί ακόμα: ' + ((e && e.message) || e)) });

  var authP = appP.then(function (a) {
    return new Promise(function (res) {
      var tried = false;
      a.auth.onAuthStateChanged(function (u) {
        if (u) { hideLogin(); res(u); return }
        if (BOT && !tried) {
          tried = true;
          a.auth.signInWithEmailAndPassword(BOT.email, BOT.password).catch(function (e) { log('bot login failed', e && e.code); showMsg('Αποτυχία σύνδεσης bot: ' + (e && e.code)) });
          return;
        }
        if (!BOT) showLogin(a.auth);
      });
    });
  }).then(function (u) {
    return appP.then(function (a) {
      var name = BOT ? (a.cfg.botName || '🤖 Φύλακας') : (u.displayName || (u.email ? u.email.split('@')[0] : 'Μέλος'));
      a.fs.collection('users').doc(u.uid).set({ name: name, avatarUrl: u.photoURL || '', at: Date.now(), bot: !!BOT }, { merge: true }).catch(function () {});
      return u;
    });
  });

  /* ---------- μόνο μέλη, με έγκριση ----------
     Όποιος έχει τη διεύθυνση γράφεται (Google ή email). Αν δεν είναι ακόμα μέλος, στέλνει αίτημα (requests/{uid})
     και περιμένει. Οι διαχειριστές (λίστα στους κανόνες του Firestore) βλέπουν τα αιτήματα και πατούν Έγκριση,
     που γράφει members/{uid}. Οι κανόνες του Firestore είναι αυτοί που πραγματικά κλειδώνουν τα δεδομένα. */
  var ADMIN = false;
  var memberP = authP.then(function (u) {
    try { if (!BOT && localStorage.getItem('tj-ok') === u.uid) unlock() } catch (e) {}
    return appP.then(function (a) {
      return a.fs.collection('meta').doc('wcheck_' + u.uid).set({ at: Date.now() }).then(function () { return true }, function (e) { log('member check', e && e.code); return false })
        .then(function (ok) {
          if (!ok) return false;
          /* είμαι διαχειριστής; (μόνο αυτοί μπορούν να διαβάσουν τα αιτήματα) */
          return a.fs.collection('requests').limit(1).get().then(function () {
            ADMIN = true;
            /* ο διαχειριστής γράφεται και ο ίδιος στα μέλη, για να τον αναγνωρίζει και ο Καθηγητής (/api/ai) */
            return a.fs.collection('members').doc(u.uid).set({ email: (u.email || '').toLowerCase(), name: u.displayName || '', role: 'admin', at: Date.now() }, { merge: true }).catch(function () {}).then(function () { return true });
          }, function () { return true });
        });
    }).then(function (ok) {
      try { if (ok) localStorage.setItem('tj-ok', u.uid); else { localStorage.removeItem('tj-ok'); document.documentElement.classList.add('tj-lock') } } catch (e) {}
      if (ok) return u;
      return appP.then(function (a) { waitApproval(a, u) }).then(function () { return new Promise(function () {}) });
    });
  });
  function boxUI(html) {
    var d = document.getElementById('tj-login'); css();
    if (!d) { d = document.createElement('div'); d.id = 'tj-login'; document.body.appendChild(d) }
    d.innerHTML = tjBg('PENDING APPROVAL') + '<div class="bx">' + html + '<button type="button" class="alt" data-o>Αποσύνδεση</button></div>';
    d.querySelector('[data-o]').onclick = function () { firebase.auth().signOut().then(function () { location.href = location.pathname }) };
    return d;
  }
  function waitApproval(a, u) {
    var go = function () {
      var em = (u.email || '').toLowerCase();
      if (u.providerData && u.providerData.some(function (p) { return p && p.providerId === 'password' }) && !u.emailVerified) {
        var d0 = boxUI('<span class="tjst c">📧 ΕΠΙΒΕΒΑΙΩΣΗ EMAIL</span><h2>Ένα βήμα ακόμα: επιβεβαίωσε το email σου</h2><p>Σου στείλαμε μήνυμα στο <b></b> (από noreply@…firebaseapp.com). <b>Κοίτα και στα Ανεπιθύμητα / Junk</b>, εκεί πάει συχνά στο Hotmail/Outlook. Πάτα τον σύνδεσμο του μηνύματος και η σελίδα θα ανοίξει μόνη της.</p><button type="button" data-c>Συνέχεια</button><button type="button" class="alt" data-r>Στείλε ξανά το μήνυμα</button><div class="err" data-x></div>');
        d0.querySelector('b').textContent = em;
        var poll = setInterval(function () { var cu = firebase.auth().currentUser; if (!cu) { clearInterval(poll); return } cu.reload().then(function () { if (firebase.auth().currentUser && firebase.auth().currentUser.emailVerified) { clearInterval(poll); firebase.auth().currentUser.getIdToken(true).then(function () { location.reload() }) } }).catch(function () {}) }, 4000);
        d0.querySelector('[data-c]').onclick = function () { u.reload().then(function () { if (firebase.auth().currentUser.emailVerified) firebase.auth().currentUser.getIdToken(true).then(function () { location.reload() }); else d0.querySelector('[data-x]').textContent = 'Δεν έχει επιβεβαιωθεί ακόμα.' }) };
        d0.querySelector('[data-r]').onclick = function () { u.sendEmailVerification().then(function () { d0.querySelector('[data-x]').textContent = 'Στάλθηκε ξανά.' }, function (e) { d0.querySelector('[data-x]').textContent = trErr(e) }) };
        if (!sessionStorage.getItem('tj-ver-sent')) { try { sessionStorage.setItem('tj-ver-sent', '1') } catch (e) {} u.sendEmailVerification().catch(function () {}) }
        return;
      }
      var req = a.fs.collection('requests').doc(u.uid);
      var d = boxUI('<span class="tjst a">⏳ ΑΝΑΜΟΝΗ ΕΓΚΡΙΣΗΣ</span><h2>Δεν έχεις ακόμα πρόσβαση</h2><p>Λογαριασμός: <b></b><br>Η πρόσβαση ανοίγει <b>μόνο</b> όταν σε εγκρίνει ο Δημήτρης ή ο Νίκος. Το αίτημά σου στάλθηκε· μόλις εγκριθεί, η σελίδα ανοίγει μόνη της, χωρίς να ξανασυνδεθείς.</p><div class="err" data-x></div>');
      d.querySelector('b').textContent = em || u.uid;
      req.get().then(function (sn) {
        var x = sn.exists ? sn.data() : null;
        if (x && x.status === 'rejected') { d.querySelector('h2').textContent = '🚫 Το αίτημα δεν εγκρίθηκε'; var st0 = d.querySelector('.tjst'); if (st0) { st0.className = 'tjst r'; st0.textContent = '⛔ ACCESS DENIED' } d.querySelector('p').textContent = 'Οι διαχειριστές δεν ενέκριναν το ' + (em || 'αίτημα') + '. Αν είναι λάθος, μίλα τους.'; return }
        if (!x) return req.set({ email: em, name: u.displayName || (em.split('@')[0]) || '', photo: u.photoURL || '', at: Date.now() });
      }).catch(function (e) { d.querySelector('[data-x]').textContent = 'Δεν στάλθηκε το αίτημα (' + (e && e.code) + ').' });
      a.fs.collection('members').doc(u.uid).onSnapshot(function (sn) { if (sn.exists) location.reload() }, function () {});
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  /* ---------- διαχείριση μελών (μόνο για διαχειριστές) ---------- */
  function adminUI(a, me, host) {
    var REQ = [], MEM = [], badge = document.createElement('button');
    badge.type = 'button'; badge.id = 'tj-req'; badge.hidden = true;
    badge.style.cssText = 'margin-left:6px;border:0;border-radius:999px;background:#c2410c;color:#fff;font:inherit;font-size:.78rem;font-weight:700;padding:4px 10px;cursor:pointer';
    host.appendChild(badge);
    var draw = function () { badge.hidden = !REQ.length; badge.textContent = '👥 ' + REQ.length + (REQ.length === 1 ? ' αίτημα' : ' αιτήματα'); var pn = document.getElementById('tj-mem'); if (pn) panel() };
    a.fs.collection('requests').onSnapshot(function (qs) { REQ = []; qs.forEach(function (d) { var x = d.data() || {}; if (x.status !== 'rejected') REQ.push(Object.assign({ id: d.id }, x)) }); draw() }, function () {});
    a.fs.collection('members').onSnapshot(function (qs) { MEM = []; qs.forEach(function (d) { MEM.push(Object.assign({ id: d.id }, d.data() || {})) }); draw() }, function () {});
    var esc = function (t) { return String(t || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    function panel() {
      var d = document.getElementById('tj-mem');
      if (!d) { d = document.createElement('div'); d.id = 'tj-mem'; document.body.appendChild(d) }
      var st = '#tj-mem{position:fixed;inset:0;z-index:99998;background:rgba(8,16,16,.7);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto;font-family:system-ui,sans-serif}#tj-mem .bx{background:#fff;color:#10201f;border-radius:14px;max-width:560px;width:100%;padding:18px;margin:30px 0}#tj-mem h2{margin:0 0 6px;font-size:1.15rem}#tj-mem h3{margin:14px 0 6px;font-size:.95rem}#tj-mem .r{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #e1ebea;border-radius:10px;margin:6px 0}#tj-mem .r div{flex:1;min-width:0}#tj-mem .r small{display:block;color:#667;overflow:hidden;text-overflow:ellipsis}#tj-mem button{border:0;border-radius:8px;padding:7px 10px;font:inherit;font-size:.85rem;cursor:pointer}#tj-mem .ok{background:#0d6b66;color:#fff}#tj-mem .no{background:#fdecec;color:#a52a2a}#tj-mem .x{float:right;background:#eef3f2}#tj-mem p{color:#556;font-size:.88rem}';
      d.innerHTML = '<style>' + st + '</style><div class="bx"><button type="button" class="x" data-close>✕</button><h2>👥 Μέλη της παρέας</h2><p>Όποιος έχει τη διεύθυνση μπορεί να γραφτεί· μπαίνει μόνο όταν τον εγκρίνει διαχειριστής.</p>' +
        '<h3>Αιτήματα (' + REQ.length + ')</h3>' + (REQ.length ? REQ.map(function (r) { return '<div class="r"><div><b>' + esc(r.name || r.email) + '</b><small>' + esc(r.email) + ' · ' + new Date(r.at || 0).toLocaleString('el-GR') + '</small></div><button type="button" class="ok" data-ok="' + esc(r.id) + '">✅ Έγκριση</button><button type="button" class="no" data-no="' + esc(r.id) + '">❌</button></div>' }).join('') : '<p>Κανένα αίτημα.</p>') +
        '<h3>Μέλη (' + MEM.length + ')</h3>' + MEM.map(function (m) { return '<div class="r"><div><b>' + esc(m.name || m.email) + (m.role === 'admin' ? ' · διαχειριστής' : '') + (m.id === me.uid ? ' (εσύ)' : '') + '</b><small>' + esc(m.email) + '</small></div>' + (m.role === 'admin' ? '' : '<button type="button" class="no" data-rm="' + esc(m.id) + '">Αφαίρεση</button>') + '</div>' }).join('') + '</div>';
      d.querySelector('[data-close]').onclick = function () { d.remove() };
      d.onclick = function (e) { if (e.target === d) d.remove() };
      d.querySelectorAll('[data-ok]').forEach(function (b) { b.onclick = function () { var r = REQ.find(function (x) { return x.id === b.getAttribute('data-ok') }); if (!r) return; b.disabled = true; a.fs.collection('members').doc(r.id).set({ email: r.email || '', name: r.name || '', role: 'member', at: Date.now(), by: me.uid }).then(function () { return a.fs.collection('requests').doc(r.id).delete() }).catch(function (e) { alert('Δεν έγινε: ' + (e && e.code)) }) } });
      d.querySelectorAll('[data-no]').forEach(function (b) { b.onclick = function () { if (!confirm('Απόρριψη του αιτήματος;')) return; a.fs.collection('requests').doc(b.getAttribute('data-no')).set({ status: 'rejected', at: Date.now() }, { merge: true }).catch(function (e) { alert('Δεν έγινε: ' + (e && e.code)) }) } });
      d.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { var m = MEM.find(function (x) { return x.id === b.getAttribute('data-rm') }); if (!m || !confirm('Να αφαιρεθεί το ' + (m.email || m.name) + ' από την παρέα;')) return; a.fs.collection('members').doc(m.id).delete().catch(function (e) { alert('Δεν έγινε: ' + (e && e.code)) }) } });
    }
    badge.onclick = panel;
    return panel;
  }

  /* ---------- οθόνη σύνδεσης ---------- */
  var LG = null;
  function css() {
    if (document.getElementById('tj-login-css')) return;
    var s = document.createElement('style'); s.id = 'tj-login-css';
    s.textContent = '#tj-login{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#000;padding:16px;font-family:system-ui,sans-serif;overflow:hidden;color:#cfe9ff}' +
      '#tj-login .tjbg{position:absolute;inset:0;pointer-events:none;overflow:hidden}' +
      '#tj-login .tjgrid{position:absolute;left:-50%;right:-50%;bottom:-10%;height:70%;background-image:linear-gradient(rgba(255,40,60,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,40,60,.35) 1px,transparent 1px);background-size:60px 60px;transform:perspective(420px) rotateX(62deg);transform-origin:center top;animation:tjgrid 3.5s linear infinite;mask-image:linear-gradient(to top,#000 10%,transparent 90%);-webkit-mask-image:linear-gradient(to top,#000 10%,transparent 90%)}' +
      '@keyframes tjgrid{to{background-position:0 60px}}' +
      '#tj-login .tjrows{position:absolute;inset:-10% -10%;display:flex;flex-direction:column;justify-content:space-around;transform:rotate(-8deg);opacity:.16}' +
      '#tj-login .tjrows div{white-space:nowrap;font:800 clamp(16px,3vw,30px)/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.25em;color:#ff2846;animation:tjscroll 28s linear infinite}#tj-login .tjrows div:nth-child(2n){animation-direction:reverse;color:#00e5ff;opacity:.7}' +
      '@keyframes tjscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      '#tj-login .tj403{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font:900 clamp(140px,30vw,380px)/1 ui-monospace,Menlo,Consolas,monospace;color:transparent;-webkit-text-stroke:2px rgba(255,40,60,.5);text-shadow:0 0 40px rgba(255,40,60,.35);animation:tjglitch 4s infinite steps(1)}' +
      '#tj-login .tj403::after{content:attr(data-t);position:absolute;left:0;top:0;-webkit-text-stroke:2px rgba(0,229,255,.45);clip-path:inset(40% 0 45% 0);transform:translateX(6px);animation:tjglitch2 2.7s infinite steps(1)}' +
      '@keyframes tjglitch{0%,92%,100%{transform:translate(-50%,-50%)}93%{transform:translate(-49%,-51%) skewX(6deg)}95%{transform:translate(-51%,-49%)}}@keyframes tjglitch2{0%,88%,100%{clip-path:inset(40% 0 45% 0)}90%{clip-path:inset(10% 0 70% 0);transform:translateX(-8px)}94%{clip-path:inset(70% 0 10% 0)}}' +
      '#tj-login .tjscan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);animation:tjflick 6s infinite}@keyframes tjflick{0%,97%,100%{opacity:1}98%{opacity:.6}}' +
      '#tj-login .tjvig{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.9) 85%)}' +
      '#tj-login .bx{position:relative;z-index:2;background:rgba(4,10,16,.86);color:#d7ecff;border:1px solid rgba(0,229,255,.45);border-radius:14px;max-width:380px;width:100%;padding:22px;box-shadow:0 0 0 1px rgba(255,40,60,.15),0 0 40px rgba(0,229,255,.18),inset 0 0 30px rgba(0,229,255,.06);backdrop-filter:blur(6px)}' +
      '#tj-login .bx::before{content:"// SECURE TERMINAL · AUTH REQUIRED";display:block;font:700 .68rem ui-monospace,Menlo,monospace;letter-spacing:.14em;color:#ff4d63;margin-bottom:10px}' +
      '#tj-login .tjst{display:inline-block;font:800 .72rem ui-monospace,Menlo,monospace;letter-spacing:.12em;padding:3px 8px;border-radius:6px;margin-bottom:8px;border:1px solid currentColor}#tj-login .tjst.r{color:#ff4d63}#tj-login .tjst.a{color:#ffc443}#tj-login .tjst.c{color:#00e5ff}' +
      '#tj-login h2{margin:0 0 6px;font-size:1.25rem;color:#fff}#tj-login p{margin:0 0 14px;color:#8fb3c9;font-size:.92rem;line-height:1.45}#tj-login p b{color:#fff}' +
      '#tj-login button{width:100%;padding:11px;border-radius:10px;border:1px solid rgba(0,229,255,.6);background:linear-gradient(180deg,#0a8fa6,#06606f);color:#fff;font-size:1rem;font-weight:700;cursor:pointer;margin-top:6px;box-shadow:0 0 16px rgba(0,229,255,.25)}' +
      '#tj-login button.alt{background:transparent;color:#bfe9ff;border-color:rgba(191,233,255,.3);box-shadow:none}#tj-login input{width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:1px solid rgba(0,229,255,.3);background:#02070b;color:#e6f6ff;margin-top:6px;font-size:1rem}' +
      '#tj-login .err{color:#ff6b7d;font-size:.88rem;margin-top:8px;min-height:1em}#tj-login hr{border:0;border-top:1px solid rgba(0,229,255,.18);margin:14px 0}' +
      '#tj-msg{position:fixed;left:12px;right:12px;bottom:12px;z-index:99998;background:#9a5a12;color:#fff;padding:10px 12px;border-radius:10px;font:14px system-ui}';
    document.head.appendChild(s);
  }
  function tjBg(word) { var row = Array(8).join('ACCESS DENIED · 403 FORBIDDEN · ΑΠΑΓΟΡΕΥΕΤΑΙ Η ΠΡΟΣΒΑΣΗ · ' + (word || 'UNAUTHORIZED') + ' · '); var rows = ''; for (var i = 0; i < 9; i++) rows += '<div>' + row + row + '</div>'; return '<div class="tjbg"><div class="tjrows">' + rows + '</div><div class="tj403" data-t="403">403</div><div class="tjgrid"></div><div class="tjscan"></div><div class="tjvig"></div></div>' }
  function showMsg(t) { var go = function () { css(); var m = document.getElementById('tj-msg'); if (!m) { m = document.createElement('div'); m.id = 'tj-msg'; document.body.appendChild(m) } m.textContent = t }; if (document.body) go(); else document.addEventListener('DOMContentLoaded', go) }
  function hideLogin() { if (LG) { LG.remove(); LG = null } }
  function showLogin(auth) {
    var go = function () {
      if (LG) return; css();
      LG = document.createElement('div'); LG.id = 'tj-login';
      LG.innerHTML = tjBg() + '<div class="bx"><span class="tjst r">⛔ ΠΕΡΙΟΡΙΣΜΕΝΗ ΠΡΟΣΒΑΣΗ</span><h2>📒 Ημερολόγιο Συναλλαγών</h2><p>Ιδιωτικός χώρος. Μπαίνουν μόνο μέλη που έχουν <b>εγκριθεί από τους διαχειριστές</b>. Συνδέσου ή φτιάξε λογαριασμό για να στείλεις αίτημα.</p>' +
        '<button type="button" data-g>Σύνδεση με Google</button><hr>' +
        '<input type="email" placeholder="email" autocomplete="username" data-e><input type="password" placeholder="κωδικός" autocomplete="current-password" data-p>' +
        '<button type="button" class="alt" data-l>Σύνδεση με email</button><button type="button" class="alt" data-r>Νέος λογαριασμός με email</button><div class="err" data-x></div></div>';
      document.body.appendChild(LG);
      var err = function (e) { LG && (LG.querySelector('[data-x]').textContent = trErr(e)) };
      LG.querySelector('[data-g]').onclick = function () {
        var p = new firebase.auth.GoogleAuthProvider(); try { p.setCustomParameters({ prompt: 'select_account' }) } catch (e) {}
        auth.signInWithPopup(p).catch(function (e) { if (e && /popup/.test(e.code || '')) return auth.signInWithRedirect(p); err(e) });
      };
      var ep = function () { return [LG.querySelector('[data-e]').value.trim(), LG.querySelector('[data-p]').value] };
      LG.querySelector('[data-l]').onclick = function () { var v = ep(); auth.signInWithEmailAndPassword(v[0], v[1]).catch(err) };
      LG.querySelector('[data-r]').onclick = function () { var v = ep(); auth.createUserWithEmailAndPassword(v[0], v[1]).then(function (c) { try { sessionStorage.setItem('tj-ver-sent', '1') } catch (e) {} return c.user.sendEmailVerification() }).catch(err) };
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }
  function trErr(e) {
    var c = (e && e.code) || '';
    if (/wrong-password|invalid-credential|user-not-found/.test(c)) return 'Λάθος email ή κωδικός.';
    if (/weak-password/.test(c)) return 'Ο κωδικός θέλει τουλάχιστον 6 χαρακτήρες.';
    if (/email-already/.test(c)) return 'Υπάρχει ήδη λογαριασμός με αυτό το email.';
    if (/invalid-email/.test(c)) return 'Το email δεν είναι σωστό.';
    if (/unauthorized-domain/.test(c)) return 'Πρόσθεσε αυτό το domain στο Firebase → Authentication → Settings → Authorized domains.';
    return 'Δεν έγινε η σύνδεση (' + c + ').';
  }

  /* ---------- db: Firestore με το ίδιο API που περιμένει η σελίδα ----------
     Το Firestore δεν δέχεται πίνακες μέσα σε πίνακες (π.χ. κεριά [[t,o,h,l,c,v],…]),
     οπότε τους τυλίγω αθόρυβα σε {__a:[…]} στην εγγραφή και τους ξετυλίγω στην ανάγνωση. */
  function isPlain(v) { return v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype }
  function enc(v) {
    if (Array.isArray(v)) return v.map(function (x) { return Array.isArray(x) ? { __a: enc(x) } : enc(x) });
    if (isPlain(v)) { var o = {}; for (var k in v) { if (v[k] === undefined || typeof v[k] === 'function') continue; o[k === '' ? '__empty' : k] = enc(v[k]) } return o }
    if (v instanceof Date) return v.getTime();
    return v;
  }
  function dec(v) {
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === 'object') {
      if (typeof v.toMillis === 'function') return v.toMillis();
      var ks = Object.keys(v);
      if (ks.length === 1 && ks[0] === '__a' && Array.isArray(v.__a)) return dec(v.__a);
      var o = {}; ks.forEach(function (k) { o[k === '__empty' ? '' : k] = dec(v[k]) }); return o;
    }
    return v;
  }
  function DS(s) { this._s = s; this.id = s.id; this.exists = s.exists; this.metadata = s.metadata; this.ref = new DR(s.ref); this._d = null }
  DS.prototype.data = function () { if (!this.exists) return undefined; return dec(this._s.data()) };
  DS.prototype.get = function (f) { var d = this.data(); return d ? d[f] : undefined };
  function QS(s) { this._s = s; this.docs = s.docs.map(function (d) { return new DS(d) }); this.size = s.size; this.empty = s.empty; this.metadata = s.metadata }
  QS.prototype.forEach = function (f, t) { this.docs.forEach(f, t) };
  function DR(r) { this._r = r; this.id = r.id; this.path = r.path }
  DR.prototype.set = function (d, o) { return o ? this._r.set(enc(d), o) : this._r.set(enc(d)) };
  DR.prototype.update = function (d) { return this._r.update(enc(d)) };
  DR.prototype.delete = function () { return this._r.delete() };
  DR.prototype.get = function () { return this._r.get().then(function (s) { return new DS(s) }) };
  DR.prototype.onSnapshot = function (a, b) { var ok = typeof a === 'function' ? a : a && a.next, er = typeof a === 'function' ? b : a && a.error; return this._r.onSnapshot(function (s) { ok && ok(new DS(s)) }, function (e) { log('snapshot error', e && e.code); er && er(e) }) };
  DR.prototype.collection = function (p) { return new CQ(this._r.collection(p)) };
  function CQ(q) { this._q = q; if (q.id) { this.id = q.id; this.path = q.path } }
  CQ.prototype.doc = function (id) { return new DR(id == null ? this._q.doc() : this._q.doc(String(id))) };
  CQ.prototype.add = function (d) { return this._q.add(enc(d)).then(function (r) { return new DR(r) }) };
  ['where', 'orderBy', 'limit', 'limitToLast', 'startAt', 'startAfter', 'endAt', 'endBefore'].forEach(function (m) { CQ.prototype[m] = function () { return new CQ(this._q[m].apply(this._q, arguments)) } });
  CQ.prototype.get = function () { return this._q.get().then(function (s) { return new QS(s) }) };
  CQ.prototype.onSnapshot = function (a, b) { var ok = typeof a === 'function' ? a : a && a.next, er = typeof a === 'function' ? b : a && a.error; return this._q.onSnapshot(function (s) { ok && ok(new QS(s)) }, function (e) { log('snapshot error', e && e.code); er && er(e) }) };
  function DB(fs) { this._fs = fs }
  DB.prototype.collection = function (p) { return new CQ(this._fs.collection(p)) };
  DB.prototype.doc = function (p) { return new DR(this._fs.doc(p)) };
  /* transactions: ίδιο API με το Firestore, με τα ίδια enc/dec. Χωρίς σύνδεση αποτυγχάνουν (δεν μπαίνουν σε ουρά). */
  DB.prototype.runTransaction = function (fn) {
    return this._fs.runTransaction(function (tx) {
      var T = {
        get: function (r) { return tx.get(r._r).then(function (s) { return new DS(s) }) },
        set: function (r, d, o) { if (o) tx.set(r._r, enc(d), o); else tx.set(r._r, enc(d)); return T },
        update: function (r, d) { tx.update(r._r, enc(d)); return T },
        delete: function (r) { tx.delete(r._r); return T }
      };
      return fn(T);
    });
  };

  /* ---------- user ---------- */
  var canP = null;
  function user(a, u) {
    return {
      id: function () { return Promise.resolve(u.uid) },
      can: function () {
        if (!canP) canP = a.fs.collection('meta').doc('wcheck_' + u.uid).set({ at: Date.now() }).then(function () { return true }).catch(function (e) { log('write check', e && e.code); return false });
        return canP;
      },
      profiles: function (ids) {
        ids = (ids || []).filter(function (x) { return x && x !== 'me' && x !== 'prof' }).map(String);
        var out = {}, ch = [];
        for (var i = 0; i < ids.length; i += 10) ch.push(ids.slice(i, i + 10));
        return Promise.all(ch.map(function (c) {
          return a.fs.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', c).get().then(function (s) { s.forEach(function (d) { var x = d.data() || {}; out[d.id] = { name: x.name || '', avatarUrl: x.avatarUrl || '' } }) }).catch(function () {});
        })).then(function () { return out });
      },
      signOut: function () { return a.auth.signOut().then(function () { location.reload() }) }
    };
  }

  /* ---------- sample: ο Καθηγητής (Claude μέσω /api/ai) ---------- */
  function token() { return appP.then(function (a) { var u = a.auth.currentUser; return u ? u.getIdToken() : '' }) }
  function blobB64(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { var s = String(r.result); res({ media_type: b.type || 'image/png', data: s.slice(s.indexOf(',') + 1) }) }; r.onerror = rej; r.readAsDataURL(b) }) }
  function toMsgs(m) {
    if (typeof m === 'string') return [{ role: 'user', content: m }];
    return (m || []).map(function (x) { return { role: x.role === 'assistant' ? 'assistant' : 'user', content: typeof x.content === 'string' ? x.content : x.content } });
  }
  function aiCall(body, signal) {
    return token().then(function (t) {
      return fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify(body), signal: signal });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw (j.error || { code: r.status === 429 ? 'rate_limited' : 'upstream_error' }); return j }) });
  }
  function runSample(msgs, opt) {
    opt = opt || {};
    var M = toMsgs(msgs), tools = (opt.tools || []).filter(function (t) { return t && t.name }), schema = tools.map(function (t) { return { name: t.name, description: t.description || '', input_schema: t.inputSchema || t.input_schema || { type: 'object', properties: {} } } });
    var imgP = opt.images && opt.images.length ? Promise.all(opt.images.slice(0, 4).map(blobB64)) : Promise.resolve([]);
    return imgP.then(function (imgs) {
      if (imgs.length) {
        var last = M[M.length - 1], txt = typeof last.content === 'string' ? last.content : '';
        last.content = imgs.map(function (i) { return { type: 'image', source: { type: 'base64', media_type: i.media_type, data: i.data } } }).concat([{ type: 'text', text: txt }]);
      }
      var steps = 0;
      var loop = function () {
        steps++;
        return aiCall({ messages: M, tools: schema, tier: opt.modelTier || 'default', effort: opt.effort || null, json: !!opt.__json }, opt.signal).then(function (r) {
          var content = r.content || [], uses = content.filter(function (b) { return b.type === 'tool_use' });
          if (uses.length && steps < 10) {
            M.push({ role: 'assistant', content: content });
            return Promise.all(uses.map(function (u) {
              var t = tools.find(function (x) { return x.name === u.name });
              return Promise.resolve().then(function () { if (!t || !t.execute) throw new Error('unknown tool ' + u.name); return t.execute(u.input || {}) })
                .then(function (out) { return { type: 'tool_result', tool_use_id: u.id, content: typeof out === 'string' ? out : JSON.stringify(out) } })
                .catch(function (e) { return { type: 'tool_result', tool_use_id: u.id, is_error: true, content: String((e && e.message) || e) } });
            })).then(function (res) { M.push({ role: 'user', content: res }); return loop() });
          }
          var text = content.filter(function (b) { return b.type === 'text' }).map(function (b) { return b.text }).join('');
          try { opt.onText && opt.onText({ text: text }) } catch (e) {}
          return { text: text, stopReason: r.stop_reason };
        });
      };
      return loop();
    });
  }
  function parseJson(t) {
    t = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try { return JSON.parse(t) } catch (e) {}
    var a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) } catch (e) {} }
    a = t.indexOf('['); b = t.lastIndexOf(']');
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)) } catch (e) {} }
    throw { code: 'invalid_json', message: 'Η απάντηση δεν ήταν JSON' };
  }
  function sampleApi() {
    var f = function (m, o) { return runSample(m, o) };
    f.json = function (m, o) {
      o = Object.assign({}, o || {}, { __json: true });
      var M = toMsgs(m), last = M[M.length - 1];
      if (typeof last.content === 'string') last.content += '\n\nΑπάντησε ΜΟΝΟ με έγκυρο JSON, χωρίς κείμενο πριν ή μετά.';
      return runSample(M, o).then(function (r) { return parseJson(r.text) });
    };
    f.limits = function () { return Promise.resolve({ tools: { maxCount: 12 }, images: { mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'], maxCount: 4 } }) };
    return f;
  }

  /* ---------- mcp: τιμές & ειδήσεις μέσω /api/mcp ---------- */
  var MC = {};
  function mcpCall(server, tool, args, opt) {
    var key = server + '|' + tool + '|' + JSON.stringify(args || {}), st = opt && opt.cache && opt.cache.staleTime || 0, c = MC[key];
    if (c && c.val && Date.now() - c.at < st) return Promise.resolve(c.val);
    if (c && c.p) return c.p;
    var u = '/api/mcp?s=' + encodeURIComponent(server) + '&t=' + encodeURIComponent(tool) + '&a=' + encodeURIComponent(JSON.stringify(args || {}));
    var p = fetch(u, { signal: opt && opt.signal }).then(function (r) { return r.json().catch(function () { return { ok: false, code: 'upstream_error' } }) }).then(function (j) {
      if (!j || !j.ok) throw { code: (j && j.code) || 'tool_error', message: (j && j.message) || '' };
      var v = { payload: j.payload, cache: { storedAt: j.at || Date.now() } };
      MC[key] = { at: Date.now(), val: v }; return v;
    }, function (e) { if (e && e.name === 'AbortError') throw e; throw { code: e && e.code || 'server_unavailable', message: String(e && e.message || e) } });
    MC[key] = { at: c ? c.at : 0, val: c && c.val, p: p };
    p.then(null, function () { if (MC[key] && MC[key].p === p) MC[key].p = null });
    p.then(function () { if (MC[key]) MC[key].p = null });
    return p;
  }
  var TOOLS = {
    'CoinGecko': ['get-coin-markets', 'get-coin-market-chart', 'get-global-market', 'get-crypto-news'],
    'Crypto.com': ['get_candlestick', 'get_ticker', 'get_tickers']
  };
  function mcpApi() {
    return {
      callTool: function (s, t, a, o) {
        if (!TOOLS[s]) return Promise.reject({ code: 'server_not_found' });
        return mcpCall(s, t, a, o);
      },
      listTools: function () { return Promise.resolve({ servers: Object.keys(TOOLS).map(function (s) { return { server: s, authStatus: 'connected', tools: TOOLS[s].map(function (n) { return { name: n } }) } }) }) },
      watchTool: function (s, t, a, cb, o) {
        var dead = false, iv = (o && o.refetchInterval) || 60000, tm = null;
        var run = function () {
          if (dead) return;
          mcpCall(s, t, a, { cache: { staleTime: Math.min(iv - 1000, (o && o.cache && o.cache.staleTime) || 0) } })
            .then(function (r) { if (!dead) cb({ type: 'data', result: r }) }, function (e) { if (!dead) cb({ type: 'error', error: e }) })
            .then(function () { if (!dead) tm = setTimeout(run, iv) });
        };
        setTimeout(run, 0);
        var off = function () { dead = true; clearTimeout(tm) }; off.unsubscribe = off; return off;
      }
    };
  }

  /* ---------- assets: φωτογραφίες/αρχεία του chat και των συναλλαγών, μέσα στο Firestore ----------
     Στο claude.ai τα κρατούσε το ίδιο το claude.ai και τα σέρβιρε στο /_blob/<id>. Εδώ τα σπάω σε κομμάτια
     στη συλλογή «blobs» και τα δείχνω στη σελίδα με τοπικά blob: URLs (μόνο για συνδεδεμένα μέλη). */
  var BLOB_MAX = 4 * 1024 * 1024, CH = 700000, BURL = {}, BREQ = {};
  function assetsApi(a) {
    return {
      upload: function (blob, o) {
        if (!blob || blob.size > BLOB_MAX) return Promise.reject({ code: 'too_large', message: 'Μέχρι 4MB ανά αρχείο' });
        var id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), type = (o && o.type) || blob.type || 'application/octet-stream';
        return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result)) }; r.onerror = rej; r.readAsDataURL(blob) }).then(function (du) {
          var b64 = du.slice(du.indexOf(',') + 1), parts = [];
          for (var i = 0; i < b64.length; i += CH) parts.push(b64.slice(i, i + CH));
          var col = a.fs.collection('blobs');
          return Promise.all(parts.map(function (d, i) { return col.doc(id + '_' + i).set({ d: d }) })).then(function () {
            return col.doc(id).set({ type: type, n: parts.length, size: blob.size, at: Date.now() });
          }).then(function () { try { BURL[id] = URL.createObjectURL(blob) } catch (e) {} return { id: id, url: '/_blob/' + id } });
        });
      },
      delete: function (id) {
        var col = a.fs.collection('blobs');
        return col.doc(id).get().then(function (s) { var n = (s.exists && s.data().n) || 0, L = [col.doc(id).delete()]; for (var i = 0; i < n; i++) L.push(col.doc(id + '_' + i).delete()); return Promise.all(L) });
      }
    };
  }
  function blobUrl(a, id) {
    if (BURL[id]) return Promise.resolve(BURL[id]);
    if (BREQ[id]) return BREQ[id];
    var col = a.fs.collection('blobs');
    BREQ[id] = col.doc(id).get().then(function (s) {
      if (!s.exists) return null;
      var m = s.data();
      return Promise.all(Array.from({ length: m.n || 0 }, function (_, i) { return col.doc(id + '_' + i).get() })).then(function (ps) {
        var b64 = ps.map(function (p) { return (p.data() || {}).d || '' }).join(''), bin = atob(b64), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return (BURL[id] = URL.createObjectURL(new Blob([u8], { type: m.type || 'application/octet-stream' })));
      });
    }).catch(function (e) { log('blob', id, e && e.code); return null });
    return BREQ[id];
  }
  memberP.then(function () { return appP }).then(function (a) {
    var fix = function (el) {
      var attr = el.tagName === 'A' ? 'href' : 'src', v = el.getAttribute(attr) || '', m = v.match(/^\/_blob\/([A-Za-z0-9_-]+)/);
      if (!m || el.__tjb === v) return; el.__tjb = v;
      blobUrl(a, m[1]).then(function (u) {
        if (u) { el.setAttribute(attr, u); el.__tjb = u }
        else if (el.tagName === 'IMG') { el.removeAttribute('src'); el.alt = '🖼️ (η εικόνα έμεινε στο claude.ai)'; el.title = el.alt; el.style.minHeight = '2em' }
        else { el.removeAttribute('href'); el.title = 'Το αρχείο έμεινε στο claude.ai' }
      });
    };
    var scan = function (root) { (root.querySelectorAll ? root : document).querySelectorAll('img[src^="/_blob/"],a[href^="/_blob/"]').forEach(fix) };
    var go = function () { scan(document); new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'attributes') fix(m.target); else m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (/^(IMG|A)$/.test(n.tagName)) fix(n); scan(n) } }) }) }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href'] }) };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  });

  /* κείμενα της σελίδας που αναφέρονται στο claude.ai → σωστή πηγή στο Vercel */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('p,small,span,div').forEach(function (el) {
      if (el.children.length === 0 && /μέσω των συνδέσεων του κάθε μέλους στο claude\.ai/.test(el.textContent))
        el.textContent = el.textContent.replace(/Κεριά crypto από Crypto\.com και τιμές από CoinGecko, μέσω των συνδέσεων του κάθε μέλους στο claude\.ai\./, 'Κεριά crypto από Crypto.com (ό,τι λείπει από Binance/OKX) και τιμές από CoinGecko. Ενημερώνονται μόνα τους από τον φύλακα.');
    });
  });

  /* ---------- window.claude ---------- */
  var cache = {};
  window.claude = {
    vercel: true,
    use: function (name) {
      if (cache[name]) return cache[name];
      var p;
      if (name === 'db') p = memberP.then(function () { return appP }).then(function (a) { return new DB(a.fs) });
      else if (name === 'user') p = memberP.then(function (u) { return appP.then(function (a) { return user(a, u) }) });
      else if (name === 'sample' && BOT) p = Promise.resolve(null); /* ο φύλακας δεν ξοδεύει AI: όλα του είναι κανόνες */
      else if (name === 'sample') p = memberP.then(function () { return cfgNet.then(function (n) { return n && n.firebase ? n : cfgP }) }).then(function (c) { return c && c.ai ? sampleApi() : null }); /* φρέσκιες ρυθμίσεις: αλλιώς ένα νέο κλειδί AI φαίνεται μόνο στη 2η ανανέωση */
      else if (name === 'mcp') p = Promise.resolve(mcpApi());
      else if (name === 'assets') p = memberP.then(function () { return appP }).then(function (a) { return assetsApi(a) });
      else p = Promise.reject({ code: 'not_granted' });
      cache[name] = p; return p;
    }
  };
  /* ---------- λογαριασμός: ποιος είναι συνδεδεμένος + αποσύνδεση ---------- */
  if (!BOT) memberP.then(function (u) { unlock(); acctUI(u) });
  function acctUI(u) {
    var put = function () {
      var host = document.querySelector('header.top .brand') || document.body;
      if (document.getElementById('tj-acct')) return;
      var st = document.createElement('style');
      st.textContent = '#tj-acct{position:relative;display:inline-flex;align-items:center;margin-left:8px;vertical-align:middle}' +
        '#tj-acct>button{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(127,160,155,.35);background:rgba(127,160,155,.12);color:inherit;border-radius:999px;padding:3px 10px 3px 3px;font:inherit;font-size:.82rem;cursor:pointer;max-width:220px}' +
        '#tj-acct img,#tj-acct .av{width:24px;height:24px;border-radius:50%;flex:none;object-fit:cover}#tj-acct .av{display:inline-flex;align-items:center;justify-content:center;background:#0d6b66;color:#fff;font-weight:700;font-size:.8rem}' +
        '#tj-acct .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
        '#tj-acct .menu{position:absolute;top:calc(100% + 6px);left:0;z-index:9999;min-width:250px;background:#fff;color:#10201f;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.3);padding:12px;font-size:.9rem}' +
        '#tj-acct .menu[hidden]{display:none}#tj-acct .menu b{display:block;font-size:.98rem}#tj-acct .menu small{display:block;color:#556665;margin:2px 0 10px;word-break:break-all}' +
        '#tj-acct .menu button{display:block;width:100%;text-align:left;padding:9px 10px;border-radius:8px;border:0;background:#f1f6f5;color:#10201f;font:inherit;cursor:pointer;margin-top:6px}#tj-acct .menu button:hover{background:#e3eeec}#tj-acct .menu .out{background:#fdecec;color:#a52a2a}' +
        '@media (max-width:640px){#tj-acct .nm{display:none}#tj-acct>button{padding:3px}#tj-acct .menu{position:fixed;left:12px;right:12px;top:60px;min-width:0}}';
      document.head.appendChild(st);
      var w = document.createElement('span'); w.id = 'tj-acct';
      var prov = (u.providerData || []).map(function (p) { return p && p.providerId }).indexOf('google.com') >= 0 ? 'Google' : 'email και κωδικό';
      var nm = u.displayName || (u.email || '').split('@')[0] || 'Λογαριασμός';
      w.innerHTML = '<button type="button" aria-haspopup="true" title="Ο λογαριασμός σου"></button><div class="menu" hidden><b></b><small></small><div data-p style="font-size:.8rem;color:#556665">Σύνδεση με ' + prov + '</div><button type="button" data-sw>🔁 Άλλαξε λογαριασμό</button><button type="button" class="out" data-out>🚪 Αποσύνδεση</button></div>';
      var b = w.querySelector('button');
      if (u.photoURL) { var im = document.createElement('img'); im.src = u.photoURL; im.alt = ''; im.referrerPolicy = 'no-referrer'; b.appendChild(im) }
      else { var av = document.createElement('span'); av.className = 'av'; av.textContent = (nm[0] || '?').toUpperCase(); b.appendChild(av) }
      var t = document.createElement('span'); t.className = 'nm'; t.textContent = u.email || nm; b.appendChild(t);
      w.querySelector('.menu b').textContent = nm; w.querySelector('.menu small').textContent = u.email || '';
      var menu = w.querySelector('.menu');
      b.onclick = function (e) { e.stopPropagation(); menu.hidden = !menu.hidden };
      document.addEventListener('click', function (e) { if (!w.contains(e.target)) menu.hidden = true });
      var out = function () { firebase.auth().signOut().then(function () { location.href = location.pathname }) };
      w.querySelector('[data-out]').onclick = function () { if (confirm('Αποσύνδεση από ' + (u.email || 'αυτόν τον λογαριασμό') + ';')) out() };
      w.querySelector('[data-sw]').onclick = out;
      if (ADMIN) appP.then(function (ap) { var open = adminUI(ap, u, w.parentNode || w); var mb = document.createElement('button'); mb.type = 'button'; mb.textContent = '👥 Μέλη & αιτήματα'; mb.onclick = function () { menu.hidden = true; open() }; menu.insertBefore(mb, menu.querySelector('[data-sw]')) });
      var who = document.getElementById('whoami');
      if (who && who.parentNode === host) host.insertBefore(w, who.nextSibling); else host.appendChild(w);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', put); else put();
  }

  /* ---------- μεταφορά δεδομένων από το claude.ai (άνοιξε τη σελίδα με ?import=1) ---------- */
  if (Q.get('import') === '1') memberP.then(function (u) { appP.then(function (a) { importUI(a, u) }) });
  /* τα κουμπιά «💾 Αντίγραφο ασφαλείας» της σελίδας (Αναλύσεις): Επαναφορά = η μεταφορά παραπάνω, Εξαγωγή = όλη η κοινή βάση σε JSON */
  var COLS = ['accounts', 'agent', 'reviews', 'apchg', 'aplog', 'approfiles', 'apstate', 'bars', 'barsarc', 'btlab', 'chat', 'chatrx', 'checkins', 'class', 'confirms', 'council', 'demo', 'demoacct', 'drawings', 'files', 'fun', 'genstrats', 'goals', 'news', 'prac', 'props', 'qbank', 'quiz', 'settings', 'strategies', 'trades'];
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#bkPick,#bkExport') : null;
    if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    memberP.then(function (u) {
      return appP.then(function (a) {
        if (t.id === 'bkPick') { if (!document.getElementById('tj-imp')) importUI(a, u); return }
        var msg = document.getElementById('bkMsg'), say = function (x) { if (msg) { msg.hidden = false; msg.textContent = x } };
        var out = { v: 1, source: 'vercel', exportedAt: Date.now(), cols: {}, members: {} }, n = 0;
        say('Μαζεύω τα δεδομένα…');
        return COLS.reduce(function (p, c) {
          return p.then(function () { return a.fs.collection(c).get().then(function (qs) { if (qs.size) { out.cols[c] = {}; qs.forEach(function (d) { out.cols[c][d.id] = dec(d.data()); n++ }) } say('Μαζεύω… ' + n) }, function () {}) });
        }, Promise.resolve()).then(function () {
          return a.fs.collection('users').get().then(function (qs) { qs.forEach(function (d) { var v = d.data() || {}; out.members[d.id] = { label: v.name || d.id } }) }, function () {});
        }).then(function () {
          var bl = new Blob([JSON.stringify(out)], { type: 'application/json' }), url = URL.createObjectURL(bl), l = document.createElement('a');
          l.href = url; l.download = 'trading-journal-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(l); l.click(); l.remove();
          setTimeout(function () { URL.revokeObjectURL(url) }, 5000);
          say('✅ Κατέβηκε αρχείο με ' + n + ' εγγραφές.');
        });
      });
    });
  }, true);
  function importUI(a, me) {
    css();
    var st = document.createElement('style');
    st.textContent = '#tj-imp{position:fixed;inset:0;z-index:99999;background:rgba(8,16,16,.8);display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow:auto;font-family:system-ui,sans-serif}#tj-imp .bx{background:#fff;color:#10201f;border-radius:14px;max-width:620px;width:100%;padding:20px;margin:24px 0}#tj-imp h2{margin:0 0 8px}#tj-imp p,#tj-imp li{font-size:.92rem;line-height:1.45;color:#334}#tj-imp select,#tj-imp input[type=file]{width:100%;padding:8px;border-radius:8px;border:1px solid #cfdcda;margin:4px 0 10px;font-size:.95rem}#tj-imp .m{border:1px solid #e1ebea;border-radius:10px;padding:10px;margin:8px 0}#tj-imp .m small{color:#667}#tj-imp button{padding:11px 16px;border-radius:10px;border:0;background:#0d6b66;color:#fff;font-weight:600;font-size:1rem;cursor:pointer}#tj-imp button[disabled]{opacity:.5}#tj-imp .bar{height:10px;background:#e6efee;border-radius:6px;overflow:hidden;margin:10px 0}#tj-imp .bar i{display:block;height:100%;width:0;background:#0d6b66}#tj-imp label.c{display:flex;gap:8px;align-items:center;font-size:.92rem;margin:6px 0}';
    document.head.appendChild(st);
    var d = document.createElement('div'); d.id = 'tj-imp';
    d.innerHTML = '<div class="bx"><h2>📦 Μεταφορά δεδομένων από το claude.ai</h2><p>Διάλεξε το αρχείο <b>trading-journal-export.json</b>. Μετά δείξε ποιος είναι ποιος, για να πάνε οι συναλλαγές, η προπόνηση και τα μηνύματα στον σωστό λογαριασμό.</p><input type="file" accept=".json,application/json" data-f><div data-step></div><div class="bar" hidden><i></i></div><p data-msg></p></div>';
    document.body.appendChild(d);
    var $s = d.querySelector('[data-step]'), msg = d.querySelector('[data-msg]'), bar = d.querySelector('.bar'), fill = bar.querySelector('i');
    d.querySelector('[data-f]').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return; msg.textContent = 'Διαβάζω το αρχείο…';
      var r = new FileReader(); r.onload = function () {
        var X; try { X = JSON.parse(r.result) } catch (err) { msg.textContent = 'Το αρχείο δεν διαβάζεται (' + err.message + ').'; return }
        if (!X || !X.cols || !X.members) { msg.textContent = 'Δεν είναι αρχείο εξαγωγής του ημερολογίου.'; return }
        a.fs.collection('users').get().then(function (qs) {
          var U = []; qs.forEach(function (x) { var v = x.data() || {}; if (!v.bot) U.push({ id: x.id, name: v.name || x.id }) });
          var opts = '<option value="">— κράτα το όπως είναι (δεν έχει μπει ακόμα) —</option>' + U.map(function (x) { return '<option value="' + x.id + '">' + x.name.replace(/</g, '&lt;') + (x.id === me.uid ? ' (εσύ)' : '') + '</option>' }).join('');
          var n = 0; Object.keys(X.cols).forEach(function (c) { n += Object.keys(X.cols[c]).length });
          $s.innerHTML = '<p><b>' + n + '</b> εγγραφές σε ' + Object.keys(X.cols).length + ' κατηγορίες. Για κάθε μέλος του claude.ai, διάλεξε τον λογαριασμό του εδώ (πρέπει να έχει συνδεθεί μία φορά για να εμφανίζεται):</p>' +
            Object.keys(X.members).map(function (k) { var m = X.members[k], o = m.owns || {}; return '<div class="m"><b>' + (m.label || k) + '</b><br><small>' + Object.keys(o).map(function (c) { return c + ': ' + o[c] }).join(' · ') + '</small><select data-u="' + k + '">' + opts + '</select></div>' }).join('') +
            '<label class="c"><input type="checkbox" data-bars checked> Μαζί και το ιστορικό κεριών (≈1.300 εγγραφές· χρειάζεται για Turtle και backtest)</label>' +
            '<button type="button" data-go>Μεταφορά</button>';
          $s.querySelector('[data-go]').onclick = function () { var any = [].some.call($s.querySelectorAll('select[data-u]'), function (x) { return x.value }); if (!any && !confirm('Δεν διάλεξες κανέναν λογαριασμό: οι εγγραφές θα μείνουν στα παλιά ονόματα. Συνέχεια;')) return; run(X, this) };
        }).catch(function (err) { msg.textContent = 'Δεν διάβασα τους χρήστες: ' + (err && err.code) });
      };
      r.readAsText(f);
    };
    function run(X, btn) {
      var map = [];
      $s.querySelectorAll('select[data-u]').forEach(function (sel) { if (sel.value) { var o = sel.getAttribute('data-u'); map.push([o, sel.value]); map.push([o.replace(/_/g, ''), sel.value.replace(/[^A-Za-z0-9]/g, '')]) } });
      var bars = $s.querySelector('[data-bars]').checked;
      var fix = function (str) { map.forEach(function (p) { str = str.split(p[0]).join(p[1]) }); return str };
      var jobs = [];
      Object.keys(X.cols).forEach(function (c) {
        if (!bars && (c === 'bars' || c === 'barsarc')) return;
        var col = fix(c), docs = X.cols[c];
        Object.keys(docs).forEach(function (id) { jobs.push([col, fix(id), JSON.parse(fix(JSON.stringify(docs[id])))]) });
      });
      /* ο φύλακας θα ξαναπάρει τη σκυτάλη μόνος του: δεν φέρνω τον παλιό «τρέχει από» */
      jobs.forEach(function (j) { if (j[0] === 'apstate' && j[2]) { delete j[2].runner; delete j[2].tab; j[2].at = 0 } });
      btn.disabled = true; bar.hidden = false; var done = 0, fail = 0, i = 0;
      var step = function () {
        if (i >= jobs.length) { msg.innerHTML = '✅ Τέλος: ' + done + ' εγγραφές' + (fail ? ', ' + fail + ' απέτυχαν' : '') + '. <a href="/">Άνοιξε το ημερολόγιο</a>'; return }
        var b = a.fs.batch(), part = [], sz = 0;
        while (i + part.length < jobs.length && part.length < 200) { var nx = jobs[i + part.length], l = JSON.stringify(nx[2]).length; if (part.length && sz + l > 3e6) break; part.push(nx); sz += l }
        part.forEach(function (j) { b.set(a.fs.collection(j[0]).doc(j[1]), enc(j[2])) });
        b.commit().then(function () { done += part.length }, function (err) {
          log('batch', err && err.code);
          return Promise.all(part.map(function (j) { return a.fs.collection(j[0]).doc(j[1]).set(enc(j[2])).then(function () { done++ }, function (e2) { fail++; log('doc', j[0], j[1], e2 && e2.code) }) }));
        }).then(function () { i += part.length; fill.style.width = Math.round(i / jobs.length * 100) + '%'; msg.textContent = 'Γράφω… ' + i + ' / ' + jobs.length; setTimeout(step, 300) });
      };
      step();
    }
  }

  window.TJ = { authP: authP, appP: appP, bot: !!BOT, runner: Q.get('runner') === '1' };
})();
