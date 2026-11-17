/* /api/mcp — αντικαθιστά τους connectors του claude.ai με τις δημόσιες, δωρεάν πηγές.
   Επιστρέφει τα δεδομένα στο ίδιο σχήμα με τα εργαλεία CoinGecko / Crypto.com που περίμενε η σελίδα.
   GET /api/mcp?s=<server>&t=<tool>&a=<json args>  →  { ok, payload, at } ή { ok:false, code, message } */
const MEM = new Map();
const TTL = { candles: 15e3, markets: 45e3, chart: 120e3, global: 60e3, news: 180e3, ticker: 10e3 };

function cached(key, ttl, fn) {
  const c = MEM.get(key);
  if (c && Date.now() - c.at < ttl) return c.p;
  const p = fn();
  MEM.set(key, { at: Date.now(), p });
  p.catch(() => MEM.delete(key));
  if (MEM.size > 500) MEM.delete(MEM.keys().next().value);
  return p;
}

async function getJson(url, headers = {}) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'trading-journal/1.0', ...headers } });
  if (r.status === 429) throw { code: 'rate_limited', message: url.split('?')[0] };
  if (!r.ok) throw { code: 'upstream_error', message: `${r.status} ${url.split('?')[0]}` };
  return r.json();
}

/* ---------- Crypto.com Exchange (δημόσιο API, χωρίς κλειδί) ---------- */
const CC = 'https://api.crypto.com/exchange/v1/public/';
const CC_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '12h': '12h', '1d': '1D', '1D': '1D', 'D1': '1D', '7D': '7D', '1w': '7D', '1W': '7D', '14D': '14D', '1M': '1M' };
/* Κεριά: πρώτα Crypto.com· αν δεν έχει το ζεύγος (π.χ. ZEC, HYPE σε USDT), Binance και μετά OKX.
   Έτσι το αρχείο κεριών γεμίζει μόνο του για ΟΛΑ τα νομίσματα, χωρίς χειροκίνητη συμπλήρωση. */
const BN_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '12h': '12h', '1D': '1d', '7D': '1w', '1M': '1M' };
const OKX_TF = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1H', '2h': '2H', '4h': '4H', '6h': '6Hutc', '12h': '12Hutc', '1D': '1Dutc', '7D': '1Wutc', '1M': '1Mutc' };
const row = (t, o, h, l, c, v) => ({ open: String(o), high: String(h), low: String(l), close: String(c), volume: String(v), timestamp: new Date(+t).toISOString() });
async function ccRaw(inst, tf, count) {
  const j = await cached(`cc|${inst}|${tf}|${count}`, TTL.candles, () => getJson(`${CC}get-candlestick?instrument_name=${inst}&timeframe=${tf}&count=${count}`).catch(e => ({ code: e.code || 'err' })));
  const d = (j && j.result && j.result.data) || [];
  return d.map(x => row(x.t, x.o, x.h, x.l, x.c, x.v)).reverse();
}
async function binanceRaw(base, quote, tf, count) {
  const iv = BN_TF[tf]; if (!iv) return [];
  const sym = base + (quote === 'USD' ? 'USDT' : quote);
  for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
    try {
      const j = await cached(`bn|${sym}|${iv}|${count}`, TTL.candles, () => getJson(`${host}/api/v3/klines?symbol=${sym}&interval=${iv}&limit=${Math.min(1000, count)}`));
      if (Array.isArray(j) && j.length) return j.map(k => row(k[0], k[1], k[2], k[3], k[4], k[5])).reverse();
    } catch (e) { }
  }
  return [];
}
async function okxRaw(base, quote, tf, count) {
  const bar = OKX_TF[tf]; if (!bar) return [];
  const id = `${base}-${quote === 'USD' ? 'USDT' : quote}`;
  try {
    const j = await cached(`okx|${id}|${bar}|${count}`, TTL.candles, () => getJson(`https://www.okx.com/api/v5/market/candles?instId=${id}&bar=${bar}&limit=${Math.min(300, count)}`));
    const d = (j && j.data) || [];
    return d.map(k => row(k[0], k[1], k[2], k[3], k[4], k[5]));
  } catch (e) { return [] }
}
async function ccCandles(a) {
  const inst = String(a.instrument_name || '').toUpperCase();
  const tf = CC_TF[a.timeframe] || a.timeframe || '1h';
  if (!/^[A-Z0-9]+_[A-Z0-9]+$/.test(inst)) throw { code: 'invalid_request', message: 'instrument_name' };
  const count = Math.min(300, Math.max(10, +a.count || 300));
  const [base, quote] = inst.split('_');
  let data = await ccRaw(inst, tf, count), source = 'Crypto.com';
  if (!data.length && /^(USDT|USDC|USD)$/.test(quote)) { data = await binanceRaw(base, quote, tf, count); source = 'Binance' }
  if (!data.length && /^(USDT|USDC|USD)$/.test(quote)) { data = await okxRaw(base, quote, tf, count); source = 'OKX' }
  if (!data.length) throw { code: 'tool_error', message: `δεν βρέθηκαν κεριά για ${inst}` };
  return { instrument_name: inst, timeframe: tf, source, data };
}
async function ccTickers(a) {
  const inst = a.instrument_name ? String(a.instrument_name).toUpperCase() : '';
  const j = await cached(`cct|${inst}`, TTL.ticker, () => getJson(`${CC}get-tickers${inst ? `?instrument_name=${inst}` : ''}`));
  const d = (j && j.result && j.result.data) || [];
  const map = x => ({ instrument_name: x.i, last: x.a, high: x.h, low: x.l, bid: x.b, ask: x.k, change: x.c, volume: x.v, volume_usd: x.vv, timestamp: new Date(+x.t).toISOString() });
  return inst ? { ...(d[0] ? map(d[0]) : {}), data: d.map(map) } : { data: d.map(map) };
}

