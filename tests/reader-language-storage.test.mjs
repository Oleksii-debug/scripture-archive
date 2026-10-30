import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {EDITIONS} from "../public/editions.js";

const source = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const prefsStart = source.indexOf("function storeReaderPreference(");
const prefsEnd = source.indexOf("\nconst transientEditionStorageDenied", prefsStart);
const listenerStart = source.indexOf('langSelect.addEventListener("change", () => {');
const listenerEnd = source.indexOf('\ndocument.querySelector("#menu-toggle")', listenerStart);
const groupLine = source.split("\n").find(line => line.includes("document.querySelector('#chapter-link').addEventListener('click'"));
assert.ok(prefsStart >= 0 && prefsEnd > prefsStart);
assert.ok(listenerStart >= 0 && listenerEnd > listenerStart);
assert.ok(groupLine);
const preferenceCode = source.slice(prefsStart, prefsEnd);
const languageCode = source.slice(listenerStart, listenerEnd);

function languageHarness({storage, initial="uk", selected="ru", route} = {}) {
  const announcements=[], writes=[], navigation=[];
  const picker = {value:selected, addEventListener(name,listener) {
    assert.equal(name,"change");this.change=listener;
  }, focus({preventScroll}) {assert.equal(preventScroll,true);this.focused=true;}};
  const main={}, doc = {activeElement:picker,contains:()=>true};
  const state={lang:initial,mission:{active:true}};
  const context=vm.createContext({
    langSelect:picker, document:doc, main, state,
    localStorage:storage || {setItem(...args) {writes.push(args);}},
    setStaticI18n() {navigation.push("render:"+state.lang);},
    play() {}, announce:message=>announcements.push(message),
    LANGUAGE_TRANSIENT_MESSAGES:{
      uk:"Українська лише в цій вкладці",ru:"Русский только в этой вкладке",en:"English only in this tab",
    },
    route:route || (async () => {doc.activeElement=main;navigation.push("route:"+state.lang);}),
  });
  vm.runInContext(preferenceCode+"\n"+languageCode,context);
  return {picker,main,doc,state,announcements,writes,navigation};
}

test("blocked browser storage still permits native UK to RU language navigation", async () => {
  const h=languageHarness({storage:{setItem() {throw Error("SecurityError");}}});
  h.picker.change();
  await Promise.resolve();
  assert.equal(h.state.lang,"ru");
  assert.deepEqual(h.navigation,["render:ru","route:ru"]);
  assert.equal(h.picker.focused,true);
  assert.equal(h.announcements.length,1);
  assert.match(h.announcements[0],/вкладке/);
});

test("supported language is stored when permitted, without a false transient warning", async () => {
  const h=languageHarness({selected:"en"});
  h.picker.change();
  await Promise.resolve();
  assert.equal(h.state.lang,"en");
  assert.deepEqual(h.writes,[["sa.lang","en"]]);
  assert.equal(h.announcements.length,0);
});

test("invalid language value is refused before any navigation or preference write", () => {
  const h=languageHarness({selected:"unknown"});
  h.picker.change();
  assert.equal(h.state.lang,"uk");
  assert.equal(h.picker.value,"uk");
  assert.deepEqual(h.navigation,[]);
  assert.deepEqual(h.writes,[]);
});

test("obsolete language redraw does not overwrite focus or announce an outdated locale", async () => {
  const finishes=[];
  const h=languageHarness({storage:{setItem() {throw Error("SecurityError");}},
    route:()=>new Promise(resolve=>finishes.push(resolve))});
  h.picker.change(); // RU
  h.picker.value="en";
  h.picker.change(); // EN supersedes RU
  h.doc.activeElement=h.main;
  finishes[0]();
  await Promise.resolve();
  assert.deepEqual(h.announcements,[]);
  assert.equal(h.picker.focused,undefined);
  finishes[1]();
  await Promise.resolve();
  assert.equal(h.state.lang,"en");
  assert.deepEqual(h.announcements,["English only in this tab"]);
  assert.equal(h.picker.focused,true);
});

test("group chapter link uses verified in-tab edition when storage is blocked", () => {
  let listener;const sets=[],selected=[],announcements=[];
  const link={isConnected:true,addEventListener:(name,fn)=>{assert.equal(name,"click");listener=fn;}};
  const state={lang:"uk"};
  const group={bibleEdition:"ru-nrt"};
  const deny={setItem() {throw Error("SecurityError");}};
  const flags=new Set();
  const ctx=vm.createContext({
    document:{querySelector:()=>link},group,groupId:"g1",principal:"p1",state,
    groupPageCurrent:()=>true,
    localStorage:deny, EDITIONS, transientEditionStorageDenied:flags,
    setEditionForTab:(...args)=>selected.push(args),
    setStaticI18n:()=>sets.push(state.lang),
    LANGUAGE_TRANSIENT_MESSAGES:{ru:"only this tab"},
    announce:msg=>announcements.push(msg),
  });
  vm.runInContext(preferenceCode+"\n"+groupLine,ctx);
  listener({currentTarget:link});
  assert.equal(state.lang,"ru");
  assert.deepEqual(selected,[["ru","ru-nrt"]]);
  assert.equal(flags.has("ru"),true);
  assert.deepEqual(sets,["ru"]);
  assert.deepEqual(announcements,["only this tab"]);
});

test("stale group principal cannot change language or edition", () => {
  let listener,called=false;
  const link={isConnected:true,addEventListener:(_name,fn)=>listener=fn};
  const state={lang:"uk"};
  const ctx=vm.createContext({
    document:{querySelector:()=>link}, group:{bibleEdition:"en-web"},
    groupId:"group",principal:"former", state, EDITIONS,
    groupPageCurrent:()=>false,
    localStorage:{setItem(){called=true;}},setEditionForTab:()=>{called=true;},
    transientEditionStorageDenied:new Set(),setStaticI18n:()=>{called=true;},
    LANGUAGE_TRANSIENT_MESSAGES:{en:""},announce:()=>{called=true;},
  });
  vm.runInContext(preferenceCode+"\n"+groupLine,ctx);
  listener({currentTarget:link});
  assert.equal(state.lang,"uk");
  assert.equal(called,false);
});
