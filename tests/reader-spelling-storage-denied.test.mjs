import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
function excerpt(start, end) {
  const a=source.indexOf(start), b=source.indexOf(end,a);
  assert.ok(a>=0 && b>a, "canonical reader source anchors must exist");
  return source.slice(a,b);
}
const safeWriter=excerpt("function storeReaderPreference(", "const transientEditionStorageDenied");
const warningCopy=excerpt("const SPELLING_TRANSIENT_MESSAGES =", "const LANGUAGE_TRANSIENT_MESSAGES");
const spellingClick=excerpt('document.querySelector("#uk-spelling")?.addEventListener("click", () => {',
  '\n  document\n    .querySelector("#book-select")');

function fixture({denied,language="uk"}={}) {
  const writes=[], messages=[], calls=[], state={lang:language, ukOriginal:false};
  let click, resume;
  const control={addEventListener:(name,listener)=>{
    assert.equal(name,"click");click=listener;
  }};
  const context=vm.createContext({
    state, document:{querySelector:selector=>{
      assert.equal(selector,"#uk-spelling");return control;
    }},
    localStorage:{setItem(key,value){
      if(denied)throw Error("SecurityError");
      writes.push([key,value]);
    }},
    announce:message=>messages.push(message),
    route:async()=>{calls.push("route");},
  });
  vm.runInContext(safeWriter+"\n"+warningCopy+"\n"+spellingClick,context);
  return {state,writes,messages,calls,click:()=>click(),context,
    deferRoute:()=>{context.route=()=>new Promise(resolve=>{resume=resolve;});},
    resolveRoute:()=>resume?.(),
  };
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test("denied browser storage does not abort UK original-spelling selection",async()=>{
  const f=fixture({denied:true});
  f.click();await flush();
  assert.equal(f.state.ukOriginal,true);
  assert.deepEqual(f.calls,["route"]);
  assert.equal(f.writes.length,0);
  assert.match(f.messages.join(" "),/Правопис змінено лише в цій вкладці/);
});

test("denied browser storage still allows reversing the spelling choice",async()=>{
  const f=fixture({denied:true});
  f.click();await flush();
  f.click();await flush();
  assert.equal(f.state.ukOriginal,false);
  assert.deepEqual(f.calls,["route","route"]);
  assert.equal(f.messages.length,2);
});

test("permitted browser storage persists both UK spelling choices",async()=>{
  const f=fixture({denied:false});
  f.click();await flush();
  f.click();await flush();
  assert.deepEqual(f.writes,[
    ["sa.ukSpelling","original"],["sa.ukSpelling","modern"]
  ]);
  assert.equal(f.state.ukOriginal,false);
  assert.equal(f.messages.length,0);
});

test("no stale storage warning is announced after the user switches language",async()=>{
  const f=fixture({denied:true});
  f.deferRoute();f.click();
  f.state.lang="en";
  f.resolveRoute();await flush();
  assert.equal(f.state.ukOriginal,true);
  assert.equal(f.messages.length,0);
});

test("source keeps existing secure preference writer and original reader control",()=>{
  assert.match(safeWriter,/try \{ localStorage\.setItem\(key, value\); return true; \}/);
  assert.match(spellingClick,/storeReaderPreference/);
  assert.doesNotMatch(spellingClick,/localStorage\.setItem/);
  for(const language of ["uk","ru","en"])
    assert.match(warningCopy,new RegExp(language+":"));
});
