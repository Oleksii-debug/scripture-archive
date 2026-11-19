const COPY={
 uk:{more:'Показати старіші матеріали',heading:'Старіші матеріали',loading:'Завантаження матеріалів…',error:'Не вдалося завантажити старіші матеріали. Повторіть спробу.',found:n=>`Додано матеріалів: ${n}.`,end:'Усі власні матеріали показано.'},
 ru:{more:'Показать более ранние материалы',heading:'Более ранние материалы',loading:'Загрузка материалов…',error:'Не удалось загрузить более ранние материалы. Повторите попытку.',found:n=>`Добавлено материалов: ${n}.`,end:'Показаны все свои материалы.'},
 en:{more:'Show older materials',heading:'Older materials',loading:'Loading materials…',error:'Could not load older materials. Please try again.',found:n=>`Materials added: ${n}.`,end:'All your materials are shown.'},
};
const cursorKey=c=>JSON.stringify([c.updatedAt,c.id]);
const copy=lang=>typeof lang==='string'&&Object.hasOwn(COPY,lang)?COPY[lang]:COPY.uk;
const validCursor=c=>c===null||Boolean(c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).sort().join(',')==='id,updatedAt'&&typeof c.id==='string'&&c.id.length>0&&c.id.length<=80&&c.id.trim()===c.id&&typeof c.updatedAt==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(c.updatedAt));
const validDraft=m=>Boolean(m&&typeof m==='object'&&!Array.isArray(m)&&typeof m.id==='string'&&m.id.length>0&&m.id.length<=80&&typeof m.title==='string'&&m.title.length<=160&&['uk','ru','en'].includes(m.locale)&&['private','public'].includes(m.visibility)&&m.data&&typeof m.data==='object'&&!Array.isArray(m.data)&&typeof m.data.reference==='string');
export function ownMaterialControls(lang){const w=copy(lang);return `<p class="own-material-status" role="status"></p><button class="button own-material-more" type="button" hidden>${w.more}</button>`;}
// Append to the current list; rebuilding the editor would discard unsaved input.
export function mountOwnMaterialPages(root,data,lang,esc,cardMarkup,bindCards,isCurrent){
 const more=root?.querySelector('.own-material-more'),status=root?.querySelector('.own-material-status'),list=root?.querySelector('.material-list');
 if(!more||!status||!list)return;
 const w=copy(lang);let loading=false,page=1,cursor=data.nextCursor??null;
 const active=()=>{try{return root.isConnected!==false&&more.isConnected!==false&&list.isConnected!==false&&isCurrent()===true;}catch{return false;}};
 if(!active())return;
 if(!validCursor(cursor)){status.textContent=w.error;return;}
 more.hidden=cursor===null;
 const seen=new Set();if(cursor)seen.add(cursorKey(cursor));
 more.onclick=async()=>{
  if(!active()||loading||!cursor)return;
  loading=true;status.textContent=w.loading;const doc=root.ownerDocument,hadFocus=doc?.activeElement===more;
  try{
   const params=new URLSearchParams({mine:'1',afterUpdatedAt:cursor.updatedAt,afterId:cursor.id});
   const response=await fetch('/api/materials?'+params.toString()),result=await response.json();
   if(!active())return;
   if(!response.ok||!Array.isArray(result?.materials)||result.materials.length>50||!result.materials.every(validDraft)||!validCursor(result.nextCursor)||
      (result.nextCursor&&seen.has(cursorKey(result.nextCursor))))throw Error('invalid materials page');
   const existing=new Set(data.materials.map(m=>m.id)),fresh=result.materials.filter(m=>{if(existing.has(m.id))return false;existing.add(m.id);return true;});
   const headingId=`own-material-page-${++page}`;
   // Render before advancing the cursor so a rendering error is retryable.
   const html=`<section aria-labelledby="${headingId}"><h3 id="${headingId}" tabindex="-1">${esc(w.heading)}</h3>${fresh.map(cardMarkup).join('')}</section>`;
   list.insertAdjacentHTML('beforeend',html);data.materials.push(...fresh);cursor=result.nextCursor;data.nextCursor=cursor;if(cursor)seen.add(cursorKey(cursor));
   bindCards();const focus=hadFocus&&doc?.activeElement===more;more.hidden=!cursor;
   status.textContent=w.found(fresh.length)+(cursor?'':' '+w.end);
   if(focus)list.querySelector('#'+headingId)?.focus();
  }catch{if(active())status.textContent=w.error;}
  finally{loading=false;}
 };
}
