import json
import shutil
import subprocess
import unittest
from pathlib import Path


class RuntimeNextGateBehaviorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root=Path(__file__).parents[1]
        cls.module=cls.root/'frontend'/'player-next.js'
        cls.app=(cls.root/'frontend'/'app.js').read_text(encoding='utf-8')
        cls.node=shutil.which('node')

    def _node(self, body: str):
        if not self.node:self.skipTest('node unavailable')
        source=f"import {{RuntimeNextGate}} from {json.dumps(self.module.as_uri())};\n"+body
        result=subprocess.run([self.node,'--input-type=module','-e',source],capture_output=True,text=True)
        self.assertEqual(0,result.returncode,result.stderr or result.stdout)

    def test_double_activation_is_single_flight_and_renders_once(self):
        self._node(r"""
let calls=0,rendered=0,completed=0,errors=0;const busy=[];let release;
const pending=new Promise(resolve=>{release=resolve});
const gate=new RuntimeNextGate({
  invoke:async(command,payload)=>{if(command!=='player.next'||payload.node_id!=='A')throw new Error('bad request');calls+=1;await pending;return {task:{node_id:'B'},mission:{mission_id:'M'}}},
  setBusy:value=>busy.push(value),onData:()=>{rendered+=1},onComplete:()=>{completed+=1},onError:()=>{errors+=1}
});
const first=gate.run('A');const second=gate.run('A');
await new Promise(resolve=>setTimeout(resolve,0));
if(calls!==1)throw new Error(`expected one call, got ${calls}`);
if(busy.length!==1||busy[0]!==true)throw new Error(`busy not synchronous: ${busy}`);
release();const values=await Promise.all([first,second]);
if(values[0]!==true||values[1]!==false)throw new Error(`unexpected run values ${values}`);
if(calls!==1||rendered!==1||completed!==0||errors!==0)throw new Error('duplicate transition side effect');
if(busy.length!==2||busy[1]!==false)throw new Error(`busy not released: ${busy}`);
""")

    def test_error_releases_gate_for_retry(self):
        self._node(r"""
let calls=0,errors=0,rendered=0;const busy=[];
const gate=new RuntimeNextGate({
  invoke:async()=>{calls+=1;if(calls===1)throw new Error('network');return {task:{node_id:'B'}}},
  setBusy:value=>busy.push(value),onData:()=>{rendered+=1},onError:()=>{errors+=1}
});
if(await gate.run('A')!==false)throw new Error('first call should fail');
if(gate.inFlight)throw new Error('gate stuck after failure');
if(await gate.run('A')!==true)throw new Error('retry should succeed');
if(calls!==2||errors!==1||rendered!==1)throw new Error('bad retry behavior');
if(JSON.stringify(busy)!==JSON.stringify([true,false,true,false]))throw new Error(`bad busy lifecycle ${busy}`);
""")

    def test_app_uses_runtime_owned_gate_not_caller_selected_reload(self):
        self.assertIn("nextGate.run(currentTask.node_id)",self.app)
        self.assertIn("api(command,payload)",self.app)
        self.assertNotIn("loadNode(nextNodeId)",self.app)
        self.assertNotIn("player.navigate_branch",self.app)
        self.assertNotIn("target_node_id",self.app)


if __name__=='__main__':unittest.main()
