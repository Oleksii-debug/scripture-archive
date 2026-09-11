const API_VERSION='scripture.transport.v1';
let seq=0;
function request(command,payload={}){return {api_version:API_VERSION,request_id:`ui-${Date.now()}-${++seq}`,command,payload}}
export class DesktopTransportAdapter{
  async invoke(command,payload={}){
    if(!window.pywebview?.api?.invoke)throw new Error('Desktop WebView bridge unavailable');
    return await window.pywebview.api.invoke(request(command,payload));
  }
}
export class HttpTransportAdapter{
  constructor(baseUrl=''){this.baseUrl=baseUrl}
  async invoke(command,payload={}){
    const res=await fetch(`${this.baseUrl}/api/v1/invoke`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(request(command,payload)),credentials:'same-origin'});
    if(!res.ok)throw new Error(`HTTP transport ${res.status}`);return await res.json();
  }
}
export class MockTransportAdapter{
  constructor(handler){this.handler=handler}
  async invoke(command,payload={}){return await this.handler(request(command,payload))}
}
export async function chooseTransport(){
  if(window.pywebview?.api?.invoke)return new DesktopTransportAdapter();
  if(location.protocol==='http:'||location.protocol==='https:')return new HttpTransportAdapter('');
  throw new Error('No transport adapter. Start the Windows host or run_web_mock.py.');
}
export async function unwrap(adapter,command,payload={}){const r=await adapter.invoke(command,payload);if(!r?.ok)throw new Error(r?.error?.message||'Transport error');return r.data}

// Load the supplemental read-only Library/Search surface only after this transport
// module has initialized, avoiding a static import cycle with library-ui.js.
void import('./library-ui.js');
