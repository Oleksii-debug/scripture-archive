import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Execute the actual browser script, including real consent prompt and event wiring.
const source = readFileSync(new URL('../public/analytics.js', import.meta.url), 'utf8');

function start(lang) {
  let banner = null;
  const handlers = new Map();
  const document = {
    documentElement: { lang },
    referrer: '', title: 'Scripture Archive', visibilityState: 'visible',
    querySelector: () => null,
    createElement: tag => ({
      tag, innerHTML: '', dataset: {}, hidden: false, children: [],
      setAttribute(key,value) { this[key]=value; },
      appendChild(child) { this.children.push(child); },
      addEventListener(event,fn) { this[event]=fn; },
      remove() { this.removed=true; },
    }),
    addEventListener: (event,fn) => handlers.set('document:'+event,fn),
    body: {appendChild: node => {banner=node;}},
    head: {appendChild: () => {throw Error('No analytics script before consent');}},
  };
  const window = {
    addEventListener: (event,fn) => handlers.set('window:'+event,fn),
    clearInterval: () => {},
  };
  const localStorage = {getItem: () => null, setItem: () => {}};
  const sessionStorage = {getItem: () => null, setItem: () => {}};
  const location = {
    origin: 'https://scripture-archive.com', hostname: 'scripture-archive.com',
    pathname: '/', hash: '', search: '',
  };
  runInNewContext(source, {
    window, document, localStorage, sessionStorage, location,
    crypto: {randomUUID: () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'},
    navigator: {}, Blob, URL, URLSearchParams, Date,
    fetch: () => {throw Error('No analytics call before consent');},
  }, {filename:'public/analytics.js'});
  return {banner,window};
}

const badLocales=['__proto__','constructor','toString','valueOf','hasOwnProperty',
  'isPrototypeOf',null,undefined,0,{},[],'fr'];

for (const lang of badLocales) {
  test('real consent prompt uses Ukrainian for an inherited or invalid locale: '+String(lang), () => {
    const {banner,window} = start(lang);
    assert.ok(window.saAnalytics);
    assert.equal(banner?.tag,'section');
    assert.equal(banner?.role,'dialog');
    assert.match(banner.innerHTML, /Аналітичні cookie/);
    assert.match(banner.innerHTML, /Дозволити/);
    assert.match(banner.innerHTML, /Відхилити/);
    assert.doesNotMatch(banner.innerHTML, /undefined/);
  });
}
for (const [lang,title,allow] of [
  ['uk','Аналітичні cookie','Дозволити'],
  ['ru','Аналитические cookie','Разрешить'],
  ['en','Analytics cookies','Allow'],
]) {
  test('real analytics consent prompt preserves supported copy: '+lang, () => {
    const {banner} = start(lang);
    assert.ok(banner);
    assert.ok(banner.innerHTML.includes(title));
    assert.ok(banner.innerHTML.includes(allow));
    assert.doesNotMatch(banner.innerHTML, /undefined/);
  });
}
