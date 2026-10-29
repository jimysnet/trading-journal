(function(){
"use strict";
var DICT={},FR=[],FRN=[],RUOK=false,RUQ=[];
var GR=/[Ͱ-Ͽἀ-῿]/;
var NUM=/\d+(?:[.,]\d+)*/g;
var LETTER=/[\p{L}]/u;
var ATTRS=['placeholder','aria-label','title'];
var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,CODE:1,PRE:1};
var EXACT='.ud,#f-tag,#mc-strat,#evo-strat,#mkt-strat,#t-strategy,#f-strategy,#f-who,#f-acct,.acct,#imp-strategy,#stratList h3,#tradeTable td,#openList td,#imp-preview td';
var LINES='.rules,.pbody p,#t-rlist span,td.rl';
var lang='el';
try{localStorage.removeItem('tj-lang')}catch(e){}/* μόνο ελληνικά */
function buildIdx(){FR=Object.keys(DICT).filter(function(k){return k.indexOf('{#}')<0&&k.length>=5&&DICT[k]}).sort(function(a,b){return b.length-a.length});
var FRN=Object.keys(DICT).filter(function(k){return k.indexOf('{#}')>=0&&k.replace(/\{#\}/g,'').length>=12&&DICT[k]}).sort(function(a,b){return b.length-a.length}).map(function(k){
  var src=k.split('{#}').map(function(part){return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}).join('([+\\-−]?\\d+(?:[.,]\\d+)*)');
  var sL=LETTER.test(k.charAt(0)),eL=LETTER.test(k.charAt(k.length-1));return {re:new RegExp((sL?'(^|[^\\p{L}])':'()')+src+(eL?'(?![\\p{L}])':''),'gu'),to:DICT[k]};
});}
function loadRu(cb){if(RUOK){cb&&cb();return}if(cb)RUQ.push(cb);if(RUQ.loading)return;RUQ.loading=true;
  var done=function(){if(RUOK)return;DICT=window.__RU||{};buildIdx();RUOK=true;var q=RUQ.splice(0);q.forEach(function(f){try{f()}catch(e){}});if(window.Manual&&Manual.reindex)Manual.reindex()};
  if(window.__RU){done();return}var sc=document.createElement('script');sc.src='ru.js';sc.onload=done;sc.onerror=function(){RUQ.loading=false};document.head.appendChild(sc)}

function fill(tpl,nums){var i=0;return tpl.replace(/\{#\}/g,function(){var v=nums[i++];return v===undefined?'':v})}
function exact(text){
  if(!text||!GR.test(text))return null;
  var lead=text.match(/^\s*/)[0],trail=text.match(/\s*$/)[0];
  var core=text.replace(/\s+/g,' ').trim();if(!core)return null;
  var nums=core.match(NUM)||[],key=core.replace(NUM,'{#}');
  if(DICT[key])return lead+fill(DICT[key],nums)+trail;
  var sn=[],key2=core.replace(/(^|[\s(:])([+\-−]?)(\d+(?:[.,]\d+)*)|(\d+(?:[.,]\d+)*)/g,function(m,p,sg,n,n2){if(n2!==undefined){sn.push(n2);return '{#}'}sn.push((sg||'')+n);return p+'{#}'});
  if(DICT[key2])return lead+fill(DICT[key2],sn)+trail;
  return null;
}
function frag(text){
  var out=text.replace(/\s+/g,' '),hit=false;
  for(var i=0;i<FR.length;i++){
    var f=FR[i],from=0,idx;
    while((idx=out.indexOf(f,from))>=0){
      var before=idx>0?out.charAt(idx-1):'',after=out.charAt(idx+f.length);
      if((before&&LETTER.test(before)&&LETTER.test(f.charAt(0)))||(after&&LETTER.test(after)&&LETTER.test(f.charAt(f.length-1)))){from=idx+1;continue}
      out=out.slice(0,idx)+DICT[f]+out.slice(idx+f.length);hit=true;from=idx+DICT[f].length;
    }
    if(!GR.test(out))break;
  }
  if(GR.test(out)){for(var j=0;j<FRN.length;j++){var r=FRN[j];r.re.lastIndex=0;if(!r.re.test(out))continue;r.re.lastIndex=0;
    out=out.replace(r.re,function(){var a=arguments,pre=a[1],nums=[];for(var q=2;q<a.length-2;q++){if(typeof a[q]==='string')nums.push(a[q]);else break}return pre+fill(r.to,nums)});hit=true;if(!GR.test(out))break}}
  return hit?out:null;
}
function lines(text){
  var changed=false,res=text.split('\n').map(function(line){
    var m=line.match(/^(\s*-\s*)(.*)$/),pre=m?m[1]:'',body=m?m[2]:line;
    if(!GR.test(body))return line;
    var colon=/:\s*$/.test(body),core=colon?body.replace(/:\s*$/,''):body;
    var t=exact(core);if(t==null)return line;changed=true;return pre+t+(colon?':':'');
  });
  return changed?res.join('\n'):null;
}
function translateText(n){
  var p=n.parentElement;if(!p||SKIP[p.tagName])return;
  var v=n.nodeValue;if(v===n.__ru)return;
  if(!GR.test(v))return;
  if(p.tagName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',p.textContent);
  var t=null;
  if(p.closest(LINES))t=lines(v);
  else{t=exact(v);if(t==null&&!p.closest(EXACT))t=frag(v)}
  if(t==null||t===v)return;
  n.__gr=v;n.__ru=t;n.nodeValue=t;
}
function translateAttrs(el){
  for(var i=0;i<ATTRS.length;i++){var a=ATTRS[i];if(!el.hasAttribute(a))continue;var v=el.getAttribute(a);
    if(el.__ra&&el.__ra[a]===v)continue;if(!GR.test(v))continue;
    var t=exact(v);if(t==null)t=frag(v);if(t==null)continue;
    el.__ga=el.__ga||{};el.__ra=el.__ra||{};el.__ga[a]=v;el.__ra[a]=t;el.setAttribute(a,t)}
}
function walk(root){
  if(root.nodeType===3){translateText(root);return}
  if(root.nodeType!==1)return;if(SKIP[root.tagName]){if(root.tagName==='TEXTAREA')translateAttrs(root);return}
  translateAttrs(root);
  var w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:function(n){if(n.nodeType===1&&SKIP[n.tagName]){if(n.tagName==='TEXTAREA')translateAttrs(n);return NodeFilter.FILTER_REJECT}return NodeFilter.FILTER_ACCEPT}}),n;
  while((n=w.nextNode())){if(n.nodeType===3)translateText(n);else translateAttrs(n)}
}
function restore(){
  var w=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT),n;
  while((n=w.nextNode())){
    if(n.nodeType===3){if(n.__ru!=null&&n.nodeValue===n.__ru)n.nodeValue=n.__gr;n.__ru=null;n.__gr=null}
    else if(n.__ra){for(var a in n.__ra){if(n.getAttribute(a)===n.__ra[a])n.setAttribute(a,n.__ga[a])}n.__ra=null;n.__ga=null}
  }
}
var obs=new MutationObserver(function(ms){
  if(lang!=='ru'||!RUOK)return;
  for(var i=0;i<ms.length;i++){var m=ms[i];
    if(m.type==='characterData')translateText(m.target);
    else if(m.type==='attributes')translateAttrs(m.target);
    else for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j]);
  }
});
function paintSwitch(){document.querySelectorAll('[data-lang]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-lang')===lang?'true':'false')})}
function set(l,fromStore){
  if(l!=='el')return;
  var changed=l!==lang;lang=l;
  try{localStorage.setItem('tj-lang',l)}catch(e){}
  document.documentElement.lang=l==='ru'?'ru':'el';
  paintSwitch();
  if(l==='ru')loadRu(function(){if(lang==='ru')walk(document.body)});else if(changed)restore();
  if(window.Manual&&Manual.reindex)Manual.reindex();
  if(changed&&!fromStore&&window.Manual&&Manual.savePrefs)Manual.savePrefs();
}
window.I18N={get lang(){return lang},set:set,t:function(s){return lang==='ru'?(exact(s)||frag(s)||s):s}};
document.addEventListener('click',function(e){var b=e.target.closest('[data-lang]');if(b)set(b.getAttribute('data-lang'))});
function start(){
  obs.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  paintSwitch();document.documentElement.lang=lang==='ru'?'ru':'el';
  if(lang==='ru')loadRu(function(){if(lang==='ru')walk(document.body)});
}
window.__i18nStart=start;
})();
