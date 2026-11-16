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
  var log = function () { try { console.log.apply(console, ['[tj]'].concat([].slice.call(arguments))) } catch (e) {} };

  /* ---------- ρυθμίσεις & Firebase ---------- */
  var cfgP = fetch('/api/config', { cache: 'no-store' }).then(function (r) { return r.json() }).catch(function () { return {} });
  var appP = cfgP.then(function (c) {
    if (!c || !c.firebase || !c.firebase.apiKey) throw { code: 'not_configured', message: 'Λείπει το FIREBASE_CONFIG στο Vercel' };
    if (!window.firebase) throw { code: 'not_configured', message: 'Δεν φορτώθηκε το Firebase' };
    firebase.initializeApp(c.firebase);
    var fs = firebase.firestore();
    try { fs.settings({ ignoreUndefinedProperties: true, merge: true }) } catch (e) {}
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

  /* ---------- οθόνη σύνδεσης ---------- */
  var LG = null;
  function css() {
    if (document.getElementById('tj-login-css')) return;
    var s = document.createElement('style'); s.id = 'tj-login-css';
    s.textContent = '#tj-login{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(8,16,16,.72);padding:16px;font-family:system-ui,sans-serif}' +
      '#tj-login .bx{background:#fff;color:#10201f;border-radius:14px;max-width:360px;width:100%;padding:22px;box-shadow:0 10px 40px rgba(0,0,0,.35)}' +
      '#tj-login h2{margin:0 0 6px;font-size:1.25rem}#tj-login p{margin:0 0 14px;color:#556665;font-size:.92rem;line-height:1.4}' +
      '#tj-login button{width:100%;padding:11px;border-radius:10px;border:1px solid #d2dedc;background:#0d6b66;color:#fff;font-size:1rem;font-weight:600;cursor:pointer;margin-top:6px}' +
      '#tj-login button.alt{background:#fff;color:#10201f}#tj-login input{width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:1px solid #d2dedc;margin-top:6px;font-size:1rem}' +
      '#tj-login .err{color:#c43d3d;font-size:.88rem;margin-top:8px;min-height:1em}#tj-login hr{border:0;border-top:1px solid #e2eceb;margin:14px 0}' +
      '#tj-msg{position:fixed;left:12px;right:12px;bottom:12px;z-index:99998;background:#9a5a12;color:#fff;padding:10px 12px;border-radius:10px;font:14px system-ui}';
    document.head.appendChild(s);
  }
  function showMsg(t) { var go = function () { css(); var m = document.getElementById('tj-msg'); if (!m) { m = document.createElement('div'); m.id = 'tj-msg'; document.body.appendChild(m) } m.textContent = t }; if (document.body) go(); else document.addEventListener('DOMContentLoaded', go) }
  function hideLogin() { if (LG) { LG.remove(); LG = null } }
  function showLogin(auth) {
    var go = function () {
      if (LG) return; css();
      LG = document.createElement('div'); LG.id = 'tj-login';
      LG.innerHTML = '<div class="bx"><h2>📒 Ημερολόγιο Συναλλαγών</h2><p>Συνδέσου για να μπεις στο κοινό ημερολόγιο της παρέας.</p>' +
        '<button type="button" data-g>Σύνδεση με Google</button><hr>' +
        '<input type="email" placeholder="email" autocomplete="username" data-e><input type="password" placeholder="κωδικός" autocomplete="current-password" data-p>' +
        '<button type="button" class="alt" data-l>Σύνδεση με email</button><button type="button" class="alt" data-r>Νέος λογαριασμός με email</button><div class="err" data-x></div></div>';
      document.body.appendChild(LG);
      var err = function (e) { LG && (LG.querySelector('[data-x]').textContent = trErr(e)) };
      LG.querySelector('[data-g]').onclick = function () {
        var p = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(p).catch(function (e) { if (e && /popup/.test(e.code || '')) return auth.signInWithRedirect(p); err(e) });
      };
      var ep = function () { return [LG.querySelector('[data-e]').value.trim(), LG.querySelector('[data-p]').value] };
      LG.querySelector('[data-l]').onclick = function () { var v = ep(); auth.signInWithEmailAndPassword(v[0], v[1]).catch(err) };
      LG.querySelector('[data-r]').onclick = function () { var v = ep(); auth.createUserWithEmailAndPassword(v[0], v[1]).catch(err) };
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

  /* ---------- window.claude ---------- */
  var cache = {};
  window.claude = {
    vercel: true,
    use: function (name) {
      if (cache[name]) return cache[name];
      var p;
      if (name === 'db') p = authP.then(function () { return appP }).then(function (a) { return new DB(a.fs) });
      else if (name === 'user') p = authP.then(function (u) { return appP.then(function (a) { return user(a, u) }) });
      else if (name === 'sample') p = authP.then(function () { return cfgP }).then(function (c) { return c && c.ai ? sampleApi() : null });
      else if (name === 'mcp') p = Promise.resolve(mcpApi());
      else p = Promise.reject({ code: 'not_granted' });
      cache[name] = p; return p;
    }
  };
  window.TJ = { authP: authP, appP: appP, bot: !!BOT, runner: Q.get('runner') === '1' };
})();
