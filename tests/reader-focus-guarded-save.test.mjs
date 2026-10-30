import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

// Exercise actual current reader handlers, including account-save guards.
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const markStart=app.indexOf("document.querySelector('#mark-read').onclick=async");
const markEnd=app.indexOf("\n  document.querySelector('#start-questions')?.addEventListener",markStart);
assert.ok(markStart>=0&&markEnd>markStart,'canonical read-completion handler is present');
const completionListener=app.slice(markStart,markEnd);
const editionListener=app.split('\n').find(line=>line.includes("document.querySelector('#bible-edition').onchange="))?.trim();
assert.ok(editionListener,'canonical edition selector listener is present');

test('read completion focuses the next available action, unless keyboard focus moved',async()=>{
  for(const lang of ['uk','ru','en'])for(const [hasTasks,moved] of [[true,false],[false,false],[true,true]]){
    const body={},other={},marks=[];
    let isDisabled=false,announcement='',focusCount=0,questionsDisabled=hasTasks;
    const markRead={
      dataset:{},textContent:'',setAttribute:(name,value)=>marks.push(['set',name,value]),
      removeAttribute:name=>marks.push(['remove',name]),
      get disabled(){return isDisabled;},
      set disabled(value){isDisabled=value;if(value&&document.activeElement===markRead)document.activeElement=body;}
    };
    const questions={removeAttribute:name=>{assert.equal(name,'disabled');questionsDisabled=false;},
      focus:options=>{assert.equal(options.preventScroll,true);document.activeElement=questions;focusCount++;}};
    const progress={focus:options=>{assert.equal(options.preventScroll,true);document.activeElement=progress;focusCount++;}};
    const document={
      activeElement:markRead,
      querySelector:sel=>({'#mark-read':markRead,'#start-questions':hasTasks?questions:null,
        '.read-completion a':progress})[sel]??null,
    };
    runInNewContext(completionListener,{
      document,state:{user:null},loadJSON:()=>[],meta:{code:'JHN'},chapter:3,
      bookTitle:()=> 'John',localStorage:{setItem(){}},groupId:'',hasTasks,
      attemptRequest:async()=>{if(moved)document.activeElement=other;},
      accountRequest:async()=>({ok:true}),w:{readMarked:lang+'-marked'},
      announce:value=>{announcement=value;},t:()=> 'unavailable',
    });
    await markRead.onclick();
    assert.equal(isDisabled,true,lang);
    assert.equal(markRead.textContent,lang+'-marked');
    assert.equal(announcement,lang+'-marked');
    assert.equal(document.activeElement,moved?other:hasTasks?questions:progress,lang);
    assert.equal(focusCount,moved?0:1);
    assert.equal(marks.some(x=>x[0]==='remove'&&x[1]==='aria-busy'),true);
    if(hasTasks)assert.equal(questionsDisabled,false);
  }
});

test('failed private save leaves button enabled for a retry, with busy state cleared',async()=>{
  let announceValue='',writes=0,asked=0;
  const readButton={dataset:{},textContent:'',disabled:false,setAttribute(){},removeAttribute(){}};
  const document={activeElement:readButton,querySelector:sel=>sel==='#mark-read'?readButton:null};
  runInNewContext(completionListener,{
    document,state:{user:{id:'account-one'}},loadJSON:()=>[],meta:{code:'JHN'},chapter:3,
    bookTitle:()=> 'John',localStorage:{setItem(){writes++;}},groupId:'',hasTasks:true,
    attemptRequest:async()=>{asked++;},accountRequest:async()=>{throw Error('D1 read unavailable');},
    w:{readMarked:'Marked'},announce:value=>{announceValue=value;},
    t:key=>key,
  });
  await readButton.onclick();
  assert.equal(readButton.disabled,false);
  assert.equal(readButton.textContent,'readingSyncRetry');
  assert.equal(announceValue,'readingSyncPending');
  assert.equal(asked,0,'no task unlock until confirmed reading ACK');
  assert.equal(writes,1,'local retryable reading state remains');
  assert.equal(readButton.dataset.saSaving,undefined,'in-flight guard released');
});

test('edition redraw restores native selector focus only if the user did not move or navigate',async()=>{
  for(const lang of ['uk','ru','en'])for(const scenario of ['normal','user-moved','navigated']){
    const main={},other={};
    const location={pathname:'/reader/JHN/3',search:'',hash:''};
    const oldSelect={value:'edition-new'};let current=oldSelect,focused=0,saved;
    const document={activeElement:oldSelect,querySelector:sel=>{assert.equal(sel,'#bible-edition');return current;}};
    const newSelect={focus:options=>{assert.equal(options.preventScroll,true);document.activeElement=newSelect;focused++;}};
    const renderReader=async()=>{current=newSelect;document.activeElement=main;
      if(scenario==='user-moved')document.activeElement=other;
      if(scenario==='navigated')location.pathname='/help';
    };
    runInNewContext(editionListener,{document,main,location,state:{lang},
      parts:['reader','JHN','3'],renderReader,
      localStorage:{setItem:(key,value)=>{saved=[key,value];}}});
    await oldSelect.onchange({target:oldSelect,currentTarget:oldSelect});
    assert.deepEqual(saved,[`sa.edition.${lang}`,'edition-new']);
    assert.equal(document.activeElement,scenario==='normal'?newSelect:scenario==='user-moved'?other:main);
    assert.equal(focused,scenario==='normal'?1:0);
  }
});
