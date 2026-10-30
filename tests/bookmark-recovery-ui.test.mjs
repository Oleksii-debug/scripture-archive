import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const allSource = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const fragment = allSource.slice(allSource.indexOf("const bookmarkCopy ="), allSource.indexOf("attemptChannel?.addEventListener"));
const reference = "9." + "a".repeat(64);
const invalid = { reference, description: '<img src=x onerror="alert(1)"> / GEN / 999' };

function fixture({ rows = [invalid], confirm = false, fail = false, wrongAck = false,
  signedIn = true, delayedRead = false } = {}) {
  let user = signedIn ? {id:"alice"} : null, chapter = 1, currentRows = rows;
  let confirmCalls = 0, writes = [], handlers = [], releaseRead;
  const pendingRead = delayedRead ? new Promise(resolve => {releaseRead=resolve;}) : null;
  const status = {textContent:""};
  const toggle = {disabled:false, addEventListener() {}, focus() {}};
  const panel = {
    isConnected:true, innerHTML:"",
    querySelector(selector) {return selector === "#toggle-bookmark" ? toggle : status;},
    querySelectorAll(selector) {
      if (selector !== "[data-recovery-index]") return [];
      handlers = [...this.innerHTML.matchAll(/data-recovery-index="(\d+)"/g)].map(match => {
        const button = { dataset:{recoveryIndex:match[1]}, disabled:false,
          addEventListener(_name, fn) { this.click=fn; } };
        return button;
      });
      return handlers;
    },
  };
  const state = {lang:"en", user, currentReader:{book:"GEN",chapter}};
  const context = vm.createContext({
    document:{querySelector:()=>panel}, state,
    confirm:()=>{confirmCalls++;return confirm;},
    bookTitle:book=>book.title,
    esc:value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),
    fetch:async(_url,options={})=>{
      if (!options.method) {
        if (pendingRead) await pendingRead;
        return {ok:true,async json(){return {bookmarks:[{edition:"en-web",book:"GEN",chapter:1}],
          ...(currentRows.length ? {warning:"partial_bookmarks",invalid_bookmarks:currentRows} : {})};}};
      }
      writes.push({method:options.method,body:JSON.parse(options.body)});
      if (fail) return {ok:false,async json(){return {error:"recovery_stale"};}};
      if (wrongAck) return {ok:true,async json(){return {ok:false};}};
      currentRows = [];
      return {ok:true,async json(){return {ok:true};}};
    },
  });
  vm.runInContext(fragment,context);
  return {
    panel, status,
    mount:()=>context.mountReaderBookmarks({code:"GEN"},1,{id:"en-web"},[{code:"GEN",title:"Genesis",chapters:50}]),
    buttons:()=>handlers, writes:()=>writes, confirmCalls:()=>confirmCalls,
    setUser:(id)=>{state.user=id?{id}:null;}, setChapter:(n)=>{state.currentReader={book:"GEN",chapter:n};},
    releaseRead:()=>releaseRead?.(),
  };
}

test("damaged labels are escaped and never become active reader links",async()=>{
  const f=fixture();
  await f.mount();
  assert.match(f.panel.innerHTML,/&lt;img/);
  assert.doesNotMatch(f.panel.innerHTML,/<img/);
  assert.doesNotMatch(f.panel.innerHTML,/\/reader\/GEN\/999/);
  assert.match(f.panel.innerHTML,/\/reader\/GEN\/1/);
  assert.match(f.panel.innerHTML,/role="alert"/);
  assert.match(f.panel.innerHTML,/data-recovery-index="0"/);
});

test("recovery stays read-only until the individual confirmation succeeds",async()=>{
  const f=fixture({confirm:false});
  await f.mount();
  await f.buttons()[0].click();
  assert.equal(f.confirmCalls(),1);
  assert.equal(f.writes().length,0);
});

test("confirmed recovery sends exactly one owner-scoped opaque token and refreshes",async()=>{
  const f=fixture({confirm:true});
  await f.mount();
  await f.buttons()[0].click();
  assert.deepEqual(f.writes(),[{method:"DELETE",body:{recovery_ref:reference}}]);
  assert.doesNotMatch(f.panel.innerHTML,/data-recovery-index=/);
  assert.doesNotMatch(f.panel.innerHTML,/list is incomplete/);
});

test("old principal's recovery control cannot delete the next account's content",async()=>{
  const f=fixture({confirm:true});
  await f.mount();
  f.setUser("bob");
  await f.buttons()[0].click();
  assert.equal(f.confirmCalls(),0);
  assert.equal(f.writes().length,0);
});

test("old chapter controls cannot send recovery mutations after navigating",async()=>{
  const f=fixture({confirm:true});
  await f.mount();
  f.setChapter(2);
  await f.buttons()[0].click();
  assert.equal(f.writes().length,0);
});

test("unconfirmed D1 response leaves warning and accessible failure without false removal",async()=>{
  for (const mode of [{fail:true},{wrongAck:true}]) {
    const f=fixture({confirm:true,...mode});
    await f.mount();
    const button=f.buttons()[0];
    await button.click();
    assert.equal(f.writes().length,1);
    assert.match(f.panel.innerHTML,/list is incomplete/);
    assert.match(f.status.textContent,/not confirmed/);
    assert.equal(button.disabled,false);
  }
});

test("malformed recovery references are never offered as action buttons",async()=>{
  const f=fixture({rows:[
    {reference:"../etc/passwd",description:"bad"},
    {reference:"0."+"a".repeat(64),description:"bad"},
    {reference:"9."+"z".repeat(64),description:"bad"},
    {reference:reference,description:{html:"not text"}},
  ]});
  await f.mount();
  assert.equal(f.buttons().length,0);
  assert.match(f.panel.innerHTML,/list is incomplete/);
});

test("user cannot recover another account's data from a late response",async()=>{
  const f=fixture({delayedRead:true,confirm:true});
  const pending=f.mount();
  f.setUser("bob");
  f.releaseRead();
  await pending;
  assert.equal(f.panel.innerHTML,"");
  assert.equal(f.writes().length,0);
});

test("signed-out readers do not receive recovery controls or issue requests",async()=>{
  const f=fixture({signedIn:false,confirm:true});
  await f.mount();
  assert.match(f.panel.innerHTML,/Sign in/);
  assert.equal(f.buttons().length,0);
  assert.equal(f.writes().length,0);
});

test("ordinary clean bookmarked chapter stays available without recovery affordances",async()=>{
  const f=fixture({rows:[]});
  await f.mount();
  assert.match(f.panel.innerHTML,/Remove this bookmark/);
  assert.equal(f.buttons().length,0);
  assert.match(f.panel.innerHTML,/\/reader\/GEN\/1/);
});
