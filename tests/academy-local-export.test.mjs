import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {academyMarkup, academyProgressKey, attachAcademy} from '../public/scripture-academy.js';
const catalog=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function mount({user={id:'alice'},raw=JSON.stringify({version:1,completed:['abraham']}),current=()=>true,throws=false}={}) {
  let handler,clicked=null;
  const button={addEventListener(_type,fn){handler=fn;}},status={textContent:''};
  const root={querySelector:sel=>({'#academy-export':button,'#academy-export-status':status}[sel]||null),querySelectorAll:()=>[]};
  const doc={querySelector:sel=>sel==='[data-academy-root]'?root:null,createElement(){if(throws)throw Error('blocked');return {click(){clicked={href:this.href,download:this.download};}};}};
  const storage={getItem:key=>{assert.equal(key,academyProgressKey(user));return raw;}};
  attachAcademy(doc,storage,'en',user,{available:true,completed:['abraham']},current,null,null);
  return {status,click:()=>handler(),get download(){return clicked},setRaw(v){raw=v}};
}
test('course download reads the latest validated markers without account identifiers',()=>{
  const f=mount();f.setRaw(JSON.stringify({version:1,completed:['david','abraham']}));f.click();
  assert.equal(f.download.download,'scripture-archive-academy-markers.json');
  const payload=JSON.parse(decodeURIComponent(f.download.href.split(',')[1]));
  assert.deepEqual(payload,{format:'scripture-archive-academy-markers',version:1,completed:['abraham','david']});
  assert.doesNotMatch(JSON.stringify(payload),/alice/);
  assert.match(f.status.textContent,/Download requested/);
});
test('invalid storage, invalid principal, unavailable download and stale view never export',()=>{
  for(const options of [{raw:'bad'},{user:{id:'guest'}},{throws:true},{current:()=>false}]){
    const f=mount(options);f.click();assert.equal(f.download,null);
    if(options.current)assert.equal(f.status.textContent,'');else assert.match(f.status.textContent,/Could not prepare/);
  }
});
test('course export is explicit and omitted when storage cannot be validated',()=>{
  for(const lang of ['uk','ru','en']){
    const valid=academyMarkup(catalog,lang,esc,{available:true,completed:[]});
    assert.match(valid,/id="academy-export"/);assert.match(valid,/id="academy-export-status" role="status"/);
    assert.doesNotMatch(academyMarkup(catalog,lang,esc,{available:false,completed:[]}),/id="academy-export"/);
  }
});
