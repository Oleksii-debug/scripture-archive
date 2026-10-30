import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspace } from '../public/workspace.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const answer = value => ({ ok: true, json: async () => value });

test('progress never displays untrusted or unresolved local reading to a new principal', async () => {
  for (const flag of ['localReadingStorageUntrusted', 'unownedReadingPendingRecovery']) {
    const f = scenario('/progress');
    try {
      f.state.user = { id: 'bob' };
      f.state[flag] = true;
      let localReads = 0;
      f.context.loadJSON = () => { localReads++; return [{book:'GEN', chapter:12, title:'Prior private reading'}]; };
      globalThis.fetch = async () => answer({attempts:[]});
      await renderWorkspace('progress', f.context);
      assert.equal(localReads, 0, 'unsafe cache must not even be read');
      assert.equal(f.shells.length, 1);
      assert.doesNotMatch(f.shells[0], /Prior private reading|\/reader\/GEN\/12/);
    } finally { f.restore(); }
  }
});

test('progress rechecks trust after a delayed history request and keeps trusted history visible', async () => {
  for (const revoke of [true, false]) {
    const f = scenario('/progress');
    try {
      const history = deferred(), started = deferred();
      f.context.loadJSON = () => [{book:'GEN', chapter:12, title:'Reading title'}];
      globalThis.fetch = async () => { started.resolve(); return history.promise; };
      const active = renderWorkspace('progress', f.context);
      await started.promise;
      if (revoke) f.state.localReadingStorageUntrusted = true;
      history.resolve(answer({attempts:[]}));
      await active;
      assert.equal(f.shells[0].includes('Reading title'), !revoke);
    } finally { f.restore(); }
  }
});

