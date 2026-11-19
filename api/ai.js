/* /api/ai — ο Καθηγητής. Περνά τα μηνύματα της σελίδας στο Anthropic API με το κλειδί του Vercel.
   Δέχεται μόνο συνδεδεμένα μέλη (Firebase ID token) — έτσι κανείς άλλος δεν ξοδεύει το κλειδί.
   POST { messages, tools, tier, effort, json }  →  { content:[…], stop_reason } */
const { createRemoteJWKSet, jwtVerify } = require('jose');
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

function fbProject() {
  try { return JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId || '' } catch (e) { return '' }
}
async function who(req) {
  const h = String(req.headers.authorization || ''), t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const pid = fbProject();
  if (!t || !pid) throw { code: 'not_granted', status: 401 };
  const { payload } = await jwtVerify(t, JWKS, { issuer: `https://securetoken.google.com/${pid}`, audience: pid });
  const allow = String(process.env.ALLOWED_EMAILS || '').toLowerCase().split(/[\s,;]+/).filter(Boolean);
  const em = String(payload.email || '').toLowerCase();
  if (allow.includes(em)) return { uid: payload.sub, email: em };
  /* αλλιώς: είναι εγκεκριμένο μέλος; (members/{uid} στο Firestore, με το δικό του token — οι κανόνες του επιτρέπουν να το διαβάσει) */
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/members/${encodeURIComponent(payload.sub)}`, { headers: { authorization: 'Bearer ' + t } }).catch(() => null);
  if (r && r.ok) return { uid: payload.sub, email: em };
  throw { code: 'not_granted', status: 403 };
}

/* ΠΑΝΤΟΥ και ΜΟΝΟ το φθηνό μοντέλο (Haiku), ό,τι κι αν ζητήσει η σελίδα. */
const HAIKU = 'claude-haiku-5-5';
const MODELS = {
  quick: HAIKU,
  default: HAIKU,
  complex: HAIKU,
  haiku: HAIKU,
  sonnet: HAIKU,
  opus: HAIKU
};

/* απλό όριο ανά μέλος (ανά instance), για να μη φύγει ο λογαριασμός από κάποιο λάθος βρόχο */
const RATE = new Map();
function rate(uid) {
  const now = Date.now(), w = RATE.get(uid) || [];
  const L = w.filter(t => now - t < 60000); L.push(now); RATE.set(uid, L);
  return L.length <= (+process.env.AI_PER_MIN || 20);
}

module.exports = async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'POST') { res.status(405).send('{"error":{"code":"invalid_request"}}'); return }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).send(JSON.stringify({ error: { code: 'not_granted', message: 'Δεν έχει μπει ANTHROPIC_API_KEY στο Vercel' } })); return }
  let me;
  try { me = await who(req) } catch (e) { res.status((e && e.status) || 401).send(JSON.stringify({ error: { code: 'not_granted' } })); return }
  if (!rate(me.uid)) { res.status(429).send('{"error":{"code":"rate_limited"}}'); return }
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const tier = Object.prototype.hasOwnProperty.call(MODELS, b.tier) ? b.tier : 'default';
  const body = {
    model: MODELS[tier],
    max_tokens: Math.min(16000, +process.env.AI_MAX_TOKENS || 6000), /* χρεώνεται μόνο ό,τι γραφτεί· με μικρό όριο οι απαντήσεις κόβονταν στη μέση */
    messages: Array.isArray(b.messages) ? b.messages : [],
    system: 'Είσαι ο «Καθηγητής» σε ένα κοινό ημερολόγιο συναλλαγών μιας παρέας. Ακολούθησε τις οδηγίες του μηνύματος.' + (b.json ? ' Η απάντησή σου πρέπει να είναι μόνο έγκυρο JSON.' : '')
  };
  if (Array.isArray(b.tools) && b.tools.length) body.tools = b.tools.slice(0, 16);
  if (body.tools && b.tool_choice === 'none') body.tool_choice = { type: 'none' };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body)
    });
    const j = await r.json();
    if (!r.ok) {
      const code = r.status === 429 ? 'rate_limited' : r.status === 400 ? 'invalid_request' : r.status === 401 || r.status === 403 ? 'not_granted' : 'upstream_error';
      res.status(r.status === 429 ? 429 : 502).send(JSON.stringify({ error: { code, message: (j && j.error && j.error.message) || '' } })); return;
    }
    res.status(200).send(JSON.stringify({ content: j.content || [], stop_reason: j.stop_reason, model: j.model, usage: j.usage }));
  } catch (e) {
    res.status(502).send(JSON.stringify({ error: { code: 'upstream_error', message: String((e && e.message) || e).slice(0, 200) } }));
  }
};
