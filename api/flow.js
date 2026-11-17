/* /api/flow — δημόσια, δωρεάν δεδομένα για την καρτέλα «Order Flow», όταν ο browser δεν τα φτάνει απευθείας.
   GET /api/flow?src=deribit&c=BTC                      → όλα τα options του Deribit (λεπτό σχήμα)
   GET /api/flow?src=bn&h=f|s&p=/fapi/v1/klines&q=…     → Binance REST (μόνο τα path της λίστας) */
const MEM = new Map();
function cached(key, ttl, fn) {
  const c = MEM.get(key);
  if (c && Date.now() - c.at < ttl) return c.p;
  const p = fn(); MEM.set(key, { at: Date.now(), p }); p.catch(() => MEM.delete(key));
  if (MEM.size > 300) MEM.delete(MEM.keys().next().value);
  return p;
}
async function getJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'trading-journal/1.0' } });
  if (!r.ok) throw { status: r.status, message: `${r.status} ${url.split('?')[0]}` };
  return r.json();
}
const OK = {
  f: ['/fapi/v1/klines', '/fapi/v1/aggTrades', '/fapi/v1/depth', '/fapi/v1/ticker/24hr', '/fapi/v1/openInterest', '/futures/data/openInterestHist', '/fapi/v1/premiumIndex'],
  s: ['/api/v3/klines', '/api/v3/aggTrades', '/api/v3/depth', '/api/v3/ticker/24hr']
};
const HOST = { f: ['https://fapi.binance.com'], s: ['https://data-api.binance.vision', 'https://api.binance.com'] };

module.exports = async (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  const q = req.query || {};
  try {
    if (q.src === 'deribit') {
      const c = String(q.c || 'BTC').toUpperCase();
      if (!['BTC', 'ETH'].includes(c)) throw { status: 400, message: 'currency' };
      const j = await cached('drb|' + c, 60e3, () => getJson(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${c}&kind=option`));
      const out = ((j && j.result) || []).map(x => [x.instrument_name, x.open_interest, x.mark_iv, x.underlying_price, x.volume, x.mark_price]);
      res.setHeader('cache-control', 'public, max-age=30');
      res.status(200).send(JSON.stringify({ ok: true, at: Date.now(), c, rows: out }));
      return;
    }
    if (q.src === 'bn') {
      const h = q.h === 's' ? 's' : 'f', p = String(q.p || '');
      if (!OK[h].includes(p)) throw { status: 400, message: 'path' };
      const qs = String(q.q || '').replace(/[^A-Za-z0-9=&_.\-]/g, '');
      let last;
      for (const host of HOST[h]) {
        try {
          const j = await cached(`bn|${h}|${p}|${qs}`, p.includes('depth') || p.includes('aggTrades') ? 1500 : 5000, () => getJson(`${host}${p}?${qs}`));
          res.setHeader('cache-control', 'no-store');
          res.status(200).send(JSON.stringify(j));
          return;
        } catch (e) { last = e }
      }
      throw last || { status: 502 };
    }
    throw { status: 400, message: 'src' };
  } catch (e) {
    res.status(e && e.status >= 400 && e.status < 500 ? e.status : 502).send(JSON.stringify({ ok: false, message: String((e && e.message) || e).slice(0, 200) }));
  }
};