test('progress treats non-array legacy cache records as empty without crashing', async () => {
  for (const legacy of [{reading:['untrusted']}, 'broken history', 17, null]) {
    const f = scenario('/progress');
    try {
      f.context.loadJSON = () => legacy;
      globalThis.fetch = async () => answer({attempts:[]});
      await renderWorkspace('progress', f.context);
      assert.equal(f.shells.length, 1);
      assert.doesNotMatch(f.shells[0], /untrusted|broken history|\\/reader\\//);
      assert.match(f.shells[0], /reading-links|nothingRead/);
    } finally { f.restore(); }
  }
});

test('progress rejects malformed chapter links and preserves valid localized history', async () => {
  const f = scenario('/progress');
  try {
    f.context.loadJSON = () => [
      {book:'GEN',chapter:12,title:'Valid Genesis'},
      {book:'GEN',chapter:'12',title:'Wrong chapter type'},
      {book:'../../escape',chapter:12,title:'Unsafe book'},
      {book:'GEN',chapter:0,title:'Zero chapter'},
      {book:'GEN',chapter:12,title:{en:'Invalid title'}},
      {book:'GEN',chapter:12,title:'X'.repeat(161)},
      null,
      {book:'1CO',chapter:16,title:'Valid Corinthians'}
    ];
    globalThis.fetch = async () => answer({attempts:[]});
    await renderWorkspace('progress', f.context);
    assert.equal(f.shells.length,1);
    assert.match(f.shells[0], /Valid Genesis/);
    assert.match(f.shells[0], /Valid Corinthians/);
    assert.match(f.shells[0], /\\/reader\\/GEN\\/12/);
    assert.match(f.shells[0], /\\/reader\\/1CO\\/16/);
    assert.doesNotMatch(f.shells[0], /Wrong chapter type|Unsafe book|Zero chapter|Invalid title|\\/reader\\/GEN\\/0/);
  } finally { f.restore(); }
});

test('progress bounds valid legacy-history projection to the most recent 200 entries', async () => {
  const f = scenario('/progress');
  try {
    f.context.loadJSON = () => Array.from({length: 220}, (_, index) => ({
      book:'GEN', chapter:12, title:'History entry '+index
    }));
    globalThis.fetch = async () => answer({attempts:[]});
    await renderWorkspace('progress', f.context);
    const links=f.shells[0].match(/href="\\/reader\\/GEN\\/12"/g) || [];
    assert.equal(links.length,200);
    assert.doesNotMatch(f.shells[0], /History entry 0</);
    assert.match(f.shells[0], /History entry 219/);
  } finally { f.restore(); }
});

function scenario(pathname = '/builder') {
  const original = { fetch: globalThis.fetch, location: globalThis.location, document: globalThis.document };
  const state = {
    lang: 'en', user: { id: 'alice' }, sessionUnavailable: false,
    missionProgress: { correct: [], complete: false, index: 0 },
  };
  const shells = [], announcements = [];
  globalThis.location = { pathname, search: '', hash: '' };
  const main = { querySelectorAll: () => [] };
  const publicMaterials = { isConnected: false };
  const newMaterial = {}, form = {}, deleteButton = { dataset: { delete: 'owned' }, disabled: false };
  globalThis.document = {
    querySelector(selector) {
      return ({ main, '#public-materials': publicMaterials, '#new-material': newMaterial, '#material-form': form })[selector] ?? null;
    },
    querySelectorAll: selector => selector === '[data-delete]' ? [deleteButton] : [],
  };
  const context = {
    state, t: key => key, esc: String, shell: html => shells.push(html),
    setActiveNav() {}, getMission: async () => ({ taskCount: 2, title: { en: 'Mission' } }),
    loadJSON: () => [], announce(message) {announcements.push(message);}, play() {}, getCatalog: async () => ({}),
  };
  return {
    state, context, shells, announcements, form, deleteButton,
    restore() {
      globalThis.fetch = original.fetch;
      if (original.location === undefined) delete globalThis.location;
      else globalThis.location = original.location;
      if (original.document === undefined) delete globalThis.document;
      else globalThis.document = original.document;
    },
  };
}

for (const mode of ['account', 'logout', 'route', 'unavailable', 'later-workspace']) {
  test('builder drops private role response after ' + mode + ' transition', async () => {
    const f = scenario();
    try {
      const role = deferred(), urls = [];
      globalThis.fetch = async url => { urls.push(url); return role.promise; };
      const active = renderWorkspace('builder', f.context);
      if (mode === 'account') f.state.user = { id: 'bob' };
      if (mode === 'logout') f.state.user = null;
      if (mode === 'route') globalThis.location.pathname = '/missions';
      if (mode === 'unavailable') f.state.sessionUnavailable = true;
      if (mode === 'later-workspace') await renderWorkspace('live', f.context);
      role.resolve(answer({ editor: true, owner: true }));
      await active;
      assert.deepEqual(urls, ['/api/editor-roles?view=me']);
      assert.equal(f.shells.filter(html => html.includes('builder-layout')).length, 0);
      if (mode !== 'later-workspace') assert.deepEqual(f.shells, []);
    } finally { f.restore(); }
  });
}

test('builder drops private material and editorial queue responses when account changes mid-flight', async () => {
  const f = scenario();
  try {
    const material = deferred(), materialStarted = deferred(), urls = [];
    globalThis.fetch = async url => {
      urls.push(url);
      if (url === '/api/editor-roles?view=me') return answer({ editor: false, owner: false });
      if (url === '/api/materials?mine=1') { materialStarted.resolve(); return material.promise; }
      if (url === '/api/material-review?view=mine') return answer({ items: [] });
      throw Error('unexpected API ' + url);
    };
    const active = renderWorkspace('builder', f.context);
    await materialStarted.promise;
    f.state.user = { id: 'bob' };
    material.resolve(answer({ materials: [{ id: 'alice-private', title: 'Private', data: {} }] }));
    await active;
    assert.ok(urls.includes('/api/materials?mine=1'));
    assert.equal(f.shells.length, 0, 'never render Alice private content under Bob');
  } finally { f.restore(); }
});

test('progress drops late private attempt history after an account or route change', async () => {
  for (const transition of ['account', 'route']) {
    const f = scenario('/progress');
    try {
      const history = deferred(), started = deferred();
      globalThis.fetch = async url => {
        assert.equal(url, '/api/attempts?action=history');
        started.resolve();
        return history.promise;
      };
      const active = renderWorkspace('progress', f.context);
      await started.promise;
      if (transition === 'account') f.state.user = { id: 'bob' };
      else globalThis.location.pathname = '/groups';
      history.resolve(answer({ guest: false, attempts: [{ book: 'GEN', chapter: 1 }] }));
      await active;
      assert.deepEqual(f.shells, [], 'no previous-person attempt history after ' + transition);
    } finally { f.restore(); }
  }
});

test('same-account builder still renders its existing canonical private interface', async () => {
  const f = scenario();
  try {
    globalThis.fetch = async url => {
      if (url === '/api/editor-roles?view=me') return answer({ editor: false, owner: false });
      if (url === '/api/materials?mine=1') return answer({ materials: [
        { id: 'owned', title: 'My draft', visibility: 'private', data: { reference: 'GEN 1' } },
      ] });
      if (url === '/api/material-review?view=mine' || url === '/api/material-review?view=public')
        return answer({ items: [] });
      throw Error('unexpected API ' + url);
    };
    await renderWorkspace('builder', f.context);
    assert.equal(f.shells.length, 1);
    assert.match(f.shells[0], /My draft/);
    assert.match(f.shells[0], /builder-layout/);
  } finally { f.restore(); }
});

function builderFetchForNativeMutation(mutate, started) {
  return async (url, options={}) => {
    if (url === '/api/editor-roles?view=me') return answer({editor: false, owner: false});
    if (url === '/api/materials?mine=1') return answer({materials: [{
      id: 'owned', title: 'My draft', visibility: 'private', data: { reference: 'GEN 1' },
    }]});
    if (url === '/api/material-review?view=mine' || url === '/api/material-review?view=public')
      return answer({items: []});
    if (url.startsWith('/api/materials') && ['POST','DELETE'].includes(options.method)) {
      started.resolve();
      return mutate.promise;
    }
    throw Error('unexpected native builder API ' + url);
  };
}
test('late native builder save never redraws or announces into another account', async () => {
  const f=scenario(), response=deferred(), started=deferred();
  const savedFormData=globalThis.FormData;
  try {
    globalThis.fetch=builderFetchForNativeMutation(response,started);
    await renderWorkspace('builder',f.context);
    assert.equal(f.shells.length,1);
    globalThis.FormData=class {
      constructor() {}
      *[Symbol.iterator]() {
        yield ['title','My draft']; yield ['prompt','Question'];
        yield ['reference','GEN 1']; yield ['options','Yes\\nNo'];
        yield ['answer','Yes']; yield ['explanation','Source-based explanation'];
      }
    };
    const action=f.form.onsubmit({preventDefault(){},currentTarget:f.form});
    await started.promise;
    f.state.user={id:'other'};
    response.resolve(answer({saved:true}));
    await action;
    assert.equal(f.shells.length,1,'old builder must not redraw after account swap');
    assert.deepEqual(f.announcements,[],'old submit must not announce into another session');
  } finally {globalThis.FormData=savedFormData;f.restore();}
});
test('late native builder delete never redraws or announces into another account', async () => {
  const f=scenario(), response=deferred(), started=deferred();
  const previousWindow=globalThis.window;
  try {
    globalThis.window={confirm:()=>true};
    globalThis.fetch=builderFetchForNativeMutation(response,started);
    await renderWorkspace('builder',f.context);
    assert.equal(typeof f.deleteButton.onclick,'function');
    const action=f.deleteButton.onclick();
    await started.promise;
    f.state.user={id:'other'};
    response.resolve(answer({deleted:true}));
    await action;
    assert.equal(f.shells.length,1,'old builder must not redraw after account swap');
    assert.deepEqual(f.announcements,[],'old deletion must not announce into another session');
  } finally {
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
    f.restore();
  }
});
test('native builder still announces acknowledged save for its original current account', async () => {
  const f=scenario(), response=deferred(), started=deferred();
  const savedFormData=globalThis.FormData;
  try {
    globalThis.fetch=builderFetchForNativeMutation(response,started);
    await renderWorkspace('builder',f.context);
    globalThis.FormData=class {
      *[Symbol.iterator]() {
        yield ['title','My draft'];yield ['prompt','Question'];yield ['reference','GEN 1'];
        yield ['options','Yes\\nNo'];yield ['answer','Yes'];yield ['explanation','Explanation'];
      }
    };
    const action=f.form.onsubmit({preventDefault(){},currentTarget:f.form});
    await started.promise;
    response.resolve(answer({saved:true}));
    await action;
    assert.equal(f.shells.length,2,'valid save still redraws canonical builder');
    assert.deepEqual(f.announcements,['Material saved.']);
  } finally {globalThis.FormData=savedFormData;f.restore();}
});

for(const view of ['about','campaigns','dossiers']) {
  test(view+' drops a late catalog after route and account replacement',async()=>{
    const f=scenario('/'+view),waiting=deferred();
    try {
      f.context.getCatalog=()=>waiting.promise;
      const old=renderWorkspace(view,f.context);
      f.state.user={id:'another-account'};
      globalThis.location.pathname='/groups';
      waiting.resolve({});
      await old;
      assert.deepEqual(f.shells,[],'stale catalog must never overwrite the new route');
    } finally {f.restore();}
  });
  test(view+' cannot overwrite a newer workspace after a slow catalog response',async()=>{
    const f=scenario('/'+view),waiting=deferred();
    try {
      f.context.getCatalog=()=>waiting.promise;
      const old=renderWorkspace(view,f.context);
      await renderWorkspace('live',f.context);
      waiting.resolve({});
      await old;
      assert.equal(f.shells.length,1,'only the newer workspace may render');
      assert.match(f.shells[0],/live-lab/);
    } finally {f.restore();}
  });
}
