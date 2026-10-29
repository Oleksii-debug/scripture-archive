import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderWorkspace } from '../public/workspace.js';

const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const COPY={
  uk:{unavailable:'Не вдалося перевірити прогрес',partial:'Частина збережених результатів пошкоджена'},
  ru:{unavailable:'Не удалось проверить прогресс',partial:'Часть сохранённых результатов повреждена'},
  en:{unavailable:'Could not verify progress',partial:'Some saved results are damaged'},
};
const client=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');

test('the real account synchronization records full read failure, partial read and clears on logout',()=>{
  assert.match(client,/progressSyncStatus: null/);
  assert.match(client,/data\.warning === "partial_progress_history" \? "partial" : null/);
  assert.match(client,/if \(!data\.progress\) throw Error\("missing_progress"\)/);
  assert.match(client,/state\.progressSyncStatus = "unavailable";/);
  assert.match(client,/function clearPersonalProgress\(\) \{\s*state\.progressSyncStatus=null/);
});

test('canonical progress screen exposes accessible localized warnings and no false warning after success',async()=>{
  const prior=globalThis.document;
  globalThis.document={querySelector:()=>null};
  try{
    for(const lang of ['uk','ru','en']){
      for(const [status,needle] of [
        ['unavailable',COPY[lang].unavailable],
        ['partial',COPY[lang].partial],
        [null,''],
      ]){
        let html='',missionReads=0;
        const state={
          lang,user:null,progressSyncStatus:status,
          missionProgress:{index:1,correct:['T-1'],complete:false},
        };
        await renderWorkspace('progress',{
          state,t:key=>key,esc,shell:value=>{html=value;},
          setActiveNav:()=>{},
          getMission:async()=>{missionReads++;return {taskCount:2,title:{[lang]:'Synthetic'}};},
          loadJSON:()=>[],
        });
        assert.equal(missionReads,1);
        assert.match(html,/<h1>[^<]+<\/h1>/);
        assert.match(html,/<strong>1 \/ 2<\/strong>/);
        if(status) {
          assert.match(html,/<p role="alert">/);
          assert.ok(html.includes(needle),lang+'/'+status);
        } else assert.equal(html.includes('role="alert"'),false);
      }
    }
  } finally {
    if(prior===undefined) delete globalThis.document;
    else globalThis.document=prior;
  }
});
