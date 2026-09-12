const API_VERSION='scripture.transport.v1';
let seq=0;
function request(command,payload={}){return {api_version:API_VERSION,request_id:`ui-${Date.now()}-${++seq}`,command,payload}}
export class DesktopTransportAdapter{
  async invoke(command,payload={}){
    const bridge=window.chrome?.webview;
    if(!bridge)throw new Error('Desktop bridge unavailable');
    const req=request(command,payload);
    if(typeof bridge.postMessageWithAdditionalObjects==='function'){}
    return await new Promise((resolve,reject)=>{
      const handler=(event)=>{try{const data=typeof event.data==='string'?JSON.parse(event.data):event.data;if(data?.request_id!==req.request_id)return;bridge.removeEventListener('message',handler);resolve(data)}catch(e){reject(e)}};
      bridge.addEventListener('message',handler);bridge.postMessage(JSON.stringify(req));
      setTimeout(()=>{bridge.removeEventListener('message',handler);reject(new Error('Timeout waiting for desktop response'))},15000);
    });
  }
}
export class WebTransportAdapter{
  async invoke(command,payload={}){const res=await fetch('/api/v1/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request(command,payload))});if(!res.ok)throw new Error(`HTTP ${res.status}`);return await res.json()}
}
export function chooseTransport(){return window.chrome?.webview?new DesktopTransportAdapter():new WebTransportAdapter()}
export function unwrap(response){if(!response||response.ok!==true)throw new Error(response?.error?.message||'Backend error');return response.data}

void import('./daily-case-ui.js');