/* ---------- CoinGecko (δωρεάν API· με COINGECKO_API_KEY αντέχει περισσότερες κλήσεις) ---------- */
function cg(path) {
  const key = process.env.COINGECKO_API_KEY || '';
  const pro = process.env.COINGECKO_PRO === '1';
  const base = pro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
  const h = key ? (pro ? { 'x-cg-pro-api-key': key } : { 'x-cg-demo-api-key': key }) : {};
  return getJson(base + path, h);
}
const ID_RE = /^[a-z0-9-]{1,100}$/;
async function cgMarkets(a) {
  let ids = (a.ids || []).filter(x => ID_RE.test(x)).slice(0, 50);
  const top = +a.topN || 0;
  const q = ids.length ? `ids=${ids.join(',')}` : `order=market_cap_desc&per_page=${Math.min(50, top || 10)}`;
  const j = await cached(`cgm|${q}`, TTL.markets, () => cg(`/coins/markets?vs_currency=usd&${q}&sparkline=true&price_change_percentage=24h`));
  return {
    coins: (j || []).map(c => ({
      id: c.id, symbol: c.symbol, name: c.name, image: c.image, currentPrice: c.current_price, marketCap: c.market_cap, marketCapRank: c.market_cap_rank,
      totalVolume: c.total_volume, priceChangePercentage24h: c.price_change_percentage_24h, fullyDilutedValuation: c.fully_diluted_valuation,
      circulatingSupply: c.circulating_supply, maxSupply: c.max_supply,
      sparkline7d: c.sparkline_in_7d && c.sparkline_in_7d.price ? c.sparkline_in_7d.price.filter((_, i, A) => i % Math.max(1, Math.floor(A.length / 48)) === 0).slice(0, 48) : []
    }))
  };
}
function thin(arr, n) { if (arr.length <= n) return arr; const out = [], step = (arr.length - 1) / (n - 1); for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]); return out }
async function cgChart(a) {
  const id = String(a.id || ''), days = String(a.days || '7');
  if (!ID_RE.test(id) || !/^(1|7|14|30|90|180|365|max|ytd)$/.test(days)) throw { code: 'invalid_request', message: 'id/days' };
  let d = days;
  if (days === 'ytd') { const n = new Date(); d = String(Math.max(1, Math.ceil((n - new Date(Date.UTC(n.getUTCFullYear(), 0, 1))) / 864e5))) }
  const j = await cached(`cgc|${id}|${d}`, TTL.chart, () => cg(`/coins/${id}/market_chart?vs_currency=usd&days=${d}`));
  const P = thin(j.prices || [], 120), M = thin(j.market_caps || [], 120);
  return { id, days, startTs: P.length ? P[0][0] : null, endTs: P.length ? P[P.length - 1][0] : null, prices: P.map(x => x[1]), marketCaps: M.map(x => x[1]) };
}
async function cgGlobal() {
  const [g, m] = await Promise.all([
    cached('cgg', TTL.global, () => cg('/global')),
    cached('cgm|top5', TTL.global, () => cg('/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple'))
  ]);
  const d = (g && g.data) || {};
  return {
    totalMarketCapUsd: d.total_market_cap && d.total_market_cap.usd, marketCapChangePercentage24hUsd: d.market_cap_change_percentage_24h_usd,
    totalVolumeUsd: d.total_volume && d.total_volume.usd, btcDominancePct: d.market_cap_percentage && d.market_cap_percentage.btc, ethDominancePct: d.market_cap_percentage && d.market_cap_percentage.eth,
    coins: (m || []).map(c => ({ id: c.id, symbol: c.symbol, name: c.name, image: c.image, currentPrice: c.current_price, priceChangePercentage24h: c.price_change_percentage_24h }))
  };
}

