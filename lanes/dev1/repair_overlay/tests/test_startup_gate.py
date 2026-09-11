import json
import shutil
import subprocess
import unittest
from pathlib import Path


class StartupGateBehaviorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root=Path(__file__).parents[1]
        cls.module=cls.root/'frontend'/'startup.js'
        cls.app=(cls.root/'frontend'/'app.js').read_text(encoding='utf-8')
        cls.node=shutil.which('node')

    def _node(self, body: str):
        if not self.node:self.skipTest('node unavailable')
        source=f"import {{installStartup}} from {json.dumps(self.module.as_uri())};\n"+body
        result=subprocess.run([self.node,'--input-type=module','-e',source],capture_output=True,text=True)
        self.assertEqual(0,result.returncode,result.stderr or result.stdout)

    def test_file_protocol_waits_for_bridge_and_initializes_once(self):
        self._node(r"""
let handler=null,calls=0;
const fakeWindow={pywebview:undefined,addEventListener:(name,fn,opts)=>{if(name!=='pywebviewready'||opts?.once!==true)throw new Error('bad listener');handler=fn}};
const gate=installStartup({windowObject:fakeWindow,locationObject:{protocol:'file:'},init:async()=>{calls+=1}});
await Promise.resolve();
if(calls!==0||gate.started)throw new Error('packaged startup ran before bridge readiness');
if(typeof handler!=='function')throw new Error('bridge-ready listener missing');
fakeWindow.pywebview={api:{invoke:()=>{}}};
handler();handler();await gate.start();
if(calls!==1||!gate.started)throw new Error(`startup not single-flight: ${calls}`);
""")

    def test_missing_bridge_reports_accessible_failure_and_late_ready_recovers(self):
        self._node(r"""
let handler=null,calls=0;
const nodes={'campaign-list':{textContent:''},'global-status':{textContent:''}};
const fakeWindow={
  pywebview:undefined,
  document:{getElementById:id=>nodes[id]||null},
  addEventListener:(name,fn,opts)=>{if(name!=='pywebviewready'||opts?.once!==true)throw new Error('bad listener');handler=fn}
};
const gate=installStartup({windowObject:fakeWindow,locationObject:{protocol:'file:'},bridgeTimeoutMs:5,init:async()=>{calls+=1}});
await new Promise(resolve=>setTimeout(resolve,20));
if(calls!==0||gate.started)throw new Error('timeout must not probe transport or mark startup complete');
if(!nodes['campaign-list'].textContent.includes('WebView2'))throw new Error('visible startup diagnostic missing');
if(!nodes['global-status'].textContent.includes('Windows bridge'))throw new Error('live-region startup diagnostic missing');
fakeWindow.pywebview={api:{invoke:()=>{}}};
handler();await gate.start();
if(calls!==1||!gate.started)throw new Error(`late bridge did not recover exactly once: ${calls}`);
""")

    def test_bridge_that_appears_before_timeout_starts_without_event(self):
        self._node(r"""
let calls=0,reports=0;
const fakeWindow={pywebview:undefined,addEventListener:()=>{}};
const gate=installStartup({windowObject:fakeWindow,locationObject:{protocol:'file:'},bridgeTimeoutMs:10,onBridgeTimeout:()=>{reports+=1},init:async()=>{calls+=1}});
setTimeout(()=>{fakeWindow.pywebview={api:{invoke:()=>{}}}},2);
await new Promise(resolve=>setTimeout(resolve,25));
await gate.start();
if(calls!==1||reports!==0||!gate.started)throw new Error(`lost-event recovery failed calls=${calls} reports=${reports}`);
""")

    def test_web_mock_starts_immediately_once(self):
        self._node(r"""
let calls=0,listeners=0;
const fakeWindow={addEventListener:()=>{listeners+=1}};
const gate=installStartup({windowObject:fakeWindow,locationObject:{protocol:'http:'},init:async()=>{calls+=1}});
await gate.start();await gate.start();
if(calls!==1)throw new Error(`expected one web bootstrap, got ${calls}`);
if(listeners!==0)throw new Error('web mock should not wait for pywebviewready');
""")

    def test_ready_bridge_starts_immediately_once(self):
        self._node(r"""
let calls=0,listeners=0;
const fakeWindow={pywebview:{api:{invoke:()=>{}}},addEventListener:()=>{listeners+=1}};
const gate=installStartup({windowObject:fakeWindow,locationObject:{protocol:'file:'},init:async()=>{calls+=1}});
await gate.start();await gate.start();
if(calls!==1||listeners!==0)throw new Error(`bad ready-bridge lifecycle calls=${calls} listeners=${listeners}`);
""")

    def test_app_uses_gate_without_zero_delay_transport_probe(self):
        self.assertIn("installStartup({windowObject:window,locationObject:location,init})",self.app)
        self.assertNotIn("setTimeout(init,0)",self.app)
        self.assertNotIn("pywebviewready',()=>init()",self.app)


if __name__=='__main__':unittest.main()
