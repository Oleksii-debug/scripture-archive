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
export function chooseTransport(){
  if(window.pywebview?.api?.invoke)return new DesktopTransportAdapter();
  if(location.protocol==='http:'||location.protocol==='https:')return new HttpTransportAdapter('');
  throw new Error('No transport adapter. Start the Windows host or run_web_mock.py.');
}
export async function unwrap(adapterOrResponse,command,payload={}){
  const r=command===undefined ? await adapterOrResponse : await adapterOrResponse.invoke(command,payload);
  if(!r?.ok)throw new Error(r?.error?.message||'Transport error');
  return r.data;
}

// Supplemental packaged read-only canonical review surface.
void import('./review-queue-ui.js');
// Supplemental packaged read-only canonical Library/Search surface.
void import('./library-ui.js').then(()=>import('./scripture-reader-ui.js')).then(({installScriptureReaderSurface})=>installScriptureReaderSurface());
// Current-shell compatibility: keep Library mutually exclusive with every direct packaged view.
void import('./library-shell-compat.js');
// Canonical read-only Daily Case surface from the current coordinator.
void import('./daily-case-ui.js');
// Canonical Content Pack Manager is capability-gated by system.bootstrap and keeps mutations in the backend allowlist.
void import('./content-pack-manager.js').then(({installContentPackManagerSurface})=>installContentPackManagerSurface());
// Canonical unlocked-only Evidence Graph is a read-only projection inside Research Workbench.
void import('./evidence-graph-ui.js').then(({installEvidenceGraphSurface})=>installEvidenceGraphSurface());
// Canonical source-local Witness Matrix is a read-only projection from unlocked runtime evidence.
void import('./witness-matrix-ui.js').then(({installWitnessMatrixSurface})=>installWitnessMatrixSurface());
// Constructor V2 augments the existing AuthoringUI; it remains draft/version-only and capability-gated.
void import('./constructor-v2-ui.js').then(({installConstructorV2Surface})=>installConstructorV2Surface());
// Presentation-only speech uses the current canonical runtime task and never accepts arbitrary browser text.
void import('./speech-ui.js').then(({installSpeechSurface})=>installSpeechSurface());
