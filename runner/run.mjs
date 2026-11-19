// Ο «φύλακας»: κρατά τη σελίδα ανοιχτή σε έναν headless Chromium, συνδεδεμένη με τον λογαριασμό του bot,
// ώστε ο Αυτόματος, η Turtle, οι έλεγχοι SL/TP και οι ειδήσεις να τρέχουν χωρίς να έχει ανοίξει κανείς σελίδα.
// Τρέχει στο GitHub Actions (δες .github/workflows/runner.yml). Τοπικά:
//   TJ_URL=https://… TJ_BOT_EMAIL=… TJ_BOT_PASSWORD=… node runner/run.mjs
import { chromium } from 'playwright';

const URL = (process.env.TJ_URL || '').replace(/\/+$/, '');
const EMAIL = process.env.TJ_BOT_EMAIL || '';
const PASS = process.env.TJ_BOT_PASSWORD || '';
const MINUTES = +process.env.RUN_MINUTES || 340;        // λίγο κάτω από τις 6 ώρες του GitHub
const RELOAD_MIN = +process.env.RELOAD_MINUTES || 360;   // μία φόρτωση ανά βάρδια (κάθε φόρτωση = χιλιάδες αναγνώσεις στο Firebase)
if (!URL || !EMAIL || !PASS) { console.error('Λείπουν TJ_URL / TJ_BOT_EMAIL / TJ_BOT_PASSWORD'); process.exit(1) }

const t0 = Date.now(), end = t0 + MINUTES * 60000;
const ts = () => new Date().toISOString().slice(11, 19);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Μνήμη από βάρδια σε βάρδια: με TJ_PROFILE ο browser κρατά φάκελο προφίλ (IndexedDB του Firebase, σύνδεση, ρυθμίσεις).
// Η νέα βάρδια ξεκινά με τα δεδομένα της προηγούμενης και ο Firebase κατεβάζει μόνο ό,τι άλλαξε, όχι χιλιάδες έγγραφα από την αρχή.
const PROFILE = process.env.TJ_PROFILE || '';
const OPTS = { viewport: { width: 1280, height: 900 }, locale: 'el-GR', timezoneId: 'Europe/Athens' };
const browser = PROFILE ? null : await chromium.launch({ args: ['--disable-dev-shm-usage'] });
let pctx = null, page = null, loadedAt = 0, errors = 0, lastLog = Date.now();
if (PROFILE) { const fs = await import('fs'); console.log(ts(), 'μνήμη φύλακα:', fs.existsSync(PROFILE + '/Default') ? 'βρέθηκε από την προηγούμενη βάρδια' : 'καινούρια (πρώτη φορά ή χάθηκε)') }

async function open() {
  let ctx;
  if (PROFILE) {
    if (page) { try { await page.close() } catch (e) { } }
    if (!pctx) { pctx = await chromium.launchPersistentContext(PROFILE, Object.assign({ args: ['--disable-dev-shm-usage'] }, OPTS)); await pctx.addInitScript(([e, p]) => { window.__TJ_BOT = { email: e, password: p } }, [EMAIL, PASS]); for (const pg of pctx.pages()) { try { await pg.close() } catch (e) { } } }
    ctx = pctx;
  } else {
    if (page) { try { await page.context().close() } catch (e) { } }
    ctx = await browser.newContext(OPTS);
    await ctx.addInitScript(([e, p]) => { window.__TJ_BOT = { email: e, password: p } }, [EMAIL, PASS]);
  }
  page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' || /^\[tj\]|Αυτόματος|Turtle|apScan/.test(t)) console.log(ts(), m.type(), t.slice(0, 300)) });
  page.on('pageerror', e => console.log(ts(), 'pageerror', String((e && (e.message || e.code)) || e).slice(0, 300)));
  page.on('requestfailed', r => console.log(ts(), 'reqfail', r.url().slice(0, 160)));
  page.on('response', r => { if (r.status() >= 500) console.log(ts(), r.status(), r.url().replace(/[?&]a=.*/, '').slice(0, 160)) });
  page.on('crash', () => { console.log(ts(), 'crash'); loadedAt = 0 });
  await page.goto(URL + '/?runner=1#demo', { waitUntil: 'domcontentloaded', timeout: 120000 });
  loadedAt = Date.now();
  console.log(ts(), 'άνοιξε', URL);
}

async function status() {
  return page.evaluate(() => {
    const AP = window.__AP || {}, st = AP.state || {}, c = AP.cfg || {};
    return {
      uid: (window.TJ && window.TJ.bot) ? 'bot' : '?', on: !!c.on, runner: st.runner || null, me: st.tab && st.tab === AP.tab,
      last: AP.last ? new Date(AP.last).toISOString().slice(11, 16) : null, busy: !!AP.busy
    };
  }).catch(e => ({ err: String(e).slice(0, 120) }));
}

await open();
while (Date.now() < end) {
  await sleep(60000);
  if (!loadedAt || Date.now() - loadedAt > RELOAD_MIN * 60000) {
    try { await open(); errors = 0 } catch (e) { console.log(ts(), 'open fail', String(e).slice(0, 200)); if (++errors > 5) break; await sleep(30000) }
    continue;
  }
  const m = Math.round((Date.now() - t0) / 60000);
  if (m % 10 === 0) console.log(ts(), 'κατάσταση', JSON.stringify(await status()));
  // ό,τι γράφει ο Αυτόματος στο ημερολόγιό του (άνοιγμα, μπλοκ, προτάσεις, σαρώσεις), για να φαίνεται και εδώ
  try {
    const L = await page.evaluate(since => ((window.__AP && window.__AP.log) || []).filter(x => x.t > since).map(x => [x.t, x.k, x.c || '', String(x.m || '').slice(0, 220)]), lastLog);
    L.reverse().forEach(x => { lastLog = Math.max(lastLog, x[0]); console.log(ts(), 'αυτόματος', '[' + x[1] + ']', x[2], x[3]) });
  } catch (e) { }
}
console.log(ts(), 'τέλος βάρδιας');
// κλείσιμο με τάξη, ώστε να γραφτεί σωστά η μνήμη στον δίσκο
if (pctx) { try { await page.close() } catch (e) { } await sleep(3000); await pctx.close() } else await browser.close();
