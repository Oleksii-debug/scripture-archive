// Shared by the canonical draft writer, immutable review snapshots and reader.
// Links are opened only on reader action; no remote embeds, autoplay or fetches.
/** @typedef {{kind:'resource',resourceType:string,url:string,prompt:string,reference:string,accessibility:string}} ResourceData */
export const MATERIAL_TYPES=['quiz','text','document','audio','video','image'];
export function resourceUrl(value) {
  if(typeof value!=='string'||value.length<9||value.length>500||value.trim()!==value||
     !/^https:\/\//i.test(value)||/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\s\\]/u.test(value))return null;
  const authority=value.slice(value.indexOf('://')+3).split(/[/?#]/u,1)[0];
  if(!authority||authority.includes('@'))return null;
  try {const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
/** @param {unknown} value @returns {value is ResourceData} */
export function validResourceData(value) {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const d=/** @type {Record<string,unknown>} */(value);
  return d.kind==='resource'&&['text','document','audio','video','image'].includes(/** @type {string} */(d.resourceType))&&
    resourceUrl(d.url)!==null&&[['prompt',8,3000],['reference',3,200],['accessibility',8,3000]].every(([key,min,max])=>
      typeof d[key]==='string'&&d[key].trim().length>=min&&d[key].length<=max)&&
    !['options','answer','explanation'].some(key=>Object.hasOwn(d,key));
}
export function resourceFields(d) {
  return {kind:'resource',resourceType:d.resourceType,url:d.url,prompt:d.prompt,reference:d.reference,accessibility:d.accessibility};
}
const COPY={
  uk:{all:'Усі типи',preview:'Переглянути',type:'Тип матеріалу',quiz:'Вправа',text:'Текст',document:'Документ',audio:'Аудіо',video:'Відео',image:'Зображення',url:'Публічне HTTPS-посилання на матеріал',accessibility:'Текстова альтернатива: зміст, розшифрування або опис',open:'Відкрити матеріал на зовнішньому сайті',help:'Посилання публікується після перевірки редактором. Додайте текстову альтернативу для читачів, які не можуть слухати або бачити матеріал.',description:'Опис матеріалу'},
  ru:{all:'Все типы',preview:'Просмотреть',type:'Тип материала',quiz:'Упражнение',text:'Текст',document:'Документ',audio:'Аудио',video:'Видео',image:'Изображение',url:'Публичная HTTPS-ссылка на материал',accessibility:'Текстовая альтернатива: содержание, расшифровка или описание',open:'Открыть материал на внешнем сайте',help:'Ссылка публикуется после проверки редактором. Добавьте текстовую альтернативу для читателей, которые не могут слушать или видеть материал.',description:'Описание материала'},
  en:{all:'All types',preview:'Preview',type:'Material type',quiz:'Exercise',text:'Text',document:'Document',audio:'Audio',video:'Video',image:'Image',url:'Public HTTPS material link',accessibility:'Text alternative: content, transcript or description',open:'Open material on external site',help:'The link is published after editorial review. Add a text alternative for readers who cannot hear or see the material.',description:'Material description'},
};
export const resourceText=lang=>typeof lang==='string'&&Object.hasOwn(COPY,lang)?COPY[lang]:COPY.uk;
export function resourceMarkup(data,lang,esc){
  if(!validResourceData(data))return '';
  const w=resourceText(lang);
  return `<p>${esc(w[data.resourceType])}</p><p>${esc(data.prompt)}</p><p><a href="${esc(resourceUrl(data.url))}" rel="noreferrer noopener">${esc(w.open)}</a></p><p><strong>${esc(w.accessibility)}</strong></p><p style="white-space:pre-wrap">${esc(data.accessibility)}</p>`;
}
