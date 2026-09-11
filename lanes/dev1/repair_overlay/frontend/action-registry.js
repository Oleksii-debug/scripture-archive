const ACTION_ID=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const ALWAYS_AVAILABLE=()=>true;

function text(value,field,{required=false}={}){
  if(typeof value!=='string')throw new TypeError(`${field} must be a string`);
  const clean=value.trim();
  if(required&&!clean)throw new TypeError(`${field} must not be empty`);
  if(clean!==value)throw new TypeError(`${field} must not contain surrounding whitespace`);
  return clean;
}

export class ActionRegistry{
  constructor(actions=[]){
    this._actions=new Map();
    actions.forEach(action=>this.register(action));
  }

  register(action){
    if(!action||typeof action!=='object')throw new TypeError('action must be an object');
    const id=text(action.id,'action.id',{required:true});
    if(!ACTION_ID.test(id))throw new TypeError(`invalid action id: ${id}`);
    if(this._actions.has(id))throw new TypeError(`duplicate action id: ${id}`);
    if(typeof action.handler!=='function')throw new TypeError(`action ${id} requires a handler`);
    const isAvailable=action.isAvailable??ALWAYS_AVAILABLE;
    if(typeof isAvailable!=='function')throw new TypeError(`action ${id} isAvailable must be a function`);
    const entry=Object.freeze({
      id,
      label:text(action.label,'action.label',{required:true}),
      description:text(action.description??'','action.description'),
      group:text(action.group??'Загальні','action.group',{required:true}),
      keywords:Object.freeze((action.keywords??[]).map((item,index)=>text(item,`action.keywords[${index}]`,{required:true}))),
      isAvailable,
      handler:action.handler,
    });
    this._actions.set(id,entry);
    return this;
  }

  _isAvailable(action){
    try{return action.isAvailable()===true}catch{return false}
  }

  execute(id){
    const action=this._actions.get(id);
    if(!action||!this._isAvailable(action))return false;
    return action.handler();
  }

  has(id){return this._actions.has(id)}

  isAvailable(id){
    const action=this._actions.get(id);
    return Boolean(action&&this._isAvailable(action));
  }

  list(query=''){
    const needle=String(query??'').trim().toLocaleLowerCase('uk-UA');
    const entries=[...this._actions.values()].filter(action=>this._isAvailable(action));
    const visible=needle?entries.filter(action=>[
      action.id,action.label,action.description,action.group,...action.keywords,
    ].some(value=>value.toLocaleLowerCase('uk-UA').includes(needle))):entries;
    return visible.map(({handler,isAvailable,...metadata})=>Object.freeze({...metadata,keywords:Object.freeze([...metadata.keywords])}));
  }
}
