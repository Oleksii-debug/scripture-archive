export function installStartup({windowObject=window,locationObject=window.location,init,bridgeTimeoutMs=10000,onBridgeTimeout=null}){
  if(typeof init!=='function')throw new TypeError('init must be a function');
  if(!Number.isSafeInteger(bridgeTimeoutMs)||bridgeTimeoutMs<=0)throw new TypeError('bridgeTimeoutMs must be a positive safe integer');
  if(onBridgeTimeout!==null&&typeof onBridgeTimeout!=='function')throw new TypeError('onBridgeTimeout must be a function or null');
  let started=false,initPromise=null,bridgeTimer=null;
  const bridgeUsable=()=>typeof windowObject?.pywebview?.api?.invoke==='function';
  const clearBridgeTimer=()=>{if(bridgeTimer!==null){clearTimeout(bridgeTimer);bridgeTimer=null}};
  const reportBridgeTimeout=()=>{
    if(onBridgeTimeout){onBridgeTimeout();return}
    const doc=windowObject?.document;
    const detail='Не вдалося підключити Windows platform bridge. Перевірте WebView2 і перезапустіть застосунок.';
    const campaignList=doc?.getElementById?.('campaign-list');
    if(campaignList)campaignList.textContent=detail;
    const status=doc?.getElementById?.('global-status');
    if(status)status.textContent='Помилка запуску платформи: Windows bridge недоступний.';
  };
  const start=()=>{
    if(started)return initPromise;
    started=true;
    clearBridgeTimer();
    initPromise=Promise.resolve().then(()=>init());
    return initPromise;
  };
  const protocol=String(locationObject?.protocol||'').toLowerCase();
  const webMock=protocol==='http:'||protocol==='https:';
  if(bridgeUsable()||webMock){void start()}
  else{
    windowObject.addEventListener('pywebviewready',()=>{void start()},{once:true});
    bridgeTimer=setTimeout(()=>{
      bridgeTimer=null;
      if(started)return;
      if(bridgeUsable()){void start();return}
      reportBridgeTimeout();
    },bridgeTimeoutMs);
  }
  return {start,get started(){return started},get promise(){return initPromise}};
}