/* ---------- Ειδήσεις: δημόσια RSS μεγάλων crypto sites (στη θέση του get-crypto-news) ---------- */
const FEEDS = [
  ['https://cointelegraph.com/rss', 'Cointelegraph'],
  ['https://www.coindesk.com/arc/outboundfeeds/rss/', 'CoinDesk'],
  ['https://decrypt.co/feed', 'Decrypt'],
  ['https://bitcoinmagazine.com/.rss/full/', 'Bitcoin Magazine'],
  ['https://cryptoslate.com/feed/', 'CryptoSlate']
];
const COIN_WORDS = { bitcoin: /bitcoin|\bbtc\b/i, ethereum: /ethereum|\beth\b|ether\b/i, ripple: /\bxrp\b|ripple/i, solana: /solana|\bsol\b/i, 'hedera-hashgraph': /hedera|\bhbar\b/i, dogecoin: /dogecoin|\bdoge\b/i, cardano: /cardano|\bada\b/i, 'avalanche-2': /avalanche|\bavax\b/i, hyperliquid: /hyperliquid|\bhype\b/i, chainlink: /chainlink|\blink\b/i, binancecoin: /\bbnb\b|binance coin/i, zcash: /zcash|\bzec\b/i, monero: /monero|\bxmr\b/i, litecoin: /litecoin|\bltc\b/i, sui: /\bsui\b/i, tron: /\btron\b|\btrx\b/i };
function unx(s) { return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim() }
async function feed(url, src) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 trading-journal', accept: 'application/rss+xml, application/xml, text/xml' } });
  if (!r.ok) return [];
  const x = await r.text(), out = [];
  const items = x.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  for (const it of items.slice(0, 25)) {
    const g = t => { const m = it.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? unx(m[1]) : '' };
    const title = g('title'), link = g('link') || g('guid'), d = Date.parse(g('pubDate') || g('dc:date'));
    if (title && /^https?:\/\//.test(link)) out.push({ title, url: link, source: src, postedAt: new Date(isFinite(d) ? d : Date.now()).toISOString(), type: 'news' });
  }
  return out;
}
async function news(a) {
  const all = await cached('news', TTL.news, async () => {
    const L = await Promise.all(FEEDS.map(f => feed(f[0], f[1]).catch(() => [])));
    return L.flat().sort((x, y) => Date.parse(y.postedAt) - Date.parse(x.postedAt));
  });
  let L = all;
  if (a.coinId) { const re = COIN_WORDS[a.coinId] || new RegExp(String(a.coinId).replace(/[^a-z0-9]/g, ''), 'i'); L = all.filter(x => re.test(x.title)) }
  return { articles: L.slice(0, Math.min(50, Math.max(1, +a.limit || 10))) };
}

const ROUTES = {
  'Crypto.com': { get_candlestick: ccCandles, Get_candlestick: ccCandles, get_tickers: ccTickers, get_ticker: ccTickers },
  'CoinGecko': { 'get-coin-markets': cgMarkets, 'get-coin-market-chart': cgChart, 'get-global-market': cgGlobal, 'get-crypto-news': news }
};

module.exports = async (req, res) => {
  const s = String(req.query.s || ''), t = String(req.query.t || '');
  let a = {};
  try { a = JSON.parse(req.query.a || '{}') || {} } catch (e) { }
  const fn = ROUTES[s] && ROUTES[s][t];
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (!fn) { res.status(404).send(JSON.stringify({ ok: false, code: ROUTES[s] ? 'not_in_manifest' : 'server_not_found' })); return }
  try {
    const payload = await fn(a);
    const edge = t === 'get_candlestick' || t === 'Get_candlestick' ? 10 : t.indexOf('ticker') >= 0 ? 5 : 30;
    res.setHeader('cache-control', `public, s-maxage=${edge}, stale-while-revalidate=120`);
    res.status(200).send(JSON.stringify({ ok: true, payload, at: Date.now() }));
  } catch (e) {
    const code = (e && e.code) || 'upstream_error';
    res.setHeader('cache-control', 'no-store');
    res.status(code === 'rate_limited' ? 429 : 502).send(JSON.stringify({ ok: false, code, message: String((e && e.message) || e).slice(0, 300) }));
  }
};
