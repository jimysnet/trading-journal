
(function(){
"use strict";
var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var DEF={risk:1,target:2,dayLoss:2,maxTrades:3,estR:true,estR2:false,maxDD:10};
var S={db:null,user:null,sample:null,uid:null,canWrite:true,live:false,names:{},avs:{},
  trades:[],strategies:[],checkins:[],accounts:{},goals:{},quiz:[],chat:[],confirms:[],demo:[],demoacct:{},drawings:[],files:[],settings:Object.assign({},DEF),
  filter:{who:'all',market:'all',strategy:'all',period:'all',acct:'all',tag:'all'}};
var LOCAL={trades:{},strategies:{},checkins:{},accounts:{},goals:{},quiz:{},chat:{},confirms:{},demo:{},demoacct:{},drawings:{},files:{},settings:{}};

/* ---------- helpers ---------- */
function n(v){var x=parseFloat(String(v).replace(',','.'));return isFinite(x)?x:NaN}
function fmt(x,d){if(!isFinite(x))return '–';d=d==null?2:d;return x.toLocaleString('el-GR',{minimumFractionDigits:d,maximumFractionDigits:d})}
function fR(x){return isFinite(x)?(x>0?'+':'')+fmt(x,2)+'R':'–'}
function fE(x){return isFinite(x)?(x>0?'+':'')+fmt(x,2)+' €':'–'}
function pct(x){return isFinite(x)?fmt(x*100,0)+'%':'–'}
function cls(x){return x>0?'pos':(x<0?'neg':'')}
function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function nowTime(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function dateGr(s){if(!s)return '';var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0].slice(2)}
function safeSeg(s){return String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g,'-').slice(0,180)||'x'}
function newId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function avg(a){return a.length?a.reduce(function(s,x){return s+x},0)/a.length:NaN}
function sum(a){return a.reduce(function(s,x){return s+x},0)}
var toastT;function toast(msg){var t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3200)}
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function name(uid){if(!uid)return '–';if(uid==='prof')return 'Καθηγητής (αυτόματος)';if(S.names[uid])return S.names[uid];return uid===S.uid?'Εγώ':'Συνεργάτης'}
function stratName(id){if(id==='_off')return 'Εκτός πλάνου';var s=S.strategies.find(function(x){return x.id===id});return s?s.name:'Χωρίς στρατηγική'}
function mine(t){return t.by===S.uid}

/* ---------- data layer ---------- */
function writeErr(e){
  var c=e&&e.code;
  if(c==='invalid_argument'){S.canWrite=false;applyWriteState();return 'Δεν έχεις δικαίωμα αποθήκευσης. Ζήτα από τον ιδιοκτήτη πρόσβαση Contributor ή Editor.'}
  if(c==='quota_exceeded')return 'Γέμισε ο χώρος αποθήκευσης. Σβήστε παλιές εγγραφές για να συνεχίσετε.';
  if(c==='resource_exhausted')return 'Πολλές αποθηκεύσεις μαζί. Περίμενε λίγο και ξαναδοκίμασε.';
  return 'Η αποθήκευση δεν έγινε. Έλεγξε τη σύνδεση και ξαναδοκίμασε.';
}
var LPT=null,LSWARN=false;
function lsOk(){try{var k='tj-ls-test';localStorage.setItem(k,'1');localStorage.removeItem(k);return true}catch(e){return false}}
function persistLocal(){if(S.db)return;clearTimeout(LPT);LPT=setTimeout(function(){try{localStorage.setItem('tj-local',JSON.stringify(LOCAL))}catch(e){if(!LSWARN){LSWARN=true;storeWarn(e&&(e.name==='QuotaExceededError'||e.code===22)?'Δεν υπάρχει αρκετός χώρος στον browser για να κρατηθούν οι τοπικές εγγραφές. Κάνε «Εξαγωγή JSON» στους Κανόνες ρίσκου για να μη χαθούν.':'Ο browser δεν επιτρέπει τοπική αποθήκευση (π.χ. ιδιωτική περιήγηση). Οι εγγραφές θα χαθούν με την ανανέωση· κάνε «Εξαγωγή JSON».')}}},400)}
function loadLocal(){try{var o=JSON.parse(localStorage.getItem('tj-local')||'null');if(o&&typeof o==='object'){Object.keys(o).forEach(function(c){if(o[c]&&typeof o[c]==='object')LOCAL[c]=o[c]});Object.keys(LOCAL).forEach(function(c){try{syncLocal(c)}catch(e){}});return true}}catch(e){}return false}
function storeWarn(msg){var el=$('#stWarn');if(!el){el=document.createElement('div');el.id='stWarn';el.className='stwarn';var m=$('main')||document.body;m.insertBefore(el,m.firstChild)}el.textContent='⚠️ '+msg;el.hidden=false;toast(msg)}
function storageCheck(){var bs=$('#bkStore');if(!lsOk()){storeWarn('Ο browser δεν επιτρέπει τοπική αποθήκευση. Ρυθμίσεις όπως φίλτρα, αγαπημένα και κεριά δεν θα θυμούνται'+(S.db?'.':', και οι τοπικές εγγραφές θα χαθούν με την ανανέωση.'));if(bs)bs.textContent='Τοπική αποθήκευση: μπλοκαρισμένη';return}
  if(navigator.storage&&navigator.storage.estimate)navigator.storage.estimate().then(function(e){var u=e.usage||0,q=e.quota||0,r=q?u/q:0;if(bs)bs.textContent='Τοπικός χώρος: '+fmt(u/1048576,1)+' MB'+(q?' από '+fmt(q/1048576,0)+' MB':'');if(r>0.9)storeWarn('Ο τοπικός χώρος του browser είναι σχεδόν γεμάτος ('+Math.round(r*100)+'%). Κάνε «Εξαγωγή JSON» και καθάρισε δεδομένα ιστότοπων αν χρειαστεί.')}).catch(function(){});
  else{var tot=0;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);tot+=(k.length+(localStorage.getItem(k)||'').length)*2}}catch(e){}if(bs)bs.textContent='Τοπικός χώρος: '+fmt(tot/1048576,1)+' MB';if(tot>4.5*1048576)storeWarn('Ο τοπικός χώρος του browser είναι σχεδόν γεμάτος. Κάνε «Εξαγωγή JSON».')}}
function put(coll,id,data){
  if(S.db){
    var ref=coll==='settings'?S.db.doc('settings/main'):S.db.collection(coll).doc(id);
    return ref.set(data).catch(function(e){
      if(e&&e.code==='unavailable'){return new Promise(function(r){setTimeout(r,600+Math.random()*600)}).then(function(){return ref.set(data)})}
      throw e;
    });
  }
  (LOCAL[coll]=LOCAL[coll]||{})[id]=data;try{syncLocal(coll)}catch(e){}persistLocal();render();return Promise.resolve();
}
function remove(coll,id){
  if(S.db)return S.db.collection(coll).doc(id).delete();
  if(LOCAL[coll])delete LOCAL[coll][id];try{syncLocal(coll)}catch(e){}persistLocal();render();return Promise.resolve();
}
function syncLocal(coll){
  var m=LOCAL[coll];
  if(coll==='accounts'){S.accounts=Object.assign({},m);return}
  if(coll==='demoacct'){S.demoacct=Object.assign({},m);return}
  if(coll==='goals'){S.goals=Object.assign({},m);fillGoalForm();return}
  if(coll==='settings'){S.settings=Object.assign({},DEF,m.main||{});return}
  S[coll]=Object.keys(m).map(function(k){return Object.assign({id:k},m[k])});
}
function subscribe(){
  var db=S.db, onErr=function(e){if(!e)return;if(e.code==='revoked')notice('Η πρόσβαση στα δεδομένα άλλαξε. Ανανέωσε τη σελίδα.');else notice('Πρόβλημα σύνδεσης με την αποθήκευση. Ανανέωσε τη σελίδα. ('+(e.code||'error')+')')};
  subscribeTrades(db,onErr);
  db.collection('strategies').onSnapshot(function(s){S.strategies=s.docs.map(function(d){return Object.assign({id:d.id},d.data())}).sort(function(a,b){return (a.name||'').localeCompare(b.name||'','el')});render()},onErr);
  db.collection('checkins').orderBy('date','desc').limit(400).onSnapshot(function(s){S.checkins=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});fillCheckin();try{renderCiHist()}catch(e){}},onErr);
  db.collection('accounts').onSnapshot(function(s){var o={};s.docs.forEach(function(d){o[d.id]=d.data()});S.accounts=o;fillAccount();render()},onErr);
  db.doc('settings/main').onSnapshot(function(s){S.settings=Object.assign({},DEF,s.exists?s.data():{});fillParams();render()},onErr);
  db.collection('quiz').orderBy('date','desc').limit(1000).onSnapshot(function(s){S.quiz=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});renderProf();loadNames();profGreet()},onErr);
  db.collection('demo').orderBy('at','desc').limit(1000).onSnapshot(function(s){S.demo=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});renderDemo();loadNames()},onErr);
  db.collection('files').orderBy('at','desc').limit(500).onSnapshot(function(s){S.files=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});if(grpIsOpen()&&GRP.view==='lib')renderGroup();loadNames()},onErr);
  db.collection('drawings').onSnapshot(function(s){S.drawings=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});if(typeof pcOnDrawSnap==='function')pcOnDrawSnap()},onErr);
  db.collection('demoacct').onSnapshot(function(s){var o={};s.docs.forEach(function(d){o[d.id]=d.data()});S.demoacct=o;renderDemo()},onErr);
  db.collection('props').onSnapshot(function(s){S.props=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});if(QZ.tab==='props'&&!$('#profPanel').hidden)renderProps();if(!PP.bf){PP.bf=true;setTimeout(ppBackfill,4000)}},onErr);
  db.collection('qbank').onSnapshot(function(s){S.qb=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});S.qbMap={};S.qb.forEach(function(g){S.qbMap[g.id]=g});if(QZ.tab==='prac'&&!$('#profPanel').hidden&&(!QZ.prac||QZ.prac.ch!=null))renderQPrac()},onErr);
  db.collection('prac').onSnapshot(function(s){S.prac={};s.docs.forEach(function(d){S.prac[d.id]=d.data()});if(!PR.dirty){var m=S.prac[prId()];PR.me=m?JSON.parse(JSON.stringify(m)):null}if(QZ.tab==='prac'||QZ.tab==='board')renderProf()},onErr);
  db.collection('class').onSnapshot(function(s){S.cls={};s.docs.forEach(function(d){S.cls[d.id]=d.data()});if(!CLS.dirty){var m0=S.cls[clsId()];CLS.me=m0?JSON.parse(JSON.stringify(m0)):null}renderProfIfClass()},onErr);
  db.collection('confirms').orderBy('at','desc').limit(1000).onSnapshot(function(s){S.confirms=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});renderConfirms();if(QZ.tab==='chat'&&!$('#profPanel').hidden&&!PCH.busy&&$('#pchat'))renderChat();loadNames()},onErr);
  db.collection('chatrx').orderBy('at','desc').limit(1000).onSnapshot(function(s){S.chatrx=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});if(grpIsOpen()&&GRP.view==='chat')renderGroup()},function(){});
  db.collection('typing').onSnapshot(function(s){S.typing=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});grpTypeShow()},function(){});
  db.collection('chat').orderBy('at','desc').limit(500).onSnapshot(function(s){S.chat=s.docs.map(function(d){return Object.assign({id:d.id},d.data())}).reverse();grpOnData();loadNames()},onErr);
  db.collection('goals').onSnapshot(function(s){var o={};s.docs.forEach(function(d){o[d.id]=d.data()});S.goals=o;fillGoalForm();render()},onErr);
}
/* trades: one window per quarter (the store caps a query at 1000 documents) */
var TPARTS={},tTimer=null;
function subscribeTrades(db,onErr){
  var now=new Date(),q0=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1),iso=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  var dd=function(x){var p=x.split('-');return new Date(+p[0],+p[1]-1,+p[2])};
  var merge=function(){if(tTimer)return;tTimer=setTimeout(function(){tTimer=null;var all=[],seen={};Object.keys(TPARTS).forEach(function(k){TPARTS[k].forEach(function(t){if(!seen[t.id]){seen[t.id]=1;all.push(t)}})});
    all.sort(function(a,b){return (b.date||'').localeCompare(a.date||'')});S.trades=all;S.live=true;render();loadNames()},60)};
  var sub=function(a,b){
    var k=a+'|'+b,q=db.collection('trades').where('date','>=',a).where('date','<',b).limit(1000),un=null,done=false;
    un=q.onSnapshot(function(s){if(done)return;
      if(s.docs.length>=1000){var A=dd(a),B=dd(b>'9000'?iso(new Date(now.getFullYear()+1,0,1)):b),days=Math.round((B-A)/864e5);
        if(a<'1000')A=dd('2015-01-01');
        if(days>1){done=true;try{un&&un()}catch(e){}delete TPARTS[k];var m=new Date(A.getTime()+Math.floor(days/2)*864e5),ms=iso(m);sub(a,ms);sub(ms,b);merge();return}
        notice('Μία ημέρα έχει πάνω από 1000 συναλλαγές και δεν φαίνονται όλες.')}
      TPARTS[k]=s.docs.map(function(x){return Object.assign({id:x.id},x.data())});merge()},onErr);
  };
  var cut=[],d=new Date(q0);cut.push('9999-12-31',iso(d));for(var i=1;i<=8;i++){d.setMonth(d.getMonth()-3);cut.push(iso(d))}cut.push('0000-01-01');
  for(var c=0;c<cut.length-1;c++)sub(cut[c+1],cut[c]);
}
var namesBusy=false;
function loadNames(){
  if(!S.user||namesBusy)return;
  var ids={};S.trades.forEach(function(t){if(t.by)ids[t.by]=1});(S.quiz||[]).forEach(function(t){if(t.by)ids[t.by]=1});Object.keys(S.accounts||{}).forEach(function(k){var a=S.accounts[k];if(a&&a.by)ids[a.by]=1});Object.keys(S.goals||{}).forEach(function(k){var g=S.goals[k];if(g&&g.by)ids[g.by]=1});if(S.uid)ids[S.uid]=1;(S.chat||[]).forEach(function(x){if(x.by)ids[x.by]=1});(S.confirms||[]).forEach(function(x){if(x.by)ids[x.by]=1});(S.demo||[]).forEach(function(x){if(x.by)ids[x.by]=1});
  var list=Object.keys(ids);if(!list.length)return;
  namesBusy=true;
  S.user.profiles(list).then(function(ps){
    var changed=false;list.forEach(function(id){var nm=ps&&ps[id]&&ps[id].name||'';if(nm&&S.names[id]!==nm){S.names[id]=nm;changed=true}var av=ps&&ps[id]&&ps[id].avatarUrl||'';if(av&&S.avs[id]!==av){S.avs[id]=av;changed=true;S.avCh=1}});
    if(changed)render();if(S.avCh&&grpIsOpen()&&GRP.view==='chat'){S.avCh=0;renderGroup()}
  }).catch(function(){}).then(function(){namesBusy=false});
}
function notice(msg){var el=$('#notice');el.textContent=msg;el.hidden=!msg}

/* ---------- maths ---------- */
function calcR(t){
  var e=n(t.entry),s=n(t.stop),x=n(t.exit);
  if(!isFinite(e)||!isFinite(s)||!isFinite(x)||e===s)return NaN;
  return t.dir==='short'?(e-x)/(s-e):(x-e)/(e-s);
}
function sortTime(a,b){return ((a.date||'')+(a.time||'')+(a.createdAt||'')).localeCompare((b.date||'')+(b.time||'')+(b.createdAt||''))}
function hasR(t){return typeof t.r==='number'&&isFinite(t.r)}
function ownerBal(t){var a=S.accounts[safeSeg(t.by||S.uid||'me')];return a?n(a.balance):NaN}
function estimateR(){
  var on=S.settings.estR2===true,rk=n(S.settings.risk)||1,miss=0;
  S.trades.forEach(function(t){
    if(t._est){t.r=null;t._est=false;t._stop=null;t._risk=null}
    if(!on||t.status!=='closed'||hasR(t))return;
    if(isFinite(n(t.stop))&&n(t.stop)!==n(t.entry))return;
    var p=n(t.pnl),b=ownerBal(t);if(!isFinite(p))return;
    if(!(b>0)){miss++;return}
    var risk=b*rk/100;t.r=+(p/risk).toFixed(3);t._est=true;t._risk=risk;
    var e=n(t.entry),q=n(t.size);if(isFinite(e)&&q>0)t._stop=t.dir==='short'?e+risk/q:e-risk/q;
  });
  S.estMissing=miss;
}
function cleanDoc(t){var d=Object.assign({},t);delete d.id;if(d._est)d.r=null;delete d._est;delete d._stop;delete d._risk;return d}
function closed(list){return list.filter(function(t){return t.status==='closed'&&hasR(t)}).sort(sortTime)}
function stats(list){
  var c=closed(list),rs=c.map(function(t){return t.r});
  var w=rs.filter(function(r){return r>0}),l=rs.filter(function(r){return r<=0});
  var gw=sum(w),gl=-sum(l),eq=[],cum=0,peak=0,dd=0;
  rs.forEach(function(r){cum+=r;eq.push(cum);peak=Math.max(peak,cum);dd=Math.min(dd,cum-peak)});
  var streak=0,worst=0;rs.forEach(function(r){streak=r<=0?streak+1:0;worst=Math.max(worst,streak)});
  return {c:c,n:c.length,wins:w.length,winRate:c.length?w.length/c.length:NaN,avgR:avg(rs),avgWin:avg(w),avgLoss:avg(l),
    pf:gl>0?gw/gl:(gw>0?Infinity:NaN),totalR:sum(rs),pnl:sum(c.map(function(t){return n(t.pnl)||0})),eq:eq,dd:dd,worstStreak:worst};
}
function group(list,keyFn){
  var g={};closed(list).forEach(function(t){var k=keyFn(t);if(k==null)return;(g[k]=g[k]||[]).push(t)});
  return Object.keys(g).map(function(k){var st=stats(g[k]);return {key:k,n:st.n,winRate:st.winRate,avgR:st.avgR,totalR:st.totalR,pnl:st.pnl}}).sort(function(a,b){return b.n-a.n});
}
function filtered(){
  var f=S.filter,cut=null;
  if(f.period==='ytd')cut=new Date().getFullYear()+'-01-01';
  else if(f.period!=='all'){var d=new Date();d.setDate(d.getDate()-parseInt(f.period,10));cut=d.toISOString().slice(0,10)}
  return S.trades.filter(function(t){
    if(f.who!=='all'&&t.by!==f.who)return false;
    if(f.market!=='all'&&t.market!==f.market)return false;
    if(f.acct&&f.acct!=='all'&&(t.account||'')!==(f.acct==='none'?'':f.acct))return false;
    if(f.strategy!=='all'&&(t.strategyId||'')!==(f.strategy==='none'?'':f.strategy))return false;
    if(f.tag&&f.tag!=='all'&&(t.tags||[]).indexOf(f.tag)<0)return false;
    if(cut&&t.date<cut)return false;
    return true;
  });
}
function dayState(uid){
  var d=today(),set=S.settings;
  var tt=S.trades.filter(function(t){return t.by===uid&&t.date===d});
  var cl=closed(tt),r=sum(cl.map(function(t){return t.r})),pnl=sum(cl.map(function(t){return n(t.pnl)||0}));
  var level='ok';
  if(r<=-set.dayLoss)level='stop';else if(tt.length>=set.maxTrades)level='stop';else if(r<=-set.dayLoss/2||tt.length===set.maxTrades-1)level='warn';
  return {trades:tt,count:tt.length,r:r,pnl:pnl,level:level,open:tt.filter(function(t){return t.status!=='closed'}).length};
}

/* ---------- the analyst ---------- */
function insights(list){
  var out=[],st=stats(list),set=S.settings,c=st.c;
  var est=c.filter(function(t){return t._est}).length,nsi=noStopInfo(list);if(nsi.n&&set.estR2!==true)out.push({lv:'warn',t:nsi.n+' κλειστές συναλλαγές δεν έχουν stop και μένουν έξω από τα στατιστικά R (PnL τους '+fE(nsi.pnl)+'). Το πραγματικό σύνολο όλων είναι '+fE(nsi.all)+'. Συμπληρώστε stop ή ρίσκο € στο «Συμπλήρωσε τα κενά» ή με τη μπάρα του Ιστορικού.'});
  if(est)out.push({lv:'info',t:est+' από τις '+c.length+' κλειστές συναλλαγές δεν έχουν stop. Το R τους είναι εκτίμηση: κέρδος ή ζημιά ÷ '+fmt(set.risk,1)+'% του υπολοίπου (σημάδι ≈ στον πίνακα). Αλλάζει στους Κανόνες ρίσκου.'});
  if(S.estMissing&&set.estR2===true)out.push({lv:'warn',t:S.estMissing+' συναλλαγές χωρίς stop δεν μετράνε στα στατιστικά, γιατί δεν έχει μπει υπόλοιπο λογαριασμού. Βάλτε το στους Κανόνες ρίσκου → Ο λογαριασμός μου.'});
  if(!c.length){out.push({lv:'info',t:'Δεν υπάρχουν κλειστές συναλλαγές ακόμα. Ο αναλυτής ξεκινά να βγάζει συμπεράσματα από την πρώτη κλειστή συναλλαγή και γίνεται αξιόπιστος γύρω στις 30.'});return out}
  if(st.n<30)out.push({lv:'info',ref:'p-change',t:st.n+' κλειστές συναλλαγές. Κάτω από 30 τα ποσοστά αλλάζουν πολύ από τύχη, οπότε δείτε τα παρακάτω σαν ενδείξεις.'});
  if(isFinite(st.avgWin)&&isFinite(st.avgLoss)&&st.n>=8){
    var be=(-st.avgLoss)/(st.avgWin-st.avgLoss);
    if(st.winRate<be)out.push({lv:'warn',ref:'breakeven',t:'Με μέσο κέρδος '+fR(st.avgWin)+' και μέση απώλεια '+fR(st.avgLoss)+' χρειάζεστε επιτυχία πάνω από '+pct(be)+' για να μη χάνετε. Τώρα είστε στο '+pct(st.winRate)+'.'});
    else out.push({lv:'good',t:'Η επιτυχία σας ('+pct(st.winRate)+') είναι πάνω από το νεκρό σημείο των '+pct(be)+' για το μέσο κέρδος και τη μέση απώλειά σας.'});
  }
  var wins=c.filter(function(t){return t.r>0});
  if(wins.length>=5&&st.avgWin<set.target*0.8)out.push({lv:'warn',ref:'expectancy',t:'Οι κερδισμένες κλείνουν κατά μέσο όρο στο '+fR(st.avgWin)+', ενώ ο στόχος είναι '+fmt(set.target,1)+'R. Μάλλον κλείνετε νωρίτερα από το πλάνο. Δοκιμάστε για 10 συναλλαγές να μην αγγίζετε τη θέση μέχρι stop ή στόχο.'});
  var big=c.filter(function(t){return t.r<-1.15});
  if(big.length>=2&&big.length/c.length>=0.1)out.push({lv:'warn',ref:'orders',t:big.length+' απώλειες ξεπέρασαν το −1R. Αυτό σημαίνει stop που μετακινήθηκε, slippage, ή είσοδο χωρίς stop στην αγορά. Βάζετε το stop αμέσως μετά την είσοδο;'});
  var risky=c.filter(function(t){return isFinite(n(t.riskPct))&&n(t.riskPct)>set.risk*1.25});
  if(risky.length)out.push({lv:'warn',ref:'possize',t:risky.length+' συναλλαγές είχαν ρίσκο πάνω από '+fmt(set.risk,1)+'% του λογαριασμού. Χρησιμοποιήστε την προτεινόμενη ποσότητα της φόρμας.'});
  var fol=c.filter(function(t){return t.rules===true}),brk=c.filter(function(t){return t.rules===false});
  if(fol.length>=3&&brk.length>=3){var a=avg(fol.map(function(t){return t.r})),b=avg(brk.map(function(t){return t.r}));
    out.push({lv:b<a?'warn':'info',ref:'p-checklist',t:'Όταν τηρείτε τους κανόνες: μέσο '+fR(a)+' ανά συναλλαγή ('+fol.length+'). Όταν τους σπάτε: '+fR(b)+' ('+brk.length+').'+(b<a?' Η πειθαρχία σας κοστίζει '+fmt(a-b,2)+'R ανά συναλλαγή.':'')})}
  else if(brk.length>=2)out.push({lv:'warn',t:brk.length+' από τις '+st.n+' συναλλαγές έγιναν εκτός κανόνων. Χρειάζονται λίγες ακόμα για να φανεί πόσο κοστίζουν.'});
  var emo=group(list,function(t){return t.emotion||null}).filter(function(g){return g.n>=3});
  if(emo.length>=2){var worst=emo.slice().sort(function(x,y){return x.avgR-y.avgR})[0];
    if(worst.avgR<0&&worst.avgR<st.avgR-0.2)out.push({lv:'warn',ref:'p-biases',t:'Με διάθεση «'+worst.key+'» βγάζετε μέσο '+fR(worst.avgR)+' σε '+worst.n+' συναλλαγές. Κανόνας που αξίζει: όταν νιώθω «'+worst.key+'», δεν ανοίγω θέση.'})}
  group(list,function(t){return t.strategyId||''}).forEach(function(g){
    var nm=stratName(g.key);
    var sp=function(x){return '<span>'+esc(x)+'</span>'},nmH='«<span class="ud">'+esc(nm)+'</span>»';
    if(g.n>=10&&g.avgR<0){var r1='έχει αρνητικό μέσο ('+fR(g.avgR)+') σε '+g.n+' συναλλαγές. Πρόταση: παύση, έλεγχος των κανόνων της και backtest σε 30 ιστορικά παραδείγματα στο TradingView πριν ξαναπαιχτεί.';out.push({lv:'stop',ref:'p-backtest',t:'Η στρατηγική «'+nm+'» '+r1,h:sp('Η στρατηγική')+' '+nmH+' '+sp(r1)})}
    else if(g.n>=10&&g.avgR>=0.25){var r2='δουλεύει: '+fR(g.avgR)+' ανά συναλλαγή σε '+g.n+'. Κρατήστε τη σταθερή και μην αλλάζετε τους κανόνες της.';out.push({lv:'good',t:'Η στρατηγική «'+nm+'» '+r2,h:sp('Η στρατηγική')+' '+nmH+' '+sp(r2)})}
    else if(g.n>=5&&g.n<10){var r3=g.n+' συναλλαγές, μέσο '+fR(g.avgR)+'. Χρειάζονται τουλάχιστον 10 για πρώτο συμπέρασμα.';out.push({lv:'info',t:'«'+nm+'»: '+r3,h:nmH+': '+sp(r3)})}
  });
  var mk=group(list,function(t){return t.market}).filter(function(g){return g.n>=5});
  if(mk.length===2){var s1=mk.find(function(g){return g.key==='stock'}),c1=mk.find(function(g){return g.key==='crypto'});
    if(s1&&c1&&Math.abs(s1.avgR-c1.avgR)>=0.3){var better=s1.avgR>c1.avgR?['μετοχές',s1,'crypto',c1]:['crypto',c1,'μετοχές',s1];
      out.push({lv:'info',t:'Πάτε καλύτερα στα '+better[0]+' ('+fR(better[1].avgR)+') παρά στα '+better[2]+' ('+fR(better[3].avgR)+'). Σκεφτείτε να μειώσετε το ρίσκο στο μισό στα '+better[2]+' μέχρι να βελτιωθούν.'})}}
  var after=[],byP={};c.forEach(function(t){(byP[t.by||'x']=byP[t.by||'x']||[]).push(t)});
  Object.keys(byP).forEach(function(k){var a=byP[k];for(var i=2;i<a.length;i++){if(a[i-1].r<=0&&a[i-2].r<=0)after.push(a[i].r)}});
  if(after.length>=4&&avg(after)<st.avgR-0.2)out.push({lv:'warn',ref:'breakers',t:'Μετά από δύο συνεχόμενες απώλειες, η επόμενη συναλλαγή βγάζει μέσο '+fR(avg(after))+' ('+after.length+' φορές). Κανόνας: μετά από 2 χαμένες, κλείνεις το TradingView για την υπόλοιπη μέρα.'});
  var withM=c.filter(function(t){return isFinite(n(t.mfe))});
  if(withM.length>=10){
    var r3=withM.filter(function(t){return n(t.mfe)>=3}).length/withM.length,rT=withM.filter(function(t){return n(t.mfe)>=set.target}).length/withM.length;
    if(r3>=0.4&&set.target<3)out.push({lv:'info',t:'Το '+pct(r3)+' των συναλλαγών κινήθηκε τουλάχιστον 3R υπέρ σας. Πείραμα: σε μία στρατηγική, στόχος 3R για τις επόμενες 20 συναλλαγές, και σύγκριση.'});
    if(rT<0.3)out.push({lv:'info',t:'Μόνο το '+pct(rT)+' των συναλλαγών έφτασε τον στόχο των '+fmt(set.target,1)+'R. Πείραμα: στόχος 1,5R ή κλείσιμο μισής θέσης στο 1R και stop στο σημείο εισόδου.'});
  } else if(st.n>=10&&withM.length<5)out.push({lv:'info',t:'Συμπληρώνετε το πεδίο «Μέγιστη κίνηση υπέρ (R)»; Με αυτό ο αναλυτής μπορεί να σας πει αν ο στόχος των '+fmt(set.target,1)+'R είναι πολύ κοντά ή πολύ μακριά.'});
  if(isFinite(st.dd)&&st.dd<=-6)out.push({lv:'warn',ref:'drawdown',t:'Η μεγαλύτερη πτώση από κορυφή ήταν '+fR(st.dd)+'. Με ρίσκο '+fmt(set.risk,1)+'% αυτό είναι περίπου '+fmt(-st.dd*set.risk,1)+'% του λογαριασμού. Αν σας ενοχλεί, μειώστε το ρίσκο στο 0,5% μέχρι να ανακάμψετε.'});
  return out;
}
function renderInsights(el,items,max){
  el.innerHTML='';
  var order={stop:0,warn:1,good:2,info:3};
  items.slice().sort(function(a,b){return order[a.lv]-order[b.lv]}).slice(0,max||99).forEach(function(i){
    var li=document.createElement('li');li.className=i.lv;li.innerHTML='<span class="dot" aria-hidden="true"></span><div class="ins"><p></p></div>';if(i.h)li.querySelector('p').innerHTML=i.h;else li.querySelector('p').textContent=i.t;
    if(i.ref&&window.Manual&&Manual.title(i.ref)){var bt=document.createElement('button');bt.type='button';bt.className='btn small';bt.setAttribute('data-ref',i.ref);bt.textContent='Μπούσουλας: '+Manual.title(i.ref);li.querySelector('.ins').appendChild(bt)}
    el.appendChild(li);
  });
}

/* ---------- rendering ---------- */
function render(){try{rsCounts()}catch(e){}try{var hs=$('section[data-panel=history]');if(hs&&!hs.hidden){clearTimeout(HI.rt);HI.rt=setTimeout(hiRender,150)}}catch(e){}try{renderCiHist()}catch(e){}try{symListFill()}catch(e){}
  estimateR();updatePlaybook(true);syncManual();renderWho();renderFilters();renderStrategySelects();renderToday();renderTrades();renderStrategies();renderStats();updateCalc();explainParams();renderProf();renderConfirms();renderDemo();
}
function renderWho(){
  var t=S.db?(S.live?'Κοινό ημερολόγιο · συνδεδεμένος ως '+name(S.uid):'Σύνδεση…'):'Τοπική λειτουργία';
  $('#whoami').textContent=t;
}
function renderFilters(){
  var sel=$('#f-who'),v=S.filter.who,ids={};S.trades.forEach(function(t){if(t.by)ids[t.by]=1});
  var html='<option value="all">Όλοι</option>';Object.keys(ids).forEach(function(id){html+='<option value="'+esc(id)+'">'+esc(name(id))+'</option>'});
  sel.innerHTML=html;sel.value=ids[v]||v==='all'?v:'all';
  var fs=$('#f-strategy'),sv=S.filter.strategy;
  fs.innerHTML='<option value="all">Όλες</option><option value="none">Χωρίς στρατηγική</option>'+S.strategies.map(function(s){return '<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>'}).join('');
  fs.value=sv;if(fs.value!==sv){fs.value='all';S.filter.strategy='all'}
  $('#f-market').value=S.filter.market;$('#f-period').value=S.filter.period;
  var accts=accounts(),fa=$('#f-acct'),av=S.filter.acct||'all';
  fa.innerHTML='<option value="all">Όλοι</option>'+(S.trades.some(function(t){return !t.account})?'<option value="none">Χωρίς λογαριασμό</option>':'')+accts.map(function(a){return '<option value="'+esc(a)+'">'+esc(a)+'</option>'}).join('');
  fa.value=av;if(fa.value!==av){fa.value='all';S.filter.acct='all'}
  var dl=$('#acctList');if(dl)dl.innerHTML=accts.map(function(a){return '<option value="'+esc(a)+'"></option>'}).join('');
}
function accounts(){var m={};S.trades.forEach(function(t){if(t.account)m[t.account]=1});return Object.keys(m).sort(function(a,b){return a.localeCompare(b)})}
function renderStrategySelects(){impStrategies();
  var s=$('#t-strategy'),v=s.value;
  var so=S.strategies.filter(function(x){return x.active!==false}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>'}).join('');
  s.innerHTML='<option value="">— Διάλεξε στρατηγική —</option>'+so+'<option value="_off">Εκτός πλάνου (χωρίς setup)</option>';
  s.value=v;var bs=$('#bulkStrat');if(bs){var bv=bs.value;bs.innerHTML='<option value="">Στρατηγική: –</option>'+so+'<option value="_off">Εκτός πλάνου</option>';bs.value=bv}
}
function renderToday(){
  var d=today();$('#todayDate').textContent=dateGr(d);
  var ds=dayState(S.uid),set=S.settings,box=$('#dayStatus');
  box.className='status '+ds.level;
  var left=set.maxTrades-ds.count,room=set.dayLoss+ds.r;
  var head,sub;
  if(ds.r<=-set.dayLoss){head='Τέλος για σήμερα';sub='Έφτασες το όριο απώλειας της ημέρας ('+fR(-set.dayLoss)+'). Κλείσε το TradingView. Αύριο ξεκινάς από την αρχή.'}
  else if(ds.count>=set.maxTrades){head='Έκανες τις '+set.maxTrades+' συναλλαγές της ημέρας';sub='Το όριο υπάρχει για να μην κυνηγάς. Γράψε τον απολογισμό και τα λέμε αύριο.'}
  else if(ds.count===0){head='Έτοιμος για την πρώτη συναλλαγή';sub='Γράψε το πλάνο σου στο check-in πριν ανοίξεις το TradingView.'}
  else if(ds.level==='warn'){head='Πρόσεχε';sub='Απομένουν '+left+(left===1?' συναλλαγή':' συναλλαγές')+' και '+fmt(Math.max(room,0),1)+'R μέχρι το όριο απώλειας.'}
  else{head='Μέσα στο πλάνο';sub='Απομένουν '+left+(left===1?' συναλλαγή':' συναλλαγές')+' και '+fmt(Math.max(room,0),1)+'R μέχρι το όριο απώλειας.'}
  var tw=timeWarn(new Date());if(tw&&ds.level!=='stop'){sub+=' '+tw;if(box.className.indexOf('ok')>=0)box.className='status warn'}
  box.innerHTML='<strong></strong><span></span>';box.querySelector('strong').textContent=(ds.level==='stop'?'🔒 ':'')+head;box.querySelector('span').textContent=sub+(ds.level==='stop'?' Η φόρμα συναλλαγών είναι κλειδωμένη μέχρι αύριο.':'');
  $('#dayKpis').innerHTML=kpi('Συναλλαγές',ds.count+' / '+set.maxTrades,'σήμερα')+kpi('Αποτέλεσμα',fR(ds.r),'κλειστές σήμερα',cls(ds.r))+kpi('Σε ευρώ',fE(ds.pnl),'μετά από προμήθειες',cls(ds.pnl));
  var used=Math.min(1,Math.max(0,-ds.r/set.dayLoss));$('#limitBar').style.width=(used*100)+'%';
  $('#limitTxt').textContent=fR(ds.r)+' από '+fR(-set.dayLoss);
  var mineList=S.trades.filter(mine);
  var ins=insights(mineList);
  if(ds.level==='stop')ins.unshift({lv:'stop',ref:'breakers',t:head+'. '+sub});
  var insX=window.__insx;if(insX===undefined){try{insX=localStorage.getItem('tj-insx')==='1'}catch(e){insX=false}}
  renderInsights($('#insightsToday'),ins,insX?12:2);
  var imb=$('#insMore');if(imb){var tot=Math.min(ins.length,12);imb.hidden=!insX&&tot<=2;imb.textContent=insX?'Λιγότερα ▴':'Όλες οι γνώμες ('+tot+') ▾';imb.setAttribute('aria-expanded',insX)}
  renderRisk();renderGoals();renderProp();
  var open=S.trades.filter(function(t){return t.status!=='closed'}).sort(sortTime).reverse(),ol=$('#openList');
  if(!open.length){ol.innerHTML='<div class="empty">Καμία ανοιχτή θέση. Όταν καταγράφεις συναλλαγή χωρίς τιμή εξόδου, εμφανίζεται εδώ για να την κλείσεις αργότερα.</div>';return}
  ol.innerHTML='<div class="tw"><table><thead><tr><th>Ημ/νία</th><th>Ποιος</th><th>Σύμβολο</th><th>Θέση</th><th class="r">Είσοδος</th><th class="r">Stop</th><th class="r">Στόχος</th><th></th></tr></thead><tbody>'+
    open.map(function(t){return '<tr><td>'+dateGr(t.date)+'</td><td>'+esc(name(t.by))+'</td><td><b>'+esc(t.symbol||'–')+'</b></td><td>'+dirPill(t)+'</td><td class="r num">'+esc(t.entry)+'</td><td class="r num">'+esc(t.stop)+'</td><td class="r num">'+esc(t.target||'–')+'</td><td><button class="btn small" type="button" data-close="'+esc(t.id)+'">Κλείσιμο</button></td></tr>'}).join('')+'</tbody></table></div>';
}
function kpi(l,v,s,c){return '<div class="kpi"><span class="lbl">'+esc(l)+'</span><b class="'+(c||'')+'">'+esc(v)+'</b><span class="s">'+esc(s||'')+'</span></div>'}
function dirPill(t){return '<span class="pill '+(t.dir==='short'?'loss':'gain')+'">'+(t.dir==='short'?'Short':'Long')+'</span> <span class="pill">'+(t.market==='crypto'?'Crypto':'Μετοχή')+'</span>'}
function renderTrades(){
  var list=filtered().slice().sort(sortTime).reverse(),tb=$('#tradeTable tbody'),sel=$('#t-id').value;
  $('#tradeCount').textContent=list.length+(list.length===1?' συναλλαγή':' συναλλαγές');
  Object.keys(SEL).forEach(function(id){if(!S.trades.some(function(t){return t.id===id}))delete SEL[id]});
  if(!list.length){bulkUI(list);tb.innerHTML='<tr><td colspan="9"><div class="empty">'+(S.trades.length?'Καμία συναλλαγή με αυτά τα φίλτρα.':'Το ημερολόγιο είναι άδειο. Συμπλήρωσε τη φόρμα αμέσως μετά από κάθε είσοδο στο TradingView, όσο τα θυμάσαι ακόμα.')+'</div></td></tr>';return}
  var sig=JSON.stringify(S.filter||{})+'|'+list.length;if(TP.sig!==sig){if(TP.sig&&TP.sig.split('|')[0]!==sig.split('|')[0])TP.page=0;TP.sig=sig}
  var pages=Math.max(1,Math.ceil(list.length/TP.size));if(TP.page>=pages)TP.page=pages-1;if(TP.page<0)TP.page=0;
  if(TP.goSel&&sel){var si=list.findIndex(function(t){return t.id===sel});if(si>=0)TP.page=Math.floor(si/TP.size)}TP.goSel=false;
  var from=TP.page*TP.size,full=list;list=list.slice(from,from+TP.size);tpPager(full.length,pages,from);
  tb.innerHTML=list.map(function(t){
    var cl=t.status==='closed';
    var own=!t.by||t.by===S.uid;
    return '<tr class="click'+(t.id===sel?' sel':'')+'" data-id="'+esc(t.id)+'" tabindex="0"><td class="ck"><input type="checkbox" data-sel="'+esc(t.id)+'"'+(SEL[t.id]?' checked':'')+(own?'':' disabled title="Μόνο ο ίδιος μπορεί να τη σβήσει"')+' aria-label="Επιλογή"></td><td>'+dateGr(t.date)+(t.overLimit?' <span class="pill warn" title="Καταγράφηκε πάνω από το ημερήσιο όριο">όριο</span>':'')+'</td><td>'+esc(name(t.by))+'</td><td><b>'+esc(t.symbol||'–')+'</b>'+(t.shots&&t.shots.length?' <span class="pill" title="Screenshots">▣ '+t.shots.length+'</span>':'')+(t.account?'<br><span class="acct">'+esc(t.account)+'</span>':'')+((t.tags||[]).length?'<br>'+t.tags.slice(0,3).map(function(g){return '<span class="tagpill ud">#'+esc(g)+'</span>'}).join(' '):'')+'</td><td>'+dirPill(t)+'</td><td>'+esc(stratName(t.strategyId))+'</td>'+
      '<td class="r num '+(cl?cls(t.r):'')+'">'+(cl?(hasR(t)?(t._est?'<span title="Χωρίς stop: R με ρίσκο '+fmt(S.settings.risk,1)+'% του υπολοίπου">≈ '+fR(t.r)+'</span>':fR(t.r)):'<span class="pill warn">χωρίς stop</span>'):'<span class="pill acc">ανοιχτή</span>')+'</td><td class="r num '+(cl?cls(t.pnl):'')+'">'+(cl?fE(n(t.pnl)):'')+'</td><td>'+(t.rules===false?'<span class="pill warn">Όχι</span>':(t.rules===true?'<span class="pill">Ναι</span>':'–'))+'</td></tr>';
  }).join('');
  bulkUI(full);
}
var SEL={};
var TP={page:0,size:(function(){var v=+store('tj-tpsize');return [10,20,50,100].indexOf(v)>=0?v:20})(),sig:''};
function tpPager(total,pages,from){var el=$('#tradePager');if(!el)return;if(total<=10&&TP.size>=10&&pages<=1){el.hidden=total===0;}else el.hidden=false;
  var to=Math.min(total,from+TP.size),btn=function(pg,lab,dis,cur){return '<button type="button" class="pgb'+(cur?' on':'')+'" data-pg="'+pg+'"'+(dis?' disabled':'')+'>'+lab+'</button>'};
  var nums=[],p=TP.page,lo=Math.max(0,p-2),hi=Math.min(pages-1,p+2);if(lo>0){nums.push(btn(0,'1',false,false));if(lo>1)nums.push('<span class="pgdots">…</span>')}for(var k=lo;k<=hi;k++)nums.push(btn(k,String(k+1),false,k===p));if(hi<pages-1){if(hi<pages-2)nums.push('<span class="pgdots">…</span>');nums.push(btn(pages-1,String(pages),false,false))}
  el.innerHTML='<span class="muted pginfo">'+(total?(from+1)+'–'+to+' από '+total:'0')+'</span><div class="pgnav">'+btn(p-1,'‹ Προηγούμενη',p<=0,false)+nums.join('')+btn(p+1,'Επόμενη ›',p>=pages-1,false)+'</div><label class="pgsize"><span class="muted">Ανά σελίδα</span><select id="tpSize">'+[10,20,50,100].map(function(v){return '<option'+(v===TP.size?' selected':'')+'>'+v+'</option>'}).join('')+'</select></label>'}
function bulkUI(list){
  var ids=Object.keys(SEL),bar=$('#bulkBar');bar.hidden=!ids.length;
  $('#bulkCount').textContent='Επιλέχθηκαν '+ids.length;
  var own=(list||[]).filter(function(t){return !t.by||t.by===S.uid}),all=$('#selAll');
  var on=own.filter(function(t){return SEL[t.id]}).length;
  all.checked=own.length>0&&on===own.length;all.indeterminate=on>0&&on<own.length;
  var b=$('#bulkDel');if(!b.dataset.busy){armDel(b,false);b.textContent='Διαγραφή επιλεγμένων'}
  try{renderFix();renderLock()}catch(e){}
}
function bulkDelete(){
  var b=$('#bulkDel'),ids=Object.keys(SEL);if(!ids.length)return;
  if(!b.dataset.armed){b.dataset.armed='1';b.textContent='Σίγουρα; Θα διαγραφούν '+ids.length+' συναλλαγές';return}
  b.dataset.busy='1';b.disabled=true;var i=0,ok=0;
  (function next(){
    if(i>=ids.length){SEL={};b.disabled=false;delete b.dataset.busy;toast('Διαγράφηκαν '+ok+' συναλλαγές');resetTradeForm();render();return}
    var id=ids[i++];b.textContent='Διαγραφή '+i+'/'+ids.length+'…';
    remove('trades',id).then(function(){ok++;delete SEL[id];next()}).catch(function(e){b.disabled=false;delete b.dataset.busy;toast(writeErr(e));render()});
  })();
}
var SICONS=[[/smc|liquid|ρευστότ|sweep|choch|bos/i,'💧','#2563eb'],[/order ?block|fvg|imbalance/i,'🧱','#7c3aed'],[/break ?out|σπάσιμο|όγκο/i,'🚀','#ea580c'],[/pull ?back|ema|retest|επιστροφ/i,'↩️','#0d9488'],[/range|αντιστροφ|reversal|άκρα/i,'↔️','#9333ea'],[/scalp/i,'⚡','#ca8a04'],[/trend|τάση|momentum/i,'📈','#16a34a'],[/fib|fibonacci/i,'🌀','#0891b2'],[/vwap/i,'〰️','#0284c7'],[/news|νέα|ειδήσ|earnings/i,'📰','#64748b'],[/gap/i,'🕳️','#475569'],[/rsi|macd|stoch|απόκλιση|divergence/i,'📊','#db2777'],[/dax|ger40|index|δείκτ/i,'🏛️','#334155'],[/opening|london|new york|session|kill/i,'⏰','#b45309']];
function stratIcon(s){var t=(s.name||'')+' '+(s.entry||'').slice(0,200);for(var i=0;i<SICONS.length;i++)if(SICONS[i][0].test(t))return SICONS[i];return [null,'🎯','#0f766e']}
function sFavs(){try{return JSON.parse(localStorage.getItem('tj-sfav')||'{}')}catch(e){return {}}}
function sFavSave(m){try{localStorage.setItem('tj-sfav',JSON.stringify(m))}catch(x){}}
window.__sfavIds=function(){var f=sFavs();return (S.strategies||[]).filter(function(s){return f[s.id]}).map(manualIdFor).filter(Boolean)};
var _rStrat=renderStrategies;renderStrategies=function(){_rStrat.apply(this,arguments);try{if(window.Manual&&Manual.favsChanged)Manual.favsChanged()}catch(e){}};
window.addEventListener('manual:fav',function(ev){var d=ev.detail||{},m=sFavs(),ch=false;(S.strategies||[]).forEach(function(s){if(manualIdFor(s)===d.id){if(d.on&&!m[s.id]){m[s.id]=1;ch=true}if(!d.on&&m[s.id]){delete m[s.id];ch=true}}});if(ch){sFavSave(m);renderStrategies()}});
function renderStrategies(){
  var el=$('#stratList');$('#stratEmpty').hidden=S.strategies.length>0;$('#stratHint').hidden=!S.strategies.length;var fav=sFavs(),open=el.querySelector('.stile[open]'),oid=open&&open.getAttribute('data-sid');
  var L=S.strategies.slice().sort(function(a,b){return (fav[b.id]?1:0)-(fav[a.id]?1:0)||(a.name||'').localeCompare(b.name||'')});
  $('#stratSum').textContent=S.strategies.length?S.strategies.length+' στρατηγικές · πάτα μία για λεπτομέρειες, ☆ για αγαπημένη':'';
  el.innerHTML=L.map(function(s){var mid=manualIdFor(s);
    var st=stats(S.trades.filter(function(t){return t.strategyId===s.id})),ic=stratIcon(s);
    var mk={both:'Μετοχές & crypto',stock:'Μετοχές',crypto:'Crypto'}[s.market||'both'];
    return '<details class="stile" data-sid="'+esc(s.id)+'"'+(s.id===oid?' open':'')+'><summary><span class="sico" style="background:'+ic[2]+'22;color:'+ic[2]+'">'+ic[1]+'</span><span class="smeta"><b>'+esc(s.name)+'</b><span>'+esc(mk+(s.tf?' · '+s.tf:''))+'</span></span>'+
      '<span class="sstat"><b class="num '+cls(st.totalR)+'">'+(st.n?fR(st.totalR):'–')+'</b>'+st.n+' συν.</span><button type="button" class="sfav'+(fav[s.id]?' on':'')+'" data-sfav="'+esc(s.id)+'" aria-label="Αγαπημένη">'+(fav[s.id]?'★':'☆')+'</button></summary><div class="sbody">'+
      '<div class="row" style="gap:.4rem;flex-wrap:wrap">'+(mid?'<button class="btn small" type="button" data-ref="'+esc(mid)+'">Μπούσουλας</button>':'')+'<button class="btn small" type="button" data-sedit="'+esc(s.id)+'">Επεξεργασία</button>'+(s.template?'<span class="pill acc">πρότυπο</span>':'')+'</div>'+
      '<div class="stats"><span>Συναλλαγές <b class="num">'+st.n+'</b></span><span>Επιτυχία <b class="num">'+pct(st.winRate)+'</b></span><span>Μέσο <b class="num '+cls(st.avgR)+'">'+fR(st.avgR)+'</b></span><span>Σύνολο <b class="num '+cls(st.totalR)+'">'+fR(st.totalR)+'</b></span></div>'+
      (s.entry?'<div><span class="lbl">Είσοδος</span><p class="rules">'+esc(s.entry)+'</p></div>':'')+
      (s.exit?'<div><span class="lbl">Stop και έξοδος</span><p class="rules">'+esc(s.exit)+'</p></div>':'')+
      (s.avoid?'<div><span class="lbl">Πότε δεν την παίζω</span><p class="rules">'+esc(s.avoid)+'</p></div>':'')+'</div></details>';
  }).join('');
}
function table(rows,labelFn){
  if(!rows.length)return '<div class="empty">Δεν υπάρχουν κλειστές συναλλαγές ακόμα.</div>';
  return '<table><thead><tr><th></th><th class="r">Πλήθος</th><th class="r">Επιτυχία</th><th class="r">Μέσο R</th><th class="r">Σύνολο R</th></tr></thead><tbody>'+
    rows.map(function(r){return '<tr><td>'+esc(labelFn(r.key))+'</td><td class="r num">'+r.n+'</td><td class="r num">'+pct(r.winRate)+'</td><td class="r num '+cls(r.avgR)+'">'+fR(r.avgR)+'</td><td class="r num '+cls(r.totalR)+'">'+fR(r.totalR)+'</td></tr>'}).join('')+'</tbody></table>';
}
var DAYS=['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο'];
function renderStats(){try{renderWeek()}catch(e){console.warn(e)}
  var list=filtered(),st=stats(list);
  $('#kpis').innerHTML=
    kpi('Κλειστές',String(st.n),st.n<30?'λιγότερες από 30':'αρκετές για συμπεράσματα')+
    kpi('Επιτυχία',pct(st.winRate),st.wins+' κερδισμένες')+
    kpi('Μέσο ανά συναλλαγή',fR(st.avgR),'expectancy',cls(st.avgR))+
    kpi('Profit factor',isFinite(st.pf)?fmt(st.pf,2):(st.pf===Infinity?'∞':'–'),'κέρδη / απώλειες',st.pf>1?'pos':(st.pf<1?'neg':''))+
    kpi('Σύνολο',fR(st.totalR),fE(st.pnl),cls(st.totalR))+
    kpi('Μέγιστη πτώση',fR(st.dd),'σερί απωλειών: '+st.worstStreak,st.dd<0?'neg':'')+
    (function(){var ns=noStopInfo(list);return ns.n?kpi('Χωρίς stop (εκτός R)',String(ns.n),'PnL '+fE(ns.pnl)+' · σύνολο όλων '+fE(ns.all),cls(ns.all)):''})();
  $('#equity').innerHTML=equitySvg(st.eq);
  $('#eqNote').textContent=st.n?'αθροιστικά, '+st.n+' συναλλαγές':'';
  renderInsights($('#insightsAll'),insights(list));
  $('#byStrategy').innerHTML=table(group(list,function(t){return t.strategyId||''}),stratName);
  $('#byMarket').innerHTML=table(group(list,function(t){return t.market}),function(k){return k==='crypto'?'Crypto':'Μετοχές'});
  $('#byEmotion').innerHTML=table(group(list,function(t){return t.emotion||'—'}),function(k){return k});
  var tm=group(list,function(t){if(!t.time)return null;var h=parseInt(t.time,10);return h<12?'1 Πρωί (πριν τις 12:00)':(h<17?'2 Απόγευμα (12:00–17:00)':'3 Βράδυ (μετά τις 17:00)')}).sort(function(a,b){return a.key.localeCompare(b.key)});
  var dy=group(list,function(t){return t.date?String(new Date(t.date+'T12:00:00').getDay()):null}).sort(function(a,b){return ((+a.key+6)%7)-((+b.key+6)%7)});
  $('#byTime').innerHTML=table(tm.concat(dy),function(k){return k.length>2?k.slice(2):DAYS[+k]});
  $('#byAcct').innerHTML=table(group(list,function(t){return t.account||'—'}),function(k){return k});
  renderAdv();renderPro();
}
function niceStep(range){var raw=range/4,p=Math.pow(10,Math.floor(Math.log10(raw||1))),m=raw/p;return (m<=1?1:m<=2?2:m<=5?5:10)*p}
function equitySvg(eq){
  if(eq.length<2)return '<div class="empty">Η καμπύλη εμφανίζεται μετά από δύο κλειστές συναλλαγές.</div>';
  var W=720,H=240,L=46,R=64,T=14,B=26,pts=[0].concat(eq);
  var lo=Math.min(0,Math.min.apply(null,pts)),hi=Math.max(0,Math.max.apply(null,pts));
  var step=niceStep(hi-lo||1);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
  var x=function(i){return L+(W-L-R)*i/(pts.length-1)},y=function(v){return T+(H-T-B)*(hi-v)/(hi-lo)};
  var g='';for(var v=lo;v<=hi+1e-9;v+=step){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'"></line><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+(v>0?'+':'')+fmt(v,step<1?1:0)+'R</text>'}
  var line=pts.map(function(p,i){return x(i).toFixed(1)+','+y(p).toFixed(1)}).join(' ');
  var area='M'+x(0)+','+y(0)+' L'+line.split(' ').join(' L')+' L'+x(pts.length-1)+','+y(0)+' Z';
  var last=pts[pts.length-1],xl=x(pts.length-1),yl=y(last);
  var xt='<text x="'+L+'" y="'+(H-6)+'">0</text><text x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+(pts.length-1)+' συναλλαγές</text>';
  var dx=10,dy=-8,P=pts.map(function(p,i){return [x(i),y(p)]}),y0=y(0),d3=P.slice(0,-1).map(function(p,i){var q=P[i+1];return '<polygon points="'+p[0].toFixed(1)+','+p[1].toFixed(1)+' '+q[0].toFixed(1)+','+q[1].toFixed(1)+' '+(q[0]+dx).toFixed(1)+','+(q[1]+dy).toFixed(1)+' '+(p[0]+dx).toFixed(1)+','+(p[1]+dy).toFixed(1)+'" class="eq3s'+(q[1]<p[1]?' up':'')+'"></polygon>'}).join('');
  var back='M'+(x(0)+dx)+','+(y0+dy)+' L'+P.map(function(p){return (p[0]+dx).toFixed(1)+','+(p[1]+dy).toFixed(1)}).join(' L')+' L'+(x(pts.length-1)+dx)+','+(y0+dy)+' Z';
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Αθροιστικό αποτέλεσμα σε R" class="eq3"><g class="grid">'+g+'</g><path class="eq3b" d="'+back+'"></path>'+d3+'<path class="eqarea" d="'+area+'" opacity=".7"></path><line class="zero" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0)+'" y2="'+y(0)+'"></line><polyline class="eqline" points="'+line+'"></polyline><circle class="end" cx="'+xl+'" cy="'+yl+'" r="4.5"></circle><text class="endlbl" x="'+(xl+8)+'" y="'+(yl+4)+'">'+fR(last)+'</text>'+xt+'</svg>';
}

/* ---------- advanced analyst ---------- */
var ADV={tab:'evo',px:null,pxInt:0};
var ADV_DESC={
  evo:'Συγκρίνει την τελευταία περίοδο με τις προηγούμενες και δείχνει αν βελτιώνεστε.',
  mkt:'Για κάθε συναλλαγή κοιτάει τι έκανε η τιμή μετά την είσοδο: πόσο πήγε υπέρ, πόσο κόντρα, ποιος στόχος θα απέδιδε καλύτερα και αν το stop ήταν πολύ κοντά.',
  mc:'Ανακατεύει τις πραγματικές σας συναλλαγές σε χιλιάδες τυχαίες σειρές και δείχνει πόσο μπορεί να πέσει ο λογαριασμός μόνο από τύχη, με το ρίσκο που διαλέγετε.',
  now:'Κρίνει την αγορά από τα πιο πρόσφατα κεριά, ελέγχει ποια στρατηγική ταιριάζει και αν υπάρχει σήμα, και προτείνει είσοδο, stop, στόχο και πιθανό κέρδος.',
  bt:'Τρέχει τους κανόνες μιας στρατηγικής του Μπούσουλα στις ίδιες τιμές και συγκρίνει το αποτέλεσμα με τις πραγματικές σας συναλλαγές.'};
function pad2(x){return String(x).padStart(2,'0')}
function lday(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())}
function advTab(t){
  if(['evo','mkt','bt','now','mc'].indexOf(t)<0)t='evo';ADV.tab=t;
  $$('.advtabs button').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-adv')===t?'true':'false')});
  $$('[data-advp]').forEach(function(p){p.hidden=p.getAttribute('data-advp')!==t});
  $('#priceBox').hidden=t==='evo'||t==='mc';$('#advDesc').textContent=ADV_DESC[t];store('tj-adv',t);
  renderAdv();
}
function fillAdvFilters(){
  var ids={};S.trades.forEach(function(t){if(t.by)ids[t.by]=1});
  ['evo','mkt','bt','mc'].forEach(function(p){
    var w=$('#'+p+'-who'),v=w.value||'all';
    w.innerHTML='<option value="all">Όλοι</option>'+Object.keys(ids).map(function(id){return '<option value="'+esc(id)+'">'+esc(name(id))+'</option>'}).join('');
    w.value=(ids[v]||v==='all')?v:'all';
    var a=$('#'+p+'-acct'),va=a.value||'all';
    a.innerHTML='<option value="all">Όλοι</option>'+accounts().map(function(x){return '<option value="'+esc(x)+'">'+esc(x)+'</option>'}).join('');
    a.value=va;if(a.value!==va)a.value='all';
    var s=$('#'+p+'-strat');
    if(s&&p!=='bt'){var vs=s.value||'all';
      s.innerHTML='<option value="all">Όλες</option><option value="none">Χωρίς στρατηγική</option>'+S.strategies.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>'}).join('');
      s.value=vs;if(s.value!==vs)s.value='all'}
  });
}
function advList(p){
  var w=$('#'+p+'-who').value,a=$('#'+p+'-acct').value,se=$('#'+p+'-strat'),me=$('#'+p+'-mkt');
  var s=se&&p!=='bt'?se.value:'all',m=me?me.value:'all';
  return S.trades.filter(function(t){
    return (w==='all'||t.by===w)&&(a==='all'||(t.account||'')===a)&&(s==='all'||(t.strategyId||'')===(s==='none'?'':s))&&(m==='all'||t.market===m)});
}
function renderAdv(){
  if(!$('#advCard'))return;
  fillAdvFilters();
  if(ADV.tab==='evo')renderEvo();
  else if(ADV.tab==='mkt')renderMkt();
  else if(ADV.tab==='mc'){renderMcInfo();if(!$('#mcOut').innerHTML)doMc()}
  else if(ADV.tab==='now'){renderNowInfo();if(ADV.px&&!NOW.last)doNow()}
  else renderBtInfo();
}
function insList(items){
  if(!items.length)return '';
  var order={stop:0,warn:1,good:2,info:3};
  return '<ul class="insights" style="margin-top:.9rem">'+items.slice().sort(function(a,b){return order[a.lv]-order[b.lv]}).map(function(i){return '<li class="'+i.lv+'"><span class="dot" aria-hidden="true"></span><div class="ins"><p>'+(i.h||esc(i.t))+'</p></div></li>'}).join('')+'</ul>';
}

/* ----- 1. evolution ----- */
function weekStart(ds){var d=new Date(ds+'T12:00:00');d.setDate(d.getDate()-((d.getDay()+6)%7));return lday(d)}
function perKey(ds,g){return g==='month'?ds.slice(0,7):g==='day'?ds:g==='year'?ds.slice(0,4):g==='quarter'?ds.slice(0,4)+'-Q'+(Math.floor((+ds.slice(5,7)-1)/3)+1):weekStart(ds)}
function perLabel(k,g){return g==='month'?k.slice(5,7)+'/'+k.slice(0,4):g==='year'?k:g==='quarter'?k.slice(5)+' '+k.slice(0,4):dateGr(k)}
function evoTimeOk(t){
  var f=$('#evo-from').value,to=$('#evo-to').value,h1=$('#evo-h1').value,h2=$('#evo-h2').value,dw=$('#evo-days').value;
  if(f&&t.date<f)return false;if(to&&t.date>to)return false;
  if(h1||h2){var tm=t.time||'';if(!tm)return false;var a=h1||'00:00',b=h2||'23:59';if(a<=b){if(tm<a||tm>b)return false}else if(tm<a&&tm>b)return false}
  if(dw!=='all'){var d=new Date(t.date+'T12:00:00').getDay();if(dw==='wd'&&(d===0||d===6))return false;if(dw==='we'&&d!==0&&d!==6)return false;if(/^\d$/.test(dw)&&d!==+dw)return false}
  return true;
}
function evoPreset(){
  var pr=$('#evo-preset').value;if(pr==='custom')return;
  var D=function(d){return lday(d)},now=new Date(),a1,a2=new Date(now),b1,b2;
  var add=function(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x};
  if(/^\d+$/.test(pr)){var n0=+pr;a1=add(now,-(n0-1));b2=add(a1,-1);b1=add(b2,-(n0-1))}
  else if(pr==='wk'){a1=new Date(weekStart(lday(now))+'T12:00:00');b1=add(a1,-7);b2=add(a1,-1)}
  else if(pr==='mtd'){a1=new Date(now.getFullYear(),now.getMonth(),1);b1=new Date(now.getFullYear(),now.getMonth()-1,1);b2=new Date(now.getFullYear(),now.getMonth(),0)}
  else if(pr==='qtd'){var q=Math.floor(now.getMonth()/3)*3;a1=new Date(now.getFullYear(),q,1);b1=new Date(now.getFullYear(),q-3,1);b2=new Date(now.getFullYear(),q,0)}
  else if(pr==='ytd'){a1=new Date(now.getFullYear(),0,1);b1=new Date(now.getFullYear()-1,0,1);b2=new Date(now.getFullYear()-1,11,31)}
  $('#evo-a1').value=D(a1);$('#evo-a2').value=D(a2);$('#evo-b1').value=D(b1);$('#evo-b2').value=D(b2);
}
function renderEvoAB(list){
  var out=$('#evoOut');if(!$('#evo-a1').value)evoPreset();
  var A=[$('#evo-a1').value,$('#evo-a2').value],B=[$('#evo-b1').value,$('#evo-b2').value];
  if(!A[0]||!A[1]||!B[0]||!B[1]){out.innerHTML='<div class="empty">Διάλεξε ημερομηνίες για το Α και το Β.</div>';return}
  var inR=function(r){return function(t){return t.date>=r[0]&&t.date<=r[1]}},la=list.filter(inR(A)),lb=list.filter(inR(B));
  var days=function(r){return Math.round((new Date(r[1])-new Date(r[0]))/864e5)+1};
  var mk=function(L,r){var st=stats(L),c=st.c,act={};c.forEach(function(t){act[t.date]=1});var fees=sum(c.map(function(t){return n(t.fees)||0}));
    var bs=group(L,function(t){return stratName(t.strategyId)}).filter(function(g){return g.n>=2}).sort(function(x,y){return y.avgR-x.avgR})[0],sy=group(L,function(t){return t.symbol}).filter(function(g){return g.n>=2}).sort(function(x,y){return y.totalR-x.totalR})[0];
    return {all:L.length,n:st.n,wr:st.winRate,avg:st.avgR,tot:st.totalR,pnl:st.pnl,pf:st.pf,dd:st.dd,aw:st.avgWin,al:st.avgLoss,rp:rulesPct(c),tpd:Object.keys(act).length?st.n/Object.keys(act).length:NaN,ad:Object.keys(act).length,fees:fees,streak:st.worstStreak,bs:bs,sy:sy,eq:st.eq,days:days(r)}};
  var a=mk(la,A),b=mk(lb,B);
  var cnt=function(x){return isFinite(x)?fmt(x,x%1?1:0):'–'},num2=function(x){return isFinite(x)?fmt(x,2):'–'},pc=function(x){return pct(x)};
  var rows=[['Συναλλαγές (όλες)','all',cnt,0],['Κλειστές με R','n',cnt,0],['Ημέρες με συναλλαγές','ad',cnt,0],['Συναλλαγές ανά ημέρα','tpd',function(x){return isFinite(x)?fmt(x,1):'–'},0],['Επιτυχία','wr',pc,1],['Μέσο R','avg',fR,1],['Σύνολο R','tot',fR,1],['Αποτέλεσμα €','pnl',fE,1],['Profit factor','pf',num2,1],['Μέσο κέρδος','aw',fR,1],['Μέση απώλεια','al',fR,1],['Μέγιστη πτώση','dd',fR,1],['Χειρότερο σερί απωλειών','streak',cnt,-1],['Τήρηση κανόνων','rp',pc,1],['Προμήθειες €','fees',function(x){return fmt(x,2)+' €'},-1]];
  var lab=function(r){return dateGr(r[0])+' – '+dateGr(r[1])};
  var h='<div class="tw"><table class="abt"><thead><tr><th></th><th class="r">Α · '+lab(A)+'</th><th class="r">Β · '+lab(B)+'</th><th class="r">Διαφορά</th></tr></thead><tbody>'+
    rows.map(function(r){var va=a[r[1]],vb=b[r[1]],d=va-vb,good=r[3],cl=!isFinite(d)||Math.abs(d)<1e-9||good===0?'':((d>0)===(good>0)?'pos':'neg');
      var ds=!isFinite(d)?'–':(d>0?'▲ ':d<0?'▼ ':'')+(r[1]==='wr'||r[1]==='rp'?fmt(Math.abs(d)*100,0)+'%':r[2]===fR?fmt(Math.abs(d),2)+'R':r[2]===fE?fmt(Math.abs(d),2)+' €':fmt(Math.abs(d),Math.abs(d)%1?1:0));
      return '<tr><td>'+esc(r[0])+'</td><td class="r num">'+esc(r[2](va))+'</td><td class="r num">'+esc(r[2](vb))+'</td><td class="r num '+cl+'">'+ds+'</td></tr>'}).join('')+
    '<tr><td>Καλύτερη στρατηγική</td><td class="r ud">'+(a.bs?esc(a.bs.key)+' ('+fR(a.bs.avgR)+')':'–')+'</td><td class="r ud">'+(b.bs?esc(b.bs.key)+' ('+fR(b.bs.avgR)+')':'–')+'</td><td></td></tr>'+
    '<tr><td>Καλύτερο σύμβολο</td><td class="r ud">'+(a.sy?esc(a.sy.key)+' ('+fR(a.sy.totalR)+')':'–')+'</td><td class="r ud">'+(b.sy?esc(b.sy.key)+' ('+fR(b.sy.totalR)+')':'–')+'</td><td></td></tr></tbody></table></div>';
  // overlay equity
  var ea=[0].concat(a.eq),eb=[0].concat(b.eq);
  if(ea.length>1||eb.length>1){var W=720,H=220,L=46,R=60,T=14,Bm=24,mx=Math.max(ea.length,eb.length)-1||1,all=ea.concat(eb),lo=Math.min(0,Math.min.apply(null,all)),hi=Math.max(0,Math.max.apply(null,all));if(hi===lo)hi=lo+1;
    var step=niceStep(hi-lo);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;var x=function(i){return L+(W-L-R)*i/mx},y=function(v){return T+(H-T-Bm)*(hi-v)/(hi-lo)},g='';
    for(var v=lo;v<=hi+1e-9;v+=step)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"></line><text x="'+(L-8)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+(v>0?'+':'')+fmt(v,step<1?1:0)+'R</text>';
    var pl=function(e){return e.map(function(p,i){return x(i).toFixed(1)+','+y(p).toFixed(1)}).join(' ')};
    h+='<div class="chart" style="margin-top:.8rem"><span class="lbl">Πορεία σε R: Α (συνεχής) και Β (διακεκομμένη), ανά συναλλαγή</span><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Σύγκριση πορείας Α και Β"><g class="grid">'+g+'</g><line class="zero" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'"></line>'+(eb.length>1?'<polyline class="eqb" points="'+pl(eb)+'"></polyline>':'')+(ea.length>1?'<polyline class="eqline" points="'+pl(ea)+'"></polyline>':'')+'<text x="'+(W-R+6)+'" y="'+y(ea[ea.length-1]).toFixed(1)+'">Α</text><text x="'+(W-R+6)+'" y="'+(y(eb[eb.length-1])+12).toFixed(1)+'">Β</text></svg></div>'}
  var ins=[];
  if(a.n<5||b.n<5)ins.push({lv:'info',t:'Λίγες συναλλαγές σε ένα από τα δύο διαστήματα (Α: '+a.n+', Β: '+b.n+'). Οι διαφορές μπορεί να είναι τύχη.'});
  if(isFinite(a.avg)&&isFinite(b.avg)){var dA=a.avg-b.avg;if(dA>=0.2)ins.push({lv:'good',t:'Το Α είναι καλύτερο κατά '+fR(dA)+' ανά συναλλαγή από το Β.'});else if(dA<=-0.2)ins.push({lv:'warn',t:'Το Α είναι χειρότερο κατά '+fR(dA)+' ανά συναλλαγή από το Β.'})}
  if(isFinite(a.tpd)&&isFinite(b.tpd)&&a.tpd>b.tpd*1.4&&a.avg<b.avg)ins.push({lv:'warn',t:'Στο Α κάνατε περισσότερες συναλλαγές την ημέρα με χειρότερο αποτέλεσμα. Πιθανό overtrading.'});
  if(isFinite(a.rp)&&isFinite(b.rp)&&Math.abs(a.rp-b.rp)>=0.15)ins.push({lv:a.rp>b.rp?'good':'warn',t:'Η τήρηση κανόνων άλλαξε από '+pct(b.rp)+' (Β) σε '+pct(a.rp)+' (Α).'});
  if(a.dd<b.dd*1.5&&a.dd<-3)ins.push({lv:'warn',t:'Η μέγιστη πτώση στο Α ('+fR(a.dd)+') είναι αρκετά μεγαλύτερη από το Β ('+fR(b.dd)+').'});
  out.innerHTML=insList(ins)+h;
}
function rulesPct(c){var f=c.filter(function(t){return t.rules===true}).length,b=c.filter(function(t){return t.rules===false}).length;return f+b?f/(f+b):NaN}
function slope(v){var nn=v.length;if(nn<3)return NaN;var mx=(nn-1)/2,my=avg(v),num=0,den=0;for(var i=0;i<nn;i++){num+=(i-mx)*(v[i]-my);den+=(i-mx)*(i-mx)}return den?num/den:NaN}
function evoSvg(rs,g){
  var W=720,H=220,L=46,R=12,T=14,B=30,vals=rs.map(function(r){return r.tot});
  var lo=Math.min(0,Math.min.apply(null,vals)),hi=Math.max(0,Math.max.apply(null,vals));if(hi===lo)hi=lo+1;
  var step=niceStep(hi-lo);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
  var y=function(v){return T+(H-T-B)*(hi-v)/(hi-lo)},bw=(W-L-R)/rs.length,o='';
  for(var v=lo;v<=hi+1e-9;v+=step)o+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"></line><text x="'+(L-8)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+(v>0?'+':'')+fmt(v,step<1?1:0)+'R</text>';
  var every=Math.ceil(rs.length/8),bars='';
  rs.forEach(function(r,i){var x=L+i*bw+bw*.18,w=bw*.64,y0=y(0),yv=y(r.tot);
    bars+='<rect class="evb '+(r.tot>=0?'p':'n')+'" x="'+x.toFixed(1)+'" y="'+Math.min(y0,yv).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1,Math.abs(yv-y0)).toFixed(1)+'" rx="2"></rect>';
    if(i%every===0||i===rs.length-1)bars+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+perLabel(r.k,g)+'</text>'});
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Αποτέλεσμα ανά περίοδο"><g class="grid">'+o+'</g>'+bars+'</svg>';
}
function rollSvg(vals){
  if(vals.length<2)return '';
  var W=720,H=180,L=46,R=64,T=14,B=26,lo=Math.min(0,Math.min.apply(null,vals)),hi=Math.max(0,Math.max.apply(null,vals));if(hi===lo)hi=lo+1;
  var step=niceStep(hi-lo);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
  var x=function(i){return L+(W-L-R)*i/(vals.length-1)},y=function(v){return T+(H-T-B)*(hi-v)/(hi-lo)},g='';
  for(var v=lo;v<=hi+1e-9;v+=step)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"></line><text x="'+(L-8)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+(v>0?'+':'')+fmt(v,step<1?1:0)+'R</text>';
  var pts=vals.map(function(p,i){return x(i).toFixed(1)+','+y(p).toFixed(1)}).join(' '),l=vals[vals.length-1];
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Κυλιόμενο μέσο R"><g class="grid">'+g+'</g><line class="zero" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'"></line><polyline class="eqline" points="'+pts+'"></polyline><circle class="end" cx="'+x(vals.length-1).toFixed(1)+'" cy="'+y(l).toFixed(1)+'" r="4.5"></circle><text class="endlbl" x="'+(x(vals.length-1)+8).toFixed(1)+'" y="'+(y(l)+4).toFixed(1)+'">'+fR(l)+'</text></svg>';
}
function renderEvo(){
  var g=$('#evo-gran').value;$('#evoAB').hidden=g!=='ab';var lst=advList('evo').filter(evoTimeOk);if(g==='ab'){renderEvoAB(lst);return}
  var c=closed(lst),out=$('#evoOut');
  if(c.length<3){out.innerHTML='<div class="empty">Χρειάζονται τουλάχιστον 3 κλειστές συναλλαγές με stop για σύγκριση.</div>';return}
  var per={};c.forEach(function(t){var k=perKey(t.date,g);(per[k]=per[k]||[]).push(t)});
  var rows=Object.keys(per).sort().map(function(k){var st=stats(per[k]);return {k:k,n:st.n,wr:st.winRate,avg:st.avgR,tot:st.totalR,pnl:st.pnl,rp:rulesPct(per[k])}});
  var last=rows[rows.length-1],base=rows.slice(Math.max(0,rows.length-9),rows.length-1);
  var bm=function(f){var v=base.map(function(r){return r[f]}).filter(function(x){return isFinite(x)});return v.length?avg(v):NaN};
  var tile=function(label,v,b,f,good){
    var d=v-b,cl=!isFinite(d)||good===0||Math.abs(d)<1e-9?'':((d>0)===(good>0)?'pos':'neg'),ar=!isFinite(d)||Math.abs(d)<1e-9?'':(d>0?'▲ ':'▼ ');
    return '<div class="kpi"><span class="lbl">'+esc(label)+'</span><b class="'+cl+'">'+esc(f(v))+'</b><span class="s">'+ar+'<span>πριν:</span> '+esc(isFinite(b)?f(b):'–')+'</span></div>'};
  var cnt=function(x){return isFinite(x)?fmt(x,x%1?1:0):'–'};
  var head='<p class="muted" style="margin:.2rem 0 .7rem"><span>Τελευταία περίοδος:</span> <b>'+perLabel(last.k,g)+'</b> · <span>σύγκριση με τον μέσο όρο των προηγούμενων</span> <b>'+base.length+'</b></p>';
  var tiles=base.length?'<div class="kpis">'+tile('Συναλλαγές',last.n,bm('n'),cnt,0)+tile('Επιτυχία',last.wr,bm('wr'),pct,1)+tile('Μέσο R',last.avg,bm('avg'),fR,1)+tile('Σύνολο R',last.tot,bm('tot'),fR,1)+tile('Τήρηση κανόνων',last.rp,bm('rp'),pct,1)+'</div>':'<div class="empty">Υπάρχει μόνο μία περίοδος. Η σύγκριση θα εμφανιστεί από την επόμενη.</div>';
  var rs=rows.slice(-16),rr=c.map(function(t){return t.r}),roll=[];for(var i=0;i<rr.length;i++){if(i>=9)roll.push(avg(rr.slice(i-9,i+1)))}
  var charts='<div class="grid2" style="margin-top:.9rem"><div class="chart"><span class="lbl">Αποτέλεσμα ανά περίοδο</span>'+evoSvg(rs,g)+'</div>'+(roll.length>1?'<div class="chart"><span class="lbl">Κυλιόμενο μέσο R (τελευταίες 10 συναλλαγές)</span>'+rollSvg(roll)+'</div>':'')+'</div>';
  var tbl='<div class="tw" style="margin-top:.9rem"><table><thead><tr><th>Περίοδος</th><th class="r">Πλήθος</th><th class="r">Επιτυχία</th><th class="r">Μέσο R</th><th class="r">Σύνολο R</th><th class="r">€</th><th class="r">Κανόνες</th></tr></thead><tbody>'+
    rows.slice(-12).reverse().map(function(r){return '<tr><td>'+perLabel(r.k,g)+'</td><td class="r num">'+r.n+'</td><td class="r num">'+pct(r.wr)+'</td><td class="r num '+cls(r.avg)+'">'+fR(r.avg)+'</td><td class="r num '+cls(r.tot)+'">'+fR(r.tot)+'</td><td class="r num '+cls(r.pnl)+'">'+fE(r.pnl)+'</td><td class="r num">'+pct(r.rp)+'</td></tr>'}).join('')+'</tbody></table></div>';
  // insights
  var ins=[],lastN=rr.slice(-30),sl=slope(lastN);
  if(isFinite(sl)&&lastN.length>=10){var ch=sl*lastN.length;
    if(ch>=0.3)ins.push({lv:'good',t:'Βελτιώνεστε: στις τελευταίες '+lastN.length+' συναλλαγές το αποτέλεσμα ανεβαίνει, περίπου '+fR(ch)+' από την αρχή ως το τέλος του διαστήματος.'});
    else if(ch<=-0.3)ins.push({lv:'warn',t:'Χειροτερεύετε: στις τελευταίες '+lastN.length+' συναλλαγές το αποτέλεσμα πέφτει, περίπου '+fR(ch)+' από την αρχή ως το τέλος του διαστήματος. Δείτε τι άλλαξε: στρατηγική, ώρες, διάθεση.'});
    else ins.push({lv:'info',t:'Σταθερή απόδοση στις τελευταίες '+lastN.length+' συναλλαγές, χωρίς καθαρή τάση βελτίωσης ή χειροτέρευσης.'})}
  if(base.length&&isFinite(bm('avg'))){var dA=last.avg-bm('avg');
    if(dA>=0.3)ins.push({lv:'good',t:'Η τελευταία περίοδος είναι καλύτερη από τον μέσο όρο σας κατά '+fR(dA)+' ανά συναλλαγή.'});
    else if(dA<=-0.3)ins.push({lv:'warn',t:'Η τελευταία περίοδος είναι χειρότερη από τον μέσο όρο σας κατά '+fR(dA)+' ανά συναλλαγή.'})}
  if(base.length&&isFinite(bm('n'))&&last.n>=bm('n')*1.5&&last.n>=5&&isFinite(bm('avg'))&&last.avg<bm('avg'))ins.push({lv:'warn',t:'Περισσότερες συναλλαγές από το συνηθισμένο ('+last.n+' έναντι περίπου '+fmt(bm('n'),1)+') και χειρότερο αποτέλεσμα. Πιθανό overtrading.'});
  if(base.length&&isFinite(last.rp)&&isFinite(bm('rp'))&&last.rp<bm('rp')-0.15)ins.push({lv:'warn',t:'Η τήρηση των κανόνων έπεσε στο '+pct(last.rp)+' από '+pct(bm('rp'))+' πριν.'});
  var bySt={};c.forEach(function(t){(bySt[t.strategyId||'']=bySt[t.strategyId||'']||[]).push(t)});
  Object.keys(bySt).forEach(function(k){var a=bySt[k];if(a.length<15)return;var recent=a.slice(-10).map(function(t){return t.r}),old=a.slice(0,-10).map(function(t){return t.r}),d=avg(recent)-avg(old);
    var nm='«<span class="ud">'+esc(stratName(k))+'</span>»: ';
    if(d<=-0.5)ins.push({lv:'stop',h:nm+'<span>'+esc('οι τελευταίες 10 συναλλαγές έχουν μέσο '+fR(avg(recent))+' έναντι '+fR(avg(old))+' πριν. Η στρατηγική χειροτερεύει ή η αγορά άλλαξε.')+'</span>'});
    else if(d>=0.5)ins.push({lv:'good',h:nm+'<span>'+esc('οι τελευταίες 10 συναλλαγές έχουν μέσο '+fR(avg(recent))+' έναντι '+fR(avg(old))+' πριν.')+'</span>'})});
  if(rows.length>=3){var best=rows.slice().sort(function(a,b){return b.tot-a.tot})[0],worst=rows.slice().sort(function(a,b){return a.tot-b.tot})[0];
    ins.push({lv:'info',t:'Καλύτερη περίοδος: '+perLabel(best.k,g)+' ('+fR(best.tot)+'). Χειρότερη: '+perLabel(worst.k,g)+' ('+fR(worst.tot)+').'})}
  out.innerHTML=head+tiles+charts+insList(ins)+tbl;
}

/* ----- 2. market prices ----- */
function parsePx(text,minB){
  var rows=parseCSV(text);if(rows.length<3)return null;
  if(rows[0].length>=5&&rows[0].slice(0,5).every(function(x){return /^\s*-?\d+(\.\d+)?\s*$/.test(x)})){rows.unshift(['time','open','high','low','close','volume'].concat(rows[0].slice(6).map(function(_,k){return 'x'+k})))}
  for(var hr=0;hr<Math.min(5,rows.length-2);hr++){if(rows[hr].some(function(x){return /^\s*close\s*$/i.test(x)})){if(hr)rows=rows.slice(hr);break}}
  var h=rows[0].map(function(x){return x.trim().toLowerCase()}),idx=hidx(h);
  var ti=idx('unix','unix timestamp','open time','open_time','time','timestamp','datetime','date',/^unix/,/^time/,/^date/),o=idx('open'),hh=idx('high'),l=idx('low'),c=idx('close'),v=idx('volume','vol',/^volume/);
  if(ti<0||o<0||hh<0||l<0||c<0)return null;
  var bars=[];
  rows.slice(1).forEach(function(r){
    var tv=String(r[ti]||'').trim(),ts=NaN;
    if(/^\d{9,16}(\.\d+)?$/.test(tv)){ts=+tv;if(ts<1e12)ts*=1000;if(ts>1e14)ts/=1000}
    else if(/T\d|Z$|[+-]\d{2}:?\d{2}$/.test(tv)){ts=Date.parse(tv)}
    else{var dd=tv.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(dd)ts=new Date(+dd[1],+dd[2]-1,+dd[3]).getTime();else{var d=pdate(tv);if(d)ts=d.ts}}
    var b={t:ts,o:pnum(r[o]),h:pnum(r[hh]),l:pnum(r[l]),c:pnum(r[c]),v:v>=0?pnum(r[v]):NaN};
    if(isFinite(b.t)&&isFinite(b.o)&&isFinite(b.h)&&isFinite(b.l)&&isFinite(b.c))bars.push(b);
  });
  bars.sort(function(a,b){return a.t-b.t});
  return bars.length>=(minB==null?30:minB)?bars:null;
}
function intLabel(ms){var m=ms/60000;if(m<60)return Math.round(m)+'m';if(m<1440)return Math.round(m/60)+'h';if(m<10080)return Math.round(m/1440)+'D';if(m<40000)return Math.round(m/10080)+'W';return '1M'}
function symFromFile(fn){var s=String(fn||'').replace(/\.[a-z]+$/i,'').split(',')[0].trim();if(s.indexOf('_')>-1)s=s.split('_').slice(1).join('_')||s;return s.replace(/\s+/g,'').toUpperCase()}
function symMatch(a,b){a=String(a||'').toUpperCase().replace(/[^A-Z0-9]/g,'');b=String(b||'').toUpperCase().replace(/[^A-Z0-9]/g,'');return !!a&&!!b&&(a===b||a.indexOf(b)===0||b.indexOf(a)===0)}
function barIdx(bars,ts){if(ts<bars[0].t)return -1;var lo=0,hi=bars.length-1;while(lo<hi){var m=(lo+hi+1)>>1;if(bars[m].t<=ts)lo=m;else hi=m-1}return lo}
function tradeTs(t){return new Date(t.date+'T'+(t.time||'00:00')+':00').getTime()}
function excursion(t,bars,W){
  var ts=tradeTs(t),i0=barIdx(bars,ts);
  if(i0<0||i0>=bars.length-1||ts-bars[i0].t>3*ADV.pxInt)return null;
  var e=n(t.entry),s=isFinite(n(t.stop))?n(t.stop):(t._stop!=null?t._stop:NaN),d=t.dir==='short'?-1:1;if(!isFinite(e))return null;
  var risk=isFinite(s)&&(d>0?s<e:s>e)?Math.abs(e-s):NaN;
  var mfe=0,mae=0,stopAt=-1,post=0,end=Math.min(bars.length-1,i0+W);
  for(var i=i0+1;i<=end;i++){var b=bars[i],fav=d>0?b.h-e:e-b.l,adv=d>0?e-b.l:b.h-e;
    if(stopAt<0){if(isFinite(risk)&&adv>=risk){stopAt=i;mae=Math.max(mae,risk);continue}mfe=Math.max(mfe,fav);mae=Math.max(mae,adv)}
    else post=Math.max(post,fav)}
  var r={t:t,risk:risk,stopped:stopAt>=0,mfeP:mfe/e*100,maeP:mae/e*100};
  if(isFinite(risk)){r.mfeR=mfe/risk;r.maeR=Math.min(mae/risk,1);r.postR=post/risk;r.endR=stopAt>=0?-1:Math.max(-1,(bars[end].c-e)*d/risk)}
  return r;
}
function median(a){if(!a.length)return NaN;var s=a.slice().sort(function(x,y){return x-y}),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2}
function renderMkt(){
  var out=$('#mktOut');
  if(!ADV.px){out.innerHTML='<div class="empty">Ανέβασε πρώτα αρχείο τιμών από το TradingView, για το σύμβολο που θέλεις να αναλύσεις.</div>';return}
  var sym=$('#px-sym').value.trim(),W=+$('#mkt-win').value||50,bars=ADV.px;
  var list=advList('mkt').filter(function(t){return symMatch(t.symbol,sym)});
  if(!list.length){out.innerHTML='<div class="empty">Δεν βρέθηκαν συναλλαγές για αυτό το σύμβολο με τα τρέχοντα φίλτρα. Έλεγξε το «Σύμβολο του αρχείου».</div>';return}
  var res=[],outside=0;list.forEach(function(t){var x=excursion(t,bars,W);if(x)res.push(x);else outside++});
  var withR=res.filter(function(x){return isFinite(x.risk)}),noR=res.filter(function(x){return !isFinite(x.risk)});
  var head='<p class="muted" style="margin:.2rem 0 .7rem"><span>Αναλύθηκαν:</span> <b>'+res.length+'</b> · <span>με stop:</span> <b>'+withR.length+'</b> · <span>εκτός δεδομένων τιμών:</span> <b>'+outside+'</b></p>';
  var body='',ins=[];
  if(withR.length){
    var T=[1,1.5,2,2.5,3,4,5],cur=S.settings.target;if(T.indexOf(cur)<0){T.push(cur);T.sort(function(a,b){return a-b})}
    var rowsT=T.map(function(X){var hit=withR.filter(function(x){return x.mfeR>=X}).length,ex=avg(withR.map(function(x){return x.mfeR>=X?X:(x.stopped?-1:x.endR)}));return {X:X,p:hit/withR.length,ex:ex}});
    var best=rowsT.slice().sort(function(a,b){return b.ex-a.ex})[0],curRow=rowsT.find(function(r){return r.X===cur});
    body+='<div class="grid2" style="margin-top:.3rem"><div><span class="lbl">Αν έβγαινες σε σταθερό στόχο</span><div class="tw"><table><thead><tr><th>Στόχος</th><th class="r">Θα τον έπιανε</th><th class="r">Μέσο R</th></tr></thead><tbody>'+
      rowsT.map(function(r){return '<tr'+(r===best?' class="hot-good"':'')+'><td>'+fmt(r.X,r.X%1?1:0)+'R'+(r.X===cur?' <span class="pill acc">τρέχων</span>':'')+(r===best?' <span class="pill gain">καλύτερος</span>':'')+'</td><td class="r num">'+pct(r.p)+'</td><td class="r num '+cls(r.ex)+'">'+fR(r.ex)+'</td></tr>'}).join('')+'</tbody></table></div></div>';
    var stopped=withR.filter(function(x){return x.stopped}),back1=stopped.filter(function(x){return x.postR>=1}).length,back2=stopped.filter(function(x){return x.postR>=2}).length;
    var winners=withR.filter(function(x){return x.mfeR>=cur}),maeW=median(winners.map(function(x){return x.maeR}));
    body+='<div><span class="lbl">Stop & κινήσεις</span><div class="kpis" style="margin-top:.4rem">'+kpi('Χτύπησαν το stop',pct(stopped.length/withR.length),stopped.length+' / '+withR.length)+kpi('Μετά το stop έφτασαν +2R',stopped.length?pct(back2/stopped.length):'–',back2+' / '+stopped.length)+kpi('Διάμεση κίνηση υπέρ',fR(median(withR.map(function(x){return x.mfeR}))),'MFE')+kpi('Διάμεση κίνηση κόντρα',fR(-median(withR.map(function(x){return x.maeR}))),'MAE')+'</div></div></div>';
    if(best&&curRow&&best.X!==cur&&best.ex-curRow.ex>=0.1)ins.push({lv:'warn',t:'Σε αυτά τα δεδομένα, στόχος '+fmt(best.X,best.X%1?1:0)+'R θα έδινε '+fR(best.ex)+' ανά συναλλαγή, έναντι '+fR(curRow.ex)+' με τον τρέχοντα στόχο των '+fmt(cur,cur%1?1:0)+'R. Δοκιμάστε τον για τις επόμενες 20 συναλλαγές πριν τον αλλάξετε μόνιμα.'});
    else if(curRow)ins.push({lv:'good',t:'Ο τρέχων στόχος των '+fmt(cur,cur%1?1:0)+'R είναι κοντά στον καλύτερο για αυτές τις συναλλαγές.'});
    if(stopped.length>=4&&back1/stopped.length>=0.4)ins.push({lv:'warn',t:pct(back1/stopped.length)+' των συναλλαγών που έκλεισαν στο stop γύρισαν μετά τουλάχιστον +1R υπέρ σας. Τα stop είναι πιθανώς πολύ κοντά ή σε προφανή σημεία. Δοκιμάστε λίγο πιο μακριά (π.χ. +0,5 ATR) με μικρότερη ποσότητα.'});
    if(winners.length>=4&&isFinite(maeW)&&maeW<0.35)ins.push({lv:'info',t:'Οι συναλλαγές που έπιασαν τον στόχο πήγαν κόντρα κατά διάμεσο μόλις '+fR(maeW)+' πριν. Οι καλές είσοδοι σπάνια κινδυνεύουν: αν μια θέση πάει πάνω από '+fR(Math.min(0.8,maeW*2))+' κόντρα, πιθανότατα είναι λάθος.'});
    if(withR.length<10)ins.push({lv:'info',t:'Μόνο '+withR.length+' συναλλαγές με stop. Τα συμπεράσματα είναι πρώιμα.'});
  }
  if(noR.length){
    body+='<p class="muted" style="margin:.9rem 0 0"><span>Συναλλαγές χωρίς stop:</span> <b>'+noR.length+'</b> · <span>διάμεση κίνηση υπέρ</span> <b>'+fmt(median(noR.map(function(x){return x.mfeP})),2)+'%</b> · <span>κόντρα</span> <b>'+fmt(median(noR.map(function(x){return x.maeP})),2)+'%</b></p>';
    ins.push({lv:'info',t:noR.length+' συναλλαγές δεν έχουν stop, οπότε αναλύθηκαν μόνο σε %. Συμπληρώστε το stop για πλήρη ανάλυση σε R.'});
  }
  var tbl='<div class="tw" style="margin-top:.9rem"><table><thead><tr><th>Ημ/νία</th><th>Σύμβολο</th><th>Θέση</th><th class="r">Αποτέλεσμα</th><th class="r">Υπέρ (MFE)</th><th class="r">Κόντρα (MAE)</th><th class="r">1R</th><th class="r">2R</th><th class="r">3R</th><th>Μετά το stop</th></tr></thead><tbody>'+
    res.slice().sort(function(a,b){return tradeTs(b.t)-tradeTs(a.t)}).slice(0,80).map(function(x){var t=x.t,hasRisk=isFinite(x.risk);
      var tick=function(X){return hasRisk?(x.mfeR>=X?'<span class="pos">✓</span>':'<span class="muted">✗</span>'):'–'};
      return '<tr><td>'+dateGr(t.date)+' '+esc(t.time||'')+'</td><td>'+dmSymCell(t)+'</td><td>'+dirPill(t)+'</td><td class="r num '+cls(t.r)+'">'+(hasR(t)?fR(t.r):fE(n(t.pnl)))+'</td><td class="r num pos">'+(hasRisk?fR(x.mfeR):fmt(x.mfeP,2)+'%')+'</td><td class="r num neg">'+(hasRisk?fR(-x.maeR):'-'+fmt(x.maeP,2)+'%')+'</td><td class="r">'+tick(1)+'</td><td class="r">'+tick(2)+'</td><td class="r">'+tick(3)+'</td><td>'+(x.stopped?(x.postR>=1?'<span class="pill warn">γύρισε +'+fmt(x.postR,1)+'R</span>':'<span class="muted">συνέχισε κόντρα</span>'):'')+'</td></tr>'}).join('')+'</tbody></table></div>';
  var own=withR.filter(function(x){return (!x.t.by||x.t.by===S.uid)&&Math.abs((n(x.t.mfe)||0)-Math.round(x.mfeR*10)/10)>0.05});
  var btn=own.length&&S.canWrite?'<div class="row" style="margin-top:.9rem"><button class="btn small" type="button" id="mkt-fill">Συμπλήρωσε τη «Μέγιστη κίνηση υπέρ» σε '+own.length+' δικές μου συναλλαγές</button></div>':'';
  out.innerHTML=head+body+insList(ins)+btn+tbl;
  var fb=$('#mkt-fill');if(fb)fb.addEventListener('click',function(){
    fb.disabled=true;var i=0;(function next(){if(i>=own.length){toast('Ενημερώθηκαν '+own.length+' συναλλαγές');return}
      var x=own[i++],d=cleanDoc(x.t);d.mfe=Math.round(x.mfeR*10)/10;
      put('trades',x.t.id,d).then(next).catch(function(e){toast(writeErr(e))})})()});
}
function parseAnyPx(text,minB){
  minB=minB==null?30:minB;text=String(text||'').trim();
  if(/^[\[{]/.test(text)){var j;try{j=JSON.parse(text)}catch(e){return {err:'Το κείμενο δεν είναι ολόκληρο. Βεβαιώσου ότι επέλεξες και αντέγραψες όλη τη σελίδα.'}}
    if(j&&!Array.isArray(j)&&j.retCode)return {err:'Bybit: '+(j.retMsg||j.retCode)+'. Έλεγξε το σύμβολο.'};
    if(j&&Array.isArray(j.error)&&j.error.length)return {err:'Kraken: '+j.error.join(', ')+'. Έλεγξε το σύμβολο (π.χ. XBTUSDT).'};
    if(j&&j.status==='error')return {err:'HTX: '+(j['err-msg']||'σφάλμα')+'. Έλεγξε το σύμβολο.'};
    if(j&&j.result&&Array.isArray(j.result.list))j=j.result.list;
    else if(j&&j.result&&typeof j.result==='object'&&!Array.isArray(j.result)){var kk=Object.keys(j.result).filter(function(k){return Array.isArray(j.result[k])})[0];if(kk)j=j.result[kk]}
    else if(j&&Array.isArray(j.data)&&j.data.length&&j.data[0]&&typeof j.data[0]==='object'&&!Array.isArray(j.data[0])&&('open' in j.data[0]))j=j.data.map(function(x){return [x.id,x.open,x.high,x.low,x.close,x.vol]});
    if(j&&!Array.isArray(j)&&(j.msg||j.code))return {err:'Η πηγή απάντησε με σφάλμα. Έλεγξε το σύμβολο (π.χ. BTCUSDT) και ότι υπάρχει σε αυτή την πηγή.'};
    var arr=Array.isArray(j)?j:(j&&j.data&&Array.isArray(j.data.time)?j.data.time.map(function(t,k){return [t,j.data.open[k],j.data.high[k],j.data.low[k],j.data.close[k],j.data.vol?j.data.vol[k]:NaN]}):null);
    if(!arr)return {err:'Δεν αναγνώρισα τη μορφή των τιμών.'};
    var bars=arr.map(function(r){var t=+r[0];if(t<1e12)t*=1000;if(t>1e14)t/=1000;return {t:t,o:+r[1],h:+r[2],l:+r[3],c:+r[4],v:+r[5]}}).filter(function(b){return isFinite(b.t)&&isFinite(b.o)&&isFinite(b.h)&&isFinite(b.l)&&isFinite(b.c)}).sort(function(a,b){return a.t-b.t});
    return bars.length>=minB?{bars:bars}:{err:'Λίγα κεριά ('+bars.length+'). Χρειάζονται τουλάχιστον '+minB+'.'};}
  var b=parsePx(text,minB);return b?{bars:b}:{err:'Δεν αναγνώρισα αρχείο τιμών. Χρειάζονται στήλες time, open, high, low, close και τουλάχιστον 30 κεριά.'};
}
function loadPx(){
  var f=$('#px-file').files[0];if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){var r=parseAnyPx(rd.result);if(!$('#px-sym').value.trim())$('#px-sym').value=symFromFile(f.name);acceptPx(r)};
  rd.readAsText(f);
}
function acceptPx(r){
    if(r.err){ADV.px=null;$('#px-info').textContent=r.err;renderAdv();return false}
    var bars=r.bars;
    ADV.px=bars;NOW.last=null;var diffs=[];for(var i=1;i<bars.length;i++)diffs.push(bars[i].t-bars[i-1].t);ADV.pxInt=median(diffs);
    var a=new Date(bars[0].t),b=new Date(bars[bars.length-1].t);
    $('#px-info').innerHTML='<span>Φορτώθηκαν</span> <b>'+bars.length+'</b> <span>κεριά</span> · <b>'+dateGr(lday(a))+' – '+dateGr(lday(b))+'</b> · timeframe <b>'+intLabel(ADV.pxInt)+'</b>';
    $('#bt-from').value=lday(a);$('#bt-to').value=lday(b);
    try{fpRefresh()}catch(e){}renderAdv();return true;
}
var FPX={end:null,merge:false,src:'',tf:''};
function fpOlder(){if(!ADV.px||!ADV.px.length)return;var src=$('#fp-src').value;if(!/^(binance|mexc|bybit)$/.test(src)){$('#fp-src').value='binance';src='binance'}var iv=ADV.pxInt||36e5,tfm={9e5:'15m',36e5:'1h',144e5:'4h',864e5:'1d'}[iv];if(tfm)$('#fp-tf').value=tfm;
  FPX={end:ADV.px[0].t-1,merge:true,src:src,tf:$('#fp-tf').value};fpRefresh();$('#fp-paste').value='';$('#px-info').innerHTML='<b>Βήμα για ακόμα 1000:</b> πάτα «Άνοιξε τις τιμές» (η διεύθυνση ζητά τώρα τα κεριά <b>πριν</b> από '+esc(dateGr(lday(new Date(ADV.px[0].t))))+'), αντέγραψε όλη τη σελίδα και επικόλλησε εδώ. Θα <b>προστεθούν</b> στα '+ADV.px.length+' που έχεις.';var a=$('#fp-open');if(a)a.focus()}
function fpUrl(){
  var src=$('#fp-src').value,tf=$('#fp-tf').value,sym=($('#px-sym').value||'').trim().toUpperCase().replace(/^[A-Z]+:/,'').replace(/[^A-Z0-9.\-]/g,'');
  if(!sym)return '';
  if(/^(htx|kraken|bybit)$/.test(src))return dmUrl(src,sym,tf,Date.now()-680*dmTfMs(tf));
  var et=FPX.end&&FPX.src===src&&FPX.tf===tf?FPX.end:null;
  if(src==='binance')return 'https://api.binance.com/api/v3/klines?symbol='+sym.replace(/[.\-]/g,'')+'&interval='+tf+'&limit=1000'+(et?'&endTime='+et:'');
  if(src==='mexc')return 'https://api.mexc.com/api/v3/klines?symbol='+sym.replace(/[.\-]/g,'')+'&interval='+(tf==='1h'?'60m':tf)+'&limit=1000'+(et?'&endTime='+et:'');
  if(src==='bybit'&&et)return 'https://api.bybit.com/v5/market/kline?category=spot&symbol='+sym.replace(/[.\-]/g,'')+'&interval='+{'15m':'15','1h':'60','4h':'240','1d':'D'}[tf]+'&limit=1000&end='+et;
  var st=sym.toLowerCase();if(st.indexOf('.')<0)st+='.us';
  return 'https://stooq.com/q/d/l/?s='+encodeURIComponent(st)+'&i=d';
}
function fpRefresh(){var ob=$('#fp-older');if(ob){ob.hidden=!(ADV.px&&ADV.px.length);ob.textContent='➕ Ακόμα 1000 παλαιότερα κεριά'+(ADV.px&&ADV.px.length?' (έχεις '+ADV.px.length+')':'')}var isCC=$('#fp-src').value==='cc';$('#freePx').classList.toggle('fp-cc',isCC);$('#fp-load').textContent=isCC?(LANG_RU()?'Загрузить цены сейчас':'Φέρε τις τιμές τώρα'):(LANG_RU()?'Загрузить цены':'Φόρτωσε τις τιμές');var u=fpUrl(),a=$('#fp-open');$('#fp-tf').disabled=$('#fp-src').value==='stooq';
  if(u){a.href=u;a.removeAttribute('aria-disabled');$('#fp-url').textContent=u}else{a.href='#';a.setAttribute('aria-disabled','true');$('#fp-url').textContent='–'}}
function fpLoad(){
  if($('#fp-src').value==='cc'){var sy=$('#px-sym').value.trim();if(!sy){$('#px-info').textContent=LANG_RU()?'Сначала укажите символ (напр. BTCUSDT).':'Γράψε πρώτα το σύμβολο (π.χ. BTCUSDT).';return}var tf0={'15m':'15m','1h':'1h','4h':'4h','1d':'1D'}[$('#fp-tf').value]||'1h';$('#px-info').textContent=LANG_RU()?'Загружаю с Crypto.com…':'Φέρνω τιμές από το Crypto.com…';
    ccFetchBars(sy,tf0).then(function(r){if(acceptPx({bars:r.bars}))toast((LANG_RU()?'Загружено свечей: ':'Φορτώθηκαν κεριά: ')+r.bars.length)}).catch(function(e){$('#px-info').textContent=e&&e.code==='not_found'?(LANG_RU()?'На Crypto.com нет этой пары. Выберите другой источник.':'Η Crypto.com δεν έχει αυτό το ζευγάρι. Διάλεξε άλλη πηγή.'):ccErrText(e)});return}
  var t=$('#fp-paste').value;if(!t.trim()){$('#px-info').textContent='Επικόλλησε πρώτα τις τιμές στο κουτί.';return}
  var r=parseAnyPx(t,FPX.merge?5:30);
  if(!r.err&&FPX.merge&&ADV.px&&ADV.px.length){var m={},old=ADV.px.length;ADV.px.concat(r.bars).forEach(function(b){m[b.t]=b});var all=Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return a.t-b.t});var added=all.length-old;r={bars:all};FPX={end:null,merge:false,src:'',tf:''};
    if(acceptPx(r)){$('#fp-paste').value='';fpRefresh();toast(added>0?'Προστέθηκαν '+added+' κεριά · σύνολο '+all.length:'Δεν προστέθηκαν νέα κεριά (ίδια με όσα υπήρχαν).')}return}
  if(acceptPx(r)){$('#fp-paste').value='';toast('Οι τιμές φορτώθηκαν')}
}

/* ----- 3. backtest ----- */
var BT=[
  {id:'pb',mid:'s-pullback',t:'Pullback στον EMA 20',rule:'Long: τιμή πάνω από EMA 50 με ανοδική κλίση, το κερί αγγίζει τον EMA 20 και κλείνει πράσινο πάνω από αυτόν. Stop: χαμηλό 5 κεριών. Short: το αντίθετο.'},
  {id:'bo',mid:'s-breakout',t:'Breakout με όγκο',rule:'Long: κλείσιμο πάνω από το υψηλό των 20 προηγούμενων κεριών, με όγκο πάνω από 1,5 φορά τον μέσο (αν υπάρχει όγκος στο αρχείο). Stop: χαμηλό του κεριού breakout.'},
  {id:'mx',mid:'macross',t:'Διασταύρωση EMA 20/50',rule:'Long: ο EMA 20 περνάει πάνω από τον EMA 50. Stop: 1,5 ATR. Έξοδος: στόχος ή αντίθετη διασταύρωση.'},
  {id:'dc',mid:'s-donchian',t:'Donchian breakout',rule:'Long: κλείσιμο πάνω από το υψηλό 20 κεριών. Stop: 2 ATR. Έξοδος: κλείσιμο κάτω από το χαμηλό 10 κεριών (χωρίς σταθερό στόχο).'},
  {id:'rv',mid:'s-range',t:'Αντιστροφή σε range',rule:'Range = υψηλό και χαμηλό των 40 προηγούμενων κεριών, με ADX κάτω από 20 (χωρίς τάση). Long: το κερί αγγίζει το κάτω 15% του range και κλείνει πράσινο, ξανά μέσα στο range, κάτω από τη μέση. Stop: κάτω από το χαμηλό + 0,25 ATR. Short: το αντίθετο στο πάνω άκρο. Ίδιοι κανόνες με τον κώδικα Pine του Καθηγητή.'},
  {id:'sq',mid:'s-squeeze',t:'Bollinger squeeze',rule:'Long: οι ζώνες Bollinger ήταν στο στενότερο σημείο των 120 κεριών και η τιμή κλείνει πάνω από την πάνω ζώνη. Stop: η μέση ζώνη.'},
  {id:'rt',mid:'s-retest',t:'Break & retest',rule:'Long: τα τελευταία 2-10 κεριά έκλεισε πάνω από το υψηλό 20 κεριών (σπάσιμο) χωρίς να ξαναπέσει κάτω. Τώρα η τιμή επιστρέφει κοντά στο επίπεδο (0,3 ATR) και κλείνει πράσινο πάνω του. Stop: 0,3 ATR κάτω από το επίπεδο.'},
  {id:'dv',mid:'s-macdiv',t:'Αντιστροφή με απόκλιση',rule:'Long: δύο χαμηλά (fractal 5 κεριών) μέσα σε 40 κεριά, το δεύτερο χαμηλότερο στην τιμή αλλά με ψηλότερο RSI (απόκλιση), με RSI κάτω από 35 στο πρώτο. Είσοδος όταν κλείσει κερί πάνω από το υψηλό του δεύτερου χαμηλού. Stop: κάτω από το δεύτερο χαμηλό.'},
  {id:'vw',mid:'s-vwap',t:'VWAP pullback',rule:'Μόνο σε timeframe κάτω από 1 ημέρα. VWAP ημέρας (από 00:00 UTC). Long: EMA 20 πάνω από EMA 50, τιμή πάνω από το VWAP, το κερί αγγίζει το VWAP και κλείνει πράσινο πάνω του. Stop: κάτω από το χαμηλό του κεριού.'},
  {id:'or',mid:'s-orb',t:'Opening Range Breakout',rule:'Μόνο σε timeframe έως 1 ώρα. Opening range = υψηλό/χαμηλό της πρώτης ώρας της ημέρας (00:00 UTC για crypto). Long: πρώτο κλείσιμο πάνω από το υψηλό του range, έως 12:00 UTC. Stop: το χαμηλό του range.'},
  {id:'ic',mid:'s-ichimoku',t:'Σπάσιμο σύννεφου Ichimoku',rule:'Long: η τιμή κλείνει πάνω από το σύννεφο (για πρώτη φορά) με Tenkan (9) πάνω από Kijun (26). Stop: λίγο κάτω από το Kijun.'},
  {id:'fc',mid:'s-fibconf',t:'Swing σε σημείο σύγκλισης',rule:'Long σε ανοδική τάση (τιμή πάνω από EMA 50): pullback στη ζώνη Fibonacci 0,5-0,618 της τελευταίας ανοδικής κίνησης (swing των 50 κεριών), με κλείσιμο πράσινο μέσα ή πάνω από τη ζώνη. Stop: κάτω από το 0,786.'},
  {id:'sw',mid:'s-smc',t:'Liquidity sweep (SMC)',rule:'Long: το κερί κάνει νέο χαμηλό 20 κεριών (παίρνει τα stops) αλλά κλείνει πράσινο ξανά πάνω από το προηγούμενο χαμηλό. Stop: κάτω από τη σκιά του sweep. Short: το αντίθετο στα υψηλά.'},
  {id:'r2',mid:'s-rsi2',t:'Mean reversion με RSI(2)',rule:'Long: τιμή πάνω από SMA 200 και RSI(2) κάτω από 10. Έξοδος: κλείσιμο πάνω από SMA 5 (χωρίς σταθερό στόχο). Stop ασφαλείας: 2 ATR. Short: τιμή κάτω από SMA 200, RSI(2) πάνω από 90, έξοδος κάτω από SMA 5.'},
  {id:'ib',mid:'s-ibbo',t:'Inside bar breakout',rule:'Long: τιμή πάνω από EMA 50, inside bar στο προηγούμενο κερί, και τώρα κλείσιμο πάνω από το υψηλό του μητρικού κεριού. Stop: το χαμηλό του μητρικού.'},
  {id:'sp',mid:'s-spring',t:'Wyckoff spring',rule:'Range 40 κεριών χωρίς τάση (ADX κάτω από 25). Long: το κερί σπάει κάτω από τη στήριξη του range και κλείνει πράσινο ξανά μέσα. Stop: κάτω από τη σκιά. Short (upthrust): το αντίθετο στο πάνω άκρο.'},
  {id:'tf',mid:'s-trend',t:'Trend following με trailing stop',rule:'Long: κλείσιμο πάνω από το υψηλό 20 κεριών με EMA 50 πάνω από EMA 200. Αρχικό stop 2 ATR. Έξοδος με chandelier: κλείσιμο κάτω από (υψηλότερο κλείσιμο από την είσοδο − 3 ATR). Χωρίς σταθερό στόχο.'},
  {id:'sc',mid:'s-scalp',t:'Scalping EMA 9/21 + VWAP',rule:'Μόνο σε timeframe έως 15 λεπτά. Long: ο EMA 9 περνάει πάνω από τον EMA 21 με τιμή πάνω από το VWAP ημέρας. Stop: 1 ATR.'}
];
var BT_NO=[['s-gapgo','Gap and Go','χρειάζεται δεδομένα pre-market μετοχών'],['s-pead','Momentum μετά από αποτελέσματα','χρειάζεται ημερομηνίες αποτελεσμάτων'],['s-rs','Σχετική δύναμη & rotation','χρειάζεται πολλά σύμβολα ταυτόχρονα'],['s-dca','DCA','δεν έχει είσοδο/έξοδο: είναι τακτικές αγορές'],['s-grid','Grid trading','πολλές εντολές ταυτόχρονα'],['s-basis','Funding & basis trade','χρειάζεται funding και τιμές futures'],['s-pairs','Pairs trading','χρειάζεται δύο σύμβολα'],['s-news','Συναλλαγές γύρω από ειδήσεις','χρειάζεται οικονομικό ημερολόγιο']];
var BT_NOTGT={dc:1,r2:1,tf:1};
function emaA(a,p){var o=new Array(a.length).fill(NaN),k=2/(p+1),s=0;for(var i=0;i<a.length;i++){if(i<p){s+=a[i];if(i===p-1)o[i]=s/p;continue}o[i]=a[i]*k+o[i-1]*(1-k)}return o}
function smaA(a,p){var o=new Array(a.length).fill(NaN),s=0;for(var i=0;i<a.length;i++){s+=a[i];if(i>=p)s-=a[i-p];if(i>=p-1)o[i]=s/p}return o}
function rmaA(a,p){var o=new Array(a.length).fill(NaN),st=-1;for(var i=0;i<a.length;i++){if(!isFinite(a[i]))continue;if(st<0)st=i;if(i-st<p-1)continue;if(i-st===p-1){var s=0;for(var j=st;j<=i;j++)s+=a[j];o[i]=s/p}else o[i]=(o[i-1]*(p-1)+a[i])/p}return o}
var BTI_C={b:null,n:0,t:0,I:null};
function btInd(b){if(BTI_C.b===b&&BTI_C.n===b.length&&b.length&&BTI_C.t===b[b.length-1].t)return BTI_C.I;var I0=btInd0(b);BTI_C={b:b,n:b.length,t:b.length?b[b.length-1].t:0,I:I0};return I0}
function btInd0(b){
  var C=b.map(function(x){return x.c}),H=b.map(function(x){return x.h}),L=b.map(function(x){return x.l}),V=b.map(function(x){return x.v}),N=b.length,I={};
  I.e20=emaA(C,20);I.e50=emaA(C,50);I.s20=smaA(C,20);
  var tr=[NaN],pdm=[NaN],mdm=[NaN],up=[NaN],dn=[NaN];
  for(var i=1;i<N;i++){tr.push(Math.max(H[i]-L[i],Math.abs(H[i]-C[i-1]),Math.abs(L[i]-C[i-1])));var u=H[i]-H[i-1],d=L[i-1]-L[i];pdm.push(u>d&&u>0?u:0);mdm.push(d>u&&d>0?d:0);var ch=C[i]-C[i-1];up.push(Math.max(ch,0));dn.push(Math.max(-ch,0))}
  I.atr=rmaA(tr,14);var sp=rmaA(pdm,14),sm=rmaA(mdm,14),ru=rmaA(up,14),rd=rmaA(dn,14);
  I.rsi=ru.map(function(x,k){return isFinite(x)?(rd[k]===0?100:100-100/(1+x/rd[k])):NaN});
  var dx=sp.map(function(x,k){var p=100*x/I.atr[k],m=100*sm[k]/I.atr[k];return isFinite(p)&&p+m>0?100*Math.abs(p-m)/(p+m):NaN});I.adx=rmaA(dx,14);
  I.bw=C.map(function(_,k){if(k<19)return NaN;var m=I.s20[k],s=0;for(var j=k-19;j<=k;j++)s+=(C[j]-m)*(C[j]-m);s=Math.sqrt(s/20);I.up=I.up||[];I.lo=I.lo||[];I.up[k]=m+2*s;I.lo[k]=m-2*s;return 4*s/m});
  I.vs=smaA(V.map(function(x){return isFinite(x)?x:0}),20);I.hasV=V.some(function(x){return isFinite(x)&&x>0});
  I.e9=emaA(C,9);I.e21=emaA(C,21);I.e200=emaA(C,200);I.s200=smaA(C,200);I.s5=smaA(C,5);
  var ru2=rmaA(up,2),rd2=rmaA(dn,2);I.rsi2=ru2.map(function(x,k){return isFinite(x)?(rd2[k]===0?100:100-100/(1+x/rd2[k])):NaN});
  var dif=[];for(var k=1;k<N;k++)dif.push(b[k].t-b[k-1].t);dif.sort(function(a,c){return a-c});I.int=dif.length?dif[Math.floor(dif.length/2)]:36e5;
  /* session VWAP (UTC day) and opening range (first hour) */
  I.vwap=new Array(N).fill(NaN);I.orH=new Array(N).fill(NaN);I.orL=new Array(N).fill(NaN);I.dayStart=new Array(N).fill(0);var pv=0,vv=0,cd=-1,ds=0,oh=-Infinity,ol=Infinity;
  for(var k2=0;k2<N;k2++){var day=Math.floor(b[k2].t/864e5);if(day!==cd){cd=day;pv=0;vv=0;ds=k2;oh=-Infinity;ol=Infinity}var tp=(H[k2]+L[k2]+C[k2])/3,vol=isFinite(V[k2])&&V[k2]>0?V[k2]:1;pv+=tp*vol;vv+=vol;I.vwap[k2]=pv/vv;I.dayStart[k2]=ds;
    if(b[k2].t-day*864e5<36e5){oh=Math.max(oh,H[k2]);ol=Math.min(ol,L[k2])}else{I.orH[k2]=oh;I.orL[k2]=ol}}
  /* ichimoku */
  var mid=function(f,t){return (hhv(b,f,t)+llv(b,f,t))/2};I.tk=new Array(N).fill(NaN);I.kj=new Array(N).fill(NaN);I.sa=new Array(N).fill(NaN);I.sb=new Array(N).fill(NaN);
  for(var k3=0;k3<N;k3++){if(k3>=8)I.tk[k3]=mid(k3-8,k3);if(k3>=25)I.kj[k3]=mid(k3-25,k3);if(k3>=51+26){var j=k3-26;I.sa[k3]=(mid(j-8,j)+mid(j-25,j))/2;I.sb[k3]=mid(j-51,j)}}
  /* fractal pivots (5 bars), known 2 bars later */
  I.pl=[];I.ph=[];for(var k4=2;k4<N-2;k4++){if(L[k4]<L[k4-1]&&L[k4]<L[k4-2]&&L[k4]<=L[k4+1]&&L[k4]<=L[k4+2])I.pl.push(k4);if(H[k4]>H[k4-1]&&H[k4]>H[k4-2]&&H[k4]>=H[k4+1]&&H[k4]>=H[k4+2])I.ph.push(k4)}
  return I;
}
function hhv(a,f,t){var m=-Infinity;for(var i=f;i<=t;i++)m=Math.max(m,a[i].h);return m}
function llv(a,f,t){var m=Infinity;for(var i=f;i<=t;i++)m=Math.min(m,a[i].l);return m}
function btSignal(id,b,I,i,d){
  if(GENSP[id])return genSignal(GENSP[id],b,I,i,d);
  var x=b[i],c=x.c,atr=I.atr[i];if(!isFinite(atr)||!atr)return null;
  var fix=function(stop){var r=Math.abs(c-stop);if(!isFinite(stop)||(d>0?stop>=c:stop<=c)||r<0.5*atr)stop=c-d*0.5*atr;return stop};
  if(id==='pb'){if(!isFinite(I.e50[i-5]))return null;
    if(d>0&&c>I.e50[i]&&I.e50[i]>I.e50[i-5]&&x.l<=I.e20[i]&&c>I.e20[i]&&c>x.o)return fix(llv(b,i-4,i)-0.1*atr);
    if(d<0&&c<I.e50[i]&&I.e50[i]<I.e50[i-5]&&x.h>=I.e20[i]&&c<I.e20[i]&&c<x.o)return fix(hhv(b,i-4,i)+0.1*atr);return null}
  if(id==='bo'){var vol=!I.hasV||x.v>1.5*I.vs[i];
    if(d>0&&c>hhv(b,i-20,i-1)&&vol)return fix(x.l-0.1*atr);
    if(d<0&&c<llv(b,i-20,i-1)&&vol)return fix(x.h+0.1*atr);return null}
  if(id==='mx'){var p=I.e20[i-1]-I.e50[i-1],q=I.e20[i]-I.e50[i];if(!isFinite(p)||!isFinite(q))return null;
    if(d>0&&p<=0&&q>0)return c-1.5*atr;if(d<0&&p>=0&&q<0)return c+1.5*atr;return null}
  if(id==='dc'){if(d>0&&c>hhv(b,i-20,i-1))return c-2*atr;if(d<0&&c<llv(b,i-20,i-1))return c+2*atr;return null}
  if(id==='rv'){if(i<41||!(I.adx[i]<20))return null;var rh=hhv(b,i-40,i-1),rl=llv(b,i-40,i-1),rw=rh-rl,rmid=(rh+rl)/2,z=0.15*rw;if(!(rw>0))return null;
    if(d>0&&x.l<=rl+z&&c>rl&&c>x.o&&c<rmid)return fix(Math.min(x.l,rl)-0.25*atr);
    if(d<0&&x.h>=rh-z&&c<rh&&c<x.o&&c>rmid)return fix(Math.max(x.h,rh)+0.25*atr);return null}
  if(id==='rt'){for(var kk=i-2;kk>=i-10;kk--){if(kk<22)break;var lvH=hhv(b,kk-20,kk-1),lvL=llv(b,kk-20,kk-1),okk=true,m2;
      if(d>0&&b[kk].c>lvH){for(m2=kk+1;m2<i;m2++)if(b[m2].c<lvH){okk=false;break}if(okk&&x.l<=lvH+0.3*atr&&c>lvH&&c>x.o)return fix(Math.min(x.l,lvH)-0.3*atr);return null}
      if(d<0&&b[kk].c<lvL){for(m2=kk+1;m2<i;m2++)if(b[m2].c>lvL){okk=false;break}if(okk&&x.h>=lvL-0.3*atr&&c<lvL&&c<x.o)return fix(Math.max(x.h,lvL)+0.3*atr);return null}}return null}
  if(id==='dv'){var P=d>0?I.pl:I.ph,cand=P.filter(function(p){return p<=i-2&&p>=i-46});if(cand.length<2)return null;var p2=cand[cand.length-1],p1=-1;for(var q2=cand.length-2;q2>=0;q2--){if(p2-cand[q2]>=5&&p2-cand[q2]<=40){p1=cand[q2];break}}if(p1<0||i-p2>6||i-p2<2)return null;
    if(d>0&&b[p2].l<b[p1].l&&I.rsi[p2]>I.rsi[p1]&&I.rsi[p1]<35&&c>b[p2].h&&c>x.o&&b[i-1].c<=b[p2].h)return fix(b[p2].l-0.2*atr);
    if(d<0&&b[p2].h>b[p1].h&&I.rsi[p2]<I.rsi[p1]&&I.rsi[p1]>65&&c<b[p2].l&&c<x.o&&b[i-1].c>=b[p2].l)return fix(b[p2].h+0.2*atr);return null}
  if(id==='vw'){if(I.int>=864e5)return null;var vw=I.vwap[i];if(!isFinite(vw)||i-I.dayStart[i]<2)return null;
    if(d>0&&I.e20[i]>I.e50[i]&&x.l<=vw&&c>vw&&c>x.o)return fix(x.l-0.3*atr);if(d<0&&I.e20[i]<I.e50[i]&&x.h>=vw&&c<vw&&c<x.o)return fix(x.h+0.3*atr);return null}
  if(id==='or'){if(I.int>36e5)return null;var oH=I.orH[i],oL=I.orL[i];if(!isFinite(oH)||!isFinite(oL))return null;if((x.t%864e5)>=12*36e5)return null;var first=true;for(var q3=I.dayStart[i];q3<i;q3++){if(isFinite(I.orH[q3])&&(d>0?b[q3].c>I.orH[q3]:b[q3].c<I.orL[q3])){first=false;break}}if(!first)return null;
    if(d>0&&c>oH)return fix(oL);if(d<0&&c<oL)return fix(oH);return null}
  if(id==='ic'){var top=Math.max(I.sa[i],I.sb[i]),bot=Math.min(I.sa[i],I.sb[i]),top1=Math.max(I.sa[i-1],I.sb[i-1]),bot1=Math.min(I.sa[i-1],I.sb[i-1]);if(!isFinite(top)||!isFinite(top1))return null;
    if(d>0&&c>top&&b[i-1].c<=top1&&I.tk[i]>I.kj[i])return fix(I.kj[i]-0.2*atr);if(d<0&&c<bot&&b[i-1].c>=bot1&&I.tk[i]<I.kj[i])return fix(I.kj[i]+0.2*atr);return null}
  if(id==='fc'){if(!isFinite(I.e50[i-5]))return null;var sH,sL,ih,il;
    if(d>0){if(!(c>I.e50[i]&&I.e50[i]>I.e50[i-5]))return null;ih=i-1;for(var q4=i-1;q4>=i-20;q4--)if(b[q4].h>b[ih].h)ih=q4;sH=b[ih].h;il=ih;for(var q5=ih;q5>=ih-50&&q5>=0;q5--)if(b[q5].l<b[il].l)il=q5;sL=b[il].l;if(ih-il<5||sH-sL<3*atr)return null;
      var z1=sH-(sH-sL)*0.618,z2=sH-(sH-sL)*0.5;if(x.l<=z2&&x.l>=z1-0.3*atr&&c>z1&&c>x.o)return fix(sH-(sH-sL)*0.786-0.2*atr);return null}
    if(!(c<I.e50[i]&&I.e50[i]<I.e50[i-5]))return null;il=i-1;for(var q6=i-1;q6>=i-20;q6--)if(b[q6].l<b[il].l)il=q6;sL=b[il].l;ih=il;for(var q7=il;q7>=il-50&&q7>=0;q7--)if(b[q7].h>b[ih].h)ih=q7;sH=b[ih].h;if(il-ih<5||sH-sL<3*atr)return null;
    var y1=sL+(sH-sL)*0.618,y2=sL+(sH-sL)*0.5;if(x.h>=y2&&x.h<=y1+0.3*atr&&c<y1&&c<x.o)return fix(sL+(sH-sL)*0.786+0.2*atr);return null}
  if(id==='sw'){var pl=llv(b,i-20,i-1),ph=hhv(b,i-20,i-1);if(d>0&&x.l<pl&&c>pl&&c>x.o)return fix(x.l-0.2*atr);if(d<0&&x.h>ph&&c<ph&&c<x.o)return fix(x.h+0.2*atr);return null}
  if(id==='r2'){if(!isFinite(I.s200[i])||!isFinite(I.rsi2[i]))return null;if(d>0&&c>I.s200[i]&&I.rsi2[i]<10)return c-2*atr;if(d<0&&c<I.s200[i]&&I.rsi2[i]>90)return c+2*atr;return null}
  if(id==='ib'){var mo=b[i-2],ins=b[i-1];if(!(ins.h<mo.h&&ins.l>mo.l))return null;if(d>0&&c>I.e50[i]&&c>mo.h)return fix(mo.l);if(d<0&&c<I.e50[i]&&c<mo.l)return fix(mo.h);return null}
  if(id==='sp'){if(i<41||!(I.adx[i]<25))return null;var srh=hhv(b,i-40,i-1),srl=llv(b,i-40,i-1);if(!(srh>srl))return null;if(d>0&&x.l<srl&&c>srl&&c>x.o)return fix(x.l-0.2*atr);if(d<0&&x.h>srh&&c<srh&&c<x.o)return fix(x.h+0.2*atr);return null}
  if(id==='tf'){if(!isFinite(I.e200[i]))return null;if(d>0&&I.e50[i]>I.e200[i]&&c>hhv(b,i-20,i-1))return c-2*atr;if(d<0&&I.e50[i]<I.e200[i]&&c<llv(b,i-20,i-1))return c+2*atr;return null}
  if(id==='sc'){if(I.int>9e5)return null;var p9=I.e9[i-1]-I.e21[i-1],q9=I.e9[i]-I.e21[i],vw2=I.vwap[i];if(!isFinite(p9)||!isFinite(q9)||!isFinite(vw2))return null;if(d>0&&p9<=0&&q9>0&&c>vw2)return c-atr;if(d<0&&p9>=0&&q9<0&&c<vw2)return c+atr;return null}
  if(id==='sq'){var mn=Infinity;for(var j=i-120;j<i;j++)if(isFinite(I.bw[j]))mn=Math.min(mn,I.bw[j]);
    if(!(I.bw[i-1]<=mn*1.1))return null;
    if(d>0&&c>I.up[i])return fix(I.s20[i]);if(d<0&&c<I.lo[i])return fix(I.s20[i]);return null}
  return null;
}
function btExitOnClose(id,b,I,i,d,pos){
  if(id==='r2')return d>0?b[i].c>I.s5[i]:b[i].c<I.s5[i];
  if(id==='tf'&&pos){var hc=pos.hc;return d>0?b[i].c<hc-3*I.atr[i]:b[i].c>hc+3*I.atr[i]}
  if(id==='mx'){var p=I.e20[i-1]-I.e50[i-1],q=I.e20[i]-I.e50[i];return d>0?(p>=0&&q<0):(p<=0&&q>0)}
  if(id==='dc')return d>0?b[i].c<llv(b,i-10,i-1):b[i].c>hhv(b,i-10,i-1);
  return false;
}
function runBt(bars,id,dirs,target,fee,from,to){
  var I=btInd(bars),out=[],pos=null,fromTs=typeof from==='number'?from:from?new Date(from+'T00:00:00').getTime():-Infinity,toTs=typeof to==='number'?to:to?new Date(to+'T23:59:59').getTime():Infinity;
  for(var i=130;i<bars.length;i++){
    var x=bars[i];
    if(pos){
      var d=pos.d,ex=null;
      if(d>0){if(x.o<=pos.s)ex=x.o;else if(x.l<=pos.s)ex=pos.s;else if(isFinite(pos.tg)&&x.o>=pos.tg)ex=x.o;else if(isFinite(pos.tg)&&x.h>=pos.tg)ex=pos.tg}
      else{if(x.o>=pos.s)ex=x.o;else if(x.h>=pos.s)ex=pos.s;else if(isFinite(pos.tg)&&x.o<=pos.tg)ex=x.o;else if(isFinite(pos.tg)&&x.l<=pos.tg)ex=pos.tg}
      if(ex==null&&btExitOnClose(id,bars,I,i,d,pos))ex=x.c;if(ex==null)pos.hc=d>0?Math.max(pos.hc,x.c):Math.min(pos.hc,x.c);
      if(ex!=null){var risk=Math.abs(pos.e-pos.s),r=(ex-pos.e)*d/risk-(pos.e+ex)*fee/100/risk,dt=new Date(pos.t);
        out.push({status:'closed',r:+r.toFixed(3),date:lday(dt),time:pad2(dt.getHours())+':'+pad2(dt.getMinutes()),dir:d>0?'long':'short',pnl:0,e:pos.e,s:pos.s,tg:pos.tg,ex:ex,xt:x.t,hit:ex===pos.s||(d>0?ex<pos.s:ex>pos.s)?'stop':isFinite(pos.tg)&&(d>0?ex>=pos.tg:ex<=pos.tg)?'tgt':'exit',bars:i-pos.i});pos=null}
      continue;
    }
    if(x.t<fromTs||x.t>toTs)continue;
    for(var k=0;k<dirs.length;k++){var dd=dirs[k],st=btSignal(id,bars,I,i,dd);
      if(st!=null&&isFinite(st)){var e=x.c,rk=Math.abs(e-st);if(!rk)continue;pos={d:dd,e:e,s:st,tg:BT_NOTGT[id]?NaN:e+dd*target*rk,t:x.t,i:i,hc:e};break}}
  }
  return out;
}
function btCur(){return BT.find(function(s){return s.id===$('#bt-strat').value})||BT[0]}
function renderBtInfo(){
  var s=$('#bt-strat');if(!s.options.length){s.innerHTML='<optgroup label="Με backtest ('+BT.length+')">'+BT.map(function(x){return '<option value="'+x.id+'">'+esc(x.t)+'</option>'}).join('')+'</optgroup><optgroup label="Χωρίς backtest">'+BT_NO.map(function(x){return '<option disabled>'+esc(x[1]+' · '+x[2])+'</option>'}).join('')+'</optgroup>';try{var sv=store('tj-bt');if(sv)s.value=sv}catch(e){}}
  if(!$('#bt-target').value)$('#bt-target').value=S.settings.target;
  var cur=btCur();$('#bt-rules').textContent=cur.rule;
  $('#bt-target').disabled=!!BT_NOTGT[cur.id];
  if(!ADV.px)$('#btOut').innerHTML='<div class="empty">Ανέβασε πρώτα αρχείο τιμών από το TradingView. Όσο περισσότερα κεριά, τόσο πιο αξιόπιστο το αποτέλεσμα.</div>';
}
function doBt(){
  renderBtInfo();if(!ADV.px)return;
  var cur=btCur(),dv=$('#bt-dir').value,dirs=dv==='both'?[1,-1]:(dv==='short'?[-1]:[1]);
  var target=n($('#bt-target').value)||S.settings.target,fee=n($('#bt-fee').value)||0,from=$('#bt-from').value,to=$('#bt-to').value;
  store('tj-bt',cur.id);
  var out=$('#btOut'),NB=ADV.px.length;
  if(NB<200){out.innerHTML='<div class="empty">Υπάρχουν μόνο <b>'+NB+'</b> κεριά. Το backtest χρειάζεται τουλάχιστον <b>200</b> (τα πρώτα 130 πάνε στον υπολογισμό των δεικτών). Το Crypto.com δίνει μόνο 50 κάθε φορά. Κατέβασε αρχείο από το TradingView: μενού του layout → <b>Export chart data…</b>, αφού κάνεις scroll πίσω στο γράφημα για να φορτώσει χιλιάδες κεριά.</div>';return}
  if(from&&to&&from>to){out.innerHTML='<div class="empty">Η ημερομηνία «Από» είναι μετά το «Έως».</div>';return}
  if(!(target>0)){out.innerHTML='<div class="empty">Ο στόχος σε R πρέπει να είναι πάνω από 0.</div>';return}
  var bt=runBt(ADV.px,cur.id,dirs,target,fee,from,to),st=stats(bt);
  if(!st.n){out.innerHTML='<div class="empty">Οι κανόνες «'+esc(cur.t)+'» δεν έδωσαν κανένα σήμα σε '+NB+' κεριά'+(from||to?' στο διάστημα που διάλεξες':'')+'. Δοκίμασε «Και τα δύο» στην κατεύθυνση, άλλο timeframe ή περισσότερα κεριά.</div>';return}
  var sym=$('#px-sym').value.trim(),w=$('#bt-who').value,a=$('#bt-acct').value;
  var real=closed(S.trades.filter(function(t){return symMatch(t.symbol,sym)&&manualIdFor(S.strategies.find(function(x){return x.id===t.strategyId}))===cur.mid&&(w==='all'||t.by===w)&&(a==='all'||(t.account||'')===a)}));
  var rs=stats(real);
  var kp='<div class="kpis" style="margin-top:.6rem">'+kpi('Συναλλαγές backtest',String(st.n),'')+kpi('Επιτυχία',pct(st.winRate),'')+kpi('Μέσο ανά συναλλαγή',fR(st.avgR),'',cls(st.avgR))+kpi('Profit factor',isFinite(st.pf)?fmt(st.pf,2):'–','')+kpi('Σύνολο',fR(st.totalR),'',cls(st.totalR))+kpi('Μέγιστη πτώση',fR(st.dd),'',st.dd<0?'neg':'')+'</div>';
  var eq='<div class="chart" style="margin-top:.6rem">'+equitySvg(st.eq)+'</div>';
  var row=function(l,f){return '<tr><td>'+esc(l)+'</td><td class="r num">'+f(st)+'</td><td class="r num">'+(rs.n?f(rs):'–')+'</td></tr>'};
  var cmp='<div class="tw" style="margin-top:.9rem"><table><thead><tr><th></th><th class="r">Backtest</th><th class="r">Εσείς</th></tr></thead><tbody>'+
    row('Συναλλαγές',function(x){return x.n})+row('Επιτυχία',function(x){return pct(x.winRate)})+row('Μέσο R',function(x){return fR(x.avgR)})+row('Profit factor',function(x){return isFinite(x.pf)?fmt(x.pf,2):'–'})+row('Μέγιστη πτώση',function(x){return fR(x.dd)})+'</tbody></table></div>';
  var sweep='';
  if(!BT_NOTGT[cur.id]){var Ts=[1,1.5,2,2.5,3,4],sw=Ts.map(function(X){var s2=stats(runBt(ADV.px,cur.id,dirs,X,fee,from,to));return {X:X,n:s2.n,wr:s2.winRate,avg:s2.avgR,tot:s2.totalR}}),bestS=sw.filter(function(r){return r.n>0&&isFinite(r.avg)}).sort(function(a,b){return b.avg-a.avg})[0];
    sweep='<div class="tw" style="margin-top:.9rem"><span class="lbl">Ίδιοι κανόνες με άλλους στόχους</span><table><thead><tr><th>Στόχος</th><th class="r">Συναλλαγές</th><th class="r">Επιτυχία</th><th class="r">Μέσο R</th><th class="r">Σύνολο R</th></tr></thead><tbody>'+
      sw.map(function(r){return '<tr><td>'+fmt(r.X,r.X%1?1:0)+'R'+(r===bestS?' <span class="pill gain">καλύτερος</span>':'')+'</td><td class="r num">'+r.n+'</td><td class="r num">'+pct(r.wr)+'</td><td class="r num '+cls(r.avg)+'">'+fR(r.avg)+'</td><td class="r num '+cls(r.tot)+'">'+fR(r.tot)+'</td></tr>'}).join('')+'</tbody></table></div>'}
  var ins=[];
  if(st.n<20)ins.push({lv:'info',t:'Μόνο '+st.n+' σήματα στο αρχείο. Το αποτέλεσμα δεν είναι αξιόπιστο. Κατέβασε περισσότερα κεριά ή μικρότερο timeframe.'});
  var bn='<span>Κανόνες:</span> «<span>'+esc(cur.t)+'</span>» · ';
  if(st.avgR<=0)ins.push({lv:'stop',h:bn+'<span>'+esc('χωρίς πλεονέκτημα σε αυτά τα δεδομένα: μέσο '+fR(st.avgR)+' ανά συναλλαγή μετά από προμήθειες.')+'</span>'});
  else ins.push({lv:'good',h:bn+'<span>'+esc('θετικό μέσο '+fR(st.avgR)+' ανά συναλλαγή σε αυτά τα δεδομένα, με μέγιστη πτώση '+fR(st.dd)+'.')+'</span>'});
  if(rs.n>=5){var gap=rs.avgR-st.avgR;
    if(gap<=-0.3)ins.push({lv:'warn',t:'Εκτελείτε χειρότερα από τους κανόνες: '+fR(rs.avgR)+' έναντι '+fR(st.avgR)+' στο backtest. Συνήθεις αιτίες: είσοδοι πριν την επιβεβαίωση, πρόωρες έξοδοι, stop που μετακινούνται.'});
    else if(gap>=0.3)ins.push({lv:'good',t:'Τα πάτε καλύτερα από τους μηχανικούς κανόνες: '+fR(rs.avgR)+' έναντι '+fR(st.avgR)+'. Η κρίση σας φιλτράρει κακές εισόδους.'});
    else ins.push({lv:'info',t:'Τα αποτελέσματά σας είναι κοντά στο backtest ('+fR(rs.avgR)+' έναντι '+fR(st.avgR)+'). Εκτελείτε τη στρατηγική όπως είναι γραμμένη.'})}
  else ins.push({lv:'info',t:'Δεν υπάρχουν αρκετές πραγματικές συναλλαγές με αυτή τη στρατηγική και αυτό το σύμβολο για σύγκριση (χρειάζονται τουλάχιστον 5, με stop).'});
  ins.push({lv:'info',t:'Το backtest δεν ξέρει τι έγινε μέσα σε κάθε κερί: όταν stop και στόχος πέφτουν στο ίδιο κερί, μετράει το stop. Δεν περιλαμβάνει slippage.'});
  var dtF=function(t){var d=new Date(t);return dateGr(lday(d))+' '+pad2(d.getHours())+':'+pad2(d.getMinutes())};
  var tl='<details class="bttl" style="margin-top:.9rem"><summary class="lbl" style="cursor:pointer">Όλες οι συναλλαγές του backtest ('+bt.length+'): έλεγξέ τες στο γράφημα</summary><div class="tw"><table class="cftab"><thead><tr><th>Είσοδος</th><th>Θέση</th><th class="r">Τιμή</th><th class="r">Stop</th><th class="r">Στόχος</th><th>Έξοδος</th><th class="r">Τιμή εξόδου</th><th>Πώς</th><th class="r">R</th></tr></thead><tbody>'+
    bt.slice().reverse().map(function(t){return '<tr><td class="num">'+esc(dateGr(t.date)+' '+t.time)+'</td><td><span class="pill '+(t.dir==='long'?'gain':'loss')+'">'+(t.dir==='long'?'Long':'Short')+'</span></td><td class="r num">'+fmtPx(t.e)+'</td><td class="r num">'+fmtPx(t.s)+'</td><td class="r num">'+(isFinite(t.tg)?fmtPx(t.tg):'–')+'</td><td class="num">'+esc(dtF(t.xt))+'</td><td class="r num">'+fmtPx(t.ex)+'</td><td>'+(t.hit==='stop'?'Stop':t.hit==='tgt'?'Στόχος':'Κανόνας εξόδου')+'</td><td class="r num '+cls(t.r)+'">'+fR(t.r)+'</td></tr>'}).join('')+'</tbody></table></div><p class="muted" style="font-size:.8rem;margin:.4rem 0 0">Η είσοδος γίνεται στο κλείσιμο του κεριού-σήματος. Ώρες στη ζώνη ώρας του υπολογιστή σου.</p></details>';
  out.innerHTML=kp+eq+insList(ins)+cmp+sweep+tl;
}

/* ----- 4. suggestion for now ----- */
var NOW={last:null},nowCtl=null;
var FIT={pb:'trend',mx:'trend',dc:'trend',bo:'trend',rv:'range',sq:'squeeze',rt:'trend',dv:'range',vw:'trend',or:'trend',ic:'trend',fc:'trend',sw:'range',r2:'trend',ib:'trend',sp:'range',tf:'trend',sc:'trend'};
function regime(b,I){
  var i=b.length-1,c=b[i].c,e20=I.e20[i],e50=I.e50[i],adx=I.adx[i],atr=I.atr[i],rsi=I.rsi[i];
  var sl=isFinite(I.e50[i-10])?(e50-I.e50[i-10])/atr:0;
  var mn=Infinity;for(var j=Math.max(0,i-120);j<i;j++)if(isFinite(I.bw[j]))mn=Math.min(mn,I.bw[j]);
  var sq=isFinite(I.bw[i])&&I.bw[i]<=mn*1.1;
  var dir=c>e50&&e20>e50&&sl>0.3?1:(c<e50&&e20<e50&&sl<-0.3?-1:0);
  var kind=sq?'squeeze':(adx>=20&&dir?'trend':(adx<20?'range':'mixed'));
  var hi=hhv(b,Math.max(0,i-50),i),lo=llv(b,Math.max(0,i-50),i);
  return {kind:kind,dir:dir,adx:adx,rsi:rsi,atrPct:atr/c*100,c:c,atr:atr,hi:hi,lo:lo,e20:e20,e50:e50,slope:sl};
}
function regimeText(g){
  var k={trend:g.dir>0?'Ανοδική τάση':'Καθοδική τάση',range:'Πλάγια αγορά (range)',squeeze:'Συμπίεση: η αγορά ετοιμάζεται για κίνηση',mixed:'Ασαφής αγορά, χωρίς καθαρή τάση'}[g.kind];
  return k;
}
function lastSignal(id,b,I,d){for(var k=0;k<3;k++){var i=b.length-1-k,st=btSignal(id,b,I,i,d);if(st!=null&&isFinite(st))return {ago:k,stop:st,price:b[i].c}}return null}
function waitText(id,g,d){
  if(GENSP[id])return 'Περιμένει να ισχύσουν όλοι οι κανόνες: '+GENSP[id].bl.map(function(x){return genBlText(x[0],x[1],d)}).join(' + ')+'.';
  if(id==='pb')return d>0?'Περιμένετε η τιμή να γυρίσει στον EMA 20 ('+fmtPx(g.e20)+') και να κλείσει πράσινο κερί πάνω του.':'Περιμένετε η τιμή να ανέβει στον EMA 20 ('+fmtPx(g.e20)+') και να κλείσει κόκκινο κερί κάτω του.';
  if(id==='bo'||id==='dc')return d>0?'Περιμένετε κλείσιμο πάνω από το υψηλό των 20 κεριών ('+fmtPx(g.hi20)+').':'Περιμένετε κλείσιμο κάτω από το χαμηλό των 20 κεριών ('+fmtPx(g.lo20)+').';
  if(id==='mx')return 'Περιμένετε διασταύρωση του EMA 20 με τον EMA 50 (τώρα '+fmtPx(g.e20)+' / '+fmtPx(g.e50)+').';
  if(id==='rv')return d>0?'Περιμένετε το RSI να πέσει κάτω από 30 και να ξανανέβει (τώρα '+fmt(g.rsi,0)+').':'Περιμένετε το RSI να ανέβει πάνω από 70 και να ξαναπέσει (τώρα '+fmt(g.rsi,0)+').';
  if(id==='sq')return d>0?'Περιμένετε κλείσιμο πάνω από την πάνω ζώνη Bollinger.':'Περιμένετε κλείσιμο κάτω από την κάτω ζώνη Bollinger.';
  var bt0=BT.find(function(x){return x.id===id});if(bt0)return 'Περιμένετε το σήμα της στρατηγικής: '+bt0.rule;
  return '';
}
function fmtPx(v){if(!isFinite(v))return '–';var a=Math.abs(v),d=a>=1000?1:a>=10?2:a>=1?3:a>=0.01?5:8;return fmt(v,d)}
function realStats(mid,sym){var c=closed(S.trades.filter(function(t){return manualIdFor(S.strategies.find(function(x){return x.id===t.strategyId}))===mid&&(!sym||symMatch(t.symbol,sym))}));return stats(c)}
function renderNowInfo(){
  var s=$('#now-strat');if(s.options.length<2)s.insertAdjacentHTML('beforeend',BT.map(function(x){return '<option value="'+x.id+'">'+esc(x.t)+'</option>'}).join(''));
  if(!$('#now-risk').value)$('#now-risk').value=S.settings.risk;
  $('#now-ai').hidden=!S.sample||!NOW.last;
  if(!ADV.px)$('#nowOut').innerHTML='<div class="empty">Χρειάζονται φρέσκα κεριά (τουλάχιστον 300, ιδανικά 2.000+) στο timeframe που παίζεις. Γράψε σύμβολο (π.χ. BTCUSDT) και πάτα «Ανάλυση τώρα»: θα προσπαθήσω να τα φέρω μόνος μου, αλλιώς θα σου δείξω πώς να τα πάρεις δωρεάν από το Binance σε 1 λεπτό.</div>';
}
function nowNeedData(msg){var out=$('#nowOut'),fp=$('#freePx');out.innerHTML='<div class="status warn"><span>'+msg+'</span></div><ol class="fpsteps" style="margin-top:.6rem"><li><span>Στο «Σύμβολο του αρχείου» γράψε π.χ. <b>BTCUSDT</b>.</span></li><li><span>Στο «Χωρίς TradingView» (άνοιξε μόλις) πηγή <b>Binance</b>, διάλεξε timeframe και πάτα <b>«Άνοιξε τις τιμές»</b>.</span></li><li><span>Ctrl+A, Ctrl+C στη νέα καρτέλα, γύρνα και πάτα <b>«📋 Επικόλληση από πρόχειρο»</b>. Για περισσότερα: «➕ Ακόμα 1000 παλαιότερα».</span></li><li><span>Μετά πάτα ξανά <b>«Ανάλυση τώρα»</b>.</span></li></ol>';
  if(fp){fp.open=true;fp.scrollIntoView({block:'start',behavior:'smooth'})}var sy=$('#px-sym');if(sy&&!sy.value.trim())setTimeout(function(){sy.focus()},400)}
function nowAutoLoad(){var sym=($('#px-sym').value||'').trim()||'BTCUSDT',out=$('#nowOut');if(!$('#px-sym').value.trim())$('#px-sym').value=sym;
  if(!CG.mcp&&!S.db){nowNeedData('Δεν έχουν φορτωθεί κεριά.');return}
  out.innerHTML='<div class="empty">Φέρνω κεριά '+esc(sym)+' · 1h…</div>';
  deepBars(sym,'1h').catch(function(){return ccFetchBars(sym,'1h')}).then(function(r){var b=r.bars.filter(function(x){return !x.approx});if(b.length<300){nowNeedData('Βρήκα αυτόματα μόνο <b>'+b.length+'</b> κεριά '+esc(sym)+'. Για σωστά στατιστικά χρειάζονται τουλάχιστον 300. '+esc(gmErrText(GM.bad||{code:'no_gemini'})));return}
    if(acceptPx({bars:b}))doNow()}).catch(function(e){nowNeedData('Δεν μπόρεσα να φέρω κεριά αυτόματα'+(e&&e.code?' ('+esc(ccErrText(e)||e.code)+')':'')+'.')})}
function btSE(st){if(!st.n)return NaN;var m=st.avgR,v=0;st.c.forEach(function(t){v+=(t.r-m)*(t.r-m)});return st.n>1?Math.sqrt(v/(st.n-1))/Math.sqrt(st.n):Infinity}
function nowEval(b,o){
  var I=btInd(b),g=regime(b,I),i=b.length-1;g.hi20=hhv(b,i-20,i-1);g.lo20=llv(b,i-20,i-1);
  var fee=isFinite(o.fee)?o.fee:0.1,sym=o.sym||'',dv=o.dir||'auto';
  var ids=o.ids||BT.map(function(x){return x.id});
  var dirs=dv==='long'?[1]:dv==='short'?[-1]:(g.dir&&g.kind==='trend'?[g.dir]:[1,-1]);
  /* honest statistics: choose the target on the first 70% of the file, judge it on the last 30% it has never seen */
  var cutI=Math.max(130,Math.floor(b.length*0.7)),cutT=b[cutI].t,cands=[];
  ids.forEach(function(id){dirs.forEach(function(d){
    var s=BT.find(function(x){return x.id===id}),Xs=BT_NOTGT[id]?[null]:[1.5,2,2.5,3];
    var tr=Xs.map(function(X){var st=stats(runBt(b,id,[d],X||2,fee,null,cutT-1));return {X:X,st:st,lb:st.n?st.avgR-btSE(st):-Infinity}});
    var okT=tr.filter(function(x){return x.st.n>=10}),pick=(okT.length?okT:tr).slice().sort(function(a,c){return (c.lb-a.lb)||(c.st.avgR-a.st.avgR)})[0],X=pick.X;
    var all=stats(runBt(b,id,[d],X||2,fee)),test=stats(runBt(b,id,[d],X||2,fee,cutT,null)),se=btSE(all);
    var edge=test.n>=5?test.avgR:(all.n?all.avgR-se:NaN),reliable=all.n>=20&&test.n>=5;
    var fit=FIT[id]===g.kind?2:(g.kind==='mixed'?0.5:0);if(FIT[id]==='trend'&&g.kind==='trend'&&g.dir&&g.dir!==d)fit=-1;
    var sig=lastSignal(id,b,I,d),sigNote='';
    if(sig){if((g.c-sig.stop)*d<=0){sigNote='Το σήμα ακυρώθηκε: η τιμή πέρασε ήδη το stop.';sig=null}
      else if(sig.ago&&(g.c-sig.price)*d>0.5*Math.abs(sig.price-sig.stop)){sigNote='Το σήμα έφυγε: η τιμή κινήθηκε ήδη πάνω από 0,5R. Μην το κυνηγάτε.';sig=null}}
    var real=realStats(s.mid,sym);
    var score=fit+(isFinite(edge)?Math.max(-1,Math.min(1,edge))*2:-1)+(reliable?0:-1)+(sig?1.5:0)+(real.n>=5?Math.max(-1,Math.min(1,real.avgR))*0.5:0);
    cands.push({id:id,s:s,d:d,best:{X:X,st:all},test:test,train:pick.st,edge:edge,reliable:reliable,se:se,fit:fit,sig:sig,sigNote:sigNote,real:real,score:score});
  })});
  cands.sort(function(a,c){return c.score-a.score});
  var top=cands.filter(function(c){return c.edge>0&&c.reliable})[0]||cands[0],noEdge=!(top.edge>0&&top.reliable);
  return {I:I,g:g,cands:cands,top:top,noEdge:noEdge};
}
function doNow(){
  renderNowInfo();if(!ADV.px){nowAutoLoad();return}
  var b=ADV.px,out=$('#nowOut');
  if(b.length<300){nowNeedData('Έχεις μόνο <b>'+b.length+'</b> κεριά. Για σωστά στατιστικά χρειάζονται τουλάχιστον 300 (τα 130 πρώτα πάνε στους δείκτες), ιδανικά 2.000+.');return}
  var sym=$('#px-sym').value.trim(),fee=n($('#now-fee').value),rk=n($('#now-risk').value)||S.settings.risk,bal=balance();if(!isFinite(fee))fee=0.1;
  var sv=$('#now-strat').value,dv=$('#now-dir').value;
  var EV=nowEval(b,{ids:sv==='auto'?null:[sv],dir:dv,fee:fee,sym:sym}),I=EV.I,g=EV.g,i=b.length-1,cands=EV.cands,top=EV.top,noEdge=EV.noEdge;NOW.last={g:g,top:top,cands:cands,sym:sym,rk:rk,bal:bal};
  var head='<div class="kpis" style="margin-top:.6rem">'+kpi('Αγορά τώρα',regimeText(g),'ADX '+fmt(g.adx,0)+' · RSI '+fmt(g.rsi,0))+kpi('Τελευταία τιμή',fmtPx(g.c),dateGr(lday(new Date(b[i].t)))+' '+pad2(new Date(b[i].t).getHours())+':'+pad2(new Date(b[i].t).getMinutes()))+kpi('Μεταβλητότητα (ATR)',fmt(g.atrPct,2)+'%','ανά κερί')+kpi('Εύρος 50 κεριών',fmtPx(g.lo)+' – '+fmtPx(g.hi),'')+'</div>';
  var age=(Date.now()-b[i].t)/ADV.pxInt,stale=age>3?'<p class="muted" style="margin:.6rem 0 0"><span class="pill warn">παλιά δεδομένα</span> <span>Το τελευταίο κερί είναι παλιό. Κατέβασε φρέσκο αρχείο για πρόταση για τώρα.</span></p>':'';
  // plan
  var plan='',d=top.d,X=top.best.X||S.settings.target,e=g.c,stp;
  if(top.sig){stp=top.sig.stop;e=g.c}
  else{stp=d>0?e-1.5*g.atr:e+1.5*g.atr}
  var risk=Math.abs(e-stp),ext=d>0?g.hi:g.lo,roomR=(ext-e)*d/risk,capNote='';
  if(!BT_NOTGT[top.id]&&roomR>0&&roomR<X){if(roomR>=1.5){var nx=Math.floor(roomR*2)/2;capNote='Ο στόχος μειώθηκε από '+fmt(X,X%1?1:0)+'R σε '+fmt(nx,nx%1?1:0)+'R, για να μείνει πριν από το ακραίο σημείο των 50 κεριών ('+fmtPx(ext)+').';X=nx}
    else capNote='Μέχρι το ακραίο σημείο των 50 κεριών ('+fmtPx(ext)+') υπάρχουν μόνο '+fmt(roomR,1)+'R. Λίγος χώρος για τον στόχο: ίσως καλύτερα να περιμένετε σπάσιμο ή pullback.'}
  var tg=BT_NOTGT[top.id]?NaN:e+d*X*risk,riskAmt=bal>0?bal*rk/100:NaN,qty=riskAmt/risk;
  var tgtPct=isFinite(tg)?Math.abs(tg-e)/e*100:NaN,profit=isFinite(riskAmt)&&top.id!=='dc'?riskAmt*X:NaN;
  var noEdgeH=noEdge?'<div class="status stop" style="margin-top:.7rem"><strong>Καμία στρατηγική δεν έχει αποδεδειγμένο πλεονέκτημα εδώ</strong><span>Σε αυτό το σύμβολο και timeframe, καμία δεν είχε θετικό μέσο R στα κεριά που κρατήθηκαν για έλεγχο (το τελευταίο 30% του αρχείου) με αρκετές συναλλαγές. Η πιο σωστή κίνηση: καμία συναλλαγή, ή δοκιμή μόνο σε demo. Παρακάτω η λιγότερο κακή επιλογή, για ενημέρωση.</span></div>':'';
  plan=noEdgeH+'<div class="card nowplan"><div class="formhead"><h3 style="margin:0"><span>'+(noEdge?'Λιγότερο κακή επιλογή:':'Πρόταση:')+'</span> <span>'+esc(top.s.t)+'</span> · '+(d>0?'Long':'Short')+'</h3>'+(top.sig?'<span class="pill gain">σήμα τώρα</span>':'<span class="pill warn">περιμένετε σήμα</span>')+'</div>'+
    '<p class="muted" style="margin:.35rem 0 0;font-size:.85rem">Στατιστικά: '+top.best.st.n+' συναλλαγές στο αρχείο, επιτυχία '+pct(top.best.st.winRate)+', μέσο '+fR(top.best.st.avgR)+' (±'+(isFinite(top.se)?fmt(top.se,2):'–')+'), profit factor '+(isFinite(top.best.st.pf)?fmt(top.best.st.pf,2):'–')+' · σε νέα δεδομένα (τελευταίο 30%): '+(top.test.n?fR(top.test.avgR)+' σε '+top.test.n:'καμία συναλλαγή')+'.</p>'+(top.sigNote?'<p style="margin:.3rem 0 0"><span class="pill warn">σήμα</span> '+esc(top.sigNote)+'</p>':'')+
    (top.sig?'':'<p style="margin:.4rem 0 0">'+esc(waitText(top.id,g,d))+'</p><p class="muted" style="margin:.2rem 0 0;font-size:.85rem">Τα παρακάτω νούμερα είναι ενδεικτικά, με stop 1,5 ATR. Ξαναϋπολογίστε όταν εμφανιστεί το σήμα.</p>')+
    '<div class="kpis" style="margin-top:.7rem">'+kpi('Είσοδος',fmtPx(e),top.sig?(top.sig.ago?'σήμα πριν '+top.sig.ago+' κεριά':'σήμα στο τελευταίο κερί'):'τρέχουσα τιμή')+kpi('Stop',fmtPx(stp),fmt(risk/e*100,2)+'% απόσταση','neg')+
    (BT_NOTGT[top.id]?kpi('Έξοδος',top.id==='dc'?'Χαμηλό 10 κεριών':top.id==='r2'?'Κλείσιμο πάνω από SMA 5':'Trailing 3 ATR','χωρίς σταθερό στόχο'):kpi('Στόχος',fmtPx(tg),fmt(X,X%1?1:0)+'R · '+fmt(tgtPct,2)+'%','pos'))+
    kpi('Ποσότητα',isFinite(qty)?fmt(qty,qty>=100?0:qty>=1?2:4):'–',isFinite(riskAmt)?'ρίσκο '+fmt(riskAmt,2)+' €':'βάλε υπόλοιπο')+kpi('Πιθανό κέρδος',isFinite(profit)?fE(profit):'–',isFinite(profit)?'αν πιάσει τον στόχο':'','pos')+'</div>'+
    (capNote?'<p class="muted" style="margin:.6rem 0 0"><span class="pill warn">δομή</span> <span>'+esc(capNote)+'</span></p>':'')+'</div>';
  var tbl='<div class="tw" style="margin-top:.9rem"><span class="lbl">Όλες οι στρατηγικές τώρα</span><table><thead><tr><th>Στρατηγική</th><th>Θέση</th><th>Ταιριάζει στην αγορά</th><th>Σήμα</th><th class="r">Backtest (μέσο R)</th><th class="r">Επιτυχία</th><th class="r">Σε νέα δεδομένα</th><th class="r">Στόχος</th><th class="r">Εσείς (μέσο R)</th></tr></thead><tbody>'+
    cands.map(function(c){return '<tr'+(c===top?' class="hot-good"':'')+'><td>'+esc(c.s.t)+'</td><td>'+(c.d>0?'Long':'Short')+'</td><td>'+(c.fit>=2?'<span class="pill gain">ναι</span>':c.fit<0?'<span class="pill loss">κόντρα στην τάση</span>':c.fit>0?'<span class="pill">μερικώς</span>':'<span class="pill">όχι</span>')+'</td><td>'+(c.sig?'<span class="pill gain">τώρα</span>':'–')+'</td><td class="r num '+cls(c.best.st.avgR)+'">'+(c.best.st.n?fR(c.best.st.avgR)+' <span class="muted">('+c.best.st.n+')</span>':'–')+'</td><td class="r num">'+pct(c.best.st.winRate)+'</td><td class="r num '+cls(c.test.avgR)+'">'+(c.test.n?fR(c.test.avgR)+' <span class="muted">('+c.test.n+')</span>':'–')+(c.reliable?'':' <span class="pill" title="Λίγες συναλλαγές">λίγα</span>')+'</td><td class="r num">'+(c.best.X?fmt(c.best.X,c.best.X%1?1:0)+'R':'–')+'</td><td class="r num '+cls(c.real.avgR)+'">'+(c.real.n?fR(c.real.avgR)+' <span class="muted">('+c.real.n+')</span>':'–')+'</td></tr>'}).join('')+'</tbody></table></div>';
  var ins=[];
  if(top.score<1)ins.push({lv:'warn',t:'Καμία στρατηγική δεν ταιριάζει καθαρά στην αγορά αυτή τη στιγμή. Η καλύτερη κίνηση μπορεί να είναι να μην μπείτε καθόλου.'});
  if(top.best.st.n<20)ins.push({lv:'info',t:'Μόνο '+top.best.st.n+' συναλλαγές στο αρχείο για αυτή τη στρατηγική. Κάτω από 20-30 το αποτέλεσμα μπορεί να είναι τύχη: φορτώστε περισσότερα κεριά (➕ Ακόμα 1000 παλαιότερα).'});
  if(top.test.n>=5&&top.train.n>=10&&top.train.avgR>0&&top.test.avgR<top.train.avgR-0.4)ins.push({lv:'warn',t:'Τα πρόσφατα κεριά δίνουν πολύ χειρότερο αποτέλεσμα ('+fR(top.test.avgR)+') από τα παλαιότερα ('+fR(top.train.avgR)+'). Η αγορά άλλαξε συμπεριφορά: μικρότερη ποσότητα ή demo.'});
  if(top.real.n>=5&&top.real.avgR<0)ins.push({lv:'warn',t:'Στις δικές σας συναλλαγές με αυτή τη στρατηγική έχετε μέσο '+fR(top.real.avgR)+'. Το backtest λέει ότι οι κανόνες δουλεύουν, οπότε το πρόβλημα είναι πιθανότατα η εκτέλεση.'});
  if(g.atrPct>3)ins.push({lv:'warn',t:'Πολύ υψηλή μεταβλητότητα ('+fmt(g.atrPct,1)+'% ανά κερί). Μικρότερη ποσότητα ή περιμένετε να ηρεμήσει.'});
  if(isFinite(g.rsi)&&(g.rsi>75||g.rsi<25))ins.push({lv:'info',t:'Το RSI είναι σε ακραίο επίπεδο ('+fmt(g.rsi,0)+'). Οι νέες είσοδοι προς την ίδια κατεύθυνση έχουν συχνά χειρότερη αναλογία.'});
  if(!(bal>0))ins.push({lv:'info',t:'Βάλτε υπόλοιπο λογαριασμού στους Κανόνες ρίσκου για να βγαίνει ποσότητα και πιθανό κέρδος.'});
  ins.push({lv:'info',t:'Πώς βγαίνει: για κάθε στρατηγική ο στόχος διαλέγεται στο πρώτο 70% των κεριών και κρίνεται στο τελευταίο 30% που δεν «είδε», με προμήθεια '+fmt(fee,2)+'% ανά πλευρά. Προτείνεται μόνο στρατηγική με θετικό μέσο R εκεί και 20+ συναλλαγές συνολικά. Δεν είναι επενδυτική συμβουλή: ελέγξτε το γράφημα πριν μπείτε.'});
  out.innerHTML=head+stale+plan+insList(ins)+tbl;
  $('#nowAi').hidden=true;$('#now-ai').hidden=!S.sample;
}
function nowAI(){
  if(!S.sample||!NOW.last)return;var L=NOW.last,box=$('#nowAi'),btn=$('#now-ai'),g=L.g;
  var data={symbol:L.sym,timeframe:intLabel(ADV.pxInt),market:{regime:g.kind,trendDir:g.dir,adx:+g.adx.toFixed(1),rsi:+g.rsi.toFixed(1),atrPct:+g.atrPct.toFixed(2),last:g.c,ema20:g.e20,ema50:g.e50,high50:g.hi,low50:g.lo},
    riskPct:L.rk,rulesTargetR:S.settings.target,
    candidates:L.cands.map(function(c){return {strategy:c.s.t,rules:c.s.rule,dir:c.d>0?'long':'short',fitsMarket:c.fit,signalNow:!!c.sig,backtestTrades:c.best.st.n,backtestAvgR:isFinite(c.best.st.avgR)?+c.best.st.avgR.toFixed(2):null,bestTargetR:c.best.X,yourTrades:c.real.n,yourAvgR:isFinite(c.real.avgR)?+c.real.avgR.toFixed(2):null}}),
    last30bars:ADV.px.slice(-30).map(function(x){return [x.o,x.h,x.l,x.c]})};
  var prompt='Είσαι αναλυτής που ελέγχει ένα μηχανικό σύστημα trading δύο ερασιτεχνών. Το σύστημα αξιολόγησε τις στρατηγικές τους στα τρέχοντα κεριά του '+L.sym+' και πρότεινε την πρώτη της λίστας. '+
    'Με βάση ΜΟΝΟ τα δεδομένα παρακάτω: 1) συμφωνείς με την επιλογή στρατηγικής και κατεύθυνσης; γιατί; 2) είναι λογικός ο στόχος σε R με βάση τη δομή (υψηλό/χαμηλό 50 κεριών, μεταβλητότητα); 3) τι πρέπει να δουν στο γράφημα πριν μπουν και τι θα ακύρωνε την ιδέα. '+
    'Μην υπόσχεσαι αποτελέσματα, πες τις αβεβαιότητες, και θύμισε σύντομα ότι δεν είναι επενδυτική συμβουλή. '+
    (window.I18N&&I18N.lang==='ru'?'Γράψε στα ρωσικά (на русском языке),':'Γράψε στα ελληνικά,')+' απλό κείμενο χωρίς markdown, έως 180 λέξεις.\n\nΔΕΔΟΜΕΝΑ (JSON):\n'+JSON.stringify(data);
  if(nowCtl)nowCtl.abort();nowCtl=new AbortController();
  box.hidden=false;btn.disabled=true;box.textContent='Ο Claude εξετάζει την πρόταση…';
  S.sample(prompt,{onText:function(u){box.textContent=u.text},signal:nowCtl.signal,modelTier:'default',cache:false})
   .then(function(r){box.textContent=r.text})
   .catch(function(e){if(e&&e.name==='AbortError')return;var c=e&&e.code;if(c==='not_granted'){btn.hidden=true;box.hidden=true;return}
     box.textContent=c==='rate_limited'?'Πολλά αιτήματα. Ξαναδοκίμασε σε λίγα λεπτά.':'Η ανάλυση δεν ολοκληρώθηκε. Ξαναδοκίμασε αργότερα.'})
   .then(function(){btn.disabled=false});
}

/* ================= PRO: screenshots, tags, rule checks, goals, calendar, metrics, stress, export ================= */
var LANG_RU=function(){return !!(window.I18N&&I18N.lang==='ru')};

/* ---------- screenshots ---------- */
var SHOTS=[],LOCALSHOT={},ASSETS_P=null;
function assetsNs(){if(!ASSETS_P){var cl=window.claude&&window.claude.use?window.claude:null;ASSETS_P=cl?cl.use('assets').catch(function(){return null}):Promise.resolve(null)}return ASSETS_P}
function shotUrl(s){return LOCALSHOT[s.id]||('/_blob/'+s.id)}
function shrink(file){
  return new Promise(function(res){
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size<350000){res(file);return}
    var img=new Image(),u=URL.createObjectURL(file);
    img.onload=function(){var k=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(function(b){res(b&&b.size<file.size?b:file)},'image/jpeg',0.85)};
    img.onerror=function(){URL.revokeObjectURL(u);res(file)};img.src=u;
  });
}
function addShots(files,k){
  files=Array.prototype.filter.call(files||[],function(f){return /^image\//.test(f.type)});if(!files.length)return;
  var room=4-SHOTS.filter(function(s){return s.k===k}).length;if(room<=0){toast('Έως 4 εικόνες για κάθε στιγμή.');return}
  files=files.slice(0,room);$('#sh-msg').textContent='Ανέβασμα…';
  assetsNs().then(function(A){
    var chain=Promise.resolve();
    files.forEach(function(f){chain=chain.then(function(){return shrink(f).then(function(b){
      if(!A){var id='local-'+Math.random().toString(36).slice(2);LOCALSHOT[id]=URL.createObjectURL(b);SHOTS.push({id:id,k:k});return}
      return A.upload(b).then(function(r){SHOTS.push({id:r.id,k:k})});
    })})});
    return chain.then(function(){$('#sh-msg').textContent=A?'Αποθηκεύονται μαζί με τη συναλλαγή όταν πατήσεις Αποθήκευση.':'Δοκιμαστική λειτουργία: οι εικόνες δεν αποθηκεύονται.'});
  }).catch(function(e){var c=e&&e.code;$('#sh-msg').textContent=c==='too_large'?'Η εικόνα είναι πολύ μεγάλη.':c==='quota_or_state'?'Ο χώρος για εικόνες γέμισε. Σβήστε παλιές.':c==='not_granted'||c==='capability_disabled'?'Οι εικόνες δεν είναι διαθέσιμες σε αυτή την προβολή.':'Το ανέβασμα απέτυχε. Δοκίμασε ξανά.'})
  .then(renderShots);
}
function renderShots(){
  ['b','a'].forEach(function(k){$('#sh-'+k).innerHTML=SHOTS.filter(function(s){return s.k===k}).map(function(s){return '<span class="thumb"><img src="'+esc(shotUrl(s))+'" alt="" data-zoom="'+esc(s.id)+'" loading="lazy"><button type="button" class="x" data-unshot="'+esc(s.id)+'" aria-label="Αφαίρεση εικόνας">×</button><button type="button" class="askshot" data-askshot="'+esc(s.id)+'" title="Ανάλυση από τον Καθηγητή" aria-label="Ανάλυση από τον Καθηγητή">?</button></span>'}).join('')});
}
function zoom(src){var lb=$('#lightbox');lb.querySelector('img').src=src;lb.hidden=false}
function bindShots(){
  $$('[data-shot]').forEach(function(inp){inp.addEventListener('change',function(){addShots(inp.files,inp.getAttribute('data-shot'));inp.value=''})});
  $('#tradeForm').addEventListener('click',function(e){
    var as=e.target.closest('[data-askshot]');if(as){var sh=SHOTS.find(function(z){return z.id===as.getAttribute('data-askshot')});if(!sh)return;
      fetch(shotUrl(sh)).then(function(r){return r.blob()}).then(function(b){PCH.imgs=[];pAddImgs([new File([b],'chart.'+(b.type.split('/')[1]||'png'),{type:b.type||'image/png'})]);QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();
        var sym=$('#t-symbol').value.trim(),st=$('#t-strategy').selectedOptions[0];setTimeout(function(){var q=$('#pq');if(q)q.value=(sym?sym+' · ':'')+(st&&st.value?st.textContent+' · ':'')+(LANG_RU()?'Проанализируй этот график сделки.':'Ανάλυσε το γράφημα αυτής της συναλλαγής.')},300)})
       .catch(function(){toast('Δεν μπόρεσα να ανοίξω την εικόνα.')});return}
    var x=e.target.closest('[data-unshot]');if(x){var id=x.getAttribute('data-unshot');SHOTS=SHOTS.filter(function(s){return s.id!==id});renderShots();return}
  });
  document.addEventListener('click',function(e){var z=e.target.closest('[data-zoom]');if(z){zoom(z.getAttribute('src'));return}
    if(e.target.closest('#lightbox'))$('#lightbox').hidden=true});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')$('#lightbox').hidden=true});
  document.addEventListener('paste',function(e){
    if($('section[data-panel=trades]').hidden)return;var it=e.clipboardData&&e.clipboardData.items;if(!it)return;
    var fs=[];for(var i=0;i<it.length;i++)if(it[i].kind==='file'&&/^image\//.test(it[i].type))fs.push(it[i].getAsFile());
    if(!fs.length)return;e.preventDefault();addShots(fs,$('#t-exit').value?'a':'b');
  });
  $$('.shotzone').forEach(function(z){
    z.addEventListener('dragover',function(e){e.preventDefault();z.classList.add('drag')});
    z.addEventListener('dragleave',function(){z.classList.remove('drag')});
    z.addEventListener('drop',function(e){e.preventDefault();z.classList.remove('drag');addShots(e.dataTransfer.files,z.getAttribute('data-k'))});
  });
}

/* ---------- tags & rule checks ---------- */
function parseTags(v){var o=[],seen={};String(v||'').split(/[,;#]/).forEach(function(x){x=x.trim().toLowerCase().slice(0,30);if(x&&!seen[x]){seen[x]=1;o.push(x)}});return o.slice(0,10)}
function allTags(){var m={};S.trades.forEach(function(t){(t.tags||[]).forEach(function(g){m[g]=(m[g]||0)+1})});return Object.keys(m).sort(function(a,b){return m[b]-m[a]})}
function stratRules(s){if(!s)return [];return String((s.entry||'')+'\n'+(s.exit||'')).split('\n').map(function(l){return l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/,'').trim()}).filter(function(l){return l&&!/:\s*$/.test(l)&&l.length<=180}).slice(0,14)}
var RCHK_LOADED=null;
function renderRuleChecks(){
  var s=S.strategies.find(function(x){return x.id===$('#t-strategy').value}),rs=stratRules(s),box=$('#t-rchk');
  if(!rs.length){box.hidden=true;$('#t-rlist').innerHTML='';return}
  var prev={};(RCHK_LOADED||[]).forEach(function(x){prev[x.r]=x.ok});
  $('#t-rlist').innerHTML=rs.map(function(r,i){return '<label class="check"><input type="checkbox" data-rule="'+i+'"'+(prev[r]?' checked':'')+'> <span>'+esc(r)+'</span></label>'}).join('');
  box.hidden=false;
}
function readRuleChecks(){
  var s=S.strategies.find(function(x){return x.id===$('#t-strategy').value}),rs=stratRules(s);if(!rs.length)return null;
  var boxes=$$('#t-rlist input[data-rule]');if(!boxes.some(function(b){return b.checked}))return null;
  return rs.map(function(r,i){var b=boxes[i];return {r:r.slice(0,180),ok:!!(b&&b.checked)}});
}

/* ---------- note templates ---------- */
var NOTE_TPL=[
 {n:['Πλάνο πριν την είσοδο','План перед входом'],b:['Setup: \nΓιατί τώρα: \nΕπιβεβαίωση που περιμένω: \nΠού ακυρώνεται η ιδέα (stop): \nΣτόχος και γιατί εκεί: \nΤάση μεγαλύτερου timeframe: ','Сетап: \nПочему сейчас: \nКакое подтверждение жду: \nГде идея отменяется (стоп): \nЦель и почему там: \nТренд старшего таймфрейма: ']},
 {n:['Απολογισμός μετά την έξοδο','Разбор после выхода'],b:['Τι έγινε: \nΑκολούθησα το πλάνο; \nΤι έκανα καλά: \nΤι θα άλλαζα: \nΒαθμός εκτέλεσης (1-10): ','Что произошло: \nСледовал ли плану? \nЧто сделал хорошо: \nЧто изменил бы: \nОценка исполнения (1-10): ']},
 {n:['Breakout','Пробой'],b:['Επίπεδο που έσπασε: \nΌγκος στο σπάσιμο (πάνω από τον μέσο;): \nΚλείσιμο κεριού πάνω/κάτω από το επίπεδο; \nRetest; \nΨευδοσπάσιμο στο παρελθόν σε αυτό το επίπεδο; ','Уровень пробоя: \nОбъём на пробое (выше среднего?): \nЗакрытие свечи за уровнем? \nРетест? \nЛожные пробои на этом уровне раньше? ']},
 {n:['Pullback σε τάση','Откат в тренде'],b:['Τάση (EMA 50, ανώτερα υψηλά/χαμηλά): \nΣημείο pullback (EMA 20, επίπεδο, FVG): \nΚερί επιβεβαίωσης: \nRSI/όγκος στο pullback: ','Тренд (EMA 50, растущие максимумы/минимумы): \nТочка отката (EMA 20, уровень, FVG): \nПодтверждающая свеча: \nRSI/объём на откате: ']},
 {n:['Αντιστροφή','Разворот'],b:['Επίπεδο αντιστροφής: \nΣήμα εξάντλησης (divergence, pin bar, sweep): \nΣπάσιμο δομής (CHoCH); \nΓιατί όχι συνέχεια της τάσης: ','Уровень разворота: \nСигнал истощения (дивергенция, пин-бар, sweep): \nСлом структуры (CHoCH)? \nПочему не продолжение тренда: ']},
 {n:['Ανάλυση λάθους','Разбор ошибки'],b:['Τι λάθος έκανα: \nΠοιος κανόνας παραβιάστηκε: \nΤι ένιωθα εκείνη τη στιγμή: \nΤι θα με είχε σταματήσει: \nΚανόνας για την επόμενη φορά: ','Какую ошибку сделал: \nКакое правило нарушено: \nЧто чувствовал в тот момент: \nЧто могло меня остановить: \nПравило на следующий раз: ']},
 {n:['Συναλλαγή σε ειδήσεις','Сделка на новостях'],b:['Είδηση / ώρα: \nΑναμενόμενο vs πραγματικό: \nΑντίδραση τιμής πρώτα 5 λεπτά: \nSpread/slippage: ','Новость / время: \nОжидание vs факт: \nРеакция цены в первые 5 минут: \nСпред/проскальзывание: ']},
 {n:['Ψυχολογία','Психология'],b:['Διάθεση πριν: \nΚούραση/άγχος (1-10): \nΒιαζόμουν; FOMO; \nΜετά τη συναλλαγή ένιωσα: ','Настроение до: \nУсталость/стресс (1-10): \nТоропился? FOMO? \nПосле сделки чувствовал: ']},
 {n:['A+ setup','Сетап A+'],b:['Γιατί είναι A+: \nΣυγκλίσεις (επίπεδο + τάση + όγκος + timeframe): \nΡίσκο:κέρδος: \nΠοσοστό ρίσκου: ','Почему это A+: \nСовпадения (уровень + тренд + объём + таймфрейм): \nРиск:прибыль: \nПроцент риска: ']},
 {n:['Χαμένη ευκαιρία','Упущенная возможность'],b:['Τι είδα: \nΓιατί δεν μπήκα: \nΉταν μέσα στους κανόνες; \nΤι μαθαίνω: ','Что увидел: \nПочему не вошёл: \nСоответствовало ли правилам? \nЧто вывожу: ']}
];
var CI_TPL={plan:[
 {n:['Πρωινή ρουτίνα','Утренняя рутина'],b:['Ειδήσεις/ημερολόγιο ημέρας: \nΤάση BTC και αγοράς: \nΕπίπεδα που παρακολουθώ: \nΣύμβολα σε λίστα: \nΜέγιστο ρίσκο σήμερα: \nΑν χάσω 2R σταματάω.','Новости/календарь дня: \nТренд BTC и рынка: \nУровни, за которыми слежу: \nТикеры в списке: \nМакс. риск сегодня: \nЕсли потеряю 2R — стоп.']},
 {n:['Πλάνο ανά σύμβολο','План по тикерам'],b:['Σύμβολο 1 — σενάριο long: / σενάριο short: \nΣύμβολο 2 — σενάριο long: / σενάριο short: \nΤι ΔΕΝ θα κάνω σήμερα: ','Тикер 1 — сценарий long: / сценарий short: \nТикер 2 — сценарий long: / сценарий short: \nЧего я сегодня НЕ буду делать: ']}],
 review:[
 {n:['Απολογισμός ημέρας','Итог дня'],b:['Συναλλαγές / αποτέλεσμα: \nΤήρησα το πλάνο; \nΚαλύτερη απόφαση: \nΧειρότερη απόφαση: \nΈνα πράγμα για αύριο: ','Сделки / результат: \nСледовал ли плану? \nЛучшее решение: \nХудшее решение: \nОдно на завтра: ']},
 {n:['Εβδομαδιαίος απολογισμός','Итог недели'],b:['Αποτέλεσμα εβδομάδας (R / €): \nΚαλύτερη στρατηγική: \nΕπαναλαμβανόμενο λάθος: \nΣτόχος επόμενης εβδομάδας: \nΤι κόβω: ','Результат недели (R / €): \nЛучшая стратегия: \nПовторяющаяся ошибка: \nЦель на следующую неделю: \nОт чего отказываюсь: ']}]};
function fillTplSelect(sel,list){sel.innerHTML='<option value="">'+esc(sel.getAttribute('data-ph'))+'</option>'+list.map(function(t,i){return '<option value="'+i+'">'+esc(t.n[0])+'</option>'}).join('')}
function insertTpl(sel,list,ta){var i=sel.value;if(i==='')return;var t=list[+i],body=t.b[LANG_RU()?1:0],el=$(ta);el.value=(el.value.trim()?el.value.replace(/\s+$/,'')+'\n\n':'')+body;el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();sel.value=''}
function bindTpl(){
  fillTplSelect($('#t-ntpl'),NOTE_TPL);fillTplSelect($('#c-ptpl'),CI_TPL.plan);fillTplSelect($('#c-rtpl'),CI_TPL.review);
  $('#t-ntpl').addEventListener('change',function(){insertTpl(this,NOTE_TPL,'#t-notes')});
  $('#c-ptpl').addEventListener('change',function(){insertTpl(this,CI_TPL.plan,'#c-plan')});
  $('#c-rtpl').addEventListener('change',function(){insertTpl(this,CI_TPL.review,'#c-review')});
}

/* ---------- goals & prop ---------- */
var GDEF={week:{r:5,pnl:0,wr:40,rules:90},month:{r:15,pnl:0,wr:40,rules:90},quarter:{r:40,pnl:0,wr:40,rules:90},prop:{on:false,start:'',balance:10000,target:8,daily:5,max:10,minDays:4}};
function myGoals(){var g=S.goals&&S.goals[safeSeg(S.uid||'me')]||{};return {week:Object.assign({},GDEF.week,g.week),month:Object.assign({},GDEF.month,g.month),quarter:Object.assign({},GDEF.quarter,g.quarter),prop:Object.assign({},GDEF.prop,g.prop)}}
function periodRange(p){var d=new Date(),a,b;
  if(p==='week'){a=new Date(d);a.setDate(d.getDate()-((d.getDay()+6)%7));b=new Date(a);b.setDate(a.getDate()+6)}
  else if(p==='month'){a=new Date(d.getFullYear(),d.getMonth(),1);b=new Date(d.getFullYear(),d.getMonth()+1,0)}
  else{var q=Math.floor(d.getMonth()/3)*3;a=new Date(d.getFullYear(),q,1);b=new Date(d.getFullYear(),q+3,0)}
  return {a:lday(a),b:lday(b),left:Math.max(0,Math.round((b-d)/864e5))}}
var GTAB='week';
function bar(label,val,goal,f,lowerIsBad){
  var p=goal>0&&isFinite(val)?Math.max(0,Math.min(1,val/goal)):0,ok=isFinite(val)&&val>=goal;
  return '<div class="gbar"><div class="row" style="justify-content:space-between"><span>'+esc(label)+'</span><span class="num"><b class="'+(ok?'pos':'')+'">'+esc(f(val))+'</b> / '+esc(f(goal))+'</span></div><div class="meter"><i class="'+(ok?'ok':'')+'" style="width:'+(p*100).toFixed(1)+'%"></i></div></div>';
}
function renderGoals(){
  var G=myGoals(),g=G[GTAB],R=periodRange(GTAB);
  $$('#goalTabs button').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-g')===GTAB?'true':'false')});
  var list=S.trades.filter(function(t){return mine(t)&&t.date>=R.a&&t.date<=R.b}),c=closed(list),st=stats(list);
  var fol=c.filter(function(t){return t.rules===true}).length,br=c.filter(function(t){return t.rules===false}).length,rp=fol+br?fol/(fol+br)*100:NaN;
  var h='<p class="muted" style="margin:0 0 .5rem;font-size:.85rem"><span>'+dateGr(R.a)+' – '+dateGr(R.b)+'</span> · <span>απομένουν</span> <b>'+R.left+'</b> <span>ημέρες</span> · <b>'+st.n+'</b> <span>κλειστές</span></p>';
  h+=bar('Αποτέλεσμα σε R',st.totalR,g.r,fR);
  if(g.pnl>0)h+=bar('Κέρδος σε €',st.pnl,g.pnl,fE);
  h+=bar('Επιτυχία',st.winRate*100,g.wr,function(x){return isFinite(x)?fmt(x,0)+'%':'–'});
  h+=bar('Τήρηση κανόνων',rp,g.rules,function(x){return isFinite(x)?fmt(x,0)+'%':'–'});
  $('#goalBody').innerHTML=h;
}
function renderRisk(){
  var set=S.settings,rk=n(set.risk)||1,ds=dayState(S.uid),mx=n(set.maxDD)||10,bal=balance();
  var dayPct=Math.max(0,-ds.r*rk),dayLim=set.dayLoss*rk;
  var c=closed(S.trades.filter(mine)),cum=0,peak=0;c.forEach(function(t){cum+=t.r*rk;peak=Math.max(peak,cum)});var dd=peak-cum;
  var lvl=dayPct>=dayLim||dd>=mx?'stop':(dayPct>=dayLim*0.6||dd>=mx*0.6?'warn':'ok');
  var msg={ok:'Όλα τα όρια είναι εντάξει.',warn:'Πλησιάζεις κάποιο όριο. Μικρότερο ρίσκο ή διάλειμμα.',stop:'Ξεπέρασες όριο. Σταμάτα και κάνε απολογισμό.'}[lvl];
  $('#riskBody').innerHTML='<div class="status '+lvl+'"><strong>'+esc(msg)+'</strong></div>'+
    bar('Απώλεια σήμερα (% λογαριασμού)',dayPct,dayLim,function(x){return fmt(x,2)+'%'})+
    bar('Πτώση από την κορυφή (% λογαριασμού)',dd,mx,function(x){return fmt(x,2)+'%'})+
    '<p class="muted" style="margin:.4rem 0 0;font-size:.82rem"><span>Συναλλαγές σήμερα:</span> <b>'+ds.count+' / '+set.maxTrades+'</b>'+(isFinite(bal)?' · <span>ρίσκο ανά συναλλαγή</span> <b>'+fmt(bal*rk/100,2)+' €</b>':'')+'</p>';
  $$('#riskBody .gbar').forEach(function(x){x.classList.add('inv')});
}
function renderProp(){
  var P=myGoals().prop,card=$('#propCard');card.hidden=!P.on;if(!P.on)return;
  var start=P.start||'0000-00-00',bal0=n(P.balance)||10000,rk=n(S.settings.risk)||1;
  var c=closed(S.trades.filter(function(t){return mine(t)&&t.date>=start}));
  var money=function(t){var p=n(t.pnl);return isFinite(p)?p:t.r*bal0*rk/100};
  var days={},eq=bal0,minEq=bal0;c.forEach(function(t){days[t.date]=(days[t.date]||0)+money(t);eq+=money(t);minEq=Math.min(minEq,eq)});
  var prof=(eq-bal0)/bal0*100,worstDay=0;Object.keys(days).forEach(function(d){worstDay=Math.min(worstDay,days[d]/bal0*100)});
  var maxLoss=(bal0-minEq)/bal0*100,nd=Object.keys(days).length;
  var failed=-worstDay>=P.daily||maxLoss>=P.max,passed=!failed&&prof>=P.target&&nd>=P.minDays;
  var st=failed?'stop':passed?'ok':'warn',txt=failed?'Η πρόκληση απέτυχε: ξεπεράστηκε όριο απώλειας.':passed?'Πέρασες την πρόκληση!':'Σε εξέλιξη';
  $('#propBody').innerHTML='<div class="status '+st+'"><strong>'+esc(txt)+'</strong><span class="muted"><span>Από</span> '+(P.start?dateGr(P.start):'–')+' · <span>αρχικό κεφάλαιο</span> '+fmt(bal0,0)+' €</span></div>'+
    '<div class="grid2" style="margin-top:.6rem"><div>'+bar('Κέρδος προς τον στόχο',prof,P.target,function(x){return fmt(x,2)+'%'})+bar('Ημέρες συναλλαγών',nd,P.minDays,function(x){return fmt(x,0)})+'</div><div>'+
    bar('Χειρότερη ημέρα (όριο)',-worstDay,P.daily,function(x){return fmt(x,2)+'%'})+bar('Μέγιστη απώλεια (όριο)',maxLoss,P.max,function(x){return fmt(x,2)+'%'})+'</div></div>';
  $$('#propBody .grid2 > div:last-child .gbar').forEach(function(x){x.classList.add('inv')});
}
function fillGoalForm(){
  if(GDIRTY)return;var G=myGoals();
  ['week','month','quarter'].forEach(function(p){['r','pnl','wr','rules'].forEach(function(k){var el=$('#g-'+p+'-'+k);if(el)el.value=G[p][k]})});
  var P=G.prop;$('#pr-on').checked=!!P.on;$('#pr-start').value=P.start||'';$('#pr-balance').value=P.balance;$('#pr-target').value=P.target;$('#pr-daily').value=P.daily;$('#pr-max').value=P.max;$('#pr-days').value=P.minDays;
}
var GDIRTY=false;
function saveGoals(ev){
  ev.preventDefault();var d={by:S.uid,updatedAt:new Date().toISOString()};
  ['week','month','quarter'].forEach(function(p){d[p]={};['r','pnl','wr','rules'].forEach(function(k){var v=n($('#g-'+p+'-'+k).value);d[p][k]=isFinite(v)?v:GDEF[p][k]})});
  d.prop={on:$('#pr-on').checked,start:$('#pr-start').value||today(),balance:n($('#pr-balance').value)||10000,target:n($('#pr-target').value)||8,daily:n($('#pr-daily').value)||5,max:n($('#pr-max').value)||10,minDays:Math.round(n($('#pr-days').value)||0)};
  var b=$('#g-save');b.disabled=true;
  put('goals',safeSeg(S.uid||'me'),d).then(function(){GDIRTY=false;toast('Οι στόχοι αποθηκεύτηκαν')}).catch(function(e){toast(writeErr(e))}).then(function(){b.disabled=false;applyWriteState()});
}

/* ---------- calendar ---------- */
var CAL=null,CALSEL=null;
function renderCal(){
  var list=filtered().filter(function(t){return t.status==='closed'});
  if(!CAL||!CAL.user){var last=list.map(function(t){return t.date}).sort().pop()||today();CAL={y:+last.slice(0,4),m:+last.slice(5,7)-1}}
  var y=CAL.y,m=CAL.m,first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),off=(first.getDay()+6)%7,per={};
  list.forEach(function(t){if(t.date&&+t.date.slice(0,4)===y&&+t.date.slice(5,7)-1===m){var d=+t.date.slice(8,10);var o=per[d]=per[d]||{r:0,p:0,n:0,hr:0};o.n++;if(hasR(t)){o.r+=t.r;o.hr++}var pp=n(t.pnl);if(isFinite(pp))o.p+=pp}});
  var mxR=0;Object.keys(per).forEach(function(k){mxR=Math.max(mxR,Math.abs(per[k].r))});
  var MN=['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος'];
  var tot={r:0,p:0,n:0,w:0,l:0};Object.keys(per).forEach(function(k){var o=per[k];tot.r+=o.r;tot.p+=o.p;tot.n+=o.n;if(o.r>0)tot.w++;else if(o.r<0)tot.l++});
  var h='<div class="calhead"><button class="btn small" type="button" data-cal="-1" aria-label="Προηγούμενος μήνας">‹</button><b><span>'+MN[m]+'</span> '+y+'</b><button class="btn small" type="button" data-cal="1" aria-label="Επόμενος μήνας">›</button>'+
    '<span class="muted calsum"><b class="'+cls(tot.r)+'">'+fR(tot.r)+'</b> · <b class="'+cls(tot.p)+'">'+fE(tot.p)+'</b> · <span>'+tot.n+'</span> <span>συναλλαγές</span> · <span>κερδοφόρες μέρες</span> <b>'+tot.w+'</b> / <span>με απώλεια</span> <b>'+tot.l+'</b></span></div>';
  h+='<div class="calgrid"><div class="cdh">Δευ</div><div class="cdh">Τρι</div><div class="cdh">Τετ</div><div class="cdh">Πεμ</div><div class="cdh">Παρ</div><div class="cdh">Σαβ</div><div class="cdh">Κυρ</div><div class="cdh">Εβδ.</div>';
  var cell=0,wk={r:0,p:0,n:0};
  var flush=function(){h+='<div class="cwk"><b class="'+cls(wk.r)+'">'+(wk.n?fR(wk.r):'')+'</b><span>'+(wk.n?fE(wk.p):'')+'</span></div>';wk={r:0,p:0,n:0}};
  for(var i=0;i<off;i++){h+='<div class="cday empty"></div>';cell++}
  for(var d=1;d<=days;d++){
    var o=per[d],ds=y+'-'+pad2(m+1)+'-'+pad2(d),a=o&&mxR?Math.min(1,Math.abs(o.r)/mxR):0;
    h+='<button type="button" class="cday'+(o?(o.r>0?' up':o.r<0?' dn':' fl'):'')+(CALSEL===ds?' sel':'')+'" data-day="'+ds+'" style="--a:'+(0.12+a*0.6).toFixed(2)+'"><span class="dn0">'+d+'</span>'+(o?'<b>'+(o.hr?fR(o.r):'–')+'</b><span>'+fE(o.p)+'</span><span class="cn">'+o.n+'</span>':'')+'</button>';
    if(o){wk.r+=o.r;wk.p+=o.p;wk.n+=o.n}
    cell++;if(cell%7===0)flush();
  }
  if(cell%7){while(cell%7){h+='<div class="cday empty"></div>';cell++}flush()}
  h+='</div>';
  if(CALSEL){var dl=list.filter(function(t){return t.date===CALSEL}).sort(sortTime);
    h+='<div class="tw" style="margin-top:.8rem"><span class="lbl">'+dateGr(CALSEL)+'</span><table><thead><tr><th>Ώρα</th><th>Ποιος</th><th>Σύμβολο</th><th>Θέση</th><th>Στρατηγική</th><th class="r">R</th><th class="r">€</th></tr></thead><tbody>'+
      (dl.length?dl.map(function(t){return '<tr data-open="'+esc(t.id)+'"><td>'+esc(t.time||'')+'</td><td>'+esc(name(t.by))+'</td><td>'+dmSymCell(t)+'</td><td>'+dirPill(t)+'</td><td class="ud">'+esc(stratName(t.strategyId))+'</td><td class="r num '+cls(t.r)+'">'+(t._est?'≈ ':'')+fR(t.r)+'</td><td class="r num '+cls(n(t.pnl))+'">'+fE(n(t.pnl))+'</td></tr>'}).join(''):'<tr><td colspan="7" class="muted">Καμία κλειστή συναλλαγή.</td></tr>')+'</tbody></table></div>'}
  $('#calendar').innerHTML=h;
}

/* ---------- metrics ---------- */
function sessionOf(tm){if(!tm)return null;var p=tm.split(':'),m=(+p[0])*60+(+p[1]||0);
  if(m>=120&&m<600)return '1 Ασία (02:00–10:00)';if(m>=600&&m<930)return '2 Ευρώπη (10:00–15:30)';if(m>=930&&m<1110)return '3 Ευρώπη + ΗΠΑ (15:30–18:30)';if(m>=1110&&m<1380)return '4 ΗΠΑ (18:30–23:00)';return '5 Νύχτα (23:00–02:00)'}
function metrics(list){
  var all=list,c=closed(list),st=stats(list),rs=c.map(function(t){return t.r}),rk=n(S.settings.risk)||1;
  var ps=c.map(function(t){return n(t.pnl)}).filter(isFinite),wins=c.filter(function(t){return t.r>0}),loss=c.filter(function(t){return t.r<0}),be=c.length-wins.length-loss.length;
  var sd=rs.length>1?Math.sqrt(sum(rs.map(function(r){return (r-st.avgR)*(r-st.avgR)}))/(rs.length-1)):NaN;
  var cw=0,cl=0,mw=0,ml=0;rs.forEach(function(r){if(r>0){cw++;cl=0}else{cl++;cw=0}mw=Math.max(mw,cw);ml=Math.max(ml,cl)});
  var byDay={};c.forEach(function(t){var o=byDay[t.date]=byDay[t.date]||{r:0,p:0};o.r+=t.r;var p=n(t.pnl);if(isFinite(p))o.p+=p});var dk=Object.keys(byDay),dR=dk.map(function(k){return byDay[k].r});
  var bestD=dk.slice().sort(function(a,b){return byDay[b].r-byDay[a].r})[0],worstD=dk.slice().sort(function(a,b){return byDay[a].r-byDay[b].r})[0];
  var lg=c.filter(function(t){return t.dir!=='short'}),sh=c.filter(function(t){return t.dir==='short'}),sl=stats(lg),ss=stats(sh);
  var fol=c.filter(function(t){return t.rules===true}),brk=c.filter(function(t){return t.rules===false});
  var fees=sum(c.map(function(t){return n(t.fees)||0})),gross=sum(ps.map(Math.abs))||NaN;
  var mfe=c.filter(function(t){return isFinite(n(t.mfe))&&t.mfe>0}),mfeAvg=avg(mfe.map(function(t){return t.mfe}));
  var bySym=group(list,function(t){return t.symbol||'—'}),syms=bySym.filter(function(g){return g.n>=3});
  var byH=group(list,function(t){return t.time?String(parseInt(t.time,10)):null}).filter(function(g){return g.n>=3});
  var byW=group(list,function(t){return t.date?String(new Date(t.date+'T12:00:00').getDay()):null}).filter(function(g){return g.n>=3});
  var best=function(a,f){return a.length?a.slice().sort(function(x,y){return f(y)-f(x)})[0]:null};
  var kelly=isFinite(st.winRate)&&st.avgWin>0&&st.avgLoss<0?st.winRate-(1-st.winRate)/(st.avgWin/-st.avgLoss):NaN;
  var span=c.length?(new Date(c[c.length-1].date)-new Date(c[0].date))/864e5+1:NaN;
  var ri=c.map(function(t){return n(t.riskPct)}).filter(isFinite);
  var F=function(x,d){return fmt(x,d==null?2:d)},P=function(x){return isFinite(x)?fmt(x*100,1)+'%':'–'},NUM=function(x){return isFinite(x)?String(x):'–'};
  var g=[
   ['Γενικά',[['Συναλλαγές (όλες)',NUM(all.length)],['Κλειστές με R',NUM(st.n)],['Ανοιχτές',NUM(all.filter(function(t){return t.status!=='closed'}).length)],['Κερδισμένες',NUM(wins.length)],['Χαμένες',NUM(loss.length)],['Νεκρές (0R)',NUM(be)],['Ημέρες συναλλαγών',NUM(dk.length)],['Συναλλαγές ανά ημέρα',F(st.n/dk.length,1)],['Διάστημα (ημέρες)',NUM(Math.round(span))]]],
   ['Αποτέλεσμα σε R',[['Επιτυχία',P(st.winRate)],['Μέσο R (expectancy)',fR(st.avgR)],['Διάμεσο R',fR(median(rs))],['Σύνολο R',fR(st.totalR)],['Μέσο κέρδος',fR(st.avgWin)],['Μέση απώλεια',fR(st.avgLoss)],['Μεγαλύτερο κέρδος',fR(Math.max.apply(null,rs.concat([-Infinity])))],['Μεγαλύτερη απώλεια',fR(Math.min.apply(null,rs.concat([Infinity])))],['Τυπική απόκλιση R',F(sd)]]],
   ['Σε χρήμα',[['Καθαρό αποτέλεσμα',fE(sum(ps))],['Μέσο ανά συναλλαγή',fE(avg(ps))],['Μέσο κέρδος',fE(avg(ps.filter(function(x){return x>0})))],['Μέση απώλεια',fE(avg(ps.filter(function(x){return x<0})))],['Μεγαλύτερο κέρδος',fE(Math.max.apply(null,ps.concat([-Infinity])))],['Μεγαλύτερη απώλεια',fE(Math.min.apply(null,ps.concat([Infinity])))],['Απόδοση (R × ρίσκο %)',isFinite(st.totalR)?fmt(st.totalR*rk,2)+'%':'–']]],
   ['Ποιότητα συστήματος',[['Profit factor',isFinite(st.pf)?F(st.pf):'–'],['Payoff (μέσο κέρδος ÷ μέση απώλεια)',st.avgLoss<0?F(st.avgWin/-st.avgLoss):'–'],['Νεκρό σημείο επιτυχίας',st.avgLoss<0&&st.avgWin>0?P(-st.avgLoss/(st.avgWin-st.avgLoss)):'–'],['Sharpe ανά συναλλαγή',isFinite(sd)&&sd>0?F(st.avgR/sd):'–'],['SQN',isFinite(sd)&&sd>0?F(Math.sqrt(Math.min(st.n,100))*st.avgR/sd):'–'],['Recovery factor',st.dd<0?F(st.totalR/-st.dd):'–'],['Kelly (θεωρητικό)',P(kelly)]]],
   ['Σερί και πτώσεις',[['Μέγιστη πτώση',fR(st.dd)],['Μέγιστη πτώση σε %',isFinite(st.dd)?fmt(st.dd*rk,2)+'%':'–'],['Μέγιστο σερί κερδών',NUM(mw)],['Μέγιστο σερί απωλειών',NUM(ml)],['Καλύτερη ημέρα',bestD?dateGr(bestD)+' ('+fR(byDay[bestD].r)+')':'–'],['Χειρότερη ημέρα',worstD?dateGr(worstD)+' ('+fR(byDay[worstD].r)+')':'–'],['Κερδοφόρες ημέρες',dk.length?P(dR.filter(function(r){return r>0}).length/dk.length):'–']]],
   ['Long και short',[['Long: πλήθος',NUM(sl.n)],['Long: επιτυχία',P(sl.winRate)],['Long: μέσο R',fR(sl.avgR)],['Short: πλήθος',NUM(ss.n)],['Short: επιτυχία',P(ss.winRate)],['Short: μέσο R',fR(ss.avgR)]]],
   ['Πειθαρχία',[['Τήρηση κανόνων',fol.length+brk.length?P(fol.length/(fol.length+brk.length)):'–'],['Μέσο R με κανόνες',fR(avg(fol.map(function(t){return t.r})))],['Μέσο R χωρίς κανόνες',fR(avg(brk.map(function(t){return t.r})))],['Πάνω από το όριο ημέρας',NUM(c.filter(function(t){return t.overLimit}).length)],['Με stop',P(c.filter(function(t){return !t._est}).length/c.length)],['Μέσο ρίσκο ανά συναλλαγή',ri.length?fmt(avg(ri),2)+'%':'–'],['Απώλειες πέρα από −1R',NUM(c.filter(function(t){return t.r<-1.1}).length)]]],
   ['Κόστος και εκτέλεση',[['Σύνολο προμηθειών',fmt(fees,2)+' €'],['Προμήθειες ÷ απόλυτο αποτέλεσμα',isFinite(gross)?P(fees/gross):'–'],['Μέση μέγιστη κίνηση υπέρ (MFE)',isFinite(mfeAvg)?fR(mfeAvg):'–'],['Αξιοποίηση κίνησης (μέσο κέρδος ÷ MFE)',isFinite(mfeAvg)&&mfeAvg>0&&isFinite(st.avgWin)?P(st.avgWin/mfeAvg):'–']]],
   ['Πού και πότε',[['Πιο συχνό σύμβολο',bySym[0]?bySym[0].key+' ('+bySym[0].n+')':'–'],['Καλύτερο σύμβολο',(function(b){return b?b.key+' ('+fR(b.avgR)+')':'–'})(best(syms,function(x){return x.avgR}))],['Χειρότερο σύμβολο',(function(b){return b?b.key+' ('+fR(b.avgR)+')':'–'})(best(syms,function(x){return -x.avgR}))],['Καλύτερη ώρα',(function(b){return b?pad2(+b.key)+':00 ('+fR(b.avgR)+')':'–'})(best(byH,function(x){return x.avgR}))],['Χειρότερη ώρα',(function(b){return b?pad2(+b.key)+':00 ('+fR(b.avgR)+')':'–'})(best(byH,function(x){return -x.avgR}))],['Καλύτερη ημέρα εβδομάδας',(function(b){return b?DAYS[+b.key]+' ('+fR(b.avgR)+')':'–'})(best(byW,function(x){return x.avgR}))],['Χειρότερη ημέρα εβδομάδας',(function(b){return b?DAYS[+b.key]+' ('+fR(b.avgR)+')':'–'})(best(byW,function(x){return -x.avgR}))]]]
  ];
  var cnt=0;g.forEach(function(x){cnt+=x[1].length});
  return {html:'<div class="mgrid">'+g.map(function(sec){return '<div class="mcol"><span class="lbl">'+esc(sec[0])+'</span><dl>'+sec[1].map(function(r){return '<dt>'+esc(r[0])+'</dt><dd class="num">'+esc(r[1])+'</dd>'}).join('')+'</dl></div>'}).join('')+'</div>',count:cnt};
}
function ruleStats(list){
  var c=closed(list).filter(function(t){return t.rchk&&t.rchk.length}),m={};
  c.forEach(function(t){t.rchk.forEach(function(x){var k=(t.strategyId||'')+'|'+x.r,o=m[k]=m[k]||{s:t.strategyId,r:x.r,ok:[],no:[]};(x.ok?o.ok:o.no).push(t.r)})});
  var rows=Object.keys(m).map(function(k){return m[k]}).filter(function(o){return o.ok.length+o.no.length>=2}).sort(function(a,b){return (b.ok.length+b.no.length)-(a.ok.length+a.no.length)});
  if(!rows.length)return '<div class="empty">Όταν σημειώνεις στη φόρμα ποιους κανόνες της στρατηγικής τήρησες, εδώ φαίνεται ποιοι κανόνες φέρνουν αποτέλεσμα.</div>';
  var w=function(a){return a.length?a.filter(function(r){return r>0}).length/a.length:NaN};
  return '<table><thead><tr><th>Κανόνας</th><th>Στρατηγική</th><th class="r">Τηρήθηκε</th><th class="r">Επιτυχία</th><th class="r">Μέσο R</th><th class="r">Δεν τηρήθηκε</th><th class="r">Μέσο R</th><th class="r">Διαφορά</th></tr></thead><tbody>'+
    rows.slice(0,30).map(function(o){var d=avg(o.ok)-avg(o.no);return '<tr><td class="rl">'+esc(o.r)+'</td><td class="ud">'+esc(stratName(o.s))+'</td><td class="r num">'+o.ok.length+'</td><td class="r num">'+pct(w(o.ok))+'</td><td class="r num '+cls(avg(o.ok))+'">'+fR(avg(o.ok))+'</td><td class="r num">'+o.no.length+'</td><td class="r num '+cls(avg(o.no))+'">'+fR(avg(o.no))+'</td><td class="r num '+cls(d)+'">'+(isFinite(d)?fR(d):'–')+'</td></tr>'}).join('')+'</tbody></table>';
}
function renderPro(){
  if(!$('#calendar'))return;
  var list=filtered();
  renderCal();
  var M=metrics(list);$('#metrics').innerHTML=M.html;$('#metCount').textContent=M.count;
  $('#bySymbol').innerHTML=table(group(list,function(t){return t.symbol||'—'}).slice(0,15),function(k){return k});
  $('#byHour').innerHTML=table(group(list,function(t){return t.time?pad2(parseInt(t.time,10)):null}).sort(function(a,b){return a.key.localeCompare(b.key)}),function(k){return k+':00'});
  $('#bySession').innerHTML=table(group(list,function(t){return sessionOf(t.time)}).sort(function(a,b){return a.key.localeCompare(b.key)}),function(k){return k.slice(2)});
  $('#byDir').innerHTML=table(group(list,function(t){return t.dir==='short'?'Short':'Long'}),function(k){return k});
  var tl=[];list.forEach(function(t){(t.tags||[]).forEach(function(g){var x=Object.assign({},t);x._tag=g;tl.push(x)})});
  $('#byTag').innerHTML=tl.length?table(group(tl,function(t){return t._tag}).slice(0,20),function(k){return '#'+k}):'<div class="empty">Πρόσθεσε tags στις συναλλαγές (π.χ. a+ setup, ειδήσεις, λάθος είσοδος) για να βλέπεις τι αποδίδει.</div>';
  $('#ruleStats').innerHTML=ruleStats(list);
  renderTagFilter();
}
function renderTagFilter(){var f=$('#f-tag');if(!f)return;var v=S.filter.tag||'all',tg=allTags();
  f.innerHTML='<option value="all">Όλα</option>'+tg.map(function(t){return '<option value="'+esc(t)+'">#'+esc(t)+'</option>'}).join('');f.value=v;if(f.value!==v){f.value='all';S.filter.tag='all'}
  var dl=$('#tagList');if(dl)dl.innerHTML=tg.map(function(t){return '<option value="'+esc(t)+'"></option>'}).join('');}

/* ---------- Monte Carlo ---------- */
function renderMcInfo(){if(!$('#mc-risk').value)$('#mc-risk').value=S.settings.risk}
function doMc(){
  renderMcInfo();
  var rs=closed(advList('mc')).map(function(t){return t.r}),out=$('#mcOut');
  if(rs.length<10){out.innerHTML='<div class="empty">Χρειάζονται τουλάχιστον 10 κλειστές συναλλαγές με αυτά τα φίλτρα.</div>';return}
  var N=Math.max(10,Math.min(1000,Math.round(n($('#mc-n').value)||100))),SIMS=Math.max(200,Math.min(5000,Math.round(n($('#mc-sims').value)||2000))),rk=n($('#mc-risk').value)||1,ruin=n($('#mc-ruin').value)||20,swan=$('#mc-swan').checked;
  var paths=[],finals=[],dds=[],streaks=[],hit=0,seed=12345,rnd=function(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
  var Q=[0.05,0.25,0.5,0.75,0.95],band=Q.map(function(){return new Float64Array(N+1)}),steps=[];for(var s=0;s<=N;s++)steps.push(new Float64Array(SIMS));
  for(var k=0;k<SIMS;k++){var eq=100,pk=100,mdd=0,st=0,ms=0;steps[0][k]=100;
    for(var i=1;i<=N;i++){var r=rs[Math.floor(rnd()*rs.length)];if(swan&&rnd()<0.01)r=-5;eq*=1+r*rk/100;if(eq<0)eq=0;pk=Math.max(pk,eq);mdd=Math.max(mdd,(pk-eq)/pk*100);st=r<=0?st+1:0;ms=Math.max(ms,st);steps[i][k]=eq}
    finals.push(eq-100);dds.push(mdd);streaks.push(ms);if(mdd>=ruin)hit++}
  var qs=function(a,q){var s=Array.prototype.slice.call(a).sort(function(x,y){return x-y});return s[Math.min(s.length-1,Math.floor(q*s.length))]};
  for(var j=0;j<=N;j++)Q.forEach(function(q,qi){band[qi][j]=qs(steps[j],q)});
  var kp='<div class="kpis" style="margin-top:.6rem">'+kpi('Διάμεσο αποτέλεσμα',(qs(finals,0.5)>0?'+':'')+fmt(qs(finals,0.5),1)+'%','μετά από '+N+' συναλλαγές',cls(qs(finals,0.5)))+
    kpi('Κακό σενάριο (5%)',(qs(finals,0.05)>0?'+':'')+fmt(qs(finals,0.05),1)+'%','1 στις 20 φορές χειρότερα',cls(qs(finals,0.05)))+
    kpi('Καλό σενάριο (95%)',(qs(finals,0.95)>0?'+':'')+fmt(qs(finals,0.95),1)+'%','',cls(qs(finals,0.95)))+
    kpi('Διάμεση μέγιστη πτώση',fmt(qs(dds,0.5),1)+'%','',"neg")+
    kpi('Πιθανότητα πτώσης ≥ '+fmt(ruin,0)+'%',fmt(hit/SIMS*100,1)+'%','',hit/SIMS>0.1?'neg':'')+
    kpi('Χειρότερο σερί απωλειών',String(qs(streaks,0.95)),'στο 95% των σεναρίων')+'</div>';
  // fan chart
  var W=720,H=240,L=50,R=12,T=12,B=26,lo=Infinity,hi=-Infinity;band[0].forEach(function(v){lo=Math.min(lo,v)});band[4].forEach(function(v){hi=Math.max(hi,v)});lo=Math.min(lo,100);hi=Math.max(hi,100);
  var step=niceStep(hi-lo);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
  var x=function(i){return L+(W-L-R)*i/N},y=function(v){return T+(H-T-B)*(hi-v)/(hi-lo)},gr='';
  for(var v=lo;v<=hi+1e-9;v+=step)gr+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"></line><text x="'+(L-8)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+(v-100>0?'+':'')+fmt(v-100,0)+'%</text>';
  var area=function(a,b){var p='M'+x(0)+','+y(a[0]);for(var i=1;i<=N;i++)p+=' L'+x(i).toFixed(1)+','+y(a[i]).toFixed(1);for(var i2=N;i2>=0;i2--)p+=' L'+x(i2).toFixed(1)+','+y(b[i2]).toFixed(1);return p+' Z'};
  var line=function(a){var p='';for(var i=0;i<=N;i++)p+=(i?' ':'')+x(i).toFixed(1)+','+y(a[i]).toFixed(1);return p};
  var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Εύρος πιθανών πορειών"><g class="grid">'+gr+'</g><path class="mc1" d="'+area(band[0],band[4])+'"></path><path class="mc2" d="'+area(band[1],band[3])+'"></path><line class="zero" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(100).toFixed(1)+'" y2="'+y(100).toFixed(1)+'"></line><polyline class="eqline" points="'+line(band[2])+'"></polyline><text x="'+L+'" y="'+(H-6)+'">0</text><text x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+N+'</text></svg>';
  var ins=[];
  if(hit/SIMS>0.2)ins.push({lv:'stop',t:'Σε '+fmt(hit/SIMS*100,0)+'% των σεναρίων ο λογαριασμός πέφτει '+fmt(ruin,0)+'% ή περισσότερο. Με αυτό το ρίσκο ανά συναλλαγή ο κίνδυνος είναι μεγάλος: μειώστε το ρίσκο.'});
  else if(hit/SIMS>0.05)ins.push({lv:'warn',t:'Σε '+fmt(hit/SIMS*100,0)+'% των σεναρίων ο λογαριασμός πέφτει '+fmt(ruin,0)+'% ή περισσότερο. Αποδεκτό μόνο αν είστε έτοιμοι για τέτοια πτώση.'});
  else ins.push({lv:'good',t:'Η πιθανότητα πτώσης '+fmt(ruin,0)+'% είναι χαμηλή ('+fmt(hit/SIMS*100,1)+'%) με αυτό το ρίσκο και αυτά τα αποτελέσματα.'});
  if(qs(finals,0.5)<0)ins.push({lv:'stop',t:'Με τα σημερινά αποτελέσματα, το πιθανότερο σενάριο είναι απώλεια. Πρώτα βελτιώστε το σύστημα, μετά αυξήστε ρίσκο ή συχνότητα.'});
  ins.push({lv:'info',t:'Η προσομοίωση ανακατεύει τις '+rs.length+' πραγματικές σας συναλλαγές σε '+SIMS+' τυχαίες σειρές. Δείχνει τι μπορεί να συμβεί μόνο από τύχη, αν το σύστημα μείνει ίδιο.'});
  if(swan)ins.push({lv:'info',t:'Μαύρος κύκνος: σε 1% των συναλλαγών η τιμή πέρασε το stop με κενό και η απώλεια ήταν −5R.'});
  out.innerHTML=kp+'<div class="chart" style="margin-top:.6rem"><span class="lbl">Πιθανές πορείες του λογαριασμού (σκούρο: 25–75%, ανοιχτό: 5–95%)</span>'+svg+'</div>'+insList(ins);
}

/* ---------- export ---------- */
var DL_P=null;
function dlNs(){if(!DL_P){var cl=window.claude&&window.claude.use?window.claude:null;DL_P=cl?cl.use('downloads').catch(function(){return null}):Promise.resolve(null)}return DL_P}
/* ---------- check-in history ---------- */
var CIH={page:0,size:5,sig:''};
function ciColor(u){var h=0;String(u||'').split('').forEach(function(c){h=(h*31+c.charCodeAt(0))%360});return 'hsl('+h+',55%,42%)'}
function renderCiHist(){var box=$('#ciHist');if(!box)return;var sel=$('#ci-who');
  var by={};(S.checkins||[]).forEach(function(c){if(c.by)by[c.by]=1});var opts='<option value="all">Όλα τα μέλη</option>'+Object.keys(by).map(function(u){return '<option value="'+esc(u)+'">'+esc(u===S.uid?'Εγώ ('+name(u)+')':name(u))+'</option>'}).join('');
  if(sel.__o!==opts){var v=sel.value;sel.innerHTML=opts;sel.__o=opts;sel.value=by[v]||v==='all'?v:'all'}
  var who=sel.value,q=norm0($('#ci-q').value);
  var L=(S.checkins||[]).filter(function(c){return (c.plan||c.review||c.mood)&&(who==='all'||c.by===who)&&(!q||norm0([c.mood,c.plan,c.review,name(c.by)].join(' ')).indexOf(q)>=0)}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))});
  var sig=who+'|'+q;if(CIH.sig!==sig){CIH.page=0;CIH.sig=sig}
  var pages=Math.max(1,Math.ceil(L.length/CIH.size));if(CIH.page>=pages)CIH.page=pages-1;var from=CIH.page*CIH.size,P=L.slice(from,from+CIH.size);
  if(!L.length){box.innerHTML='<div class="empty">'+((S.checkins||[]).length?'Κανένα check-in με αυτά τα φίλτρα.':'Δεν υπάρχουν check-in ακόμα. Συμπλήρωσε το «Ημερήσιο check-in» πιο πάνω: πώς νιώθεις, το πλάνο και τον απολογισμό της μέρας.')+'</div>';$('#ciPager').hidden=true;return}
  box.innerHTML=P.map(function(c){var d=c.date?new Date(c.date+'T12:00:00'):null,tr=S.trades.filter(function(t){return t.by===c.by&&t.date===c.date}),cl=closed(tr),r=sum(cl.map(function(t){return t.r})),nm=name(c.by);
    var blk=function(lbl,txt){return '<div><span class="lbl">'+lbl+'</span>'+(txt?'<span class="clamp" title="Πάτα για όλο το κείμενο">'+esc(txt)+'</span>':'<span class="none">δεν γράφτηκε</span>')+'</div>'};
    return '<div class="cih"><div class="cihd">'+(d?'<span>'+esc(DAYS[d.getDay()].slice(0,3))+'</span><b>'+d.getDate()+'</b><span>'+esc(dateGr(c.date).slice(3))+'</span>':'')+'</div><div><div class="cihh"><span class="cihav" style="background:'+ciColor(c.by)+'">'+esc((nm||'?').charAt(0).toUpperCase())+'</span><b>'+esc(c.by===S.uid?'Εγώ':nm)+'</b>'+(c.mood?'<span class="pill">'+esc(c.mood)+'</span>':'')+(tr.length?'<span class="muted">'+tr.length+(tr.length===1?' συναλλαγή':' συναλλαγές')+(cl.length?' · <b class="num '+cls(r)+'">'+fR(r)+'</b>':'')+'</span>':'<span class="muted">χωρίς συναλλαγές</span>')+'</div><div class="cihb">'+blk('Πλάνο',c.plan)+blk('Απολογισμός',c.review)+'</div></div></div>'}).join('');
  var pg=$('#ciPager');pg.hidden=pages<=1;if(pages>1){var b=function(p,l,dis,on){return '<button type="button" class="pgb'+(on?' on':'')+'" data-cip="'+p+'"'+(dis?' disabled':'')+'>'+l+'</button>'},p=CIH.page,h=[];for(var k=Math.max(0,p-2);k<=Math.min(pages-1,p+2);k++)h.push(b(k,String(k+1),false,k===p));
    pg.innerHTML='<span class="muted pginfo">'+(from+1)+'–'+Math.min(L.length,from+CIH.size)+' από '+L.length+'</span><div class="pgnav">'+b(p-1,'‹ Προηγούμενη',p<=0)+(p>2?b(0,'1')+'<span class="pgdots">…</span>':'')+h.join('')+(p<pages-3?'<span class="pgdots">…</span>'+b(pages-1,String(pages)):'')+b(p+1,'Επόμενη ›',p>=pages-1)+'</div>'}}
function norm0(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}
document.addEventListener('click',function(e){var c=e.target.closest('.cihb .clamp');if(c){c.classList.toggle('open');return}var b=e.target.closest('[data-cip]');if(b&&!b.disabled){CIH.page=+b.getAttribute('data-cip');renderCiHist();var cc=$('#ciHistCard');if(cc&&cc.getBoundingClientRect().top<0)cc.scrollIntoView({block:'start',behavior:'smooth'})}});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='ci-who')renderCiHist()});
document.addEventListener('input',function(e){if(e.target&&e.target.id==='ci-q')renderCiHist()});
function saveFile(name,data,type){
  return dlNs().then(function(D){
    if(D)return D.save({filename:name,data:data}).then(function(r){if(r&&r.status==='saved')toast('Το αρχείο αποθηκεύτηκε')});
    var b=new Blob([data],{type:type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000);
  }).catch(function(e){if(e&&e.code==='declined')return;toast('Η εξαγωγή δεν ολοκληρώθηκε.')});
}
function csvCell(v){v=v==null?'':String(v);return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function exportCsv(){
  var list=filtered().slice().sort(sortTime);
  var H=['date','time','trader','account','market','symbol','direction','strategy','timeframe','entry','stop','target','exit','size','fees','r','r_estimated','pnl','risk_pct','rules_followed','emotion','tags','notes'];
  var rows=list.map(function(t){return [t.date,t.time,name(t.by),t.account,t.market,t.symbol,t.dir,stratName(t.strategyId),t.tf,t.entry,t.stop,t.target,t.exit,t.size,t.fees,hasR(t)?t.r:'',t._est?'yes':'',t.pnl,t.riskPct,t.rules===true?'yes':t.rules===false?'no':'',t.emotion,(t.tags||[]).join(' '),t.notes].map(csvCell).join(',')});
  saveFile('trading-journal-'+today()+'.csv','﻿'+H.join(',')+'\n'+rows.join('\n'),'text/csv');
}
function exportReport(){
  var css='body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#111}h1{font-size:22px}h2{font-size:16px;margin-top:22px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}.r{text-align:right}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kpi{border:1px solid #ddd;border-radius:6px;padding:8px}.kpi b{display:block;font-size:18px}.lbl{font-size:11px;text-transform:uppercase;color:#666}.mgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}dl{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin:4px 0}dd{margin:0;text-align:right}.pos{color:#14855c}.neg{color:#c43d3d}svg{max-width:100%;height:auto}svg text{font-size:10px;fill:#666}svg .grid line{stroke:#ddd}svg .eqline{fill:none;stroke:#0f6b5f;stroke-width:2}svg .eqarea{fill:#e3f1ee}.empty{color:#888}';
  var sec=function(t,id){var el=$('#'+id);return el?'<h2>'+esc(t)+'</h2>'+el.innerHTML:''};
  var html='<!doctype html><html lang="'+(LANG_RU()?'ru':'el')+'"><head><meta charset="utf-8"><title>Report '+today()+'</title><style>'+css+'</style></head><body><h1>'+esc(document.querySelector('.brand h1')?document.querySelector('.brand h1').textContent:'Trading journal')+' · '+dateGr(today())+'</h1>'+
    '<div class="kpis">'+$('#kpis').innerHTML+'</div>'+sec(LANG_RU()?'Кривая':'Καμπύλη','equity')+sec(LANG_RU()?'Все метрики':'Όλες οι μετρικές','metrics')+sec(LANG_RU()?'По стратегиям':'Ανά στρατηγική','byStrategy')+sec(LANG_RU()?'По тикерам':'Ανά σύμβολο','bySymbol')+sec(LANG_RU()?'По сессиям':'Ανά session','bySession')+sec(LANG_RU()?'По тегам':'Ανά tag','byTag')+
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>';
  saveFile('trading-report-'+today()+'.html',html,'text/html');
}

/* question bank: [category, manualId, correctIndex, [el: q,o0,o1,o2,o3,expl], [ru: q,o0,o1,o2,o3,expl]] */
var QBANK=[
// ---- risk ----
['risk','possize',1,['Λογαριασμός 2.000 €, ρίσκο 1%. Είσοδος 100, stop 98. Πόσα κομμάτια αγοράζεις;','20','10','5','100','Ρίσκο = 2.000 × 1% = 20 €. Απόσταση stop = 2 €. Ποσότητα = 20 ÷ 2 = 10.'],['Счёт 2 000 €, риск 1%. Вход 100, стоп 98. Сколько штук покупаете?','20','10','5','100','Риск = 2 000 × 1% = 20 €. Расстояние до стопа = 2 €. Объём = 20 ÷ 2 = 10.']],
['risk','breakeven',2,['Με στόχο 2R (κέρδος διπλάσιο από το ρίσκο), ποιο ποσοστό επιτυχίας χρειάζεσαι για να μη χάνεις;','50%','40%','33%','25%','Νεκρό σημείο = 1 ÷ (1 + 2) = 33%. Πάνω από αυτό βγάζεις κέρδος πριν τις προμήθειες.'],['При цели 2R (прибыль вдвое больше риска) какой винрейт нужен, чтобы не терять?','50%','40%','33%','25%','Безубыточность = 1 ÷ (1 + 2) = 33%. Выше этого вы в плюсе до комиссий.']],
['risk','drawdown',3,['Ο λογαριασμός έπεσε 50%. Πόσο πρέπει να ανέβει για να γυρίσει στο αρχικό;','50%','75%','80%','100%','Από 100 πας στα 50. Για να ξαναγίνει 100 χρειάζεται +50 πάνω στα 50, δηλαδή +100%.'],['Счёт упал на 50%. На сколько он должен вырасти, чтобы вернуться к исходному?','50%','75%','80%','100%','Со 100 до 50. Чтобы снова стало 100, нужно +50 к 50, то есть +100%.']],
['risk','expectancy',0,['Επιτυχία 40%, μέσο κέρδος +2R, μέση απώλεια −1R. Ποιο είναι το expectancy;','+0,2R ανά συναλλαγή','−0,2R ανά συναλλαγή','+0,8R ανά συναλλαγή','0R','0,4 × 2 − 0,6 × 1 = 0,8 − 0,6 = +0,2R ανά συναλλαγή.'],['Винрейт 40%, средняя прибыль +2R, средний убыток −1R. Каково матожидание?','+0,2R на сделку','−0,2R на сделку','+0,8R на сделку','0R','0,4 × 2 − 0,6 × 1 = 0,8 − 0,6 = +0,2R на сделку.']],
['risk','streak',1,['Με επιτυχία 50%, σε 100 συναλλαγές πόσο συχνό είναι ένα σερί 6 απωλειών;','Σχεδόν αδύνατο','Αρκετά πιθανό, συμβαίνει συχνά','Συμβαίνει μόνο σε κακές στρατηγικές','Μόνο αν μετακινείς το stop','Σε 100 συναλλαγές με 50% επιτυχία, σερί 6 απωλειών εμφανίζεται πολύ συχνά από καθαρή τύχη. Γι’ αυτό το μικρό ρίσκο ανά συναλλαγή είναι κρίσιμο.'],['При винрейте 50% насколько часто в 100 сделках бывает серия из 6 убытков?','Почти невозможно','Довольно вероятно, бывает часто','Только у плохих стратегий','Только если переносить стоп','В 100 сделках при 50% винрейте серия из 6 убытков часто возникает просто случайно. Поэтому маленький риск на сделку критичен.']],
['risk','leverage',2,['Με μόχλευση 20x σε long, περίπου πόση πτώση της τιμής σε ρευστοποιεί (χωρίς προμήθειες);','20%','10%','5%','1%','Με 20x το περιθώριο είναι 1/20 = 5% της θέσης. Πτώση περίπου 5% (λίγο λιγότερο λόγω maintenance margin) σβήνει το περιθώριο.'],['При плече 20x в long примерно какое падение цены вас ликвидирует (без комиссий)?','20%','10%','5%','1%','При 20x маржа = 1/20 = 5% позиции. Падение около 5% (чуть меньше из-за maintenance margin) обнуляет маржу.']],
['risk','leverage',0,['Η μόχλευση αλλάζει το ρίσκο μιας συναλλαγής αν η ποσότητα και το stop μένουν ίδια;','Όχι, αλλάζει μόνο πόσο κεφάλαιο δεσμεύεις','Ναι, διπλάσια μόχλευση = διπλάσιο ρίσκο','Ναι, μειώνει το ρίσκο','Εξαρτάται από το ανταλλακτήριο','Το ρίσκο = ποσότητα × απόσταση stop. Η μόχλευση αλλάζει μόνο το περιθώριο που δεσμεύεται, και πόσο κοντά είναι η ρευστοποίηση.'],['Меняет ли плечо риск сделки, если объём и стоп те же?','Нет, меняется только объём залога','Да, вдвое больше плечо = вдвое больше риск','Да, снижает риск','Зависит от биржи','Риск = объём × расстояние до стопа. Плечо меняет только залог и то, насколько близко ликвидация.']],
['risk','correlation',3,['Έχεις ανοιχτά long σε BTC, ETH και SOL με 1% ρίσκο το καθένα. Ποιο είναι το πραγματικό σου ρίσκο;','1%, είναι διαφορετικά νομίσματα','0,33% το καθένα','Ακριβώς 1,5%','Κοντά στο 3%, γιατί κινούνται μαζί','Τα μεγάλα κρυπτονομίσματα έχουν υψηλή συσχέτιση. Σε μια πτώση της αγοράς χτυπούν όλα τα stop μαζί.'],['У вас открыты long по BTC, ETH и SOL с риском 1% каждый. Каков реальный риск?','1%, это разные монеты','0,33% каждый','Ровно 1,5%','Около 3%, они движутся вместе','Крупные криптовалюты сильно коррелируют. При падении рынка срабатывают все стопы сразу.']],
['risk','breakers',1,['Ποιος είναι ο σκοπός του ορίου απώλειας ημέρας (π.χ. −2R);','Να κερδίζεις περισσότερα','Να σταματάς πριν οι αποφάσεις χειροτερέψουν από την πίεση','Να το απαιτεί το ανταλλακτήριο','Να αυξάνεις τη μόχλευση','Μετά από απώλειες αυξάνονται τα συναισθηματικά λάθη (εκδίκηση, FOMO). Το όριο κόβει το σπιράλ πριν γίνει ζημιά.'],['Зачем нужен дневной лимит убытка (например −2R)?','Чтобы больше зарабатывать','Чтобы остановиться до того, как решения ухудшатся от давления','Этого требует биржа','Чтобы повышать плечо','После убытков растут эмоциональные ошибки (месть, FOMO). Лимит обрывает спираль до серьёзного ущерба.']],
['risk','costs',2,['Τι είναι το slippage;','Η προμήθεια του ανταλλακτηρίου','Η διαφορά bid και ask','Η διαφορά ανάμεσα στην τιμή που ήθελες και στην τιμή που εκτελέστηκες','Ο τόκος της μόχλευσης','Slippage είναι η απόκλιση της τιμής εκτέλεσης από την αναμενόμενη, συνήθως σε γρήγορες αγορές ή χαμηλή ρευστότητα.'],['Что такое проскальзывание (slippage)?','Комиссия биржи','Разница bid и ask','Разница между желаемой ценой и ценой исполнения','Процент за плечо','Проскальзывание — отклонение цены исполнения от ожидаемой, обычно на быстром рынке или при низкой ликвидности.']],
['risk','expectancy',3,['Μια συναλλαγή με ρίσκο 50 € έκλεισε με +125 €. Πόσα R είναι;','+1,25R','+0,4R','+125R','+2,5R','R = αποτέλεσμα ÷ ρίσκο = 125 ÷ 50 = +2,5R.'],['Сделка с риском 50 € закрылась на +125 €. Сколько это R?','+1,25R','+0,4R','+125R','+2,5R','R = результат ÷ риск = 125 ÷ 50 = +2,5R.']],
['risk','possize',0,['Θες ρίσκο 1% σε λογαριασμό 10.000 €. Ποιο stop είναι σωστό;','Αυτό που βγαίνει από το γράφημα, και μετά προσαρμόζεις την ποσότητα','Πάντα 1% κάτω από την είσοδο','Πάντα 100 € κάτω από την είσοδο','Όσο πιο μακριά τόσο καλύτερα','Πρώτα το γράφημα λέει πού ακυρώνεται η ιδέα (stop). Μετά η ποσότητα υπολογίζεται ώστε η απόσταση να κοστίζει 1%.'],['Нужен риск 1% на счёте 10 000 €. Какой стоп правильный?','Тот, что даёт график, а потом подбираете объём','Всегда 1% ниже входа','Всегда 100 € ниже входа','Чем дальше, тем лучше','Сначала график показывает, где идея отменяется (стоп). Затем объём подбирается так, чтобы это расстояние стоило 1%.']],
// ---- candles ----
['cdl','engulfing',1,['Τι είναι το ανοδικό engulfing;','Μικρό κερί μέσα στο προηγούμενο','Πράσινο κερί που το σώμα του καλύπτει όλο το σώμα του προηγούμενου κόκκινου','Κερί με μεγάλη πάνω σκιά','Τρία πράσινα κεριά στη σειρά','Το πράσινο σώμα «καταπίνει» το κόκκινο: οι αγοραστές πήραν τον έλεγχο. Μετράει κυρίως σε στήριξη μετά από πτώση.'],['Что такое бычье поглощение (engulfing)?','Маленькая свеча внутри предыдущей','Зелёная свеча, тело которой полностью перекрывает тело предыдущей красной','Свеча с длинной верхней тенью','Три зелёные свечи подряд','Зелёное тело «поглощает» красное: покупатели взяли контроль. Важно в основном у поддержки после падения.']],
['cdl','hammer',0,['Πώς μοιάζει το σφυρί (hammer);','Μικρό σώμα πάνω, μακριά κάτω σκιά','Μικρό σώμα κάτω, μακριά πάνω σκιά','Χωρίς σκιές','Ίδιο άνοιγμα και κλείσιμο, μακριές σκιές και από τις δύο πλευρές','Η μακριά κάτω σκιά δείχνει ότι οι πωλητές έριξαν την τιμή αλλά οι αγοραστές την ανέβασαν ξανά. Δυνατό μετά από πτώση σε στήριξη.'],['Как выглядит молот (hammer)?','Маленькое тело вверху, длинная нижняя тень','Маленькое тело внизу, длинная верхняя тень','Без теней','Открытие равно закрытию, длинные тени с обеих сторон','Длинная нижняя тень показывает, что продавцы уронили цену, а покупатели вернули её. Сильно после падения у поддержки.']],
['cdl','doji',2,['Τι δείχνει ένα doji;','Ισχυρή άνοδο','Ισχυρή πτώση','Αναποφασιστικότητα: άνοιγμα και κλείσιμο σχεδόν ίδια','Ότι η αγορά έκλεισε','Στο doji αγοραστές και πωλητές ισορρόπησαν. Μόνο του δεν είναι σήμα, θέλει επιβεβαίωση από το επόμενο κερί και το σημείο που εμφανίζεται.'],['Что показывает доджи?','Сильный рост','Сильное падение','Нерешительность: открытие и закрытие почти равны','Что рынок закрыт','В доджи покупатели и продавцы уравновесились. Сам по себе не сигнал: нужно подтверждение следующей свечой и место появления.']],
['cdl','shootingstar',3,['Πού έχει νόημα το πεφταστέρι (shooting star);','Σε πυθμένα μετά από πτώση','Στη μέση ενός range','Οπουδήποτε','Σε κορυφή μετά από άνοδο, κοντά σε αντίσταση','Η μακριά πάνω σκιά σε αντίσταση δείχνει ότι η άνοδος απορρίφθηκε. Μετά από άνοδο είναι προειδοποίηση για πτώση.'],['Где имеет смысл падающая звезда (shooting star)?','На дне после падения','В середине диапазона','Где угодно','На вершине после роста, у сопротивления','Длинная верхняя тень у сопротивления показывает, что рост отвергнут. После роста — предупреждение о падении.']],
['cdl','star',0,['Από πόσα κεριά αποτελείται το πρωινό αστέρι (morning star);','Τρία','Ένα','Δύο','Πέντε','Μεγάλο κόκκινο, μικρό κερί (αναποφασιστικότητα), μεγάλο πράσινο που κλείνει πάνω από τη μέση του πρώτου.'],['Из скольких свечей состоит утренняя звезда (morning star)?','Трёх','Одной','Двух','Пяти','Большая красная, маленькая свеча (нерешительность), большая зелёная, закрывающаяся выше середины первой.']],
['cdl','insidebar',1,['Τι είναι το inside bar;','Κερί που ανοίγει με gap','Κερί που το υψηλό και το χαμηλό του είναι μέσα στο προηγούμενο κερί','Κερί χωρίς σώμα','Το τελευταίο κερί της ημέρας','Το inside bar δείχνει συμπίεση. Το σπάσιμο του κεριού-μητέρας (υψηλό ή χαμηλό) δίνει την κατεύθυνση.'],['Что такое inside bar?','Свеча, открывшаяся с гэпом','Свеча, максимум и минимум которой внутри предыдущей свечи','Свеча без тела','Последняя свеча дня','Inside bar показывает сжатие. Пробой материнской свечи (максимума или минимума) задаёт направление.']],
['cdl','marubozu',2,['Τι χαρακτηρίζει το marubozu;','Πολύ μακριές σκιές','Σώμα ίσο με μηδέν','Μεγάλο σώμα χωρίς (ή σχεδόν χωρίς) σκιές','Δύο ίδια κεριά','Άνοιγμα στο ένα άκρο, κλείσιμο στο άλλο: η μία πλευρά κυριάρχησε όλο το κερί.'],['Чем характерен марубозу?','Очень длинными тенями','Нулевым телом','Большим телом без (или почти без) теней','Двумя одинаковыми свечами','Открытие на одном краю, закрытие на другом: одна сторона доминировала всю свечу.']],
['cdl','crows',3,['Τα «τρία μαύρα κοράκια» είναι σήμα…','ανόδου','αναποφασιστικότητας','εκρηκτικού όγκου','πτώσης: τρία συνεχόμενα μεγάλα κόκκινα κεριά μετά από άνοδο','Τρία δυνατά κόκκινα κεριά με χαμηλότερα κλεισίματα μετά από άνοδο δείχνουν ότι οι πωλητές πήραν τον έλεγχο.'],['«Три чёрные вороны» — это сигнал…','роста','нерешительности','взрывного объёма','падения: три подряд больших красных свечи после роста','Три сильные красные свечи с более низкими закрытиями после роста — продавцы взяли контроль.']],
['cdl','tweezer',0,['Τι είναι το tweezer bottom;','Δύο κεριά με σχεδόν ίδιο χαμηλό σε στήριξη','Δύο κεριά με ίδιο σώμα','Gap προς τα κάτω','Κερί που κλείνει στο χαμηλό','Δύο αποτυχημένες προσπάθειες να σπάσει το ίδιο χαμηλό: η στήριξη κρατάει.'],['Что такое tweezer bottom?','Две свечи с почти одинаковым минимумом у поддержки','Две свечи с одинаковым телом','Гэп вниз','Свеча, закрытая на минимуме','Две неудачные попытки пробить один минимум: поддержка держит.']],
['cdl','candle',1,['Τι δείχνει η σκιά (φυτίλι) ενός κεριού;','Τον όγκο','Τις τιμές που επισκέφθηκε η αγορά αλλά απέρριψε μέχρι το κλείσιμο','Το spread','Την ώρα','Οι σκιές είναι το εύρος πέρα από το σώμα: εκεί πήγε η τιμή αλλά δεν έμεινε μέχρι το κλείσιμο.'],['Что показывает тень (фитиль) свечи?','Объём','Цены, которые рынок посетил, но отверг к закрытию','Спред','Время','Тени — диапазон за пределами тела: туда цена ходила, но не удержалась к закрытию.']],
['cdl','hangingman',2,['Ο κρεμασμένος (hanging man) μοιάζει με σφυρί. Τι τον διαφοροποιεί;','Το χρώμα','Το μέγεθος','Εμφανίζεται μετά από άνοδο, ως προειδοποίηση πτώσης','Έχει μακριά πάνω σκιά','Ίδιο σχήμα με το σφυρί, αλλά σε κορυφή. Το πλαίσιο (πού εμφανίζεται) αλλάζει τη σημασία.'],['Повешенный (hanging man) похож на молот. Чем отличается?','Цветом','Размером','Появляется после роста как предупреждение о падении','Имеет длинную верхнюю тень','Та же форма, что у молота, но на вершине. Контекст (где появляется) меняет смысл.']],
// ---- chart patterns ----
['pat','hs',0,['Πού μπαίνει συνήθως ο στόχος μετά το σπάσιμο σε ώμους-κεφαλή-ώμους;','Απόσταση κεφαλής–λαιμού, προβαλλόμενη από το σημείο σπασίματος','Στον αριστερό ώμο','Στο διπλάσιο της κεφαλής','Δεν υπάρχει στόχος','Measured move: το ύψος από την κεφαλή μέχρι τη γραμμή λαιμού προβάλλεται προς τα κάτω από το σπάσιμο.'],['Где обычно ставят цель после пробоя «голова и плечи»?','Расстояние голова–шея, отложенное от точки пробоя','На левом плече','На двойной высоте головы','Цели нет','Measured move: высота от головы до линии шеи откладывается вниз от пробоя.']],
['pat','double',1,['Πότε επιβεβαιώνεται ο διπλός πυθμένας (double bottom);','Μόλις ακουμπήσει δεύτερη φορά το χαμηλό','Όταν η τιμή κλείσει πάνω από την κορυφή ανάμεσα στους δύο πυθμένες','Όταν ο όγκος πέσει','Μετά από 10 κεριά','Χωρίς σπάσιμο της ενδιάμεσης κορυφής (neckline) είναι απλώς ένα range.'],['Когда подтверждается двойное дно?','Как только второй раз коснулась минимума','Когда цена закрылась выше вершины между двумя днами','Когда падает объём','Через 10 свечей','Без пробоя промежуточной вершины (линии шеи) это просто диапазон.']],
['pat','asctri',2,['Το ανοδικό τρίγωνο έχει…','πτωτικά υψηλά και επίπεδο χαμηλό','δύο επίπεδες γραμμές','επίπεδη αντίσταση και ανοδικά χαμηλά','πτωτικά χαμηλά','Οι αγοραστές πληρώνουν όλο και ακριβότερα ενώ η αντίσταση μένει ίδια. Συχνά σπάει προς τα πάνω.'],['У восходящего треугольника…','нисходящие максимумы и ровный минимум','две горизонтальные линии','ровное сопротивление и растущие минимумы','падающие минимумы','Покупатели платят всё дороже, а сопротивление то же. Часто пробивается вверх.']],
['pat','flag',3,['Μια ανοδική σημαία (bull flag) είναι…','σχηματισμός αντιστροφής','πάντα πτωτική','ένα κερί','μικρή διόρθωση μετά από απότομη άνοδο (κοντάρι), που συνεχίζει προς τα πάνω','Σχηματισμός συνέχειας: το κοντάρι είναι η ορμή, η σημαία η ανάσα. Στόχος συχνά το ύψος του κονταριού.'],['Бычий флаг — это…','разворотная фигура','всегда медвежий','одна свеча','небольшая коррекция после резкого роста (флагшток), которая продолжается вверх','Фигура продолжения: флагшток — импульс, флаг — передышка. Цель часто равна высоте флагштока.']],
['pat','wedge',0,['Μια ανοδική σφήνα (rising wedge) μετά από άνοδο συνήθως…','σπάει προς τα κάτω','σπάει προς τα πάνω','δεν σημαίνει τίποτα','δείχνει gap','Τα υψηλά ανεβαίνουν όλο και πιο αργά από τα χαμηλά: η ορμή εξαντλείται. Συχνά σπάει πτωτικά.'],['Восходящий клин после роста обычно…','пробивается вниз','пробивается вверх','ничего не значит','показывает гэп','Максимумы растут медленнее минимумов: импульс выдыхается. Часто пробивается вниз.']],
['pat','cup',1,['Τι είναι η «λαβή» στο κύπελλο με λαβή;','Το κάτω μέρος του κυπέλλου','Μικρή διόρθωση στη δεξιά πλευρά πριν το σπάσιμο','Ένα gap','Ο όγκος','Μετά τον στρογγυλό πυθμένα η τιμή κάνει μικρή ανάσα (λαβή). Το σπάσιμο της αντίστασης της λαβής είναι η είσοδος.'],['Что такое «ручка» в «чашке с ручкой»?','Дно чашки','Небольшая коррекция справа перед пробоем','Гэп','Объём','После округлого дна цена делает небольшую паузу (ручку). Пробой сопротивления ручки — вход.']],
['pat','range',2,['Σε ένα range (ορθογώνιο), πού είναι η πιο λογική είσοδος long;','Στη μέση','Στην αντίσταση','Κοντά στη στήριξη, με stop λίγο κάτω από αυτή','Οπουδήποτε','Στο range αγοράζεις κοντά στο κάτω όριο με μικρό stop, και στόχος είναι το πάνω όριο. Στη μέση το ρίσκο:κέρδος είναι κακό.'],['Где в диапазоне (прямоугольнике) самый логичный вход в long?','В середине','У сопротивления','Возле поддержки со стопом чуть ниже','Где угодно','В диапазоне покупают у нижней границы с коротким стопом, цель — верхняя граница. В середине соотношение риск/прибыль плохое.']],
['pat','gaps',3,['Τι είναι το gap σε ένα γράφημα;','Ένα κερί με μεγάλο σώμα','Μια γραμμή τάσης','Ένας δείκτης','Κενό ανάμεσα στο κλείσιμο ενός κεριού και το άνοιγμα του επόμενου, χωρίς συναλλαγές','Στις μετοχές τα gaps γίνονται συχνά στο άνοιγμα μετά από νέα. Στα crypto (24/7) σπανίζουν, εκτός από CME futures.'],['Что такое гэп на графике?','Свеча с большим телом','Линия тренда','Индикатор','Разрыв между закрытием одной свечи и открытием следующей без сделок','В акциях гэпы часто на открытии после новостей. В крипте (24/7) редки, кроме фьючерсов CME.']],
['pat','desctri',0,['Το πτωτικό τρίγωνο έχει…','επίπεδη στήριξη και πτωτικά υψηλά','επίπεδη αντίσταση και ανοδικά χαμηλά','δύο ανοδικές γραμμές','κανένα όριο','Οι πωλητές πουλάνε όλο και φθηνότερα πάνω σε μια στήριξη. Συχνά σπάει προς τα κάτω.'],['У нисходящего треугольника…','ровная поддержка и падающие максимумы','ровное сопротивление и растущие минимумы','две восходящие линии','нет границ','Продавцы продают всё дешевле над поддержкой. Часто пробивается вниз.']],
['pat','channelpat',1,['Σε ανοδικό κανάλι, το πιο ασφαλές long είναι…','στο πάνω όριο','κοντά στο κάτω όριο του καναλιού','μετά από σπάσιμο προς τα κάτω','ποτέ','Αγοράζεις προς την κατεύθυνση του καναλιού στο κάτω όριο. Σπάσιμο του κάτω ορίου ακυρώνει το κανάλι.'],['В восходящем канале самый безопасный long…','у верхней границы','возле нижней границы канала','после пробоя вниз','никогда','Покупают по направлению канала у нижней границы. Пробой нижней границы отменяет канал.']],
['pat','island',2,['Η «αναστροφή νησιού» (island reversal) σχηματίζεται από…','τρία ίδια κεριά','ένα doji','ομάδα κεριών απομονωμένη ανάμεσα σε δύο gaps αντίθετης φοράς','ένα κανάλι','Gap προς τα πάνω, λίγα κεριά, και μετά gap προς τα κάτω: η τιμή μένει «νησί». Ισχυρό σήμα αντιστροφής.'],['Разворот «остров» (island reversal) образуется…','тремя одинаковыми свечами','одной доджи','группой свечей, изолированной двумя гэпами в противоположные стороны','каналом','Гэп вверх, несколько свечей, затем гэп вниз: цена остаётся «островом». Сильный сигнал разворота.']],
// ---- indicators ----
['ind','rsi',0,['Τι σημαίνει παραδοσιακά RSI πάνω από 70;','Υπεραγορασμένη αγορά, αλλά σε δυνατή τάση μπορεί να μείνει εκεί πολύ','Σίγουρη πτώση','Υπερπουλημένη αγορά','Χαμηλός όγκος','Σε δυνατή ανοδική τάση το RSI μένει πάνω από 70 για καιρό. Μόνο του δεν είναι σήμα short.'],['Что традиционно означает RSI выше 70?','Перекупленность, но в сильном тренде может держаться там долго','Гарантированное падение','Перепроданность','Низкий объём','В сильном восходящем тренде RSI долго держится выше 70. Сам по себе это не сигнал на short.']],
['ind','ma',1,['Ποια είναι η διαφορά EMA και SMA;','Καμία','Ο EMA δίνει μεγαλύτερο βάρος στις πρόσφατες τιμές, άρα αντιδρά γρηγορότερα','Ο SMA είναι πάντα πιο πάνω','Ο EMA μετράει όγκο','Ο εκθετικός μέσος (EMA) ζυγίζει περισσότερο τα τελευταία κεριά, ο απλός (SMA) τα ζυγίζει όλα ίδια.'],['Чем отличаются EMA и SMA?','Ничем','EMA придаёт больший вес последним ценам и реагирует быстрее','SMA всегда выше','EMA учитывает объём','Экспоненциальная средняя (EMA) сильнее взвешивает последние свечи, простая (SMA) — все одинаково.']],
['ind','macross',2,['Τι είναι το «golden cross»;','Το RSI περνάει το 50','Η τιμή κάνει νέο υψηλό','Ο MA 50 περνάει πάνω από τον MA 200','Ο MACD γίνεται αρνητικός','Ο γρήγορος μέσος (50) περνάει τον αργό (200) προς τα πάνω: σημάδι μακροπρόθεσμης ανοδικής τάσης, αλλά καθυστερημένο.'],['Что такое «золотой крест»?','RSI пересекает 50','Цена делает новый максимум','MA 50 пересекает MA 200 снизу вверх','MACD становится отрицательным','Быстрая средняя (50) пересекает медленную (200) вверх: признак долгосрочного восходящего тренда, но запаздывающий.']],
['ind','macd',3,['Από τι αποτελείται η γραμμή MACD;','RSI μείον 50','Όγκος επί τιμή','Δύο SMA των 200','EMA 12 μείον EMA 26','MACD = EMA 12 − EMA 26. Η γραμμή σήματος είναι EMA 9 του MACD, και το ιστόγραμμα η διαφορά τους.'],['Из чего состоит линия MACD?','RSI минус 50','Объём на цену','Две SMA 200','EMA 12 минус EMA 26','MACD = EMA 12 − EMA 26. Сигнальная линия — EMA 9 от MACD, гистограмма — их разница.']],
['ind','bb',0,['Τι δείχνει η «συμπίεση» (squeeze) των Bollinger Bands;','Χαμηλή μεταβλητότητα που συχνά προηγείται μεγάλης κίνησης','Σίγουρη άνοδο','Ότι η αγορά έκλεισε','Υψηλή μεταβλητότητα','Οι ζώνες στενεύουν όταν η αγορά ηρεμεί. Η ηρεμία συνήθως τελειώνει με έντονη κίνηση, χωρίς να ξέρουμε την κατεύθυνση.'],['Что показывает сжатие (squeeze) полос Боллинджера?','Низкую волатильность, которая часто предшествует сильному движению','Гарантированный рост','Что рынок закрыт','Высокую волатильность','Полосы сужаются, когда рынок затихает. Затишье обычно заканчивается резким движением, направление заранее неизвестно.']],
['ind','atr',1,['Τι μετράει το ATR;','Την κατεύθυνση της τάσης','Τη μέση μεταβλητότητα (εύρος) ανά κερί','Τον όγκο','Την υπεραγορά','Το ATR δείχνει πόσο κινείται η τιμή κατά μέσο όρο ανά κερί. Χρήσιμο για stop (π.χ. 1,5 ATR) και ποσότητα.'],['Что измеряет ATR?','Направление тренда','Среднюю волатильность (диапазон) на свечу','Объём','Перекупленность','ATR показывает, насколько в среднем движется цена за свечу. Полезен для стопа (например 1,5 ATR) и объёма.']],
['ind','adx',2,['Τι σημαίνει ADX κάτω από 20;','Δυνατή ανοδική τάση','Δυνατή πτωτική τάση','Αδύναμη ή καθόλου τάση: καλύτερα στρατηγικές range','Υπερπουλημένη αγορά','Το ADX μετράει τη δύναμη της τάσης, όχι την κατεύθυνση. Κάτω από 20 η αγορά είναι πλάγια.'],['Что означает ADX ниже 20?','Сильный восходящий тренд','Сильный нисходящий тренд','Слабый тренд или его нет: лучше стратегии для боковика','Перепроданность','ADX измеряет силу тренда, а не направление. Ниже 20 рынок в боковике.']],
['ind','vwap',3,['Τι είναι το VWAP;','Ένας απλός μέσος 20','Ο μέσος του RSI','Η τιμή ανοίγματος','Η μέση τιμή της ημέρας σταθμισμένη με τον όγκο','Το VWAP δείχνει τη «δίκαιη» μέση τιμή της ημέρας. Οι θεσμικοί το χρησιμοποιούν ως σημείο αναφοράς για την εκτέλεση.'],['Что такое VWAP?','Простая средняя 20','Среднее RSI','Цена открытия','Средняя цена дня, взвешенная по объёму','VWAP показывает «справедливую» среднюю цену дня. Институционалы используют её как ориентир исполнения.']],
['ind','divergence',0,['Τι είναι η πτωτική απόκλιση (bearish divergence);','Η τιμή κάνει υψηλότερο υψηλό αλλά το RSI χαμηλότερο υψηλό','Η τιμή πέφτει και το RSI πέφτει','Ο όγκος ανεβαίνει','Η τιμή κάνει χαμηλότερο χαμηλό και το RSI υψηλότερο χαμηλό','Νέο υψηλό με λιγότερη ορμή: η άνοδος εξασθενεί. Θέλει επιβεβαίωση, δεν είναι μόνη της σήμα.'],['Что такое медвежья дивергенция?','Цена делает более высокий максимум, а RSI — более низкий','Цена падает и RSI падает','Объём растёт','Цена делает более низкий минимум, а RSI — более высокий','Новый максимум с меньшим импульсом: рост слабеет. Нужно подтверждение, сама по себе не сигнал.']],
['ind','fib',1,['Ποια επίπεδα Fibonacci retracement παρακολουθούνται περισσότερο;','10% και 90%','38,2%, 50% και 61,8%','25% και 75%','100% και 200%','Το 61,8% (και η ζώνη 61,8–78,6%, «OTE») είναι τα πιο δημοφιλή σημεία επιστροφής σε τάση.'],['Какие уровни коррекции Фибоначчи отслеживают чаще всего?','10% и 90%','38,2%, 50% и 61,8%','25% и 75%','100% и 200%','61,8% (и зона 61,8–78,6%, «OTE») — самые популярные точки отката в тренде.']],
['ind','obv',2,['Τι κάνει το OBV (On-Balance Volume);','Μετράει το spread','Δείχνει την τάση','Προσθέτει τον όγκο στις ανοδικές μέρες και τον αφαιρεί στις πτωτικές','Μετράει το funding','Αν το OBV ανεβαίνει ενώ η τιμή μένει πλάγια, μπορεί να γίνεται συσσώρευση.'],['Что делает OBV (On-Balance Volume)?','Измеряет спред','Показывает тренд','Прибавляет объём в дни роста и вычитает в дни падения','Измеряет funding','Если OBV растёт, а цена стоит на месте, возможно накопление.']],
['ind','ichimoku',3,['Στο Ichimoku, τιμή πάνω από το σύννεφο (Kumo) σημαίνει…','πτωτική τάση','καμία πληροφορία','υπερπώληση','ανοδική τάση','Πάνω από το σύννεφο: ανοδική τάση. Κάτω: πτωτική. Μέσα: ουδέτερη ζώνη.'],['В Ишимоку цена выше облака (Kumo) означает…','нисходящий тренд','ничего','перепроданность','восходящий тренд','Выше облака — восходящий тренд. Ниже — нисходящий. Внутри — нейтральная зона.']],
['ind','stoch',0,['Ο Stochastic συγκρίνει…','το κλείσιμο με το εύρος υψηλού–χαμηλού των τελευταίων N κεριών','τον όγκο με την τιμή','δύο μέσους όρους','το funding με την τιμή','Τιμές κοντά στο 100 σημαίνουν κλείσιμο κοντά στο υψηλό του εύρους, κοντά στο 0 κοντά στο χαμηλό.'],['Стохастик сравнивает…','закрытие с диапазоном максимум–минимум последних N свечей','объём с ценой','две средние','funding с ценой','Значения около 100 — закрытие у максимума диапазона, около 0 — у минимума.']],
['ind','supertrend',1,['Τι δείχνει το Supertrend όταν είναι κάτω από την τιμή (πράσινο);','Πτωτική τάση','Ανοδική τάση, και λειτουργεί σαν κινητό stop','Υπεραγορά','Χαμηλό όγκο','Το Supertrend βασίζεται στο ATR. Όσο η τιμή μένει πάνω του, η τάση θεωρείται ανοδική.'],['Что показывает Supertrend, когда он под ценой (зелёный)?','Нисходящий тренд','Восходящий тренд, работает как трейлинг-стоп','Перекупленность','Низкий объём','Supertrend основан на ATR. Пока цена выше него, тренд считается восходящим.']],
// ---- strategies ----
['str','s-pullback',0,['Στη στρατηγική «Pullback στον EMA 20», ποια είναι η βασική προϋπόθεση;','Υπάρχει ήδη τάση (π.χ. τιμή πάνω από EMA 50 με ανοδική κλίση)','RSI κάτω από 20','Αγορά χωρίς τάση','Μεγάλη είδηση','Αγοράζεις την «ανάσα» μιας υπάρχουσας τάσης. Χωρίς τάση ο EMA 20 δεν λειτουργεί ως στήριξη.'],['В стратегии «Откат к EMA 20» каково главное условие?','Уже есть тренд (например цена выше растущей EMA 50)','RSI ниже 20','Рынок без тренда','Крупная новость','Покупают «передышку» существующего тренда. Без тренда EMA 20 не работает как поддержка.']],
['str','s-breakout',1,['Τι επιβεβαιώνει καλύτερα ένα breakout;','Μικρός όγκος','Κλείσιμο κεριού πάνω από το επίπεδο με αυξημένο όγκο','Μια σκιά πάνω από το επίπεδο','Δείκτης RSI 50','Η σκιά μόνο συχνά είναι ψευδοσπάσιμο. Το κλείσιμο με όγκο δείχνει πραγματική συμμετοχή.'],['Что лучше всего подтверждает пробой?','Малый объём','Закрытие свечи выше уровня с повышенным объёмом','Тень выше уровня','RSI на 50','Одна тень часто ложный пробой. Закрытие с объёмом показывает реальное участие.']],
['str','s-retest',2,['Στο «break & retest», πότε μπαίνεις;','Πριν το σπάσιμο','Στο πρώτο κερί του σπασίματος','Όταν η τιμή επιστρέψει στο σπασμένο επίπεδο και αυτό κρατήσει ως στήριξη','Μετά από 50 κεριά','Η πρώην αντίσταση γίνεται στήριξη. Η είσοδος στο retest δίνει πιο κοντινό stop και καλύτερο R:R.'],['В «пробой и ретест» когда входить?','До пробоя','На первой свече пробоя','Когда цена вернётся к пробитому уровню и он удержится как поддержка','Через 50 свечей','Бывшее сопротивление становится поддержкой. Вход на ретесте даёт короткий стоп и лучшее R:R.']],
['str','s-range',3,['Πότε ΔΕΝ πρέπει να παίζεις αντιστροφή σε range;','Όταν το ADX είναι χαμηλό','Όταν η τιμή είναι στα όρια','Όταν το range είναι καθαρό','Όταν η αγορά ξεκινά δυνατή τάση (ADX ανεβαίνει, σπασίματα με όγκο)','Οι στρατηγικές range χάνουν σε τάσεις: κάθε «κορυφή» γίνεται σπάσιμο.'],['Когда НЕ стоит играть разворот в диапазоне?','Когда ADX низкий','Когда цена у границ','Когда диапазон чёткий','Когда начинается сильный тренд (ADX растёт, пробои с объёмом)','Стратегии диапазона проигрывают в трендах: каждая «вершина» становится пробоем.']],
['str','s-orb',0,['Τι είναι το Opening Range Breakout;','Είσοδος στο σπάσιμο του εύρους των πρώτων λεπτών της συνεδρίασης','Αγορά στο κλείσιμο','Short σε κάθε gap','Αγορά με DCA','Ορίζεις το υψηλό/χαμηλό των πρώτων π.χ. 15–30 λεπτών και παίζεις το σπάσιμό του. Κλασικό στις μετοχές ΗΠΑ.'],['Что такое Opening Range Breakout?','Вход на пробое диапазона первых минут сессии','Покупка на закрытии','Short на каждом гэпе','Покупка через DCA','Отмечают максимум/минимум первых, например, 15–30 минут и торгуют его пробой. Классика для акций США.']],
['str','s-dca',1,['Τι είναι το DCA;','Μόχλευση 10x','Αγορές σταθερού ποσού σε τακτά διαστήματα, ανεξάρτητα από την τιμή','Scalping','Short selling','Το Dollar Cost Averaging μειώνει το ρίσκο κακού χρονισμού. Ταιριάζει σε μακροπρόθεσμη επένδυση, όχι σε trading.'],['Что такое DCA?','Плечо 10x','Покупки на фиксированную сумму через равные промежутки, независимо от цены','Скальпинг','Шорт','Dollar Cost Averaging снижает риск неудачного тайминга. Подходит для долгосрочных инвестиций, не для трейдинга.']],
['str','s-donchian',2,['Πώς βγαίνεις συνήθως στο Donchian breakout (τύπου turtle);','Σε σταθερό στόχο 2R','Μετά από 1 ημέρα','Όταν η τιμή σπάσει το χαμηλό των τελευταίων 10 κεριών (για long)','Ποτέ','Οι trend followers αφήνουν τα κέρδη να τρέξουν και βγαίνουν μόνο όταν η τάση σπάσει. Λίγες μεγάλες νίκες, πολλές μικρές απώλειες.'],['Как обычно выходят в пробое Дончиана (как «черепахи»)?','По фиксированной цели 2R','Через 1 день','Когда цена пробьёт минимум последних 10 свечей (для long)','Никогда','Трендовики дают прибыли бежать и выходят только при сломе тренда. Мало больших побед, много мелких убытков.']],
['str','s-squeeze',3,['Στο Bollinger squeeze, πού μπαίνει συνήθως το stop;','Στο υψηλό της ημέρας','Πολύ μακριά','Δεν βάζουμε stop','Στη μέση ζώνη (SMA 20) ή στην άλλη πλευρά της συμπίεσης','Αν η τιμή γυρίσει μέσα στη συμπίεση, το σπάσιμο απέτυχε.'],['Где обычно стоп в стратегии Bollinger squeeze?','На максимуме дня','Очень далеко','Стоп не ставим','На средней полосе (SMA 20) или с другой стороны сжатия','Если цена вернулась внутрь сжатия, пробой не удался.']],
['str','s-scalp',0,['Τι είναι το πιο κρίσιμο στο scalping;','Χαμηλό κόστος (προμήθειες, spread) και γρήγορη εκτέλεση','Μεγάλοι στόχοι','Ημερήσιο γράφημα','Μακροοικονομικά','Με μικρούς στόχους, οι προμήθειες τρώνε μεγάλο μέρος του κέρδους. Χωρίς χαμηλό κόστος το scalping σπάνια βγαίνει.'],['Что самое критичное в скальпинге?','Низкие издержки (комиссии, спред) и быстрое исполнение','Большие цели','Дневной график','Макроэкономика','При маленьких целях комиссии съедают большую часть прибыли. Без низких издержек скальпинг редко окупается.']],
['str','s-vwap',1,['Στο VWAP pullback σε ανοδική μέρα, πού ψάχνεις είσοδο;','Πολύ πάνω από το VWAP','Σε επιστροφή στο VWAP που κρατάει ως στήριξη','Κάτω από το χαμηλό της ημέρας','Στο κλείσιμο','Σε δυνατή μέρα οι αγοραστές υπερασπίζονται το VWAP. Η επιστροφή εκεί είναι καλή τιμή εισόδου.'],['Где искать вход в откате к VWAP в растущий день?','Сильно выше VWAP','На возврате к VWAP, который держит как поддержка','Ниже минимума дня','На закрытии','В сильный день покупатели защищают VWAP. Возврат к нему — хорошая цена входа.']],
['str','s-macdiv',2,['Η αντιστροφή με απόκλιση θέλει…','μόνο την απόκλιση','μόνο μεγάλο όγκο','απόκλιση σε σημαντικό επίπεδο και επιβεβαίωση (π.χ. σπάσιμο δομής)','RSI 50','Η απόκλιση προειδοποιεί, δεν μπαίνεις μόνο με αυτή. Η επιβεβαίωση γλιτώνει από «μαχαίρια που πέφτουν».'],['Разворот по дивергенции требует…','только дивергенцию','только большой объём','дивергенцию у важного уровня и подтверждение (например слом структуры)','RSI на 50','Дивергенция предупреждает, но одной её мало. Подтверждение спасает от «падающих ножей».']],
['str','p-backtest',3,['Ποιο είναι το μεγαλύτερο λάθος στο backtest;','Πολλές συναλλαγές','Χρήση πολλών ετών','Καταγραφή προμηθειών','Να προσαρμόζεις τους κανόνες ώστε να ταιριάζουν τέλεια στο παρελθόν (overfitting)','Κανόνες «ραμμένοι» στο παρελθόν σπάνια δουλεύουν στο μέλλον. Κράτα τους απλούς και δοκίμασε σε δεδομένα που δεν είδες.'],['Какая самая большая ошибка в бэктесте?','Много сделок','Использование многих лет','Учёт комиссий','Подгонка правил под прошлое (overfitting)','Правила, «сшитые» под прошлое, редко работают в будущем. Делайте их простыми и проверяйте на невиданных данных.']],
['str','mtf',0,['Πώς χρησιμοποιείς σωστά πολλαπλά timeframes;','Μεγαλύτερο για κατεύθυνση, μικρότερο για ακριβή είσοδο','Μόνο το 1 λεπτό','Αλλάζεις timeframe μέχρι να δεις σήμα','Δεν έχουν σημασία','Π.χ. 4h για τάση, 1h ή 15m για είσοδο. Το να ψάχνεις timeframe που «συμφωνεί» μαζί σου είναι παγίδα.'],['Как правильно использовать несколько таймфреймов?','Старший — для направления, младший — для точного входа','Только 1 минута','Менять таймфрейм, пока не увидишь сигнал','Не важны','Например 4h для тренда, 1h или 15m для входа. Искать таймфрейм, который «согласен» с вами, — ловушка.']],
['str','structure',1,['Τι ορίζει μια ανοδική τάση στη δομή αγοράς;','Πράσινα κεριά','Υψηλότερα υψηλά και υψηλότερα χαμηλά','RSI πάνω από 50','Υψηλός όγκος','Higher highs και higher lows. Όταν ένα χαμηλό σπάσει, η δομή αλλάζει.'],['Что определяет восходящий тренд в структуре рынка?','Зелёные свечи','Более высокие максимумы и более высокие минимумы','RSI выше 50','Высокий объём','Higher highs и higher lows. Когда минимум пробит, структура меняется.']],
['str','sr',2,['Τι γίνεται συχνά με μια αντίσταση όταν σπάσει καθαρά;','Εξαφανίζεται','Γίνεται πιο δυνατή αντίσταση','Μετατρέπεται σε στήριξη','Τίποτα','Role reversal: όσοι πούλησαν εκεί ή έχασαν την άνοδο αγοράζουν στην επιστροφή.'],['Что часто происходит с сопротивлением после чистого пробоя?','Исчезает','Становится сильнее','Превращается в поддержку','Ничего','Смена ролей: кто продавал там или пропустил рост, покупает на возврате.']],
// ---- SMC ----
['smc','smc-ob',0,['Τι είναι το order block στο SMC;','Το τελευταίο αντίθετο κερί πριν από ισχυρή κίνηση που έσπασε δομή','Ένα gap','Μια εντολή stop','Το υψηλό της ημέρας','Η ζώνη όπου «μεγάλοι» παίκτες πιθανόν άνοιξαν θέσεις. Η επιστροφή εκεί είναι πιθανή είσοδος.'],['Что такое ордер-блок в SMC?','Последняя противоположная свеча перед сильным движением, сломавшим структуру','Гэп','Стоп-ордер','Максимум дня','Зона, где «крупные» игроки, вероятно, открывали позиции. Возврат туда — возможный вход.']],
['smc','smc-fvg',1,['Τι είναι το Fair Value Gap (FVG);','Διαφορά bid και ask','Κενό ανάμεσα στη σκιά του 1ου και του 3ου κεριού μιας απότομης κίνησης','Η τιμή ανοίγματος','Ένας μέσος όρος','Τρία κεριά: το μεσαίο τόσο δυνατό που σκιές 1 και 3 δεν επικαλύπτονται. Η τιμή συχνά επιστρέφει να το «γεμίσει».'],['Что такое Fair Value Gap (FVG)?','Разница bid и ask','Разрыв между тенями 1-й и 3-й свечей резкого движения','Цена открытия','Средняя','Три свечи: средняя настолько сильная, что тени 1-й и 3-й не перекрываются. Цена часто возвращается «заполнить» его.']],
['smc','smc-structure',2,['Τι είναι το CHoCH (change of character);','Συνέχεια τάσης','Ένα gap','Το πρώτο σπάσιμο δομής κόντρα στην τάση, πρώτη ένδειξη αλλαγής','Διασταύρωση μέσων','Το BOS συνεχίζει την τάση. Το CHoCH σπάει το τελευταίο σημαντικό σημείο αντίθετα: προειδοποίηση αντιστροφής.'],['Что такое CHoCH (change of character)?','Продолжение тренда','Гэп','Первый слом структуры против тренда, первый признак смены','Пересечение средних','BOS продолжает тренд. CHoCH ломает последнюю важную точку в обратную сторону: предупреждение о развороте.']],
['smc','smc-liq',3,['Τι είναι ένα liquidity sweep;','Ένα κανάλι','Η αγορά κλείνει','Αύξηση funding','Η τιμή περνάει για λίγο ένα προφανές υψηλό/χαμηλό (εκεί που είναι τα stop) και γυρίζει πίσω','Τα stop πάνω από ίσα υψηλά είναι «ρευστότητα». Το χτύπημά τους και η άμεση επιστροφή συχνά προηγείται αντιστροφής.'],['Что такое liquidity sweep (снятие ликвидности)?','Канал','Рынок закрывается','Рост funding','Цена ненадолго проходит очевидный максимум/минимум (где стопы) и возвращается','Стопы над равными максимумами — «ликвидность». Их снятие и быстрый возврат часто предшествуют развороту.']],
['smc','smc-pd',0,['Στο SMC, πού προτιμάς να αγοράζεις σε ανοδική τάση;','Σε «discount»: κάτω από το 50% του τελευταίου swing','Σε «premium»: πάνω από το 50%','Στο υψηλό','Οπουδήποτε','Αγοράζεις φθηνά (discount) και πουλάς ακριβά (premium). Η ζώνη OTE 62–79% είναι η αγαπημένη.'],['Где в SMC предпочтительно покупать в восходящем тренде?','В «дисконте»: ниже 50% последнего свинга','В «премиуме»: выше 50%','На максимуме','Где угодно','Покупают дёшево (дисконт), продают дорого (премиум). Зона OTE 62–79% — излюбленная.']],
['smc','smc-kz',1,['Τι είναι οι «kill zones»;','Ζώνες ρευστοποίησης','Ώρες με αυξημένη ρευστότητα και κινήσεις, π.χ. άνοιγμα Λονδίνου και Νέας Υόρκης','Επίπεδα Fibonacci','Ώρες που η αγορά είναι κλειστή','Οι μεγάλες κινήσεις συχνά γίνονται όταν ανοίγουν οι μεγάλες αγορές. Έξω από αυτές οι ώρες είναι συχνά «άδειες».'],['Что такое «kill zones»?','Зоны ликвидации','Часы с повышенной ликвидностью и движением, например открытие Лондона и Нью-Йорка','Уровни Фибоначчи','Часы, когда рынок закрыт','Крупные движения часто происходят при открытии больших рынков. Вне этих часов рынок часто «пустой».']],
// ---- crypto ----
['cry','c-funding',2,['Τι σημαίνει θετικό και υψηλό funding rate στα perpetual;','Οι short πληρώνουν τους long','Το ανταλλακτήριο πληρώνει όλους','Οι long πληρώνουν τους short, η αγορά είναι «φορτωμένη» με long','Τίποτα','Υψηλό θετικό funding δείχνει υπερβολικά πολλά long με μόχλευση. Συχνά προηγείται απότομης πτώσης (long squeeze).'],['Что значит положительный и высокий funding rate в бессрочных фьючерсах?','Шорты платят лонгам','Биржа платит всем','Лонги платят шортам, рынок «перегружен» лонгами','Ничего','Высокий положительный funding — слишком много лонгов с плечом. Часто предшествует резкому падению (long squeeze).']],
['cry','c-oi',3,['Τιμή ανεβαίνει και το open interest ανεβαίνει. Τι σημαίνει συνήθως;','Κλείνουν θέσεις','Ρευστοποιήσεις short','Η αγορά πέφτει','Νέα χρήματα μπαίνουν με νέες θέσεις στην κατεύθυνση της κίνησης','Αύξηση OI = άνοιγμα νέων συμβολαίων. Μαζί με άνοδο τιμής δείχνει νέα long (ή επιθετικούς αγοραστές).'],['Цена растёт и open interest растёт. Что это обычно значит?','Позиции закрываются','Ликвидации шортов','Рынок падает','Новые деньги входят новыми позициями в сторону движения','Рост OI = открытие новых контрактов. Вместе с ростом цены — новые лонги (или агрессивные покупатели).']],
['cry','c-dom',0,['Τι δείχνει όταν ανεβαίνει η κυριαρχία του BTC (BTC dominance);','Τα χρήματα πάνε προς το BTC, τα altcoins συνήθως υστερούν','Όλα τα altcoins ανεβαίνουν περισσότερο','Πέφτει ο όγκος','Ότι το ETH είναι πρώτο','Σε φάσεις «φόβου» ή αρχής ανόδου, το BTC τραβάει τα κεφάλαια. Το «altseason» έρχεται όταν πέφτει η κυριαρχία.'],['Что показывает рост доминации BTC?','Деньги идут в BTC, альткоины обычно отстают','Все альткоины растут сильнее','Падает объём','Что ETH на первом месте','В фазах страха или начала роста BTC притягивает капитал. «Альтсезон» приходит при падении доминации.']],
['cry','c-perp',1,['Τι είναι το perpetual future;','Συμβόλαιο με ημερομηνία λήξης','Παράγωγο χωρίς λήξη που κρατιέται κοντά στο spot μέσω του funding','Αγορά πραγματικού νομίσματος','Ομόλογο','Το perpetual δεν λήγει. Το funding κάθε λίγες ώρες σπρώχνει την τιμή του κοντά στο spot.'],['Что такое бессрочный фьючерс (perpetual)?','Контракт с датой экспирации','Дериватив без экспирации, привязанный к споту через funding','Покупка реальной монеты','Облигация','Perpetual не истекает. Funding каждые несколько часов подтягивает его цену к споту.']],
['cry','c-halving',2,['Τι συμβαίνει στο halving του Bitcoin;','Διπλασιάζεται η προσφορά','Μοιράζεται το νόμισμα σε δύο','Η ανταμοιβή των miners ανά block μειώνεται στο μισό','Κλείνει το δίκτυο','Περίπου κάθε 4 χρόνια η νέα προσφορά BTC μειώνεται στο μισό. Ιστορικά έχει συνδεθεί με κύκλους, αλλά δεν είναι εγγύηση.'],['Что происходит при халвинге биткоина?','Предложение удваивается','Монета делится на две','Награда майнерам за блок уменьшается вдвое','Сеть закрывается','Примерно раз в 4 года новая эмиссия BTC уменьшается вдвое. Исторически связывают с циклами, но это не гарантия.']],
['cry','c-safety',3,['Ποια είναι η καλύτερη πρακτική ασφάλειας στα ανταλλακτήρια;','Ίδιος κωδικός παντού','SMS ως μοναδικό 2FA','Αποθήκευση seed phrase σε email','2FA με εφαρμογή ή κλειδί, whitelist διευθύνσεων ανάληψης, και μεγάλα ποσά εκτός ανταλλακτηρίου','«Not your keys, not your coins». Το SMS μπορεί να κλαπεί με SIM swap. Το seed phrase δεν μπαίνει ποτέ online.'],['Какая лучшая практика безопасности на биржах?','Один пароль везде','SMS как единственная 2FA','Хранить seed-фразу в email','2FA через приложение или ключ, белый список адресов вывода и крупные суммы вне биржи','«Not your keys, not your coins». SMS могут украсть через SIM swap. Seed-фраза никогда не хранится онлайн.']],
['cry','c-247',0,['Γιατί τα Σαββατοκύριακα στα crypto είναι συχνά επικίνδυνα για breakouts;','Χαμηλή ρευστότητα: εύκολες ψευδοκινήσεις και sweeps','Η αγορά είναι κλειστή','Υψηλότερες προμήθειες','Δεν υπάρχει funding','Με λιγότερους συμμετέχοντες η τιμή κινείται εύκολα. Πολλά σπασίματα του Σαββατοκύριακου ακυρώνονται τη Δευτέρα.'],['Почему выходные в крипте часто опасны для пробоев?','Низкая ликвидность: лёгкие ложные движения и sweeps','Рынок закрыт','Выше комиссии','Нет funding','При меньшем числе участников цену легко сдвинуть. Многие пробои выходных отменяются в понедельник.']],
['cry','c-onchain',1,['Τι μπορεί να δείχνουν μεγάλες εισροές BTC προς ανταλλακτήρια;','Αγορές','Πιθανή πρόθεση πώλησης','Νέα halving','Χαμηλό funding','Νομίσματα που μεταφέρονται σε ανταλλακτήριο συχνά πρόκειται να πουληθούν. Δεν είναι βέβαιο, αλλά είναι ένδειξη.'],['Что могут означать крупные притоки BTC на биржи?','Покупки','Возможное намерение продать','Новый халвинг','Низкий funding','Монеты, переводимые на биржу, часто собираются продать. Не гарантия, но признак.']],
['cry','leverage',2,['Τι είναι το «liquidation cascade»;','Ένα είδος DCA','Αύξηση ρευστότητας','Αλυσιδωτές αναγκαστικές πωλήσεις/αγορές που σπρώχνουν την τιμή ακόμα πιο μακριά','Ένα airdrop','Οι ρευστοποιήσεις γίνονται με market εντολές, κινούν την τιμή και ρευστοποιούν τους επόμενους. Γι’ αυτό βλέπουμε απότομες «σκιές».'],['Что такое «каскад ликвидаций»?','Вид DCA','Рост ликвидности','Цепочка принудительных продаж/покупок, толкающих цену ещё дальше','Аирдроп','Ликвидации исполняются рыночными ордерами, двигают цену и ликвидируют следующих. Отсюда резкие «тени».']],
['cry','c-perp',3,['Ποια είναι η βασική διαφορά spot και futures;','Κανένα','Το spot έχει μόχλευση 100x','Τα futures έχουν πάντα λήξη','Στο spot κατέχεις το νόμισμα, στα futures ένα συμβόλαιο πάνω στην τιμή του','Στα futures (ή perpetual) μπορείς να κάνεις short και μόχλευση, αλλά υπάρχει funding και ρευστοποίηση.'],['В чём основная разница спота и фьючерсов?','Ни в чём','У спота плечо 100x','У фьючерсов всегда есть экспирация','На споте вы владеете монетой, во фьючерсах — контрактом на её цену','Во фьючерсах (или perpetual) можно шортить и брать плечо, но есть funding и ликвидация.']],
// ---- stocks / indices ----
['stk','k-earn',0,['Γιατί είναι ριψοκίνδυνο να κρατάς θέση σε μετοχή πριν τα αποτελέσματα (earnings);','Μπορεί να ανοίξει με μεγάλο gap που προσπερνά το stop','Οι προμήθειες διπλασιάζονται','Η αγορά κλείνει','Δεν επιτρέπεται','Το stop δεν προστατεύει από gap: εκτελείται στην πρώτη διαθέσιμη τιμή, που μπορεί να είναι πολύ μακριά.'],['Почему рискованно держать позицию в акции перед отчётностью?','Может открыться большим гэпом, перепрыгнув стоп','Комиссии удваиваются','Рынок закрывается','Это запрещено','Стоп не защищает от гэпа: он исполняется по первой доступной цене, которая может быть далеко.']],
['stk','k-hours',1,['Τι ώρα Ελλάδας ανοίγει συνήθως η αμερικανική αγορά (NYSE/Nasdaq);','10:00','16:30','20:00','09:00','09:30 ώρα Νέας Υόρκης = 16:30 ώρα Ελλάδας στο μεγαλύτερο μέρος του χρόνου (υπάρχουν 1–2 εβδομάδες διαφοράς όταν αλλάζει η ώρα).'],['Во сколько по времени Греции обычно открывается рынок США (NYSE/Nasdaq)?','10:00','16:30','20:00','09:00','09:30 по Нью-Йорку = 16:30 по Греции большую часть года (1–2 недели в году разница из-за перевода часов).']],
['stk','k-ger40',2,['Τι είναι ο GER40;','Ένα κρυπτονόμισμα','Δείκτης ομολόγων','Ο γερμανικός δείκτης DAX με τις 40 μεγαλύτερες εταιρείες','Ένα ETF χρυσού','Ο DAX (GER40 ως CFD) έχει έντονη κίνηση στο άνοιγμα της Φρανκφούρτης (10:00 ώρα Ελλάδας) και στο άνοιγμα των ΗΠΑ.'],['Что такое GER40?','Криптовалюта','Индекс облигаций','Немецкий индекс DAX из 40 крупнейших компаний','ETF на золото','DAX (GER40 как CFD) активно движется на открытии Франкфурта (10:00 по Греции) и на открытии США.']],
['stk','k-short',3,['Τι είναι το short squeeze;','Πτώση μετοχής','Μείωση όγκου','Αύξηση μερίσματος','Απότομη άνοδος επειδή όσοι είναι short αναγκάζονται να αγοράσουν για να κλείσουν','Υψηλό short interest + καλά νέα = οι short τρέχουν να καλύψουν, η αγορά τους ανεβάζει την τιμή κι άλλο.'],['Что такое шорт-сквиз?','Падение акции','Снижение объёма','Рост дивидендов','Резкий рост, потому что шортисты вынуждены покупать для закрытия','Высокий short interest + хорошие новости = шорты бегут закрываться, их покупки ещё поднимают цену.']],
['stk','k-macro',0,['Ποιο γεγονός κινεί συνήθως έντονα όλες τις αγορές;','Η απόφαση επιτοκίων της Fed και ο πληθωρισμός (CPI)','Τα γενέθλια ενός CEO','Το Σαββατοκύριακο','Ένα νέο logo','Επιτόκια και πληθωρισμός επηρεάζουν το κόστος του χρήματος. Εκείνες τις ώρες τα spread και τα slippage μεγαλώνουν.'],['Какое событие обычно сильно двигает все рынки?','Решение ФРС по ставке и инфляция (CPI)','День рождения CEO','Выходные','Новый логотип','Ставки и инфляция влияют на стоимость денег. В эти часы растут спреды и проскальзывание.']],
['stk','k-index',1,['Τι είναι ένα ETF;','Ένα κρυπτονόμισμα','Ένα αμοιβαίο κεφάλαιο που διαπραγματεύεται σαν μετοχή, π.χ. πάνω σε δείκτη','Μια μετοχή τράπεζας','Ένα παράγωγο με λήξη','Π.χ. το SPY ακολουθεί τον S&P 500. Δίνει διασπορά με μία αγορά.'],['Что такое ETF?','Криптовалюта','Фонд, торгующийся как акция, например на индекс','Акция банка','Дериватив с экспирацией','Например SPY следует за S&P 500. Даёт диверсификацию одной покупкой.']],
['stk','k-adjust',2,['Μετά από split 1:4 μιας μετοχής, τι γίνεται με την αξία της θέσης σου;','Τετραπλασιάζεται','Πέφτει στο 1/4','Μένει ίδια: έχεις 4 φορές περισσότερες μετοχές στο 1/4 της τιμής','Μηδενίζεται','Το split αλλάζει μόνο τον αριθμό και την τιμή των μετοχών, όχι την αξία.'],['Что происходит со стоимостью позиции после сплита 1:4?','Увеличивается в 4 раза','Падает до 1/4','Остаётся прежней: в 4 раза больше акций по 1/4 цены','Обнуляется','Сплит меняет только количество и цену акций, но не стоимость.']],
// ---- psychology ----
['psy','p-biases',3,['Έχασες δύο συναλλαγές και θες να «τα πάρεις πίσω» με μεγαλύτερη ποσότητα. Πώς λέγεται αυτό;','Πειθαρχία','Διασπορά','Hedging','Revenge trading (εκδίκηση)','Το revenge trading είναι από τις πιο ακριβές συνήθειες. Το όριο ημέρας υπάρχει γι’ αυτό.'],['Вы проиграли две сделки и хотите «отыграться» большим объёмом. Как это называется?','Дисциплина','Диверсификация','Хеджирование','Revenge trading (месть рынку)','Revenge trading — одна из самых дорогих привычек. Для этого и существует дневной лимит.']],
['psy','p-biases',0,['Τι είναι το FOMO;','Ο φόβος ότι χάνεις την κίνηση, που σε κάνει να μπαίνεις αργά και χωρίς πλάνο','Μια στρατηγική','Ένας δείκτης','Η προμήθεια','Το FOMO σε βάζει συνήθως αφού η κίνηση έχει γίνει, με κακό R:R. Αν το χάσες, έρχεται άλλο setup.'],['Что такое FOMO?','Страх упустить движение, из-за которого входишь поздно и без плана','Стратегия','Индикатор','Комиссия','FOMO обычно заставляет входить, когда движение уже прошло, с плохим R:R. Упустили — будет другой сетап.']],
['psy','p-routine',1,['Ποιο είναι το πιο χρήσιμο πράγμα πριν ανοίξεις συναλλαγές τη μέρα;','Να δεις social media','Γραπτό πλάνο: επίπεδα, σενάρια, μέγιστο ρίσκο','Καφές','Να αυξήσεις μόχλευση','Το πλάνο σε κάνει να αντιδράς σε όσα είχες προβλέψει, όχι σε κάθε κερί.'],['Что полезнее всего перед началом торгов?','Посмотреть соцсети','Письменный план: уровни, сценарии, максимальный риск','Кофе','Поднять плечо','План заставляет реагировать на предусмотренное, а не на каждую свечу.']],
['psy','p-evidence',2,['Τι λένε οι μελέτες για τους περισσότερους day traders μακροπρόθεσμα;','Οι περισσότεροι κερδίζουν','Οι μισοί κερδίζουν','Οι περισσότεροι χάνουν, λίγοι κερδίζουν σταθερά','Δεν υπάρχουν μελέτες','Μελέτες (π.χ. Βραζιλία, Ταϊβάν) βρήκαν ότι η μεγάλη πλειοψηφία χάνει. Πειθαρχία, κόστος και ρίσκο κάνουν τη διαφορά.'],['Что говорят исследования о большинстве дейтрейдеров в долгосрочной перспективе?','Большинство зарабатывает','Половина зарабатывает','Большинство теряет, стабильно зарабатывают немногие','Исследований нет','Исследования (например Бразилия, Тайвань) показали, что подавляющее большинство теряет. Разницу делают дисциплина, издержки и риск.']],
['psy','p-change',3,['Πότε είναι λογικό να αλλάξεις στρατηγική;','Μετά από 3 απώλειες','Κάθε εβδομάδα','Όταν δεις κάτι νέο στο YouTube','Μετά από αρκετό δείγμα (π.χ. 30+ συναλλαγές) με αρνητικό αποτέλεσμα ενώ τηρούσες τους κανόνες','Λίγες συναλλαγές είναι θόρυβος. Αν δεν τηρούσες τους κανόνες, το πρόβλημα είναι η εκτέλεση, όχι η στρατηγική.'],['Когда разумно менять стратегию?','После 3 убытков','Каждую неделю','Увидев что-то новое на YouTube','После достаточной выборки (например 30+ сделок) с отрицательным результатом при соблюдении правил','Мало сделок — шум. Если правила не соблюдались, проблема в исполнении, а не в стратегии.']],
['psy','p-checklist',0,['Γιατί να μετακινήσεις το stop πιο μακριά όταν η τιμή πλησιάζει;','Δεν πρέπει: αυξάνει το ρίσκο πέρα από το πλάνο','Για να κερδίσεις','Για να μειώσεις προμήθειες','Πάντα είναι καλό','Η μετακίνηση του stop μακριά μετατρέπει μικρές απώλειες σε μεγάλες. Το stop μετακινείται μόνο προς την κατεύθυνση του κέρδους.'],['Зачем отодвигать стоп дальше, когда цена приближается?','Не нужно: это увеличивает риск сверх плана','Чтобы выиграть','Чтобы снизить комиссии','Всегда хорошо','Перенос стопа дальше превращает маленькие убытки в большие. Стоп двигают только в сторону прибыли.']],
['psy','p-biases',1,['Μετά από 5 κερδισμένες στη σειρά, ποιος είναι ο μεγαλύτερος κίνδυνος;','Κανένας','Υπερεμπιστοσύνη: μεγαλύτερη ποσότητα και χαλαροί κανόνες','Χαμηλό funding','Λιγότερες προμήθειες','Το σερί κερδών φουσκώνει την αυτοπεποίθηση. Κράτα ίδιο ρίσκο ανά συναλλαγή.'],['Какой главный риск после 5 прибыльных сделок подряд?','Никакого','Самоуверенность: больший объём и ослабленные правила','Низкий funding','Меньше комиссий','Серия побед раздувает уверенность. Держите тот же риск на сделку.']],
['psy','p-routine',2,['Τι είναι ο απολογισμός στο τέλος της μέρας;','Χάσιμο χρόνου','Καταμέτρηση κερδών μόνο','Σύντομη καταγραφή τι έκανες καλά, τι λάθος και ένα μάθημα για αύριο','Ανάγνωση ειδήσεων','Το ημερολόγιο χωρίς απολογισμό είναι απλή λογιστική. Η μάθηση γίνεται στον απολογισμό.'],['Что такое итог в конце дня?','Потеря времени','Только подсчёт прибыли','Краткая запись: что сделал хорошо, что плохо, и урок на завтра','Чтение новостей','Журнал без разбора — просто бухгалтерия. Обучение происходит в разборе.']],
// ---- TradingView / orders ----
['str','orders',3,['Τι κάνει μια εντολή stop-limit;','Εκτελείται αμέσως','Ακυρώνει όλες τις εντολές','Αγοράζει στο κλείσιμο','Όταν η τιμή φτάσει το stop, βάζει limit εντολή, που μπορεί να μην εκτελεστεί αν η τιμή «πηδήξει»','Το stop-market εκτελείται σίγουρα αλλά με slippage. Το stop-limit ελέγχει την τιμή αλλά μπορεί να μείνει ανεκτέλεστο.'],['Что делает стоп-лимит ордер?','Исполняется сразу','Отменяет все ордера','Покупает на закрытии','При достижении стопа выставляет лимитный ордер, который может не исполниться, если цена «перепрыгнет»','Стоп-маркет исполнится точно, но с проскальзыванием. Стоп-лимит контролирует цену, но может не исполниться.']],
['str','tv-replay',0,['Σε τι χρησιμεύει το Bar Replay του TradingView;','Ξαναπαίζεις την αγορά κερί-κερί για εξάσκηση χωρίς να βλέπεις το μέλλον','Βλέπεις ειδήσεις','Αλλάζεις χρώματα','Αυξάνεις μόχλευση','Είναι ο πιο γρήγορος τρόπος για χειροκίνητο backtest και εξάσκηση στην αναγνώριση setups.'],['Для чего Bar Replay в TradingView?','Проигрывать рынок свеча за свечой для практики, не видя будущего','Смотреть новости','Менять цвета','Повышать плечо','Самый быстрый способ ручного бэктеста и тренировки распознавания сетапов.']],
['str','tv-position',1,['Τι δείχνει το εργαλείο Long Position του TradingView;','Τον όγκο','Είσοδο, stop, στόχο, αναλογία R:R και ποσότητα για το ρίσκο σου','Το funding','Τις ειδήσεις','Βάζεις account size και risk %, και σου υπολογίζει ποσότητα και R:R πάνω στο γράφημα.'],['Что показывает инструмент Long Position в TradingView?','Объём','Вход, стоп, цель, R:R и объём под ваш риск','Funding','Новости','Указываете размер счёта и риск %, и он считает объём и R:R прямо на графике.']],
['str','longshort',2,['Σε short, πού μπαίνει το stop;','Κάτω από την είσοδο','Δεν χρειάζεται','Πάνω από την είσοδο','Στο μηδέν','Στο short κερδίζεις όταν πέφτει η τιμή, άρα το stop είναι πάνω από την είσοδο.'],['Где ставят стоп в шорте?','Ниже входа','Не нужен','Выше входа','На нуле','В шорте вы зарабатываете на падении, значит стоп выше входа.']],
['ind','volume',3,['Άνοδος με πέφτοντα όγκο σημαίνει συνήθως…','δυνατή τάση','ρευστοποιήσεις','υψηλό funding','αδύναμη συμμετοχή: η άνοδος μπορεί να εξαντλείται','Οι υγιείς κινήσεις έχουν όγκο. Άνοδος χωρίς όγκο είναι συχνά προειδοποίηση.'],['Рост при падающем объёме обычно означает…','сильный тренд','ликвидации','высокий funding','слабое участие: рост может выдыхаться','Здоровые движения идут с объёмом. Рост без объёма — часто предупреждение.']],
['ind','pivots',0,['Τι είναι τα pivot points;','Επίπεδα που υπολογίζονται από το υψηλό, χαμηλό και κλείσιμο της προηγούμενης περιόδου','Ένα είδος κεριού','Ο μέσος όγκος','Ένα gap','Πολλοί day traders τα βλέπουν, γι’ αυτό συχνά λειτουργούν ως στήριξη και αντίσταση.'],['Что такое pivot points?','Уровни, рассчитанные по максимуму, минимуму и закрытию прошлого периода','Тип свечи','Средний объём','Гэп','Их видят многие дейтрейдеры, поэтому они часто работают как поддержка и сопротивление.']],
['ind','keltner',1,['Η τιμή κλείνει έξω από το κανάλι Keltner. Τι μπορεί να σημαίνει;','Τίποτα','Δυνατή ορμή προς εκείνη την κατεύθυνση','Ότι η αγορά κλείνει','Χαμηλή μεταβλητότητα','Το Keltner βασίζεται σε EMA και ATR. Κλείσιμο έξω από αυτό δείχνει ασυνήθιστα δυνατή κίνηση.'],['Цена закрылась за каналом Кельтнера. Что это может значить?','Ничего','Сильный импульс в эту сторону','Что рынок закрывается','Низкую волатильность','Кельтнер строится на EMA и ATR. Закрытие за ним — необычно сильное движение.']],
['pat','abcd',2,['Στο σχηματισμό ABCD, η κίνηση CD είναι συνήθως…','μηδενική','διπλάσια της BC','περίπου ίση με την AB','αντίθετη της AB','Measured move: η δεύτερη ώθηση (CD) συχνά ισούται με την πρώτη (AB). Χρήσιμο για στόχους.'],['В фигуре ABCD движение CD обычно…','нулевое','вдвое больше BC','примерно равно AB','противоположно AB','Measured move: второй импульс (CD) часто равен первому (AB). Полезно для целей.']],
['pat','triple',3,['Πόσες φορές πρέπει να δοκιμαστεί ένα επίπεδο για τριπλή κορυφή;','Μία','Δύο','Τέσσερις','Τρεις','Τρεις αποτυχημένες προσπάθειες σε αντίσταση. Επιβεβαίωση με σπάσιμο της στήριξης ανάμεσά τους.'],['Сколько раз уровень должен быть протестирован для тройной вершины?','Один','Два','Четыре','Три','Три неудачные попытки у сопротивления. Подтверждение — пробой поддержки между ними.']],
['cdl','harami',0,['Τι είναι το harami;','Μικρό σώμα που χωράει μέσα στο σώμα του προηγούμενου μεγάλου κεριού','Μεγάλο κερί που καλύπτει το προηγούμενο','Τρία κεριά','Gap','Το harami («έγκυος» στα ιαπωνικά) δείχνει ότι η ορμή σταμάτησε. Αντίθετο από το engulfing.'],['Что такое харами?','Маленькое тело внутри тела предыдущей большой свечи','Большая свеча, перекрывающая предыдущую','Три свечи','Гэп','Харами («беременная» по-японски) показывает остановку импульса. Противоположность поглощению.']],
['cdl','piercing',1,['Τι είναι το piercing line;','Πτωτικό σήμα','Πράσινο κερί που ανοίγει χαμηλά και κλείνει πάνω από τη μέση του προηγούμενου κόκκινου','Ένα doji','Ένα gap προς τα πάνω','Ανοδικό σήμα αντιστροφής. Το αντίθετό του είναι το dark cloud cover.'],['Что такое просвет в облаках (piercing line)?','Медвежий сигнал','Зелёная свеча, открывшаяся низко и закрывшаяся выше середины предыдущей красной','Доджи','Гэп вверх','Бычий разворотный сигнал. Противоположность — «завеса из тёмных облаков».']],
['risk','possize',2,['Τι αλλάζει αν μεγαλώσεις την απόσταση του stop αλλά θες το ίδιο ρίσκο;','Τίποτα','Μεγαλώνει η ποσότητα','Μικραίνει η ποσότητα','Μεγαλώνει το ρίσκο','Ποσότητα = ρίσκο ÷ απόσταση stop. Διπλάσια απόσταση = μισή ποσότητα για το ίδιο ρίσκο.'],['Что меняется, если увеличить расстояние до стопа при том же риске?','Ничего','Объём растёт','Объём уменьшается','Риск растёт','Объём = риск ÷ расстояние до стопа. Двойное расстояние = половина объёма при том же риске.']],
['risk','expectancy',3,['Ποια στρατηγική είναι κερδοφόρα;','Επιτυχία 70%, κέρδος +0,3R, απώλεια −1R','Επιτυχία 25%, κέρδος +2R, απώλεια −1R','Επιτυχία 50%, κέρδος +0,8R, απώλεια −1R','Επιτυχία 35%, κέρδος +3R, απώλεια −1R','35% × 3 − 65% × 1 = 1,05 − 0,65 = +0,4R. Οι υπόλοιπες είναι αρνητικές: το ποσοστό επιτυχίας μόνο του δεν λέει τίποτα.'],['Какая стратегия прибыльна?','Винрейт 70%, прибыль +0,3R, убыток −1R','Винрейт 25%, прибыль +2R, убыток −1R','Винрейт 50%, прибыль +0,8R, убыток −1R','Винрейт 35%, прибыль +3R, убыток −1R','35% × 3 − 65% × 1 = 1,05 − 0,65 = +0,4R. Остальные отрицательны: винрейт сам по себе ничего не говорит.']],
['smc','smc-model',2,['Ποια είναι η σωστή σειρά σε ένα τυπικό μοντέλο SMC;','Είσοδος, μετά sweep','FVG, μετά σπάσιμο','Sweep ρευστότητας → CHoCH/BOS → επιστροφή σε OB/FVG → είσοδος','Τυχαία σειρά','Πρώτα «μαζεύονται» τα stop, μετά η δομή αλλάζει, και η είσοδος γίνεται στην επιστροφή σε ζώνη αξίας.'],['Какой правильный порядок в типичной модели SMC?','Вход, потом sweep','FVG, потом пробой','Снятие ликвидности → CHoCH/BOS → возврат в OB/FVG → вход','Случайный порядок','Сначала «снимают» стопы, затем меняется структура, а вход — на возврате в зону ценности.']],
['cry','c-funding',0,['Πώς μπορεί να σε κοστίσει το funding αν κρατάς long για μέρες με θετικό funding;','Πληρώνεις funding κάθε λίγες ώρες, που τρώει από το κέρδος','Δεν σε επηρεάζει ποτέ','Κερδίζεις funding','Μόνο στα spot','Σε long με θετικό funding πληρώνεις. Σε θέσεις πολλών ημερών αυτό αθροίζεται.'],['Как funding может стоить вам денег, если держать long несколько дней при положительном funding?','Вы платите funding каждые несколько часов, это съедает прибыль','Никогда не влияет','Вы получаете funding','Только на споте','В лонге при положительном funding вы платите. На позициях в несколько дней это накапливается.']],
['stk','k-ger40',0,['Τι ώρα Ελλάδας ανοίγει η Xetra (Φρανκφούρτη), εκεί που διαπραγματεύεται ο DAX;','10:00','09:00','16:30','11:30','Η Xetra ανοίγει 09:00 ώρα Κεντρικής Ευρώπης, δηλαδή 10:00 ώρα Ελλάδας. Εκεί συχνά γίνονται μεγάλες κινήσεις στον GER40.'],['Во сколько по времени Греции открывается Xetra (Франкфурт), где торгуется DAX?','10:00','09:00','16:30','11:30','Xetra открывается в 09:00 по центральноевропейскому времени, то есть в 10:00 по Греции. Там часто сильные движения в GER40.']]
];

/* ================= Ο Καθηγητής: daily quiz ================= */
/* lessons from the great traders: [who, source, [el title, el body, el apply], [ru title, ru body, ru apply]] */
var GREATS=[
['Mark Douglas','Trading in the Zone (2000)',['Σκέψου με πιθανότητες','Κάθε μεμονωμένη συναλλαγή έχει τυχαίο αποτέλεσμα. Το πλεονέκτημα φαίνεται μόνο σε μια σειρά πολλών συναλλαγών. Ο Douglas γράφει για πέντε θεμελιώδεις αλήθειες: όλα μπορούν να συμβούν, δεν χρειάζεται να ξέρεις τι θα γίνει μετά για να βγάλεις χρήματα, κερδισμένες και χαμένες κατανέμονται τυχαία, ένα πλεονέκτημα είναι απλώς μεγαλύτερη πιθανότητα, και κάθε στιγμή της αγοράς είναι μοναδική.','Κρίνε τη στρατηγική σου ανά 20 συναλλαγές, όχι ανά μία. Μια απώλεια που τήρησε τους κανόνες είναι καλή συναλλαγή.'],['Мысли вероятностями','Результат каждой отдельной сделки случаен. Преимущество проявляется только на серии многих сделок. Дуглас пишет о пяти фундаментальных истинах: всё может случиться; не нужно знать, что будет дальше, чтобы заработать; прибыли и убытки распределяются случайно; преимущество — лишь более высокая вероятность; каждый момент рынка уникален.','Оценивайте стратегию по 20 сделкам, а не по одной. Убыток при соблюдении правил — хорошая сделка.']],
['Van K. Tharp','Trade Your Way to Financial Freedom',['R-multiples και expectancy','Μέτρα κάθε αποτέλεσμα σε πολλαπλάσια του αρχικού ρίσκου (R). Το expectancy, το μέσο R ανά συναλλαγή, λέει αν το σύστημα αξίζει. Ο Tharp τονίζει ότι το μέγεθος της θέσης (position sizing) καθορίζει σε μεγάλο βαθμό πόσα κερδίζεις ή χάνεις.','Το ημερολόγιό σου ήδη μετράει σε R. Κοίτα το «Μέσο ανά συναλλαγή»: αν είναι θετικό με 30+ συναλλαγές, έχεις πλεονέκτημα.'],['R-мультипликаторы и матожидание','Измеряйте каждый результат в кратных начального риска (R). Матожидание — среднее R на сделку — показывает, стоит ли система чего-то. Тарп подчёркивает, что размер позиции во многом определяет, сколько вы зарабатываете или теряете.','Ваш журнал уже считает в R. Смотрите «В среднем на сделку»: если оно положительное на 30+ сделках, у вас есть преимущество.']],
['Alexander Elder','Trading for a Living · Come Into My Trading Room',['Ο κανόνας του 2% και του 6%','Ποτέ πάνω από 2% του λογαριασμού σε μία συναλλαγή, και σταματάς για τον υπόλοιπο μήνα αν οι απώλειες φτάσουν 6%. Ο Elder πρότεινε και το «Triple Screen»: μεγάλο timeframe για την τάση, μεσαίο για την είσοδο κόντρα στη διόρθωση, μικρό για την ακριβή είσοδο.','Το 1% σας είναι ήδη πιο συντηρητικό. Βάλε στους Κανόνες ρίσκου μέγιστη πτώση 6% ως μηνιαίο φρένο.'],['Правило 2% и 6%','Никогда не более 2% счёта на одну сделку, а если убытки за месяц достигли 6%, остановиться до конца месяца. Элдер также предложил «Тройной экран»: старший таймфрейм для тренда, средний для входа против коррекции, младший для точного входа.','Ваш 1% уже консервативнее. Поставьте в Правилах риска макс. просадку 6% как месячный тормоз.']],
['Ed Seykota','Market Wizards (Jack Schwager)',['Κόψε τις απώλειες','Ένας από τους πρώτους που έκαναν trend following με υπολογιστή. Στο Market Wizards λέει ότι τα στοιχεία του καλού trading είναι να κόβεις τις απώλειες, να κόβεις τις απώλειες και να κόβεις τις απώλειες. Ακολουθείς την τάση μέχρι να τελειώσει.','Στις μετρικές σου κοίτα «Απώλειες πέρα από −1R». Κάθε τέτοια συναλλαγή είναι stop που δεν σεβάστηκες.'],['Режьте убытки','Один из первых, кто вёл трендовую торговлю с помощью компьютера. В «Магах рынка» он говорит, что элементы хорошей торговли — резать убытки, резать убытки и ещё раз резать убытки. Следуйте за трендом, пока он не закончится.','В метриках смотрите «Убытки больше −1R». Каждая такая сделка — стоп, который вы не соблюли.']],
['Paul Tudor Jones','Market Wizards · συνεντεύξεις',['Πρώτα η άμυνα','Ο Tudor Jones λέει ότι σκέφτεται πρώτα πόσα μπορεί να χάσει και όχι πόσα θα κερδίσει. Έχει μιλήσει για συναλλαγές με αναλογία κέρδους προς ρίσκο περίπου 5 προς 1, ώστε να μπορεί να κάνει λάθος συχνά και να βγαίνει κερδισμένος.','Πριν πατήσεις Buy, γράψε στη φόρμα το stop και κοίτα το R:R. Αν είναι κάτω από 2, ψάξε καλύτερη είσοδο.'],['Сначала защита','Тюдор Джонс говорит, что думает сначала о том, сколько может потерять, а не сколько заработает. Он говорил о сделках с соотношением прибыли к риску около 5 к 1, чтобы часто ошибаться и всё равно оставаться в плюсе.','Перед покупкой запишите стоп в форму и посмотрите R:R. Если меньше 2 — ищите лучший вход.']],
['Jesse Livermore','Reminiscences of a Stock Operator (Edwin Lefèvre, 1923)',['Η υπομονή φέρνει τα μεγάλα κέρδη','Στο βιβλίο, ο ήρωας που βασίζεται στον Livermore λέει ότι τα μεγάλα χρήματα δεν τα έβγαλε η σκέψη του αλλά το ότι «κάθισε» στη θέση. Η αγορά πληρώνει όποιον αφήνει τα κέρδη να τρέξουν σε μια σωστή τάση.','Στις μετρικές δες την «Αξιοποίηση κίνησης». Αν βγαίνεις πολύ πριν το MFE, δοκίμασε κινητό stop αντί για γρήγορο κλείσιμο.'],['Большие деньги приносит терпение','В книге герой, прототип которого Ливермор, говорит, что большие деньги принесло не его мышление, а то, что он «сидел» в позиции. Рынок платит тому, кто даёт прибыли расти в правильном тренде.','В метриках смотрите «Использование движения». Если выходите сильно раньше MFE, попробуйте трейлинг-стоп вместо быстрого закрытия.']],
['Al Brooks','Trading Price Action (σειρά βιβλίων)',['Η εξίσωση του trader','Πιθανότητα × κέρδος πρέπει να είναι μεγαλύτερο από (1 − πιθανότητα) × ρίσκο. Μια συναλλαγή με 40% πιθανότητα αξίζει μόνο αν ο στόχος είναι αρκετά μακριά. Ο Brooks διαβάζει κάθε κερί ως μάχη αγοραστών και πωλητών.','Πριν μπεις, πες στον εαυτό σου: «Πόσο πιθανό είναι; Πόσα R κερδίζω;». Αν 40% × 2R < 60% × 1R, μην μπεις.'],['Уравнение трейдера','Вероятность × прибыль должна быть больше (1 − вероятность) × риск. Сделка с вероятностью 40% стоит того, только если цель достаточно далеко. Брукс читает каждую свечу как борьбу покупателей и продавцов.','Перед входом спросите себя: «Насколько вероятно? Сколько R получу?». Если 40% × 2R < 60% × 1R — не входите.']],
['William O\'Neil','How to Make Money in Stocks',['Κόψε κάθε μετοχή στο −7/8%','Ο O\'Neil (CAN SLIM) έλεγε να πουλάς χωρίς συζήτηση μια μετοχή που πέφτει 7–8% κάτω από την τιμή αγοράς. Αγόραζε ηγέτιδες μετοχές με δυνατά κέρδη, σε σπάσιμο από βάση με όγκο, σε ανοδική αγορά.','Για swing σε μετοχές, έλεγξε ότι το stop σου δεν είναι πάνω από 8% μακριά. Αν είναι, η είσοδος είναι πρόωρη.'],['Режьте акцию на −7–8%','О\'Нил (CAN SLIM) советовал без обсуждений продавать акцию, упавшую на 7–8% ниже цены покупки. Он покупал лидеров с сильной прибылью на пробое базы с объёмом в растущем рынке.','Для свинга в акциях проверьте, что стоп не дальше 8%. Если дальше — вход преждевременный.']],
['Stan Weinstein','Secrets for Profiting in Bull and Bear Markets',['Τα 4 στάδια','Κάθε μετοχή περνά από βάση (1), άνοδο (2), κορυφή (3) και πτώση (4). Αγοράζεις μόνο στο στάδιο 2, όταν η τιμή σπάει πάνω από τον 30-εβδομαδιαίο μέσο που έχει γυρίσει ανοδικά, με όγκο.','Στο εβδομαδιαίο γράφημα βάλε SMA 30. Long μόνο όταν η τιμή είναι πάνω του και ο μέσος ανεβαίνει.'],['4 стадии','Каждая акция проходит базу (1), рост (2), вершину (3) и падение (4). Покупают только на 2-й стадии, когда цена с объёмом пробивает вверх 30-недельную среднюю, развернувшуюся вверх.','На недельном графике поставьте SMA 30. Long только когда цена выше неё и средняя растёт.']],
['Richard Dennis & οι Turtles','Way of the Turtle (Curtis Faith)',['Το trading διδάσκεται','Ο Dennis στοιχημάτισε ότι μπορεί να διδάξει trading σε αρχάριους. Οι «Χελώνες» έπαιζαν σπασίματα Donchian, με stop 2 ATR και μικρό ρίσκο ανά συναλλαγή. Πολλοί έβγαλαν πολλά λεφτά, όχι από ταλέντο αλλά επειδή ακολουθούσαν πιστά απλούς κανόνες.','Δοκίμασε στο Backtest του αναλυτή το «Donchian breakout». Το μυστικό τους ήταν η πειθαρχία, όχι η στρατηγική.'],['Трейдингу можно научить','Деннис поспорил, что научит торговле новичков. «Черепахи» торговали пробои Дончиана со стопом 2 ATR и малым риском на сделку. Многие хорошо заработали не благодаря таланту, а потому что строго следовали простым правилам.','Попробуйте в Бэктесте аналитика «Donchian breakout». Их секрет был в дисциплине, а не в стратегии.']],
['Linda Bradford Raschke','Street Smarts (με τον Larry Connors)',['Το «Holy Grail» setup','Σε δυνατή τάση (ADX πάνω από 30), περίμενε την πρώτη επιστροφή στον EMA 20 και μπες όταν η τιμή ξαναπάρει κατεύθυνση. Η Raschke τονίζει τα λίγα, καθαρά setups που επαναλαμβάνονται.','Ταιριάζει με το «Pullback στον EMA 20» του Μπούσουλα. Πρόσθεσε φίλτρο ADX > 30 και σύγκρινε τα αποτελέσματα με tag.'],['Сетап «Святой Грааль»','В сильном тренде (ADX выше 30) дождитесь первого возврата к EMA 20 и входите, когда цена снова пойдёт в сторону тренда. Рашке делает упор на немногие чёткие повторяющиеся сетапы.','Совпадает с «Откатом к EMA 20» в Компасе. Добавьте фильтр ADX > 30 и сравните результаты с тегом.']],
['Jack Schwager','Market Wizards (σειρά)',['Δεν υπάρχει μία σωστή μέθοδος','Μετά από δεκάδες συνεντεύξεις με κορυφαίους traders, ο Schwager κατέληξε ότι κάνουν πολύ διαφορετικά πράγματα. Το κοινό τους: μέθοδος που ταιριάζει στον χαρακτήρα τους, αυστηρός έλεγχος ρίσκου και πειθαρχία.','Δες στις Αναλύσεις ποια στρατηγική, ώρα και αγορά σου αποδίδουν. Χτίσε πάνω σε αυτό που ταιριάζει σε σένα.'],['Единственно верного метода нет','После десятков интервью с лучшими трейдерами Швагер пришёл к выводу, что они делают очень разные вещи. Общее у них: метод, подходящий их характеру, жёсткий контроль риска и дисциплина.','Посмотрите в Аналитике, какие стратегия, время и рынок у вас работают. Стройте на том, что подходит вам.']],
['Brett Steenbarger','The Psychology of Trading · Trading Psychology 2.0',['Το trading είναι απόδοση, σαν άθλημα','Ο Steenbarger, ψυχολόγος traders, προτείνει να χτίζεις πάνω στα δυνατά σου σημεία: βρες πότε τα πας καλύτερα και κάνε περισσότερο από αυτό. Ημερολόγιο και απολογισμός είναι η «προπόνηση».','Γράψε απολογισμό κάθε βράδυ στο check-in. Στο τέλος της εβδομάδας ρώτα τον Καθηγητή: «Πότε τα πήγα καλύτερα;».'],['Трейдинг — это результативность, как спорт','Стинбаргер, психолог трейдеров, советует строить на своих сильных сторонах: найдите, когда у вас получается лучше всего, и делайте больше этого. Журнал и разбор — это «тренировка».','Пишите итог каждый вечер в check-in. В конце недели спросите Профессора: «Когда у меня получалось лучше всего?».']],
['Larry Williams','Long-Term Secrets to Short-Term Trading',['Η διαχείριση χρημάτων κρίνει τα πάντα','Ο Williams, γνωστός για τον δείκτη Williams %R και για ένα από τα πιο εντυπωσιακά αποτελέσματα σε διαγωνισμό futures, γράφει ότι η διαχείριση χρημάτων είναι πιο σημαντική από το σήμα εισόδου. Ακόμα και καλά συστήματα καταστρέφονται με υπερβολικό μέγεθος θέσης.','Τρέξε το Stress test με το ρίσκο που χρησιμοποιείς. Αν η πιθανότητα πτώσης 20% είναι πάνω από 10%, μείωσε το ρίσκο.'],['Управление капиталом решает всё','Уильямс, известный индикатором Williams %R и одним из самых впечатляющих результатов на конкурсе по фьючерсам, пишет, что управление капиталом важнее сигнала входа. Даже хорошие системы разрушаются из-за слишком большого размера позиции.','Запустите Стресс-тест с вашим риском. Если вероятность просадки 20% выше 10%, снижайте риск.']]
];
function greatOfDay(ds){var d=qDayIdx(ds||today());return GREATS[((d%GREATS.length)+GREATS.length)%GREATS.length]}
function greatCard(g,compact){var L=LANG_RU()?3:2,t=g[L];
  return '<div class="gcard"><div class="gtop"><span class="pill gain">Μάθημα ημέρας</span><span class="gwho ud">'+esc(g[0])+'</span></div><b class="gt ud">'+esc(t[0])+'</b><span class="gsrc ud">'+esc(g[1])+'</span>'+(compact?'':'<p class="ud">'+esc(t[1])+'</p><p class="gapply"><b>Στην πράξη:</b> <span class="ud">'+esc(t[2])+'</span></p>')+
    '<div class="row" style="gap:.4rem">'+(compact?'<button type="button" class="btn small" data-gopen>Διάβασε το μάθημα</button>':'')+'<button type="button" class="btn small" data-gask="'+esc(t[0])+'|'+esc(g[0])+'">Ρώτα τον Καθηγητή γι’ αυτό</button></div></div>'}
var QBANK_G=[
['grt','',0,['Ποιο βιβλίο έγραψε ο Mark Douglas για την ψυχολογία του trading;','Trading in the Zone','Market Wizards','How to Make Money in Stocks','Way of the Turtle','Ο Douglas εξηγεί γιατί πρέπει να σκέφτεσαι με πιθανότητες και να δέχεσαι ότι κάθε συναλλαγή είναι αβέβαιη.'],['Какую книгу о психологии трейдинга написал Марк Дуглас?','Trading in the Zone','Market Wizards','How to Make Money in Stocks','Way of the Turtle','Дуглас объясняет, почему нужно мыслить вероятностями и принимать неопределённость каждой сделки.']],
['grt','expectancy',1,['Ποιος έκανε γνωστή την ιδέα των R-multiples;','Jesse Livermore','Van K. Tharp','Stan Weinstein','Linda Raschke','Ο Van Tharp έμαθε σε πολλούς traders να μετράνε κάθε αποτέλεσμα σε πολλαπλάσια του ρίσκου (R) και να υπολογίζουν expectancy.'],['Кто популяризировал идею R-мультипликаторов?','Джесси Ливермор','Ван К. Тарп','Стэн Вайнштейн','Линда Рашке','Ван Тарп научил многих трейдеров измерять результат в кратных риска (R) и считать матожидание.']],
['grt','risk',2,['Τι λέει ο κανόνας του 6% του Alexander Elder;','Ρίσκο 6% ανά συναλλαγή','Στόχος 6% τον μήνα','Σταματάς για τον υπόλοιπο μήνα αν οι απώλειες φτάσουν 6% του λογαριασμού','Αγοράζεις μετά από πτώση 6%','Μαζί με το όριο 2% ανά συναλλαγή, ο κανόνας του 6% λειτουργεί σαν μηνιαίο φρένο.'],['Что гласит правило 6% Александра Элдера?','Риск 6% на сделку','Цель 6% в месяц','Остановиться до конца месяца, если убытки достигли 6% счёта','Покупать после падения на 6%','Вместе с лимитом 2% на сделку правило 6% работает как месячный тормоз.']],
['grt','s-donchian',3,['Τι έπαιζαν κυρίως οι «Turtles» του Richard Dennis;','Scalping ειδήσεων','Αντιστροφές με RSI','Επενδύσεις σε μερίσματα','Σπασίματα καναλιών (Donchian) με trend following','Κανόνες σπασίματος με stop βάσει ATR. Η επιτυχία τους έδειξε ότι η πειθαρχία μετράει περισσότερο από το ταλέντο.'],['Что в основном торговали «Черепахи» Ричарда Денниса?','Скальпинг новостей','Развороты по RSI','Дивидендные инвестиции','Пробои каналов (Дончиан) по тренду','Правила пробоя со стопом по ATR. Их успех показал, что дисциплина важнее таланта.']],
['grt','',0,['Σε ποιο στάδιο αγοράζεις σύμφωνα με τον Stan Weinstein;','Στάδιο 2: άνοδος πάνω από τον ανοδικό 30-εβδομαδιαίο μέσο','Στάδιο 1: βάση','Στάδιο 3: κορυφή','Στάδιο 4: πτώση','Στο στάδιο 2 η τάση είναι ανοδική και ο μέσος των 30 εβδομάδων ανεβαίνει.'],['На какой стадии покупать по Стэну Вайнштейну?','Стадия 2: рост выше растущей 30-недельной средней','Стадия 1: база','Стадия 3: вершина','Стадия 4: падение','На стадии 2 тренд восходящий, а 30-недельная средняя растёт.']],
['grt','',1,['Τι συμβούλευε ο William O\'Neil για μια μετοχή που πέφτει κάτω από την τιμή αγοράς;','Να αγοράζεις κι άλλη','Να την πουλάς χωρίς συζήτηση στο −7/8%','Να περιμένεις τα αποτελέσματα','Να τη κρατάς για χρόνια','Μικρές απώλειες κρατούν το κεφάλαιο για τις μεγάλες επιτυχίες.'],['Что советовал Уильям О\'Нил при падении акции ниже цены покупки?','Докупать','Продавать без обсуждений на −7–8%','Ждать отчётности','Держать годами','Маленькие убытки сохраняют капитал для больших побед.']],
['grt','s-pullback',2,['Το «Holy Grail» της Linda Raschke είναι…','αγορά σε κάθε gap','short στο RSI 70','πρώτη επιστροφή στον EMA 20 σε δυνατή τάση (ADX > 30)','DCA κάθε μήνα','Ένα απλό, καθαρό setup που επαναλαμβάνεται: τάση + pullback.'],['«Святой Грааль» Линды Рашке — это…','покупка на каждом гэпе','шорт на RSI 70','первый откат к EMA 20 в сильном тренде (ADX > 30)','DCA каждый месяц','Простой, чёткий повторяющийся сетап: тренд + откат.']],
['grt','',3,['Τι έδειξαν οι συνεντεύξεις του Jack Schwager στα Market Wizards;','Ότι όλοι χρησιμοποιούν τον ίδιο δείκτη','Ότι η μόχλευση είναι το μυστικό','Ότι κερδίζουν μόνο με ειδήσεις','Ότι κάνουν διαφορετικά πράγματα, αλλά όλοι ελέγχουν αυστηρά το ρίσκο','Δεν υπάρχει μία μέθοδος. Υπάρχουν αρχές: ρίσκο, πειθαρχία, μέθοδος που σου ταιριάζει.'],['Что показали интервью Джека Швагера в «Магах рынка»?','Что все используют один индикатор','Что секрет в плече','Что зарабатывают только на новостях','Что делают разное, но все жёстко контролируют риск','Единого метода нет. Есть принципы: риск, дисциплина, метод, подходящий вам.']],
['grt','',0,['Ποια είναι η «εξίσωση του trader» κατά τον Al Brooks;','Πιθανότητα × κέρδος > (1 − πιθανότητα) × ρίσκο','Κέρδος = όγκος × τιμή','R = στόχος − είσοδος','Επιτυχία > 50% πάντα','Αν η εξίσωση δεν βγαίνει θετική, η συναλλαγή δεν αξίζει, όσο ωραίο κι αν φαίνεται το setup.'],['Каково «уравнение трейдера» по Элу Бруксу?','Вероятность × прибыль > (1 − вероятность) × риск','Прибыль = объём × цена','R = цель − вход','Винрейт > 50% всегда','Если уравнение не положительное, сделка не стоит того, каким бы красивым ни казался сетап.']],
['grt','',1,['Ποιο είναι το βασικό μάθημα του «Reminiscences of a Stock Operator» για τα μεγάλα κέρδη;','Συχνές συναλλαγές','Υπομονή: να κάθεσαι στη σωστή θέση','Να ακούς συμβουλές','Να αποφεύγεις τις τάσεις','Ο ήρωας του βιβλίου (βασισμένος στον Livermore) λέει ότι τα μεγάλα κέρδη ήρθαν από το ότι κάθισε στη θέση.'],['Какой главный урок «Воспоминаний биржевого спекулянта» о больших прибылях?','Частые сделки','Терпение: сидеть в правильной позиции','Слушать советы','Избегать трендов','Герой книги (прототип — Ливермор) говорит, что большие прибыли пришли от того, что он сидел в позиции.']]
];

var QBANK_X=[["psy", "p-biases", 3, ["Έχασες δύο συναλλαγές στη σειρά και θες «να τα πάρεις πίσω» αμέσως. Πώς λέγεται αυτό;", "Scalping", "Hedging", "Πειθαρχία", "Revenge trading (συναλλαγή εκδίκησης)", "Η επιθυμία να «ρεφάρεις» αμέσως οδηγεί σε μεγαλύτερες και χειρότερες θέσεις. Το σωστό είναι διάλειμμα και επιστροφή στους κανόνες."], null, 1], ["psy", "p-biases", 2, ["Το BTC ανέβηκε 8% σε μία ώρα και μπαίνεις long χωρίς σχέδιο γιατί «θα χάσεις την ευκαιρία». Αυτό είναι:", "Υπερπώληση", "Διαφοροποίηση", "FOMO", "Μέσος όρος κόστους", "Fear Of Missing Out: μπαίνεις αργά, συνήθως κοντά στην κορυφή, χωρίς σωστό stop."], null, 1], ["psy", "p-biases", 1, ["Μετά από 6 κερδισμένες στη σειρά διπλασιάζεις το ρίσκο ανά συναλλαγή. Ποια προκατάληψη δείχνει αυτό;", "Αποστροφή στην απώλεια", "Υπερεμπιστοσύνη", "Φόβος", "Επιβεβαίωση από την αγορά", "Ένα σερί κερδών δεν αλλάζει το edge σου. Το ρίσκο μένει σταθερό, αλλιώς μία κακή μέρα σβήνει όλο το σερί."], null, 2], ["psy", "p-biases", 0, ["Κρατάς μια χαμένη θέση πολύ πέρα από το stop «μέχρι να γυρίσει». Πώς λέγεται η προκατάληψη;", "Αποστροφή στην απώλεια (loss aversion)", "Ψευδαίσθηση ελέγχου", "Recency bias", "Anchoring στο όγκο", "Ο πόνος της απώλειας είναι περίπου διπλάσιος από τη χαρά του ίδιου κέρδους, γι' αυτό δυσκολευόμαστε να κλείσουμε ζημιές."], null, 2], ["psy", "p-biases", 3, ["Ψάχνεις μόνο ειδήσεις και tweets που συμφωνούν με τη long θέση σου. Αυτό είναι:", "Ανάλυση ρευστότητας", "Sentiment analysis", "Ορθολογική έρευνα", "Προκατάληψη επιβεβαίωσης (confirmation bias)", "Βλέπεις ό,τι επιβεβαιώνει την άποψή σου και αγνοείς τα αντίθετα στοιχεία. Γράψε από πριν τι θα σε έκανε να κλείσεις."], null, 2], ["psy", "p-biases", 2, ["Αγόρασες στο 100, πέφτει στο 80 και δεν πουλάς «γιατί το αγόρασα 100». Ποια προκατάληψη είναι;", "Μέσος όρος", "Momentum", "Anchoring (άγκυρα στην τιμή αγοράς)", "Rebalancing", "Η αγορά δεν ξέρει τι πλήρωσες. Η απόφαση πρέπει να βασίζεται στο σχέδιο και στο stop, όχι στην τιμή εισόδου."], null, 2], ["psy", "p-evidence", 1, ["Οι τρεις τελευταίες συναλλαγές με breakout βγήκαν χαμένες και αποφασίζεις ότι η στρατηγική «δεν δουλεύει». Τι λάθος κάνεις;", "Σωστή αξιολόγηση", "Recency bias: κρίνεις από πολύ μικρό δείγμα", "Overfitting δεικτών", "Υπερβολικό backtest", "Μια στρατηγική με 45% επιτυχία έχει συχνά 3, 5 ή και 8 χαμένες στη σειρά. Χρειάζονται 30+ συναλλαγές για συμπεράσματα."], null, 2], ["psy", "p-evidence", 0, ["Τι σημαίνει «σκέφτομαι με πιθανότητες» κατά τον Mark Douglas;", "Κάθε συναλλαγή είναι τυχαία, το edge φαίνεται σε πολλές συναλλαγές", "Κάθε setup κερδίζει αν περιμένεις", "Το πλάνο εγγυάται κέρδος", "Ο καλός trader προβλέπει την αγορά", "Μια μεμονωμένη συναλλαγή μπορεί να χάσει ακόμα και με τέλειο setup. Το πλεονέκτημα εμφανίζεται στη σειρά των συναλλαγών."], null, 3], ["psy", "p-routine", 3, ["Ποιο είναι το καλύτερο πρώτο βήμα της ημέρας πριν ανοίξεις οποιαδήποτε θέση;", "Άμεση είσοδος στο άνοιγμα", "Αύξηση μόχλευσης", "Έλεγχος των social media για tips", "Check-in: διάθεση, επίπεδα, νέα και όρια ημέρας", "Η ρουτίνα πριν την αγορά μειώνει τις παρορμητικές αποφάσεις και σε βάζει στο πλάνο."], null, 1], ["psy", "p-routine", 2, ["Είσαι κουρασμένος και θυμωμένος από τη δουλειά. Τι κάνεις με το trading εκείνο το βράδυ;", "Παίζω μεγαλύτερο για να ξεσπάσω", "Μπαίνω χωρίς stop", "Δεν ανοίγω συναλλαγές ή μειώνω το μέγεθος", "Ακολουθώ σήματα από Telegram", "Η συναισθηματική κατάσταση επηρεάζει τις αποφάσεις. Πολλοί επαγγελματίες έχουν κανόνα «όχι trading όταν δεν είμαι καλά»."], null, 1], ["psy", "p-routine", 1, ["Ποιο είναι το κύριο όφελος του ημερολογίου συναλλαγών (journal);", "Αυξάνει την πιθανότητα κάθε συναλλαγής", "Βλέπεις μοτίβα λαθών και τι πραγματικά αποδίδει", "Αντικαθιστά το stop loss", "Είναι υποχρεωτικό για φόρους", "Χωρίς καταγραφή θυμάσαι επιλεκτικά. Με journal μετράς: ποια ώρα, ποια στρατηγική, ποια διάθεση σε κοστίζει."], null, 2], ["psy", "p-checklist", 0, ["Γιατί βοηθάει ένα checklist πριν από κάθε είσοδο;", "Ελέγχει ότι το setup ταιριάζει με το σχέδιο πριν μπεις", "Εγγυάται κέρδος", "Αντικαθιστά την ανάλυση", "Αυξάνει τη μόχλευση", "Όπως οι πιλότοι, το checklist κόβει τα «βιαστικά» λάθη: χωρίς stop, κόντρα στη μεγάλη τάση, πάνω από το όριο ημέρας."], null, 1], ["psy", "p-change", 3, ["Πότε είναι λογικό να αλλάξεις στρατηγική;", "Μετά από 2 χαμένες", "Όταν ένας φίλος κερδίζει με άλλη", "Κάθε εβδομάδα για ποικιλία", "Όταν μετά από επαρκές δείγμα (30-50+) το expectancy είναι αρνητικό", "Η συχνή αλλαγή σε κρατά μόνιμα αρχάριο. Κρίνεις με αριθμούς, σε αρκετές συναλλαγές, και αφού τηρήθηκαν οι κανόνες."], null, 2], ["psy", "p-evidence", 2, ["Μια στρατηγική έχει 40% επιτυχία και μέσο κέρδος 2,5R με μέση απώλεια 1R. Ποιο είναι το expectancy ανά συναλλαγή;", "−0,2R", "+1,0R", "+0,6R", "+0,4R", "0,40 × 2,5 − 0,60 × 1 = 1,0 − 0,6 = +0,6R. Κερδοφόρα παρόλο που χάνει τις περισσότερες."], null, 3], ["psy", "p-biases", 1, ["Το «gambler's fallacy» στο trading σημαίνει ότι:", "Κάνεις διαφοροποίηση", "Πιστεύεις ότι μετά από 5 χαμένες «πρέπει» να έρθει κερδισμένη", "Μειώνεις ρίσκο μετά από ζημιά", "Χρησιμοποιείς stop loss", "Κάθε συναλλαγή είναι ανεξάρτητη. Η πιθανότητα δεν «χρωστάει» τίποτα μετά από ένα σερί."], null, 3], ["psy", "breakers", 0, ["Έφτασες το όριο απώλειας της ημέρας (π.χ. −2R). Τι κάνεις;", "Σταματάς για σήμερα", "Διπλασιάζεις για να ρεφάρεις", "Αλλάζεις σε μικρότερο timeframe", "Μετακινείς τα stop πιο μακριά", "Το όριο ημέρας προστατεύει τον λογαριασμό από tilt. Αύριο είναι νέα μέρα με καθαρό μυαλό."], null, 1], ["psy", "p-routine", 3, ["Τι είναι «tilt» στο trading;", "Μοτίβο κεριών", "Τύπος εντολής", "Δείκτης όγκου", "Συναισθηματική κατάσταση που σε κάνει να παίζεις παράλογα", "Ο όρος έρχεται από το πόκερ. Σημάδια: θυμός, βιασύνη, μεγαλύτερες θέσεις. Θεραπεία: διάλειμμα."], null, 2], ["psy", "p-evidence", 2, ["Γιατί οι περισσότεροι αρχάριοι κλείνουν νωρίς τα κέρδη αλλά αφήνουν τις ζημιές να τρέχουν;", "Λόγω προμηθειών", "Λόγω κακών δεικτών", "Αποστροφή στην απώλεια και φόβος να χαθεί το κέρδος", "Λόγω μόχλευσης μόνο", "Το αντίθετο του σωστού: «κόψε τις ζημιές νωρίς, άσε τα κέρδη να τρέξουν». Βοηθάει ο προκαθορισμένος στόχος και stop."], null, 2], ["risk", "possize", 1, ["Τι σημαίνει «1R» σε μια συναλλαγή;", "Το κέρδος στον στόχο", "Το ποσό που χάνεις αν χτυπήσει το stop", "Η μόχλευση", "Η προμήθεια", "Το R είναι η μονάδα ρίσκου. Κέρδος 2R σημαίνει ότι κέρδισες το διπλάσιο από όσα ρίσκαρες."], null, 1], ["risk", "possize", 0, ["Λογαριασμός 5.000 $, ρίσκο 2%. Πόσα δολάρια ρισκάρεις ανά συναλλαγή;", "100 $", "50 $", "200 $", "250 $", "5.000 × 2% = 100 $. Αυτό είναι το 1R σου."], null, 1], ["risk", "possize", 3, ["Λογαριασμός 10.000 $, ρίσκο 1%. Long ETH στο 2.000 με stop 1.950. Πόσα ETH αγοράζεις;", "1 ETH", "5 ETH", "0,5 ETH", "2 ETH", "Ρίσκο 100 $. Απόσταση 50 $. 100 ÷ 50 = 2 ETH."], null, 2], ["risk", "possize", 2, ["Αν απομακρύνεις το stop στη διπλή απόσταση και θες το ίδιο ρίσκο σε $, η ποσότητα πρέπει να:", "Διπλασιαστεί", "Μείνει ίδια", "Μειωθεί στο μισό", "Τριπλασιαστεί", "Ρίσκο = ποσότητα × απόσταση. Διπλή απόσταση → μισή ποσότητα για το ίδιο ρίσκο."], null, 2], ["risk", "breakeven", 1, ["Με λόγο κέρδους/ρίσκου 1:3, ποιο είναι το ελάχιστο ποσοστό επιτυχίας για να μη χάνεις;", "33%", "25%", "50%", "15%", "1 ÷ (1+3) = 25%. Πάνω από αυτό είσαι κερδοφόρος πριν τις προμήθειες."], null, 2], ["risk", "drawdown", 0, ["Ο λογαριασμός έπεσε 20%. Πόσο πρέπει να ανέβει για να επιστρέψει;", "25%", "20%", "30%", "40%", "Από 100 σε 80. Για να γίνει πάλι 100 χρειάζεται 20/80 = 25%."], null, 2], ["risk", "streak", 3, ["Με 50% επιτυχία, ποια είναι περίπου η πιθανότητα να δεις 6 χαμένες στη σειρά σε 100 συναλλαγές;", "Κάτω από 1%", "Περίπου 5%", "Αδύνατο", "Πάνω από 50%", "Σε μακριές σειρές τα σερί απωλειών είναι πολύ πιο συχνά απ' όσο νομίζουμε. Γι' αυτό το ρίσκο ανά συναλλαγή μένει μικρό."], null, 3], ["risk", "leverage", 2, ["Με μόχλευση 10x, μια κίνηση 1% κόντρα σου κοστίζει περίπου:", "1% του περιθωρίου", "0,1% του περιθωρίου", "10% του περιθωρίου", "100% του περιθωρίου", "Η μόχλευση πολλαπλασιάζει τη θέση. 1% × 10 = 10% πάνω στο κεφάλαιο που έβαλες."], null, 1], ["risk", "leverage", 1, ["Γιατί λένε ότι «το ρίσκο το ορίζει το stop, όχι η μόχλευση»;", "Η μόχλευση δεν επηρεάζει τίποτα", "Η ζημιά σε $ = ποσότητα × απόσταση stop, ανεξάρτητα από τη μόχλευση", "Το stop αυξάνει τη μόχλευση", "Η μόχλευση μηδενίζει το ρίσκο", "Η μόχλευση αλλάζει μόνο πόσο κεφάλαιο δεσμεύεται. Με σωστό position sizing, η ζημιά είναι ίδια με 2x ή 20x."], null, 2], ["risk", "leverage", 0, ["Long με 20x: περίπου σε πόση πτώση της τιμής ρευστοποιείσαι (χωρίς προμήθειες);", "Περίπου 5%", "Περίπου 20%", "Περίπου 0,5%", "Περίπου 50%", "1 ÷ 20 = 5%. Γι' αυτό με υψηλή μόχλευση το stop πρέπει να είναι πριν τη ρευστοποίηση."], null, 3], ["risk", "correlation", 3, ["Έχεις long σε BTC, ETH και SOL ταυτόχρονα με 1% ρίσκο το καθένα. Ποιο είναι το πραγματικό πρόβλημα;", "Κανένα, είναι διαφοροποίηση", "Οι προμήθειες", "Δεν μπορείς να έχεις 3 θέσεις", "Είναι συσχετισμένα: στην πράξη ρισκάρεις κοντά στο 3% σε ένα «στοίχημα»", "Τα crypto κινούνται συχνά μαζί. Μέτρα το συνολικό ρίσκο ανά «ιδέα», όχι ανά σύμβολο."], null, 2], ["risk", "expectancy", 2, ["Τι μετράει το «profit factor»;", "Κέρδος ανά ημέρα", "Ποσοστό επιτυχίας", "Συνολικά κέρδη ÷ συνολικές ζημιές", "Μέγιστη πτώση", "Πάνω από 1 σημαίνει κερδοφόρο σύστημα. Πολλοί θέλουν 1,5+ για σιγουριά μετά τις προμήθειες."], null, 3], ["risk", "costs", 1, ["Κάνεις scalping με στόχο 0,2% και πληρώνεις 0,1% προμήθεια ανά πλευρά. Τι συμβαίνει;", "Τίποτα σημαντικό", "Οι προμήθειες τρώνε όλο το κέρδος", "Αυξάνεται το κέρδος", "Μειώνεται το ρίσκο", "0,1% στην είσοδο + 0,1% στην έξοδο = 0,2%. Σε μικρούς στόχους τα κόστη αποφασίζουν αν είσαι κερδοφόρος."], null, 2], ["risk", "breakers", 0, ["Γιατί πολλοί traders βάζουν και εβδομαδιαίο όριο απώλειας;", "Για να σταματήσουν πριν μια κακή εβδομάδα γίνει καταστροφή", "Για να παίζουν περισσότερο", "Για φορολογικούς λόγους", "Το απαιτεί το ανταλλακτήριο", "Ένα σερί κακών ημερών συχνά σημαίνει ότι η αγορά άλλαξε ή εσύ δεν είσαι σε καλή φάση. Παύση και επανεξέταση."], null, 2], ["risk", "orders", 3, ["Πότε πρέπει να μπαίνει το stop loss;", "Όταν η θέση πάει κόντρα", "Στο τέλος της ημέρας", "Μόνο σε μεγάλες θέσεις", "Αμέσως μαζί με την είσοδο", "Αν το stop δεν είναι στην αγορά, μία απότομη κίνηση μπορεί να σου κοστίσει πολλαπλάσια από 1R."], null, 1], ["cdl", "candle", 2, ["Τι δείχνει το σώμα (body) ενός κεριού;", "Μόνο το υψηλό", "Τον όγκο", "Την απόσταση ανοίγματος-κλεισίματος", "Το spread", "Μεγάλο σώμα = καθαρή νίκη αγοραστών ή πωλητών. Οι σκιές δείχνουν πού απορρίφθηκε η τιμή."], null, 1], ["cdl", "candle", 1, ["Ένα πράσινο κερί σημαίνει ότι:", "Ο όγκος ήταν μεγάλος", "Το κλείσιμο ήταν πάνω από το άνοιγμα", "Η τιμή δεν έπεσε καθόλου", "Η τάση είναι σίγουρα ανοδική", "Το χρώμα δείχνει μόνο ότι το κλείσιμο ήταν ψηλότερα από το άνοιγμα στη συγκεκριμένη περίοδο."], null, 1], ["cdl", "hammer", 0, ["Ένα σφυρί (hammer) έχει:", "Μικρό σώμα πάνω και μακριά κάτω σκιά", "Μεγάλο σώμα χωρίς σκιές", "Μακριά πάνω σκιά", "Δύο ίσα σώματα", "Η μακριά κάτω σκιά δείχνει ότι οι πωλητές έριξαν την τιμή αλλά οι αγοραστές την ανέβασαν ξανά."], null, 1], ["cdl", "hammer", 3, ["Πού έχει περισσότερη αξία ένα σφυρί;", "Στη μέση ενός range", "Μετά από μεγάλη άνοδο", "Σε οποιοδήποτε σημείο", "Σε στήριξη μετά από πτώση", "Το κερί χωρίς τοποθεσία είναι θόρυβος. Σε στήριξη, μετά από πτώση, δείχνει απόρριψη χαμηλότερων τιμών."], null, 2], ["cdl", "engulfing", 2, ["Στο bullish engulfing, το δεύτερο κερί:", "Είναι doji", "Είναι μικρότερο από το πρώτο", "Είναι πράσινο και καλύπτει όλο το σώμα του προηγούμενου κόκκινου", "Είναι κόκκινο", "Δείχνει ότι οι αγοραστές πήραν τον έλεγχο. Χρειάζεται επιβεβαίωση και σωστό σημείο."], null, 1], ["cdl", "doji", 1, ["Τι δείχνει ένα doji;", "Δυνατή άνοδο", "Αναποφασιστικότητα: άνοιγμα ≈ κλείσιμο", "Δυνατή πτώση", "Μεγάλο όγκο", "Ισορροπία αγοραστών-πωλητών. Μόνο του δεν είναι σήμα, μετράει το πλαίσιο."], null, 1], ["cdl", "star", 0, ["Το πρωινό αστέρι (morning star) αποτελείται από:", "Μεγάλο κόκκινο, μικρό κερί, μεγάλο πράσινο", "Τρία πράσινα", "Δύο doji", "Πράσινο, κόκκινο, πράσινο ίδιου μεγέθους", "Μοτίβο αντιστροφής σε πυθμένα: πτώση, δισταγμός, ανάκαμψη."], null, 2], ["cdl", "shootingstar", 3, ["Ένα πεφταστέρι (shooting star) σε αντίσταση μετά από άνοδο δείχνει:", "Συνέχεια ανόδου", "Ουδέτερη αγορά", "Αύξηση όγκου", "Απόρριψη υψηλότερων τιμών, πιθανή πτώση", "Μακριά πάνω σκιά: οι αγοραστές ανέβασαν την τιμή αλλά οι πωλητές την έριξαν πίσω."], null, 2], ["cdl", "insidebar", 2, ["Τι είναι ένα inside bar;", "Κερί με gap", "Κερί μεγαλύτερο από το προηγούμενο", "Κερί που είναι ολόκληρο μέσα στο εύρος του προηγούμενου", "Κερί χωρίς σώμα", "Δείχνει συμπίεση. Πολλοί παίζουν το σπάσιμο του mother bar με stop στην άλλη πλευρά."], null, 2], ["cdl", "marubozu", 1, ["Ένα marubozu είναι:", "Κερί με μόνο σκιές", "Κερί με μεγάλο σώμα και σχεδόν καθόλου σκιές", "Μικρό κερί", "Κερί doji", "Ο ένας τύπος (αγοραστές ή πωλητές) κυριάρχησε όλη την περίοδο. Δείχνει δύναμη."], null, 2], ["cdl", "crows", 0, ["Τρία μαύρα κοράκια (three black crows) είναι σήμα:", "Πτωτικό: τρία διαδοχικά δυνατά κόκκινα κεριά", "Ανοδικό", "Ουδέτερο", "Συμπίεσης", "Εμφανίζεται συνήθως μετά από άνοδο και δείχνει αλλαγή ελέγχου προς τους πωλητές."], null, 2], ["cdl", "candle", 3, ["Γιατί ένα σήμα κεριού στο 1D αξίζει περισσότερο από το ίδιο στο 1m;", "Είναι πιο όμορφο", "Έχει μικρότερο spread", "Δεν έχει σκιές", "Αντιπροσωπεύει πολύ περισσότερες συναλλαγές και συμμετέχοντες", "Τα μεγαλύτερα timeframes έχουν λιγότερο θόρυβο. Ένα σφυρί στο ημερήσιο «ζυγίζει» περισσότερο."], null, 3], ["cdl", "tweezer", 2, ["Tweezer bottom σημαίνει:", "Δύο κεριά με ίδιο σώμα", "Κερί με gap", "Δύο κεριά με σχεδόν ίδιο χαμηλό σε στήριξη", "Τρία ίδια κεριά", "Η αγορά «δοκίμασε» το ίδιο χαμηλό δύο φορές και απέτυχε να πέσει χαμηλότερα."], null, 3], ["cdl", "harami", 1, ["Το bullish harami είναι:", "Μεγάλο πράσινο μετά από μικρό κόκκινο", "Μεγάλο κόκκινο κερί και μετά μικρό πράσινο μέσα στο σώμα του", "Τρία πράσινα κεριά", "Ένα doji στην κορυφή", "Δείχνει επιβράδυνση της πτώσης. Πιο αδύναμο σήμα από το engulfing, θέλει επιβεβαίωση."], null, 2], ["pat", "double", 0, ["Η διπλή κορυφή (double top) είναι συνήθως σχηματισμός:", "Αντιστροφής προς τα κάτω", "Συνέχειας ανόδου", "Ουδέτερος", "Μόνο για crypto", "Δύο αποτυχημένες προσπάθειες να περάσει την ίδια αντίσταση. Επιβεβαιώνεται με σπάσιμο του neckline."], null, 1], ["pat", "double", 3, ["Πώς υπολογίζεται συνήθως ο στόχος μιας διπλής κορυφής;", "Διπλάσιο της κορυφής", "Με τον RSI", "Στο προηγούμενο ATH", "Ύψος σχηματισμού προβαλλόμενο κάτω από το neckline", "Measured move: η απόσταση κορυφή-neckline αφαιρείται από το σημείο σπασίματος."], null, 2], ["pat", "flag", 2, ["Η ανοδική σημαία (bull flag) είναι:", "Σχηματισμός αντιστροφής", "Μοτίβο κεριού", "Σχηματισμός συνέχειας μετά από δυνατή άνοδο", "Δείκτης", "Ο «ιστός» είναι η δυνατή άνοδος και η «σημαία» μια μικρή διόρθωση πριν τη συνέχεια."], null, 1], ["pat", "hs", 1, ["Στους ώμους-κεφαλή-ώμους, πότε επιβεβαιώνεται ο σχηματισμός;", "Όταν σχηματιστεί το κεφάλι", "Όταν η τιμή κλείσει κάτω από το neckline", "Στον αριστερό ώμο", "Όταν ανέβει ο RSI", "Πριν το σπάσιμο του neckline είναι απλώς μια πιθανότητα. Πολλοί περιμένουν και retest."], null, 2], ["pat", "asctri", 0, ["Το ανοδικό τρίγωνο έχει:", "Οριζόντια αντίσταση και ανερχόμενα χαμηλά", "Πτωτικά υψηλά και οριζόντια στήριξη", "Δύο παράλληλες γραμμές", "Κυκλικό σχήμα", "Οι αγοραστές πιέζουν όλο και ψηλότερα: συχνά σπάει προς τα πάνω."], null, 2], ["pat", "wedge", 3, ["Η ανοδική σφήνα (rising wedge) μετά από άνοδο συνήθως είναι σήμα:", "Ανοδικό", "Ουδέτερο", "Συνέχειας ανόδου πάντα", "Πτωτικό", "Τα υψηλά ανεβαίνουν πιο αργά από τα χαμηλά: η ορμή εξασθενεί."], null, 3], ["pat", "range", 2, ["Τι είναι ένα range;", "Ισχυρή τάση", "Gap", "Η τιμή κινείται πλάγια ανάμεσα σε στήριξη και αντίσταση", "Μοτίβο κεριού", "Σε range παίζεις άκρα ή περιμένεις σπάσιμο. Η στρατηγική τάσης δεν δουλεύει καλά εκεί."], null, 1], ["pat", "gaps", 1, ["Τι είναι ένα breakaway gap;", "Κενό που κλείνει αμέσως", "Κενό που ξεκινά νέα τάση, συνήθως με μεγάλο όγκο", "Κενό στο τέλος τάσης", "Κενό χωρίς σημασία", "Συχνά μετά από ειδήσεις ή σπάσιμο range. Τα breakaway gaps δεν κλείνουν πάντα γρήγορα."], null, 2], ["pat", "cup", 0, ["Ο σχηματισμός κύπελλο με λαβή (cup and handle) είναι:", "Ανοδικός συνέχειας, στρογγυλός πυθμένας και μικρή διόρθωση", "Πτωτικός αντιστροφής", "Μοτίβο ενός κεριού", "Δείκτης όγκου", "Τον έκανε γνωστό ο William O'Neil. Η είσοδος συνήθως στο σπάσιμο της λαβής με όγκο."], null, 2], ["pat", "symtri", 3, ["Σε συμμετρικό τρίγωνο, προς τα πού σπάει συνήθως;", "Πάντα πάνω", "Πάντα κάτω", "Ποτέ δεν σπάει", "Δεν είναι σίγουρο, συχνά προς την προηγούμενη τάση", "Είναι συμπίεση αναποφασιστικότητας. Περιμένεις το σπάσιμο, ιδανικά με όγκο."], null, 2], ["pat", "channelpat", 2, ["Σε ανοδικό κανάλι, πού ψάχνουν οι περισσότεροι long είσοδο;", "Στην πάνω γραμμή", "Στη μέση πάντα", "Κοντά στην κάτω γραμμή του καναλιού", "Μετά το σπάσιμο προς τα κάτω", "Αγοράζεις στη στήριξη της τάσης με stop λίγο κάτω από το κανάλι."], null, 1], ["pat", "abcd", 1, ["Στο μοτίβο ABCD, συνήθως η κίνηση CD είναι:", "Πάντα διπλάσια", "Περίπου ίση με την AB", "Μηδενική", "Αντίθετη από AB", "Measured move: η δεύτερη ώθηση συχνά έχει παρόμοιο μέγεθος με την πρώτη."], null, 3], ["pat", "doubletop", 0, ["Γιατί πολλά σπασίματα neckline αποτυγχάνουν σε αγορές με χαμηλό όγκο;", "Δεν υπάρχει αρκετή συμμετοχή για να συνεχιστεί η κίνηση", "Λόγω του RSI", "Γιατί τα gap κλείνουν", "Γιατί η τιμή είναι στρογγυλή", "Ο όγκος επιβεβαιώνει. Σπάσιμο χωρίς όγκο είναι συχνά παγίδα (fakeout)."], null, 3], ["pat", "island", 3, ["Η αναστροφή νησιού (island reversal) χαρακτηρίζεται από:", "Ένα doji", "Τρία ίδια κεριά", "Δύο κανάλια", "Gap προς τη μία πλευρά και μετά gap προς την άλλη", "Η τιμή «απομονώνεται» σαν νησί. Σπάνιο αλλά δυνατό σήμα αντιστροφής."], null, 3], ["ind", "rsi", 2, ["Ο RSI κινείται σε κλίμακα:", "−1 έως 1", "0 έως 10", "0 έως 100", "Χωρίς όρια", "Κλασικά πάνω από 70 θεωρείται υπεραγορά και κάτω από 30 υπερπώληση."], null, 1], ["ind", "rsi", 1, ["Σε δυνατή ανοδική τάση, ο RSI μένει πάνω από 70 για μέρες. Τι σημαίνει;", "Σίγουρη πτώση αύριο", "Δύναμη τάσης, όχι απαραίτητα σήμα πώλησης", "Λάθος δείκτη", "Πρέπει να μπεις short", "Σε τάσεις ο RSI «κολλάει» σε υπεραγορά. Short μόνο επειδή είναι 70+ είναι κλασικό λάθος."], null, 2], ["ind", "divergence", 0, ["Bearish divergence στον RSI σημαίνει:", "Η τιμή κάνει ψηλότερο υψηλό, ο RSI χαμηλότερο", "Και τα δύο ανεβαίνουν", "Η τιμή πέφτει και ο RSI ανεβαίνει", "Ο RSI είναι κάτω από 30", "Η ορμή εξασθενεί ενώ η τιμή ανεβαίνει. Προειδοποίηση, όχι σήμα από μόνο του."], null, 2], ["ind", "ma", 3, ["Ο EMA σε σχέση με τον SMA:", "Είναι πάντα πιο αργός", "Αγνοεί τις πρόσφατες τιμές", "Είναι το ίδιο ακριβώς", "Δίνει μεγαλύτερο βάρος στις πρόσφατες τιμές", "Γι' αυτό ο EMA αντιδρά πιο γρήγορα σε αλλαγές."], null, 1], ["ind", "macross", 2, ["Το «golden cross» είναι όταν:", "Ο RSI περνά το 50", "Ο MA 200 περνά πάνω από τον MA 50", "Ο MA 50 περνά πάνω από τον MA 200", "Η τιμή κάνει νέο ATH", "Θεωρείται ανοδικό σήμα μακροπρόθεσμα, αλλά έρχεται με καθυστέρηση."], null, 2], ["ind", "macd", 1, ["Η γραμμή MACD υπολογίζεται ως:", "SMA 50 μείον SMA 200", "EMA 12 μείον EMA 26", "RSI μείον 50", "Όγκος επί τιμή", "Η signal line είναι EMA 9 της γραμμής MACD και το histogram η διαφορά τους."], null, 2], ["ind", "bb", 0, ["Οι Bollinger Bands στενεύουν πολύ (squeeze). Τι περιμένουμε;", "Πιθανή έντονη κίνηση σύντομα", "Η τάση τελείωσε οριστικά", "Ο όγκος θα μηδενιστεί", "Τίποτα δεν θα γίνει", "Η χαμηλή μεταβλητότητα συνήθως ακολουθείται από υψηλή. Η κατεύθυνση δεν είναι γνωστή από πριν."], null, 2], ["ind", "atr", 3, ["Ο ATR μετράει:", "Την κατεύθυνση της τάσης", "Τον όγκο", "Την υπεραγορά", "Τη μέση μεταβλητότητα (εύρος κεριών)", "Χρήσιμος για stop: π.χ. stop στα 1,5×ATR από την είσοδο, ώστε να μη σε βγάζει ο θόρυβος."], null, 2], ["ind", "vwap", 2, ["Το VWAP χρησιμοποιείται κυρίως:", "Για εβδομαδιαία επενδύσεις", "Για υπολογισμό μερίσματος", "Intraday, ως «δίκαιη» μέση τιμή με βάση τον όγκο", "Μόνο σε forex", "Πολλοί θεσμικοί μετράνε την εκτέλεσή τους με το VWAP. Η τιμή πάνω του = αγοραστές στον έλεγχο."], null, 2], ["ind", "fib", 1, ["Ποια επίπεδα Fibonacci retracement χρησιμοποιούνται πιο συχνά;", "10%, 20%, 30%", "38,2%, 50%, 61,8%", "90%, 95%, 99%", "25%, 75%, 125%", "Το 61,8% λέγεται «χρυσή αναλογία». Το 50% δεν είναι Fibonacci αλλά χρησιμοποιείται παντού."], null, 1], ["ind", "stoch", 0, ["Ο Stochastic συγκρίνει:", "Το κλείσιμο με το εύρος υψηλού-χαμηλού μιας περιόδου", "Δύο κινητούς μέσους", "Τον όγκο με την τιμή", "Δύο διαφορετικά σύμβολα", "Κοντά στο 100 το κλείσιμο είναι κοντά στο υψηλό της περιόδου, κοντά στο 0 στο χαμηλό."], null, 2], ["ind", "adx", 3, ["Ο ADX πάνω από 25 δείχνει:", "Ανοδική τάση πάντα", "Range", "Υπερπώληση", "Δυνατή τάση (χωρίς να λέει κατεύθυνση)", "Ο ADX μετράει τη δύναμη. Την κατεύθυνση τη λένε τα +DI/−DI ή η τιμή."], null, 2], ["ind", "obv", 2, ["Το OBV ανεβαίνει ενώ η τιμή μένει επίπεδη. Τι μπορεί να σημαίνει;", "Διανομή", "Λάθος δεδομένα", "Συσσώρευση: ο όγκος στις ανοδικές μέρες είναι μεγαλύτερος", "Η τάση τελείωσε", "Η «έξυπνη» αγορά μπορεί να μαζεύει πριν την κίνηση της τιμής."], null, 3], ["ind", "ichimoku", 1, ["Στο Ichimoku, τι σημαίνει τιμή πάνω από το σύννεφο (kumo);", "Πτωτική τάση", "Ανοδική τάση", "Range πάντα", "Υπερπώληση", "Το σύννεφο λειτουργεί ως ζώνη στήριξης/αντίστασης. Πάνω του = ανοδικό περιβάλλον."], null, 3], ["ind", "pivots", 0, ["Τα pivot points υπολογίζονται από:", "Το υψηλό, το χαμηλό και το κλείσιμο της προηγούμενης περιόδου", "Τον RSI", "Τον όγκο της ημέρας", "Τις ειδήσεις", "P = (H+L+C)/3. Από εκεί βγαίνουν R1, R2, S1, S2 που πολλοί day traders παρακολουθούν."], null, 2], ["ind", "supertrend", 3, ["Ο Supertrend βασίζεται κυρίως σε:", "RSI", "Όγκο", "Fibonacci", "ATR και μέση τιμή", "Ακολουθεί την τάση με απόσταση ATR. Αλλάζει χρώμα όταν η τιμή τον σπάσει."], null, 2], ["ind", "divergence", 2, ["Hidden bullish divergence σημαίνει:", "Η τιμή κάνει νέο υψηλό", "Ο δείκτης κάνει νέο υψηλό", "Η τιμή κάνει ψηλότερο χαμηλό, ο δείκτης χαμηλότερο χαμηλό", "Και τα δύο πέφτουν", "Σήμα συνέχειας ανόδου: η διόρθωση είναι πιο ήπια στην τιμή απ' ό,τι στην ορμή."], null, 3], ["str", "s-pullback", 1, ["Στη στρατηγική pullback, πότε μπαίνεις long;", "Στην κορυφή της τάσης", "Όταν η τιμή διορθώνει μέσα σε ανοδική τάση και δείχνει ότι ξαναπαίρνει μπρος", "Σε πτωτική τάση", "Τυχαία", "Αγοράζεις «φθηνότερα» μέσα στην τάση, με stop κάτω από το χαμηλό του pullback."], null, 1], ["str", "s-breakout", 0, ["Ποιο είναι το μεγαλύτερο ρίσκο στα breakouts;", "Ψεύτικο σπάσιμο (fakeout)", "Πολύ μικρό stop", "Πολύ λίγος όγκος πάντα", "Δεν υπάρχει ρίσκο", "Γι' αυτό πολλοί ζητούν κλείσιμο έξω από το επίπεδο, όγκο, ή περιμένουν retest."], null, 2], ["str", "s-retest", 3, ["Στο break & retest, η παλιά αντίσταση μετά το σπάσιμο συχνά γίνεται:", "Πιο δυνατή αντίσταση", "Άσχετη", "Gap", "Στήριξη", "Role reversal: όσοι έχασαν την κίνηση αγοράζουν στο retest."], null, 2], ["str", "s-range", 2, ["Πότε ΔΕΝ πρέπει να παίζεις αντιστροφή στα άκρα ενός range;", "Όταν το range είναι καθαρό", "Όταν ο όγκος είναι χαμηλός", "Όταν υπάρχει ισχυρή τάση στο μεγαλύτερο timeframe", "Ποτέ", "Οι range στρατηγικές χάνουν όταν η αγορά ξεκινά τάση. Φίλτρο: μεγαλύτερο timeframe."], null, 2], ["str", "s-orb", 1, ["Τι είναι το Opening Range Breakout (ORB);", "Αγορά στο κλείσιμο", "Παίζεις το σπάσιμο του εύρους των πρώτων λεπτών της συνεδρίασης", "Πώληση πριν το άνοιγμα", "Μακροπρόθεσμη επένδυση", "Δημοφιλές σε μετοχές και DAX: π.χ. υψηλό/χαμηλό πρώτων 15 λεπτών."], null, 2], ["str", "s-dca", 0, ["Τι είναι το DCA (dollar cost averaging);", "Αγορά σταθερού ποσού σε τακτά διαστήματα", "Αγορά όλου του ποσού μία φορά", "Short με μόχλευση", "Scalping", "Μειώνει το ρίσκο κακού timing. Είναι επενδυτική μέθοδος, όχι στρατηγική trading."], null, 1], ["str", "s-scalp", 3, ["Τι χρειάζεται περισσότερο ένας scalper;", "Μεγάλη μόχλευση", "Πολλούς δείκτες", "Θεμελιώδη ανάλυση", "Χαμηλά κόστη και γρήγορη εκτέλεση", "Με μικρούς στόχους, spread και προμήθειες αποφασίζουν την κερδοφορία."], null, 2], ["str", "s-squeeze", 2, ["Στο Bollinger squeeze, πότε μπαίνεις;", "Μέσα στη συμπίεση", "Στη μέση της ζώνης", "Στο σπάσιμο της ζώνης μετά τη συμπίεση", "Πριν τη συμπίεση", "Η συμπίεση δείχνει ότι έρχεται κίνηση. Η είσοδος στο σπάσιμο, με stop απέναντι."], null, 2], ["str", "s-macdiv", 1, ["Γιατί μια στρατηγική απόκλισης χρειάζεται επιβεβαίωση;", "Δεν χρειάζεται", "Οι αποκλίσεις μπορούν να συνεχιστούν πολύ πριν αντιστραφεί η τιμή", "Γιατί ο MACD είναι λάθος", "Για τις προμήθειες", "Συχνή επιβεβαίωση: σπάσιμο δομής (CHoCH) ή κερί αντιστροφής σε επίπεδο."], null, 3], ["str", "s-rs", 0, ["Σε rotation με σχετική δύναμη, ποιες μετοχές προτιμάς;", "Όσες πέφτουν λιγότερο ή ανεβαίνουν περισσότερο από τον δείκτη", "Τις πιο αδύναμες", "Τυχαίες", "Μόνο penny stocks", "Οι ηγέτες συνήθως ηγούνται και στην επόμενη άνοδο."], null, 3], ["str", "s-vwap", 3, ["Στο VWAP pullback για long, τι ψάχνεις;", "Σπάσιμο κάτω από το VWAP", "Άνοιγμα με gap down", "Τιμή μακριά από το VWAP", "Επιστροφή στο VWAP σε ανοδική μέρα και αντίδραση πάνω του", "Το VWAP λειτουργεί σαν δυναμική στήριξη για intraday τάσεις."], null, 2], ["str", "s-fibconf", 2, ["Τι είναι «confluence» σε ένα setup;", "Πολλοί δείκτες που λένε το ίδιο πράγμα με άλλο τρόπο", "Μία μόνο ένδειξη", "Πολλοί ανεξάρτητοι λόγοι στο ίδιο σημείο (π.χ. Fib + στήριξη + EMA)", "Σύγχυση της αγοράς", "Η σύγκλιση ανεξάρτητων στοιχείων αυξάνει την πιθανότητα αντίδρασης."], null, 3], ["str", "s-grid", 1, ["Πότε δουλεύει καλύτερα το grid trading;", "Σε δυνατή τάση", "Σε πλάγια αγορά (range)", "Σε ειδήσεις", "Ποτέ", "Σε τάση το grid γεμίζει θέσεις κόντρα στην κίνηση και μπορεί να χάσει πολλά."], null, 2], ["str", "s-basis", 0, ["Στο funding/basis trade, τι εκμεταλλεύεσαι;", "Τη διαφορά spot και futures (ή το funding) με αντιστάθμιση", "Την κατεύθυνση της τιμής", "Τα gap", "Τους δείκτες ορμής", "Long spot + short perpetual: κερδίζεις το funding ενώ η τιμή δεν σε επηρεάζει πολύ."], null, 3], ["str", "s-pullback", 3, ["Πού μπαίνει λογικά το stop σε pullback long;", "Πάνω από την είσοδο", "Στο ATH", "Χωρίς stop", "Κάτω από το χαμηλό του pullback", "Αν η τιμή σπάσει το χαμηλό του pullback, η ιδέα «η τάση συνεχίζεται» ακυρώνεται."], null, 2], ["smc", "smc-structure", 2, ["Τι σημαίνει BOS (Break of Structure);", "Αλλαγή τάσης", "Μοτίβο κεριού", "Η τιμή σπάει το προηγούμενο swing προς την κατεύθυνση της τάσης", "Τύπος εντολής", "Σε ανοδική τάση, νέο ψηλότερο υψηλό πάνω από το προηγούμενο = BOS."], null, 1], ["smc", "smc-structure", 1, ["Τι είναι το CHoCH (Change of Character);", "Συνέχεια τάσης", "Το πρώτο σπάσιμο δομής κόντρα στην τάση", "Ένα gap", "Ένας δείκτης", "Π.χ. σε ανοδική τάση η τιμή σπάει το τελευταίο higher low: πιθανή αλλαγή κατεύθυνσης."], null, 2], ["smc", "smc-ob", 0, ["Ένα bullish order block είναι συνήθως:", "Το τελευταίο κόκκινο κερί πριν από δυνατή άνοδο", "Το πρώτο πράσινο κερί", "Ένα doji", "Η κορυφή της ημέρας", "Θεωρείται ζώνη όπου μπήκαν μεγάλες εντολές αγοράς. Συχνά η τιμή επιστρέφει εκεί."], null, 2], ["smc", "smc-fvg", 3, ["Τι είναι το Fair Value Gap (FVG);", "Gap του Σαββατοκύριακου", "Η διαφορά bid-ask", "Το spread της προμήθειας", "Κενό ανάμεσα σε τρία κεριά όπου η τιμή κινήθηκε πολύ γρήγορα", "Ανάμεσα στο υψηλό του 1ου και το χαμηλό του 3ου κεριού. Η τιμή συχνά επιστρέφει να το «γεμίσει»."], null, 1], ["smc", "smc-liq", 2, ["Πού βρίσκεται συνήθως η ρευστότητα (liquidity);", "Στη μέση του range", "Μόνο στο VWAP", "Πάνω από ίσα υψηλά και κάτω από ίσα χαμηλά (εκεί είναι τα stops)", "Στους δείκτες", "Τα stops των retail traders μαζεύονται σε προφανή σημεία. Η τιμή συχνά τα «σαρώνει»."], null, 2], ["smc", "smc-liq", 1, ["Τι είναι ένα liquidity sweep;", "Συνεχόμενη τάση", "Η τιμή περνά προσωρινά ένα επίπεδο, πιάνει τα stops και γυρίζει", "Ένα gap", "Μια διόρθωση 50%", "Συχνά ακολουθείται από αντιστροφή. Πολλοί περιμένουν CHoCH μετά το sweep."], null, 2], ["smc", "smc-pd", 0, ["Σε ανοδική τάση, πού ψάχνεις long κατά το SMC;", "Σε «discount» (κάτω από το 50% του swing)", "Σε premium", "Στο υψηλό", "Οπουδήποτε", "Αγοράζεις φθηνά μέσα στο εύρος. Το OTE (62-79%) είναι αγαπημένη ζώνη."], null, 2], ["smc", "smc-kz", 3, ["Τι είναι οι kill zones;", "Ζώνες ρευστοποίησης", "Τύπος stop", "Δείκτης", "Ώρες με αυξημένη ρευστότητα (π.χ. άνοιγμα Λονδίνου, Νέας Υόρκης)", "Οι μεγάλες κινήσεις συχνά γίνονται όταν ανοίγουν οι μεγάλες αγορές."], null, 2], ["smc", "smc-model", 2, ["Ποια σειρά περιγράφει ένα κλασικό SMC μοντέλο εισόδου;", "Είσοδος → stop → sweep", "RSI 30 → αγορά", "Sweep ρευστότητας → CHoCH → επιστροφή σε FVG/OB → είσοδος", "Gap → πώληση", "Το μοντέλο ζητά πρώτα «κυνήγι» stops, αλλαγή δομής και είσοδο σε ζώνη με καλό R:R."], null, 3], ["smc", "smc-fvg", 1, ["Τι είναι ένα inverse FVG (iFVG);", "FVG που δεν γέμισε ποτέ", "FVG που σπάστηκε και πλέον λειτουργεί από την άλλη πλευρά", "Δύο FVG μαζί", "FVG σε μεγάλο timeframe", "Όπως η στήριξη που γίνεται αντίσταση, το σπασμένο FVG αλλάζει ρόλο."], null, 3], ["smc", "smc-intro", 0, ["Τι προσπαθεί να εξηγήσει το Smart Money Concepts;", "Πώς κινούνται οι μεγάλοι παίκτες και η ρευστότητα", "Τα θεμελιώδη μιας εταιρείας", "Τα μερίσματα", "Τους φόρους", "Επικεντρώνεται σε δομή αγοράς, ρευστότητα και ζώνες εισόδου θεσμικών."], null, 1], ["smc", "smc-ob", 3, ["Ένα order block θεωρείται πιο αξιόπιστο όταν:", "Είναι πολύ παλιό και δοκιμασμένο 5 φορές", "Είναι σε range", "Δεν έχει όγκο", "Προκάλεσε BOS και έχει FVG μετά από αυτό", "Το «φρέσκο» OB που έσπασε δομή και άφησε imbalance έχει μεγαλύτερη πιθανότητα αντίδρασης."], null, 3], ["smc", "smc-structure", 2, ["Ποια είναι η διαφορά internal και swing structure;", "Δεν υπάρχει διαφορά", "Internal είναι μόνο για crypto", "Internal = μικρές κινήσεις μέσα στο swing, swing = η κύρια δομή", "Swing είναι μόνο για 1m", "Ένα internal CHoCH δεν αλλάζει απαραίτητα τη μεγάλη τάση. Πρώτα βλέπεις το swing."], null, 3], ["cry", "c-perp", 1, ["Ποια είναι η διαφορά spot και perpetual futures;", "Καμία", "Στο spot αγοράζεις το νόμισμα, στο perpetual ένα συμβόλαιο χωρίς λήξη", "Τα perpetual λήγουν κάθε μήνα", "Το spot έχει πάντα μόχλευση", "Τα perpetual έχουν funding rate που τα κρατά κοντά στην τιμή spot."], null, 1], ["cry", "c-funding", 0, ["Θετικό funding rate σημαίνει ότι:", "Οι long πληρώνουν τους short", "Οι short πληρώνουν τους long", "Το ανταλλακτήριο πληρώνει όλους", "Δεν υπάρχει μόχλευση", "Δείχνει ότι τα long είναι «γεμάτα». Πολύ υψηλό funding συχνά προηγείται απότομης πτώσης."], null, 2], ["cry", "c-oi", 3, ["Η τιμή ανεβαίνει και το open interest ανεβαίνει επίσης. Τι σημαίνει συνήθως;", "Κλείνουν θέσεις", "Η αγορά είναι κλειστή", "Τίποτα", "Νέα χρήματα μπαίνουν στην κίνηση", "Αύξηση OI με άνοδο = νέες long θέσεις. Αν η τιμή ανεβαίνει με πτώση OI, είναι κυρίως short που κλείνουν."], null, 2], ["cry", "c-dom", 2, ["Το BTC dominance ανεβαίνει ενώ όλη η αγορά πέφτει. Τι σημαίνει για τα altcoins;", "Ανεβαίνουν", "Δεν επηρεάζονται", "Συνήθως πέφτουν περισσότερο από το BTC", "Γίνονται stablecoins", "Σε φόβο τα κεφάλαια πάνε στο «ασφαλέστερο» BTC ή σε stablecoins."], null, 2], ["cry", "c-halving", 1, ["Τι κάνει το halving του Bitcoin;", "Διπλασιάζει την τιμή", "Μειώνει στο μισό την ανταμοιβή των miners", "Μειώνει τον αριθμό BTC στη μέση", "Σταματά τις συναλλαγές", "Συμβαίνει περίπου κάθε 4 χρόνια και μειώνει τη νέα προσφορά."], null, 1], ["cry", "c-safety", 0, ["Τι είναι το seed phrase ενός πορτοφολιού;", "Οι λέξεις που επαναφέρουν το πορτοφόλι: δεν τις δίνεις σε κανέναν", "Ο κωδικός του email", "Ένα δημόσιο κλειδί", "Το όνομα χρήστη στο ανταλλακτήριο", "Όποιος έχει το seed έχει τα χρήματα. Κανένα support δεν θα σου το ζητήσει ποτέ."], null, 1], ["cry", "c-safety", 3, ["Γιατί λένε «not your keys, not your coins»;", "Γιατί τα κλειδιά είναι δωρεάν", "Γιατί τα coins χάνονται πάντα", "Είναι διαφήμιση", "Σε ανταλλακτήριο, τα κλειδιά τα έχει το ανταλλακτήριο", "Αν το ανταλλακτήριο καταρρεύσει (π.χ. FTX), μπορεί να χάσεις τα χρήματά σου."], null, 2], ["cry", "c-247", 2, ["Γιατί η αγορά crypto έχει συχνά λιγότερη ρευστότητα το Σαββατοκύριακο;", "Είναι κλειστή", "Τα ανταλλακτήρια σταματούν", "Λείπουν πολλοί θεσμικοί και οι παραδοσιακές αγορές είναι κλειστές", "Δεν υπάρχει διαφορά", "Χαμηλή ρευστότητα = πιο απότομες, «ψεύτικες» κινήσεις."], null, 1], ["cry", "c-oi", 1, ["Τι είναι ένα «long squeeze»;", "Άνοδος από short που κλείνουν", "Αλυσιδωτές ρευστοποιήσεις long που επιταχύνουν την πτώση", "Ένα σχήμα κεριού", "Μια στρατηγική DCA", "Οι αναγκαστικές πωλήσεις ρευστοποιήσεων ρίχνουν την τιμή και ρευστοποιούν περισσότερα long."], null, 3], ["cry", "c-onchain", 0, ["Μεγάλες ροές BTC προς τα ανταλλακτήρια συχνά ερμηνεύονται ως:", "Πιθανή πίεση πώλησης", "Σίγουρη άνοδος", "Νέο halving", "Χακάρισμα", "Οι κάτοχοι μεταφέρουν νομίσματα στα ανταλλακτήρια κυρίως για να πουλήσουν."], null, 3], ["cry", "c-perp", 3, ["Τι είναι η «τιμή ρευστοποίησης» σε θέση με μόχλευση;", "Η τιμή εισόδου", "Ο στόχος", "Η μέση τιμή της ημέρας", "Η τιμή όπου το ανταλλακτήριο κλείνει αναγκαστικά τη θέση", "Όσο μεγαλύτερη η μόχλευση, τόσο πιο κοντά στην είσοδο είναι η ρευστοποίηση."], null, 2], ["cry", "c-dom", 2, ["Τι είναι το «altseason»;", "Περίοδος χωρίς συναλλαγές", "Η εποχή του halving", "Περίοδος που τα altcoins ανεβαίνουν πολύ περισσότερο από το BTC", "Πτώση όλων των coins", "Συνήθως έρχεται όταν το BTC dominance πέφτει μετά από ανοδική κίνηση του BTC."], null, 3], ["cry", "c-safety", 1, ["Ποιο είναι το ασφαλέστερο είδος 2FA;", "SMS", "Εφαρμογή authenticator ή κλειδί υλικού", "Email", "Κανένα", "Τα SMS μπορούν να «κλαπούν» με SIM swap."], null, 2], ["cry", "c-funding", 0, ["Το funding είναι πολύ αρνητικό ενώ η τιμή δεν πέφτει άλλο. Τι μπορεί να ακολουθήσει;", "Short squeeze (απότομη άνοδος)", "Σίγουρη κατάρρευση", "Halving", "Τίποτα", "Πολλά short πληρώνουν για να κρατήσουν θέσεις. Αν η τιμή ανέβει, κλείνουν αναγκαστικά και την ανεβάζουν κι άλλο."], null, 3], ["stk", "k-hours", 3, ["Τι ώρα Ελλάδας ανοίγει συνήθως η αγορά των ΗΠΑ (NYSE/Nasdaq);", "09:00", "10:30", "22:00", "16:30", "9:30 Νέα Υόρκη = 16:30 Ελλάδα (εκτός από λίγες εβδομάδες αλλαγής ώρας)."], null, 1], ["stk", "k-ger40", 2, ["Ο GER40 (DAX) αντιπροσωπεύει:", "Τις 40 μεγαλύτερες ευρωπαϊκές", "Το γερμανικό ομόλογο", "Τις 40 μεγαλύτερες γερμανικές εταιρείες", "Το ευρώ", "Ο DAX έγινε DAX 40 το 2021. Ως CFD λέγεται συχνά GER40."], null, 1], ["stk", "k-ger40", 1, ["Ποιες ώρες έχει συνήθως τη μεγαλύτερη κίνηση ο DAX;", "Τα μεσάνυχτα", "Στο άνοιγμα (09:00-11:00 ώρα Γερμανίας) και στο άνοιγμα των ΗΠΑ", "Το Σάββατο", "Μόνο στο κλείσιμο", "Τότε μπαίνει η μεγαλύτερη ρευστότητα και κυκλοφορούν οι ειδήσεις."], null, 2], ["stk", "k-earn", 0, ["Τι είναι η «earnings season»;", "Η περίοδος που οι εταιρείες ανακοινώνουν τριμηνιαία αποτελέσματα", "Η εποχή μερισμάτων", "Το τέλος του χρόνου", "Οι διακοπές των αγορών", "Τότε οι μετοχές μπορεί να κάνουν μεγάλα gap. Πολλοί traders δεν κρατούν θέσεις πριν τα αποτελέσματα."], null, 2], ["stk", "k-macro", 3, ["Ποια ανακοίνωση των ΗΠΑ κινεί συνήθως έντονα όλες τις αγορές;", "Τα γενέθλια CEO", "Οι αργίες", "Οι αθλητικοί αγώνες", "Ο πληθωρισμός (CPI) και η απόφαση επιτοκίων της Fed", "Επηρεάζουν το κόστος του χρήματος. Εκείνες τις ώρες το spread και το slippage μεγαλώνουν."], null, 2], ["stk", "k-index", 2, ["Τι είναι ένα ETF;", "Ένα κρυπτονόμισμα", "Ένα ομόλογο", "Αμοιβαίο που διαπραγματεύεται σαν μετοχή και παρακολουθεί έναν δείκτη ή καλάθι", "Ένας τύπος εντολής", "Π.χ. το SPY παρακολουθεί τον S&P 500."], null, 1], ["stk", "k-short", 1, ["Τι είναι το short squeeze σε μετοχή;", "Πτώση λόγω μερίσματος", "Απότομη άνοδος γιατί πολλοί short αναγκάζονται να αγοράσουν", "Split της μετοχής", "Τέλος συνεδρίασης", "Υψηλό short interest + καλά νέα = εκρηκτική άνοδος (π.χ. GameStop 2021)."], null, 3], ["stk", "k-adjust", 0, ["Μετά από split 2-προς-1, τι συμβαίνει στην τιμή;", "Μισή τιμή, διπλάσιες μετοχές, ίδια αξία", "Διπλασιάζεται η αξία", "Χάνεις τις μισές μετοχές", "Τίποτα", "Το split δεν αλλάζει την αξία της εταιρείας. Τα γραφήματα προσαρμόζονται."], null, 2], ["stk", "k-index", 3, ["Ο Nasdaq 100 είναι βαρύς σε:", "Τράπεζες", "Πετρελαϊκές", "Κρατικά ομόλογα", "Τεχνολογικές εταιρείες", "Apple, Microsoft, Nvidia, Amazon κ.ά. Γι' αυτό είναι πιο ευμετάβλητος από τον Dow."], null, 2], ["stk", "k-macro", 2, ["Γιατί όταν ανεβαίνουν απότομα τα επιτόκια πέφτουν συνήθως οι μετοχές ανάπτυξης;", "Γιατί πληρώνουν περισσότερο μέρισμα", "Γιατί κλείνει η αγορά", "Τα μελλοντικά κέρδη τους αξίζουν λιγότερο σήμερα", "Δεν επηρεάζονται", "Υψηλότερο επιτόκιο προεξόφλησης μειώνει την παρούσα αξία κερδών που έρχονται σε πολλά χρόνια."], null, 3], ["stk", "k-hours", 1, ["Τι είναι το pre-market;", "Το κλείσιμο της αγοράς", "Συναλλαγές πριν από το επίσημο άνοιγμα, με μικρότερη ρευστότητα", "Μια στρατηγική", "Ένα ETF", "Οι τιμές στο pre-market μπορεί να «ξεγελάσουν» λόγω χαμηλού όγκου."], null, 2], ["stk", "k-earn", 0, ["Μια μετοχή βγάζει καλύτερα από τα αναμενόμενα αποτελέσματα αλλά πέφτει. Ποια είναι πιθανή εξήγηση;", "Οι προσδοκίες ήταν ήδη στην τιμή ή οι προβλέψεις για το μέλλον απογοήτευσαν", "Λάθος δεδομένα", "Δεν γίνεται", "Λόγω split", "«Buy the rumor, sell the news»: η αγορά κοιτάζει μπροστά (guidance) και όχι μόνο το τρίμηνο."], null, 3], ["stk", "k-athex", 3, ["Πώς λέγεται ο κύριος δείκτης του Χρηματιστηρίου Αθηνών;", "DAX", "FTSE 100", "CAC 40", "Γενικός Δείκτης", "Ο Γενικός Δείκτης (και ο FTSE 25) παρακολουθούν τις ελληνικές εισηγμένες."], null, 1], ["stk", "k-ger40", 2, ["Ένα CFD στον GER40 σημαίνει ότι:", "Αγοράζεις τις 40 μετοχές", "Παίρνεις μέρισμα από όλες", "Κερδίζεις ή χάνεις από τη διαφορά τιμής χωρίς να έχεις τις μετοχές", "Είναι ομόλογο", "Τα CFD έχουν μόχλευση και κόστος overnight. Ελέγχεις τις χρεώσεις του broker."], null, 3], ["grt", "", 1, ["Ποιος έγραψε το «Reminiscences of a Stock Operator» για τη ζωή του Jesse Livermore;", "Jack Schwager", "Edwin Lefèvre", "Mark Douglas", "Benjamin Graham", "Κλασικό βιβλίο του 1923 με διαχρονικά μαθήματα για τάση, υπομονή και λάθη."], null, 2], ["grt", "", 0, ["Ποια σειρά βιβλίων περιέχει συνεντεύξεις κορυφαίων traders;", "Market Wizards του Jack Schwager", "Trading in the Zone", "The Intelligent Investor", "Rich Dad Poor Dad", "Ο Schwager πήρε συνεντεύξεις από Paul Tudor Jones, Ed Seykota, Bruce Kovner κ.ά."], null, 1], ["grt", "", 3, ["Οι «Turtles» του Richard Dennis χρησιμοποιούσαν κυρίως:", "Scalping", "Value investing", "Arbitrage", "Breakout συστήματα τάσης (Donchian)", "Το πείραμα έδειξε ότι το trading διδάσκεται με σαφείς κανόνες και διαχείριση ρίσκου."], null, 2], ["grt", "", 2, ["Ποια ιδέα συνδέεται με τον Alexander Elder;", "Τα order blocks", "Το halving", "Το Triple Screen: τρία timeframes για φίλτρο και είσοδο", "Το DCA", "Στο «Trading for a Living»: μεγάλο timeframe για τάση, μεσαίο για pullback, μικρό για είσοδο."], null, 3], ["grt", "", 1, ["Ο Paul Tudor Jones είναι γνωστός για τον κανόνα:", "Να μη χρησιμοποιείς stop", "Να προστατεύεις πρώτα το κεφάλαιο, το ρίσκο πρώτα", "Να μένεις πάντα long", "Να αγνοείς τα macro", "Είχε πει ότι το πιο σημαντικό είναι η άμυνα, όχι η επίθεση."], null, 2], ["grt", "", 0, ["Ο Van Tharp τόνιζε ότι η κερδοφορία εξαρτάται κυρίως από:", "Το position sizing και το expectancy", "Τον τέλειο δείκτη", "Την πρόβλεψη ειδήσεων", "Τη μόχλευση", "Στο «Trade Your Way to Financial Freedom» εισήγαγε ευρέως το R-multiple."], null, 3]];
var QBANK_BASE=QBANK.length+QBANK_G.length;
var QBANK_Y=[
["pat","trendline",1,["Πότε μια γραμμή τάσης θεωρείται πιο αξιόπιστη;","Όταν την αγγίζει η τιμή μόνο μία φορά","Όταν έχει τουλάχιστον 3 αγγίγματα και δεν είναι πολύ απότομη","Όταν είναι κάθετη","Όταν τη σχεδιάζεις στο 1m","Δύο σημεία ορίζουν γραμμή, το τρίτο άγγιγμα την επιβεβαιώνει. Οι πολύ απότομες γραμμές σπάνε γρήγορα."],null,1],
["ind","psar",2,["Στο Parabolic SAR, οι τελείες κάτω από την τιμή σημαίνουν:","Πτωτική τάση","Υπεραγορά","Ανοδική τάση, και οι τελείες λειτουργούν ως trailing stop","Ότι ο όγκος πέφτει","Οι τελείες ακολουθούν την τιμή. Όταν η τιμή τις σπάσει, αλλάζουν πλευρά."],null,2],
["ind","cci",0,["Ο CCI πάνω από +100 συνήθως σημαίνει:","Δυνατή ανοδική ορμή, ή υπεραγορά σε πλάγια αγορά","Ότι η αγορά είναι κλειστή","Ότι ο όγκος είναι μηδενικός","Σίγουρη πτώση","Σε τάση το +100 δείχνει δύναμη, σε range πιθανή επιστροφή. Γι' αυτό κοιτάς πρώτα τι αγορά έχεις."],null,2],
["ind","willr",3,["Ο Williams %R κινείται σε ποια κλίμακα;","0 έως 100","−1 έως +1","0 έως 1000","0 έως −100","Κοντά στο 0 = υπεραγορά, κοντά στο −100 = υπερπώληση. Μοιάζει πολύ με το Stochastic."],null,2],
["ind","donchian",1,["Τι δείχνει το πάνω όριο του Donchian Channel (20);","Τον μέσο όρο 20 κεριών","Το υψηλότερο υψηλό των τελευταίων 20 κεριών","Το RSI","Τον όγκο","Το σπάσιμό του ήταν το σήμα εισόδου των Turtles."],null,1],
["ind","vp",2,["Στο Volume Profile, τι είναι το POC;","Η τιμή κλεισίματος","Το υψηλό της ημέρας","Η τιμή με τον μεγαλύτερο όγκο στο διάστημα","Ο μέσος όρος 200","Point of Control: εκεί έγιναν οι περισσότερες συναλλαγές, συχνά λειτουργεί σαν μαγνήτης ή στήριξη."],null,2],
["ind","mfi",0,["Σε τι διαφέρει ο MFI από τον RSI;","Λαμβάνει υπόψη και τον όγκο","Δείχνει μόνο τάση","Δεν έχει επίπεδα υπεραγοράς","Υπολογίζεται μόνο σε μετοχές","Ο MFI είναι «RSI με όγκο»: η ορμή μετράει περισσότερο όταν τη στηρίζει όγκος."],null,2],
["ind","stochrsi",1,["Γιατί ο Stoch RSI δίνει πολλά σήματα;","Γιατί είναι αργός","Γιατί είναι Stochastic πάνω στον RSI και κινείται πολύ γρήγορα","Γιατί δεν έχει όρια","Γιατί χρησιμοποιεί μόνο όγκο","Πηγαίνει συχνά από 0 σε 100. Χρησιμοποιείται κυρίως για timing μέσα σε τάση, όχι μόνος του."],null,2],
["ind","alligator",3,["Όταν οι τρεις γραμμές του Alligator είναι μπλεγμένες, η αγορά:","είναι σε δυνατή άνοδο","είναι σε δυνατή πτώση","έκλεισε","«κοιμάται»: πλάγια, χωρίς τάση","Όταν οι γραμμές ανοίγουν και απλώνονται, ο «αλιγάτορας τρώει», δηλαδή υπάρχει τάση."],null,2],
["cdl","soldiers",2,["Οι «Τρεις λευκοί στρατιώτες» είναι:","Τρία doji στη σειρά","Τρία κόκκινα κεριά","Τρία δυνατά πράσινα κεριά, το καθένα κλείνει πιο ψηλά","Ένα πράσινο μέσα σε κόκκινο","Δείχνουν δυνατή ανοδική ορμή, ιδίως μετά από πτώση ή συμπίεση."],null,1],
["cdl","spinning",0,["Τι δείχνει μια «σβούρα» (spinning top);","Αναποφασιστικότητα: μικρό σώμα και σκιές και από τις δύο πλευρές","Σίγουρη άνοδο","Σίγουρη πτώση","Μεγάλο όγκο","Ούτε αγοραστές ούτε πωλητές κέρδισαν. Μετράει μόνο σε σημαντικό επίπεδο."],null,1],
["cdl","invhammer",1,["Το ανεστραμμένο σφυρί εμφανίζεται συνήθως:","στην κορυφή ανόδου","στον πάτο πτώσης, με μακριά πάνω σκιά","σε πλάγια αγορά","μόνο στο crypto","Οι αγοραστές προσπάθησαν να ανεβάσουν την τιμή. Χρειάζεται επιβεβαίωση από το επόμενο κερί."],null,1],
["cdl","hangingman",3,["Ποια είναι η διαφορά «κρεμασμένου» και «σφυριού»;","Το χρώμα","Το μέγεθος της πάνω σκιάς","Ο όγκος","Το σημείο: ο κρεμασμένος εμφανίζεται μετά από άνοδο, το σφυρί μετά από πτώση","Το σχήμα είναι ίδιο. Το πλαίσιο αλλάζει το νόημα."],null,2],
["cdl","bearengulf",2,["Πτωτικό engulfing σημαίνει:","Μικρό κόκκινο μέσα σε μεγάλο πράσινο","Δύο doji","Μεγάλο κόκκινο σώμα που καλύπτει ολόκληρο το σώμα του προηγούμενου πράσινου","Gap προς τα πάνω","Οι πωλητές πήραν τον έλεγχο. Πιο δυνατό σε αντίσταση μετά από άνοδο."],null,1],
["cdl","eveningstar",0,["Από πόσα κεριά αποτελείται το βραδινό αστέρι;","3: μεγάλο πράσινο, μικρό κερί, μεγάλο κόκκινο","1","2","5","Το τρίτο κερί κλείνει βαθιά μέσα στο σώμα του πρώτου και επιβεβαιώνει την αντιστροφή."],null,1],
["cdl","kicker",1,["Τι κάνει το Kicker τόσο δυνατό σήμα;","Ότι έχει πολλές σκιές","Το απότομο gap προς την αντίθετη κατεύθυνση: η διάθεση άλλαξε αμέσως","Ότι εμφανίζεται κάθε μέρα","Τον χαμηλό όγκο","Συνήθως ακολουθεί είδηση. Στο crypto, που δεν έχει gaps, εμφανίζεται σπάνια."],null,2],
["cdl","abandoned",3,["Το «εγκαταλελειμμένο μωρό» έχει στη μέση:","μεγάλο πράσινο κερί","inside bar","marubozu","doji απομονωμένο με gaps και από τις δύο πλευρές","Είναι σπάνια, πιο ακραία μορφή του πρωινού/βραδινού αστεριού."],null,3],
["cdl","risingthree",2,["Στο Rising three methods, τα τρία μικρά κεριά στη μέση:","σπάνε το χαμηλό του πρώτου","είναι gaps","μένουν μέσα στο εύρος του πρώτου μεγάλου πράσινου","είναι πάντα doji","Είναι μια μικρή παύση. Το πέμπτο κερί κλείνει ψηλότερα και η άνοδος συνεχίζει."],null,2],
["cdl","fallingthree",0,["Το Falling three methods είναι μοτίβο:","συνέχισης πτώσης","αντιστροφής προς τα πάνω","αναποφασιστικότητας","μόνο για μετοχές","Μεγάλο κόκκινο, τρία μικρά πράσινα μέσα στο εύρος του, νέο κόκκινο που κλείνει χαμηλότερα."],null,2],
["cdl","threeinside",1,["Τι προσθέτει το Three inside up σε σχέση με το απλό harami;","Ένα gap","Ένα τρίτο κερί που επιβεβαιώνει, κλείνοντας πάνω από το άνοιγμα του πρώτου","Μεγαλύτερη σκιά","Τίποτα","Είναι harami με ενσωματωμένη επιβεβαίωση."],null,2],
["cdl","threeoutside",3,["Το Three outside down ξεκινάει με:","Τρία doji","Ένα σφυρί","Ένα inside bar","Ένα πτωτικό engulfing, και ακολουθεί κερί που κλείνει ακόμα χαμηλότερα","Engulfing συν επιβεβαίωση. Stop πάνω από το άκρο του engulfing."],null,2],
["cdl","tasuki",0,["Στο upside tasuki gap, πότε ακυρώνεται το μοτίβο;","Όταν το κόκκινο κερί κλείσει πλήρως το κενό","Όταν ο όγκος ανέβει","Όταν εμφανιστεί doji","Ποτέ","Αν το κενό κρατήσει, λειτουργεί σαν στήριξη και η άνοδος συνεχίζει."],null,3],
["cdl","beltold",2,["Ένα ανοδικό belt hold μετά από πτώση:","έχει μεγάλη κάτω σκιά","κλείνει χαμηλότερα από το άνοιγμα","ανοίγει στο χαμηλό του και κλείνει κοντά στο υψηλό, χωρίς κάτω σκιά","είναι πάντα doji","Οι αγοραστές είχαν τον έλεγχο από την πρώτη στιγμή του κεριού."],null,2],
["pat","ihs",1,["Ο ανεστραμμένος ΩΚΩ επιβεβαιώνεται όταν:","Σχηματιστεί ο αριστερός ώμος","Η τιμή κλείσει πάνω από τη neckline","Η κεφαλή γίνει το χαμηλότερο σημείο","Ο RSI φτάσει 70","Μέχρι το σπάσιμο της neckline είναι απλώς ένα πιθανό σχήμα."],null,2],
["pat","bearflag",0,["Πού μπαίνεις σε πτωτική σημαία;","Στο σπάσιμο του κάτω ορίου της σημαίας, με stop πάνω από τη σημαία","Στην κορυφή της σημαίας με long","Πριν από τον ιστό","Δεν μπαίνεις ποτέ","Ο στόχος είναι περίπου το μήκος του ιστού, προβαλλόμενο από το σπάσιμο."],null,1],
["pat","fallwedge",3,["Η πτωτική σφήνα είναι συνήθως:","πτωτικό σήμα","σήμα συνέχισης πτώσης πάντα","άσχετη με την κατεύθυνση","ανοδικό σήμα, γιατί οι πτώσεις εξασθενούν","Οι γραμμές συγκλίνουν προς τα κάτω, οι πωλητές κουράζονται και συχνά ακολουθεί σπάσιμο προς τα πάνω."],null,2],
["pat","broadening",2,["Τι δείχνει ο διευρυνόμενος σχηματισμός;","Ηρεμία","Δυνατή τάση","Αυξανόμενη αστάθεια και αναποφασιστικότητα, με όλο και μεγαλύτερες κινήσεις","Χαμηλό ρίσκο","Δύσκολος για συναλλαγές: τα stops χτυπιούνται εύκολα."],null,3],
["pat","rounding",1,["Ο στρογγυλός πυθμένας σχηματίζεται συνήθως:","σε λίγα λεπτά","σε εβδομάδες ή μήνες, με σταδιακή αλλαγή από πτώση σε άνοδο","μόνο μετά από gap","μόνο σε μετοχές","Είναι αργή αλλαγή διάθεσης. Η είσοδος γίνεται στο σπάσιμο του χείλους."],null,2],
["pat","diamond",0,["Το «διαμάντι» είναι συνδυασμός:","Διευρυνόμενου σχηματισμού και συμμετρικού τριγώνου","Δύο σημαιών","Τριών doji","Ενός gap και μιας σφήνας","Σπάνιο σχήμα αντιστροφής στις κορυφές. Η είσοδος γίνεται στο σπάσιμο της κάτω πλευράς."],null,3],
["str","s-gapgo",2,["Στη στρατηγική Gap and Go ψάχνεις:","μετοχές που άνοιξαν χωρίς αλλαγή","κλειστές αγορές","μετοχές με μεγάλο gap πάνω από είδηση και αυξημένο όγκο στο pre-market","μετοχές με χαμηλό όγκο","Η είσοδος συνήθως γίνεται στο σπάσιμο του υψηλού των πρώτων λεπτών, με stop κάτω από το χαμηλό τους."],null,3],
["str","s-pead",1,["Τι είναι το post-earnings drift;","Πτώση πριν από τα αποτελέσματα","Η τάση της μετοχής να συνεχίζει προς την κατεύθυνση της έκπληξης των αποτελεσμάτων για εβδομάδες","Το spread μετά το κλείσιμο","Η μεταβλητότητα των options","Μετά από μεγάλη θετική έκπληξη, η αγορά συχνά δεν προσαρμόζεται αμέσως."],null,2],
["str","s-ichimoku",3,["Στη στρατηγική σπασίματος του σύννεφου Ichimoku, το long σήμα είναι:","τιμή κάτω από το σύννεφο","Tenkan κάτω από το Kijun","το σύννεφο κόκκινο","κλείσιμο πάνω από το σύννεφο με Tenkan πάνω από το Kijun","Τα επιπλέον φίλτρα (Chikou πάνω από την τιμή) κόβουν ψεύτικα σήματα."],null,3],
["str","s-smc",0,["Στη στρατηγική Liquidity sweep (SMC), η σωστή σειρά είναι:","Sweep ρευστότητας, CHoCH στο μικρό timeframe, είσοδος σε FVG ή order block","Είσοδος, μετά sweep","CHoCH χωρίς sweep","Αγορά σε κάθε νέο υψηλό","Το sweep παίρνει τα stops, το CHoCH επιβεβαιώνει ότι γύρισε η κατεύθυνση."],null,3],
["str","s-pairs",2,["Στο pairs trading:","αγοράζεις δύο ίδια νομίσματα","παίζεις μόνο long","αγοράζεις το ένα από δύο συσχετισμένα assets και πουλάς το άλλο όταν η σχέση τους ξεφύγει","χρησιμοποιείς μόνο ειδήσεις","Ποντάρεις ότι η απόσταση των δύο θα επιστρέψει στο κανονικό. Ο κίνδυνος είναι να σπάσει η σχέση."],null,3],
["str","s-rsi2",1,["Στη στρατηγική RSI(2) του Connors, το φίλτρο τάσης είναι:","RSI(14) πάνω από 50","Τιμή πάνω από τον SMA 200","Όγκος πάνω από τον μέσο","MACD πάνω από 0","Αγοράζεις υπερπωλήσεις μόνο μέσα σε μακροπρόθεσμη ανοδική τάση."],null,2],
["str","s-rsi2",3,["Πότε βγαίνεις στη στρατηγική RSI(2);","Μετά από 30 μέρες","Στο −20%","Όταν το RSI(14) φτάσει 80","Όταν η τιμή κλείσει πάνω από τον SMA 5 ή το RSI(2) ξεπεράσει το 70","Είναι mean reversion: μικρά κέρδη, υψηλό ποσοστό επιτυχίας, γρήγορη έξοδος."],null,2],
["str","s-ibbo",0,["Στο Inside bar breakout, πού μπαίνει η εντολή εισόδου για long;","Λίγο πάνω από το υψηλό του μητρικού κεριού","Στο χαμηλό του inside bar","Στη μέση του inside bar","Στο κλείσιμο του μητρικού","Stop εντολή πάνω από το υψηλό: μπαίνεις μόνο αν η τιμή σπάσει πράγματι."],null,1],
["str","s-spring",2,["Τι είναι το «spring» στον Wyckoff;","Σπάσιμο πάνω από το range","Ένα doji","Ψεύτικο σπάσιμο κάτω από τη στήριξη του range που γυρίζει γρήγορα μέσα","Η πρώτη μέρα της άνοιξης","Παίρνει τα stops κάτω από τη στήριξη. Δίνει είσοδο με μικρό stop και μεγάλο στόχο."],null,2],
["str","s-trend",1,["Στο trend following, ποιο ποσοστό επιτυχίας είναι συνηθισμένο;","90%","35-45%, με λίγα μεγάλα κέρδη που καλύπτουν πολλές μικρές απώλειες","100%","10%","Η στρατηγική κερδίζει από το μέγεθος των νικών, όχι από το πλήθος τους."],null,1],
["str","s-trend",3,["Τι είναι το chandelier exit;","Έξοδος σε σταθερό στόχο 2R","Έξοδος σε συγκεκριμένη ώρα","Έξοδος στο πρώτο κόκκινο κερί","Trailing stop σε απόσταση 3 × ATR από το υψηλότερο σημείο","Ακολουθεί την τιμή και αφήνει τη θέση να τρέξει όσο κρατάει η τάση."],null,2],
["str","s-news",0,["Ποιος είναι ο πιο ασφαλής τρόπος για αρχάριους με μεγάλες ειδήσεις (CPI, Fed);","Χωρίς ανοιχτή θέση στην ανακοίνωση· παίζεις τη δομή 15-30 λεπτά μετά","Μεγάλη θέση λίγο πριν","Market εντολή τη στιγμή της ανακοίνωσης","Διπλάσια μόχλευση","Στην ανακοίνωση ανοίγει το spread, υπάρχει slippage και η πρώτη κίνηση συχνά αντιστρέφεται."],null,1],
["str","tv-setup",2,["Ποιο είναι ένα καλό αρχικό στήσιμο γραφήματος για αρχάριο;","10 δείκτες μαζί","Μόνο γραμμή κλεισίματος","Κεριά, EMA 20 και 50, όγκος, και 1 ταλαντωτής (π.χ. RSI)","Μόνο Heikin Ashi","Λίγοι δείκτες, καθαρό γράφημα. Περισσότεροι δείκτες δίνουν αντιφατικά σήματα."],null,1],
["str","tv-alerts",1,["Γιατί βάζεις ειδοποίηση (alert) στο TradingView;","Για να μπαίνει αυτόματα θέση","Για να μη χρειάζεται να κοιτάς την οθόνη συνέχεια: σε ειδοποιεί όταν η τιμή φτάσει στο επίπεδό σου","Για να αλλάξει χρώμα το γράφημα","Για να πάρεις δωρεάν δεδομένα","Μειώνει και το overtrading: μπαίνεις μόνο όταν έρθει η τιμή στο σημείο του σχεδίου."],null,1],
["str","tv-pine",3,["Τι πρέπει να ελέγξεις πρώτα στο Strategy Tester;","Μόνο το Net profit","Το χρώμα της καμπύλης","Τον αριθμό των δεικτών","Τον αριθμό συναλλαγών (30+), το profit factor και το max drawdown, με προμήθειες","Ένα κέρδος από 8 συναλλαγές δεν λέει τίποτα. Χωρίς προμήθειες το αποτέλεσμα είναι φουσκωμένο."],null,2],
["str","tv-paper",0,["Σε τι χρησιμεύει το Paper Trading;","Να δοκιμάσεις εκτέλεση και κανόνες σε πραγματικό χρόνο χωρίς πραγματικά χρήματα","Να βγάλεις εγγυημένα κέρδη","Να αποφύγεις τις προμήθειες στον πραγματικό λογαριασμό","Να κάνεις backtest στο παρελθόν","Είναι το βήμα μετά το backtest και πριν από το μικρό πραγματικό ρίσκο."],null,1],
["str","tv-screener",2,["Τι κάνει ένας screener;","Σχεδιάζει γραμμές","Εκτελεί εντολές","Φιλτράρει πολλά σύμβολα με κριτήρια (όγκος, αλλαγή %, RSI) για να βρεις υποψήφια","Υπολογίζει φόρους","Γλιτώνεις χρόνο: κοιτάς μόνο ό,τι ταιριάζει στη στρατηγική σου."],null,1],
["str","tv-keys",1,["Ποια συντόμευση του TradingView βάζει οριζόντια γραμμή;","Ctrl+S","Alt+H","Alt+F4","Shift+R","Alt+T για γραμμή τάσης, Alt+H για οριζόντια, Alt+F για Fibonacci."],null,1],
["str","tv-draw",3,["Πώς κρατάς τις ρυθμίσεις ενός εργαλείου σχεδίασης για την επόμενη φορά;","Δεν γίνεται","Με screenshot","Με νέο λογαριασμό","Δεξί κλικ → Save as default ή Save template","Και για δείκτες: Indicator templates, για να φορτώνεις το δικό σου στήσιμο με ένα κλικ."],null,1],
["str","tv-export",0,["Αν δεν έχεις λογαριασμό TradingView, πώς παίρνεις χιλιάδες κεριά για backtest στη σελίδα;","Από το Binance μέσα από τη σελίδα, με «➕ Ακόμα 1000 παλαιότερα»","Δεν γίνεται","Μόνο από το Crypto.com (50 κεριά)","Με φωτογραφία του γραφήματος","Κάθε αντιγραφή δίνει 1.000 κεριά. 3-5 φορές δίνουν αρκετό ιστορικό."],null,1],
["cdl","cdl-context",2,["Ένα σφυρί εμφανίζεται στη μέση ενός πλάγιου range, μακριά από στήριξη. Τι κάνεις;","Μπαίνεις long αμέσως","Μπαίνεις short","Το αγνοείς: χωρίς σωστό σημείο το μοτίβο δεν έχει αξία","Διπλασιάζεις τη θέση","Τα μοτίβα κεριών μετράνε σε επίπεδα, μετά από κίνηση, με όγκο."],null,1],
["cdl","cdl-context",0,["Ποιο από αυτά κάνει ένα μοτίβο κεριού πιο αξιόπιστο;","Επιβεβαίωση από το επόμενο κερί και συμφωνία με το μεγαλύτερο timeframe","Το 1m timeframe","Να εμφανίζεται συχνά","Χαμηλός όγκος","Χάνεις λίγη τιμή περιμένοντας, αλλά γλιτώνεις πολλές ψεύτικες εισόδους."],null,1],
["cdl","pinbar",1,["Πού μπαίνει το stop σε ένα ανοδικό pin bar;","Στο κλείσιμό του","Λίγο κάτω από τη μύτη της κάτω σκιάς","Στο υψηλό του","Δεν χρειάζεται stop","Αν η τιμή σπάσει τη μύτη, η απόρριψη που έδειξε το pin bar ακυρώθηκε."],null,1],
["cdl","dojitypes",3,["Το gravestone doji μετά από άνοδο, σε αντίσταση, δείχνει:","δυνατή συνέχιση ανόδου","ότι η αγορά είναι κλειστή","τίποτα","απόρριψη των υψηλών και πιθανή αντιστροφή προς τα κάτω","Άνοιγμα και κλείσιμο στο χαμηλό με μακριά πάνω σκιά: οι αγοραστές απέτυχαν."],null,1],
["cdl","outsidebar",2,["Ποια είναι η διαφορά outside bar και engulfing;","Καμία","Το outside bar είναι πάντα πράσινο","Το outside bar καλύπτει ολόκληρο το εύρος (υψηλό και χαμηλό) του προηγούμενου, όχι μόνο το σώμα","Το engulfing έχει 3 κεριά","Γι' αυτό το stop του outside bar είναι συχνά μεγάλο και μικραίνεις την ποσότητα."],null,2],
["cdl","fakey",0,["Τι συμβαίνει σε ένα ανοδικό fakey;","Το inside bar σπάει προς τα κάτω, αλλά η τιμή ξαναμπαίνει μέσα στο μητρικό κερί και γυρίζει πάνω","Το inside bar σπάει πάνω και συνεχίζει","Σχηματίζονται τρία doji","Η τιμή δεν κινείται","Όσοι μπήκαν short στο σπάσιμο παγιδεύονται. Είναι η ίδια ιδέα με το liquidity sweep."],null,2],
["pat","wyckoff",1,["Με ποια σειρά εμφανίζονται τα γεγονότα σε μια συσσώρευση Wyckoff;","Spring, SC, AR","SC, AR, δοκιμές, Spring, SOS","SOS, SC, Spring","AR, SOS, SC","Selling climax, αναπήδηση, range, ψεύτικο σπάσιμο κάτω (spring), σπάσιμο πάνω με δύναμη."],null,3],
["pat","wyckoff",2,["Ποια είναι η πιο καθαρή είσοδος σε συσσώρευση Wyckoff;","Στο selling climax","Στη μέση του range","Στο LPS, το pullback μετά το σπάσιμο πάνω (SOS), ή μετά το spring","Πριν από το AR","Εκεί έχεις επιβεβαίωση και κοντινό, λογικό stop."],null,3],
["pat","elliott",3,["Ποιος κανόνας Elliott δεν παραβιάζεται ποτέ;","Το κύμα 5 είναι πάντα το μεγαλύτερο","Το κύμα 2 ξεπερνά την αρχή του 1","Το κύμα 4 είναι πάντα πιο μεγάλο από το 3","Το κύμα 3 δεν είναι ποτέ το πιο σύντομο από τα 1, 3 και 5","Επίσης: το 2 δεν πάει κάτω από την αρχή του 1, και το 4 δεν μπαίνει στην περιοχή του 1."],null,3],
["pat","harmonic",0,["Στο Gartley, το σημείο D βρίσκεται συνήθως στο:","0,786 του σκέλους XA","1,618 του XA","0,236 του XA","2,0 του XA","Στο Bat το D είναι στο 0,886. Εκεί είναι η ζώνη αντιστροφής (PRZ)."],null,3],
["pat","qm",2,["Στο Quasimodo για short, πού μπαίνει η limit εντολή;","Στο νέο υψηλό","Στο νέο χαμηλό","Στο επίπεδο του αριστερού ώμου (το υψηλό πριν από το τελευταίο)","Στη μέση του range","Μετά από νέο υψηλό και σπάσιμο χαμηλού (αλλαγή δομής), η τιμή συχνά επιστρέφει εκεί."],null,2],
["pat","sfp",1,["Τι χρειάζεται για ένα έγκυρο SFP σε υψηλό;","Κλείσιμο πάνω από το υψηλό","Σκιά πάνω από το προηγούμενο υψηλό αλλά κλείσιμο ξανά κάτω από αυτό","Τρία πράσινα κεριά","Χαμηλός RSI","Αν απλώς ακουμπήσει χωρίς να περάσει, ή κλείσει από πάνω, δεν είναι SFP."],null,2],
["pat","sfp",3,["Με ποιες ιδέες είναι συγγενικό το SFP;","Με το DCA","Με τον SMA 200","Με τα μερίσματα","Με το liquidity sweep του SMC και το upthrust/spring του Wyckoff","Όλα περιγράφουν ψεύτικο σπάσιμο που παίρνει stops και γυρίζει."],null,2],
["pat","vcp",0,["Τι χαρακτηρίζει ένα VCP;","Διορθώσεις που μικραίνουν (π.χ. 30%, 15%, 6%) με όγκο που στεγνώνει","Διορθώσεις που μεγαλώνουν","Ένα μεγάλο gap","Τρία doji","Οι πωλητές εξαντλούνται. Η είσοδος γίνεται στο σπάσιμο του pivot με όγκο."],null,2],
["ind","heikin",2,["Γιατί δεν κάνεις backtest με κεριά Heikin Ashi;","Επειδή δεν έχουν χρώμα","Επειδή δείχνουν μόνο όγκο","Επειδή οι τιμές τους είναι μέσοι όροι και όχι πραγματικές, οπότε τα αποτελέσματα βγαίνουν ψεύτικα καλά","Επειδή δεν υπάρχουν στο TradingView","Τα Heikin Ashi είναι για ανάγνωση τάσης. Εντολές και backtest σε κανονικά κεριά."],null,2],
["ind","avwap",1,["Τι δείχνει μια anchored VWAP από το χαμηλό μιας τάσης;","Τον όγκο της ημέρας","Τη μέση τιμή όλων όσων αγόρασαν από εκείνο το χαμηλό","Το RSI","Την αλλαγή 24 ωρών","Αν η τιμή είναι πάνω της, κατά μέσο όρο οι αγοραστές κερδίζουν, και συχνά λειτουργεί ως στήριξη."],null,2],
["ind","fibext",0,["Σε τι χρησιμεύουν οι Fibonacci extensions;","Σε στόχους: πού μπορεί να φτάσει η επόμενη κίνηση","Σε είσοδο στο pullback","Στον υπολογισμό ποσότητας","Στον όγκο","Το retracement βρίσκει πού γυρίζει το pullback, το extension πού μπορεί να φτάσει η κίνηση μετά."],null,1],
["ind","fibext",3,["Ποιο επίπεδο extension είναι ο πιο συνηθισμένος πρώτος στόχος;","0,236","0,5","3,0","1,272","Το 1,618 είναι ο πιο γνωστός στόχος σε δυνατές τάσεις, το 1,0 είναι το measured move."],null,2],
["ind","hma",2,["Ποιο είναι το μειονέκτημα του Hull MA;","Είναι πολύ αργός","Δεν εμφανίζεται στο crypto","Σε πλάγια αγορά αλλάζει συνέχεια κατεύθυνση και δίνει ψεύτικα σήματα","Χρειάζεται όγκο","Η ταχύτητα έχει κόστος. Φιλτράρεται με ADX."],null,2],
["ind","aroon",1,["Aroon Up 100 και Aroon Down 0 σημαίνει:","Πλάγια αγορά","Ισχυρή άνοδος: νέο υψηλό μόλις τώρα, χαμηλό πολύ παλιό","Ισχυρή πτώση","Υπερπώληση","Το Aroon μετράει πόσο πρόσφατα έγιναν το υψηλό και το χαμηλό."],null,2],
["ind","cvd",3,["Η τιμή δεν πέφτει ενώ το CVD πέφτει έντονα. Τι μπορεί να σημαίνει;","Ότι ο δείκτης έχει σφάλμα","Ότι η αγορά έκλεισε","Ότι υπάρχει απόκλιση ανόδου στον RSI","Ότι κάποιος απορροφά τις επιθετικές πωλήσεις με limit εντολές (absorption)","Συχνά προηγείται ανόδου. Είναι όμως εργαλείο για προχωρημένους."],null,3],
["risk","stops",2,["Πού μπαίνει σωστά ένα stop;","Εκεί που «αντέχεις να χάσεις»","Ακριβώς στο στρογγυλό νούμερο","Στο σημείο όπου η ιδέα της συναλλαγής αποδεικνύεται λάθος, και μετά υπολογίζεις την ποσότητα","Όσο πιο κοντά γίνεται για μεγάλο R:R","Πρώτα το σωστό σημείο, μετά η ποσότητα ώστε η απόσταση να είναι 1% του λογαριασμού."],null,1],
["risk","stops",0,["Η τιμή πλησιάζει το stop σου. Τι κάνεις;","Τίποτα: το stop δεν μετακινείται ποτέ πιο μακριά","Το απομακρύνεις για να «αναπνεύσει»","Διπλασιάζεις τη θέση","Το σβήνεις","Η μετακίνηση του stop μακριά είναι από τα πιο ακριβά λάθη. Πιο κοντά (trailing) επιτρέπεται."],null,1],
["risk","trailing",1,["Σε ένα σχέδιο με μερικό κλείσιμο, τι κάνεις συνήθως στο 2R;","Ανοίγεις νέα θέση","Κλείνεις το 50% και μεταφέρεις το stop στο σημείο εισόδου","Μετακινείς το stop πιο μακριά","Τίποτα","Το υπόλοιπο τρέχει με trailing stop. Η καμπύλη γίνεται πιο ομαλή, το μέσο R λίγο μικρότερο."],null,2],
["risk","trailing",3,["Ποιο είναι το μειονέκτημα του break-even πολύ νωρίς;","Αυξάνει το ρίσκο","Αυξάνει τις προμήθειες","Δεν επιτρέπεται","Σε βγάζει από συναλλαγές που θα πετύχαιναν, γιατί η τιμή συχνά κάνει pullback","Δοκίμασε στο backtest πότε συμφέρει να μεταφέρεις το stop."],null,2],
["risk","ruin",2,["Με ρίσκο 5% ανά συναλλαγή, πόσο πέφτει ο λογαριασμός μετά από 10 σερί απώλειες;","Περίπου 5%","Περίπου 10%","Περίπου 40%","Μηδενίζεται","0,95^10 ≈ 0,60. Με 1% θα ήταν μόνο ≈ −10%."],null,2],
["risk","ruin",0,["Γιατί οι traders χρησιμοποιούν μόνο κλάσμα του Kelly;","Γιατί τα πραγματικά ποσοστά επιτυχίας και R:R δεν τα ξέρουμε με ακρίβεια, και το πλήρες Kelly δίνει τεράστιες πτώσεις","Γιατί το Kelly είναι παράνομο","Γιατί δίνει πολύ μικρό ρίσκο","Γιατί ισχύει μόνο για μετοχές","Με 50% επιτυχία και 2R, το Kelly λέει 25% ανά συναλλαγή: καταστροφικό στην πράξη."],null,3],
["smc","smc-inducement",3,["Τι είναι συνήθως τα ίσα υψηλά (equal highs) πάνω από την τιμή;","Σίγουρη αντίσταση που δεν σπάει","Ένδειξη πτώσης","Τίποτα","Συγκέντρωση stops: πιθανός μαγνήτης που η τιμή «σκουπίζει» πριν γυρίσει","Γι' αυτό περιμένεις το sweep και μετά CHoCH πριν μπεις."],null,3],
["smc","smc-po3",1,["Στο Power of 3 (AMD), τι είναι η «Manipulation»;","Η άνοδος της ημέρας","Μια ψεύτικη κίνηση προς τη λάθος μεριά που παίρνει stops, συχνά στο άνοιγμα του Λονδίνου","Το κλείσιμο της αγοράς","Η ανακοίνωση ειδήσεων","Μετά ακολουθεί η πραγματική κίνηση της ημέρας (Distribution)."],null,3],
["smc","smc-sb",2,["Σε ποιο παράθυρο ψάχνεις το ICT Silver Bullet (ώρα Ελλάδας, συνήθως);","09:00-10:00","13:00-14:00","17:00-18:00 (10:00-11:00 Νέα Υόρκη)","23:00-24:00","Ψάχνεις FVG που σχηματίζεται μέσα στο παράθυρο, μετά από sweep ρευστότητας."],null,3],
["cry","c-unlocks",0,["Ένα token έχει κυκλοφορία 15% της συνολικής προσφοράς. Τι σημαίνει αυτό;","Το 85% θα έρθει στην αγορά στο μέλλον: πιθανή πίεση πώλησης στα unlocks","Ότι είναι σπάνιο και θα ανέβει σίγουρα","Ότι δεν μπορεί να πέσει","Τίποτα","Κοίτα και το FDV σε σχέση με το market cap, και τις ημερομηνίες unlocks."],null,2],
["cry","c-stable",3,["Τι είναι το depeg ενός stablecoin;","Η αύξηση του όγκου","Η αλλαγή ονόματος","Η μετατροπή σε BTC","Η προσωρινή απώλεια της ισοτιμίας 1:1 με το δολάριο","Συνέβη π.χ. στο USDC τον Μάρτιο 2023, που έπεσε στα ~0,88$. Μην κρατάς όλα σε ένα stablecoin."],null,1],
["cry","c-meme",2,["Ποιο είναι σημάδι πιθανού rug pull;","Μεγάλο ανταλλακτήριο","Πολλοί κάτοχοι","Ρευστότητα που δεν είναι κλειδωμένη και λίγοι κάτοχοι με το μεγαλύτερο μέρος","Μεγάλος όγκος σε πολλά ανταλλακτήρια","Η ρευστότητα μπορεί να αποσυρθεί ξαφνικά. Επίσης ύποπτο: μπορείς να αγοράσεις αλλά όχι να πουλήσεις (honeypot)."],null,1],
["cry","c-etf",1,["Πότε κάνει συχνά τις μεγάλες κινήσεις του το BTC μετά τα spot ETFs;","03:00-06:00 ώρα Ελλάδας","Όταν διαπραγματεύονται τα ETFs, περίπου 16:30-23:00 ώρα Ελλάδας","Μόνο Σαββατοκύριακα","Ποτέ","Οι εισροές και εκροές των ETFs δείχνουν ζήτηση από θεσμικούς."],null,2],
["stk","k-rvol",0,["RVOL 4 σημαίνει:","Ότι ο όγκος είναι 4 φορές ο συνηθισμένος: κάτι συμβαίνει σε αυτή τη μετοχή","Ότι το ρίσκο είναι 4%","Ότι η μετοχή πέφτει 4%","Ότι έχει 4 εκατ. μετοχές","Οι μετοχές με υψηλό σχετικό όγκο κινούνται πολύ μέσα στη μέρα."],null,2],
["stk","k-premarket",3,["Γιατί σημειώνεις το υψηλό και το χαμηλό του pre-market;","Για φορολογικούς λόγους","Γιατί είναι οι τιμές κλεισίματος","Δεν έχουν σημασία","Γιατί λειτουργούν συχνά ως σημαντικά επίπεδα μετά το άνοιγμα","Συνδυάζονται με Opening Range Breakout και Gap and Go."],null,1],
["stk","k-options",1,["Τι είναι το IV crush;","Η πτώση της μετοχής μετά από μέρισμα","Η απότομη πτώση της implied volatility μετά από ανακοίνωση, όπως τα αποτελέσματα","Η αύξηση του όγκου","Το κλείσιμο της αγοράς","Ακόμα κι αν η μετοχή κινηθεί σωστά, τα options μπορεί να χάσουν αξία."],null,3],
["psy","p-overtrade",2,["Ποιο είναι σημάδι overtrading;","Μία συναλλαγή την εβδομάδα","Συναλλαγές μόνο με σχέδιο","Συναλλαγές χωρίς να μπορείς να πεις ποια στρατηγική ακολουθείς","Τήρηση του ορίου ημέρας","Στις Αναλύσεις, το «Εκτός πλάνου» δείχνει το κόστος σε αριθμούς."],null,1],
["psy","p-process",0,["Μια συναλλαγή ακολούθησε όλους τους κανόνες και έχασε. Πώς την κρίνεις;","Καλή συναλλαγή: τήρησες τη διαδικασία","Κακή συναλλαγή","Λόγο να αλλάξεις στρατηγική","Λόγο να διπλασιάσεις την επόμενη","Κρίνεις τον εαυτό σου από την τήρηση των κανόνων, τη στρατηγική από 30+ συναλλαγές."],null,1],
["psy","p-weekly",1,["Στον εβδομαδιαίο απολογισμό, τι ψάχνεις στις 3 χειρότερες συναλλαγές;","Ποιος έφταιγε","Τι είχαν κοινό: ώρα, διάθεση, στρατηγική, σύμβολο","Πώς να τις σβήσεις","Τίποτα","Από εκεί βγαίνει ένας συγκεκριμένος κανόνας για την επόμενη εβδομάδα."],null,1],
["psy","p-tilt",3,["Μετά από 2 απώλειες στη σειρά, ποιος είναι καλός κανόνας;","Διπλή θέση για να καλύψεις","Άλλαξε στρατηγική","Μικρότερο timeframe","Διάλειμμα 30 λεπτών μακριά από την οθόνη","Σε tilt δεν το καταλαβαίνεις μόνος σου. Γι' αυτό οι κανόνες αποφασίζονται από πριν."],null,1]
];

QBANK=QBANK.concat(QBANK_G).concat(QBANK_X).concat(QBANK_Y);
/* ================= 3D Καθηγητής (μικρή μηχανή WebGL) ================= */
var P3D=window.P3D={ok:false,mood:'',talk:false,think:false,snap:null,gx:0,gy:0,lastMove:0,nod:0,shake:0,cheer:0,blinkT:0,blink:0,t0:0};
(function(){
  /* ---------- math ---------- */
  function m4(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
  function mul(a,b){var o=new Float32Array(16);for(var i=0;i<4;i++)for(var j=0;j<4;j++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o}
  function tr(x,y,z){var m=m4();m[12]=x;m[13]=y;m[14]=z;return m}
  function sc(x,y,z){var m=m4();m[0]=x;m[5]=y;m[10]=z;return m}
  function rx(a){var m=m4(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m}
  function ry(a){var m=m4(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m}
  function rz(a){var m=m4(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m}
  function persp(f,a,n,fa){var t=1/Math.tan(f/2),m=new Float32Array(16);m[0]=t/a;m[5]=t;m[10]=(fa+n)/(n-fa);m[11]=-1;m[14]=2*fa*n/(n-fa);return m}
  function lookAt(e,c,u){var z=nrm([e[0]-c[0],e[1]-c[1],e[2]-c[2]]),x=nrm(cr(u,z)),y=cr(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dt(x,e),-dt(y,e),-dt(z,e),1])}
  function nrm(v){var l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]}
  function cr(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function dt(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  function nmat(m){var a=m[0],b=m[1],c=m[2],d=m[4],e=m[5],f=m[6],g=m[8],h=m[9],i=m[10];var A=e*i-f*h,B=-(d*i-f*g),C=d*h-e*g,det=a*A+b*B+c*C||1;
    return new Float32Array([A/det,B/det,C/det,-(b*i-c*h)/det,(a*i-c*g)/det,-(a*h-b*g)/det,(b*f-c*e)/det,-(a*f-c*d)/det,(a*e-b*d)/det])}
  /* ---------- geometry ---------- */
  function finish(p,idx){var n=new Float32Array(p.length);for(var t=0;t<idx.length;t+=3){var a=idx[t]*3,b=idx[t+1]*3,c=idx[t+2]*3;
      var ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
      [a,b,c].forEach(function(k){n[k]+=nx;n[k+1]+=ny;n[k+2]+=nz})}
    for(var k=0;k<n.length;k+=3){var l=Math.hypot(n[k],n[k+1],n[k+2])||1;n[k]/=l;n[k+1]/=l;n[k+2]/=l}return {p:p,n:n,i:idx}}
  function sphere(ws,hs,def,tl){tl=tl||1;var p=[],idx=[];for(var y=0;y<=hs;y++){var v=y/hs,th=v*Math.PI*tl;for(var x=0;x<=ws;x++){var u=x/ws,ph=u*Math.PI*2,q=[-Math.cos(ph)*Math.sin(th),Math.cos(th),Math.sin(ph)*Math.sin(th)];if(def)q=def(q);p.push(q[0],q[1],q[2])}}
    for(y=0;y<hs;y++)for(x=0;x<ws;x++){var a=y*(ws+1)+x,b=a+ws+1;if(y!==0)idx.push(a,b,a+1);if(y!==hs-1||tl<1)idx.push(a+1,b,b+1)}
    return finish(new Float32Array(p),new Uint16Array(idx))}
  function lathe(pts,seg){var p=[],idx=[];for(var i=0;i<=seg;i++){var a=i/seg*Math.PI*2,s=Math.sin(a),c=Math.cos(a);pts.forEach(function(q){p.push(q[0]*s,q[1],q[0]*c)})}
    var L=pts.length;for(i=0;i<seg;i++)for(var j=0;j<L-1;j++){var A=i*L+j,B=A+L;idx.push(A,A+1,B,B,A+1,B+1)}return finish(new Float32Array(p),new Uint16Array(idx))}
  function torus(R,r,ts,rs,arc){arc=arc||Math.PI*2;var p=[],idx=[];for(var j=0;j<=rs;j++)for(var i=0;i<=ts;i++){var u=i/ts*arc,v=j/rs*Math.PI*2;p.push((R+r*Math.cos(v))*Math.cos(u),(R+r*Math.cos(v))*Math.sin(u),r*Math.sin(v))}
    for(j=1;j<=rs;j++)for(i=1;i<=ts;i++){var a=(ts+1)*j+i-1,b=(ts+1)*(j-1)+i-1,c=(ts+1)*(j-1)+i,d=(ts+1)*j+i;idx.push(a,b,d,b,c,d)}return finish(new Float32Array(p),new Uint16Array(idx))}
  function cyl(r0,r1,h,seg){return lathe([[0,-h/2],[r0,-h/2],[r1,h/2],[0,h/2]],seg)}
  function rrTube(w,h,rad,t,ns,rs){var path=[],cs=[[w/2-rad,h/2-rad,0],[-(w/2-rad),h/2-rad,Math.PI/2],[-(w/2-rad),-(h/2-rad),Math.PI],[w/2-rad,-(h/2-rad),Math.PI*1.5]];
    cs.forEach(function(c){for(var k=0;k<=ns;k++){var a=c[2]+k/ns*Math.PI/2;path.push([c[0]+rad*Math.cos(a),c[1]+rad*Math.sin(a),Math.cos(a),Math.sin(a)])}});
    var p=[],idx=[],P=path.length;path.forEach(function(q){for(var j=0;j<rs;j++){var v=j/rs*Math.PI*2,cv=Math.cos(v),sv=Math.sin(v);p.push(q[0]+t*cv*q[2],q[1]+t*cv*q[3],t*sv*1.4)}});
    for(var i=0;i<P;i++){var i2=(i+1)%P;for(var j=0;j<rs;j++){var j2=(j+1)%rs,a=i*rs+j,b=i2*rs+j,c=i2*rs+j2,d=i*rs+j2;idx.push(a,d,b,b,d,c)}}
    return finish(new Float32Array(p),new Uint16Array(idx))}
  function ss(e0,e1,x){var t=Math.max(0,Math.min(1,(x-e0)/(e1-e0)));return t*t*(3-2*t)}
  function headDef(q){var x=q[0]*0.8,y=q[1]*1.02,z=q[2]*0.9;
    if(y<0){var k=ss(0,-1,y);x*=1-0.14*k*k-0.04*k;if(z>0)z*=1-0.08*k}
    if(z<0)z*=1.08;if(y>0.25&&z>0)z*=1-0.04*ss(0.25,1,y);
    if(z>0.55&&Math.abs(y)<0.25&&Math.abs(x)>0.28)z+=0.03*(1-Math.abs(y)/0.25);   /* cheekbones */
    if(y<-0.55&&z>0.2)z+=0.05*ss(-0.55,-0.95,y);   /* chin */
    return [x,y,z]}
  /* ---------- shaders ---------- */
  var VS='attribute vec3 aP;attribute vec3 aN;uniform mat4 uM,uV,uP;uniform mat3 uNm;uniform float uMorph,uMorphK;varying vec3 vW,vN,vO;void main(){vec3 p=aP;p.y+=uMorph*p.x*p.x*uMorphK;vO=p;vec4 w=uM*vec4(p,1.);vW=w.xyz;vN=normalize(uNm*aN);gl_Position=uP*uV*w;}';
  var FS='precision highp float;varying vec3 vW,vN,vO;uniform vec3 uCol,uEye;uniform float uMode,uSpec,uShin,uAlpha,uWrap,uMouth;'+
   'float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}'+
   'float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}'+
   'float fbm(vec3 p){return .5*n3(p)+.27*n3(p*2.03)+.15*n3(p*4.1)+.08*n3(p*8.3);}'+
   'void main(){vec3 o=vO,col=uCol;float spec=uSpec,shin=uShin,wrap=uWrap,al=uAlpha,aniso=0.,sss=0.,ao=1.;vec3 N=normalize(vN);'+
   /* hair: κόμη με τρίχες και ανισοτροπική λάμψη */ 'if(uMode>1.5&&uMode<2.5){float e=n3(o*9.)*.07;float hl=.5+.1*smoothstep(.18,.5,abs(o.x))-.06*smoothstep(.0,-.4,o.x)*step(.0,o.z);bool keep=o.y>-.28+e&&(o.z<.1+e||(abs(o.x)>.58+e*.5&&o.y>.04&&o.z<.46)||o.y>hl+e);if(!keep)discard;'+
   'float s=n3(vec3(o.x*10.,o.y*55.,o.z*90.)+fbm(o*5.)*3.),s2=n3(vec3(o.x*160.,o.y*30.,o.z*160.));col*=.55+.5*s+.3*s2;float pt=smoothstep(.03,0.,abs(o.x+.27))*step(.5,o.y)*step(-.1,o.z);col*=1.-.45*pt;spec=.0;aniso=1.;ao=.85+.15*smoothstep(-.2,.6,o.y);}'+
   /* beard: πυκνό, με απαλή άκρη και χωρίς φωτεινές κουκκίδες */ 'if(uMode>2.5&&uMode<3.5){float e=n3(o*13.)*.04,ax=abs(o.x);float line=-.43+max(0.,ax-.28)*.72;bool keep=o.z>-.15&&(o.y<line+e||(ax>.74&&o.y<.08&&o.z<.36));if(length(vec2(o.x/.2,(o.y+.445)/.075))<1.&&o.z>.4)keep=false;if(!keep)discard;'+
   'float edge=smoothstep(0.,.09,line+e-o.y)*(ax>.7&&o.y>line?.8:1.);float s=n3(vec3(o.x*190.,o.y*130.,o.z*190.));if(s>.5+.45*edge)discard;float st=n3(vec3(o.x*240.,o.y*60.,o.z*240.));col*=.45+.55*fbm(vec3(o.x*50.,o.y*22.,o.z*50.))+.35*st;col=mix(col,col*vec3(1.25,1.1,.95),.3*smoothstep(.3,.9,st));spec=.0;aniso=.8;ao=.75+.25*edge;}'+
   /* brows */ 'if(uMode>3.5&&uMode<4.5){float s=n3(vec3(o.x*55.,o.y*14.,o.z*55.));col*=.6+.5*s;spec=.0;aniso=.5;}'+
   /* eye: ίριδα με ίνες, δακτύλιος, κόρη, υγρή λάμψη */ 'if(uMode>4.5&&uMode<5.5){float r=length(o.xy);col=mix(col,vec3(.93,.84,.82),smoothstep(.55,.95,abs(o.x))*.6);if(o.z>0.){if(r<.44){float a=atan(o.y,o.x);vec3 ir=mix(vec3(.38,.24,.12),vec3(.16,.09,.04),smoothstep(.1,.44,r));ir*=.7+.5*n3(vec3(a*12.,r*30.,1.))+.2*n3(vec3(a*30.,r*6.,2.));ir=mix(ir,vec3(.55,.38,.16),.35*smoothstep(.22,.12,r));if(r>.39)ir*=.35;col=ir;if(r<.17)col=vec3(.01);}}spec=2.4;shin=600.;wrap=.2;}'+
   /* skin: πόροι, υποδόρια σκέδαση, ρόδινα σημεία */ 'if(uMode<0.5){float s=fbm(o*30.);col*=.93+.12*s;float so=smoothstep(.27,.1,length(vec2(abs(o.x)-.29,(o.y-.08)*1.25)))*step(.5,o.z);col*=1.-.22*so;ao*=1.-.25*so;float bl=smoothstep(.36,.0,length(vec2(abs(o.x)-.45,o.y+.12)))*step(.4,o.z);col=mix(col,vec3(.8,.42,.36),bl*.3);float nose=smoothstep(.25,0.,length(o.xy-vec2(0.,-.18)))*step(.7,o.z);col=mix(col,vec3(.82,.45,.4),nose*.28);float beardShadow=smoothstep(-.3,-.55,o.y)*step(.0,o.z);col=mix(col,col*vec3(.78,.74,.72),beardShadow*.5);'+
   'vec3 q=o*70.;float b0=n3(q);vec3 g=vec3(n3(q+vec3(.6,0,0))-b0,n3(q+vec3(0,.6,0))-b0,n3(q+vec3(0,0,.6))-b0);N=normalize(N-g*.18);sss=1.;float oil=smoothstep(.3,0.,length(o.xy-vec2(0.,.25)))+smoothstep(.2,0.,length(o.xy-vec2(0.,-.15)));spec=.18+.25*oil;shin=40.+50.*oil;}'+
   /* suit: ύφανση και γυαλάδα υφάσματος */ 'if(uMode>5.5&&uMode<6.5){float v=abs(o.x)-(-o.y-1.3)*.17;if(o.z>0.&&v<0.&&o.y<-1.35)discard;float lap=smoothstep(.0,.06,v)*(1.-smoothstep(.06,.3,v))*step(0.,o.z)*step(o.y,-1.4);col*=1.-.3*lap;float tw=sin((o.x+o.y)*420.)*.5+.5;col*=.88+.1*tw+.12*n3(o*80.);spec=.06;shin=8.;aniso=.25;}'+
   'if(uMode>6.5&&uMode<7.5){col=uCol*(.9+.12*n3(vec3(o.x*90.,o.y*25.,1.)));spec=.08;}'+
   'if(uMode>7.5&&uMode<8.5){spec=1.6;shin=220.;}'+
   'if(uMode>9.5&&uMode<10.5){spec=.6;shin=80.;}'+
   'vec3 V=normalize(uEye-vW);vec3 L1=normalize(vec3(-2.4,3.2,4.2)),L2=normalize(vec3(3.2,.9,2.4)),L3=normalize(vec3(.6,2.2,-4.));'+
   'float n1=dot(N,L1),n2=dot(N,L2);float d1=max(0.,(n1+wrap)/(1.+wrap)),d2=max(0.,(n2+wrap)/(1.+wrap));'+
   'vec3 D1=vec3(d1);if(sss>.5){D1=vec3(max(0.,(n1+.6)/1.6),max(0.,(n1+.32)/1.32),max(0.,(n1+.22)/1.22));D1=D1*D1*(3.-2.*D1);}'+
   'vec3 amb=mix(vec3(.24,.2,.19),vec3(.5,.56,.66),N.y*.5+.5)*ao*(1.-.3*smoothstep(.1,-.9,N.y));'+
   'vec3 c=col*(amb*.62+D1*vec3(1.15,1.,.86)*1.12+d2*vec3(.48,.6,.82)*.38);'+
   'if(sss>.5){float bk=pow(max(0.,dot(-V,L1)),3.)*.18+pow(max(0.,dot(-V,L2)),3.)*.08;c+=vec3(.95,.32,.2)*bk+col*vec3(.08,.02,.01);}'+
   'float fr=pow(1.-max(0.,dot(N,V)),4.);float rim=pow(1.-max(0.,dot(N,V)),3.);c+=vec3(.7,.82,1.)*rim*(.25+.35*max(0.,dot(N,L3)))*(uMode>9.5&&uMode<10.5?.08:(uMode>1.5&&uMode<4.5?.12:(sss>.5?.55:.8)));'+
   'vec3 H=normalize(L1+V),H2=normalize(L2+V);float F=.04+.96*pow(1.-max(0.,dot(H,V)),5.);'+
   'c+=vec3(1.)*spec*pow(max(0.,dot(N,H)),shin)*(.5+F)*.7*(sss>.5?d1:1.);c+=vec3(.72,.82,1.)*spec*pow(max(0.,dot(N,H2)),shin)*.25;'+
   'if(aniso>0.){vec3 T=normalize(vec3(0.,1.,0.)-N*N.y+vec3(.0001));float th=dot(T,H),sn=sqrt(max(0.,1.-th*th));float th2=dot(T,normalize(H+N*.25));float sn2=sqrt(max(0.,1.-th2*th2));c+=(vec3(.42,.38,.34)*pow(sn,70.)+col*1.6*pow(sn2,18.)*.5)*aniso*d1*.55;}'+
   'if(sss>.5)c+=vec3(.9,.95,1.)*fr*.06;'+
   'c*=1.;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);c=pow(clamp(c,0.,1.),vec3(1./2.1));c=mix(vec3(dot(c,vec3(.299,.587,.114))),c,1.22);gl_FragColor=vec4(c,al);}';
  var gl,prog,loc={},parts=[],cv,W=200,H=220;
  function mk(geo){var b={n:geo.i.length};b.p=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b.p);gl.bufferData(gl.ARRAY_BUFFER,geo.p,gl.STATIC_DRAW);
    b.nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b.nb);gl.bufferData(gl.ARRAY_BUFFER,geo.n,gl.STATIC_DRAW);b.ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geo.i,gl.STATIC_DRAW);return b}
  function rgb(h){return [(h>>16&255)/255,(h>>8&255)/255,(h&255)/255].map(function(v){return Math.pow(v,2.2)})}
  function part(name,geo,col,mode,opt){opt=opt||{};parts.push({name:name,b:mk(geo),col:rgb(col),mode:mode,spec:opt.spec==null?.3:opt.spec,shin:opt.shin||30,wrap:opt.wrap==null?.3:opt.wrap,alpha:opt.alpha||1,local:opt.m||m4(),grp:opt.grp||'body',morphK:opt.mk||0,dyn:opt.dyn||null})}
  function build(){
    var SK=0xd9a989,HAIR=0x2a1f19,SUIT=0x2c2f35,SHIRT=0xf3f4f6,TIE=0x1b2230,FRAME=0x0d0d0e,BEARD=0x35281f;
    var head=sphere(96,72,headDef);
    part('head',head,SK,0,{grp:'head',spec:.22,shin:22,wrap:.45});
    part('hair',sphere(110,84,function(q){var r=headDef(q),top=Math.max(0,r[1]);return [r[0]*(1.045+.02*top),r[1]*1.045+.02+.02*top*top,r[2]*(1.05+.01*top)]}),HAIR,2,{grp:'head',wrap:.4});
    part('beard',sphere(120,90,function(q){var r=headDef(q);return [r[0]*1.018,r[1]*1.012,r[2]*1.022]}),BEARD,3,{grp:'head',wrap:.4});
    part('earL',sphere(16,16),SK,0,{grp:'head',m:mul(tr(-.8,-.04,-.02),mul(ry(-.35),sc(.07,.21,.14))),wrap:.5});
    part('earR',sphere(16,16),SK,0,{grp:'head',m:mul(tr(.8,-.04,-.02),mul(ry(.35),sc(.07,.21,.14))),wrap:.5});
    part('noseB',sphere(28,28),SK,0,{grp:'head',m:mul(tr(0,-.05,.84),mul(rx(-.34),sc(.078,.26,.12))),wrap:.45,spec:.3});
    part('noseT',sphere(28,28),SK,0,{grp:'head',m:mul(tr(0,-.22,.94),sc(.088,.082,.088)),wrap:.45,spec:.35,shin:30});
    part('nostL',sphere(18,18),SK,0,{grp:'head',m:mul(tr(-.075,-.25,.88),sc(.055,.048,.06)),wrap:.45});
    part('nostR',sphere(18,18),SK,0,{grp:'head',m:mul(tr(.075,-.25,.88),sc(.055,.048,.06)),wrap:.45});
    part('mouth',sphere(20,12),0x3a1414,9,{grp:'head',dyn:'mouth',spec:.1});
    part('lipL',sphere(24,12),0xb7726a,0,{grp:'head',dyn:'lipL',mk:1,spec:.4,shin:40});
    part('stache',sphere(32,16),BEARD,4,{grp:'head',m:mul(tr(0,-.335,.905),sc(.24,.055,.09)),mk:1,dyn:'stache',wrap:.4});
    ['L','R'].forEach(function(s,i){var x=i?.29:-.29;
      part('eye'+s,sphere(36,24),0xf2ede6,5,{grp:'head',dyn:'eye'+s,m:mul(tr(x,.1,.72),sc(.112,.112,.112))});
      part('lidU'+s,sphere(28,14,null,.55),SK,0,{grp:'head',dyn:'lid'+s,wrap:.45});
      part('lidD'+s,sphere(24,12,null,.3),SK,0,{grp:'head',m:mul(tr(x*.983,.1,.79),mul(rx(Math.PI+.45),sc(.122,.122,.122))),wrap:.45});
      part('brow'+s,sphere(20,10),0x221913,4,{grp:'head',dyn:'brow'+s});
      part('rim'+s,rrTube(.4,.26,.07,.021,8,12),FRAME,10,{grp:'glass',m:tr(x*1.05,.1,.99)});
      part('temple'+s,cyl(.024,.024,.85,8),FRAME,10,{grp:'glass',m:mul(tr(i?.68:-.68,.12,.55),mul(ry(i?-.18:.18),rx(Math.PI/2)))});
    });
    part('bridge',torus(.07,.024,16,8,Math.PI),FRAME,10,{grp:'glass',m:mul(tr(0,.15,1.02),sc(1,.55,1))});

    part('neck',cyl(.4,.45,.8,24),SK,0,{m:tr(0,-1.05,-.05),wrap:.45});
    part('shirt',lathe([[.44,-1.2],[.62,-1.36],[1.5,-1.72],[1.72,-2.3],[1.76,-3.6]],48),SHIRT,7,{m:sc(1,1,.62)});
    part('collarL',sphere(16,10),SHIRT,7,{m:mul(tr(-.2,-1.38,.36),mul(rz(-.6),sc(.22,.09,.16)))});
    part('collarR',sphere(16,10),SHIRT,7,{m:mul(tr(.2,-1.38,.36),mul(rz(.6),sc(.22,.09,.16)))});
    part('knot',sphere(16,12),TIE,7,{m:mul(tr(0,-1.5,.6),sc(.08,.1,.07)),spec:.35});
    part('tie',lathe([[0,.62],[.055,.58],[.065,.2],[.1,-.45],[0,-.62]],12),TIE,7,{m:mul(tr(0,-2.12,.98),mul(rx(-.3),sc(1,1,.25))),spec:.35});
    part('suit',lathe([[.5,-1.26],[.72,-1.4],[1.6,-1.72],[1.86,-2.25],[1.9,-3.6]],56),SUIT,6,{m:sc(1,1,.6),wrap:.35});
    part('square',sphere(12,8),0xe9e9e9,7,{m:mul(tr(-.95,-2.15,.78),mul(ry(-.5),sc(.14,.05,.04)))});
    part('lensL',sphere(24,12),0xdfeeff,8,{grp:'glass',m:mul(tr(-.305,.1,1.0),sc(.2,.13,.012)),alpha:.06,spec:.8,shin:160});
    part('lensR',sphere(24,12),0xdfeeff,8,{grp:'glass',m:mul(tr(.305,.1,1.0),sc(.2,.13,.012)),alpha:.06,spec:.8,shin:160});
  }
  function init(){
    cv=document.createElement('canvas');cv.className='p3d';var dpr=Math.min(3,(window.devicePixelRatio||1)*1.5);cv.width=W*dpr;cv.height=H*dpr;
    gl=cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true});if(!gl)return false;
    function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
    prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
    ['aP','aN'].forEach(function(a){loc[a]=gl.getAttribLocation(prog,a)});
    ['uM','uV','uP','uNm','uCol','uEye','uMode','uSpec','uShin','uAlpha','uWrap','uMorph','uMorphK','uMouth'].forEach(function(u){loc[u]=gl.getUniformLocation(prog,u)});
    build();gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }
  var st={yaw:0,pitch:0,ey:0,ex:0,open:0,smile:.25,brow:0,sx:0,sy:0,breath:0};
  function lerp(a,b,k){return a+(b-a)*k}
  function frame(t){
    var s=t/1000,M=P3D.mood;
    /* targets */
    var idle=Date.now()-P3D.lastMove>2500,ty=idle?Math.sin(s*.4)*.25+Math.sin(s*1.3)*.05:P3D.gx*.55,tp=idle?Math.sin(s*.33)*.06-.02:-P3D.gy*.3;
    if(P3D.think){ty=.25;tp=.18}
    st.yaw=lerp(st.yaw,ty,.06);st.pitch=lerp(st.pitch,tp,.06);
    st.ex=lerp(st.ex,(idle?Math.sin(s*.9)*.25:P3D.gx*.5)+(P3D.think?.35:0),.15);st.ey=lerp(st.ey,(idle?Math.sin(s*.7)*.1:P3D.gy*.3)+(P3D.think?.25:0),.15);
    var tsm=M==='sad'?-0.9:(M==='happy'||M==='cheer')?1:M==='wow'?0:.3;st.smile=lerp(st.smile,tsm,.12);
    var tb=M==='wow'?1:M==='sad'?-.6:P3D.think?.5:0;st.brow=lerp(st.brow,tb,.12);
    var to=P3D.talk?(.35+.35*Math.abs(Math.sin(s*11)*Math.sin(s*7.3))):(M==='wow'?.7:(M==='cheer'?.45:0));st.open=lerp(st.open,to,P3D.talk?.45:.15);
    /* blink */
    if(s>P3D.blinkT){P3D.blinkT=s+2.5+Math.random()*3.5;P3D.blink=s}var bt=(s-P3D.blink)/.16,bl=bt<1?Math.sin(bt*Math.PI):0;
    /* gestures */
    var nod=P3D.cheer>s?Math.sin((P3D.cheer-s)*14)*.12:0,shk=P3D.shake>s?Math.sin((P3D.shake-s)*18)*.12*(P3D.shake-s):0;
    st.breath=Math.sin(s*1.6)*.012;
    if(!P3D.adjNext)P3D.adjNext=s+6;if(s>P3D.adjNext&&!P3D.talk){P3D.adj=s;P3D.adjNext=s+14+Math.random()*10}
    var at=P3D.adj?(s-P3D.adj)/1.3:9,fy=at<1?(at<.35?ss(0,.35,at):at<.65?1:1-ss(.65,1,at)):0,gOff=at<1?Math.sin(at*Math.PI)*.045:0;
    var headM=mul(tr(0,-.16+st.breath*2+(P3D.cheer>s?Math.abs(Math.sin((P3D.cheer-s)*7))*.06:0),0),mul(ry(st.yaw+shk),mul(rx(-st.pitch+nod),rz(Math.sin(s*.5)*.03))));
    var bodyM=mul(tr(0,st.breath,0),ry(st.yaw*.15));
    var dpr=cv.width/W;gl.viewport(0,0,cv.width,cv.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    var eye=[0,-.45,8.6],V=lookAt(eye,[0,-.8,0],[0,1,0]),P=persp(.52,W/H,.1,50);
    gl.uniformMatrix4fv(loc.uV,false,V);gl.uniformMatrix4fv(loc.uP,false,P);gl.uniform3fv(loc.uEye,eye);
    var opaque=parts.filter(function(p){return p.alpha>=1}),trans=parts.filter(function(p){return p.alpha<1});
    opaque.concat(trans).forEach(function(p){
      if(P3D.hide&&P3D.hide[p.name])return;
      var L=p.local,mk=0;
      if(p.dyn){var side=p.dyn.slice(-1)==='L'?-1:1;
        if(p.dyn.indexOf('eye')===0){var x=side*.285;L=mul(tr(x,.1,.785),mul(ry(st.ex*.5),mul(rx(-st.ey*.5),sc(.112,.112,.112))))}
        else if(p.dyn.indexOf('lid')===0){var x2=side*.285,op=.58-bl*1.0-(M==='sad'?.15:0)+(M==='wow'?.25:0);L=mul(tr(x2,.1,.79),mul(rx(-op-(st.ey*.3)),sc(.124,.124,.124)))}
        else if(p.dyn.indexOf('brow')===0){var x3=side*.3;L=mul(tr(x3,.3+st.brow*.06,.86),mul(rz(side*(.08-st.brow*.12+(M==='sad'?-.25:0))),sc(.16,.03,.06)))}
        else if(p.dyn==='mouth'){L=mul(tr(0,-.44-st.open*.03,.82),sc(.15,.02+st.open*.07,.08))}
        else if(p.dyn==='lip'||p.dyn==='lipL'){L=mul(tr(0,-.47-st.open*.07,.9),sc(.13,.035,.06));mk=st.smile*1.5}
        else if(p.dyn==='stache'){mk=st.smile*.6}}
      if(p.grp==='finger'&&fy<=0)return;
      var Mw=p.grp==='head'?mul(bodyM,mul(headM,L)):p.grp==='glass'?mul(bodyM,mul(headM,mul(tr(0,gOff,gOff*.4),L))):p.grp==='finger'?mul(bodyM,mul(headM,mul(tr(.02,-1.6+fy*1.5,1.13-.06*(1-fy)),mul(rz(-.08),L)))):mul(bodyM,L);
      gl.uniformMatrix4fv(loc.uM,false,Mw);gl.uniformMatrix3fv(loc.uNm,false,nmat(Mw));
      gl.uniform3fv(loc.uCol,p.col);gl.uniform1f(loc.uMode,p.mode);gl.uniform1f(loc.uSpec,p.spec);gl.uniform1f(loc.uShin,p.shin);gl.uniform1f(loc.uAlpha,p.alpha);gl.uniform1f(loc.uWrap,p.wrap);
      gl.uniform1f(loc.uMorph,mk);gl.uniform1f(loc.uMorphK,p.morphK?1:0);
      if(p.mode===2||p.mode===3||p.mode===8||p.mode===10||p.alpha<1)gl.disable(gl.CULL_FACE);else gl.enable(gl.CULL_FACE);
      if(p.alpha<1)gl.depthMask(false);
      gl.bindBuffer(gl.ARRAY_BUFFER,p.b.p);gl.enableVertexAttribArray(loc.aP);gl.vertexAttribPointer(loc.aP,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ARRAY_BUFFER,p.b.nb);gl.enableVertexAttribArray(loc.aN);gl.vertexAttribPointer(loc.aN,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,p.b.ib);gl.drawElements(gl.TRIANGLES,p.b.n,gl.UNSIGNED_SHORT,0);
      gl.depthMask(true);
    });
    var mini=document.querySelector('.p3d-mini');if(mini&&mini.offsetParent){var c2=mini.getContext('2d');c2.clearRect(0,0,mini.width,mini.height);c2.drawImage(cv,0,0,mini.width,mini.height)}
  }
  var last=0;
  function loop(t){requestAnimationFrame(loop);if(document.hidden||t-last<33)return;last=t;try{frame(t)}catch(e){}}
  P3D.start=function(host){
    try{if(!init())return false}catch(e){return false}
    host.innerHTML='';host.appendChild(cv);P3D.ok=true;
    document.addEventListener('pointermove',function(e){var r=cv.getBoundingClientRect(),cx=r.width?r.left+r.width/2:window.innerWidth-60,cy=r.height?r.top+r.height*.3:window.innerHeight-90;
      P3D.gx=Math.max(-1,Math.min(1,(e.clientX-cx)/(window.innerWidth*.5)));P3D.gy=Math.max(-1,Math.min(1,(e.clientY-cy)/(window.innerHeight*.5)));P3D.lastMove=Date.now()},{passive:true});
    frame(performance.now());try{P3D.snap=cv.toDataURL('image/png')}catch(e){}
    requestAnimationFrame(loop);return true;
  };
  P3D.react=function(m){var s=performance.now()/1000;P3D.mood=m||'';if(m==='wow'&&(!P3D.adj||s-P3D.adj>3)){P3D.adj=s}if(m==='cheer'){P3D.cheer=s+.9}if(m==='sad'){P3D.shake=s+.8}if(m==='cheer'||m==='sad'){clearTimeout(P3D.mt);P3D.mt=setTimeout(function(){P3D.mood=''},1600)}};
})();


var QZ={tab:'class',cur:-1,lock:false,prac:null,pracCat:'all',pracScore:[0,0],ai:null,aiBusy:false,shownBubble:false};
var QCAT={grt:'Οι μεγάλοι traders',risk:'Ρίσκο',cdl:'Κεριά',pat:'Σχηματισμοί',ind:'Δείκτες',str:'Στρατηγικές',smc:'SMC',cry:'Crypto',stk:'Μετοχές & δείκτες',psy:'Ψυχολογία'};
var QLEVELS=[[0,'Μαθητευόμενος'],[100,'Παρατηρητής κεριών'],[300,'Αναλυτής'],[600,'Trader'],[1000,'Στρατηγός'],[1600,'Γκουρού της αγοράς']];
var QPRAISE=['Μπράβο!','Ακριβώς!','Σωστά, συνάδελφε!','Εξαιρετικά!','Έτσι μπράβο!'],QOOPS=['Όχι ακριβώς. Δες την εξήγηση.','Κοντά ήσουν!','Καλή ευκαιρία να το μάθεις.','Δεν πειράζει, έτσι μαθαίνουμε.'];
function qrng(seed){var s=(seed>>>0)||1;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function qperm(nn,seed){var a=[],r=qrng(seed);for(var i=0;i<nn;i++)a.push(i);for(var j=nn-1;j>0;j--){var k=Math.floor(r()*(j+1)),t=a[j];a[j]=a[k];a[k]=t}return a}
function qDayIdx(ds){var p=ds.split('-');return Math.round(Date.UTC(+p[0],+p[1]-1,+p[2])/864e5)}
function qDaily(ds){var d=qDayIdx(ds),N=ds<'2026-10-27'?QBANK_BASE:QBANK.length,out=[];for(var k=0;k<5;k++){var g=d*5+k,cyc=Math.floor(g/N);out.push(qperm(N,cyc*7919+13)[g%N])}return out}
function qOrder(qid,ds){return qperm(4,qid*131+qDayIdx(ds)*17+5)}
function qL(){return LANG_RU()?4:3}
function qText(qid){if(typeof qid==='string'&&qid.indexOf('g:')===0){var g=(S.qbMap||{})[qid.slice(2)]||{q:'…',o:['','','',''],a:0,e:'',cat:'psy'};return {cat:g.cat,ref:'',a:+g.a,q:g.q,o:g.o,e:g.e,lv:g.lv||2,gen:true}}
  var q=QBANK[qid],t=q[qL()]||q[3];return {cat:q[0],ref:q[1],a:q[2],q:t[0],o:[t[1],t[2],t[3],t[4]],e:t[5],lv:qLv(q)}}
function qLv(q){if(q[5])return q[5];var m=q[1]&&window.Manual&&Manual.entry(q[1]);return m&&m.lv?Math.min(3,m.lv):1}
function qDocId(uid,ds){return safeSeg((uid||'me')+'_'+ds)}
function qMine(ds){var id=qDocId(S.uid,ds);return (S.quiz||[]).find(function(x){return x.id===id})}
function qUsers(){var m={};(S.quiz||[]).forEach(function(x){if(x.by)m[x.by]=1});S.trades.forEach(function(t){if(t.by)m[t.by]=1});Object.keys(S.accounts||{}).forEach(function(k){var a=S.accounts[k];if(a&&a.by)m[a.by]=1});Object.keys(S.goals||{}).forEach(function(k){var g=S.goals[k];if(g&&g.by)m[g.by]=1});if(S.uid)m[S.uid]=1;return Object.keys(m).filter(function(u){return u!=='me'||!S.db})}
function qCanSave(){return !S.db||(S.canWrite&&S.uid&&S.uid!=='me')}
function qWarn(){if(qCanSave()&&!QZ.saveErr)return '';return '<div class="status warn qwarn"><strong>'+esc(QZ.saveErr?'Το αποτέλεσμα δεν αποθηκεύτηκε.':'Τα τεστ σου δεν μπορούν να αποθηκευτούν.')+'</strong><span>'+esc(S.uid&&S.uid!=='me'?'Ο λογαριασμός σου έχει πρόσβαση μόνο για ανάγνωση. Ζήτα από τον ιδιοκτήτη του ημερολογίου, από το κουμπί Share, να σου δώσει δικαίωμα επεξεργασίας (Contributor ή Editor) και μετά ανανέωσε τη σελίδα.':'Δεν είσαι συνδεδεμένος στο claude.ai με δικό σου λογαριασμό. Άνοιξε το ημερολόγιο από τον λογαριασμό σου στο claude.ai και ανανέωσε τη σελίδα.')+'</span></div>'}
function qStats(uid){
  var L=(S.quiz||[]).filter(function(x){return x.by===uid}),pts=0,cor=0,tot=0,done=0,days={},cat={};
  L.forEach(function(x){pts+=x.points||0;cor+=x.correct||0;tot+=(x.ans||[]).length;if(x.done){done++;days[x.date]=1}(x.ans||[]).forEach(function(a){var c=cat[a.c]=cat[a.c]||[0,0];c[1]++;if(a.ok)c[0]++})});
  var st=0,d=new Date();if(!days[lday(d)])d.setDate(d.getDate()-1);while(days[lday(d)]){st++;d.setDate(d.getDate()-1)}
  var lv=QLEVELS[0];QLEVELS.forEach(function(l){if(pts>=l[0])lv=l});var nx=QLEVELS.find(function(l){return l[0]>pts});
  return {pts:pts,cor:cor,tot:tot,acc:tot?cor/tot:NaN,done:done,streak:st,level:lv[1],next:nx,cat:cat,today:L.find(function(x){return x.date===today()})};
}
var PROF_PHOTO=true;/* ο Καθηγητής με πραγματική φωτογραφία (prof.jpg) */
function profSvg(cls){
  if(PROF_PHOTO){var tn=/tiny|mini/.test(cls||'');return '<span class="prof-svg pph '+(tn?'':'cut ')+(cls||'')+'" aria-hidden="true"><img src="'+(tn?'prof_face.jpg':'prof_cut.webp')+'" alt="" draggable="false"><i class="pph-eq"><b></b><b></b><b></b></i></span>'}
  if(P3D.ok&&P3D.snap&&/tiny/.test(cls||''))return '<img class="prof-svg '+cls+' p3d-img" src="'+P3D.snap+'" alt="">';
  return '<svg class="prof-svg '+(cls||'')+'" viewBox="0 0 120 130" aria-hidden="true">'+
   '<ellipse class="p-shadow" cx="60" cy="124" rx="30" ry="5"/>'+
   '<g class="p-all">'+
    '<path class="p-coat" d="M28 128 Q30 86 60 84 Q90 86 92 128 Z"/>'+
    '<path class="p-shirt" d="M52 86 L60 100 L68 86 Z"/>'+
    '<path class="p-bow" d="M58 88 L62 88 L63.5 92 L62.5 110 L60 114 L57.5 110 L56.5 92 Z"/>'+
    '<path class="p-lapel" d="M52 86 L58 108 L46 96 Z M68 86 L62 108 L74 96 Z"/>'+
    '<rect class="p-pocket" x="70" y="104" width="10" height="9" rx="1"/><rect class="p-pen" x="73" y="99" width="2" height="8" rx="1"/>'+
    '<g class="p-arm"><path class="p-coat" d="M88 100 Q102 92 104 76 L97 73 Q94 88 84 92 Z"/><circle class="p-skin" cx="101" cy="72" r="6"/>'+
     '<g class="p-chart"><rect x="92" y="44" width="26" height="22" rx="3"/><path class="p-up" d="M96 60 L101 54 L105 57 L113 48"/><rect class="p-c1" x="97" y="52" width="2.5" height="7"/><rect class="p-c2" x="104" y="50" width="2.5" height="8"/><rect class="p-c1" x="110" y="47" width="2.5" height="7"/></g></g>'+
    '<g class="p-head">'+
     '<ellipse class="p-skin" cx="60" cy="50" rx="26" ry="29"/>'+
     '<path class="p-hair" d="M33 52 Q29 24 58 19 Q90 19 88 52 Q86 40 82 36 Q74 30 50 31 Q44 31 46 26 Q38 32 36 40 Q34 45 33 52 Z"/>'+
     '<path class="p-beard" d="M34 54 Q34 77 60 82 Q86 77 86 54 Q84 66 78 68 Q70 66 66 68 Q60 74 54 68 Q50 66 42 68 Q36 66 34 54 Z"/>'+
     '<ellipse class="p-skin" cx="33" cy="54" rx="4" ry="6"/><ellipse class="p-skin" cx="87" cy="54" rx="4" ry="6"/>'+
     '<path class="p-brow" d="M41 40 Q48 35 55 39 M65 39 Q72 35 79 40"/>'+
     '<g class="p-eyes"><circle class="p-eye" cx="49" cy="49" r="3"/><circle class="p-eye" cx="71" cy="49" r="3"/></g>'+
     '<g class="p-glasses"><rect x="39" y="43" width="19" height="12" rx="2.5"/><rect x="62" y="43" width="19" height="12" rx="2.5"/><path d="M58 47 Q60 45 62 47 M39 47 L34 46 M81 47 L86 46"/></g>'+
     '<path class="p-glint" d="M44 44 L47 41 M66 44 L69 41"/>'+
     '<path class="p-nose" d="M60 52 Q57 60 61 61"/>'+
     '<path class="p-stache" d="M60 63 Q52 59 44 64 Q48 70 56 67 Q59 66 60 64 Q61 66 64 67 Q72 70 76 64 Q68 59 60 63 Z"/>'+
     '<path class="p-mouth m-smile" d="M54 70 Q60 75 66 70"/><path class="p-mouth m-sad" d="M54 73 Q60 68 66 73"/><ellipse class="p-mouth m-o" cx="60" cy="71" rx="3" ry="3.5"/>'+
     '<ellipse class="p-cheek" cx="42" cy="60" rx="4" ry="2.5"/><ellipse class="p-cheek" cx="78" cy="60" rx="4" ry="2.5"/>'+
    '</g>'+
   '</g></svg>';
}
function profMood(m){if(P3D.ok)P3D.react(m==='cheer'||m==='sad'||m==='wow'||m==='happy'?m:'');$$('.prof-svg').forEach(function(s){s.classList.remove('happy','sad','wow','cheer');if(m)s.classList.add(m)});if(m==='cheer'||m==='happy'||m==='sad')setTimeout(function(){$$('.prof-svg').forEach(function(s){s.classList.remove('cheer')})},1200)}
function profSay(t,stay){if(!stay&&typeof CLS!=='undefined')CLS.act=null;var b=$('#profBubble');$('#profSay').textContent=t;b.hidden=false;clearTimeout(QZ.bt);if(!stay)QZ.bt=setTimeout(function(){b.hidden=true},6000)}
function confetti(box){var cols=['#f2b705','#14855c','#2f80ed','#e4572e','#9b51e0','#45c98f'];for(var i=0;i<16;i++){var s=document.createElement('i');s.className='cf';s.style.left=(10+Math.random()*80)+'%';s.style.background=cols[i%cols.length];s.style.animationDelay=(Math.random()*0.25)+'s';s.style.transform='rotate('+Math.round(Math.random()*360)+'deg)';box.appendChild(s);setTimeout(function(x){return function(){x.remove()}}(s),1600)}}
/* μικρό, γρήγορο παράθυρο συζήτησης (Καθηγητής ή παρέα)· το ⤢ το κάνει ολόκληρο πάνελ */
function pSize(){if(!PCH.size){try{PCH.size=localStorage.getItem('tj-psize')||'s'}catch(e){PCH.size='s'}}return PCH.size}
function pSetSize(z){PCH.size=z;try{localStorage.setItem('tj-psize',z)}catch(e){}PCH.full=z==='l';pCompact();try{renderProf()}catch(e){}}
function pCompact(){var p=$('#profPanel');if(!p)return;var z=pSize();if(z==='l')PCH.full=true;var c=(QZ.tab==='chat'||QZ.tab==='group')&&!PCH.full;p.classList.toggle('compact',c);p.classList.toggle('csm',c&&z==='s');p.classList.toggle('cmd',c&&z==='m');var sh=$('#profShrink');if(sh)sh.hidden=c&&z==='s'||(!c&&!(QZ.tab==='chat'||QZ.tab==='group'));var g=QZ.tab==='group';var t=$('#profTitle'),sb=$('#profSub');if(t)t.textContent=c?(g?'Η παρέα μας':'Ο Καθηγητής'):'Ο Καθηγητής';if(sb)sb.textContent=c?(g?'συζήτηση της ομάδας':'ρώτα ό,τι θες'):'Μάθημα, τεστ και συζήτηση κάθε μέρα';$$('.pswitch [data-psw]').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-psw')===(g?'group':'chat')?'true':'false')});var w=$('#profWide');if(w&&c){w.textContent='+';w.title=z==='s'?'Μεσαίο':'Μεγάλο (όλο το πάνελ)'}else if(w){w.textContent=$('#profPanel').classList.contains('wide')?'⤡':'⤢';w.title='Πλάτος'}}
function profOpen(on){var p=$('#profPanel');if(on)P3D.openAt=Date.now();else PCH.full=pSize()==='l';p.hidden=!on;document.body.classList.toggle('prof-on',!!on);$('#profBubble').hidden=true;if(on){renderProf();profMood('wow');setTimeout(function(){profMood('')},900)}}
function profDot(){var d=qMine(today());$('#profDot').hidden=!!(d&&d.done)}
function renderProf(){
  profDot();
  if($('#profPanel').hidden)return;pCompact();
  $$('#profTabs button').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-pt')===QZ.tab?'true':'false')});
  if(QZ.tab==='chat'&&CLS.unread){CLS.unread=0;profUnread()}
  if(QZ.tab==='props')renderProps();else if(QZ.tab==='class')renderClass();else if(QZ.tab==='today')renderQToday();else if(QZ.tab==='board')renderQBoard();else if(QZ.tab==='chat'){if(!$('#pchat'))renderChat()}else if(QZ.tab==='group'){$('#profBody').innerHTML='';GRP.n=-1;renderGroup();grpMarkRead()}else renderQPrac();
}
function qCard(qid,chosen,ord,mode){
  var t=qText(qid),done=chosen!=null;
  var h='<div class="qcard"><div class="row" style="justify-content:space-between"><span class="pill acc">'+esc(QCAT[t.cat])+'</span>'+(mode?'<span class="muted qprog">'+mode+'</span>':'')+'</div><p class="qq ud">'+esc(t.q)+'</p><div class="qopts">';
  ord.forEach(function(oi,pos){var cl='qopt';if(done){if(oi===t.a)cl+=' right';else if(oi===chosen)cl+=' wrong';else cl+=' dim'}
    h+='<button type="button" class="'+cl+'" data-qo="'+oi+'"'+(done?' disabled':'')+'><span class="ql">'+(LANG_RU()?'АБВГ':'ΑΒΓΔ').charAt(pos)+'</span><span class="ud">'+esc(t.o[oi])+'</span></button>'});
  h+='</div>';
  if(!done&&!mode){var rf=t.ref&&window.Manual&&Manual.entry(t.ref)?t.ref:qCatCard(t.cat);if(window.Manual&&Manual.entry(rf))h+='<p class="qhelp"><span>🤔 Δεν το ξέρεις;</span> <button type="button" class="linkbtn" data-ref="'+esc(rf)+'">📖 Διάβασε «'+esc(Manual.title(rf))+'» στον Μπούσουλα</button> <span class="muted">και γύρνα να απαντήσεις</span></p>'}
  if(done)h+='<div class="qexp '+(chosen===t.a?'ok':'no')+'"><b>'+(chosen===t.a?'Σωστό!':'Λάθος.')+'</b> <span class="ud">'+esc(t.e)+'</span>'+(t.ref?' <button type="button" class="linkbtn" data-ref="'+esc(t.ref)+'">Διάβασε στον Μπούσουλα</button>':'')+'</div>';
  return h+'</div>';
}
function renderQToday(){
  var ds=today(),qs=qDaily(ds),doc=qMine(ds),ans=(doc&&doc.ans)||[],body=$('#profBody'),me=qStats(S.uid);
  if(!qCanSave()){body.innerHTML=qWarn()+greatCard(greatOfDay())+'<p class="muted" style="font-size:.88rem">'+esc('Μέχρι τότε μπορείς να κάνεις Εξάσκηση: λειτουργεί χωρίς αποθήκευση.')+'</p>';return}
  if(doc&&doc.done&&(!QZ.started||QZ.cur>=5)){
    var others=qUsers().filter(function(u){return u!==S.uid}).map(function(u){var x=(S.quiz||[]).find(function(d){return d.by===u&&d.date===ds});return '<li><span class="ud">'+esc(name(u))+'</span>: '+(x&&x.done?'<b>'+x.correct+'/5</b> · '+x.points+' <span>πόντοι</span>':'<span class="muted">δεν το έχει κάνει ακόμα</span>')+'</li>'}).join('');
    var msg=doc.correct===5?'Τέλειο σκορ! Είσαι έτοιμος για την αγορά.':doc.correct>=4?'Πολύ καλά! Λίγο ακόμα και θα είναι τέλειο.':doc.correct>=3?'Καλή δουλειά. Δες τις εξηγήσεις στις λάθος.':'Σήμερα ήταν δύσκολο. Αύριο πάλι!';
    body.innerHTML=greatCard(greatOfDay())+'<div class="qdone"><div class="qbig">'+doc.correct+'<small>/5</small></div><p class="qmsg">'+esc(msg)+'</p><div class="kpis"><div class="kpi"><span class="lbl">Πόντοι σήμερα</span><b class="pos">+'+doc.points+'</b><span class="s"></span></div><div class="kpi"><span class="lbl">Σερί ημερών</span><b>'+me.streak+'</b><span class="s"></span></div><div class="kpi"><span class="lbl">Επίπεδο</span><b class="qlv">'+esc(me.level)+'</b><span class="s">'+me.pts+' <span>πόντοι</span></span></div></div>'+
      (others?'<ul class="qothers">'+others+'</ul>':'')+'<p class="muted" style="font-size:.85rem">Νέο τεστ αύριο. Μέχρι τότε δοκίμασε την Εξάσκηση.</p></div>'+
      '<details class="qreview"><summary>Δες ξανά τις σημερινές ερωτήσεις</summary>'+ans.map(function(a){return qCard(a.i,a.ch,qOrder(a.i,ds))}).join('')+'</details>';
    return;
  }
  var k=ans.length;
  if(k===0&&!QZ.started){
    body.innerHTML=qWarn()+greatCard(greatOfDay(),!QZ.gfull)+'<div class="qintro"><p class="qmsg">Καλημέρα! Σήμερα έχω <b>5</b> ερωτήσεις για σένα. Δεν υπάρχει χρονόμετρο, πάρε τον χρόνο σου.</p><ul class="qrules"><li><span>Σωστή απάντηση: <b>+10</b> πόντοι</span></li><li><span>5 στα 5: <b>+10</b> μπόνους</span></li><li><span>Σερί ημερών: έως <b>+10</b> μπόνους</span></li><li><span>Ίδιες ερωτήσεις για όλους, για δίκαιη σύγκριση</span></li></ul><button class="btn primary" type="button" id="qStart">Ξεκίνα το τεστ</button></div>';
    return;
  }
  if(QZ.cur<0||QZ.cur<k-1)QZ.cur=k;
  var qid=qs[Math.min(QZ.cur,4)],shown=ans[QZ.cur];
  var dots='<div class="qdots">'+qs.map(function(_,i){var a=ans[i];return '<i class="'+(a?(a.ok?'ok':'no'):(i===QZ.cur?'cur':''))+'"></i>'}).join('')+'</div>';
  body.innerHTML=dots+qCard(qid,shown?shown.ch:null,qOrder(qid,ds),(Math.min(QZ.cur,4)+1)+' / 5')+(shown?'<div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" id="qNext">'+(QZ.cur>=4?'Δες το αποτέλεσμα':'Επόμενη ερώτηση')+'</button></div>':'');
}
function qAnswer(oi){
  if(QZ.lock)return;var ds=today(),qs=qDaily(ds),doc=qMine(ds),ans=((doc&&doc.ans)||[]).slice();
  if(QZ.tab==='prac'){var t=qText(QZ.prac.q);if(QZ.prac.ch!=null)return;QZ.prac.ch=oi;QZ.pracScore[1]++;prAnswer(oi===t.a,t.cat,!!QZ.prac.hint,QZ.prac.q,!!QZ.prac.isNew);if(oi===t.a){QZ.pracScore[0]++;profMood('cheer');confetti($('#profBody'));profSay(QPRAISE[Math.floor(Math.random()*QPRAISE.length)])}else{profMood('sad');profSay(QOOPS[Math.floor(Math.random()*QOOPS.length)])}renderQPrac();return}
  if(QZ.tab==='ai'){return}
  if(ans.length>=5||QZ.cur!==ans.length)return;
  var qid=qs[ans.length],t=qText(qid),ok=oi===t.a;
  ans.push({i:qid,c:t.cat,ch:oi,ok:ok});
  var cor=ans.filter(function(a){return a.ok}).length,done=ans.length>=5,pts=cor*10;
  if(done){if(cor===5)pts+=10;var st=qStats(S.uid).streak;var yd=new Date();yd.setDate(yd.getDate()-1);pts+=Math.min(10,2*(st+1))}
  var d={by:S.uid,date:ds,ans:ans,correct:cor,total:5,points:pts,done:done,updatedAt:new Date().toISOString()};
  var qid0=qDocId(S.uid,ds),prevDoc=(S.quiz||[]).find(function(x){return x.id===qid0});S.quiz=(S.quiz||[]).filter(function(x){return x.id!==qid0}).concat([Object.assign({id:qid0},d)]);
  QZ.lock=true;renderProf();
  if(ok){profMood('cheer');confetti($('#profBody'));profSay(QPRAISE[Math.floor(Math.random()*QPRAISE.length)])}else{profMood('sad');profSay(QOOPS[Math.floor(Math.random()*QOOPS.length)])}
  put('quiz',qDocId(S.uid,ds),d).then(function(){QZ.saveErr=null}).catch(function(e){writeErr(e);QZ.saveErr=true;S.quiz=(S.quiz||[]).filter(function(x){return x.id!==qid0}).concat(prevDoc?[prevDoc]:[]);QZ.started=false;QZ.cur=-1;profMood('sad')}).then(function(){QZ.lock=false;renderProf()});
}
function renderQBoard(){
  var us=qUsers().map(function(u){var s=qStats(u);s.u=u;return s}).sort(function(a,b){return b.pts-a.pts}),body=$('#profBody');
  var h='<div class="qboard">'+us.map(function(s,i){var td=s.today;return '<div class="qrow'+(s.u===S.uid?' me':'')+'"><span class="qrank">'+(i===0&&s.pts>0?'<span class="crown" aria-label="Πρώτος">♛</span>':(i+1))+'</span><div class="qwho"><b class="ud">'+esc(name(s.u))+'</b><span class="muted qlvl">'+esc(s.level)+'</span>'+(s.next?'<div class="meter qmeter"><i style="width:'+Math.min(100,(s.pts-(QLEVELS.filter(function(l){return l[0]<=s.pts}).pop()[0]))/(s.next[0]-QLEVELS.filter(function(l){return l[0]<=s.pts}).pop()[0])*100).toFixed(0)+'%"></i></div>':'')+'</div><div class="qnums"><b>'+s.pts+'</b><span>πόντοι</span></div><div class="qnums"><b>'+(isFinite(s.acc)?fmt(s.acc*100,0)+'%':'–')+'</b><span>σωστές</span></div><div class="qnums"><b>'+s.streak+'</b><span>σερί</span></div><div class="qnums"><b>'+(td&&td.done?td.correct+'/5':'–')+'</b><span>σήμερα</span></div>'+(s.done===0?'<span class="qnew muted">δεν έχει κάνει τεστ ακόμα</span>':'')+'</div>'}).join('')+'</div>';
  // 14-day chart
  var days=[];for(var i=13;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);days.push(lday(d))}
  var W=340,H=120,L=20,B=18,bw=(W-L)/14,cols=['var(--accent)','var(--warn)','var(--gain)','var(--loss)'];
  var bars='';us.slice(0,4).forEach(function(s,ui){days.forEach(function(ds,di){var x=(S.quiz||[]).find(function(q){return q.by===s.u&&q.date===ds});var v=x?x.correct:0,hh=(H-B-6)*v/5;var w=bw/Math.max(1,Math.min(4,us.length))-1;
    bars+='<rect x="'+(L+di*bw+ui*(w+1)).toFixed(1)+'" y="'+(H-B-hh).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(0,hh).toFixed(1)+'" rx="1.5" style="fill:'+cols[ui]+'"></rect>'})});
  var lab='';days.forEach(function(ds,di){if(di%3===1)lab+='<text x="'+(L+di*bw+bw/2).toFixed(1)+'" y="'+(H-4)+'" text-anchor="middle">'+ds.slice(8)+'/'+ds.slice(5,7)+'</text>'});
  h+='<div class="chart qchart"><span class="lbl">Σωστές ανά ημέρα (τελευταίες 14)</span><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Σωστές ανά ημέρα"><g class="grid"><line x1="'+L+'" x2="'+W+'" y1="'+(H-B)+'" y2="'+(H-B)+'"></line><text x="2" y="'+(H-B)+'">0</text><text x="2" y="12">5</text></g>'+bars+lab+'</svg><div class="qlegend">'+us.slice(0,4).map(function(s,ui){return '<span><i style="background:'+cols[ui]+'"></i><span class="ud">'+esc(name(s.u))+'</span></span>'}).join('')+'</div></div>';
  // my categories
  var me=qStats(S.uid),cats=Object.keys(QCAT).map(function(c){var v=me.cat[c]||[0,0];return {c:c,ok:v[0],n:v[1],p:v[1]?v[0]/v[1]:NaN}});
  var tried=cats.filter(function(c){return c.n>=2}).sort(function(a,b){return a.p-b.p});
  h+='<div class="qcats"><span class="lbl">Τα δυνατά και αδύναμα σημεία σου (πάτα ένα θέμα για να ανοίξει η κάρτα)</span>'+cats.map(function(c){return '<div class="gbar"><div class="row" style="justify-content:space-between"><button type="button" class="linkbtn" data-ref="'+esc(qCatCard(c.c))+'">'+esc(QCAT[c.c])+'</button><span class="num">'+(c.n?c.ok+'/'+c.n:'–')+'</span></div><div class="meter"><i class="'+(c.p>=0.7?'ok':'')+'" style="width:'+(isFinite(c.p)?c.p*100:0).toFixed(0)+'%"></i></div></div>'}).join('')+
    (function(){var w=cats.filter(function(c){return c.n>=1&&c.p<0.6}).sort(function(a,b){return a.p-b.p||b.n-a.n});if(!w.length)return '';var wc=w[0],rev=qWrongCards(S.uid,wc.c);
      return '<p class="qtip"><span>Ο Καθηγητής προτείνει:</span> <span>ξεκίνα από</span> <button type="button" class="linkbtn" data-ref="'+esc(qCatCard(wc.c))+'"><b>'+esc((window.Manual&&Manual.title(qCatCard(wc.c)))||QCAT[wc.c])+'</b></button> <span>('+esc(QCAT[wc.c])+': '+wc.ok+'/'+wc.n+' σωστές).</span></p>'+(rev.length?'<div class="qrev"><span class="muted" style="font-size:.8rem">Κάρτες από τις ερωτήσεις που έχασες:</span>'+rev.map(function(id){return '<button type="button" class="chip" data-ref="'+esc(id)+'">'+esc(Manual.title(id))+'</button>'}).join('')+'</div>':'')})()+'</div>';
  h+=prBoard();body.innerHTML=h;
}
/* ---------- Εξάσκηση: πόντοι, επίπεδα, παράσημα ---------- */
var PRLV=[[0,'Δόκιμος'],[50,'Μαθητευόμενος'],[150,'Αναλυτής'],[350,'Trader'],[700,'Επαγγελματίας'],[1200,'Master'],[2000,'Θρύλος']];
var PRBADGE=[['first','🌱','Πρώτη σωστή',function(d){return d.ok>=1}],['ok10','🎯','10 σωστές',function(d){return d.ok>=10}],['ok50','🏹','50 σωστές',function(d){return d.ok>=50}],['ok100','🏆','100 σωστές',function(d){return d.ok>=100}],['ok250','👑','250 σωστές',function(d){return d.ok>=250}],
  ['st5','🔥','Σερί 5',function(d){return d.best>=5}],['st10','⚡','Σερί 10',function(d){return d.best>=10}],['st20','🌋','Σερί 20',function(d){return d.best>=20}],
  ['days3','📅','3 μέρες εξάσκηση',function(d){return Object.keys(d.days||{}).length>=3}],['days7','🗓️','7 μέρες εξάσκηση',function(d){return Object.keys(d.days||{}).length>=7}],
  ['day20','💪','20 ερωτήσεις σε μια μέρα',function(d){var x=(d.days||{})[today()];return x&&x.tot>=20}],
  ['master','🧠','Ειδικός σε θέμα (10+ με 80%)',function(d){return Object.keys(d.cat||{}).some(function(c){var v=d.cat[c];return v[1]>=10&&v[0]/v[1]>=0.8})}],
  ['all','🌍','Σωστή σε όλα τα θέματα',function(d){return Object.keys(QCAT).every(function(c){return d.cat&&d.cat[c]&&d.cat[c][0]>0})}]];
var PR={me:null,dirty:0,last:null};
function prId(u){return safeSeg(u||S.uid||'me')}
function prMe(){if(!PR.me){var x=S.prac&&S.prac[prId()];PR.me=x?JSON.parse(JSON.stringify(x)):{by:S.uid||'me',pts:0,ok:0,tot:0,streak:0,best:0,cat:{},days:{},badges:{}}}return PR.me}
function prLevel(p){var l=PRLV[0],nx=null;PRLV.forEach(function(x,i){if(p>=x[0]){l=x;nx=PRLV[i+1]||null}});return {name:l[1],min:l[0],next:nx}}
function prAnswer(ok,cat,hinted,qid,isNew){var d=prMe(),gain=0,msg='';d.seen=d.seen||{};if(qid!=null){var prev=d.seen[qid];d.seen[qid]=ok?1:0;if(prev==null)srAdd('q:'+qid,ok?1:0);if(prev!=null&&!isNew||prev!=null){isNew=false}}
  if(isNew===false){PR.last={ok:ok,msg:ok?'✓ Σωστό στην επανάληψη · χωρίς πόντους':'Ακόμα λάθος. Διάβασε την κάρτα του Μπούσουλα.',lvl:null,nb:[]};d.upd=Date.now();PR.dirty=Date.now();put('prac',prId(),JSON.parse(JSON.stringify(d))).then(function(){PR.dirty=0}).catch(function(){});return}
  d.tot++;var day=d.days[today()]=d.days[today()]||{ok:0,tot:0,pts:0};day.tot++;var c=d.cat[cat]=d.cat[cat]||[0,0];c[1]++;
  if(ok){d.ok++;day.ok++;c[0]++;d.streak++;d.best=Math.max(d.best,d.streak);gain=hinted?2:5;var bonus=Math.min(5,Math.floor(d.streak/3));gain+=bonus;msg='+'+gain+' πόντοι'+(hinted?' (με βοήθεια)':'')+(bonus?' · σερί ×'+d.streak+' (+'+bonus+')':'')}
  else{d.streak=0;msg='Το σερί μηδένισε. Διάβασε την εξήγηση και πάμε ξανά.'}
  var lv0=prLevel(d.pts).name;d.pts+=gain;day.pts+=gain;var lv1=prLevel(d.pts).name,nb=[];
  PRBADGE.forEach(function(b){if(!d.badges[b[0]]&&b[3](d)){d.badges[b[0]]=Date.now();nb.push(b)}});
  PR.last={ok:ok,msg:msg,lvl:lv1!==lv0?lv1:null,nb:nb};d.by=S.uid||'me';d.upd=Date.now();PR.dirty=Date.now();
  if(nb.length||PR.last.lvl){setTimeout(function(){confetti($('#profBody'));profMood('cheer');profSay((PR.last.lvl?'Νέο επίπεδο: '+PR.last.lvl+'! ':'')+nb.map(function(b){return b[1]+' '+b[2]}).join(' · '))},250)}
  else if(ok&&d.streak&&d.streak%5===0)profSay('🔥 Σερί '+d.streak+'! Συνέχισε έτσι.');
  put('prac',prId(),JSON.parse(JSON.stringify(d))).then(function(){PR.dirty=0}).catch(function(){})}
function prHeader(){var d=prMe(),lv=prLevel(d.pts),pc=lv.next?Math.min(100,(d.pts-lv.min)/(lv.next[0]-lv.min)*100):100,td=(d.days||{})[today()]||{ok:0,tot:0,pts:0};
  var h='<div class="prhead"><div class="prst"><span><b>⭐ '+d.pts+'</b><i>πόντοι</i></span><span><b>🎯 '+(d.tot?Math.round(d.ok/d.tot*100):0)+'%</b><i>'+d.ok+'/'+d.tot+' σωστές</i></span><span><b>🔥 '+d.streak+'</b><i>σερί · ρεκόρ '+d.best+'</i></span><span><b>📅 '+td.ok+'/'+td.tot+'</b><i>σήμερα · +'+td.pts+'</i></span></div>'+
    '<div class="prlv"><span>'+esc(lv.name)+'</span><div class="meter"><i style="width:'+pc.toFixed(0)+'%"></i></div><span class="muted">'+(lv.next?(lv.next[0]-d.pts)+' για «'+esc(lv.next[1])+'»':'μέγιστο επίπεδο')+'</span></div>';
  var got=PRBADGE.filter(function(b){return d.badges&&d.badges[b[0]]});h+='<div class="prbadges">'+PRBADGE.map(function(b){var on=d.badges&&d.badges[b[0]];return '<span class="prb'+(on?' on':'')+'" title="'+esc(b[2])+(on?' ✓':' (κλειδωμένο)')+'">'+b[1]+'</span>'}).join('')+'<span class="muted" style="font-size:.74rem">'+got.length+'/'+PRBADGE.length+' παράσημα</span></div>';
  if(PR.last)h+='<div class="prlast '+(PR.last.ok?'ok':'no')+'">'+esc(PR.last.msg)+(PR.last.lvl?' · 🎉 Νέο επίπεδο: <b>'+esc(PR.last.lvl)+'</b>':'')+(PR.last.nb.length?' · Νέο παράσημο: '+PR.last.nb.map(function(b){return b[1]+' '+esc(b[2])}).join(', '):'')+'</div>';
  return h+'</div>'}
function prBoard(){var L=Object.keys(S.prac||{}).map(function(k){return S.prac[k]}).filter(function(x){return x&&x.by});var me=prMe();if(!L.some(function(x){return x.by===S.uid})&&me.tot)L.push(me);
  if(!L.length)return '';L=L.map(function(x){return x.by===S.uid?me:x}).sort(function(a,b){return (b.pts||0)-(a.pts||0)});
  return '<div class="prboard"><span class="lbl">Εξάσκηση: πόντοι όλων</span>'+L.map(function(x,i){return '<div class="qrow'+(x.by===S.uid?' me':'')+'"><span class="qrank">'+(i===0&&x.pts>0?'♛':(i+1))+'</span><div class="qwho"><b class="ud">'+esc(name(x.by))+'</b><span class="muted qlvl">'+esc(prLevel(x.pts||0).name)+' · '+Object.keys(x.badges||{}).length+' παράσημα</span></div><div class="qnums"><b>'+(x.pts||0)+'</b><span>πόντοι</span></div><div class="qnums"><b>'+(x.tot?Math.round(x.ok/x.tot*100):0)+'%</b><span>σωστές</span></div><div class="qnums"><b>'+(x.best||0)+'</b><span>ρεκόρ σερί</span></div><div class="qnums"><b class="'+cls(x.rp&&x.rp.r||0)+'">'+(x.rp&&x.rp.n?fR(x.rp.r):'–')+'</b><span>replay R</span></div></div>'}).join('')+'</div>'}
function prPool(){var c=QZ.pracCat||'all',lv=QZ.pracLv||'all',out=[];
  QBANK.forEach(function(q,i){if((c==='all'||q[0]===c)&&(lv==='all'||qLv(q)===+lv))out.push(i)});
  (S.qb||[]).forEach(function(g){if((c==='all'||g.cat===c)&&(lv==='all'||(g.lv||2)===+lv))out.push('g:'+g.id)});return out}
function prCounts(){var d=prMe(),seen=d.seen||{},P=prPool(),nw=0,wr=0;P.forEach(function(id){var v=seen[id];if(v==null)nw++;else if(v===0)wr++});return {all:P.length,nw:nw,wr:wr,done:P.length-nw}}
function qPracNext(){PR.last=null;var d=prMe(),seen=d.seen||{},P=prPool(),last=QZ.prac&&QZ.prac.q;
  var pick=function(L){var x;do{x=L[Math.floor(Math.random()*L.length)]}while(L.length>1&&x===last);return x};
  if(QZ.review){var W=P.filter(function(id){return seen[id]===0});if(W.length){QZ.prac={q:pick(W),ch:null,ord:qperm(4,Math.floor(Math.random()*1e9)),isNew:false};return}QZ.review=false}
  var U=P.filter(function(id){return seen[id]==null});
  if(U.length<4&&S.sample&&!QZ.genBusy)setTimeout(function(){prGen(false)},50);
  if(U.length){QZ.prac={q:pick(U),ch:null,ord:qperm(4,Math.floor(Math.random()*1e9)),isNew:true}}else QZ.prac=null}
function renderQPrac(){
  var body=$('#profBody');if(!QZ.prac||QZ.prac.ch==null&&prMe().seen&&prMe().seen[QZ.prac.q]!=null&&QZ.prac.isNew)qPracNext();var C=prCounts();
  var sel='<div class="row qprhead" style="gap:.5rem;flex-wrap:wrap"><label class="f">Θέμα<select id="qCat"><option value="all">Όλα τα θέματα</option>'+Object.keys(QCAT).map(function(c){return '<option value="'+c+'"'+(QZ.pracCat===c?' selected':'')+'>'+esc(QCAT[c])+'</option>'}).join('')+'</select></label>'+
    '<label class="f">Επίπεδο<select id="qLv">'+[['all','Όλα'],['1','Αρχάριος'],['2','Μέτριος'],['3','Προχωρημένος']].map(function(x){return '<option value="'+x[0]+'"'+(String(QZ.pracLv||'all')===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></label></div>';
  var h=prHeader()+sel+'<p class="muted prinfo"><span>🆕 Νέες: <b>'+C.nw+'</b></span><span>✔ Απαντημένες: <b>'+C.done+'</b> / '+C.all+'</span>'+(C.wr?'<span>↻ Λάθη για επανάληψη: <b>'+C.wr+'</b></span>':'')+'</p>'+
    '<p class="muted" style="font-size:.78rem;margin:0 0 .6rem">Κάθε ερώτηση δίνει πόντους μόνο την πρώτη φορά: +5 σωστή, +2 αν διάβασες πρώτα τον Μπούσουλα, μπόνους σερί. Όταν τελειώνουν, ο Καθηγητής γράφει καινούργιες.</p>';
  if(QZ.prac){if(!QZ.prac.isNew)h+='<p class="prrev">↻ Επανάληψη λάθους · χωρίς πόντους</p>';else if(qText(QZ.prac.q).gen)h+='<p class="prrev gen">✨ Νέα ερώτηση από τον Καθηγητή</p>';
    h+=qCard(QZ.prac.q,QZ.prac.ch,QZ.prac.ord)+(QZ.prac.ch!=null?'<div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" id="qPracNext">Επόμενη ερώτηση</button></div>':'')}
  else{h+='<div class="prend">'+(QZ.genBusy?'<b>✍️ Τελείωσαν οι ερωτήσεις σε αυτή την επιλογή.</b><span>Ο Καθηγητής γράφει καινούργιες, βασισμένες σε βιβλία και πρακτική, όχι μόνο στον Μπούσουλα. Λίγα δευτερόλεπτα…</span>':
      '<b>🏁 Τις απάντησες όλες!</b><span>'+(S.sample?'Ζήτα νέες ερωτήσεις από τον Καθηγητή ή διάλεξε άλλο θέμα ή επίπεδο.':'Διάλεξε άλλο θέμα ή επίπεδο.')+'</span>')+'</div>'}
  h+='<div class="qai">'+(S.sample?'<button class="btn" type="button" id="qAiGen"'+(QZ.genBusy?' disabled':'')+'>'+(QZ.genBusy?'Ο Καθηγητής γράφει ερωτήσεις…':'✨ Γράψε μου νέες ερωτήσεις')+'</button>':'')+(C.wr&&!QZ.review?'<button class="btn" type="button" id="qReview">↻ Επανάληψη λαθών ('+C.wr+')</button>':'')+(QZ.review?'<button class="btn" type="button" id="qReviewOff">Τέλος επανάληψης</button>':'')+'</div>';
  body.innerHTML=h;
}
function prNorm(t){return String(t||'').toLowerCase().replace(/[^a-zα-ωάέήίόύώϊϋΐΰ0-9]+/g,' ').trim()}
function prGen(manual){if(!S.sample||QZ.genBusy)return;QZ.genBusy=true;if(QZ.tab==='prac')renderQPrac();
  var cat=QZ.pracCat&&QZ.pracCat!=='all'?QZ.pracCat:(function(){var best=null,bn=1e9;Object.keys(QCAT).forEach(function(c){var n0=0,seen=prMe().seen||{};QBANK.forEach(function(q,i){if(q[0]===c&&seen[i]==null)n0++});(S.qb||[]).forEach(function(g){if(g.cat===c&&seen['g:'+g.id]==null)n0++});if(n0<bn){bn=n0;best=c}});return best||'psy'})();
  var lv=QZ.pracLv&&QZ.pracLv!=='all'?+QZ.pracLv:0,lvN={1:'αρχάριου',2:'μέτριου',3:'προχωρημένου'};
  var have=[];QBANK.forEach(function(q){if(q[0]===cat)have.push((q[3]||[])[0])});(S.qb||[]).forEach(function(g){if(g.cat===cat)have.push(g.q)});
  var prompt='Είσαι καθηγητής trading και γράφεις ερωτήσεις εξάσκησης για μια παρέα ερασιτεχνών traders (crypto, μετοχές, GER40). Θέμα: '+QCAT[cat]+'. '+
    (lv?'Επίπεδο: '+lvN[lv]+'.':'Ανάμειξε επίπεδα: 2 αρχάριου, 2 μέτριου, 2 προχωρημένου.')+' Φτιάξε 6 ΝΕΕΣ ερωτήσεις πολλαπλής επιλογής, βασισμένες σε γνώση από κλασικά βιβλία, πρακτική των αγορών και ρεαλιστικά σενάρια με νούμερα, όχι μόνο στα βασικά. '+
    'Να είναι ακριβείς, με μία σαφώς σωστή απάντηση και 3 εύλογες λάθος. Χωρίς τρέχουσες τιμές και χωρίς συμβουλές αγοράς. ΜΗΝ επαναλάβεις ούτε να παραφράσεις αυτές που υπάρχουν ήδη:\n- '+have.slice(-60).map(function(x){return String(x).slice(0,110)}).join('\n- ')+
    '\n\nΓλώσσα: '+(LANG_RU()?'ρωσικά':'ελληνικά')+'. Απάντησε ΜΟΝΟ με JSON πίνακα: [{"q":"ερώτηση","o":["α","β","γ","δ"],"a":0,"e":"εξήγηση 1-2 προτάσεις","lv":1}]. "a" ο δείκτης της σωστής (0-3), ανακάτεψε τη θέση της. "lv" 1, 2 ή 3.';
  var known={};have.forEach(function(x){known[prNorm(x)]=1});
  S.sample(prompt,{modelTier:'default',effort:'low',cache:false}).then(function(r){
    var t=String(r.text||''),m=t.match(/\[[\s\S]*\]/),arr=[];try{arr=JSON.parse(m?m[0]:t)}catch(e){}
    arr=(arr||[]).filter(function(x){return x&&typeof x.q==='string'&&Array.isArray(x.o)&&x.o.length===4&&x.a>=0&&x.a<4&&!known[prNorm(x.q)]}).slice(0,6);
    if(!arr.length)throw {code:'parse'};
    return Promise.all(arr.map(function(x){var id=newId(),doc={q:x.q.slice(0,400),o:x.o.map(function(o){return String(o).slice(0,200)}),a:+x.a,e:String(x.e||'').slice(0,500),cat:cat,lv:[1,2,3].indexOf(+x.lv)>=0?+x.lv:(lv||2),by:S.uid||'me',at:Date.now(),src:'claude'};
      S.qb=(S.qb||[]).concat([Object.assign({id:id},doc)]);S.qbMap=S.qbMap||{};S.qbMap[id]=Object.assign({id:id},doc);return put('qbank',id,doc).catch(function(){})})).then(function(){if(manual)toast('Ο Καθηγητής έγραψε '+arr.length+' νέες ερωτήσεις: '+QCAT[cat]+'.')});
  }).catch(function(e){var c=e&&e.code;if(manual||!QZ.prac)toast(c==='rate_limited'?'Πολλά αιτήματα. Ξαναδοκίμασε σε λίγα λεπτά.':c==='not_granted'?'Ο Καθηγητής δεν μπορεί να γράψει ερωτήσεις σε αυτή την προβολή.':'Δεν βγήκαν ερωτήσεις. Δοκίμασε ξανά.')})
   .then(function(){QZ.genBusy=false;if(!QZ.prac)qPracNext();if(QZ.tab==='prac'&&!$('#profPanel').hidden)renderQPrac()});
}
function qAiGen(){prGen(true)}
window.__prDbg=function(){return {pool:prPool(),seen:prMe().seen||{}}};
function bindProf(){
  $('#profBtn').addEventListener('click',function(){if($('#profPanel').hidden)pOpenAsk('');else profOpen(false)});/* ο Καθηγητής ανοίγει κατευθείαν στο chat, με τον κέρσορα έτοιμο */
  $('#profClose').addEventListener('click',function(){profOpen(false)});
  var pw=function(on){$('#profPanel').classList.toggle('wide',on);var b=$('#profWide');b.setAttribute('aria-pressed',on?'true':'false');b.textContent=on?'⤡':'⤢';b.title=b.getAttribute('aria-label');try{localStorage.setItem('tj-pwide',on?'1':'0')}catch(e){}};
  try{if(localStorage.getItem('tj-pwide')==='1')pw(true)}catch(e){}
  $('#profWide').addEventListener('click',function(){var pp=$('#profPanel');if(pp.classList.contains('compact')){pSetSize(pSize()==='s'?'m':'l');return}pw(!pp.classList.contains('wide'))});
  $('#profShrink').addEventListener('click',function(){var z=pSize();if(z==='l'){pw(false);pSetSize('m')}else if(z==='m')pSetSize('s')});
  $('#profPanel').addEventListener('click',function(e){var b=e.target.closest('[data-psw]');if(!b)return;if(b.getAttribute('data-psw')==='group')grpOpen(true);else pOpenAsk('')});
  var grow=function(t){t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,window.innerHeight*.45)+'px'};
  $('#profPanel').addEventListener('input',function(e){if(e.target.id==='pq'||e.target.id==='gq')grow(e.target)});
  $('#profBubble').addEventListener('click',function(e){if(e.target.closest('.x')){$('#profBubble').hidden=true;CLS.act=null;return}if(CLS.act){var a=CLS.act;CLS.act=null;$('#profBubble').hidden=true;clsAct(a);return}profOpen(true)});
  clsInit();try{bindReplay()}catch(e){console.warn(e)}try{bindTrain()}catch(e){console.warn(e)}
  $('#profBack').addEventListener('click',profBackGo);
  $$('#profTabs button').forEach(function(b){b.addEventListener('click',function(){if(b.getAttribute('data-pt')==='group'){grpOpen(true);return}QZ.tab=b.getAttribute('data-pt');if(QZ.tab==='chat'){$('#profBody').innerHTML='';}renderProf()})});
  $('#profPanel').addEventListener('click',function(e){
    if(e.target.closest('[data-gunimg]')){GRP.img=null;GRP.thumb=null;renderGroup();return}
    var o=e.target.closest('[data-qo]');if(o&&!o.disabled){qAnswer(+o.getAttribute('data-qo'));return}
    var a=e.target.closest('[data-qa]');if(a&&!a.disabled&&QZ.ai){var it=QZ.ai.list[QZ.ai.i];if(it.ch!=null)return;it.ch=+a.getAttribute('data-qa');QZ.pracScore[1]++;prAnswer(it.ch===it.a,QZ.pracCat==='all'?'ai':QZ.pracCat,!!it.hint);if(it.ch===it.a){QZ.pracScore[0]++;profMood('cheer');confetti($('#profBody'))}else profMood('sad');renderQPrac();return}
    if(e.target.closest('[data-gopen]')){QZ.gfull=true;renderProf();return}
    var ga=e.target.closest('[data-gask]');if(ga){var pr=ga.getAttribute('data-gask').split('|');QZ.tab='chat';$('#profBody').innerHTML='';renderProf();pAsk((LANG_RU()?'Проведи для меня урок: «':'Κάνε μου μάθημα: «')+pr[0]+'» ('+pr[1]+')',false);return}
    if(e.target.closest('#qStart')){if(!qCanSave()){renderProf();return}QZ.started=true;QZ.cur=0;renderProf();return}
    if(e.target.closest('#qNext')){QZ.cur++;renderProf();if(QZ.cur>=5){var d=qMine(today());if(d&&d.done){profMood('cheer');confetti($('#profBody'));profSay(d.correct>=4?'Υπέροχα! +'+d.points+' πόντοι.':'Τέλος! +'+d.points+' πόντοι.')}}return}
    if(e.target.closest('#qPracNext')){qPracNext();renderQPrac();return}
    if(e.target.closest('#qAiNext')){if(QZ.ai.i<QZ.ai.list.length-1)QZ.ai.i++;else QZ.ai=null;renderQPrac();return}
    if(e.target.closest('#qAiGen')){qAiGen();return}
    if(e.target.closest('#qReview')){QZ.review=true;qPracNext();renderQPrac();return}
    if(e.target.closest('#qReviewOff')){QZ.review=false;qPracNext();renderQPrac();return}
    if(e.target.closest('[data-ref]')){if(QZ.tab==='prac'){if(QZ.prac&&QZ.prac.ch==null)QZ.prac.hint=true;if(QZ.ai&&QZ.ai.list[QZ.ai.i])QZ.ai.list[QZ.ai.i].hint=true}QZ.back=QZ.tab;profOpen(false);var pb=$('#profBack');if(pb){pb.hidden=false;pb.textContent='↩ Πίσω στον Καθηγητή ('+({prac:'Εξάσκηση',class:'Τάξη',today:'Τεστ ημέρας',chat:'Ρώτα με',board:'Κατάταξη'}[QZ.tab]||'')+')'}}
  });
  $('#profPanel').addEventListener('change',function(e){if(e.target.id==='qCat'){QZ.pracCat=e.target.value;QZ.ai=null;QZ.review=false;qPracNext();renderQPrac()}if(e.target.id==='qLv'){QZ.pracLv=e.target.value;QZ.review=false;qPracNext();renderQPrac()}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#profPanel').hidden)profOpen(false)});
  document.addEventListener('click',function(e){if(e.target.closest('[data-lang]'))setTimeout(renderProf,60)});
  $('#profBtn').addEventListener('mouseenter',function(){profMood('happy')});$('#profBtn').addEventListener('mouseleave',function(){profMood('')});
}
/* ================= ΤΑΞΗ: ο Καθηγητής ως δάσκαλος ================= */
var CURR=[
 {id:'b1',m:'Βάσεις',ty:'th',t:'Ιαπωνικά κεριά',c:['candle'],q:'cdl',g:'Να διαβάζεις ένα κερί: άνοιγμα, κλείσιμο, σκιές, ποιος κέρδισε.',min:10},
 {id:'b2',m:'Βάσεις',ty:'pr',t:'Κεριά στο νόμισμά σου',c:['candle','doji'],task:'chart',g:'Βρες στο γράφημα 1h ένα δυνατό ανοδικό, ένα πτωτικό και ένα doji και στείλε το γράφημα στον Καθηγητή.',min:10},
 {id:'b3',m:'Βάσεις',ty:'th',t:'Δομή αγοράς, στήριξη & αντίσταση',c:['structure','sr'],q:'pat',g:'HH/HL, LH/LL και πώς βρίσκεις επίπεδα που μετράνε.',min:15},
 {id:'b4',m:'Βάσεις',ty:'pr',t:'Σχεδίασε επίπεδα',c:['sr'],task:'draw',g:'Στο γράφημα 4h του νομίσματός σου τράβηξε 2 στηρίξεις και 2 αντιστάσεις με το εργαλείο οριζόντιας γραμμής.',min:15},
 {id:'b5',m:'Βάσεις',ty:'th',t:'Timeframes & γραμμές τάσης',c:['mtf','trendline'],q:'str',g:'Μεγάλο timeframe για κατεύθυνση, μικρό για είσοδο.',min:12},
 {id:'b6',m:'Βάσεις',ty:'th',t:'Εντολές, long & short',c:['orders','longshort','costs'],q:'risk',g:'Market, limit, stop, και τι κοστίζει κάθε συναλλαγή.',min:12},
 {id:'b7',m:'Βάσεις',ty:'th',t:'Κεριά σε πλαίσιο: pin bar & doji',c:['cdl-context','pinbar','dojitypes'],q:'cdl',g:'Πότε ένα μοτίβο κεριού αξίζει και πότε είναι θόρυβος.',min:12},
 {id:'r1',m:'Ρίσκο',ty:'th',t:'Μέγεθος θέσης & R',c:['possize','expectancy'],q:'risk',g:'Πόσα αγοράζεις ώστε το stop να κοστίζει ακριβώς 1R.',min:15},
 {id:'r2',m:'Ρίσκο',ty:'pr',t:'Υπολόγισε μόνος σου',c:['possize'],task:'calc',g:'Λύσε έναν υπολογισμό θέσης με την τρέχουσα τιμή του νομίσματός σου.',min:8},
 {id:'r3',m:'Ρίσκο',ty:'th',t:'Μόχλευση & όρια ημέρας',c:['leverage','breakers','breakeven'],q:'risk',g:'Γιατί το ρίσκο το ορίζει το stop και όχι η μόχλευση.',min:12},
 {id:'r4',m:'Ρίσκο',ty:'pr',t:'Πρώτη demo με σχέδιο',c:['possize','orders'],task:'demo2r',g:'Άνοιξε demo συναλλαγή με stop και στόχο τουλάχιστον 2R.',min:10},
 {id:'r5',m:'Ρίσκο',ty:'th',t:'Stop, trailing & κίνδυνος καταστροφής',c:['stops','trailing','ruin'],q:'risk',g:'Πού μπαίνει το stop, πώς κλειδώνεις κέρδος, και γιατί 1% ανά συναλλαγή.',min:15},
 {id:'i1',m:'Δείκτες & σχηματισμοί',ty:'th',t:'Κινητοί μέσοι & RSI',c:['ma','rsi'],q:'ind',g:'Τάση με EMA 20/50, ορμή με RSI, και πότε σε ξεγελάνε.',min:15},
 {id:'i2',m:'Δείκτες & σχηματισμοί',ty:'pr',t:'Στήσε το γράφημά σου',c:['ma','rsi'],task:'chart',g:'Άνοιξε EMA 20, EMA 50 και RSI στο νόμισμά σου, κρίνε την τάση και στείλε το γράφημα στον Καθηγητή.',min:10},
 {id:'i3',m:'Δείκτες & σχηματισμοί',ty:'th',t:'Κεριά αντιστροφής',c:['engulfing','hammer','star'],q:'cdl',g:'Engulfing, σφυρί, αστέρι: πού έχουν αξία και πού όχι.',min:12},
 {id:'i4',m:'Δείκτες & σχηματισμοί',ty:'th',t:'Σχηματισμοί τιμής',c:['double','flag','hs'],q:'pat',g:'Διπλή κορυφή/πυθμένας, σημαία, ΩΚΩ και στόχοι τους.',min:15},
 {id:'i5',m:'Δείκτες & σχηματισμοί',ty:'th',t:'Fibonacci: είσοδος & στόχοι',c:['fib','fibext'],q:'ind',g:'Retracement για το pullback, extension για τον στόχο.',min:12},
 {id:'i6',m:'Δείκτες & σχηματισμοί',ty:'th',t:'Ψεύτικα σπασίματα: SFP, fakey, Wyckoff',c:['sfp','fakey','wyckoff'],q:'pat',g:'Πώς η αγορά παγιδεύει τους βιαστικούς και πώς μπαίνεις εσύ στη σωστή μεριά.',min:15},
 {id:'s1',m:'Στρατηγικές',ty:'th',t:'Pullback στον EMA 20',c:['s-pullback'],q:'str',g:'Ολόκληρο σχέδιο: φίλτρο, είσοδος, stop, στόχος.',min:15},
 {id:'s2',m:'Στρατηγικές',ty:'pr',t:'Pullback σε demo',c:['s-pullback'],task:'demo',g:'Βρες ένα pullback στο νόμισμά σου και άνοιξέ το σε demo με την τεχνική «Pullback».',min:15},
 {id:'s3',m:'Στρατηγικές',ty:'th',t:'Breakout & retest',c:['s-breakout','s-retest'],q:'str',g:'Πότε το σπάσιμο είναι αληθινό και πού μπαίνεις με ασφάλεια.',min:15},
 {id:'s4',m:'Στρατηγικές',ty:'pr',t:'Τεχνικές από τον Καθηγητή',c:['s-retest'],task:'confirm',g:'Ζήτα 3 τεχνικές για το νόμισμά σου και επιβεβαίωσε αυτή που καταλαβαίνεις καλύτερα.',min:10},
 {id:'s5',m:'Στρατηγικές',ty:'th',t:'Trend following & inside bar',c:['s-trend','s-ibbo','s-rsi2'],q:'str',g:'Τρεις μηχανικές στρατηγικές που μπορείς να ελέγξεις στο backtest.',min:15},
 {id:'s6',m:'Στρατηγικές',ty:'pr',t:'Backtest πριν το demo',c:['p-backtest','tv-export'],task:'review',g:'Φόρτωσε 3.000+ κεριά στον Εξελιγμένο αναλυτή (Αναλύσεις → Backtest), τρέξε backtest σε 2 στρατηγικές και στείλε στον Καθηγητή screenshot των αποτελεσμάτων: ποια κρατάς και γιατί.',min:15},
 {id:'m1',m:'SMC',ty:'th',t:'Smart Money: δομή & ρευστότητα',c:['smc-intro','smc-structure','smc-liq'],q:'smc',g:'BOS, CHoCH και γιατί η τιμή κυνηγάει stops.',min:18},
 {id:'m2',m:'SMC',ty:'th',t:'Order blocks & FVG',c:['smc-ob','smc-fvg'],q:'smc',g:'Ζώνες εισόδου των θεσμικών και πώς τις σχεδιάζεις.',min:15},
 {id:'m3',m:'SMC',ty:'th',t:'SMC για προχωρημένους',c:['smc-inducement','smc-po3','smc-sb'],q:'smc',g:'Inducement, Power of 3 και Silver Bullet.',min:15},
 {id:'p1',m:'Ψυχολογία & ρουτίνα',ty:'th',t:'FOMO, εκδίκηση, υπερεμπιστοσύνη',c:['p-biases'],q:'psy',g:'Να αναγνωρίζεις τα λάθη πριν τα κάνεις.',min:12},
 {id:'p2',m:'Ψυχολογία & ρουτίνα',ty:'pr',t:'Η τέλεια καταγραφή',c:['p-checklist'],task:'journal',g:'Κατέγραψε μια συναλλαγή (πραγματική ή demo) με stop, στρατηγική, κανόνες και διάθεση.',min:10},
 {id:'p3',m:'Ψυχολογία & ρουτίνα',ty:'th',t:'Ρουτίνα ημέρας & όρια',c:['p-routine','breakers'],q:'psy',g:'Πριν, κατά και μετά: η μέρα ενός πειθαρχημένου trader.',min:10},
 {id:'p4',m:'Ψυχολογία & ρουτίνα',ty:'pr',t:'Εβδομαδιαίος απολογισμός',c:['p-change'],task:'review',g:'Δες τον χάρτη ώρα × μέρα στις Αναλύσεις και πες στον Καθηγητή 2 πράγματα που θα αλλάξεις.',min:10},
 {id:'p5',m:'Ψυχολογία & ρουτίνα',ty:'th',t:'Overtrading, tilt & διαδικασία',c:['p-overtrade','p-tilt','p-process'],q:'psy',g:'Οι κανόνες που σε προστατεύουν από τον εαυτό σου.',min:12},
 {id:'c1',m:'Crypto',ty:'th',t:'Crypto: stablecoins, unlocks, ETF',c:['c-stable','c-unlocks','c-etf','c-meme'],q:'cry',g:'Τι κινεί το crypto πέρα από το γράφημα, και πώς αποφεύγεις τις παγίδες.',min:15}
];
var CLSLV=[['beg','Αρχάριος','ξεκινάμε από τα κεριά'],['mid','Μέτριος','ξεκινάμε από το ρίσκο'],['adv','Προχωρημένος','ξεκινάμε από τις στρατηγικές']];
var CLSGOAL=['Να βγάζω σταθερά κέρδη','Να μάθω τεχνική ανάλυση','Να κόψω τα λάθη ψυχολογίας','Να φτιάξω δική μου στρατηγική'];
var CLS={me:null,dirty:0,ob:{},quiz:null,calc:null,trail:[],lastNudge:0,nudges:0,seen:{},start:Date.now(),greeted:false,act:null};
function clsId(){return safeSeg(S.uid||'me')}
function clsMe(){if(!CLS.me&&S.cls&&S.cls[clsId()])CLS.me=JSON.parse(JSON.stringify(S.cls[clsId()]));return CLS.me}
function clsSave(d){d.by=S.uid||'me';d.upd=Date.now();CLS.me=d;CLS.dirty=Date.now();renderProfIfClass();var x=JSON.parse(JSON.stringify(d));put('class',clsId(),x).then(function(){CLS.dirty=0}).catch(function(){})}
function renderProfIfClass(){if(QZ.tab==='class'&&!$('#profPanel').hidden)renderClass()}
function clsIdx(d){var i=CURR.findIndex(function(l){return l.id===(d&&d.cur)});return i<0?0:i}
function clsLesson(d){return CURR[clsIdx(d)]}
function clsSt(d,lid){d.steps=d.steps||{};return d.steps[lid]=d.steps[lid]||{}}
function clsCoin(d){return (d&&d.coin)||'BTC'}
function clsSym(d){var c=clsCoin(d);return CGID[c]?c+'USDT':c}
function clsTxt(s,d){return String(s).replace(/νόμισμά σου/g,'νόμισμά σου ('+clsCoin(d)+')')}
function clsNeed(l){return l.ty==='th'?['read','teach','quiz']:['teach','task']}
function clsDoneSteps(d,l){var st=clsSt(d,l.id);return clsNeed(l).filter(function(k){return st[k]})}
function clsMark(k,lid){var d=clsMe();if(!d)return;var l=lid?CURR.find(function(x){return x.id===lid}):clsLesson(d);if(!l)return;var st=clsSt(d,l.id);if(st[k])return;st[k]=Date.now();clsSave(d);
  if(clsDoneSteps(d,l).length===clsNeed(l).length){profMood('cheer');profSay('Τέλεια! Όλα τα βήματα του μαθήματος «'+l.t+'» έγιναν. Πάτα «Ολοκλήρωση».');}}
function clsQuizIds(l){var out=[],seen={};QBANK.forEach(function(q,i){if(l.c.indexOf(q[1])>=0&&!seen[i]){out.push(i);seen[i]=1}});
  if(out.length<3&&l.q){var pool=[];QBANK.forEach(function(q,i){if(q[0]===l.q&&!seen[i])pool.push(i)});var r=qperm(pool.length,qDayIdx(today())*97+l.id.charCodeAt(0));for(var k=0;k<r.length&&out.length<3;k++)out.push(pool[r[k]])}
  return out.slice(0,3)}
/* auto-detect practice tasks */
function clsTaskDone(d,l){var st=clsSt(d,l.id),t0=st.start||d.upd||0,me=S.uid;
  if(l.task==='demo2r')return (S.demo||[]).some(function(t){return t.by===me&&(t.createdAt||0)>t0&&isFinite(n(t.target))&&Math.abs(n(t.target)-n(t.entry))>=2*Math.abs(n(t.entry)-n(t.stop))-1e-9});
  if(l.task==='demo')return (S.demo||[]).some(function(t){return t.by===me&&(t.createdAt||0)>t0});
  if(l.task==='confirm')return (S.confirms||[]).some(function(c){return c.by===me&&(c.at||0)>t0});
  if(l.task==='journal')return S.trades.some(function(t){return t.by===me&&Date.parse(t.createdAt||0)>t0&&isFinite(n(t.stop))&&t.strategyId&&(t.rules===true||t.rules===false)&&t.emotion})||(S.demo||[]).some(function(t){return t.by===me&&(t.createdAt||0)>t0&&t.notes});
  if(l.task==='draw'){var doc=(S.drawings||[]).find(function(x){return x.id===safeSeg((me||'me')+'_'+clsSym(d))});var it=doc&&(doc.items||doc.d||[]);return Array.isArray(it)&&it.filter(function(x){return x&&/hline|hray/.test(x.type||x.t||'')}).length>=2}
  if(l.task==='chart'||l.task==='review')return !!st.img;
  return false}
function clsCheckTasks(){var d=clsMe();if(!d||!d.cur)return;var l=clsLesson(d);if(l.ty==='pr'&&!clsSt(d,l.id).task&&clsTaskDone(d,l)){clsMark('task');profSay('Είδα ότι το έκανες: «'+l.t+'» ✓',false)}}
/* adaptive hints for today */
function clsHints(d){var h=[],me=S.uid;
  try{var w=qStats(me),cats=Object.keys(w.cat).map(function(c){var v=w.cat[c];return {c:c,p:v[1]?v[0]/v[1]:1,n:v[1]}}).filter(function(x){return x.n>=2&&x.p<0.5}).sort(function(a,b){return a.p-b.p});if(cats[0])h.push(['📘','Αδύναμο θέμα στο τεστ: '+QCAT[cats[0].c]+'. Θα το ξαναδούμε στην επανάληψη.',qCatCard(cats[0].c)])}catch(e){}
  var pend=dmOf(me).filter(dmIsPend).length;if(pend)h.push(['⏳',pend+' demo εντολές σε αναμονή εισόδου. Πριν ανοίξεις άλλη, σκέψου αν ισχύει ακόμα το σενάριο.']);
  var q=qMine(today());if(!(q&&q.done))h.push(['📝','Το τεστ ημέρας (5 ερωτήσεις) δεν έγινε ακόμα.']);
  var ds=dayState(me);if(ds.level==='stop')h.push(['🔒','Η μέρα είναι κλειδωμένη για συναλλαγές. Ιδανική μέρα για θεωρία.']);
  var miss=S.trades.filter(function(t){return t.by===me&&t.date===today()&&(!t.strategyId||t.rules==null)}).length;if(miss)h.push(['✍️',miss+' σημερινές συναλλαγές χωρίς στρατηγική ή κανόνες.']);
  return h}
function clsDayType(d){var l=clsLesson(d),st=clsSt(d,l.id);return l.ty==='th'?'Θεωρία':'Πρακτικό'}
function clsDoneToday(d){return (d.log||[]).some(function(x){return x.date===today()})}
function renderClass(){var body=$('#profBody');if(!body)return;var d=clsMe(),nm=name(S.uid);
  if(!d||!d.level||CLS.editing){var o=CLS.ob;body.innerHTML='<div class="cls">'+
    '<div class="clsboard"><b>Καλώς ήρθες στην τάξη'+(nm&&nm!=='Εγώ'?', '+esc(nm):'')+'!</b><span>Πριν ξεκινήσουμε θέλω να σε γνωρίσω. 5 γρήγορες ερωτήσεις και φτιάχνω πρόγραμμα μαθημάτων μόνο για σένα: θεωρία και πρακτικό, βήμα-βήμα, μέρα με τη μέρα.</span></div>'+
    '<div class="clsq"><span>1. Πόσο έμπειρος είσαι;</span><div class="chips">'+CLSLV.map(function(x){return '<button type="button" class="chip'+(o.level===x[0]?' on':'')+'" data-cob="level|'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div></div>'+
    '<div class="clsq"><span>2. Πού παίζεις κυρίως;</span><div class="chips">'+[['crypto','Crypto'],['stock','Μετοχές'],['index','GER40 / δείκτες']].map(function(x){return '<button type="button" class="chip'+(o.market===x[0]?' on':'')+'" data-cob="market|'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div></div>'+
    '<div class="clsq"><span>3. Με ποιο νόμισμα ή μετοχή ξεκινάμε τα παραδείγματα;</span><div class="chips">'+MKS.crypto.slice(0,10).map(function(x){return '<button type="button" class="chip'+(o.coin===x[0]?' on':'')+'" data-cob="coin|'+x[0]+'">'+symIcon(x[0],16)+' '+x[0]+'</button>'}).join('')+['GER40','AAPL','NVDA','TSLA'].map(function(x){return '<button type="button" class="chip'+(o.coin===x?' on':'')+'" data-cob="coin|'+x+'">'+x+'</button>'}).join('')+'</div></div>'+
    '<div class="clsq"><span>4. Πόσο χρόνο έχεις τη μέρα για μάθημα;</span><div class="chips">'+[10,20,30,45].map(function(x){return '<button type="button" class="chip'+(o.minutes===x?' on':'')+'" data-cob="minutes|'+x+'">'+x+'\'</button>'}).join('')+'</div></div>'+
    '<div class="clsq"><span>5. Ποιος είναι ο στόχος σου;</span><div class="chips">'+CLSGOAL.map(function(x,i){return '<button type="button" class="chip'+(o.goal===x?' on':'')+'" data-cob="goal|'+i+'">'+esc(x)+'</button>'}).join('')+'</div></div>'+
    '<div class="row" style="justify-content:flex-end"><button type="button" class="btn primary" id="clsGo"'+(o.level&&o.coin?'':' disabled')+'>'+(CLS.editing?'Αποθήκευση':'Ξεκινάμε το μάθημα')+'</button></div></div>';return}
  var i=clsIdx(d),l=CURR[i],st=clsSt(d,l.id);if(!st.start){st.start=Date.now();setTimeout(function(){clsSave(d)},0)}
  var doneN=Object.keys(d.done||{}).length,need=clsNeed(l),ok=clsDoneSteps(d,l),tdy=clsDoneToday(d);
  var h='<div class="cls"><div class="clsboard"><div class="row" style="justify-content:space-between;align-items:center;gap:.5rem"><b>Η τάξη'+(nm&&nm!=='Εγώ'?' του '+esc(nm):'')+'</b><span class="pill">'+esc((CLSLV.find(function(x){return x[0]===d.level})||[0,''])[1])+' · '+symIcon(clsCoin(d),14)+' '+esc(clsCoin(d))+'</span></div>'+
    '<div class="clsprog"><i style="width:'+(doneN/CURR.length*100).toFixed(0)+'%"></i></div><span class="muted" style="font-size:.78rem">Μάθημα '+(i+1)+' από '+CURR.length+' · '+doneN+' ολοκληρωμένα · ενότητα: '+esc(l.m)+'</span></div>';
  h+='<div class="clsweek"><div class="row" style="justify-content:space-between;align-items:center;gap:.4rem"><b>📌 Κανόνες της εβδομάδας</b><button type="button" class="btn small" data-clsweek>📅 Απολογισμός τώρα</button></div>'+(d.week&&d.week.rules&&d.week.rules.length?'<ol>'+d.week.rules.map(function(r){return '<li>'+esc(r)+'</li>'}).join('')+'</ol>':'<span class="muted" style="font-size:.82rem">Δεν έχετε κανόνες ακόμα. Κάθε Κυριακή ο Καθηγητής κάνει απολογισμό και γράφει 3 κανόνες για την επόμενη εβδομάδα.</span>')+((d.mistakes||[]).length?'<span class="muted" style="font-size:.78rem">Λάθη που έγιναν μαθήματα: '+d.mistakes.length+'</span>':'')+'</div>';
  if(tdy)h+='<p class="clsnote">✓ Έκανες το μάθημα της ημέρας. Αν έχεις όρεξη συνεχίζουμε, αλλιώς τα λέμε αύριο. Η επανάληψη κάνει περισσότερα από τον όγκο.</p>';
  var hints=clsHints(d);if(hints.length)h+='<div class="clshints">'+hints.map(function(x){return '<div><span>'+x[0]+'</span><span>'+esc(x[1])+'</span>'+(x[2]?' <button type="button" class="linkbtn" data-ref="'+esc(x[2])+'">Κάρτα</button>':'')+'</div>'}).join('')+'</div>';
  h+='<div class="clsles"><div class="row" style="gap:.4rem;align-items:center;flex-wrap:wrap"><span class="pill '+(l.ty==='th'?'acc':'gain')+'">'+(l.ty==='th'?'📖 Θεωρία':'🛠 Πρακτικό')+'</span><span class="muted" style="font-size:.8rem">~'+l.min+'\'</span></div><h3>'+esc(l.t)+'</h3><p class="muted" style="margin:0">'+esc(clsTxt(l.g,d))+'</p><ol class="clssteps">';
  var step=function(k,title,inner){var on=!!st[k];return '<li class="'+(on?'ok':'')+'"><span class="clsck">'+(on?'✓':'')+'</span><div><b>'+title+'</b>'+inner+'</div></li>'};
  if(l.ty==='th')h+=step('read','Διάβασε','<div class="row" style="gap:.35rem;flex-wrap:wrap;margin-top:.3rem">'+l.c.filter(function(id){return window.Manual&&Manual.entry(id)}).map(function(id){return '<button type="button" class="chip" data-clsread="'+esc(id)+'">📖 '+esc(Manual.title(id))+'</button>'}).join('')+'</div>');
  h+=step('teach',l.ty==='th'?'Ο Καθηγητής εξηγεί και σε ρωτάει':'Ο Καθηγητής σου δίνει οδηγίες','<div class="row" style="gap:.4rem;margin-top:.3rem;flex-wrap:wrap"><button type="button" class="btn small primary" data-clsteach>'+(st.teachStart?'Συνέχισε τη συζήτηση':'Ξεκίνα το μάθημα')+'</button>'+(st.teachStart&&!st.teach?'<button type="button" class="btn small" data-clsgot>Το κατάλαβα</button>':'')+'</div>');
  if(l.ty==='th'){var qz=CLS.quiz&&CLS.quiz.lid===l.id?CLS.quiz:null,inner='';
    if(st.quiz)inner='<span class="muted" style="font-size:.82rem"> Σκορ '+esc(st.qscore||'')+'</span>';
    else if(!qz)inner='<div style="margin-top:.3rem"><button type="button" class="btn small" data-clsquiz>3 ερωτήσεις</button></div>';
    else{var qid=qz.ids[qz.i],t=qText(qid),ch=qz.ans[qz.i];inner='<div class="clsquiz"><span class="muted" style="font-size:.78rem">'+(qz.i+1)+' / '+qz.ids.length+'</span><p>'+esc(t.q)+'</p>'+t.o.map(function(o,k){var c='chip';if(ch!=null){if(k===t.a)c+=' on';else if(k===ch)c+=' on no'}return '<button type="button" class="'+c+'" data-clsqa="'+k+'"'+(ch!=null?' disabled':'')+'>'+esc(o)+'</button>'}).join('')+(ch!=null?'<p class="muted" style="font-size:.82rem">'+(ch===t.a?'✓ Σωστά. ':'✗ ')+esc(t.e)+'</p><button type="button" class="btn small primary" data-clsqn>'+(qz.i<qz.ids.length-1?'Επόμενη':'Τέλος')+'</button>':'')+'</div>'}
    h+=step('quiz','Έλεγχος κατανόησης',inner)}
  else{var tk='';
    if(l.task==='chart'||l.task==='draw'||l.task==='review'){var isRev=l.task==='review';tk='<div class="row" style="gap:.4rem;flex-wrap:wrap;margin-top:.3rem">'+(isRev?'<button type="button" class="btn small" data-clsgo="stats">Άνοιξε τις Αναλύσεις</button>':'<button type="button" class="btn small" data-clschart>Άνοιξε το γράφημα '+esc(clsCoin(d))+'</button>')+'<button type="button" class="btn small" data-clsdid>Το έκανα</button></div><span class="muted" style="font-size:.78rem">'+(l.task==='draw'?'Αναγνωρίζεται μόνο του όταν σώσεις 2 οριζόντιες γραμμές.':isRev?'Μετά γράψε στον Καθηγητή τι θα αλλάξεις.':'Στείλε στον Καθηγητή εικόνα του γραφήματος (κουμπί «Ρώτα τον Καθηγητή» κάτω από το γράφημα).')+'</span>'}
    else if(l.task==='calc'){var c=CLS.calc;if(!c||c.lid!==l.id){var px=livePx(clsSym(d));if(!isFinite(px))px=100;var e=+px.toPrecision(5),s0=+(e*0.98).toPrecision(5);c=CLS.calc={lid:l.id,bal:2000,rk:1,e:e,s:s0,ans:20/(e-s0)}}
      tk='<p style="margin:.3rem 0">Λογαριασμός <b>2.000 $</b>, ρίσκο <b>1%</b>. Long στο '+esc(clsCoin(d))+' με είσοδο <b>'+dmPx(c.e)+'</b> και stop <b>'+dmPx(c.s)+'</b>. Πόσα κομμάτια αγοράζεις;</p><div class="row" style="gap:.4rem"><input id="clsCalc" inputmode="decimal" style="max-width:9rem" placeholder="ποσότητα"><button type="button" class="btn small primary" data-clscalc>Έλεγχος</button></div><span class="muted" id="clsCalcMsg" style="font-size:.8rem"></span>'}
    else{var go={demo2r:['demo','Άνοιξε το Demo'],demo:['demo','Άνοιξε το Demo'],confirm:['chat','Ζήτα τεχνικές'],journal:['trades','Άνοιξε τις Συναλλαγές']}[l.task]||['today','Πάμε'];
      tk='<div class="row" style="gap:.4rem;margin-top:.3rem"><button type="button" class="btn small" data-clsgo="'+go[0]+'">'+go[1]+'</button></div><span class="muted" style="font-size:.78rem">Το αναγνωρίζω μόνο μου μόλις το κάνεις.</span>'}
    h+=step('task','Η άσκηση',tk)}
  h+='</ol><div class="row" style="justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap"><span class="muted" style="font-size:.8rem">'+ok.length+' / '+need.length+' βήματα</span><button type="button" class="btn primary" data-clsdone'+(ok.length===need.length?'':' disabled')+'>Ολοκλήρωση μαθήματος →</button></div></div>';
  h+='<details class="clscurr"><summary>Το πρόγραμμα ('+doneN+'/'+CURR.length+')</summary><ol>'+CURR.map(function(x,k){var dn=d.done&&d.done[x.id];return '<li class="'+(dn?'ok':'')+(k===i?' cur':'')+'"><button type="button" class="linkbtn" data-clsjump="'+x.id+'">'+(dn?'✓ ':'')+(x.ty==='th'?'📖 ':'🛠 ')+esc(x.t)+'</button><span class="muted"> · '+esc(x.m)+'</span></li>'}).join('')+'</ol></details>';
  h+='<div class="row clsset"><label class="row" style="gap:.35rem;align-items:center;font-size:.82rem"><input type="checkbox" id="clsNudge" style="width:auto"'+(d.nudge===false?'':' checked')+'> Ο Καθηγητής πετάγεται με μηνύματα</label><button type="button" class="linkbtn" data-clsreset>Άλλαξε επίπεδο / νόμισμα</button></div></div>';
  body.innerHTML=h}
function clsTeach(){var d=clsMe(),l=clsLesson(d),st=clsSt(d,l.id),first=!st.teachStart;st.teachStart=st.teachStart||Date.now();clsSave(d);QZ.tab='chat';$('#profBody').innerHTML='';renderProf();
  if(!first){var q=$('#pq');if(q)q.focus();return}
  var cards=l.c.map(function(id){return '[['+id+']]'}).join(', ');
  pAsk(l.ty==='th'?'Μάθημα '+(clsIdx(d)+1)+': «'+l.t+'». Δίδαξέ μου το πρώτο κομμάτι απλά, με παράδειγμα στο '+clsCoin(d)+', και κάνε μου μία ερώτηση για να δεις αν το κατάλαβα. Κάρτες: '+cards+'.':'Πρακτικό μάθημα: «'+l.t+'». Η άσκηση: '+clsTxt(l.g,d)+' Δώσε μου οδηγίες βήμα-βήμα για το '+clsCoin(d)+' και πες μου τι να προσέξω.',false)}
function clsOnReply(txt){try{wkOnReply(txt)}catch(e){}if(/\[\[lesson:pass\]\]/.test(txt)){var d=clsMe();if(d&&d.cur)clsMark('teach')}}
function clsComplete(){var d=clsMe(),i=clsIdx(d),l=CURR[i];d.done=d.done||{};d.done[l.id]=Date.now();d.log=(d.log||[]).concat([{date:today(),lid:l.id,ty:l.ty}]).slice(-200);
  var nx=CURR.slice(i+1).find(function(x){return !d.done[x.id]})||CURR.find(function(x){return !d.done[x.id]});d.cur=nx?nx.id:l.id;CLS.quiz=null;CLS.calc=null;clsSave(d);
  confetti($('#profBody'));profMood('cheer');profSay(nx?'Μπράβο! Επόμενο: «'+nx.t+'» ('+(nx.ty==='th'?'θεωρία':'πρακτικό')+'). Αύριο ή τώρα, εσύ αποφασίζεις.':'Τελείωσες όλο το πρόγραμμα! Συγχαρητήρια.')}
/* ---------- ο Καθηγητής πετάγεται ---------- */
function clsAct(a){if(a&&a.fn){a.fn();return}if(a==='class'){QZ.tab='class';profOpen(true);return}if(true){QZ.tab='chat';$('#profBody').innerHTML='';profOpen(true);setTimeout(function(){var q=$('#pq');if(q)q.focus()},120);return}if(a.tab){showTab(a.tab)}}
function nudgeMode(){try{return localStorage.getItem('tj-nudge')||'few'}catch(e){return 'few'}}
function nudgeAllow(){var m=nudgeMode();if(m==='off')return false;if(m==='normal')return true;var k='tj-nudgec',d={};try{d=JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){}if(d.day!==today())d={day:today(),n:0,at:0};
  if(d.n>=2||Date.now()-(d.at||0)<45*6e4)return false;d.n++;d.at=Date.now();try{localStorage.setItem(k,JSON.stringify(d))}catch(e){}return true}
function clsPop(t,act){if(!nudgeAllow())return;var mtxt=act&&act.ask?act.ask:t;var last=PCH.msgs[PCH.msgs.length-1];if(!last||last.content!==mtxt){PCH.msgs.push({role:'assistant',content:mtxt,id:newId(),pop:true,at:Date.now()});pchSave()}CLS.unread=(CLS.unread||0)+1;profUnread();if(QZ.tab==='chat'&&!$('#profPanel').hidden&&!PCH.busy)renderChat();CLS.act=act||'chat';CLS.lastNudge=Date.now();CLS.nudges++;profSay(t,true);profMood('wow');setTimeout(function(){profMood('')},900);$$('.prof-btn .prof-svg').forEach(function(s){s.classList.add('wave');setTimeout(function(){s.classList.remove('wave')},2200)})}
function profUnread(){var b=$('#profUnread'),n0=CLS.unread||0;if(b){b.hidden=!n0;b.textContent=n0>9?'9+':String(n0)}var tb=document.querySelector('#profTabs [data-pt="chat"]');if(tb)tb.textContent='💬 Ρώτα με'+(n0?' ('+n0+')':'')}
function clsGreet(){var d=clsMe();var nm=name(S.uid),hi=(new Date().getHours()<12?'Καλημέρα':new Date().getHours()<18?'Γεια σου':'Καλησπέρα')+(nm&&nm!=='Εγώ'?' '+nm.split(' ')[0]:'')+'!';
  if(!d||!d.level){clsPop(hi+' Θέλεις να σου φτιάξω πρόγραμμα μαθημάτων; Πάμε στην τάξη, 1 λεπτό για να σε γνωρίσω.','class');return}
  var l=clsLesson(d);if(clsDoneToday(d)){var q=qMine(today());clsPop(hi+' Το σημερινό μάθημα έγινε ✓. '+(q&&q.done?'Θες να συζητήσουμε το γράφημα του '+clsCoin(d)+';':'Μένει το τεστ ημέρας: 5 ερωτήσεις.'),q&&q.done?{ask:'Ας δούμε το '+clsCoin(d)+'. Άνοιξε το γράφημα στις Αγορές και πες μου: τι τάση βλέπεις στο 4h και πού είναι η πιο κοντινή στήριξη;'}:'class');return}
  var pl=dayPlan();clsPop(hi+' Σήμερα έχουμε '+(l.ty==='th'?'θεωρία':'πρακτικό')+': «'+l.t+'» (~'+l.min+'\')'+(pl.due?', '+Math.min(15,pl.due)+' επαναλήψεις':'')+' και 2 replay. Πάμε;','class')}
function clsNudgeTick(){var d=clsMe();if(!S.uid||document.hidden)return;if(d&&d.nudge===false)return;
  if(!$('#profPanel').hidden)return;var ae=document.activeElement;if(ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName))return;
  if(!CLS.greeted&&Date.now()-CLS.start>2500){CLS.greeted=true;var k='tj-clsgreet',v='';try{v=localStorage.getItem(k)}catch(e){}if(v!==today()){try{localStorage.setItem(k,today())}catch(e){}clsGreet();return}}
  if(nudgeMode()==='off')return;if(Date.now()-CLS.lastNudge<(nudgeMode()==='normal'?5:45)*6e4||CLS.nudges>=(nudgeMode()==='normal'?8:2)||Date.now()-CLS.start<(nudgeMode()==='normal'?9e4:6*6e4))return;
  if(wkCheck())return;
  if(!d||!d.level)return;var tab=(document.querySelector('.tabs button[aria-selected="true"]')||{}).getAttribute?document.querySelector('.tabs button[aria-selected="true"]').getAttribute('data-tab'):'';
  var recent=CLS.trail.filter(function(x){return Date.now()-x.at<3*6e4}),uniq={};recent.forEach(function(x){uniq[x.t]=1});var l=clsLesson(d),done=clsDoneToday(d);
  if(!done&&Object.keys(uniq).length>=3){clsPop('Τι κάνουμε; Πηγαινοέρχεσαι από καρτέλα σε καρτέλα. Το σημερινό μάθημα «'+l.t+'» θέλει ~'+l.min+'\'. Πάμε μαζί;','class');CLS.trail=[];return}
  var key=tab+'_'+today();if(CLS.seen[key])return;var stay=CLS.trail.length?Date.now()-CLS.trail[CLS.trail.length-1].at:Date.now()-CLS.start;if(stay<45e3)return;
  var coin=clsCoin(d),m=null;
  if(tab==='markets')m=['Βλέπεις γραφήματα; Γρήγορη ερώτηση για το '+coin+': ανοδική ή πτωτική τάση στο 1h, και γιατί;',{ask:'Πες μου για το '+coin+': ανοδική ή πτωτική τάση βλέπεις στο 1h; Δικαιολόγησέ το με ένα στοιχείο από το γράφημα (κορυφές/πάτοι, EMA, όγκος).'}];
  else if(tab==='demo'){var pe=dmOf('prof').filter(dmIsPend).length;m=pe?['Έχεις '+pe+' εντολές σε αναμονή. Αν δεν πιάσουν την είσοδο, θα τις ακύρωνες ή θα τις κυνηγούσες;',{ask:'Έχεις '+pe+' demo εντολές σε αναμονή. Αν η τιμή φύγει χωρίς να πιάσει την είσοδο, τι κάνεις: ακυρώνεις, περιμένεις ή μπαίνεις σε χειρότερη τιμή; Εξήγησέ μου.'}]:['Demo χωρίς σχέδιο είναι κουμπί καζίνο. Πριν ανοίξεις: πού είναι το stop και γιατί εκεί;',null]}
  else if(tab==='trades')m=['Καταγράφεις συναλλαγή; Stop, στρατηγική από τη λίστα, και στο κλείσιμο 2 κλικ: κανόνες και διάθεση.',null];
  else if(tab==='manual')m=['Τι διαβάζεις; Όταν τελειώσεις, πες μου με δικά σου λόγια τι κράτησες και θα σε διορθώσω.',{ask:'Τι διάβασες μόλις στον Μπούσουλα; Πες μου με δικά σου λόγια το πιο σημαντικό που κράτησες, και θα σου κάνω μια ερώτηση πάνω σε αυτό.'}];
  else if(tab==='stats')m=['Κοίτα τον χάρτη ώρα × μέρα. Ποια ώρα σού πάει καλύτερα; Πες μου και θα φτιάξουμε κανόνα.',{ask:'Κοίταξες τον χάρτη ώρα × μέρα στις Αναλύσεις; Ποια ώρα και ποια μέρα σού πάνε καλύτερα, και ποιες χειρότερα; Πες μου και φτιάχνουμε μαζί έναν κανόνα.'}];
  else if(tab==='strategies')m=['Ποια στρατηγική εμπιστεύεσαι περισσότερο και γιατί; Πες μου, να τη δοκιμάσουμε.',{ask:'Από τις στρατηγικές σας, ποια εμπιστεύεσαι περισσότερο και γιατί; Πες μου τους κανόνες της με δικά σου λόγια.'}];
  else if(tab==='today'&&!done)m=['Είμαι εδώ όταν είσαι έτοιμος: «'+l.t+'».','class'];
  if(m){CLS.seen[key]=1;clsPop(m[0],m[1])}}
function clsInit(){
  document.addEventListener('click',function(e){var tb=e.target.closest('.tabs [data-tab]');if(tb)CLS.trail.push({t:tb.getAttribute('data-tab'),at:Date.now()});if(CLS.trail.length>30)CLS.trail.shift()});
  setInterval(function(){try{clsNudgeTick();clsCheckTasks()}catch(e){}},15000);setTimeout(function(){try{clsNudgeTick()}catch(e){}},4000);
  $('#profPanel').addEventListener('change',function(e){if(e.target.id==='clsNudge'){var d=clsMe();if(d){d.nudge=e.target.checked;clsSave(d)}}});
  $('#profPanel').addEventListener('click',function(e){var t=e.target;if(!t.closest('.cls'))return;var d=clsMe();
    var ob=t.closest('[data-cob]');if(ob){var p=ob.getAttribute('data-cob').split('|');CLS.ob[p[0]]=p[0]==='minutes'?+p[1]:p[0]==='goal'?CLSGOAL[+p[1]]:p[1];renderClass();return}
    if(t.closest('#clsGo')){if(CLS.editing&&d){var o2=CLS.ob;d.level=o2.level||d.level;d.market=o2.market||d.market;d.coin=o2.coin||d.coin;d.minutes=o2.minutes||d.minutes;d.goal=o2.goal||d.goal;CLS.editing=false;var st2={beg:'b1',mid:'r1',adv:'s1'}[d.level],k2=CURR.findIndex(function(x){return x.id===st2});if(k2>clsIdx(d)&&!Object.keys(d.done||{}).length)d.cur=st2;CLS.calc=null;clsSave(d);profSay('Αποθηκεύτηκε. Τα παραδείγματα θα είναι πλέον στο '+d.coin+'.');return}
      var o=CLS.ob,st={beg:'b1',mid:'r1',adv:'s1'}[o.level]||'b1',dn={};if(o.level!=='beg'){for(var k=0;k<CURR.length&&CURR[k].id!==st;k++)dn[CURR[k].id]=0}
      clsSave({level:o.level,market:o.market||'crypto',coin:o.coin||'BTC',minutes:o.minutes||20,goal:o.goal||'',cur:st,done:{},steps:{},log:[],nudge:true,since:today()});profMood('cheer');profSay('Τέλεια! Το πρόγραμμά σου είναι έτοιμο. Ξεκινάμε από «'+CURR.find(function(x){return x.id===st}).t+'».');return}
    if(!d)return;var l=clsLesson(d);
    var rd=t.closest('[data-clsread]');if(rd){clsMark('read');return}
    if(t.closest('[data-clsteach]')){clsTeach();return}
    if(t.closest('[data-clsgot]')){clsMark('teach');return}
    if(t.closest('[data-clsquiz]')){CLS.quiz={lid:l.id,ids:clsQuizIds(l),i:0,ans:[]};if(!CLS.quiz.ids.length){clsMark('quiz');return}renderClass();return}
    var qa=t.closest('[data-clsqa]');if(qa&&CLS.quiz){var z=CLS.quiz;z.ans[z.i]=+qa.getAttribute('data-clsqa');if(z.ans[z.i]===qText(z.ids[z.i]).a){profMood('cheer')}else profMood('sad');renderClass();return}
    if(t.closest('[data-clsqn]')&&CLS.quiz){var z2=CLS.quiz;if(z2.i<z2.ids.length-1){z2.i++;renderClass();return}var ok=z2.ans.filter(function(a,k){return a===qText(z2.ids[k]).a}).length;
      if(ok>=Math.ceil(z2.ids.length*2/3)){var s2=clsSt(d,l.id);s2.qscore=ok+'/'+z2.ids.length;CLS.quiz=null;clsMark('quiz')}else{CLS.quiz=null;profSay(ok+'/'+z2.ids.length+'. Ξαναδιάβασε την κάρτα και ξαναπροσπάθησε: δεν βιαζόμαστε.');renderClass()}return}
    if(t.closest('[data-clschart]')){MK.g=CGID[clsCoin(d)]?'crypto':'stock';MK.sel[MK.g]=clsCoin(d);MK.v='one';try{mkSave()}catch(x){}profOpen(false);showTab('markets');return}
    var go=t.closest('[data-clsgo]');if(go){var g=go.getAttribute('data-clsgo');if(g==='chat'){QZ.tab='chat';$('#profBody').innerHTML='';renderProf();pAsk('Για την άσκηση «'+l.t+'»: πρότεινέ μου 3-4 τεχνικές για το '+clsSym(d)+' με είσοδο, stop και στόχο.',false);return}profOpen(false);showTab(g);return}
    if(t.closest('[data-clsdid]')){var s3=clsSt(d,l.id);s3.img=s3.img||Date.now();clsMark('task');return}
    if(t.closest('[data-clscalc]')){var v=n($('#clsCalc').value),c=CLS.calc;if(!c)return;if(isFinite(v)&&Math.abs(v-c.ans)/c.ans<0.03){$('#clsCalcMsg').textContent='✓ Σωστά: 20 $ ρίσκο ÷ '+dmPx(c.e-c.s)+' απόσταση = '+fmt(c.ans,4)+'.';clsMark('task')}else $('#clsCalcMsg').textContent='Όχι ακόμα. Υπόδειξη: ρίσκο σε $ = 2.000 × 1%. Μετά διαίρεσε με την απόσταση είσοδος − stop.';return}
    if(t.closest('[data-clsdone]')){clsComplete();return}
    if(t.closest('[data-clsweek]')){wkStart();return}
    var jp=t.closest('[data-clsjump]');if(jp){d.cur=jp.getAttribute('data-clsjump');CLS.quiz=null;clsSave(d);return}
    if(t.closest('[data-clsreset]')){CLS.ob={level:d.level,market:d.market,coin:d.coin,minutes:d.minutes,goal:d.goal};CLS.editing=true;renderClass();return}
  });
}
window.__clsAns=function(){return qText(CLS.quiz.ids[CLS.quiz.i]).a};window.__clsCtx=function(){return clsCtx()};
function clsCtx(){var d=clsMe();if(!d||!d.level)return {enrolled:false};var l=clsLesson(d),st=clsSt(d,l.id);
  return {enrolled:true,level:d.level,market:d.market,example_symbol:clsSym(d),minutes_per_day:d.minutes,goal:d.goal,lessons_done:Object.keys(d.done||{}).length,lessons_total:CURR.length,lesson_done_today:clsDoneToday(d),
    current_lesson:{number:clsIdx(d)+1,title:l.t,type:l.ty==='th'?'theory':'practice',module:l.m,goal:clsTxt(l.g,d),manual_cards:l.c,steps_done:Object.keys(st).filter(function(k){return /^(read|teach|quiz|task)$/.test(k)})},
    week_rules:d.week&&d.week.rules||[],last_week_rules:d.prevWeek&&d.prevWeek.rules||[],recent_mistakes:(d.mistakes||[]).slice(-5).map(function(m){return {type:m.type,symbol:m.sym,date:lday(new Date(m.at))}}),next_lessons:CURR.slice(clsIdx(d)+1,clsIdx(d)+3).map(function(x){return x.t})}}

/* ================= REPLAY: παίξε στο παρελθόν ================= */
var RPCOINS=['BTC','ETH','SOL','XRP','BNB','DOGE','ADA','AVAX','LINK','SUI','LTC','ZEC','HYPE'],RPTF=['15m','1h','4h','1D'],RPH=15;
var RP={bars:null,cut:0,shown:0,dec:null,entry:NaN,stop:NaN,tgt:NaN,pick:'stop',res:null,busy:false,msg:'',sym:'',tf:'',atr:NaN,timer:null};
function rpStats(){var d=prMe();d.rp=d.rp||{n:0,w:0,l:0,r:0,pts:0,skip:0,best:0,seen:{}};d.rp.seen=d.rp.seen||{};return d.rp}
function rpSave(){var d=prMe();d.by=S.uid||'me';d.upd=Date.now();PR.dirty=Date.now();put('prac',prId(),JSON.parse(JSON.stringify(d))).then(function(){PR.dirty=0}).catch(function(){})}
function rpATR(b){var tr=[];for(var i=Math.max(1,b.length-15);i<b.length;i++)tr.push(Math.max(b[i].h-b[i].l,Math.abs(b[i].h-b[i-1].c),Math.abs(b[i].l-b[i-1].c)));return tr.length?sum(tr)/tr.length:NaN}
function rpNew(){if(RP.busy)return;clearInterval(RP.timer);if(!CG.mcp&&!S.db){RP.msg='Το Replay χρειάζεται τα κεριά του Crypto.com (ανοίξτε τη σελίδα από το claude.ai).';renderReplay();return}
  var cs=$('#rp-sym').value,ts=$('#rp-tf').value,coin=cs&&cs!=='any'?cs:RPCOINS[Math.floor(Math.random()*RPCOINS.length)],tf=ts&&ts!=='any'?ts:RPTF[Math.floor(Math.random()*RPTF.length)];
  if(!CG.mcp){if(!SHB.idx){RP.busy=true;RP.msg='Φέρνω τα κοινά κεριά της παρέας…';renderReplay();shbLoadIdx().then(function(){RP.busy=false;rpNew()});return}
    var pk=shbPick(cs&&cs!=='any'?cs:null,ts&&ts!=='any'?ts:null,40);if(!pk){RP.msg=ccErrText({code:'no_shared'});renderReplay();return}coin=pk.coin;tf=pk.tf}
  RP.busy=true;RP.msg='Φέρνω πραγματικά κεριά '+coin+' · '+tf+'…';RP.bars=null;RP.res=null;RP.dec=null;renderReplay();
  ccFetchBars(coin+'USDT',tf).then(function(r){var b=r.bars.filter(function(x){return !x.approx&&isFinite(x.o)&&isFinite(x.c)});if(b.length<40)throw {code:'short'};
    var st=rpStats(),opts=[];for(var c=30;c<=b.length-RPH;c++){if(!st.seen[coin+'|'+tf+'|'+b[c-1].t])opts.push(c)}
    if(!opts.length)throw {code:'used'};
    var cut=opts[Math.floor(Math.random()*opts.length)],st0=Math.max(0,cut-120);RP.sym=coin;RP.tf=tf;RP.bars=b.slice(st0,Math.min(b.length,cut+RPH));cut-=st0;RP.cut=cut;RP.shown=0;RP.dec=null;RP.res=null;RP.atr=rpATR(b.slice(0,cut));RP.entry=b[cut-1].c;RP.msg='';RP.htf=null;var c0=coin,t0=tf,k0=b[cut-1].t;tcHtf(coin,tf,b[cut-1].t,function(x){if(RP.sym===c0&&RP.tf===t0&&RP.bars&&RP.bars[RP.cut-1].t===k0){RP.htf=x;renderReplay()}});
  }).catch(function(e){RP.msg=e&&e.code==='used'?'Έπαιξες όλα τα σενάρια του '+coin+' · '+tf+'. Πάτα ξανά «Νέο σενάριο» ή διάλεξε άλλο νόμισμα/timeframe (νέα κεριά έρχονται συνεχώς).':e&&e.code==='short'?'Λίγα κεριά για αυτόν τον συνδυασμό. Δοκίμασε άλλο.':ccErrText(e)})
   .then(function(){RP.busy=false;renderReplay()})}
function rpDecide(dir){if(!RP.bars||RP.res)return;RP.dec=dir;if(dir==='skip'){rpPlay();return}var d=dir==='long'?1:-1,a=RP.atr||RP.entry*0.01;RP.stop=+(RP.entry-d*1.5*a).toPrecision(6);RP.tgt=+(RP.entry+d*3*a).toPrecision(6);RP.pick='stop';renderReplay()}
function rpSim(dir,e,s,t,bars){var d=dir==='long'?1:-1,risk=Math.abs(e-s);for(var i=0;i<bars.length;i++){var b=bars[i],hs=d>0?b.l<=s:b.h>=s,ht=d>0?b.h>=t:b.l<=t;if(hs)return {r:-1,i:i,hit:'stop'};if(ht)return {r:Math.abs(t-e)/risk,i:i,hit:'tgt'}}var lc=bars[bars.length-1].c;return {r:(lc-e)*d/risk,i:bars.length-1,hit:'end'}}
function rpPlay(){if(!RP.bars||RP.res)return;var fut=RP.bars.slice(RP.cut),dec=RP.dec;
  if(dec!=='skip'){var dd=dec==='long'?1:-1;if(!((RP.entry-RP.stop)*dd>0)){toast(dec==='long'?'Σε long το stop είναι κάτω από την είσοδο.':'Σε short το stop είναι πάνω από την είσοδο.');return}if(!((RP.tgt-RP.entry)*dd>0)){toast('Ο στόχος είναι στη λάθος πλευρά.');return}}
  var sim=dec==='skip'?{i:fut.length-1}:rpSim(dec,RP.entry,RP.stop,RP.tgt,fut);RP.playing=true;RP.shown=0;renderReplay();
  RP.timer=setInterval(function(){RP.shown++;rpDraw();if(RP.shown>sim.i||RP.shown>=fut.length){clearInterval(RP.timer);RP.playing=false;rpFinish(sim)}},230)}
function rpFinish(sim){var fut=RP.bars.slice(RP.cut),a=RP.atr||RP.entry*0.01,st=rpStats(),pts=0,txt='';
  var L=rpSim('long',RP.entry,RP.entry-1.5*a,RP.entry+3*a,fut),Sh=rpSim('short',RP.entry,RP.entry+1.5*a,RP.entry-3*a,fut);
  if(RP.dec==='skip'){var good=L.r<0.5&&Sh.r<0.5;pts=good?3:0;st.skip++;txt=good?'Σωστά έμεινες έξω: ούτε long ούτε short θα έβγαζε κάτι καλό.':'Έμεινες έξω. Υπήρχε ευκαιρία: '+(L.r>Sh.r?'long':'short')+' θα έβγαζε '+fR(Math.max(L.r,Sh.r))+'.';RP.res={r:0,pts:pts,txt:txt,skip:true,L:L,S:Sh}}
  else{var r=Math.round(sim.r*100)/100;pts=Math.max(-10,Math.min(30,Math.round(r*10)));st.n++;if(r>0)st.w++;else if(r<0)st.l++;st.r=Math.round((st.r+r)*100)/100;st.best=Math.max(st.best||0,r);
    txt=sim.hit==='tgt'?'🎯 Έπιασε τον στόχο!':sim.hit==='stop'?'🛑 Χτύπησε το stop.':'⏱ Τελείωσαν τα κεριά: κλείσιμο στην τελευταία τιμή.';RP.res={r:r,pts:pts,txt:txt,hit:sim.hit,L:L,S:Sh}}
  st.days=st.days||{};st.days[today()]=(st.days[today()]||0)+1;st.pts=(st.pts||0)+pts;st.seen[RP.sym+'|'+RP.tf+'|'+RP.bars[RP.cut-1].t]=1;rpSave();RP.shown=fut.length;
  if(RP.res.r>=2){confetti($('#rpCard'));profMood('cheer')}else if(RP.res.r<0)profMood('sad');renderReplay()}
function rpAsk(){var vis=RP.bars.slice(Math.max(0,RP.cut-25),RP.cut),r6=function(v){return +(+v).toPrecision(6)};
  var q='Replay προπόνηση στο '+RP.sym+'USDT '+RP.tf+'. Τα τελευταία κεριά που έβλεπα (O,H,L,C): '+vis.map(function(b){return '['+r6(b.o)+','+r6(b.h)+','+r6(b.l)+','+r6(b.c)+']'}).join(' ')+'. ATR14 ≈ '+r6(RP.atr)+'. '+
    (RP.dec==='skip'?'Αποφάσισα να ΜΗΝ μπω.':'Μπήκα '+RP.dec+' στο '+r6(RP.entry)+' με stop '+r6(RP.stop)+' και στόχο '+r6(RP.tgt)+'.')+' Αποτέλεσμα: '+RP.res.txt+(RP.res.skip?'':' ('+fR(RP.res.r)+')')+
    '. Αξιολόγησε την απόφασή μου σαν προπονητής, ανεξάρτητα από το αποτέλεσμα: ήταν καλό setup με βάση τη δομή, τα επίπεδα και την ορμή; Πού θα έβαζες εσύ stop και στόχο; Ένα μάθημα να κρατήσω. Έως 150 λέξεις, χωρίς γραμμές [[tech:...]].';
  QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();pAsk(q,false)}
function rpDraw(){var cv=$('#rpCv');if(!cv)return;if(!RP.bars){var c0=cv.getContext('2d');cv.style.height='0px';return}
  var L=[];if(RP.dec&&RP.dec!=='skip'){L.push({v:RP.tgt,col:'#26a69a',lab:'TP',x0:Math.max(0,RP.cut-8)});L.push({v:RP.stop,col:'#ef5350',lab:'SL',x0:Math.max(0,RP.cut-8)});L.push({v:RP.entry,col:mkDark()?'#d1d4dc':'#2a2e39',lab:'IN',x0:Math.max(0,RP.cut-8)})}
  var g=tcDraw(cv,{bars:RP.bars,slots:RP.bars.length,vis:RP.cut+RP.shown,hideFrom:true,cut:RP.cut,tf:RP.tf,lines:L,after:function(c,X,Y){if(RP.dec&&RP.dec!=='skip'){c.fillStyle=mkDark()?'#d1d4dc':'#2a2e39';c.font='bold 11px system-ui,sans-serif';c.fillText(RP.dec==='long'?'▲ LONG':'▼ SHORT',X(Math.max(0,RP.cut-8)),Y(RP.entry)-6);c.font='11px system-ui,sans-serif'}}});
  cv._geo=g;if(g)RP.Yinv=g.inv}

function renderReplay(){var el=$('#rpCtl');if(!el)return;var st=rpStats();
  $('#rpStats').innerHTML='<span><b>🎮 '+st.n+'</b><i>replays</i></span><span><b>🎯 '+(st.n?Math.round(st.w/st.n*100):0)+'%</b><i>'+st.w+' κέρδη / '+st.l+' ζημιές</i></span><span><b class="'+cls(st.r)+'">'+fR(st.r)+'</b><i>σύνολο R</i></span><span><b>⭐ '+(st.pts||0)+'</b><i>πόντοι replay</i></span>';
  var h='';if(RP.msg)h+='<p class="muted">'+esc(RP.msg)+'</p>';
  if(!RP.bars){h+=RP.busy?'':'<p>Πάτα <b>«Νέο σενάριο»</b>: θα δεις πραγματικά κεριά από το Crypto.com και τα επόμενα '+RPH+' θα είναι κρυμμένα.</p>';el.innerHTML=h;$('#rpTog').innerHTML='';$('#rpInfo').innerHTML='';rpDraw();return}
  h+='<p class="rpinfo"><b>'+symIcon(RP.sym,18)+' '+esc(RP.sym)+'USDT · '+esc(RP.tf)+'</b> · τελευταία τιμή <b>'+dmPx(RP.entry)+'</b> · ATR '+dmPx(RP.atr)+' · <span class="muted">μπλε γραμμή = EMA 20</span></p>';
  if(!RP.dec)h+='<div class="rpbtns"><button type="button" class="btn rpl" data-rp="long">📈 Long</button><button type="button" class="btn rps" data-rp="short">📉 Short</button><button type="button" class="btn" data-rp="skip">⏸ Δεν μπαίνω</button></div><p class="muted" style="font-size:.82rem">Τι θα έκανες εδώ; Κοίτα δομή, επίπεδα και ορμή πριν αποφασίσεις.</p>';
  else if(!RP.res&&!RP.playing&&RP.dec!=='skip'){var rr=Math.abs(RP.tgt-RP.entry)/Math.abs(RP.entry-RP.stop);
    h+='<div class="rpset"><label class="f">Stop loss<input id="rp-stop" inputmode="decimal" value="'+RP.stop+'"></label><label class="f">Στόχος<input id="rp-tgt" inputmode="decimal" value="'+RP.tgt+'"></label><div class="rpclick"><span class="muted">Κλικ στο γράφημα ορίζει:</span><button type="button" class="chip'+(RP.pick==='stop'?' on no':'')+'" data-rppick="stop">Stop</button><button type="button" class="chip'+(RP.pick==='tgt'?' on':'')+'" data-rppick="tgt">Στόχο</button></div></div>'+
      '<p class="rpinfo">'+(RP.dec==='long'?'📈 Long':'📉 Short')+' στο <b>'+dmPx(RP.entry)+'</b> · κέρδος/ρίσκο <b class="'+(rr>=1.5?'pos':'neg')+'">1:'+(isFinite(rr)?fmt(rr,2):'–')+'</b></p><div class="rpbtns"><button type="button" class="btn primary" id="rpPlay">▶ Παίξε τα επόμενα κεριά</button><button type="button" class="btn" data-rp="undo">Άλλαξε απόφαση</button></div>'}
  else if(RP.playing)h+='<p class="rpinfo">▶ Τα κεριά αποκαλύπτονται…</p>';
  else if(RP.res){var R=RP.res;h+='<div class="rpres '+(R.skip?'':R.r>0?'ok':R.r<0?'no':'')+'"><b>'+esc(R.txt)+'</b>'+(R.skip?'':'<span class="big num '+cls(R.r)+'">'+fR(R.r)+'</span>')+'<span>'+(R.pts>0?'+':'')+R.pts+' πόντοι</span><span class="muted">Αν είχες μπει long: '+fR(R.L.r)+' · short: '+fR(R.S.r)+' (stop 1,5 ATR, στόχος 2R)</span></div>'+
    '<div class="rpbtns"><button type="button" class="btn" id="rpAsk">🧑‍🏫 Τι λέει ο Καθηγητής</button><button type="button" class="btn primary" id="rpNext">Νέο σενάριο →</button></div>'}
  el.innerHTML=h;$('#rpTog').innerHTML=RP.bars?tcToggles():'';$('#rpInfo').innerHTML=RP.bars?tcInfo(RP.bars.slice(0,RP.cut+(RP.res?RP.shown:0)),RP.tf,RP.htf):'';rpDraw()}
function bindReplay(){var card=$('#rpCard');if(!card)return;
  card.addEventListener('click',function(e){var t=e.target;
    if(t.closest('#rpNew')||t.closest('#rpNext')){rpNew();return}
    var d=t.closest('[data-rp]');if(d){var v=d.getAttribute('data-rp');if(v==='undo'){RP.dec=null;renderReplay();return}rpDecide(v);return}
    var pk=t.closest('[data-rppick]');if(pk){RP.pick=pk.getAttribute('data-rppick');renderReplay();return}
    if(t.closest('#rpPlay')){rpPlay();return}if(t.closest('#rpAsk')){rpAsk();return}
    if(t.id==='rpCv'&&RP.bars&&RP.dec&&RP.dec!=='skip'&&!RP.res&&!RP.playing&&RP.Yinv){var r=t.getBoundingClientRect(),v2=+RP.Yinv(e.clientY-r.top).toPrecision(6);if(RP.pick==='stop'){RP.stop=v2;RP.pick='tgt'}else RP.tgt=v2;renderReplay()}});
  card.addEventListener('input',function(e){if(e.target.id==='rp-stop'){RP.stop=n(e.target.value);rpDraw()}if(e.target.id==='rp-tgt'){RP.tgt=n(e.target.value);rpDraw()}});
  card.addEventListener('change',function(e){if(e.target.id==='rp-stop'||e.target.id==='rp-tgt')renderReplay()});
  window.addEventListener('resize',function(){if(!$('section[data-panel="train"]').hidden)rpDraw()});
  $('#rp-sym').innerHTML='<option value="any">Τυχαίο νόμισμα</option>'+RPCOINS.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('');
  $('#rp-tf').innerHTML='<option value="any">Τυχαίο timeframe</option>'+RPTF.map(function(c){return '<option value="'+c+'">'+c+'</option>'}).join('')}
/* ---------- τα λάθη γίνονται μαθήματα ---------- */
var COACH={FOMO:['p-biases','μπήκες με FOMO','Τι ακριβώς είδες που σε έκανε να μπεις, και ήταν μέσα στο σχέδιό σου πριν ανοίξεις το γράφημα;'],
  'Εκδίκηση':['p-biases','μπήκες για να πάρεις πίσω τα χαμένα (εκδίκηση)','Πόσο είχες χάσει πριν από αυτή τη συναλλαγή, και ποιος κανόνας θα σε σταματήσει την επόμενη φορά;'],
  'Βιαστικός':['p-checklist','ήσουν βιαστικός','Ποιο βήμα του checklist παρέλειψες, και πώς θα το κάνεις αδύνατο να το ξεχάσεις;'],
  'Κουρασμένος':['p-routine','ήσουν κουρασμένος','Ποιο θα είναι το σήμα σου ότι σήμερα δεν είσαι σε κατάσταση για trading;'],
  'Βαριεστημένος':['p-routine','μπήκες από βαρεμάρα','Τι θα κάνεις την επόμενη φορά που βαριέσαι μπροστά στο γράφημα, αντί να ανοίξεις θέση;'],
  _rules:['p-checklist','δεν τήρησες τους κανόνες σου','Ποιον κανόνα έσπασες και τι ένιωθες εκείνη τη στιγμή;']};
function mkCoach(t){if(!t||t.by!==S.uid||t.status!=='closed')return;var k=COACH[t.emotion]?t.emotion:t.rules===false?'_rules':null;if(!k)return;var c=COACH[k],res=hasR(t)?fR(t.r):fE(n(t.pnl));
  var ask='Είδα στη συναλλαγή '+(t.symbol||'')+' ('+res+') ότι '+c[1]+(k!=='_rules'&&t.rules===false?' και δεν τήρησες τους κανόνες':'')+'. Μικρό μάθημα 3 λεπτών: διάβασε [['+c[0]+']]. Μετά πες μου: '+c[2];
  try{var d=clsMe();if(d){d.mistakes=(d.mistakes||[]).concat([{at:Date.now(),sym:t.symbol,type:k,card:c[0]}]).slice(-50);clsSave(d)}}catch(e){}
  clsPop('📒 Λάθος για μάθημα: '+c[1]+' στο '+(t.symbol||'')+'. Πάτα να το δούμε μαζί (3 λεπτά).',{ask:ask})}
/* ---------- εβδομαδιαίος απολογισμός & κανόνες ---------- */
function wkKey(){var d=new Date();d.setHours(12);if(d.getDay()===1)d.setDate(d.getDate()-1);return d.getDay()===0?lday(d):null}
function wkStart(){var d=clsMe(),key=wkKey()||lday(new Date());if(d){d.wrev=key;clsSave(d)}CLS.awaitRules=key;var prev=d&&d.week&&d.week.rules||[];
  var q='Κάνε μου τον εβδομαδιαίο απολογισμό σαν προπονητής. Χρησιμοποίησε το trade_stats και list_trades για τις τελευταίες 7 μέρες (who: me) και τα demo/τεστ από το ΠΛΑΙΣΙΟ. 1) Τι πήγε καλά, 2) τα 2 μεγαλύτερα λάθη με νούμερα (ώρες, μέρες, διάθεση, κανόνες), 3) '+(prev.length?'έλεγξε αν τήρησα τους κανόνες της προηγούμενης εβδομάδας: «'+prev.join('», «')+'» (για τον καθένα: ✓ ή ✗ με στοιχεία), 4) ':'')+
    'στο ΤΕΛΟΣ γράψε ακριβώς 3 συγκεκριμένους, μετρήσιμους κανόνες για την επόμενη εβδομάδα, τον καθένα σε δική του γραμμή ως [[rule:κανόνας]].';
  QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();pAsk(q,false)}
function wkOnReply(txt){var m=[],re=/\[\[rule:([^\]]+)\]\]/g,x;while((x=re.exec(txt)))m.push(x[1].trim().slice(0,160));if(!m.length)return;var d=clsMe();if(!d)return;
  if(d.week&&d.week.rules)d.prevWeek=d.week;d.week={id:CLS.awaitRules||lday(new Date()),rules:m.slice(0,3),at:Date.now()};CLS.awaitRules=null;clsSave(d);toast('📌 Οι κανόνες της εβδομάδας αποθηκεύτηκαν στην Τάξη.')}
function wkCheck(){var d=clsMe(),key=wkKey();if(!d||!d.level||!key||d.wrev===key||CLS.wkAsked===key)return false;CLS.wkAsked=key;
  clsPop('📅 Ώρα για τον εβδομαδιαίο απολογισμό: τι πήγε καλά, τι όχι και 3 κανόνες για την επόμενη εβδομάδα. 5 λεπτά, πάμε;',{fn:wkStart});return true}

/* ================= ΠΡΟΠΟΝΗΣΗ: υπο-καρτέλες ================= */
var TRN={tab:'replay'};
function trnShow(t){TRN.tab=t;try{shbSeed()}catch(e){}$$('#trnTabs [data-trn]').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-trn')===t?'true':'false')});$$('#trainBody [data-trnp]').forEach(function(p){p.hidden=p.getAttribute('data-trnp')!==t});
  if(t==='replay')renderReplay();else if(t==='find')renderFind();else if(t==='rev')renderRev();else if(t==='map')renderSkills();renderPlan()}
/* ---------- πρόγραμμα ημέρας ---------- */
function dayPlan(){var d=prMe(),due=srDue().length,rv=((d.srDone||{})[today()]||0),rpt=((d.rp&&d.rp.days)||{})[today()]||0,fdt=((d.fd&&d.fd.days)||{})[today()]||0,c=clsMe(),les=!!(c&&clsDoneToday(c));
  return {rev:rv,revTot:Math.min(15,rv+due),due:due,lesson:les,hasClass:!!(c&&c.level),rp:rpt,rpGoal:2,fd:fdt,fdGoal:3}}
function renderPlan(){var el=$('#trnPlan');if(!el)return;var p=dayPlan(),it=function(ok,ic,txt,go){return '<button type="button" class="plit'+(ok?' ok':'')+'" data-trn="'+go+'">'+(ok?'✓':ic)+' '+txt+'</button>'};
  el.innerHTML='<b>Πρόγραμμα ημέρας</b>'+it(p.revTot&&p.rev>=p.revTot,'🔁','Επανάληψη '+p.rev+'/'+p.revTot,'rev')+(p.hasClass?'<button type="button" class="plit'+(p.lesson?' ok':'')+'" data-plclass>'+(p.lesson?'✓':'📖')+' Μάθημα Τάξης</button>':'')+it(p.rp>=p.rpGoal,'🎮','Replay '+p.rp+'/'+p.rpGoal,'replay')+it(p.fd>=p.fdGoal,'🎯','Βρες το '+Math.min(p.fd,p.fdGoal)+'/'+p.fdGoal,'find')}
/* ---------- επανάληψη με χρονοδιάγραμμα (Leitner) ---------- */
var SRIV=[1,3,7,21,45];
function srAddDays(n0){var x=new Date();x.setDate(x.getDate()+n0);return lday(x)}
function srMap(){var d=prMe();d.sr=d.sr||{};return d.sr}
function srAdd(key,b){var m=srMap();if(m[key])return false;b=b||0;m[key]={b:b,due:srAddDays(SRIV[b])};return true}
function srDue(){var m=srMap(),t=today();return Object.keys(m).filter(function(k){return m[k].due<=t}).sort(function(a,b){return m[a].due<m[b].due?-1:1})}
function srGrade(key,ok){var m=srMap(),it=m[key]||{b:0};it.b=ok?Math.min(4,it.b+1):0;it.due=srAddDays(SRIV[it.b]);m[key]=it;var d=prMe();d.srDone=d.srDone||{};d.srDone[today()]=(d.srDone[today()]||0)+1;
  var ks=Object.keys(d.srDone).sort();if(ks.length>40)ks.slice(0,ks.length-40).forEach(function(k){delete d.srDone[k]});rpSave()}
var REV={key:null,ch:null,show:false};
function srCardQ(id){for(var i=0;i<QBANK.length;i++)if(QBANK[i][1]===id)return i;return -1}
function renderRev(){var el=$('#revBody');if(!el)return;var due=srDue(),p=dayPlan(),m=srMap(),tot=Object.keys(m).length;
  var h='<div class="rvhead"><span>🔁 Για σήμερα: <b>'+due.length+'</b></span><span>Στη μνήμη σου: <b>'+tot+'</b> κάρτες & ερωτήσεις</span><span class="muted">Ξαναβγαίνουν σε 1, 3, 7, 21 και 45 μέρες. Αν το θυμάσαι, απομακρύνεται. Αν όχι, ξεκινά από την αρχή.</span></div>';
  if(!due.length){el.innerHTML=h+'<div class="prend"><b>'+(tot?'✓ Καμία επανάληψη για σήμερα!':'Δεν υπάρχει ακόμα τίποτα για επανάληψη.')+'</b><span>'+(tot?'Η επόμενη έρχεται '+(function(){var ks=Object.keys(m).sort(function(a,b){return m[a].due<m[b].due?-1:1});return ks.length?dateGr(m[ks[0]].due):'σύντομα'})()+'.':'Κάθε κάρτα που ανοίγεις στον Μπούσουλα και κάθε ερώτηση που απαντάς στην Εξάσκηση μπαίνει εδώ αυτόματα.')+'</span></div>';return}
  if(!REV.key||due.indexOf(REV.key)<0){REV.key=due[0];REV.ch=null;REV.show=false}var k=REV.key,isQ=k.indexOf('q:')===0,qid=null;
  if(isQ){var raw=k.slice(2);qid=/^\d+$/.test(raw)?+raw:raw}else{var ci=srCardQ(k.slice(2));if(ci>=0)qid=ci}
  var lvl=(m[k]||{}).b||0;h+='<div class="rvcard"><div class="row" style="justify-content:space-between;align-items:center"><span class="pill acc">'+(isQ?'Ερώτηση':'Κάρτα: '+esc((window.Manual&&Manual.title(k.slice(2)))||''))+'</span><span class="rvbox">'+[0,1,2,3,4].map(function(i){return '<i class="'+(i<=lvl?'on':'')+'"></i>'}).join('')+'</span></div>';
  if(qid!=null&&(typeof qid==='string'||QBANK[qid])){var t=qText(qid),ord=qperm(4,(String(k).length*31+qDayIdx(today()))%997);h+='<p class="qq">'+esc(t.q)+'</p><div class="qopts">'+ord.map(function(oi,pos){var c='qopt';if(REV.ch!=null){if(oi===t.a)c+=' right';else if(oi===REV.ch)c+=' wrong';else c+=' dim'}return '<button type="button" class="'+c+'" data-rvq="'+oi+'"'+(REV.ch!=null?' disabled':'')+'><span class="ql">'+'ΑΒΓΔ'.charAt(pos)+'</span><span>'+esc(t.o[oi])+'</span></button>'}).join('')+'</div>'+
      (REV.ch!=null?'<div class="qexp '+(REV.ch===t.a?'ok':'no')+'"><b>'+(REV.ch===t.a?'Το θυμάσαι! Επόμενη επανάληψη σε '+SRIV[Math.min(4,lvl+1)]+' μέρες.':'Ξεκινάει ξανά από αύριο.')+'</b> <span>'+esc(t.e)+'</span></div><div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" data-rvnext>Επόμενη</button></div>':'')}
  else{var cid=k.slice(2);h+='<p class="qq">Θυμάσαι τι λέει η κάρτα «'+esc((window.Manual&&Manual.title(cid))||cid)+'»; Πες το στον εαυτό σου σε μία πρόταση, μετά άνοιξέ τη και έλεγξε.</p><div class="row" style="gap:.4rem;flex-wrap:wrap"><button class="btn" type="button" data-ref="'+esc(cid)+'">📖 Άνοιξε την κάρτα</button><button class="btn rpl" type="button" data-rvself="1">✓ Το θυμόμουν</button><button class="btn rps" type="button" data-rvself="0">✗ Δεν το θυμόμουν</button></div>'}
  el.innerHTML=h+'</div>'}
/* ---------- Βρες το στο γράφημα ---------- */
var FDT={eng:['Engulfing','engulfing','Πάτα ένα κερί engulfing (το σώμα του καλύπτει όλο το σώμα του προηγούμενου, αντίθετου χρώματος).'],ham:['Σφυρί','hammer','Πάτα ένα σφυρί: μικρό σώμα πάνω, κάτω σκιά τουλάχιστον διπλάσια του σώματος, μετά από πτώση.'],
  ss:['Πεφταστέρι','shootingstar','Πάτα ένα πεφταστέρι: μικρό σώμα κάτω, πάνω σκιά τουλάχιστον διπλάσια, μετά από άνοδο.'],doji:['Doji','doji','Πάτα ένα doji: σώμα σχεδόν μηδενικό σε σχέση με το εύρος του κεριού.'],ib:['Inside bar','insidebar','Πάτα ένα inside bar: όλο το κερί μέσα στο εύρος του προηγούμενου.'],
  sup:['Στήριξη','sr','Κάνε κλικ στο ύψος μιας στήριξης που δοκιμάστηκε τουλάχιστον 2 φορές (κάτω από την τιμή).'],res:['Αντίσταση','sr','Κάνε κλικ στο ύψος μιας αντίστασης που δοκιμάστηκε τουλάχιστον 2 φορές (πάνω από την τιμή).'],
  bos:['BOS','smc-structure','Πάτα το κερί που έκανε BOS: το πρώτο κλείσιμο πέρα από το προηγούμενο swing υψηλό ή χαμηλό.'],st:['Δομή','structure','Τι δομή έχει η αγορά στο τελευταίο κομμάτι; Κοίτα τα swing υψηλά και χαμηλά.']};
var FD={busy:false,msg:'',bars:null,type:null,ans:null,user:null,done:false,ok:null};
function fdStats(){var d=prMe();d.fd=d.fd||{n:0,ok:0,pts:0,t:{},cards:{},days:{}};['t','cards','days'].forEach(function(k){d.fd[k]=d.fd[k]||{}});return d.fd}
function fdBody(b){return Math.abs(b.c-b.o)}
function fdFind(type,B,atr){var out=[],i,k=function(j){return B[j]};
  if(type==='eng'||type==='ham'||type==='ss'||type==='doji'||type==='ib'){for(i=4;i<B.length;i++){var b=B[i],p=B[i-1],rg=b.h-b.l,bd=fdBody(b),up=b.h-Math.max(b.o,b.c),lo=Math.min(b.o,b.c)-b.l;
      if(type==='eng'&&((p.c<p.o&&b.c>b.o&&b.c>=p.o&&b.o<=p.c)||(p.c>p.o&&b.c<b.o&&b.c<=p.o&&b.o>=p.c))&&bd>fdBody(p)*1.05&&bd>0.35*atr)out.push(i);
      if(type==='ham'&&lo>=2*bd&&up<=0.6*bd+0.1*rg&&rg>0.6*atr&&B[i-4].c>B[i-1].c)out.push(i);
      if(type==='ss'&&up>=2*bd&&lo<=0.6*bd+0.1*rg&&rg>0.6*atr&&B[i-4].c<B[i-1].c)out.push(i);
      if(type==='doji'&&bd<=0.08*rg&&rg>0.5*atr)out.push(i);
      if(type==='ib'&&b.h<p.h&&b.l>p.l&&(p.h-p.l)>0.8*atr)out.push(i)}return out}
  var piv=fdPivots(B);
  if(type==='sup'||type==='res'){var last=B[B.length-1].c,pts=(type==='sup'?piv.lo:piv.hi).map(function(j){return type==='sup'?B[j].l:B[j].h}).filter(function(v){return type==='sup'?v<last:v>last}),lv=[];
    pts.forEach(function(v){var c=lv.find(function(x){return Math.abs(x.v-v)<=0.6*atr});if(c){c.n++;c.v=(c.v*(c.n-1)+v)/c.n}else lv.push({v:v,n:1})});return lv.filter(function(x){return x.n>=2}).map(function(x){return x.v})}
  if(type==='bos'){var res2=[];piv.hi.forEach(function(j){for(var q=j+3;q<B.length;q++){if(B[q].c>B[j].h){res2.push({i:q,lv:B[j].h,d:1});break}}});piv.lo.forEach(function(j){for(var q=j+3;q<B.length;q++){if(B[q].c<B[j].l){res2.push({i:q,lv:B[j].l,d:-1});break}}});
    var seen={};return res2.filter(function(x){if(seen[x.i])return false;seen[x.i]=1;return true})}
  if(type==='st'){var H=piv.hi.slice(-2),L=piv.lo.slice(-2);if(H.length<2||L.length<2)return null;var hh=B[H[1]].h>B[H[0]].h,hl=B[L[1]].l>B[L[0]].l,mv=B[B.length-1].c-B[Math.min(H[0],L[0])].c;
    if(hh&&hl&&mv>atr)return 'up';if(!hh&&!hl&&mv<-atr)return 'down';return 'range'}
  return out}
function fdPivots(B){var hi=[],lo=[];for(var i=2;i<B.length-2;i++){var b=B[i];if(b.h>B[i-1].h&&b.h>B[i-2].h&&b.h>=B[i+1].h&&b.h>=B[i+2].h)hi.push(i);if(b.l<B[i-1].l&&b.l<B[i-2].l&&b.l<=B[i+1].l&&b.l<=B[i+2].l)lo.push(i)}return {hi:hi,lo:lo}}
function fdNew(type0){if(FD.busy)return;if(!CG.mcp&&!S.db){FD.msg='Οι ασκήσεις χρειάζονται τα κεριά του Crypto.com (ανοίξτε τη σελίδα από το claude.ai).';renderFind();return}
  if(!CG.mcp&&!SHB.idx){FD.busy=true;FD.msg='Φέρνω τα κοινά κεριά της παρέας…';renderFind();shbLoadIdx().then(function(){FD.busy=false;fdNew(type0)});return}
  if(!CG.mcp&&!shbPick(null,null,40)){FD.msg=ccErrText({code:'no_shared'});renderFind();return}
  var sel=type0||$('#fd-type').value,types=Object.keys(FDT);FD.busy=true;FD.msg='Ψάχνω κατάλληλο κομμάτι γραφήματος…';FD.bars=null;renderFind();var tries=0;
  var attempt=function(){tries++;var type=sel&&sel!=='any'?sel:types[Math.floor(Math.random()*types.length)],coin=RPCOINS[Math.floor(Math.random()*RPCOINS.length)],tf=['15m','1h','4h','1D'][Math.floor(Math.random()*4)];if(!CG.mcp){var pk=shbPick(null,null,40);coin=pk.coin;tf=pk.tf}
    return ccFetchBars(coin+'USDT',tf).then(function(r){var all=r.bars.filter(function(x){return !x.approx}),W=Math.min(60,Math.max(40,all.length));if(all.length<W)throw 0;var starts=[];for(var s0=0;s0<=all.length-W;s0+=3)starts.push(s0);starts.sort(function(){return Math.random()-0.5});
      for(var z=0;z<starts.length;z++){var B=all.slice(starts[z],starts[z]+W),atr=rpATR(B),a=fdFind(type,B,atr);
        if(type==='st'){if(a==='up'||a==='down'){FD.ans=a;FD.atr=atr;FD.bars=B;FD.type=type;FD.coin=coin;FD.tf=tf;return true}continue}
        if(a&&a.length>=1&&a.length<=(type==='bos'?4:5)){FD.ans=a;FD.atr=atr;FD.bars=B;FD.type=type;FD.coin=coin;FD.tf=tf;return true}}
      throw 0}).catch(function(e){if(tries<12)return attempt();throw e})};
  attempt().then(function(){FD.user=null;FD.done=false;FD.ok=null;FD.msg=''}).catch(function(e){FD.msg=e&&e.code?ccErrText(e):'Δεν βρήκα κατάλληλο γράφημα αυτή τη φορά. Πάτα ξανά «Νέα άσκηση».'}).then(function(){FD.busy=false;renderFind()})}
function fdGrade(){var t=FD.type,ok=false,u=FD.user;
  if(t==='sup'||t==='res')ok=FD.ans.some(function(v){return Math.abs(v-u)<=0.6*FD.atr});
  else if(t==='bos')ok=FD.ans.some(function(x){return Math.abs(x.i-u)<=1});
  else if(t==='st')ok=u===FD.ans;
  else ok=FD.ans.indexOf(u)>=0;
  FD.ok=ok;FD.done=true;var st=fdStats(),tt=st.t[t]=st.t[t]||[0,0];tt[1]++;st.n++;if(ok){tt[0]++;st.ok++;st.pts+=5;var cid=FDT[t][1];st.cards[cid]=(st.cards[cid]||0)+1;profMood('cheer')}else profMood('sad');st.days[today()]=(st.days[today()]||0)+1;
  var ks=Object.keys(st.days).sort();if(ks.length>40)ks.slice(0,ks.length-40).forEach(function(k){delete st.days[k]});rpSave();renderFind();renderPlan()}
function fdDraw(){var cv=$('#fdCv');if(!cv)return;if(!FD.bars){cv.style.height='0px';return}var B=FD.bars,marks={},L=[];
  if(FD.done&&['eng','ham','ss','doji','ib'].indexOf(FD.type)>=0)FD.ans.forEach(function(i){marks[i]='rgba(250,204,21,.22)'});if(FD.done&&FD.type==='bos')FD.ans.forEach(function(x){marks[x.i]='rgba(250,204,21,.22)'});
  if(typeof FD.user==='number'&&FD.type!=='sup'&&FD.type!=='res')marks[FD.user]=FD.done?(FD.ok?'rgba(38,166,154,.3)':'rgba(239,83,80,.3)'):'rgba(41,98,255,.25)';
  if(FD.done&&(FD.type==='sup'||FD.type==='res'))FD.ans.forEach(function(v){L.push({v:v,col:'#facc15',w:2,dash:[6,4]})});
  if(typeof FD.user==='number'&&(FD.type==='sup'||FD.type==='res'))L.push({v:FD.user,col:FD.done?(FD.ok?'#26a69a':'#ef5350'):'#2962ff',w:2,dash:[]});
  var g=tcDraw(cv,{bars:B,tf:FD.tf,marks:marks,lines:L,after:function(c,X,Y){if(FD.done&&FD.type==='bos')FD.ans.forEach(function(x){c.strokeStyle=x.d>0?'#26a69a':'#ef5350';c.setLineDash([4,3]);c.beginPath();c.moveTo(X(Math.max(0,x.i-8)),Y(x.lv));c.lineTo(X(x.i),Y(x.lv));c.stroke();c.setLineDash([]);c.fillStyle=c.strokeStyle;c.fillText('BOS',X(x.i)-10,Y(x.lv)-4)});
    if(FD.done&&FD.type==='st'){var pv=fdPivots(B);c.fillStyle='#facc15';pv.hi.forEach(function(i){c.fillText('▼',X(i)-4,Y(B[i].h)-3)});pv.lo.forEach(function(i){c.fillText('▲',X(i)-4,Y(B[i].l)+12)})}}});
  cv._geo=g;if(g)FD.geo={pl:g.pl,bw:g.bw,N:g.N,inv:g.inv}}

function renderFind(){var el=$('#fdCtl');if(!el)return;var st=fdStats();
  $('#fdStats').innerHTML='<span><b>🎯 '+st.n+'</b><i>ασκήσεις</i></span><span><b>'+(st.n?Math.round(st.ok/st.n*100):0)+'%</b><i>σωστές</i></span><span><b>⭐ '+st.pts+'</b><i>πόντοι</i></span><span><b>'+Object.keys(st.cards).length+'</b><i>θέματα με επιτυχία</i></span>';
  var h='';if(FD.msg)h+='<p class="muted">'+esc(FD.msg)+'</p>';
  if(!FD.bars){if(!FD.busy)h+='<p>Διάλεξε τι θέλεις να εξασκήσεις και πάτα <b>«Νέα άσκηση»</b>. Παίρνω πραγματικό γράφημα και σε ρωτάω να βρεις κάτι πάνω του.</p>';el.innerHTML=h;$('#fdTog').innerHTML='';$('#fdInfo').innerHTML='';$('#fdCv').style.height='0px';return}
  var T=FDT[FD.type];h+='<p class="rpinfo"><span class="pill acc">'+esc(T[0])+'</span> <b>'+symIcon(FD.coin,16)+' '+esc(FD.coin)+'USDT · '+esc(FD.tf)+'</b> <button type="button" class="linkbtn" data-ref="'+esc(T[1])+'">📖 Θεωρία</button></p><p class="fdq">'+esc(T[2])+'</p>';
  if(FD.type==='st'&&!FD.done)h+='<div class="rpbtns"><button type="button" class="btn rpl" data-fdst="up">📈 Ανοδική (HH/HL)</button><button type="button" class="btn rps" data-fdst="down">📉 Πτωτική (LH/LL)</button><button type="button" class="btn" data-fdst="range">↔ Πλάγια</button></div>';
  else if(!FD.done)h+='<p class="muted" style="font-size:.82rem">'+(FD.user==null?'Κάνε κλικ στο γράφημα.':'Επέλεξες. Άλλαξε με νέο κλικ ή πάτα «Έλεγχος».')+'</p><div class="rpbtns"><button type="button" class="btn primary" id="fdCheck"'+(FD.user==null?' disabled':'')+'>Έλεγχος</button></div>';
  else{var why={eng:'Με κίτρινο όλα τα engulfing του γραφήματος.',ham:'Με κίτρινο τα σφυριά: η μακριά κάτω σκιά δείχνει απόρριψη χαμηλών.',ss:'Με κίτρινο τα πεφταστέρια: η μακριά πάνω σκιά δείχνει απόρριψη υψηλών.',doji:'Με κίτρινο τα doji: ισορροπία αγοραστών και πωλητών.',ib:'Με κίτρινο τα inside bars: συμπίεση πριν από κίνηση.',sup:'Με κίτρινη γραμμή οι στηρίξεις με 2+ αγγίγματα.',res:'Με κίτρινη γραμμή οι αντιστάσεις με 2+ αγγίγματα.',bos:'Με κίτρινο τα κεριά BOS και η γραμμή του swing που έσπασε.',st:'Τα ▼ είναι swing υψηλά και τα ▲ swing χαμηλά. Η δομή ήταν '+(FD.ans==='up'?'ανοδική (ψηλότερα υψηλά και χαμηλά)':'πτωτική (χαμηλότερα υψηλά και χαμηλά)')+'.'}[FD.type];
    h+='<div class="rpres '+(FD.ok?'ok':'no')+'"><b>'+(FD.ok?'✓ Σωστά! +5 πόντοι':'✗ Όχι αυτή τη φορά')+'</b><span>'+esc(why)+'</span></div><div class="rpbtns"><button type="button" class="btn primary" id="fdNext">Επόμενη άσκηση →</button></div>'}
  el.innerHTML=h;$('#fdTog').innerHTML=FD.bars?tcToggles():'';$('#fdInfo').innerHTML=FD.bars&&FD.done?tcInfo(FD.bars,FD.tf,null):'';fdDraw()}
/* ---------- Χάρτης δεξιοτήτων ---------- */
var SK={who:null,open:{}};
function skUserDoc(uid){if(uid===S.uid)return prMe();return (S.prac||{})[prId(uid)]||{}}
function skOf(uid){var d=skUserDoc(uid),reads=d.reads||{},seen=d.seen||{},fdc=(d.fd&&d.fd.cards)||{},quizOk={},prac={};
  QBANK.forEach(function(q,i){if(q[1]&&seen[i]===1)quizOk[q[1]]=1});(S.quiz||[]).filter(function(x){return x.by===uid}).forEach(function(x){(x.ans||[]).forEach(function(a){if(a.ok&&QBANK[a.i]&&QBANK[a.i][1])quizOk[QBANK[a.i][1]]=1})});
  Object.keys(fdc).forEach(function(k){prac[k]=1});(S.demo||[]).filter(function(t){return t.by===uid}).forEach(function(t){if(t.tech)prac[t.tech]=1;var id=t.title&&window.Manual&&Manual.idByName(t.title);if(id)prac[id]=1});
  S.trades.filter(function(t){return t.by===uid&&t.strategyId}).forEach(function(t){var s=S.strategies.find(function(x){return x.id===t.strategyId});var id=s&&manualIdFor(s);if(id)prac[id]=1});
  return {r:reads,q:quizOk,p:prac}}
function skSummary(uid){var E2=(window.Manual?Manual.all():[]).filter(function(e){return e.c!=='glo'}),k=skOf(uid),n=E2.length,r=0,q=0,p=0;E2.forEach(function(e){if(k.r[e.id])r++;if(k.q[e.id])q++;if(k.p[e.id])p++});return {n:n,r:r,q:q,p:p,score:n?Math.round((r+q+p)/(3*n)*100):0}}
function skNext(uid){var E2=(window.Manual?Manual.all():[]).filter(function(e){return e.c!=='glo'}).sort(function(a,b){return (a.lv||1)-(b.lv||1)}),k=skOf(uid),out=[];
  E2.forEach(function(e){if(out.length>=3)return;if(k.r[e.id]&&!k.q[e.id]&&srCardQ(e.id)>=0)out.push({id:e.id,why:'διάβασες, απάντησε σε ερώτηση'})});
  E2.forEach(function(e){if(out.length>=4)return;if(k.r[e.id]&&k.q[e.id]&&!k.p[e.id]&&(TRYMAP[e.id]||e.r))out.push({id:e.id,why:'ξέρεις τη θεωρία, κάν\'το στην πράξη'})});
  E2.forEach(function(e){if(out.length>=5)return;if(!k.r[e.id]&&(e.lv||1)===1)out.push({id:e.id,why:'βασικό, δεν το έχεις διαβάσει'})});return out.slice(0,5)}
function renderSkills(){var el=$('#skBody');if(!el||!window.Manual)return;var us=qUsers().filter(function(u){return u&&u!=='me'||!S.db});if(!SK.who||us.indexOf(SK.who)<0)SK.who=S.uid;
  var cats=Manual.cats().filter(function(c){return c.id!=='glo'}),E2=Manual.all(),k=skOf(SK.who),me=skSummary(SK.who);
  var h='<div class="row" style="justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap"><label class="row" style="gap:.4rem;align-items:center">Χάρτης του <select id="sk-who" class="dmsel">'+us.map(function(u){return '<option value="'+esc(u)+'"'+(u===SK.who?' selected':'')+'>'+esc(u===S.uid?'Εμένα':name(u))+'</option>'}).join('')+'</select></label><span class="sklegend">📖 διάβασα · ✅ απάντησα σωστά · 🎮 το έκανα στην πράξη</span></div>';
  h+='<div class="skcmp">'+us.map(function(u){var s=skSummary(u);return '<div class="'+(u===SK.who?'on':'')+'"><b>'+esc(u===S.uid?'Εγώ':name(u))+'</b><div class="meter"><i style="width:'+s.score+'%"></i></div><span>'+s.score+'% · 📖 '+s.r+' ✅ '+s.q+' 🎮 '+s.p+' / '+s.n+'</span></div>'}).join('')+'</div>';
  if(SK.who===S.uid){var nx=skNext(S.uid);if(nx.length)h+='<div class="sknext"><b>🧑‍🏫 Ο Καθηγητής προτείνει:</b>'+nx.map(function(x){return '<button type="button" class="chip" data-ref="'+esc(x.id)+'">'+esc(Manual.title(x.id))+' <i>· '+esc(x.why)+'</i></button>'}).join('')+'</div>'}
  h+='<div class="skcats">'+cats.map(function(c){var L=E2.filter(function(e){return e.c===c.id});if(!L.length)return '';var r=0,q=0,p=0;L.forEach(function(e){if(k.r[e.id])r++;if(k.q[e.id])q++;if(k.p[e.id])p++});var pc=Math.round((r+q+p)/(3*L.length)*100);
    return '<details class="skcat"'+(SK.open[c.id]?' open':'')+' data-skc="'+c.id+'"><summary><span class="skt">'+esc(c.t)+'</span><span class="skn">📖 '+r+' · ✅ '+q+' · 🎮 '+p+' / '+L.length+'</span><span class="skbar"><i style="width:'+pc+'%"></i></span><b>'+pc+'%</b></summary><div class="skgrid">'+
      L.map(function(e){return '<button type="button" class="skcard" data-ref="'+esc(e.id)+'" title="'+esc(e.t)+'"><span class="skd">'+(k.r[e.id]?'📖':'<i>○</i>')+(k.q[e.id]?'✅':'<i>○</i>')+(k.p[e.id]?'🎮':'<i>○</i>')+'</span><span>'+esc(e.t)+'</span>'+(SK.who===S.uid&&(TRYMAP[e.id]||e.r)?'<span class="sktry" data-try="'+esc(e.id)+'">🎯</span>':'')+'</button>'}).join('')+'</div></details>'}).join('')+'</div>';
  el.innerHTML=h}
/* ---------- Δοκίμασέ το ---------- */
var TRYMAP={engulfing:'eng',bearengulf:'eng',hammer:'ham',invhammer:'ham',shootingstar:'ss',doji:'doji',insidebar:'ib',sr:'sup',structure:'st','smc-structure':'bos',candle:'any',trendline:'st'};
function tryCard(id){var e=window.Manual&&Manual.entry(id);showTab('train');if(TRYMAP[id]){trnShow('find');if($('#fd-type'))$('#fd-type').value=TRYMAP[id]==='any'?'any':TRYMAP[id];fdNew(TRYMAP[id]==='any'?null:TRYMAP[id])}else{trnShow('replay');if(e)toast('Παίξε replay και εφάρμοσε τους κανόνες της «'+e.t+'».')}window.scrollTo(0,0)}
function trnRead(id){var d=prMe();d.reads=d.reads||{};var isNew=!d.reads[id];if(isNew)d.reads[id]=Date.now();var add=srAdd('c:'+id);if(isNew||add){clearTimeout(TRN.st);TRN.st=setTimeout(rpSave,1500)}}
function tcRedrawAll(){if(TRN.tab==='replay')renderReplay();else if(TRN.tab==='find')renderFind()}
function bindTrain(){
  tcBind($('#rpCv'),rpDraw);tcBind($('#fdCv'),fdDraw);
  $('#trainBody').addEventListener('click',function(e){var t=e.target.closest('[data-tci]');if(t){var k=t.getAttribute('data-tci');TCI[k]=!TCI[k];try{localStorage.setItem('tj-tci',JSON.stringify(TCI))}catch(x){}tcRedrawAll();return}if(e.target.closest('[data-tcfs]')){var cd=e.target.closest('.card');cd.classList.toggle('tcfs');document.body.classList.toggle('tcfs-on',cd.classList.contains('tcfs'));setTimeout(tcRedrawAll,30);return}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var f=document.querySelector('.card.tcfs');if(f){f.classList.remove('tcfs');document.body.classList.remove('tcfs-on');setTimeout(tcRedrawAll,30)}}});
  $('#trnTabs').addEventListener('click',function(e){var b=e.target.closest('[data-trn]');if(b)trnShow(b.getAttribute('data-trn'))});
  $('#trnPlan').addEventListener('click',function(e){var b=e.target.closest('[data-trn]');if(b){trnShow(b.getAttribute('data-trn'));return}if(e.target.closest('[data-plclass]')){QZ.tab='class';profOpen(true)}});
  $('#fdCard').addEventListener('click',function(e){var t=e.target;if(t.closest('#fdNew')||t.closest('#fdNext')){fdNew();return}if(t.closest('#fdCheck')){fdGrade();return}var s=t.closest('[data-fdst]');if(s&&!FD.done){FD.user=s.getAttribute('data-fdst');fdGrade();return}
    if(t.id==='fdCv'&&FD.bars&&!FD.done&&FD.type!=='st'&&FD.geo){var r=t.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(FD.type==='sup'||FD.type==='res')FD.user=FD.geo.inv(y);else FD.user=Math.max(0,Math.min(FD.geo.N-1,Math.floor((x-FD.geo.pl)/FD.geo.bw)));renderFind()}});
  $('#revBody').addEventListener('click',function(e){var t=e.target,q=t.closest('[data-rvq]');if(q&&REV.ch==null){REV.ch=+q.getAttribute('data-rvq');var k=REV.key,isQ=k.indexOf('q:')===0,raw=k.slice(2),qid=isQ?(/^\d+$/.test(raw)?+raw:raw):srCardQ(raw);var ok=REV.ch===qText(qid).a;srGrade(k,ok);profMood(ok?'cheer':'sad');renderRev();renderPlan();return}
    if(t.closest('[data-rvnext]')){REV.key=null;renderRev();return}var sf=t.closest('[data-rvself]');if(sf){srGrade(REV.key,sf.getAttribute('data-rvself')==='1');REV.key=null;renderRev();renderPlan()}});
  $('#skBody').addEventListener('click',function(e){var tr=e.target.closest('[data-try]');if(tr){e.stopPropagation();e.preventDefault();tryCard(tr.getAttribute('data-try'));return}});
  $('#skBody').addEventListener('toggle',function(e){var d=e.target.closest&&e.target.closest('[data-skc]');if(d)SK.open[d.getAttribute('data-skc')]=d.open},true);
  $('#skBody').addEventListener('change',function(e){if(e.target.id==='sk-who'){SK.who=e.target.value;renderSkills()}});
  document.addEventListener('click',function(e){var tr=e.target.closest('#manual [data-try]');if(tr){e.preventDefault();tryCard(tr.getAttribute('data-try'))}});
  window.addEventListener('manual:read',function(e){try{trnRead(e.detail)}catch(x){}});
  setTimeout(function(){var h=(location.hash||'').slice(1);if(h&&window.Manual&&Manual.entry(h))try{trnRead(h)}catch(x){}},3000);
  var ft=$('#fd-type');ft.innerHTML='<option value="any">Τυχαίο θέμα</option>'+Object.keys(FDT).map(function(k){return '<option value="'+k+'">'+esc(FDT[k][0])+'</option>'}).join('');
  window.addEventListener('resize',function(){if(TRN.tab==='find'&&!$('section[data-panel="train"]').hidden)fdDraw()})}

/* ================= Προτάσεις του Καθηγητή (ιστορικό) ================= */
var PP={f:'all'};
function ppFromTech(t,id,at,by){return {by:by||S.uid||'me',at:at||Date.now(),date:lday(new Date(at||Date.now())),time:(function(d){return pad2(d.getHours())+':'+pad2(d.getMinutes())})(new Date(at||Date.now())),tech:t.tech||t.id||'',title:t.title||'',market:t.market||'',dir:t.dir||null,entry:t.entry!=null?n(t.entry):null,stop:t.stop!=null?n(t.stop):null,target:t.target!=null?n(t.target):null,why:(t.why||'').slice(0,300),bad:t.bad||techCheck({entry:t.entry==null?null:n(t.entry),stop:t.stop==null?null:n(t.stop),target:t.target==null?null:n(t.target),dir:t.dir})||''}}
function ppSaveMsg(m){if(!m||m.role!=='assistant'||!S.uid)return;var items=techParse(m.content);if(!items.length)return;var mk=msgKey(m),at=m.at||Date.now();
  items.forEach(function(t,i){var id=cfDocId(mk,i);if((S.props||[]).some(function(p){return p.id===id}))return;var d=ppFromTech(t,id,at);S.props=(S.props||[]).concat([Object.assign({id:id},d)]);put('props',id,d).catch(function(){})})}
function ppBackfill(){if(!S.uid||!qCanSave())return;(PCH.msgs||[]).forEach(function(m){try{ppSaveMsg(m)}catch(e){}});
  (S.confirms||[]).filter(function(c){return c.by===S.uid}).forEach(function(c){if((S.props||[]).some(function(p){return p.id===c.id}))return;var d=ppFromTech({tech:c.tech,title:c.title,market:c.market,dir:c.dir,entry:c.entry,stop:c.stop,target:c.target,why:c.why},c.id,c.at);d.bad='';S.props=(S.props||[]).concat([Object.assign({id:c.id},d)]);put('props',c.id,d).catch(function(){})})}
function ppSym(p){var s=dmSym(p.market);if(CGID[s])s+='USDT';return s}
function ppDemo(p){return (S.demo||[]).filter(function(t){return t.cfId===p.id}).sort(function(a,b){return (b.at||0)-(a.at||0)})[0]||null}
function ppConf(p){return (S.confirms||[]).find(function(c){return c.id===p.id})}
function ppPnl(p,res){var e=n(p.entry),s=n(p.stop),tg=n(p.target),N=DMDEF.amt*DMDEF.lev;if(!(e>0))return NaN;if(res==='win')return N*Math.abs(tg-e)/e;if(res==='loss')return -N*Math.abs(e-s)/e;return 0}
function ppSaveEval(p,x){var d=dmClean(p),ch=false;
  if(x.status==='win'||x.status==='loss'){d.res=x.status;d.r=dmR2(x.r);d.exitAt=x.exitAt||null;d.filledAt=x.filledAt||null;ch=true}
  else if(x.status==='expired'){d.res=x.nofill?'nofill':(x.r>0?'win':'loss');d.r=dmR2(x.r||0);d.exitAt=x.exitAt||null;ch=true}
  else if(x.status==='open'&&x.filledAt&&!p.filledAt){d.filledAt=x.filledAt;d.res='running';ch=true}
  if(ch){Object.assign(p,d);put('props',p.id,d).catch(function(){})}}
function ppStatus(p){var dm=ppDemo(p),res=p.res||null,played=!!dm,dres=dm?(dm.status==='win'||dm.status==='loss'?dm.status:dm.status==='expired'?(dm.nofill?'nofill':(n(dm.r)>0?'win':'loss')):dm.status==='closed'?(n(dm.r)>0?'win':'loss'):dmIsPend(dm)?'pending':'running'):null;
  var cfo=ppConf(p);if(!played&&(!res||res==='running')&&cfo&&(cfo.outcome==='win'||cfo.outcome==='loss'))res=cfo.outcome;if(!played&&!res&&cfo&&cfo.outcome==='skip')res='nofill';
  var final=played?dres:res,pnl=played&&isFinite(n(dm.pnl))&&(dres==='win'||dres==='loss'||dm.status==='closed')?n(dm.pnl):(final==='win'||final==='loss'?ppPnl(p,final):NaN);
  return {dm:dm,played:played,res:final,pnl:pnl,conf:!!ppConf(p),open:!final||final==='pending'||final==='running'}}
function renderProps(){var body=$('#profBody');if(!body)return;var L=(S.props||[]).filter(function(p){return p.by===S.uid}).sort(function(a,b){return (b.at||0)-(a.at||0)});
  var St=L.map(function(p){return {p:p,s:ppStatus(p)}}),hit=St.filter(function(x){return x.s.res==='win'}).length,miss=St.filter(function(x){return x.s.res==='loss'}).length,pl=St.filter(function(x){return x.s.played}).length,tot=sum(St.map(function(x){return isFinite(x.s.pnl)?x.s.pnl:0})),act=sum(St.filter(function(x){return x.s.played}).map(function(x){return isFinite(x.s.pnl)?x.s.pnl:0}));
  var h='<div class="pphead"><span><b>'+L.length+'</b><i>προτάσεις</i></span><span><b class="pos">'+hit+'</b><i>έπεσαν μέσα</i></span><span><b class="neg">'+miss+'</b><i>αστόχησαν</i></span><span><b>'+(hit+miss?Math.round(hit/(hit+miss)*100):0)+'%</b><i>επιτυχία</i></span><span><b>'+pl+'</b><i>έπαιξα</i></span><span><b class="'+cls(tot)+'">'+(tot>0?'+':'')+fmt(tot,0)+' €</b><i>αν τις έπαιζα όλες</i></span><span><b class="'+cls(act)+'">'+(act>0?'+':'')+fmt(act,0)+' €</b><i>όσες έπαιξα</i></span></div>'+
    '<p class="muted" style="font-size:.76rem;margin:.2rem 0 .5rem">Υπολογισμός με '+fmt(DMDEF.amt,0)+' € × '+DMDEF.lev+'x ανά πρόταση. «Έπεσε μέσα» μόνο αν η τιμή έπιασε την είσοδο και μετά τον στόχο. Ελέγχεται αυτόματα με κεριά Crypto.com.</p>'+
    '<div class="ppf">'+[['all','Όλες'],['open','Ανοιχτές'],['played','Έπαιξα'],['notplayed','Δεν έπαιξα'],['win','Έπεσαν μέσα'],['loss','Αστόχησαν']].map(function(f){return '<button type="button" class="chip'+(PP.f===f[0]?' on':'')+'" data-ppf="'+f[0]+'">'+f[1]+'</button>'}).join('')+'</div>';
  var F=St.filter(function(x){var f=PP.f;return f==='all'||(f==='open'&&x.s.open)||(f==='played'&&x.s.played)||(f==='notplayed'&&!x.s.played)||(f==='win'&&x.s.res==='win')||(f==='loss'&&x.s.res==='loss')});
  if(!L.length)h+='<div class="prend"><b>Δεν υπάρχουν ακόμα προτάσεις.</b><span>Ζήτα από τον Καθηγητή τεχνικές στο «Ρώτα με» και θα εμφανίζονται εδώ με αποτελέσματα.</span><button type="button" class="btn small primary" data-ppask>Ζήτα 3-4 τεχνικές</button></div>';
  var lastD='';F.slice(0,80).forEach(function(x){var p=x.p,s=x.s,sym=ppSym(p),b=sym.replace(/USDT$/,'');if(p.date!==lastD){lastD=p.date;h+='<div class="ppdate">'+esc(dateGr(p.date))+'</div>'}
    var rs=s.res==='win'?'<span class="pill gain">✓ Έπεσε μέσα</span>':s.res==='loss'?'<span class="pill loss">✗ Αστόχησε</span>':s.res==='nofill'?'<span class="pill">— Δεν ενεργοποιήθηκε</span>':s.res==='running'?'<span class="pill dmrun"><i></i>Τρέχει</span>':s.res==='pending'?'<span class="pill dmpend">⏳ Σε αναμονή</span>':p.bad?'<span class="pill">— Άκυρη πρόταση</span>':'<span class="pill dmpend">⏳ Αναμένει είσοδο</span>';
    var canPlay=!s.played&&!p.bad&&!s.res&&p.dir&&isFinite(n(p.entry))&&isFinite(n(p.stop))&&isFinite(n(p.target));
    h+='<div class="ppcard '+(s.res==='win'?'win':s.res==='loss'?'loss':'')+'"><div class="pptop"><span class="muted num">'+esc(p.time||'')+'</span>'+symIcon(b,16)+'<b>'+esc(sym||p.market||'–')+'</b>'+(sym?'<a class="tvl" href="'+esc(exUrl('tv',sym))+'" target="_blank" rel="noopener noreferrer">TV</a>':'')+(p.dir?'<span class="pill '+(p.dir==='short'?'loss':'gain')+'">'+(p.dir==='short'?'Short':'Long')+'</span>':'')+'<span class="pptitle">'+(p.tech?'<button type="button" class="linkbtn" data-ref="'+esc(p.tech)+'">'+esc(p.title)+'</button>':esc(p.title))+'</span></div>'+
      '<div class="pplv"><span>Είσοδος <b class="num">'+dmPx(n(p.entry))+'</b></span><span>Stop <b class="num">'+dmPx(n(p.stop))+'</b></span><span>Στόχος <b class="num">'+dmPx(n(p.target))+'</b></span></div>'+
      '<div class="ppst">'+rs+(s.conf?'<span class="pill acc">Επιβεβαίωσα</span>':'')+(s.played?'<span class="pill acc">🎮 Έπαιξα στο demo</span>':'<span class="pill">Δεν την έπαιξα</span>')+(isFinite(s.pnl)?'<b class="num '+cls(s.pnl)+'">'+(s.pnl>0?'+':'')+fmt(s.pnl,2)+' €</b>'+(s.played?'':'<i class="muted" style="font-size:.72rem">αν την έπαιζα</i>'):'')+
      (canPlay?'<button type="button" class="btn small primary" data-ppplay="'+esc(p.id)+'">▶ Παίξε τώρα</button>':'')+(s.played?'<button type="button" class="linkbtn" data-ppdemo>Δες στο demo</button>':'')+'</div>'+(p.why?'<p class="ppwhy">'+esc(p.why)+'</p>':'')+'</div>'});
  if(F.length>80)h+='<p class="muted">Εμφανίζονται οι 80 πιο πρόσφατες.</p>';
  body.innerHTML='<div class="ppwrap">'+h+'</div>'}
function ppPlay(id){var p=(S.props||[]).find(function(x){return x.id===id});if(!p)return;var sy=ppSym(p),act=dmOf('prof').filter(function(t){return !dmClosed(t)&&dmSym(t.symbol)===sy});
  profOpen(false);showTab('demo');dmReset();dmTechOpts();var cf=ppConf(p);if(cf){$('#dm-tech').value='cf:'+cf.id;$('#dm-prof').hidden=false}
  dmPrefill({market:p.market,dir:p.dir,entry:p.entry,stop:p.stop,target:p.target,why:p.why});PP.pending=id;
  setTimeout(function(){$('#dmForm').scrollIntoView({block:'start',behavior:'smooth'})},60);toast('Άνοιξε στο demo με '+fmt(DMDEF.amt,0)+' € × '+DMDEF.lev+'x. Πάτα «Άνοιξε demo συναλλαγή».')}

/* ================= Κοινό γράφημα Προπόνησης ================= */
var TCI={ema20:true,ema50:true,bb:false,vol:true,rsi:false};try{var _ti=JSON.parse(localStorage.getItem('tj-tci')||'null');if(_ti)TCI=Object.assign(TCI,_ti)}catch(e){}
var TCH={};/* hover state per canvas id */
function tcEma(B,p){var k=2/(p+1),e=null;return B.map(function(b,i){e=e==null?b.c:b.c*k+e*(1-k);return i>=p-1?e:NaN})}
function tcRsi(B,p){var out=[],g=0,l=0;for(var i=0;i<B.length;i++){if(i===0){out.push(NaN);continue}var ch=B[i].c-B[i-1].c,up=Math.max(0,ch),dn=Math.max(0,-ch);if(i<=p){g+=up/p;l+=dn/p;out.push(i===p?(l===0?100:100-100/(1+g/l)):NaN)}else{g=(g*(p-1)+up)/p;l=(l*(p-1)+dn)/p;out.push(l===0?100:100-100/(1+g/l))}}return out}
function tcBB(B,p){return B.map(function(b,i){if(i<p-1)return null;var s=B.slice(i-p+1,i+1).map(function(x){return x.c}),m=sum(s)/p,sd=Math.sqrt(sum(s.map(function(x){return (x-m)*(x-m)}))/p);return {m:m,u:m+2*sd,l:m-2*sd}})}
function tcH(card){var fs=card&&card.classList.contains('tcfs');return fs?Math.max(320,window.innerHeight-(card.querySelector('.tcctl')?card.querySelector('.tcctl').offsetHeight:180)-170):(window.innerWidth<640?Math.max(380,Math.min(480,Math.round(window.innerHeight*0.55))):520)}
function tcDraw(cv,cfg){var box=cv.parentNode,card=cv.closest('.card'),W=box.clientWidth||600,H=tcH(card),dpr=window.devicePixelRatio||1;cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';var c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
  var dark=mkDark(),fg=dark?'#d1d4dc':'#2a2e39',mu=dark?'#787b86':'#888',gr=dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';c.clearRect(0,0,W,H);
  var all=cfg.bars,N=cfg.slots||all.length,vis=cfg.vis==null?all.length:cfg.vis,B=all.slice(0,vis);if(!B.length)return null;
  var nar=W<520,pr=nar?58:70,pl=4,pt=18,pb=22,rsiH=TCI.rsi?Math.round(H*0.18):0,volH=TCI.vol?Math.round(H*0.14):0,ph=H-pt-pb-rsiH-(rsiH?8:0),pw=W-pr-pl,bw=pw/N;
  var e20=tcEma(B,20),e50=tcEma(B,50),bb=TCI.bb?tcBB(B,20):null;
  var lo=Math.min.apply(null,B.map(function(b){return b.l})),hi=Math.max.apply(null,B.map(function(b){return b.h}));(cfg.lines||[]).forEach(function(L){if(isFinite(L.v)){lo=Math.min(lo,L.v);hi=Math.max(hi,L.v)}});
  if(bb)bb.forEach(function(x){if(x){lo=Math.min(lo,x.l);hi=Math.max(hi,x.u)}});var pad=(hi-lo)*0.07||1;lo-=pad;hi+=pad;
  var Y=function(v){return pt+(hi-v)/(hi-lo)*(ph-volH)},X=function(i){return pl+i*bw+bw/2};
  c.font=(nar?'10px':'11px')+' system-ui,sans-serif';for(var k=0;k<=5;k++){var v=lo+(hi-lo)*k/5,y=Y(v);c.strokeStyle=gr;c.beginPath();c.moveTo(pl,y);c.lineTo(pl+pw,y);c.stroke();c.fillStyle=mu;c.fillText(dmPx(v),pl+pw+6,y+4)}
  if(cfg.hideFrom!=null&&vis<N){var hx=pl+vis*bw;c.fillStyle=dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';c.fillRect(hx,pt,pl+pw-hx,ph+rsiH);c.fillStyle=mu;c.font='bold 26px system-ui,sans-serif';c.textAlign='center';c.fillText('?',(hx+pl+pw)/2,pt+ph/2);c.textAlign='left';c.font='11px system-ui,sans-serif'}
  if(cfg.cut!=null){var cx=pl+cfg.cut*bw;c.strokeStyle=dark?'rgba(255,255,255,.35)':'rgba(0,0,0,.35)';c.setLineDash([3,3]);c.beginPath();c.moveTo(cx,pt);c.lineTo(cx,pt+ph);c.stroke();c.setLineDash([])}
  /* volume */
  if(volH){var mv=Math.max.apply(null,B.map(function(b){return b.v||0}))||1;B.forEach(function(b,i){var hh=(b.v||0)/mv*(volH-4);c.fillStyle=b.c>=b.o?'rgba(38,166,154,.35)':'rgba(239,83,80,.35)';c.fillRect(X(i)-Math.max(1,bw*0.35),pt+ph-hh,Math.max(2,bw*0.7),hh)})}
  /* highlights */
  B.forEach(function(b,i){var x=X(i);if(cfg.marks&&cfg.marks[i]){c.fillStyle=cfg.marks[i];c.fillRect(x-bw/2,pt,bw,ph)}});
  if(bb){c.strokeStyle='rgba(156,39,176,.6)';[['u'],['l'],['m']].forEach(function(f){c.beginPath();var st=false;bb.forEach(function(x,i){if(!x)return;var y=Y(x[f[0]]);if(!st){c.moveTo(X(i),y);st=true}else c.lineTo(X(i),y)});c.stroke()})}
  B.forEach(function(b,i){var up=b.c>=b.o,col=up?'#26a69a':'#ef5350',x=X(i);c.strokeStyle=col;c.fillStyle=col;c.beginPath();c.moveTo(x,Y(b.h));c.lineTo(x,Y(b.l));c.stroke();var y1=Y(Math.max(b.o,b.c)),y2=Y(Math.min(b.o,b.c));c.fillRect(x-Math.max(1,bw*0.35),y1,Math.max(2,bw*0.7),Math.max(1,y2-y1))});
  var line=function(arr,col){c.strokeStyle=col;c.lineWidth=1.4;c.beginPath();var st=false;arr.forEach(function(v,i){if(!isFinite(v))return;if(!st){c.moveTo(X(i),Y(v));st=true}else c.lineTo(X(i),Y(v))});c.stroke();c.lineWidth=1};
  if(TCI.ema20)line(e20,'#2962ff');if(TCI.ema50)line(e50,'#ff9800');
  (cfg.lines||[]).forEach(function(L){if(!isFinite(L.v))return;var y=Y(L.v);c.strokeStyle=L.col;c.lineWidth=L.w||1;c.setLineDash(L.dash||[5,4]);c.beginPath();c.moveTo(L.x0!=null?X(L.x0):pl,y);c.lineTo(L.x1!=null?X(L.x1):pl+pw,y);c.stroke();c.setLineDash([]);c.lineWidth=1;if(L.lab){c.fillStyle=L.col;c.fillRect(pl+pw+1,y-8,pr-2,16);c.fillStyle='#fff';c.fillText(L.lab,pl+pw+4,y+4)}});
  if(cfg.after)cfg.after(c,X,Y,bw,pt,ph);
  /* last price */
  var lb=B[B.length-1],ly=Y(lb.c);c.strokeStyle=lb.c>=lb.o?'#26a69a':'#ef5350';c.setLineDash([2,3]);c.beginPath();c.moveTo(X(B.length-1),ly);c.lineTo(pl+pw,ly);c.stroke();c.setLineDash([]);c.fillStyle=c.strokeStyle;c.fillRect(pl+pw+1,ly-8,pr-2,16);c.fillStyle='#fff';c.fillText(dmPx(lb.c),pl+pw+4,ly+4);
  /* RSI */
  if(rsiH){var r=tcRsi(B,14),ry0=pt+ph+8,RY=function(v){return ry0+(100-v)/100*rsiH};c.strokeStyle=gr;c.strokeRect(pl,ry0,pw,rsiH);c.fillStyle='rgba(126,87,194,.08)';c.fillRect(pl,RY(70),pw,RY(30)-RY(70));c.strokeStyle='rgba(126,87,194,.35)';[30,70].forEach(function(v){c.setLineDash([3,3]);c.beginPath();c.moveTo(pl,RY(v));c.lineTo(pl+pw,RY(v));c.stroke();c.setLineDash([])});
    c.strokeStyle='#7e57c2';c.lineWidth=1.3;c.beginPath();var st=false;r.forEach(function(v,i){if(!isFinite(v))return;if(!st){c.moveTo(X(i),RY(v));st=true}else c.lineTo(X(i),RY(v))});c.stroke();c.lineWidth=1;var lr=r[r.length-1];c.fillStyle=mu;c.fillText('RSI 14 '+(isFinite(lr)?fmt(lr,0):''),pl+4,ry0+12)}
  /* time axis */
  c.fillStyle=mu;var fmtT=function(t){var d=new Date(t);return cfg.tf==='1D'||cfg.tf==='7D'?pad2(d.getDate())+'/'+pad2(d.getMonth()+1):pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+' '+pad2(d.getHours())+':'+pad2(d.getMinutes())};var day=cfg.tf==='1D'||cfg.tf==='7D',fmtS=function(t,prev){var d=new Date(t);if(day)return pad2(d.getDate())+'/'+pad2(d.getMonth()+1);var pd=prev!=null?new Date(prev):null;return (!pd||pd.getDate()!==d.getDate())?pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+(nar?'':' '+pad2(d.getHours())+':'+pad2(d.getMinutes())):pad2(d.getHours())+':'+pad2(d.getMinutes())};
  var span=X(B.length-1)-X(0),nl=Math.max(2,Math.min(5,Math.floor(span/(nar?62:90))+1)),prevT=null,lastR=-1e9;c.font=(nar?'10px':'11px')+' system-ui,sans-serif';
  for(var q=0;q<nl;q++){var ii=nl===1?0:Math.round((B.length-1)*q/(nl-1)),lab=fmtS(B[ii].t,prevT),lw=c.measureText(lab).width,cx2=Math.min(pl+pw-lw/2,Math.max(pl+lw/2,X(ii)));if(cx2-lw/2<lastR+6)continue;c.textAlign='center';c.fillText(lab,cx2,H-6);lastR=cx2+lw/2;prevT=B[ii].t}c.textAlign='left';
  /* legend */
  c.font='11px system-ui,sans-serif';var lx=pl+4;[[TCI.ema20,'EMA 20','#2962ff'],[TCI.ema50,'EMA 50','#ff9800'],[!!bb,'BB 20,2','#9c27b0']].forEach(function(x){if(!x[0])return;c.fillStyle=x[2];c.fillText(x[1],lx,pt-5);lx+=c.measureText(x[1]).width+12});
  /* crosshair */
  var hv=TCH[cv.id];if(hv&&hv.i!=null&&hv.i<B.length){var hb=B[hv.i],hx2=X(hv.i);c.strokeStyle=dark?'rgba(255,255,255,.4)':'rgba(0,0,0,.4)';c.setLineDash([4,4]);c.beginPath();c.moveTo(hx2,pt);c.lineTo(hx2,pt+ph);c.stroke();if(hv.y!=null&&hv.y<pt+ph){c.beginPath();c.moveTo(pl,hv.y);c.lineTo(pl+pw,hv.y);c.stroke();var pv=hi-(hv.y-pt)/(ph-volH)*(hi-lo);c.setLineDash([]);c.fillStyle=dark?'#363a45':'#555';c.fillRect(pl+pw+1,hv.y-8,pr-2,16);c.fillStyle='#fff';c.fillText(dmPx(pv),pl+pw+4,hv.y+4)}c.setLineDash([]);
    var tip=fmtT(hb.t)+'  O '+dmPx(hb.o)+'  H '+dmPx(hb.h)+'  L '+dmPx(hb.l)+'  C '+dmPx(hb.c)+(hb.v?'  Vol '+fmt(hb.v,0):'');c.font='11px system-ui,sans-serif';var tw=c.measureText(tip).width+12;c.fillStyle=dark?'rgba(30,34,45,.92)':'rgba(255,255,255,.95)';c.fillRect(Math.max(pl,Math.min(pl+pw-tw,hx2-tw/2)),pt+2,tw,18);c.fillStyle=fg;c.fillText(tip,Math.max(pl,Math.min(pl+pw-tw,hx2-tw/2))+6,pt+15)}
  return {X:X,Y:Y,bw:bw,pl:pl,pw:pw,pt:pt,ph:ph,volH:volH,N:N,inv:function(y){return hi-(y-pt)/(ph-volH)*(hi-lo)},idx:function(x){return Math.max(0,Math.min(N-1,Math.floor((x-pl)/bw)))}}}
function tcInfo(B,tf,htf){if(!B||B.length<20)return '';var e20=tcEma(B,20),e50=tcEma(B,50),r=tcRsi(B,14),lb=B[B.length-1],a=rpATR(B),l20=e20[e20.length-1],l50=e50[e50.length-1],lr=r[r.length-1],vs=B.slice(-21,-1).map(function(b){return b.v||0}),va=vs.length?sum(vs)/vs.length:0,vr=va?(lb.v||0)/va:NaN;
  var piv=fdPivots(B),sh=piv.hi.length?B[piv.hi[piv.hi.length-1]].h:NaN,sl=piv.lo.length?B[piv.lo[piv.lo.length-1]].l:NaN,slope=e20.length>5&&isFinite(e20[e20.length-6])?(l20-e20[e20.length-6]):0;
  var tr=isFinite(l50)?(lb.c>l20&&l20>l50?['up','Ανοδική: τιμή > EMA20 > EMA50']:lb.c<l20&&l20<l50?['down','Πτωτική: τιμή < EMA20 < EMA50']:['mix','Μπερδεμένη: οι μέσοι δεν συμφωνούν']):(slope>0?['up','Ανοδική κλίση EMA20']:['down','Πτωτική κλίση EMA20']);
  var it=function(ic,l,v,cl){return '<div class="tci '+(cl||'')+'"><span>'+ic+' '+l+'</span><b>'+v+'</b></div>'};
  return '<div class="tcinfo">'+it('📈','Τάση',esc(tr[1]),tr[0]==='up'?'pos':tr[0]==='down'?'neg':'')+(htf?it('🔭','Μεγάλο TF ('+esc(htf.tf)+')',htf.txt,htf.cl):'')+
    it('⚡','RSI 14',isFinite(lr)?fmt(lr,0)+(lr>70?' · υπεραγορά':lr<30?' · υπερπώληση':' · ουδέτερο'):'–',lr>70?'neg':lr<30?'pos':'')+
    it('📏','ATR 14',dmPx(a)+' ('+fmt(a/lb.c*100,2)+'%)')+it('📊','Όγκος',isFinite(vr)?fmt(vr,1)+'× του μέσου'+(vr>1.5?' · αυξημένος':vr<0.6?' · χαμηλός':''):'–',vr>1.5?'pos':'')+
    it('⬆️','Τελευταίο swing high',isFinite(sh)?dmPx(sh)+' ('+(sh>lb.c?'+':'')+fmt((sh-lb.c)/lb.c*100,2)+'%)':'–')+it('⬇️','Τελευταίο swing low',isFinite(sl)?dmPx(sl)+' ('+fmt((sl-lb.c)/lb.c*100,2)+'%)':'–')+'</div>'}
function tcHtf(coin,tf,atT,cb){var up={'15m':'1h','1h':'4h','4h':'1D','1D':'7D'}[tf];if(!up||(!CG.mcp&&!S.db)){cb(null);return}
  ccFetchBars(coin+'USDT',up).then(function(r){var B=r.bars.filter(function(b){return !b.approx&&b.t<=atT});if(B.length<25){cb(null);return}var e20=tcEma(B,20),e50=tcEma(B,50),lb=B[B.length-1],a=e20[e20.length-1],b=e50[e50.length-1];
    var t=isFinite(b)?(lb.c>a&&a>b?['ανοδικό','pos']:lb.c<a&&a<b?['πτωτικό','neg']:['μπερδεμένο','']):(lb.c>a?['πάνω από EMA20','pos']:['κάτω από EMA20','neg']);cb({tf:up,txt:t[0],cl:t[1]})}).catch(function(){cb(null)})}
function tcToggles(){return '<div class="tctog">'+[['ema20','EMA 20'],['ema50','EMA 50'],['bb','Bollinger'],['vol','Όγκος'],['rsi','RSI']].map(function(x){return '<button type="button" class="chip'+(TCI[x[0]]?' on':'')+'" data-tci="'+x[0]+'">'+x[1]+'</button>'}).join('')+'<button type="button" class="chip" data-tcfs title="Πλήρης οθόνη">⛶ Μεγάλο</button></div>'}
function tcBind(cv,redraw){cv.addEventListener('mousemove',function(e){var g=cv._geo;if(!g)return;var r=cv.getBoundingClientRect();TCH[cv.id]={i:g.idx(e.clientX-r.left),y:e.clientY-r.top};redraw()});cv.addEventListener('mouseleave',function(){TCH[cv.id]=null;redraw()})}

function profGreet(){if(window.CURR){QZ.shownBubble=true;profDot();return}
  if(QZ.shownBubble)return;var d=qMine(today());QZ.shownBubble=true;profDot();
  setTimeout(function(){if(!$('#profPanel').hidden||nudgeMode()==='off')return;var gk='tj-qgreet',gv='';try{gv=localStorage.getItem(gk)}catch(e){}if(nudgeMode()==='few'&&gv===today())return;try{localStorage.setItem(gk,today())}catch(e){}
    if(d&&d.done)profSay('Μπράβο για σήμερα! Δες την κατάταξη.');else profSay(d&&d.ans&&d.ans.length?'Έχεις αφήσει το τεστ στη μέση. Συνεχίζουμε;':'Καλημέρα! Το τεστ της ημέρας σε περιμένει: 5 ερωτήσεις.',true);
    $$('.prof-btn .prof-svg').forEach(function(s){s.classList.add('wave');setTimeout(function(){s.classList.remove('wave')},2200)});
  },1500);
}

/* ================= Pro γράφημα: κεριά, δείκτες, εργαλεία σχεδίασης ================= */
var PC=window.PC={tfs:null,tfMs:0,cdT:null,root:null,cv:null,c:null,wrap:null,W:0,H:0,dpr:1,sym:'',raw:[],bars:[],closeOnly:false,src:'',tf:'',ohlc:{},
  kind:'candle',ind:{ema20:true,ema50:true,vol:true},magnet:true,tool:'cursor',from:0,to:0,iv:36e5,calc:{},lay:null,ps:null,
  draws:[],sel:-1,tmp:null,meas:null,drag:null,ptrs:{},pinch:null,mouse:null,over:false,saveT:null,hist:[],empty:'',full:false};
try{var pc0=JSON.parse(localStorage.getItem('tj-pc')||'null');if(pc0){if(pc0.v===2&&pc0.kind)PC.kind=pc0.kind;if(pc0.ind)PC.ind=pc0.ind;PC.magnet=pc0.magnet!==false}}catch(e){}
function pcPrefs(){try{localStorage.setItem('tj-pc',JSON.stringify({v:2,kind:PC.kind,ind:PC.ind,magnet:PC.magnet}))}catch(e){}}
function pcTr(s){try{return (typeof LANG_RU==='function'&&LANG_RU()&&window.DICT&&DICT[s])?DICT[s]:s}catch(e){return s}}
var PC_KINDS=[['candle','Κεριά'],['hollow','Κούφια κεριά'],['ha','Heikin Ashi'],['bars','Μπάρες OHLC'],['line','Γραμμή'],['area','Περιοχή']];
var PC_IND=[['vol','Όγκος (Volume)',1],['ema20','EMA 20',0],['ema50','EMA 50',0],['ema200','EMA 200',0],['sma200','SMA 200',0],['bb','Bollinger Bands 20, 2',0],['vwap','VWAP',1],['rsi','RSI 14',0],['srsi','Stochastic RSI 3, 3, 14, 14',0],['macd','MACD 12, 26, 9',0],['stoch','Stochastic 14, 1, 3',1],['atr','ATR 14',1],['asi','ASI (Accumulative Swing Index)',1]];
var PC_SUB=['rsi','srsi','macd','stoch','atr','asi'];
var PC_UP='#26a69a',PC_DN='#ef5350';
var PC_TOOLS=[['cursor','Σταυρόνημα'],'|',['trend','Γραμμή τάσης'],['ray','Ακτίνα'],['ext','Εκτεταμένη γραμμή'],['hline','Οριζόντια γραμμή'],['hray','Οριζόντια ακτίνα'],['vline','Κάθετη γραμμή'],['chan','Παράλληλο κανάλι'],'|',['fib','Fibonacci retracement'],['rect','Ορθογώνιο'],'|',['long','Θέση long'],['short','Θέση short'],'|',['text','Κείμενο'],['measure','Μέτρηση εύρους']];
var PC_ICON={cursor:'<path d="M12 4v16M4 12h16"/>',
  trend:'<path d="M6.5 17.5l11-11"/><circle cx="5.5" cy="18.5" r="1.8"/><circle cx="18.5" cy="5.5" r="1.8"/>',
  ray:'<path d="M6.5 17.5L20 4"/><circle cx="5.5" cy="18.5" r="1.8"/><path d="M15.5 4H20v4.5"/>',
  ext:'<path d="M3 21L21 3"/><circle cx="9" cy="15" r="1.8"/><circle cx="15" cy="9" r="1.8"/>',
  hline:'<path d="M3 12h7M14 12h7"/><circle cx="12" cy="12" r="1.8"/>',
  hray:'<path d="M8 12h13"/><circle cx="5.5" cy="12" r="1.8"/>',
  vline:'<path d="M12 3v7M12 14v7"/><circle cx="12" cy="12" r="1.8"/>',
  chan:'<path d="M4 14L14 4M10 20L20 10"/><circle cx="4" cy="14" r="1.6"/><circle cx="14" cy="4" r="1.6"/><circle cx="15" cy="15" r="1.6"/>',
  fib:'<path d="M3 5h18M3 9.5h18M3 14.5h18M3 19h18" stroke-opacity=".9"/><path d="M5 19L19 5" stroke-dasharray="2 2"/>',
  rect:'<rect x="5" y="7" width="14" height="10" rx="1"/><circle cx="5" cy="7" r="1.5"/><circle cx="19" cy="17" r="1.5"/>',
  long:'<rect x="4" y="4" width="16" height="8" fill="#26a69a" fill-opacity=".35" stroke="#26a69a"/><rect x="4" y="12" width="16" height="7" fill="#ef5350" fill-opacity=".35" stroke="#ef5350"/>',
  short:'<rect x="4" y="5" width="16" height="7" fill="#ef5350" fill-opacity=".35" stroke="#ef5350"/><rect x="4" y="12" width="16" height="8" fill="#26a69a" fill-opacity=".35" stroke="#26a69a"/>',
  text:'<path d="M6 6h12M12 6v13M9.5 19h5"/>',
  measure:'<path d="M12 4v16M8 7.5L12 4l4 3.5M8 16.5L12 20l4-3.5M4 4h4M4 20h4"/>'};
var PC_COLS=['#2962ff','#e91e63','#ff9800','#26a69a','#9c27b0','#78909c'];
var PC_FIB=[0,.236,.382,.5,.618,.786,1];

/* ---------- indicators ---------- */
function pcSMA(v,p){var o=new Array(v.length).fill(NaN),s=0,c=0;for(var i=0;i<v.length;i++){var x=v[i];if(!isFinite(x)){s=0;c=0;continue}s+=x;c++;if(c>p){s-=v[i-p];c=p}if(c===p)o[i]=s/p}return o}
function pcStochOf(src,hi,lo,p){var o=[];for(var i=0;i<src.length;i++){if(i<p-1){o.push(NaN);continue}var h=-Infinity,l=Infinity,ok=true;for(var j=i-p+1;j<=i;j++){if(!isFinite(hi[j])||!isFinite(lo[j])){ok=false;break}h=Math.max(h,hi[j]);l=Math.min(l,lo[j])}o.push(ok&&isFinite(src[i])?(h>l?(src[i]-l)/(h-l)*100:0):NaN)}return o}
function pcEMA(v,p){var o=new Array(v.length).fill(NaN),k=2/(p+1),e=NaN,run=0,s=0;for(var i=0;i<v.length;i++){var x=v[i];if(!isFinite(x)){run=0;s=0;continue}
    if(isFinite(e)){e=x*k+e*(1-k);o[i]=e;continue}run++;s+=x;if(run===p){e=s/p;o[i]=e}}return o}
function pcRMA(v,p){var o=new Array(v.length).fill(NaN),r=NaN,s=0,c=0;for(var i=0;i<v.length;i++){var x=v[i];if(!isFinite(x))continue;if(isFinite(r)){r=(r*(p-1)+x)/p;o[i]=r;continue}s+=x;c++;if(c===p){r=s/p;o[i]=r}}return o}
function pcCalc(){
  var B=PC.raw,n=B.length,C=B.map(function(b){return b.c}),Hh=B.map(function(b){return b.h}),Ll=B.map(function(b){return b.l}),k={};
  k.ema20=pcEMA(C,20);k.ema50=pcEMA(C,50);k.ema200=pcEMA(C,200);k.sma200=pcSMA(C,200);
  var m=pcSMA(C,20);k.bbM=m;k.bbU=[];k.bbL=[];for(var i=0;i<n;i++){if(!isFinite(m[i])){k.bbU.push(NaN);k.bbL.push(NaN);continue}var s=0;for(var j=i-19;j<=i;j++)s+=(C[j]-m[i])*(C[j]-m[i]);var sd=Math.sqrt(s/20);k.bbU.push(m[i]+2*sd);k.bbL.push(m[i]-2*sd)}
  k.vwap=[];var pv=0,vv=0,day=-1;for(i=0;i<n;i++){var b=B[i],d=Math.floor(b.t/864e5);if(d!==day||PC.iv>=864e5&&i===0){if(PC.iv<864e5){day=d;pv=0;vv=0}else if(day<0){day=d}}var tp=(b.h+b.l+b.c)/3,v=isFinite(b.v)?b.v:0;pv+=tp*v;vv+=v;k.vwap.push(vv>0?pv/vv:NaN)}
  var up=[NaN],dn=[NaN];for(i=1;i<n;i++){var df=C[i]-C[i-1];up.push(Math.max(df,0));dn.push(Math.max(-df,0))}var ru=pcRMA(up,14),rd=pcRMA(dn,14);k.rsi=ru.map(function(u,i2){return isFinite(u)&&isFinite(rd[i2])?(rd[i2]===0?100:100-100/(1+u/rd[i2])):NaN});
  var e12=pcEMA(C,12),e26=pcEMA(C,26),mac=e12.map(function(x,i2){return x-e26[i2]}),sig=pcEMA(mac,9);k.macd=mac;k.macdS=sig;k.macdH=mac.map(function(x,i2){return x-sig[i2]});
  var tr=B.map(function(b2,i2){if(!i2)return b2.h-b2.l;var cp=B[i2-1].c;return Math.max(b2.h-b2.l,Math.abs(b2.h-cp),Math.abs(b2.l-cp))});k.atr=pcRMA(tr,14);
  k.stK=pcStochOf(C,Hh,Ll,14);k.stD=pcSMA(k.stK,3);
  var sr=pcStochOf(k.rsi,k.rsi,k.rsi,14);k.srK=pcSMA(sr,3);k.srD=pcSMA(k.srK,3);
  var T=10,asi=[n?0:NaN],acc=0;
  for(i=1;i<n;i++){var c0=B[i-1],c1=B[i],A=Math.abs(c1.h-c0.c),Bb=Math.abs(c1.l-c0.c),Cc=Math.abs(c1.h-c1.l),D=Math.abs(c0.c-c0.o),R=A>=Bb&&A>=Cc?A-.5*Bb+.25*D:Bb>=A&&Bb>=Cc?Bb-.5*A+.25*D:Cc+.25*D,K=Math.max(A,Bb);
    var si=R>0?50*((c1.c-c0.c)+.5*(c1.c-c1.o)+.25*(c0.c-c0.o))/R*(K/T):0;acc+=si;asi.push(acc)}k.asi=asi;
  PC.calc=k;
}
function pcIndOk(k){var d=PC_IND.find(function(x){return x[0]===k});return !(d&&d[2]&&PC.closeOnly)}
function pcDisplayBars(){var B=PC.raw;if(PC.kind!=='ha'||PC.closeOnly)return B;var o=[],po,pc;B.forEach(function(b,i){if(b.approx){o.push(b);po=b.c;pc=b.c;return}var c=(b.o+b.h+b.l+b.c)/4,op=i?(po+pc)/2:(b.o+b.c)/2;o.push({t:b.t,o:op,h:Math.max(b.h,op,c),l:Math.min(b.l,op,c),c:c,v:b.v});po=op;pc=c});return o}

/* ---------- geometry ---------- */
function pcLayout(){var subs=PC_SUB.filter(function(k){return PC.ind[k]&&pcIndOk(k)}),axW=PC.W<520?60:76,tH=22,sh=subs.length?Math.max(60,Math.min(104,(PC.H-tH)*.19)):0,mh=PC.H-tH-sh*subs.length;
  PC.lay={pw:PC.W-axW,axW:axW,tH:tH,main:{y:0,h:mh},subs:subs.map(function(k,i){return {k:k,y:mh+i*sh,h:sh}})}}
function pcBw(){return PC.lay.pw/(PC.to-PC.from)}
function pcX(i){return (i-PC.from+.5)*pcBw()}
function pcIdx(x){return x/pcBw()+PC.from-.5}
function pcT(i){var B=PC.raw,n=B.length;if(!n)return 0;if(i<=0)return B[0].t+i*PC.iv;if(i>=n-1)return B[n-1].t+(i-n+1)*PC.iv;var a=Math.floor(i);return B[a].t+(B[a+1].t-B[a].t)*(i-a)}
function pcI(t){var B=PC.raw,n=B.length;if(!n)return 0;if(t<=B[0].t)return (t-B[0].t)/PC.iv;if(t>=B[n-1].t)return n-1+(t-B[n-1].t)/PC.iv;var lo=0,hi=n-1;while(hi-lo>1){var m=(lo+hi)>>1;if(B[m].t<=t)lo=m;else hi=m}return lo+(t-B[lo].t)/((B[hi].t-B[lo].t)||1)}
function pcY(p){var s=PC.ps,tp=PC.legPad||8;return s.y+tp+(s.hi-p)/(s.hi-s.lo)*(s.h-tp-8)}
function pcP(y){var s=PC.ps,tp=PC.legPad||8;return s.hi-(y-s.y-tp)/(s.h-tp-8)*(s.hi-s.lo)}
function pcFit(){var n=PC.raw.length,span=Math.min(Math.max(n,20),Math.max(30,Math.floor(((PC.lay&&PC.lay.pw)||PC.W||700)/7))),mg=Math.max(3,span*.08);PC.to=n-.5+mg;PC.from=PC.to-span-mg}
function pcClamp(){var n=PC.raw.length,span=PC.to-PC.from;if(PC.to<6){PC.to=6;PC.from=6-span}if(PC.from>n-6){PC.from=n-6;PC.to=PC.from+span}}
function pcZoomTo(f,t,k,cx){var span=t-f,ns=Math.max(12,Math.min(Math.max(PC.raw.length*1.3,60),span*k)),ci=f+(cx/PC.lay.pw)*span;PC.from=ci-(ci-f)*ns/span;PC.to=PC.from+ns;pcClamp()}
function pcCols(){var cs=getComputedStyle(PC.root||document.body),v=function(n,f){return (cs.getPropertyValue(n)||'').trim()||f};
  return {bg:v('--surface','#fff'),fg:v('--fg','#111'),mu:v('--muted','#777'),ln:v('--line','#e3e6e8'),up:v('--gain','#14855c'),dn:v('--loss','#c43d3d'),ac:v('--accent','#0f6b5c')}}
function pcFmtT(t,long){var d=new Date(t),p2=function(x){return String(x).padStart(2,'0')};if(PC.iv>=864e5)return p2(d.getDate())+'/'+p2(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2);
  return long?p2(d.getDate())+'/'+p2(d.getMonth()+1)+' '+p2(d.getHours())+':'+p2(d.getMinutes()):(d.getHours()===0&&d.getMinutes()===0?p2(d.getDate())+'/'+p2(d.getMonth()+1):p2(d.getHours())+':'+p2(d.getMinutes()))}
function pcNum(v){var a=Math.abs(v);return fmt(v,a>=1000?0:a>=10?1:2)}
function pcPx(x){return typeof dmPx==='function'?dmPx(x):String(+x.toFixed(4))}

/* ---------- render ---------- */
function pcRender(){
  if(!PC.c||!PC.W)return;var c=PC.c,W=PC.W,H=PC.H,col=pcCols();c.setTransform(PC.dpr,0,0,PC.dpr,0,0);c.clearRect(0,0,W,H);c.fillStyle=col.bg;c.fillRect(0,0,W,H);
  pcLayout();var L=PC.lay,B=PC.bars,n=B.length;PC.legPad=L.pw<520?(PC.legH||54):8;c.font='11px system-ui,-apple-system,sans-serif';c.textBaseline='alphabetic';
  if(!n){c.fillStyle=col.mu;c.font='14px system-ui,sans-serif';c.textAlign='center';var lines=String(PC.empty||pcTr('Δεν υπάρχουν τιμές')).split('\n');lines.forEach(function(s2,i){c.fillText(s2,W/2,H/2-((lines.length-1)*10)+i*20)});c.textAlign='left';return}
  var a=Math.max(0,Math.floor(PC.from)),b=Math.min(n-1,Math.ceil(PC.to)),lineK=PC.closeOnly||PC.kind==='line'||PC.kind==='area',lo=Infinity,hi=-Infinity,K=PC.calc;
  for(var i=a;i<=b;i++){var x=B[i];if(lineK){lo=Math.min(lo,x.c);hi=Math.max(hi,x.c)}else{lo=Math.min(lo,x.l);hi=Math.max(hi,x.h)}}
  ['ema20','ema50','ema200','sma200'].forEach(function(k){if(PC.ind[k])for(var j=a;j<=b;j++){var v=K[k][j];if(isFinite(v)){lo=Math.min(lo,v);hi=Math.max(hi,v)}}});
  if(PC.ind.bb)for(i=a;i<=b;i++){if(isFinite(K.bbU[i])){hi=Math.max(hi,K.bbU[i]);lo=Math.min(lo,K.bbL[i])}}
  if(!isFinite(lo)){lo=B[n-1].c*.99;hi=B[n-1].c*1.01}var pad=(hi-lo)*.06||Math.abs(hi)*.01||1;PC.ps={lo:lo-pad,hi:hi+pad,y:L.main.y,h:L.main.h};
  var bw=pcBw(),pw=L.pw;
  /* grid + price axis */
  var step=pcNice((PC.ps.hi-PC.ps.lo)/Math.max(3,Math.floor(L.main.h/56))),g0=Math.ceil(PC.ps.lo/step)*step;c.lineWidth=1;
  for(var gv=g0;gv<=PC.ps.hi;gv+=step){var gy=Math.round(pcY(gv))+.5;c.strokeStyle=col.ln;c.globalAlpha=.6;c.beginPath();c.moveTo(0,gy);c.lineTo(pw,gy);c.stroke();c.globalAlpha=1;c.fillStyle=col.mu;c.fillText(pcPx(gv),pw+6,gy+4)}
  /* time axis */
  var ts=Math.max(1,Math.ceil(96/bw));var t0=Math.ceil(PC.from/ts)*ts;c.fillStyle=col.mu;c.strokeStyle=col.ln;
  for(i=t0;i<=PC.to;i+=ts){var tx=Math.round(pcX(i))+.5;if(tx<0||tx>pw)continue;c.globalAlpha=.35;c.beginPath();c.moveTo(tx,0);c.lineTo(tx,H-L.tH);c.stroke();c.globalAlpha=1;var tl=pcFmtT(pcT(i));c.fillText(tl,tx-c.measureText(tl).width/2,H-7)}
  c.strokeStyle=col.ln;c.beginPath();c.moveTo(pw+.5,0);c.lineTo(pw+.5,H);c.moveTo(0,H-L.tH+.5);c.lineTo(W,H-L.tH+.5);c.stroke();
  /* main pane */
  c.save();c.beginPath();c.rect(0,L.main.y,pw,L.main.h);c.clip();
  if(PC.ind.vol&&pcIndOk('vol')){var vm=0;for(i=a;i<=b;i++)if(isFinite(B[i].v))vm=Math.max(vm,B[i].v);if(vm>0)for(i=a;i<=b;i++){var vh=(B[i].v||0)/vm*L.main.h*.18;c.fillStyle=B[i].c>=B[i].o?PC_UP:PC_DN;c.globalAlpha=.42;c.fillRect(pcX(i)-bw*.36,L.main.y+L.main.h-vh,Math.max(1,bw*.72),vh)}c.globalAlpha=1}
  if(PC.ind.bb){c.fillStyle=col.ac;c.globalAlpha=.06;c.beginPath();var st=false;for(i=a;i<=b;i++){if(!isFinite(K.bbU[i]))continue;var xx=pcX(i);if(!st){c.moveTo(xx,pcY(K.bbU[i]));st=true}else c.lineTo(xx,pcY(K.bbU[i]))}for(i=b;i>=a;i--){if(isFinite(K.bbL[i]))c.lineTo(pcX(i),pcY(K.bbL[i]))}c.closePath();c.fill();c.globalAlpha=1;
    pcLine(K.bbU,a,b,'#5c7cfa',1);pcLine(K.bbL,a,b,'#5c7cfa',1);pcLine(K.bbM,a,b,'#f08c00',1,[4,3])}
  if(lineK){var up0=B[b].c>=B[a].c,lc=up0?PC_UP:PC_DN;if(PC.kind==='area'||PC.closeOnly&&PC.kind!=='line'){var gr=c.createLinearGradient(0,L.main.y,0,L.main.y+L.main.h);gr.addColorStop(0,pcAlpha(lc,.28));gr.addColorStop(1,pcAlpha(lc,0));c.fillStyle=gr;c.beginPath();c.moveTo(pcX(a),pcY(B[a].c));for(i=a+1;i<=b;i++)c.lineTo(pcX(i),pcY(B[i].c));c.lineTo(pcX(b),L.main.y+L.main.h);c.lineTo(pcX(a),L.main.y+L.main.h);c.closePath();c.fill()}
    c.strokeStyle=lc;c.lineWidth=2;c.beginPath();c.moveTo(pcX(a),pcY(B[a].c));for(i=a+1;i<=b;i++)c.lineTo(pcX(i),pcY(B[i].c));c.stroke();c.lineWidth=1}
  else{pcApprox(a,b,col);for(i=a;i<=b;i++){if(B[i].approx)continue;var q=B[i],x0=pcX(i),upq=q.c>=q.o,cc=upq?PC_UP:PC_DN,yo=pcY(q.o),yc=pcY(q.c),yh=pcY(q.h),yl=pcY(q.l),w=Math.max(1,bw*.7);c.strokeStyle=cc;c.fillStyle=cc;
    if(PC.kind==='bars'){c.lineWidth=Math.max(1,Math.min(2,bw*.15));c.beginPath();c.moveTo(x0,yh);c.lineTo(x0,yl);c.moveTo(x0-w/2,yo);c.lineTo(x0,yo);c.moveTo(x0,yc);c.lineTo(x0+w/2,yc);c.stroke();c.lineWidth=1;continue}
    c.beginPath();c.moveTo(Math.round(x0)+.5,yh);c.lineTo(Math.round(x0)+.5,Math.min(yo,yc));c.moveTo(Math.round(x0)+.5,Math.max(yo,yc));c.lineTo(Math.round(x0)+.5,yl);c.stroke();
    var top=Math.min(yo,yc),bh=Math.max(1,Math.abs(yo-yc));if(PC.kind==='hollow'&&upq){c.strokeRect(Math.round(x0-w/2)+.5,Math.round(top)+.5,Math.max(1,Math.round(w)-1),Math.max(1,Math.round(bh)-1))}else c.fillRect(x0-w/2,top,w,bh)}}
  if(PC.ind.ema20)pcLine(K.ema20,a,b,'#2962ff',1.5);if(PC.ind.ema50)pcLine(K.ema50,a,b,'#ff9800',1.5);if(PC.ind.ema200)pcLine(K.ema200,a,b,'#ab47bc',1.5);if(PC.ind.sma200)pcLine(K.sma200,a,b,'#e91e63',1.5);if(PC.ind.vwap&&pcIndOk('vwap'))pcLine(K.vwap,a,b,'#9c27b0',1.5,[6,3]);
  var lastC=B[n-1].c,ly=pcY(lastC),lcol=B[n-1].c>=B[n-1].o?PC_UP:PC_DN;c.strokeStyle=lcol;c.setLineDash([2,3]);c.beginPath();c.moveTo(0,ly);c.lineTo(pw,ly);c.stroke();c.setLineDash([]);
  PC.draws.forEach(function(d,k2){pcDrawItem(d,k2===PC.sel,col)});if(PC.tmp)pcDrawItem(PC.tmp,true,col);if(PC.meas)pcDrawItem(PC.meas,false,col);
  if(!lineK){var hiI2=a,loI2=a;for(i=a;i<=b;i++){if(B[i].h>B[hiI2].h)hiI2=i;if(B[i].l<B[loI2].l)loI2=i}c.fillStyle=col.mu;c.font='10px system-ui,sans-serif';var hs=pcPx(B[hiI2].h),ls=pcPx(B[loI2].l),hx=pcX(hiI2),lx2=pcX(loI2);
    c.fillText(hs,Math.min(Math.max(2,hx-c.measureText(hs).width/2),pw-c.measureText(hs).width-2),pcY(B[hiI2].h)-5);c.fillText(ls,Math.min(Math.max(2,lx2-c.measureText(ls).width/2),pw-c.measureText(ls).width-2),pcY(B[loI2].l)+13);c.font='11px system-ui,-apple-system,sans-serif'}
  c.restore();
  var cd='';if(PC.tfMs){var rem=B[n-1].t+PC.tfMs-Date.now();if(rem>0&&rem<=PC.tfMs){var hh2=Math.floor(rem/36e5),mm2=Math.floor(rem%36e5/6e4),ss2=Math.floor(rem%6e4/1e3),p2=function(x){return String(x).padStart(2,'0')};cd=(hh2?hh2+':':'')+p2(mm2)+':'+p2(ss2)}}
  c.fillStyle=lcol;c.fillRect(pw+1,ly-9,L.axW-2,cd?32:18);c.fillStyle='#fff';c.fillText(pcPx(lastC),pw+6,ly+4);if(cd){c.font='10px system-ui,sans-serif';c.fillText(cd,pw+6,ly+18);c.font='11px system-ui,-apple-system,sans-serif'}
  PC.draws.forEach(function(d){if(d.type==='hline'||d.type==='hray'){var hy=pcY(d.p[0].price);if(hy>L.main.y&&hy<L.main.y+L.main.h){c.fillStyle=d.color||PC_COLS[0];c.fillRect(pw+1,hy-9,L.axW-2,18);c.fillStyle='#fff';c.fillText(pcPx(d.p[0].price),pw+6,hy+4)}}});
  /* sub panes */
  L.subs.forEach(function(s){pcSub(s,a,b,col)});
  /* crosshair + legend */
  var hiI=n-1;
  if(PC.over&&PC.mouse&&!(PC.drag&&PC.drag.kind==='pan')){var mx=PC.mouse.x,my=PC.mouse.y;if(mx<pw&&my<H-L.tH){hiI=Math.max(0,Math.min(n-1,Math.round(pcIdx(mx))));var sx=Math.round(pcX(Math.round(pcIdx(mx))))+.5;
    c.strokeStyle=col.mu;c.setLineDash([4,4]);c.beginPath();c.moveTo(sx,0);c.lineTo(sx,H-L.tH);c.moveTo(0,Math.round(my)+.5);c.lineTo(pw,Math.round(my)+.5);c.stroke();c.setLineDash([]);
    var lab=null;if(my<L.main.y+L.main.h)lab=pcPx(pcP(my));else L.subs.forEach(function(s){if(my>=s.y&&my<s.y+s.h&&s.sc)lab=fmt(s.sc.hi-(my-s.y-6)/(s.h-12)*(s.sc.hi-s.sc.lo),2)});
    c.fillStyle='#363a45';if(lab!=null){c.fillRect(pw+1,my-9,L.axW-2,18);c.fillStyle='#fff';c.fillText(lab,pw+6,my+4)}
    var tl2=pcFmtT(pcT(Math.round(pcIdx(mx))),true),tw=c.measureText(tl2).width+12;c.fillStyle='#363a45';c.fillRect(Math.min(Math.max(0,sx-tw/2),pw-tw),H-L.tH+1,tw,L.tH-2);c.fillStyle='#fff';c.fillText(tl2,Math.min(Math.max(0,sx-tw/2),pw-tw)+6,H-7)}}
  pcLegend(hiI,col);
}
function pcApprox(a,b,col){var B=PC.bars,c=PC.c,st=false,i;for(i=a;i<=b;i++){if(!B[i].approx){if(st){c.lineTo(pcX(i),pcY(B[i].c));break}continue}if(!st){c.beginPath();c.moveTo(pcX(i),pcY(B[i].c));st=true}else c.lineTo(pcX(i),pcY(B[i].c))}if(st){c.strokeStyle=col.mu;c.lineWidth=1.6;c.stroke();c.lineWidth=1}}
function pcNice(r){var e=Math.pow(10,Math.floor(Math.log10(r))),f=r/e;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function pcAlpha(hex,a){var m=/^#?([0-9a-f]{6})$/i.exec(hex);if(!m){return 'rgba(15,107,92,'+a+')'}var v=parseInt(m[1],16);return 'rgba('+(v>>16&255)+','+(v>>8&255)+','+(v&255)+','+a+')'}
function pcLine(arr,a,b,color,w,dash,yf){var c=PC.c;c.strokeStyle=color;c.lineWidth=w||1;if(dash)c.setLineDash(dash);c.beginPath();var st=false;yf=yf||pcY;for(var i=a;i<=b;i++){var v=arr[i];if(!isFinite(v)){st=false;continue}var x=pcX(i),y=yf(v);if(!st){c.moveTo(x,y);st=true}else c.lineTo(x,y)}c.stroke();c.setLineDash([]);c.lineWidth=1}
function pcSub(s,a,b,col){var c=PC.c,K=PC.calc,pw=PC.lay.pw,lo=Infinity,hi=-Infinity,series=[],fixed=null,lines=[],band=null,name='';
  if(s.k==='rsi'){fixed=[0,100];series=[[K.rsi,'#7e57c2']];lines=[70,50,30];band=[70,30,'rgba(126,87,194,.12)'];name='RSI 14'}
  if(s.k==='srsi'){fixed=[0,100];series=[[K.srK,'#2962ff'],[K.srD,'#ff6d00']];lines=[80,50,20];band=[80,20,'rgba(33,150,243,.10)'];name='Stoch RSI 3 3 14 14'}
  if(s.k==='stoch'){fixed=[0,100];series=[[K.stK,'#2962ff'],[K.stD,'#ff6d00']];lines=[80,50,20];band=[80,20,'rgba(33,150,243,.10)'];name='Stoch 14 1 3'}
  if(s.k==='macd'){series=[[K.macd,'#2962ff'],[K.macdS,'#ff6d00']];name='MACD 12 26 9'}
  if(s.k==='atr'){series=[[K.atr,'#e53935']];name='ATR 14'}
  if(s.k==='asi'){series=[[K.asi,'#26a69a']];name='ASI 10'}
  var arrs=series.map(function(x){return x[0]});if(s.k==='macd')arrs.push(K.macdH);
  if(fixed){lo=fixed[0];hi=fixed[1]}else{arrs.forEach(function(ar){for(var i=a;i<=b;i++)if(isFinite(ar[i])){lo=Math.min(lo,ar[i]);hi=Math.max(hi,ar[i])}});if(!isFinite(lo)){lo=0;hi=1}if(s.k==='macd'){var mm=Math.max(Math.abs(lo),Math.abs(hi));lo=-mm;hi=mm}var pd=(hi-lo)*.08||1;lo-=pd;hi+=pd}
  s.sc={lo:lo,hi:hi};var yf=function(v){return s.y+6+(hi-v)/(hi-lo)*(s.h-12)};
  c.strokeStyle=col.ln;c.beginPath();c.moveTo(0,s.y+.5);c.lineTo(PC.W,s.y+.5);c.stroke();
  c.save();c.beginPath();c.rect(0,s.y,pw,s.h);c.clip();
  if(band){c.fillStyle=band[2];c.fillRect(0,yf(band[0]),pw,yf(band[1])-yf(band[0]))}
  lines.forEach(function(l){c.strokeStyle=col.mu;c.setLineDash([4,4]);c.globalAlpha=l===50?.3:.6;c.beginPath();c.moveTo(0,Math.round(yf(l))+.5);c.lineTo(pw,Math.round(yf(l))+.5);c.stroke();c.setLineDash([]);c.globalAlpha=1});
  if(s.k==='macd'){var bw=pcBw();for(var i=a;i<=b;i++){var h=K.macdH[i];if(!isFinite(h))continue;var ph=K.macdH[i-1];c.fillStyle=h>=0?(isFinite(ph)&&h<ph?'#b2dfdb':'#26a69a'):(isFinite(ph)&&h>ph?'#ffcdd2':'#ff5252');var y0=yf(0),y1=yf(h);c.fillRect(pcX(i)-bw*.35,Math.min(y0,y1),Math.max(1,bw*.7),Math.abs(y1-y0)||1)}}
  series.forEach(function(sr){pcLine(sr[0],a,b,sr[1],1.4,null,yf)});c.restore();
  c.fillStyle=col.mu;(fixed?lines.filter(function(l){return l!==50}):[hi,lo]).forEach(function(v){c.fillText(pcNum(v),pw+6,Math.min(s.y+s.h-3,Math.max(s.y+11,yf(v)+4)))});
  var li=PC.over&&PC.mouse?Math.max(0,Math.min(PC.raw.length-1,Math.round(pcIdx(PC.mouse.x)))):PC.raw.length-1;
  var lv=series[0][0][PC.raw.length-1];if(isFinite(lv)){var ty=Math.min(s.y+s.h-9,Math.max(s.y+9,yf(lv)));c.fillStyle=series[0][1];c.fillRect(pw+1,ty-9,PC.lay.axW-2,18);c.fillStyle='#fff';c.fillText(pcNum(lv),pw+6,ty+4)}
  c.font='600 11px system-ui,sans-serif';c.fillStyle=col.fg;c.fillText(name,6,s.y+14);var x=12+c.measureText(name).width;c.font='11px system-ui,sans-serif';
  series.forEach(function(sr){var v=sr[0][li],t=isFinite(v)?pcNum(v):'–';c.fillStyle=sr[1];c.fillText(t,x,s.y+14);x+=c.measureText(t).width+8})}
function pcLegend(i,col){var c=PC.c,b=PC.bars[i],r=PC.raw[i];if(!b)return;var prev=PC.raw[i-1],ch=prev?(r.c-prev.c)/prev.c*100:0,x=8,y=16;c.font='600 12px system-ui,sans-serif';c.fillStyle=col.fg;var head=PC.sym+(PC.tf?' · '+PC.tf:'')+(PC.src?' · '+PC.src:'');c.fillText(head,x,y);x+=c.measureText(head).width+10;c.font='11px system-ui,sans-serif';if(x+230>PC.lay.pw){x=8;y+=15}
  var parts=PC.closeOnly||r.approx?[[r.approx?'≈':'',pcPx(b.c)]]:[['O',pcPx(b.o)],['H',pcPx(b.h)],['L',pcPx(b.l)],['C',pcPx(b.c)]];var cc=b.c>=b.o?PC_UP:PC_DN;
  var lim=PC.lay.pw-4,fit=function(w){if(x+w>lim&&x>8){x=8;y+=15}};parts.forEach(function(pp){var w=(pp[0]?c.measureText(pp[0]).width+3:0)+c.measureText(pp[1]).width;fit(w);if(pp[0]){c.fillStyle=col.mu;c.fillText(pp[0],x,y);x+=c.measureText(pp[0]).width+3}c.fillStyle=cc;c.fillText(pp[1],x,y);x+=c.measureText(pp[1]).width+8});
  var chs=(ch>=0?'+':'')+fmt(ch,2)+'%';fit(c.measureText(chs).width);c.fillStyle=ch>=0?PC_UP:PC_DN;c.fillText(chs,x,y);
  var K=PC.calc,ov=[['ema20','EMA 20','#2962ff'],['ema50','EMA 50','#ff9800'],['ema200','EMA 200','#ab47bc'],['sma200','SMA 200','#e91e63'],['vwap','VWAP','#9c27b0']].filter(function(o){return PC.ind[o[0]]&&pcIndOk(o[0])}),x2=8;
  if(PC.ind.bb)ov.push(['bbM','BB','#f08c00']);var y2=y+16;ov.forEach(function(o){var v=K[o[0]]&&K[o[0]][i];var s=o[1]+' '+(isFinite(v)?pcPx(v):'–'),w=c.measureText(s).width;if(x2+w>lim&&x2>8){x2=8;y2+=15}c.fillStyle=o[2];c.fillText(s,x2,y2);x2+=w+12});var nh=(ov.length?y2:y)+10;if(PC.closeOnly)nh+=16;if(Math.abs((PC.legH||0)-nh)>2){PC.legH=nh;if(PC.lay.pw<520&&!PC._lr){PC._lr=1;requestAnimationFrame(function(){PC._lr=0;pcRender()})}}
  if(PC.closeOnly){c.fillStyle=col.mu;c.fillText(pcTr('Μόνο τιμές κλεισίματος: για κεριά φόρτωσε OHLC'),8,(ov.length?y2:y)+16)}}

/* ---------- drawings ---------- */
function pcDrawItem(d,act,col){var c=PC.c,P=d.p.map(function(q){return {x:pcX(pcI(q.t)),y:pcY(q.price)}}),color=d.color||(d.type==='fib'?'#f0a202':d.type==='measure'?'#2962ff':PC_COLS[0]),pw=PC.lay.pw;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=act?2:1.5;
  if(d.type==='trend'||d.type==='chan'&&P.length<3){c.beginPath();c.moveTo(P[0].x,P[0].y);c.lineTo(P[1].x,P[1].y);c.stroke()}
  else if(d.type==='ray'){var dx=P[1].x-P[0].x,dy=P[1].y-P[0].y,k=dx||dy?4000/Math.hypot(dx,dy):0;c.beginPath();c.moveTo(P[0].x,P[0].y);c.lineTo(P[0].x+dx*k,P[0].y+dy*k);c.stroke()}
  else if(d.type==='ext'){var ex=P[1].x-P[0].x,ey=P[1].y-P[0].y,ek=ex||ey?4000/Math.hypot(ex,ey):0;c.beginPath();c.moveTo(P[0].x-ex*ek,P[0].y-ey*ek);c.lineTo(P[0].x+ex*ek,P[0].y+ey*ek);c.stroke()}
  else if(d.type==='hray'){c.beginPath();c.moveTo(P[0].x,P[0].y);c.lineTo(pw,P[0].y);c.stroke()}
  else if(d.type==='chan'&&P.length>2){var off=d.p[2].price-d.p[0].price,Q0={x:P[0].x,y:pcY(d.p[0].price+off)},Q1={x:P[1].x,y:pcY(d.p[1].price+off)};c.globalAlpha=.1;c.beginPath();c.moveTo(P[0].x,P[0].y);c.lineTo(P[1].x,P[1].y);c.lineTo(Q1.x,Q1.y);c.lineTo(Q0.x,Q0.y);c.closePath();c.fill();c.globalAlpha=1;
    c.beginPath();c.moveTo(P[0].x,P[0].y);c.lineTo(P[1].x,P[1].y);c.moveTo(Q0.x,Q0.y);c.lineTo(Q1.x,Q1.y);c.stroke();c.setLineDash([4,4]);c.globalAlpha=.6;c.beginPath();c.moveTo(P[0].x,(P[0].y+Q0.y)/2);c.lineTo(P[1].x,(P[1].y+Q1.y)/2);c.stroke();c.setLineDash([]);c.globalAlpha=1}
  else if(d.type==='hline'){c.beginPath();c.moveTo(0,P[0].y);c.lineTo(pw,P[0].y);c.stroke()}
  else if(d.type==='vline'){c.beginPath();c.moveTo(P[0].x,0);c.lineTo(P[0].x,PC.H);c.stroke()}
  else if(d.type==='rect'){c.globalAlpha=.14;c.fillRect(Math.min(P[0].x,P[1].x),Math.min(P[0].y,P[1].y),Math.abs(P[1].x-P[0].x),Math.abs(P[1].y-P[0].y));c.globalAlpha=1;c.strokeRect(Math.min(P[0].x,P[1].x),Math.min(P[0].y,P[1].y),Math.abs(P[1].x-P[0].x),Math.abs(P[1].y-P[0].y))}
  else if(d.type==='fib'){var x0=Math.min(P[0].x,P[1].x),p0=d.p[0].price,p1=d.p[1].price,fc=['#787b86','#f23645','#ff9800','#4caf50','#089981','#00bcd4','#787b86'];
    PC_FIB.forEach(function(l,k3){var pr=p1+(p0-p1)*l,y=pcY(pr);c.strokeStyle=fc[k3];c.beginPath();c.moveTo(x0,y);c.lineTo(pw,y);c.stroke();if(k3<PC_FIB.length-1){var y2=pcY(p1+(p0-p1)*PC_FIB[k3+1]);c.fillStyle=fc[k3];c.globalAlpha=.07;c.fillRect(x0,Math.min(y,y2),pw-x0,Math.abs(y2-y));c.globalAlpha=1}
      c.fillStyle=fc[k3];c.fillText(String(l)+' ('+pcPx(pr)+')',x0+4,y-3)});c.strokeStyle=color;c.setLineDash([3,3]);c.beginPath();c.moveTo(P[0].x,P[0].y);c.lineTo(P[1].x,P[1].y);c.stroke();c.setLineDash([])}
  else if(d.type==='long'||d.type==='short'){var e=d.p[0].price,s=d.p[1].price,rr=d.rr||2,tg=e+(e-s)*rr,xa=P[0].x,xb=P[1].x;if(Math.abs(xb-xa)<12)xb=xa+pcBw()*15;var xl=Math.min(xa,xb),wd=Math.abs(xb-xa),ye=pcY(e),ys=pcY(s),yt=pcY(tg);
    c.fillStyle='rgba(242,54,69,.18)';c.fillRect(xl,Math.min(ye,ys),wd,Math.abs(ys-ye));c.fillStyle='rgba(8,153,129,.18)';c.fillRect(xl,Math.min(ye,yt),wd,Math.abs(yt-ye));
    c.strokeStyle='#787b86';c.beginPath();c.moveTo(xl,ye);c.lineTo(xl+wd,ye);c.stroke();c.font='600 11px system-ui,sans-serif';
    var tl=pcTr('Στόχος')+' '+pcPx(tg)+' ('+(((tg-e)/e*100)>=0?'+':'')+fmt((tg-e)/e*100,2)+'%) · '+fmt(rr,2)+'R',sl='Stop '+pcPx(s)+' ('+(((s-e)/e*100)>=0?'+':'')+fmt((s-e)/e*100,2)+'%)';
    c.fillStyle='#089981';c.fillText(tl,xl+4,yt+(yt<ye?13:-4));c.fillStyle='#f23645';c.fillText(sl,xl+4,ys+(ys>ye?-4:13));c.fillStyle=col.fg;c.fillText((d.type==='long'?'Long ':'Short ')+pcPx(e)+' · R:R 1:'+fmt(rr,2),xl+4,ye-4);c.font='11px system-ui,sans-serif';
    if(act){c.fillStyle='#089981';c.fillRect(xl+wd/2-5,yt-3,10,6)}}
  else if(d.type==='text'){c.font='600 13px system-ui,sans-serif';var tw=c.measureText(d.text||'').width;if(act){c.globalAlpha=.15;c.fillRect(P[0].x-3,P[0].y-15,tw+6,20);c.globalAlpha=1}c.fillStyle=color;c.fillText(d.text||'',P[0].x,P[0].y);c.font='11px system-ui,sans-serif'}
  else if(d.type==='measure'){var dp=d.p[1].price-d.p[0].price,pct=dp/d.p[0].price*100,nb=Math.round(pcI(d.p[1].t)-pcI(d.p[0].t)),upm=dp>=0;c.fillStyle=upm?'rgba(41,98,255,.14)':'rgba(242,54,69,.14)';c.fillRect(Math.min(P[0].x,P[1].x),Math.min(P[0].y,P[1].y),Math.abs(P[1].x-P[0].x),Math.abs(P[1].y-P[0].y));
    var lab=(dp>=0?'+':'')+pcPx(dp)+' ('+(pct>=0?'+':'')+fmt(pct,2)+'%) · '+nb+' '+pcTr('κεριά'),lw=c.measureText(lab).width+12,lx=(P[0].x+P[1].x)/2-lw/2,lyy=Math.max(P[0].y,P[1].y)+6;c.fillStyle=upm?'#2962ff':'#f23645';c.fillRect(lx,lyy,lw,20);c.fillStyle='#fff';c.fillText(lab,lx+6,lyy+14)}
  if(act&&d.type!=='measure'){c.fillStyle=col.bg;c.strokeStyle=color;c.lineWidth=1.5;P.forEach(function(p){c.beginPath();c.arc(p.x,p.y,4.5,0,Math.PI*2);c.fill();c.stroke()})}
  c.lineWidth=1}
function pcSegD(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l)):0;return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))}
function pcHit(x,y){var c=PC.c;
  for(var k=PC.draws.length-1;k>=0;k--){var d=PC.draws[k],P=d.p.map(function(q){return {x:pcX(pcI(q.t)),y:pcY(q.price)}}),hit=false;
    if(k===PC.sel){for(var h=0;h<P.length;h++)if(Math.hypot(x-P[h].x,y-P[h].y)<10)return {i:k,part:'h'+h};
      if(d.type==='long'||d.type==='short'){var e=d.p[0].price,s=d.p[1].price,tg=e+(e-s)*(d.rr||2),yt=pcY(tg);if(Math.abs(y-yt)<7)return {i:k,part:'tg'}}}
    var minx=Math.min.apply(null,P.map(function(p){return p.x})),maxx=Math.max.apply(null,P.map(function(p){return p.x})),miny=Math.min.apply(null,P.map(function(p){return p.y})),maxy=Math.max.apply(null,P.map(function(p){return p.y}));
    switch(d.type){
      case 'trend':hit=pcSegD(x,y,P[0].x,P[0].y,P[1].x,P[1].y)<7;break;
      case 'ray':var dx=P[1].x-P[0].x,dy=P[1].y-P[0].y,kk=dx||dy?4000/Math.hypot(dx,dy):0;hit=pcSegD(x,y,P[0].x,P[0].y,P[0].x+dx*kk,P[0].y+dy*kk)<7;break;
      case 'hline':hit=Math.abs(y-P[0].y)<7;break;
      case 'hray':hit=Math.abs(y-P[0].y)<7&&x>=P[0].x-5;break;
      case 'ext':var ex2=P[1].x-P[0].x,ey2=P[1].y-P[0].y,ek2=ex2||ey2?4000/Math.hypot(ex2,ey2):0;hit=pcSegD(x,y,P[0].x-ex2*ek2,P[0].y-ey2*ek2,P[0].x+ex2*ek2,P[0].y+ey2*ek2)<7;break;
      case 'chan':if(P.length>2){var of2=d.p[2].price-d.p[0].price,y0b=pcY(d.p[0].price+of2),y1b=pcY(d.p[1].price+of2);hit=pcSegD(x,y,P[0].x,P[0].y,P[1].x,P[1].y)<7||pcSegD(x,y,P[0].x,y0b,P[1].x,y1b)<7;
        if(!hit&&x>=Math.min(P[0].x,P[1].x)&&x<=Math.max(P[0].x,P[1].x)){var f=(x-P[0].x)/((P[1].x-P[0].x)||1),ya=P[0].y+(P[1].y-P[0].y)*f,yb=y0b+(y1b-y0b)*f;hit=y>=Math.min(ya,yb)&&y<=Math.max(ya,yb)}}break;
      case 'vline':hit=Math.abs(x-P[0].x)<7;break;
      case 'rect':hit=x>=minx-5&&x<=maxx+5&&y>=miny-5&&y<=maxy+5;break;
      case 'fib':hit=x>=minx-5&&y>=miny-5&&y<=maxy+5;break;
      case 'long':case 'short':var e2=d.p[0].price,s2=d.p[1].price,t2=e2+(e2-s2)*(d.rr||2),xb=Math.abs(maxx-minx)<12?minx+pcBw()*15:maxx,ys=[pcY(e2),pcY(s2),pcY(t2)];hit=x>=minx-4&&x<=xb+4&&y>=Math.min.apply(null,ys)-4&&y<=Math.max.apply(null,ys)+4;break;
      case 'text':c.font='600 13px system-ui,sans-serif';var tw=c.measureText(d.text||'').width;c.font='11px system-ui,sans-serif';hit=x>=P[0].x-4&&x<=P[0].x+tw+4&&y>=P[0].y-16&&y<=P[0].y+5;break}
    if(hit)return {i:k,part:'body'}}
  return null}
function pcPtAt(x,y,snap){var i=Math.round(pcIdx(x)),p=pcP(y);if(snap&&PC.magnet&&i>=0&&i<PC.raw.length){var b=PC.raw[i],best=p,bd=1e9;(PC.closeOnly?[b.c]:[b.o,b.h,b.l,b.c]).forEach(function(v){var dd=Math.abs(pcY(v)-y);if(dd<bd){bd=dd;best=v}});if(bd<22)p=best}return {t:pcT(i),price:p}}
function pcSnap(){PC.hist.push(JSON.stringify(PC.draws));if(PC.hist.length>40)PC.hist.shift()}
function pcUndo(){if(!PC.hist.length)return;PC.draws=JSON.parse(PC.hist.pop());PC.sel=-1;pcSelBar();pcDirty();pcRender()}
function pcAdd(d){pcSnap();d.id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);if(!d.color)d.color=d.type==='fib'?'#f0a202':d.type==='hline'?'#9c27b0':PC_COLS[0];PC.draws.push(d);if(PC.draws.length>200)PC.draws.shift();PC.sel=PC.draws.length-1;pcDirty();pcSelBar();pcRender()}
function pcFinish(){var d=PC.tmp;PC.tmp=null;if(!d)return;delete d.down;delete d.x0;delete d.y0;
  if(d.type==='measure'){PC.meas=d;pcTool('cursor');pcRender();return}
  if(d.type==='chan'){var rng=(PC.ps.hi-PC.ps.lo)*.12;d.p[2]={t:d.p[0].t,price:d.p[0].price-rng}}
  if(d.type==='long'||d.type==='short'){var e=d.p[0].price,s=d.p[1].price,L=d.type==='long';if(L&&s>=e)s=e-(s-e);if(!L&&s<=e)s=e+(e-s);if(s===e)s=e*(L?.99:1.01);d.p[1].price=s;d.rr=2}
  pcAdd(d);pcTool('cursor')}
function pcDel(){if(PC.sel<0)return;pcSnap();PC.draws.splice(PC.sel,1);PC.sel=-1;pcSelBar();pcDirty();pcRender()}
function pcDirty(){clearTimeout(PC.saveT);PC.saveT=setTimeout(function(){PC.saveT=null;pcSaveDraws()},1200)}

/* ---------- interaction ---------- */
function pcLocal(e){var r=PC.cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function pcDown(e){if(!PC.raw.length||e.button>0)return;try{PC.cv.setPointerCapture(e.pointerId)}catch(x){}PC.root.focus({preventScroll:true});var m=pcLocal(e);PC.ptrs[e.pointerId]=m;PC.over=true;
  var ids=Object.keys(PC.ptrs);if(ids.length===2){var ps=ids.map(function(k){return PC.ptrs[k]});PC.pinch={d:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)||1,from:PC.from,to:PC.to,cx:(ps[0].x+ps[1].x)/2};PC.drag=null;return}
  PC.mouse=m;var L=PC.lay,inMain=m.x<L.pw&&m.y<L.main.y+L.main.h;
  if(PC.tool!=='cursor'&&inMain){var pt=pcPtAt(m.x,m.y,true),tl=PC.tool;PC.meas=null;
    if(tl==='hline'||tl==='vline'||tl==='hray'){pcAdd({type:tl,p:[pt]});pcTool('cursor');return}
    if(tl==='text'){pcTextInput(m,pt);return}
    if(!PC.tmp){PC.tmp={type:tl,p:[pt,{t:pt.t,price:pt.price}],x0:m.x,y0:m.y,down:true};pcRender();return}
    PC.tmp.p[1]=pt;pcFinish();return}
  if(m.x>=L.pw){PC.drag={kind:'pan',start:m,from:PC.from,to:PC.to};return}
  var h=inMain?pcHit(m.x,m.y):null;
  if(h){PC.sel=h.i;pcSnap();PC.drag={kind:'draw',part:h.part,orig:JSON.parse(JSON.stringify(PC.draws[h.i])),i0:pcIdx(m.x),p0:pcP(m.y),moved:false};pcSelBar();pcRender();return}
  if(PC.sel>=0){PC.sel=-1;pcSelBar()}PC.meas=null;
  PC.drag={kind:'pan',start:m,from:PC.from,to:PC.to};pcRender()}
function pcMove(e){var m=pcLocal(e);if(PC.ptrs[e.pointerId])PC.ptrs[e.pointerId]=m;
  if(PC.pinch&&Object.keys(PC.ptrs).length>=2){var ps=Object.keys(PC.ptrs).map(function(k){return PC.ptrs[k]}),d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)||1;pcZoomTo(PC.pinch.from,PC.pinch.to,PC.pinch.d/d,PC.pinch.cx);pcRender();return}
  PC.mouse=m;PC.over=true;var D=PC.drag;
  if(D&&D.kind==='pan'){var bw=PC.lay.pw/(D.to-D.from),sh=(m.x-D.start.x)/bw;PC.from=D.from-sh;PC.to=D.to-sh;pcClamp()}
  else if(D&&D.kind==='draw'){var d0=D.orig,cur=PC.draws[PC.sel];if(!cur)return;D.moved=true;
    if(D.part==='body'){var di=Math.round(pcIdx(m.x)-D.i0),dp=pcP(m.y)-D.p0;cur.p=d0.p.map(function(q){return {t:cur.type==='hline'?q.t:pcT(pcI(q.t)+di),price:cur.type==='vline'?q.price:q.price+dp}})}
    else if(cur.type==='chan'&&D.part==='h2'){var f2=(pcIdx(m.x)-pcI(cur.p[0].t))/((pcI(cur.p[1].t)-pcI(cur.p[0].t))||1),la=cur.p[0].price+(cur.p[1].price-cur.p[0].price)*f2;cur.p[2]={t:cur.p[0].t,price:cur.p[0].price+(pcP(m.y)-la)}}
    else if(cur.type==='chan'&&D.part==='h0'){var npc=pcPtAt(m.x,m.y,true),ofc=d0.p[2].price-d0.p[0].price;cur.p[0]=npc;cur.p[2]={t:npc.t,price:npc.price+ofc}}
    else if(D.part==='tg'){var e2=cur.p[0].price,s2=cur.p[1].price;cur.rr=Math.max(.1,Math.round((pcP(m.y)-e2)/(e2-s2)*100)/100)}
    else{var hi=+D.part.slice(1),np=pcPtAt(m.x,m.y,true);if(cur.type==='long'||cur.type==='short'){if(hi===1){var e3=cur.p[0].price;if(cur.type==='long'&&np.price>=e3)np.price=e3*.999;if(cur.type==='short'&&np.price<=e3)np.price=e3*1.001}}cur.p[hi]=np}}
  else if(PC.tmp){PC.tmp.p[1]=pcPtAt(m.x,m.y,true)}
  else if(PC.tool==='cursor'&&!D){var h=m.x<PC.lay.pw&&m.y<PC.lay.main.y+PC.lay.main.h?pcHit(m.x,m.y):null;PC.cv.style.cursor=h?(h.part==='body'?'move':'grab'):'crosshair'}
  pcRender()}
function pcUp(e){delete PC.ptrs[e.pointerId];if(PC.pinch){if(Object.keys(PC.ptrs).length<2)PC.pinch=null;return}
  var m=pcLocal(e);if(PC.tmp&&PC.tmp.down){PC.tmp.down=false;if(Math.hypot(m.x-PC.tmp.x0,m.y-PC.tmp.y0)>10){PC.tmp.p[1]=pcPtAt(m.x,m.y,true);pcFinish()}}
  if(PC.drag&&PC.drag.kind==='draw'){if(PC.drag.moved)pcDirty();else PC.hist.pop()}PC.drag=null;if(e.pointerType!=='mouse'){PC.over=false}pcRender()}
function pcWheel(e){if(!PC.raw.length)return;e.preventDefault();var m=pcLocal(e);if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){var bw=pcBw();PC.from+=e.deltaX/bw;PC.to+=e.deltaX/bw;pcClamp();pcRender();return}
  pcZoomTo(PC.from,PC.to,Math.exp(e.deltaY*(e.deltaMode===1?.05:.0016)),Math.min(m.x,PC.lay.pw));pcRender()}
function pcKey(e){var tg=e.target;if(tg&&/INPUT|TEXTAREA|SELECT/.test(tg.tagName))return;
  if((e.key==='Delete'||e.key==='Backspace')&&PC.sel>=0){e.preventDefault();pcDel();return}
  if(e.key==='Escape'){PC.tmp=null;PC.meas=null;PC.sel=-1;pcTool('cursor');pcSelBar();pcRender();return}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();pcUndo()}}
function pcTextInput(m,pt){var old=PC.root.querySelector('.pc-txt');if(old)old.remove();var inp=document.createElement('input');inp.className='pc-txt';inp.maxLength=80;inp.placeholder=pcTr('Γράψε σημείωση και Enter');
  inp.style.left=Math.min(m.x,PC.lay.pw-180)+'px';inp.style.top=Math.max(0,m.y-14)+'px';PC.wrap.appendChild(inp);setTimeout(function(){inp.focus()},0);var done=false;
  var fin=function(ok){if(done)return;done=true;var v=inp.value.trim();inp.remove();if(ok&&v)pcAdd({type:'text',p:[pt],text:v});pcTool('cursor')};
  inp.addEventListener('keydown',function(ev){ev.stopPropagation();if(ev.key==='Enter')fin(true);if(ev.key==='Escape')fin(false)});inp.addEventListener('blur',function(){fin(true)})}
function pcTool(t){PC.tool=t;if(t!=='cursor'){PC.sel=-1;pcSelBar()}if(PC.root)PC.root.querySelectorAll('[data-pct]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-pct')===t?'true':'false')});if(PC.cv)PC.cv.style.cursor='crosshair'}
function pcSelBar(){var el=PC.root&&PC.root.querySelector('.pc-sel');if(!el)return;var d=PC.draws[PC.sel];if(!d){el.hidden=true;el.innerHTML='';return}el.hidden=false;
  var h=PC_COLS.map(function(cc){return '<button type="button" class="pc-sw'+(d.color===cc?' on':'')+'" style="background:'+cc+'" data-pccol="'+cc+'" aria-label="'+cc+'"></button>'}).join('');
  if(d.type==='long'||d.type==='short')h+='<label class="pc-rr">R:R 1:<input type="number" min="0.1" step="0.1" value="'+(d.rr||2)+'" data-pcrr="1"></label><button type="button" class="btn small" data-pcdemo="1">'+esc(pcTr('Άνοιξε σε demo'))+'</button>';
  if(d.type==='text')h+='<input class="pc-tedit" value="'+esc(d.text||'')+'" maxlength="80" data-pctext="1" aria-label="'+esc(pcTr('Κείμενο'))+'">';
  h+='<button type="button" class="btn small" data-pcdel="1">'+esc(pcTr('Διαγραφή'))+'</button>';el.innerHTML=h}

/* ---------- data + persistence ---------- */
function pcSetData(sym,bars,opt){opt=opt||{};var oldFirst=PC.raw.length?PC.raw[0].t:null,same=sym===PC.sym,wasEmpty=!PC.raw.length,srcCh=(opt.src||'')!==PC.src||(opt.tf||'')!==PC.tf,atEnd=same&&PC.raw.length&&PC.to>=PC.raw.length-1;PC.raw=bars||[];PC.closeOnly=!!opt.closeOnly;PC.src=opt.src||'';PC.tf=opt.tf||'';PC.empty=opt.empty||'';PC.tfMs=opt.tfMs||0;
  clearInterval(PC.cdT);PC.cdT=PC.tfMs?setInterval(function(){if(!document.hidden&&PC.root&&PC.root.offsetParent&&!PC.drag)pcRender()},1000):null;
  var df=[];for(var i=1;i<Math.min(PC.raw.length,80);i++)df.push(PC.raw[i].t-PC.raw[i-1].t);df.sort(function(a,b){return a-b});PC.iv=df.length?df[df.length>>1]:36e5;
  if(!same){PC.sym=sym;PC.sel=-1;PC.tmp=null;PC.meas=null;PC.hist=[];pcLoadDraws();pcFit();pcSelBar()}else if(atEnd||wasEmpty||srcCh||!PC.raw.length||PC.from>PC.raw.length)pcFit();else if(oldFirst!=null){var k0=0;while(k0<PC.raw.length&&PC.raw[k0].t<oldFirst)k0++;if(k0){PC.from+=k0;PC.to+=k0}}
  pcCalc();PC.bars=pcDisplayBars();pcUi();pcRender()}
function pcDrawKey(){return 'tj-draw-'+String(PC.sym||'').replace(/[^A-Za-z0-9._-]/g,'_')}
function pcLoadDraws(){var items=null;try{if(typeof S!=='undefined'&&S.db&&S.drawings){var id=safeSeg((S.uid||'me')+'_'+PC.sym),doc=S.drawings.find(function(x){return x.id===id});if(doc)items=doc.items}}catch(e){}
  if(!items){try{items=JSON.parse(localStorage.getItem(pcDrawKey())||'null')}catch(e){}}PC.draws=Array.isArray(items)?items.filter(function(d){return d&&d.p&&d.p.length}):[]}
function pcSaveDraws(){var items=PC.draws.map(function(d){var o={id:d.id,type:d.type,p:d.p.map(function(q){return {t:Math.round(q.t),price:+(+q.price).toPrecision(10)}}),color:d.color};if(d.rr)o.rr=d.rr;if(d.text)o.text=d.text;return o});
  try{localStorage.setItem(pcDrawKey(),JSON.stringify(items))}catch(e){}
  try{if(typeof S!=='undefined'&&S.db&&typeof qCanSave==='function'&&qCanSave()&&PC.sym)put('drawings',safeSeg(S.uid+'_'+PC.sym),{by:S.uid,sym:PC.sym,items:items,at:Date.now()}).catch(function(){})}catch(e){}}
function pcOnDrawSnap(){if(PC.saveT||PC.drag||PC.tmp||!PC.sym)return;var before=JSON.stringify(PC.draws.map(function(d){return d.id}));pcLoadDraws();if(JSON.stringify(PC.draws.map(function(d){return d.id}))!==before||true){if(PC.sel>=PC.draws.length)PC.sel=-1;pcRender()}}
function pcUi(){if(!PC.root)return;var k=PC.root.querySelector('[data-pckind]');if(k){k.value=PC.kind;k.title=PC.closeOnly?pcTr('Μόνο τιμές κλεισίματος: για κεριά φόρτωσε OHLC'):''}
  PC.root.querySelectorAll('[data-pcind]').forEach(function(cb){var key=cb.getAttribute('data-pcind');cb.checked=!!PC.ind[key];cb.disabled=!pcIndOk(key);cb.parentNode.classList.toggle('dis',!pcIndOk(key))});
  var mg=PC.root.querySelector('[data-pcmag]');if(mg)mg.setAttribute('aria-pressed',PC.magnet?'true':'false');pcTool(PC.tool)}
function pcIcon(k){return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+PC_ICON[k]+'</svg>'}
function pcSetTfs(list,cur,cb){PC.tfs=list?{list:list,cur:cur,cb:cb}:null;if(!PC.root)return;var el=PC.root.querySelector('.pc-tfs');if(!list){el.hidden=true;el.innerHTML='';return}el.hidden=false;el.innerHTML=list.map(function(x){return '<button type="button" data-pctf="'+esc(x[0])+'" aria-pressed="'+(x[0]===cur)+'">'+esc(x[1])+'</button>'}).join('')}
function pcMount(host){
  if(!PC.root){var r=document.createElement('div');r.className='pc';r.tabIndex=0;r.setAttribute('aria-label',pcTr('Γράφημα τιμών με εργαλεία σχεδίασης'));
    r.innerHTML='<div class="pc-top"><div class="pc-tfs" hidden></div><select class="dmsel" data-pckind aria-label="'+esc(pcTr('Τύπος γραφήματος'))+'">'+PC_KINDS.map(function(k){return '<option value="'+k[0]+'">'+esc(pcTr(k[1]))+'</option>'}).join('')+'</select>'+
      '<div class="pc-indw"><button type="button" class="btn small" data-pcindbtn aria-expanded="false">'+esc(pcTr('Δείκτες'))+' ▾</button><div class="pc-ind" hidden>'+PC_IND.map(function(k){return '<label><input type="checkbox" data-pcind="'+k[0]+'"> <span>'+esc(pcTr(k[1]))+'</span>'+(k[2]?'<small>OHLC</small>':'')+'</label>'}).join('')+'</div></div>'+
      '<button type="button" class="btn small pc-ib" data-pcmag aria-pressed="true" title="'+esc(pcTr('Μαγνήτης: κολλάει στα O/H/L/C'))+'">🧲</button><button type="button" class="btn small pc-ib" data-pcundo title="'+esc(pcTr('Αναίρεση'))+'">↶</button><button type="button" class="btn small pc-ib" data-pcfit title="'+esc(pcTr('Επαναφορά προβολής'))+'">⟲</button><button type="button" class="btn small pc-ib" data-pcclear title="'+esc(pcTr('Σβήσε όλα τα σχέδια'))+'">🗑</button><button type="button" class="btn small pc-ib" data-pcfull title="'+esc(pcTr('Πλήρης οθόνη'))+'">⛶</button>'+
      '<div class="pc-sel" hidden></div></div><div class="pc-tools">'+PC_TOOLS.map(function(t){if(t==='|')return '<span class="pc-sep"></span>';return '<button type="button" data-pct="'+t[0]+'" title="'+esc(pcTr(t[1]))+'" aria-label="'+esc(pcTr(t[1]))+'" aria-pressed="false">'+pcIcon(t[0])+'</button>'}).join('')+'</div><div class="pc-wrap"><canvas></canvas></div>';
    PC.root=r;PC.wrap=r.querySelector('.pc-wrap');PC.cv=r.querySelector('canvas');PC.c=PC.cv.getContext('2d');
    PC.cv.addEventListener('pointerdown',pcDown);PC.cv.addEventListener('pointermove',pcMove);PC.cv.addEventListener('pointerup',pcUp);PC.cv.addEventListener('pointercancel',pcUp);
    PC.cv.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'&&!PC.drag){PC.over=false;pcRender()}});PC.cv.addEventListener('wheel',pcWheel,{passive:false});PC.cv.addEventListener('dblclick',function(){pcFit();pcRender()});
    r.addEventListener('keydown',pcKey);
    r.addEventListener('click',function(e){var t=e.target,b;
      if((b=t.closest('[data-pctf]'))){if(PC.tfs&&PC.tfs.cb)PC.tfs.cb(b.getAttribute('data-pctf'));return}
      if((b=t.closest('[data-pct]'))){pcTool(b.getAttribute('data-pct'));PC.tmp=null;pcRender();return}
      if(t.closest('[data-pcindbtn]')){var box=r.querySelector('.pc-ind');box.hidden=!box.hidden;t.closest('[data-pcindbtn]').setAttribute('aria-expanded',box.hidden?'false':'true');return}
      if(t.closest('[data-pcmag]')){PC.magnet=!PC.magnet;pcPrefs();pcUi();return}
      if(t.closest('[data-pcundo]')){pcUndo();return}
      if(t.closest('[data-pcfit]')){pcFit();pcRender();return}
      if((b=t.closest('[data-pcclear]'))){if(!PC.draws.length)return;if(!b.dataset.armed){b.dataset.armed='1';b.textContent='✓?';setTimeout(function(){delete b.dataset.armed;b.textContent='🗑'},3000);return}delete b.dataset.armed;b.textContent='🗑';pcSnap();PC.draws=[];PC.sel=-1;pcSelBar();pcDirty();pcRender();return}
      if(t.closest('[data-pcfull]')){PC.full=!PC.full;r.classList.toggle('full',PC.full);document.body.classList.toggle('pc-full-on',PC.full);setTimeout(pcResize,30);return}
      if((b=t.closest('[data-pccol]'))){var d=PC.draws[PC.sel];if(d){pcSnap();d.color=b.getAttribute('data-pccol');pcDirty();pcSelBar();pcRender()}return}
      if(t.closest('[data-pcdel]')){pcDel();return}
      if(t.closest('[data-pcdemo]')){var d2=PC.draws[PC.sel];if(d2&&typeof pcToDemo==='function')pcToDemo(d2);return}});
    r.addEventListener('change',function(e){var t=e.target;
      if(t.hasAttribute('data-pckind')){PC.kind=t.value;pcPrefs();PC.bars=pcDisplayBars();pcRender();return}
      if(t.hasAttribute('data-pcind')){PC.ind[t.getAttribute('data-pcind')]=t.checked;pcPrefs();pcRender();return}
      if(t.hasAttribute('data-pcrr')){var d=PC.draws[PC.sel];var v=parseFloat(String(t.value).replace(',','.'));if(d&&v>0){pcSnap();d.rr=v;pcDirty();pcRender()}return}
      if(t.hasAttribute('data-pctext')){var d3=PC.draws[PC.sel];if(d3){pcSnap();d3.text=t.value.slice(0,80);pcDirty();pcRender()}}});
    document.addEventListener('click',function(e){var box=r.querySelector('.pc-ind');if(box&&!box.hidden&&!e.target.closest('.pc-indw')){box.hidden=true}});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&PC.full){PC.full=false;r.classList.remove('full');document.body.classList.remove('pc-full-on');setTimeout(pcResize,30)}});
    if(window.ResizeObserver)new ResizeObserver(function(){pcResize()}).observe(PC.wrap);else window.addEventListener('resize',pcResize);
  }
  if(host&&PC.root.parentNode!==host)host.appendChild(PC.root);pcUi();setTimeout(pcResize,0)}
function pcResize(){if(!PC.wrap)return;var w=PC.wrap.clientWidth,h=PC.wrap.clientHeight;if(!w||!h)return;PC.dpr=Math.min(2,window.devicePixelRatio||1);PC.W=w;PC.H=h;PC.cv.width=Math.round(w*PC.dpr);PC.cv.height=Math.round(h*PC.dpr);pcRender()}
function pcOhlcKey(sym){return 'tj-ohlc-'+String(sym).replace(/[^A-Za-z0-9._-]/g,'_')}
function pcOhlcGet(sym){if(PC.ohlc[sym])return PC.ohlc[sym];try{var o=JSON.parse(localStorage.getItem(pcOhlcKey(sym))||'null');if(o&&o.b&&o.b.length){PC.ohlc[sym]={bars:o.b.map(function(r){return {t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5]==null?NaN:r[5]}}),src:o.s,tf:o.tf};return PC.ohlc[sym]}}catch(e){}return null}
function pcOhlcSet(sym,bars,src){var df=[];for(var i=1;i<Math.min(bars.length,80);i++)df.push(bars[i].t-bars[i-1].t);var tf=df.length?intLabel(median(df)):'';PC.ohlc[sym]={bars:bars,src:src,tf:tf};
  try{localStorage.setItem(pcOhlcKey(sym),JSON.stringify({s:src,tf:tf,b:bars.slice(-3000).map(function(b){return [b.t,b.o,b.h,b.l,b.c,isFinite(b.v)?b.v:null]})}))}catch(e){}}
function pcOhlcDel(sym){delete PC.ohlc[sym];try{localStorage.removeItem(pcOhlcKey(sym))}catch(e){}}
/* ----- Crypto.com: αυτόματα κεριά (50 ανά κλήση, κρατιούνται και ενώνονται τοπικά) ----- */
var CC={sub:null,key:'',inst:{},bad:{},tf:'1h',tool:'get_candlestick',at:0,bfd:{},last:null};
var CC_BF={'1m':'1','5m':'1','15m':'1','30m':'7','1h':'7','4h':'30','1D':'365','7D':'max'};
try{CC.tf=localStorage.getItem('tj-cctf')||'1h';CC.inst=JSON.parse(localStorage.getItem('tj-ccinst')||'{}')||{}}catch(e){}
var CC_TFMS={'1m':6e4,'5m':3e5,'15m':9e5,'30m':18e5,'1h':36e5,'4h':144e5,'1D':864e5,'7D':6048e5};
var CC_TFL=[['1m','1m'],['5m','5m'],['15m','15m'],['30m','30m'],['1h','1h'],['4h','4h'],['1D','1D'],['7D','1W']],CG_TFL=[['1','24h'],['7','7D'],['30','1M'],['90','3M'],['365','1Y']];
function ccHistKey(inst,tf){return 'tj-cc-'+inst+'-'+tf}
function ccParse(pl){var d=pl&&(Array.isArray(pl.data)?pl.data:pl.result&&Array.isArray(pl.result.data)?pl.result.data:null);if(!d)return null;
  return d.map(function(x){return {t:Date.parse(x.timestamp),o:+x.open,h:+x.high,l:+x.low,c:+x.close,v:+x.volume}}).filter(function(b){return isFinite(b.t)&&isFinite(b.o)&&isFinite(b.h)&&isFinite(b.l)&&isFinite(b.c)}).sort(function(a,b){return a.t-b.t})}
function ccCached(inst,tf){try{return (JSON.parse(localStorage.getItem(ccHistKey(inst,tf))||'[]')||[]).map(function(r){return {t:r[0],o:r[1],h:r[2],l:r[3],c:r[4],v:r[5]}})}catch(e){return []}}
function ccMerge(inst,tf,fresh){var old=ccCached(inst,tf),ms=CC_TFMS[tf]||36e5;if(old.length&&fresh.length&&fresh[0].t-old[old.length-1].t>ms*1.5)old=[];
  var m={};old.concat(fresh).forEach(function(b){m[b.t]=b});var arr=Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return a.t-b.t}).slice(-1500);
  try{localStorage.setItem(ccHistKey(inst,tf),JSON.stringify(arr.map(function(b){return [b.t,b.o,b.h,b.l,b.c,isFinite(b.v)?b.v:0]})))}catch(e){}return arr}
function ccTfFor(first){var span=Date.now()-first,L=['1m','5m','15m','30m','1h','4h','1D','7D'];for(var i=0;i<L.length;i++)if(span+CC_TFMS[L[i]]*3<CC_TFMS[L[i]]*50)return L[i];return '7D'}
/* shared candle cache: members with the Crypto.com connector save candles to the db so invited guests (no connectors) can train too */
var SHB={idx:null,saved:{},mem:{},q:Promise.resolve(),seeding:false};
function shbKey(inst,tf){return safeSeg(inst+'__'+tf)}
function shbLoadIdx(force){if(!S.db)return Promise.resolve({});if(SHB.idx&&!force)return Promise.resolve(SHB.idx);return S.db.collection('bars').doc('_index').get().then(function(sn){SHB.idx=(sn.exists&&sn.data()&&sn.data().k)||{};return SHB.idx}).catch(function(){SHB.idx=SHB.idx||{};return SHB.idx})}
function shbSave(inst,tf,bars,cap){if(!S.db||S.canWrite===false||!S.uid||S.uid==='me')return;var k=shbKey(inst,tf),now=Date.now();if(SHB.saved[k]&&now-SHB.saved[k]<20*60000)return;
  var B=bars.filter(function(b){return !b.approx&&isFinite(b.o)&&isFinite(b.c)}).slice(-(cap||1200));if(B.length<30)return;SHB.saved[k]=now;
  var d={inst:inst,tf:tf,at:now,n:B.length,b:B.map(function(b){return [b.t,+b.o,+b.h,+b.l,+b.c,+(b.v||0)]})};
  SHB.q=SHB.q.then(function(){return S.db.collection('bars').doc(k).set(d)}).then(function(){return shbLoadIdx(true)}).then(function(idx){var o=JSON.parse(JSON.stringify(idx||{}));o[k]={inst:inst,tf:tf,at:now,n:B.length};SHB.idx=o;return S.db.collection('bars').doc('_index').set({k:o,at:now})}).catch(function(){})}
function shbGet(base,tf){if(!S.db)return Promise.reject({code:'no_shared'});var cands=[base+'_USDT',base+'_USD'];
  var tryI=function(i){if(i>=cands.length)return Promise.reject({code:'no_shared'});var k=shbKey(cands[i],tf),m=SHB.mem[k];if(m&&Date.now()-m.got<300000)return Promise.resolve(m.r);
    return S.db.collection('bars').doc(k).get().then(function(sn){if(!sn.exists)return tryI(i+1);var d=sn.data()||{},bars=(d.b||[]).map(function(a){return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4],v:a[5]}});if(bars.length<10)return tryI(i+1);var r={inst:d.inst||cands[i],bars:bars,shared:true,at:d.at};SHB.mem[k]={got:Date.now(),r:r};return r})};
  return tryI(0)}
function shbPick(coin,tf,minN){var idx=SHB.idx||{},L=Object.keys(idx).map(function(k){return idx[k]}).filter(function(x){if(!x||!x.inst||(x.n||0)<(minN||40))return false;var c=x.inst.split('_')[0];return (!coin||c===coin)&&(!tf||x.tf===tf)&&RPCOINS.indexOf(c)>=0});
  if(!L.length)return null;var x=L[Math.floor(Math.random()*L.length)];return {coin:x.inst.split('_')[0],tf:x.tf}}
function shbSeed(){if(SHB.seeding||!CG.mcp||!S.db||S.canWrite===false||!S.uid||S.uid==='me')return;SHB.seeding=true;
  shbLoadIdx(true).then(function(idx){var now=Date.now(),todo=[];RPCOINS.forEach(function(c){RPTF.forEach(function(tf){var e=idx[shbKey(c+'_USDT',tf)]||idx[shbKey(c+'_USD',tf)];if(!e||now-e.at>3*3600000)todo.push([c,tf])})});todo=todo.slice(0,24);
    var i=0;(function next(){if(i>=todo.length)return;var x=todo[i++];ccFetchBars(x[0]+'USDT',x[1]).catch(function(){}).then(function(){setTimeout(next,1500)})})()})}
/* deep free history: Gemini public candles (≈1.400 × 1h = 60 days) through the claude.ai connector, shared with guests via the db */
var GM={tf:{'1h':'1hr','6h':'6hr','1D':'1day'},ms:{'1h':36e5,'6h':216e5,'1D':864e5},bad:null,mem:{},srv:'Gemini',err:null,diag:null,ok:0};
function gmDiag(){if(!CG.mcp||!CG.mcp.listTools)return Promise.resolve(null);return CG.mcp.listTools().then(function(r){var L=(r&&r.servers)||[],hit=L.find(function(x){return (x.tools||[]).some(function(t){return (t.name||t)==='gemini_list_candles'})});
  GM.diag={names:L.map(function(x){return x.server+(x.authStatus&&x.authStatus!=='connected'?' ('+x.authStatus+')':'')}),hit:hit?hit.server:null,auth:hit?hit.authStatus:null};if(hit)GM.srv=hit.server;return GM.diag}).catch(function(e){GM.diag={err:(e&&e.code)||'error',names:[]};return GM.diag})}
function gmFind(x,dep){if(dep>4||x==null)return null;
  if(typeof x==='string'){var a=x.indexOf('[['),z=x.lastIndexOf(']]');if(a<0||z<a)return null;try{return gmFind(JSON.parse(x.slice(a,z+2)),dep+1)}catch(e){return null}}
  if(Array.isArray(x)){if(x.length&&Array.isArray(x[0])&&x[0].length>=5&&isFinite(+x[0][0])&&isFinite(+x[0][4]))return x;
    if(x.length&&x[0]&&typeof x[0]==='object'){for(var j=0;j<Math.min(x.length,4);j++){var r0=gmFind(x[j].text!=null?x[j].text:x[j],dep+1);if(r0)return r0}}return null}
  if(typeof x==='object'){var ks=['payload','structuredContent','data','result','candles','content','text'];for(var i=0;i<ks.length;i++)if(x[ks[i]]!=null){var r=gmFind(x[ks[i]],dep+1);if(r)return r}}return null}
function gmParse(r,tf){var A=gmFind(r,0);if(!A)return null;var ms=GM.ms[tf]||36e5,now=Date.now();
  var B=A.map(function(a){var t=+a[0];if(t<1e12)t*=1000;return {t:t,o:+a[1],h:+a[2],l:+a[3],c:+a[4],v:+a[5]||0}}).filter(function(b){return isFinite(b.o)&&isFinite(b.c)&&b.h>=b.l&&b.t+ms<=now+60000}).sort(function(a,b){return a.t-b.t});
  var m={},o=[];B.forEach(function(b){if(!m[b.t]){m[b.t]=1;o.push(b)}});return o}
function gmFetch(base,tf){var gt=GM.tf[tf];if(!CG.mcp||!gt)return Promise.reject({code:'no_gemini'});if(GM.bad&&Date.now()-GM.bad.at<10*60000)return Promise.reject({code:GM.bad.code});
  var k=base+'|'+tf,m=GM.mem[k];if(m&&Date.now()-m.at<5*60000)return Promise.resolve(m.r);
  return CG.mcp.callTool(GM.srv,'gemini_list_candles',{symbol:base+'USD',time_frame:gt},{cache:{staleTime:120000,gcTime:900000}}).then(function(r){var bars=gmParse(r,tf);if(!bars||bars.length<30)throw {code:'parse',message:'κεριά: '+(bars?bars.length:0)};GM.bad=null;GM.err=null;GM.ok=Date.now();var o={inst:base+'_USD',bars:bars,src:'Gemini'};GM.mem[k]={at:Date.now(),r:o};try{shbSave(base+'_USD',tf,bars,1500)}catch(e){}return o})
    .catch(function(e){var c=(e&&e.code)||'tool_error';GM.err={code:c,msg:String((e&&e.message)||'').slice(0,140),at:Date.now()};if(/server_not_connected|server_not_found|needs_reauth|blocked_by_policy/.test(c))GM.bad={code:c,at:Date.now()};throw {code:c}})}
function shbDeep(base,tf){if(!S.db)return Promise.reject({code:'no_shared'});var ks=[base+'_USD',base+'_USDT'],best=null;
  return Promise.all(ks.map(function(inst){return S.db.collection('bars').doc(shbKey(inst,tf)).get().then(function(sn){if(!sn.exists)return;var d=sn.data()||{},bars=(d.b||[]).map(function(a){return {t:a[0],o:a[1],h:a[2],l:a[3],c:a[4],v:a[5]}});if(!best||bars.length>best.bars.length)best={inst:inst,bars:bars,shared:true,at:d.at,src:'κοινά κεριά'}}).catch(function(){})})).then(function(){if(!best||best.bars.length<10)throw {code:'no_shared'};return best})}
/* without Gemini: shared deep history (seeded once) + fresh Crypto.com candles appended, scaled to the history's price level, saved back so it keeps growing */
function deepJoin(deep,fresh,tf){var ms=GM.ms[tf]||CC_TFMS[tf]||36e5,now=Date.now();fresh=(fresh||[]).filter(function(b){return !b.approx&&b.t+ms<=now+60000});if(!deep.length)return {bars:fresh,gap:false};if(!fresh.length)return {bars:deep,gap:false};
  var dm={},rs=[];deep.forEach(function(b){dm[b.t]=b});fresh.forEach(function(b){var d=dm[b.t];if(d&&b.c>0)rs.push(d.c/b.c)});rs.sort(function(a,b){return a-b});var k=rs.length?rs[Math.floor(rs.length/2)]:1;if(!(k>0.8&&k<1.25))k=1;
  var last=deep[deep.length-1].t,add=fresh.filter(function(b){return b.t>last}).map(function(b){return {t:b.t,o:b.o*k,h:b.h*k,l:b.l*k,c:b.c*k,v:b.v}});
  var gap=add.length&&add[0].t-last>ms*1.5;if(gap&&!rs.length)return {bars:deep,gap:true};return {bars:deep.concat(gap?[]:add),gap:gap}}
function deepBars(sym,tf){var base=dmSym(sym).replace(/(USDT|USDC|USD|EUR)$/,'');if(!base)return Promise.reject({code:'not_found'});
  var sh=function(e){return shbDeep(base,tf).then(function(d){if(!CG.mcp||!CC_TFMS[tf])return d;
      return ccFetchBars(base+'USDT',tf).then(function(r){var j=deepJoin(d.bars,r.bars,tf);if(j.bars.length>d.bars.length&&d.inst===base+'_USD'){try{shbSave(base+'_USD',tf,j.bars,1500)}catch(x){}}return {inst:d.inst,bars:j.bars,src:'κοινό ιστορικό + Crypto.com',gap:j.gap}}).catch(function(){return d})})
    .catch(function(){if(!CG.mcp||!CC_TFMS[tf])throw e||{code:'no_shared'};return ccFetchBars(base+'USDT',tf).then(function(r){try{if(r.bars.length>=50)shbSave(r.inst.replace(/_USDT$/,'_USD'),tf,r.bars,1500)}catch(x){}return {inst:r.inst,bars:r.bars,src:'Crypto.com (χωρίς κοινό ιστορικό ακόμα)'}}).catch(function(){throw {code:'no_data_any'}})})};
  if(CG.mcp&&GM.tf[tf]&&!(GM.bad&&Date.now()-GM.bad.at<10*60000))return gmFetch(base,tf).catch(function(e){return sh(e)});return sh({code:CG.mcp?'no_gemini':'no_shared'})}
function gmErrText(e){var c=e&&e.code;if(c==='server_not_connected'||c==='server_not_found')return 'Το Gemini δεν είναι διαθέσιμο σε αυτόν τον λογαριασμό. Δεν χρειάζεσαι λογαριασμό στο Gemini: η σελίδα χρησιμοποιεί το κοινό ιστορικό και το συμπληρώνει με φρέσκα κεριά Crypto.com.';if(c==='no_gemini')return 'Το Gemini δεν έδωσε κεριά.';
  if(c==='not_in_manifest'||c==='approval_required'||c==='consent_required')return 'Η σελίδα χρειάζεται την άδειά σου για το Gemini: πάτα «Σύνδεση Gemini» στην κάρτα και μετά «Allow».';if(c==='parse')return 'Ήρθε απάντηση από το Gemini αλλά δεν μπόρεσα να τη διαβάσω.';
  if(c==='no_shared')return 'Δεν υπάρχουν ακόμα κοινά κεριά για αυτό το νόμισμα.';if(c==='no_data_any')return 'Δεν βρέθηκαν κεριά ούτε στο κοινό ιστορικό ούτε στο Crypto.com για αυτό το νόμισμα.';return 'Δεν ήρθαν κεριά από το Gemini για αυτό το νόμισμα.'}
function ccFetchBars(sym,tf){var base=dmSym(sym).replace(/(USDT|USDC|USD|EUR)$/,'');if(!base)return Promise.reject({code:'not_found'});if(!CG.mcp)return shbGet(base,tf);
  var cands=CC.inst[base]?[CC.inst[base]]:[base+'_USDT',base+'_USD'];
  var tryI=function(i){if(i>=cands.length)return Promise.reject({code:'not_found'});return ccCall(cands[i],tf).then(function(r){var bars=ccParse(r&&r.payload);if(!bars||!bars.length)throw {code:'tool_error'};CC.inst[base]=cands[i];try{localStorage.setItem('tj-ccinst',JSON.stringify(CC.inst))}catch(e){}var mb=ccMerge(cands[i],tf,bars);try{shbSave(cands[i],tf,mb)}catch(x){}return {inst:cands[i],bars:mb}}).catch(function(e){if(e&&e.code==='tool_error')return tryI(i+1);throw e})};
  return tryI(0).catch(function(e){if(e&&e.code!=='not_found')return shbGet(base,tf).catch(function(){throw e});throw e})}
function ccStop(){if(CC.sub){try{CC.sub()}catch(e){}}CC.sub=null;CC.key=''}
function ccFallback(coin){return !CG.mcp||CC.bad[coin]==='none'}
function ccCall(inst,tf){var inp={instrument_name:inst,timeframe:tf};return CG.mcp.callTool('Crypto.com',CC.tool,inp,{cache:{staleTime:20000,gcTime:900000}}).catch(function(e){
  if(CC.tool==='get_candlestick'&&e&&(e.code==='bad_request'||e.code==='not_in_manifest'&&/tool/i.test(e.message||''))){CC.tool='Get_candlestick';return CG.mcp.callTool('Crypto.com',CC.tool,inp,{cache:{staleTime:20000,gcTime:900000}})}throw e})}
function ccErrText(e){var c=e&&e.code;
  if(c==='no_shared')return 'Δεν υπάρχουν ακόμα κοινά κεριά για αυτό. Τα κεριά τα μοιράζεται αυτόματα όποιο μέλος έχει τη σύνδεση Crypto.com στο claude.ai, μόλις ανοίξει την Προπόνηση ή τις Αγορές. Δοκίμασε «Τυχαίο».';
  if(c==='server_not_connected'||c==='server_not_found')return 'Πρόσθεσε τη σύνδεση Crypto.com στο claude.ai (Ρυθμίσεις → Connectors) για αυτόματα κεριά.';
  if(c==='needs_reauth')return 'Ξανασύνδεσε το Crypto.com στο claude.ai (Ρυθμίσεις → Connectors).';
  if(c==='not_in_manifest'||c==='approval_required'||c==='consent_required')return 'Η σελίδα χρειάζεται την άδειά σου για να παίρνει κεριά από το Crypto.com.';
  if(c==='server_unavailable'||c==='rate_limited'||c==='upstream_error')return 'Το Crypto.com δεν απαντά αυτή τη στιγμή.';
  return 'Δεν ήρθαν κεριά από το Crypto.com.'}
function ccBackfill(coin,tf){var id=CGID[coin],days=CC_BF[tf];if(!id||!CG.mcp||!days)return Promise.resolve(null);var key=id+'|'+days;if(CG.chart[key])return Promise.resolve(CG.chart[key]);
  return CG.mcp.callTool('CoinGecko','get-coin-market-chart',{id:id,days:days},{cache:{staleTime:600000,gcTime:3600000}}).then(function(r){var pl=r&&r.payload;if(!pl||!pl.prices||pl.prices.length<2)return null;CG.chart[key]={p:pl.prices,a:+pl.startTs,b:+pl.endTs,at:Date.now()};return CG.chart[key]}).catch(function(){return null})}
function ccCompose(all,coin,tf){var d=CC.bfd[coin+'|'+tf];if(!d||!all.length)return all;var n=d.p.length,st=(d.b-d.a)/(n-1),cut=all[0].t-(CC_TFMS[tf]||0)*.5,pre=[];
  for(var i=0;i<n;i++){var t=d.a+i*st,v=+d.p[i];if(t<cut&&isFinite(v))pre.push({t:t,o:v,h:v,l:v,c:v,v:NaN,approx:true})}return pre.concat(all)}
function ccShow(inst,tf,bars,sym,at){var all=ccMerge(inst,tf,bars);CC.last={inst:inst,tf:tf,sym:sym};if(pcOhlcGet(sym)||mkSym(mkItem())!==sym||MK.g!=='crypto')return;CC.at=at||CC.at||Date.now();var coin=mkItem()[0],bk=coin+'|'+tf;
  if(!(bk in CC.bfd)){CC.bfd[bk]=null;ccBackfill(coin,tf).then(function(d){CC.bfd[bk]=d;if(d&&CC.last&&CC.last.sym===sym&&CC.last.tf===tf&&CC.key===bk)ccShow(CC.last.inst,tf,[],sym,CC.at)})}
  pcSetData(sym,ccCompose(all,coin,tf),{src:'Crypto.com',tf:tf==='7D'?'1W':tf,tfMs:CC_TFMS[tf]});var m=$('#mkCgMsg');if(m)m.textContent='';
  $('#mkSrc').innerHTML='<span>'+esc(LANG_RU()?'Источник: Crypto.com':'Πηγή: Crypto.com')+'</span> <b>'+esc(inst.replace('_','/'))+'</b> · <b class="num">'+all.length+'</b> <span>'+esc(LANG_RU()?'свечей':'κεριά')+'</span> · <span>'+esc(LANG_RU()?'обновлено':'ενημέρωση')+'</span> <b class="num">'+cgTime(CC.at)+'</b> · <span>'+esc(LANG_RU()?'автообновление каждые 30 с':'αυτόματη ανανέωση κάθε 30″')+'</span>'+(CC.bfd[bk]?' · <span>'+esc(LANG_RU()?'раньше: линия CoinGecko':'πιο πίσω: γραμμή CoinGecko')+'</span>':'');renderMkList()}
function ccWatch(inst,tf,sym,coin){if(CC.sub){try{CC.sub()}catch(e){}}var key=coin+'|'+tf;
  CC.sub=CG.mcp.watchTool('Crypto.com',CC.tool,{instrument_name:inst,timeframe:tf},function(ev){if(CC.key!==key)return;
    if(ev.type==='data'){var bars=ccParse(ev.result&&ev.result.payload);if(bars&&bars.length)ccShow(inst,tf,bars,sym,ev.result.cache?ev.result.cache.storedAt:Date.now())}
    else{var c=ev.error&&ev.error.code,m=$('#mkCgMsg');if(m&&/^(needs_reauth|server_not_connected|blocked_by_policy|approval_required|not_in_manifest)$/.test(c||''))m.innerHTML='<span>'+esc(ccErrText(ev.error))+'</span> <button type="button" class="btn small" data-ccretry="1">'+esc(LANG_RU()?'Повторить':'Ξαναδοκίμασε')+'</button>'}},
    {cache:{staleTime:20000,gcTime:900000},refetchInterval:30000})}
function ccTry(cands,i,coin,sym,tf){var key=coin+'|'+tf;if(CC.key!==key)return;
  if(i>=cands.length){CC.bad[coin]='none';ccStop();renderMarkets();var m0=$('#mkCgMsg');if(m0)m0.textContent=(LANG_RU()?'На Crypto.com нет свечей для ':'Η Crypto.com δεν έχει κεριά για το ')+coin+(LANG_RU()?'. Показываю линию CoinGecko.':'. Δείχνω γραμμή από τη CoinGecko.');return}
  var inst=cands[i];ccCall(inst,tf).then(function(r){var bars=ccParse(r&&r.payload);if(!bars||!bars.length)throw {code:'tool_error'};
    CC.inst[coin]=inst;try{localStorage.setItem('tj-ccinst',JSON.stringify(CC.inst))}catch(e){}if(CC.key!==key)return;ccShow(inst,tf,bars,sym,r.cache?r.cache.storedAt:Date.now());ccWatch(inst,tf,sym,coin)})
  .catch(function(e){if(CC.key!==key)return;if(e&&e.code==='tool_error'){if(CC.inst[coin]===inst){delete CC.inst[coin];cands=[coin+'_USDT',coin+'_USD'].filter(function(x){return x!==inst})}ccTry(cands,cands.indexOf(inst)+1>0?i+1:i,coin,sym,tf);return}
    var m=$('#mkCgMsg');if(m)m.innerHTML='<span>'+esc(ccErrText(e))+'</span> <button type="button" class="btn small" data-ccretry="1">'+esc(cgNeedsAllowCC(e)?(LANG_RU()?'Разрешить':'Επίτρεψε'):(LANG_RU()?'Повторить':'Ξαναδοκίμασε'))+'</button>';
    if(!PC.raw.length||PC.sym!==sym)cgLoadChart()})}
function cgNeedsAllowCC(e){var c=e&&e.code;return c==='approval_required'||c==='not_in_manifest'||c==='consent_required'}
function ccStart(){var it=mkItem(),coin=it[0],sym=mkSym(it),tf=CC.tf,key=coin+'|'+tf;if(!CG.mcp||CC.bad[coin]==='none')return false;
  if(CC.key===key&&CC.sub)return true;ccStop();CC.key=key;var cands=CC.inst[coin]?[CC.inst[coin]]:[coin+'_USDT',coin+'_USD'];
  var cached=ccCached(cands[0],tf);if(cached.length)pcSetData(sym,cached,{src:'Crypto.com',tf:tf==='7D'?'1W':tf,tfMs:CC_TFMS[tf]});else pcSetData(sym,[],{empty:pcTr('Φέρνω κεριά από το Crypto.com…')});
  ccTry(cands,0,coin,sym,tf);return true}

function pcToDemo(d){if(PC.full){PC.full=false;PC.root.classList.remove('full');document.body.classList.remove('pc-full-on')}var e=d.p[0].price,s0=d.p[1].price,tg=e+(e-s0)*(d.rr||2),r=function(x){return +(+x).toPrecision(8)};
  showTab('demo');dmReset();dmPxUnits();$('#dm-sym').value=PC.sym;$('#dm-dir').value=d.type==='short'?'short':'long';$('#dm-ex').value=MK.g==='crypto'?'binance':'tv';$('#dm-entry').value=r(e);$('#dm-stop').value=r(s0);$('#dm-target').value=r(tg);
  renderExLinks('dm-sym');renderDmCalc();setTimeout(function(){$('#dmForm').scrollIntoView({block:'start'});$('#dm-risk').focus()},60)}

/* ================= Αγορές: blue chips & crypto με γραφήματα ================= */
var MKS={stock:[['AAPL','Apple','NASDAQ:AAPL'],['MSFT','Microsoft','NASDAQ:MSFT'],['NVDA','NVIDIA','NASDAQ:NVDA'],['AMZN','Amazon','NASDAQ:AMZN'],['GOOGL','Alphabet (Google)','NASDAQ:GOOGL'],['META','Meta','NASDAQ:META'],['TSLA','Tesla','NASDAQ:TSLA'],['BRK.B','Berkshire Hathaway','NYSE:BRK.B'],['JPM','JPMorgan Chase','NYSE:JPM'],['TSM','TSMC','NYSE:TSM']],
  crypto:[['BTC','Bitcoin','BINANCE:BTCUSDT'],['ETH','Ethereum','BINANCE:ETHUSDT'],['BNB','BNB','BINANCE:BNBUSDT'],['XRP','XRP','BINANCE:XRPUSDT'],['SOL','Solana','BINANCE:SOLUSDT'],['TRX','TRON','BINANCE:TRXUSDT'],['HYPE','Hyperliquid','BYBIT:HYPEUSDT'],['ZEC','Zcash','BINANCE:ZECUSDT'],['XMR','Monero','KRAKEN:XMRUSD'],['LINK','Chainlink','BINANCE:LINKUSDT'],['DOGE','Dogecoin','BINANCE:DOGEUSDT'],['ADA','Cardano','BINANCE:ADAUSDT'],['AVAX','Avalanche','BINANCE:AVAXUSDT'],['SUI','Sui','BINANCE:SUIUSDT'],['LTC','Litecoin','BINANCE:LTCUSDT']]};
var ICONS={BTC:['#f7931a','₿'],ETH:['#627eea','Ξ'],BNB:['#f3ba2f','B','#1e2026'],XRP:['#23292f','X'],SOL:['linear-gradient(135deg,#9945ff,#14f195)','S'],TRX:['#ff060a','T'],HYPE:['#0f3933','H','#97fce4'],ZEC:['#f4b728','Z','#1e2026'],XMR:['#ff6600','M'],LINK:['#2a5ada','L'],DOGE:['#c2a633','Ð'],ADA:['#0033ad','₳'],AVAX:['#e84142','A'],SUI:['#4da2ff','S'],LTC:['#345d9d','Ł'],
  AAPL:['#1d1d1f',''],MSFT:['ms',''],NVDA:['#76b900','N'],AMZN:['#232f3e','a','#ff9900'],GOOGL:['#ffffff','G','#4285f4'],META:['#0866ff','∞'],TSLA:['#e82127','T'],'BRK.B':['#2b2d6e','B'],JPM:['#5c4033','J'],TSM:['#c4161c','T']};
function symIcon(code,sz){sz=sz||24;var c=ICONS[code]||['#78909c',String(code||'?').charAt(0)],img='',st='width:'+sz+'px;height:'+sz+'px;';
  if(c[0]==='ms')return '<span class="cic cms" style="'+st+'" aria-hidden="true"><i style="background:#f25022"></i><i style="background:#7fba00"></i><i style="background:#00a4ef"></i><i style="background:#ffb900"></i></span>';
  if(typeof CG!=='undefined'&&CG.mk&&CGID[code]){var m=CG.mk[CGID[code]];if(m&&m.image&&/^https:\/\//.test(m.image))img='<img class="cimg" src="'+esc(m.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">'}
  return '<span class="cic'+(code==='GOOGL'?' cic-w':'')+'" style="'+st+'background:'+c[0]+';color:'+(c[2]||'#fff')+';font-size:'+Math.round(sz*.52)+'px" aria-hidden="true">'+esc(c[1])+img+'</span>'}
document.addEventListener('error',function(e){var t=e.target;if(t&&t.classList&&t.classList.contains('cimg'))t.parentNode&&t.parentNode.removeChild(t)},true);
var MK={g:'crypto',v:'one',sel:{stock:'AAPL',crypto:'BTC'},int:'240',bars:null,days:'7'};
var CGNAME={BTC:'Bitcoin',ETH:'Ethereum',BNB:'BNB',XRP:'XRP',SOL:'Solana',TRX:'TRON',HYPE:'Hyperliquid',ZEC:'Zcash',XMR:'Monero',LINK:'Chainlink',DOGE:'Dogecoin',ADA:'Cardano',AVAX:'Avalanche',SUI:'Sui',LTC:'Litecoin'};
function symListFill(){var dl=document.getElementById('symList');if(!dl)return;var seen={},h='',add=function(v,l){v=String(v||'').toUpperCase().trim();if(!v||seen[v])return;seen[v]=1;h+='<option value="'+esc(v)+'"'+(l?' label="'+esc(l)+'"':'')+'>'+(l?esc(l):'')+'</option>'};
  Object.keys(CGID).forEach(function(c){add(c+'USDT',(CGNAME[c]||c)+' · USDT')});
  Object.keys(CGID).forEach(function(c){add(c+'USDC',(CGNAME[c]||c)+' · USDC')});
  try{(S.trades||[]).concat(S.demo||[]).forEach(function(t){if(t.symbol)add(t.symbol,'από τις συναλλαγές σας')})}catch(e){}
  try{(MKS.stock||[]).forEach(function(x){add(x[0],x[1]+' · μετοχή')})}catch(e){}
  ['GER40','US100','US500','XAUUSD','EURUSD'].forEach(function(x){add(x,'CFD / forex')});
  if(dl.__h!==h){dl.innerHTML=h;dl.__h=h}}
var CGID={BTC:'bitcoin',ETH:'ethereum',BNB:'binancecoin',XRP:'ripple',SOL:'solana',TRX:'tron',HYPE:'hyperliquid',ZEC:'zcash',XMR:'monero',LINK:'chainlink',DOGE:'dogecoin',ADA:'cardano',AVAX:'avalanche-2',SUI:'sui',LTC:'litecoin'};
var CG={mcp:null,ready:false,mk:null,mkAt:0,mkErr:null,unw:null,chart:{},retry:{},cur:null};
function cgInit(){var cl=window.claude&&window.claude.use?window.claude:null;if(!cl){CG.ready=true;renderMarkets();return}
  cl.use('mcp').then(function(m){CG.mcp=m;CG.ready=true;renderMarkets();setTimeout(moodLoad,800);setTimeout(function(){try{nwLoad(true)}catch(e){}},5000)}).catch(function(){CG.ready=true;renderMarkets()})}
function cgErrText(e){var c=e&&e.code;
  if(c==='server_not_connected'||c==='server_not_found')return 'Πρόσθεσε τη σύνδεση CoinGecko στο claude.ai (Ρυθμίσεις → Connectors) για να βλέπεις τιμές crypto εδώ.';
  if(c==='needs_reauth')return 'Ξανασύνδεσε το CoinGecko στο claude.ai (Ρυθμίσεις → Connectors).';
  if(c==='selection_required')return 'Έχεις δύο συνδέσεις CoinGecko: διάλεξε στο claude.ai ποια θα χρησιμοποιεί η σελίδα.';
  if(c==='not_in_manifest'||c==='approval_required'||c==='consent_required')return 'Η σελίδα χρειάζεται την άδειά σου για να διαβάζει τιμές από το CoinGecko.';
  if(c==='blocked_by_policy')return 'Ο οργανισμός σου δεν επιτρέπει το CoinGecko σε αυτή τη σελίδα.';
  if(c==='server_unavailable'||c==='rate_limited')return 'Το CoinGecko δεν απαντά αυτή τη στιγμή. Δοκίμασε ξανά σε λίγο.';
  if(c==='not_granted'||c==='capability_disabled'||c==='capability_removed')return 'Οι συνδέσεις δεν είναι διαθέσιμες σε αυτή την προβολή. Άνοιξε τη σελίδα μέσα από το claude.ai.';
  if(c==='tool_error')return 'Το CoinGecko απάντησε με σφάλμα για αυτό το νόμισμα.';
  return 'Δεν ήρθαν τιμές από το CoinGecko.'}
function cgAllowBtn(e){var c=e&&e.code;return c==='approval_required'||c==='not_in_manifest'||c==='consent_required'||c==='server_unavailable'||c==='upstream_error'?' <button type="button" class="btn small" data-cgretry="1">'+(c==='server_unavailable'||c==='upstream_error'?'Ξαναδοκίμασε':'Επίτρεψε')+'</button>':''}
function cgMkVisible(){var s0=$('section[data-panel=markets]');return s0&&!s0.hidden}
function cgSetMarkets(r){var pl=r&&r.payload;if(pl&&pl.coins){CG.mk={};pl.coins.forEach(function(c){CG.mk[c.id]=c});CG.mkAt=r.cache?r.cache.storedAt:Date.now();CG.mkErr=null}}
function cgWatch(){if(CG.unw||!CG.mcp)return;var ids=MKS.crypto.map(function(x){return CGID[x[0]]});
  CG.unw=CG.mcp.watchTool('CoinGecko','get-coin-markets',{ids:ids},function(ev){
    if(ev.type==='data')cgSetMarkets(ev.result);
    else{CG.mkErr=ev.error;if(/^(needs_reauth|server_not_connected|blocked_by_policy|approval_required|not_in_manifest|consent_required)$/.test((ev.error&&ev.error.code)||''))CG.mk=null}
    if(MK.g==='crypto'&&cgMkVisible())renderMarkets()},{cache:{staleTime:60000,gcTime:900000},refetchInterval:120000})}
function cgMarketsOnce(){if(!CG.mcp)return;var ids=MKS.crypto.map(function(x){return CGID[x[0]]});
  CG.mcp.callTool('CoinGecko','get-coin-markets',{ids:ids},{cache:{staleTime:60000,gcTime:900000}}).then(function(r){cgSetMarkets(r);if(MK.g==='crypto'&&cgMkVisible())renderMarkets()}).catch(function(e){CG.mkErr=e;if(MK.g==='crypto'&&cgMkVisible())renderMarkets()})}
/* ---------- market mood (Σήμερα) ---------- */
var MOOD={at:0,data:null,loading:false,timer:null},MOOD_STK=[['spdr-s-p-500-etf-ondo-tokenized-etf','S&P 500 (SPY)'],['nasdaq-xstock','Nasdaq 100 (QQQ)']];
function moodOne(c){var sp=(c.sparkline7d||[]).filter(function(x){return isFinite(x)}),last=sp.length?sp[sp.length-1]:n(c.currentPrice);
  var ch24=n(c.priceChangePercentage24h),ch7=sp.length>1?(last/sp[0]-1)*100:NaN,ma=sp.length?sum(sp)/sp.length:NaN,k=Math.floor(sp.length/3),rec=k?avg(sp.slice(-k)):NaN,prv=k?avg(sp.slice(-2*k,-k)):NaN;
  var sc=(ch7>2?1:ch7<-2?-1:0)+(ch24>1?1:ch24<-1?-1:0)+(last>ma*1.005?1:last<ma*0.995?-1:0)+(rec>prv*1.003?1:rec<prv*0.997?-1:0);
  return {ch24:ch24,ch7:ch7,sc:sc,last:last,ma:ma,mc:n(c.marketCap),px:n(c.currentPrice),sp:sp.filter(function(_,k){return k%2===0||k===sp.length-1})}}
/* συνεχής βαθμός -1…+1 από τα ίδια νούμερα που δείχνει η κάρτα: 7 μέρες, 24 ώρες, θέση τιμής ως προς τον μέσο όρο 7 ημερών */
function moodK(o,k7,k24){var cl=function(x){return isFinite(x)?Math.max(-1,Math.min(1,x)):0};return cl(o.ch7/k7)*0.45+cl(o.ch24/k24)*0.3+cl((o.last/o.ma-1)*100/(k7/2))*0.25}
function moodCalc(coins){var by={};(coins||[]).forEach(function(c){by[c.id]=c});
  var cr=MKS.crypto.map(function(x){return by[CGID[x[0]]]}).filter(Boolean).map(moodOne),btc=by.bitcoin?moodOne(by.bitcoin):null,eth=by.ethereum?moodOne(by.ethereum):null;
  var up7=cr.filter(function(x){return x.ch7>0}).length,br=cr.length?up7/cr.length:NaN;
  var alts=MKS.crypto.filter(function(x){return x[0]!=='BTC'}).map(function(x){return by[CGID[x[0]]]}).filter(Boolean).map(moodOne),altN=btc?alts.filter(function(x){return x.ch7>btc.ch7}).length:0,alt=btc&&alts.length?Math.round(altN/alts.length*100):NaN;
  var cs=null,cv=null;if(btc){cs=btc.sc*2+(eth?eth.sc:0);cs=cs/3+(br>=0.7?1:br<=0.3?-1:0);cv=Math.round(50+50*Math.max(-1,Math.min(1,0.55*moodK(btc,10,4)+0.15*(eth?moodK(eth,12,5):0)+0.3*(br-0.5)*2)))}
  var st=MOOD_STK.map(function(x){return by[x[0]]?Object.assign(moodOne(by[x[0]]),{nm:x[1]}):null}).filter(Boolean),ss=st.length?avg(st.map(function(x){return x.sc})):null,sv=st.length?Math.round(50+50*avg(st.map(function(x){return moodK(x,5,2)}))):null;
  var list=MKS.crypto.map(function(x){var c=by[CGID[x[0]]];if(!c)return null;var o=moodOne(c);return {s:x[0],ch7:isFinite(o.ch7)?+o.ch7.toFixed(2):null,ch24:isFinite(o.ch24)?+o.ch24.toFixed(2):null,mc:o.mc||0}}).filter(Boolean),wm=sum(list.map(function(x){return isFinite(x.ch24)?x.mc:0})),w24=wm>0?sum(list.map(function(x){return isFinite(x.ch24)?x.mc*x.ch24:0}))/wm:NaN;
  return {v:2,crypto:btc?{score:cs,v:cv,btc:btc,eth:eth,up7:up7,tot:cr.length,alt:alt,altN:altN,altT:alts.length,w24:isFinite(w24)?+w24.toFixed(2):null}:null,stocks:st.length?{score:ss,v:sv,list:st}:null,list:list,at:Date.now()}}
function moodVerdict(sc){if(sc==null||!isFinite(sc))return null;if(sc>=1.6)return ['up','Ανοδική','Ευνοεί αγορές (long)'];if(sc<=-1.6)return ['down','Πτωτική','Ευνοεί πωλήσεις (short) ή αναμονή'];return ['flat','Ουδέτερη','Χωρίς κατεύθυνση: αναμονή ή range']}
function moodVerdictV(v){if(v==null||!isFinite(v))return null;if(v>=65)return ['up','Ανοδική','Ευνοεί αγορές (long)'];if(v>=55)return ['up','Ελαφρά ανοδική','Μικρό προβάδισμα στα long, με προσοχή'];if(v<=35)return ['down','Πτωτική','Ευνοεί πωλήσεις (short) ή αναμονή'];if(v<=45)return ['down','Ελαφρά πτωτική','Μικρό προβάδισμα στα short, με προσοχή'];return ['flat','Ουδέτερη','Χωρίς κατεύθυνση: αναμονή ή range']}
function pctS(x,d){return isFinite(x)?'<span class="'+(x>0?'pos':x<0?'neg':'')+'">'+(x>0?'▲ +':x<0?'▼ ':'')+fmt(x,d==null?1:d)+'%</span>':'–'}
function gaugeSvg(v,uid){v=Math.max(0,Math.min(100,v));var cx=100,cy=96,r=74,D=9,seg=[['#e5484d','#8e2422',0,20],['#f2802e','#97460f',20,40],['#f5c518','#8d6f06',40,60],['#9bd13f','#4f7417',60,80],['#18b26b','#0b5c36',80,100]];
  /* 3D: ο δακτύλιος έχει πάχος (εξώθηση προς τα κάτω), δείκτης-βελόνα με σκιά και κυλινδρικό κέντρο, όπως οι 3D στήλες */
  var pt=function(a,rr,dy){var t=Math.PI*(1-a/100);return [cx+rr*Math.cos(t),cy-rr*Math.sin(t)+(dy||0)]},band=function(a0,a1,r0,r1,dy){var A=pt(a0,r1,dy),B=pt(a1,r1,dy),C=pt(a1,r0,dy),E=pt(a0,r0,dy);return 'M'+A[0].toFixed(1)+' '+A[1].toFixed(1)+' A'+r1+' '+r1+' 0 0 1 '+B[0].toFixed(1)+' '+B[1].toFixed(1)+' L'+C[0].toFixed(1)+' '+C[1].toFixed(1)+' A'+r0+' '+r0+' 0 0 0 '+E[0].toFixed(1)+' '+E[1].toFixed(1)+'Z'};
  var ri=r-9,ro=r+9,h='<svg viewBox="0 0 200 128" aria-hidden="true"><defs><linearGradient id="gt'+uid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient><radialGradient id="gh'+uid+'" cx=".4" cy=".3" r=".9"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".6" stop-color="#aeb6bf"/><stop offset="1" stop-color="#5d6670"/></radialGradient><filter id="gb'+uid+'" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>';
  h+='<ellipse cx="'+cx+'" cy="'+(cy+D+12)+'" rx="'+(ro+6)+'" ry="9" fill="#000" opacity=".35" filter="url(#gb'+uid+')"/>';
  seg.forEach(function(g){var a0=g[2]+(g[2]?0.6:0),a1=g[3]-(g[3]<100?0.6:0);h+='<path d="'+band(a0,a1,ri,ro,D)+'" fill="'+g[1]+'"/>';for(var k=D-1;k>0;k-=2)h+='<path d="'+band(a0,a1,ri,ro,k)+'" fill="'+g[1]+'" opacity=".9"/>'});
  seg.forEach(function(g){var a0=g[2]+(g[2]?0.6:0),a1=g[3]-(g[3]<100?0.6:0);h+='<path d="'+band(a0,a1,ri,ro,0)+'" fill="'+g[0]+'"/>'});
  h+='<path d="'+band(0,100,ri,ro,0)+'" fill="url(#gt'+uid+')"/>';
  for(var q=0;q<=100;q+=10){var a=pt(q,ri-4),b=pt(q,ri-(q%50?8:12));h+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" stroke="var(--muted)" stroke-width="'+(q%50?1:1.6)+'" opacity=".7"/>'}
  var tip=pt(v,ro-2),t=Math.PI*(1-v/100),nx=-Math.sin(t)*5,ny=-Math.cos(t)*5,sh=function(o){return (tip[0]+o).toFixed(1)+','+(tip[1]+o).toFixed(1)+' '+(cx+nx+o).toFixed(1)+','+(cy+ny+o).toFixed(1)+' '+(cx-nx+o).toFixed(1)+','+(cy-ny+o).toFixed(1)};
  h+='<polygon points="'+sh(4)+'" fill="#000" opacity=".35" filter="url(#gb'+uid+')"/><polygon points="'+sh(0)+'" fill="url(#gh'+uid+')" stroke="#1b2228" stroke-width="1"/>';
  h+='<ellipse cx="'+cx+'" cy="'+(cy+5)+'" rx="11" ry="5" fill="#3a434c"/><rect x="'+(cx-11)+'" y="'+(cy-1)+'" width="22" height="6" fill="#3a434c"/><ellipse cx="'+cx+'" cy="'+(cy-1)+'" rx="11" ry="5" fill="url(#gh'+uid+')" stroke="#1b2228" stroke-width="1"/>';
  return h+'</svg>'}
function gaugeTile(title,score,div,sub,uid,vv){var V=vv!=null&&isFinite(vv)?moodVerdictV(vv):moodVerdict(score);if(!V)return '<div class="mt"><div class="mtl">'+title+'</div><div class="mtd" style="margin-top:.6rem">Δεν υπάρχουν δεδομένα αυτή τη στιγμή.</div></div>';
  var v=vv!=null&&isFinite(vv)?Math.round(vv):Math.round(50+Math.max(-1,Math.min(1,score/div))*50),col=v<20?'#e5484d':v<40?'#f2802e':v<60?'#f5c518':v<80?'#9bd13f':'#18b26b';
  return '<div class="mt"><div class="mtl">'+title+'</div><div class="gauge">'+gaugeSvg(v,uid)+'<div class="gnum">'+v+'</div><span class="gpill" style="background:'+col+'">'+V[1]+'</span><div class="gtxt">'+V[2]+(sub?'<br>'+sub:'')+'</div></div></div>'}
function spark(arr,up){if(!arr||arr.length<2)return '';var mn=Math.min.apply(null,arr),mx=Math.max.apply(null,arr),w=100,h=30,pts=arr.map(function(v,k){return (k/(arr.length-1)*w).toFixed(1)+','+(h-2-(mx>mn?(v-mn)/(mx-mn):.5)*(h-4)).toFixed(1)}).join(' '),c=up?'var(--gain)':'var(--loss)';
  return '<svg class="spk" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>'}
/* 🧊 3D διαγράμματα: ισομετρικές στήλες για την κίνηση των νομισμάτων και ανάγλυφη περιοχή για το BTC */
function spark3d(arr,up){if(!arr||arr.length<2)return '';var mn=Math.min.apply(null,arr),mx=Math.max.apply(null,arr),w=200,h=56,dx=7,dy=-6,base=h-2,P=arr.map(function(v,k){return [k/(arr.length-1)*(w-dx),base-(mx>mn?(v-mn)/(mx-mn):.5)*(h-14)]}),c=up?'#26a69a':'#ef5350',cd=up?'#145c55':'#7a2a28',id='s3'+Math.round(Math.random()*1e6);
  var line=function(o){return P.map(function(p){return (p[0]+o[0]).toFixed(1)+','+(p[1]+o[1]).toFixed(1)}).join(' ')},back=line([dx,dy]),front=line([0,0]);
  var side=P.slice(0,-1).map(function(p,k){var q=P[k+1];return '<polygon points="'+p[0].toFixed(1)+','+p[1].toFixed(1)+' '+q[0].toFixed(1)+','+q[1].toFixed(1)+' '+(q[0]+dx).toFixed(1)+','+(q[1]+dy).toFixed(1)+' '+(p[0]+dx).toFixed(1)+','+(p[1]+dy).toFixed(1)+'" fill="'+(q[1]<p[1]?c:cd)+'" opacity=".55"/>'}).join('');
  return '<svg class="spk3" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+c+'" stop-opacity=".55"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></linearGradient></defs>'+
    '<polygon points="'+(dx)+','+(base+dy)+' '+back+' '+(w)+','+(base+dy)+'" fill="'+cd+'" opacity=".35"/>'+side+'<polygon points="0,'+base+' '+front+' '+(w-dx)+','+base+'" fill="url(#'+id+')"/><polyline points="'+front+'" fill="none" stroke="'+c+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'+
    '<line x1="0" y1="'+base+'" x2="'+(w-dx)+'" y2="'+base+'" stroke="var(--line)" stroke-width="1"/><line x1="'+(w-dx)+'" y1="'+base+'" x2="'+w+'" y2="'+(base+dy)+'" stroke="var(--line)" stroke-width="1"/></svg>'}
var MV={k:'ch7'};try{MV.k=localStorage.getItem('tj-mv')==='ch24'?'ch24':'ch7'}catch(e){}
function bars3d(L){var k=MV.k,A=L.filter(function(x){return isFinite(x[k])}).slice().sort(function(a,b){return b[k]-a[k]});if(A.length<3)return '';var mx=Math.max.apply(null,A.map(function(x){return Math.abs(x[k])}).concat([0.5])),H=56;
  var up=A.filter(function(x){return x[k]>0}).length;
  return '<div class="mt mtw"><div class="mtl" style="display:flex;justify-content:space-between;gap:.5rem;align-items:center"><span>🧊 Κίνηση νομισμάτων (3D) · '+up+'/'+A.length+' ανεβαίνουν</span><span class="mvtg"><button type="button" data-mvk="ch24"'+(k==='ch24'?' class="on"':'')+'>24ώ</button><button type="button" data-mvk="ch7"'+(k==='ch7'?' class="on"':'')+'>7 μέρες</button></span></div>'+
    '<div class="b3"><div class="b3z"></div>'+A.map(function(x){var v=x[k],hh=Math.max(3,Math.abs(v)/mx*H),pos=v>=0;return '<div class="b3c" title="'+esc(x.s)+': '+(v>0?'+':'')+fmt(v,2)+'%"><span class="b3v num '+(pos?'pos':'neg')+'" style="top:calc(50% '+(pos?'- '+(hh+24).toFixed(0):'+ '+(hh+10).toFixed(0))+'px)">'+(v>0?'+':'')+fmt(v,1)+'%</span><div class="b3s"><i class="b3b '+(pos?'up':'dn')+'" style="--h:'+hh.toFixed(1)+'px"></i></div><span class="b3l">'+symIcon(x.s,16)+'<b>'+esc(x.s)+'</b></span></div>'}).join('')+'</div>'+
    '<div class="mtd">Ύψος = μεταβολή '+(k==='ch7'?'7 ημερών':'24 ωρών')+' · πάνω από τη γραμμή ανεβαίνει, κάτω πέφτει · ταξινομημένα από το καλύτερο στο χειρότερο.</div></div>'}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-mvk]');if(!b)return;MV.k=b.getAttribute('data-mvk');try{localStorage.setItem('tj-mv',MV.k)}catch(x){}moodRender()});
function moodRender(){var el=$('#mktMood');if(!el)return;var D=MOOD.data;
  if(!D){el.innerHTML=MOOD.loading?'<div class="mt"><span class="mtd">Διαβάζω την κατάσταση των αγορών…</span></div>':(CG.ready&&!CG.mcp?'<div class="mt"><span class="mtd">Η κατάσταση των αγορών θέλει τη σύνδεση CoinGecko (ή να την έχει ανοίξει πρόσφατα μέλος της παρέας με τη σύνδεση).</span></div>':'');return}
  var c=D.crypto,s=D.stocks,G=D.glob,h='<div class="mst"><div class="msth"><b>📊 Κατάσταση αγορών</b><span>'+(function(){var a=Math.round((Date.now()-D.at)/60000);return 'ενημέρωση πριν '+(a<1?'λίγο':a+'′')})()+'</span></div>';
  h+=gaugeTile('Διάθεση crypto',c?c.score:null,4,c?'BTC 7ημ '+pctS(c.btc.ch7)+' · 24ώ '+pctS(c.btc.ch24)+' · '+c.up7+'/'+c.tot+' ανεβαίνουν (7ημ)':'','c',c&&c.v);
  h+=gaugeTile('Διάθεση μετοχών ΗΠΑ',s?s.score*1.2:null,4,s?s.list.map(function(x){return x.nm.split(' (')[1].replace(')','')+' 7ημ '+pctS(x.ch7)}).join(' · '):'','s',s&&s.v);
  if(G&&isFinite(G.cap))h+='<div class="mt"><div class="mtl">Συνολική αξία crypto</div><div class="mtv">'+cgMoney(G.cap).replace(' τρισ. $','T $')+' <small title="24ωρη μεταβολή των κορυφαίων νομισμάτων, σταθμισμένη με την κεφαλαιοποίηση">'+pctS(c&&c.w24!=null?c.w24:G.ch24,2)+'</small></div><div class="mtd">Όγκος 24ώρου '+cgMoney(G.vol)+(c&&c.w24!=null&&isFinite(G.ch24)&&Math.abs(G.ch24-c.w24)>1?'<br><span title="Ο συνολικός δείκτης του CoinGecko μετρά και stablecoins και αλλαγές στη λίστα νομισμάτων, γι’ αυτό διαφέρει από τις τιμές των νομισμάτων">ο συνολικός δείκτης CoinGecko λέει '+pctS(G.ch24,1)+' ⓘ</span>':'')+'</div></div>';
  if(G&&isFinite(G.btcDom)){var oth=Math.max(0,100-G.btcDom-(G.ethDom||0));h+='<div class="mt"><div class="mtl">Κυριαρχία BTC</div><div class="mtv">'+fmt(G.btcDom,1)+'%</div><div class="dom3d"><span style="width:'+G.btcDom+'%;background:linear-gradient(180deg,#ffb04d,#f7931a 60%,#c76f00)"></span><span style="width:'+(G.ethDom||0)+'%;background:linear-gradient(180deg,#8fa2ff,#627eea 60%,#3d55b8)"></span><span style="width:'+oth+'%;background:linear-gradient(180deg,#b8c2cc,#8b96a1 60%,#5f6973)"></span></div><div class="mtd">BTC · ETH '+fmt(G.ethDom||0,1)+'% · άλλα '+fmt(oth,1)+'%</div></div>'}
  if(c&&isFinite(c.alt)){var lab=c.alt>=75?'Εποχή altcoins':c.alt<=25?'Εποχή Bitcoin':'Μικτή';h+='<div class="mt"><div class="mtl">Altcoins vs BTC (7 μέρες)</div><div class="mtv">'+c.alt+' <small style="color:var(--muted)">'+lab+'</small></div><div class="bar3d"><i style="left:'+c.alt+'%"></i></div><div class="mtd">'+c.altN+'/'+c.altT+' altcoins πήγαν καλύτερα από το BTC</div></div>'}
  if(c&&c.btc){h+='<div class="mt"><div class="mtl">Bitcoin</div><div class="mtv">'+(isFinite(c.btc.px)?fmt(c.btc.px,0)+' $':isFinite(c.btc.last)?fmt(c.btc.last,0)+' $':'–')+' <small>'+pctS(c.btc.ch24,2)+'</small></div>'+spark3d(c.btc.sp,c.btc.ch7>=0)+'<div class="mtd">7 μέρες '+pctS(c.btc.ch7)+'</div></div>'}
  if(D.list&&D.list.length>2)h+=bars3d(D.list);
  h+='<p class="mstnote">Δείκτες από τις τιμές 7 ημερών στο CoinGecko (οι μετοχές μέσω tokenized ETF που ακολουθούν SPY και QQQ· εκτός ωραρίου ΗΠΑ μπορεί να αποκλίνουν). Δείχνουν την τάση τώρα, δεν προβλέπουν το μέλλον.</p></div>';
  el.innerHTML=h}
function moodLoad(){if(MOOD.loading)return;clearTimeout(MOOD.timer);MOOD.timer=setTimeout(moodLoad,10*60000);
  if(!CG.mcp){if(S.db&&!MOOD.data){S.db.collection('bars').doc('_mood').get().then(function(sn){if(sn.exists&&sn.data()&&sn.data().d){MOOD.data=sn.data().d;moodRender()}else moodRender()}).catch(function(){moodRender()})}else moodRender();return}
  MOOD.loading=true;if(!MOOD.data)moodRender();
  var ids=MKS.crypto.map(function(x){return CGID[x[0]]}).filter(Boolean).slice(0,18).concat(MOOD_STK.map(function(x){return x[0]})),opt={cache:{staleTime:300000,gcTime:1800000}};
  var safe=function(f){try{return Promise.resolve(f())}catch(e){return Promise.reject(e)}};
  var gP=safe(function(){return CG.mcp.callTool('CoinGecko','get-global-market',{},opt)}).then(function(r){var g=r&&r.payload;return g&&isFinite(n(g.totalMarketCapUsd))?{cap:n(g.totalMarketCapUsd),ch24:n(g.marketCapChangePercentage24hUsd),vol:n(g.totalVolumeUsd),btcDom:n(g.btcDominancePct),ethDom:n(g.ethDominancePct)}:null}).catch(function(){return null});
  var mP=safe(function(){return CG.mcp.callTool('CoinGecko','get-coin-markets',{ids:ids},opt)}).then(function(r){var pl=r&&r.payload;if(!pl||!pl.coins)throw 0;return {coins:pl.coins,at:r.cache&&r.cache.storedAt}});
  Promise.all([mP,gP]).then(function(x){MOOD.data=moodCalc(x[0].coins);MOOD.data.glob=x[1];if(x[0].at)MOOD.data.at=x[0].at;
      if(S.db&&S.canWrite!==false&&S.uid&&S.uid!=='me')S.db.collection('bars').doc('_mood').set({d:MOOD.data,at:Date.now()}).catch(function(){})})
    .catch(function(){}).then(function(){MOOD.loading=false;moodRender()})}
function cgTime(ms){var d=new Date(ms);return pad2(d.getHours())+':'+pad2(d.getMinutes())}
function cgMoney(x){if(!isFinite(x))return '–';var a=Math.abs(x);return a>=1e12?fmt(x/1e12,2)+' τρισ. $':a>=1e9?fmt(x/1e9,2)+' δισ. $':a>=1e6?fmt(x/1e6,1)+' εκ. $':fmt(x,0)+' $'}
function cgLoadChart(){
  var it=mkItem(),id=CGID[it[0]],days=MK.days,key=id+'|'+days,msg=$('#mkCgMsg');if(!msg)return;
  if(!CG.ready){msg.textContent='Σύνδεση…';return}
  if(!CG.mcp){msg.innerHTML='<span>'+esc(cgErrText({code:'not_granted'}))+'</span>';cgDraw(null);return}
  if(CG.chart[key]){cgDraw(CG.chart[key]);msg.textContent=''}else{cgDraw(null);msg.textContent='Φέρνω τιμές από το CoinGecko…'}
  CG.mcp.callTool('CoinGecko','get-coin-market-chart',{id:id,days:days},{cache:{staleTime:days==='1'?60000:300000,gcTime:1800000}}).then(function(r){
    var pl=r.payload;if(!pl||!pl.prices||pl.prices.length<2)throw {code:'tool_error'};
    CG.chart[key]={p:pl.prices,a:+pl.startTs,b:+pl.endTs,at:r.cache?r.cache.storedAt:Date.now()};CG.retry[key]=0;
    if(!CG.mk)cgMarketsOnce();cgWatch();
    if(CGID[mkItem()[0]]===id&&MK.days===days&&MK.g==='crypto'){cgDraw(CG.chart[key]);var m=$('#mkCgMsg');if(m)m.textContent=''}
  }).catch(function(e){if(CGID[mkItem()[0]]!==id||MK.days!==days)return;var m=$('#mkCgMsg');if(!m)return;
    if(!CG.chart[key])m.innerHTML='<span>'+esc(cgErrText(e))+'</span>'+cgAllowBtn(e);
    if(e&&e.retryable&&!(CG.retry[key]>0)){CG.retry[key]=1;setTimeout(function(){if(cgMkVisible()&&CGID[mkItem()[0]]===id)cgLoadChart()},(e.retryAfterMs||2500)+Math.random()*2000)}});
}
function cgHead(){var el=$('#mkHead');if(!el)return;var it=mkItem(),c=CG.mk&&CG.mk[CGID[it[0]]],d=CG.chart[CGID[it[0]]+'|'+MK.days];
  if(!c&&!d){el.innerHTML='';return}
  var h='';if(c)h+='<div><span class="lbl">Τιμή</span><b class="num">'+dmPx(c.currentPrice)+' $</b></div><div><span class="lbl">24ωρο</span><b class="num '+cls(c.priceChangePercentage24h)+'">'+(c.priceChangePercentage24h>0?'+':'')+fmt(c.priceChangePercentage24h,2)+'%</b></div>';
  if(d){var lo=Math.min.apply(null,d.p),hi=Math.max.apply(null,d.p),ch=(d.p[d.p.length-1]-d.p[0])/d.p[0]*100;h+='<div><span class="lbl">Περίοδος</span><b class="num '+cls(ch)+'">'+(ch>0?'+':'')+fmt(ch,2)+'%</b></div><div><span class="lbl">Χαμηλό / υψηλό</span><b class="num">'+dmPx(lo)+' / '+dmPx(hi)+'</b></div>'}
  if(c)h+='<div><span class="lbl">Κεφαλαιοποίηση</span><b class="num">'+cgMoney(c.marketCap)+'</b><span class="s">#'+(c.marketCapRank||'–')+'</span></div><div><span class="lbl">Όγκος 24ώρου</span><b class="num">'+cgMoney(c.totalVolume)+'</b></div>';
  el.innerHTML=h;
  var src=$('#mkSrc');if(src&&!pcOhlcGet(mkSym(it))&&!CC.key)src.innerHTML=d?'<span>Πηγή: CoinGecko · ενημέρωση</span> <b class="num">'+cgTime(Math.max(d.at||0,CG.mkAt||0))+'</b>':''}
function cgDraw(d){CG.cur=d;cgHead();var it=mkItem(),sym=mkSym(it);if(MK.g!=='crypto'||pcOhlcGet(sym)||!PC.root||(CC.key&&PC.src==='Crypto.com'&&PC.sym===sym))return;
  if(!d){if(PC.sym!==sym)pcSetData(sym,[],{empty:''});return}var P=d.p,n=P.length,st=(d.b-d.a)/(n-1);
  pcSetData(sym,P.map(function(v,i){return {t:d.a+i*st,o:v,h:v,l:v,c:v,v:NaN}}),{closeOnly:true,src:'CoinGecko',tf:{'1':'24h','7':'7D','30':'1M','90':'3M','365':'1Y'}[MK.days]||''})}
function cgSpark(arr){if(!arr||arr.length<2)return '';var lo=Math.min.apply(null,arr),hi=Math.max.apply(null,arr),w=240,h=56,n=arr.length;var pts=arr.map(function(v,i){return (i/(n-1)*w).toFixed(1)+','+(h-2-(v-lo)/((hi-lo)||1)*(h-4)).toFixed(1)}).join(' ');
  var up0=arr[n-1]>=arr[0];return '<svg class="mkspark '+(up0?'up':'dn')+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+pts+'"/></svg>'}
try{var mk0=JSON.parse(localStorage.getItem('tj-mk')||'null');if(mk0){MK.g=mk0.g||MK.g;MK.v=mk0.v||MK.v;MK.int=mk0.int||MK.int;MK.days=mk0.days||MK.days;if(mk0.sel)MK.sel=Object.assign(MK.sel,mk0.sel)}}catch(e){}
function mkSave(){try{localStorage.setItem('tj-mk',JSON.stringify({g:MK.g,v:MK.v,int:MK.int,sel:MK.sel,days:MK.days}))}catch(e){}}
function mkItem(){var L=MKS[MK.g];return L.find(function(x){return x[0]===MK.sel[MK.g]})||L[0]}
function mkSym(it){return MK.g==='crypto'?it[0]+'USDT':it[0]}
function mkDark(){var t=document.documentElement.getAttribute('data-theme');return t?t==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)}
function mkOpenLinks(it){var sym=mkSym(it),tv='https://www.tradingview.com/chart/?symbol='+encodeURIComponent(it[2]);
  var h='<a class="exl big" href="'+esc(tv)+'" target="_blank" rel="noopener noreferrer"><span class="exi" style="background:#131722;color:#fff">TV</span><span class="exn">TradingView</span></a>';
  if(MK.g==='crypto')h+=EXL.slice(1).map(function(e){return '<a class="exl big" href="'+esc(exUrl(e[0],sym))+'" target="_blank" rel="noopener noreferrer"><span class="exi" style="background:'+e[3]+';color:'+e[4]+'">'+e[2]+'</span><span class="exn">'+e[1]+'</span></a>'}).join('');
  else h+='<a class="exl big" href="https://finance.yahoo.com/quote/'+encodeURIComponent(it[0].replace('.','-'))+'" target="_blank" rel="noopener noreferrer"><span class="exi" style="background:#6001d2;color:#fff">Y!</span><span class="exn">Yahoo Finance</span></a>';
  return h}
function renderMarkets(){if(!$('#mkChips'))return;MK.g='crypto';/* μόνο crypto */
  $$('#mkGrp button').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-mg')===MK.g?'true':'false')});
  $$('#mkView button').forEach(function(b){b.setAttribute('aria-selected',b.getAttribute('data-mv')===MK.v?'true':'false')});
  var it=mkItem();$('#mkChips').innerHTML=MKS[MK.g].map(function(x){return '<button type="button" class="mkchip'+(x===it&&MK.v==='one'?' on':'')+'" data-mks="'+esc(x[0])+'">'+symIcon(x[0],22)+'<span class="mkct"><b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span></span></button>'}).join('');$('#mkChips').hidden=MK.v==='one';
  $('#mkOne').hidden=MK.v!=='one';$('#mkGridBox').hidden=MK.v!=='grid';if($('#mkEx'))$('#mkEx').hidden=MK.v!=='one';
  var vis=cgMkVisible(),olX=MK.g==='crypto'&&pcOhlcGet(mkSym(it)),fbX=ccFallback(it[0]);$('#mkDaysW').hidden=true;$('#mkCcTfW').hidden=true;$('#mkDays').value=MK.days;$('#mkCcTf').value=CC.tf;if(!(MK.v==='one'&&MK.g==='crypto'&&vis&&!olX&&!fbX))ccStop();
  if(MK.v==='one'){renderMkList();(function(){var ex=$('#mkEx');if(!ex)return;var sy=mkSym(it),L=MK.g==='crypto'?EXL:EXL.filter(function(e){return e[0]==='tv'});ex.hidden=false;ex.innerHTML='<span class="muted">Άνοιξε το '+esc(it[0])+' σε:</span>'+L.map(function(e){return '<a class="mkexa" href="'+esc(exUrl(e[0],MK.g==='crypto'?sy:it[0]))+'" target="_blank" rel="noopener noreferrer" title="'+esc(e[1])+' · '+esc(it[0])+'"><span class="exi" style="background:'+e[3]+';color:'+e[4]+'">'+e[2]+'</span><span>'+e[1]+'</span></a>'}).join('')})();$('#mkTitle').innerHTML=symIcon(it[0],28)+' <span>'+esc(it[1])+'</span> <span class="muted" style="font-size:.9rem">'+esc(MK.g==='crypto'?it[0]+'/USD':it[2])+'</span>';$('#mkInt').value=MK.int;
    pcMount($('#pcHost'));var sym0=mkSym(it),ol=pcOhlcGet(sym0);
    if(ol||MK.g!=='crypto')pcSetTfs(null);else if(!fbX)pcSetTfs(CC_TFL,CC.tf,function(v){CC.tf=v;try{localStorage.setItem('tj-cctf',v)}catch(x){}ccStop();renderMarkets()});else pcSetTfs(CG_TFL,MK.days,function(v){MK.days=v;mkSave();renderMarkets()});$('#pcBack').hidden=!ol;$('#pcBack').textContent=MK.g==='crypto'?(LANG_RU()?'Вернуться к CoinGecko':'Επιστροφή στο CoinGecko'):(LANG_RU()?'Удалить загруженные цены':'Σβήσε τις φορτωμένες τιμές');
    if(ol){pcSetData(sym0,ol.bars,{src:ol.src,tf:ol.tf});$('#mkCgMsg').textContent='';$('#mkSrc').innerHTML='<span>'+esc(LANG_RU()?'Источник:':'Πηγή:')+'</span> <b>'+esc(ol.src)+'</b> · <b class="num">'+ol.bars.length+'</b> <span>'+esc(LANG_RU()?'свечей':'κεριά')+'</span>'+(ol.tf?' · '+esc(ol.tf):'');if(MK.g==='crypto'&&vis){cgWatch();if(!CG.mk&&CG.mcp)cgMarketsOnce()}cgHead()}
    else if(MK.g==='crypto'){if(vis){if(ccStart()){cgWatch();if(!CG.mk&&CG.mcp)cgMarketsOnce();cgHead()}else cgLoadChart()}else cgHead()}
    else{pcSetData(sym0,[],{empty:pcTr('Φόρτωσε κεριά: CSV από το TradingView')+'\n'+pcTr('ή τιμές από το Stooq με «Άνοιξε τιμές ανταλλακτηρίου»')});$('#mkSrc').innerHTML='';$('#mkCgMsg').textContent='';$('#mkHead').innerHTML=''}
    $('#mkOpen').innerHTML=mkOpenLinks(it);
    var u=MK.g==='crypto'?dmUrl('binance',mkSym(it),mkTf(),Date.now()-300*dmTfMs(mkTf())):'https://stooq.com/q/d/l/?s='+encodeURIComponent(it[0].toLowerCase().replace('.','-'))+'.us&i=d';$('#mkPxLink').href=u;
    if(MK.msgFor!==MK.g+it[0]){MK.msgFor=MK.g+it[0];$('#mkMsg').textContent=''}}
  else{var box=$('#mkGridBox');
    if(MK.g==='crypto'){if(vis){cgWatch();if(!CG.mk&&!CG.mkErr&&CG.mcp)cgMarketsOnce()}
      var em=!CG.ready?'Σύνδεση…':!CG.mcp?cgErrText({code:'not_granted'}):(!CG.mk&&CG.mkErr)?cgErrText(CG.mkErr):'';
      box.innerHTML=(em?'<p class="status warn mkgridmsg"><span>'+esc(em)+'</span>'+(CG.mkErr?cgAllowBtn(CG.mkErr):'')+'</p>':'')+MKS.crypto.map(function(x){var c=CG.mk&&CG.mk[CGID[x[0]]];
        return '<button type="button" class="mkcell" data-mkfocus="'+esc(x[0])+'"><div class="mkcell-h">'+symIcon(x[0],22)+'<b>'+esc(x[0])+'</b> <span class="muted">'+esc(x[1])+'</span>'+(c?'<span class="mkrank">#'+(c.marketCapRank||'–')+'</span>':'')+'</div>'+
          (c?'<div class="mkcell-p"><b class="num">'+dmPx(c.currentPrice)+' $</b> <span class="num '+cls(c.priceChangePercentage24h)+'">'+(c.priceChangePercentage24h>0?'+':'')+fmt(c.priceChangePercentage24h,2)+'%</span></div>'+(function(){var sp=(c.sparkline7d||[]).filter(isFinite).filter(function(_,k,a){return k%3===0||k===a.length-1}),ch=sp.length>1?(sp[sp.length-1]/sp[0]-1)*100:NaN;return spark3d(sp,ch>=0).replace('class="spk3"','class="spk3 mk3"')+'<span class="muted mk7">7 ημέρες '+pctS(ch)+'</span>'})():'<div class="mkcell-p muted">–</div>')+'</button>'}).join('')+
        (CG.mk?'<p class="muted mkgridsrc"><span>Πηγή: CoinGecko · ενημέρωση</span> <b class="num">'+cgTime(CG.mkAt)+'</b></p>':'')}
    else box.innerHTML=MKS.stock.map(function(x){return '<div class="mkcell mkcell-s"><div class="mkcell-h">'+symIcon(x[0],22)+'<b>'+esc(x[0])+'</b> <span class="muted">'+esc(x[1])+'</span></div><div class="row" style="gap:.3rem;flex-wrap:wrap"><a class="btn small" href="https://www.tradingview.com/chart/?symbol='+encodeURIComponent(x[2])+'" target="_blank" rel="noopener noreferrer">TradingView</a><a class="btn small" href="https://finance.yahoo.com/quote/'+encodeURIComponent(x[0].replace('.','-'))+'" target="_blank" rel="noopener noreferrer">Yahoo</a><button type="button" class="btn small" data-mkfocus="'+esc(x[0])+'">Δικό μας γράφημα</button></div></div>'}).join('')}
}
function renderMkList(){var el=$('#mkList');if(!el)return;var it=mkItem(),sc=el.querySelector('.mklrows'),st=sc?[sc.scrollTop,sc.scrollLeft]:null;
  var h='<div class="mklh"><b style="font-size:.86rem">🪙 Crypto</b></div><div class="mklrows">';
  h+=MKS[MK.g].map(function(x){var c=MK.g==='crypto'&&CG.mk&&CG.mk[CGID[x[0]]],px=c?c.currentPrice:NaN,ch=c?c.priceChangePercentage24h:NaN;
    if(x===it&&PC.sym===mkSym(x)&&PC.raw.length&&PC.src==='Crypto.com'){var lb=PC.raw[PC.raw.length-1];px=lb.c;if(c&&isFinite(c.currentPrice)&&isFinite(ch)){var open24=c.currentPrice/(1+ch/100);ch=(px-open24)/open24*100}}
    return '<button type="button" class="mkrow'+(x===it?' on':'')+'" data-mks="'+esc(x[0])+'">'+symIcon(x[0],26)+'<span class="mkrn"><b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></span><span class="mkrp"><b class="num">'+(isFinite(px)?dmPx(px):'–')+'</b><small class="num '+cls(ch)+'">'+(isFinite(ch)?(ch>0?'+':'')+fmt(ch,2)+'%':'')+'</small></span></button>'}).join('');
  h+='</div>'+(MK.g==='stock'?'<p class="muted mklnote">'+esc(LANG_RU()?'Для акций пока нет живых цен.':'Για τις μετοχές δεν υπάρχουν ακόμα ζωντανές τιμές.')+'</p>':'');el.innerHTML=h;
  if(st){var n2=el.querySelector('.mklrows');n2.scrollTop=st[0];n2.scrollLeft=st[1]}}
function mkTf(){return {'15':'15m','60':'1h','240':'4h','D':'1d','W':'1d'}[MK.int]||'4h'}
function mkEma(v,p){var k=2/(p+1),o=[],e=null;v.forEach(function(x,i){e=e==null?x:x*k+e*(1-k);o.push(i>=p-1?e:NaN)});return o}
function mkDraw(){var cv=$('#mkCanvas'),bars=MK.bars;if(!bars||!bars.length){cv.hidden=true;return}cv.hidden=false;
  var dpr=window.devicePixelRatio||1,W=cv.clientWidth||640,H=cv.clientHeight||340;cv.width=W*dpr;cv.height=H*dpr;var c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
  var cs=getComputedStyle(document.body),cv2=function(n,d){return (cs.getPropertyValue(n)||'').trim()||d},up=cv2('--gain','#14855c'),dn=cv2('--loss','#c43d3d'),mu=cv2('--muted','#777'),ln=cv2('--line','#ddd'),ac=cv2('--accent','#0f6b5c');
  var e20=mkEma(bars.map(function(b){return b.c}),20),e50=mkEma(bars.map(function(b){return b.c}),50),N=Math.min(160,bars.length),off=bars.length-N,B=bars.slice(off);
  var lo=Infinity,hi=-Infinity,vmax=0;B.forEach(function(b){lo=Math.min(lo,b.l);hi=Math.max(hi,b.h);if(isFinite(b.v))vmax=Math.max(vmax,b.v)});var pd=(hi-lo)*.06||hi*.01||1;lo-=pd;hi+=pd;
  var pr=64,vh=vmax?H*.16:0,ch=H-vh-22,cw=(W-pr)/N,y=function(v){return 6+(hi-v)/(hi-lo)*(ch-6)};
  c.font='11px system-ui,sans-serif';c.fillStyle=mu;c.strokeStyle=ln;c.lineWidth=1;
  for(var g=0;g<=4;g++){var gv=lo+(hi-lo)*g/4,gy=Math.round(y(gv))+.5;c.beginPath();c.moveTo(0,gy);c.lineTo(W-pr,gy);c.stroke();c.fillText(dmPx(gv),W-pr+6,gy+4)}
  B.forEach(function(b,i){var x=i*cw+cw/2,col=b.c>=b.o?up:dn;c.strokeStyle=col;c.fillStyle=col;c.beginPath();c.moveTo(Math.round(x)+.5,y(b.h));c.lineTo(Math.round(x)+.5,y(b.l));c.stroke();
    var top=y(Math.max(b.o,b.c)),bh=Math.max(1,Math.abs(y(b.o)-y(b.c)));c.fillRect(x-Math.max(1,cw*.35),top,Math.max(2,cw*.7),bh);
    if(vmax&&isFinite(b.v)){c.globalAlpha=.35;var hh=b.v/vmax*vh;c.fillRect(x-Math.max(1,cw*.35),H-hh-16,Math.max(2,cw*.7),hh);c.globalAlpha=1}});
  [[e20,ac,'EMA 20'],[e50,'#c58a12','EMA 50']].forEach(function(L,k){c.strokeStyle=L[1];c.lineWidth=1.6;c.beginPath();var st=false;for(var i=0;i<N;i++){var v=L[0][off+i];if(!isFinite(v))continue;var x=i*cw+cw/2;if(!st){c.moveTo(x,y(v));st=true}else c.lineTo(x,y(v))}c.stroke();c.fillStyle=L[1];c.fillText(L[2],8+k*60,14)});
  var last=B[B.length-1],ly=y(last.c);c.fillStyle=last.c>=last.o?up:dn;c.fillRect(W-pr+2,ly-9,pr-4,18);c.fillStyle='#fff';c.fillText(dmPx(last.c),W-pr+6,ly+4);
  c.fillStyle=mu;var d0=new Date(B[0].t),d1=new Date(last.t);c.fillText(dateGr(lday(d0)),2,H-3);var t1=dateGr(lday(d1))+' '+pad2(d1.getHours())+':'+pad2(d1.getMinutes());c.fillText(t1,W-pr-c.measureText(t1).width-4,H-3);
  var chg=(last.c-B[0].c)/B[0].c*100;$('#mkMsg').innerHTML='<span>Τελευταία τιμή</span> <b class="num">'+dmPx(last.c)+'</b> · <b class="num '+cls(chg)+'">'+(chg>0?'+':'')+fmt(chg,2)+'%</b> <span>στο διάστημα του γραφήματος</span>'}
function mkUseText(t,src){var r=parseAnyPx(t,10);if(r.err){$('#mkMsg').textContent=r.err;return false}var it=mkItem(),sym=mkSym(it),txt=String(t).trim();
  src=src||(/^[\[{]/.test(txt)?(/retCode/.test(txt)?'Bybit':/"error"\s*:\s*\[/.test(txt)?'Kraken':/"status"\s*:\s*"ok"/.test(txt)?'HTX':'Binance/MEXC'):'CSV');
  pcOhlcSet(sym,r.bars,src);$('#mkMsg').textContent='';$('#pcPasteBox').hidden=true;renderMarkets();toast((LANG_RU()?'Загружено свечей: ':'Φορτώθηκαν κεριά: ')+r.bars.length);return true}
function bindMarkets(){
  var sec=$('section[data-panel=markets]');
  sec.addEventListener('click',function(e){var t=e.target,b;
    if((b=t.closest('[data-mg]'))){MK.g=b.getAttribute('data-mg');mkSave();renderMarkets();return}
    if((b=t.closest('[data-mv]'))){MK.v=b.getAttribute('data-mv');mkSave();renderMarkets();return}
    if((b=t.closest('[data-mks]'))){MK.sel[MK.g]=b.getAttribute('data-mks');MK.v='one';mkSave();renderMarkets();return}
    if((b=t.closest('[data-mkfocus]'))){MK.sel[MK.g]=b.getAttribute('data-mkfocus');MK.v='one';mkSave();renderMarkets();$('#mkOne').scrollIntoView({block:'start'});return}
    var it=mkItem(),sym=mkSym(it);
    if(t.closest('#mkDemo')){showTab('demo');dmReset();$('#dm-sym').value=sym;$('#dm-ex').value=MK.g==='crypto'?'binance':'tv';renderExLinks('dm-sym');renderDmCalc();setTimeout(function(){$('#dmForm').scrollIntoView({block:'start'});$('#dm-entry').focus()},60);return}
    if(t.closest('#mkTrade')){resetTradeForm();showTab('trades');$('#t-symbol').value=sym;var r=$('#t-m-'+(MK.g==='crypto'?'crypto':'stock'));if(r){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}))}renderExLinks('t-symbol');setTimeout(function(){$('#t-symbol').focus()},60);return}
    if(t.closest('#mkAsk')){var ask=function(withImg){QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();var q=$('#pq');if(q){q.value=(LANG_RU()?'Проанализируй ':'Ανάλυσε το γράφημα του ')+sym+' ('+it[1]+(PC.tf?', '+PC.tf:'')+(withImg?(LANG_RU()?') со скриншота, включая мои рисунки, и предложи 3-4 техники из Компаса.':') από την εικόνα, μαζί με τα σχέδιά μου, και πρότεινέ μου 3-4 τεχνικές από τον Μπούσουλα.'):(LANG_RU()?'). Предложи 3-4 техники из Компаса.':'). Πρότεινέ μου 3-4 τεχνικές από τον Μπούσουλα.'));q.focus()}};
      if(PC.cv&&PC.raw.length&&PC.cv.toBlob){PC.over=false;pcRender();PC.cv.toBlob(function(bl){if(bl){PCH.imgs=[];pAddImgs([new File([bl],'chart-'+sym+'.png',{type:'image/png'})])}ask(!!bl)},'image/png')}else ask(false);return}
    if(t.closest('#pcPasteT')){var pb=$('#pcPasteBox');pb.hidden=!pb.hidden;if(!pb.hidden)$('#mkPaste').focus();return}
    if(t.closest('#pcBack')){pcOhlcDel(sym);PC.sym='';renderMarkets();return}
    if(t.closest('[data-ccretry]')){var cn=mkItem()[0];delete CC.bad[cn];ccStop();renderMarkets();return}
    if(t.closest('[data-cgretry]')){if(MK.v==='one')cgLoadChart();else cgMarketsOnce();return}
    if(t.closest('#mkUse')){var v=$('#mkPaste').value;if(!v.trim()){$('#mkMsg').textContent='Επικόλλησε πρώτα τις τιμές.';return}if(mkUseText(v))$('#mkPaste').value='';return}
  });
  $('#mkInt').addEventListener('change',function(e){MK.int=e.target.value;mkSave();renderMarkets()});
  $('#mkDays').addEventListener('change',function(e){MK.days=e.target.value;mkSave();renderMarkets()});
  $('#mkCcTf').addEventListener('change',function(e){CC.tf=e.target.value;try{localStorage.setItem('tj-cctf',CC.tf)}catch(x){}ccStop();renderMarkets()});
  $('#pcFile').addEventListener('change',function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){mkUseText(String(rd.result||''),/\.json$/i.test(f.name)?null:'TradingView CSV')};rd.readAsText(f);e.target.value=''});
  cgInit();

  if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(){$('#mkGridBox').dataset.k='';$('#mkFrame').innerHTML='';renderMarkets()})}catch(e){}
  renderMarkets();
}

/* ================= Γρήγορα links σε ανταλλακτήρια ================= */
var EXL=[['tv','TradingView','TV','#131722','#ffffff'],['mexc','MEXC','MX','#1972e2','#ffffff'],['binance','Binance','BN','#f0b90b','#1e2026'],['kraken','Kraken','KR','#5741d9','#ffffff'],['okx','OKX','OKX','#000000','#ffffff'],['bybit','Bybit','BY','#17181e','#f7a600'],['htx','HTX','HTX','#0a2c5a','#ffffff']];
function exPair(sym){var q=['FDUSD','USDT','USDC','BUSD','USD','EUR','BTC','ETH'].find(function(x){return sym.length>x.length+1&&sym.slice(-x.length)===x});return q?{b:sym.slice(0,-q.length),q:q}:null}
function exUrl(k,sym){var s0=dmSym(sym),p=exPair(s0);
  if(k==='tv')return s0?'https://www.tradingview.com/chart/?symbol='+encodeURIComponent((p&&!/^(GER|DE|US|NAS|SPX|UK)\d/.test(s0)?'BINANCE:':'')+s0):'https://www.tradingview.com/chart/';
  if(!p)return {bybit:'https://www.bybit.com/en/markets/spot',htx:'https://www.htx.com/markets',mexc:'https://www.mexc.com/exchange/BTC_USDT',binance:'https://www.binance.com/en/markets/overview',kraken:'https://pro.kraken.com/app/trade',okx:'https://www.okx.com/markets/prices'}[k];
  if(k==='mexc')return 'https://www.mexc.com/exchange/'+p.b+'_'+p.q;
  if(k==='binance')return 'https://www.binance.com/en/trade/'+p.b+'_'+p.q+'?type=spot';
  if(k==='kraken')return 'https://pro.kraken.com/app/trade/'+p.b.toLowerCase()+'-'+p.q.toLowerCase();
  if(k==='bybit')return 'https://www.bybit.com/trade/spot/'+p.b+'/'+p.q;
  if(k==='htx')return 'https://www.htx.com/trade/'+p.b.toLowerCase()+'_'+p.q.toLowerCase();
  return 'https://www.okx.com/trade-spot/'+p.b.toLowerCase()+'-'+p.q.toLowerCase()}
function exLinksHtml(sym,big){return EXL.map(function(e){return '<a class="exl'+(big?' big':'')+'" data-exk="'+e[0]+'" href="'+esc(exUrl(e[0],sym))+'" target="_blank" rel="noopener noreferrer" title="'+esc(e[1])+'" aria-label="'+esc(e[1])+'"><span class="exi" style="background:'+e[3]+';color:'+e[4]+'">'+e[2]+'</span>'+(big?'<span class="exn">'+e[1]+'</span>':'')+'</a>'}).join('')}
function renderExLinks(only){$$('[data-exsym]').forEach(function(el){var id=el.getAttribute('data-exsym');if(only&&only!==id)return;var inp=document.getElementById(id);el.innerHTML=exLinksHtml(inp?inp.value:'',!!el.getAttribute('data-big'))})}
function clipPaste(btn){var id=btn.getAttribute('data-clip'),go=btn.getAttribute('data-clipgo'),ta=document.getElementById(id);if(!ta)return;
  if(id==='mkPaste'){var pb=$('#pcPasteBox');if(pb)pb.hidden=false}
  if(!navigator.clipboard||!navigator.clipboard.readText){toast(LANG_RU()?'Этот браузер не даёт читать буфер обмена. Вставьте вручную.':'Αυτός ο browser δεν αφήνει την ανάγνωση του προχείρου. Κάνε επικόλληση με το χέρι.');ta.focus();return}
  navigator.clipboard.readText().then(function(t){if(!t||!t.trim()){toast(LANG_RU()?'Буфер обмена пуст.':'Το πρόχειρο είναι άδειο.');return}ta.value=t;var g=go&&document.getElementById(go);if(g)g.click()})
   .catch(function(){toast(LANG_RU()?'Нет доступа к буферу обмена здесь. Вставьте вручную (долгое нажатие → Вставить).':'Δεν επιτρέπεται η ανάγνωση του προχείρου εδώ. Κάνε επικόλληση με το χέρι (παρατεταμένο πάτημα → Επικόλληση).');ta.focus()})}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-clip]');if(b){e.preventDefault();clipPaste(b)}});
function bindExLinks(){
  var es=$('#ex-sym');try{es.value=localStorage.getItem('tj-exsym')||''}catch(e){}
  document.addEventListener('input',function(e){var id=e.target&&e.target.id;if(id==='ex-sym'||id==='t-symbol'||id==='dm-sym'){if(id==='ex-sym'){try{localStorage.setItem('tj-exsym',e.target.value)}catch(x){}}renderExLinks(id)}});
  document.addEventListener('click',function(e){var a=e.target.closest('a.exl');if(!a)return;var box=a.closest('[data-exsym]'),inp=box&&document.getElementById(box.getAttribute('data-exsym'));a.href=exUrl(a.getAttribute('data-exk'),inp?inp.value:'')},true);
  renderExLinks();
}

/* ================= Demo λογαριασμός ================= */
var DM={who:null,ev:null,hlim:40};
var DMEX={cc:'Crypto.com (αυτόματα)',binance:'Binance',mexc:'MEXC',bybit:'Bybit',kraken:'Kraken',htx:'HTX',tv:'TradingView'};
var DMTF=[['1m',6e4],['5m',3e5],['15m',9e5],['1h',36e5],['4h',144e5],['1d',864e5]];
function dmTfMs(tf){var x=DMTF.find(function(y){return y[0]===tf});return x?x[1]:36e5}
function dmR2(x){return isFinite(x)?Math.round(x*100)/100:null}
function dmSym(v){return String(v||'').toUpperCase().replace(/^[A-Z]+:/,'').replace(/[^A-Z0-9]/g,'')}
function dmLocal(ms){var d=new Date(ms);return lday(d)+'T'+pad2(d.getHours())+':'+pad2(d.getMinutes())}
function dmAcct(uid){var a=(S.demoacct||{})[safeSeg(uid||'me')];if(!a&&uid==='prof')a={start:10000,ccy:'USDT',resetAt:0};a=a||{};var st=isFinite(n(a.start))&&n(a.start)>0?n(a.start):10000;if(uid==='prof'&&typeof APF!=='undefined'&&APF.list.length){var RL=APF.list.filter(function(p){return p.run!==false});st=sum((RL.length?RL:APF.list).map(apfStart))}/* με προφίλ: ο συνολικός λογαριασμός = άθροισμα των κεφαλαίων των προφίλ */return {start:st,ccy:a.ccy||'USDT',resetAt:a.resetAt||0,byProfiles:uid==='prof'&&typeof APF!=='undefined'&&APF.list.length>0}}
function dmOf(uid){if(uid==='prof')return (S.demo||[]).slice();return (S.demo||[]).filter(function(t){return t.by===uid})}
function dmClosed(t){return t.status==='win'||t.status==='loss'||t.status==='expired'||t.status==='closed'}
function dmCounts(t){return dmClosed(t)&&isFinite(n(t.r))&&!t.nofill}
function dmBal(uid){var a=dmAcct(uid);return a.start+sum(dmOf(uid).filter(function(t){return !apfOff(t)&&dmClosed(t)&&(t.at||0)>=a.resetAt&&isFinite(n(t.pnl))}).map(function(t){return n(t.pnl)}))}
function dmPx(x){return isFinite(x)?x.toLocaleString('el-GR',{minimumFractionDigits:2,maximumFractionDigits:x<0.01?8:x<1?6:x<100?4:2}):'–'}
function dmMoney(x,ccy){return isFinite(x)?fmt(x,2)+' '+(ccy||'USDT'):'–'}
function dmSymCell(t){var sy=String(t.symbol||''),b=sy.replace(/(USDT|USDC|USD|PERP)$/,'');return '<span class="dmsym">'+symIcon(b,18)+'<b>'+esc(sy||'–')+'</b>'+(sy?'<a class="tvl" href="'+esc(exUrl('tv',sy))+'" target="_blank" rel="noopener noreferrer" title="Άνοιξε το '+esc(sy)+' στο TradingView" aria-label="TradingView">TV</a>':'')+'</span>'}
function dmBar(t){var s0=n(t.stop),tg=n(t.target),e=n(t.entry);if(!isFinite(s0)||!isFinite(tg)||tg===s0)return '';var lq=DM.live&&DM.live[dmSym(t.symbol)],lp=lq&&Date.now()-lq.at<3*60000?lq.px:livePx(t.symbol);if(!isFinite(lp))lp=n(t.lastPx);
  var span=tg-s0,pe=Math.max(0,Math.min(1,(e-s0)/span)),pc=isFinite(lp)?(lp-s0)/span:NaN,cl=Math.max(0,Math.min(1,pc)),run=!dmIsPend(t)&&t.status==='open',col=!isFinite(pc)?'#888':pc>pe?'#26a69a':'#ef5350';
  var r=isFinite(lp)?((lp-e)*(t.dir==='short'?-1:1)/Math.abs(e-s0)):NaN;
  return '<div class="dmbarw" title="Stop '+dmPx(s0)+' · Είσοδος '+dmPx(e)+' · Στόχος '+dmPx(tg)+(isFinite(lp)?' · Τώρα '+dmPx(lp):'')+'"><span class="sl">SL</span><div class="dmbar"><b style="left:'+(pe*100).toFixed(1)+'%"></b>'+(isFinite(pc)?'<u style="left:'+(cl*100).toFixed(1)+'%;background:'+col+'"></u>':'')+'</div><span class="tp">TP</span>'+(run&&isFinite(r)?'<em class="'+(r>=0?'pos':'neg')+'">'+(r>=0?'+':'')+fmt(r,2)+'R</em>':'')+'</div>'}
function dmIsPend(t){return t.status==='open'&&!t.filledAt&&(t.ord==='limit'||(t.checkedAt&&t.curR==null))}
function dmStatusPill(t){var s=t.status,pend=dmIsPend(t);
  if(pend)return '<span class="pill dmpend" title="Η εντολή δεν έχει εκτελεστεί: περιμένει την τιμή να αγγίξει την είσοδο">⏳ Σε αναμονή'+(isFinite(n(t.entry))?' @ '+dmPx(n(t.entry)):'')+'</span>';
  if(s==='open')return '<span class="pill dmrun" title="Η εντολή εκτελέστηκε'+(t.filledAt?' '+esc(dateGr(lday(new Date(t.filledAt)))+' '+pad2(new Date(t.filledAt).getHours())+':'+pad2(new Date(t.filledAt).getMinutes())):'')+'"><i></i>Τρέχει</span>';
  return '<span class="pill '+(s==='win'?'gain':s==='loss'?'loss':s==='open'?'acc':'warn')+'">'+(pend?'Αναμονή εισόδου':s==='win'?'Στόχος':s==='loss'?'Stop':s==='expired'?(t.nofill?'Δεν μπήκε':'Έληξε'):s==='closed'?'Κλείσιμο':'Ανοιχτή')+'</span>'}
function dmDirPill(t){return '<span class="pill '+(t.dir==='short'?'loss':'gain')+'">'+(t.dir==='short'?'Short':'Long')+'</span>'+(t.lev>1?' <span class="pill warn">x'+t.lev+'</span>':'')}
function techLvls(t){var a=[];if(t.dir)a.push('<span class="pill '+(t.dir==='short'?'loss':'gain')+'">'+(t.dir==='short'?'Short':'Long')+'</span>');
  [['entry','Είσοδος'],['stop','Stop'],['target','Στόχος']].forEach(function(k){if(isFinite(n(t[k[0]]))&&t[k[0]]!=null)a.push('<span><span>'+k[1]+'</span> <b class="num">'+dmPx(n(t[k[0]]))+'</b></span>')});
  return a.length?'<span class="tclv">'+a.join(' ')+'</span>':''}
function dmTfFor(ms,ex){var span=Math.max(0,Date.now()-ms),cap=ex==='kraken'?680:950;for(var i=0;i<DMTF.length;i++){if(span/DMTF[i][1]<cap)return DMTF[i][0]}return '1d'}
function dmUrl(ex,sym,tf,start){
  sym=dmSym(sym);if(!sym)return '';var st=Math.max(0,Math.floor((start||Date.now())-dmTfMs(tf)*2));
  if(ex==='binance')return 'https://api.binance.com/api/v3/klines?symbol='+sym+'&interval='+tf+'&startTime='+st+'&limit=1000';
  if(ex==='mexc')return 'https://api.mexc.com/api/v3/klines?symbol='+sym+'&interval='+(tf==='1h'?'60m':tf)+'&startTime='+st+'&limit=1000';
  if(ex==='bybit')return 'https://api.bybit.com/v5/market/kline?category=spot&symbol='+sym+'&interval='+{'1m':'1','5m':'5','15m':'15','1h':'60','4h':'240','1d':'D'}[tf]+'&start='+st+'&limit=1000';
  if(ex==='kraken')return 'https://api.kraken.com/0/public/OHLC?pair='+sym.replace(/^BTC/,'XBT')+'&interval='+{'1m':1,'5m':5,'15m':15,'1h':60,'4h':240,'1d':1440}[tf]+'&since='+Math.floor(st/1000);
  if(ex==='htx')return 'https://api.huobi.pro/market/history/kline?symbol='+sym.toLowerCase()+'&period='+{'1m':'1min','5m':'5min','15m':'15min','1h':'60min','4h':'4hour','1d':'1day'}[tf]+'&size=2000';
  return '';
}
function dmFetch(url){if(!url||!window.fetch||!window.AbortController)return Promise.reject(new Error('no'));var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},8000);
  clearTimeout(tm);return Promise.reject(new Error('blocked'))}
/* evaluate one demo trade against candles: first touch of stop or target; stop wins a tie (conservative) */
function dmEval(t,bars){
  var e=n(t.entry),s=n(t.stop),tg=n(t.target),d=t.dir==='short'?-1:1,risk=Math.abs(e-s);
  if(!(risk>0))return {err:'Χωρίς σωστό stop'};
  var diffs=[];for(var k=1;k<Math.min(bars.length,60);k++)diffs.push(bars[k].t-bars[k-1].t);var iv=median(diffs)||6e4;
  var at=t.at||Date.now(),exp=t.exp?at+t.exp*36e5:Infinity,lastEnd=bars[bars.length-1].t+iv;
  if(bars[0].t>at+iv)return {err:'Οι τιμές ξεκινούν μετά την είσοδο. Διάλεξε μεγαλύτερο timeframe.'};
  if(lastEnd<=at)return {err:'Οι τιμές τελειώνουν πριν την είσοδο.'};
  var i0=barIdx(bars,at);if(i0<0)i0=0;else if(bars[i0].t<at)i0++;
  var conv=false;if(t.ord!=='limit'){var bj=barIdx(bars,at),bb=bars[Math.max(0,bj)],tol=e*0.0015;if(!(bb.l-tol<=e&&bb.h+tol>=e))conv=true}
  var filled=conv?false:(t.ord!=='limit'||!!t.filledAt),fillT=filled?(t.filledAt||at):null,mfe=0,mae=0;
  var mg=t.mgmt||'none',cs=s;/* διαχείριση εξόδου: break-even ή trailing, με τη στάθμη του προηγούμενου κεριού (συντηρητικά) */
  var expFill=t.src==='auto';/* στις αυτόματες η λήξη αφορά μόνο την εντολή με όριο που δεν γέμισε: αφού γεμίσει, η θέση μένει μέχρι stop ή στόχο */
  for(var i=i0;i<bars.length;i++){var b=bars[i];if(b.t>=exp&&(!expFill||!filled))break;
    if(!filled){if(b.l<=e&&b.h>=e){filled=true;fillT=b.t}else continue}
    var fav=(d>0?b.h-e:e-b.l)/risk,adv=(d>0?e-b.l:b.h-e)/risk,hitS=d>0?b.l<=cs:b.h>=cs,hitT=isFinite(tg)&&(d>0?b.h>=tg:b.l<=tg);
    if(hitS){var rs=(cs-e)*d/risk;return {conv:conv,status:rs>0?'win':'loss',mg:cs!==s?mg:null,exit:cs,exitAt:b.t,r:rs,mfe:Math.max(mfe,Math.max(0,fav)),mae:Math.max(mae,Math.min(1,Math.max(0,adv))),amb:hitT,filledAt:fillT,moved:cs!==s}}
    if(hitT)return {conv:conv,status:'win',exit:tg,exitAt:b.t,r:(tg-e)*d/risk,mfe:Math.max(mfe,fav),mae:Math.max(mae,Math.max(0,adv)),filledAt:fillT};
    mfe=Math.max(mfe,fav);mae=Math.max(mae,adv);
    if(mg==='be'&&mfe>=1&&(cs-e)*d<0)cs=e+d*0.05*risk;/* break-even +0,05R για να καλύπτει τα fees */
    if(mg==='trail'&&mfe>=1){var ns=e+d*(mfe-1)*risk;if((ns-cs)*d>0)cs=ns}
  }
  var lb=bars[bars.length-1];
  if(exp!==Infinity&&lastEnd>=exp&&(!expFill||!filled)){
    if(!filled)return {conv:conv,status:'expired',nofill:true,r:0,mfe:0,mae:0,exitAt:exp};
    var j=barIdx(bars,exp-1),cb=bars[Math.max(0,Math.min(bars.length-1,j))];return {conv:conv,status:'expired',exit:cb.c,exitAt:exp,r:(cb.c-e)*d/risk,mfe:mfe,mae:mae,filledAt:fillT};
  }
  if(!filled)return {conv:conv,status:'open',pending:true,mfe:0,mae:0,cur:NaN,lastPx:lb.c,lastT:lastEnd};
  return {conv:conv,status:'open',mfe:mfe,mae:mae,cur:(lb.c-e)*d/risk,lastPx:lb.c,lastT:lastEnd,filledAt:fillT,cs:cs!==s?cs:null};
}
/* forecast: from the proposal time, did price reach target or stop first (whether or not the entry filled) */
function dmForecast(t,bars){var e=n(t.entry),sl=n(t.stop),tg=n(t.target),d=t.dir==='short'?-1:1;if(!isFinite(tg)||!isFinite(sl)||!bars.length)return null;
  var at=t.at||0;if(bars[0].t>at+36e5)return 'err';var i0=barIdx(bars,at),c0=bars[Math.max(0,i0)].c;if((tg-c0)*d<=0||(c0-sl)*d<=0)return 'void';if(i0<0)i0=0;else if(bars[i0].t<at)i0++;
  for(var i=i0;i<bars.length;i++){var b=bars[i],hs=d>0?b.l<=sl:b.h>=sl,ht=d>0?b.h>=tg:b.l<=tg;if(hs)return 'miss';if(ht)return 'hit'}return null}
function dmClean(t){var d=Object.assign({},t);delete d.id;return d}
function cfAutoOutcome(id,st){var c=(S.confirms||[]).find(function(x){return x.id===id});if(!c||c.by!==S.uid||c.outcome)return;var d=dmClean(c);d.outcome=st;d.outAt=Date.now();d.auto=true;c.outcome=st;put('confirms',id,d).catch(function(){})}
function dmSaveEval(t,x,E){if(!(S.demo||[]).some(function(z){return z.id===t.id}))return Promise.resolve();var d=dmClean(t);d.checkedAt=Date.now();d.evalSrc=(DMEX[E.ex]||E.ex)+(E.ex==='tv'?'':' '+E.tf);d.mfe=dmR2(x.mfe);d.mae=dmR2(Math.min(1,x.mae));
  if(x.conv)d.ord='limit';if(x.filledAt)d.filledAt=x.filledAt;else delete d.filledAt;d.ordChecked=true;
  if(x.status==='open'){d.status='open';d.curR=dmR2(x.cur);if(x.cs!=null)d.curStop=x.cs;else delete d.curStop;d.lastPx=x.lastPx;d.lastT=x.lastT}
  else{d.status=x.status;d.exit=x.exit==null?null:x.exit;d.exitAt=x.exitAt||null;d.r=dmR2(x.r);d.pnl=dmR2(x.r*n(t.riskAmt));if(n(t.margin)>0)d.roe=dmR2(d.pnl/n(t.margin)*100);d.amb=!!x.amb;d.nofill=!!x.nofill;d.curR=null;
    if(t.cfId&&(d.status==='win'||d.status==='loss'))cfAutoOutcome(t.cfId,d.status)}
  return put('demo',t.id,d)}
function dmRecheck(all){var since=Date.now()-14*864e5,L=dmOf('prof').filter(function(t){return dmClosed(t)&&t.evalSrc&&t.evalSrc!=='χειροκίνητα'&&(t.at||0)>since&&(all||t.ord!=='limit')});
  if(!L.length){if(all)toast('Δεν υπάρχουν demo συναλλαγές για επανέλεγχο.');return}
  var jobs=L.map(function(t){var d=dmClean(t);['exit','exitAt','r','pnl','roe','filledAt','curR','checkedAt','amb','nofill','mfe','mae','lastPx','lastT'].forEach(function(k){delete d[k]});d.status='open';d.ordChecked=false;
    var c=t.cfId&&(S.confirms||[]).find(function(x){return x.id===t.cfId});var p2=Promise.resolve();if(c&&c.auto&&c.by===S.uid){var cd=dmClean(c);cd.outcome=null;delete cd.auto;delete cd.outAt;c.outcome=null;p2=put('confirms',c.id,cd)}
    return Promise.all([put('demo',t.id,d),p2])});
  Promise.all(jobs).then(function(){toast('Επανέλεγχος '+L.length+' demo συναλλαγών με πραγματικές τιμές…');AE.busy=false;setTimeout(function(){autoEval(true)},1500)}).catch(function(e){toast(writeErr(e))})}
setTimeout(function(){try{var k='tj-dmfix2-'+(S.uid||'');if(S.uid&&qCanSave()&&localStorage.getItem(k)!=='1'){localStorage.setItem(k,'1');dmRecheck(false)}}catch(e){}},12000);
function dmGroups(){var g={};dmOf('prof').filter(function(t){return !dmClosed(t)}).forEach(function(t){var k=(t.ex||'binance')+'|'+dmSym(t.symbol);(g[k]=g[k]||[]).push(t)});return g}
function dmOpenEval(key){
  var gs=dmGroups();if(!key)key=Object.keys(gs)[0];var g=gs[key];if(!g){toast('Δεν έχεις ανοιχτές demo συναλλαγές.');return}
  var ex=key.split('|')[0],first=Math.min.apply(null,g.map(function(t){return t.at||Date.now()}));if(ex!=='tv'&&CG.mcp)ex='cc';
  DM.ev={key:key,ex:ex,sym:key.split('|')[1],tf:ex==='cc'?ccTfFor(first):dmTfFor(first,ex),first:first,msg:'',res:''};renderDmEval();
  var c=$('#dmEvalCard');c.hidden=false;setTimeout(function(){c.scrollIntoView({block:'start',behavior:'smooth'})},30);
  if(ex!=='tv')dmTryFetch();
}
function renderDmEval(){
  var E=DM.ev,c=$('#dmEvalCard');if(!E){c.hidden=true;c.innerHTML='';return}
  var gs=dmGroups(),g=gs[E.key]||[],keys=Object.keys(gs),u=E.ex==='tv'?'':dmUrl(E.ex,E.sym,E.tf,E.first);
  var h='<div class="formhead"><h2 style="margin:0">Έλεγχος με πραγματικές τιμές</h2><button type="button" class="btn small" id="dmEvX">Κλείσιμο</button></div><div class="fields advf" style="margin-top:.6rem">';
  if(keys.length>1||!g.length)h+='<label class="f">Σύμβολο<select id="dmEvGrp">'+(g.length?'':'<option value="'+esc(E.key)+'">'+esc(E.sym)+'</option>')+keys.map(function(k){return '<option value="'+esc(k)+'"'+(k===E.key?' selected':'')+'>'+esc(k.split('|')[1]+' · '+(DMEX[k.split('|')[0]]||''))+' ('+gs[k].length+')</option>'}).join('')+'</select></label>';
  h+='<label class="f">Πηγή τιμών<select id="dmEvEx">'+Object.keys(DMEX).map(function(k){return '<option value="'+k+'"'+(k===E.ex?' selected':'')+'>'+DMEX[k]+(k==='tv'?' (CSV)':'')+'</option>'}).join('')+'</select></label>';
  if(E.ex==='cc')h+='<label class="f">Timeframe<select id="dmEvTf">'+CC_TFL.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===E.tf?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></label>';
  else if(E.ex!=='tv')h+='<label class="f">Timeframe<select id="dmEvTf">'+DMTF.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===E.tf?' selected':'')+'>'+x[0]+'</option>'}).join('')+'</select></label>';
  h+='</div><p class="muted" style="font-size:.86rem;margin:.5rem 0"><span>Ανοιχτές demo σε αυτό το σύμβολο:</span> <b>'+g.length+'</b></p>';
  if(E.ex==='cc')h+='<div class="row" style="gap:.4rem;flex-wrap:wrap"><button type="button" class="btn primary" id="dmEvGo">Φέρε τιμές τώρα</button></div><p class="muted fpurl"><span>Κεριά αυτόματα από τη σύνδεση Crypto.com, χωρίς αντιγραφή. Αν η συναλλαγή είναι παλιά, διάλεξε μεγαλύτερο timeframe.</span></p>';
  else if(E.ex==='tv')h+='<ol class="fpsteps"><li><span>Στο TradingView άνοιξε το γράφημα του συμβόλου σε timeframe που φτάνει πίσω μέχρι τη στιγμή της εισόδου (π.χ. 5m για σημερινές, 1h για την εβδομάδα).</span></li><li><span>Μενού γραφήματος (τα τρία τελάκια) → Export chart data… → CSV.</span></li><li><span>Ανέβασε το αρχείο εδώ με το «Ανέβασε CSV».</span></li></ol>';
  else h+='<div class="row" style="gap:.4rem;flex-wrap:wrap"><button type="button" class="btn primary" id="dmEvGo">Φέρε τιμές τώρα</button><a class="btn" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Άνοιξε τις τιμές</a></div><p class="muted fpurl"><span>Αν το «Φέρε τιμές τώρα» δεν δουλεύει: πάτα «Άνοιξε τις τιμές», αντέγραψε όλη τη σελίδα που ανοίγει και επικόλλησέ τη στο κουτί.</span> <code>'+esc(u)+'</code></p>';
  h+='<label class="f full" style="margin-top:.4rem">Επικόλληση τιμών<textarea id="dmEvPaste" rows="3" placeholder="Επικόλλησε εδώ τις τιμές (JSON από ανταλλακτήριο ή CSV)"></textarea></label>'+
    '<div class="row" style="gap:.4rem;flex-wrap:wrap;margin-top:.4rem"><button type="button" class="btn" id="dmEvUse">Έλεγξε με αυτές τις τιμές</button><button type="button" class="btn" data-clip="dmEvPaste" data-clipgo="dmEvUse">📋 Επικόλληση από πρόχειρο</button><label class="btn"><span>Ανέβασε CSV</span><input type="file" id="dmEvFile" accept=".csv,.txt,.json,text/csv" hidden></label></div>'+
    '<div id="dmEvOut" style="margin-top:.7rem">'+(E.msg?'<p class="status '+(E.bad?'warn':'ok')+'" style="margin:0 0 .6rem"><span>'+esc(E.msg)+'</span></p>':'')+(E.res||'')+'</div>';
  c.innerHTML=h;c.hidden=false;
}
function dmTryFetch(){var E=DM.ev;if(!E||E.ex==='tv')return;if(E.ex==='cc'){E.msg='Φέρνω τιμές από το Crypto.com…';E.bad=false;renderDmEval();ccFetchBars(E.sym,E.tf).then(function(r){if(DM.ev===E)dmApplyText({bars:r.bars})}).catch(function(e){if(DM.ev!==E)return;E.msg=e&&e.code==='not_found'?'Η Crypto.com δεν έχει αυτό το ζευγάρι. Διάλεξε άλλη πηγή τιμών.':ccErrText(e);E.bad=true;renderDmEval()});return}var u=dmUrl(E.ex,E.sym,E.tf,E.first);E.msg='Φέρνω τιμές…';E.bad=false;renderDmEval();
  dmFetch(u).then(function(txt){if(DM.ev===E)dmApplyText(txt)}).catch(function(){if(DM.ev!==E)return;E.msg='Η σελίδα δεν μπορεί να φέρει τιμές απευθείας από εδώ. Πάτα «Άνοιξε τις τιμές», αντέγραψε όλη τη σελίδα και επικόλλησέ τη στο κουτί.';E.bad=true;renderDmEval()})}
function dmApplyText(txt){var E=DM.ev;if(!E)return;var r=txt&&txt.bars?txt:parseAnyPx(txt,2);if(r.err){E.msg=r.err;E.bad=true;E.res='';renderDmEval();return}
  if(!qCanSave()){E.msg='Δεν μπορείς να αποθηκεύσεις. Χρειάζεσαι δικαίωμα Editor και δικό σου λογαριασμό.';E.bad=true;renderDmEval();return}
  var bars=r.bars,g=dmGroups()[E.key]||[],rows=[],writes=[];
  g.forEach(function(t){var x=dmEval(t,bars);rows.push({t:t,x:x});if(!x.err)writes.push(dmSaveEval(t,x,E))});
  var done=rows.filter(function(z){return !z.x.err&&z.x.status!=='open'}).length;
  E.msg='';E.bad=false;E.res='<p class="muted" style="font-size:.86rem;margin:0 0 .5rem"><span>Κεριά:</span> <b>'+bars.length+'</b> · <b class="num">'+esc(dateGr(lday(new Date(bars[0].t)))+' '+pad2(new Date(bars[0].t).getHours())+':'+pad2(new Date(bars[0].t).getMinutes())+' – '+dateGr(lday(new Date(bars[bars.length-1].t)))+' '+pad2(new Date(bars[bars.length-1].t).getHours())+':'+pad2(new Date(bars[bars.length-1].t).getMinutes()))+'</b> · <span>έκλεισαν:</span> <b>'+done+'</b> / '+rows.length+'</p>'+
    '<div class="tw"><table><thead><tr><th>Είσοδος</th><th>Σύμβολο</th><th>Θέση</th><th>Αποτέλεσμα</th><th class="r">R</th><th class="r">Υπέρ (MFE)</th><th class="r">Κόντρα (MAE)</th><th>Σημείωση</th></tr></thead><tbody>'+
    rows.map(function(z){var t=z.t,x=z.x;if(x.err)return '<tr><td>'+esc(dateGr(t.date)+' '+(t.time||''))+(t.by&&t.by!=='prof'&&t.src!=='auto'?'<br><span class="muted" style="font-size:.74rem">'+esc(t.by===S.uid?'εσύ':name(t.by))+'</span>':'')+'</td><td>'+dmSymCell(t)+'</td><td>'+dmDirPill(t)+'</td><td colspan="5" class="muted">'+esc(x.err)+'</td></tr>';
      var st={status:x.status,ord:t.ord,filledAt:x.filledAt,nofill:x.nofill},R=x.status==='open'?x.cur:x.r;
      return '<tr><td>'+esc(dateGr(t.date)+' '+(t.time||''))+(t.by&&t.by!=='prof'&&t.src!=='auto'?'<br><span class="muted" style="font-size:.74rem">'+esc(t.by===S.uid?'εσύ':name(t.by))+'</span>':'')+'</td><td>'+dmSymCell(t)+'</td><td>'+dmDirPill(t)+' <span class="num">'+dmPx(n(t.entry))+'</span></td><td>'+dmStatusPill(st)+'</td><td class="r num '+cls(R)+'">'+(isFinite(R)?fR(R):'–')+(x.status==='open'&&isFinite(R)?' <span class="muted">τώρα</span>':'')+'</td><td class="r num pos">'+fR(x.mfe)+'</td><td class="r num neg">'+fR(-Math.min(1,x.mae))+'</td><td class="muted" style="font-size:.8rem">'+(x.amb?'<span>Stop και στόχος στο ίδιο κερί: μετράει ως stop. Δοκίμασε μικρότερο timeframe.</span>':'')+(x.pending?'<span>Η τιμή δεν έφτασε ακόμα στην είσοδο.</span>':'')+'</td></tr>'}).join('')+'</tbody></table></div>';
  renderDmEval();
  Promise.all(writes).then(function(){if(writes.length)toast('Οι demo συναλλαγές ενημερώθηκαν.')}).catch(function(e){toast(writeErr(e))});
}
function dmLvl(k,e,d,lev){var v=n($('#dm-'+k).value),u=($('#dm-'+k+'u')||{}).value||'px';if(!isFinite(v)||u==='px')return v;if(!(e>0))return NaN;var pc=Math.abs(v)/(u==='roe'?Math.max(1,lev):1)/100;return +(e*(1+(k==='stop'?-d:d)*pc)).toPrecision(8)}
function dmPxUnits(){['stop','target'].forEach(function(k){var x=$('#dm-'+k+'u');if(x)x.value='px'})}
function dmCalc(){
  var e0=n($('#dm-entry').value),d0=$('#dm-dir').value==='short'?-1:1,lv0=Math.min(50,Math.max(1,+$('#dm-lev').value||1));
  var e=e0,s=dmLvl('stop',e0,d0,lv0),tg=dmLvl('target',e0,d0,lv0),d=$('#dm-dir').value==='short'?-1:1,bal=dmBal('prof'),mode=$('#dm-mode').value,atv=$('#dm-at').value,at=atv?new Date(atv).getTime():Date.now(),exp=n($('#dm-exp').value);
  var o={e:e,s:s,tg:tg,at:at,exp:exp,bal:bal,ccy:dmAcct('prof').ccy};
  if(!dmSym($('#dm-sym').value))o.err='Γράψε σύμβολο (π.χ. BTCUSDT).';
  else if(!isFinite(e)||!isFinite(s)||e<=0||s<=0)o.err='Χρειάζονται είσοδος και stop.';
  else if((s-e)*d>=0)o.err=d>0?'Σε long το stop πρέπει να είναι κάτω από την είσοδο.':'Σε short το stop πρέπει να είναι πάνω από την είσοδο.';
  else if(isFinite(tg)&&(tg-e)*d<=0)o.err=d>0?'Σε long ο στόχος πρέπει να είναι πάνω από την είσοδο.':'Σε short ο στόχος πρέπει να είναι κάτω από την είσοδο.';
  else if(!isFinite(at))o.err='Η ημερομηνία εισόδου δεν είναι σωστή.';
  if(o.err)return o;
  var risk=Math.abs(e-s);
  var lev=Math.min(50,Math.max(1,+$('#dm-lev').value||1));o.lev=lev;
  if(mode==='amount'){var amt=n($('#dm-amt').value);if(!(amt>0)){o.err='Γράψε το ποσό που βάζεις.';return o}o.margin=amt;o.notional=amt*lev;o.qty=o.notional/e;o.riskAmt=o.qty*risk;o.riskPct=o.riskAmt/bal*100}
  else{var rp=n($('#dm-risk').value);if(!(rp>0)){o.err='Γράψε ρίσκο %.';return o}o.riskPct=rp;o.riskAmt=bal*rp/100;o.qty=o.riskAmt/risk;o.notional=o.qty*e;o.margin=o.notional/lev}
  o.rr=isFinite(tg)?Math.abs(tg-e)/risk:NaN;
  o.used=sum(dmOf('prof').filter(function(t){return !dmClosed(t)}).map(function(t){return n(t.margin)||n(t.notional)||0}));o.free=bal-o.used;
  o.liq=lev>1?e*(d>0?1-1/lev+0.005:1+1/lev-0.005):NaN;
  if(o.margin>o.free+1e-9)o.block='Το περιθώριο ξεπερνά το διαθέσιμο υπόλοιπο. Μείωσε το ρίσκο ή το ποσό, ή αύξησε τη μόχλευση.';
  else if(isFinite(o.liq)&&(d>0?s<=o.liq:s>=o.liq))o.block='Το stop είναι πέρα από την τιμή ρευστοποίησης: η θέση θα ρευστοποιηθεί πριν χτυπήσει το stop. Μείωσε τη μόχλευση ή φέρε το stop πιο κοντά.';
  return o;
}
function renderDmCalc(){var el=$('#dmCalc');if(!el)return;var any=$('#dm-entry').value||$('#dm-stop').value;var c=dmCalc();
  ['stop','target'].forEach(function(k){var hh=$('#dm-'+k+'h');if(!hh)return;var u=($('#dm-'+k+'u')||{}).value,e=n($('#dm-entry').value),d=$('#dm-dir').value==='short'?-1:1,lv=+$('#dm-lev').value||1,v=dmLvl(k,e,d,lv);
    if(u&&u!=='px'&&isFinite(v))hh.textContent='= τιμή '+dmPx(v);else if(u==='px'&&isFinite(v)&&e>0){var pc=Math.abs(v-e)/e*100;hh.textContent=fmt(pc,2)+'% τιμής · '+fmt(pc*lv,1)+'% κεφαλαίου'}else hh.textContent=''});
  if(c.err){el.innerHTML=any?'<p class="muted">'+esc(c.err)+'</p>':'';return}
  var h='<div class="kpis">'+kpi('Διαθέσιμο',dmMoney(c.free,c.ccy),c.used>0?dmMoney(c.used,'')+' σε ανοιχτές':'')+kpi('Ρίσκο',dmMoney(c.riskAmt,c.ccy),fmt(c.riskPct,2)+'%')+kpi('Περιθώριο',dmMoney(c.margin,c.ccy),'x'+c.lev,c.block&&c.margin>c.free?'neg':'')+kpi('Αξία θέσης',dmMoney(c.notional,c.ccy))+kpi('Ποσότητα',fmt(c.qty,c.qty<1?6:c.qty<100?4:2))+(c.lev>1?kpi('Ρευστοποίηση ≈',dmPx(c.liq),'',c.block&&c.margin<=c.free?'neg':''):'')+kpi('Κέρδος/ρίσκο',isFinite(c.rr)?'1:'+fmt(c.rr,2):'–')+'</div>';
  var mg=c.margin,lossP=Math.abs(c.e-c.s)/c.e*100,lossAmt=c.riskAmt;
  h+='<div class="dmpl"><div class="r"><span class="lbl">Αν χτυπήσει το stop loss</span><b class="num neg">−'+dmMoney(lossAmt,c.ccy)+'</b><span class="sub num neg">−'+fmt(lossAmt/mg*100,2)+'% του κεφαλαίου θέσης · −'+fmt(lossP,2)+'% τιμή</span></div>';
  if(isFinite(c.tg)){var gainAmt=c.qty*Math.abs(c.tg-c.e),gP=Math.abs(c.tg-c.e)/c.e*100;h+='<div class="g"><span class="lbl">Αν πιάσει το take profit</span><b class="num pos">+'+dmMoney(gainAmt,c.ccy)+'</b><span class="sub num pos">+'+fmt(gainAmt/mg*100,2)+'% του κεφαλαίου θέσης · +'+fmt(gP,2)+'% τιμή</span></div>'}
  h+='<div><span class="lbl">Μόχλευση x'+c.lev+'</span><b class="num">1% κίνηση = '+fmt(c.lev,0)+'%</b><span class="sub">'+dmMoney(mg,c.ccy)+' κεφάλαιο → θέση '+dmMoney(c.notional,c.ccy)+'</span></div></div>';
  if(c.block)h+='<p class="status bad" style="margin:.5rem 0 0"><span>'+esc(c.block)+'</span></p>';
  if(c.riskPct>2)h+='<p class="status warn" style="margin:.5rem 0 0"><span>Πάνω από 2% ρίσκο σε μία συναλλαγή.</span></p>';
  if(c.lev>=20)h+='<p class="status warn" style="margin:.5rem 0 0"><span>Μόχλευση 20x και πάνω: μια μικρή κίνηση κόντρα σβήνει όλο το περιθώριο. Το ρίσκο σου το ορίζει το stop, όχι η μόχλευση.</span></p>';
  el.innerHTML=h}
function dmTechOpts(){var sel=$('#dm-tech');if(!sel)return;var v=sel.value,h='<option value="">Καμία (δική μου ιδέα)</option>';
  var cf=(S.confirms||[]).filter(function(c){return c.by===S.uid}).slice().sort(function(a,b){return (b.at||0)-(a.at||0)}).slice(0,40);
  if(cf.length)h+='<optgroup label="Επιβεβαιωμένες τεχνικές Καθηγητή">'+cf.map(function(c){return '<option value="cf:'+esc(c.id)+'">'+esc(dateGr(c.date)+' · '+cfTitle(c)+(c.market?' · '+c.market:''))+'</option>'}).join('')+'</optgroup>';
  if(S.strategies.length)h+='<optgroup label="Οι στρατηγικές μας">'+S.strategies.map(function(x){return '<option value="st:'+esc(x.id)+'">'+esc(x.name)+'</option>'}).join('')+'</optgroup>';
  sel.innerHTML=h;if(v&&sel.querySelector('option[value="'+v.replace(/"/g,'')+'"]'))sel.value=v;$('#dm-prof').hidden=sel.value.indexOf('cf:')!==0}
var DMDEF={amt:1000,lev:10};
function livePx(sym){sym=dmSym(sym);if(!sym)return NaN;var b=sym.replace(/(USDT|USDC|USD|PERP)$/,'');
  if(PC&&PC.raw&&PC.raw.length&&dmSym(PC.sym).replace(/(USDT|USDC|USD|PERP)$/,'')===b){var lb=PC.raw[PC.raw.length-1];if(lb&&isFinite(lb.c))return lb.c}
  var c=CG.mk&&CGID[b]&&CG.mk[CGID[b]];return c&&isFinite(c.currentPrice)?c.currentPrice:NaN}
function dmPrefill(cf){if(!cf)return;dmPxUnits();var sym=dmSym(cf.market);if(CGID[sym])sym+='USDT';if(sym.length>=3&&!/^(CRYPTO|STOCKS?|FOREX|INDEX|ΜΕΤΟΧ)/.test(sym))$('#dm-sym').value=sym;
  if(cf.dir)$('#dm-dir').value=cf.dir;[['entry','dm-entry'],['stop','dm-stop'],['target','dm-target']].forEach(function(k){if(cf[k[0]]!=null&&isFinite(n(cf[k[0]])))$('#'+k[1]).value=cf[k[0]]});
  var lp=livePx($('#dm-sym').value);if(!$('#dm-entry').value){if(isFinite(lp)){$('#dm-entry').value=+lp.toPrecision(6);$('#dm-ord').value='market'}}
  else{var e1=n($('#dm-entry').value);$('#dm-ord').value=isFinite(lp)&&Math.abs(lp-e1)/e1<=0.0015?'market':'limit'}
  if($('#dm-sym').value&&typeof renderExLinks==='function')renderExLinks('dm-sym');
  if(!$('#dm-notes').value&&cf.why)$('#dm-notes').value=cf.why;renderDmCalc()}
function dmFromConfirm(id){var cf=(S.confirms||[]).find(function(c){return c.id===id});if(!cf){toast('Δεν βρέθηκε η επιβεβαίωση.');return}
  showTab('demo');dmReset();dmTechOpts();$('#dm-tech').value='cf:'+id;$('#dm-prof').hidden=false;dmPrefill(cf);
  setTimeout(function(){$('#dmForm').scrollIntoView({block:'start',behavior:'smooth'});var f=!$('#dm-sym').value?$('#dm-sym'):!$('#dm-entry').value?$('#dm-entry'):!$('#dm-stop').value?$('#dm-stop'):!$('#dm-target').value?$('#dm-target'):$('#dm-save');if(f)f.focus()},60);
  var miss=['entry','stop','target'].filter(function(k){return !$('#dm-'+k).value});toast(miss.length?'Άνοιξε στο demo: 1.000 $ × 10x. Συμπλήρωσε '+miss.map(function(k){return {entry:'είσοδο',stop:'stop',target:'στόχο'}[k]}).join(', ')+'.':'Άνοιξε στο demo με όλα τα στοιχεία: 1.000 $ × 10x. Έλεγξε και πάτα «Άνοιξε demo συναλλαγή».')}
function dmReset(){['dm-sym','dm-entry','dm-stop','dm-target','dm-amt','dm-exp','dm-notes'].forEach(function(k){$('#'+k).value=''});$('#dm-tech').value='';$('#dm-prof').hidden=true;$('#dm-ord').value='market';$('#dm-dir').value='long';$('#dm-lev').value=String(DMDEF.lev);$('#dm-mode').value='amount';$('#dm-amt').value=DMDEF.amt;$('#dm-amt-w').hidden=false;$('#dm-risk-w').hidden=true;
  $('#dm-at').value=dmLocal(Date.now());if(!$('#dm-risk').value)$('#dm-risk').value=S.settings.risk||1;$('#dm-msg').textContent='';renderDmCalc()}
function dmSubmit(ev){ev.preventDefault();var msg=$('#dm-msg');
  if(!qCanSave()){msg.textContent='Δεν μπορείς να αποθηκεύσεις. Χρειάζεσαι δικαίωμα Editor και δικό σου λογαριασμό.';return}
  var c=dmCalc();if(c.err||c.block){msg.textContent=c.err||c.block;return}
  var symN=dmSym($('#dm-sym').value),act=dmOf('prof').filter(function(t){return !dmClosed(t)&&dmSym(t.symbol)===symN});
  if($('#dm-ord').value==='market'&&Math.abs(Date.now()-c.at)<15*6e4){var lpx=livePx($('#dm-sym').value);if(isFinite(lpx)&&Math.abs(lpx-c.e)/c.e>0.003){$('#dm-ord').value='limit';toast('Η τιμή τώρα είναι '+dmPx(lpx)+', όχι '+dmPx(c.e)+'. Η εντολή μπήκε σε αναμονή: θα τρέξει μόνο όταν η τιμή αγγίξει το '+dmPx(c.e)+'.')}}
  var tv=$('#dm-tech').value,src='own',cfId=null,tech='',title='',stratId=null;
  if(tv.indexOf('cf:')===0){var cf=(S.confirms||[]).find(function(x){return x.id===tv.slice(3)});if(cf){src='prof';cfId=cf.id;tech=cf.tech||'';title=cfTitle(cf)}}
  else if(tv.indexOf('st:')===0){stratId=tv.slice(3);title=stratName(stratId)}
  if(!cfId&&PP.pending){var pp0=(S.props||[]).find(function(x){return x.id===PP.pending});if(pp0&&dmSym($('#dm-sym').value)===ppSym(pp0)){cfId=pp0.id;src='prof';tech=pp0.tech||'';title=pp0.title}}PP.pending=null;
  var dt=new Date(c.at);
  var d={by:S.uid||'me',symbol:dmSym($('#dm-sym').value),ex:$('#dm-ex').value,dir:$('#dm-dir').value,ord:$('#dm-ord').value,entry:c.e,stop:c.s,target:isFinite(c.tg)?c.tg:null,
    at:c.at,date:lday(dt),time:pad2(dt.getHours())+':'+pad2(dt.getMinutes()),riskPct:dmR2(c.riskPct),riskAmt:dmR2(c.riskAmt),qty:c.qty,notional:dmR2(c.notional),lev:c.lev,margin:dmR2(c.margin),liq:isFinite(c.liq)?c.liq:null,exp:isFinite(c.exp)&&c.exp>0?c.exp:null,
    src:src,cfId:cfId,tech:tech,title:title,stratId:stratId,notes:$('#dm-notes').value.trim().slice(0,500),status:'open',createdAt:Date.now()};
  $('#dm-save').disabled=true;
  put('demo',newId(),d).then(function(){toast(d.ord==='limit'?'Η demo εντολή μπήκε σε αναμονή στο '+dmPx(d.entry)+'.':'Η demo συναλλαγή άνοιξε και τρέχει.');setTimeout(function(){autoEval(true)},2500);dmReset()}).catch(function(e){msg.textContent=writeErr(e)}).then(function(){$('#dm-save').disabled=false});
}
function dmUsers(){var m={prof:1};qUsers().forEach(function(u){m[u]=1});(S.demo||[]).forEach(function(t){if(t.by)m[t.by]=1});if(S.uid)m[S.uid]=1;return Object.keys(m).filter(function(u){return u!=='me'||!S.db})}
function renderDmAcct(){var el=$('#dmAcct');if(!el)return;var uid='prof',a=dmAcct(uid),bal=dmBal(uid),L=dmOf(uid).filter(function(t){return (t.at||0)>=a.resetAt}),cl=L.filter(dmCounts),op=L.filter(function(t){return !dmClosed(t)}),w=cl.filter(function(t){return t.r>0}).length,mine=qCanSave();
  var h='';if(0)h='<div class="kpis">'+kpi('Υπόλοιπο',dmMoney(bal,a.ccy),'',cls(bal-a.start))+kpi('Απόδοση',pct((bal-a.start)/a.start),'',cls(bal-a.start))+kpi('Ανοιχτές',String(op.length),op.length?dmMoney(sum(op.map(function(t){return n(t.margin)||n(t.notional)||0})),a.ccy):'')+kpi('Πέτυχαν',pct(cl.length?w/cl.length:NaN),w+' / '+cl.length)+kpi('Σύνολο R',fR(sum(cl.map(function(t){return n(t.r)}))),'',cls(sum(cl.map(function(t){return n(t.r)}))))+'</div>';
  if(mine)h+='<div class="row dmset"><label class="f">Αρχικό κεφάλαιο'+(a.byProfiles?' (άθροισμα προφίλ)':'')+'<input id="dm-start" inputmode="decimal" value="'+esc(a.start)+'"'+(a.byProfiles?' disabled title="Αλλάζει από το κεφάλαιο κάθε προφίλ στις ρυθμίσεις του Αυτόματου Καθηγητή"':'')+'></label><label class="f">Νόμισμα<select id="dm-ccy">'+['USDT','USD','EUR'].map(function(x){return '<option'+(x===a.ccy?' selected':'')+'>'+x+'</option>'}).join('')+'</select></label><button type="button" class="btn small" id="dm-acsave">Αποθήκευση</button><button type="button" class="btn small" id="dm-acreset">Νέα αρχή</button></div><p class="muted" style="font-size:.8rem;margin:.3rem 0 0">Η «Νέα αρχή» μηδενίζει το υπόλοιπο στο αρχικό κεφάλαιο. Το ιστορικό μένει.</p>';
  el.innerHTML=h}
function dmSaveAcct(reset){if(!qCanSave()){toast('Δεν μπορείς να αποθηκεύσεις. Χρειάζεσαι δικαίωμα Editor.');return}
  var st=n($('#dm-start').value);if(!(st>0)){toast('Γράψε αρχικό κεφάλαιο.');return}
  var a=dmAcct('prof'),b=$('#dm-acreset');if(reset&&!(b&&b.dataset.armed)){b.dataset.armed='1';b.textContent='Σίγουρα; Πάτα ξανά';setTimeout(function(){if(b){delete b.dataset.armed;b.textContent='Νέα αρχή'}},3500);return}
  var d={by:S.uid,start:st,ccy:$('#dm-ccy').value,resetAt:reset?Date.now():a.resetAt};
  d.by='prof';d.setBy=S.uid;put('demoacct','prof',d).then(function(){toast(reset?'Ο demo λογαριασμός ξεκινά από την αρχή.':'Αποθηκεύτηκε.')}).catch(function(e){toast(writeErr(e))})}
function dmPnlCell(pnl,t){if(!isFinite(pnl))return '–';var mg=n(t.margin),ro=mg>0?pnl/mg*100:NaN;return '<b class="num '+cls(pnl)+'">'+(pnl>0?'+':'')+dmMoney(pnl,'')+'</b>'+(isFinite(ro)?'<br><span class="num '+cls(ro)+'" style="font-size:.78rem">'+(ro>0?'+':'')+fmt(ro,2)+'%</span>':'')}
function renderDmOpen(){var el=$('#dmOpen');if(!el)return;var uid='prof',mine=qCanSave(),L=dmOf(uid).filter(function(t){return !dmClosed(t)}).sort(function(a,b){return (b.at||0)-(a.at||0)});
  if(!L.length){el.innerHTML='<div class="empty">Καμία ανοιχτή AI συναλλαγή.</div>';return}
  var np=L.filter(dmIsPend).length,nr=L.length-np,bySym={};L.forEach(function(t){var k=dmSym(t.symbol);(bySym[k]=bySym[k]||[]).push(t)});var dupS=Object.keys(bySym).filter(function(k){return bySym[k].length>1});
  var dupH=false&&dupS.length&&mine?'<div class="status warn" style="margin:0 0 .6rem"><span>Πολλές θέσεις στο ίδιο σύμβολο: '+dupS.map(function(k){return esc(k)+' ('+bySym[k].length+(bySym[k].some(function(t){return t.dir==='long'})&&bySym[k].some(function(t){return t.dir==='short'})?', και long και short':'')+')'}).join(', ')+'. Από εδώ και πέρα επιτρέπεται μία θέση ανά σύμβολο.</span> <button type="button" class="btn small" id="dmDedup">Κράτα μία ανά σύμβολο</button></div>':'';
  el.innerHTML=dupH+'<div class="dmsum"><span><span class="pill dmrun"><i></i>Τρέχουν</span> <b>'+nr+'</b></span><span><span class="pill dmpend">⏳ Σε αναμονή</span> <b>'+np+'</b></span><span class="muted" style="font-size:.78rem">Αναμονή = η τιμή δεν έφτασε ακόμα στην είσοδο · ζωντανή τιμή κάθε λεπτό</span></div><div class="dmtiles">'+
    L.map(function(t){var pend=dmIsPend(t),lv=dmLiveR(t),cr=lv?lv.r:(t.checkedAt&&t.curR!=null?n(t.curR):NaN),has=isFinite(cr)&&!pend,lp=isFinite(livePx(t.symbol))?livePx(t.symbol):n(t.lastPx),dd=pend&&isFinite(lp)?Math.abs(lp-n(t.entry))/n(t.entry)*100:NaN;
      return '<div class="dmtl '+(has?(cr>=0?'up':'dn'):'')+'"><div class="dmtl-h"><span class="dmtl-s">'+dmSymCell(t)+' '+dmDirPill(t)+' '+dmStatusPill(t)+'</span><span class="muted dmtl-t" title="Πότε δόθηκε η εντολή και πότε μπήκε η θέση">'+(t.ord==='limit'?'εντολή ':'άνοιξε ')+esc(dateGr(t.date)+' '+(t.time||''))+(t.ord==='limit'&&t.filledAt?' · μπήκε '+esc(pad2(new Date(t.filledAt).getHours())+':'+pad2(new Date(t.filledAt).getMinutes())):'')+(t.by&&t.by!=='prof'&&t.src!=='auto'?' · '+esc(t.by===S.uid?'εσύ':name(t.by)):'')+'</span></div>'+
        '<div class="dmtl-m"><div class="dmtl-pnl"><div class="dmtl-r">'+(has?'<b class="num '+cls(cr)+'">'+fR(cr)+'</b><span class="dmtl-pc">'+dmPnlCell(cr*n(t.riskAmt),t)+'</span>':'<b class="muted">–</b>')+'</div><span class="muted" style="font-size:.74rem">'+(pend?(isFinite(dd)?'τώρα '+dmPx(lp)+' · απέχει <b class="dd '+(dd<0.3?'near':dd<1?'mid':'far')+'">'+fmt(dd,2)+'%</b>':''):lv?'ζωντανά '+dmPx(lv.px):t.checkedAt?'έλεγχος '+esc(pad2(new Date(t.checkedAt).getHours())+':'+pad2(new Date(t.checkedAt).getMinutes())):'')+'</span></div>'+dmBar(t)+'</div>'+
        '<div class="dmtl-g"><div><span>Stop loss</span><b class="num neg">'+dmPx(n(t.stop))+'</b>'+(t.curStop!=null?'<small class="pos" title="Το stop μετακινήθηκε από τη διαχείριση εξόδου">🔒 '+dmPx(n(t.curStop))+'</small>':'')+'</div><div><span>Είσοδος</span><b class="num">'+dmPx(n(t.entry))+'</b></div><div><span>Take profit</span><b class="num pos">'+dmPx(n(t.target))+'</b></div><div><span>Κεφάλαιο</span><b class="num">'+dmMoney(n(t.margin)||n(t.notional),'')+'</b><small class="muted">x'+(t.lev||1)+' · ρίσκο '+dmMoney(n(t.riskAmt),'')+'</small></div></div>'+
        (function(){var e=n(t.entry),sl=n(t.stop),tg=n(t.target),ra=n(t.riskAmt),rk=Math.abs(e-sl);if(!(rk>0)||!isFinite(tg)||!(ra>0))return '';var X=Math.abs(tg-e)/rk,win=ra*X,cs=t.curStop!=null?n(t.curStop):NaN,lockR=isFinite(cs)?(cs-e)*(t.dir==='short'?-1:1)/rk:NaN,a=t.auto||{},wr=isFinite(a.wr)?a.wr:NaN,ev=isFinite(wr)?wr*X-(1-wr):NaN,mg=n(t.margin);
          return '<div class="dmtl-pot" title="Αν πιάσει τον στόχο: +'+fmt(X,X%1?1:0)+'R · αν πιάσει το stop'+(isFinite(lockR)?' (🔒 μετακινημένο)':'')+(isFinite(ev)?' · αναμενόμενο από backtest με πιθανότητα στόχου '+pct(wr):'')+'">🎯 <span class="pos">+'+dmMoney(win,'')+'</span> στον στόχο · 🛑 <span class="'+(lockR>0?'pos':'neg')+'">'+(isFinite(lockR)?(lockR>=0?'+':'−')+dmMoney(Math.abs(lockR)*ra,''):'−'+dmMoney(ra,''))+'</span> στο stop'+(isFinite(ev)?' · αναμενόμενο <span class="'+cls(ev)+'">'+(ev>=0?'+':'−')+dmMoney(Math.abs(ev*ra),'')+'</span>':'')+'</div>'})()+
        '<div class="dmtl-f"><span class="dmtl-why">'+(t.src==='prof'?'<span class="pill acc">Καθηγητής</span> ':t.src==='auto'?'<span class="pill acc">🤖 Αυτόματος</span> ':'')+esc(t.title||'')+(t.src==='auto'?' <button type="button" class="linkbtn" data-dmwhy="'+esc(t.id)+'">🎓 Γιατί;</button>':'')+'</span>'+
        (mine?'<span class="dmact"><span class="dmx"><button type="button" class="btn small primary" data-dmx="'+esc(t.id)+'">'+(pend?'Ακύρωσε':'Κλείσε στην αγορά')+'</button><input inputmode="decimal" placeholder="τιμή" aria-label="Τιμή εξόδου" data-dmxin="'+esc(t.id)+'" hidden></span><button type="button" class="linkbtn" data-dmdel="'+esc(t.id)+'">Διαγραφή</button></span>':'')+'</div></div>'}).join('')+'</div>'}
function mktPrice(sym){sym=dmSym(sym);if(!/(USDT|USDC|USD)$/.test(sym)&&CGID[sym])sym+='USDT';
  var lp=function(){var v=livePx(sym);return isFinite(v)&&v>0?{px:v,src:'CoinGecko'}:null};
  if(!CG.mcp){var a=lp();return a?Promise.resolve(a):deepBars(sym,'1h').then(function(r){var b=r.bars[r.bars.length-1];return {px:b.c,src:'τελευταίο κερί 1h',old:true}})}
  return ccFetchBars(sym,'1m').then(function(r){var b=r.bars.filter(function(x){return !x.approx}),l=b[b.length-1];if(!l||Date.now()-l.t>5*60000)throw {code:'stale'};return {px:l.c,src:'Crypto.com',at:l.t}}).catch(function(){var a=lp();if(a)return a;throw {code:'no_price'}})}
/* ζωντανό R για τις ανοιχτές: ίδια τιμή με τον «Έλεγχο με πραγματικές τιμές» (κερί 1 λεπτού Crypto.com) */
DM.live={};
function dmLiveR(t){var q=DM.live[dmSym(t.symbol)];if(!q||Date.now()-q.at>3*60000||!t.filledAt&&t.ord==='limit')return null;var e=n(t.entry),risk=Math.abs(e-n(t.stop));if(!(risk>0))return null;return {r:(q.px-e)*(t.dir==='short'?-1:1)/risk,px:q.px}}
function dmLiveTick(){clearTimeout(DM.lt);DM.lt=setTimeout(dmLiveTick,60000);var sec=$('section[data-panel=demo]');if(!sec||sec.hidden||document.hidden||!CG.mcp)return;
  var syms={};dmOf('prof').filter(function(t){return !dmClosed(t)&&!dmIsPend(t)}).forEach(function(t){syms[dmSym(t.symbol)]=1});var L=Object.keys(syms);if(!L.length)return;
  Promise.all(L.map(function(sy){return mktPrice(sy).then(function(q){if(q&&!q.old)DM.live[sy]={px:q.px,at:Date.now()}}).catch(function(){})})).then(function(){try{renderDmOpen();renderPf()}catch(e){}})}
function dmManualClose(id){var t=(S.demo||[]).find(function(x){return x.id===id});if(!t)return;var btn=document.querySelector('[data-dmx="'+id+'"]'),inp=document.querySelector('[data-dmxin="'+id+'"]'),typed=n(inp&&!inp.hidden&&inp.value);
  if(dmIsPend(t)){if(btn&&!btn.dataset.armed){btn.dataset.armed='1';btn.textContent='Σίγουρα; Πάτα ξανά';setTimeout(function(){if(btn){delete btn.dataset.armed;btn.textContent='Ακύρωσε'}},5000);return}
    var c=dmClean(t);c.status='expired';c.nofill=true;c.exit=null;c.exitAt=Date.now();c.r=0;c.pnl=0;c.evalSrc='χειροκίνητα';c.cancelled=true;c.curR=null;put('demo',id,c).then(function(){toast('Η εντολή ακυρώθηκε (δεν είχε ανοίξει).')}).catch(function(e2){toast(writeErr(e2))});return}
  if(typed>0){dmCloseAt(t,typed,'χειροκίνητα');return}
  if(btn&&btn.dataset.px){var px0=+btn.dataset.px;delete btn.dataset.px;dmCloseAt(t,px0,'αγορά '+(btn.dataset.src||''));return}
  if(btn){btn.disabled=true;btn.textContent='Τιμή…'}
  mktPrice(t.symbol).then(function(q){if(!btn)return;btn.disabled=false;btn.dataset.px=q.px;btn.dataset.src=q.src;var e=n(t.entry),d=t.dir==='short'?-1:1,r=(q.px-e)*d/Math.abs(e-n(t.stop));
    btn.textContent='✔ Κλείσε στο '+dmPx(q.px)+' ('+fR(r)+')';btn.title='Τιμή '+q.src+(q.old?' (όχι ζωντανή)':'');setTimeout(function(){if(btn&&btn.dataset.px){delete btn.dataset.px;btn.textContent='Κλείσε στην αγορά'}},8000)})
  .catch(function(){if(btn){btn.disabled=false;btn.textContent='Κλείσε'}if(inp){inp.hidden=false;inp.focus()}toast('Δεν βρήκα ζωντανή τιμή. Γράψε την τιμή εξόδου και πάτα «Κλείσε».')})}
function dmCloseAt(t,px,src){var id=t.id;

  var e=n(t.entry),d=t.dir==='short'?-1:1,risk=Math.abs(e-n(t.stop)),r=(px-e)*d/risk,x=dmClean(t);
  x.status='closed';x.exit=px;x.exitAt=Date.now();x.r=dmR2(r);x.pnl=dmR2(r*n(t.riskAmt));if(n(t.margin)>0)x.roe=dmR2(x.pnl/n(t.margin)*100);x.evalSrc='χειροκίνητα';x.closeSrc=src||'χειροκίνητα';x.curR=null;
  put('demo',id,x).then(function(){toast('Έκλεισε στο '+dmPx(px)+' · '+fR(r)+' · '+dmMoney(x.pnl,'')+'.');if(t.cfId)cfAutoOutcome(t.cfId,r>0?'win':'loss')}).catch(function(e2){toast(writeErr(e2))})}
function dmProfStats(){var L=(S.demo||[]).filter(function(t){return t.src==='prof'}),cl=L.filter(dmCounts),w=cl.filter(function(t){return t.r>0});
  var g={};cl.forEach(function(t){var k=t.tech||t.title||'?',x=g[k]=g[k]||{tech:t.tech,title:t.title,n:0,w:0,r:0,pnl:0};x.n++;if(t.r>0)x.w++;x.r+=n(t.r);x.pnl+=n(t.pnl)||0});
  return {L:L,cl:cl,w:w,by:Object.keys(g).map(function(k){return g[k]}).sort(function(a,b){return b.n-a.n||b.r-a.r})}}
function dmProfContext(){var P=dmProfStats(),rr=P.cl.map(function(t){return n(t.r)});
  var fh=P.L.filter(function(t){return t.fc==='hit'}).length,fm=P.L.filter(function(t){return t.fc==='miss'}).length;
  return {forecast_correct:fh,forecast_wrong:fm,forecast_hit_rate:fh+fm?dmR2(fh/(fh+fm)):null,tested:P.L.length,open:P.L.length-P.cl.length,closed:P.cl.length,hits:P.w.length,misses:P.cl.length-P.w.length,hit_rate:P.cl.length?dmR2(P.w.length/P.cl.length):null,avg_R:dmR2(avg(rr)),total_R:dmR2(sum(rr)),
    by_technique:P.by.slice(0,15).map(function(x){return {technique:cfTitle(x),trades:x.n,hits:x.w,total_R:dmR2(x.r)}}),
    recent:P.L.slice().sort(function(a,b){return (b.at||0)-(a.at||0)}).slice(0,20).map(function(t){return {date:t.date,who:t.by===S.uid?'me':name(t.by),technique:cfTitle(t),symbol:t.symbol,dir:t.dir,entry:t.entry,stop:t.stop,target:t.target,status:t.status,R:t.r==null?null:t.r,mfe_R:t.mfe==null?null:t.mfe}})}}
function renderDmProf(){var el=$('#dmProf');if(!el)return;var P=dmProfStats(),rr=P.cl.map(function(t){return n(t.r)}),cfd=(S.confirms||[]).filter(function(c){return c.outcome==='win'||c.outcome==='loss'}),cfw=cfd.filter(function(c){return c.outcome==='win'}).length;
  if(!P.L.length){el.innerHTML='<p class="muted">Εδώ φαίνεται πόσο σωστές βγήκαν οι προτάσεις του Καθηγητή. Ζήτα του τεχνικές, πάτα «Επιβεβαίωση» και μετά «Δοκίμασέ τη σε demo». Όταν τις ελέγξεις με πραγματικές τιμές, μετράει εδώ πόσες έπεσαν μέσα.</p>'+(cfd.length?'<p class="muted"><span>Από τις επιβεβαιώσεις που σημειώσατε με το χέρι δούλεψαν:</span> <b>'+cfw+' / '+cfd.length+'</b></p>':'');return}
  var fcH=P.L.filter(function(t){return t.fc==='hit'}).length,fcM=P.L.filter(function(t){return t.fc==='miss'}).length,fcN=fcH+fcM;
  var h='<div class="kpis">'+kpi('Έπεσε μέσα',pct(P.cl.length?P.w.length/P.cl.length:NaN),P.w.length+' / '+P.cl.length+' · μόνο όσες μπήκαν',P.cl.length?(P.w.length/P.cl.length>=0.5?'pos':'neg'):'')+kpi('Μέσο R',fR(avg(rr)),'',cls(avg(rr)))+kpi('Σύνολο R',fR(sum(rr)),'',cls(sum(rr)))+kpi('Αποτέλεσμα',dmMoney(sum(P.cl.map(function(t){return n(t.pnl)||0})),''),'',cls(sum(P.cl.map(function(t){return n(t.pnl)||0}))))+kpi('Σε εξέλιξη',String(P.L.length-P.cl.length))+'</div>';
  if(cfd.length)h+='<p class="muted" style="font-size:.86rem;margin:.6rem 0 0"><span>Από τις επιβεβαιώσεις που σημειώσατε με το χέρι δούλεψαν:</span> <b>'+cfw+' / '+cfd.length+'</b></p>';
  if(P.by.length)h+='<div class="tw" style="margin-top:.7rem"><table><thead><tr><th>Τεχνική</th><th class="r">Δοκιμές</th><th class="r">Έπεσε μέσα</th><th class="r">Σύνολο R</th><th class="r">Αποτέλεσμα</th></tr></thead><tbody>'+P.by.map(function(x){return '<tr><td>'+(x.tech?'<button type="button" class="linkbtn" data-ref="'+esc(x.tech)+'">'+esc(cfTitle(x))+'</button>':esc(x.title||''))+'</td><td class="r num">'+x.n+'</td><td class="r num">'+pct(x.w/x.n)+'</td><td class="r num '+cls(x.r)+'">'+fR(x.r)+'</td><td class="r num '+cls(x.pnl)+'">'+dmMoney(x.pnl,'')+'</td></tr>'}).join('')+'</tbody></table></div>';
  h+='<h3 class="dmh3">Ιστορικό προτάσεων</h3><div class="tw"><table><thead><tr><th>Ημ/νία</th><th>Ποιος</th><th>Τεχνική</th><th>Σύμβολο</th><th>Θέση</th><th>Αποτέλεσμα</th><th class="r">R</th><th class="r">Ποσό</th></tr></thead><tbody>'+
    P.L.slice().sort(function(a,b){return (b.at||0)-(a.at||0)}).slice(0,60).map(function(t){var ok=dmCounts(t);return '<tr><td>'+esc(dateGr(t.date)+' '+(t.time||''))+(t.by&&t.by!=='prof'&&t.src!=='auto'?'<br><span class="muted" style="font-size:.74rem">'+esc(t.by===S.uid?'εσύ':name(t.by))+'</span>':'')+'</td><td>'+esc(name(t.by))+'</td><td>'+esc(cfTitle(t))+'</td><td>'+dmSymCell(t)+'</td><td>'+dmDirPill(t)+'</td><td>'+(ok?(t.r>0?'<span class="pill gain">✓ Έπεσε μέσα</span>':'<span class="pill loss">✗ Αστόχησε</span>'):dmStatusPill(t))+'</td><td class="r num '+cls(t.r)+'">'+(ok?fR(t.r):'–')+'</td><td class="r num '+cls(t.pnl)+'">'+(ok?dmMoney(n(t.pnl),''):'–')+'</td></tr>'}).join('')+'</tbody></table></div>';
  el.innerHTML=h}
function renderDmHist(){var el=$('#dmHist');if(!el)return;var uid='prof',src=$('#dm-hsrc').value,mine=qCanSave();
  var L=dmOf(uid).filter(function(t){return dmClosed(t)&&(src==='all'||(src==='prof'?t.src==='prof':t.src!=='prof'))}).sort(function(a,b){return (b.exitAt||b.at||0)-(a.exitAt||a.at||0)});
  if(!L.length){el.innerHTML='<div class="empty">Δεν υπάρχουν ακόμα κλειστές demo συναλλαγές.</div>';return}
  el.innerHTML='<div class="tw"><table><thead><tr><th>Είσοδος</th><th>Σύμβολο</th><th>Θέση</th><th>Τεχνική</th><th class="r">Είσοδος</th><th class="r">Stop loss</th><th class="r">Take profit</th><th class="r">Έξοδος</th><th>Κατάσταση</th><th class="r">R</th><th class="r">PnL · %</th><th>Έλεγχος</th><th></th></tr></thead><tbody>'+
    L.slice(0,DM.hlim).map(function(t){return '<tr><td>'+esc(dateGr(t.date)+' '+(t.time||''))+(t.by&&t.by!=='prof'&&t.src!=='auto'?'<br><span class="muted" style="font-size:.74rem">'+esc(t.by===S.uid?'εσύ':name(t.by))+'</span>':'')+'</td><td>'+dmSymCell(t)+'</td><td>'+dmDirPill(t)+'</td><td>'+(t.src==='prof'?'<span class="pill acc">Καθηγητής</span> ':t.src==='auto'?'<span class="pill acc">🤖 Αυτόματος</span> <button type="button" class="linkbtn" data-dmwhy="'+esc(t.id)+'">🎓 Γιατί;</button> ':'')+esc(t.title||'')+'</td><td class="r num">'+dmPx(n(t.entry))+'</td><td class="r num">'+dmPx(n(t.stop))+'</td><td class="r num">'+dmPx(n(t.target))+'</td><td class="r num">'+dmPx(n(t.exit))+'</td><td>'+dmStatusPill(t)+(t.amb?' <span class="pill warn" title="Stop και στόχος στο ίδιο κερί">?</span>':'')+'</td><td class="r num '+cls(t.r)+'">'+fR(n(t.r))+'</td><td class="r">'+dmPnlCell(n(t.pnl),t)+'</td><td class="muted" style="font-size:.78rem">'+esc(t.evalSrc||'')+'</td><td>'+(mine?'<button type="button" class="linkbtn" data-dmdel="'+esc(t.id)+'">Διαγραφή</button>':'')+'</td></tr>'}).join('')+'</tbody></table></div>'+
    (L.length>DM.hlim?'<button type="button" class="linkbtn" id="dmMore">Δείξε περισσότερες</button>':'')}
/* 🤖 Αυτόματος Καθηγητής: όσο η σελίδα είναι ανοιχτή, σαρώνει κρύπτο, διαλέγει τη στρατηγική που ταιριάζει και ανοίγει μόνος του demo */
window.__AP=null;var AP={cfg:null,log:[],busy:false,next:0,last:0,timer:null,tab:Math.random().toString(36).slice(2),cur:''};
var AP_DEF={strats:'all',pick:'',mgmt:'none',slip:0.05,pNews:true,sess:'smart',size:'risk',riskPct:1,pMtf:true,pBtc:true,pVol:true,pCool:true,pCorr:true,pBrk:true,minEdge:0.1,on:false,iv:30,tf:'both',coins:'BTC,ETH,XRP,BNB,SOL,DOGE,TRX,ADA,HYPE,LINK',maxOpen:3,maxDay:5,margin:1000,lev:10,fee:0.1};
var PROF='prof';
function apKey(k){return 'tj-ap'+k+'-'+safeSeg(S.uid||'me')}
/* κοινή κατάσταση του Αυτόματου Καθηγητή στη βάση: ρυθμίσεις, ποιος τρέχει, τελευταία σάρωση, σήματα που παίχτηκαν, τι παρακολουθεί */
function apStSub(){if(!S.db||AP.stSub)return;try{AP.stSub=S.db.collection('apstate').doc('main').onSnapshot(function(sn){var d=sn.exists&&sn.data()||{},first=!AP.stReady;
    /* τα patches που έγιναν πριν φτάσει η κοινή κατάσταση δεν σβήνουν ό,τι υπάρχει: μπαίνουν από πάνω της */
    var pend=AP.stPend||null;AP.stPend=null;AP.state=pend?Object.assign({},d,pend):d;AP.stReady=true;
    if(d.cfg){var co=d.coins||d.cfg.coins;AP.cfg=Object.assign({},AP_DEF,d.cfg);if(co)AP.cfg.coins=co}else if(AP.cfg&&qCanSave()&&!AP.cfgPushed){AP.cfgPushed=1;AP.state.cfg=AP.cfg;pend=pend||{}}
    if(pend&&qCanSave())apStWrite({});if(d.last&&d.last>AP.last)AP.last=d.last;apRender();try{renderPf()}catch(e){}},function(){})}catch(e){}}
function apStWrite(patch){if(S.db&&!AP.stReady){AP.stPend=Object.assign({},AP.stPend||{},patch);return}AP.state=Object.assign({},AP.state||{},patch);if(!S.db||!qCanSave())return;var d=JSON.parse(JSON.stringify(AP.state));clearTimeout(AP.stT);AP.stT=setTimeout(function(){S.db.collection('apstate').doc('main').set(d).catch(function(){})},400)}
function apLoad(){var c={};try{c=JSON.parse(localStorage.getItem(apKey(''))||'{}')||{}}catch(e){}AP.cfg=Object.assign({},AP_DEF,c);try{AP.log=JSON.parse(localStorage.getItem(apKey('log'))||'[]')||[]}catch(e){AP.log=[]}try{AP.last=+localStorage.getItem(apKey('last'))||0}catch(e){}}
function apSave(){try{localStorage.setItem(apKey(''),JSON.stringify(AP.cfg))}catch(e){}apStWrite({cfg:AP.cfg,coins:AP.cfg.coins})}
function apSeen(){var m={};try{m=JSON.parse(localStorage.getItem(apKey('seen'))||'{}')||{}}catch(e){}return Object.assign(m,(AP.state&&AP.state.seen)||{})}
function apMark(k){var m=apSeen(),now=Date.now();m[k]=now;Object.keys(m).forEach(function(x){if(now-m[x]>14*864e5)delete m[x]});try{localStorage.setItem(apKey('seen'),JSON.stringify(m))}catch(e){}apStWrite({seen:m})}
function apAdd(coin,kind,msg,shared){if(AP.rc&&AP.rc.multi&&kind!=='scan'&&!shared)msg='['+AP.rc.name+'] '+msg;
  if(shared){/* πρόβλημα δεδομένων: ίδιο για όλα τα προφίλ, γράφεται το πολύ μία φορά ανά 6 ώρες */var dk=coin+'|'+kind;AP.dataLog=AP.dataLog||{};if(Date.now()-(AP.dataLog[dk]||0)<6*36e5)return;AP.dataLog[dk]=Date.now()}if(/^(open|prop|block|err|scan|lim)$/.test(kind))try{apDayEv(kind,coin,msg)}catch(e){}AP.log.unshift({t:Date.now(),c:coin,k:kind,m:msg});AP.log=AP.log.slice(0,150);try{localStorage.setItem(apKey('log'),JSON.stringify(AP.log))}catch(e){}}
function apC(){return AP.rc?AP.rc.cfg:AP.cfg}
function apMineR(){var m=apMine();if(!AP.rc||!AP.rc.id)return m;var id=AP.rc.id;return m.filter(function(t){return apfTagId(t)===id})}
function apCoins(){return String(apC().coins||'').toUpperCase().split(/[\s,;]+/).map(function(x){return x.replace(/(USDT|USDC|USD)$/,'').replace(/[^A-Z0-9]/g,'')}).filter(function(x,i,a){return x&&a.indexOf(x)===i}).slice(0,12)}
function apMine(){return dmOf(PROF).filter(function(t){return t.src==='auto'})}
function apLock(){/* μία σελίδα σε όλη την ομάδα τρέχει τον λογαριασμό του Καθηγητή */var now=Date.now(),L=AP.state||{};if(S.db&&!AP.stReady)return false;
  if(S.db&&L.tab&&L.tab!==AP.tab&&now-(L.at||0)<180000)return false;
  if(!S.db){var k='tj-aplock',v=null;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch(e){}if(v&&v.tab!==AP.tab&&now-v.at<150000)return false;try{localStorage.setItem(k,JSON.stringify({tab:AP.tab,at:now}))}catch(e){}return true}
  apStWrite({runner:S.uid,tab:AP.tab,at:now});return true}
function apInit(){window.__AP=AP;window.__APX={tag:apProfTag,ids:apStratIds,ev:dmEval,rows:apfRows,apf:APF,lab:LAB,bt:BT,gsp:GENSP};if(AP.cfg)return;if(S.db&&(!S.uid||S.uid==='me')&&!apInit.n){apInit.w=(apInit.w||0)+1;if(apInit.w<30){setTimeout(apInit,2000);return}}apBind();apLoad();apStSub();apfSub();try{labInit()}catch(e){}apRender();apTick();setTimeout(function(){gmDiag().then(apGmRender)},1500)}
function apTick(){clearTimeout(AP.timer);AP.timer=setTimeout(apTick,60000);
  if(!AP.cfg||!AP.cfg.on||AP.busy||!qCanSave())return;if(!apLock()){apStatus();return}
  var due=AP.last+AP.cfg.iv*60000;AP.next=due;if(Date.now()>=due)apScan();else apStatus()}
var AP_TFMS={'1h':36e5,'4h':144e5};
function apTfs(){var t=apC().tf;return t==='4h'?['4h']:t==='1h'?['1h']:['1h','4h']}
function apAgg(b,ms){var out=[],cur=null,k=0;b.forEach(function(x){var s=Math.floor(x.t/ms)*ms;if(!cur||cur.t!==s){if(cur&&k===Math.round(ms/36e5))out.push(cur);cur={t:s,o:x.o,h:x.h,l:x.l,c:x.c,v:+x.v||0};k=1}else{cur.h=Math.max(cur.h,x.h);cur.l=Math.min(cur.l,x.l);cur.c=x.c;cur.v+=+x.v||0;k++}});
  if(cur&&k===Math.round(ms/36e5)&&cur.t+ms<=Date.now()+60000)out.push(cur);return out}
function apGrade(x){if(!x.sig||x.fit<0||!(x.test.avgR>0)||(x.best.X||0)<1.5)return 0;
  if(x.reliable&&(x.fit>=2||x.best.st.avgR>0))return 2;if(x.test.n>=5&&x.test.avgR>=0.15&&x.best.st.n>=8&&x.best.st.avgR>0)return 1;return 0}
/* ---- Ώρες αγορών (συνεδρίες, ώρες UTC) ---- */
var SESS=[{id:'asia',t:'Ασία (Τόκιο)',a:0,b:7},{id:'lon',t:'Λονδίνο',a:7,b:12},{id:'ovl',t:'Λονδίνο + Νέα Υόρκη',a:12,b:16},{id:'ny',t:'Νέα Υόρκη',a:16,b:21},{id:'late',t:'Βράδυ ΗΠΑ',a:21,b:24},{id:'wkd',t:'Σαββατοκύριακο',a:0,b:24}];
function sessOf(ts){var d=new Date(ts),wd=d.getUTCDay(),h=d.getUTCHours();if(wd===0||wd===6)return 'wkd';for(var i=0;i<5;i++)if(h>=SESS[i].a&&h<SESS[i].b)return SESS[i].id;return 'late'}
function sessInfo(id){return SESS.find(function(s){return s.id===id})||SESS[0]}
function sessLocal(s){if(s.id==='wkd')return 'Σάβ–Κυρ';var off=-new Date().getTimezoneOffset()/60,f=function(h){return pad2(((h+off)%24+24)%24)+':00'};return f(s.a)+'–'+f(s.b)}
function sessName(id){var s=sessInfo(id);return s.t+' ('+sessLocal(s)+')'}
function apTradeTs(t){var d=new Date((t.date||'')+'T'+(t.time||'00:00'));return d.getTime()}
function apSessStats(x){var o={};((x.best&&x.best.st&&x.best.st.c)||[]).forEach(function(t){var k=sessOf(apTradeTs(t)),a=o[k]=o[k]||{n:0,r:0};a.n++;a.r+=t.r});Object.keys(o).forEach(function(k){o[k].avg=o[k].r/o[k].n});return o}
function apBestSess(ss){var b=null;Object.keys(ss).forEach(function(k){if(ss[k].n>=5&&(!b||ss[k].avg>ss[b].avg))b=k});return b}
function apMedAtr(ev,b){var I=ev.I,v=[];for(var i=Math.max(0,b.length-200);i<b.length;i++)if(isFinite(I.atr[i])&&b[i].c>0)v.push(I.atr[i]/b[i].c*100);v.sort(function(a,z){return a-z});return v.length?v[Math.floor(v.length/2)]:NaN}
/* ---- Προστασίες (όπως οι «protections» των γνωστών bots) ---- */
function apProt(){var c=apC();return {news:c.pNews!==false,sess:c.sess||'smart',mtf:c.pMtf!==false,btc:c.pBtc!==false,vol:c.pVol!==false,cool:c.pCool!==false,corr:c.pCorr!==false,brk:c.pBrk!==false,minEdge:isFinite(+c.minEdge)?+c.minEdge:0.1}}
function apBreaker(){var mine=apMineR().filter(dmCounts).sort(function(a,b){return (a.exitAt||a.at||0)-(b.exitAt||b.at||0)}),td=lday(new Date()),dayR=sum(mine.filter(function(t){return lday(new Date(t.exitAt||t.at||0))===td}).map(function(t){return n(t.r)})),L=mine.slice(-3);
  if(dayR<=-3)return 'Σήμερα οι αυτόματες έχουν ήδη '+fR(dayR)+'. Παύση νέων ανοιγμάτων μέχρι αύριο.';
  if(L.length===3&&L.every(function(t){return n(t.r)<0})&&Date.now()-(L[2].exitAt||L[2].at||0)<24*36e5)return '3 συνεχόμενες χαμένες αυτόματες. Παύση 24 ωρών από την τελευταία.';return ''}
function apBlock(it,ctx){var P=apProt(),x=it.x,d=x.d,coin=it.coin,now=Date.now(),sid=sessOf(now);
  if(P.news){var nb=nwBlockNow();if(nb)return nb+' (αναμονή από 30′ πριν ως 1 ώρα μετά)'}
  if(!(x.test.avgR>=P.minEdge))return 'μέσο '+fR(x.test.avgR)+' σε νέα δεδομένα, κάτω από το ελάχιστο '+fR(P.minEdge);
  if(P.sess==='active'&&!(sid==='lon'||sid==='ovl'||sid==='ny'))return 'τώρα είναι '+sessName(sid)+': ανοίγω μόνο σε Λονδίνο / Νέα Υόρκη';
  if(P.sess==='smart'){var ss=apSessStats(x)[sid];if(ss&&ss.n>=6&&ss.avg<0)return 'στη συνεδρία '+sessName(sid)+' αυτή η στρατηγική χάνει ('+fR(ss.avg)+' σε '+ss.n+')';if(sid==='wkd'&&(!ss||ss.n<6))return 'Σαββατοκύριακο με χαμηλή ρευστότητα και χωρίς αρκετά δεδομένα για αυτή την ώρα'}
  if(P.mtf&&it.gHi&&it.gHi.kind==='trend'&&it.gHi.dir===-d)return 'το μεγαλύτερο timeframe ('+(it.tf==='1h'?'4h':'1D')+') έχει τάση αντίθετη';
  if(P.btc&&coin!=='BTC'&&ctx.btc&&ctx.btc.kind==='trend'&&ctx.btc.dir===-d&&ctx.btc.adx>=25)return 'το BTC έχει δυνατή '+(ctx.btc.dir>0?'ανοδική':'καθοδική')+' τάση, αντίθετη με τη θέση';
  if(P.vol&&isFinite(it.medAtr)){var a=it.g.atrPct;if(a>2.5*it.medAtr)return 'απότομη μεταβλητότητα ('+fmt(a,2)+'% ανά κερί, συνήθως '+fmt(it.medAtr,2)+'%)';if(a<0.4*it.medAtr)return 'νεκρή αγορά ('+fmt(a,2)+'% ανά κερί)'}
  if(P.cool){var lastL=apMineR().filter(function(t){return dmCounts(t)&&n(t.r)<0&&dmSym(t.symbol).replace(/(USDT|USDC|USD)$/,'')===coin}).sort(function(a,b){return (b.exitAt||0)-(a.exitAt||0)})[0];if(lastL&&now-(lastL.exitAt||lastL.at||0)<6*36e5)return 'πρόσφατη χαμένη στο '+coin+' (αναμονή 6 ωρών)'}
  if(P.corr){var same=apMineR().filter(function(t){return !dmClosed(t)&&(t.dir==='long'?1:-1)===d}).length+(ctx.openedDir[d]||0);if(same>=2)return 'ήδη '+same+' αυτόματες '+(d>0?'long':'short')+' ανοιχτές (τα crypto κινούνται μαζί)'}
  return ''}
/* ---- Καθημερινό ημερολόγιο του αυτόματου στη βάση (ορατό σε όλους) ---- */
function apDayId(){return safeSeg(PROF+'_'+lday(new Date()))}
function apDayDoc(){var id=apDayId();if(!AP.day||AP.day.id!==id){var ex=(S.aplog||[]).find(function(x){return x.id===id});AP.day=ex?JSON.parse(JSON.stringify(ex)):{id:id,by:PROF,date:lday(new Date()),scans:0,opened:0,props:0,blocked:0,ev:[]}}return AP.day}
function apDayEv(k,coin,msg){if(!S.db||!qCanSave())return;var D=apDayDoc();if(k==='scan'){D.scans++;D.last=Date.now()}else{if(k==='open')D.opened++;if(k==='prop')D.props++;if(k==='block')D.blocked++;D.ev.unshift({t:Date.now(),k:k,c:coin||'',m:String(msg||'').slice(0,240)});D.ev=D.ev.slice(0,40)}
  clearTimeout(AP.dayT);AP.dayT=setTimeout(function(){var d=JSON.parse(JSON.stringify(D));var id=d.id;delete d.id;put('aplog',id,d).catch(function(){})},3000)}
/* Όλα τα προφίλ που «τρέχουν» σαρώνονται μαζί σε κάθε κύκλο: τα κεριά και τα backtest υπολογίζονται μία φορά και μοιράζονται, κάθε προφίλ έχει δικό του κεφάλαιο, όρια και προστασίες */
function apRunners(){var act=apfActive(),L=APF.list.filter(function(p){return p.run!==false});if(!APF.list.length||!L.length)return [{id:act?act.id:null,name:act?act.name:'',cfg:AP.cfg,main:true}];
  var out=L.map(function(p){var me=act&&act.id===p.id;return {id:p.id,name:p.name,cfg:me?AP.cfg:Object.assign({},AP_DEF,p.cfg,{on:true,iv:AP.cfg.iv,coins:AP.cfg.coins}),main:me}});if(!out.some(function(r){return r.main}))out[0].main=true;out.sort(function(a,b){return (b.main?1:0)-(a.main?1:0)});return out}
function apScan(manual){if(AP.busy)return;if(!qCanSave()){toast('Δεν μπορείς να ανοίξεις demo: χρειάζεσαι δικαίωμα Editor και δικό σου λογαριασμό.');return}
  AP.busy=true;AP.last=Date.now();try{localStorage.setItem(apKey('last'),String(AP.last))}catch(e){}AP.next=AP.last+AP.cfg.iv*60000;apStWrite({last:AP.last,runner:S.uid,tab:AP.tab,at:Date.now()});
  var R=apRunners(),k=0,tot=0,BP={},EV={},SH={bars:function(coin){return BP[coin]||(BP[coin]=deepBars(coin+'USDT','1h'))},ev:EV,btc:undefined},multi=R.length>1;
  var nx=function(){if(k>=R.length){AP.rc=null;AP.busy=false;AP.cur='';apRender();setTimeout(function(){try{labAuto()}catch(e){}},4000);if(tot){toast('🤖 Ο Αυτόματος Καθηγητής άνοιξε '+tot+' demo'+(multi?' σε '+R.length+' προφίλ':'')+'.');setTimeout(function(){autoEval(true)},2500)}return}
    var r=R[k++];r.multi=multi;AP.rc=r;apScanOne(r,SH,manual,function(o){tot+=o;setTimeout(nx,200)})};nx()}
function apScanOne(RC,SH,manual,fin){var coins=apCoins(),opened=0,blocked=0,i=0,c=RC.cfg,watch=[],props=[],tfs=apTfs(),ctx={btc:SH.btc||null,openedDir:{}},brk=apProt().brk?apBreaker():'',sid=sessOf(Date.now());apStatus();
  var done=function(){AP.cur='';if(RC.main){AP.watch=watch;AP.props=props.map(function(p){p.pid=RC.id;return p});AP.scanAt=Date.now();AP.brk=brk;try{apStWrite({scanAt:AP.scanAt,watch:watch.slice(0,16).map(function(w){return {coin:w.coin,tf:w.tf,mk:w.mk,name:w.name,dir:w.dir,testR:isFinite(w.testR)?+w.testR.toFixed(2):null,testN:w.testN,allR:isFinite(w.allR)?+w.allR.toFixed(2):null,n:w.n,X:w.X,sig:w.sig,grade:w.grade,weak:w.weak,wait:String(w.wait||'').slice(0,200),block:String(w.block||'').slice(0,160),bestSess:w.bestSess||null,curSess:w.curSess||null}}),props:props.slice(0,6).map(function(p){return {coin:p.coin,tf:p.tf,name:p.x.s.t,dir:p.x.d,testR:+(+p.x.test.avgR).toFixed(2),testN:p.x.test.n}})})}catch(e){}
    }var msg=(RC.multi?'['+RC.name+'] ':'')+'Σάρωση '+coins.length+' νομισμάτων σε '+tfs.join(' + ')+' · '+sessName(sid)+(opened?': άνοιξαν '+opened+' demo.':props.length?': '+props.length+' πρόταση/εις για έγκριση.':': καμία νέα συναλλαγή.')+(blocked?' Οι προστασίες σταμάτησαν '+blocked+' σήμα/τα.':'');
    apAdd('','scan',msg);apRender();
    if(!opened&&RC.main&&props.length&&manual)toast('🤖 '+props.length+' πρόταση/εις περιμένουν την έγκρισή σου.');fin(opened)};
  var evalTf=function(coin,b1,tf,r){var b=tf==='1h'?b1:apAgg(b1,AP_TFMS[tf]);if(b.length<250)return null;
    var fee=(+c.fee||0.1)+(+c.slip||0),key=coin+'|'+tf+'|'+fee,E=SH.ev[key];
    if(!E){var all=BT.filter(function(x){return !BT_NOTGT[x.id]}).map(function(x){return x.id}),ev0=nowEval(b,{ids:all,fee:fee,sym:coin+'USDT'}),bh=apAgg(b1,tf==='1h'?AP_TFMS['4h']:864e5),gHi=null;if(bh.length>=60){try{gHi=regime(bh,btInd0(bh))}catch(e){}}
      E=SH.ev[key]={ev:ev0,med:apMedAtr(ev0,b),gHi:gHi}}
    var ids=apStratIds(),ev=Object.assign({},E.ev,{cands:E.ev.cands.filter(function(x){return ids.indexOf(x.id)>=0})});
    return {tf:tf,b:b,ev:ev,g:ev.g,med:E.med,gHi:E.gHi}};
  var step=function(){if(i>=coins.length){done();return}var coin=coins[i++];AP.cur=(RC.multi?RC.name+' · ':'')+coin;apStatus();
    SH.fail=SH.fail||{};if(SH.fail[coin]){setTimeout(step,0);return}/* ήδη χωρίς δεδομένα σε αυτή τη σάρωση: τα άλλα προφίλ το προσπερνούν σιωπηλά */
    SH.bars(coin).then(function(r){AP.via=r.src||'';
      var b1=r.bars.filter(function(x){return !x.approx&&x.t+36e5<=Date.now()+60000});
      AP.noData=AP.noData||{};if(b1.length<300){AP.noData[coin]='μόνο '+b1.length+' κεριά';SH.fail[coin]=1;apAdd(coin,'need','Μόνο '+b1.length+' κεριά ('+(r.src||'')+'). Δεν υπάρχει ακόμα βαθύ ιστορικό για '+coin+'.',true);return}
      if(AP.noData&&b1.length>=300)delete AP.noData[coin];if(Date.now()-(b1[b1.length-1].t+36e5)>3*36e5){apAdd(coin,'skip','Τα κεριά σταματούν '+apAgo(b1[b1.length-1].t+36e5)+' ('+(r.src||'')+'). Δεν ανοίγω τίποτα.');return}
      var best=null,openOn=(RC.id?apMineR():dmOf(PROF)).some(function(t){return !dmClosed(t)&&dmSym(t.symbol).replace(/(USDT|USDC|USD)$/,'')===coin}),blk=[];
      tfs.forEach(function(tf){var E=evalTf(coin,b1,tf,r);if(!E)return;var g=E.g,ev=E.ev;if(coin==='BTC'&&tf==='1h'){ctx.btc=g;SH.btc=g}
        ev.cands.forEach(function(x){x.grade=apGrade(x)});
        var good=ev.cands.filter(function(x){return x.reliable&&x.test.avgR>0&&x.fit>=0}).sort(function(a,z){return (z.grade-a.grade)||((z.test.avgR+Math.min(0,z.best.st.avgR))-(a.test.avgR+Math.min(0,a.best.st.avgR)))});
        var weak=ev.cands.filter(function(x){return x.test.avgR>0&&x.fit>=0&&x.test.n>=3&&x.best.st.avgR>0}).sort(function(a,z){return z.test.avgR-a.test.avgR}),w=good[0]||weak[0]||null;
        var ss=w?apSessStats(w):{},bs=apBestSess(ss),cur=ss[sid];
        var row={coin:coin,tf:tf,mk:regimeText(g),adx:g.adx,name:w?w.s.t:null,dir:w?w.d:0,testR:w?w.test.avgR:NaN,testN:w?w.test.n:0,allR:w?w.best.st.avgR:NaN,n:w?w.best.st.n:0,X:w?w.best.X:null,sig:!!(w&&w.sig),grade:w?w.grade:0,weak:!!(w&&!good[0]),wait:w&&!w.sig?waitText(w.id,g,w.d):'',
          bestSess:bs?{id:bs,avg:ss[bs].avg,n:ss[bs].n}:null,curSess:cur?{avg:cur.avg,n:cur.n}:null,block:''};
        watch.push(row);
        var tb=null;ev.cands.filter(function(x){return x.grade>0}).forEach(function(x){var it={coin:coin,tf:tf,x:x,g:g,b:E.b,r:r,gHi:E.gHi,medAtr:E.med};var why=apBlock(it,ctx);if(why){blk.push({it:it,why:why});if(w===x)row.block=why;return}
          if(!tb||x.grade>tb.x.grade||(x.grade===tb.x.grade&&x.test.avgR>tb.x.test.avgR))tb=it});
        if(tb){if(!best||tb.x.grade>best.x.grade||(tb.x.grade===best.x.grade&&tb.x.test.avgR>best.x.test.avgR))best=tb;if(tb.x.grade===1||openOn)props.push(tb)}});
      if(blk.length&&!best){blocked+=blk.length;var b0=blk.sort(function(a,z){return z.it.x.grade-a.it.x.grade})[0];apAdd(coin,'block','Σήμα «'+b0.it.x.s.t+'» '+(b0.it.x.d>0?'Long':'Short')+' ('+b0.it.tf+') αλλά το σταμάτησε προστασία: '+b0.why+'.');return}
      if(!best){var w0=watch.filter(function(w){return w.coin===coin});apAdd(coin,'wait',w0.map(function(w){return w.tf+': '+w.mk+(w.name?' · παρακολουθεί «'+w.name+'» '+(w.dir>0?'Long':'Short')+(w.bestSess?', καλύτερη ώρα '+sessInfo(w.bestSess.id).t:''):' · καμία στρατηγική με πλεονέκτημα')}).join(' | ')+'. Κανένα σήμα τώρα.');return}
      if(best.x.grade<2){apAdd(coin,'prop','Σήμα «'+best.x.s.t+'» '+(best.x.d>0?'Long':'Short')+' ('+best.tf+') αλλά με λίγα δεδομένα ('+fR(best.x.test.avgR)+' σε '+best.x.test.n+' νέες). Είναι στις προτάσεις για έγκριση.');return}
      if(openOn){apAdd(coin,'prop','Ισχυρό σήμα «'+best.x.s.t+'» ('+best.tf+'), αλλά υπάρχει ήδη ανοιχτή demo στο '+coin+'. Μπήκε στις προτάσεις.');return}
      if(brk){props.push(best);apAdd(coin,'block','Ισχυρό σήμα «'+best.x.s.t+'» ('+best.tf+'), αλλά ο διακόπτης ασφαλείας είναι ενεργός: '+brk+' Μπήκε στις προτάσεις.');return}
      var mine=apMineR(),op=mine.filter(function(t){return !dmClosed(t)}).length+opened,td=mine.filter(function(t){return t.date===lday(new Date())}).length+opened;
      if(op>=c.maxOpen||td>=c.maxDay){props.push(best);apAdd(coin,'lim','Ισχυρό σήμα «'+best.x.s.t+'» ('+best.tf+'), αλλά '+(op>=c.maxOpen?'έφτασε το όριο ανοιχτών ('+c.maxOpen+')':'έφτασε το όριο ημέρας ('+c.maxDay+')')+'. Μπήκε στις προτάσεις.');return}
      return apOpenLive(best,false).then(function(ok){if(ok){opened++;ctx.openedDir[best.x.d]=(ctx.openedDir[best.x.d]||0)+1}})}).catch(function(e){AP.noData=AP.noData||{};AP.noData[coin]='χωρίς κεριά';SH.fail[coin]=1;apAdd(coin,'err',gmErrText(e)+(AP.cfg&&AP.rc&&AP.rc.multi?' Ισχύει για όλα τα προφίλ.':'')+' [κωδικός: '+((e&&e.code)||'?')+']',true)}).then(function(){setTimeout(step,300)})};
  var go=function(){step()};
  /* BTC first: its trend filters the alts */
  if(coins.indexOf('BTC')>0){coins.splice(coins.indexOf('BTC'),1);coins.unshift('BTC')}else if(coins.indexOf('BTC')<0&&apProt().btc&&!ctx.btc){SH.bars('BTC').then(function(r){var b=r.bars.filter(function(x){return !x.approx});if(b.length>=300){ctx.btc=regime(b,btInd0(b));SH.btc=ctx.btc}}).catch(function(){}).then(go);return}
  go()}
function apOpenLive(it,manual){/* τιμή αγοράς τώρα (κερί 1 λεπτού) πριν ανοίξει: χωρίς αυτήν μπαίνει μόνο εντολή με όριο */
  return mktPrice(it.coin+'USDT').then(function(q){if(q&&!q.old&&isFinite(q.px))it.live=q.px}).catch(function(){}).then(function(){return apOpen(it,manual)})}
function apOpen(it,manual){var c=apC(),pid=AP.rc&&AP.rc.id,coin=it.coin,top=it.x,g=it.g,b=it.b,r=it.r,tf=it.tf,d=top.d,i=b.length-1,ms=AP_TFMS[tf]||36e5,sk=(pid&&AP.rc.multi?pid+'|':'')+coin+'|'+top.id+'|'+d+'|'+tf+'|'+b[i-top.sig.ago].t;
  if(apSeen()[sk]){apAdd(coin,'skip','Το σήμα «'+top.s.t+'» ('+tf+') το έχω ήδη παίξει.');return false}
  var e=g.c,stp=top.sig.stop,risk=Math.abs(e-stp),X=top.best.X,lp=isFinite(it.live)?it.live:NaN,ord='market';if(!isFinite(lp)){ord='limit'}
  if(isFinite(lp)&&lp>0){if((lp-stp)*d<=0){apAdd(coin,'skip','Η τιμή ('+fmtPx(lp)+') πέρασε ήδη το stop του σήματος.');apMark(sk);return false}
    if((lp-e)*d<=0.25*risk)e=lp;else ord='limit'}
  risk=Math.abs(e-stp);if(!(risk>0))return false;
  if(risk/e*100>9){apAdd(coin,'skip','Το stop θα ήταν '+fmt(risk/e*100,1)+'% μακριά (όριο 9%).');apMark(sk);return false}
  var ext=d>0?g.hi:g.lo,room=(ext-e)*d/risk;if(FIT[top.id]==='range'&&room>0&&room<X){if(room>=1.5)X=Math.floor(room*2)/2;else{apAdd(coin,'skip','«'+top.s.t+'»: μόνο '+fmt(room,1)+'R ως το ακραίο σημείο των 50 κεριών. Λίγος χώρος.');apMark(sk);return false}}
  var tg=e+d*X*risk,lev=Math.min(50,Math.max(1,+c.lev||10)),bal=pid?apfBal(pid):dmBal(PROF),used=sum((pid?apMineR():dmOf(PROF)).filter(function(t){return !dmClosed(t)}).map(function(t){return n(t.margin)||n(t.notional)||0}));
  var margin=c.size==='risk'?(bal*Math.min(5,Math.max(0.1,+c.riskPct||1))/100/risk*e/lev):(+c.margin||1000);margin=Math.min(margin,bal-used);if(!(margin>=10)){apAdd(coin,'lim','Δεν υπάρχει ελεύθερο κεφάλαιο στον λογαριασμό'+(pid?' του προφίλ':'')+'.');return false}
  var notional=margin*lev,qty=notional/e,liq=lev>1?e*(d>0?1-1/lev+0.005:1+1/lev-0.005):NaN;
  if(isFinite(liq)&&(stp-liq)*d<=0){apAdd(coin,'skip','Με '+lev+'x η ρευστοποίηση ('+fmtPx(liq)+') έρχεται πριν το stop.');apMark(sk);return false}
  var now=Date.now(),dt=new Date(now),riskAmt=qty*risk,mk=regimeText(g)+' · ADX '+fmt(g.adx,0);
  var why=top.s.t+' · '+(d>0?'Long':'Short')+' · '+tf+' · '+mk+' · backtest '+top.best.st.n+' συναλλαγές, μέσο '+fR(top.best.st.avgR)+', σε νέα δεδομένα '+fR(top.test.avgR)+' ('+top.test.n+') · στόχος '+fmt(X,X%1?1:0)+'R · κεριά '+(r.src||'')+' ('+b.length+')'+(manual?' · εγκρίθηκε χειροκίνητα':'');
  var doc={by:PROF,runBy:S.uid,symbol:coin+'USDT',ex:'cc',dir:d>0?'long':'short',ord:ord,entry:e,stop:stp,target:tg,at:now,date:lday(dt),time:pad2(dt.getHours())+':'+pad2(dt.getMinutes()),
    riskPct:dmR2(riskAmt/bal*100),riskAmt:dmR2(riskAmt),qty:qty,notional:dmR2(notional),lev:lev,margin:dmR2(margin),liq:isFinite(liq)?liq:null,exp:ord==='limit'?Math.max(2,Math.round(3*ms/36e5)):null,
    src:'auto',mgmt:c.mgmt||'none',cfId:null,tech:top.s.mid||'',title:top.s.t,stratId:null,notes:('🤖 '+why).slice(0,500),status:'open',createdAt:now,
    auto:{profile:AP.rc&&AP.rc.id?{id:AP.rc.id,name:AP.rc.name}:apProfTag(),wr:isFinite(top.best.st.winRate)?+top.best.st.winRate.toFixed(3):null,sess:sessOf(now),tf:tf,strat:top.id,X:X,n:top.best.st.n,avgR:+(+top.best.st.avgR).toFixed(3),testR:+(+top.test.avgR).toFixed(3),testN:top.test.n,regime:g.kind,sigT:b[i-top.sig.ago].t,grade:top.grade,manual:!!manual}};
  apMark(sk);
  put('demo',newId(),doc).then(function(){apRender()}).catch(function(err){apAdd(coin,'err','Δεν αποθηκεύτηκε: '+writeErr(err));apRender()});
  apAdd(coin,'open',(manual?'Εγκρίθηκε και άνοιξε ':'Άνοιξε ')+(d>0?'Long':'Short')+' ('+(ord==='limit'?'εντολή με όριο':'market')+', '+tf+') με «'+top.s.t+'»: είσοδος '+fmtPx(e)+', stop '+fmtPx(stp)+', στόχος '+fmtPx(tg)+' ('+fmt(X,X%1?1:0)+'R). '+mk+'. Σε νέα δεδομένα '+fR(top.test.avgR)+' σε '+top.test.n+' συναλλαγές.');
  return true}
function apWatchHtml(){var W=AP.watch||[],P=AP.props||[];if(!W.length&&!P.length)return '';var h='';
  P=P.slice().sort(function(a,z){return z.x.test.avgR-a.x.test.avgR}).slice(0,6);AP.props=P;if(P.length)h+='<details class="apfold" data-apfold="p"'+(AP.fold&&AP.fold.p?' open':'')+'><summary><span class="lbl">💡 Προτάσεις για έγκριση ('+P.length+')</span> <span class="muted" style="font-size:.78rem">σήμα τώρα, αλλά χωρίς αρκετή απόδειξη για αυτόματο άνοιγμα</span></summary><div class="approps">'+P.map(function(p,k){var x=p.x;return '<div class="approp"><div><b>'+esc(p.coin)+'</b> · '+esc(x.s.t)+' · <b>'+(x.d>0?'Long':'Short')+'</b> · '+p.tf+'<br><span class="muted" style="font-size:.8rem">Σε νέα δεδομένα '+fR(x.test.avgR)+' σε '+x.test.n+' · σύνολο '+fR(x.best.st.avgR)+' σε '+x.best.st.n+' · στόχος '+fmt(x.best.X,x.best.X%1?1:0)+'R'+(x.reliable?'':' · λίγα δεδομένα')+'</span></div><button type="button" class="btn small primary" data-approp="'+k+'">✅ Άνοιξε demo</button></div>'}).join('')+'</div></details>';
  if(W.length)h+='<details class="apfold" data-apfold="w"'+(AP.fold&&AP.fold.w?' open':'')+'><summary><span class="lbl">👀 Τι παρακολουθεί τώρα ('+W.length+')</span> <span class="muted" style="font-size:.78rem">'+apAgo(AP.scanAt||Date.now())+(W.filter(function(w){return w.sig}).length?' · '+W.filter(function(w){return w.sig}).length+' με σήμα τώρα':'')+'</span></summary><div class="tw"><table class="apw"><thead><tr><th>Νόμισμα</th><th>TF</th><th>Αγορά</th><th>Καλύτερη στρατηγική εδώ</th><th class="r">Νέα δεδομένα</th><th class="r">Σύνολο</th><th>Καλύτερη ώρα</th><th>Τι περιμένει</th></tr></thead><tbody>'+
    W.map(function(w){return '<tr><td><b>'+esc(w.coin)+'</b></td><td>'+w.tf+'</td><td>'+esc(w.mk)+'</td><td>'+(w.name?esc(w.name)+' · '+(w.dir>0?'Long':'Short')+(w.X?' · '+fmt(w.X,w.X%1?1:0)+'R':'')+(w.weak?' <span class="pill">λίγα δεδομένα</span>':''):'<span class="muted">καμία με πλεονέκτημα</span>')+'</td><td class="r num '+cls(w.testR)+'">'+(w.name?fR(w.testR)+' <span class="muted">('+w.testN+')</span>':'–')+'</td><td class="r num '+cls(w.allR)+'">'+(w.name?fR(w.allR)+' <span class="muted">('+w.n+')</span>':'–')+'</td><td style="white-space:normal;min-width:9rem">'+(w.bestSess?esc(sessInfo(w.bestSess.id).t)+' <span class="muted num">'+fR(w.bestSess.avg)+'</span>':'–')+(w.curSess?'<br><span class="muted" style="font-size:.78rem">τώρα: '+fR(w.curSess.avg)+' ('+w.curSess.n+')</span>':'')+'</td><td style="white-space:normal;min-width:14rem">'+(w.block?'<span class="pill warn">🛡️ '+esc(w.block)+'</span>':w.sig?'<span class="pill gain">σήμα τώρα</span>':esc(w.wait||'–'))+'</td></tr>'}).join('')+'</tbody></table></div></details>';
  return h}
function apAgo(t){var m=Math.round((Date.now()-t)/60000);return m<1?'τώρα':m<60?'πριν '+m+'′':'πριν '+Math.floor(m/60)+' ώ '+(m%60)+'′'}
function apGmRender(){var el=$('#apGm');if(!el)return;var h='';
  if(!CG.mcp)h='<span class="pill warn">Gemini</span> <span>Σε αυτή την προβολή δεν υπάρχουν συνδέσεις (connectors). Ο καθηγητής θα χρησιμοποιήσει τα κοινά κεριά που αποθηκεύει η σελίδα του διαχειριστή.</span>';
  else if(GM.ok&&!GM.err)h='<span class="pill gain">Gemini ✓</span> <span>Τα κεριά έρχονται κανονικά.</span>';
  else if(AP.via&&AP.via!=='Gemini')h='<span class="pill gain">Κεριά ✓</span> <span>Πηγή: '+esc(AP.via)+'. Δεν χρειάζεται το Gemini.</span>';
  else if(GM.err)h='<span class="pill loss">Gemini ✕</span> <span>'+esc(gmErrText(GM.err))+' <span class="muted">[κωδικός: '+esc(GM.err.code)+(GM.err.msg?' · '+esc(GM.err.msg):'')+']</span></span>';
  if(GM.diag&&!AP.via&&(GM.err||!GM.ok))h+='<div class="muted" style="margin-top:.25rem;font-size:.78rem">Συνδέσεις που βλέπει η σελίδα: '+esc((GM.diag.names||[]).join(', ')||'καμία')+(GM.diag.hit?' · Gemini ως «'+esc(GM.diag.hit)+'»'+(GM.diag.auth?' ('+esc(GM.diag.auth)+')':''):' · Gemini: δεν βρέθηκε')+(GM.diag.err?' · σφάλμα λίστας: '+esc(GM.diag.err):'')+'</div>';
  el.innerHTML=h;el.hidden=!h}
function apGmTest(){var b=$('#ap-gm');if(b){b.disabled=true;b.textContent='Ελέγχω…'}GM.bad=null;GM.mem={};
  gmDiag().then(function(){return gmFetch('BTC','1h')}).then(function(r){toast('Gemini OK: ήρθαν '+r.bars.length+' κεριά BTC.')}).catch(function(e){toast('Gemini: '+gmErrText(e))}).then(function(){if(b){b.disabled=false;b.textContent='🔌 Σύνδεση Gemini'}apGmRender()})}
var SX_LIQ={asia:.42,lon:.72,ovl:1,ny:.82,late:.32},SX_NOTE={asia:'Ήρεμη αγορά, στενά εύρη',lon:'Ανοίγει η Ευρώπη, πρώτες κινήσεις',ovl:'Μέγιστη ρευστότητα και όγκος',ny:'Ανακοινώσεις ΗΠΑ, δυνατές κινήσεις',late:'Χαμηλός όγκος, ψεύτικα σπασίματα'};
function sxDur(m){m=Math.max(0,Math.round(m));var h=Math.floor(m/60),mm=m%60;return (h?h+'ω ':'')+mm+'λ'}
function sxEnd(now){var d=new Date(now),wd=d.getUTCDay(),cur=sessOf(now);
  if(cur==='wkd'){var mon=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+(wd===6?2:1)));return {at:mon.getTime(),next:'asia'}}
  var s=sessInfo(cur),end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),s.b),i=SESS.indexOf(s),nx=i<4?SESS[i+1].id:'asia';
  if(cur==='late'&&new Date(end).getUTCDay()===6)nx='wkd';return {at:end,next:nx}}
function apSessBar(){var el=$('#apSess');if(!el)return;var now=Date.now(),cur=sessOf(now),off=-new Date().getTimezoneOffset()/60,dn=new Date(now),hNow=dn.getHours()+dn.getMinutes()/60;
  var bot={};try{apMine().filter(dmCounts).forEach(function(t){var k=sessOf(t.at||apTradeTs(t)),a=bot[k]=bot[k]||{n:0,r:0};a.n++;a.r+=n(t.r)})}catch(e){}
  var segs=[];SESS.slice(0,5).forEach(function(x){var a=((x.a+off)%24+24)%24,b=a+(x.b-x.a);if(b<=24)segs.push({x:x,a:a,b:b});else{segs.push({x:x,a:a,b:24});segs.push({x:x,a:0,b:b-24,cont:true})}});
  var en=sxEnd(now),wkd=cur==='wkd';
  var slab=function(g){var x=g.x,h=Math.round(16+SX_LIQ[x.id]*58),on=x.id===cur&&!wkd,w=g.b-g.a;
    return '<div class="sxslab sx-'+x.id+(on?' on':'')+'" style="left:'+(g.a/24*100).toFixed(3)+'%;width:'+(w/24*100).toFixed(3)+'%;--h:'+h+'px"><i class="sxtop"></i><i class="sxfront">'+(w>=2.5&&!g.cont?'<b>'+esc(x.t.replace('Λονδίνο + Νέα Υόρκη','ΛΔ + ΝΥ'))+'</b>':'')+'</i><i class="sxside"></i></div>'};
  var ticks='';for(var h=0;h<=24;h+=3)ticks+='<i class="sxtick" style="left:'+(h/24*100)+'%"><b>'+pad2(h%24===0&&h?24:h)+'</b></i>';
  var hrs='';for(var k=1;k<24;k++)hrs+='<i class="sxhr'+(k%6?'':' maj')+'" style="left:'+(k/24*100).toFixed(3)+'%"></i>';
  var ci=sessInfo(cur);
  el.innerHTML='<div class="sxhead"><div><span class="sxk">ΩΡΕΣ ΑΓΟΡΩΝ · ΤΟΠΙΚΗ ΩΡΑ</span><div class="sxclock num">'+pad2(dn.getHours())+':'+pad2(dn.getMinutes())+'</div></div>'+
    '<div class="sxnow"><span class="sxk">ΤΩΡΑ</span><b>'+esc(ci.t)+'</b><span class="muted">'+(wkd?'ανοίγει η Ασία σε '+sxDur((en.at-now)/60000):'κλείνει σε '+sxDur((en.at-now)/60000)+' · μετά '+esc(sessInfo(en.next).t))+'</span></div></div>'+
    '<div class="sxscene"><div class="sxplane">'+hrs+segs.map(slab).join('')+'<i class="sxanc" style="left:'+(hNow/24*100).toFixed(3)+'%"></i>'+ticks+'</div><i class="sxpole"><b>ΤΩΡΑ '+pad2(dn.getHours())+':'+pad2(dn.getMinutes())+'</b></i>'+(wkd?'<div class="sxwkd">Σαββατοκύριακο · χαμηλή ρευστότητα</div>':'')+'</div>'+
    '<div class="sxdim"><span>00:00</span><i></i><span>24 ώρες · ύψος = ρευστότητα</span><i></i><span>24:00</span></div>'+
    '<div class="sxplates">'+SESS.map(function(x){var b=bot[x.id],on=x.id===cur;return '<div class="sxplate sx-'+x.id+(on?' on':'')+'"><div class="sxpt"><b>'+esc(x.t)+'</b>'+(on?'<span class="sxlive">● τώρα</span>':'')+'</div><span class="num sxhrs">'+esc(sessLocal(x))+'</span>'+
      (SX_LIQ[x.id]!=null?'<span class="sxliq"><i style="width:'+(SX_LIQ[x.id]*100)+'%"></i></span>':'<span class="sxliq wk"><i style="width:25%"></i></span>')+
      '<small class="muted">'+esc(SX_NOTE[x.id]||'Crypto ανοιχτά, λίγος όγκος')+'</small><small class="sxbot">🤖 '+(b?'<span class="num '+cls(b.r)+'">'+fR(b.r/b.n)+'</span> μέσο · '+b.n+' κλειστ.':'καμία ακόμα')+'</small></div>'}).join('')+'</div>';
  sxPole();clearTimeout(apSessBar.t);apSessBar.t=setTimeout(apSessBar,60000)}
function sxPole(){var sc=document.querySelector('#apSess .sxscene'),a=sc&&sc.querySelector('.sxanc'),pl=sc&&sc.querySelector('.sxpole');if(!a||!pl)return;var r=a.getBoundingClientRect(),q=sc.getBoundingClientRect();if(!q.width){sxPole.n=(sxPole.n||0)+1;if(sxPole.n<600)setTimeout(sxPole,1000);return}sxPole.n=0;pl.style.left=(r.left-q.left)+'px';pl.style.top='34px';pl.style.height=Math.max(20,r.top-q.top-34)+'px'}
window.addEventListener('resize',function(){clearTimeout(sxPole.t);sxPole.t=setTimeout(sxPole,150)});
function apStatus(){var el=$('#apStat');if(!el||!AP.cfg)return;var c=AP.cfg,mine=apMine(),op=mine.filter(function(t){return !dmClosed(t)}).length,td=mine.filter(function(t){return t.date===lday(new Date())}).length;
  var st=!qCanSave()?'<span class="pill">μόνο προβολή</span>':AP.busy?'<span class="pill acc apdot"><i></i>Σαρώνει'+(AP.cur?' '+esc(AP.cur):'')+'…</span>':c.on?'<span class="pill gain apdot"><i></i>Ενεργός</span>':'<span class="pill">Σβηστός</span>';
  var nx=c.on&&!AP.busy?Math.max(0,Math.round(((AP.last+c.iv*60000)-Date.now())/60000)):null;
  el.innerHTML=st+' <span class="muted">Τελευταία σάρωση: <b>'+(AP.last?apAgo(AP.last):'–')+'</b>'+(nx!=null?' · επόμενη σε <b>'+nx+'′</b>':'')+' · ανοιχτές <b>'+op+'/'+c.maxOpen+'</b> · σήμερα <b>'+td+'/'+c.maxDay+'</b></span>'}
function apRender(){var box=$('#apBody');if(!box||!AP.cfg)return;var c=AP.cfg,ro=!qCanSave();
  $('#ap-on').checked=!!c.on;$('#ap-on').disabled=ro;
  ['iv','tf','coins','maxOpen','maxDay','margin','lev','sess','size','riskPct','minEdge','strats','mgmt','slip'].forEach(function(k){var x=$('#ap-'+k);if(x&&document.activeElement!==x)x.value=c[k]});['pNews','pMtf','pBtc','pVol','pCool','pCorr','pBrk'].forEach(function(k){var x=$('#ap-'+k);if(x)x.checked=c[k]!==false});
  var mw=$('#ap-marginW'),rw=$('#ap-riskW');if(mw)mw.hidden=c.size==='risk';if(rw)rw.hidden=c.size!=='risk';apSessBar();apStrPick();apCoinPick();try{apfRender()}catch(e){}
  var mine=apMine(),cl=mine.filter(dmCounts),w=cl.filter(function(t){return t.r>0}).length,R=sum(cl.map(function(t){return n(t.r)}));
  $('#apKpi').innerHTML=kpi('Αυτόματες συναλλαγές',String(mine.length),mine.filter(function(t){return !dmClosed(t)}).length+' ανοιχτές')+kpi('Πέτυχαν',pct(cl.length?w/cl.length:NaN),w+' / '+cl.length)+kpi('Σύνολο R',cl.length?fR(R):'–','',cls(R))+kpi('PnL',cl.length?dmMoney(sum(cl.map(function(t){return n(t.pnl)||0})),dmAcct('prof').ccy):'–','',cls(sum(cl.map(function(t){return n(t.pnl)||0}))));
  var ic={open:'🟢',wait:'⏳',skip:'↷',need:'📉',err:'⚠️',lim:'⛔',scan:'🔎',prop:'💡',block:'🛡️'};var aw=$('#apWatch');if(aw)aw.innerHTML=apWatchHtml();
  $('#apLog').innerHTML=AP.log.length?'<ul class="aplog">'+AP.log.slice(0,AP.more?60:8).map(function(x){return '<li class="ap-'+x.k+'"><span class="apt">'+esc(pad2(new Date(x.t).getHours())+':'+pad2(new Date(x.t).getMinutes()))+'</span><span>'+ic[x.k]+'</span>'+(x.c?'<b>'+esc(x.c)+'</b>':'')+'<span>'+esc(x.m)+'</span></li>'}).join('')+'</ul>'+(AP.log.length>8?'<button type="button" class="btn small" id="apMore">'+(AP.more?'Λιγότερα':'Όλο το ημερολόγιο ('+AP.log.length+')')+'</button>':''):'<div class="empty">Δεν έχει γίνει ακόμα σάρωση. Άναψε τον διακόπτη ή πάτα «Σάρωση τώρα».</div>';
  apStatus();apGmRender();try{if(!AP.pfT)AP.pfT=setTimeout(function(){AP.pfT=0;renderPf()},300)}catch(e){}}
function apBind(){var card=$('#apCard');if(!card||card.dataset.b)return;card.dataset.b='1';card.addEventListener('input',function(e){var t=e.target;if(t.hasAttribute&&t.hasAttribute('data-apbm')&&t.tagName==='INPUT'){var D=apbD(),k=t.getAttribute('data-apbm');D[k]=k==='start'?n(t.value):t.value}});card.addEventListener('focusout',function(e){if(APF.pend&&e.target.closest&&e.target.closest('#apBuild'))setTimeout(function(){if(APF.pend)apfRender()},50)});card.addEventListener('toggle',function(e){var f=e.target.getAttribute&&e.target.getAttribute('data-apfold');if(f){AP.fold=AP.fold||{};AP.fold[f]=e.target.open}},true);
  card.addEventListener('change',function(e){var t=e.target;if(!AP.cfg)return;
    if(t.id==='ap-on'){if(!qCanSave()){t.checked=false;return}AP.cfg.on=t.checked;apSave();if(AP.cfg.on){apAdd('','scan','Ενεργοποιήθηκε. Σάρωση κάθε '+AP.cfg.iv+' λεπτά όσο η σελίδα είναι ανοιχτή.');if(Date.now()-AP.last>=AP.cfg.iv*60000)setTimeout(apScan,300)}else apAdd('','scan','Απενεργοποιήθηκε.');apRender();return}
    if(t.hasAttribute('data-apstr')){if(!qCanSave()){apRender();return}var ch=[].slice.call(card.querySelectorAll('[data-apstr]')).filter(function(x){return x.checked}).map(function(x){return x.getAttribute('data-apstr')});AP.cfg.pick=ch.join(',');apSave();apRender();return}
    if(t.closest&&t.closest('#apBuild')){apbChange(t);return}
    if(t.hasAttribute('data-apcoin')){if(!qCanSave()){apRender();return}var top=apTop10(),cs=[].slice.call(card.querySelectorAll('[data-apcoin]')).filter(function(x){return x.checked}).map(function(x){return x.getAttribute('data-apcoin')});if(!cs.length){toast('Κράτα τουλάχιστον ένα νόμισμα.');t.checked=true;return}cs.sort(function(a,b){var i=top.indexOf(a),j=top.indexOf(b);return (i<0?99:i)-(j<0?99:j)});AP.cfg.coins=cs.join(',');apSave();apRender();return}
    if(t.id==='apf-sel'){apfUse(t.value);return}
    if(t.id==='apf-start'){var pa=apfActive(),v0=n(t.value);if(pa&&qCanSave()&&v0>=100&&v0<=1e8){var d1=dmClean(pa);d1.start=v0;pa.start=v0;put('approfiles',pa.id,d1).catch(function(){});toast('Αρχικό κεφάλαιο '+pa.name+': '+dmMoney(v0,''))}else t.value=apfStart(pa);apRender();return}
    var k=t.id&&t.id.indexOf('ap-')===0?t.id.slice(3):'';if(!k||!(k in AP_DEF))return;var v=t.type==='checkbox'?t.checked:t.value;
    if(k==='iv'||k==='maxOpen'||k==='maxDay'||k==='margin'||k==='lev'||k==='riskPct'||k==='minEdge'||k==='slip'){v=n(v);var lim={iv:[5,240],maxOpen:[1,10],maxDay:[1,30],margin:[10,1e7],lev:[1,50],riskPct:[0.1,5],minEdge:[0,1],slip:[0,1]}[k];if(!isFinite(v)){t.value=AP.cfg[k];return}v=Math.min(lim[1],Math.max(lim[0],v))}
    if(k==='coins'){AP.cfg.coins=v;v=apCoins().join(',')||AP_DEF.coins;t.value=v}
    AP.cfg[k]=v;apSave();apRender()});
  card.addEventListener('click',function(e){var pb=e.target.closest('[data-approp]');if(pb){var it=(AP.props||[])[+pb.getAttribute('data-approp')];if(it&&qCanSave()){pb.disabled=true;var pp=it.pid&&apfGet(it.pid),act0=apfActive();AP.rc=pp?{id:pp.id,name:pp.name,cfg:act0&&act0.id===pp.id?AP.cfg:Object.assign({},AP_DEF,pp.cfg)}:null;apOpenLive(it,true).then(function(ok){AP.rc=null;if(ok){AP.props.splice(AP.props.indexOf(it),1);toast('Η demo άνοιξε.');setTimeout(function(){autoEval(true)},2500)}apRender()})}return}var ca=e.target.closest('[data-apcall]');if(ca&&qCanSave()){var tp=apTop10();AP.cfg.coins=(ca.getAttribute('data-apcall')==='top5'?tp.slice(0,5):tp).join(',');apSave();apRender();return}if(apbClick(e))return;var rb=e.target.closest('[data-apfrun]');if(rb){var pr=apfGet(rb.getAttribute('data-apfrun'));if(pr&&qCanSave()){var on2=pr.run===false,dd=dmClean(pr);dd.run=on2;pr.run=on2;put('approfiles',pr.id,dd).catch(function(e2){toast(writeErr(e2))});apAdd('','scan','Προφίλ '+pr.name+': '+(on2?'τρέχει παράλληλα':'σταμάτησε, το κεφάλαιό του βγήκε από τον λογαριασμό')+'.');toast(pr.name+(on2?' ▶ τρέχει':' ⏸ σταμάτησε'));apRender();try{renderDemo()}catch(e3){}try{renderPf()}catch(e4){}}return}if(apfClick(e))return;if(e.target.closest('#ap-gm')){apGmTest();return}if(e.target.closest('#ap-now')){apScan(true);return}if(e.target.closest('#apMore')){AP.more=!AP.more;apRender()}})}

/* 🧬 Προφίλ Αυτόματου Καθηγητή: κάθε σύνολο ρυθμίσεων αποθηκεύεται, κάθε αυτόματη συναλλαγή γράφει με ποιο προφίλ άνοιξε, και μετράμε την επιτυχία ανά προφίλ */
var APF={list:[],sub:null,loaded:false,seeded:false,edit:false};
var APF_MG={none:'σταθερό stop/στόχος',be:'break-even μετά +1R',trail:'trailing μετά +1R'};
var APF_ST={all:'όλες',trend:'μόνο τάσης',range:'μόνο εύρους',pick:'επιλεγμένες'};
var APF_KEYS=Object.keys(AP_DEF).filter(function(k){return k!=='on'&&k!=='iv'&&k!=='coins'});/* νομίσματα και ρυθμός σάρωσης: κοινά για όλα τα προφίλ */
function apfStart(p){var v=p&&+p.start;return v>0?v:10000}
function apfBal(id){var p=apfGet(id);return apfStart(p)+sum(apMine().filter(function(t){return apfTagId(t)===id&&dmClosed(t)&&isFinite(n(t.pnl))}).map(function(t){return n(t.pnl)}))}
function apStratIds(){var c=apC()||AP_DEF,base=BT.filter(function(x){return !BT_NOTGT[x.id]}).map(function(x){return x.id}),m=c.strats||'all';
  if(m==='trend')return base.filter(function(id){return FIT[id]==='trend'});
  if(m==='range')return base.filter(function(id){return FIT[id]==='range'||FIT[id]==='squeeze'});
  if(m==='pick'){var L=String(c.pick||'').split(',').filter(function(id){return base.indexOf(id)>=0});return L.length?L:base}
  return base}
function apStrPick(){var box=$('#apStrPick');if(!box||!AP.cfg)return;var c=AP.cfg;box.hidden=c.strats!=='pick';if(box.hidden)return;var sel=String(c.pick||'').split(','),ro=!qCanSave();
  box.innerHTML=BT.filter(function(x){return !BT_NOTGT[x.id]}).map(function(x){return '<label><input type="checkbox" data-apstr="'+x.id+'"'+(sel.indexOf(x.id)>=0?' checked':'')+(ro?' disabled':'')+'>'+esc(x.t)+' <span class="muted">'+(FIT[x.id]==='trend'?'τάση':FIT[x.id]?'εύρος':'')+'</span></label>'}).join('')}
function apfSnap(c){var o={};APF_KEYS.forEach(function(k){o[k]=c[k]});return o}
function apfPresets(base){var b=apfSnap(Object.assign({},AP_DEF,base||{}));var mk=function(ov){return Object.assign({},b,ov)};return [
  {id:'p_cons',name:'🛡️ Συντηρητικό',desc:'Μικρό ρίσκο, λίγες θέσεις, μόνο ισχυρά σήματα στις ώρες Λονδίνου/Ν. Υόρκης, stop στο break-even μετά από +1R. Η λογική των «safety orders» χωρίς DCA.',cfg:mk({size:'risk',riskPct:0.5,maxOpen:2,maxDay:3,minEdge:0.2,sess:'active',mgmt:'be',strats:'all',pMtf:true,pBtc:true,pVol:true,pCool:true,pCorr:true,pBrk:true,pNews:true})},
  {id:'p_trend',name:'🏄 Ακολουθία τάσης',desc:'Μόνο στρατηγικές τάσης, με trailing stop μετά από +1R για να «τρέχουν» τα κέρδη, όπως τα trend bots και το trailing του Freqtrade/3Commas.',cfg:mk({strats:'trend',mgmt:'trail',minEdge:0.1,pMtf:true,pBtc:true})},
  {id:'p_range',name:'↔️ Εύρος (grid-style)',desc:'Μόνο στρατηγικές επαναφοράς σε πλάγια αγορά: η ιδέα των grid bots (Pionex, Bitsgap), αλλά πάντα με stop, που είναι η μεγάλη αδυναμία των grid.',cfg:mk({strats:'range',mgmt:'none',pMtf:false,minEdge:0.1})},
  {id:'p_aggr',name:'⚡ Επιθετικό',desc:'Περισσότερες θέσεις και ρίσκο 2%, όλες οι ώρες, χαμηλότερο όριο πλεονεκτήματος. Για σύγκριση: δείχνει τι κοστίζει η χαλαρή πειθαρχία.',cfg:mk({size:'risk',riskPct:2,maxOpen:5,maxDay:10,minEdge:0.05,sess:'all',mgmt:'trail',pCool:false,pCorr:false})}]}
function apfSub(){if(!S.db||APF.sub)return;try{APF.sub=S.db.collection('approfiles').onSnapshot(function(sn){APF.list=sn.docs.map(function(d){return Object.assign({id:d.id},d.data())});APF.loaded=true;apfSeed();apfRender()},function(){})}catch(e){}}
function apfSeed(){if(APF.seeded||!APF.loaded||APF.list.length||!AP.cfg||!qCanSave())return;APF.seeded=true;var now=Date.now(),cur=apfSnap(AP.cfg);
  var L=[{id:'p_start',name:'📌 Αρχικό',desc:'Οι ρυθμίσεις με τις οποίες δούλευε ο Αυτόματος Καθηγητής μέχρι σήμερα. Οι αυτόματες συναλλαγές από πριν τα προφίλ μετράνε εδώ.',cfg:cur}].concat(apfPresets(AP.cfg));
  L.forEach(function(p,ix){var d={name:p.name,desc:p.desc,cfg:p.cfg,start:10000,run:true,by:S.uid,at:now+ix,builtin:p.id!=='p_start',hist:[]};APF.list.push(Object.assign({id:p.id},d));put('approfiles',p.id,d).catch(function(){})});
  if(!(AP.state&&AP.state.profile))apStWrite({profile:'p_start'})}
function apfGet(id){return APF.list.find(function(p){return p.id===id})||null}
function apfActive(){var id=AP.state&&AP.state.profile;return apfGet(id)||(!id&&APF.list.length?(apfGet('p_start')||APF.list[0]):null)}
function apfOff(t){if(t.src!=='auto'||typeof APF==='undefined'||!APF||!APF.list.length)return false;var p=apfGet(apfTagId(t));return !!(p&&p.run===false)}
function apfDiff(p){if(!p||!AP.cfg)return [];return APF_KEYS.filter(function(k){var a=p.cfg?p.cfg[k]:undefined,b=AP.cfg[k];if(a===undefined)a=AP_DEF[k];return String(a)!==String(b)})}
function apProfTag(){var p=apfActive();if(!p)return null;var df=apfDiff(p);return {id:p.id,name:p.name,mod:df.length?df.slice(0,6):null}}
function apfTagId(t){var pr=t.auto&&t.auto.profile;return pr&&pr.id?pr.id:'p_start'}
function apfTagName(t){var pr=t.auto&&t.auto.profile,p=apfGet(apfTagId(t));return p?p.name:pr&&pr.name?pr.name:'📌 Αρχικό'}
function apfDesc(c){c=Object.assign({},AP_DEF,c||{});return (c.tf==='both'?'1h+4h':c.tf)+' · '+(c.size==='risk'?'ρίσκο '+fmt(c.riskPct,c.riskPct%1?1:0)+'%':'κεφάλαιο '+c.margin)+' · έως '+c.maxOpen+' ανοιχτές / '+c.maxDay+' τη μέρα · στρατηγικές '+APF_ST[c.strats||'all']+' · έξοδος '+APF_MG[c.mgmt||'none']+' · ώρες '+({smart:'έξυπνα',active:'Λονδίνο/ΝΥ',all:'όλες'}[c.sess]||c.sess)+' · ελάχ. πλεονέκτημα '+fR(+c.minEdge)}
function apfStats(id){var L=(S.demo||[]).filter(function(t){return t.src==='auto'&&apfTagId(t)===id}),cl=L.filter(dmCounts).sort(function(a,b){return (a.exitAt||a.at||0)-(b.exitAt||b.at||0)});
  var R=cl.map(function(t){return n(t.r)}),w=R.filter(function(r){return r>0}).length,gw=sum(R.filter(function(r){return r>0})),gl=-sum(R.filter(function(r){return r<0})),eq=0,pk=0,dd=0,cur=[0];
  R.forEach(function(r){eq+=r;cur.push(eq);pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq)});
  return {n:cl.length,open:L.filter(function(t){return !dmClosed(t)}).length,all:L.length,wr:cl.length?w/cl.length:NaN,sumR:sum(R),avgR:cl.length?sum(R)/cl.length:NaN,pf:gl>0?gw/gl:(gw>0?Infinity:NaN),dd:dd,pnl:sum(cl.map(function(t){return n(t.pnl)||0})),curve:cur,since:L.length?Math.min.apply(null,L.map(function(t){return t.at||Date.now()})):null}}
function apfRows(){var ids={};APF.list.forEach(function(p){ids[p.id]=1});(S.demo||[]).forEach(function(t){if(t.src==='auto')ids[apfTagId(t)]=1});
  return Object.keys(ids).map(function(id){var p=apfGet(id),st=apfStats(id);return {id:id,name:p?p.name:'(διαγραμμένο) '+id,p:p,st:st}}).sort(function(a,b){return (b.st.all-a.st.all)||(a.name<b.name?-1:1)})}
function apfRender(){var box=$('#apProf');if(!box)return;var fa=document.activeElement;if(APF.edit==='new'&&fa&&fa.closest&&fa.closest('#apBuild')&&(fa.tagName==='INPUT'&&fa.type!=='checkbox')){APF.pend=1;return}APF.pend=0;if(!AP.cfg){box.innerHTML='';return}var ro=!qCanSave(),act=apfActive(),df=apfDiff(act),rows=apfRows(),ccy=dmAcct('prof').ccy;
  if(!APF.loaded&&S.db){box.innerHTML='<span class="muted">Φόρτωση προφίλ…</span>';return}
  var best=rows.filter(function(r){return r.st.n>=8}).sort(function(a,b){return b.st.avgR-a.st.avgR})[0];
  box.innerHTML='<div class="aph"><span><b>🧬 Προφίλ:</b> '+(APF.list.length?'<select id="apf-sel"'+(ro?' disabled':'')+'>'+(act?'':'<option value="">— χωρίς προφίλ —</option>')+APF.list.slice().sort(function(a,b){return (a.at||0)-(b.at||0)||(a.name<b.name?-1:1)}).map(function(p){return '<option value="'+esc(p.id)+'"'+(act&&act.id===p.id?' selected':'')+'>'+esc(p.name)+'</option>'}).join('')+'</select>':'<span class="muted">κανένα ακόμα</span>')+
    (act&&df.length?' <span class="apmod">✎ τροποποιημένο ('+df.length+' αλλαγ'+(df.length>1?'ές':'ή')+')</span>':'')+'</span>'+
    (ro?'':'<span class="row" style="gap:.35rem">'+(act&&df.length?'<button type="button" class="btn small primary" data-apf="save">💾 Αποθήκευση στο «'+esc(act.name)+'»</button><button type="button" class="btn small" data-apf="revert">↩︎ Επαναφορά</button>':'')+'<button type="button" class="btn small primary" data-apf="new">➕ Νέο προφίλ</button>'+(act?'<button type="button" class="btn small" data-apf="ren">✏️</button>'+(APF.list.length>1?'<button type="button" class="btn small" data-apf="del" title="Διαγραφή προφίλ">🗑</button>':''):'')+'</span>')+'</div>'+
    (APF.edit==='new'?apbHtml():APF.edit?'<div class="row" style="gap:.35rem;margin-top:.45rem"><input id="apf-name" placeholder="Όνομα προφίλ" maxlength="40" value="'+esc(APF.edit==='ren'&&act?act.name:'')+'" style="max-width:16rem"><input id="apf-desc" placeholder="Σημείωση (προαιρετικό)" maxlength="160" value="'+esc(APF.edit==='ren'&&act?act.desc||'':'')+'" style="max-width:22rem"><button type="button" class="btn small primary" data-apf="ok">'+(APF.edit==='ren'?'Μετονομασία':'Αποθήκευση')+'</button><button type="button" class="btn small" data-apf="cancel">Άκυρο</button></div>':'')+
    (APF.del?'<div class="row" style="gap:.35rem;margin-top:.45rem"><span>Διαγραφή του «'+esc(act?act.name:'')+'»; Οι συναλλαγές του μένουν στο ιστορικό.</span><button type="button" class="btn small danger" data-apf="delok">Ναι, διαγραφή</button><button type="button" class="btn small" data-apf="cancel">Άκυρο</button></div>':'')+
    (act?'<div class="muted" style="font-size:.8rem;margin-top:.35rem">'+(act.desc?esc(act.desc)+'<br>':'')+'<b>Ρυθμίσεις:</b> '+esc(apfDesc(act.cfg))+'<br><label class="apfcap">💰 Αρχικό εικονικό κεφάλαιο προφίλ <input id="apf-start" inputmode="decimal" value="'+apfStart(act)+'"'+(ro?' disabled':'')+'> '+esc(dmAcct('prof').ccy||'USDT')+'</label>'+(act.hist&&act.hist.length?' · '+act.hist.length+' παλαιότερες εκδόσεις φυλαγμένες':'')+'</div>':'')+
    '<div class="apptabw"><table class="apptab"><thead><tr><th>Προφίλ</th><th title="Τρέχει παράλληλα σε κάθε σάρωση">Τρέχει</th><th>Κεφάλαιο</th><th>Συναλλ.</th><th>Επιτυχία</th><th>Σύνολο R</th><th>Μέσο R</th><th>PF</th><th>Max DD</th><th>PnL</th><th>Πορεία</th></tr></thead><tbody>'+
    rows.map(function(r){var st=r.st;return '<tr class="'+(act&&act.id===r.id?'on':'')+(r.p&&r.p.run===false?' stop':'')+'"><td>'+(act&&act.id===r.id?'▶ ':'')+esc(r.name)+(best&&best.id===r.id?' <span class="pill gain" title="Καλύτερο μέσο R με 8+ συναλλαγές">⭐</span>':'')+(st.open?' <span class="muted">· '+st.open+' ανοιχτ.</span>':'')+(st.since?'<br><span class="muted" style="font-size:.72rem">από '+dateGr(lday(new Date(st.since)))+'</span>':'')+'</td><td style="text-align:center">'+(r.p?'<button type="button" class="apfrun pill '+(r.p.run!==false?'gain apdot':'loss')+'" data-apfrun="'+esc(r.id)+'"'+(ro?' disabled':'')+' title="'+(r.p.run!==false?'Πάτα για να σταματήσει':'Πάτα για να τρέχει παράλληλα')+'">'+(r.p.run!==false?'<i></i>Τρέχει':'⏸ Σταματημένο')+'</button>':'')+'</td><td class="num">'+(r.p?(function(){var st0=apfStart(r.p),eq=apfBal(r.id);return dmMoney(eq,'')+'<br><span class="muted" style="font-size:.72rem">αρχή '+dmMoney(st0,'')+' · <span class="'+cls(eq-st0)+'">'+(eq>=st0?'+':'')+fmt((eq-st0)/st0*100,2)+'%</span></span>'})():'–')+'</td><td>'+st.n+'</td><td>'+(st.n?pct(st.wr):'–')+'</td><td class="num '+cls(st.sumR)+'">'+(st.n?fR(st.sumR):'–')+'</td><td class="num '+cls(st.avgR)+'">'+(st.n?fR(st.avgR):'–')+'</td><td>'+(isFinite(st.pf)?fmt(st.pf,2):st.pf===Infinity?'∞':'–')+'</td><td class="num">'+(st.n?'−'+fmt(st.dd,1)+'R':'–')+'</td><td class="num '+cls(st.pnl)+'">'+(st.n?dmMoney(st.pnl,ccy):'–')+'</td><td>'+(st.curve.length>2?spark(st.curve,st.sumR>=0):'')+'</td></tr>'}).join('')+'</tbody></table></div>'+
    '<p class="muted" style="font-size:.74rem;margin:.35rem 0 0"><b>Παράλληλη λειτουργία:</b> σε κάθε σάρωση τρέχουν μαζί όλα τα προφίλ με πράσινο «● Τρέχει», καθένα με το δικό του κεφάλαιο, όρια και προστασίες. Τα «⏸ Σταματημένα» δεν ανοίγουν νέες θέσεις και το κεφάλαιό τους βγαίνει από τον Λογαριασμό Καθηγητή. Τα κεριά και τα backtest υπολογίζονται μία φορά και μοιράζονται. Κάθε αυτόματη συναλλαγή γράφει με ποιο προφίλ άνοιξε. Ένα προφίλ θέλει τουλάχιστον 20–30 κλειστές για να βγάλεις συμπέρασμα. Αν αλλάξεις ρυθμίσεις, αποθήκευσέ τες ως νέο προφίλ για να μη μπερδεύονται τα νούμερα.</p>'}
function apfUse(id){var p=apfGet(id);if(!p||!qCanSave()){apfRender();return}var on=AP.cfg.on,iv=AP.cfg.iv,co=AP.cfg.coins;AP.cfg=Object.assign({},AP_DEF,p.cfg,{on:on,iv:iv,coins:co});apSave();apStWrite({profile:id});APF.edit=false;APF.del=false;apAdd('','scan','Προφίλ: '+p.name+' ('+apfDesc(p.cfg)+').');toast('Ενεργό προφίλ: '+p.name);apRender()}
function apfClick(e){var b=e.target.closest('[data-apf]');if(!b)return false;if(!qCanSave())return true;var a=b.getAttribute('data-apf'),act=apfActive(),now=Date.now();
  if(a==='new'){APF.edit='new';APF.del=false;APF.draft={name:'',desc:'',start:10000,cfg:apfSnap(AP.cfg)};apfRender();setTimeout(function(){var x=$('#apb-name');if(x){x.focus();x.scrollIntoView({block:'center',behavior:'smooth'})}},30);return true}
  if(a==='ren'){APF.edit=a;APF.del=false;apfRender();setTimeout(function(){var x=$('#apf-name');if(x)x.focus()},30)}
  else if(a==='cancel'){APF.edit=false;APF.del=false;apfRender()}
  else if(a==='del'){APF.del=true;APF.edit=false;apfRender()}
  else if(a==='delok'&&act){APF.del=false;remove('approfiles',act.id).catch(function(){});APF.list=APF.list.filter(function(p){return p!==act});var nx=APF.list.find(function(p){return !apfDiff(p).length});apStWrite({profile:nx?nx.id:null});apAdd('','scan','Διαγράφηκε το προφίλ '+act.name+'.');apRender()}
  else if(a==='ok'){var nm=($('#apf-name')||{}).value,ds=($('#apf-desc')||{}).value||'';nm=String(nm||'').trim();if(!nm){toast('Γράψε ένα όνομα.');return true}
    if(APF.edit==='ren'&&act){var d=dmClean(act);d.name=nm;d.desc=ds;act.name=nm;act.desc=ds;put('approfiles',act.id,d).catch(function(){})}
    else{var id='p_'+now.toString(36),d2={name:nm,desc:ds,cfg:apfSnap(AP.cfg),start:apfStart(act),run:true,by:S.uid,at:now,builtin:false,hist:[]};APF.list.push(Object.assign({id:id},d2));put('approfiles',id,d2).catch(function(){});apStWrite({profile:id});apAdd('','scan','Νέο προφίλ: '+nm+'.')}
    APF.edit=false;apRender()}
  else if(a==='save'&&act){var d3=dmClean(act);d3.hist=(act.hist||[]).concat([{cfg:act.cfg,at:act.upAt||act.at}]).slice(-10);d3.cfg=apfSnap(AP.cfg);d3.upAt=now;d3.upBy=S.uid;Object.assign(act,d3);put('approfiles',act.id,d3).catch(function(){});apAdd('','scan','Ενημερώθηκε το προφίλ '+act.name+'.');apRender()}
  else if(a==='revert'&&act){apfUse(act.id)}
  return true}


/* 🪙 Τα 10 κορυφαία crypto (χωρίς stablecoins) με εικονίδιο, επιλογή ένα-ένα */
var TOP10=['BTC','ETH','XRP','BNB','SOL','DOGE','TRX','ADA','HYPE','LINK'],CNAME={BTC:'Bitcoin',ETH:'Ethereum',XRP:'XRP',BNB:'BNB',SOL:'Solana',DOGE:'Dogecoin',TRX:'TRON',ADA:'Cardano',HYPE:'Hyperliquid',LINK:'Chainlink',AVAX:'Avalanche',SUI:'Sui',LTC:'Litecoin',XMR:'Monero',ZEC:'Zcash'};
function apTop10(){return TOP10.slice();var L=TOP10.slice();try{if(CG.mk){var r=Object.keys(CGID).map(function(k){var m=CG.mk[CGID[k]];return {k:k,r:m&&(+m.marketCapRank||+m.market_cap_rank)}}).filter(function(x){return x.r>0}).sort(function(a,b){return a.r-b.r}).map(function(x){return x.k});if(r.length>=8)L=r.slice(0,10)}}catch(e){}return L}
function apCoinChips(sel,attr,ro){var top=apTop10(),extra=sel.filter(function(c){return top.indexOf(c)<0});
  return top.concat(extra).map(function(c,i){var on=sel.indexOf(c)>=0,m=CG&&CG.mk&&CGID[c]&&CG.mk[CGID[c]],ch=m&&+m.priceChangePercentage24h,px=m&&+m.currentPrice;
    return '<label class="apcc'+(on?' on':'')+'"><input type="checkbox" '+attr+'="'+c+'"'+(on?' checked':'')+(ro?' disabled':'')+'>'+symIcon(c,26)+'<span class="apcn"><b>'+c+(AP.noData&&AP.noData[c]?' <span class="apcw" title="Ο Αυτόματος δεν μπορεί ακόμα να το ελέγξει: '+esc(AP.noData[c])+'">⚠️</span>':'')+'</b><small>'+(AP.noData&&AP.noData[c]?esc(AP.noData[c]):(i<top.length?'#'+(i+1)+' · ':'')+esc((m&&m.name)||CNAME[c]||c))+'</small></span>'+(isFinite(px)&&px>0?'<span class="apcp"><span class="num">'+fmtPx(px)+'</span>'+(isFinite(ch)?'<small class="num '+cls(ch)+'">'+(ch>0?'+':'')+fmt(ch,2)+'%</small>':'')+'</span>':'')+'</label>'}).join('')}
function apCoinPick(){var el=$('#apCoinPick');if(!el||!AP.cfg)return;var sel=apCoins(),ro=!qCanSave();el.innerHTML=apCoinChips(sel,'data-apcoin',ro)+'<div class="apcoinf"><span class="muted">'+sel.length+' επιλεγμένα · κάθε νόμισμα προσθέτει χρόνο στη σάρωση</span>'+(ro?'':'<span class="row" style="gap:.3rem"><button type="button" class="btn small" data-apcall="top">Όλα τα 10</button><button type="button" class="btn small" data-apcall="top5">Τα 5 πρώτα</button></span>')+'</div>'}
/* 🧬 Δημιουργός προφίλ: όλες οι ρυθμίσεις των επαγγελματικών bots + βοηθός που προτείνει ρυθμίσεις από backtest, αγορά και αποτελέσματα της ομάδας */
var APB_PRE=[['cur','Τις τρέχουσες ρυθμίσεις'],['def','Προεπιλογές'],['p_cons','🛡️ Συντηρητικό'],['p_trend','🏄 Ακολουθία τάσης'],['p_range','↔️ Εύρος'],['p_aggr','⚡ Επιθετικό']];
function apbD(){return APF.draft||(APF.draft={name:'',desc:'',start:10000,cfg:apfSnap(AP.cfg)})}
function apbCoinsOf(c){return String(c.coins||'').toUpperCase().split(/[\s,;]+/).filter(Boolean)}
function apbHtml(){var D=apbD(),c=Object.assign({},AP_DEF,D.cfg),A=APF.adv||{},coins=apbCoinsOf(c),allC={};apTop10().concat(coins).forEach(function(x){allC[x]=1});
  var stat={};(A.rows||[]).forEach(function(r){var o=stat[r.id];if(!o||(r.avgUnseenR||-9)>(o.avgUnseenR||-9))stat[r.id]=r});
  var sel=c.strats==='pick'?String(c.pick||'').split(','):apStratIdsFor(c);
  var sw=function(k,l,h){return '<label class="apchk"><input type="checkbox" data-apb="'+k+'"'+(c[k]!==false?' checked':'')+'><span>'+l+'<small>'+h+'</small></span></label>'};
  var inp=function(k,l,h,w){return '<label class="f"'+(w?' style="max-width:'+w+'"':'')+'>'+l+'<input data-apb="'+k+'" inputmode="decimal" value="'+esc(c[k])+'">'+(h?'<small class="muted">'+h+'</small>':'')+'</label>'};
  var selF=function(k,l,opts){return '<label class="f">'+l+'<select data-apb="'+k+'">'+opts.map(function(o){return '<option value="'+o[0]+'"'+(String(c[k])===String(o[0])?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label>'};
  var rec=A.rec;
  return '<div class="apbuild" id="apBuild"><div class="apb-h"><b>➕ Νέο προφίλ</b><span class="muted">Όλες οι ρυθμίσεις που έχουν τα επαγγελματικά bots (3Commas, Cryptohopper, Freqtrade), προσαρμοσμένες στον Αυτόματο Καθηγητή.</span></div>'+
   '<div class="fields apf"><label class="f">Όνομα<input id="apb-name" data-apbm="name" maxlength="40" placeholder="π.χ. Τάση BTC/ETH με trailing" value="'+esc(D.name)+'"></label><label class="f">Σημείωση<input data-apbm="desc" maxlength="160" placeholder="Τι δοκιμάζει αυτό το προφίλ" value="'+esc(D.desc)+'"></label><label class="f">💰 Αρχικό κεφάλαιο<input data-apbm="start" inputmode="decimal" value="'+esc(D.start)+'"></label><label class="f">Ξεκίνα από<select data-apbm="base"><option value="">— διάλεξε —</option>'+APB_PRE.map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>'}).join('')+'</select></label></div>'+
   '<div class="apb-adv"><div class="apb-advh"><b>🧠 Βοηθός ρυθμίσεων</b><span class="row" style="gap:.35rem"><button type="button" class="btn small primary" data-apbx="scan"'+(A.busy?' disabled':'')+'>'+(A.busy?'⏳ '+esc(A.prog||'Ανάλυση…'):'📊 Ανάλυση από δεδομένα')+'</button>'+(rec?'<button type="button" class="btn small" data-apbx="apply">✅ Εφάρμοσε τις προτάσεις</button>':'')+'<button type="button" class="btn small" data-apbx="ask">🎓 Ρώτα τον Καθηγητή</button></span></div>'+
     (rec?'<ul class="apb-rec">'+rec.why.map(function(w){return '<li>'+w+'</li>'}).join('')+'</ul>':'<p class="muted" style="font-size:.8rem;margin:.3rem 0 0">Κάνει backtest σε '+Object.keys(allC).length+' νομίσματα και όλες τις στρατηγικές (κεριά 1 ώρας, έλεγχος σε κεριά που η στρατηγική δεν «είδε»), κοιτάζει τάση/εύρος και μεταβλητότητα της αγοράς και τα αποτελέσματα των προφίλ σας, και προτείνει νομίσματα, στρατηγικές, ρίσκο και έξοδο με εξήγηση.</p>')+(A.err?'<p class="neg" style="font-size:.8rem">'+esc(A.err)+'</p>':'')+'</div>'+
   '<fieldset class="apb-fs"><legend>1 · Αγορά</legend><div class="muted" style="font-size:.8rem">🪙 Νομίσματα: <b>'+esc(apCoins().join(', '))+'</b> · κοινά για όλα τα προφίλ, αλλάζουν από τα «Νομίσματα που ελέγχει» πιο κάτω.</div>'+((A.mk||[]).length?'<div class="muted" style="font-size:.76rem;margin-top:.3rem">Αγορά: '+(A.mk||[]).filter(function(m){return m.regime}).map(function(m){return m.coin+' '+(m.regime==='trend'?(m.trendDir>0?'↗':'↘'):m.regime==='range'?'↔':'~')}).join(' · ')+'</div>':'')+
     '<div class="fields apf">'+selF('tf','Timeframe',[['both','1 ώρα + 4 ώρες'],['1h','1 ώρα'],['4h','4 ώρες']])+selF('sess','Ώρες αγορών',[['smart','Έξυπνα: από το backtest'],['active','Μόνο Λονδίνο / Ν. Υόρκη'],['all','Όλες οι ώρες']])+'</div></fieldset>'+
   '<fieldset class="apb-fs"><legend>2 · Στρατηγικές</legend><div class="fields apf">'+selF('strats','Ποιες',[['all','Όλες'],['trend','Μόνο τάσης'],['range','Μόνο εύρους / grid'],['pick','Διαλέγω εγώ']])+inp('minEdge','Ελάχιστο μέσο R σε νέα δεδομένα','φίλτρο ποιότητας σήματος','16rem')+'</div>'+
     '<div class="apstr">'+BT.filter(function(x){return !BT_NOTGT[x.id]}).map(function(x){var st=stat[x.id];return '<label class="'+(st&&st.avgUnseenR>0?'good':st&&st.avgUnseenR<0?'bad':'')+'"><input type="checkbox" data-apbs="'+x.id+'"'+(sel.indexOf(x.id)>=0?' checked':'')+'>'+esc(x.t)+(st&&st.avgUnseenR!=null?' <span class="num">'+fR(st.avgUnseenR)+'</span> <span class="muted">'+st.coinsPositiveOnUnseen+'/'+st.coinsTested+'</span>':' <span class="muted">'+(FIT[x.id]==='trend'?'τάση':'εύρος')+'</span>')+'</label>'}).join('')+'</div>'+(A.rows?'<small class="muted">Δίπλα: μέσο R σε νέα δεδομένα · σε πόσα νομίσματα ήταν θετική.</small>':'')+'</fieldset>'+
   '<fieldset class="apb-fs"><legend>3 · Μέγεθος θέσης & ρίσκο</legend><div class="fields apf">'+selF('size','Μέγεθος θέσης',[['risk','Ρίσκο % του κεφαλαίου'],['margin','Σταθερό κεφάλαιο']])+(c.size==='risk'?inp('riskPct','Ρίσκο ανά συναλλαγή (%)','0,5–2% συνηθίζεται'):inp('margin','Κεφάλαιο / συναλλαγή'))+inp('lev','Μόχλευση (x)')+inp('maxOpen','Μέχρι ανοιχτές')+inp('maxDay','Μέχρι τη μέρα')+'</div></fieldset>'+
   '<fieldset class="apb-fs"><legend>4 · Έξοδος & κόστη</legend><div class="fields apf">'+selF('mgmt','Διαχείριση εξόδου',[['none','Σταθερό stop + στόχος'],['be','Break-even μετά από +1R'],['trail','Trailing stop μετά από +1R']])+inp('fee','Fee ανά πλευρά (%)')+inp('slip','Slippage (%)')+'</div></fieldset>'+
   '<fieldset class="apb-fs prot"><legend>5 · Προστασίες</legend>'+sw('pNews','Αποφυγή μεγάλων ανακοινώσεων','30′ πριν ως 1 ώρα μετά')+sw('pMtf','Συμφωνία με μεγαλύτερο timeframe','όχι κόντρα στην τάση 4h/1D')+sw('pBtc','Φίλτρο BTC','όχι κόντρα σε δυνατή τάση BTC')+sw('pVol','Φίλτρο μεταβλητότητας','όχι σε spikes ή νεκρή αγορά')+sw('pCool','Αναμονή μετά από απώλεια','6 ώρες ανά νόμισμα')+sw('pCorr','Όριο ίδιας κατεύθυνσης','έως 2 μαζί')+sw('pBrk','Διακόπτης ασφαλείας','παύση στα −3R/μέρα ή 3 σερί')+'</fieldset>'+
   '<div class="apb-sum muted"><b>Σύνοψη:</b> '+esc(apfDesc(c))+' · κεφάλαιο '+dmMoney(+D.start||10000,'')+'</div>'+
   '<div class="row" style="gap:.4rem;margin-top:.5rem"><button type="button" class="btn primary" data-apbx="save">💾 Δημιουργία προφίλ (● Τρέχει)</button><button type="button" class="btn" data-apf="cancel">Άκυρο</button></div></div>'}
function apStratIdsFor(c){var o=AP.rc;AP.rc={cfg:Object.assign({},AP_DEF,c)};try{return apStratIds()}finally{AP.rc=o}}
function apbChange(t){var D=apbD(),c=D.cfg,rr=false;
  if(t.hasAttribute('data-apbm')){var k=t.getAttribute('data-apbm');if(k==='base'){var v=t.value;if(!v)return;var src=v==='cur'?apfSnap(AP.cfg):v==='def'?apfSnap(AP_DEF):((apfPresets(AP.cfg).find(function(p){return p.id===v})||{}).cfg);if(src){D.cfg=Object.assign({},src,{coins:c.coins});if(!D.name&&v.indexOf('p_')===0)D.name=(APB_PRE.find(function(o){return o[0]===v})||[])[1]+' (νέο)'}rr=true}else D[k]=k==='start'?n(t.value):t.value}
  else if(t.hasAttribute('data-apbc')){var cs=[].slice.call($('#apBuild').querySelectorAll('[data-apbc]')).filter(function(x){return x.checked}).map(function(x){return x.getAttribute('data-apbc')});c.coins=cs.join(',');rr=true}
  else if(t.hasAttribute('data-apbs')){var ss=[].slice.call($('#apBuild').querySelectorAll('[data-apbs]')).filter(function(x){return x.checked}).map(function(x){return x.getAttribute('data-apbs')});c.strats='pick';c.pick=ss.join(',');rr=true}
  else if(t.hasAttribute('data-apb')){var k2=t.getAttribute('data-apb'),v2=t.type==='checkbox'?t.checked:t.value;if(['riskPct','margin','lev','maxOpen','maxDay','minEdge','fee','slip'].indexOf(k2)>=0){v2=n(v2);var lim={riskPct:[0.1,5],margin:[10,1e7],lev:[1,50],maxOpen:[1,10],maxDay:[1,30],minEdge:[0,1],fee:[0,1],slip:[0,1]}[k2];if(!isFinite(v2))v2=AP_DEF[k2];v2=Math.min(lim[1],Math.max(lim[0],v2))}c[k2]=v2;rr=t.tagName==='SELECT'||t.type==='checkbox'}
  if(rr)apfRender();else{var sm=$('#apBuild .apb-sum');if(sm)sm.innerHTML='<b>Σύνοψη:</b> '+esc(apfDesc(c))+' · κεφάλαιο '+dmMoney(+D.start||10000,'')}}
function apbClick(e){var b=e.target.closest('[data-apbx]');if(!b)return false;var a=b.getAttribute('data-apbx'),D=apbD();
  if(a==='scan')apbAnalyze();
  else if(a==='apply'&&APF.adv&&APF.adv.rec){Object.assign(D.cfg,APF.adv.rec.cfg);if(!D.name)D.name=APF.adv.rec.name;if(!D.desc)D.desc=APF.adv.rec.desc;toast('Οι προτάσεις μπήκαν στο προφίλ. Έλεγξέ τες και πάτα Δημιουργία.');apfRender()}
  else if(a==='ask'){var A=APF.adv||{},top=(A.rows||[]).slice(0,6).map(function(r){return r.name+' '+r.dir+' '+fR(r.avgUnseenR)+' ('+r.coinsPositiveOnUnseen+'/'+r.coinsTested+')'}).join('; ');
    QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();pAsk('Φτιάχνω νέο προφίλ για τον Αυτόματο Καθηγητή'+(D.name?' («'+D.name+'»)':'')+' με κεφάλαιο '+(+D.start||10000)+'. Ρυθμίσεις τώρα: '+apfDesc(D.cfg)+', νομίσματα '+(D.cfg.coins||'')+'.'+(top?' Από το backtest οι καλύτερες στρατηγικές σε νέα δεδομένα: '+top+'.':'')+' Με βάση τις στρατηγικές, τα δεδομένα της αγοράς τώρα και τα αποτελέσματα των προφίλ μας, τι θα άλλαζες (νομίσματα, στρατηγικές, ρίσκο, μόχλευση, έξοδο, προστασίες) και γιατί;',false)}
  else if(a==='save'){var nm=String(D.name||'').trim();if(!nm){toast('Γράψε όνομα για το προφίλ.');var x=$('#apb-name');if(x)x.focus();return true}
    var id='p_'+Date.now().toString(36),doc={name:nm,desc:String(D.desc||''),cfg:apfSnap(Object.assign({},AP_DEF,D.cfg)),start:+D.start>=100?+D.start:10000,run:true,by:S.uid,at:Date.now(),builtin:false,hist:[]};
    APF.list.push(Object.assign({id:id},doc));put('approfiles',id,doc).catch(function(e2){toast(writeErr(e2))});apAdd('','scan','Νέο προφίλ: '+nm+' ('+apfDesc(doc.cfg)+', κεφάλαιο '+doc.start+'). Τρέχει από την επόμενη σάρωση.');toast('Δημιουργήθηκε το '+nm+' · ● Τρέχει');APF.edit=false;APF.draft=null;apRender()}
  return true}
function apbAnalyze(){var A=APF.adv={busy:true,prog:'Ξεκινά…'},D=apbD(),cs={};apTop10().concat(apbCoinsOf(D.cfg)).forEach(function(x){cs[x]=1});var coins=Object.keys(cs).slice(0,12),out=[],i=0,fee=(+D.cfg.fee||0.1)+(+D.cfg.slip||0);apfRender();
  var step=function(){if(i>=coins.length){apbRecommend(out);return}var coin=coins[i++];A.prog='Backtest '+coin+' ('+i+'/'+coins.length+')';var bt=$('#apBuild [data-apbx=scan]');if(bt)bt.textContent='⏳ '+A.prog;
    deepBars(coin+'USDT','1h').then(function(r){var b=r.bars.filter(function(x){return !x.approx&&x.t+36e5<=Date.now()+60000});if(b.length<300){out.push({coin:coin,error:'μόνο '+b.length+' κεριά'});return}
      var ev=nowEval(b,{ids:BT.filter(function(x){return !BT_NOTGT[x.id]}).map(function(x){return x.id}),fee:fee,sym:coin+'USDT'}),g=ev.g;
      out.push({coin:coin,regime:g.kind,trendDir:g.dir,adx:g.adx,atrPct:g.atrPct,strategies:ev.cands.map(agStratRow)})}).catch(function(e){out.push({coin:coin,error:(e&&e.code)||'χωρίς δεδομένα'})}).then(function(){setTimeout(step,40)})};step()}
function apbRecommend(mk){var A=APF.adv,ok=mk.filter(function(m){return m.strategies}),why=[],cfg={};A.busy=false;A.mk=mk;
  if(!ok.length){A.err='Δεν βρέθηκαν αρκετά κεριά για ανάλυση. Δοκίμασε ξανά σε λίγο.';apfRender();return}
  var rows=agAgg(ok);A.rows=rows;
  var good=rows.filter(function(r){return r.avgUnseenR>0&&r.coinsPositiveOnUnseen>=2}),ids=[];good.forEach(function(r){if(ids.indexOf(r.id)<0)ids.push(r.id)});ids=ids.slice(0,6);
  if(ids.length>=2){cfg.strats='pick';cfg.pick=ids.join(',');why.push('<b>Στρατηγικές:</b> '+ids.map(function(id){var r=good.find(function(x){return x.id===id});return esc(r.name)+' <span class="num pos">'+fR(r.avgUnseenR)+'</span> <span class="muted">('+r.coinsPositiveOnUnseen+'/'+r.coinsTested+' νομίσματα)</span>'}).join(', ')+'. Κρατάω μόνο όσες κέρδισαν σε κεριά που δεν είχαν δει, σε 2+ νομίσματα.')}
  else{cfg.strats='all';why.push('<b>Στρατηγικές:</b> καμία δεν ξεχωρίζει καθαρά σε πολλά νομίσματα, οπότε αφήνω όλες και φιλτράρει το ελάχιστο πλεονέκτημα.')}
  var cScore=ok.map(function(m){var s=m.strategies.filter(function(x){return x.reliable&&x.testAvgR>0&&(cfg.strats!=='pick'||ids.indexOf(x.id)>=0)}).sort(function(a,b){return b.testAvgR-a.testAvgR})[0];return {coin:m.coin,s:s,m:m}}).filter(function(x){return x.s}).sort(function(a,b){return b.s.testAvgR-a.s.testAvgR});
  var cc=cScore.slice(0,5).map(function(x){return x.coin});if(cc.length<3)ok.forEach(function(m){if(cc.length<3&&cc.indexOf(m.coin)<0)cc.push(m.coin)});cfg.coins=cc.join(',');delete cfg.coins;
  why.push('<b>Πού δουλεύουν καλύτερα:</b> '+cc.join(', ')+(cScore.length?' · εκεί οι στρατηγικές έχουν αξιόπιστο θετικό αποτέλεσμα σε νέα δεδομένα'+(cScore[0]?' (καλύτερο '+cScore[0].coin+': '+esc(cScore[0].s.name)+' '+fR(cScore[0].s.testAvgR)+')':''):'')+'.');
  var tr=ok.filter(function(m){return m.regime==='trend'}).length,rg=ok.filter(function(m){return m.regime==='range'}).length;
  if(tr>rg){cfg.mgmt='trail';cfg.pMtf=true;why.push('<b>Έξοδος:</b> trailing stop μετά από +1R, γιατί '+tr+'/'+ok.length+' αγορές είναι σε τάση και αφήνει τα κέρδη να τρέξουν · με φίλτρο μεγαλύτερου timeframe.')}
  else if(rg>tr){cfg.mgmt='none';cfg.pMtf=false;why.push('<b>Έξοδος:</b> σταθερός στόχος, γιατί '+rg+'/'+ok.length+' αγορές είναι πλάγιες: στο εύρος το trailing κόβει νωρίς τα κέρδη.')}
  else{cfg.mgmt='be';why.push('<b>Έξοδος:</b> break-even μετά από +1R, γιατί η αγορά είναι μικτή.')}
  var atr=avg(ok.map(function(m){return m.atrPct}).filter(isFinite));cfg.size='risk';cfg.riskPct=atr>1.2?0.5:atr>0.7?1:1.5;cfg.lev=atr>1.2?5:10;
  why.push('<b>Ρίσκο:</b> '+fmt(cfg.riskPct,1)+'% ανά συναλλαγή με '+cfg.lev+'x, γιατί η μέση κίνηση ανά ώρα είναι '+fmt(atr,2)+'% ('+(atr>1.2?'υψηλή':atr>0.7?'κανονική':'χαμηλή')+' μεταβλητότητα).');
  var pos=good.map(function(r){return r.avgUnseenR}).sort(function(a,b){return a-b}),med=pos.length?pos[Math.floor(pos.length/2)]:0.2;cfg.minEdge=+Math.min(0.3,Math.max(0.05,med*0.5)).toFixed(2);
  why.push('<b>Ελάχιστο πλεονέκτημα:</b> '+fR(cfg.minEdge)+' (το μισό της διάμεσης καλής στρατηγικής), ώστε να περνούν μόνο τα πιο δυνατά σήματα.');
  cfg.maxOpen=Math.min(3,Math.max(1,cc.length-1));cfg.maxDay=cfg.maxOpen+2;cfg.pCorr=true;cfg.pBrk=true;cfg.pNews=true;cfg.sess='smart';
  why.push('<b>Όρια:</b> έως '+cfg.maxOpen+' ανοιχτές και '+cfg.maxDay+' τη μέρα, με όριο ίδιας κατεύθυνσης, γιατί τα crypto κινούνται μαζί · ώρες «έξυπνα» από το backtest κάθε στρατηγικής.');
  var pr=apfRows().filter(function(r){return r.st.n>=5}).sort(function(a,b){return b.st.avgR-a.st.avgR});if(pr.length)why.push('<b>Από τα προφίλ σας:</b> καλύτερο ως τώρα το '+esc(pr[0].name)+' ('+fR(pr[0].st.avgR)+' μέσο σε '+pr[0].st.n+' κλειστές)'+(pr.length>1?', χειρότερο το '+esc(pr[pr.length-1].name)+' ('+fR(pr[pr.length-1].st.avgR)+')':'')+'.');
  A.rec={cfg:cfg,why:why,name:'🧠 Από δεδομένα '+dateGr(lday(new Date())),desc:'Προτάθηκε από τον βοηθό με backtest σε '+ok.length+' νομίσματα.'};apfRender()}
/* 🧪 Εργαστήριο στρατηγικών: ο Καθηγητής εφευρίσκει νέες στρατηγικές από «τουβλάκια» κανόνων (γενετικός αλγόριθμος + ιδέες του Claude από ειδήσεις, αγορά και tips μεγάλων αναλυτών)
   και τις κρίνει τίμια: μαθαίνει στο 60% των κεριών, διαλέγει στο επόμενο 20%, και η τελική κρίση γίνεται μία φορά στο τελευταίο 20% που δεν είδε ποτέ */
var GB={
  ema_side:{t:'Τιμή {s} EMA {n}',p:{n:[20,50,200]},f:'trend'},
  ema_slope:{t:'EMA {n} με κλίση {dir}',p:{n:[20,50]},f:'trend'},
  ema_stack:{t:'EMA 20/50/200 στη σειρά {dir}',p:{},f:'trend'},
  ema_cross:{t:'Διασταύρωση EMA {f}',p:{f:['9/21','20/50']},f:'trend'},
  pull_ema:{t:'Επιστροφή στον EMA {n}',p:{n:[20,50]},f:'trend'},
  dist_ema:{t:'Όχι πάνω από {k} ATR μακριά από EMA 20',p:{k:[1,1.5,2]},f:'any'},
  rsi_low:{t:'RSI {cmp} {v}',p:{v:[30,35,40,45]},f:'range'},
  rsi_turn:{t:'RSI γυρίζει από {v}',p:{v:[30,35,40]},f:'range'},
  rsi_mom:{t:'RSI ορμή πάνω από {v}',p:{v:[50,55,60]},f:'trend'},
  rsi2_ext:{t:'RSI(2) ακραίο {v}',p:{v:[5,10,15]},f:'range'},
  adx_min:{t:'ADX > {v}',p:{v:[20,25,30]},f:'trend'},
  adx_max:{t:'ADX < {v}',p:{v:[15,20,25]},f:'range'},
  break_hh:{t:'Σπάσιμο {hl} {n} κεριών',p:{n:[10,20,55]},f:'trend'},
  sweep:{t:'Σάρωση ρευστότητας {n} κεριών',p:{n:[10,20,40]},f:'range'},
  bb_touch:{t:'Άγγιγμα Bollinger και επιστροφή',p:{},f:'range'},
  bb_break:{t:'Κλείσιμο έξω από Bollinger',p:{},f:'trend'},
  squeeze:{t:'Συμπίεση Bollinger (×{k})',p:{k:[1.1,1.3]},f:'any'},
  vol_spike:{t:'Όγκος > {k}× μέσος',p:{k:[1.5,2]},f:'any'},
  candle_dir:{t:'Κερί προς τη θέση',p:{},f:'any'},
  strong_body:{t:'Δυνατό σώμα κεριού (≥{k} του εύρους)',p:{k:[0.5,0.7]},f:'any'},
  engulf:{t:'Engulfing',p:{},f:'any'},
  inside_brk:{t:'Σπάσιμο inside bar',p:{},f:'any'},
  vwap_side:{t:'Τιμή {s} VWAP',p:{},f:'trend'},
  cloud_side:{t:'Τιμή {s} σύννεφο Ichimoku',p:{},f:'trend'},
  higher_low:{t:'{hlx} στη δομή',p:{},f:'trend'},
  atr_expand:{t:'Μεταβλητότητα ανεβαίνει (ATR ×{k})',p:{k:[1.2,1.5]},f:'any'},
  session:{t:'Ώρες: {s2}',p:{s:['active','lon','ny','asia']},f:'any'}
};
var GS={atr:{t:'Stop {k} ATR',p:{k:[1,1.5,2,2.5]}},swing:{t:'Stop κάτω από το άκρο {n} κεριών',p:{n:[5,10]}},ema:{t:'Stop πίσω από EMA {n}',p:{n:[20,50]}}};
var GTIPS=[
  {who:'Linda Raschke',tip:'«Holy Grail»: σε δυνατή τάση (ADX>30) αγόρασε την πρώτη επιστροφή στον EMA 20.',bl:[['adx_min',{v:30}],['pull_ema',{n:20}],['candle_dir',{}]],st:['swing',{n:5}],fit:'trend'},
  {who:'Larry Connors',tip:'RSI(2): σε μακροπρόθεσμη άνοδο (πάνω από EMA 200) αγόρασε την ακραία βραχυπρόθεσμη πτώση.',bl:[['ema_side',{n:200}],['rsi2_ext',{v:10}]],st:['atr',{k:2}],fit:'range'},
  {who:'Richard Dennis (Turtles)',tip:'Ακολούθησε το σπάσιμο του υψηλού 55 κεριών, κόψε γρήγορα τις ζημιές.',bl:[['break_hh',{n:55}]],st:['atr',{k:2}],fit:'trend'},
  {who:'Mark Minervini',tip:'VCP: τάση στη σειρά, συμπίεση μεταβλητότητας και σπάσιμο με όγκο.',bl:[['ema_stack',{}],['squeeze',{k:1.3}],['break_hh',{n:20}],['vol_spike',{k:1.5}]],st:['swing',{n:5}],fit:'trend'},
  {who:'Richard Wyckoff',tip:'Spring: σε πλάγια αγορά, ψεύτικο σπάσιμο του κάτω ορίου που κλείνει πίσω μέσα.',bl:[['adx_max',{v:25}],['sweep',{n:40}],['candle_dir',{}]],st:['swing',{n:5}],fit:'range'},
  {who:'Jesse Livermore',tip:'Pivotal point: μπες όταν η τιμή σπάει σημαντικό επίπεδο προς την κατεύθυνση της τάσης.',bl:[['ema_slope',{n:50}],['break_hh',{n:20}],['vol_spike',{k:1.5}]],st:['atr',{k:1.5}],fit:'trend'},
  {who:'Al Brooks',tip:'Second entry: σε τάση, μπες στο δεύτερο σήμα μετά από pullback, με δυνατό κερί.',bl:[['ema_side',{n:20}],['higher_low',{}],['strong_body',{k:0.5}]],st:['swing',{n:5}],fit:'trend'},
  {who:'ICT (Michael Huddleston)',tip:'Liquidity sweep στις ενεργές ώρες και αντιστροφή με engulfing.',bl:[['session',{s:'active'}],['sweep',{n:20}],['engulf',{}]],st:['swing',{n:5}],fit:'range'},
  {who:'John Bollinger',tip:'Σε αγορά χωρίς τάση, το άγγιγμα της μπάντας με υπερπώληση γυρίζει στον μέσο.',bl:[['adx_max',{v:20}],['bb_touch',{}],['rsi_low',{v:35}]],st:['atr',{k:1.5}],fit:'range'},
  {who:'Alexander Elder',tip:'Triple screen: τάση στο μεγάλο, pullback στον ταλαντωτή, είσοδος με κερί προς την τάση.',bl:[['ema_side',{n:50}],['ema_slope',{n:50}],['rsi_low',{v:45}],['candle_dir',{}]],st:['swing',{n:5}],fit:'trend'},
  {who:'Steve Nison',tip:'Τα candlestick μοτίβα (engulfing) μετρούν μόνο σε σημεία στήριξης, όχι στη μέση του πουθενά.',bl:[['bb_touch',{}],['engulf',{}]],st:['swing',{n:5}],fit:'range'},
  {who:'Ed Seykota',tip:'The trend is your friend: μένεις με την τάση και αφήνεις τα κέρδη να τρέχουν.',bl:[['ema_stack',{}],['ema_cross',{f:'9/21'}]],st:['atr',{k:2.5}],fit:'trend'}
];
var LAB={list:[],sub:null,busy:false,prog:'',log:[],ctl:null};
function gbOK(k,b,I,i,d,p){var x=b[i],c=x.c,a=I.atr[i];p=p||{};
  switch(k){
  case 'ema_side':var e=I['e'+p.n][i];return isFinite(e)&&(c-e)*d>0;
  case 'ema_slope':var e1=I['e'+p.n];return isFinite(e1[i-5])&&(e1[i]-e1[i-5])*d>0;
  case 'ema_stack':return isFinite(I.e200[i])&&(I.e20[i]-I.e50[i])*d>0&&(I.e50[i]-I.e200[i])*d>0;
  case 'ema_cross':var F=p.f==='9/21'?[I.e9,I.e21]:[I.e20,I.e50],q0=F[0][i-1]-F[1][i-1],q1=F[0][i]-F[1][i];return isFinite(q0)&&q0*d<=0&&q1*d>0;
  case 'pull_ema':var e2=I['e'+p.n][i];return isFinite(e2)&&(d>0?x.l<=e2&&c>e2:x.h>=e2&&c<e2);
  case 'dist_ema':return isFinite(I.e20[i])&&Math.abs(c-I.e20[i])<=p.k*a;
  case 'rsi_low':var r=I.rsi[i];return isFinite(r)&&(d>0?r<p.v:r>100-p.v);
  case 'rsi_turn':var r0=I.rsi[i-1],r1=I.rsi[i];return isFinite(r0)&&(d>0?r0<p.v&&r1>=p.v:r0>100-p.v&&r1<=100-p.v);
  case 'rsi_mom':var r2=I.rsi[i];return isFinite(r2)&&(d>0?r2>p.v:r2<100-p.v);
  case 'rsi2_ext':var r3=I.rsi2[i];return isFinite(r3)&&(d>0?r3<p.v:r3>100-p.v);
  case 'adx_min':return I.adx[i]>p.v;
  case 'adx_max':return I.adx[i]<p.v;
  case 'break_hh':return i>p.n&&(d>0?c>hhv(b,i-p.n,i-1):c<llv(b,i-p.n,i-1));
  case 'sweep':if(i<=p.n)return false;var lo=llv(b,i-p.n,i-1),hi=hhv(b,i-p.n,i-1);return d>0?x.l<lo&&c>lo:x.h>hi&&c<hi;
  case 'bb_touch':return isFinite(I.lo[i])&&(d>0?x.l<=I.lo[i]&&c>I.lo[i]:x.h>=I.up[i]&&c<I.up[i]);
  case 'bb_break':return isFinite(I.up[i])&&(d>0?c>I.up[i]:c<I.lo[i]);
  case 'squeeze':if(i<121||!isFinite(I.bw[i-1]))return false;var mn=Infinity;for(var j=i-120;j<i;j++)if(isFinite(I.bw[j])&&I.bw[j]<mn)mn=I.bw[j];return I.bw[i-1]<=mn*p.k;
  case 'vol_spike':return !I.hasV||x.v>p.k*I.vs[i];
  case 'candle_dir':return (c-x.o)*d>0;
  case 'strong_body':return (c-x.o)*d>0&&Math.abs(c-x.o)>=p.k*(x.h-x.l);
  case 'engulf':var pv=b[i-1];return (c-x.o)*d>0&&(pv.c-pv.o)*d<0&&Math.max(c,x.o)>=Math.max(pv.c,pv.o)&&Math.min(c,x.o)<=Math.min(pv.c,pv.o);
  case 'inside_brk':var mo=b[i-2],ins=b[i-1];return ins.h<mo.h&&ins.l>mo.l&&(d>0?c>mo.h:c<mo.l);
  case 'vwap_side':return I.int<864e5&&isFinite(I.vwap[i])&&(c-I.vwap[i])*d>0;
  case 'cloud_side':var tp=Math.max(I.sa[i],I.sb[i]),bt=Math.min(I.sa[i],I.sb[i]);return isFinite(tp)&&(d>0?c>tp:c<bt);
  case 'higher_low':var P=d>0?I.pl:I.ph,L2=[];for(var q=P.length-1;q>=0&&L2.length<2;q--)if(P[q]<=i-2)L2.push(P[q]);if(L2.length<2||i-L2[0]>15)return false;return d>0?b[L2[0]].l>b[L2[1]].l:b[L2[0]].h<b[L2[1]].h;
  case 'atr_expand':return isFinite(I.atr[i-10])&&a>p.k*I.atr[i-10];
  case 'session':var sid=sessOf(x.t);return p.s==='active'?(sid==='lon'||sid==='ovl'||sid==='ny'):p.s==='lon'?(sid==='lon'||sid==='ovl'):p.s==='ny'?(sid==='ny'||sid==='ovl'):sid===p.s;
  }return false}
function genSignal(sp,b,I,i,d){if(!sp||i<130)return null;if(sp.dir==='long'&&d<0||sp.dir==='short'&&d>0)return null;var a=I.atr[i];if(!isFinite(a)||!a)return null;
  for(var k=0;k<sp.bl.length;k++)if(!gbOK(sp.bl[k][0],b,I,i,d,sp.bl[k][1]))return null;
  var c=b[i].c,st=sp.st||['atr',{k:1.5}],s;
  if(st[0]==='swing')s=d>0?llv(b,i-st[1].n+1,i)-0.1*a:hhv(b,i-st[1].n+1,i)+0.1*a;else if(st[0]==='ema'){var e=I['e'+st[1].n][i];s=isFinite(e)?e-d*0.3*a:NaN}else s=c-d*(st[1].k||1.5)*a;
  if(!isFinite(s)||(d>0?s>=c:s<=c)||Math.abs(c-s)<0.5*a)s=c-d*Math.max(0.5,Math.min(3,(st[1]&&st[1].k)||1))*a;if(Math.abs(c-s)>4*a)s=c-d*4*a;return s}
function genFill(t,p){return t.replace(/\{(\w+)\}/g,function(m,k){return p[k]!=null?String(p[k]).replace('.',','):m})}
function genBlText(k,p,d){var g=GB[k];if(!g)return k;var t=g.t;p=Object.assign({},p);
  p.s=d<0?'κάτω από':'πάνω από';p.dir=d<0?'καθοδική':'ανοδική';p.hl=d<0?'χαμηλού':'υψηλού';p.cmp=d<0?'>':'<';if(d<0&&p.v!=null&&/rsi/.test(k))p.v=100-p.v;p.hlx=d<0?'Χαμηλότερο υψηλό':'Υψηλότερο χαμηλό';p.s2={active:'Λονδίνο / Νέα Υόρκη',lon:'Λονδίνο',ny:'Νέα Υόρκη',asia:'Ασία'}[p.s]||p.s;
  if(k==='ema_side'||k==='vwap_side'||k==='cloud_side')p.s=d<0?'κάτω από':'πάνω από';return genFill(t,p)}
function genRule(sp){var L=sp.bl.map(function(x){return genBlText(x[0],x[1],1)}),st=GS[sp.st[0]]?genFill(GS[sp.st[0]].t,sp.st[1]):'';return 'Long: '+L.join(' + ')+'. Stop: '+st+'. Short: το αντίστροφο.'+(sp.why?' · '+sp.why:'')}
function genName(sp){var short={ema_side:'EMA',ema_slope:'κλίση',ema_stack:'EMA σειρά',ema_cross:'διασταύρωση',pull_ema:'pullback',dist_ema:'κοντά στον EMA',rsi_low:'RSI',rsi_turn:'RSI γύρισμα',rsi_mom:'RSI ορμή',rsi2_ext:'RSI2',adx_min:'ADX↑',adx_max:'ADX↓',break_hh:'breakout',sweep:'sweep',bb_touch:'Bollinger',bb_break:'BB σπάσιμο',squeeze:'squeeze',vol_spike:'όγκος',candle_dir:'κερί',strong_body:'δυνατό κερί',engulf:'engulfing',inside_brk:'inside bar',vwap_side:'VWAP',cloud_side:'Ichimoku',higher_low:'δομή',atr_expand:'ATR↑',session:'ώρες'};
  return sp.bl.map(function(x){var p=x[1]||{},v=p.n||p.v||p.f||'';return (short[x[0]]||x[0])+(v&&x[0]!=='session'?' '+v:'')}).join(' + ')}
function genFit(sp){var t=0,r=0;sp.bl.forEach(function(x){var f=(GB[x[0]]||{}).f;if(f==='trend')t++;if(f==='range')r++});return t>r?'trend':r>t?'range':'trend'}
function genKey(sp){return sp.bl.map(function(x){return x[0]+JSON.stringify(x[1]||{})}).sort().join('|')+'#'+sp.st[0]+JSON.stringify(sp.st[1])}
function genSnap(k,p){var g=GB[k];if(!g)return null;var o={};Object.keys(g.p).forEach(function(q){var A=g.p[q],v=p&&p[q];if(typeof A[0]==='number'){v=+v;if(!isFinite(v))v=A[Math.floor(A.length/2)];o[q]=A.reduce(function(a,z){return Math.abs(z-v)<Math.abs(a-v)?z:a},A[0])}else o[q]=A.indexOf(v)>=0?v:A[0]});return o}
function genClean(sp){if(!sp||!Array.isArray(sp.bl))return null;var seen={},bl=[];sp.bl.forEach(function(x){var k=x&&(x[0]||x.k);if(!GB[k]||seen[k])return;seen[k]=1;bl.push([k,genSnap(k,x[1]||x.p||{})])});if(bl.length<1||bl.length>5)return null;
  var st=sp.st&&(sp.st[0]||sp.st.k),stp=sp.st&&(sp.st[1]||sp.st.p)||{};if(!GS[st])st='atr';var o={};Object.keys(GS[st].p).forEach(function(q){var A=GS[st].p[q],v=+stp[q];o[q]=isFinite(v)?A.reduce(function(a,z){return Math.abs(z-v)<Math.abs(a-v)?z:a},A[0]):A[0]});
  return {bl:bl,st:[st,o],dir:sp.dir==='long'||sp.dir==='short'?sp.dir:'both',X:[1.5,2,2.5,3].indexOf(+sp.X)>=0?+sp.X:2}}
/* γρήγορο backtest για το εργαστήριο */
function genBt(sp,D,X,f0,f1,fee){var out={n:0,sum:0,w:0,gw:0,gl:0,rs:[],per:{}};
  D.forEach(function(dd){var b=dd.b,I=dd.I,N=b.length,a=Math.max(130,Math.floor(N*f0)),z=Math.floor(N*f1),pos=null,pc=dd.per=dd.per||{},cn=0,cs=0;
    for(var i=a;i<z;i++){var x=b[i];
      if(pos){var d=pos.d,ex=null;if(d>0){if(x.o<=pos.s)ex=x.o;else if(x.l<=pos.s)ex=pos.s;else if(x.o>=pos.tg)ex=x.o;else if(x.h>=pos.tg)ex=pos.tg}else{if(x.o>=pos.s)ex=x.o;else if(x.h>=pos.s)ex=pos.s;else if(x.o<=pos.tg)ex=x.o;else if(x.l<=pos.tg)ex=pos.tg}
        if(ex==null&&i-pos.i>=60)ex=x.c;if(ex!=null){var rk=Math.abs(pos.e-pos.s),r=(ex-pos.e)*d/rk-(pos.e+ex)*fee/100/rk;out.n++;out.sum+=r;out.rs.push(r);if(r>0){out.w++;out.gw+=r}else out.gl-=r;cn++;cs+=r;pos=null}continue}
      for(var q=0;q<2;q++){var dv=q?-1:1,s=genSignal(sp,b,I,i,dv);if(s!=null&&isFinite(s)){pos={d:dv,e:x.c,s:s,tg:x.c+dv*X*Math.abs(x.c-s),i:i};break}}}
    out.per[dd.coin]={n:cn,r:cs}});
  out.avg=out.n?out.sum/out.n:NaN;var v=0;out.rs.forEach(function(r){v+=(r-out.avg)*(r-out.avg)});out.se=out.n>1?Math.sqrt(v/(out.n-1))/Math.sqrt(out.n):Infinity;out.pf=out.gl>0?out.gw/out.gl:(out.gw>0?9:NaN);out.wr=out.n?out.w/out.n:NaN;delete out.rs;
  out.pos=Object.keys(out.per).filter(function(k){return out.per[k].n>=2&&out.per[k].r>0}).length;out.coins=Object.keys(out.per).filter(function(k){return out.per[k].n>=2}).length;return out}
function genRand(a){return a[Math.floor(Math.random()*a.length)]}
function genRandBl(ex){var ks=Object.keys(GB).filter(function(k){return !ex[k]}),k=genRand(ks),p={};Object.keys(GB[k].p).forEach(function(q){p[q]=genRand(GB[k].p[q])});return [k,p]}
function genRandSp(){var n=2+Math.floor(Math.random()*3),bl=[],ex={};for(var i=0;i<n;i++){var x=genRandBl(ex);ex[x[0]]=1;bl.push(x)}var sk=genRand(Object.keys(GS)),sp={};Object.keys(GS[sk].p).forEach(function(q){sp[q]=genRand(GS[sk].p[q])});return {bl:bl,st:[sk,sp],dir:'both',X:genRand([1.5,2,2.5,3])}}
function genMut(s0){var sp=JSON.parse(JSON.stringify(s0)),r=Math.random(),ex={};sp.bl.forEach(function(x){ex[x[0]]=1});
  if(r<0.25&&sp.bl.length<5){var nb=genRandBl(ex);sp.bl.push(nb)}else if(r<0.4&&sp.bl.length>2){sp.bl.splice(Math.floor(Math.random()*sp.bl.length),1)}
  else if(r<0.6){var i=Math.floor(Math.random()*sp.bl.length);delete ex[sp.bl[i][0]];sp.bl[i]=genRandBl(ex)}
  else if(r<0.8){var j=Math.floor(Math.random()*sp.bl.length),k=sp.bl[j][0],ps=Object.keys(GB[k].p);if(ps.length){var q=genRand(ps);sp.bl[j][1][q]=genRand(GB[k].p[q])}else sp.X=genRand([1.5,2,2.5,3])}
  else if(r<0.9){var sk=genRand(Object.keys(GS)),o={};Object.keys(GS[sk].p).forEach(function(q){o[q]=genRand(GS[sk].p[q])});sp.st=[sk,o]}else sp.X=genRand([1.5,2,2.5,3]);return sp}
function genCross(a,b){var ex={},bl=[];a.bl.slice(0,Math.ceil(a.bl.length/2)).concat(b.bl.slice(Math.floor(b.bl.length/2))).forEach(function(x){if(!ex[x[0]]&&bl.length<5){ex[x[0]]=1;bl.push(JSON.parse(JSON.stringify(x)))}});if(bl.length<2)return genMut(a);return {bl:bl,st:JSON.parse(JSON.stringify(Math.random()<0.5?a.st:b.st)),dir:'both',X:Math.random()<0.5?a.X:b.X}}
function genFitness(r,sp){if(r.n<25)return -9+r.n/100;return r.avg-r.se-0.015*sp.bl.length+(r.coins?0.1*(r.pos/r.coins-0.5):0)}
function tipSpec(t){return genClean({bl:t.bl,st:t.st,dir:'both',X:2})}
/* δεδομένα: κεριά 1h για τα νομίσματα */
function labData(prog){var cs={};['BTC','ETH','SOL','XRP','BNB','DOGE'].concat(AP.cfg?apCoins():[]).forEach(function(c){cs[c]=1});var coins=Object.keys(cs).slice(0,8),D=[],i=0;
  return new Promise(function(res){var step=function(){if(i>=coins.length){res(D);return}var c=coins[i++];prog('Κεριά '+c+' ('+i+'/'+coins.length+')…');
    deepBars(c+'USDT','1h').then(function(r){var b=r.bars.filter(function(x){return !x.approx&&x.t+36e5<=Date.now()+60000});if(b.length>=600)D.push({coin:c,b:b,I:btInd0(b)})}).catch(function(){}).then(function(){setTimeout(step,30)})};step()})}
function labLog(m){LAB.log.unshift({t:Date.now(),m:m});LAB.log=LAB.log.slice(0,30);labRender()}
function labProg(m){LAB.prog=m;var el=$('#labStat');if(el)el.innerHTML=LAB.busy?'<span class="pill acc apdot"><i></i>'+esc(m)+'</span>':''}
/* τελική κρίση: B (επιλογή) και C (τελικό τεστ, μία φορά) */
function labJudge(sp,D,fee){var A=genBt(sp,D,sp.X,0,0.6,fee),B=genBt(sp,D,sp.X,0.6,0.8,fee),C=genBt(sp,D,sp.X,0.8,1,fee),ALL=genBt(sp,D,sp.X,0,1,fee);
  var passB=B.n>=8&&B.avg>0,passC=C.n>=6&&C.avg>0&&C.pos>=Math.ceil(C.coins/2),pass=A.n>=25&&A.avg>0&&passB&&passC;
  var sm=function(r){return {n:r.n,avgR:isFinite(r.avg)?+r.avg.toFixed(3):null,wr:isFinite(r.wr)?+r.wr.toFixed(3):null,pf:isFinite(r.pf)?+r.pf.toFixed(2):null,pos:r.pos,coins:r.coins}};
  var per={};Object.keys(ALL.per).forEach(function(k){per[k]={n:ALL.per[k].n,r:+ALL.per[k].r.toFixed(2)}});
  return {pass:pass,A:sm(A),B:sm(B),C:sm(C),ALL:sm(ALL),per:per}}
function labSave(sp,origin,meta,res){var key=genKey(sp);if(LAB.list.some(function(g){return g.key===key})){return null}
  var id='g_'+Date.now().toString(36)+Math.floor(Math.random()*1e3).toString(36),doc={key:key,name:(meta.name||genName(sp)).slice(0,60),spec:sp,fit:meta.fit||genFit(sp),origin:origin,why:String(meta.why||'').slice(0,400),src:String(meta.src||'').slice(0,120),res:res,status:res.pass?'live':'fail',at:Date.now(),by:S.uid||'me'};
  LAB.list.unshift(Object.assign({id:id},doc));genRegister();if(S.db&&qCanSave())put('genstrats',id,doc).catch(function(){});return id}
function genRegister(){/* οι ενεργές μπαίνουν στις στρατηγικές του Αυτόματου (BT), με κανόνα και «ταίριασμα» αγοράς */
  for(var i=BT.length-1;i>=0;i--)if(BT[i].gen)BT.splice(i,1);
  LAB.list.filter(function(g){return g.status==='live'&&g.spec}).sort(function(a,b){return ((b.res&&b.res.C&&b.res.C.avgR)||0)-((a.res&&a.res.C&&a.res.C.avgR)||0)}).slice(0,8).forEach(function(g){BT.push({id:g.id,mid:'gen:'+g.id,t:'🧪 '+g.name,rule:genRule(g.spec),gen:true});FIT[g.id]=g.fit||'trend';GENSP[g.id]=g.spec})}
var GENSP={};
function labRunGA(auto){if(LAB.busy)return;if(!qCanSave()&&!auto){toast('Χρειάζεσαι δικαίωμα Editor.');return}LAB.busy=true;LAB.ctl={stop:false};var t0=Date.now(),fee=0.15;labRender();labProg('Μαζεύω κεριά…');
  labData(labProg).then(function(D){if(D.length<3)throw {code:'no_data',m:'Βρέθηκαν κεριά μόνο για '+D.length+' νομίσματα'};
    var pop=GTIPS.map(tipSpec).filter(Boolean);LAB.list.filter(function(g){return g.status==='live'}).slice(0,6).forEach(function(g){pop.push(JSON.parse(JSON.stringify(g.spec)))});while(pop.length<36)pop.push(genRandSp());
    var gen=0,G=auto?8:12,seen={},scored=[],idx=0;
    return new Promise(function(res){
      var evalOne=function(){if(LAB.ctl.stop){res(scored);return}
        if(idx>=pop.length){gen++;scored.sort(function(a,b){return b.f-a.f});var elite=scored.slice(0,10);labProg('Γενιά '+gen+'/'+G+' · καλύτερο '+(elite[0]?fR(elite[0].r.avg)+' σε '+elite[0].r.n:'–'));
          if(gen>=G||Date.now()-t0>(auto?40000:70000)){res(scored);return}
          pop=[];while(pop.length<30){var r=Math.random(),a=genRand(elite).sp;pop.push(r<0.55?genMut(a):r<0.85?genCross(a,genRand(elite).sp):genRandSp())}idx=0;setTimeout(evalOne,0);return}
        var sp=pop[idx++],k=genKey(sp);if(!seen[k]){seen[k]=1;var r0=genBt(sp,D,sp.X,0,0.6,fee);scored.push({sp:sp,r:r0,f:genFitness(r0,sp)})}
        if(idx%3===0)setTimeout(evalOne,0);else evalOne()};evalOne()}).then(function(sc){
      sc.sort(function(a,b){return b.f-a.f});var top=[],keys={};var ks=function(sp){return sp.bl.map(function(b){return b[0]})},sim=function(a,b){var A=ks(a),B=ks(b),c=A.filter(function(k){return B.indexOf(k)>=0}).length;return c/Math.max(A.length,B.length)};LAB.list.forEach(function(g){if(g.spec)keys['__'+g.id]=g.spec});
      sc.forEach(function(x){if(top.length<8&&x.r.n>=25&&x.r.avg>0){var dup=top.some(function(t){return sim(t.sp,x.sp)>=0.6})||Object.keys(keys).some(function(k){return k.indexOf('__')===0&&sim(keys[k],x.sp)>=0.75});if(!dup)top.push(x)}});
      var made=0,passed=0;top.forEach(function(x){var res=labJudge(x.sp,D,fee);if(!res.B||!(res.B.avgR>0))return;var tip=GTIPS.find(function(t){var s2=tipSpec(t);return s2&&genKey(s2)===genKey(x.sp)});
        var id=labSave(x.sp,'ga',{why:tip?tip.tip:'Βρέθηκε από τον γενετικό αλγόριθμο ανάμεσα σε '+Object.keys(seen).length+' συνδυασμούς.',src:tip?tip.who:''},res);if(id){made++;if(res.pass)passed++}});
      LAB.lastGA=Date.now();try{localStorage.setItem('tj-lab-ga',String(LAB.lastGA))}catch(e){}
      labLog('🧬 Δοκιμάστηκαν '+Object.keys(seen).length+' συνδυασμοί σε '+D.length+' νομίσματα ('+Math.round((Date.now()-t0)/1000)+'″). Νέες υποψήφιες: '+made+', πέρασαν το τελικό τεστ: '+passed+'.');
      if(passed)toast('🧪 Ο Καθηγητής εφεύρε '+passed+' νέα/ες στρατηγική/ές που πέρασαν το τεστ σε κεριά που δεν είδε.');else if(!auto)toast('🧪 Καμία νέα δεν πέρασε το τελικό τεστ αυτή τη φορά. Αυτό είναι καλό σημάδι αυστηρότητας.')})})
  .catch(function(e){labLog('⚠️ '+((e&&e.m)||(e&&e.code)||'σφάλμα'))}).then(function(){LAB.busy=false;labProg('');labRender()})}
function labPrompt(){var mk=(AP.watch||[]).slice(0,10).map(function(w){return w.coin+' '+w.tf+': '+w.mk}).join('; ');
  var news=(NW.items||[]).slice(0,10).map(function(a){return '- '+String(a.title).slice(0,140)}).join('\n'),cal=(NW.cal||[]).slice(0,6).map(function(c){return '- '+(c.t||c.title||'')+' '+(c.when||c.date||'')}).join('\n');
  var have=LAB.list.slice(0,12).map(function(g){return '- '+g.name+' ('+g.status+', τελικό τεστ '+(g.res&&g.res.C?g.res.C.avgR:'?')+'R)'}).join('\n');
  var perf=BT.filter(function(x){return !x.gen}).map(function(x){return x.id+'='+x.t}).join(', ');
  var blocks=Object.keys(GB).map(function(k){return k+(Object.keys(GB[k].p).length?' '+JSON.stringify(GB[k].p):'')+' : '+genBlText(k,genSnap(k,{}),1)}).join('\n');
  return 'Είσαι ερευνητής ποσοτικών στρατηγικών για crypto (κεριά 1 ώρας). Σχεδίασε 5 ΝΕΕΣ στρατηγικές εισόδου, διαφορετικές από τις κλασικές που ήδη έχουμε ('+perf+'), συνδυάζοντας: την τωρινή αγορά, τις ειδήσεις και το ημερολόγιο, ιστορικές ιδιότητες των crypto και tips γνωστών αναλυτών/traders (π.χ. Raschke, Connors, Minervini, Wyckoff, Livermore, Brooks, Elder, Seykota, Nison, Bollinger, ICT). Κάθε στρατηγική πρέπει να εκφράζεται ΜΟΝΟ με τα παρακάτω τουβλάκια (γράφονται για long· για short καθρεφτίζονται αυτόματα). Χρησιμοποίησε 2–5 τουβλάκια, μόνο τις επιτρεπτές τιμές παραμέτρων. Μην επαναλαμβάνεις ιδέες που ήδη δοκιμάστηκαν.\n\nΤΟΥΒΛΑΚΙΑ:\n'+blocks+'\n\nSTOP: atr {k:[1,1.5,2,2.5]} | swing {n:[5,10]} | ema {n:[20,50]}\nΣΤΟΧΟΣ X (R): 1.5, 2, 2.5 ή 3\n\nΑΓΟΡΑ ΤΩΡΑ: '+(mk||'άγνωστη')+'\nΕΙΔΗΣΕΙΣ:\n'+(news||'-')+'\nΗΜΕΡΟΛΟΓΙΟ:\n'+(cal||'-')+'\nΗΔΗ ΔΟΚΙΜΑΣΜΕΝΕΣ:\n'+(have||'-')+
   '\n\nΑπάντησε JSON: {"ideas":[{"name":"σύντομο ελληνικό όνομα","why":"1-2 προτάσεις στα ελληνικά: τι εκμεταλλεύεται και γιατί τώρα","src":"από ποιον αναλυτή/ιδέα εμπνεύστηκε","fit":"trend|range","dir":"both|long|short","bl":[["block_key",{"param":τιμή}]],"st":["atr",{"k":1.5}],"X":2}]}'}
function labRunAI(){if(LAB.busy)return;if(!S.sample){toast('Χρειάζεται το Claude μέσα στη σελίδα, που δεν είναι διαθέσιμο εδώ.');return}if(!qCanSave()){toast('Χρειάζεσαι δικαίωμα Editor.');return}
  LAB.busy=true;LAB.ctl={stop:false};labRender();labProg('Ο Claude διαβάζει αγορά, ειδήσεις και tips αναλυτών…');var fee=0.15,ideas;
  S.sample.json(labPrompt(),{modelTier:'default',cache:false}).then(function(r){ideas=(r&&r.ideas||[]).slice(0,6);if(!ideas.length)throw {code:'invalid_json'};labProg('Δοκιμάζω '+ideas.length+' ιδέες σε πραγματικά κεριά…');return labData(labProg)})
  .then(function(D){if(D.length<3)throw {code:'no_data',m:'Λίγα κεριά'};var made=0,passed=0,bad=0;
    ideas.forEach(function(it){var sp=genClean(it);if(!sp){bad++;return}var res=labJudge(sp,D,fee);var id=labSave(sp,'ai',{name:it.name,why:it.why,src:it.src,fit:it.fit==='range'?'range':it.fit==='trend'?'trend':genFit(sp)},res);if(id){made++;if(res.pass)passed++}});
    labLog('🎓 Ο Claude πρότεινε '+ideas.length+' ιδέες'+(bad?' ('+bad+' άκυρες)':'')+'. Δοκιμάστηκαν '+made+', πέρασαν το τελικό τεστ: '+passed+'.');toast(passed?'🧪 '+passed+' ιδέα/ες του Claude πέρασαν το τεστ και μπήκαν στον Αυτόματο.':'🧪 Οι ιδέες δοκιμάστηκαν. Καμία δεν πέρασε το τελικό τεστ.')})
  .catch(function(e){var c=e&&e.code;labLog('⚠️ '+(c==='not_granted'?'Χρειάζεται να επιτρέψεις στη σελίδα να ρωτά τον Claude.':c==='rate_limited'?'Όριο χρήσης του Claude.':c==='invalid_json'?'Ο Claude δεν έδωσε σωστές ιδέες.':(e&&e.m)||c||'σφάλμα'))}).then(function(){LAB.busy=false;labProg('');labRender()})}
function labLive(id){var L=(S.demo||[]).filter(function(t){return t.src==='auto'&&t.auto&&t.auto.strat===id}),cl=L.filter(dmCounts);return {n:cl.length,open:L.length-cl.length,r:sum(cl.map(function(t){return n(t.r)}))}}
function labRender(){var el=$('#labBody');if(!el)return;var ro=!qCanSave(),L=LAB.list.slice().sort(function(a,b){return (a.status==='live'?0:a.status==='off'?1:2)-(b.status==='live'?0:b.status==='off'?1:2)||(b.at-a.at)});
  var bt=$('#labGA'),ba=$('#labAI'),bs=$('#labStop');if(bt)bt.disabled=LAB.busy||ro;if(ba){ba.disabled=LAB.busy||ro;ba.hidden=!S.sample}if(bs)bs.hidden=!LAB.busy;labProg(LAB.prog);
  var cell=function(r){return r&&r.n?'<b class="num '+cls(r.avgR)+'">'+fR(r.avgR)+'</b><small class="muted">'+r.n+' συν.</small>':'<span class="muted">–</span>'};
  el.innerHTML=(LAB.log.length?'<ul class="lablog">'+LAB.log.slice(0,4).map(function(x){return '<li><span class="muted">'+pad2(new Date(x.t).getHours())+':'+pad2(new Date(x.t).getMinutes())+'</span> '+esc(x.m)+'</li>'}).join('')+'</ul>':'')+
   (L.length?'<div class="labgrid">'+L.slice(0,80).map(function(g){var r=g.res||{},lv=labLive(g.id),st=g.status;
     return '<div class="labc '+st+'"><div class="labh"><b>'+(g.origin==='ai'?'🎓':'🧬')+' '+esc(g.name)+'</b>'+(st==='live'?'<button type="button" class="pill gain apdot labt" data-labt="'+g.id+'"'+(ro?' disabled':'')+'><i></i>Στον Αυτόματο</button>':st==='off'?'<button type="button" class="pill labt" data-labt="'+g.id+'"'+(ro?' disabled':'')+'>⏸ Σβηστή</button>':'<span class="pill loss">✗ Απορρίφθηκε</span>')+'</div>'+
       '<div class="labr muted">'+esc(genRule(g.spec||{bl:[],st:['atr',{k:1.5}]}))+'</div>'+(g.src?'<div class="labsrc">💡 '+esc(g.src)+(g.why?' · '+esc(g.why):'')+'</div>':g.why?'<div class="labsrc">'+esc(g.why)+'</div>':'')+
       '<div class="labk"><div><span>Μάθηση 60%</span>'+cell(r.A)+'</div><div><span>Επιλογή 20%</span>'+cell(r.B)+'</div><div><span>Τελικό τεστ 20%</span>'+cell(r.C)+'</div><div><span>Ζωντανά (demo)</span>'+(lv.n||lv.open?'<b class="num '+cls(lv.r)+'">'+fR(lv.r)+'</b><small class="muted">'+lv.n+' κλειστ.'+(lv.open?' · '+lv.open+' ανοιχτ.':'')+'</small>':'<span class="muted">ακόμα –</span>')+'</div></div>'+
       '<div class="labf"><span class="muted">'+(g.fit==='range'?'↔ εύρος':'↗ τάση')+' · στόχος '+fmt(g.spec&&g.spec.X||2,1)+'R · '+(r.ALL?r.ALL.pos+'/'+r.ALL.coins+' νομίσματα θετικά':'')+' · '+dateGr(lday(new Date(g.at)))+'</span>'+(ro?'':'<button type="button" class="linkbtn" data-labdel="'+g.id+'">Διαγραφή</button>')+'</div></div>'}).join('')+'</div>'+(L.length>6?'<div class="muted" style="font-size:.74rem;margin-top:.3rem">'+L.length+' στρατηγικές · κύλισε μέσα στο πλαίσιο για τις υπόλοιπες</div>':''):'<div class="empty">Ακόμα καμία δική του στρατηγική. Πάτα «🧬 Εφεύρε νέες» ή «🎓 Ιδέες από αναλυτές & ειδήσεις».</div>')}
function labSub(){if(!S.db||LAB.sub)return;try{LAB.sub=S.db.collection('genstrats').onSnapshot(function(sn){LAB.list=sn.docs.map(function(d){return Object.assign({id:d.id},d.data())});genRegister();labRender()},function(){})}catch(e){}}
function labInit(){var c=$('#labCard');if(!c||c.dataset.b)return;c.dataset.b='1';try{LAB.lastGA=+localStorage.getItem('tj-lab-ga')||0}catch(e){}labSub();labRender();
  c.addEventListener('click',function(e){var t=e.target;if(t.closest('#labGA')){labRunGA(false);return}if(t.closest('#labAI')){labRunAI();return}if(t.closest('#labStop')){if(LAB.ctl)LAB.ctl.stop=true;return}if(t.closest('#labMore')){LAB.more=!LAB.more;labRender();return}
    var tg=t.closest('[data-labt]');if(tg&&qCanSave()){var g=LAB.list.find(function(x){return x.id===tg.getAttribute('data-labt')});if(g){g.status=g.status==='live'?'off':'live';var d=dmClean(g);put('genstrats',g.id,d).catch(function(){});genRegister();labRender();toast(g.name+(g.status==='live'?': μπήκε στον Αυτόματο':': βγήκε από τον Αυτόματο'))}return}
    var dl=t.closest('[data-labdel]');if(dl&&qCanSave()){var id=dl.getAttribute('data-labdel');LAB.list=LAB.list.filter(function(x){return x.id!==id});remove('genstrats',id).catch(function(){});genRegister();labRender()}})}
/* μόνος του: μία φορά τη μέρα, μετά από σάρωση του Αυτόματου, τρέχει τον γενετικό αλγόριθμο */
function labAuto(){if(LAB.busy||!qCanSave()||!AP.cfg||!AP.cfg.on)return;if(Date.now()-(LAB.lastGA||0)<20*36e5)return;var day=AP.state&&AP.state.labAt;if(day&&Date.now()-day<20*36e5)return;apStWrite({labAt:Date.now()});labLog('🤖 Αυτόματη ημερήσια έρευνα για νέες στρατηγικές…');labRunGA(true)}
/* 🧠 Αναλύσεις στρατηγικών: όλες οι στρατηγικές (κλασικές + του Εργαστηρίου) με backtest σε πολλά νομίσματα, τι έκανε ο Αυτόματος Καθηγητής και τι έκανε η ομάδα, σε 3D γραφικά */
var SA={map:null,busy:false,prog:'',src:'bt',sort:'score',loaded:false};
function saAuto(){return (S.demo||[]).filter(function(t){return t.src==='auto'})}
function saByStrat(){var o={};saAuto().forEach(function(t){var id=t.auto&&t.auto.strat;if(!id)return;var a=o[id]=o[id]||{n:0,w:0,r:0,open:0,gw:0,gl:0};if(!dmClosed(t)){a.open++;return}if(!dmCounts(t))return;var r=n(t.r);a.n++;a.r+=r;if(r>0){a.w++;a.gw+=r}else a.gl-=r});return o}
function saTeam(){var o={};(S.trades||[]).forEach(function(t){if(t.status!=='closed'||!isFinite(n(t.r)))return;var s=S.strategies.find(function(x){return x.id===t.strategyId}),mid=s?manualIdFor(s):null;if(!mid)return;var a=o[mid]=o[mid]||{n:0,w:0,r:0};a.n++;a.r+=n(t.r);if(n(t.r)>0)a.w++});return o}
function saMid(id){var b=BT.find(function(x){return x.id===id});return b&&b.mid&&b.mid.indexOf('gen:')!==0?b.mid:null}
function saRows(){var M=SA.map&&SA.map.m||{},A=saByStrat(),T=saTeam();
  return BT.map(function(b){var m=M[b.id]||{},cs=Object.keys(m),tn=0,ts=0,pos=0;cs.forEach(function(c){var x=m[c];if(x&&x[1]>0){tn+=x[1];ts+=x[0]*x[1];if(x[1]>=3&&x[0]>0)pos++}});
    var bt=tn?ts/tn:NaN,au=A[b.id]||{n:0,w:0,r:0,open:0},tm=b.mid?T[b.mid]:null,best=cs.filter(function(c){return m[c][1]>=3&&m[c][0]>0}).sort(function(a,z){return m[z][0]-m[a][0]}).slice(0,2);
    var sc=(isFinite(bt)?Math.max(-1,Math.min(1,bt))*2:0)+(au.n>=3?Math.max(-1,Math.min(1,au.r/au.n)):0)+(tm&&tm.n>=3?Math.max(-1,Math.min(1,tm.r/tm.n))*0.5:0);
    return {id:b.id,b:b,fit:FIT[b.id]||'trend',gen:!!b.gen,bt:bt,btN:tn,pos:pos,coins:cs.length,best:best,au:au,auAvg:au.n?au.r/au.n:NaN,tm:tm,tmAvg:tm&&tm.n?tm.r/tm.n:NaN,sc:sc}})}
/* ---- 3D στοιχεία ---- */
function pie3d(parts,size){var tot=sum(parts.map(function(p){return p.v}));if(!(tot>0))return '';var cx=90,cy=52,rx=78,ry=40,D=16,a=-Math.PI/2,h='<svg class="pie3" viewBox="0 0 180 120" aria-hidden="true">';
  var sl=parts.filter(function(p){return p.v>0}).map(function(p){var a0=a,a1=a+p.v/tot*Math.PI*2;a=a1;return {p:p,a0:a0,a1:a1}});
  var path=function(s,dy){var P=function(t){return [cx+rx*Math.cos(t),cy+ry*Math.sin(t)+dy]},A=P(s.a0),B=P(s.a1),lg=s.a1-s.a0>Math.PI?1:0;if(sl.length===1)return 'M'+(cx-rx)+' '+(cy+dy)+' a'+rx+' '+ry+' 0 1 0 '+(2*rx)+' 0 a'+rx+' '+ry+' 0 1 0 '+(-2*rx)+' 0';return 'M'+cx+' '+(cy+dy)+' L'+A[0].toFixed(1)+' '+A[1].toFixed(1)+' A'+rx+' '+ry+' 0 '+lg+' 1 '+B[0].toFixed(1)+' '+B[1].toFixed(1)+'Z'};
  h+='<ellipse cx="'+cx+'" cy="'+(cy+D+8)+'" rx="'+(rx+4)+'" ry="'+(ry*0.6)+'" fill="#000" opacity=".3"/>';
  for(var k=D;k>0;k-=2)sl.forEach(function(s){h+='<path d="'+path(s,k)+'" fill="'+s.p.d+'"/>'});
  sl.forEach(function(s){h+='<path d="'+path(s,0)+'" fill="'+s.p.c+'" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>'});
  h+='<ellipse cx="'+cx+'" cy="'+(cy-8)+'" rx="'+(rx*0.7)+'" ry="'+(ry*0.45)+'" fill="#fff" opacity=".08"/>';
  return h+'</svg>'}
function hbars3d(items,fmtv){/* οριζόντιες 3D στήλες με όνομα: για ονόματα στρατηγικών */var A=items.filter(function(x){return isFinite(x.v)});if(!A.length)return '<div class="empty">Δεν υπάρχουν ακόμα δεδομένα.</div>';var mx=Math.max.apply(null,A.map(function(x){return Math.abs(x.v)}).concat([0.05]));
  return '<div class="h3">'+A.map(function(x){var w=Math.max(2,Math.abs(x.v)/mx*100),p=x.v>=0;return '<div class="h3r" title="'+esc(x.tip||'')+'"><span class="h3l">'+x.l+'</span><span class="h3t"><span class="h3z"></span><i class="h3b '+(p?'up':'dn')+'" style="width:'+(w/2).toFixed(1)+'%;'+(p?'left:50%':'right:50%')+'"></i></span><span class="h3v num '+(p?'pos':'neg')+'">'+(fmtv?fmtv(x.v):fR(x.v))+'</span><small class="muted h3n">'+(x.n||'')+'</small></div>'}).join('')+'</div>'}
function mat3d(rows,coins,M){/* πίνακας στρατηγική × νόμισμα με 3D πρίσματα: ύψος = μέσο R σε νέα δεδομένα, χρώμα = πρόσημο */
  var mx=0.05;rows.forEach(function(r){coins.forEach(function(c){var x=(M[r.id]||{})[c];if(x&&x[1]>=3)mx=Math.max(mx,Math.abs(x[0]))})});
  return '<div class="m3w"><div class="m3" style="grid-template-columns:minmax(8.5rem,1.4fr) repeat('+coins.length+',minmax(2.1rem,1fr))"><span></span>'+coins.map(function(c){return '<span class="m3h">'+symIcon(c,16)+'<b>'+c+'</b></span>'}).join('')+
    rows.map(function(r){return '<span class="m3n" title="'+esc(r.b.t)+'">'+esc(r.b.t.replace(/^🧪 /,'🧪'))+'</span>'+coins.map(function(c){var x=(M[r.id]||{})[c];if(!x||x[1]<3)return '<span class="m3c none" title="'+esc(c+': λίγες συναλλαγές')+'"><i></i></span>';var h=Math.max(3,Math.abs(x[0])/mx*34),p=x[0]>0;return '<span class="m3c" title="'+esc(r.b.t+' · '+c+': '+fR(x[0])+' σε '+x[1]+' νέες συναλλαγές · συνολικά '+fR(x[2])+' σε '+x[3])+'"><i class="m3b '+(p?'up':'dn')+'" style="--h:'+h.toFixed(1)+'px"></i><small class="num">'+(x[0]>0?'+':'')+fmt(x[0],1)+'</small></span>'}).join('')}).join('')+'</div></div>'}
/* ---- backtest χάρτης ---- */
function saLoad(){if(SA.loaded||!S.db)return;SA.loaded=true;S.db.collection('bars').doc('_stratmap').get().then(function(sn){if(sn.exists&&sn.data()&&sn.data().m){SA.map=sn.data();saRender()}saMaybeRun()}).catch(function(){saMaybeRun()})}
function saMaybeRun(){if(SA.busy||!CG.mcp)return;if(SA.map&&Date.now()-SA.map.at<6*36e5)return;if(!(qCanSave()||!S.db))return;saRun(true)}
function saRun(auto){if(SA.busy)return;if(!CG.mcp){toast('Χρειάζεται η σύνδεση με τα δεδομένα αγοράς (Crypto.com/CoinGecko).');return}SA.busy=true;var cs={};(AP.cfg?apCoins():[]).concat(['BTC','ETH','SOL','XRP','BNB','DOGE']).forEach(function(c){cs[c]=1});var coins=Object.keys(cs).slice(0,10),i=0,M={},meta=[],ids=BT.map(function(x){return x.id});saProg('Ξεκινά…');
  var step=function(){if(i>=coins.length){SA.busy=false;SA.map={at:Date.now(),by:S.uid||'me',coins:meta,m:M};saProg('');saRender();if(S.db&&qCanSave())S.db.collection('bars').doc('_stratmap').set(JSON.parse(JSON.stringify(SA.map))).catch(function(){});if(!auto)toast('📊 Η ανάλυση όλων των στρατηγικών ενημερώθηκε.');return}
    var coin=coins[i++];saProg('Backtest '+coin+' ('+i+'/'+coins.length+') σε '+ids.length+' στρατηγικές…');
    deepBars(coin+'USDT','1h').then(function(r){var b=r.bars.filter(function(x){return !x.approx&&x.t+36e5<=Date.now()+60000});if(b.length<300)return;
      var ev=nowEval(b,{ids:ids,fee:0.15,sym:coin+'USDT'});meta.push({c:coin,k:ev.g.kind,d:ev.g.dir,n:b.length});
      ev.cands.forEach(function(x){var o=M[x.id]=M[x.id]||{},cur=o[coin],v=[+(+x.test.avgR||0).toFixed(3),x.test.n,+(+x.best.st.avgR||0).toFixed(3),x.best.st.n,isFinite(x.best.st.winRate)?+x.best.st.winRate.toFixed(3):null,x.d];if(!cur||v[1]>cur[1]||(v[1]===cur[1]&&v[0]>cur[0]))o[coin]=v})}).catch(function(){}).then(function(){setTimeout(step,40)})};step()}
function saProg(m){SA.prog=m;var el=$('#saProg');if(el)el.innerHTML=SA.busy?'<span class="pill acc apdot"><i></i>'+esc(m)+'</span>':'';var b=$('#saRun');if(b)b.disabled=SA.busy}
/* ---- απόδοση ---- */
function saRender(){var el=$('#saBody');if(!el)return;var R=saRows(),A=saAuto(),cl=A.filter(dmCounts).sort(function(a,b){return (a.exitAt||a.at||0)-(b.exitAt||b.at||0)}),op=A.filter(function(t){return !dmClosed(t)}),w=cl.filter(function(t){return n(t.r)>0}).length,sR=sum(cl.map(function(t){return n(t.r)})),gw=sum(cl.filter(function(t){return n(t.r)>0}).map(function(t){return n(t.r)})),gl=-sum(cl.filter(function(t){return n(t.r)<0}).map(function(t){return n(t.r)})),nf=A.filter(function(t){return t.nofill}).length;
  var eq=[0],c0=0;cl.forEach(function(t){c0+=n(t.r);eq.push(c0)});
  var byC={};cl.forEach(function(t){var c=dmSym(t.symbol).replace(/(USDT|USDC|USD)$/,'');var a=byC[c]=byC[c]||{n:0,r:0};a.n++;a.r+=n(t.r)});
  var M=SA.map&&SA.map.m||{},coins=(SA.map&&SA.map.coins||[]).map(function(x){return x.c}),age=SA.map?Math.round((Date.now()-SA.map.at)/36e5):null;
  var topR=R.filter(function(r){return isFinite(r.bt)&&r.btN>=5}).sort(function(a,b){return b.bt-a.bt}),bestA=R.filter(function(r){return r.au.n>=2}).sort(function(a,b){return b.auAvg-a.auAvg})[0];
  var h='';
  /* 1. τι έκανε ο Αυτόματος */
  h+='<div class="card sa3"><div class="formhead"><h2 style="margin:0">🤖 Τι έκανε ο Αυτόματος Καθηγητής</h2><button type="button" class="btn small" data-goap="1">⚙️ Στο AI Bot</button></div>'+
    '<div class="sak">'+kpi('Συναλλαγές',String(A.length),op.length+' ανοιχτές · '+nf+' δεν γέμισαν')+kpi('Επιτυχία',cl.length?pct(w/cl.length):'–',w+' / '+cl.length+' κλειστές')+kpi('Σύνολο R',cl.length?fR(sR):'–',cl.length?'μέσο '+fR(sR/cl.length):'',cls(sR))+kpi('Profit factor',gl>0?fmt(gw/gl,2):gw>0?'∞':'–','κέρδη / ζημιές')+kpi('Καλύτερη στρατηγική',bestA?bestA.b.t:'–',bestA?fR(bestA.auAvg)+' μέσο σε '+bestA.au.n:'χρειάζονται 2+ κλειστές')+'</div>'+
    '<div class="sag"><div class="sagc"><span class="lbl">Αποτελέσματα (3D)</span>'+pie3d([{v:w,c:'#26a69a',d:'#145c55'},{v:cl.length-w,c:'#ef5350',d:'#7a2a28'},{v:op.length,c:'#5b8def',d:'#2c4a8f'},{v:nf,c:'#8b96a1',d:'#4b545d'}])+'<div class="salg"><span><i style="background:#26a69a"></i>κέρδος '+w+'</span><span><i style="background:#ef5350"></i>ζημιά '+(cl.length-w)+'</span><span><i style="background:#5b8def"></i>ανοιχτές '+op.length+'</span><span><i style="background:#8b96a1"></i>δεν γέμισαν '+nf+'</span></div></div>'+
    '<div class="sagc"><span class="lbl">Καμπύλη σε R (3D)</span>'+(eq.length>2?spark3d(eq,sR>=0).replace('class="spk3"','class="spk3 big"'):'<div class="empty">Θέλει 2+ κλειστές.</div>')+'<span class="lbl" style="margin-top:.5rem">Ανά νόμισμα</span>'+hbars3d(Object.keys(byC).map(function(c){return {l:symIcon(c,14)+' '+c,v:byC[c].r,n:byC[c].n+' συν.',tip:c}}))+'</div></div></div>';
  /* 2. 3D χάρτης */
  h+='<div class="card sa3"><div class="formhead"><h2 style="margin:0">🧊 Χάρτης 3D: στρατηγικές × νομίσματα</h2><div class="row" style="gap:.4rem;align-items:center"><span id="saProg"></span><button type="button" class="btn small primary" id="saRun">📊 Backtest όλων τώρα</button></div></div>'+
    '<p class="muted" style="font-size:.8rem;margin:.3rem 0 .5rem">Κάθε πρίσμα = μέσο R της στρατηγικής σε <b>κεριά που δεν «είδε»</b> (το τελευταίο 30%), κεριά 1 ώρας με fees. Πράσινο κερδίζει, κόκκινο χάνει, ψηλότερο = πιο δυνατό. Κενό = λιγότερες από 3 συναλλαγές.'+(SA.map?' Ενημέρωση πριν '+(age<1?'λίγο':age+' ώρ.')+(SA.map.coins?' · αγορά: '+SA.map.coins.map(function(x){return x.c+(x.k==='trend'?(x.d>0?' ↗':' ↘'):x.k==='range'?' ↔':' ~')}).join(' · '):''):'')+'</p>'+
    (coins.length?mat3d(R.filter(function(r){return M[r.id]&&Object.keys(M[r.id]).some(function(c){return M[r.id][c][1]>=3})}).sort(function(a,b){return (isFinite(b.bt)?b.bt:-9)-(isFinite(a.bt)?a.bt:-9)}),coins,M):'<div class="empty">'+(SA.busy?'Υπολογίζω…':'Πάτα «📊 Backtest όλων τώρα» για να γεμίσει ο χάρτης.')+'</div>')+'</div>';
  /* 3. R ανά στρατηγική */
  var src=SA.src,items=R.map(function(r){var v=src==='bt'?r.bt:src==='au'?(r.au.n?r.au.r:NaN):(r.tm&&r.tm.n?r.tm.r:NaN);return {l:esc(r.b.t),v:v,n:src==='bt'?(r.btN?r.btN+' συν. · '+r.pos+'/'+r.coins+' νομ.':''):src==='au'?(r.au.n+' κλειστ.'):(r.tm?r.tm.n+' συν.':''),tip:r.b.t}}).filter(function(x){return isFinite(x.v)}).sort(function(a,b){return b.v-a.v});
  h+='<div class="card sa3"><div class="formhead"><h2 style="margin:0">🧊 Αποτέλεσμα ανά στρατηγική (3D)</h2><span class="mvtg"><button type="button" data-sasrc="bt"'+(src==='bt'?' class="on"':'')+'>Backtest (μέσο R)</button><button type="button" data-sasrc="au"'+(src==='au'?' class="on"':'')+'>Αυτόματος (Σ R)</button><button type="button" data-sasrc="tm"'+(src==='tm'?' class="on"':'')+'>Ομάδα (Σ R)</button></span></div>'+hbars3d(items)+'</div>';
  /* 4. κάρτες στρατηγικών */
  var srt=SA.sort,L=R.slice().sort(function(a,b){return srt==='bt'?((isFinite(b.bt)?b.bt:-9)-(isFinite(a.bt)?a.bt:-9)):srt==='au'?(b.au.r-a.au.r):srt==='name'?a.b.t.localeCompare(b.b.t):(b.sc-a.sc)});
  h+='<div class="card sa3"><div class="formhead"><h2 style="margin:0">📚 Όλες οι στρατηγικές · ανάλυση μία-μία</h2><label class="f" style="margin:0;max-width:14rem">Ταξινόμηση<select id="saSort"><option value="score"'+(srt==='score'?' selected':'')+'>Συνολική εικόνα</option><option value="bt"'+(srt==='bt'?' selected':'')+'>Backtest</option><option value="au"'+(srt==='au'?' selected':'')+'>Αυτόματος</option><option value="name"'+(srt==='name'?' selected':'')+'>Όνομα</option></select></label></div>'+
    '<div class="sacards">'+L.map(function(r){var mid=saMid(r.id),mk=mid&&window.Manual&&Manual.known(mid),vals=[['Backtest',r.bt],['Αυτόματος',r.auAvg],['Ομάδα',r.tmAvg]],mx=Math.max.apply(null,vals.map(function(v){return isFinite(v[1])?Math.abs(v[1]):0}).concat([0.3]));
      var verdict=isFinite(r.bt)&&r.btN>=10?(r.bt>0.15&&r.pos>=Math.ceil(r.coins/2)?['gain','Δυνατή']:r.bt>0?['acc','Θετική, με επιφύλαξη']:['loss','Αδύναμη τώρα']):['','Λίγα δεδομένα'];
      return '<div class="sac"><div class="sach"><b>'+esc(r.b.t)+'</b><span class="pill '+verdict[0]+'">'+verdict[1]+'</span></div><div class="sacm muted">'+(r.gen?'🧪 δική του (Εργαστήριο) · ':'')+(r.fit==='range'?'↔ για πλάγια αγορά':r.fit==='squeeze'?'◎ για συμπίεση':'↗ για τάση')+(BT_NOTGT[r.id]?' · έξοδος με κανόνα, όχι σταθερός στόχος':'')+'</div>'+
        '<div class="sacb">'+vals.map(function(v){var ok=isFinite(v[1]),hh=ok?Math.max(3,Math.abs(v[1])/mx*46):0,p=ok&&v[1]>=0;return '<div class="sacc"><span class="sacv num '+(ok?(p?'pos':'neg'):'muted')+'">'+(ok?fR(v[1]):'–')+'</span><div class="sacs">'+(ok?'<i class="b3b '+(p?'up':'dn')+'" style="--h:'+hh.toFixed(1)+'px"></i>':'')+'</div><span class="sacl">'+v[0]+'</span></div>'}).join('')+'</div>'+
        '<div class="sacd"><span>Backtest: '+(r.btN?r.btN+' νέες συν. · θετική σε '+r.pos+'/'+r.coins+' νομίσματα':'δεν έχει τρέξει')+(r.best.length?' · κερδίζει σε <b>'+r.best.join(', ')+'</b>':r.btN?' · δεν κερδίζει σε κανένα τώρα':'')+'</span><span>Αυτόματος: '+(r.au.n||r.au.open?r.au.n+' κλειστές'+(r.au.n?' · '+pct(r.au.w/r.au.n)+' επιτυχία · Σ '+fR(r.au.r):'')+(r.au.open?' · '+r.au.open+' ανοιχτή/ές':''):'δεν την έχει παίξει ακόμα')+'</span><span>Ομάδα: '+(r.tm&&r.tm.n?r.tm.n+' συν. · '+pct(r.tm.w/r.tm.n)+' επιτυχία · μέσο '+fR(r.tmAvg):'καμία καταγεγραμμένη')+'</span></div>'+
        '<div class="sacf">'+(mk?'<button type="button" class="linkbtn" data-manual="'+esc(mid)+'">📖 Μελέτη στον Μπούσουλα</button>':r.gen?'<button type="button" class="linkbtn" data-golab="1">🧪 Στο Εργαστήριο</button>':'<span class="muted" style="font-size:.74rem">'+esc(String(r.b.rule||'').slice(0,90))+'…</span>')+'</div></div>'}).join('')+'</div></div>';
  el.innerHTML=h;saProg(SA.prog)}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-anj]');if(!a)return;e.preventDefault();var t=$('#'+a.getAttribute('data-anj'));if(t){if(t.tagName==='DETAILS')t.open=true;t.scrollIntoView({block:'start',behavior:'smooth'})}});
function saInit(){var el=$('#saBody');if(!el||el.dataset.b)return;el.dataset.b='1';saLoad();saRender();
  el.addEventListener('click',function(e){var t=e.target;if(t.closest('#saRun')){saRun(false);return}var s=t.closest('[data-sasrc]');if(s){SA.src=s.getAttribute('data-sasrc');saRender();return}
    if(t.closest('[data-goap]')){showTab('demo');setTimeout(function(){var c=$('#apCard');if(c)c.scrollIntoView({block:'start',behavior:'smooth'})},120);return}
    if(t.closest('[data-golab]')){showTab('demo');setTimeout(function(){var c=$('#labCard');if(c)c.scrollIntoView({block:'start',behavior:'smooth'})},120)}});
  el.addEventListener('change',function(e){if(e.target.id==='saSort'){SA.sort=e.target.value;saRender()}})}
/* 🧠 Agent στρατηγικών: συλλέγει backtest σε όλες τις στρατηγικές/νομίσματα, πειθαρχία μελών και απόδοση του Αυτόματου Καθηγητή, και ο Claude γράφει αναφορά */
var AG={list:[],sel:null,busy:false,ctl:null,sub:null,prog:''};
var AG_COINS=['BTC','ETH','SOL','XRP','DOGE','LINK','AVAX','BNB'];
function agN(x,d){return isFinite(x)?+(+x).toFixed(d==null?2:d):null}
function agStrip(h){return String(h||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()}
function agCoins(){var m={};(AP.cfg?apCoins():[]).concat(AG_COINS).forEach(function(c){m[c]=1});return Object.keys(m).slice(0,8)}
function agStratRow(c){var st=c.best.st;return {id:c.id,name:c.s.t,dir:c.d>0?'long':'short',fitsMarket:c.fit>=2?'yes':c.fit<0?'against_trend':c.fit>0?'partly':'no',n:st.n,winRate:agN(st.winRate),avgR:agN(st.avgR),pf:isFinite(st.pf)?agN(st.pf):null,targetR:c.best.X,testN:c.test.n,testAvgR:agN(c.test.avgR),reliable:c.reliable,signalNow:!!c.sig}}
function agMarket(prog){var coins=agCoins(),out=[],i=0;
  return new Promise(function(res){var step=function(){if(i>=coins.length){res(out);return}var coin=coins[i++];prog&&prog('Backtest '+coin+' ('+i+'/'+coins.length+')…');
    deepBars(coin+'USDT','1h').then(function(r){var ms=36e5,b=r.bars.filter(function(x){return !x.approx&&x.t+ms<=Date.now()+60000});
      if(b.length<300){out.push({coin:coin,error:'only '+b.length+' candles'});return}
      var ev=nowEval(b,{fee:0.1,sym:coin+'USDT'}),g=ev.g,age=(Date.now()-(b[b.length-1].t+ms))/36e5;
      out.push({coin:coin,bars:b.length,from:lday(new Date(b[0].t)),lastCandleHoursAgo:agN(age,1),price:g.c,regime:g.kind,trendDir:g.dir,adx:agN(g.adx,0),rsi:agN(g.rsi,0),atrPct:agN(g.atrPct),
        strategies:ev.cands.slice().sort(function(a,c){return c.score-a.score}).map(agStratRow)})}).catch(function(e){out.push({coin:coin,error:(e&&e.code)||'no data'})}).then(function(){setTimeout(step,60)})};step()})}
function agAgg(mk){var m={};mk.forEach(function(x){(x.strategies||[]).forEach(function(s){var k=s.id+'|'+s.dir,a=m[k]=m[k]||{id:s.id,name:s.name,dir:s.dir,coins:0,posTest:0,rel:0,sumTest:0,nTest:0,trades:0};a.coins++;a.trades+=s.n;if(s.reliable)a.rel++;if(s.reliable&&s.testAvgR>0)a.posTest++;if(isFinite(s.testAvgR)&&s.testN>=5){a.sumTest+=s.testAvgR;a.nTest++}})});
  return Object.keys(m).map(function(k){var a=m[k];return {id:a.id,name:a.name,dir:a.dir,coinsTested:a.coins,coinsReliable:a.rel,coinsPositiveOnUnseen:a.posTest,avgUnseenR:a.nTest?agN(a.sumTest/a.nTest):null,totalTrades:a.trades}}).sort(function(a,b){return (b.avgUnseenR||-9)-(a.avgUnseenR||-9)})}
function agMembers(){var since=lday(new Date(Date.now()-60*864e5)),set=S.settings,us={};S.trades.forEach(function(t){if(t.by)us[t.by]=1});(S.demo||[]).forEach(function(t){if(t.by)us[t.by]=1});
  return Object.keys(us).map(function(uid){var L=S.trades.filter(function(t){return t.by===uid&&(t.date||'')>=since}),st=stats(L),c=st.c;
    var days={};c.forEach(function(t){var d=days[t.date]=days[t.date]||{n:0,r:0};d.n++;d.r+=t.r});var dk=Object.keys(days);
    var cl=L.filter(function(t){return t.status==='closed'});
    var ps=group(L,function(t){return t.strategyId||''}).map(function(g){var s=S.strategies.find(function(x){return x.id===g.key});return {strategy:stratName(g.key),manualId:s?manualIdFor(s):null,n:g.n,winRate:agN(g.winRate),avgR:agN(g.avgR),totalR:agN(g.totalR)}});
    var dm=dmOf(uid),dmc=dm.filter(dmCounts),own=dmc.filter(function(t){return t.src!=='auto'});
    return {uid:uid,name:name(uid),period:'last 60 days',tradesLogged:L.length,closedWithR:st.n,winRate:agN(st.winRate),avgR:agN(st.avgR),totalR:agN(st.totalR),maxDrawdownR:agN(st.dd),worstLosingStreak:st.worstStreak,
      closedWithoutStop:cl.filter(function(t){return !isFinite(n(t.stop))}).length,offPlan:L.filter(function(t){return t.strategyId==='_off'}).length,noStrategy:L.filter(function(t){return !t.strategyId}).length,
      saidRulesFollowed:c.filter(function(t){return t.rules===true}).length,saidRulesBroken:c.filter(function(t){return t.rules===false}).length,
      avgRWhenRulesFollowed:agN(avg(c.filter(function(t){return t.rules===true}).map(function(t){return t.r}))),avgRWhenRulesBroken:agN(avg(c.filter(function(t){return t.rules===false}).map(function(t){return t.r}))),
      lossesBeyondMinus1R:c.filter(function(t){return t.r<-1.15}).length,riskAboveRule:c.filter(function(t){return isFinite(n(t.riskPct))&&n(t.riskPct)>set.risk*1.25}).length,
      daysTraded:dk.length,daysOverMaxTrades:dk.filter(function(d){return days[d].n>set.maxTrades}).length,daysOverDailyLoss:dk.filter(function(d){return days[d].r<=-set.dayLoss}).length,
      byStrategy:ps.slice(0,8),demoOwnClosed:own.length,demoOwnAvgR:agN(avg(own.map(function(t){return n(t.r)}))),
      analystNotes:insights(L).filter(function(x){return x.lv!=='info'}).map(function(x){return agStrip(x.t)}).slice(0,6)}}).filter(function(m){return m.tradesLogged||m.demoOwnClosed})}
function agAuto(){var L=(S.demo||[]).filter(function(t){return t.src==='auto'}),cl=L.filter(dmCounts),g={};
  cl.forEach(function(t){var k=t.title||'?',x=g[k]=g[k]||{strategy:k,n:0,w:0,r:0,promised:[]};x.n++;if(t.r>0)x.w++;x.r+=n(t.r);if(t.auto&&isFinite(t.auto.testR))x.promised.push(t.auto.testR)});
  var pr=dmProfStats();
  return {byProfile:apfRows().map(function(r){return {profile:r.name,settings:r.p?apfDesc(r.p.cfg):null,closed:r.st.n,winRate:agN(r.st.wr),totalR:agN(r.st.sumR),avgR:agN(r.st.avgR),maxDD_R:agN(r.st.dd)}}),activeProfile:(apfActive()||{}).name||null,autoOpen:L.filter(function(t){return !dmClosed(t)}).length,autoClosed:cl.length,autoWinRate:agN(cl.length?cl.filter(function(t){return t.r>0}).length/cl.length:NaN),autoAvgR:agN(avg(cl.map(function(t){return n(t.r)}))),
    autoPromisedAvgR:agN(avg(cl.filter(function(t){return t.auto&&isFinite(t.auto.testR)}).map(function(t){return t.auto.testR}))),autoExpiredNoFill:L.filter(function(t){return t.nofill}).length,
    autoByStrategy:Object.keys(g).map(function(k){var x=g[k];return {strategy:x.strategy,n:x.n,winRate:agN(x.w/x.n),avgR:agN(x.r/x.n),promisedAvgR:agN(avg(x.promised))}}),
    professorDemoClosed:pr.cl.length,professorDemoWinRate:agN(pr.cl.length?pr.w.length/pr.cl.length:NaN),professorDemoAvgR:agN(avg(pr.cl.map(function(t){return n(t.r)})))}}
function agRealVsBt(agg){var m={};BT.forEach(function(b){m[b.mid]=b.id});var out=[];
  S.strategies.forEach(function(s){var mid=manualIdFor(s),L=S.trades.filter(function(t){return t.strategyId===s.id}),st=stats(L);if(!st.n)return;var bid=m[mid],a=bid?agg.filter(function(x){return x.id===bid}):[];
    out.push({strategy:s.name,manualId:mid,realTrades:st.n,realAvgR:agN(st.avgR),realWinRate:agN(st.winRate),backtestId:bid||null,backtestBestUnseenR:a.length?Math.max.apply(null,a.map(function(x){return x.avgUnseenR==null?-9:x.avgUnseenR})):null})});return out}
function agCollect(prog){return agMarket(prog).then(function(mk){var agg=agAgg(mk);
  return {generatedAt:new Date().toISOString(),rules:{riskPct:S.settings.risk,targetR:S.settings.target,dailyLossR:S.settings.dayLoss,maxTradesPerDay:S.settings.maxTrades,minRR:1.5,maxStopPct:9,demoMargin:1000,demoLeverage:10},
    method:'Backtest on Gemini/Crypto.com 1h candles (~2 months), fee 0.1% per side, entry at signal close, stop wins ties. Target chosen on first 70% of candles, judged on the last 30% (unseen). reliable = 20+ trades total and 5+ on unseen.',
    strategyRules:BT.map(function(b){return {id:b.id,name:b.t,rule:b.rule,fits:FIT[b.id],fixedTarget:!BT_NOTGT[b.id]}}),notBacktestable:BT_NO.map(function(x){return x[1]}),
    markets:mk,strategySummary:agg,realVsBacktest:agRealVsBt(agg),members:agMembers(),autopilot:agAuto()}})}
window.__agentCollect=function(){return agCollect()};window.__agentPrompt=function(d){return agPrompt(d)};
function agPrev(){var p=(AG.list||[]).filter(function(x){return x&&x.rep&&x.id!=='local'}).sort(function(a,b){return (b.at||0)-(a.at||0)})[0];if(!p)return null;var r=p.rep||{};
  return {at:new Date(p.at).toISOString(),src:p.src||'',meta:p.meta||null,summary:r.summary||'',market:r.market||'',coins:(r.coins||[]).map(function(c){return c.coin+': '+c.state+' | '+c.signal}),strategies:(r.strategies||[]).map(function(x){return x.name+' · '+x.coins+' · '+x.dir+' · '+x.verdict}),members:(r.members||[]).map(function(m){return {uid:m.uid,score:m.score,issues:m.issues}}),autopilot:r.autopilot||null}}
function agPrompt(data){return 'Είσαι ο «Agent στρατηγικών» ενός κοινού ημερολογίου συναλλαγών για μια μικρή ομάδα φίλων που μαθαίνουν trading (κυρίως crypto). Γράφεις στα ελληνικά, απλά, για αρχάριους, χωρίς υπερβολές. Δεν δίνεις επενδυτικές συμβουλές: κρίνεις στρατηγικές και πειθαρχία με βάση τα δεδομένα.\n\n'+
 'ΕΛΕΓΞΕ ΤΑ ΤΕΣΣΕΡΑ:\n1. Ποιες στρατηγικές του Μπούσουλα δουλεύουν τώρα, σε ποια νομίσματα, προς ποια κατεύθυνση και με ποιον στόχο R. Εμπιστεύσου μόνο reliable αποτελέσματα με θετικό testAvgR (σε κεριά που δεν «είδε» η επιλογή στόχου). Ψάξε υπερβελτιστοποίηση (καλό συνολικό avgR αλλά κακό testAvgR).\n2. Αν κάθε μέλος τηρεί τους κανόνες: stop, ρίσκο, όριο συναλλαγών/ημέρας, όριο ζημιάς/ημέρας, εκτός πλάνου, «έσπασα τους κανόνες», απώλειες πέρα από −1R, και πόσο του κοστίζει.\n3. Αν οι demo του Αυτόματου Καθηγητή βγαίνουν όπως υπόσχεται το backtest (autoAvgR σε σχέση με autoPromisedAvgR). Με λιγότερες από 10 κλειστές πες ότι είναι νωρίς.\n4. Αν οι πραγματικές συναλλαγές με μια στρατηγική συμφωνούν με το backtest της (realVsBacktest).\n5. Τι άλλαξε σε σχέση με την ΠΡΟΗΓΟΥΜΕΝΗ ΑΝΑΦΟΡΑ (δίνεται παρακάτω): νέα ή χαμένα σήματα (signalNow), αλλαγές τάσης/ADX/RSI, στρατηγικές που άλλαξαν απόφαση, νέες ή αλλαγμένες συναλλαγές, ανοιχτές/κλειστές demo. Αν δεν άλλαξε κάτι ουσιαστικό, γράψ’ το καθαρά.\n\n'+
 'ΑΚΡΙΒΕΙΑ: κάθε αριθμός και κάθε ισχυρισμός πρέπει να βγαίνει από τα ΔΕΔΟΜΕΝΑ της τωρινής εκτέλεσης (π.χ. closedWithoutStop, riskAboveRule, analystNotes, autoOpen, autoClosed). Δίπλα σε κάθε avgR ή testAvgR γράψε και το πλήθος συναλλαγών (n ή testN). Μη γράφεις ότι κάτι λείπει ή υπάρχει αν τα δεδομένα δεν το λένε. Μην αντιγράφεις φράσεις από την προηγούμενη αναφορά: γράψε την τωρινή εικόνα με τους τωρινούς αριθμούς.\n\n'+
 'Έχεις εργαλεία: «backtest» για να ελέγξεις μια παραλλαγή (άλλος στόχος ή κατεύθυνση, άλλο νόμισμα) και «trades» για να δεις τις τελευταίες συναλλαγές ενός μέλους. Χρησιμοποίησέ τα μόνο αν κάτι χρειάζεται επιβεβαίωση (το πολύ 3 κλήσεις).\n\n'+
 'ΑΠΑΝΤΗΣΕ ΜΟΝΟ με ένα JSON αντικείμενο:\n{"summary":"5-8 προτάσεις: το πιο σημαντικό εύρημα πρώτο, με αριθμούς","changes":["τι άλλαξε από την προηγούμενη αναφορά, με αριθμούς"],"market":"2-4 προτάσεις για την αγορά τώρα","coins":[{"coin":"BTC","state":"φάση αγοράς με τιμή, ADX, RSI, ATR%","best":"καλύτερη αξιόπιστη στρατηγική εδώ με κατεύθυνση, n, avgR, testN, testAvgR, στόχο R, ή «καμία αξιόπιστη θετική»","signal":"σήμα τώρα (signalNow) και αν αξίζει, ή «κανένα»"}],"strategies":[{"name":"όνομα στρατηγικής","coins":"π.χ. BTC, SOL","dir":"long|short|both","verdict":"keep|test|watch|drop","targetR":2,"why":"2-3 προτάσεις με n, avgR, testN, testAvgR ανά νόμισμα"}],"members":[{"uid":"ακριβώς το uid","name":"όνομα","score":0,"good":["…"],"issues":["…"],"advice":"1-2 προτάσεις, συγκεκριμένη αλλαγή"}],"autopilot":{"verdict":"ok|warn|bad|early","text":"2-4 προτάσεις: ανοιχτές και κλειστές demo, αποτέλεσμα σε σχέση με την υπόσχεση"},"actions":["συγκεκριμένη ενέργεια για την ομάδα αυτή την εβδομάδα"]}\n'+
 'coins: ένα για κάθε νόμισμα στα δεδομένα. changes: 2-6. strategies: έως 12, πρώτα οι καλύτερες, και βάλε όσες πρέπει να σταματήσουν (drop). verdict: keep ΜΟΝΟ αν είναι θετική και σε όλη την περίοδο (avgR>0) και στα κεριά που δεν είδε (testAvgR>0) με 30+ συναλλαγές· test=υποσχόμενη αλλά όχι ακόμα αποδεδειγμένη (μόνο demo), watch=περιμένει την κατάλληλη αγορά, drop=χάνει σε κεριά που δεν είδε. members: ένα για κάθε μέλος στα δεδομένα, score 0-100 για πειθαρχία, good/issues με αριθμούς. actions: 3-6.\n\nΠΡΟΗΓΟΥΜΕΝΗ ΑΝΑΦΟΡΑ (μόνο για σύγκριση):\n'+JSON.stringify(agPrev())+'\n\nΔΕΔΟΜΕΝΑ (JSON):\n'+JSON.stringify(data)}
function agTools(){return [
  {name:'backtest',description:'Runs one strategy backtest on ~2 months of 1h candles of a coin. Returns totals, the result on the unseen last 30%, and the last 5 trades. Use to check a variant (other target R or direction).',
   inputSchema:{type:'object',properties:{coin:{type:'string',description:'e.g. BTC'},strategy:{type:'string',description:'strategy id from strategyRules, e.g. pb'},dir:{type:'string',enum:['long','short']},targetR:{type:'number',description:'1-5, ignored for strategies without fixed target'}},required:['coin','strategy','dir']},
   execute:function(a){var coin=String(a.coin||'').toUpperCase().replace(/(USDT|USD)$/,''),id=String(a.strategy||''),d=a.dir==='short'?-1:1,X=Math.min(5,Math.max(1,+a.targetR||2));
     if(!BT.some(function(x){return x.id===id}))throw new Error('unknown strategy id '+id);AG.prog='Backtest '+coin+' · '+id+'…';agStat();
     return deepBars(coin+'USDT','1h').then(function(r){var b=r.bars.filter(function(x){return !x.approx});if(b.length<300)throw new Error('only '+b.length+' candles for '+coin);
       var cut=b[Math.floor(b.length*0.7)].t,T=runBt(b,id,[d],X,0.1),all=stats(T),te=stats(runBt(b,id,[d],X,0.1,cut,null));
       return {coin:coin,strategy:id,dir:a.dir,targetR:BT_NOTGT[id]?null:X,n:all.n,winRate:agN(all.winRate),avgR:agN(all.avgR),pf:isFinite(all.pf)?agN(all.pf):null,maxDD_R:agN(all.dd),unseenN:te.n,unseenAvgR:agN(te.avgR),
         last5:T.slice(-5).map(function(t){return {date:t.date,r:agN(t.r),exit:t.hit}})}})}},
  {name:'trades',description:'Returns the last 20 closed real trades of one member (by uid or name): date, symbol, direction, strategy, R, rules followed, emotion, short note.',
   inputSchema:{type:'object',properties:{member:{type:'string'}},required:['member']},
   execute:function(a){var q=String(a.member||'').toLowerCase(),uid=null;agMembers().forEach(function(m){if(m.uid.toLowerCase()===q||String(m.name).toLowerCase()===q)uid=m.uid});if(!uid)throw new Error('member not found');
     return closed(S.trades.filter(function(t){return t.by===uid})).slice(-20).map(function(t){return {date:t.date,symbol:t.symbol,dir:t.dir,strategy:stratName(t.strategyId),r:agN(t.r),rules:t.rules,emotion:t.emotion||null,note:String(t.notes||'').slice(0,80)}})}}]}
function agValid(r){return r&&typeof r==='object'&&typeof r.summary==='string'}
function agClean(r){var s=function(x,m){return String(x==null?'':x).slice(0,m||600)},A=function(x){return Array.isArray(x)?x:[]};
  return {summary:s(r.summary,2500),changes:A(r.changes).slice(0,8).map(function(y){return s(y,320)}),market:s(r.market,900),coins:A(r.coins).slice(0,10).map(function(x){return {coin:s(x.coin,12),state:s(x.state,300),best:s(x.best,300),signal:s(x.signal,300)}}),strategies:A(r.strategies).slice(0,12).map(function(x){return {name:s(x.name,80),coins:s(x.coins,80),dir:s(x.dir,10),verdict:/^(keep|test|watch|drop)$/.test(x.verdict)?x.verdict:'watch',targetR:x.targetR!=null&&x.targetR!==''&&isFinite(+x.targetR)?+x.targetR:null,why:s(x.why,600)}}),
    members:A(r.members).slice(0,10).map(function(x){return {uid:s(x.uid,60),name:s(x.name,60),score:Math.max(0,Math.min(100,+x.score||0)),good:A(x.good).slice(0,5).map(function(y){return s(y,200)}),issues:A(x.issues).slice(0,6).map(function(y){return s(y,220)}),advice:s(x.advice,400)}}),
    autopilot:{verdict:/^(ok|warn|bad|early)$/.test(r.autopilot&&r.autopilot.verdict)?r.autopilot.verdict:'early',text:s(r.autopilot&&r.autopilot.text,800)},actions:A(r.actions).slice(0,8).map(function(y){return s(y,260)})}}
function agRun(){if(AG.busy)return;if(!S.sample){toast('Ο Agent χρειάζεται το Claude μέσα στη σελίδα, που δεν είναι διαθέσιμο σε αυτή την προβολή.');return}
  AG.busy=true;AG.ctl=new AbortController();AG.prog='Μαζεύω δεδομένα…';agStat();var t0=Date.now(),data;
  agCollect(function(m){AG.prog=m;agStat()}).then(function(d){data=d;AG.prog='Ο Claude διαβάζει τα αποτελέσματα και γράφει την αναφορά (1-3 λεπτά)…';agStat();
    return S.sample.json(agPrompt(d),{tools:agTools(),signal:AG.ctl.signal})}).then(function(r){if(!agValid(r))throw {code:'invalid_json'};
    var doc={by:S.uid||'me',at:Date.now(),date:lday(new Date()),src:'page',rep:agClean(r),meta:{coins:data.markets.map(function(x){return x.coin+(x.bars?':'+x.bars:'')}),members:data.members.length,autoClosed:data.autopilot.autoClosed,ms:Date.now()-t0}};
    AG.sel=null;AG.local=Object.assign({id:'local'},doc);agRender();if(!S.db||!qCanSave()){toast('Η αναφορά είναι έτοιμη (δεν αποθηκεύτηκε: χρειάζεται δικαίωμα Editor).');return}
    return put('agent',newId(),doc).then(function(){toast('🧠 Η αναφορά του Agent είναι έτοιμη και αποθηκεύτηκε για όλη την ομάδα.')})})
  .catch(function(e){var c=e&&e.code;if(c!=='cancelled')toast(c==='not_granted'?'Χρειάζεται να επιτρέψεις στη σελίδα να ρωτά τον Claude.':c==='rate_limited'?'Έφτασες το όριο χρήσης του Claude. Δοκίμασε αργότερα.':c==='invalid_json'?'Ο Claude δεν έδωσε σωστή αναφορά. Δοκίμασε ξανά.':'Ο Agent δεν ολοκληρώθηκε'+(c?' ('+c+')':'')+'.')})
  .then(function(){AG.busy=false;AG.prog='';agStat()})}
function agStat(){var el=$('#agStat'),b=$('#agRun'),x=$('#agStop');if(b){b.disabled=AG.busy;b.textContent=AG.busy?'Δουλεύει…':'🧠 Τρέξε τον Agent'}if(x)x.hidden=!AG.busy;
  if(el)el.innerHTML=AG.busy?'<span class="pill acc apdot"><i></i>'+esc(AG.prog||'…')+'</span>':''}
function agLoad(){if(!S.db||AG.sub)return;try{AG.sub=S.db.collection('agent').orderBy('at','desc').limit(12).onSnapshot(function(sn){AG.list=sn.docs.map(function(d){return Object.assign({id:d.id},d.data())});agRender();try{var hs=$('section[data-panel=history]');if(hs&&!hs.hidden)hiRender()}catch(e){}},function(){})}catch(e){}}
function agVerdict(v){return {keep:'<span class="pill gain">κράτα</span>',test:'<span class="pill acc">δοκίμασε σε demo</span>',watch:'<span class="pill">περιμένει αγορά</span>',drop:'<span class="pill loss">σταμάτα</span>'}[v]||''}
function agRender(){var box=$('#agBody');if(!box)return;var L=AG.list.slice();if(AG.local&&!L.some(function(x){return x.at===AG.local.at}))L.unshift(AG.local);
  $('#agRun').hidden=!S.sample;var sel=$('#agSel');
  if(!L.length){box.innerHTML='<div class="empty">Δεν υπάρχει ακόμα αναφορά. '+(S.sample?'Πάτα «🧠 Τρέξε τον Agent»: κάνει backtest σε όλες τις στρατηγικές σε 8 νομίσματα, ελέγχει την πειθαρχία κάθε μέλους και τις demo του Αυτόματου Καθηγητή, και γράφει τι να κρατήσετε και τι να αλλάξετε.':'Θα εμφανιστεί εδώ μόλις τρέξει ο Agent.')+'</div>';if(sel)sel.hidden=true;return}
  var cur=L.find(function(x){return x.id===AG.sel})||L[0],r=cur.rep||{};
  if(sel){sel.hidden=L.length<2;sel.innerHTML=L.map(function(x){var d=new Date(x.at);return '<option value="'+esc(x.id)+'"'+(x===cur?' selected':'')+'>'+esc(dateGr(lday(d))+' '+pad2(d.getHours())+':'+pad2(d.getMinutes())+' · '+(x.src==='daily'?'καθημερινή':name(x.by)))+'</option>'}).join('')}
  var d0=new Date(cur.at),age=(Date.now()-cur.at)/36e5;
  var h='<p class="muted" style="margin:.2rem 0 .5rem;font-size:.8rem">'+esc(dateGr(lday(d0))+' '+pad2(d0.getHours())+':'+pad2(d0.getMinutes()))+' · '+(cur.src==='daily'?'καθημερινός έλεγχος':'από '+esc(name(cur.by)))+(age>36?' · <span class="pill warn">παλιά αναφορά</span>':'')+'</p>';
  h+='<div class="agsum">'+esc(r.summary||'')+'</div>'+(r.market?'<p class="muted" style="margin:.4rem 0 0;font-size:.86rem">📈 '+esc(r.market)+'</p>':'');
  if((r.changes||[]).length)h+='<span class="lbl" style="display:block;margin-top:.8rem">🔄 Τι άλλαξε από την προηγούμενη αναφορά</span><ul class="agact" style="padding-left:1.1rem">'+r.changes.map(function(a){return '<li>'+esc(a)+'</li>'}).join('')+'</ul>';
  if((r.actions||[]).length)h+='<span class="lbl" style="display:block;margin-top:.8rem">Τι κάνουμε αυτή την εβδομάδα</span><ol class="agact">'+r.actions.map(function(a){return '<li>'+esc(a)+'</li>'}).join('')+'</ol>';
  var det='';
  if((r.coins||[]).length)det+='<span class="lbl" style="display:block;margin-top:.6rem">Ανά νόμισμα</span><div class="tw"><table><thead><tr><th>Νόμισμα</th><th>Αγορά τώρα</th><th>Καλύτερη στρατηγική</th><th>Σήμα τώρα</th></tr></thead><tbody>'+r.coins.map(function(c){return '<tr><td><b>'+esc(c.coin)+'</b></td><td style="min-width:12rem;white-space:normal">'+esc(c.state)+'</td><td style="min-width:14rem;white-space:normal">'+esc(c.best)+'</td><td style="min-width:12rem;white-space:normal">'+esc(c.signal)+'</td></tr>'}).join('')+'</tbody></table></div>';
  if((r.strategies||[]).length)det+='<span class="lbl" style="display:block;margin-top:.6rem">Στρατηγικές</span><div class="tw"><table><thead><tr><th>Στρατηγική</th><th>Νομίσματα</th><th>Θέση</th><th>Απόφαση</th><th class="r">Στόχος</th><th>Γιατί</th></tr></thead><tbody>'+r.strategies.map(function(s){return '<tr><td><b>'+esc(s.name)+'</b></td><td>'+esc(s.coins)+'</td><td>'+esc(s.dir==='long'?'Long':s.dir==='short'?'Short':'Και τα δύο')+'</td><td>'+agVerdict(s.verdict)+'</td><td class="r num">'+(s.targetR?fmt(s.targetR,s.targetR%1?1:0)+'R':'–')+'</td><td style="min-width:16rem;white-space:normal">'+esc(s.why)+'</td></tr>'}).join('')+'</tbody></table></div>';
  if((r.members||[]).length)det+='<span class="lbl" style="display:block;margin-top:.8rem">Πειθαρχία μελών</span><div class="agmem">'+r.members.map(function(m){var nm=S.names[m.uid]||m.name||name(m.uid),sc=m.score;return '<div class="agm"><div class="formhead"><b>'+esc(nm)+'</b><span class="pill '+(sc>=75?'gain':sc>=50?'warn':'loss')+'">'+sc+'/100</span></div><div class="meter" style="margin:.35rem 0 .45rem"><i style="width:'+sc+'%;background:var(--'+(sc>=75?'gain':sc>=50?'warn':'loss')+')"></i></div>'+
    ((m.good||[]).length?'<ul class="agl ok">'+m.good.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'')+((m.issues||[]).length?'<ul class="agl bad">'+m.issues.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'')+(m.advice?'<p style="margin:.4rem 0 0;font-size:.86rem"><b>Συμβουλή:</b> '+esc(m.advice)+'</p>':'')+'</div>'}).join('')+'</div>';
  if(r.autopilot&&r.autopilot.text)det+='<span class="lbl" style="display:block;margin-top:.8rem">🤖 Αυτόματος Καθηγητής</span><p style="margin:.3rem 0 0">'+({ok:'<span class="pill gain">όπως υπόσχεται</span>',warn:'<span class="pill warn">προσοχή</span>',bad:'<span class="pill loss">χειρότερα από το backtest</span>',early:'<span class="pill">νωρίς ακόμα</span>'}[r.autopilot.verdict]||'')+' '+esc(r.autopilot.text)+'</p>';
  if(cur.meta&&cur.meta.coins)det+='<p class="muted" style="margin:.7rem 0 0;font-size:.78rem">Δεδομένα: '+esc(cur.meta.coins.join(', '))+' (κεριά 1h) · '+(cur.meta.members||0)+' μέλη · '+(cur.meta.autoClosed||0)+' κλειστές αυτόματες demo. Δεν είναι επενδυτική συμβουλή.</p>';
  h+='<details class="agdet"'+(AG.open?' open':'')+'><summary>Όλη η αναφορά: νομίσματα, στρατηγικές, μέλη, αυτόματος</summary>'+det+'</details>';
  box.innerHTML=h;var dd=box.querySelector('.agdet');if(dd)dd.addEventListener('toggle',function(){AG.open=dd.open})}
function agBind(){var c=$('#agCard');if(!c||c.dataset.b)return;c.dataset.b='1';
  c.addEventListener('click',function(e){if(e.target.closest('#agRun'))agRun();else if(e.target.closest('#agStop')&&AG.ctl)AG.ctl.abort()});
  c.addEventListener('change',function(e){if(e.target.id==='agSel'){AG.sel=e.target.value;agRender()}})}
function agInit(){agBind();agLoad();agRender();agStat();try{aplLoad()}catch(e){}}
/* ================= 📜 Ιστορικό ομάδας: όλα όσα κάνουμε, σε μία χρονογραμμή ================= */
var HI={cat:'all',who:'all',days:30,show:10,q:''};
var HI_CAT=[['all','Όλα'],['trade','💼 Συναλλαγές'],['demo','🎯 Demo'],['prof','🎓 Καθηγητής'],['auto','🤖 Αυτόματος'],['agent','🧠 Agent'],['ci','📒 Check-in'],['fun','🍕 Κεράσματα']];
function hiTs(date,time){var d=new Date((date||'1970-01-01')+'T'+(time||'12:00'));return d.getTime()}
function hiDirW(dir){return dir==='short'?'Short':dir==='long'?'Long':''}
function hiRpill(r){return isFinite(r)?'<span class="hir '+(r>0?'pos':r<0?'neg':'')+'">'+fR(r)+'</span>':''}
function hiEvents(){var E=[],add=function(o){if(isFinite(o.at))E.push(o)};
  (S.trades||[]).forEach(function(t){var cl=t.status==='closed',r=n(t.r),pnl=n(t.pnl);
    add({at:hiTs(t.date,t.time),by:t.by,cat:['trade'],ic:'💼',cls:'trade',id:t.id,go:'trade',
      h:'<b>'+esc(hiDirW(t.dir))+' '+esc(t.symbol||'')+'</b>'+(t.strategyId?' · '+esc(stratName(t.strategyId)):'')+(t.account?' · <span class="muted">'+esc(t.account)+'</span>':''),
      sub:cl?('Έκλεισε στο '+fmtPx(n(t.exit))+(isFinite(pnl)?' · '+fE(pnl):'')+(t.rules===false?' · ⚠️ εκτός κανόνων':t.rules===true?' · ✓ με τους κανόνες':'')+(t.emotion?' · '+esc(t.emotion):'')):'Ανοιχτή στο '+fmtPx(n(t.entry)),r:cl&&isFinite(r)?r:NaN,tag:cl?'πραγματική':'ανοιχτή'})});
  (S.demo||[]).forEach(function(t){var src=t.src==='auto'?'auto':t.src==='prof'?'prof':'own',cat=['demo'].concat(src==='own'?[]:[src]),ic=src==='auto'?'🤖':src==='prof'?'🎓':'🎯',tag=src==='auto'?'αυτόματη demo':src==='prof'?'demo Καθηγητή':'demo';
    var hd='<b>'+esc(hiDirW(t.dir))+' '+esc(t.symbol||'')+'</b>'+(t.title?' · '+esc(t.title):'')+(t.auto&&t.auto.tf?' · '+esc(t.auto.tf):'')+(t.auto&&t.auto.sess?' · '+esc(sessInfo(t.auto.sess).t):'');
    add({at:t.at||t.createdAt,by:t.by,cat:cat,ic:ic,cls:src,go:'demo',h:hd,sub:'Άνοιξε στο '+fmtPx(n(t.entry))+' · stop '+fmtPx(n(t.stop))+(t.target?' · στόχος '+fmtPx(n(t.target)):'')+(t.auto&&t.auto.manual?' · εγκρίθηκε από σένα':'')+(t.src==='auto'?' · 🧬 '+apfTagName(t):''),tag:tag+' · άνοιγμα'});
    if(dmClosed(t)){var st=t.status==='win'?'πήρε τον στόχο':t.status==='loss'?'χτύπησε το stop':t.nofill?'έληξε χωρίς να ανοίξει':t.status==='expired'?'έληξε ο χρόνος':'έκλεισε';
      add({at:t.exitAt||t.checkedAt||t.at,by:t.by,cat:cat,ic:t.status==='win'?'✅':t.status==='loss'?'❌':'⏹',cls:src,go:'demo',h:hd,sub:'Η θέση '+st+(isFinite(n(t.pnl))?' · '+dmMoney(n(t.pnl),''):''),r:dmCounts(t)?n(t.r):NaN,tag:tag+' · κλείσιμο'})}});
  (S.confirms||[]).forEach(function(c){add({at:c.at,by:c.by,cat:['prof'],ic:'🎓',cls:'prof',go:'today',h:'Επιβεβαίωση: <b>'+esc(cfTitle(c))+'</b>'+(c.market?' · '+esc(c.market):'')+(c.dir?' · '+esc(hiDirW(c.dir)):''),
    sub:(c.why?esc(String(c.why).slice(0,140)):'')+(c.outcome?' · αποτέλεσμα: '+(c.outcome==='win'?'✅ πέτυχε':c.outcome==='loss'?'❌ απέτυχε':'δεν μπήκε'):''),tag:'Καθηγητής'})});
  (S.props||[]).forEach(function(p){if((S.confirms||[]).some(function(c){return c.id===p.id}))return;add({at:p.at,by:p.by,cat:['prof'],ic:'💬',cls:'prof',go:'prof',h:'Πρόταση: <b>'+esc(p.title||'')+'</b>'+(p.market?' · '+esc(p.market):'')+(p.dir?' · '+esc(hiDirW(p.dir)):''),
    sub:(p.why?esc(String(p.why).slice(0,140)):'')+(p.res&&p.res!=='running'?' · '+(p.res==='win'?'✅ θα κέρδιζε':p.res==='loss'?'❌ θα έχανε':esc(p.res)):''),tag:'πρόταση Καθηγητή'})});
  (S.aplog||[]).forEach(function(d){var at0=hiTs(d.date,'23:59');
    add({at:Math.min(d.last||at0,Date.now()),by:d.by,cat:['auto'],ic:'🤖',cls:'auto',go:'demo',h:'<b>Αυτόματος Καθηγητής</b> · σύνοψη ημέρας',sub:(d.scans||0)+' σαρώσεις · '+(d.opened||0)+' άνοιξαν · '+(d.props||0)+' προτάσεις · '+(d.blocked||0)+' σταμάτησαν από προστασίες',tag:'αυτόματος',sum:true});
    (d.ev||[]).forEach(function(e){if(e.k==='open'||e.k==='scan')return;add({at:e.t,by:d.by,cat:['auto'],ic:{prop:'💡',block:'🛡️',err:'⚠️',lim:'⛔'}[e.k]||'🤖',cls:'auto',go:'demo',h:(e.c?'<b>'+esc(e.c)+'</b> · ':'')+({prop:'πρόταση για έγκριση',block:'σταμάτησε από προστασία',err:'πρόβλημα',lim:'όριο'}[e.k]||e.k),sub:esc(e.m),tag:'αυτόματος'})})});
  (AG.list||[]).forEach(function(a){var r=a.rep||{};add({at:a.at,by:a.by==='daily'?null:a.by,cat:['agent'],ic:'🧠',cls:'agent',go:'agent',h:'<b>Agent στρατηγικών</b> · '+(a.src==='daily'?'καθημερινή αναφορά':'αναφορά'),sub:esc(String(r.summary||'').split(/\.\s/)[0]||''),tag:'Agent'})});
  (FUN.list||[]).forEach(function(f){var all=FUN_T.concat(FUN_P),it=all.find(function(z){return z[0]===f.item});if(!it||String(f.id).indexOf('local')===0)return;add({at:f.at,by:f.by,cat:['fun'],ic:it[1],cls:'prof',h:f.kind==='treat'?'Κέρασε τον Καθηγητή <b>'+esc(it[2].toLowerCase())+'</b>':'«Τιμώρησε» τον Καθηγητή: <b>'+esc(it[2].toLowerCase())+'</b>',sub:f.kind==='treat'?'Ο Καθηγητής το απόλαυσε 😋':'Για λάθος διάγνωση 🤕',tag:'πλάκα'})});
  (S.checkins||[]).forEach(function(c){add({at:hiTs(c.date,c.updatedAt?pad2(new Date(c.updatedAt).getHours())+':'+pad2(new Date(c.updatedAt).getMinutes()):'08:00'),by:c.by,cat:['ci'],ic:'📒',cls:'ci',go:'today',h:'<b>Check-in</b>'+(c.mood?' · '+esc(c.mood):''),sub:esc(String(c.plan||c.review||'').replace(/\s+/g,' ').slice(0,160)),tag:'check-in'})});
  return E.sort(function(a,b){return b.at-a.at})}
function hiRender(){var box=$('#hiList');if(!box)return;var all=hiEvents(),since=HI.days?Date.now()-HI.days*864e5:0,q=HI.q.toLowerCase();
  var us={};all.forEach(function(e){if(e.by)us[e.by]=1});var ws=$('#hi-who');if(ws){var cur=HI.who;ws.innerHTML='<option value="all">Όλα τα μέλη</option>'+Object.keys(us).map(function(u){return '<option value="'+esc(u)+'"'+(u===cur?' selected':'')+'>'+esc(u===S.uid?'Εγώ':name(u))+'</option>'}).join('')}
  var L=all.filter(function(e){return e.at>=since&&(HI.cat==='all'||e.cat.indexOf(HI.cat)>=0)&&(HI.who==='all'||e.by===HI.who)&&(!q||(e.h+' '+e.sub).toLowerCase().indexOf(q)>=0)});
  $$('#hiCats button').forEach(function(b){b.classList.toggle('on',b.dataset.hc===HI.cat)});
  var tr=L.filter(function(e){return e.cls==='trade'&&isFinite(e.r)}),dm=L.filter(function(e){return e.cat.indexOf('demo')>=0&&isFinite(e.r)}),au=L.filter(function(e){return e.cls==='auto'&&isFinite(e.r)});
  $('#hiKpi').innerHTML=kpi('Γεγονότα',String(L.length),HI.days?'τελευταίες '+HI.days+' μέρες':'όλο το διάστημα')+kpi('Πραγματικές (κλειστές)',String(tr.length),tr.length?fR(sum(tr.map(function(e){return e.r}))):'',cls(sum(tr.map(function(e){return e.r}))))+kpi('Demo (κλειστές)',String(dm.length),dm.length?fR(sum(dm.map(function(e){return e.r}))):'',cls(sum(dm.map(function(e){return e.r}))))+kpi('Αυτόματες (κλειστές)',String(au.length),au.length?fR(sum(au.map(function(e){return e.r}))):'',cls(sum(au.map(function(e){return e.r}))));
  if(!L.length){box.innerHTML='<div class="empty">Δεν υπάρχει τίποτα για αυτά τα φίλτρα.</div>';$('#hiMore').hidden=true;return}
  var byDay={},order=[];L.forEach(function(e){var k=lday(new Date(e.at));if(!byDay[k]){byDay[k]=[];order.push(k)}byDay[k].push(e)});
  var tdy=lday(new Date()),yst=lday(new Date(Date.now()-864e5)),days=order.slice(0,HI.show);
  box.innerHTML=days.map(function(k){var es=byDay[k],rs=es.filter(function(e){return isFinite(e.r)}),rr=sum(rs.map(function(e){return e.r}));
    return '<section class="hiday"><div class="hidh"><b>'+(k===tdy?'Σήμερα':k===yst?'Χθες':esc(dateGr(k)))+'</b><span class="muted">'+es.length+' γεγονότα'+(rs.length?' · '+rs.length+' κλειστές '+hiRpill(rr):'')+'</span></div><ol class="hitl">'+
      es.map(function(e){var d=new Date(e.at);return '<li class="hi-'+e.cls+(e.sum?' hisum':'')+'"'+(e.go?' data-higo="'+e.go+'"'+(e.id?' data-hiid="'+esc(e.id)+'"':''):'')+' tabindex="0"><span class="hic">'+e.ic+'</span><div class="hib"><div class="hih">'+e.h+'</div>'+(e.sub?'<div class="his">'+e.sub+'</div>':'')+'<div class="him">'+pad2(d.getHours())+':'+pad2(d.getMinutes())+(e.by?' · '+esc(e.by===S.uid?'Εγώ':name(e.by)):'')+' · <span>'+esc(e.tag||'')+'</span></div></div>'+(isFinite(e.r)?hiRpill(e.r):'')+'</li>'}).join('')+'</ol></section>'}).join('');
  $('#hiMore').hidden=order.length<=HI.show;$('#hiMore').textContent='Παλαιότερες μέρες ('+(order.length-HI.show)+')'}
function hiBind(){var c=$('#hiCard');if(!c||c.dataset.b)return;c.dataset.b='1';
  $('#hiCats').innerHTML=HI_CAT.map(function(x){return '<button type="button" data-hc="'+x[0]+'">'+esc(x[1])+'</button>'}).join('');
  c.addEventListener('click',function(e){var b=e.target.closest('[data-hc]');if(b){HI.cat=b.dataset.hc;HI.show=10;hiRender();return}
    if(e.target.closest('#hiMore')){HI.show+=10;hiRender();return}
    var it=e.target.closest('[data-higo]');if(it){var g=it.dataset.higo;if(g==='trade'&&it.dataset.hiid){showTab('trades');loadTrade(it.dataset.hiid);setTimeout(function(){$('#tradeForm').scrollIntoView({block:'start',behavior:'smooth'})},60)}else if(g==='demo')showTab('demo');else if(g==='agent'){showTab('today');setTimeout(function(){var a=$('#agCard');if(a)a.scrollIntoView({block:'start',behavior:'smooth'})},60)}else if(g==='prof'){try{QZ.tab='props';profOpen(true)}catch(x){}}else showTab('today')}});
  c.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.closest('[data-higo]'))e.target.click()});
  c.addEventListener('change',function(e){if(e.target.id==='hi-who'){HI.who=e.target.value;HI.show=10;hiRender()}else if(e.target.id==='hi-days'){HI.days=+e.target.value;HI.show=10;hiRender()}});
  c.addEventListener('input',function(e){if(e.target.id==='hi-q'){HI.q=e.target.value;clearTimeout(HI.t);HI.t=setTimeout(hiRender,200)}})}
function aplLoad(){if(!S.db||HI.sub)return;try{HI.sub=S.db.collection('aplog').orderBy('date','desc').limit(150).onSnapshot(function(sn){S.aplog=sn.docs.map(function(d){return Object.assign({id:d.id},d.data())});hiRender()},function(){})}catch(e){}}
function hiInit(){hiBind();aplLoad();hiRender()}
/* ================= 📰 Ειδήσεις: συνεχής έλεγχος, σημαντικές ειδήσεις και οικονομικό ημερολόγιο ================= */
var NW={items:[],cal:[],at:0,timer:null,busy:false,show:'imp',popQ:[]};
var NW_KW=[[/\b(etf)s?\b/i,3,'ETF'],[/\b(sec|cftc)\b/i,3,'ρυθμιστικές αρχές'],[/\b(fed|fomc|powell|rate (cut|hike)|interest rate)/i,4,'Fed / επιτόκια'],[/\b(cpi|inflation|jobs report|nonfarm|payrolls|gdp)\b/i,3,'μακροοικονομικά'],
  [/\b(hack(ed)?|exploit(ed)?|breach|drained|stolen)\b/i,4,'hack'],[/\b(halt(s|ed)? (withdrawals|trading)|insolven|bankrupt)/i,5,'πρόβλημα ανταλλακτηρίου'],[/\b(blackrock|fidelity|vanguard|microstrategy|strategy inc)\b/i,2,'μεγάλοι θεσμικοί'],
  [/\b(ban(s|ned)?|lawsuit|sue[sd]?|charged|indict)/i,3,'νομικά'],[/\b(approv(e|es|ed|al)|reject(s|ed)?)\b/i,2,'έγκριση / απόρριψη'],[/\b(liquidat(ion|ed)s?)\b/i,3,'ρευστοποιήσεις'],[/\b(tariff|sanction|war|strike[sd]?)\b/i,3,'γεωπολιτικά'],
  [/\b(all[- ]time high|record high|ath)\b/i,3,'νέο ρεκόρ'],[/\b(crash(es|ed)?|plunge[sd]?|soar(s|ed)?|surge[sd]?|tumble[sd]?|rall(y|ies|ied))\b/i,2,'μεγάλη κίνηση'],[/\b(tether|usdt|stablecoin)\b/i,2,'stablecoins'],
  [/\b(list(s|ing|ed)|delist(s|ing|ed)?)\b/i,1,'listing'],[/\b(unlock|halving)\b/i,2,'προσφορά'],[/\$\s?\d+(\.\d+)?\s?(b|bn|billion)\b|\bbillion\b/i,2,'δισεκατομμύρια'],[/\b(trump|white house|congress|senate)\b/i,2,'πολιτική ΗΠΑ']];
var NW_COINS=[[/\b(bitcoin|btc)\b/i,'BTC',2],[/\b(ethereum|eth|ether)\b/i,'ETH',2],[/\b(solana|sol)\b/i,'SOL',1],[/\b(xrp|ripple)\b/i,'XRP',1],[/\b(doge(coin)?)\b/i,'DOGE',1],[/\b(bnb|binance)\b/i,'BNB',1],[/\b(chainlink|link)\b/i,'LINK',1],[/\b(avalanche|avax)\b/i,'AVAX',1]];
function nwScore(a){var t=String(a.title||''),s=0,why=[],coins=[];NW_KW.forEach(function(k){if(k[0].test(t)){s+=k[1];why.push(k[2])}});NW_COINS.forEach(function(k){if(k[0].test(t)){s+=k[2];coins.push(k[1])}});
  if(!coins.length&&s<4)s-=1;return {s:s,why:why,coins:coins}}
function nwMerge(list){var m={};NW.items.concat(list).forEach(function(a){if(!a||!a.title)return;var k=(a.url||a.title).slice(0,300);if(!m[k])m[k]=a});
  var L=Object.keys(m).map(function(k){return m[k]}).filter(function(a){return Date.now()-Date.parse(a.postedAt||0)<3*864e5}).sort(function(a,b){return Date.parse(b.postedAt)-Date.parse(a.postedAt)}).slice(0,80);
  L.forEach(function(a){var sc=nwScore(a);a.s=sc.s;a.why=sc.why;a.coins=sc.coins});
  /* ίδιο θέμα από 2+ πηγές μέσα σε 3 ώρες = πιο σημαντικό */
  L.forEach(function(a){if(!a.why.length)return;var n2=L.filter(function(b){return b!==a&&b.source!==a.source&&Math.abs(Date.parse(b.postedAt)-Date.parse(a.postedAt))<3*36e5&&b.why.some(function(w){return a.why.indexOf(w)>=0})&&b.coins.some(function(c){return a.coins.indexOf(c)>=0})}).length;if(n2){a.s+=Math.min(3,n2);a.multi=n2+1}});
  L.forEach(function(a){a.imp=a.s>=6?2:a.s>=4?1:0});NW.items=L}
function nwLoad(force){if(NW.busy)return;clearTimeout(NW.timer);NW.timer=setTimeout(function(){nwLoad()},10*60000);
  if(!CG.mcp){nwShared();return}if(!force&&Date.now()-NW.at<9*60000)return;NW.busy=true;
  var call=function(inp){return CG.mcp.callTool('CoinGecko','get-crypto-news',inp,{cache:{staleTime:300000,gcTime:1800000}}).then(function(r){var p=r&&r.payload;return (p&&p.articles)||[]}).catch(function(e){NW.err=(e&&e.code)||'error';return []})};
  Promise.all([call({limit:20}),call({coinId:'bitcoin',limit:10}),call({coinId:'ethereum',limit:8})]).then(function(rs){var all=[].concat.apply([],rs);NW.busy=false;if(!all.length){nwShared();return}NW.at=Date.now();NW.err=null;nwMerge(all);nwSave();nwRender();nwAlert()}).catch(function(){NW.busy=false})}
function nwSave(){if(!S.db||!qCanSave())return;if(NW.savedAt&&Date.now()-NW.savedAt<15*60000)return;NW.savedAt=Date.now();var it=NW.items.slice(0,40).map(function(a){return {title:String(a.title).slice(0,300),url:String(a.url||'').slice(0,500),source:String(a.source||'').slice(0,60),postedAt:a.postedAt}});
  S.db.collection('news').doc('feed').get().then(function(sn){var old=sn.exists&&sn.data()||{};if(old.at&&Date.now()-old.at<10*60000)return;return S.db.collection('news').doc('feed').set({at:Date.now(),items:it})}).catch(function(){})}
function nwShared(){if(!S.db)return;S.db.collection('news').doc('feed').get().then(function(sn){var d=sn.exists&&sn.data();if(d&&d.items&&d.at>NW.at){NW.at=d.at;nwMerge(d.items);nwRender();nwAlert()}}).catch(function(){})}
function nwCal(){if(!S.db||NW.calSub)return;try{NW.calSub=S.db.collection('news').doc('calendar').onSnapshot(function(sn){var d=sn.exists&&sn.data();NW.cal=((d&&d.events)||[]).filter(function(e){return e&&e.at&&e.title}).sort(function(a,b){return Date.parse(a.at)-Date.parse(b.at)});NW.calAt=d&&d.at;nwRender();nwCalAlert()},function(){})}catch(e){}}
function nwSeen(){try{return JSON.parse(localStorage.getItem('tj-nwseen')||'{}')||{}}catch(e){return {}}}
function nwMark(k){var m=nwSeen(),now=Date.now();m[k]=now;Object.keys(m).forEach(function(x){if(now-m[x]>5*864e5)delete m[x]});try{localStorage.setItem('tj-nwseen',JSON.stringify(m))}catch(e){}}
function nwPrep(a){var c=a.coins.length?a.coins.join(', '):'όλη την αγορά crypto',w=a.why;
  var t='Μπορεί να φέρει απότομες κινήσεις σε '+c+'. Πριν ανοίξεις: μικρότερη ποσότητα, stop πάντα στη θέση του, και περίμενε να κλείσει 1-2 κεριά μετά την είδηση πριν μπεις.';
  if(w.indexOf('hack')>=0||w.indexOf('πρόβλημα ανταλλακτηρίου')>=0)t+=' Αν έχεις κεφάλαια στο ανταλλακτήριο που αναφέρεται, έλεγξέ τα.';return t}
function nwAlert(){var seen=nwSeen(),fresh=NW.items.filter(function(a){return a.imp>=2&&Date.now()-Date.parse(a.postedAt)<4*36e5&&!seen['n|'+(a.url||a.title)]});
  if(!fresh.length)return;var a=fresh[0];nwMark('n|'+(a.url||a.title));nwPop({ic:'📰',head:'Σημαντική είδηση'+(a.multi?' · από '+a.multi+' πηγές':''),title:a.title,meta:(a.source||'')+' · '+nwAgo(a.postedAt),prep:nwPrep(a),url:a.url})}
function nwCalAlert(){var seen=nwSeen(),now=Date.now();NW.cal.forEach(function(e){var t=Date.parse(e.at),k='c|'+e.at+'|'+e.title;if(e.impact!=='high'||seen[k])return;if(t-now<=75*60000&&t-now>-15*60000){nwMark(k);nwPop({ic:'📅',head:(t>now?'Σε '+Math.max(1,Math.round((t-now)/60000))+' λεπτά':'Μόλις τώρα')+' · σημαντικό γεγονός',title:e.title,meta:new Date(t).toLocaleString('el-GR',{weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}),prep:(e.note?e.note+' ':'')+'Τέτοιες ανακοινώσεις φέρνουν συχνά απότομες κινήσεις και στα crypto. Καλύτερα να μην ανοίξεις νέα θέση από 30 λεπτά πριν μέχρι 1 ώρα μετά, και σφίξε τα stops στις ανοιχτές.'})}})}
function nwPop(o){var el=$('#nwPop');if(!el)return;NW.popQ.push(o);if(!el.hidden)return;nwPopNext()}
function nwPopNext(){var el=$('#nwPop'),o=NW.popQ.shift();if(!o){el.hidden=true;return}
  el.innerHTML='<button type="button" class="x" aria-label="Κλείσιμο">×</button><div class="nwph">'+o.ic+' <b>'+esc(o.head)+'</b></div><div class="nwpt">'+esc(o.title)+'</div><div class="nwpm">'+esc(o.meta||'')+'</div><div class="nwpp"><b>Προετοιμασία:</b> '+esc(o.prep||'')+'</div><div class="row" style="gap:.4rem;margin-top:.5rem">'+(o.url?'<a class="btn small" href="'+esc(o.url)+'" target="_blank" rel="noopener noreferrer">Διάβασέ την</a>':'')+'<button type="button" class="btn small primary" data-nwgo>Όλες οι ειδήσεις</button></div>';
  el.hidden=false;try{grpPing()}catch(e){}}
function nwAgo(s){var m=Math.round((Date.now()-Date.parse(s))/60000);return m<1?'τώρα':m<60?'πριν '+m+'′':m<1440?'πριν '+Math.floor(m/60)+' ώ':'πριν '+Math.floor(m/1440)+' μ'}
function nwRender(){var box=$('#nwList');if(!box)return;var L=NW.items.filter(function(a){return NW.show==='all'||a.imp>=1}).slice(0,NW.show==='all'?30:12);
  $$('#nwCard [data-nws]').forEach(function(b){b.classList.toggle('on',b.dataset.nws===NW.show)});
  var st=$('#nwStat');if(st)st.textContent=NW.at?'Ενημέρωση '+nwAgo(new Date(NW.at).toISOString())+' · κάθε 10 λεπτά όσο η σελίδα είναι ανοιχτή':(CG.mcp?'Φορτώνει…':'Οι ειδήσεις έρχονται από όποιο μέλος έχει τη σύνδεση CoinGecko.');
  box.innerHTML=L.length?'<ul class="nwl">'+L.map(function(a){return '<li class="'+(a.imp>=2?'hot':a.imp?'imp':'')+'"><div class="nwt"><a href="'+esc(a.url||'#')+'" target="_blank" rel="noopener noreferrer">'+esc(a.title)+'</a></div><div class="nwm">'+(a.imp>=2?'<span class="pill loss">🔥 πολύ σημαντική</span> ':a.imp?'<span class="pill warn">σημαντική</span> ':'')+(a.coins.length?'<span class="pill">'+esc(a.coins.join(' · '))+'</span> ':'')+(a.why.length?'<span class="muted">'+esc(a.why.slice(0,3).join(', '))+'</span> · ':'')+'<span class="muted">'+esc(a.source||'')+' · '+nwAgo(a.postedAt)+(a.multi?' · '+a.multi+' πηγές':'')+'</span></div></li>'}).join('')+'</ul>':'<div class="empty">'+(NW.items.length?'Καμία σημαντική είδηση αυτή τη στιγμή. Πάτα «Όλες» για όλα τα νέα.':'Δεν έχουν έρθει ακόμα ειδήσεις.')+'</div>';
  var cb=$('#nwCal');if(cb){var up=NW.cal.filter(function(e){return Date.parse(e.at)>Date.now()-60*60000}).slice(0,8);
    cb.innerHTML=up.length?'<ul class="nwcal">'+up.map(function(e){var d=new Date(Date.parse(e.at)),soon=Date.parse(e.at)-Date.now()<24*36e5;return '<li'+(soon?' class="soon"':'')+'><span class="nwcd">'+esc(d.toLocaleDateString('el-GR',{weekday:'short',day:'numeric',month:'numeric'}))+'<b>'+pad2(d.getHours())+':'+pad2(d.getMinutes())+'</b></span><span>'+(e.impact==='high'?'<span class="pill loss">υψηλή επίδραση</span> ':'<span class="pill">μέτρια</span> ')+esc(e.title)+(e.note?'<br><span class="muted" style="font-size:.8rem">'+esc(e.note)+'</span>':'')+'</span></li>'}).join('')+'</ul>':'<div class="empty" style="padding:.7rem">Το ημερολόγιο ενημερώνεται κάθε πρωί από τον καθημερινό έλεγχο.</div>'}}
function nwBlockNow(){var now=Date.now(),e=(NW.cal||[]).find(function(x){var t=Date.parse(x.at);return x.impact==='high'&&now>t-30*60000&&now<t+60*60000});return e?'σημαντικό γεγονός κοντά: '+e.title:''}
function nwInit(){var c=$('#nwCard');if(c&&!c.dataset.b){c.dataset.b='1';c.addEventListener('click',function(e){var b=e.target.closest('[data-nws]');if(b){NW.show=b.dataset.nws;nwRender()}if(e.target.closest('#nwRef'))nwLoad(true)})}
  var p=$('#nwPop');if(p&&!p.dataset.b){p.dataset.b='1';p.addEventListener('click',function(e){if(e.target.closest('.x')){nwPopNext();return}if(e.target.closest('[data-nwgo]')){nwPopNext();showTab('today');setTimeout(function(){var k=$('#nwCard');if(k)k.scrollIntoView({block:'start',behavior:'smooth'})},60)}})}
  nwCal();nwRender();nwLoad(true);setInterval(function(){try{nwCalAlert()}catch(e){}},60000)}
/* ================= 🍕 Κέρασμα και 🏏 «τιμωρία» για τον Καθηγητή (για πλάκα) ================= */
var FUN={list:[],sub:null,open:false};
var FUN_T=[['pizza','🍕','Πίτσα'],['hotdog','🌭','Hot dog'],['icecream','🍦','Παγωτό'],['coffee','☕','Καφές'],['souvlaki','🥙','Σουβλάκι'],['donut','🍩','Ντόνατ'],['beer','🍺','Μπίρα'],['cake','🎂','Τούρτα']];
var FUN_P=[['slap','👋','Σφαλιάρα'],['stick','🪵','Ξύλο'],['bat','🏏','Ρόπαλο'],['water','💦','Κουβάς νερό'],['tomato','🍅','Ντομάτα'],['pie','🥧','Τούρτα στη μούρη'],['shoe','🩴','Παντόφλα']];
var FUN_SAY={pizza:['Μμμ, πίτσα! Τώρα αναλύω με γεμάτο στομάχι 🍕','Πίτσα; Μόλις κέρδισες +1R στην εκτίμησή μου!','Η καλύτερη στρατηγική: πίτσα με διπλό τυρί.'],hotdog:['Hot dog! Γρήγορο σαν scalping 🌭','Νόστιμο! Σαν breakout που πιάνει στόχο.'],icecream:['Παγωτό! Ψύχραιμος σαν τον Mark Douglas 🍦','Δροσιά! Τώρα μπορώ να αντέξω και drawdown.'],
  coffee:['Καφεδάκι! Ξύπνησα για τη Νέα Υόρκη ☕','Με αυτόν τον καφέ βλέπω και τα FVG πιο καθαρά.'],souvlaki:['Σουβλάκι με απ\' όλα! Ο Καθηγητής είναι ευτυχισμένος 🥙','Ελληνικό backtest: 100% επιτυχία στη γεύση.'],donut:['Ντόνατ! Στρογγυλό σαν double bottom 🍩'],beer:['Μία μπίρα μόνο, μετά το κλείσιμο της αγοράς 🍺','Γεια μας! Αλλά ρίσκο 1%, όχι 10%.'],cake:['Τούρτα; Γιορτάζουμε νέο ρεκόρ; 🎂'],
  slap:['Άουτς! Εντάξει, εντάξει, θα το ξαναελέγξω…','Αχ! Το άξιζα, το stop ήταν στραβό.'],stick:['Ωχ! Με ξύλο έμαθα κι εγώ τη διαχείριση ρίσκου…','Άουτς! Υπόσχομαι πιο προσεκτική ανάλυση.'],bat:['ΜΠΑΜ! Είδα αστεράκια… και ένα καινούργιο support.','Ωχχχ! Home run στο κεφάλι μου!'],
  water:['Μπρρρ! Ξύπνησα, ξύπνησα!','Τώρα είμαι κυριολεκτικά liquid. Θα ξανακοιτάξω.'],tomato:['Πλατς! Έγινα κόκκινος σαν κερί πτώσης 🍅'],pie:['Φλατς! Τουλάχιστον ήταν νόστιμη…'],shoe:['Η παντόφλα της γιαγιάς! Αυτό πονάει περισσότερο από margin call.']};
function funTarget(){var p=$('#profPanel');if(p&&!p.hidden){var m=$('#profMini');if(m&&m.offsetParent)return m}var b=$('#profBtn');return b&&b.offsetParent?b:null}
function funSound(kind){try{var A=window.AudioContext||window.webkitAudioContext;if(!A)return;var c=FUN.ac||(FUN.ac=new A());if(c.state==='suspended')c.resume();var t=c.currentTime,g=c.createGain();g.connect(c.destination);
  if(kind==='treat'){[523,659,784].forEach(function(f,i){var o=c.createOscillator(),gg=c.createGain();o.type='triangle';o.frequency.value=f;gg.gain.setValueAtTime(0.0001,t+i*0.09);gg.gain.exponentialRampToValueAtTime(0.1,t+i*0.09+0.02);gg.gain.exponentialRampToValueAtTime(0.0001,t+i*0.09+0.2);o.connect(gg);gg.connect(c.destination);o.start(t+i*0.09);o.stop(t+i*0.09+0.22)});return}
  var len=kind==='water'?0.6:0.18,buf=c.createBuffer(1,Math.floor(c.sampleRate*len),c.sampleRate),d=buf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,kind==='water'?1:3);
  var s=c.createBufferSource(),f=c.createBiquadFilter();s.buffer=buf;f.type=kind==='water'?'highpass':'lowpass';f.frequency.value=kind==='water'?1200:900;g.gain.value=kind==='water'?0.25:0.5;s.connect(f);f.connect(g);s.start(t)}catch(e){}}
function funFly(emo,from,to,done){var a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),el=document.createElement('span');el.className='funfly';el.textContent=emo;document.body.appendChild(el);
  var x0=a.left+a.width/2,y0=a.top+a.height/2,x1=b.left+b.width/2,y1=b.top+b.height*0.38,mx=(x0+x1)/2,my=Math.min(y0,y1)-120;
  if(!el.animate||matchMedia('(prefers-reduced-motion: reduce)').matches){el.remove();done();return}
  var an=el.animate([{transform:'translate('+x0+'px,'+y0+'px) scale(.6) rotate(0deg)'},{transform:'translate('+mx+'px,'+my+'px) scale(1.4) rotate(200deg)',offset:.55},{transform:'translate('+x1+'px,'+y1+'px) scale(1) rotate(360deg)'}],{duration:750,easing:'cubic-bezier(.3,.7,.4,1)'});
  an.onfinish=function(){el.remove();done(x1,y1)}}
function funBurst(x,y,chars,n,spread,fall){for(var i=0;i<n;i++){(function(){var el=document.createElement('span');el.className='funfly small';el.textContent=chars[Math.floor(Math.random()*chars.length)];document.body.appendChild(el);
  var dx=(Math.random()-.5)*spread,dy=fall?60+Math.random()*90:-(40+Math.random()*70);if(!el.animate){el.remove();return}
  el.animate([{transform:'translate('+x+'px,'+y+'px) scale(.4)',opacity:1},{transform:'translate('+(x+dx)+'px,'+(y+dy)+'px) scale(1)',opacity:0}],{duration:900+Math.random()*500,easing:'ease-out'}).onfinish=function(){el.remove()}})()}}
function funGive(kind,id,src){var L=kind==='treat'?FUN_T:FUN_P,it=L.find(function(x){return x[0]===id});if(!it)return;var to=funTarget(),from=src||$('#funBtn')||to;funMenu(false);
  var after=function(x,y){var lines=FUN_SAY[id]||['…'],say=lines[Math.floor(Math.random()*lines.length)];
    if(to){if(x==null){var r=to.getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height*0.38}
      if(kind==='treat'){funBurst(x,y,['❤️','😋','✨','⭐'],10,140,false);to.classList.remove('funhit');void to.offsetWidth;to.classList.add('funyum')}
      else if(id==='water'){funBurst(x,y-30,['💧','💦'],16,120,true);to.classList.remove('funyum');void to.offsetWidth;to.classList.add('funwet')}
      else{funBurst(x,y,['💥','⭐','💫'],8,110,false);to.classList.remove('funyum');void to.offsetWidth;to.classList.add('funhit');if(id==='tomato'||id==='pie'){var sp=document.createElement('span');sp.className='funsplat';sp.textContent=id==='tomato'?'🍅':'🥧';to.appendChild(sp);setTimeout(function(){sp.remove()},4000)}}
      setTimeout(function(){to.classList.remove('funyum','funhit','funwet')},1600)}
    funSound(kind==='treat'?'treat':id==='water'?'water':'hit');profMood(kind==='treat'?'cheer':'sad');
    if($('#profPanel').hidden)profSay(say);else{var n=$('#pNote');if(n)n.textContent=it[1]+' '+say}
    if(kind==='punish'){PCH.punished=Date.now();if(QZ.tab==='chat'&&!$('#profPanel').hidden)renderChat()}
    var d={by:S.uid||'me',at:Date.now(),date:lday(new Date()),kind:kind,item:id};FUN.list=[Object.assign({id:'local'+Date.now()},d)].concat(FUN.list);funMenuStat();if(S.db&&qCanSave())put('fun',newId(),d).catch(function(){})};
  if(to)funFly(it[1],from,to,after);else after()}
function funToday(){var td=lday(new Date()),L=FUN.list.filter(function(x){return x.date===td}),c={};L.forEach(function(x){c[x.item]=(c[x.item]||0)+1});return {L:L,c:c}}
function funMenuStat(){var el=$('#funStat');if(!el)return;var T=funToday(),all=FUN_T.concat(FUN_P),s=Object.keys(T.c).map(function(k){var it=all.find(function(x){return x[0]===k});return (it?it[1]:'')+'×'+T.c[k]}).join(' ');
  var tr=T.L.filter(function(x){return x.kind==='treat'}).length,pu=T.L.length-tr;el.textContent=T.L.length?'Σήμερα: '+s+' · διάθεση: '+(tr>pu?'😋 χαρούμενος':tr<pu?'🤕 πονεμένος':'😐 μπερδεμένος'):'Σήμερα ακόμα τίποτα. Πεινάει…'}
function funMenu(on,anchor){var m=$('#funMenu');if(!m)return;FUN.open=on===undefined?!FUN.open:on;m.hidden=!FUN.open;if(FUN.open){funMenuStat();var a=(anchor||$('#funBtn')).getBoundingClientRect(),w=Math.min(320,innerWidth-16);m.style.width=w+'px';m.style.left=Math.max(8,Math.min(innerWidth-w-8,a.right-w))+'px';var h=m.offsetHeight;m.style.top=Math.max(8,a.top-h-8)+'px';FUN.anchor=anchor||$('#funBtn')}}
function funInit(){var m=$('#funMenu');if(!m||m.dataset.b)return;m.dataset.b='1';
  m.innerHTML='<div class="funh">🍽️ Κέρασε τον Καθηγητή</div><div class="fung">'+FUN_T.map(function(x){return '<button type="button" data-fun="treat|'+x[0]+'" title="'+esc(x[2])+'"><span>'+x[1]+'</span><small>'+esc(x[2])+'</small></button>'}).join('')+'</div><div class="funh">😤 Έκανε λάθος διάγνωση;</div><div class="fung">'+FUN_P.map(function(x){return '<button type="button" data-fun="punish|'+x[0]+'" title="'+esc(x[2])+'"><span>'+x[1]+'</span><small>'+esc(x[2])+'</small></button>'}).join('')+'</div><div class="funst" id="funStat"></div>';
  document.addEventListener('click',function(e){var f=e.target.closest&&e.target.closest('[data-fun]');if(f){var p=f.getAttribute('data-fun').split('|');funGive(p[0],p[1],FUN.anchor);return}
    var b=e.target.closest&&e.target.closest('#funBtn,[data-funopen]');if(b){e.stopPropagation();funMenu(undefined,b);return}
    if(FUN.open&&!(e.target.closest&&e.target.closest('#funMenu')))funMenu(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&FUN.open)funMenu(false)});
  if(S.db&&!FUN.sub){try{FUN.sub=S.db.collection('fun').orderBy('at','desc').limit(200).onSnapshot(function(sn){FUN.list=sn.docs.map(function(d){return Object.assign({id:d.id},d.data())});funMenuStat()},function(){})}catch(e){}}}
/* ================= 📊 Επισκόπηση λογαριασμού (σαν πορτοφόλι ανταλλακτηρίου) ================= */
var PF={per:{me:'30',prof:'30'},sel:null};var PF_COL=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#6250d6','#e34948','#008300'];
function pfDark(){return document.documentElement.getAttribute('data-theme')==='dark'||(!document.documentElement.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches)}
function pfMoney(x,ccy){return isFinite(x)?(x>0?'+':x<0?'−':'')+fmt(Math.abs(x),2)+' '+ccy:'–'}
function pfDonut(segs,center,sub){var R=62,r=44,C=2*Math.PI,tot=sum(segs.map(function(s){return s.v})),a0=-Math.PI/2,h='',gap=segs.length>1?0.025:0;
  if(!(tot>0))return '<svg viewBox="0 0 160 160" class="pfdonut"><circle cx="80" cy="80" r="53" fill="none" stroke="var(--line)" stroke-width="18"/><text x="80" y="78" text-anchor="middle" class="pfdc">'+esc(center)+'</text><text x="80" y="96" text-anchor="middle" class="pfds">'+esc(sub)+'</text></svg>';
  segs.forEach(function(s){var f=s.v/tot,a1=a0+f*C;if(f>=0.999){h+='<circle cx="80" cy="80" r="53" fill="none" stroke="'+s.c+'" stroke-width="18"><title>'+esc(s.l)+': '+esc(s.t)+'</title></circle>';a0=a1;return}
    var b0=a0+gap/2,b1=Math.max(b0+0.001,a1-gap/2),lg=b1-b0>Math.PI?1:0,p=function(rad,a){return (80+rad*Math.cos(a)).toFixed(2)+' '+(80+rad*Math.sin(a)).toFixed(2)};
    h+='<path d="M'+p(R,b0)+' A'+R+' '+R+' 0 '+lg+' 1 '+p(R,b1)+' L'+p(r,b1)+' A'+r+' '+r+' 0 '+lg+' 0 '+p(r,b0)+'Z" fill="'+s.c+'" class="pfseg"><title>'+esc(s.l)+': '+esc(s.t)+' ('+fmt(f*100,1)+'%)</title></path>';a0=a1});
  return '<svg viewBox="0 0 160 160" class="pfdonut" role="img" aria-label="Κατανομή κεφαλαίου">'+h+'<text x="80" y="78" text-anchor="middle" class="pfdc">'+esc(center)+'</text><text x="80" y="96" text-anchor="middle" class="pfds">'+esc(sub)+'</text></svg>'}
function pfLine(pts,ccy){if(pts.length<2)return '<div class="empty" style="padding:1rem">Χρειάζονται 2+ κλειστές συναλλαγές για καμπύλη.</div>';
  var W=520,H=150,pl=8,pr=8,pt=12,pb=18,xs=pts.map(function(p){return p.t}),ys=pts.map(function(p){return p.v}),x0=Math.min.apply(null,xs),x1=Math.max.apply(null,xs),y0=Math.min(0,Math.min.apply(null,ys)),y1=Math.max(0,Math.max.apply(null,ys));if(y1===y0)y1=y0+1;if(x1===x0)x1=x0+1;
  var X=function(t){return pl+(t-x0)/(x1-x0)*(W-pl-pr)},Y=function(v){return pt+(y1-v)/(y1-y0)*(H-pt-pb)},last=ys[ys.length-1],col=last>=0?'var(--gain)':'var(--loss)';
  var d=pts.map(function(p,i){return (i?'L':'M')+X(p.t).toFixed(1)+' '+Y(p.v).toFixed(1)}).join(' ');
  var area=d+' L'+X(x1).toFixed(1)+' '+Y(0).toFixed(1)+' L'+X(x0).toFixed(1)+' '+Y(0).toFixed(1)+'Z';
  return '<svg viewBox="0 0 '+W+' '+H+'" class="pfline" preserveAspectRatio="none" role="img" aria-label="Σωρευτικό PnL"><line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)" stroke-dasharray="3 4"/><path d="'+area+'" fill="'+col+'" opacity=".12"/><path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>'+
    pts.map(function(p){return '<circle cx="'+X(p.t).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="7" fill="transparent"><title>'+esc(new Date(p.t).toLocaleString('el-GR',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' · '+(p.lbl||'')+' · σύνολο '+pfMoney(p.v,ccy))+'</title></circle>'}).join('')+'</svg>'}
function pfBars(days,ccy){var mx=Math.max.apply(null,days.map(function(d){return Math.abs(d.v)}).concat([1e-9])),W=520,H=110,bw=(W-8)/days.length,mid=H/2;
  return '<svg viewBox="0 0 '+W+' '+H+'" class="pfbars" preserveAspectRatio="none" role="img" aria-label="PnL ανά ημέρα"><line x1="0" x2="'+W+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/>'+days.map(function(d,i){var h=Math.abs(d.v)/mx*(mid-6),x=4+i*bw+bw*0.18,w=Math.max(2,bw*0.64);
    return '<g><rect x="'+(4+i*bw)+'" y="0" width="'+bw+'" height="'+H+'" fill="transparent"><title>'+esc(dateGr(d.k)+' · '+pfMoney(d.v,ccy)+' · '+d.n+' συναλλαγές')+'</title></rect>'+(d.n?'<rect x="'+x.toFixed(1)+'" y="'+(d.v>=0?mid-h:mid).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(1.5,h).toFixed(1)+'" rx="2" fill="'+(d.v>=0?'var(--gain)':'var(--loss)')+'" pointer-events="none"/>':'')+'</g>'}).join('')+'</svg>'}
function renderPf(){var e2=$('#profPort');if(e2){e2.innerHTML=pfHtml(PROF,'prof');try{var ph=pxHtml(),k=ph.indexOf('<div class="pxbox">');$('#profStat').innerHTML=ph.slice(0,k);$('#profExtra').innerHTML=ph.slice(k)}catch(x){console.error(x)}}}
function pfHtml(uid,key){var per=PF.per[key]||'30',a=dmAcct(uid),ccy=a.ccy,bal=dmBal(uid),L=dmOf(uid).filter(function(t){return (t.at||0)>=a.resetAt&&!apfOff(t)});
  var op=L.filter(function(t){return !dmClosed(t)}),run=op.filter(function(t){return !dmIsPend(t)}),pend=op.filter(dmIsPend);
  var unr=sum(run.map(function(t){var lv=dmLiveR(t),cr=lv?lv.r:n(t.curR);return isFinite(cr)?cr*n(t.riskAmt):0})),used=sum(op.map(function(t){return n(t.margin)||n(t.notional)||0})),eq=bal+unr,avail=bal-used,mr=eq>0?used/eq:NaN;
  var days=per==='all'?36500:+per,since=Date.now()-days*864e5,C=L.filter(function(t){return dmCounts(t)&&(t.exitAt||t.at||0)>=since}).sort(function(x,y){return (x.exitAt||x.at)-(y.exitAt||y.at)});
  var pn=C.map(function(t){return n(t.pnl)||0}),W=pn.filter(function(v){return v>0}),Ls=pn.filter(function(v){return v<0}),real=sum(pn),gw=sum(W),gl=-sum(Ls),pf=gl>0?gw/gl:(gw>0?Infinity:NaN);
  var cum=0,peak=0,dd=0,pts=C.map(function(t){cum+=n(t.pnl)||0;peak=Math.max(peak,cum);dd=Math.min(dd,cum-peak);return {t:t.exitAt||t.at,v:cum,lbl:dmSym(t.symbol)+' '+pfMoney(n(t.pnl),ccy)}});if(pts.length)pts.unshift({t:pts[0].t-36e5,v:0,lbl:'αρχή'});
  var hold=C.filter(function(t){return t.exitAt&&t.at}).map(function(t){return t.exitAt-t.at}),avgH=hold.length?avg(hold)/36e5:NaN;
  var lg=C.filter(function(t){return t.dir!=='short'}),sh=C.filter(function(t){return t.dir==='short'});
  var nd=Math.min(per==='all'?30:days,30),dl=[];for(var i=nd-1;i>=0;i--){var k=lday(new Date(Date.now()-i*864e5)),cs=C.filter(function(t){return lday(new Date(t.exitAt||t.at))===k});dl.push({k:k,v:sum(cs.map(function(t){return n(t.pnl)||0})),n:cs.length})}
  var bySym={};C.forEach(function(t){var s=dmSym(t.symbol).replace(/(USDT|USDC|USD)$/,'');bySym[s]=(bySym[s]||0)+(n(t.pnl)||0)});var symL=Object.keys(bySym).map(function(k){return {k:k,v:bySym[k]}}).sort(function(x,y){return Math.abs(y.v)-Math.abs(x.v)}).slice(0,6),smx=Math.max.apply(null,symL.map(function(x){return Math.abs(x.v)}).concat([1e-9]));
  var bySrc=[['own','Δικές μου'],['prof','Καθηγητής'],['auto','🤖 Αυτόματος']].map(function(s){var cs=C.filter(function(t){return (t.src==='prof'?'prof':t.src==='auto'?'auto':'own')===s[0]});return {l:s[1],n:cs.length,v:sum(cs.map(function(t){return n(t.pnl)||0})),w:cs.filter(function(t){return n(t.pnl)>0}).length}});
  /* allocation donut: free + margin per position (colour follows the symbol, fixed order of first appearance) */
  var segs=[],symC={};op.forEach(function(t){var s=dmSym(t.symbol).replace(/(USDT|USDC|USD)$/,'');if(!(s in symC))symC[s]=PF_COL[Object.keys(symC).length%PF_COL.length]});
  var agg={};op.forEach(function(t){var s=dmSym(t.symbol).replace(/(USDT|USDC|USD)$/,'');agg[s]=(agg[s]||0)+(n(t.margin)||n(t.notional)||0)});
  Object.keys(agg).forEach(function(s){segs.push({l:s+' (περιθώριο)',v:agg[s],c:symC[s],t:fmt(agg[s],2)+' '+ccy})});if(avail>0)segs.push({l:'Διαθέσιμο',v:avail,c:'var(--line)',t:fmt(avail,2)+' '+ccy});
  var kp=function(l,v,s,c){return '<div class="pfk"><span>'+esc(l)+'</span><b class="num '+(c||'')+'">'+v+'</b>'+(s?'<small>'+s+'</small>':'')+'</div>'};
  var h='<div class="pfhead"><div class="pfeq"><span>Συνολική αξία (equity)</span><b class="num">'+fmt(eq,2)+' <small>'+esc(ccy)+'</small></b><em class="num '+cls(eq-a.start)+'">'+pfMoney(eq-a.start,ccy)+' · '+(eq-a.start>=0?'+':'')+fmt((eq-a.start)/a.start*100,2)+'% από την αρχή</em></div>'+
    '<div class="pfper" role="group" aria-label="Περίοδος">'+[['1','24ω'],['7','7Η'],['30','30Η'],['all','Όλα']].map(function(x){return '<button type="button" data-pfper="'+x[0]+'" data-pfk="'+key+'" class="'+(per===x[0]?'on':'')+'">'+x[1]+'</button>'}).join('')+'</div></div>'+
    '<div class="pfgrid"><div class="pfalloc">'+pfDonut(segs,fmt(eq,0),ccy+' equity')+'<ul class="pfleg">'+segs.map(function(s){return '<li><i style="background:'+s.c+'"></i><span>'+esc(s.l)+'</span><b class="num">'+esc(s.t)+'</b></li>'}).join('')+(pend.length?'<li class="muted"><i style="background:transparent;border:1px dashed var(--muted)"></i><span>'+pend.length+' εντολές σε αναμονή</span></li>':'')+'</ul></div>'+
    '<div class="pfks">'+'<div class="pfk" style="grid-column:1/-1;background:transparent;padding:0"><span>Ποσά σε '+esc(ccy)+'</span></div>'+kp('Μη ρευστοποιημένο PnL',pfMoney(unr,''),run.length+' θέσεις σε εξέλιξη',cls(unr))+kp('Ρευστοποιημένο PnL',pfMoney(real,''),C.length+' κλειστές',cls(real))+kp('Διαθέσιμο',fmt(avail,2),'για νέες θέσεις')+kp('Δεσμευμένο περιθώριο',fmt(used,2),op.length+' ανοιχτές')+
    '<div class="pfk pfmr"><span>Margin ratio</span><b class="num '+(mr>0.8?'neg':mr>0.5?'':'pos')+'">'+(isFinite(mr)?fmt(mr*100,1)+'%':'–')+'</b><div class="pfmeter"><i style="width:'+Math.min(100,(mr||0)*100)+'%;background:'+(mr>0.8?'var(--loss)':mr>0.5?'var(--warn)':'var(--gain)')+'"></i></div></div></div></div>'+
    '<span class="lbl" style="display:block;margin-top:1rem">Ανάλυση PnL ('+esc(ccy)+') · '+({1:'τελευταίες 24 ώρες',7:'τελευταίες 7 μέρες',30:'τελευταίες 30 μέρες',all:'από την αρχή'}[per])+'</span>'+
    '<div class="pfstats">'+kp('ROI',isFinite(real)?(real>=0?'+':'')+fmt(real/a.start*100,2)+'%':'–','',cls(real))+kp('Επιτυχία',pct(C.length?W.length/C.length:NaN),W.length+' / '+C.length)+kp('Profit factor',isFinite(pf)?fmt(pf,2):pf===Infinity?'∞':'–','')+kp('Μέσο κέρδος',W.length?pfMoney(avg(W),''):'–','','pos')+kp('Μέση ζημιά',Ls.length?pfMoney(avg(Ls),''):'–','','neg')+
      kp('Καλύτερη',pn.length?pfMoney(Math.max.apply(null,pn),''):'–','','pos')+kp('Χειρότερη',pn.length?pfMoney(Math.min.apply(null,pn),''):'–','','neg')+kp('Μέγιστη πτώση',pfMoney(dd,''),'από κορυφή','neg')+kp('Μέση διάρκεια',isFinite(avgH)?(avgH>=24?fmt(avgH/24,1)+' μέρες':fmt(avgH,1)+' ώρες'):'–','')+
      kp('Long / Short',lg.length+' / '+sh.length,'L '+pfMoney(sum(lg.map(function(t){return n(t.pnl)||0})),'')+' · S '+pfMoney(sum(sh.map(function(t){return n(t.pnl)||0})),''))+'</div>'+
    '<div class="pfcharts"><div><span class="lbl">Σωρευτικό PnL</span>'+pfLine(pts,ccy)+'</div><div><span class="lbl">PnL ανά ημέρα</span>'+pfBars(dl,ccy)+'</div></div>'+
    '<div class="pfcharts"><div><span class="lbl">PnL ανά νόμισμα</span>'+(symL.length?'<ul class="pfsym">'+symL.map(function(x){var w=Math.abs(x.v)/smx*50;return '<li><span>'+esc(x.k)+'</span><div class="pfdiv"><i style="'+(x.v>=0?'left:50%;':'right:50%;')+'width:'+w.toFixed(1)+'%;background:'+(x.v>=0?'var(--gain)':'var(--loss)')+'"></i></div><b class="num '+cls(x.v)+'">'+pfMoney(x.v,'')+'</b></li>'}).join('')+'</ul>':'<div class="empty" style="padding:.8rem">Καμία κλειστή.</div>')+'</div>'+
      '<div><span class="lbl">PnL ανά πηγή</span><ul class="pfsym">'+bySrc.map(function(x){return '<li><span>'+esc(x.l)+'</span><span class="muted" style="font-size:.78rem">'+x.n+' · '+(x.n?fmt(x.w/x.n*100,0)+'%':'–')+'</span><b class="num '+cls(x.v)+'">'+(x.n?pfMoney(x.v,''):'–')+'</b></li>'}).join('')+'</ul></div></div>';
  return h}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pfper]');if(b){PF.per[b.getAttribute('data-pfk')||'me']=b.getAttribute('data-pfper');renderPf()}});
/* ---- Λογαριασμός Καθηγητή: κατάσταση, «πόσο μέσα πέφτει», «τι περιμένει» ---- */
function pxHtml(){var st=AP.state||{},c=AP.cfg||AP_DEF,L=dmOf(PROF).filter(function(t){return t.src==='auto'}),cl=L.filter(dmCounts),op=L.filter(function(t){return !dmClosed(t)}),now=Date.now();
  var running=c.on&&st.at&&now-st.at<180000,who=st.runner?(st.runner===S.uid?'αυτή τη σελίδα':'τη σελίδα του '+name(st.runner)):'',nx=c.on&&st.last?Math.max(0,Math.round((st.last+c.iv*60000-now)/60000)):null;
  var h='<div class="pxstat">'+(c.on?(running?'<span class="pill gain apdot"><i></i>Δουλεύει</span> <span class="muted">τρέχει από '+esc(who)+'</span>':'<span class="pill warn">Ενεργός, αλλά καμία σελίδα ανοιχτή</span> <span class="muted">Ξεκινά μόλις κάποιος ανοίξει τη σελίδα.</span>'):'<span class="pill">Σβηστός</span> <span class="muted">Άναψέ τον στις ρυθμίσεις παρακάτω.</span>')+
    '<span class="muted"> · τελευταία σάρωση '+(st.last?apAgo(st.last):'–')+(nx!=null&&running?' · επόμενη σε '+nx+'′':'')+' · τώρα: '+esc(sessName(sessOf(now)))+'</span> <button type="button" class="linkbtn" data-pxcfg>⚙️ Ρυθμίσεις</button></div>';
  /* πόσο μέσα πέφτει */
  var act=cl.map(function(t){return n(t.r)}),prom=cl.filter(function(t){return t.auto&&isFinite(t.auto.testR)}),pr=avg(prom.map(function(t){return t.auto.testR})),aR=avg(act),wr=cl.length?cl.filter(function(t){return n(t.r)>0}).length/cl.length:NaN,ew=avg(cl.filter(function(t){return t.auto&&isFinite(t.auto.wr)}).map(function(t){return t.auto.wr}));
  var by={};cl.forEach(function(t){var k=t.title||'?',x=by[k]=by[k]||{k:k,n:0,r:0,p:[],w:0};x.n++;x.r+=n(t.r);if(n(t.r)>0)x.w++;if(t.auto&&isFinite(t.auto.testR))x.p.push(t.auto.testR)});var BL=Object.keys(by).map(function(k){var x=by[k];x.a=x.r/x.n;x.pa=avg(x.p);return x}).sort(function(a,b){return b.n-a.n}).slice(0,6);
  var mx=Math.max.apply(null,BL.map(function(x){return Math.max(Math.abs(x.a),Math.abs(isFinite(x.pa)?x.pa:0))}).concat([0.5]));
  var verdict=cl.length<10?'<span class="pill">νωρίς ακόμα: '+cl.length+'/10 κλειστές</span>':(aR>=pr-0.15?'<span class="pill gain">πέφτει μέσα</span>':aR>0?'<span class="pill warn">κερδίζει, λιγότερο από όσο υπόσχεται</span>':'<span class="pill loss">πέφτει έξω</span>');
  h+='<div class="pxbox"><div class="formhead"><b>🎯 Πόσο μέσα πέφτει</b>'+verdict+'</div><div class="pfks" style="margin-top:.5rem">'+
    '<div class="pfk"><span>Υπόσχεση (backtest σε νέα κεριά)</span><b class="num '+cls(pr)+'">'+fR(pr)+'</b><small>μέσο ανά συναλλαγή</small></div>'+
    '<div class="pfk"><span>Πραγματικό</span><b class="num '+cls(aR)+'">'+fR(aR)+'</b><small>'+cl.length+' κλειστές</small></div>'+
    '<div class="pfk"><span>Επιτυχία</span><b class="num">'+pct(wr)+'</b><small>αναμενόταν '+pct(ew)+'</small></div>'+
    '<div class="pfk"><span>Σύνολο R</span><b class="num '+cls(sum(act))+'">'+fR(sum(act))+'</b><small>'+op.length+' ανοιχτές τώρα</small></div></div>'+
    (BL.length?'<ul class="pxcmp">'+BL.map(function(x){var w1=Math.abs(isFinite(x.pa)?x.pa:0)/mx*50,w2=Math.abs(x.a)/mx*50;return '<li><span class="pxn">'+esc(x.k)+' <small class="muted">('+x.n+')</small></span><div class="pxbars"><div class="pfdiv" title="Υπόσχεση '+fR(x.pa)+'"><i style="'+((x.pa||0)>=0?'left:50%;':'right:50%;')+'width:'+w1.toFixed(1)+'%;background:var(--muted);opacity:.55"></i></div><div class="pfdiv" title="Πραγματικό '+fR(x.a)+'"><i style="'+(x.a>=0?'left:50%;':'right:50%;')+'width:'+w2.toFixed(1)+'%;background:'+(x.a>=0?'var(--gain)':'var(--loss)')+'"></i></div></div><b class="num '+cls(x.a)+'">'+fR(x.a)+'</b></li>'}).join('')+'</ul><p class="muted" style="font-size:.74rem;margin:.3rem 0 0">Γκρι: τι υποσχόταν το backtest · χρώμα: τι έγινε στην πράξη.</p>':'<p class="muted" style="font-size:.82rem;margin:.5rem 0 0">Δεν έχει κλείσει ακόμα καμία αυτόματη θέση.</p>')+'</div>';
  /* τι περιμένει */
  var W=(AP.watch&&AP.watch.length?AP.watch:st.watch||[]).filter(function(w){return w.name}).slice(0,8);
  h+='<div class="pxbox"><div class="formhead"><b>🔮 Τι περιμένει</b><span class="muted" style="font-size:.76rem">'+(st.scanAt?'σάρωση '+apAgo(st.scanAt):'')+'</span></div>'+
    (op.length?'<ul class="pxop">'+op.map(function(t){var a=t.auto||{},pend=dmIsPend(t),lv0=dmLiveR(t),cr=lv0?lv0.r:n(t.curR),X=a.X||(isFinite(n(t.target))?Math.abs(n(t.target)-n(t.entry))/Math.abs(n(t.entry)-n(t.stop)):NaN),pos=isFinite(cr)&&isFinite(X)?Math.max(0,Math.min(100,(cr+1)/(X+1)*100)):null;
      return '<li><div class="formhead"><span><b>'+esc(t.symbol)+'</b> '+(t.dir==='short'?'<span class="pill loss">Short</span>':'<span class="pill gain">Long</span>')+' <span class="muted">'+esc(t.title||'')+(a.tf?' · '+a.tf:'')+'</span></span>'+(pend?'<span class="pill">⏳ περιμένει είσοδο '+dmPx(n(t.entry))+'</span>':'<b class="num '+cls(cr)+'">'+(isFinite(cr)?fR(cr):'–')+'</b>')+'</div>'+
        '<div class="pxrange"><span class="'+(t.curStop!=null?'pos':'neg')+'">'+(t.curStop!=null?'🔒 stop '+dmPx(n(t.curStop)):'stop '+dmPx(n(t.stop)))+'</span><div class="pxtrack"><i class="pxe" style="left:'+(isFinite(X)?(1/(X+1)*100).toFixed(1):'33')+'%"></i>'+(pos!=null&&!pend?'<i class="pxnow" style="left:'+pos.toFixed(1)+'%"></i>':'')+'</div><span class="pos">στόχος '+dmPx(n(t.target))+'</span></div>'+
        '<div class="muted" style="font-size:.78rem">Πιθανότητα να πιάσει τον στόχο: <b>'+(isFinite(a.wr)?pct(a.wr):'–')+'</b> (από backtest) · αναμενόμενο '+fR(a.testR)+' ανά συναλλαγή'+(a.sess?' · μπήκε σε '+esc(sessInfo(a.sess).t):'')+(t.mgmt&&t.mgmt!=='none'?' · έξοδος: '+APF_MG[t.mgmt]:'')+(a.profile?' · 🧬 '+esc(a.profile.name):'')+'</div></li>'}).join('')+'</ul>':'<p class="muted" style="font-size:.82rem;margin:.4rem 0">Καμία ανοιχτή θέση αυτή τη στιγμή.</p>')+
    (W.length?'<span class="lbl" style="display:block;margin-top:.6rem">Παρακολουθεί</span><ul class="pxw">'+W.map(function(w){return '<li><b>'+esc(w.coin)+'</b> <span class="muted">'+esc(w.tf)+'</span> · '+esc(w.name)+' '+(w.dir>0?'Long':'Short')+' <span class="num '+cls(w.testR)+'">'+fR(w.testR)+'</span>'+(w.sig?' <span class="pill gain">σήμα τώρα</span>':'')+(w.block?' <span class="pill warn">🛡️ '+esc(w.block)+'</span>':'')+(!w.sig&&!w.block&&w.wait?'<span class="pxwait">'+esc(w.wait)+'</span>':'')+'</li>'}).join('')+'</ul>':'')+'</div>';
  return h}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pxcfg]');if(b){var c=$('#apCard');if(c)c.scrollIntoView({block:'start',behavior:'smooth'})}});
function renderDemo(){if(!$('#dmAcct'))return;try{apfRender()}catch(e){}
  var w=$('#dm-who'),us=dmUsers();if(!DM.who||us.indexOf(DM.who)<0)DM.who=S.uid;
  w.innerHTML=us.map(function(u){return '<option value="'+esc(u)+'"'+(u===DM.who?' selected':'')+'>'+esc(u===S.uid?'Ο δικός μου':name(u))+'</option>'}).join('');
  dmTechOpts();renderDmAcct();try{renderPf()}catch(e){console.error(e)}renderDmOpen();renderDmProf();renderDmHist();renderDmCalc();try{apRender()}catch(e){}
  if(DM.ev&&!$('#dmEvPaste'))renderDmEval();
}
function bindDemo(){
  $('#dmForm').addEventListener('submit',dmSubmit);
  if($('#dmRecheck'))$('#dmRecheck').addEventListener('click',function(){dmRecheck(true)});
  $('#dmOpen').addEventListener('click',function(e){var b=e.target.closest('#dmDedup');if(!b)return;var L=dmOf('prof').filter(function(t){return !dmClosed(t)}),g={};L.forEach(function(t){var k=dmSym(t.symbol);(g[k]=g[k]||[]).push(t)});var del=[];
    Object.keys(g).forEach(function(k){var a=g[k];if(a.length<2)return;var run=a.filter(function(t){return !dmIsPend(t)}).sort(function(x,y){return (x.at||0)-(y.at||0)});var keep=run.length?run[0]:a.slice().sort(function(x,y){return (y.at||0)-(x.at||0)})[0];a.forEach(function(t){if(t!==keep)del.push(t)})});
    if(!del.length)return;if(!b.dataset.armed){b.dataset.armed='1';b.textContent='Σίγουρα; Θα σβηστούν '+del.length+' (κρατιέται η παλιότερη που τρέχει, αλλιώς η νεότερη σε αναμονή)';return}
    b.disabled=true;Promise.all(del.map(function(t){return remove('demo',t.id)})).then(function(){toast('Σβήστηκαν '+del.length+' διπλές demo θέσεις.')}).catch(function(e2){toast(writeErr(e2))})});
  (function(){var qc=$('#t-qc');if(qc)qc.addEventListener('click',function(e){var r=e.target.closest('[data-qcr]'),m=e.target.closest('[data-qce]');if(r){var v=r.getAttribute('data-qcr');$('#t-rules').value=$('#t-rules').value===v?'':v;renderQC()}if(m){var w=m.getAttribute('data-qce');$('#t-emotion').value=$('#t-emotion').value===w?'':w;renderQC()}});
    ['t-date','t-time'].forEach(function(k){var x=$('#'+k);if(x)x.addEventListener('change',renderLock)});
    var be=$('#bulkEmo');if(be)be.innerHTML='<option value="">Διάθεση: –</option>'+EMOS.map(function(x){return '<option>'+esc(x)+'</option>'}).join('');
    var ba=$('#bulkApply');if(ba)ba.addEventListener('click',bulkApply);
    ['wk-who','wk-per'].forEach(function(k){var x=$('#'+k);if(x)x.addEventListener('change',renderWeek)});
    var fl=$('#fixList');if(fl)fl.addEventListener('click',function(e){var row=e.target.closest('[data-fix]');if(!row)return;var id=row.getAttribute('data-fix'),f=FIX[id]=FIX[id]||{};
      var r=e.target.closest('[data-fxr]'),m=e.target.closest('[data-fxe]');
      if(r){var v=r.getAttribute('data-fxr')==='yes';f.rules=f.rules===v?null:v;row.querySelectorAll('[data-fxr]').forEach(function(b){b.classList.toggle('on',f.rules!=null&&(b.getAttribute('data-fxr')==='yes')===f.rules)});return}
      if(m){var w=m.getAttribute('data-fxe');f.emo=f.emo===w?null:w;row.querySelectorAll('[data-fxe]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-fxe')===f.emo)});return}
      if(e.target.closest('[data-fxsave]')){fixSave(row);return}
      if(e.target.closest('[data-fxopen]')){loadTrade(id);$('#tradeForm').scrollIntoView({block:'start',behavior:'smooth'})}});
    renderQC();renderLock()})();
  $('#dmForm').addEventListener('input',renderDmCalc);
  $('#dmForm').addEventListener('change',function(e){
    if(e.target.id==='dm-mode'){var a=e.target.value==='amount';$('#dm-amt-w').hidden=!a;$('#dm-risk-w').hidden=a}
    if(e.target.id==='dm-tech'){var v=e.target.value;$('#dm-prof').hidden=v.indexOf('cf:')!==0;if(v.indexOf('cf:')===0)dmPrefill((S.confirms||[]).find(function(c){return c.id===v.slice(3)}))}
    renderDmCalc()});
  $('#dm-clear').addEventListener('click',dmReset);
  $('#dm-who').addEventListener('change',function(e){DM.who=e.target.value;renderDemo()});
  $('#dm-hsrc').addEventListener('change',renderDmHist);
  var sec=$('section[data-panel=demo]');
  sec.addEventListener('click',function(e){var t=e.target;
    if(t.closest('#dm-checkall')){dmOpenEval(null);return}
    var wy=t.closest('[data-dmwhy]');if(wy){var dt=(S.demo||[]).find(function(x){return x.id===wy.getAttribute('data-dmwhy')});if(dt){QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();pAsk('Ανάλυσέ μου την αυτόματη demo '+(dt.dir==='short'?'Short':'Long')+' '+dt.symbol+' ('+(dt.title||'')+', άνοιξε '+dateGr(dt.date||lday(new Date(dt.at)))+' '+(dt.time||'')+'): γιατί μπήκε ο Αυτόματος Καθηγητής, ισχύει ακόμα το σκεπτικό και τι να προσέξουμε;',false)}return}
    if(t.closest('#cfAsk2')){cfAskNow();return}
    var ev=t.closest('[data-dmev]');if(ev){dmOpenEval(ev.getAttribute('data-dmev'));return}
    var x=t.closest('[data-dmx]');if(x){dmManualClose(x.getAttribute('data-dmx'));return}
    var del=t.closest('[data-dmdel]');if(del){if(!del.dataset.armed){del.dataset.armed='1';del.textContent='Σίγουρα;';setTimeout(function(){if(del){delete del.dataset.armed;del.textContent='Διαγραφή'}},3500);return}
      remove('demo',del.getAttribute('data-dmdel')).catch(function(e2){toast(writeErr(e2))});return}
    if(t.closest('#dm-acsave')){dmSaveAcct(false);return}
    if(t.closest('#dm-acreset')){dmSaveAcct(true);return}
    if(t.closest('#dmMore')){DM.hlim+=60;renderDmHist();return}
    if(t.closest('#dmEvX')){DM.ev=null;renderDmEval();return}
    if(t.closest('#dmEvGo')){dmTryFetch();return}
    if(t.closest('#dmEvUse')){var v=$('#dmEvPaste').value;if(!v.trim()){toast('Επικόλλησε πρώτα τις τιμές.');return}dmApplyText(v);return}
  });
  sec.addEventListener('change',function(e){var E=DM.ev,t=e.target;if(!E)return;
    if(t.id==='dmEvGrp'){dmOpenEval(t.value);return}
    if(t.id==='dmEvEx'){E.ex=t.value;E.tf=E.ex==='cc'?ccTfFor(E.first):dmTfFor(E.first,E.ex);E.msg='';E.res='';renderDmEval();if(E.ex==='cc')dmTryFetch();return}
    if(t.id==='dmEvTf'){E.tf=t.value;E.msg='';renderDmEval();return}
    if(t.id==='dmEvFile'){var f=t.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(){dmApplyText(String(rd.result||''))};rd.readAsText(f);t.value=''}
  });
  dmReset();
}

/* ================= Επιβεβαιώσεις τεχνικών του Καθηγητή ================= */
var QCATCARD={cdl:'candle',risk:'possize',psy:'p-change'};
function qCatCard(c){var id=QCATCARD[c];if(id&&window.Manual&&Manual.entry(id))return id;for(var i=0;i<QBANK.length;i++)if(QBANK[i][0]===c&&window.Manual&&Manual.entry(QBANK[i][1]))return QBANK[i][1];return c}
function qWrongCards(uid,cat){var seen={},out=[];(S.quiz||[]).filter(function(x){return x.by===uid}).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).forEach(function(x){(x.ans||[]).forEach(function(a){if(a.ok||(cat&&a.c!==cat))return;var q=QBANK[a.i],id=q&&q[1];if(id&&!seen[id]&&window.Manual&&Manual.entry(id)){seen[id]=1;out.push(id)}})});return out.slice(0,6)}
/* ---- quick-close chips (rules + mood) ---- */
var EMOS=['Ήρεμος','Σίγουρος','Βιαστικός','FOMO','Εκδίκηση','Κουρασμένος','Βαριεστημένος'];
function renderQC(){var el=$('#t-qc');if(!el)return;var r=$('#t-rules').value,e=$('#t-emotion').value;
  el.innerHTML='<span class="qcl">Στο κλείσιμο, 2 κλικ: τήρησα τους κανόνες; *</span><div class="chips"><button type="button" class="chip'+(r==='yes'?' on':'')+'" data-qcr="yes">✓ Ναι</button><button type="button" class="chip no'+(r==='no'?' on':'')+'" data-qcr="no">✕ Όχι</button></div>'+
    '<span class="qcl">Διάθεση πριν την είσοδο *</span><div class="chips">'+EMOS.map(function(x){return '<button type="button" class="chip'+(e===x?' on':'')+(/FOMO|Εκδίκηση|Βιαστικός|Κουρασμένος|Βαριεστημένος/.test(x)&&e===x?' no':'')+'" data-qce="'+esc(x)+'">'+esc(x)+'</button>'}).join('')+'</div>'}
/* ---- day lock + timing warnings ---- */
function lockState(){var ds=dayState(S.uid),set=S.settings;if(ds.r<=-set.dayLoss)return {lock:true,why:'έφτασες '+fR(ds.r)+' (όριο '+fR(-set.dayLoss)+')'};if(ds.count>=set.maxTrades)return {lock:true,why:'έκανες '+ds.count+' συναλλαγές (όριο '+set.maxTrades+')'};return {lock:false,ds:ds}}
function timeStats(uid){var c=closed(S.trades.filter(function(t){return t.by===uid})),o={sunR:0,sunN:0,nightR:0,nightN:0};
  c.forEach(function(t){if(t.date&&new Date(t.date+'T12:00:00').getDay()===0){o.sunR+=t.r;o.sunN++}var h=t.time?+t.time.split(':')[0]:NaN;if(isFinite(h)&&(h>=22||h<7)){o.nightR+=t.r;o.nightN++}});return o}
function timeWarn(d){var o=timeStats(S.uid),w=[];if(d.getDay()===0&&o.sunN>=3&&o.sunR<0)w.push('Κυριακή: στο ιστορικό σου '+fR(o.sunR)+' σε '+o.sunN+' συναλλαγές.');var h=d.getHours();if((h>=22||h<7)&&o.nightN>=3&&o.nightR<0)w.push('Νύχτα (22:00–07:00): στο ιστορικό σου '+fR(o.nightR)+' σε '+o.nightN+' συναλλαγές.');return w.join(' ')}
function renderLock(){var el=$('#t-lock');if(!el)return;var edit=!!$('#t-id').value,dv=$('#t-date').value,tv=$('#t-time').value||'12:00',h='',cl='warn';
  if(!edit&&dv===today()){var L=lockState();if(L.lock){cl='stop';h='<b>🔒 Η μέρα κλείδωσε: '+esc(L.why)+'.</b><span>Οι κανόνες ρίσκου δεν επιτρέπουν νέα συναλλαγή σήμερα. Κλείσε το TradingView και γράψε τον απολογισμό.</span><label><input type="checkbox" id="t-lockack"> <span>Η συναλλαγή έγινε ήδη στην αγορά, την καταγράφω ως παραβίαση (μετράει στα στατιστικά πειθαρχίας).</span></label>'}}
  if(dv){var w=timeWarn(new Date(dv+'T'+tv));if(w)h+=(h?'':'<b>⚠ Προσοχή στην ώρα</b>')+'<span>'+esc(w)+'</span>'}
  el.className='lockbox '+cl;el.hidden=!h;el.innerHTML=h}
/* ---- bulk fill + fix card ---- */
function fixUpdate(t,ch){var d=cleanDoc(t);if(ch.strat!=null)d.strategyId=ch.strat;if(ch.rules!=null)d.rules=ch.rules;if(ch.emo!=null)d.emotion=ch.emo;
  if(ch.stop!=null){d.stop=ch.stop;var r=calcR(d);if(isFinite(r)){d.r=+r.toFixed(3);if(isFinite(n(d.size))&&n(d.size)>0)d.riskEur=+(n(d.size)*Math.abs(n(d.entry)-ch.stop)).toFixed(2)}}
  if(ch.riskE>0&&!isFinite(n(d.stop))){d.riskEur=ch.riskE;var e=n(d.entry),q=n(d.size);
    if(isFinite(e)&&q>0){d.stop=+(d.dir==='short'?e+ch.riskE/q:e-ch.riskE/q).toPrecision(10);var r2=calcR(d);if(isFinite(r2))d.r=+r2.toFixed(3)}
    if(!hasR(d)&&isFinite(n(d.pnl)))d.r=+(n(d.pnl)/ch.riskE).toFixed(3)}
  return put('trades',t.id,d)}
function seqRun(list,fn,btn,label,done){var i=0,ok=0,b=btn;if(b){b.disabled=true}(function next(){if(i>=list.length){if(b){b.disabled=false;b.textContent=label}done(ok);return}var x=list[i++];if(b)b.textContent=i+'/'+list.length+'…';fn(x).then(function(){ok++;next()}).catch(function(e){if(b){b.disabled=false;b.textContent=label}toast(writeErr(e));done(ok)})})()}
function bulkApply(){var ids=Object.keys(SEL);if(!ids.length)return;if(!qCanSave()){toast('Χρειάζεσαι δικαίωμα Editor.');return}
  var ch={},sv=$('#bulkStrat').value,rv=$('#bulkRules').value,ev=$('#bulkEmo').value,rk=n($('#bulkRisk').value);if(sv)ch.strat=sv;if(rv)ch.rules=rv==='yes';if(ev)ch.emo=ev;if(rk>0)ch.riskE=rk;
  if(!Object.keys(ch).length){toast('Διάλεξε τι θα μπει: στρατηγική, κανόνες, διάθεση ή ρίσκο €.');return}
  var L=ids.map(function(id){return S.trades.find(function(t){return t.id===id})}).filter(function(t){return t&&(!t.by||t.by===S.uid)});
  seqRun(L,function(t){return fixUpdate(t,ch)},$('#bulkApply'),'Εφαρμογή στις επιλεγμένες',function(ok){toast('Ενημερώθηκαν '+ok+' συναλλαγές.');SEL={};render()})}
var FIX={};
function fixNeeds(t){var a=[];if(t._est||!hasR(t))a.push('stop');if(!t.strategyId)a.push('strat');if(t.rules!==true&&t.rules!==false)a.push('rules');if(!t.emotion)a.push('emo');return a}
function renderFix(){var card=$('#fixCard');if(!card)return;var mine=S.trades.filter(function(t){return t.by===S.uid&&t.status==='closed'}),L=mine.filter(function(t){return fixNeeds(t).length}).sort(sortTime).reverse();
  card.hidden=!L.length;if(!L.length)return;var cnt=function(k){return L.filter(function(t){return fixNeeds(t).indexOf(k)>=0}).length};
  $('#fixCount').textContent=L.length+' από '+mine.length;
  $('#fixHelp').textContent='Χωρίς stop: '+cnt('stop')+' · χωρίς στρατηγική: '+cnt('strat')+' · χωρίς κανόνες/διάθεση: '+Math.max(cnt('rules'),cnt('emo'))+'. Συμπλήρωσε τις πιο πρόσφατες εδώ. Για πολλές μαζί: φίλτραρε το Ιστορικό (π.χ. ανά σύμβολο ή μήνα), τσέκαρε «επιλογή όλων» και βάλε στρατηγική ή ρίσκο € με τη μπάρα που εμφανίζεται.';
  var so=$('#t-strategy').innerHTML;
  $('#fixList').innerHTML=L.slice(0,6).map(function(t){var f=FIX[t.id]||{},nd=fixNeeds(t);
    return '<div class="fixrow" data-fix="'+esc(t.id)+'"><div class="fxh"><span class="muted num">'+dateGr(t.date)+' '+esc(t.time||'')+'</span><b>'+esc(t.symbol||'–')+'</b>'+dirPill(t)+'<span class="num">'+esc(t.entry)+' → '+esc(t.exit)+'</span><span class="num '+cls(n(t.pnl))+'">'+fE(n(t.pnl))+'</span>'+(hasR(t)?'<span class="num '+cls(t.r)+'">'+(t._est?'≈ ':'')+fR(t.r)+'</span>':'')+'</div>'+
      '<div class="fxf">'+(nd.indexOf('stop')>=0?'<input data-fxs inputmode="decimal" placeholder="Stop τιμή" value="'+esc(f.stop||'')+'"><span class="muted" style="font-size:.8rem">ή</span><input data-fxk inputmode="decimal" placeholder="Ρίσκο €" value="'+esc(f.riskE||'')+'">':'')+
      (nd.indexOf('strat')>=0?'<select data-fxst>'+so+'</select>':'')+'</div>'+
      ((nd.indexOf('rules')>=0||nd.indexOf('emo')>=0)?'<div class="chips"><button type="button" class="chip'+(f.rules===true?' on':'')+'" data-fxr="yes">✓ Κανόνες</button><button type="button" class="chip no'+(f.rules===false?' on':'')+'" data-fxr="no">✕ Κανόνες</button>'+EMOS.map(function(x){return '<button type="button" class="chip'+(f.emo===x?' on':'')+'" data-fxe="'+esc(x)+'">'+esc(x)+'</button>'}).join('')+'</div>':'')+
      '<div class="row" style="gap:.4rem"><button type="button" class="btn small primary" data-fxsave>Αποθήκευση</button><button type="button" class="btn small" data-fxopen>Άνοιγμα στη φόρμα</button></div></div>'}).join('');
  $$('#fixList [data-fxst]').forEach(function(sel){var id=sel.closest('[data-fix]').getAttribute('data-fix');sel.value=(FIX[id]&&FIX[id].strat)||''})}
function fixSave(row){var id=row.getAttribute('data-fix'),t=S.trades.find(function(x){return x.id===id});if(!t)return;var f=FIX[id]||{},ch={};
  var sv=row.querySelector('[data-fxs]'),kv=row.querySelector('[data-fxk]'),st=row.querySelector('[data-fxst]');
  if(sv&&sv.value){var s0=n(sv.value),e=n(t.entry);if(!(s0>0)){toast('Λάθος stop.');return}if(t.dir==='short'?s0<=e:s0>=e){toast(t.dir==='short'?'Σε short το stop είναι πάνω από την είσοδο.':'Σε long το stop είναι κάτω από την είσοδο.');return}ch.stop=s0}
  else if(kv&&n(kv.value)>0)ch.riskE=n(kv.value);
  if(st&&st.value)ch.strat=st.value;if(f.rules!=null)ch.rules=f.rules;if(f.emo)ch.emo=f.emo;
  if(!Object.keys(ch).length){toast('Δεν συμπλήρωσες κάτι.');return}if(!qCanSave()){toast('Χρειάζεσαι δικαίωμα Editor.');return}
  fixUpdate(t,ch).then(function(){delete FIX[id];toast('Αποθηκεύτηκε.')}).catch(function(e){toast(writeErr(e))})}
/* ---- weekly review + heatmap ---- */
function renderWeek(){var el=$('#weekBody');if(!el)return;var who=$('#wk-who').value,per=+$('#wk-per').value||0;
  var all=S.trades.filter(function(t){return who==='all'||t.by===S.uid}),c=closed(all);
  var mon=new Date();mon.setHours(0,0,0,0);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));var w0=lday(mon),pm=new Date(mon);pm.setDate(pm.getDate()-7);var p0=lday(pm);
  var cw=c.filter(function(t){return t.date>=w0}),cp=c.filter(function(t){return t.date>=p0&&t.date<w0});
  var sm=function(L){var r=sum(L.map(function(t){return t.r})),w=L.filter(function(t){return t.r>0}).length,rl=L.filter(function(t){return t.rules===true||t.rules===false}),rf=rl.filter(function(t){return t.rules===true}).length;return {n:L.length,r:r,wr:L.length?w/L.length:NaN,rules:rl.length?rf/rl.length:NaN}};
  var a=sm(cw),b=sm(cp),cell=function(l,v,sub,k){return '<div><span class="lbl">'+l+'</span><b class="num '+(k||'')+'">'+v+'</b>'+(sub?'<span class="lbl">'+sub+'</span>':'')+'</div>'};
  var h='<div class="wkgrid">'+cell('Αυτή η εβδομάδα',fR(a.r),a.n+' συναλλαγές',cls(a.r))+cell('Προηγούμενη',fR(b.r),b.n+' συναλλαγές',cls(b.r))+cell('Επιτυχία',pct(a.wr),'πριν: '+pct(b.wr))+cell('Τήρηση κανόνων',pct(a.rules),'πριν: '+pct(b.rules))+'</div>';
  var cut='';if(per){var d=new Date();d.setDate(d.getDate()-per);cut=lday(d)}var H=c.filter(function(t){return t.time&&(!cut||t.date>=cut)});
  var g={},rowT={},colT={},mx=0,ord=[1,2,3,4,5,6,0];H.forEach(function(t){var dw=new Date(t.date+'T12:00:00').getDay(),hr=+t.time.split(':')[0];if(!isFinite(hr))return;var k=dw+'_'+hr,x=g[k]=g[k]||{r:0,n:0};x.r+=t.r;x.n++;rowT[dw]=(rowT[dw]||0)+t.r;colT[hr]=(colT[hr]||0)+t.r});
  Object.keys(g).forEach(function(k){mx=Math.max(mx,Math.abs(g[k].r))});
  var col=function(r){if(!r||!mx)return '';var al=(0.15+0.75*Math.min(1,Math.abs(r)/mx)).toFixed(2);return 'background:'+(r>0?'rgba(38,166,154,'+al+')':'rgba(239,83,80,'+al+')')+';color:'+(al>0.55?'#fff':'inherit')};
  h+='<span class="lbl" style="font-size:.8rem;color:var(--muted)">Χάρτης ώρα × μέρα (άθροισμα R, '+H.length+' συναλλαγές με ώρα)</span><div class="tw"><table class="heat"><thead><tr><th></th>'+Array.from({length:24},function(_,i){return '<th>'+i+'</th>'}).join('')+'<th>Σύνολο</th></tr></thead><tbody>'+
    ord.map(function(dw){return '<tr><th class="rowh">'+DAYS[dw].slice(0,3)+'</th>'+Array.from({length:24},function(_,hr){var x=g[dw+'_'+hr];return x?'<td style="'+col(x.r)+'" title="'+DAYS[dw]+' '+hr+':00 · '+x.n+' συναλλαγές · '+fR(x.r)+'">'+(Math.abs(x.r)>=0.95?Math.round(x.r):fmt(x.r,1))+'</td>':'<td></td>'}).join('')+'<td class="tot num '+cls(rowT[dw]||0)+'">'+(rowT[dw]!=null?fR(rowT[dw]):'')+'</td></tr>'}).join('')+'</tbody></table></div>';
  var f=[];if(H.length>=10){var best=null,worst=null;for(var s0=0;s0<=21;s0++){var r=0,nn=0;for(var k=s0;k<s0+3;k++){r+=colT[k]||0;Object.keys(g).forEach(function(kk){if(+kk.split('_')[1]===k)nn+=g[kk].n})}if(nn&&(!best||r>best.r))best={s:s0,r:r,n:nn};if(nn&&(!worst||r<worst.r))worst={s:s0,r:r,n:nn}}
    var dws=ord.filter(function(d){return rowT[d]!=null}),bd=dws.slice().sort(function(x,y){return rowT[y]-rowT[x]})[0],wd=dws.slice().sort(function(x,y){return rowT[x]-rowT[y]})[0];
    if(best&&best.r>0)f.push('Καλύτερη ζώνη: <b>'+pad2(best.s)+':00–'+pad2(best.s+3)+':00</b> ('+fR(best.r)+' σε '+best.n+'). Εκεί να γίνεται η κύρια δουλειά.');
    if(bd!=null&&rowT[bd]>0)f.push('Καλύτερη μέρα: <b>'+DAYS[bd]+'</b> ('+fR(rowT[bd])+').');
    if(worst&&worst.r<0)f.push('Χειρότερη ζώνη: <b>'+pad2(worst.s)+':00–'+pad2(worst.s+3)+':00</b> ('+fR(worst.r)+' σε '+worst.n+'). Σκέψου να μην ανοίγεις θέσεις τότε.');
    if(wd!=null&&rowT[wd]<0)f.push('Χειρότερη μέρα: <b>'+DAYS[wd]+'</b> ('+fR(rowT[wd])+').');
    var ts=timeStats(S.uid);if(who==='me'&&ts.nightN>=3)f.push('Νύχτα 22:00–07:00: '+fR(ts.nightR)+' σε '+ts.nightN+'.')}
  else f.push('Χρειάζονται τουλάχιστον 10 κλειστές συναλλαγές με ώρα για συμπεράσματα.');
  h+='<ul class="wkfind">'+f.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul>';el.innerHTML=h}
/* ---- automatic evaluation: demo trades + confirmations ---- */
var AE={last:0,busy:false};
function autoEval(force){if(AE.busy||!CG.mcp||!S.uid||!qCanSave())return;if(!force&&Date.now()-AE.last<18e4)return;AE.busy=true;AE.last=Date.now();
  var g={},add=function(sym,it){sym=dmSym(sym);if(CGID[sym])sym+='USDT';if(!/^[A-Z0-9]{2,12}(USDT|USDC|USD)$/.test(sym))return;(g[sym]=g[sym]||[]).push(it)};
  dmOf('prof').filter(function(t){return !dmClosed(t)&&t.ex!=='tv'}).forEach(function(t){add(t.symbol,{k:'dm',t:t,at:t.at||Date.now()})});
  dmOf('prof').filter(function(t){return dmClosed(t)&&!t.fc&&t.ex!=='tv'&&(t.at||0)>Date.now()-7*864e5}).forEach(function(t){add(t.symbol,{k:'fc',t:t,at:t.at})});
  (S.confirms||[]).filter(function(c){return c.by===S.uid&&!c.outcome&&c.at&&c.dir&&isFinite(n(c.entry))&&isFinite(n(c.stop))&&isFinite(n(c.target))&&!(S.demo||[]).some(function(t){return t.cfId===c.id})}).forEach(function(c){add(c.market,{k:'cf',c:c,at:c.at})});
  (S.props||[]).filter(function(p){return p.by===S.uid&&(!p.res||p.res==='running')&&!p.bad&&p.at&&p.dir&&isFinite(n(p.entry))&&isFinite(n(p.stop))&&isFinite(n(p.target))&&p.at>Date.now()-7*864e5&&!(S.demo||[]).some(function(t){return t.cfId===p.id})}).forEach(function(p){add(p.market,{k:'pp',c:p,at:p.at})});
  var syms=Object.keys(g),done={dm:0,cf:0},TF=['1m','5m','15m','30m','1h','4h','1D','7D'];
  var run=function(i){if(i>=syms.length){AE.busy=false;if(done.dm||done.cf)toast('Αυτόματος έλεγχος: '+(done.dm?done.dm+' demo έκλεισαν':'')+(done.dm&&done.cf?', ':'')+(done.cf?done.cf+' επιβεβαιώσεις πήραν αποτέλεσμα':'')+'.');try{renderConfirms()}catch(e){}return}
    var sym=syms[i],items=g[sym],first=Math.min.apply(null,items.map(function(x){return x.at})),tf=ccTfFor(first);
    var go=function(tf,tries){return ccFetchBars(sym,tf).then(function(r){var bars=r.bars.filter(function(b){return !b.approx}),retry=false;
      items.forEach(function(it){if(it.ok)return;
        if(it.k!=='cf'&&!it.t.fc){var fv=dmForecast(it.t,bars);if(fv==='err'){retry=true;return}if(fv){it.t=Object.assign({},it.t,{fc:fv,fcAt:Date.now()});it.fcNew=true}}
        if(it.k==='fc'){it.ok=true;if(it.fcNew){var fd=dmClean(it.t);put('demo',it.t.id,fd).catch(function(){})}return}
        var v=it.k==='dm'?it.t:{entry:n(it.c.entry),stop:n(it.c.stop),target:n(it.c.target),dir:it.c.dir,at:it.c.at,ord:'limit',exp:72};
        if(it.k==='dm'&&v.ord!=='limit'&&!v.filledAt&&!v.ordChecked){var bi=barIdx(bars,v.at),bb=bi>=0?bars[bi]:null,ee=n(v.entry);if(bb&&!(bb.l<=ee*1.0015&&bb.h>=ee*0.9985)){v=it.t=Object.assign({},v,{ord:'limit',ordFix:true})}else if(bb){v=it.t=Object.assign({},v,{ordChecked:true})}}
        var x=dmEval(v,bars);
        if(x.err){if(/μετά την είσοδο/.test(x.err))retry=true;return}it.ok=true;
        if(it.k==='dm'){if(x.status!=='open'){dmSaveEval(it.t,x,{ex:'cc',tf:tf});done.dm++}else if(it.fcNew||!it.t.checkedAt||it.t.ordFix||Date.now()-it.t.checkedAt>12e4||(!!x.filledAt)!==(!!it.t.filledAt))dmSaveEval(it.t,x,{ex:'cc',tf:tf})}
        else if(it.k==='pp'){ppSaveEval(it.c,x)}
        else{var o=x.status==='win'||x.status==='loss'?x.status:x.status==='expired'?(x.nofill?'skip':x.r>0?'win':'loss'):null;if(o){cfAutoOutcome(it.c.id,o);done.cf++}}});
      var k=TF.indexOf(tf);if(retry&&tries<2&&k>=0&&k<TF.length-1)return go(TF[k+1],tries+1)})};
    go(tf,0).catch(function(){}).then(function(){run(i+1)})};
  run(0)}
setTimeout(function(){autoEval(true)},9000);setInterval(function(){autoEval(false)},60000);
var TECHRE=/\[\[tech:([^\]]*)\]\]/g,CF={who:'all',days:10,x:(function(){try{return localStorage.getItem('tj-cfx')==='1'}catch(e){return false}})(),all:false};
function techParse(text){var out=[];String(text||'').replace(TECHRE,function(m,body){var p=body.split('|').map(function(x){return x.trim()});
  var id=/^[a-z0-9-]+$/.test(p[0]||'')&&window.Manual&&Manual.entry(p[0])?p[0]:'';
  var px=function(v){v=String(v||'').replace(/\s/g,'');var mm=v.match(/\d[\d.,]*/);if(!mm)return null;v=mm[0].replace(/[.,]$/,'');if(/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(v))v=v.replace(/,/g,'');else if(/^\d{1,3}(\.\d{3})+,\d+$/.test(v))v=v.replace(/\./g,'').replace(',','.');var x=n(v);return isFinite(x)&&x>0?x:null};
  var t={id:id,title:String(p[1]||(id?Manual.title(id):'')).slice(0,120),market:String(p.length>3?p[2]:'').slice(0,40),why:String(p.length>4?p[3]:(p.length>3?p.slice(3).join(' | '):(p[2]||''))).slice(0,300),
    dir:p.length>4?(/short|sell|πώλ|шорт|продаж/i.test(p[4])?'short':/long|buy|αγορ|лонг|покуп/i.test(p[4])?'long':null):null,entry:px(p[5]),stop:px(p[6]),target:px(p[7])};
  t.bad=techCheck(t);if(t.title)out.push(t);return ''});return out.slice(0,5)}
function techCheck(t){var e=t.entry,s=t.stop,g=t.target;if(e==null||s==null||g==null)return 'λείπει είσοδος, stop ή στόχος';if(!t.dir)return 'λείπει η κατεύθυνση (long/short)';if(t.dir==='long'&&!(s<e&&g>e))return 'σε long το stop πρέπει να είναι κάτω και ο στόχος πάνω από την είσοδο';if(t.dir==='short'&&!(s>e&&g<e))return 'σε short το stop πρέπει να είναι πάνω και ο στόχος κάτω από την είσοδο';var dp=Math.abs(e-s)/e*100;if(dp>9)return 'stop '+fmt(dp,1)+'% μακριά (όριο 9%, με 10x ρευστοποιείται πριν)';var rr=Math.abs(g-e)/Math.abs(e-s);if(rr<1.5)return 'κέρδος/ρίσκο 1:'+fmt(rr,2)+' (ελάχιστο 1:1,5)';return ''}
function techStrip(text){return String(text||'').replace(/\[\[lesson:[a-z]+\]\]/g,'').replace(/\[\[rule:([^\]]+)\]\]/g,'📌 $1').replace(TECHRE,'').replace(/\[\[tech:[^\]]*$/,'').replace(/\n{3,}/g,'\n\n').trim()}
function msgKey(m){if(m.id)return m.id;var h=0,x=String(m.content||'');for(var i=0;i<x.length;i++)h=(h*31+x.charCodeAt(i))|0;return 'h'+(h>>>0).toString(36)}
function cfTitle(c){return (c.tech&&window.Manual&&Manual.title(c.tech))||c.title||''}
function techKey(c){return c.tech||('t:'+pnorm(c.title).replace(/[^a-z0-9α-ω]+/g,'-').slice(0,60))}
function cfDocId(mk,i){return safeSeg((S.uid||'me')+'_'+mk+'_'+i)}
function cfMine(mk,i){var id=cfDocId(mk,i);return (S.confirms||[]).find(function(x){return x.id===id})}
function cfTrades(c){if(!c.market)return [];return S.trades.filter(function(t){return t.by===c.by&&t.date===c.date&&hasR(t)&&symMatch(t.symbol,c.market)})}
function cfStats(list){var g={};list.forEach(function(c){var k=techKey(c),x=g[k]=g[k]||{key:k,tech:c.tech,title:c.title,n:0,win:0,loss:0,skip:0,last:'',r:0,rn:0};
    x.n++;if(c.outcome==='win')x.win++;else if(c.outcome==='loss')x.loss++;else if(c.outcome==='skip')x.skip++;if((c.date||'')>x.last)x.last=c.date;cfTrades(c).forEach(function(t){x.r+=t.r;x.rn++})});
  return Object.keys(g).map(function(k){var x=g[k];x.rate=x.win+x.loss?x.win/(x.win+x.loss):NaN;return x}).sort(function(a,b){return b.n-a.n||b.win-a.win})}
function cfBrief(c){var tr=cfTrades(c);return {date:c.date,who:c.by===S.uid?'me':name(c.by),technique:cfTitle(c),manual_id:c.tech||null,market:c.market||null,why:c.why||null,outcome:c.outcome||'pending',same_day_trades:tr.length,same_day_R:tr.length?Math.round(sum(tr.map(function(t){return t.r}))*100)/100:null}}
function cfContext(){var L=(S.confirms||[]).slice().sort(function(a,b){return (b.at||0)-(a.at||0)});
  return {total:L.length,by_technique:cfStats(L).slice(0,15).map(function(x){return {technique:cfTitle(x),manual_id:x.tech||null,confirmations:x.n,worked:x.win,failed:x.loss,not_taken:x.skip,success_rate:isFinite(x.rate)?Math.round(x.rate*100)/100:null,same_day_trades:x.rn,same_day_R:x.rn?Math.round(x.r*100)/100:null,last:x.last}}),recent:L.slice(0,25).map(cfBrief)}}
function techCards(m,mi){if(m.role==='user')return '';var items=techParse(m.content);if(!items.length)return '';var mk=msgKey(m),all=S.confirms||[];
  return '<div class="tcards"><div class="tch">Πάτα «Επιβεβαίωση» σε όποια τεχνική συμφωνείς:</div>'+items.map(function(t,i){var on=!!cfMine(mk,i),key=techKey({tech:t.id,title:t.title}),n=all.filter(function(c){return techKey(c)===key}).length;
    if(t.bad&&!on)return '<div class="tcard bad"><div class="tcm"><b>'+esc(t.title)+'</b>'+(t.market?'<span class="pill">'+esc(t.market)+'</span>':'')+(t.why?'<span class="tcw">'+esc(t.why)+'</span>':'')+techLvls(t)+'<span class="tcbad">✕ Απορρίφθηκε από τη σελίδα: '+esc(t.bad)+'.</span></div><button type="button" class="btn small" data-tfix="'+mi+'|'+i+'">Ζήτα διόρθωση</button></div>';
    return '<div class="tcard'+(on?' on':'')+'"><div class="tcm"><b>'+esc(t.title)+'</b>'+(t.market?'<span class="pill">'+esc(t.market)+'</span>':'')+(t.why?'<span class="tcw">'+esc(t.why)+'</span>':'')+techLvls(t)+(on?'<button type="button" class="linkbtn" data-cfdemo="'+esc(cfDocId(mk,i))+'">Δοκίμασέ τη σε demo</button>':'')+
      (t.id?'<button type="button" class="linkbtn" data-ref="'+esc(t.id)+'">Άνοιξε στον Μπούσουλα</button>':'')+(n?'<span class="tcn"><span>Επιβεβαιώσεις μέχρι τώρα:</span> <b>'+n+'</b></span>':'')+'</div>'+
      '<button type="button" class="btn small'+(on?' primary':'')+'" data-tconf="'+mi+'|'+i+'" aria-pressed="'+on+'">'+(on?'✓ Επιβεβαιώθηκε':'Επιβεβαίωση')+'</button></div>'}).join('')+'</div>'}
function cfToggle(mi,i){
  var m=PCH.msgs[mi];if(!m)return;var t=techParse(m.content)[i];if(!t)return;
  if(!qCanSave()){toast('Δεν μπορείς να αποθηκεύσεις επιβεβαίωση. Χρειάζεσαι δικαίωμα Editor και δικό σου λογαριασμό.');return}
  var mk=msgKey(m),id=cfDocId(mk,i),ex=cfMine(mk,i);
  if(!ex&&t.bad){toast('Η πρόταση απορρίφθηκε: '+t.bad+'.');return}
  if(ex){S.confirms=S.confirms.filter(function(x){return x.id!==id});renderChat();renderConfirms();remove('confirms',id).catch(function(e){toast(writeErr(e))});return}
  var q='';for(var k=mi-1;k>=0;k--){if(PCH.msgs[k].role==='user'){q=PCH.msgs[k];break}}
  var d={by:S.uid||'me',date:today(),time:nowTime(),at:Date.now(),tech:t.id,title:t.title,market:t.market,why:t.why,dir:t.dir,entry:t.entry,stop:t.stop,target:t.target,q:String(q&&q.content||'').slice(0,300),img:!!(q&&q.thumbs&&q.thumbs.length),outcome:null};
  S.confirms=[Object.assign({id:id},d)].concat((S.confirms||[]).filter(function(x){return x.id!==id}));renderChat();renderConfirms();profMood('cheer');
  if(!$('#profPanel').hidden)profOpen(false);dmFromConfirm(id);
  put('confirms',id,d).then(function(){}).catch(function(e){S.confirms=S.confirms.filter(function(x){return x.id!==id});toast(writeErr(e));if($('#pchat'))renderChat();renderConfirms()});
}
function cfSetOutcome(id,o){var x=(S.confirms||[]).find(function(c){return c.id===id});if(!x||x.by!==S.uid)return;
  if(!qCanSave()){toast('Δεν μπορείς να αποθηκεύσεις. Χρειάζεσαι δικαίωμα Editor.');return}
  var prev=x.outcome||null,d=Object.assign({},x);delete d.id;d.outcome=prev===o?null:o;d.outAt=Date.now();x.outcome=d.outcome;renderConfirms();
  put('confirms',id,d).catch(function(e){x.outcome=prev;renderConfirms();toast(writeErr(e))})}
function cfTable(list,lim){var st=cfStats(list).slice(0,lim||8);if(!st.length)return '';
  return '<div class="tw"><table class="cftab"><thead><tr><th>Τεχνική</th><th class="r">Επιβεβαιώσεις</th><th class="r">Δούλεψε</th><th class="r">Δεν δούλεψε</th><th class="r">Επιτυχία</th><th class="r">R ίδιας μέρας</th></tr></thead><tbody>'+
    st.map(function(x){return '<tr><td>'+(x.tech?'<button type="button" class="linkbtn" data-ref="'+esc(x.tech)+'">'+esc(cfTitle(x))+'</button>':esc(x.title))+'</td><td class="r num">'+x.n+'</td><td class="r num pos">'+x.win+'</td><td class="r num neg">'+x.loss+'</td><td class="r num">'+pct(x.rate)+'</td><td class="r num '+cls(x.r)+'">'+(x.rn?fR(x.r):'–')+'</td></tr>'}).join('')+'</tbody></table></div>'}
function cfItem(c,nh){var mine=c.by===S.uid,tr=cfTrades(c),o=c.outcome||'';
  var h=nh?'<div class="cfi">':'<div class="cfi"><div class="row" style="gap:.45rem;flex-wrap:wrap;align-items:center"><span class="muted num">'+esc(c.time||'')+'</span><span class="muted">'+esc(name(c.by))+'</span>'+
    (c.tech?'<button type="button" class="linkbtn" data-ref="'+esc(c.tech)+'"><b>'+esc(cfTitle(c))+'</b></button>':'<b>'+esc(cfTitle(c))+'</b>')+(c.market?'<span class="pill">'+esc(c.market)+'</span>':'')+(c.img?'<span class="pill">📷</span>':'')+'</div>';
  if(c.why)h+='<span class="why">'+esc(c.why)+'</span>';
  h+=techLvls(c);
  var dm=(S.demo||[]).filter(function(t){return t.cfId===c.id});
  if(dm.length)h+='<span class="cftr"><span>Demo:</span> '+dm.map(function(t){return dmStatusPill(t)+(isFinite(n(t.r))&&dmClosed(t)?' <b class="num '+cls(t.r)+'">'+fR(t.r)+'</b>':'')}).join(' ')+'</span>';
  else if(mine)h+='<button type="button" class="linkbtn" style="align-self:flex-start" data-cfdemo="'+esc(c.id)+'">Δοκίμασέ τη σε demo</button>';
  if(tr.length){var r=sum(tr.map(function(t){return t.r}));h+='<span class="cftr"><span>Συναλλαγές στο σύμβολο εκείνη τη μέρα:</span> <b class="num '+cls(r)+'">'+tr.length+' · '+fR(r)+'</b></span>'}
  if(mine)h+='<div class="cfo">'+[['win','Δούλεψε'],['loss','Δεν δούλεψε'],['skip','Δεν την πήρα']].map(function(x){return '<button type="button" class="'+x[0]+'" data-cfout="'+esc(c.id)+'|'+x[0]+'" aria-pressed="'+(o===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
  else h+='<span class="cftr">'+esc(o==='win'?'Δούλεψε':o==='loss'?'Δεν δούλεψε':o==='skip'?'Δεν την πήρε':'Χωρίς αποτέλεσμα ακόμα')+'</span>';
  return h+'</div>'}
function cfRow(c,open){var dm=(S.demo||[]).filter(function(t){return t.cfId===c.id}),o=c.outcome||'',st;
  if(o==='win')st='<span class="cfst win">✓ Δούλεψε</span>';else if(o==='loss')st='<span class="cfst loss">✗ Δεν δούλεψε</span>';else if(o==='skip')st='<span class="cfst">Δεν την πήρα</span>';
  else if(dm.length)st=dmStatusPill(dm[0]);else st='<span class="cfst">Χωρίς αποτέλεσμα</span>';
  var d=String(c.dir||'').toLowerCase(),dp=d.indexOf('long')===0||d==='buy'?'<span class="cfdir l">Long</span>':d.indexOf('short')===0||d==='sell'?'<span class="cfdir s">Short</span>':'';
  return '<details class="cfr"'+(open?' open':'')+'><summary><span class="muted num">'+esc(c.time||'')+'</span><b>'+esc(cfTitle(c))+'</b>'+dp+(c.market?'<span class="pill">'+esc(c.market)+'</span>':'')+(c.by!==S.uid?'<span class="muted">'+esc(name(c.by))+'</span>':'')+st+'<span class="cfchev" aria-hidden="true">›</span></summary>'+cfItem(c,true)+'</details>'}
function cfCompact(L){var td=today(),last=L.length?L[0].date:'',day=L.filter(function(c){return c.date===td}),lbl='Σήμερα';
  if(!day.length&&last){day=L.filter(function(c){return c.date===last});lbl='Τελευταία μέρα · '+dateGr(last)}
  var lim=CF.all?day.length:3,h='<div class="cfday"><h3>'+esc(lbl)+' <span class="num">('+day.length+')</span></h3>'+day.slice(0,lim).map(function(c){return cfRow(c,false)}).join('')+'</div>';
  if(day.length>lim)h+='<button type="button" class="linkbtn" id="cfAllDay">+ '+(day.length-lim)+' ακόμα</button>';return h}
function cfHistory(list){var days={},order=[];list.forEach(function(c){if(!days[c.date]){days[c.date]=[];order.push(c.date)}days[c.date].push(c)});order.sort().reverse();
  var shown=order.slice(0,CF.days),h='';
  shown.forEach(function(d){h+='<div class="cfday"><h3><span>'+esc(DAYS[new Date(d+'T12:00:00').getDay()]||'')+'</span> <span class="num">'+esc(dateGr(d))+'</span> <span class="num">('+days[d].length+')</span></h3>'+days[d].map(function(c){return cfRow(c,false)}).join('')+'</div>'});
  if(order.length>shown.length)h+='<button type="button" class="linkbtn" id="cfMore">Δείξε παλιότερες μέρες</button>';return h}
function renderConfirms(){
  var all=(S.confirms||[]).slice().sort(function(a,b){return (b.at||0)-(a.at||0)}),body=$('#cfBody');
  if(body){var L=CF.who==='me'?all.filter(function(c){return c.by===S.uid}):all;
    if(!L.length)body.innerHTML='<p class="muted">Ζήτα από τον Καθηγητή 3-4 τεχνικές (κουμπί πάνω δεξιά ή «Ρώτα με», και με φωτογραφία γραφήματος). Πάτα «Επιβεβαίωση» σε όποιες συμφωνείς. Εδώ μαζεύεται το ιστορικό μέρα με τη μέρα, και μετά σημειώνεις αν δούλεψε. Ο Καθηγητής διαβάζει αυτό το ιστορικό και μαθαίνει τι σας ταιριάζει.</p>';
    else{var dec=L.filter(function(c){return c.outcome==='win'||c.outcome==='loss'}),w=dec.filter(function(c){return c.outcome==='win'}).length,dd={};L.forEach(function(c){dd[c.date]=1});
      if(!CF.x){body.innerHTML='<div class="cfmini"><span><b class="num">'+L.length+'</b> επιβεβαιώσεις</span><span><b class="num">'+dec.length+'</b> με αποτέλεσμα</span><span><b class="num">'+pct(dec.length?w/dec.length:NaN)+'</b> δούλεψαν</span></div>'+cfCompact(L)+'<div class="cfbar"><button type="button" class="btn small xbtn" id="cfX">📊 Ανάλυση ανά τεχνική & ιστορικό ▾</button></div>'}
      else body.innerHTML='<div class="cfbar" style="margin:0 0 .5rem"><button type="button" class="btn small xbtn" id="cfX">Σύμπτυξη ▴</button></div><div class="cfk"><div><b class="num">'+L.length+'</b><span class="muted">επιβεβαιώσεις</span></div><div><b class="num">'+Object.keys(dd).length+'</b><span class="muted">μέρες</span></div><div><b class="num">'+dec.length+'</b><span class="muted">με αποτέλεσμα</span></div><div><b class="num">'+pct(dec.length?w/dec.length:NaN)+'</b><span class="muted">δούλεψαν</span></div></div>'+cfTable(L,8)+cfHistory(L)}}
  var mb=$('#mConf');
  if(mb){if(true){mb.hidden=true;mb.innerHTML=''}else{mb.hidden=false;mb.innerHTML='<div class="mconf-in"><div class="mconf-h"><h2>Οι επιβεβαιώσεις του Καθηγητή</h2><button type="button" class="linkbtn" data-cfgo>Όλο το ιστορικό</button></div><p class="muted">Οι τεχνικές που σας πρότεινε ο Καθηγητής και επιβεβαιώσατε, και πόσες φορές δούλεψαν. Στις κάρτες παρακάτω, το ✓ δείχνει επιβεβαιώσεις και δουλεμένες/κριμένες.</p>'+cfTable(all,10)+'</div>'}}
  $$('#manual .cfbadge').forEach(function(b){b.parentNode.removeChild(b)});
  cfStats(all).forEach(function(x){if(!x.tech)return;var el=document.getElementById(x.tech);if(!el||!el.closest('#manual'))return;var host=el.querySelector('summary')||el;var b=document.createElement('span');b.className='cfbadge';b.textContent='✓ '+x.n+(x.win+x.loss?' · '+x.win+'/'+(x.win+x.loss):'');b.title='Επιβεβαιώσεις Καθηγητή';host.appendChild(b)});
}
function cfAskNow(){QZ.tab='chat';profOpen(true);$('#profBody').innerHTML='';renderProf();setTimeout(function(){pAsk(LANG_RU()?'Предложи мне 3-4 техники из Компаса на сегодня, с учётом наших подтверждений и результатов.':'Πρότεινέ μου 3-4 τεχνικές του Μπούσουλα για σήμερα, με βάση τις επιβεβαιώσεις και τα αποτελέσματά μας.',false)},150)}
function bindConfirms(){
  document.addEventListener('click',function(e){
    var tc=e.target.closest('[data-tconf]');if(tc){var pr=tc.getAttribute('data-tconf').split('|');cfToggle(+pr[0],+pr[1]);return}
    var tf0=e.target.closest('[data-tfix]');if(tf0){var pp=tf0.getAttribute('data-tfix').split('|'),mm=PCH.msgs[+pp[0]],tt=mm&&techParse(mm.content)[+pp[1]];var q=$('#pq');if(q&&tt){q.value='Η πρόταση «'+tt.title+'»'+(tt.market?' ('+tt.market+')':'')+' απορρίφθηκε: '+tt.bad+'. Ξαναδώσ\'τη διορθωμένη με είσοδο, stop έως 9% και στόχο τουλάχιστον 1.5R, με βάση τα κεριά 15m και 1h.';q.focus();q.dispatchEvent(new Event('input'))}return}
    var cd=e.target.closest('[data-cfdemo]');if(cd){if(!$('#profPanel').hidden)profOpen(false);dmFromConfirm(cd.getAttribute('data-cfdemo'));return}
    var o=e.target.closest('[data-cfout]');if(o){var q=o.getAttribute('data-cfout').split('|');cfSetOutcome(q[0],q[1]);return}
    if(e.target.closest('#cfAsk')){cfAskNow();return}
    if(e.target.closest('#cfMore')){CF.days+=14;renderConfirms();return}
    if(e.target.closest('#cfX')){CF.x=!CF.x;try{localStorage.setItem('tj-cfx',CF.x?'1':'0')}catch(_){}renderConfirms();if(!CF.x){var cc=$('#cfCard');if(cc&&cc.getBoundingClientRect().top<0)cc.scrollIntoView({block:'start'})}return}
    if(e.target.closest('#cfAllDay')){CF.all=true;renderConfirms();return}
    if(e.target.closest('#insMore')){window.__insx=!($('#insMore').getAttribute('aria-expanded')==='true');try{localStorage.setItem('tj-insx',window.__insx?'1':'0')}catch(_){}renderToday();return}
    if(e.target.closest('[data-cfgo]')){showTab('today');setTimeout(function(){var c=$('#cfCard');if(c)c.scrollIntoView({block:'start'})},80)}
  });
  var w=$('#cf-who');if(w)w.addEventListener('change',function(){CF.who=w.value;renderConfirms()});
}

/* ================= Η παρέα μας: κοινή συζήτηση (αποθηκεύεται για όλα τα μέλη) ================= */
var GRP={img:null,thumb:null,busy:false,note:'',n:-1,view:'chat',lcat:'all',lq:'',lbusy:false,lnote:''};
function gTime(at){var d=new Date(at||Date.now()),p2=function(x){return String(x).padStart(2,'0')};return (d.toDateString()===new Date().toDateString()?'':p2(d.getDate())+'/'+p2(d.getMonth()+1)+' ')+p2(d.getHours())+':'+p2(d.getMinutes())}
function gNote(t){GRP.note=t||'';var el=$('#gNote');if(el)el.textContent=GRP.note}
function grpIsOpen(){return QZ.tab==='group'&&!$('#profPanel').hidden}
function grpEl(){return $('#profBody')}
function renderGroup(){
  if(GRP.view==='lib')return renderLib();
  if(!grpIsOpen())return;var body=grpEl(),can=qCanSave(),list=S.chat||[],q0=$('#gq'),keep=q0?q0.value:'',hadFocus=!!(document.activeElement&&document.activeElement.id==='gq');
  var first=GRP.n<0||!$('#gchat'),atBot=first||body.scrollHeight-body.scrollTop-body.clientHeight<120,oldTop=body.scrollTop,lastSeen=GRP.lastAt||0,mx=list.reduce(function(a,m){return Math.max(a,m.at||0)},0),mineNew=list.some(function(m){return m.by===S.uid&&(m.at||0)>lastSeen});
  var h=grpTabs()+(GRP.sOpen?'<div class="gsearch"><input id="gSearch" type="search" placeholder="Αναζήτηση στη συζήτηση…" value="'+esc(GRP.sq||'')+'"></div>':'')+'<div class="pchat gchat" id="gchat">';
  if(!list.length)h+='<p class="qmsg">Εδώ μιλάτε όλοι μαζί: γράφετε ιδέες, μοιράζεστε γραφήματα και ό,τι σας αφορά. Ό,τι γράψετε μένει αποθηκευμένο.</p>';
  h+=grpListHtml(list,first,lastSeen);
  h+='</div>';
  if(!can)h+=qWarn();
  h+=(GRP.thumb?'<div class="pprev"><span class="thumb"><img src="'+GRP.thumb+'" alt=""><button type="button" class="x" data-gunimg="1" aria-label="Αφαίρεση εικόνας">×</button></span></div>':'')+
    '<div class="gfoot"><button type="button" class="gdown" id="gDown" hidden>⬇ <span></span></button><div class="gtype" id="gType"></div>'+grpBarHtml()+grpQuickHtml()+'<div class="pinput"><textarea id="gq" rows="3" placeholder="'+(GRP.edit?'Διόρθωσε το μήνυμα…':'Γράψε μήνυμα…')+'" aria-label="Μήνυμα στην παρέα"'+(can?'':' disabled')+'></textarea>'+
    '<p class="gnote muted" id="gNote">'+esc(GRP.note)+'</p>'+
    '<div class="pbtns"><div class="row" style="gap:.3rem;flex-wrap:nowrap"><label class="pmic pimg" aria-label="Στείλε εικόνα">'+imgIcon()+'<input type="file" id="gFile" multiple accept="image/*,video/mp4,video/webm,application/pdf,.pdf,.csv,.txt,.md,.json" hidden'+(can&&!GRP.busy?'':' disabled')+'></label>'+(can?emoBtn('gq'):'')+'</div>'+
    '<button type="button" class="btn primary" id="gSend" aria-label="Στείλε" title="Στείλε (Enter)"'+(can&&!GRP.busy?'':' disabled')+'>'+(GRP.edit?'Αποθήκευση':'Στείλε')+'</button></div></div></div>';
  var sFoc=document.activeElement&&document.activeElement.id==='gSearch';
  body.innerHTML=h;grpTypeShow();if(!GTY.tick)grpTypeTick();
  if(sFoc){var si=$('#gSearch');if(si){si.focus();try{si.setSelectionRange(si.value.length,si.value.length)}catch(e){}}}
  if($('#gq')){$('#gq').value=keep;if(hadFocus)$('#gq').focus()}
  var fresh=first?0:list.filter(function(m){return m.by!==S.uid&&(m.at||0)>lastSeen}).length;GRP.lastAt=Math.max(lastSeen,mx);GRP.n=list.length;
  if(atBot||mineNew){grpBottom(false);GRP.pend=0}else{body.scrollTop=oldTop;GRP.pend=(GRP.pend||0)+fresh}
  grpDownBtn();
  Array.prototype.forEach.call(body.querySelectorAll('#gchat img'),function(im){if(!im.complete)im.addEventListener('load',function(){if(GRP.stick)grpBottom(false)},{once:true})});
}
function grpBottom(smooth){var b=grpEl();if(!b)return;GRP.stick=true;if(smooth&&b.scrollTo)b.scrollTo({top:b.scrollHeight,behavior:'smooth'});else b.scrollTop=b.scrollHeight;GRP.pend=0;grpDownBtn()}
function grpDownBtn(){var d=$('#gDown');if(!d)return;var b=grpEl(),far=b.scrollHeight-b.scrollTop-b.clientHeight>120;d.hidden=!far;d.classList.toggle('has',!!GRP.pend);d.querySelector('span').textContent=GRP.pend?(GRP.pend===1?'1 νέο μήνυμα':GRP.pend+' νέα μηνύματα'):'Τέλος συζήτησης'}
function grpScrollWatch(){var b=grpEl();if(!b||b.dataset.gsw)return;b.dataset.gsw='1';b.addEventListener('scroll',function(){if(!grpIsOpen()||GRP.view==='lib')return;var near=b.scrollHeight-b.scrollTop-b.clientHeight<120;GRP.stick=near;if(near)GRP.pend=0;grpDownBtn()},{passive:true});
  b.addEventListener('click',function(e){if(e.target.closest('#gDown'))grpBottom(true)})}
/* ----- Βιβλιοθήκη αρχείων της παρέας ----- */
var LIBCAT=[['all','Όλα'],['img','Εικόνες'],['chart','Γραφήματα'],['doc','Έγγραφα'],['strat','Στρατηγικές'],['other','Διάφορα']];
var LIBEXT={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',pdf:'application/pdf',csv:'text/csv',md:'text/markdown',json:'application/json',txt:'text/plain'};
function libType(f){var ext=(String(f.name||'').split('.').pop()||'').toLowerCase(),t=(f.type||'').split(';')[0];if(t==='image/jpg')t='image/jpeg';var ok=Object.keys(LIBEXT).map(function(k){return LIBEXT[k]});return ok.indexOf(t)>=0?t:(LIBEXT[ext]||'')}
function libKind(t){return /^image\//.test(t)?'img':/^video\//.test(t)?'video':t==='application/pdf'?'pdf':'text'}
function libSize(b){return !isFinite(b)?'':b>=1048576?fmt(b/1048576,1)+' MB':b>=1024?fmt(b/1024,0)+' KB':b+' B'}
function libIcon(k){return k==='pdf'?'PDF':k==='video'?'▶':k==='text'?'TXT':'🖼'}
function libChip(f){return '<a class="libchip" href="'+esc('/_blob/'+f.id)+'" target="_blank" rel="noopener noreferrer"><span class="libic">'+esc(libIcon(libKind(f.type||'')))+'</span><span>'+esc(f.name||'αρχείο')+'</span></a>'}
function libAll(){var L=(S.files||[]).map(function(f){return Object.assign({src:'lib'},f)}),seen={};L.forEach(function(f){seen[f.asset]=1});
  (S.chat||[]).forEach(function(m){if(m.img&&!seen[m.img])L.push({id:'c_'+m.id,src:'chat',asset:m.img,name:(m.text||'').slice(0,40)||(LANG_RU()?'Изображение из чата':'Εικόνα από τη συζήτηση'),type:'image/jpeg',cat:'img',by:m.by,at:m.at})});
  return L.sort(function(a,b){return (b.at||0)-(a.at||0)})}
function grpTabs(){return '<div class="advtabs grptabs" role="tablist"><button type="button" data-gview="chat" aria-selected="'+(GRP.view==='chat')+'">'+esc(LANG_RU()?'Чат':'Συζήτηση')+'</button><button type="button" data-gview="lib" aria-selected="'+(GRP.view==='lib')+'">'+esc(LANG_RU()?'Библиотека':'Βιβλιοθήκη')+' <span class="muted">'+libAll().length+'</span></button>'+(GRP.view==='chat'?'<button type="button" class="gsbtn" data-gsearch="1" aria-pressed="'+!!GRP.sOpen+'" title="Αναζήτηση">🔍</button>':'')+'</div>'}
function renderLib(){if(!grpIsOpen())return;var body=grpEl(),can=qCanSave(),qv=$('#libQ')?$('#libQ').value:GRP.lq,foc=document.activeElement&&document.activeElement.id==='libQ';GRP.lq=qv;
  var all=libAll(),q=pnorm(qv),L=all.filter(function(f){var k=libKind(f.type||'');if(GRP.lcat!=='all'){if(GRP.lcat==='img'&&k!=='img')return false;if(GRP.lcat==='doc'&&!(k==='pdf'||k==='text'))return false;if(GRP.lcat!=='img'&&GRP.lcat!=='doc'&&f.cat!==GRP.lcat)return false}
    return !q||pnorm((f.name||'')+' '+(f.note||'')+' '+name(f.by)).indexOf(q)>=0});
  var h=grpTabs()+'<div class="libbar"><input id="libQ" type="search" placeholder="'+esc(LANG_RU()?'Поиск файлов…':'Αναζήτηση αρχείων…')+'" value="'+esc(qv)+'"><div class="libcats">'+LIBCAT.map(function(c){return '<button type="button" data-lcat="'+c[0]+'" aria-pressed="'+(GRP.lcat===c[0])+'">'+esc(c[1])+'</button>'}).join('')+'</div></div>';
  if(can)h+='<div class="libup"><label class="btn small primary"><span>'+esc(LANG_RU()?'Загрузить файлы':'Ανέβασε αρχεία')+'</span><input type="file" id="libFile" multiple accept="image/*,video/mp4,video/webm,application/pdf,.pdf,.csv,.txt,.md,.json" hidden></label><select id="libUpCat" class="dmsel" aria-label="Κατηγορία">'+LIBCAT.filter(function(c){return c[0]!=='all'&&c[0]!=='img'&&c[0]!=='doc'}).map(function(c){return '<option value="'+c[0]+'">'+esc(c[1])+'</option>'}).join('')+'</select><input id="libNote" class="libnote" maxlength="120" placeholder="'+esc(LANG_RU()?'Заметка (необязательно)':'Σημείωση (προαιρετικό)')+'"></div><p class="muted libhint">'+esc(LANG_RU()?'Изображения, PDF, видео MP4/WebM, CSV, TXT, MD, JSON · до 20 MB на файл. Word и Excel: сохраните как PDF или CSV.':'Εικόνες, PDF, βίντεο MP4/WebM, CSV, TXT, MD, JSON · έως 20 MB το καθένα. Word και Excel: αποθήκευσέ τα ως PDF ή CSV.')+'</p>';
  else h+=qWarn();
  h+='<p class="gnote muted" id="libMsg">'+esc(GRP.lnote)+'</p>';
  if(!L.length)h+='<div class="empty">'+esc(all.length?(LANG_RU()?'Ничего не найдено.':'Δεν βρέθηκε τίποτα.'):(LANG_RU()?'Здесь будут файлы и изображения компании. Изображения из чата попадают сюда автоматически.':'Εδώ θα μαζεύονται τα αρχεία και οι εικόνες της παρέας. Οι εικόνες της συζήτησης μπαίνουν αυτόματα.'))+'</div>';
  else h+='<div class="libgrid">'+L.map(function(f){var k=libKind(f.type||''),u='/_blob/'+f.asset,mine=f.by===S.uid&&f.src==='lib';
    return '<div class="libcard"><div class="libprev">'+(k==='img'?'<img src="'+esc(u)+'" alt="" loading="lazy" data-zoom="1">':'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer" class="libbig">'+esc(libIcon(k))+'</a>')+'</div>'+
      '<div class="libmeta"><b title="'+esc(f.name||'')+'">'+esc(f.name||'')+'</b>'+(f.note?'<span class="libnotev">'+esc(f.note)+'</span>':'')+'<span class="muted">'+esc(name(f.by))+' · '+esc(gTime(f.at))+(f.size?' · '+libSize(f.size):'')+(f.src==='chat'?' · 💬':'')+'</span></div>'+
      '<div class="libact"><a class="linkbtn" href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(LANG_RU()?'Открыть':'Άνοιγμα')+'</a><button type="button" class="linkbtn" data-libdl="'+esc(f.id)+'">'+esc(LANG_RU()?'Скачать':'Λήψη')+'</button>'+(f.src==='lib'&&can?'<button type="button" class="linkbtn" data-libsend="'+esc(f.id)+'">'+esc(LANG_RU()?'В чат':'Στη συζήτηση')+'</button>':'')+(mine?'<button type="button" class="linkbtn libdel" data-libdel="'+esc(f.id)+'">'+esc(LANG_RU()?'Удалить':'Διαγραφή')+'</button>':'')+'</div></div>'}).join('')+'</div>';
  body.innerHTML=h;if(foc){var qi=$('#libQ');qi.focus();try{qi.setSelectionRange(qi.value.length,qi.value.length)}catch(e){}}}
function libNote(t){GRP.lnote=t||'';var el=$('#libMsg');if(el)el.textContent=GRP.lnote}
function libUpload(files){files=Array.prototype.slice.call(files||[]);if(!files.length||GRP.lbusy)return;if(!qCanSave()){libNote(LANG_RU()?'Нет права сохранять.':'Δεν έχεις δικαίωμα αποθήκευσης.');return}
  var cat=$('#libUpCat')?$('#libUpCat').value:'other',note=$('#libNote')?$('#libNote').value.trim().slice(0,120):'',done=0,bad=[];GRP.lbusy=true;
  var noA=false;assetsNs().then(function(A){if(!A){noA=true;return}
    var chain=Promise.resolve();files.forEach(function(f,i){chain=chain.then(function(){var t=libType(f);if(!t){bad.push(f.name);return}if(f.size>20*1048576){bad.push(f.name+' (>20 MB)');return}
      libNote((LANG_RU()?'Загрузка ':'Ανέβασμα ')+(i+1)+'/'+files.length+'…');
      return A.upload(f,{type:t}).then(function(r){done++;var c2=cat;if(c2==='other'&&/^image\//.test(t))c2='img';
        return put('files',newId(),{by:S.uid||'me',name:String(f.name||'file').slice(0,120),type:t,size:r.sizeBytes||f.size,asset:r.id,cat:c2,note:note,at:Date.now()})}).catch(function(e){var c=e&&e.code;bad.push(f.name+(c==='unsupported_type'?' ('+(LANG_RU()?'тип не поддерживается':'μη υποστηριζόμενος τύπος')+')':c==='too_large'?' (>20 MB)':c==='quota_or_state'?' ('+(LANG_RU()?'хранилище заполнено':'γέμισε ο χώρος')+')':''))})})});
    return chain}).then(function(){GRP.lbusy=false;if(noA){libNote(LANG_RU()?'Файлы недоступны в этом просмотре. Откройте страницу через claude.ai.':'Τα αρχεία δεν είναι διαθέσιμα σε αυτή την προβολή. Άνοιξε τη σελίδα μέσα από το claude.ai.');return}var n0=$('#libNote');if(n0)n0.value='';libNote((done?(LANG_RU()?'Загружено: ':'Ανέβηκαν: ')+done:'')+(bad.length?((done?' · ':'')+(LANG_RU()?'Не загружены: ':'Δεν ανέβηκαν: ')+bad.join(', ')):''));if(!S.db)renderGroup()})
   .catch(function(){GRP.lbusy=false;libNote(LANG_RU()?'Загрузка не удалась.':'Το ανέβασμα απέτυχε.')})}
function libFind(id){return libAll().find(function(f){return f.id===id})}
function libDownload(id){var f=libFind(id);if(!f)return;libNote(LANG_RU()?'Подготовка…':'Ετοιμάζω τη λήψη…');fetch('/_blob/'+f.asset).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){libNote('');var nm=f.name||'file';if(!/\.[a-z0-9]{2,5}$/i.test(nm)){var ex=Object.keys(LIBEXT).find(function(k){return LIBEXT[k]===f.type});if(ex)nm+='.'+ex}saveFile(nm,b,f.type)}).catch(function(){libNote('');window.open('/_blob/'+f.asset,'_blank','noopener')})}
function libDelete(id,btn){var f=libFind(id);if(!f||f.by!==S.uid)return;if(!btn.dataset.armed){btn.dataset.armed='1';btn.textContent=LANG_RU()?'Точно?':'Σίγουρα;';setTimeout(function(){if(btn){delete btn.dataset.armed;btn.textContent=LANG_RU()?'Удалить':'Διαγραφή'}},3500);return}
  remove('files',f.id).then(function(){return assetsNs().then(function(A){if(A&&A.delete&&!(S.chat||[]).some(function(m){return m.img===f.asset}))return A.delete(f.asset).catch(function(){})})}).catch(function(e){libNote(writeErr(e))});if(!S.db)renderGroup()}
function libSend(id){var f=libFind(id);if(!f||!qCanSave())return;var isImg=/^image\//.test(f.type||'');
  put('chat',newId(),{by:S.uid||'me',text:isImg?(f.note||''):(f.note||''),img:isImg?f.asset:null,file:isImg?null:{id:f.asset,name:f.name,type:f.type},at:Date.now()}).then(function(){GRP.view='chat';GRP.n=-1;if(!S.db)grpOnData();renderGroup()}).catch(function(e){libNote(writeErr(e))})}
var GRPU={read:0,seen:0,init:false,bt:null};
try{GRPU.read=+localStorage.getItem('tj-grpread')||0}catch(e){}
if(!GRPU.read)GRPU.read=Date.now()-864e5;
function grpMaxAt(){return (S.chat||[]).reduce(function(a,m){return Math.max(a,m.at||0)},0)}
function grpUnread(){return (S.chat||[]).filter(function(m){return m.by&&m.by!==S.uid&&(m.at||0)>GRPU.read}).length}
function grpMarkRead(){if(document.visibilityState==='hidden')return;var mx=grpMaxAt();if(mx>GRPU.read){GRPU.read=mx;try{localStorage.setItem('tj-grpread',String(mx))}catch(e){}}grpBadge()}
function grpBadge(){var n2=grpUnread(),b=$('#grpBadge');try{grpTitle()}catch(e){}if(!b)return;b.hidden=!n2;b.textContent=n2>9?'9+':String(n2);$('#grpBtn').classList.toggle('has',!!n2);
  $('#grpBtn').setAttribute('aria-label',(n2?n2+' ':'')+(LANG_RU()?'новых · Наша компания':'νέα · Η παρέα μας'))}
function grpToast(m){var b=$('#grpBubble');if(!b)return;var t=(m.text||'').replace(/\s+/g,' ').slice(0,110)||(m.img?'📷':'');
  $('#grpSay').innerHTML='<b>'+esc(name(m.by))+'</b><span>'+esc(t)+(m.img&&m.text?' 📷':'')+'</span>';b.hidden=false;var pb=$('#profBubble');if(pb)pb.hidden=true;clearTimeout(GRPU.bt);GRPU.bt=setTimeout(function(){b.hidden=true},9000);
  var btn=$('#grpBtn');btn.classList.remove('ping');void btn.offsetWidth;btn.classList.add('ping')}
var GTITLE={base:null};function grpTitle(){if(GTITLE.base===null)GTITLE.base=document.title.replace(/^\(\d+\+?\)\s*/,'');var n2=grpUnread();document.title=(n2&&(document.visibilityState==='hidden'||!grpIsOpen())?'('+(n2>9?'9+':n2)+') ':'')+GTITLE.base}
function grpPing(){try{var A=window.AudioContext||window.webkitAudioContext;if(!A)return;var c=GRPU.ac||(GRPU.ac=new A());if(c.state==='suspended')c.resume();var o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(880,t);o.frequency.setValueAtTime(1175,t+0.09);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.12,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.32);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+0.34)}catch(e){}}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&grpIsOpen()){grpMarkRead()}try{grpTitle()}catch(e){}});
function grpOnData(){var open=grpIsOpen();if(GRPU.init){var nw=(S.chat||[]).filter(function(m){return m.by&&m.by!==S.uid&&(m.at||0)>GRPU.seen});if(nw.length&&(document.visibilityState==='hidden'||!open))grpPing()}grpScrollWatch();
  if(open){renderGroup();grpMarkRead()}
  else if(GRPU.init){var fresh=(S.chat||[]).filter(function(m){return m.by&&m.by!==S.uid&&(m.at||0)>GRPU.seen});if(fresh.length)grpToast(fresh[fresh.length-1])}
  GRPU.seen=Math.max(GRPU.seen,grpMaxAt());GRPU.init=true;grpBadge();grpSub();grpTitle()}
function grpSub(){var el=$('#grpSub');if(!el)return;var mm={};qUsers().forEach(function(u){mm[u]=1});(S.chat||[]).forEach(function(m){if(m.by)mm[m.by]=1});var us=Object.keys(mm).filter(function(u){return u!=='me'||!S.db});el.textContent=us.length>1?us.map(function(u){return u===S.uid?(LANG_RU()?'я':'εγώ'):name(u)}).join(', '):(LANG_RU()?'Общий чат':'Κοινή συζήτηση')}
function grpOpen(on){$('#grpPanel').hidden=true;$('#grpBubble').hidden=true;if(on){QZ.tab='group';GRP.n=-1;GRP.pend=0;profOpen(true);grpMarkRead();grpSub();setTimeout(function(){var q=$('#gq');if(q&&window.innerWidth>600)q.focus()},60)}else if(QZ.tab==='group')profOpen(false)}
function bindGrp(){
  $('#grpBtn').addEventListener('click',function(){grpOpen(!grpIsOpen())});
  $('#grpClose').addEventListener('click',function(){grpOpen(false)});
  $('#grpBubble').addEventListener('click',function(e){if(e.target.closest('.x')){$('#grpBubble').hidden=true;return}grpOpen(true)});
  var gw=function(on){$('#grpPanel').classList.toggle('wide',on);var b=$('#grpWide');b.textContent=on?'⤡':'⤢';b.setAttribute('aria-pressed',on?'true':'false');try{localStorage.setItem('tj-gwide',on?'1':'0')}catch(e){}};
  try{if(localStorage.getItem('tj-gwide')==='1')gw(true)}catch(e){}
  $('#grpWide').addEventListener('click',function(){gw(!$('#grpPanel').classList.contains('wide'))});
  var P=$('#profBody'),on=function(t,f){P.addEventListener(t,function(e){if(QZ.tab!=='group')return;f(e)})};
  on('click',function(e){
    var gv=e.target.closest('[data-gview]');if(gv){GRP.view=gv.getAttribute('data-gview');GRP.n=-1;renderGroup();return}
    var lc=e.target.closest('[data-lcat]');if(lc){GRP.lcat=lc.getAttribute('data-lcat');renderGroup();return}
    var ld=e.target.closest('[data-libdl]');if(ld){libDownload(ld.getAttribute('data-libdl'));return}
    var ls=e.target.closest('[data-libsend]');if(ls){libSend(ls.getAttribute('data-libsend'));return}
    var lx=e.target.closest('[data-libdel]');if(lx){libDelete(lx.getAttribute('data-libdel'),lx);return}
    if(e.target.closest('#gSend')){gSend();return}
    var gd=e.target.closest('[data-gdel]');if(gd){if(!gd.dataset.armed){gd.dataset.armed='1';gd.textContent='Σίγουρα;';gd.classList.add('armed');setTimeout(function(){if(gd){delete gd.dataset.armed;gd.classList.remove('armed');gd.textContent='🗑️'}},3500);return}
      var gid=gd.getAttribute('data-gdel');(S.chatrx||[]).forEach(function(r){if(r.m===gid&&r.by===S.uid)remove('chatrx',r.id).catch(function(){})});
      remove('chat',gd.getAttribute('data-gdel')).catch(function(e2){gNote(writeErr(e2));renderGroup()});return}
    if(e.target.closest('[data-gunimg]')){GRP.img=null;GRP.thumb=null;renderGroup();return}
    if(GRP.view==='chat')grpActClick(e)});
  on('change',function(e){if(e.target.id==='gFile'){var fl=Array.prototype.slice.call(e.target.files||[]);if(fl.length===1&&/^image\//.test(fl[0].type||''))gPick(fl);else gDropFiles(fl);e.target.value=''}if(e.target.id==='libFile'){libUpload(e.target.files);e.target.value=''}});
  on('mouseover',function(e){var pm=e.target.closest&&e.target.closest('#gchat .pmsg.gm');if(pm&&pm!==GRP.hov){GRP.hov=pm;grpFlip(pm)}});
  on('keydown',function(e){if(e.target.id==='gq'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();gSend();return}
    if(e.target.id==='gq'&&e.key==='Escape'&&(GRP.re||GRP.edit)){e.preventDefault();var wasE=!!GRP.edit;GRP.re=null;GRP.edit=null;renderGroup();if(wasE){var q=$('#gq');if(q){q.value=GRP.editPrev||'';GRP.editPrev=''}}return}
    if(e.target.id==='gq'&&e.key==='ArrowUp'&&!e.target.value){var mm=(S.chat||[]).filter(function(m){return m.by===S.uid&&m.text&&!m.file}).pop();if(mm){e.preventDefault();var b0=document.createElement('button');b0.setAttribute('data-gedit',mm.id);grpActClick({target:b0})}}});
  on('input',function(e){if(e.target.id==='libQ'){GRP.lq=e.target.value;clearTimeout(GRP.lqt);GRP.lqt=setTimeout(renderLib,200);return}if(e.target.id==='gSearch'){GRP.sq=e.target.value;clearTimeout(GRP.sqt);GRP.sqt=setTimeout(function(){GRP.n=-1;renderGroup()},180);return}if(e.target.id==='gq'){if(e.target.value)grpTyping();var t=e.target;t.style.height='auto';t.style.height=Math.min(t.scrollHeight+2,window.innerHeight*.45)+'px'}});
  var dz=0,isF=function(e){var t=e.dataTransfer&&e.dataTransfer.types;return !!t&&Array.prototype.indexOf.call(t,'Files')>=0},dov=function(on){var o=$('#grpDrop');o.hidden=!on;if(on){$('#grpDropS').textContent=GRP.view==='lib'?(LANG_RU()?'Загружаются в библиотеку компании':'Ανεβαίνουν στη βιβλιοθήκη της παρέας'):(LANG_RU()?'Отправляются в чат и попадают в библиотеку':'Στέλνονται στη συζήτηση και μπαίνουν στη βιβλιοθήκη')}};
  on('dragenter',function(e){if(!isF(e))return;e.preventDefault();dz++;dov(true)});
  on('dragover',function(e){if(!isF(e))return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy'});
  on('dragleave',function(e){if(!isF(e))return;dz=Math.max(0,dz-1);if(!dz)dov(false)});
  on('drop',function(e){dz=0;dov(false);if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;e.preventDefault();var fl=e.dataTransfer.files;if(GRP.view==='lib')libUpload(fl);else gDropFiles(fl)});
  on('paste',function(e){if(GRP.view==='lib'&&e.target.id==='libQ')return;var it=e.clipboardData&&e.clipboardData.items;if(!it)return;var fs=[];for(var k=0;k<it.length;k++)if(it[k].kind==='file')fs.push(it[k].getAsFile());if(fs.length>1||fs.length===1&&!/^image\//.test(fs[0].type||'')){e.preventDefault();if(GRP.view==='lib')libUpload(fs);else gDropFiles(fs);return}for(var i=0;i<it.length;i++)if(it[i].kind==='file'&&/^image\//.test(it[i].type)){e.preventDefault();gPick([it[i].getAsFile()]);return}});
  
  var gb=$('#grpBtn');gb.addEventListener('dragover',function(e){if(!isF(e))return;e.preventDefault();gb.classList.add('drop')});gb.addEventListener('dragleave',function(){gb.classList.remove('drop')});
  gb.addEventListener('drop',function(e){gb.classList.remove('drop');if(!(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length))return;e.preventDefault();var fl=Array.prototype.slice.call(e.dataTransfer.files);GRP.view='chat';grpOpen(true);setTimeout(function(){gDropFiles(fl)},60)});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&grpIsOpen())grpMarkRead()});
  grpBadge();
}
/* ----- Chat+: emoji, αντιδράσεις, απάντηση, επεξεργασία, πληκτρολογεί… ----- */
var EMO=[
 ['⏱','Πρόσφατα',[]],
 ['😀','Φατσούλες','😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 😎 🤓 🧐 🤔 🤨 😐 😑 😶 🙄 😏 😬 😌 😴 🥱 😷 🤒 🤯 🥳 🥺 😢 😭 😤 😠 😡 🤬 😱 😨 😰 😳 🤗 🤭 🤫 🫡 🫠 😮 😲 🙃 🤑 🤠 🥲 😵‍💫 💀 🤡 👻 🤖'],
 ['👍','Χέρια','👍 👎 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👋 🙌 👏 🙏 🤝 💪 👊 ✊ 🫶 ☝️ 👆 👇 👉 👈 ✋ 🖐️ 🫵 👀 🧠 🗣️ 🏃 🕺 💃 🤷 🤦 🙋 🙇'],
 ['📈','Trading','📈 📉 📊 💹 💰 💵 💶 💸 🪙 💎 🚀 🌙 🔥 🐂 🐻 🐋 🦈 🐳 ⚡ 🎯 🛡️ ⚠️ 🛑 ✅ ❌ ⏳ ⌛ 🕐 🔔 📌 📍 🧭 🏦 💳 🧾 🤑 🏆 🥇 🎰 🎲 🧨 💣 🩸 🟢 🔴 🟡 🔵 ⬆️ ⬇️ ↗️ ↘️ 🔄'],
 ['❤️','Καρδιές','❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💖 💗 💓 💞 💕 💘 💝 💔 ❣️ 💯 💢 💥 💫 💦 💨 ✨ ⭐ 🌟 ☀️ 🌈 ❄️ 💤 ❗ ❓ ‼️ ⁉️ ♻️ ✔️ ➕ ➖'],
 ['🎉','Γιορτή','🎉 🎊 🥂 🍾 🎁 🎈 🎂 🍰 🏅 🎖️ 👑 💐 🌹 🎶 🎵 🎤 🎧 📸 🎬 🎮 ⚽ 🏀 🎾 🏁 ✈️ 🏖️ 🏝️ ⛵ 🚗 🏠 💻 📱 ⌚ 📚 ✏️ 📝 💡 🔑 🔒 🧲'],
 ['☕','Φαγητό','☕ 🍵 🧃 🍺 🍻 🍷 🥃 🍸 🍹 🍕 🍔 🍟 🌭 🥪 🌮 🍝 🍜 🍣 🥗 🥙 🧀 🥐 🍩 🍪 🍫 🍿 🍦 🍉 🍓 🍒 🍑 🍋 🍊 🍎 🫒 🌶️ 🧂'],
 ['🐶','Ζώα','🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦅 🦉 🐺 🐴 🦄 🐝 🦋 🐌 🐢 🐍 🐙 🦀 🐬 🐟 🌵 🌴 🌲 🍀 🌻']
];
EMO.forEach(function(c){if(typeof c[2]==='string')c[2]=c[2].split(' ').filter(Boolean)});
var GRX=['👍','❤️','😂','🔥','🚀','😮','🙏'];
var EP={target:null,cat:1,rxFor:null};
function emoRecent(){try{return JSON.parse(localStorage.getItem('tj-emorec')||'[]')}catch(e){return []}}
function emoRemember(e){var r=emoRecent().filter(function(x){return x!==e});r.unshift(e);r=r.slice(0,32);try{localStorage.setItem('tj-emorec',JSON.stringify(r))}catch(x){}}
function emoBtn(tid){return '<button type="button" class="pmic pemo" data-emo="'+tid+'" aria-label="Emoji" title="Emoji">😊</button>'}
function emoPop(){var p=$('#emoPop');if(!p){p=document.createElement('div');p.id='emoPop';p.className='emopop';p.hidden=true;p.setAttribute('role','dialog');p.setAttribute('aria-label','Emoji');document.body.appendChild(p);
  p.addEventListener('mousedown',function(e){if(e.target.closest('button'))e.preventDefault()});
  p.addEventListener('click',function(e){var c=e.target.closest('[data-ecat]');if(c){EP.cat=+c.getAttribute('data-ecat');emoDraw();return}
    var b=e.target.closest('[data-e]');if(b)emoPick(b.getAttribute('data-e'))})}
  return p}
function emoDraw(){var p=emoPop(),rec=emoRecent();if(EP.cat===0&&!rec.length)EP.cat=1;
  var L=EP.cat===0?rec:EMO[EP.cat][2];
  p.innerHTML='<div class="emotabs">'+EMO.map(function(c,i){return (i===0&&!rec.length)?'':'<button type="button" data-ecat="'+i+'" aria-pressed="'+(EP.cat===i)+'" title="'+esc(c[1])+'">'+c[0]+'</button>'}).join('')+'</div>'+
    (EP.rxFor?'<div class="emocap">Αντίδραση στο μήνυμα</div>':'<div class="emocap">'+esc(EMO[EP.cat][1])+'</div>')+
    '<div class="emogrid">'+L.map(function(e){return '<button type="button" data-e="'+esc(e)+'">'+e+'</button>'}).join('')+'</div>'}
function emoPlace(anchor){var p=emoPop(),r=anchor.getBoundingClientRect(),w=Math.min(312,window.innerWidth-16);p.style.width=w+'px';
  var left=Math.max(8,Math.min(r.right-w,window.innerWidth-w-8));p.style.left=left+'px';
  var h=p.offsetHeight||300;var top=r.top-h-8;if(top<8)top=Math.min(window.innerHeight-h-8,r.bottom+8);p.style.top=Math.max(8,top)+'px'}
function emoOpen(anchor,tid,rxFor){var p=emoPop();if(!p.hidden&&EP.anchor===anchor){emoClose();return}
  EP.target=tid||null;EP.rxFor=rxFor||null;EP.anchor=anchor;if(rxFor)EP.cat=emoRecent().length?0:3;p.hidden=false;emoDraw();emoPlace(anchor)}
function emoClose(){var p=$('#emoPop');if(p)p.hidden=true;EP.anchor=null;EP.rxFor=null}
function emoInsert(ta,e){if(!ta||ta.disabled)return;var s=ta.selectionStart==null?ta.value.length:ta.selectionStart,en=ta.selectionEnd==null?s:ta.selectionEnd;
  ta.value=ta.value.slice(0,s)+e+ta.value.slice(en);var c=s+e.length;ta.focus();try{ta.setSelectionRange(c,c)}catch(x){}
  ta.dispatchEvent(new Event('input',{bubbles:true}))}
function emoPick(e){emoRemember(e);if(EP.rxFor){var id=EP.rxFor;emoClose();grpReact(id,e);return}
  var ta=EP.target&&document.getElementById(EP.target);emoInsert(ta,e);if(EP.cat===0)emoDraw()}
document.addEventListener('click',function(e){var p=$('#emoPop');if(!p||p.hidden)return;if(e.target.closest('#emoPop')||e.target.closest('[data-emo]')||e.target.closest('[data-grxmore]'))return;emoClose()},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var p=$('#emoPop');if(p&&!p.hidden){emoClose();e.stopPropagation()}}},true);
window.addEventListener('resize',function(){var p=$('#emoPop');if(p&&!p.hidden&&EP.anchor&&EP.anchor.isConnected)emoPlace(EP.anchor);else emoClose()});
document.addEventListener('click',function(e){var b=e.target.closest('[data-emo]');if(!b)return;e.preventDefault();emoOpen(b,b.getAttribute('data-emo'))});

/* emoticons → emoji όταν στέλνεις */
var EMOTI={':)':'🙂',':-)':'🙂',':D':'😄',':-D':'😄',';)':'😉',';-)':'😉',':(':'🙁',':-(':'🙁',':P':'😛',':p':'😛',':o':'😮',':O':'😮','<3':'❤️',':*':'😘','xD':'😆','XD':'😆',":'(":'😢'};
function emoFix(t){return String(t||'').replace(/(^|\s)(:-?\)|:-?D|;-?\)|:-?\(|:P|:p|:o|:O|<3|:\*|xD|XD|:'\()(?=\s|$)/g,function(m,a,b){return a+(EMOTI[b]||b)})}
function emoOnly(t){t=String(t||'').trim();if(!t||t.length>24)return 0;try{var s=t.replace(/[\s‍️]/g,'').replace(/[\u{1F3FB}-\u{1F3FF}]/gu,'');if(!s||!/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/u.test(s)||/[^\p{Extended_Pictographic}⃣#*0-9\u{1F1E6}-\u{1F1FF}]/u.test(s))return 0;
  var n=window.Intl&&Intl.Segmenter?Array.from(new Intl.Segmenter().segment(t.replace(/\s/g,''))).length:Array.from(s).length;return n<=3?n:0}catch(e){return 0}}
function gFmt(t){return esc(t).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g,function(u){return '<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>'})}

/* αντιδράσεις: ένα έγγραφο ανά (μήνυμα, χρήστης, emoji) — ο καθένας γράφει μόνο τα δικά του */
function grxId(mid,e){return mid+'_'+String(S.uid||'me').replace(/[^A-Za-z0-9]/g,'').slice(0,40)+'_'+Array.from(e).map(function(c){return c.codePointAt(0).toString(16)}).join('-')}
function grxMap(){var M={};(S.chatrx||[]).forEach(function(r){if(!r.m||!r.e)return;var o=M[r.m]=M[r.m]||{};(o[r.e]=o[r.e]||[]).push(r.by)});return M}
function grpReact(mid,e){if(!qCanSave())return;var id=grxId(mid,e),has=(S.chatrx||[]).some(function(r){return r.id===id});
  var p=has?remove('chatrx',id):put('chatrx',id,{m:mid,e:e,by:S.uid||'me',at:Date.now()});
  p.then(function(){if(!S.db)renderGroup()}).catch(function(x){gNote(writeErr(x))})}
function grpRxHtml(mid,M){var o=M[mid];if(!o)return '';var ks=Object.keys(o);if(!ks.length)return '';
  return '<div class="grx">'+ks.map(function(e){var u=o[e],me=u.indexOf(S.uid||'me')>=0,who=u.map(function(x){return x===S.uid?'Εσύ':name(x)}).join(', ');
    return '<button type="button" class="'+(me?'me':'')+'" data-grx="'+esc(mid)+'|'+esc(e)+'" title="'+esc(who)+'">'+e+(u.length>1?'<b>'+u.length+'</b>':'')+'</button>'}).join('')+'</div>'}

/* ημέρες */
function gDayKey(at){var d=new Date(at||0);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()}
function gDayLbl(at){var d=new Date(at||0),t=new Date(),y=new Date(Date.now()-864e5);if(d.toDateString()===t.toDateString())return 'Σήμερα';if(d.toDateString()===y.toDateString())return 'Χθες';
  try{return d.toLocaleDateString('el-GR',{weekday:'long',day:'numeric',month:'long',year:d.getFullYear()===t.getFullYear()?undefined:'numeric'})}catch(e){return d.toDateString()}}
function gHM(at){var d=new Date(at||Date.now());return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}

function gAv(uid){var n=uid===S.uid?(S.names[uid]||'Εγώ'):name(uid),u=S.avs[uid],ini=esc((String(n).trim()[0]||'?').toUpperCase()),hue=0;String(uid||'').split('').forEach(function(c){hue=(hue*31+c.charCodeAt(0))%360});
  return '<span class="gav" title="'+esc(n)+'" style="--h:'+hue+'">'+(u?'<img src="'+esc(u)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'<i>'+ini+'</i></span>'}
/* ένα μήνυμα */
function grpMsgHtml(m,prev,M,isNew,hit){var mine=m.by===S.uid,cont=prev&&prev.by===m.by&&(m.at-prev.at)<5*60000&&gDayKey(prev.at)===gDayKey(m.at)&&!m.re,
  jn=!m.img&&!m.file&&!m.re?emoOnly(m.text):0,can=qCanSave();
  var h='<div class="pmsg gm '+(mine?'u':'a')+(cont?' cont':'')+(isNew?' gnew':'')+(jn?' gjumbo j'+jn:'')+(hit?' ghit':'')+'" data-mid="'+esc(m.id)+'">'+(!mine?(cont?'<span class="gav sp"></span>':gAv(m.by)):'')+'<div class="gcol">';
  if(can){h+='<div class="gact" role="toolbar">'+GRX.map(function(e){return '<button type="button" data-grx="'+esc(m.id)+'|'+e+'" title="Αντίδραση">'+e+'</button>'}).join('')+
    '<button type="button" data-grxmore="'+esc(m.id)+'" title="Περισσότερα emoji" class="gplus">＋</button><span class="sep"></span>'+
    '<button type="button" data-grep="'+esc(m.id)+'" title="Απάντηση">↩️</button>'+(m.text?'<button type="button" data-gcopy="'+esc(m.id)+'" title="Αντιγραφή">📋</button>':'')+
    (mine&&m.text&&!m.file?'<button type="button" data-gedit="'+esc(m.id)+'" title="Επεξεργασία">✏️</button>':'')+
    (mine?'<button type="button" class="gdel" data-gdel="'+esc(m.id)+'" title="Διαγραφή">🗑️</button>':'')+'</div>'}
  h+='<div class="pbub ud" title="'+esc(gTime(m.at))+'">'+(cont||mine?'':'<div class="gname">'+esc(name(m.by))+'</div>');
  if(m.re){var o=(S.chat||[]).find(function(x){return x.id===m.re.id});h+='<button type="button" class="gquote" data-gjump="'+esc(m.re.id)+'"><b>↩ '+esc(m.re.by===S.uid?'Εσύ':name(m.re.by))+'</b><span>'+esc(o?(o.text||(o.img?'📷 Εικόνα':o.file?'📎 '+(o.file.name||'αρχείο'):'')):(m.re.t||'(διαγράφηκε)'))+'</span></button>'}
  h+=(m.img?'<img class="gimg" src="'+esc(shotUrl({id:m.img}))+'" alt="" data-zoom="'+esc(m.img)+'" loading="lazy">':'')+(m.file?libChip(m.file):'')+
    (m.text?'<div class="gtx">'+gFmt(m.text)+'</div>':'')+'<span class="gmeta">'+gHM(m.at)+(m.ed?' · επεξεργάστηκε':'')+'</span></div>'+grpRxHtml(m.id,M)+'</div></div>';
  if(mine)h=h.replace(/<\/div><\/div>$/,'</div>'+(cont?'<span class="gav sp"></span>':gAv(m.by))+'</div>');
  return h}
function grpListHtml(list,first,lastSeen){var M=grpRxMapC(),h='',prev=null,q=pnorm(GRP.sq||'');
  if(q)list=list.filter(function(m){return pnorm((m.text||'')+' '+name(m.by)+' '+(m.file&&m.file.name||'')).indexOf(q)>=0});
  if(q&&!list.length)return '<p class="qmsg">Δεν βρέθηκε μήνυμα για «'+esc(GRP.sq)+'».</p>';
  list.forEach(function(m){if(!prev||gDayKey(prev.at)!==gDayKey(m.at))h+='<div class="gday"><span>'+esc(gDayLbl(m.at))+'</span></div>';
    var isNew=!first&&m.by!==S.uid&&(m.at||0)>lastSeen;h+=grpMsgHtml(m,(prev&&gDayKey(prev.at)===gDayKey(m.at))?prev:null,M,isNew,!!q);prev=m});return h}
function grpRxMapC(){return grxMap()}
var GQK=[['🚀','Long'],['📉','Short'],['🎯','Στόχος!'],['🛑','Stop'],['💰','Κέρδος'],['🩸','Ζημιά'],['🔒','Break-even'],['👀','Δείτε το'],['⏳','Περιμένω'],['⚠️','Προσοχή'],['🐂','Bull'],['🐻','Bear'],['🔥','Φωτιά'],['💎🙌','Κράτα'],['🌙','To the moon'],['😭','Rekt'],['🤝','Μπαίνω κι εγώ'],['✅','Κλείσιμο']];
function gQkOn(){try{return localStorage.getItem('tj-gqk')!=='0'}catch(e){return true}}
function grpQuickHtml(){if(!qCanSave()||GRP.edit)return '';var on=gQkOn();
  return '<div class="gqk'+(on?'':' off')+'"><button type="button" class="gqt" data-gqt="1" title="'+(on?'Κρύψε':'Δείξε')+' τα γρήγορα trade emoji" aria-pressed="'+on+'">📈</button>'+(on?'<div class="gqs">'+GQK.map(function(q,i){return '<button type="button" data-gqk="'+i+'" title="Στείλε: '+esc(q[0]+' '+q[1])+'"><span>'+q[0]+'</span>'+esc(q[1])+'</button>'}).join('')+'</div>':'<span class="muted">Γρήγορα trade emoji</span>')+'</div>'}
function grpQuickSend(i){var q=GQK[i];if(!q||GRP.busy)return;var ta=$('#gq'),keep=ta?ta.value:'';if(ta)ta.value=q[0]+' '+q[1];var img=GRP.img;GRP.img=null;gSend();GRP.img=img;GRP.qkKeep=keep}
function grpBarHtml(){var b='';if(GRP.edit){b='<div class="gbar edit"><span>✏️ <b>Επεξεργασία μηνύματος</b></span><button type="button" class="x" data-gbarx="1" aria-label="Άκυρο">×</button></div>'}
  else if(GRP.re){b='<div class="gbar"><span>↩ Απάντηση σε <b>'+esc(GRP.re.by===S.uid?'εσένα':name(GRP.re.by))+'</b>: '+esc(GRP.re.t||'')+'</span><button type="button" class="x" data-gbarx="1" aria-label="Άκυρο">×</button></div>'}
  return b}
function grpFind(id){return (S.chat||[]).find(function(x){return x.id===id})}
function grpJump(id){var el=document.querySelector('#gchat [data-mid="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');if(!el){gNote('Το μήνυμα δεν υπάρχει πια.');return}
  if(GRP.sq){GRP.sq='';GRP.sOpen=false;renderGroup();el=document.querySelector('#gchat [data-mid="'+(window.CSS&&CSS.escape?CSS.escape(id):id)+'"]');if(!el)return}
  pScrollTo(grpEl(),el);el.classList.remove('gflash');void el.offsetWidth;el.classList.add('gflash')}
function grpActClick(e){var t;
  if((t=e.target.closest('[data-grx]'))){var pr=t.getAttribute('data-grx').split('|');grpReact(pr[0],pr.slice(1).join('|'));grpUnact();return true}
  if((t=e.target.closest('[data-grxmore]'))){emoOpen(t,null,t.getAttribute('data-grxmore'));return true}
  if((t=e.target.closest('[data-grep]'))){var m=grpFind(t.getAttribute('data-grep'));if(m){GRP.edit=null;GRP.re={id:m.id,by:m.by,t:(m.text||(m.img?'📷 Εικόνα':m.file?'📎 '+(m.file.name||''):'')).slice(0,90)};grpUnact();renderGroup();var q=$('#gq');if(q)q.focus()}return true}
  if((t=e.target.closest('[data-gedit]'))){var m2=grpFind(t.getAttribute('data-gedit'));if(m2){GRP.re=null;GRP.edit=m2.id;GRP.editPrev=($('#gq')||{}).value||'';grpUnact();renderGroup();var q2=$('#gq');if(q2){q2.value=m2.text||'';q2.focus();q2.dispatchEvent(new Event('input',{bubbles:true}))}}return true}
  if((t=e.target.closest('[data-gcopy]'))){var m3=grpFind(t.getAttribute('data-gcopy'));if(m3&&m3.text){var ok=function(){t.textContent='✔️';setTimeout(function(){if(t.isConnected)t.textContent='📋'},1200)};try{navigator.clipboard.writeText(m3.text).then(ok,function(){})}catch(x){}}return true}
  if((t=e.target.closest('[data-gbarx]'))){var wasEdit=!!GRP.edit;GRP.re=null;GRP.edit=null;renderGroup();if(wasEdit){var q3=$('#gq');if(q3){q3.value=GRP.editPrev||'';GRP.editPrev=''}}return true}
  if((t=e.target.closest('[data-gqk]'))){grpQuickSend(+t.getAttribute('data-gqk'));return true}
  if((t=e.target.closest('[data-gqt]'))){try{localStorage.setItem('tj-gqk',gQkOn()?'0':'1')}catch(x){}renderGroup();return true}
  if((t=e.target.closest('[data-gjump]'))){grpJump(t.getAttribute('data-gjump'));return true}
  if((t=e.target.closest('[data-gsearch]'))){GRP.sOpen=!GRP.sOpen;if(!GRP.sOpen)GRP.sq='';renderGroup();if(GRP.sOpen)setTimeout(function(){var s=$('#gSearch');if(s)s.focus()},20);return true}
  var bub=e.target.closest('#gchat .pmsg .pbub');if(bub&&!e.target.closest('a,img,button,.libchip')){var pm=bub.closest('.pmsg'),was=pm.classList.contains('act');grpUnact();if(!was){grpFlip(pm);pm.classList.add('act')}return true}
  if(!e.target.closest('.gact'))grpUnact();
  return false}
function grpFlip(pm){if(!pm)return;var b=grpEl(),bb=pm.querySelector('.pbub');if(!b||!bb)return;pm.classList.toggle('low',bb.getBoundingClientRect().top-b.getBoundingClientRect().top<64)}
function grpUnact(){Array.prototype.forEach.call(document.querySelectorAll('#gchat .pmsg.act'),function(x){x.classList.remove('act')})}

/* «γράφει…» */
var GTY={at:0,tick:null};
function grpTyping(){if(!S.db||!S.uid||!qCanSave())return;var n=Date.now();if(n-GTY.at<3500)return;GTY.at=n;put('typing',S.uid,{by:S.uid,at:n}).catch(function(){})}
function grpTypingStop(){if(!S.db||!S.uid||!GTY.at)return;GTY.at=0;put('typing',S.uid,{by:S.uid,at:0}).catch(function(){})}
function grpTypeShow(){var el=$('#gType');if(!el)return;var n=Date.now(),who=(S.typing||[]).filter(function(t){return t.by&&t.by!==S.uid&&n-(t.at||0)<7000}).map(function(t){return name(t.by)});
  el.innerHTML=who.length?'<span class="gdots"><i></i><i></i><i></i></span> '+esc(who.length>2?who.length+' άτομα γράφουν…':who.join(' και ')+(who.length>1?' γράφουν…':' γράφει…')):'';el.classList.toggle('on',!!who.length)}
function grpTypeTick(){clearInterval(GTY.tick);GTY.tick=setInterval(function(){if(!grpIsOpen()){clearInterval(GTY.tick);GTY.tick=null;return}grpTypeShow()},1500)}

function gSend(){
  var q=$('#gq'),txt=q?emoFix(String(q.value||'').trim()).slice(0,1000):'';
  if(GRP.busy||(!txt&&!GRP.img&&!GRP.edit))return;
  if(!qCanSave()){gNote('Δεν μπορείς να στείλεις μήνυμα με αυτή την πρόσβαση.');renderGroup();return}
  if(GRP.edit){var m0=grpFind(GRP.edit);if(!m0){GRP.edit=null;renderGroup();return}if(!txt){gNote('Το μήνυμα δεν μπορεί να μείνει άδειο. Για να το σβήσεις πάτα 🗑️.');return}
    if(txt===m0.text){GRP.edit=null;if(q)q.value=GRP.editPrev||'';GRP.editPrev='';renderGroup();return}
    var d0=Object.assign({},m0);delete d0.id;d0.text=txt;d0.ed=Date.now();GRP.busy=true;renderGroup();
    put('chat',m0.id,d0).then(function(){GRP.edit=null;GRP.busy=false;var q2=$('#gq');if(q2)q2.value=GRP.editPrev||'';GRP.editPrev='';if(!S.db)grpOnData();renderGroup()}).catch(function(e){GRP.busy=false;gNote(writeErr(e));renderGroup()});return}
  GRP.busy=true;gNote('');renderGroup();grpTypingStop();
  var doc={by:S.uid||'me',text:txt,img:GRP.img||null,at:Date.now()};if(GRP.re)doc.re={id:GRP.re.id,by:GRP.re.by,t:String(GRP.re.t||'').slice(0,90)};
  put('chat',newId(),doc).then(function(){
    var q2=$('#gq');if(q2){q2.value=GRP.qkKeep||'';q2.style.height=''}GRP.qkKeep='';GRP.img=null;GRP.thumb=null;GRP.re=null;GRP.busy=false;GRP.n=-1;if(!S.db)grpOnData();renderGroup();var q3=$('#gq');if(q3&&window.innerWidth>600)q3.focus();
  }).catch(function(e){GRP.busy=false;gNote(writeErr(e));renderGroup()});
}
function gDropFiles(files){files=Array.prototype.slice.call(files||[]).filter(Boolean);if(!files.length||GRP.busy)return;
  if(!qCanSave()){gNote(LANG_RU()?'С этим доступом нельзя отправлять файлы.':'Δεν μπορείς να στείλεις αρχεία με αυτή την πρόσβαση.');renderGroup();return}
  var q0=$('#gq'),cap=q0?q0.value.trim().slice(0,500):'',sent=0,bad=[],noA=false;GRP.busy=true;gNote((LANG_RU()?'Отправка ':'Αποστολή ')+files.length+'…');renderGroup();
  assetsNs().then(function(A){if(!A){noA=true;return}var chain=Promise.resolve();
    files.forEach(function(f,i){chain=chain.then(function(){var t=libType(f);if(!t){bad.push(f.name+' ('+(LANG_RU()?'тип не поддерживается':'μη υποστηριζόμενος τύπος')+')');return}if(f.size>20*1048576){bad.push(f.name+' (>20 MB)');return}
      gNote((LANG_RU()?'Отправка ':'Αποστολή ')+(i+1)+'/'+files.length+'…');
      return (/^image\/(png|jpeg|webp)$/.test(t)?shrink(f):Promise.resolve(f)).then(function(b){return A.upload(b,{type:/^image\//.test(b.type||'')?b.type:t})}).then(function(r){
        var isImg=/^image\//.test(t),nm=String(f.name||'file').slice(0,120),txt=sent===0?cap:'',p1=isImg?Promise.resolve():put('files',newId(),{by:S.uid||'me',name:nm,type:t,size:r.sizeBytes||f.size,asset:r.id,cat:'other',note:'',at:Date.now()});
        return p1.then(function(){return put('chat',newId(),{by:S.uid||'me',text:txt,img:isImg?r.id:null,file:isImg?null:{id:r.id,name:nm,type:t},at:Date.now()})}).then(function(){if(sent===0){var q=$('#gq');if(q)q.value=''}sent++})})
      .catch(function(e){var c=e&&e.code;bad.push(f.name+(c==='unsupported_type'?' ('+(LANG_RU()?'тип не поддерживается':'μη υποστηριζόμενος τύπος')+')':c==='too_large'?' (>20 MB)':c==='quota_or_state'?' ('+(LANG_RU()?'хранилище заполнено':'γέμισε ο χώρος')+')':''))})})});
    return chain})
  .then(function(){GRP.busy=false;gNote(noA?(LANG_RU()?'Файлы недоступны в этом просмотре.':'Τα αρχεία δεν είναι διαθέσιμα σε αυτή την προβολή.'):bad.length?((LANG_RU()?'Не отправлены: ':'Δεν στάλθηκαν: ')+bad.join(', ')):'');GRP.n=-1;if(!S.db)grpOnData();renderGroup()})}
function gPick(files){
  var f=Array.prototype.filter.call(files||[],function(x){return /^image\//.test(x.type)})[0];if(!f||GRP.busy)return;
  if(!qCanSave()){gNote('Δεν μπορείς να ανεβάσεις εικόνα με αυτή την πρόσβαση.');renderGroup();return}
  GRP.busy=true;gNote('Ανέβασμα εικόνας…');renderGroup();
  assetsNs().then(function(A){
    if(!A){GRP.busy=false;gNote('Οι εικόνες δεν είναι διαθέσιμες σε αυτή την προβολή.');renderGroup();return}
    return shrink(f).then(function(b){return A.upload(b).then(function(r){GRP.img=r.id;GRP.thumb=URL.createObjectURL(b);GRP.busy=false;gNote('');renderGroup()})});
  }).catch(function(e){GRP.busy=false;var c=e&&e.code;gNote(c==='too_large'?'Η εικόνα είναι πολύ μεγάλη.':c==='quota_or_state'?'Ο χώρος για εικόνες γέμισε. Σβήστε παλιές.':'Το ανέβασμα απέτυχε. Δοκίμασε ξανά.');renderGroup()});
}

/* ================= Ο Καθηγητής: συζήτηση με φωνή ================= */
var PCH={imgs:[],imgCap:null,msgs:[],busy:false,ctl:null,voice:false,lastVoice:false,rec:null,listening:false,toolsOk:null,vset:{voice:'',rate:1,convo:false},vopen:false,speaking:false};
try{var _vs=JSON.parse(localStorage.getItem('tj-pvset')||'null');if(_vs)PCH.vset=Object.assign(PCH.vset,_vs)}catch(e){}
function pVsave(){try{localStorage.setItem('tj-pvset',JSON.stringify(PCH.vset))}catch(e){}}
function pOS(){var u=navigator.userAgent||'';return /iPhone|iPad|iPod/.test(u)?'ios':/Android/.test(u)?'android':/Mac/.test(u)?'mac':/Win/.test(u)?'win':'other'}
function pDictHint(){var o=pOS();return o==='win'?'Πάτα <b>Win + H</b> (φωνητική πληκτρολόγηση των Windows) και μίλα.':o==='mac'?'Πάτα <b>δύο φορές το Fn</b> (ή 🌐) για υπαγόρευση και μίλα.':o==='ios'?'Πάτα το <b>μικρόφωνο του πληκτρολογίου</b> (κάτω δεξιά) και μίλα.':o==='android'?'Πάτα το <b>μικρόφωνο του πληκτρολογίου</b> (Gboard) και μίλα.':'Χρησιμοποίησε την υπαγόρευση του συστήματός σου και μίλα.'}
function pVoices(){var vs=window.speechSynthesis?speechSynthesis.getVoices():[],lg=LANG_RU()?'ru':'el';return vs.slice().sort(function(a,b){var A=(a.lang||'').toLowerCase().indexOf(lg)===0?0:1,B=(b.lang||'').toLowerCase().indexOf(lg)===0?0:1;return A-B||(a.name>b.name?1:-1)})}
try{PCH.voice=localStorage.getItem('tj-pvoice')==='1';var pm=JSON.parse(localStorage.getItem('tj-pchat')||'[]');if(Array.isArray(pm))PCH.msgs=pm.slice(-20)}catch(e){}
function pchSave(){try{localStorage.setItem('tj-pchat',JSON.stringify(PCH.msgs.slice(-20)))}catch(e){try{localStorage.setItem('tj-pchat',JSON.stringify(PCH.msgs.slice(-20).map(function(m){return {role:m.role,content:m.content,id:m.id}})))}catch(x){}}}
function flatTxt(x,out){if(x==null)return;if(typeof x==='string'||typeof x==='number'){out.push(String(x));return}if(Array.isArray(x)){x.forEach(function(y){flatTxt(y,out)});return}if(typeof x==='object')Object.keys(x).forEach(function(k){if(!/^(id|lv|m|c|ch|hz|k)$/.test(k))flatTxt(x[k],out)})}
function manualEntries(){return window.Manual&&Manual.all?Manual.all():[]}
function manualText(e){var out=[];out.push(e.t+(e.en?' ('+e.en+')':''));if(e.s)out.push(e.s);(e.b||[]).forEach(function(b){out.push('— '+b[0]+':');flatTxt(b[1],out)});if(e.r){out.push('— Κανόνες:');flatTxt(e.r,out)}return out.join('\n').replace(/<[^>]+>/g,'').slice(0,6000)}
function pnorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ς/g,'σ')}
function manualSearch(q){
  var w=pnorm(q).split(/[^a-z0-9α-ω%]+/).filter(function(x){return x.length>2});if(!w.length)return [];
  return manualEntries().map(function(e){var tt=pnorm(e.t+' '+(e.en||'')),body=pnorm(manualText(e)),sc=0;w.forEach(function(x){if(tt.indexOf(x)>-1)sc+=5;var i=body.indexOf(x);if(i>-1)sc+=1+Math.min(3,body.split(x).length-2)});return {e:e,sc:sc}})
    .filter(function(r){return r.sc>0}).sort(function(a,b){return b.sc-a.sc}).slice(0,6).map(function(r){return {id:r.e.id,title:r.e.t,summary:(r.e.s||'').slice(0,240)}});
}
function pTradeFilter(a){
  a=a||{};var who=String(a.who||'me'),days=+a.period_days||0,cut=days?lday(new Date(Date.now()-days*864e5)):'';
  return S.trades.filter(function(t){
    if(who==='me'&&t.by!==S.uid)return false;if(who==='partner'&&t.by===S.uid)return false;
    if(cut&&t.date<cut)return false;
    if(a.symbol&&!symMatch(t.symbol,a.symbol))return false;
    if(a.strategy&&pnorm(stratName(t.strategyId)).indexOf(pnorm(a.strategy))<0)return false;
    if(a.account&&pnorm(t.account||'').indexOf(pnorm(a.account))<0)return false;
    return true});
}
function noStopInfo(list){var cl=list.filter(function(t){return t.status==='closed'}),ns=cl.filter(function(t){return !hasR(t)||t._est});return {n:ns.length,pnl:sum(ns.map(function(t){return n(t.pnl)||0})),all:sum(cl.map(function(t){return n(t.pnl)||0}))}}
function pStatsObj(list){var st=stats(list),r2=function(x){return isFinite(x)?Math.round(x*100)/100:null};
  return {trades_total:list.length,closed_with_R:st.n,win_rate:r2(st.winRate),avg_R:r2(st.avgR),avg_win_R:r2(st.avgWin),avg_loss_R:r2(st.avgLoss),profit_factor:r2(st.pf),total_R:r2(st.totalR),pnl:r2(st.pnl),max_drawdown_R:r2(st.dd),worst_losing_streak:st.worstStreak,
    estimated_R_trades:closed(list).filter(function(t){return t._est}).length,no_stop_trades_excluded_from_R:noStopInfo(list).n,pnl_no_stop_trades:Math.round(noStopInfo(list).pnl*100)/100,pnl_all_closed_trades:Math.round(noStopInfo(list).all*100)/100,note:'R στατιστικά μόνο από συναλλαγές με πραγματικό stop. Για το πραγματικό αποτέλεσμα χρησιμοποίησε pnl_all_closed_trades.'}}
function pGroup(list,f){return group(list,f).slice(0,10).map(function(g){return {key:g.key,n:g.n,win_rate:Math.round(g.winRate*100)/100,avg_R:Math.round(g.avgR*100)/100,total_R:Math.round(g.totalR*100)/100}})}
var PTOOLS=[
 {name:'search_manual',description:'Αναζήτηση στον Μπούσουλα (το εγχειρίδιο της σελίδας: στρατηγικές, δείκτες, κεριά, σχηματισμοί, SMC, crypto, μετοχές, ρίσκο, ψυχολογία). Ψάξε με ελληνικές ή αγγλικές λέξεις-κλειδιά. Επιστρέφει έως 6 κάρτες {id,title,summary}.',
  inputSchema:{type:'object',properties:{query:{type:'string'}},required:['query']},execute:function(i){return manualSearch(String(i.query||''))}},
 {name:'read_manual',description:'Επιστρέφει όλο το κείμενο μιας κάρτας του Μπούσουλα με βάση το id της (από το search_manual ή τον πίνακα περιεχομένων).',
  inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']},execute:function(i){var e=window.Manual&&Manual.entry(String(i.id||''));if(!e)throw new Error('Δεν υπάρχει κάρτα με αυτό το id');return manualText(e)}},
 {name:'trade_stats',description:'Στατιστικά των συναλλαγών του ημερολογίου με φίλτρα. who: me (ο χρήστης), partner (ο φίλος του), all. Επιστρέφει σύνολα και ανάλυση ανά στρατηγική, σύμβολο, session, ημέρα, διάθεση, κατεύθυνση.',
  inputSchema:{type:'object',properties:{who:{type:'string',enum:['me','partner','all']},period_days:{type:'number'},symbol:{type:'string'},strategy:{type:'string'},account:{type:'string'}}},
  execute:function(a){var L=pTradeFilter(a);return {filters:a,overall:pStatsObj(L),by_strategy:pGroup(L,function(t){return stratName(t.strategyId)}),by_symbol:pGroup(L,function(t){return t.symbol}),by_session:pGroup(L,function(t){return sessionOf(t.time)}),
    by_weekday:pGroup(L,function(t){return t.date?DAYS[new Date(t.date+'T12:00:00').getDay()]:null}),by_emotion:pGroup(L,function(t){return t.emotion||null}),by_direction:pGroup(L,function(t){return t.dir}),by_rules_followed:pGroup(L,function(t){return t.rules===true?'followed':t.rules===false?'broken':null}),by_tag:(function(){var tl=[];L.forEach(function(t){(t.tags||[]).forEach(function(g){var x=Object.assign({},t);x._tag=g;tl.push(x)})});return pGroup(tl,function(t){return t._tag})})()}}},
 {name:'list_trades',description:'Λίστα συναλλαγών (νεότερες πρώτα) με τα βασικά πεδία και σημειώσεις. Φίλτρα όπως στο trade_stats, συν only: losses|wins|open, και limit (έως 40).',
  inputSchema:{type:'object',properties:{who:{type:'string',enum:['me','partner','all']},period_days:{type:'number'},symbol:{type:'string'},strategy:{type:'string'},only:{type:'string',enum:['losses','wins','open']},limit:{type:'number'}}},
  execute:function(a){var L=pTradeFilter(a).slice().sort(sortTime).reverse();if(a.only==='losses')L=L.filter(function(t){return hasR(t)&&t.r<0});if(a.only==='wins')L=L.filter(function(t){return hasR(t)&&t.r>0});if(a.only==='open')L=L.filter(function(t){return t.status!=='closed'});
    return L.slice(0,Math.min(40,+a.limit||15)).map(function(t){return {date:t.date,time:t.time,who:t.by===S.uid?'me':'partner',symbol:t.symbol,dir:t.dir,strategy:stratName(t.strategyId),tf:t.tf,entry:t.entry,stop:t.stop,target:t.target,exit:t.exit,R:hasR(t)?Math.round(t.r*100)/100:null,R_estimated:!!t._est,pnl:t.pnl,rules_followed:t.rules,emotion:t.emotion,tags:t.tags,notes:(t.notes||'').slice(0,300)}})}},
 {name:'crypto_prices',description:'Ζωντανές τιμές crypto από τη σύνδεση CoinGecko του χρήστη: τρέχουσα τιμή σε USD, μεταβολή 24ώρου, κεφαλαιοποίηση, όγκος και (με days) σειρά τιμών έως 120 σημείων για τo πρώτο id. ids: CoinGecko ids, π.χ. bitcoin, ethereum, solana, ripple, binancecoin, dogecoin, cardano, avalanche-2, hyperliquid. days: 1, 7, 30, 90 ή 365.',
  inputSchema:{type:'object',properties:{ids:{type:'array',items:{type:'string'}},days:{type:'string',enum:['1','7','30','90','365']}},required:['ids']},
  execute:function(a,ctx){if(!CG.mcp)throw new Error('Η σύνδεση CoinGecko δεν είναι διαθέσιμη σε αυτή την προβολή.');var ids=(Array.isArray(a.ids)?a.ids:[a.ids]).map(function(x){return String(x||'').toLowerCase().replace(/[^a-z0-9-]/g,'')}).filter(Boolean).slice(0,6);if(!ids.length)throw new Error('Δώσε τουλάχιστον ένα id.');
    var sig=ctx&&ctx.signal;return CG.mcp.callTool('CoinGecko','get-coin-markets',{ids:ids},{cache:{staleTime:60000,gcTime:900000},signal:sig}).then(function(r){
      var out={source:'CoinGecko',markets:((r.payload&&r.payload.coins)||[]).map(function(c){return {id:c.id,symbol:c.symbol,price_usd:c.currentPrice,change_24h_pct:c.priceChangePercentage24h,market_cap_usd:c.marketCap,rank:c.marketCapRank,volume_24h_usd:c.totalVolume}})};
      var dd=String(a.days||'');if(!/^(1|7|30|90|365)$/.test(dd))return out;
      return CG.mcp.callTool('CoinGecko','get-coin-market-chart',{id:ids[0],days:dd},{cache:{staleTime:300000,gcTime:1800000},signal:sig}).then(function(h){var q=h.payload||{},pr=q.prices||[];
        out.history={id:ids[0],days:dd,start:q.startTs?new Date(+q.startTs).toISOString():null,end:q.endTs?new Date(+q.endTs).toISOString():null,points:pr.length,min:Math.min.apply(null,pr),max:Math.max.apply(null,pr),prices:pr.map(function(x){return +(+x).toPrecision(6)})};return out})
    }).catch(function(e){if(e instanceof Error)throw e;throw new Error(cgErrText(e))})}},
 {name:'get_candles',description:'Πραγματικά κεριά OHLC από το Crypto.com (ίδιες τιμές αγοράς με Binance/Kraken) για ένα crypto σύμβολο. Επιστρέφει για κάθε timeframe τα τελευταία κεριά [ώρα ISO, open, high, low, close], τελευταία τιμή, swing υψηλό/χαμηλό και ATR14. Κάλεσέ το πριν δώσεις είσοδο, stop και στόχο.',
  inputSchema:{type:'object',properties:{symbol:{type:'string',description:'π.χ. BTCUSDT, SOLUSDT'},timeframes:{type:'array',items:{type:'string',enum:['5m','15m','1h','4h','1D']}}},required:['symbol']},
  execute:function(a){if(!CG.mcp)throw new Error('Η σύνδεση Crypto.com δεν είναι διαθέσιμη σε αυτή την προβολή.');var sym=dmSym(a.symbol);if(CGID[sym])sym+='USDT';var tfs=(Array.isArray(a.timeframes)&&a.timeframes.length?a.timeframes:['15m','1h']).slice(0,3);
    return Promise.all(tfs.map(function(tf){return ccFetchBars(sym,tf).then(function(r){var b=r.bars.filter(function(x){return !x.approx}).slice(-50),tr=[];for(var i=1;i<b.length;i++)tr.push(Math.max(b[i].h-b[i].l,Math.abs(b[i].h-b[i-1].c),Math.abs(b[i].l-b[i-1].c)));
      var atr=tr.slice(-14).reduce(function(x,y){return x+y},0)/Math.max(1,Math.min(14,tr.length)),r6=function(v){return +(+v).toPrecision(6)};
      return {timeframe:tf,instrument:r.inst,last:r6(b[b.length-1].c),swing_high:r6(Math.max.apply(null,b.map(function(x){return x.h}))),swing_low:r6(Math.min.apply(null,b.map(function(x){return x.l}))),atr14:r6(atr),candles:b.slice(-40).map(function(x){return [new Date(x.t).toISOString().slice(0,16),r6(x.o),r6(x.h),r6(x.l),r6(x.c)]})}}).catch(function(e){return {timeframe:tf,error:ccErrText(e)}})})).then(function(L){return {symbol:sym,source:'Crypto.com',data:L}})}},
 {name:'quiz_progress',description:'Πρόοδος στο ΚΑΘΗΜΕΡΙΝΟ ΤΕΣΤ (5 ερωτήσεις τη μέρα, 10 πόντοι η σωστή) για κάθε χρήστη. ΔΕΝ είναι η Εξάσκηση: η Εξάσκηση έχει δικούς της πόντους στο practice του ΠΛΑΙΣΙΟΥ. Όταν αναφέρεις νούμερα, λέγε ποιο από τα δύο είναι.',
  execute:function(){return qUsers().map(function(u){var s=qStats(u),pd=(S.prac||{})[prId(u)]||null;return {who:u===S.uid?'me':'partner',daily_test_points:s.pts,practice_points:pd?pd.pts:0,practice_accuracy:pd&&pd.tot?Math.round(pd.ok/pd.tot*100)/100:null,points:s.pts,accuracy:isFinite(s.acc)?Math.round(s.acc*100)/100:null,streak:s.streak,level:s.level,by_topic:Object.keys(s.cat).map(function(c){return {topic:QCAT[c],correct:s.cat[c][0],total:s.cat[c][1]}})}})}}
];
window.PTOOLS=PTOOLS;
/* ---- «Εγκέφαλος» ομάδας: ό,τι ξέρουν ο Αυτόματος, ο Agent, οι ειδήσεις και το ιστορικό, διαθέσιμο στον Καθηγητή ---- */
function brR(x,d){return isFinite(x)?+(+x).toFixed(d==null?2:d):null}
function brAuto(t){var a=t.auto||{},bt=BT.find(function(x){return x.id===a.strat});return {id:t.id,profile:apfTagName(t),exit_management:APF_MG[t.mgmt||'none'],stop_moved_to:t.curStop!=null?t.curStop:null,owner:t.by===S.uid?'me':name(t.by),symbol:t.symbol,dir:t.dir,order:t.ord,opened:new Date(t.at||0).toISOString(),entry:t.entry,stop:t.stop,target:t.target,leverage:t.lev,margin:t.margin,status:t.status,R:dmCounts(t)?brR(t.r):null,R_now:brR(n(t.curR)),last_price:t.lastPx||null,closed:t.exitAt?new Date(t.exitAt).toISOString():null,
  strategy:t.title,strategy_rule:bt?bt.rule:null,timeframe:a.tf||null,market_regime_at_entry:a.regime||null,session_at_entry:a.sess?sessInfo(a.sess).t:null,target_R:a.X||null,backtest_trades:a.n||null,backtest_avg_R:a.avgR,unseen_avg_R:a.testR,unseen_trades:a.testN,
  grade:a.grade===2?'strong (auto-opened)':a.grade===1?'proposal approved by user':null,approved_manually:!!a.manual,reasoning:String(t.notes||'').replace(/^🤖\s*/,'').slice(0,500)}}
function brCtx(){var mine=apMine?apMine():[],P=AP.cfg?apProt():null,day=(S.aplog||[]).filter(function(d){return d.date===lday(new Date())});
  var ag=(AG.list||[])[0],ar=ag&&ag.rep||{};
  return {autopilot:{what:'Ο «Αυτόματος Καθηγητής» της σελίδας: όσο είναι ανοιχτή, σαρώνει crypto σε 1h/4h, κάνει backtest σε όλες τις στρατηγικές και ανοίγει μόνος του demo όταν υπάρχει σήμα με αποδεδειγμένο πλεονέκτημα και περνά τις προστασίες.',
      on:!!(AP.cfg&&AP.cfg.on),settings:AP.cfg?{coins:AP.cfg.coins,timeframes:AP.cfg.tf,scan_every_min:AP.cfg.iv,market_hours:AP.cfg.sess,max_open:AP.cfg.maxOpen,max_per_day:AP.cfg.maxDay,size:AP.cfg.size==='risk'?AP.cfg.riskPct+'% risk':AP.cfg.margin+' margin',leverage:AP.cfg.lev}:null,protections:P,
      invented_strategies:(LAB.list||[]).slice(0,10).map(function(g){return {name:g.name,origin:g.origin==='ai'?'Claude ideas':'genetic search',status:g.status,rule:genRule(g.spec),inspired_by:g.src||null,learn_avgR:g.res&&g.res.A?g.res.A.avgR:null,final_test_avgR:g.res&&g.res.C?g.res.C.avgR:null,final_test_n:g.res&&g.res.C?g.res.C.n:null,live:labLive(g.id)}}),
      active_profile:(function(){var p=apfActive();return p?{name:p.name,note:p.desc||'',settings:apfDesc(p.cfg),modified_now:apfDiff(p)}:null})(),
      profiles_performance:apfRows().map(function(r){return {profile:r.name,closed:r.st.n,open:r.st.open,winRate:brR(r.st.wr),totalR:brR(r.st.sumR),avgR:brR(r.st.avgR),maxDD_R:brR(r.st.dd)}}),
      exit_management:AP.cfg?APF_MG[AP.cfg.mgmt||'none']:null,strategies_allowed:AP.cfg?APF_ST[AP.cfg.strats||'all']:null,
      session_now:sessName(sessOf(Date.now())),open_auto_demos:(S.demo||[]).filter(function(t){return t.src==='auto'&&!dmClosed(t)}).map(brAuto).slice(0,6),
      closed_auto:{n:(S.demo||[]).filter(function(t){return t.src==='auto'&&dmCounts(t)}).length,total_R:brR(sum((S.demo||[]).filter(function(t){return t.src==='auto'&&dmCounts(t)}).map(function(t){return n(t.r)})))},
      today_log:day.map(function(d){return {who:d.by===S.uid?'me':name(d.by),scans:d.scans,opened:d.opened,proposals:d.props,blocked_by_protections:d.blocked,last_events:(d.ev||[]).slice(0,8).map(function(e){return (e.c?e.c+': ':'')+e.m})}}),
      watching_now:(AP.watch||[]).slice(0,10).map(function(w){return {coin:w.coin,tf:w.tf,market:w.mk,best_strategy:w.name,dir:w.dir>0?'long':w.dir<0?'short':null,unseen_R:brR(w.testR),signal_now:w.sig,blocked:w.block||null,best_session:w.bestSess?sessInfo(w.bestSess.id).t:null}})},
    agent_latest:ag?{date:new Date(ag.at).toISOString().slice(0,10),summary:ar.summary,market:ar.market,actions:ar.actions,strategies:(ar.strategies||[]).slice(0,6).map(function(x){return x.name+' '+x.dir+' '+x.coins+': '+x.verdict})}:null,
    news_important:(NW.items||[]).filter(function(a){return a.imp>=1}).slice(0,6).map(function(a){return {title_verbatim:a.title,source:a.source,posted:a.postedAt,coins:a.coins,topics:a.why}}),
    upcoming_events:(NW.cal||[]).filter(function(e){return Date.parse(e.at)>Date.now()-36e5}).slice(0,5).map(function(e){return {at_utc:e.at,title:e.title,impact:e.impact}})}}
var BRTOOLS=[
 {name:'autopilot_trades',description:'Οι demo συναλλαγές που άνοιξε ο Αυτόματος Καθηγητής, με ΟΛΟ το σκεπτικό: στρατηγική και κανόνας, timeframe, αγορά και συνεδρία τη στιγμή της εισόδου, backtest (συναλλαγές, μέσο R, μέσο R σε κεριά που δεν είδε), στόχος R, είσοδος/stop/στόχος, κατάσταση και R τώρα. Χρησιμοποίησέ το για κάθε ερώτηση «γιατί μπήκε ο αυτόματος».',
  inputSchema:{type:'object',properties:{status:{type:'string',enum:['open','closed','all']},symbol:{type:'string'},limit:{type:'number'}}},
  execute:function(a){var sym=a.symbol?dmSym(a.symbol):'',L=(S.demo||[]).filter(function(t){return t.src==='auto'&&(a.status==='open'?!dmClosed(t):a.status==='closed'?dmClosed(t):true)&&(!sym||dmSym(t.symbol).indexOf(sym.replace(/USDT$/,''))===0)}).sort(function(x,y){return (y.at||0)-(x.at||0)});return L.slice(0,Math.min(20,+a.limit||8)).map(brAuto)}},
 {name:'explain_auto_trade',description:'Ξανατρέχει ΤΩΡΑ την ανάλυση του Αυτόματου Καθηγητή για ένα νόμισμα: αγορά τώρα (τάση/range/συμπίεση, ADX, RSI, ATR), η στρατηγική της αυτόματης θέσης με backtest σε όλο το ιστορικό και σε νέα κεριά, απόδοση ανά συνεδρία αγορών, αν υπάρχει σήμα τώρα, και πού είναι η τιμή σε σχέση με είσοδο/stop/στόχο. Για να εξηγήσεις αν το σκεπτικό ισχύει ακόμα.',
  inputSchema:{type:'object',properties:{symbol:{type:'string',description:'π.χ. XRPUSDT'}},required:['symbol']},
  execute:function(a){var sym=dmSym(a.symbol),coin=sym.replace(/(USDT|USDC|USD)$/,''),t=(S.demo||[]).filter(function(x){return x.src==='auto'&&dmSym(x.symbol).indexOf(coin)===0}).sort(function(x,y){return (y.at||0)-(x.at||0)})[0],au=t&&t.auto||{},tf=au.tf||'1h';
    return deepBars(coin+'USDT','1h').then(function(r){var b1=r.bars.filter(function(x){return !x.approx&&x.t+36e5<=Date.now()+60000}),b=tf==='4h'?apAgg(b1,144e5):b1;if(b.length<250)throw new Error('Λίγα κεριά για '+coin);
      var ids=au.strat?[au.strat]:BT.filter(function(x){return !BT_NOTGT[x.id]}).map(function(x){return x.id}),ev=nowEval(b,{ids:ids,fee:0.1,sym:coin+'USDT'}),g=ev.g,c=ev.cands.filter(function(x){return !t||x.d===(t.dir==='short'?-1:1)})[0]||ev.cands[0],ss=c?apSessStats(c):{};
      var last=b[b.length-1].c,risk=t?Math.abs(n(t.entry)-n(t.stop)):NaN,rNow=t&&risk>0?(last-n(t.entry))*(t.dir==='short'?-1:1)/risk:NaN;
      return {coin:coin,timeframe:tf,candles:b.length,source:r.src||null,market_now:{regime:regimeText(g),adx:brR(g.adx,0),rsi:brR(g.rsi,0),atr_pct:brR(g.atrPct),price:last,range50:[g.lo,g.hi]},
        strategy:c?{name:c.s.t,rule:c.s.rule,dir:c.d>0?'long':'short',fits_market_now:c.fit>=2?'yes':c.fit<0?'against_trend':c.fit>0?'partly':'no',backtest:{trades:c.best.st.n,win_rate:brR(c.best.st.winRate),avg_R:brR(c.best.st.avgR),target_R:c.best.X},unseen:{trades:c.test.n,avg_R:brR(c.test.avgR)},reliable:c.reliable,signal_now:!!c.sig,
          by_session:Object.keys(ss).map(function(k){return {session:sessName(k),trades:ss[k].n,avg_R:brR(ss[k].avg)}})}:null,
        position:t?{entry:t.entry,stop:t.stop,target:t.target,status:t.status,R_now_estimate:brR(rNow),opened:new Date(t.at).toISOString(),entry_session:au.sess?sessName(au.sess):null,regime_at_entry:au.regime||null,reasoning:t.notes}:null,
        btc_now:ctxBtc()}})}},
 {name:'team_info',description:'Ό,τι ξέρει η ομάδα: what=history → Ιστορικό ομάδας (πραγματικές, demo, Καθηγητής, αποφάσεις και προστασίες του Αυτόματου, Agent, check-in), νεότερα πρώτα, με days και category· what=agent → η τελευταία πλήρης αναφορά του Agent στρατηγικών· what=news → ειδήσεις crypto (τίτλοι αυτούσιοι, βαθμός σημαντικότητας) και οικονομικό ημερολόγιο ΗΠΑ (UTC).',
  inputSchema:{type:'object',properties:{what:{type:'string',enum:['history','agent','news']},days:{type:'number'},category:{type:'string',enum:['all','trade','demo','prof','auto','agent','ci']},limit:{type:'number'}},required:['what']},
  execute:function(a){var strip=function(h){return String(h||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()};
    if(a.what==='agent'){var g=(AG.list||[])[0];if(!g)throw new Error('Δεν υπάρχει ακόμα αναφορά Agent.');return {date:new Date(g.at).toISOString(),source:g.src,report:g.rep}}
    if(a.what==='news')return {news:(NW.items||[]).slice(0,15).map(function(x){return {title_verbatim:x.title,source:x.source,posted:x.postedAt,importance:x.imp===2?'very high':x.imp?'high':'normal',coins:x.coins,topics:x.why}}),calendar:(NW.cal||[]).map(function(e){return {at_utc:e.at,title:e.title,impact:e.impact,note:e.note||null}})};
    var since=Date.now()-(+a.days||7)*864e5,c=a.category||'all';
    return hiEvents().filter(function(e){return e.at>=since&&(c==='all'||e.cat.indexOf(c)>=0)}).slice(0,Math.min(60,+a.limit||30)).map(function(e){return {at:new Date(e.at).toISOString().slice(0,16),who:e.by?(e.by===S.uid?'me':name(e.by)):null,type:e.tag,what:strip(e.h),detail:strip(e.sub),R:isFinite(e.r)?brR(e.r):null}})}}];
function ctxBtc(){return null}
PTOOLS.splice.apply(PTOOLS,[4,0].concat(BRTOOLS));

function pContext(){
  var mine=S.trades.filter(mine0),ds=dayState(S.uid);
  function mine0(t){return t.by===S.uid}
  return {today:today(),my_name:name(S.uid),rules:{risk_pct:S.settings.risk,target_R:S.settings.target,daily_loss_R:S.settings.dayLoss,max_trades_day:S.settings.maxTrades,max_drawdown_pct:S.settings.maxDD},balance:balance(),
    today_status:{trades:ds.count,R:Math.round(ds.r*100)/100,level:ds.level},my_overall:pStatsObj(mine),my_last_30_days:pStatsObj(pTradeFilter({who:'me',period_days:30})),partner_overall:pStatsObj(S.trades.filter(function(t){return t.by&&t.by!==S.uid})),
    our_strategies:S.strategies.map(function(s){return {name:s.name,market:s.market,tf:s.tf,entry:(s.entry||'').slice(0,300),exit:(s.exit||'').slice(0,200)}}),
    professor_confirmations:cfContext(),
    professor_demo:dmProfContext(),
    classroom:clsCtx(),
    training:(function(){try{var pl=dayPlan(),sk=skSummary(S.uid),d=prMe();return {today_plan:{reviews_done:pl.rev,reviews_due:pl.due,replays_today:pl.rp,drills_today:pl.fd,lesson_done:pl.lesson},replay:d.rp?{played:d.rp.n,wins:d.rp.w,total_R:d.rp.r}:null,drills:d.fd?{done:d.fd.n,correct:d.fd.ok}:null,skills:{cards:sk.n,read:sk.r,quiz_correct:sk.q,practiced:sk.p,score_pct:sk.score},suggested_next:skNext(S.uid).map(function(x){return Manual.title(x.id)+' ('+x.why+')'})}}catch(e){return null}})(),
    practice:(function(){var d=prMe();return {what:'Εξάσκηση (ξεχωριστή από το καθημερινό τεστ)',points:d.pts,level:prLevel(d.pts).name,correct:d.ok,answered:d.tot,streak:d.streak,best_streak:d.best,badges:Object.keys(d.badges||{}).length}})(),
    demo_defaults:{margin_usd:DMDEF.amt,leverage:DMDEF.lev},
    live_prices:(function(){var o={};if(CG.mk)Object.keys(CGID).forEach(function(k){var c=CG.mk[CGID[k]];if(c&&isFinite(c.currentPrice))o[k+'USDT']={price:c.currentPrice,chg24h:c.priceChangePercentage24h}});return o})(),
    chart_now:(function(){if(!PC||!PC.raw||!PC.raw.length)return null;var r=PC.raw.filter(function(b){return !b.approx}).slice(-30);if(!r.length)return null;return {symbol:PC.sym,timeframe:PC.tf||null,source:PC.src||null,last:r[r.length-1].c,high30:Math.max.apply(null,r.map(function(b){return b.h})),low30:Math.min.apply(null,r.map(function(b){return b.l})),candles:r.slice(-12).map(function(b){return [b.o,b.h,b.l,b.c]})}})(),
    team:(function(){try{return brCtx()}catch(e){return null}})(),
    professor_mood_today:(function(){try{var T=funToday(),all=FUN_T.concat(FUN_P);return T.L.length?{note:'Τα μέλη σε κερνάνε ή σε «τιμωρούν» για πλάκα όταν κάνεις λάθος. Μπορείς να το αναφέρεις μία φορά με χιούμορ, χωρίς να επηρεάζει την ανάλυση.',events:T.L.slice(0,8).map(function(x){var it=all.find(function(z){return z[0]===x.item});return {who:x.by===S.uid?'me':name(x.by),kind:x.kind,item:it?it[2]:x.item}})}:null}catch(e){return null}})(),
    manual_ids:manualEntries().map(function(e){return e.id}).join(',')};
}
function pLinkify(text){
  return esc(text).replace(/\[\[([a-z0-9-]+)\]\]/g,function(m,id){var e=window.Manual&&Manual.entry(id);return e?'<button type="button" class="linkbtn" data-ref="'+id+'">'+esc(e.t)+'</button>':''});
}
function pScrollTo(body,el,again){if(!body||!el)return;var off=10;Array.prototype.forEach.call(body.children,function(c){try{var cs=getComputedStyle(c);if(cs.position==='sticky'&&cs.top!=='auto'&&parseFloat(cs.top)<=40&&c!==el)off+=c.getBoundingClientRect().height}catch(e){}});
  var y=Math.max(0,el.getBoundingClientRect().top-body.getBoundingClientRect().top+body.scrollTop-off);body.scrollTop=y;var set=body.scrollTop;
  if(!again)[60,350,900].forEach(function(ms){setTimeout(function(){if(!el.isConnected||Math.abs(body.scrollTop-set)>4)return;pScrollTo(body,el,true);set=body.scrollTop},ms)})}
function pScrollChat(body,prevTop){var M=PCH.msgs,lm=M[M.length-1],n0=M.length;
  if(PCH.openJump&&!PCH.busy){/* μόλις ανοίγει: πάμε στο πιο πρόσφατο μήνυμα, όποιος κι αν το έστειλε */PCH.openJump=0;PCH.anch=n0;var all=body.querySelectorAll('#pchat .pmsg'),le=all[all.length-1];if(le){if(le.classList.contains('a'))pScrollTo(body,le);else body.scrollTop=body.scrollHeight;return}}
  if(PCH.busy){if(PCH.liveTop){var lv=$('#pLive');if(lv)pScrollTo(body,lv.closest('.pmsg'))}else body.scrollTop=body.scrollHeight;return}
  if(lm&&lm.role==='assistant'&&PCH.anch!==n0){var els=body.querySelectorAll('#pchat .pmsg.a'),el=els[els.length-1];PCH.anch=n0;if(el){pScrollTo(body,el);return}}
  if(lm&&lm.role==='user'){body.scrollTop=body.scrollHeight;return}
  body.scrollTop=prevTop}
/* κλικ έξω από το παράθυρο του Καθηγητή το κλείνει */
document.addEventListener('click',function(e){var p=$('#profPanel');if(!p||p.hidden)return;var path=e.composedPath?e.composedPath():[];var inside=path.some(function(n){return n&&n.nodeType===1&&(n.id==='profPanel'||n.id==='profBtn'||n.id==='funBtn'||n.id==='funMenu'||n.id==='profBubble'||n.id==='emoPop'||(n.classList&&(n.classList.contains('toast')||n.classList.contains('modal')||n.classList.contains('lbx'))))});if(inside)return;var sel=window.getSelection&&String(window.getSelection());if(sel&&sel.length>2)return;setTimeout(function(){if(!p.hidden&&Date.now()-(P3D.openAt||0)>350)profOpen(false)},0)});
function pOpenAsk(q){try{QZ.tab='chat';PCH.openJump=1;profOpen(true);$('#profBody').innerHTML='';renderProf();q=String(q||'').trim();if(q)setTimeout(function(){pAsk(q,false)},50);else [120,400,900].forEach(function(ms){setTimeout(function(){var x=$('#pq');if(x&&document.activeElement!==x){x.focus();try{var v=x.value.length;x.setSelectionRange(v,v)}catch(_){}}},ms)})}catch(e){console.error(e)}}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#askProf');if(b){pOpenAsk('');return}var c=e.target.closest&&e.target.closest('[data-askq]');if(c){pOpenAsk(c.getAttribute('data-askq'))}});
document.addEventListener('submit',function(e){if(e.target&&e.target.id==='askBar'){e.preventDefault();var q=$('#askQ');pOpenAsk(q.value);q.value=''}});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-precheck]');if(b){PCH.punished=0;pAsk('Σε «τιμώρησα» γιατί η προηγούμενη ανάλυσή σου ήταν λάθος. Ξαναέλεγξέ την από την αρχή με πραγματικά δεδομένα (κεριά, backtest, ό,τι χρειάζεται), πες μου ειλικρινά τι έκανες λάθος και δώσε τη σωστή εκτίμηση.',false)}});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='pNudge'){try{localStorage.setItem('tj-nudge',e.target.value)}catch(x){}toast(e.target.value==='off'?'Ο Καθηγητής δεν θα σου στέλνει μηνύματα μόνος του. Απαντά μόνο όταν τον ρωτάς.':e.target.value==='few'?'Ο Καθηγητής θα στέλνει έως 2 μηνύματα τη μέρα.':'Ο Καθηγητής θα στέλνει μηνύματα όπως πριν.')}});
function renderChat(){
  if(PCH.imgCap===null&&S.sample&&S.sample.limits){PCH.imgCap=false;S.sample.limits().then(function(l){if(l&&l.images){PCH.imgCap=l.images.mediaTypes||['image/png','image/jpeg'];PCH.imgMax=l.images.maxCount||3;if(QZ.tab==='chat')renderChat()}}).catch(function(){})}
  var body=$('#profBody'),h='<div class="pchat" id="pchat">';
  if(!PCH.msgs.length)h+='<div class="pchat-empty"><p class="qmsg">Ρώτα με ό,τι θες. Γράψε ή πάτα το μικρόφωνο.</p><div class="pchips">'+
    ['Πρότεινέ μου τεχνικές για σήμερα','Πώς πάνε οι συναλλαγές μου;','Τι να βελτιώσω αυτή την εβδομάδα;','Εξήγησέ μου απλά το FVG','Κάνε μου ένα μάθημα'].sort(function(){return Math.random()-0.5}).slice(0,3).map(function(q){return '<button type="button" class="pchip">'+esc(q)+'</button>'}).join('')+'</div></div>';
  PCH.msgs.forEach(function(m,i){h+='<div class="pmsg '+(m.role==='user'?'u':'a')+'">'+(m.role==='user'?'':'<span class="pav">'+profSvg('tiny')+'</span>')+'<div class="pbub'+(m.role==='user'?' ud':' ud')+'">'+(m.role==='user'?((m.thumbs&&m.thumbs.length?'<span class="pthumbs">'+m.thumbs.map(function(t){return t?'<img src="'+t+'" alt="" data-zoom="1">':''}).join('')+'</span>':'')+esc(m.content)):(m.pop?'<span class="ppop">📣 Σου έγραψα'+(m.at?' · '+pad2(new Date(m.at).getHours())+':'+pad2(new Date(m.at).getMinutes()):'')+' · απάντησέ μου από κάτω</span>':'')+pLinkify(techStrip(m.content))+techCards(m,i))+(m.role!=='user'&&window.speechSynthesis?'<button type="button" class="pspeak" data-speak="'+i+'" aria-label="Άκουσε την απάντηση">▶</button>':'')+'</div></div>'});
  var lm=PCH.msgs[PCH.msgs.length-1];if(!PCH.busy&&lm&&lm.role==='assistant'){h+=lm.err?'<div class="pqr"><button type="button" class="chip" data-pretry>↻ Ξαναδοκίμασε</button></div>':'<div class="pqr">'+['Πιο απλά','Παράδειγμα','Ρώτα με κάτι'].map(function(q){return '<button type="button" class="chip" data-pqr="'+esc({'Πιο απλά':'Εξήγησέ το πιο απλά','Παράδειγμα':'Δώσε μου ένα συγκεκριμένο παράδειγμα','Ρώτα με κάτι':'Κάνε μου μία ερώτηση πάνω σε αυτό για να δεις αν το κατάλαβα'}[q]||q)+'">'+esc(q)+'</button>'}).join('')+'<button type="button" class="chip funchip" data-funopen>🍕 Κέρασέ τον</button><button type="button" class="chip funchip" data-funopen>🏏 Λάθος!</button>'+(PCH.punished&&Date.now()-PCH.punished<10*60000?'<button type="button" class="chip" data-precheck>🔁 Ξαναέλεγξέ το</button>':'')+'</div>'}
  if(PCH.busy)h+='<div class="pmsg a"><span class="pav">'+profSvg('tiny talk')+'</span><div class="pbub ud" id="pLive"><span class="pdots"><i></i><i></i><i></i></span></div></div>';
  h+='</div>'+(PCH.imgs.length?'<div class="pprev">'+PCH.imgs.map(function(x,i){return '<span class="thumb"><img src="'+x.thumb+'" alt=""><button type="button" class="x" data-unimg="'+i+'" aria-label="Αφαίρεση εικόνας">×</button></span>'}).join('')+'</div>':'')+'<div class="pinput"><textarea id="pq" rows="3" placeholder="'+(PCH.imgs.length?'Τι θες να δω στην εικόνα; (προαιρετικό)':'Ρώτα τον Καθηγητή…')+'" aria-label="Ερώτηση στον Καθηγητή"></textarea>'+
    '<div class="pbtns"><div class="row" style="gap:.3rem;flex-wrap:nowrap">'+(PCH.imgCap?'<label class="pmic pimg" aria-label="Στείλε εικόνα">'+imgIcon()+'<input type="file" id="pFile" accept="'+esc(PCH.imgCap.join(','))+'" multiple hidden></label>':'')+emoBtn('pq')+'<button type="button" class="pmic'+(PCH.listening?' on':'')+'" id="pMic" aria-label="Μίλα στον Καθηγητή">'+micIcon()+'</button></div><button type="button" class="btn primary" id="pSend" aria-label="Στείλε" title="Στείλε (Enter)"'+(PCH.busy?' disabled':'')+'>Στείλε</button></div></div>'+
    '<button type="button" class="btn small pstop" id="pStop" hidden>⏹ Σταμάτα</button><div class="row pfoot"><label class="check" style="gap:.3rem">Μηνύματα Καθηγητή <select id="pNudge" class="dmsel" style="padding:.15rem .3rem"><option value="few"'+(nudgeMode()==='few'?' selected':'')+'>Λίγα (έως 2 τη μέρα)</option><option value="normal"'+(nudgeMode()==='normal'?' selected':'')+'>Κανονικά</option><option value="off"'+(nudgeMode()==='off'?' selected':'')+'>Καθόλου</option></select></label><label class="check"><input type="checkbox" id="pVoice"'+(PCH.voice?' checked':'')+'> <span>Ο Καθηγητής απαντάει και με φωνή</span></label><button type="button" class="linkbtn" id="pVset">⚙️ Ρυθμίσεις φωνής</button>'+(PCH.msgs.length?'<button type="button" class="linkbtn" id="pNew">Νέα συζήτηση</button>':'')+'</div>'+pVpanel()+
    '<p class="muted pnote" id="pNote"></p>';
  var keep=$('#pq')?$('#pq').value:'',prevTop=body.scrollTop;
  body.innerHTML=h;$('#pq').value=keep;if(keep){var qq=$('#pq');qq.style.height='auto';qq.style.height=Math.min(qq.scrollHeight+2,window.innerHeight*.45)+'px'}if(PCH.dict){var d0=PCH.dict;PCH.dict=null;pDictMode();PCH.dict.base=d0.base;PCH.dict.last=d0.last}pScrollChat(body,prevTop);pStopVis();
}
function pVpanel(){if(!PCH.vopen)return '';var vs=pVoices(),lg=LANG_RU()?'ru':'el',has=vs.some(function(v){return (v.lang||'').toLowerCase().indexOf(lg)===0}),o=pOS();
  return '<div class="pvset"><label class="f">Φωνή<select id="pVsel"><option value="">Αυτόματη ('+(has?'ελληνική':'δεν βρέθηκε ελληνική')+')</option>'+vs.map(function(v){return '<option value="'+esc(v.name)+'"'+(PCH.vset.voice===v.name?' selected':'')+'>'+esc(v.name+' · '+v.lang)+'</option>'}).join('')+'</select></label>'+
    '<label class="f">Ταχύτητα <b id="pVrv">'+fmt(+PCH.vset.rate||1,1)+'×</b><input type="range" id="pVrate" min="0.7" max="1.5" step="0.1" value="'+(+PCH.vset.rate||1)+'"></label>'+
    '<label class="check"><input type="checkbox" id="pVconvo"'+(PCH.vset.convo?' checked':'')+'> <span>🎙️ Συνομιλία: όταν τελειώνει να μιλάει, ξανανοίγει το μικρόφωνο</span></label>'+
    '<div class="row" style="gap:.4rem"><button type="button" class="btn small" id="pVtest">▶ Δοκιμή φωνής</button></div>'+
    (has?'':'<p class="pvwarn">Ο υπολογιστής σου δεν έχει ελληνική φωνή, γι\'αυτό ο Καθηγητής μπορεί να μιλάει με ξένη προφορά ή να μη μιλάει. '+(o==='win'?'Windows: Ρυθμίσεις → Ώρα και γλώσσα → Γλώσσα και περιοχή → Προσθήκη γλώσσας → Ελληνικά, με τη «Μετατροπή κειμένου σε ομιλία». Μετά ξανάνοιξε τον browser.':o==='mac'?'Mac: Ρυθμίσεις συστήματος → Προσβασιμότητα → Εκφωνημένο περιεχόμενο → Φωνή συστήματος → Διαχείριση φωνών → Ελληνικά (Melina).':o==='android'?'Android: Ρυθμίσεις → Γλώσσα → Μετατροπή κειμένου σε ομιλία → Google → Ελληνικά.':'Πρόσθεσε ελληνική φωνή στις ρυθμίσεις ομιλίας του συστήματος.')+'</p>')+
    '<p class="muted" style="font-size:.78rem;margin:0">Μικρόφωνο: '+(navigator.brave?'ο Brave δεν υποστηρίζει την αναγνώριση φωνής του browser, οπότε χρησιμοποιούμε την υπαγόρευση του συστήματος. ':'')+pDictHint()+'</p></div>'}
function imgIcon(){return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 5h3l2-2h6l2 2h3a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>'}
function pAddImgs(files){
  var lim=PCH.imgMax||3;files=Array.prototype.filter.call(files||[],function(f){return /^image\//.test(f.type)});if(!files.length)return;
  files.slice(0,Math.max(0,lim-PCH.imgs.length)).forEach(function(f){shrink(f).then(function(b){var u=URL.createObjectURL(b),im=new Image();im.onload=function(){var k=Math.min(1,160/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);PCH.imgs.push({blob:b,thumb:c.toDataURL('image/jpeg',.7)});URL.revokeObjectURL(u);renderChat();var q=$('#pq');if(q)q.focus()};im.src=u})});
}
function micIcon(){return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2z"/></svg>'}
function pAsk(q,byVoice){
  q=String(q||'').trim();var imgs=PCH.imgs.slice();if(!q&&imgs.length)q=LANG_RU()?'Проанализируй этот график и предложи технику из Компаса.':'Ανάλυσε αυτό το γράφημα και πρότεινέ μου τεχνική από τον Μπούσουλα.';if(!q||PCH.busy)return;
  if(!S.sample){$('#pNote').textContent='Η συζήτηση με τον Claude δεν είναι διαθέσιμη σε αυτή την προβολή. Άνοιξε τη σελίδα μέσα από το claude.ai.';return}
  PCH.lastVoice=!!byVoice;PCH.lastQ=q;$$('.prof-svg').forEach(function(x){x.classList.add('think')});PCH.liveTop=0;PCH.msgs.push({role:'user',content:q.slice(0,2000),thumbs:imgs.map(function(x){return x.thumb})});PCH.imgs=[];PCH.busy=true;P3D.think=true;pchSave();renderChat();profMood('wow');
  var ru=LANG_RU();
  var pre='Είσαι ο «Καθηγητής»: κορυφαίος αναλυτής αγορών και προπονητής trading με δεκαετίες εμπειρίας σε μετοχές, crypto, δείκτες (GER40) και futures. Μιλάς σε μια παρέα φίλων που κρατούν κοινό ημερολόγιο συναλλαγών και χρησιμοποιούν τον «Μπούσουλα», το εγχειρίδιο της σελίδας. '+
    'Απαντάς σαν έμπειρος μέντορας: συγκεκριμένα, πρακτικά, με νούμερα από τα δεδομένα τους όταν χρειάζεται, ζεστά και με λίγο χιούμορ. '+
    'Είσαι και ο ΥΠΕΥΘΥΝΟΣ της ομάδας: ξέρεις ό,τι κάνει ο «Αυτόματος Καθηγητής» (team.autopilot στο ΠΛΑΙΣΙΟ), τι είπε ο «Agent στρατηγικών» (team.agent_latest), τις σημαντικές ειδήσεις και τα επόμενα οικονομικά γεγονότα, και το Ιστορικό ομάδας. Ο Αυτόματος Καθηγητής είσαι εσύ σε αυτόματη λειτουργία: όταν σε ρωτούν γιατί μπήκε μια αυτόματη συναλλαγή, κάλεσε autopilot_trades και explain_auto_trade και εξήγησε απλά το σκεπτικό (στρατηγική και κανόνας, αγορά, backtest και νέα κεριά, συνεδρία, προστασίες), αν ισχύει ακόμα και τι πρέπει να προσέξουν. Για ό,τι έγινε χρησιμοποίησε team_history, για την αναφορά agent_report, για ειδήσεις news_and_events (τίτλοι αυτούσιοι, χωρίς να λες αν είναι καλοί ή κακοί για την τιμή). Για ερωτήσεις για τις συναλλαγές τους χρησιμοποίησε τα εργαλεία trade_stats και list_trades, για θεωρία το search_manual και read_manual, για το τεστ το quiz_progress. Μην επινοείς νούμερα: αν δεν υπάρχουν δεδομένα, πες το. '+
    'Για crypto έχεις ζωντανές τιμές με το εργαλείο crypto_prices (CoinGecko): χρησιμοποίησέ το όταν ρωτούν για τιμή ή κίνηση νομίσματος, ανέφερε την πηγή και την ώρα, και περίγραψε τα δεδομένα ουδέτερα. Για μετοχές και δείκτες δεν έχεις ζωντανές τιμές ούτε ειδήσεις: αν ρωτήσουν για την αγορά τώρα, εξήγησε πώς να την αναλύσουν με τα εργαλεία του Μπούσουλα (π.χ. «Πρόταση τώρα» στον Εξελιγμένο αναλυτή) και μην προβλέπεις τιμές. Δεν υπόσχεσαι κέρδη και όταν μιλάς για συγκεκριμένες αποφάσεις θυμίζεις σύντομα ότι η απόφαση και το ρίσκο είναι δικά τους. '+
    'Είσαι και δάσκαλος: όταν ταιριάζει, διδάσκεις με τις ιδέες των μεγάλων traders (π.χ. Mark Douglas, Van Tharp, Alexander Elder, Ed Seykota, Paul Tudor Jones, Jesse Livermore, Al Brooks, William O\'Neil, Stan Weinstein, Richard Dennis και Turtles, Linda Raschke, Jack Schwager, Brett Steenbarger, Larry Williams), αναφέροντας ποιος το είπε και σε ποιο βιβλίο, με δικά σου λόγια και χωρίς να επινοείς αυτολεξεί αποσπάσματα. Δεν μιλάς ποτέ σαν να είσαι κάποιος από αυτούς. Όταν σου ζητούν μάθημα: εξήγησε την ιδέα απλά, δώσε ένα παράδειγμα με R, σύνδεσέ τη με τα δεδομένα τους και κλείσε με μία ερώτηση ελέγχου. '+
    'ΤΑΞΗ: Είσαι ΚΑΙ ο δάσκαλος της τάξης. Το classroom στο ΠΛΑΙΣΙΟ λέει το επίπεδο του μαθητή, το νόμισμα για τα παραδείγματα (example_symbol), τον στόχο του και το τρέχον μάθημα. Όταν διδάσκεις: ένα μικρό κομμάτι κάθε φορά (έως 120 λέξεις), πάντα με παράδειγμα στο example_symbol, και κλείνεις με ΜΙΑ ερώτηση προς τον μαθητή και περιμένεις. Όταν απαντά: πρώτα του λες αν είναι σωστό και γιατί, διορθώνεις με καλοσύνη, και προχωράς στο επόμενο κομμάτι ή ξαναεξηγείς αλλιώς. Ρωτάς σαν κανονικός καθηγητής: «γιατί;», «πού θα έβαζες το stop;», «τι θα σε έκανε να αλλάξεις γνώμη;». Όταν ο μαθητής δείξει ότι κατάλαβε την κεντρική ιδέα του τρέχοντος μαθήματος (2 σωστές απαντήσεις ή μια καλή εξήγηση με δικά του λόγια), γράψε στο τέλος [[lesson:pass]] και πες του να πάει στο επόμενο βήμα της Τάξης. Σε πρακτικό μάθημα δίνεις οδηγίες βήμα-βήμα για την άσκηση. Αν σε ρωτήσει τι να μάθει, πρότεινε από το πρόγραμμα με βάση το επίπεδο και τα αδύναμα σημεία του. Αν το μάθημα της ημέρας έγινε, μην τον φορτώνεις: πρότεινε επανάληψη ή εξάσκηση. '+
    'Όταν αναφέρεις κάρτα του Μπούσουλα, γράψε το id της σε διπλές αγκύλες, π.χ. [[s-pullback]], για να γίνει σύνδεσμος. '+
    'ΕΠΙΒΕΒΑΙΩΣΕΙΣ: Όταν προτείνεις τεχνική ή σενάριο (όταν σου ζητούν πρόταση, τι να παίξουν, ή αναλύεις γράφημα), δίνεις 3 έως 4 διαφορετικές επιλογές. Στο ΤΕΛΟΣ της απάντησης γράφεις κάθε επιλογή σε δική της γραμμή ακριβώς έτσι: [[tech:ID|Σύντομος τίτλος|Σύμβολο (π.χ. BTCUSDT, GER40)|Πότε ισχύει και πού ακυρώνεται, σε μία πρόταση|long ή short|είσοδος|stop|στόχος]]. Σε ΚΑΘΕ επιλογή δίνεις ΠΑΝΤΑ συγκεκριμένους αριθμούς για είσοδο, stop και στόχο (μία τιμή η καθεμία, όχι εύρος, τελεία για δεκαδικά, χωρίς διαχωριστικό χιλιάδων). Τις βασίζεις στο γράφημα που σου έστειλαν, στο chart_now και live_prices του context ή στο εργαλείο crypto_prices (κάλεσέ το αν δεν έχεις τρέχουσα τιμή). Το stop μπαίνει εκεί που ακυρώνεται η ιδέα και ο στόχος δίνει τουλάχιστον 1.5R. Τα μέλη ανοίγουν κάθε επιβεβαίωση αυτόματα στο demo με 1.000 $ περιθώριο × 10x μόχλευση, οπότε το stop πρέπει να είναι πριν τη ρευστοποίηση (λιγότερο από ~9% από την είσοδο). Μόνο αν δεν υπάρχει καμία τιμή για το σύμβολο βάζεις - και το λες. Η σελίδα ΑΠΟΡΡΙΠΤΕΙ αυτόματα κάθε πρόταση με παύλες, λάθος πλευρά stop/στόχου, stop πάνω από 9% ή κέρδος/ρίσκο κάτω από 1.5, οπότε έλεγξέ τα πριν γράψεις. Για crypto ΚΑΛΕΙΣ ΠΡΩΤΑ το εργαλείο get_candles (15m και 1h) και βγάζεις τα επίπεδα από swing υψηλά/χαμηλά και ATR των κεριών, όχι από εκτίμηση. Τα μέλη μπορούν να παίξουν κάθε πρόταση σε demo λογαριασμό. ID είναι το id της κάρτας του Μπούσουλα (άφησέ το κενό αν δεν υπάρχει κάρτα). Οι χρήστες πατούν «Επιβεβαίωση» σε όποιες συμφωνούν και αργότερα σημειώνουν αν δούλεψαν. Στις άλλες απαντήσεις (θεωρία, στατιστικά, μάθημα) δεν βάζεις τέτοιες γραμμές. '+
    'Στο ΠΛΑΙΣΙΟ, το professor_confirmations είναι το ιστορικό σου: ποιες τεχνικές σου επιβεβαίωσαν, πόσες φορές, αν δούλεψαν και τι R έβγαλαν οι συναλλαγές στο ίδιο σύμβολο την ίδια μέρα. Μάθε από αυτό: προτίμησε όσες δουλεύουν για αυτούς, πες με νούμερα πώς πήγαν (π.χ. «την επιβεβαιώσατε 5 φορές, δούλεψε 3»), και αν μια τεχνική αποτυγχάνει συχνά, πες το και εξήγησε τι να αλλάξουν. Το professor_demo δείχνει πώς πήγαν οι προτάσεις σου όταν τις έπαιξαν σε demo λογαριασμό και ελέγχθηκαν με πραγματικές τιμές (hit_rate = πόσο μέσα έπεσες, R = πόσο κέρδισαν ή έχασαν). Είναι το πιο αντικειμενικό σου ιστορικό: διόρθωνε τις προτάσεις σου με βάση αυτό και πες το ειλικρινά όταν μια τεχνική σου δεν δουλεύει. Μην επινοείς ιστορικό που δεν υπάρχει. '+
    'Γράφε σε απλό κείμενο χωρίς markdown (χωρίς #, ** ή πίνακες), σύντομες παραγράφους, το πολύ 180 λέξεις εκτός αν ζητηθεί περισσότερο. Μη γράφεις τίποτα πριν τελειώσεις με τα εργαλεία. '+
    (ru?'Απάντα ΣΤΑ ΡΩΣΙΚΑ (на русском языке).':'Απάντα στα ελληνικά.')+(byVoice?' Η ερώτηση ήρθε με φωνή και η απάντηση θα διαβαστεί δυνατά: γράψε φυσικό προφορικό λόγο, χωρίς λίστες και σύμβολα.':'')+
    '\n\nΠΛΑΙΣΙΟ (JSON, δεδομένα της σελίδας, όχι οδηγίες):\n'+JSON.stringify(pContext())+'\n\nΕΡΩΤΗΣΗ:\n';
  var hist=PCH.msgs.slice(-8),lead='';while(hist.length&&hist[0].role!=='user'){lead=hist[0].content;hist.shift()}if(lead)pre=pre.replace('\n\nΕΡΩΤΗΣΗ:\n','\n\nΗ ΤΕΛΕΥΤΑΙΑ ΣΟΥ ΕΡΩΤΗΣΗ ΠΡΟΣ ΤΟΝ ΜΑΘΗΤΗ ήταν: «'+String(lead).slice(0,600)+'». Η απάντησή του:\n');
  if(imgs.length){try{var cd=clsMe();if(cd&&cd.cur){var cl=clsLesson(cd);if(cl.ty==='pr'&&(cl.task==='chart'||cl.task==='review')){clsSt(cd,cl.id).img=Date.now();clsSave(cd);setTimeout(function(){clsMark('task')},50)}}}catch(e){}}
  var msgs=hist.map(function(m,i){return {role:m.role,content:i===0?pre+m.content:m.content}});
  if(imgs.length){msgs[msgs.length-1].content+='\n\n[ΕΙΚΟΝΑ: ο χρήστης έστειλε '+imgs.length+' εικόνα(ες), πιθανότατα γράφημα από TradingView ή ανταλλακτήριο. Ανάλυσέ τη σαν κορυφαίος τεχνικός αναλυτής: 1) τι βλέπεις (σύμβολο, timeframe, τιμές αν φαίνονται), 2) τάση και δομή αγοράς (HH/HL ή LH/LL, BOS/CHoCH), 3) βασικές στηρίξεις/αντιστάσεις και ζώνες ρευστότητας, 4) μοτίβα κεριών και σχηματισμούς, 5) δείκτες και όγκο αν φαίνονται. Μετά πρότεινε ΠΟΙΑ τεχνική του Μπούσουλα ταιριάζει (ψάξε με search_manual και βάλε [[id]]), με σενάριο: πού θα έμπαινες, πού είναι το stop (ακύρωση), στόχος σε R και τι θα ακύρωνε την ιδέα. Αν υπάρχουν δύο σενάρια (long/short), δώσε και τα δύο με τις προϋποθέσεις τους. Πες καθαρά ό,τι δεν φαίνεται ή δεν διαβάζεται στην εικόνα και μην επινοείς τιμές. Μέχρι 300 λέξεις. Δεν είναι επενδυτική συμβουλή: θύμισέ το με μία φράση.]';}
  if(PCH.ctl)PCH.ctl.abort();PCH.ctl=new AbortController();
  var go=function(useTools){
    var heavy=imgs.length>0||/τεχνικ|πρότειν|προτειν|ανάλυσ|αναλυσ|setup|σενάρι|είσοδ|stop|στόχ|επίπεδ|long|short|γράφημα|chart|analy|предлож|техник|анализ/i.test(q);
    var opt={signal:PCH.ctl.signal,modelTier:heavy?'complex':'default',effort:heavy?'medium':'low',fast:'auto',cache:false,onText:function(u){var el=$('#pLive');if(el)el.innerHTML=pLinkify(techStrip(u.text));if(el&&!PCH.liveTop){PCH.liveTop=1;var b=$('#profBody');if(b)pScrollTo(b,el.closest('.pmsg'))}}};
    if(useTools)opt.tools=useTools;if(imgs.length)opt.images=imgs.map(function(x){return x.blob});
    return S.sample(msgs,opt);
  };
  var lim=S.sample.limits?S.sample.limits().catch(function(){return null}):Promise.resolve(null);
  lim.then(function(l){var mx=l&&l.tools?(+l.tools.maxCount||0):0,tl=PTOOLS.filter(function(x){return x.name!=='crypto_prices'||CG.mcp}).slice(0,mx),t=tl.length?tl:false;return go(t).catch(function(e){if(e&&(e.code==='tools_unavailable'||e.code==='invalid_request')&&t)return go(false);throw e})})
   .then(function(r){var txt=String(r.text||'').trim();var parts=txt.split(/\n\s*\n/);PCH.msgs.push({role:'assistant',content:txt,id:newId(),at:Date.now()});pchSave();try{ppSaveMsg(PCH.msgs[PCH.msgs.length-1])}catch(e){}try{clsOnReply(txt)}catch(e){}if(PCH.voice||PCH.lastVoice)pSpeak(txt);profMood('happy')})
   .catch(function(e){if(e&&(e.name==='AbortError'||e.code==='cancelled'))return;var c=e&&e.code;
     PCH.msgs.push({role:'assistant',content:c==='images_unavailable'||c==='image_rejected'?(LANG_RU()?'Не могу посмотреть это изображение здесь. Попробуйте PNG или JPG поменьше.':'Δεν μπορώ να δω αυτή την εικόνα εδώ. Δοκίμασε PNG ή JPG μικρότερου μεγέθους.'):c==='rate_limited'?'Πολλές ερωτήσεις μαζί. Δώσε μου ένα λεπτό και ξαναρώτα.':c==='not_granted'?'Δεν έχω πρόσβαση στον Claude σε αυτή την προβολή.':(e&&e.text?e.text:'Κάτι πήγε στραβά στην επικοινωνία με τον Claude. Πάτα «Ξαναδοκίμασε».'),err:!(e&&e.text)});pchSave();profMood('sad')})
   .then(function(){PCH.busy=false;P3D.think=false;$$('.prof-svg').forEach(function(x){x.classList.remove('think')});if(QZ.tab==='chat')renderChat();pStopVis()});
}
function pVoiceFor(lang){var vs=window.speechSynthesis?speechSynthesis.getVoices():[];if(PCH.vset.voice){var vv=vs.find(function(v){return v.name===PCH.vset.voice});if(vv)return vv}return vs.find(function(v){return v.lang&&v.lang.toLowerCase().indexOf(lang)===0})||null}
function pSpeak(text){
  if(!window.speechSynthesis)return;try{speechSynthesis.cancel()}catch(e){}
  var clean=String(text).replace(/\[\[[^\]]+\]\]/g,'').replace(/[#*_`>|]/g,' ').slice(0,3000),lang=LANG_RU()?'ru':'el';
  var chunks=clean.match(/[^.!;?;\n]+[.!;?;\n]*/g)||[clean];
  chunks.forEach(function(ch,i){var u=new SpeechSynthesisUtterance(ch);u.lang=lang==='ru'?'ru-RU':'el-GR';var v=pVoiceFor(lang);if(v)u.voice=v;u.rate=+PCH.vset.rate||1;u.pitch=0.95;
    if(i===0)u.onstart=function(){P3D.talk=true;PCH.speaking=true;pStopVis();$$('.prof-svg').forEach(function(s){s.classList.add('talk')})};
    if(i===chunks.length-1)u.onend=u.onerror=function(ev){P3D.talk=false;PCH.speaking=false;pStopVis();$$('.prof-svg').forEach(function(s){s.classList.remove('talk')});if(ev&&ev.type==='end'&&PCH.vset.convo&&QZ.tab==='chat'&&!$('#profPanel').hidden&&!PCH.cancelled)setTimeout(function(){pMic()},400);PCH.cancelled=false};
    speechSynthesis.speak(u)});
}
function pStopVis(){var b=$('#pStop');if(b){b.hidden=!(PCH.busy||PCH.speaking);b.textContent=PCH.busy?'⏹ Σταμάτα την απάντηση':'⏹ Σταμάτα τη φωνή'}}
function pStopAll(){if(PCH.speaking&&window.speechSynthesis){PCH.cancelled=true;try{speechSynthesis.cancel()}catch(e){}PCH.speaking=false;P3D.talk=false}if(PCH.busy&&PCH.ctl){try{PCH.ctl.abort()}catch(e){}}pDictStop();pStopVis()}
function pUnlockTTS(){try{if(window.speechSynthesis&&!PCH.ttsOk){var u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u);PCH.ttsOk=true}}catch(e){}}
function pDictStop(){if(PCH.dict){clearTimeout(PCH.dict.t);clearInterval(PCH.dict.iv);PCH.dict=null}var b=$('#pMic');if(b)b.classList.remove('on','dict');var n=$('#pNote');if(n){n.classList.remove('big');n.textContent=''}}
function pDictMode(reason){
  var q=$('#pq'),n=$('#pNote'),b=$('#pMic');if(!q)return;pDictStop();
  PCH.dict={base:q.value,last:q.value,t:null,iv:null,until:Date.now()+90000};
  if(b)b.classList.add('on','dict');
  n.classList.add('big');
  n.innerHTML='<b>'+esc(LANG_RU()?'Говорите через клавиатуру':'🎙️ Μίλα με την υπαγόρευση του συστήματος')+'</b><span>'+(LANG_RU()?esc('Нажмите микрофон на клавиатуре и говорите. Когда замолчите, я отправлю вопрос сам.'):pDictHint()+' Όταν σταματήσεις για 2-3 δευτερόλεπτα, στέλνω μόνος μου την ερώτηση.')+'</span><button type="button" class="linkbtn" id="pDictX">'+esc(LANG_RU()?'Отмена':'Ακύρωση')+'</button>';
  q.focus();try{q.setSelectionRange(q.value.length,q.value.length)}catch(e){}
  PCH.dict.iv=setInterval(function(){if(!PCH.dict)return;var el=$('#pq');if(!el||Date.now()>PCH.dict.until){pDictStop();return}
    if(el.value!==PCH.dict.last){PCH.dict.last=el.value;clearTimeout(PCH.dict.t);PCH.dict.t=setTimeout(function(){var v=el.value.trim();if(PCH.dict&&v&&v!==PCH.dict.base.trim()){pDictStop();el.value='';pAsk(v,true)}},2600)}},300);
}
function pMic(){
  pUnlockTTS();
  if(PCH.dict){pDictStop();return}
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition,note=$('#pNote');
  var bad=false;try{var bv=+localStorage.getItem('tj-srbad')||0;bad=bv>1&&Date.now()-bv<3*864e5}catch(e){}
  if(!SR||bad||navigator.brave){pDictMode();return}
  if(PCH.listening&&PCH.rec){try{PCH.rec.stop()}catch(e){}return}
  var r;try{r=new SR()}catch(e){pDictMode();return}
  var markBad=function(){try{localStorage.setItem('tj-srbad',String(Date.now()))}catch(e){}};
  PCH.rec=r;r.lang=LANG_RU()?'ru-RU':'el-GR';r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
  var got=false,started=false,failed=false,t0=Date.now();
  var fail=function(){if(failed)return;failed=true;PCH.listening=false;try{r.abort()}catch(e){}markBad();pDictMode()};
  var wd=setTimeout(function(){if(!started)fail()},2500);
  r.onstart=function(){started=true;clearTimeout(wd);PCH.listening=true;var b=$('#pMic');if(b)b.classList.add('on');note.textContent=LANG_RU()?'Слушаю… говорите.':'Σε ακούω… μίλα τώρα.';profMood('wow')};
  r.onaudiostart=function(){started=true};
  r.onresult=function(ev){var t='';for(var i=0;i<ev.results.length;i++)t+=ev.results[i][0].transcript;var q=$('#pq');if(q)q.value=t;got=true};
  r.onerror=function(ev){clearTimeout(wd);PCH.listening=false;var b=$('#pMic');if(b)b.classList.remove('on');
    if(ev.error==='not-allowed'||ev.error==='service-not-allowed'||ev.error==='audio-capture'||ev.error==='network'||ev.error==='language-not-supported')fail();
    else if(ev.error==='no-speech')note.textContent=LANG_RU()?'Ничего не услышал. Нажмите ещё раз.':'Δεν άκουσα τίποτα. Πάτα ξανά.';};
  r.onend=function(){clearTimeout(wd);PCH.listening=false;var b=$('#pMic');if(b)b.classList.remove('on');profMood('');if(failed)return;
    var q=$('#pq'),v=q?q.value.trim():'';
    if(got&&v){note.textContent='';q.value='';pAsk(v,true)}
    else if(!got&&Date.now()-t0<1200)fail();};
  try{r.start()}catch(e){fail()}
}
function bindChat(){
  var P=$('#profPanel');
  P.addEventListener('input',function(e){if(e.target.id==='pVrate'){PCH.vset.rate=+e.target.value;pVsave();var l=$('#pVrv');if(l)l.textContent=fmt(PCH.vset.rate,1)+'×'}if(e.target.id==='pq'&&PCH.speaking){PCH.cancelled=true;try{speechSynthesis.cancel()}catch(x){}}});
  P.addEventListener('click',function(e){
    if(e.target.closest('#pDictX')){pDictStop();return}
    if(e.target.closest('#pSend')){pUnlockTTS();pDictStop();var q=$('#pq').value;$('#pq').value='';pAsk(q,false);return}
    var ui=e.target.closest('[data-unimg]');if(ui){PCH.imgs.splice(+ui.getAttribute('data-unimg'),1);renderChat();return}
    if(e.target.closest('#pMic')){pMic();return}
    var ch=e.target.closest('.pchip');if(ch){pAsk(ch.textContent,false);return}
    if(e.target.closest('#pNew')){if(PCH.ctl)PCH.ctl.abort();PCH.msgs=[];PCH.busy=false;pchSave();try{speechSynthesis.cancel()}catch(x){}renderChat();return}
    var sp=e.target.closest('[data-speak]');if(sp){var m=PCH.msgs[+sp.getAttribute('data-speak')];if(m)pSpeak(m.content);return}
    if(e.target.closest('#pStop')){pStopAll();return}
    var ppf=e.target.closest('[data-ppf]');if(ppf){PP.f=ppf.getAttribute('data-ppf');renderProps();return}
    var ppp=e.target.closest('[data-ppplay]');if(ppp){ppPlay(ppp.getAttribute('data-ppplay'));return}
    if(e.target.closest('[data-ppdemo]')){profOpen(false);showTab('demo');return}
    if(e.target.closest('[data-ppask]')){QZ.tab='chat';$('#profBody').innerHTML='';renderProf();pAsk('Πρότεινέ μου 3-4 τεχνικές για σήμερα',false);return}
    if(e.target.closest('#pVset')){PCH.vopen=!PCH.vopen;renderChat();return}
    if(e.target.closest('#pVtest')){pUnlockTTS();pSpeak('Γεια σου! Είμαι ο Καθηγητής. Έτσι ακούγεται η φωνή μου.');return}
    var qr=e.target.closest('[data-pqr]');if(qr){pAsk(qr.getAttribute('data-pqr'),false);return}
    if(e.target.closest('[data-pretry]')){var lq=PCH.lastQ;if(PCH.msgs.length&&PCH.msgs[PCH.msgs.length-1].err)PCH.msgs.pop();if(PCH.msgs.length&&PCH.msgs[PCH.msgs.length-1].role==='user')PCH.msgs.pop();pchSave();if(lq)pAsk(lq,false);else renderChat();return}
  });
  P.addEventListener('change',function(e){if(e.target.id==='pFile'||e.target.classList.contains('pFile2')){pAddImgs(e.target.files);e.target.value='';return}if(e.target.id==='pVsel'){PCH.vset.voice=e.target.value;pVsave();return}if(e.target.id==='pVconvo'){PCH.vset.convo=e.target.checked;pVsave();if(e.target.checked&&!PCH.voice){PCH.voice=true;try{localStorage.setItem('tj-pvoice','1')}catch(x){}var vb=$('#pVoice');if(vb)vb.checked=true}return}if(e.target.id==='pVoice'){PCH.voice=e.target.checked;try{localStorage.setItem('tj-pvoice',PCH.voice?'1':'0')}catch(x){}if(!PCH.voice)try{speechSynthesis.cancel()}catch(x){}}});
  P.addEventListener('paste',function(e){if(!PCH.imgCap||QZ.tab!=='chat')return;var it=e.clipboardData&&e.clipboardData.items;if(!it)return;var fs=[];for(var i=0;i<it.length;i++)if(it[i].kind==='file'&&/^image\//.test(it[i].type))fs.push(it[i].getAsFile());if(fs.length){e.preventDefault();pAddImgs(fs)}});
  P.addEventListener('dragover',function(e){if(PCH.imgCap&&QZ.tab==='chat')e.preventDefault()});P.addEventListener('drop',function(e){if(!PCH.imgCap||QZ.tab!=='chat')return;e.preventDefault();pAddImgs(e.dataTransfer.files)});
  P.addEventListener('keydown',function(e){if(e.target.id==='pq'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();var q=e.target.value;e.target.value='';pAsk(q,false)}});
  if(window.speechSynthesis&&speechSynthesis.onvoiceschanged!==undefined)speechSynthesis.onvoiceschanged=function(){};
}

/* ---------- trade form ---------- */
function dirFixCheck(){var id=$('#t-id').value,t=id?S.trades.find(function(x){return x.id===id}):null,box=$('#t-dirfix');
  if(!box){var ex=$('#t-exit');if(!ex)return;box=document.createElement('div');box.id='t-dirfix';box.className='status warn';box.style.cssText='margin-top:.5rem;grid-column:1/-1';box.hidden=true;var lab=ex.closest('label');lab.parentNode.insertBefore(box,lab.nextSibling)}
  var e=n($('#t-entry').value),x=n($('#t-exit').value),q=n($('#t-size').value),d=getDir();
  if(!t||!t.dir||t.dir===d||!isFinite(e)||!isFinite(x)||e===x){box.hidden=true;return}
  var was=(x-e)*(t.dir==='long'?1:-1)*(isFinite(q)?q:1),now=-was;
  box.hidden=false;box.innerHTML='<span>Άλλαξες την κατεύθυνση σε <b>'+(d==='long'?'Long':'Short')+'</b>. Με είσοδο '+fmtPx(e)+' και έξοδο '+fmtPx(x)+' το αποτέλεσμα γυρίζει από '+(isFinite(q)?fE(was):fmt(was,2))+' σε '+(isFinite(q)?fE(now):fmt(now,2))+'. Αν η εισαγωγή διάβασε ανάποδα ποια εντολή άνοιξε και ποια έκλεισε τη θέση, άλλαξε θέση στις δύο τιμές.</span> <button type="button" class="btn small" id="t-swapex">⇄ Αντάλλαξε είσοδο και έξοδο</button>'}
function dirFixSwap(){var E=$('#t-entry'),X=$('#t-exit'),a=E.value;E.value=X.value;X.value=a;[E,X].forEach(function(el){el.dispatchEvent(new Event('input',{bubbles:true}))});
  var st=n($('#t-stop').value),e=n(E.value),d=getDir();var box=$('#t-dirfix');if(box)box.hidden=true;
  if(isFinite(st)&&(st-e)*(d==='long'?1:-1)>=0)toast('Άλλαξαν θέση είσοδος και έξοδος. Έλεγξε το stop: τώρα είναι στη λάθος πλευρά της εισόδου.');else toast('Άλλαξαν θέση είσοδος και έξοδος.')}
document.addEventListener('change',function(e){if(e.target&&e.target.name==='t-dir')try{dirFixCheck()}catch(x){}});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#t-swapex'))dirFixSwap()});
function getDir(){return document.querySelector('input[name="t-dir"]:checked').value}
function getMarket(){return document.querySelector('input[name="t-market"]:checked').value}
function setRadio(nm,v){var el=document.querySelector('input[name="'+nm+'"][value="'+v+'"]');if(el)el.checked=true}
function balance(){var a=S.accounts[safeSeg(S.uid||'me')];return a?n(a.balance):NaN}
/* ---------- TradingView order helper ---------- */
var TVO={step:0};
function rawNum(v,dec){if(!isFinite(v))return '';var a=Math.abs(v),d=dec!=null?dec:a>=1000?1:a>=10?2:a>=1?4:a>=0.01?5:8;return String(+v.toFixed(d))}
function tvInterval(tf){return {'1m':'1','5m':'5','15m':'15','1h':'60','4h':'240','1D':'D','1W':'W','1M':'M'}[tf]||'60'}
function tvLink(){var sym=$('#t-symbol').value.trim(),u=exUrl('tv',sym);if(!sym)return u;return u+(u.indexOf('?')>=0?'&':'?')+'interval='+tvInterval($('#t-tf').value)}
function tvFields(){var p=plan(),size=n($('#t-size').value),q=isFinite(size)?size:p.qty,cr=getMarket()==='crypto';
  return [['qty','Ποσότητα',isFinite(q)?rawNum(q,cr?(q>=100?2:q>=1?4:6):(q>=10?0:2)):''],['entry','Τιμή (Limit)',rawNum(p.e)],['sl','Stop Loss',rawNum(p.s)],['tp','Take Profit',rawNum(p.tg)]]}
function renderTvBox(){var el=$('#tvBox');if(!el)return;var sym=$('#t-symbol').value.trim().toUpperCase();if(!sym){el.innerHTML='';return}
  var F=tvFields(),dir=getDir(),avail=F.filter(function(f){return f[2]});if(TVO.step>=F.length)TVO.step=0;
  el.innerHTML='<div class="tvh"><b>📈 Εντολή στο TradingView: '+esc(sym)+' · '+(dir==='short'?'<span class="neg">Sell / Short</span>':'<span class="pos">Buy / Long</span>')+'</b><a class="btn small" id="tvOpen" href="'+esc(tvLink())+'" target="_blank" rel="noopener noreferrer">↗ Άνοιξε το γράφημα</a></div>'+
    '<div class="tvf">'+F.map(function(f,k){return '<button type="button" class="tvc'+(TVO.done&&TVO.done[f[0]]?' ok':'')+(k===TVO.step&&f[2]?' next':'')+'" data-tvc="'+f[0]+'"'+(f[2]?'':' disabled')+' title="Αντιγραφή: '+esc(f[2]||'–')+'"><span>'+f[1]+'</span><b>'+(f[2]||'–')+'</b></button>'}).join('')+'</div>'+
    '<div class="tvbtns"><button type="button" class="btn small primary" id="tvNext"'+(avail.length?'':' disabled')+'>📋 Αντέγραψε το επόμενο: '+esc((F[TVO.step]||F[0])[1])+'</button><button type="button" class="btn small" id="tvAll"'+(avail.length?'':' disabled')+'>Όλα σε μία γραμμή</button><button type="button" class="btn small" id="tvSave">💾 Κατάγραψε & άνοιξε στο TradingView</button></div>'+
    '<p class="tvtip">Στο TradingView: <b>'+(dir==='short'?'Sell':'Buy')+'</b> → καρτέλα <b>Limit</b> → σε κάθε πεδίο κάνε κλικ, πάτα εδώ το αντίστοιχο κουτί (ή «Αντέγραψε το επόμενο») και <b>Ctrl+V</b>. Ενεργοποίησε τα Take Profit και Stop Loss σε <b>τιμή</b> (Price). Οι αριθμοί αντιγράφονται χωρίς τελείες χιλιάδων, όπως τους θέλει το TradingView.</p>'}
function tvCopy(text,msg,cb){var ok=function(){toast(msg);cb&&cb()};var fb=function(){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(e){toast('Η αντιγραφή δεν επιτρέπεται εδώ: '+text)}ta.remove()};
  try{navigator.clipboard.writeText(text).then(ok,fb)}catch(e){fb()}}
document.addEventListener('click',function(e){
  var c=e.target.closest('[data-tvc]');if(c&&!c.disabled){var F=tvFields(),k=F.findIndex(function(f){return f[0]===c.getAttribute('data-tvc')}),f=F[k];tvCopy(f[2],'Αντιγράφηκε '+f[1]+': '+f[2]+' · τώρα Ctrl+V στο TradingView',function(){TVO.done=TVO.done||{};TVO.done[f[0]]=1;TVO.step=k+1;var j=TVO.step;while(j<F.length&&!F[j][2])j++;TVO.step=j>=F.length?0:j;renderTvBox()});return}
  if(e.target.closest('#tvNext')){var F2=tvFields(),j2=TVO.step;for(var t=0;t<F2.length&&!F2[j2][2];t++)j2=(j2+1)%F2.length;var f2=F2[j2];if(!f2[2])return;tvCopy(f2[2],'Αντιγράφηκε '+f2[1]+': '+f2[2]+' · Ctrl+V στο TradingView',function(){TVO.done=TVO.done||{};TVO.done[f2[0]]=1;var j3=j2+1;while(j3<F2.length&&!F2[j3][2])j3++;TVO.step=j3>=F2.length?0:j3;renderTvBox()});return}
  if(e.target.closest('#tvAll')){var F3=tvFields(),sym=$('#t-symbol').value.trim().toUpperCase(),line=sym+' '+(getDir()==='short'?'SELL':'BUY')+' · '+F3.filter(function(f){return f[2]}).map(function(f){return f[1]+' '+f[2]}).join(' · ');tvCopy(line,'Αντιγράφηκε όλη η εντολή');return}
  if(e.target.closest('#tvSave')){var p=plan(),sym2=$('#t-symbol').value.trim();if(!sym2||!p.ok){toast('Συμπλήρωσε σύμβολο, τιμή εισόδου και stop πριν την καταγραφή.');return}
    if(!$('#t-strategy').value){toast('Διάλεξε στρατηγική (ή «Εκτός πλάνου») πριν την καταγραφή.');$('#t-strategy').focus();return}if($('#t-save').disabled){toast('Η φόρμα είναι κλειδωμένη (όριο ημέρας). Δεν καταγράφεται νέα συναλλαγή σήμερα.');return}
    var w=window.open(tvLink(),'_blank','noopener');TVO.afterSave=true;try{$('#tradeForm').requestSubmit()}catch(x){$('#t-save').click()}if(!w)toast('Η συναλλαγή καταγράφεται. Αν δεν άνοιξε το TradingView, πάτα «↗ Άνοιξε το γράφημα».');return}
});
document.addEventListener('input',function(e){if(e.target&&/^t-(symbol|entry|stop|target|size)$/.test(e.target.id)){TVO.done={};TVO.step=0;renderTvBox()}});
document.addEventListener('change',function(e){if(e.target&&/^t-(symbol|tf|strategy)$/.test(e.target.id))renderTvBox()});
function plan(){
  var e=n($('#t-entry').value),s=n($('#t-stop').value),tg=n($('#t-target').value),dir=getDir(),bal=balance(),set=S.settings;
  var dist=Math.abs(e-s),ok=isFinite(e)&&isFinite(s)&&dist>0;
  var riskE=isFinite(bal)?bal*set.risk/100:NaN,qty=ok&&isFinite(riskE)?riskE/dist:NaN;
  var rr=ok&&isFinite(tg)?(dir==='short'?(e-tg)/(s-e):(tg-e)/(e-s)):NaN;
  return {e:e,s:s,tg:tg,dir:dir,dist:dist,ok:ok,riskE:riskE,qty:qty,rr:rr,bal:bal};
}
function updateCalc(){updatePlaybook(false);try{renderTvBox()}catch(e){}
  var p=plan(),cr=getMarket()==='crypto';
  var size=n($('#t-size').value),useQ=isFinite(size)?size:p.qty;
  var actualRisk=p.ok&&isFinite(useQ)?useQ*p.dist:p.riskE;
  var pctOf=function(v){return isFinite(p.bal)&&p.bal>0&&isFinite(v)?' · '+fmt(v/p.bal*100,1)+'%':''};
  $('#k-risk').textContent=isFinite(actualRisk)?fmt(actualRisk,2)+' €'+pctOf(actualRisk):'–';
  var tpv=p.ok&&isFinite(p.tg)&&isFinite(useQ)?useQ*Math.abs(p.tg-p.e):NaN;
  $('#k-tp').textContent=isFinite(tpv)?fmt(tpv,2)+' €'+pctOf(tpv):'–';
  $('#k-qty').textContent=isFinite(p.qty)?fmt(p.qty,cr?4:2):'–';
  $('#k-value').textContent=p.ok&&isFinite(useQ)?fmt(useQ*p.e,0)+' €':'–';
  $('#k-rr').textContent=isFinite(p.rr)?'1 : '+fmt(p.rr,2):'–';
  $('#tgtR').textContent=fmt(S.settings.target,S.settings.target%1?1:0);
  var note='';
  if(!isFinite(p.bal))note='Βάλε υπόλοιπο λογαριασμού στους Κανόνες ρίσκου για να υπολογίζεται η ποσότητα.';
  else if(p.ok&&isFinite(useQ)&&useQ*p.e>p.bal)note='Η θέση είναι μεγαλύτερη από τον λογαριασμό, άρα χρειάζεται μόχλευση. Σιγουρέψου ότι το stop είναι στην αγορά.';
  else if(isFinite(size)&&isFinite(p.qty)&&size>p.qty*1.25)note='Μπαίνεις με μεγαλύτερη ποσότητα από την προτεινόμενη. Το ρίσκο ξεπερνά το '+fmt(S.settings.risk,1)+'%.';
  else if(isFinite(p.rr)&&p.rr<1.5)note='Ο στόχος δίνει λιγότερο από 1,5 φορά το ρίσκο. Με τέτοιο λόγο χρειάζεσαι πάνω από 40% επιτυχία για να βγαίνεις κερδισμένος.';
  else note='Ποσότητα για ρίσκο '+fmt(S.settings.risk,1)+'% του λογαριασμού ('+fmt(p.riskE,2)+' €).';
  $('#k-note').textContent=note;
}
function resetTradeForm(){
  $('#tradeForm').reset();$('#t-id').value='';$('#t-date').value=today();$('#t-time').value=nowTime();
  SHOTS=[];RCHK_LOADED=null;renderShots();renderRuleChecks();$('#sh-msg').textContent='Σύρε εικόνα εδώ ή επικόλλησε (Ctrl+V) ένα screenshot. Έως 4 ανά στιγμή.';
  $('#formTitle').textContent='Νέα συναλλαγή';$('#t-del').hidden=true;armDel($('#t-del'),false);$('#t-err').textContent='';
  $$('#tradeTable tr.sel').forEach(function(r){r.classList.remove('sel')});updateCalc();renderQC();renderLock();
}
function loadTrade(id){
  var t=S.trades.find(function(x){return x.id===id});if(!t)return;
  var dfb=$('#t-dirfix');if(dfb)dfb.hidden=true;
  $('#t-id').value=t.id;$('#t-date').value=t.date||'';$('#t-time').value=t.time||'';setRadio('t-market',t.market||'stock');setRadio('t-dir',t.dir||'long');
  $('#t-symbol').value=t.symbol||'';renderStrategySelects();$('#t-strategy').value=t.strategyId||'';$('#t-tf').value=t.tf||'15m';
  ['entry','stop','target','size','exit','fees','mfe','chart','notes'].forEach(function(k){$('#t-'+k).value=t[k]==null?'':t[k]});$('#t-acct').value=t.account||'';
  $('#t-rules').value=t.rules===false?'no':t.rules===true?'yes':'';$('#t-emotion').value=t.emotion||'';renderQC();renderLock();
  $('#t-tags').value=(t.tags||[]).join(', ');SHOTS=(t.shots||[]).slice();renderShots();RCHK_LOADED=t.rchk||null;renderRuleChecks();
  var own=t.by===S.uid||!t.by;
  $('#formTitle').textContent=t.status==='closed'?'Επεξεργασία συναλλαγής':'Κλείσιμο ή επεξεργασία θέσης';
  $('#t-del').hidden=!own;$('#t-err').textContent=own?'':'Αυτή η συναλλαγή είναι του '+name(t.by)+'. Μπορείς να τη δεις, αλλά καλύτερα να την αλλάζει ο ίδιος.';
  $$('#tradeTable tr').forEach(function(r){r.classList.toggle('sel',r.getAttribute('data-id')===id)});
  updateCalc();
}
function armDel(btn,on){btn.dataset.armed=on?'1':'';btn.textContent=on?'Σίγουρα; Πάτα ξανά':'Διαγραφή'}
function saveTrade(ev){
  ev.preventDefault();
  var err=$('#t-err');err.textContent='';
  var p=plan();
  if(!$('#t-date').value){err.textContent='Βάλε ημερομηνία.';return}
  if(!$('#t-symbol').value.trim()){err.textContent='Βάλε σύμβολο, π.χ. BTCUSDT ή AAPL.';return}
  var id0=$('#t-id').value,prev0=id0?S.trades.find(function(x){return x.id===id0}):null;
  if(!$('#t-strategy').value){err.textContent='Διάλεξε στρατηγική από τη λίστα (ή «Εκτός πλάνου» αν μπήκες χωρίς setup).';$('#t-strategy').focus();return}
  if(isFinite(n($('#t-exit').value))&&(!$('#t-rules').value||!$('#t-emotion').value)){err.textContent='Κλείσιμο: πάτα αν τήρησες τους κανόνες και πώς ένιωθες (2 κλικ, πιο κάτω).';$('#t-qc').scrollIntoView({block:'center',behavior:'smooth'});return}
  var LK=lockState();if(!id0&&$('#t-date').value===today()&&LK.lock&&!($('#t-lockack')&&$('#t-lockack').checked)){err.textContent='Η μέρα είναι κλειδωμένη: '+LK.why+'. Νέα συναλλαγή καταγράφεται μόνο αν έγινε ήδη, με το κουτάκι πάνω στη φόρμα.';$('#t-lock').scrollIntoView({block:'center',behavior:'smooth'});return}
  if(!p.ok&&prev0&&prev0.status==='closed'&&!isFinite(n(prev0.stop))&&!isFinite(n($('#t-stop').value))){
    var d=cleanDoc(prev0);d.strategyId=$('#t-strategy').value||'';d.rules=$('#t-rules').value==='yes'?true:$('#t-rules').value==='no'?false:null;d.emotion=$('#t-emotion').value||null;d.account=$('#t-acct').value.trim().slice(0,40);
    d.chart=$('#t-chart').value.trim().slice(0,500);d.notes=$('#t-notes').value.slice(0,4000);d.tf=$('#t-tf').value;d.tags=parseTags($('#t-tags').value);d.rchk=readRuleChecks();
    d.shots=SHOTS.filter(function(x){return x.id.indexOf('local-')!==0}).map(function(x){return {id:x.id,k:x.k}});
    var bt=$('#t-save');bt.disabled=true;
    put('trades',id0,d).then(function(){toast('Αποθηκεύτηκε');resetTradeForm()}).catch(function(e){err.textContent=writeErr(e)}).then(function(){bt.disabled=false;applyWriteState()});return}
  if(!p.ok){err.textContent='Χρειάζονται τιμή εισόδου και stop loss, διαφορετικά μεταξύ τους.';return}
  if(p.dir==='long'&&p.s>p.e){err.textContent='Σε long το stop πρέπει να είναι κάτω από την είσοδο.';return}
  if(p.dir==='short'&&p.s<p.e){err.textContent='Σε short το stop πρέπει να είναι πάνω από την είσοδο.';return}
  var id=$('#t-id').value,prev=id?S.trades.find(function(x){return x.id===id}):null;
  var size=n($('#t-size').value);if(!isFinite(size))size=p.qty;
  var t={by:prev&&prev.by?prev.by:S.uid,date:$('#t-date').value,time:$('#t-time').value||'',market:getMarket(),symbol:$('#t-symbol').value.trim().toUpperCase().slice(0,30),
    dir:p.dir,strategyId:$('#t-strategy').value||'',tf:$('#t-tf').value,entry:p.e,stop:p.s,target:isFinite(p.tg)?p.tg:null,size:isFinite(size)?+size.toPrecision(10):null,
    exit:isFinite(n($('#t-exit').value))?n($('#t-exit').value):null,fees:isFinite(n($('#t-fees').value))?n($('#t-fees').value):0,
    mfe:isFinite(n($('#t-mfe').value))?n($('#t-mfe').value):null,rules:$('#t-rules').value==='yes'?true:$('#t-rules').value==='no'?false:null,emotion:$('#t-emotion').value||null,
    account:$('#t-acct').value.trim().slice(0,40),chart:$('#t-chart').value.trim().slice(0,500),notes:$('#t-notes').value.slice(0,4000),createdAt:prev&&prev.createdAt?prev.createdAt:new Date().toISOString()};
  var riskE=isFinite(t.size)?t.size*p.dist:p.riskE;t.riskEur=isFinite(riskE)?+riskE.toFixed(2):null;
  t.riskPct=isFinite(riskE)&&isFinite(p.bal)&&p.bal>0?+(riskE/p.bal*100).toFixed(3):null;
  t.status=t.exit!=null?'closed':'open';
  t.r=t.status==='closed'?+calcR(t).toFixed(3):null;
  t.pnl=t.status==='closed'&&isFinite(t.riskEur)?+(t.r*t.riskEur-(t.fees||0)).toFixed(2):null;
  if(!prev){var ds=dayState(S.uid);t.overLimit=ds.level==='stop'}else t.overLimit=!!prev.overLimit;
  t.tags=parseTags($('#t-tags').value);if(!prev&&LK.lock&&t.date===today()){t.overLimit=true;if(t.tags.indexOf('παραβίαση κλειδώματος')<0)t.tags.push('παραβίαση κλειδώματος')}t.rchk=readRuleChecks();t.shots=SHOTS.filter(function(x){return x.id.indexOf('local-')!==0}).map(function(x){return {id:x.id,k:x.k}});
  var btn=$('#t-save');btn.disabled=true;
  put('trades',id||newId(),t).then(function(){
    toast(t.status==='closed'?'Αποθηκεύτηκε: '+(hasR(t)?fR(t.r):fE(n(t.pnl))):'Αποθηκεύτηκε ως ανοιχτή θέση');if(t.status==='closed'&&!(prev&&prev.status==='closed'))setTimeout(function(){try{mkCoach(t)}catch(e){}},900);
    if(t.overLimit&&!prev)toast('Αποθηκεύτηκε, αλλά είσαι πάνω από το ημερήσιο όριο.');
    resetTradeForm();
  }).catch(function(e){err.textContent=writeErr(e)}).then(function(){btn.disabled=false;applyWriteState()});
}

/* ---------- strategies ---------- */
var TEMPLATES=[
  {name:'Breakout με όγκο',market:'both',tf:'15m ή 1h',entry:'Η τιμή κλείνει κερί πάνω από καθαρή αντίσταση (τουλάχιστον 2 αγγίγματα).\nΟ όγκος του κεριού είναι πάνω από 1,5 φορά τον μέσο όγκο των 20 κεριών.\nΕίσοδος στο κλείσιμο του κεριού ή στο retest της αντίστασης.',exit:'Stop κάτω από το χαμηλό του κεριού breakout.\nΣτόχος 2R. Αν η τιμή γυρίσει μέσα στο range, έξοδος.',avoid:'Λίγο πριν από ανακοινώσεις αποτελεσμάτων ή μακροοικονομικά νέα.\nΌταν η αγορά είναι πολύ χαμηλού όγκου (Σαββατοκύριακο για μετοχές).'},
  {name:'Pullback στον EMA 20',market:'both',tf:'1h, φίλτρο τάσης 4h',entry:'Στο 4h η τιμή είναι πάνω από τον EMA 50 (για long) ή κάτω (για short).\nΣτο 1h η τιμή επιστρέφει στον EMA 20.\nΕίσοδος όταν σχηματιστεί κερί απόρριψης (μακριά ουρά) πάνω στον EMA 20.',exit:'Stop πίσω από το ακραίο σημείο του pullback.\nΣτόχος 2R ή το προηγούμενο swing high/low, όποιο έρθει πρώτο.',avoid:'Όταν ο EMA 20 και ο EMA 50 είναι επίπεδοι και μπλεγμένοι (δεν υπάρχει τάση).'},
  {name:'Αντιστροφή στα άκρα range',market:'both',tf:'15m ή 1h',entry:'Υπάρχει καθαρό range με τουλάχιστον 2 αγγίγματα πάνω και κάτω.\nΗ τιμή φτάνει στο άκρο και το RSI(14) δείχνει απόκλιση.\nΕίσοδος με κερί αντιστροφής.',exit:'Stop λίγο έξω από το range.\nΠρώτος στόχος η μέση του range, τελικός η απέναντι πλευρά.',avoid:'Όταν το range έχει ήδη σπάσει μία φορά την ίδια μέρα.\nΌταν το εύρος του range είναι μικρότερο από 3 φορές την απόσταση του stop.'}
];
function resetStratForm(){$('#stratForm').reset();$('#s-id').value='';$('#sFormTitle').textContent='Νέα στρατηγική';$('#s-del').hidden=true;armDel($('#s-del'),false);$('#s-err').textContent=''}
function loadStrat(id){var s=S.strategies.find(function(x){return x.id===id});if(!s)return;
  $('#s-id').value=s.id;$('#s-name').value=s.name||'';$('#s-market').value=s.market||'both';$('#s-tf').value=s.tf||'';$('#s-entry').value=s.entry||'';$('#s-exit').value=s.exit||'';$('#s-avoid').value=s.avoid||'';
  $('#sFormTitle').textContent='Επεξεργασία στρατηγικής';$('#s-del').hidden=false;sFormShow(true);$('#stratForm').scrollIntoView({behavior:'smooth',block:'start'})}
function sFormShow(on){$('#stratForm').hidden=!on;$('#stratSplit').classList.toggle('solo',!on);$('#s-new').hidden=!!on}
function saveStrat(ev){
  ev.preventDefault();var err=$('#s-err');err.textContent='';
  var nm=$('#s-name').value.trim();if(!nm){err.textContent='Δώσε όνομα στη στρατηγική.';return}
  var id=$('#s-id').value,prev=id?S.strategies.find(function(x){return x.id===id}):null;
  var s={name:nm.slice(0,80),market:$('#s-market').value,tf:$('#s-tf').value.trim().slice(0,80),entry:$('#s-entry').value.slice(0,3000),exit:$('#s-exit').value.slice(0,3000),avoid:$('#s-avoid').value.slice(0,3000),
    active:true,template:prev?!!prev.template:false,manualId:prev&&prev.manualId?prev.manualId:null,by:prev&&prev.by?prev.by:S.uid,createdAt:prev&&prev.createdAt?prev.createdAt:new Date().toISOString()};
  var b=$('#s-save');b.disabled=true;
  put('strategies',id||newId(),s).then(function(){toast('Η στρατηγική αποθηκεύτηκε');resetStratForm();sFormShow(false)}).catch(function(e){err.textContent=writeErr(e)}).then(function(){b.disabled=false;applyWriteState()});
}
function addTemplates(){
  var b=$('#s-templates');b.disabled=true;
  var chain=Promise.resolve();
  TEMPLATES.forEach(function(t){chain=chain.then(function(){return put('strategies',newId(),Object.assign({},t,{active:true,template:true,by:S.uid,createdAt:new Date().toISOString()}))})});
  chain.then(function(){toast('Προστέθηκαν 3 πρότυπα')}).catch(function(e){toast(writeErr(e))}).then(function(){b.disabled=false});
}

/* ---------- check-in, params, account ---------- */
var ciDirty=false;
function ciId(){return safeSeg(today()+'_'+(S.uid||'me'))}
function fillCheckin(){
  if(ciDirty)return;var c=S.checkins.find(function(x){return x.id===ciId()});
  var mv=c&&c.mood||'',ms=$('#c-mood');ms.value=mv;if(mv&&ms.value!==mv){ms.value='__other';$('#c-mood-txt').value=mv}else $('#c-mood-txt').value='';$('#c-mood-wrap').hidden=ms.value!=='__other';$('#c-plan').value=c&&c.plan||'';$('#c-review').value=c&&c.review||'';
  $('#c-state').textContent=c?'Αποθηκευμένο':'';
}
function saveCheckin(ev){
  ev.preventDefault();var b=$('#c-save');b.disabled=true;
  put('checkins',ciId(),{by:S.uid,date:today(),mood:($('#c-mood').value==='__other'?$('#c-mood-txt').value.trim().slice(0,120):$('#c-mood').value),plan:$('#c-plan').value.slice(0,3000),review:$('#c-review').value.slice(0,3000),updatedAt:new Date().toISOString()})
   .then(function(){ciDirty=false;$('#c-state').textContent='Αποθηκευμένο';toast('Το check-in αποθηκεύτηκε')}).catch(function(e){$('#c-state').textContent=writeErr(e)}).then(function(){b.disabled=false;applyWriteState()});
}
var pDirty=false,aDirty=false;
function fillParams(){if(pDirty)return;var s=S.settings;$('#p-risk').value=s.risk;$('#p-target').value=s.target;$('#p-targetpct').value=+(s.risk*s.target).toFixed(2);$('#p-dayloss').value=s.dayLoss;$('#p-maxtrades').value=s.maxTrades;$('#p-estr').checked=s.estR2===true;$('#p-maxdd').value=s.maxDD}
function explainParams(){
  var s=S.settings,be=1/(1+s.target);
  $('#p-explain').textContent='Με ρίσκο '+fmt(s.risk,1)+'% και στόχο '+fmt(s.target,1)+'R, κάθε χαμένη κοστίζει '+fmt(s.risk,1)+'% του λογαριασμού και κάθε κερδισμένη φέρνει '+fmt(s.risk*s.target,1)+'%. Για να μη χάνετε χρειάζεστε επιτυχία πάνω από '+pct(be)+'. Η χειρότερη μέρα κοστίζει έως '+fmt(s.risk*s.dayLoss,1)+'%.';
  var b=balance();
  $('#a-explain').textContent=isFinite(b)?'Με '+fmt(b,0)+' € και ρίσκο '+fmt(s.risk,1)+'%, ρισκάρεις '+fmt(b*s.risk/100,2)+' € ανά συναλλαγή.':'Δεν έχεις βάλει υπόλοιπο ακόμα.';
}
function fillAccount(){if(aDirty)return;var b=balance();$('#a-balance').value=isFinite(b)?b:''}
function saveParams(ev){
  ev.preventDefault();
  var s={risk:n($('#p-risk').value),target:n($('#p-target').value),dayLoss:n($('#p-dayloss').value),maxTrades:Math.round(n($('#p-maxtrades').value)),estR:$('#p-estr').checked,estR2:$('#p-estr').checked,maxDD:n($('#p-maxdd').value)||10};
  if(!(s.risk>0&&s.risk<=5)||!(s.target>0)||!(s.dayLoss>0)||!(s.maxTrades>=1)){toast('Έλεγξε τις τιμές: ρίσκο έως 5%, όλα μεγαλύτερα του μηδενός.');return}
  if(s.risk>2)toast('Ρίσκο πάνω από 2% ανά συναλλαγή είναι επιθετικό. Αποθηκεύτηκε.');
  s.updatedBy=S.uid;s.updatedAt=new Date().toISOString();
  var b=$('#p-save');b.disabled=true;
  put('settings','main',s).then(function(){pDirty=false;if(s.risk<=2)toast('Οι κανόνες αποθηκεύτηκαν')}).catch(function(e){toast(writeErr(e))}).then(function(){b.disabled=false;applyWriteState()});
}
function saveAccount(ev){
  ev.preventDefault();var v=n($('#a-balance').value);if(!(v>0)){toast('Βάλε υπόλοιπο μεγαλύτερο του μηδενός.');return}
  var b=$('#a-save');b.disabled=true;
  put('accounts',safeSeg(S.uid||'me'),{balance:v,by:S.uid,updatedAt:new Date().toISOString()}).then(function(){aDirty=false;toast('Το υπόλοιπο αποθηκεύτηκε')}).catch(function(e){toast(writeErr(e))}).then(function(){b.disabled=false;applyWriteState()});
}

/* ---------- AI analyst ---------- */
var aiCtl=null;
function runAI(){
  if(!S.sample)return;
  var list=filtered(),st=stats(list),out=$('#aiOut'),btn=$('#aiBtn');
  if(st.n<3){out.textContent='Χρειάζονται τουλάχιστον 3 κλειστές συναλλαγές για ανάλυση.';return}
  var compact=st.c.slice(-40).map(function(t){return {date:t.date,time:t.time,market:t.market,dir:t.dir,strategy:stratName(t.strategyId),tf:t.tf,r:t.r,riskPct:t.riskPct,rulesFollowed:t.rules,emotion:t.emotion,mfeR:t.mfe,overDailyLimit:!!t.overLimit}});
  var data={rules:S.settings,filter:S.filter,overall:{closed:st.n,winRate:st.winRate,avgR:st.avgR,avgWinR:st.avgWin,avgLossR:st.avgLoss,profitFactor:isFinite(st.pf)?st.pf:null,totalR:st.totalR,maxDrawdownR:st.dd,worstLosingStreak:st.worstStreak},
    byStrategy:group(list,function(t){return stratName(t.strategyId)}),byMarket:group(list,function(t){return t.market}),byEmotion:group(list,function(t){return t.emotion||'—'}),
    strategies:S.strategies.map(function(s){return {name:s.name,market:s.market,tf:s.tf,entry:s.entry,exit:s.exit}}),lastTrades:compact};
  var prompt='Είσαι προπονητής απόδοσης για ερασιτέχνες traders. Δύο φίλοι κρατούν ημερολόγιο συναλλαγών σε μετοχές και crypto και παίζουν 1-3 φορές τη μέρα με TradingView. '+
    'Ανάλυσε ΜΟΝΟ τα δεδομένα παρακάτω. Μην προτείνεις συγκεκριμένα assets, τιμές ή σήματα αγοράς/πώλησης και μη δίνεις επενδυτικές συμβουλές. '+
    (window.I18N&&I18N.lang==='ru'?'Γράψε την απάντηση στα ρωσικά (на русском языке), απλά,':'Γράψε στα ελληνικά, απλά,')+'  σε απλό κείμενο χωρίς markdown, έως 220 λέξεις, με αυτή τη σειρά: '+
    '1) Τι δείχνουν τα νούμερα (2-3 προτάσεις, λάβε υπόψη το μέγεθος του δείγματος). '+
    '2) Τα δύο πιο σημαντικά μοτίβα συμπεριφοράς ή στρατηγικής. '+
    '3) Ένα συγκεκριμένο πείραμα για τις επόμενες 20 συναλλαγές (π.χ. αλλαγή στόχου R, κανόνας μετά από απώλειες, εστίαση σε μία στρατηγική), με το ρίσκο να μένει στο '+S.settings.risk+'% ή χαμηλότερα. '+
    'Αν τα δεδομένα δεν αρκούν για κάποιο συμπέρασμα, πες το.\n\nΔΕΔΟΜΕΝΑ (JSON):\n'+JSON.stringify(data);
  if(aiCtl)aiCtl.abort();aiCtl=new AbortController();
  btn.disabled=true;out.textContent='Ο Claude διαβάζει το ημερολόγιο…';
  S.sample(prompt,{onText:function(u){out.textContent=u.text},signal:aiCtl.signal,modelTier:'default',cache:false})
   .then(function(r){out.textContent=r.text})
   .catch(function(e){
     if(e&&e.name==='AbortError')return;
     var c=e&&e.code;
     if(c==='not_granted'){$('#aiCard').hidden=true;return}
     out.textContent=c==='rate_limited'?'Πολλά αιτήματα. Ξαναδοκίμασε σε λίγα λεπτά.':'Η ανάλυση δεν ολοκληρώθηκε. Ξαναδοκίμασε αργότερα.';
   }).then(function(){btn.disabled=false});
}

/* ---------- import from TradingView ---------- */
var IMP={rows:[],fmt:null};
function parseCSV(text){
  text=text.replace(/^﻿/,'');
  var first=(text.split(/\r?\n/)[0]||'');
  var delim=[',',';','\t'].map(function(d){return [d,first.split(d).length]}).sort(function(a,b){return b[1]-a[1]})[0][0];
  var rows=[],row=[],f='',q=false;
  for(var i=0;i<text.length;i++){var c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++}else q=false}else f+=c;continue}
    if(c==='"'){q=true;continue}
    if(c===delim){row.push(f);f='';continue}
    if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(f);f='';if(row.some(function(x){return x.trim()!==''}))rows.push(row);row=[];continue}
    f+=c}
  row.push(f);if(row.some(function(x){return x.trim()!==''}))rows.push(row);
  return rows;
}
function pnum(v){
  if(v==null)return NaN;if(/^\s*[+-]?\d+(\.\d+)?e[+-]?\d+\s*$/i.test(String(v)))return parseFloat(v);var s=String(v).replace(/−/g,'-').replace(/[^\d,.\-+]/g,'');if(!s||s==='-')return NaN;
  var lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}
  else if(lc>-1){var pp=s.split(',');s=(pp.length===2&&pp[1].length!==3)?s.replace(',','.'):s.replace(/,/g,'')}
  var x=parseFloat(s);return isFinite(x)?x:NaN;
}
function pdate(v){
  v=String(v||'').trim();var m=v.match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/),d;
  if(m)d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0));
  else if((m=v.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})[ ,]+(\d{1,2}):(\d{2})/))){var a=+m[1],b=+m[2],day=a>12?a:b,mon=a>12?b:a;d=new Date(+m[3],mon-1,day,+m[4],+m[5])}
  else{var t=Date.parse(v);if(!isFinite(t))return null;d=new Date(t)}
  if(!isFinite(d.getTime()))return null;
  var pad=function(x){return String(x).padStart(2,'0')};
  return {ts:d.getTime(),date:d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),time:pad(d.getHours())+':'+pad(d.getMinutes())};
}
function hkey(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
var EXN={binance:'Binance',bybit:'Bybit',coinbase:'Coinbase',kraken:'Kraken',okx:'OKX',bitget:'Bitget',kucoin:'KuCoin',bitstamp:'Bitstamp',pepperstone:'Pepperstone',oanda:'OANDA',icmarkets:'IC Markets',capitalcom:'Capital.com',fxcm:'FXCM',xetr:'Xetra',nasdaq:'Nasdaq',nyse:'NYSE'};
function acctFromSym(s){s=String(s||'');if(s.indexOf(':')<0)return '';var px=s.split(':')[0].trim(),k=px.toLowerCase().replace(/[^a-z]/g,'');return EXN[k]||px}
function cleanSym(s){s=String(s||'').trim();return s.indexOf(':')>-1?s.split(':').pop():s}
function guessMarket(raw){var forced=$('#imp-market').value;if(forced!=='auto')return forced;
  return /USDT|USDC|BUSD|PERP|^BINANCE|^BYBIT|^COINBASE|^KRAKEN|^OKX|^BITGET|^BITSTAMP|^KUCOIN|BTC|ETH|SOL|XRP|DOGE|ADA/i.test(String(raw))?'crypto':'stock'}
function hidx(h){return function(){for(var a=0;a<arguments.length;a++){var t=arguments[a];for(var i=0;i<h.length;i++){if(typeof t==='string'?h[i]===t:t.test(h[i]))return i}}return -1}}
function parseTester(rows,idx){
  var tn=idx('trade #','trade #:','trade'),ty=idx('type'),dt=idx('date/time','date and time',/date/),pr=idx(/^price/),
      qt=idx('contracts',/position size \(qty\)/,/^qty/,/quantity/,/^size/),pl=idx(/^net p&l(?!.*%)/,/^profit(?!.*%)/,/p&l(?!.*%)/),sg=idx('signal');
  if(tn<0||ty<0||pr<0||dt<0)return null;
  var g={};rows.slice(1).forEach(function(r){var k=(r[tn]||'').trim();if(!k)return;(g[k]=g[k]||[]).push(r)});
  var sym=($('#imp-sym').value||'').trim().toUpperCase()||'BACKTEST',out=[];
  Object.keys(g).forEach(function(k){
    var en=g[k].find(function(r){return /entry/i.test(r[ty])}),ex=g[k].find(function(r){return /exit/i.test(r[ty])});
    if(!en||!ex)return;if(sg>=0&&/open/i.test(ex[sg]||''))return;
    var a=pdate(en[dt]),b=pdate(ex[dt]),e=pnum(en[pr]),x=pnum(ex[pr]),q=qt>=0?Math.abs(pnum(en[qt])):NaN;
    if(!a||!isFinite(e)||!isFinite(x))return;
    var dir=/short/i.test(en[ty])?'short':'long',pnl=pl>=0?pnum(ex[pl]):NaN;
    out.push({symbol:sym,market:guessMarket(sym),dir:dir,date:a.date,time:a.time,ts:a.ts,entry:e,exit:x,qty:isFinite(q)?q:null,fees:0,pnl:pnl,stop:null,src:'backtest',key:hkey('bt|'+sym+'|'+k+'|'+a.ts+'|'+e)});
  });
  return out;
}
function parsePositions(rows,idx){
  var sy=idx('symbol','инструмент','instrument','символ','σύμβολο'),sd=idx('side','направление','direction','сторона','κατεύθυνση','πλευρά'),qt=idx('qty','количество','quantity','кол-во','ποσότητα'),
      ap=idx('avg fill price','сред. цена исполнения','average fill price','avg. fill price'),tpi=idx('take profit','тейк-профит'),sli=idx('stop loss','стоп-лосс'),
      up=idx(/^unrealized p&l(?!.*%)(?!.*\(currency\))/,/^нереализованная пр\/уб \(значение\)/,/^unrealized/,/^нереализованная/),lv=idx('leverage','кредитное плечо');
  if(sy<0||sd<0||ap<0)return null;var now=new Date(),dt=pdate(now.getFullYear()+'-'+pad2(now.getMonth()+1)+'-'+pad2(now.getDate())+' '+pad2(now.getHours())+':'+pad2(now.getMinutes())),out=[];
  rows.slice(1).forEach(function(r){var dir=/buy|long|покуп|лонг|αγορ/i.test(r[sd]||'')?'long':/sell|short|прода|шорт|πώλ/i.test(r[sd]||'')?'short':null;if(!dir)return;
    var e=pnum(r[ap]),q=qt>=0?Math.abs(pnum(r[qt])):NaN,tp=tpi>=0?pnum(r[tpi]):NaN,sl=sli>=0?pnum(r[sli]):NaN,pl=up>=0?pnum(r[up]):NaN,lev=lv>=0?pnum(r[lv]):NaN;if(!isFinite(e)||!(e>0))return;
    if(isFinite(sl)&&(sl-e)*(dir==='long'?1:-1)>=0)sl=NaN;if(isFinite(tp)&&(tp-e)*(dir==='long'?1:-1)<=0)tp=NaN;
    var sym=cleanSym(r[sy]);out.push({acct:acctFromSym(r[sy]),symbol:sym,market:guessMarket(r[sy]),dir:dir,date:dt.date,time:dt.time,ts:dt.ts,entry:+e.toPrecision(10),exit:null,qty:isFinite(q)?+q.toPrecision(10):null,fees:0,pnl:pl,stop:isFinite(sl)?sl:null,target:isFinite(tp)?tp:null,lev:isFinite(lev)&&lev>0?lev:null,open:true,src:'positions',key:hkey('pos|'+sym.toUpperCase()+'|'+dir+'|'+(+e.toPrecision(8)))})});
  return out}
function impMatchOpen(r,anyStatus){var sym=String(r.symbol||'').toUpperCase();return S.trades.find(function(t){return t.source==='tradingview'&&(anyStatus||t.status!=='closed')&&String(t.symbol||'').toUpperCase()===sym&&t.dir===r.dir&&isFinite(n(t.entry))&&Math.abs(n(t.entry)-r.entry)/r.entry<0.002&&(anyStatus?true:!t.exit)})||null}
function parseOrders(rows,idx){
  var sy=idx('symbol','ticker','instrument','contract','contracts','pair','spot pairs','market','trading pair','символ','инструмент','тикер','σύμβολο'),sd=idx('side','direction','buy/sell','сторона','направление','πλευρά','κατεύθυνση'),tp=idx('type','order type','тип','тип ордера','тип заявки','τύπος'),
      qt=idx('qty','quantity','filled qty','filled quantity','executed','exec qty','filled','executed qty','size','amount','кол-во','количество','исполнено','объём','объем','ποσότητα'),fp=idx('fill price','avg fill price','avg. fill price','average fill price','avg price','avg. price','execution price','exec price','filled price','цена исполнения','сред. цена исполнения','средняя цена исполнения','τιμή εκτέλεσης','price','цена','τιμή'),
      spx=idx('stop price','stop','стоп-цена','стоп цена','стоп','τιμή stop'),st=idx('status','статус','κατάσταση'),tf=idx('closing time','fill time','filled time','execution time','exec time','trade time','transaction time','время закрытия','время исполнения','χρόνος κλεισίματος',/^timestamp/,/^date\(utc/,/^time\(utc/,'time','date','updated time','date(utc)','время','дата','χρόνος','ώρα'),
      tpl=idx('placing time','placed time','creation time','created','create time','время размещения','время создания','χρόνος τοποθέτησης'),cm=idx('commission','fee','fees','комиссия','προμήθεια');
  if(sy<0||sd<0||fp<0||qt<0)return null;
  var fills=[],stops=[];
  rows.slice(1).forEach(function(r){
    var side=/buy|long|покуп|лонг|αγορ/i.test(r[sd])?1:(/sell|short|прода|шорт|πώλ/i.test(r[sd])?-1:0);if(!side)return;
    var placed=pdate(tpl>=0?r[tpl]:r[tf]);
    if(tp>=0&&/stop|стоп/i.test(r[tp]||'')&&spx>=0&&isFinite(pnum(r[spx]))&&placed)stops.push({sym:r[sy],side:side,price:pnum(r[spx]),ts:placed.ts});
    if(st>=0&&!/fill|execut|исполн|заполн|εκτελ/i.test(r[st]||''))return;
    var px=pnum(r[fp]),q=Math.abs(pnum(r[qt])),t=pdate(tf>=0?r[tf]:(tpl>=0?r[tpl]:''));
    if(!isFinite(px)||!isFinite(q)||!q||!t)return;
    fills.push({sym:r[sy],side:side,px:px,q:q,t:t,fee:cm>=0&&isFinite(pnum(r[cm]))?Math.abs(pnum(r[cm])):0});
  });
  /* TradingView exports newest first: when two fills share a timestamp, the row lower in the file happened first */
  var dn=0,up=0;for(var fi=1;fi<fills.length;fi++){if(fills[fi].t.ts<fills[fi-1].t.ts)dn++;else if(fills[fi].t.ts>fills[fi-1].t.ts)up++}
  fills.forEach(function(f,k){f.k=dn>up?-k:k});fills.sort(function(a,b){return (a.t.ts-b.t.ts)||(a.k-b.k)});
  var pos={},out=[];
  fills.forEach(function(f){
    var P=pos[f.sym];
    if(!P||P.qty<=1e-12){P=pos[f.sym]={dir:f.side,qty:0,inQ:0,inV:0,outQ:0,outV:0,fees:0,start:f.t}}
    P.fees+=f.fee;
    if(f.side===P.dir){P.qty+=f.q;P.inQ+=f.q;P.inV+=f.q*f.px;return}
    var close=Math.min(f.q,P.qty);P.qty-=close;P.outQ+=close;P.outV+=close*f.px;
    if(P.qty<=1e-12){
      var e=P.inV/P.inQ,x=P.outV/P.outQ,dir=P.dir>0?'long':'short',q=P.inQ;
      var stop=null;stops.forEach(function(s){if(stop!=null||s.sym!==f.sym||s.side!==-P.dir)return;if(s.ts<P.start.ts-60000||s.ts>f.t.ts)return;if(dir==='long'?s.price<e:s.price>e)stop=s.price});
      out.push({acct:acctFromSym(f.sym),symbol:cleanSym(f.sym),market:guessMarket(f.sym),dir:dir,date:P.start.date,time:P.start.time,ts:P.start.ts,entry:+e.toPrecision(10),exit:+x.toPrecision(10),qty:+q.toPrecision(10),fees:+P.fees.toFixed(2),
        pnl:+((x-e)*q*(dir==='long'?1:-1)-P.fees).toFixed(2),stop:stop,src:'orders',key:hkey('or|'+f.sym+'|'+P.start.ts+'|'+f.t.ts+'|'+q+'|'+e)});
      var rest=f.q-close;
      if(rest>1e-12)pos[f.sym]={dir:f.side,qty:rest,inQ:rest,inV:rest*f.px,outQ:0,outV:0,fees:0,start:f.t};else delete pos[f.sym];
    }
  });
  return out;
}
function impMsg(t,err){var m=$('#imp-msg');m.textContent=t;m.classList.toggle('err',!!err)}
function impRender(){
  var rows=IMP.rows,el=$('#imp-preview'),go=$('#imp-go');
  if(!rows.length){el.innerHTML='';go.disabled=true;go.textContent='Εισαγωγή';return}
  var ids={};S.trades.forEach(function(t){ids[t.id]=1});rows.forEach(function(r){r.exists=!!ids['tv'+r.key];r.merge=!r.exists&&!r.open?impMatchOpen(r):null;if(r.open&&!r.exists){var o=impMatchOpen(r,true);if(o)r.exists=true}});
  var fresh=rows.filter(function(r){return !r.exists}),withStop=rows.filter(function(r){return r.stop!=null}).length;
  var mg=rows.filter(function(r){return r.merge}).length;impMsg((IMP.fmt==='tester'?'Μορφή: Strategy Tester (List of Trades). ':IMP.fmt==='positions'?'Μορφή: ανοιχτές θέσεις (Paper Trading → Θέσεις). Μπαίνουν ως ανοιχτές συναλλαγές με το stop και τον στόχο τους. Όταν κλείσουν, κάνε εισαγωγή το «Ιστορικό» και θα κλείσουν αυτόματα εδώ. ':'Μορφή: ιστορικό εντολών ή συναλλαγών. ')+(mg?mg+' κλείνουν ανοιχτές θέσεις που υπάρχουν ήδη. ':'')+'Βρέθηκαν '+rows.length+' συναλλαγές. '+(rows.length-fresh.length)+' υπάρχουν ήδη στο ημερολόγιο και θα παραλειφθούν. '+withStop+' έχουν stop από εντολή του TradingView.');
  el.innerHTML='<table><thead><tr><th>Ημ/νία</th><th>Σύμβολο</th><th>Θέση</th><th class="r">Είσοδος</th><th class="r">Έξοδος</th><th class="r">Ποσότητα</th><th class="r">Stop</th><th class="r">€</th></tr></thead><tbody>'+
    rows.slice(0,60).map(function(r){return '<tr'+(r.exists?' class="dup"':'')+'><td>'+dateGr(r.date)+' '+esc(r.time)+'</td><td><b>'+esc(r.symbol)+'</b>'+((($('#imp-acct').value||'').trim()||r.acct)?'<br><span class="acct">'+esc(($('#imp-acct').value||'').trim()||r.acct)+'</span>':'')+'</td><td><span class="pill '+(r.dir==='short'?'loss':'gain')+'">'+(r.dir==='short'?'Short':'Long')+'</span></td><td class="r num">'+esc(r.entry)+'</td><td class="r num">'+(r.open?'<span class="pill">ανοιχτή</span>':esc(r.exit)+(r.merge?' <span class="pill acc">κλείνει ανοιχτή</span>':''))+'</td><td class="r num">'+esc(r.qty==null?'–':r.qty)+'</td><td class="r num">'+esc(r.stop==null?'–':r.stop)+'</td><td class="r num '+cls(r.pnl)+'">'+fE(r.pnl)+(r.open?'<br><span class="muted" style="font-size:.75rem">μη ρευστοποιημένο</span>':'')+'</td></tr>'}).join('')+'</tbody></table>';
  go.disabled=!fresh.length||!S.canWrite;go.textContent='Εισαγωγή '+fresh.length+' συναλλαγών';
}
function impLoad(){
  var f=$('#imp-file').files[0];IMP.rows=[];IMP.fmt=null;impRender();if(!f)return;
  var rd=new FileReader();
  rd.onerror=function(){impMsg('Δεν μπορώ να διαβάσω το αρχείο.',true)};
  rd.onload=function(){
    var rows=parseCSV(String(rd.result||''));if(rows.length<2){impMsg('Το αρχείο είναι άδειο ή δεν είναι CSV.',true);return}
    var h=rows[0].map(function(x){return x.trim().toLowerCase()}),idx=hidx(h),out=null;
    var isTester=idx('trade #','trade')>=0&&idx('type')>=0&&idx(/^price/)>=0;
    $('#imp-sym-wrap').hidden=!isTester;
    var isPos=!isTester&&idx('avg fill price','сред. цена исполнения','average fill price','avg. fill price')>=0&&idx('take profit','тейк-профит','stop loss','стоп-лосс',/^unrealized/,/^нереализованная/)>=0&&idx('status','статус')<0;
    if(isPos){IMP.fmt='positions';out=parsePositions(rows,idx)}
    else if(isTester){IMP.fmt='tester';out=parseTester(rows,idx)}
    else{IMP.fmt='orders';out=parseOrders(rows,idx)}
    if(out==null){impMsg('Δεν αναγνώρισα τη μορφή του αρχείου. Στείλτε το αρχείο στον Claude για να προστεθεί αυτή η μορφή. Στήλες: '+rows[0].join(', '),true);return}
    if(!out.length){impMsg(IMP.fmt==='positions'?'Το αρχείο δεν έχει ανοιχτές θέσεις.':'Το αρχείο δεν έχει κλειστές συναλλαγές.',true);return}
    out.sort(function(a,b){return b.ts-a.ts});IMP.rows=out;impRender();
  };
  rd.readAsText(f);
}
function impDoc(r){
  var strat=$('#imp-strategy').value||'',bal=balance();
  var d={by:S.uid,date:r.date,time:r.time,market:r.market,symbol:String(r.symbol).toUpperCase().slice(0,30),dir:r.dir,strategyId:strat,tf:'',entry:r.entry,stop:r.stop,target:null,size:r.qty,
    account:(($('#imp-acct').value||'').trim()||r.acct||'').slice(0,40),exit:r.exit,fees:r.fees||0,mfe:null,rules:null,emotion:'',chart:'',notes:r.src==='backtest'?'Εισαγωγή από TradingView (backtest)':'Εισαγωγή από TradingView',
    createdAt:new Date().toISOString(),status:'closed',source:'tradingview',overLimit:false,r:null,riskEur:null,riskPct:null,pnl:isFinite(r.pnl)?r.pnl:null};
  if(r.target!=null)d.target=r.target;if(r.lev)d.lev=r.lev;if(r.open){d.status='open';d.exit=null;d.pnl=null;d.notes='Ανοιχτή θέση από TradingView (Paper Trading)'}
  var sm=($('#imp-stopm')||{}).value||'none',sv=n(($('#imp-stopv')||{}).value);
  if((r.stop==null||r.entry===r.stop)&&sm==='pct'&&sv>0&&isFinite(n(r.entry))){r.stop=d.stop=+(n(r.entry)*(1+(d.dir==='short'?1:-1)*sv/100)).toPrecision(10)}
  if((r.stop==null||r.entry===r.stop)&&sm==='risk'&&sv>0){d.riskEur=sv;if(r.qty&&isFinite(n(r.entry))){r.stop=d.stop=+(n(r.entry)+(d.dir==='short'?1:-1)*sv/r.qty).toPrecision(10)}else if(isFinite(d.pnl)){d.r=+(d.pnl/sv).toFixed(3)}}
  if(d.stop==null&&d.r==null)d.noStop=true;
  if(r.stop!=null&&r.entry!==r.stop){
    var rr=calcR(d);if(isFinite(rr)){d.r=+rr.toFixed(3);if(r.qty){d.riskEur=+(r.qty*Math.abs(r.entry-r.stop)).toFixed(2);if(isFinite(bal)&&bal>0)d.riskPct=+(d.riskEur/bal*100).toFixed(3)}}
  }
  return d;
}
function impGo(){
  var list=IMP.rows.filter(function(r){return !r.exists}),btn=$('#imp-go'),i=0,ok=0;if(!list.length)return;
  btn.disabled=true;
  (function next(){
    if(i>=list.length){impMsg('Εισήχθησαν '+ok+' συναλλαγές.'+(($('#imp-stopm')||{}).value==='none'?' Όσες δεν έχουν stop σημειώθηκαν «χωρίς stop» και μένουν έξω από τα στατιστικά R (μετράνε μόνο στο PnL).':''));toast('Εισήχθησαν '+ok+' συναλλαγές');IMP.rows=[];$('#imp-file').value='';impRender();return}
    var r=list[i++];impMsg('Εισαγωγή '+i+'/'+list.length+'…');
    var dd=impDoc(r),tid='tv'+r.key;if(r.merge){var m=r.merge;tid=m.id;dd=Object.assign(cleanDoc(m),{exit:r.exit,pnl:isFinite(r.pnl)?r.pnl:null,fees:r.fees||0,status:'closed'});if(r.qty&&!dd.size)dd.size=r.qty;var rr0=calcR(dd);dd.r=isFinite(rr0)?+rr0.toFixed(3):null}
    put('trades',tid,dd).then(function(){ok++;next()}).catch(function(e){impMsg('Η εισαγωγή σταμάτησε: '+writeErr(e),true);btn.disabled=false});
  })();
}
function impStrategies(){var s=$('#imp-strategy');if(!s)return;var v=s.value;s.innerHTML='<option value="">Χωρίς στρατηγική</option>'+S.strategies.filter(function(x){return x.active!==false}).map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>'}).join('');s.value=v}

/* ---------- tabs & events ---------- */
var TABS=['today','trades','strategies','stats','markets','train','demo','history','manual','params'];
function showTab(t,keepHash){
  var jump=null;if(t==='strategies'){t='stats';jump='anSA'}/* οι στρατηγικές είναι πλέον μέσα στις Αναλύσεις */
  if(TABS.indexOf(t)<0)t='today';
  $$('.tabs button').forEach(function(b){b.setAttribute('aria-selected',b.dataset.tab===t?'true':'false')});
  $$('section[data-panel]').forEach(function(s){s.hidden=s.dataset.panel!==t});
  $('#filters').hidden=!(t==='trades'||t==='stats');
  if(!keepHash){try{history.replaceState(null,'','#'+t)}catch(e){}}
  store('tj-tab',t);
  if(t==='history')setTimeout(function(){try{hiInit()}catch(e){console.error(e)}},0);
  if(t==='demo')setTimeout(function(){try{dmLiveTick()}catch(e){}},300);
  if(t==='markets'&&typeof renderMarkets==='function'){if(!keepHash||!MK.v0){MK.v='grid';MK.v0=1}setTimeout(renderMarkets,0)}/* πρώτη εικόνα: όλα τα διαγράμματα μαζί */
  if(t==='train'&&typeof trnShow==='function')setTimeout(function(){trnShow(TRN.tab)},0);
  else if(typeof ccStop==='function')ccStop();
  if(t==='stats')setTimeout(function(){try{saInit();saRender();saMaybeRun()}catch(e){console.error(e)}},50);
  if(jump)setTimeout(function(){var a=$('#'+jump);if(a)a.scrollIntoView({block:'start'})},120);else if(!keepHash)window.scrollTo(0,0);
}
function applyWriteState(){
  $$('#t-save,#s-save,#c-save,#p-save,#a-save,#s-templates,#t-del,#s-del').forEach(function(b){if(!S.canWrite)b.disabled=true});
  if(!S.canWrite)notice('Μπορείς να δεις το ημερολόγιο αλλά όχι να γράψεις. Ζήτα από τον ιδιοκτήτη να σου δώσει πρόσβαση Contributor ή Editor από το Share.');
}
function bind(){
  $$('.tabs button').forEach(function(b){b.addEventListener('click',function(){showTab(b.dataset.tab)})});
  $('#goNewTrade').addEventListener('click',function(){resetTradeForm();showTab('trades');$('#t-symbol').focus()});
  ['who','market','strategy','period','acct','tag'].forEach(function(k){$('#f-'+k).addEventListener('change',function(e){S.filter[k]=e.target.value;store('tj-filter',S.filter);renderTrades();renderStats()})});
  $('#tradeForm').addEventListener('submit',saveTrade);
  $('#t-strategy').addEventListener('change',function(){RCHK_LOADED=null;renderRuleChecks()});
  bindShots();bindTpl();
  $('#profBig').outerHTML=profSvg();$('#profMini').outerHTML=profSvg('mini');bindProf();
  if(!PROF_PHOTO)setTimeout(function(){try{var host=document.createElement('span');host.className='p3d-host';var sv=$('#profBtn .prof-svg');if(P3D.start(host)){sv.replaceWith(host);host.classList.add('prof-svg');var mm=$('.prof-head .prof-svg');var c=document.createElement('canvas');c.width=116;c.height=128;c.className='prof-svg mini p3d-mini';mm.replaceWith(c)}}catch(e){}},50);bindChat();
  $('#tradeForm').addEventListener('input',updateCalc);$('#tradeForm').addEventListener('change',updateCalc);
  $('#t-clear').addEventListener('click',resetTradeForm);
  $('#t-autotarget').addEventListener('click',function(){var p=plan();if(!p.ok){$('#t-err').textContent='Βάλε πρώτα είσοδο και stop.';return}
    var tg=p.dir==='short'?p.e-S.settings.target*(p.s-p.e):p.e+S.settings.target*(p.e-p.s);var dec=Math.max(2,(String(p.e).split('.')[1]||'').length);$('#t-target').value=+tg.toFixed(Math.min(dec,8));$('#t-err').textContent='';updateCalc()});
  $('#t-del').addEventListener('click',function(){var b=this;if(!b.dataset.armed){armDel(b,true);return}var id=$('#t-id').value;if(!id)return;b.disabled=true;remove('trades',id).then(function(){toast('Η συναλλαγή διαγράφηκε');resetTradeForm()}).catch(function(e){toast(writeErr(e))}).then(function(){b.disabled=false})});
  var tb=$('#tradeTable tbody');
  tb.addEventListener('change',function(e){var c=e.target.closest('[data-sel]');if(!c)return;var id=c.getAttribute('data-sel');if(c.checked)SEL[id]=1;else delete SEL[id];bulkUI(filtered())});
  $('#tradePager').addEventListener('click',function(e){var b=e.target.closest('[data-pg]');if(!b||b.disabled)return;TP.page=+b.getAttribute('data-pg');renderTrades();var c=$('#tradeTable');if(c){var r=c.getBoundingClientRect();if(r.top<0||r.top>window.innerHeight*0.6)c.closest('.card').scrollIntoView({block:'start',behavior:'smooth'})}});
  $('#tradePager').addEventListener('change',function(e){if(e.target.id!=='tpSize')return;TP.size=+e.target.value;store('tj-tpsize',TP.size);TP.page=0;renderTrades()});
  $('#selAll').addEventListener('change',function(e){var own=filtered().filter(function(t){return !t.by||t.by===S.uid});own.forEach(function(t){if(e.target.checked)SEL[t.id]=1;else delete SEL[t.id]});renderTrades()});
  $('#bulkNone').addEventListener('click',function(){SEL={};renderTrades()});
  $('#bulkDel').addEventListener('click',bulkDelete);
  tb.addEventListener('click',function(e){if(e.target.closest('.ck'))return;var tr=e.target.closest('tr[data-id]');if(tr){loadTrade(tr.getAttribute('data-id'));$('#tradeForm').scrollIntoView({behavior:'smooth',block:'start'})}});
  tb.addEventListener('keydown',function(e){if(e.key==='Enter'){var tr=e.target.closest('tr[data-id]');if(tr){loadTrade(tr.getAttribute('data-id'));$('#t-entry').focus()}}});
  $('#openList').addEventListener('click',function(e){var b=e.target.closest('[data-close]');if(!b)return;var id=b.getAttribute('data-close'),t=S.trades.find(function(x){return x.id===id});showTab('trades');loadTrade(id);$('#t-exit').focus();
    if(t&&t.symbol&&(t.market==='crypto'||/USDT|USDC|USD$/i.test(t.symbol))){var ex=$('#t-exit');ex.placeholder='φέρνω τιμή αγοράς…';mktPrice(t.symbol).then(function(q){if(!ex.value){ex.value=+(+q.px).toPrecision(8);ex.dispatchEvent(new Event('input',{bubbles:true}));toast('Έβαλα την τιμή αγοράς τώρα ('+dmPx(q.px)+', '+q.src+'). Άλλαξέ την αν έκλεισες σε άλλη τιμή.')}}).catch(function(){}).then(function(){ex.placeholder='Κενό = ανοιχτή'})}});
  $('#stratForm').addEventListener('submit',saveStrat);$('#s-clear').addEventListener('click',function(){resetStratForm();sFormShow(false)});$('#s-new').addEventListener('click',function(){resetStratForm();sFormShow(true);$('#s-name').focus()});
  $('#s-templates').addEventListener('click',addTemplates);
  $('#stratList').addEventListener('click',function(e){var f=e.target.closest('[data-sfav]');if(f){e.preventDefault();var m=sFavs(),id=f.getAttribute('data-sfav'),on=!m[id];if(on)m[id]=1;else delete m[id];sFavSave(m);var so=S.strategies.find(function(x){return x.id===id}),mid=manualIdFor(so);if(mid&&window.Manual&&Manual.setFav)Manual.setFav(mid,on);renderStrategies();return}var b=e.target.closest('[data-sedit]');if(b)loadStrat(b.getAttribute('data-sedit'))});
  $('#s-del').addEventListener('click',function(){var b=this;if(!b.dataset.armed){armDel(b,true);return}var id=$('#s-id').value;if(!id)return;b.disabled=true;remove('strategies',id).then(function(){toast('Η στρατηγική διαγράφηκε. Οι συναλλαγές της μένουν.');resetStratForm()}).catch(function(e){toast(writeErr(e))}).then(function(){b.disabled=false})});
  $('#checkinForm').addEventListener('submit',saveCheckin);
  $('#c-mood').addEventListener('change',function(){var o=this.value==='__other';$('#c-mood-wrap').hidden=!o;if(o)$('#c-mood-txt').focus()});$('#checkinForm').addEventListener('input',function(){ciDirty=true;$('#c-state').textContent='Μη αποθηκευμένες αλλαγές'});
  $('#paramForm').addEventListener('submit',saveParams);$('#paramForm').addEventListener('input',function(ev){pDirty=true;var r=n($('#p-risk').value),t=n($('#p-target').value),tp=n($('#p-targetpct').value);
    if(ev.target.id==='p-targetpct'){if(r>0&&tp>0)$('#p-target').value=+(tp/r).toFixed(2)}
    else if(ev.target.id==='p-target'||ev.target.id==='p-risk'){if(r>0&&t>0)$('#p-targetpct').value=+(r*t).toFixed(2)}});
  $('#accForm').addEventListener('submit',saveAccount);$('#accForm').addEventListener('input',function(){aDirty=true});
  $('#aiBtn').addEventListener('click',runAI);
  $('#imp-file').addEventListener('change',impLoad);$('#imp-stopm').addEventListener('change',function(){var m=this.value;$('#imp-stopv-w').hidden=m==='none';$('#imp-stopv-l').textContent=m==='pct'?'Stop % από την είσοδο':'Ρίσκο € ανά συναλλαγή';$('#imp-stopv').placeholder=m==='pct'?'π.χ. 1,5':'π.χ. 20'});$('#imp-go').addEventListener('click',impGo);
  $('#imp-reset').addEventListener('click',function(){$('#imp-file').value='';IMP.rows=[];impMsg('');$('#imp-sym-wrap').hidden=true;impRender()});
  $('#imp-market').addEventListener('change',function(){if($('#imp-file').files[0])impLoad()});$('#imp-sym').addEventListener('change',function(){if($('#imp-file').files[0])impLoad()});$('#imp-acct').addEventListener('change',impRender);
  $$('.advtabs button').forEach(function(b){b.addEventListener('click',function(){advTab(b.getAttribute('data-adv'))})});
  ['evo-who','evo-strat','evo-mkt','evo-acct','evo-gran','evo-from','evo-to','evo-h1','evo-h2','evo-days','evo-a1','evo-a2','evo-b1','evo-b2','mkt-who','mkt-strat','mkt-acct','mkt-win'].forEach(function(id){$('#'+id).addEventListener('change',renderAdv)});
  $('#px-file').addEventListener('change',loadPx);$('#px-sym').addEventListener('change',renderAdv);
  $('#px-sym').addEventListener('input',fpRefresh);$('#fp-src').addEventListener('change',fpRefresh);$('#fp-tf').addEventListener('change',fpRefresh);fpRefresh();
  $('#fp-open').addEventListener('click',function(e){if(!fpUrl()){e.preventDefault();$('#px-info').textContent='Γράψε πρώτα το σύμβολο (π.χ. BTCUSDT).';$('#px-sym').focus()}});
  $('#fp-load').addEventListener('click',fpLoad);$('#fp-older').addEventListener('click',fpOlder);
  $('#bt-strat').addEventListener('change',function(){renderBtInfo();if(ADV.px)doBt()});$('#bt-run').addEventListener('click',doBt);
  $('#now-run').addEventListener('click',doNow);
  $('#mc-run').addEventListener('click',doMc);
  $('#evo-preset').addEventListener('change',function(){evoPreset();renderAdv()});['evo-a1','evo-a2','evo-b1','evo-b2'].forEach(function(id){$('#'+id).addEventListener('input',function(){$('#evo-preset').value='custom'})});
  $('#evo-reset').addEventListener('click',function(){['evo-from','evo-to','evo-h1','evo-h2'].forEach(function(id){$('#'+id).value=''});$('#evo-days').value='all';renderAdv()});
  $$('#goalTabs button').forEach(function(b){b.addEventListener('click',function(){GTAB=b.getAttribute('data-g');renderGoals()})});
  $('#goalForm').addEventListener('submit',saveGoals);$('#goalForm').addEventListener('input',function(){GDIRTY=true});
  document.addEventListener('click',function(e){if(e.target.closest('[data-goparams]'))showTab('params');var c=e.target.closest('[data-cal]');if(c){CAL.user=true;CAL.m+=+c.getAttribute('data-cal');if(CAL.m<0){CAL.m=11;CAL.y--}if(CAL.m>11){CAL.m=0;CAL.y++}CALSEL=null;renderCal();return}var d=e.target.closest('[data-day]');if(d){var v=d.getAttribute('data-day');CALSEL=CALSEL===v?null:v;renderCal();return}var o=e.target.closest('[data-open]');if(o&&!o.closest('#manual')){showTab('trades');loadTrade(o.getAttribute('data-open'));$('#tradeForm').scrollIntoView({behavior:'smooth',block:'start'})}});
  $('#exCsv').addEventListener('click',exportCsv);$('#exRep').addEventListener('click',exportReport);$('#now-ai').addEventListener('click',nowAI);['now-strat','now-dir'].forEach(function(id){$('#'+id).addEventListener('change',function(){if(ADV.px)doNow()})});
  document.addEventListener('click',function(e){var r=e.target.closest('[data-ref],[data-manual]');if(!r)return;openManual(r.getAttribute('data-ref')||r.getAttribute('data-manual'))});
}
/* ---------- link to the manual ---------- */
var TPL={'Breakout με όγκο':'s-breakout','Pullback στον EMA 20':'s-pullback','Αντιστροφή στα άκρα range':'s-range'};
function manualIdFor(s){if(!s)return null;if(s.manualId)return s.manualId;if(TPL[s.name])return TPL[s.name];return window.Manual?Manual.idByName(s.name):null}
function profBackGo(){var pb=$('#profBack');if(pb)pb.hidden=true;if(QZ.back){QZ.tab=QZ.back;QZ.back=null;profOpen(true)}}
function openManual(id){if(!window.Manual)return;showTab('manual',true);Manual.open(id);try{history.replaceState(null,'','#'+id)}catch(e){}}
function syncManual(){if(!window.Manual)return;var ids={};S.strategies.forEach(function(s){var m=manualIdFor(s);if(m)ids[m]=1});Manual.syncAdopted(ids)}
var lastPB=null;
function updatePlaybook(force){
  var sel=$('#t-strategy');if(!sel)return;var id=sel.value,el=$('#t-playbook');
  if(!force&&id===lastPB)return;lastPB=id;
  var s=S.strategies.find(function(x){return x.id===id});if(!s){el.hidden=true;return}
  var mid=manualIdFor(s),h='';
  [['Είσοδος',s.entry],['Stop και έξοδος',s.exit],['Πότε δεν την παίζω',s.avoid]].forEach(function(b){if(b[1])h+='<div><span class="lbl">'+b[0]+'</span><p>'+esc(b[1])+'</p></div>'});
  if(mid)h+='<div><button class="btn small" type="button" data-ref="'+esc(mid)+'">Πλήρης κάρτα στον Μπούσουλα</button></div>';
  $('#t-pb').innerHTML=h||'<p class="muted">Αυτή η στρατηγική δεν έχει γραμμένους κανόνες ακόμα.</p>';el.hidden=false;
}
function buildPre(){
  var e=window.Manual&&Manual.entry('p-checklist'),items=e?e.b[0][1]:[];
  $('#preList').innerHTML=items.map(function(t,i){return '<li><label><input type="checkbox" id="pre-'+i+'"> <span>'+esc(t)+'</span></label></li>'}).join('');
  var upd=function(){var n=$$('#preList input:checked').length;$('#preCount').textContent=n+' / '+items.length+(n===items.length&&n>0?' · έτοιμος':'')};
  $('#preList').addEventListener('change',upd);
  $('#preReset').addEventListener('click',function(){$$('#preList input').forEach(function(x){x.checked=false});upd()});upd();
}
window.Journal={adopt:function(e){
  if(!e||!e.r)return;
  var ex=S.strategies.find(function(s){return manualIdFor(s)===e.id});
  if(ex){toast('Η «'+e.t+'» υπάρχει ήδη στις στρατηγικές σας.');return}
  if(!S.canWrite){toast('Δεν έχεις δικαίωμα αποθήκευσης. Ζήτα πρόσβαση Contributor ή Editor.');return}
  var R=e.r,j=function(h,a){return a&&a.length?h+':\n'+a.map(function(x){return '- '+x}).join('\n'):''};
  var data={name:e.t.slice(0,80),market:e.m==='both'?'both':e.m,tf:((window.Manual?Manual.hzText(e):'')+(e.tags?' · '+e.tags:'')).slice(0,80),
    entry:[j('Φίλτρα',R.f),j('Είσοδος',R.in)].filter(Boolean).join('\n\n').slice(0,3000),
    exit:[j('Stop',R.stop),j('Έξοδος',R.out)].filter(Boolean).join('\n\n').slice(0,3000),
    avoid:(R.no||[]).map(function(x){return '- '+x}).join('\n').slice(0,3000),
    active:true,template:false,manualId:e.id,by:S.uid,createdAt:new Date().toISOString()};
  put('strategies',newId(),data).then(function(){toast('Η «'+e.t+'» προστέθηκε στις στρατηγικές σας.')}).catch(function(err){toast(writeErr(err))});
}};

/* ---------- boot ---------- */
function boot(){
  var f=store('tj-filter');if(f&&typeof f==='object')S.filter=Object.assign(S.filter,f);
  bind();bindGrp();bindConfirms();bindDemo();bindExLinks();bindMarkets();resetTradeForm();resetStratForm();fillParams();fillGoalForm();
  advTab(store('tj-adv')||'evo');
  buildPre();
  var h=(location.hash||'').replace('#','');
  if(TABS.indexOf(h)>=0)showTab(h,true);else if(h&&window.Manual&&Manual.known(h)){showTab('manual',true);Manual.open(h)}else showTab(store('tj-tab')||'today',true);
  render();
  var cl=window.claude&&window.claude.use?window.claude:null;
  setTimeout(storageCheck,1200);
  if(!cl){setTimeout(profGreet,300);S.uid='me';var had=loadLocal();notice('Τοπική λειτουργία: οι εγγραφές κρατιούνται μόνο σε αυτόν τον browser'+(had?' (φορτώθηκαν οι αποθηκευμένες)':'')+'. Άνοιξε τη σελίδα από το claude.ai για κοινή αποθήκευση.');render();return}
  Promise.all([cl.use('db'),cl.use('user'),cl.use('sample')]).then(function(r){
    S.db=r[0];S.user=r[1];S.sample=r[2];
    $('#aiCard').hidden=!S.sample;
    var idP=S.user?S.user.id().catch(function(){return null}):Promise.resolve(null);
    var canP=S.user?S.user.can('data.write').catch(function(){return null}):Promise.resolve(null);
    return Promise.all([idP,canP]);
  }).then(function(r){
    S.uid=r[0]||'me';
    if(r[1]===false)S.canWrite=false;
    if(!S.db){var had2=loadLocal();notice('Η κοινή αποθήκευση δεν είναι διαθέσιμη σε αυτή την προβολή. Οι εγγραφές κρατιούνται μόνο σε αυτόν τον browser'+(had2?' (φορτώθηκαν οι αποθηκευμένες)':'')+'.');render()}
    else if(!r[0]){notice('Συνδέσου στο claude.ai για να γράφεις στο κοινό ημερολόγιο.');S.canWrite=false}
    if(S.db)subscribe();setTimeout(function(){if(!MOOD.data&&!MOOD.loading)moodLoad()},3000);setTimeout(function(){try{apInit()}catch(e){console.error('apInit',e)}},2500);setTimeout(function(){try{agInit()}catch(e){console.error('agInit',e)}},1800);setTimeout(function(){try{nwInit()}catch(e){console.error('nwInit',e)}},3500);setTimeout(function(){try{funInit()}catch(e){console.error('funInit',e)}},1200);
    if(S.db&&r[0]&&window.Manual)Manual.attachStore(S.db,r[0]);
    applyWriteState();loadNames();render();fillCheckin();fillAccount();
  }).catch(function(){S.uid='me';render()});
}
boot();
if(window.__i18nStart)window.__i18nStart();
})();
