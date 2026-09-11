export function installStartup({windowObject=window,locationObject=window.location,init}){
  if(typeof init!=='function')throw new TypeError('init must be a function');
  let started=false,initPromise=null;
  const start=()=>{
    if(started)return initPromise;
    started=true;
    initPromise=Promise.resolve().then(()=>init());
    return initPromise;
  };
  const protocol=String(locationObject?.protocol||'').toLowerCase();
  const bridgeReady=Boolean(windowObject?.pywebview?.api?.invoke);
  const webMock=protocol==='http:'||protocol==='https:';
  if(bridgeReady||webMock){void start()}
  else{windowObject.addEventListener('pywebviewready',()=>{void start()},{once:true})}
  return {start,get started(){return started},get promise(){return initPromise}};
}
