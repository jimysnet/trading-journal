// Agent στρατηγικών · καθημερινός έλεγχος (headless)
// Χρήση: node collect.js <pageDir> <dumpDir> <outDir> [names.json]
//  pageDir: φάκελος με index.html, app.js, i18n.js, manual.js, ru.js του artifact
//  dumpDir: φάκελος από ArtifactData list out_dir (<dumpDir>/<collection>/<doc_id>.json)
//  Γράφει <outDir>/data.json (τα δεδομένα) και <outDir>/prompt.txt (οδηγίες + δεδομένα για την αναφορά)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const [pageDir, dumpDir, outDir, namesFile] = process.argv.slice(2);
if (!pageDir || !dumpDir || !outDir) { console.error('usage: node collect.js <pageDir> <dumpDir> <outDir> [names.json]'); process.exit(2); }
const data = {};
for (const coll of fs.existsSync(dumpDir) ? fs.readdirSync(dumpDir) : []) {
  const d = path.join(dumpDir, coll); if (!fs.statSync(d).isDirectory()) continue;
  data[coll] = {};
  for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) {
    try { let v = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); if (v && v.data && v.version && Object.keys(v).length <= 4) v = v.data; data[coll][f.slice(0, -5)] = v; } catch (e) { console.error('skip', coll, f, e.message); }
  }
}
const names = namesFile && fs.existsSync(namesFile) ? JSON.parse(fs.readFileSync(namesFile, 'utf8')) : {};
const init = `(function(){var data=${JSON.stringify(data)},names=${JSON.stringify(names)};
 function Q(coll,f,o,l){return {where:function(a,op,v){return Q(coll,f.concat([[a,op,v]]),o,l)},orderBy:function(a,d){return Q(coll,f,[a,d],l)},limit:function(n){return Q(coll,f,o,n)},
  get:function(){return Promise.resolve(snap(coll,f,o,l))},onSnapshot:function(next){setTimeout(function(){next(snap(coll,f,o,l))},5);return function(){}},doc:function(id){return D(coll+'/'+id)}}}
 function snap(coll,f,o,l){var docs=Object.keys(data[coll]||{}).map(function(id){return {id:id,exists:true,data:function(){return data[coll][id]}}}).filter(function(x){return f.every(function(w){var v=x.data()[w[0]];return w[1]==='>='?v>=w[2]:w[1]==='<'?v<w[2]:w[1]==='<='?v<=w[2]:w[1]==='>'?v>w[2]:w[1]==='=='?v===w[2]:true})});
  if(o)docs.sort(function(a,b){var x=a.data()[o[0]],y=b.data()[o[0]];return (x<y?-1:x>y?1:0)*(o[1]==='desc'?-1:1)});if(l)docs=docs.slice(0,l);return {docs:docs,size:docs.length,empty:!docs.length}}
 function D(p){p=p.split('/');var g=function(){var v=(data[p[0]]||{})[p[1]];return {exists:!!v,id:p[1],data:function(){return v}}};return {get:function(){return Promise.resolve(g())},onSnapshot:function(n){setTimeout(function(){n(g())},5);return function(){}},set:function(){return Promise.reject({code:'read_only'})},update:function(){return Promise.reject({code:'read_only'})},delete:function(){return Promise.reject({code:'read_only'})}}}
 var db={collection:function(c){return Q(c,[],null,null)},doc:D};
 var user={id:function(){return Promise.resolve('u_daily_agent')},can:function(){return Promise.resolve(false)},profiles:function(ids){var o={};ids.forEach(function(i){if(names[i])o[i]={name:names[i]}});return Promise.resolve(o)}};
 window.claude={use:function(n){return Promise.resolve(n==='db'?db:n==='user'?user:null)}};
 try{localStorage.setItem('tj-prof-seen','1')}catch(e){}
})();`;
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https?:\/\//, r => r.abort());
  await p.addInitScript(init);
  await p.goto('file://' + path.resolve(pageDir, 'index.html'));
  await p.waitForFunction(() => typeof window.__agentCollect === 'function', null, { timeout: 60000 });
  await p.waitForTimeout(4000);
  const res = await p.evaluate(() => window.__agentCollect().then(d => ({ d, prompt: window.__agentPrompt(d) })));
  fs.writeFileSync(path.join(outDir, 'data.json'), JSON.stringify(res.d, null, 1));
  fs.writeFileSync(path.join(outDir, 'prompt.txt'), res.prompt);
  const mk = res.d.markets.map(m => m.coin + ':' + (m.bars ? m.bars + 'κ/' + m.lastCandleHoursAgo + 'ώ' : m.error)).join(' ');
  console.log('OK markets', mk, '| members', res.d.members.length, '| auto closed', res.d.autopilot.autoClosed, errs.length ? '| page errors: ' + errs.slice(0, 3).join(' / ') : '');
  await b.close();
})().catch(e => { console.error('FAILED', e.message); process.exit(1); });
