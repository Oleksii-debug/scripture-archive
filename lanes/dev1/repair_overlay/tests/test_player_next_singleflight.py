from pathlib import Path
import json
import subprocess
import unittest

MODULE = Path(__file__).resolve().parents[1] / 'frontend' / 'player-next.js'
APP = Path(__file__).resolve().parents[1] / 'frontend' / 'app.js'

class PlayerNextSingleFlightTests(unittest.TestCase):
    def test_app_uses_single_flight_controller_without_targets(self):
        source = APP.read_text(encoding='utf-8')
        self.assertIn("createPlayerNextController", source)
        self.assertIn("api('player.next',{node_id:nodeId})", source)
        self.assertNotIn("loadNode(nextNodeId)", source)
        self.assertNotIn("target_node_id", source)
        self.assertNotIn("player.navigate_branch", source)

    def test_two_immediate_actions_make_one_transport_call_and_error_recovers(self):
        module_url = MODULE.as_uri()
        script = f"""
import {{createPlayerNextController}} from {json.dumps(module_url)};
let calls=0, renders=0, eligible=true, current='A', release;
const gate=new Promise(resolve=>{{release=resolve}});
const disabled=[];
const next=createPlayerNextController({{
  canAdvance:()=>eligible,
  currentNodeId:()=>current,
  setDisabled:value=>disabled.push(value),
  advance:async nodeId=>{{if(nodeId!=='A')throw new Error('wrong node');calls+=1;await gate;return {{task:{{node_id:'B'}}}};}},
  applyResponse:data=>{{renders+=1;current=data.task.node_id;eligible=false;}},
  onError:error=>{{throw error;}}
}});
const first=next();
const second=next();
await Promise.resolve();
if(calls!==1) throw new Error(`expected one call before release, got ${{calls}}`);
release();
const [, duplicate]=await Promise.all([first,second]);
if(calls!==1||renders!==1||duplicate.skipped!==true) throw new Error('duplicate progression was not suppressed');
if(disabled[0]!==true||disabled.at(-1)!==true) throw new Error('disabled affordance did not cover in-flight/completed transition');

let retryEligible=true, attempts=0, retryDisabled=[], seenError='';
const retry=createPlayerNextController({{
  canAdvance:()=>retryEligible,
  currentNodeId:()=> 'A',
  setDisabled:value=>retryDisabled.push(value),
  advance:async()=>{{attempts+=1;if(attempts===1)throw new Error('network');retryEligible=false;return {{task:{{node_id:'B'}}}};}},
  applyResponse:()=>{{}},
  onError:error=>{{seenError=error.message;}}
}});
const failed=await retry();
if(failed.advanced!==false||seenError!=='network'||retryDisabled.at(-1)!==false) throw new Error('error path did not restore retry affordance');
const recovered=await retry();
if(recovered.advanced!==true||attempts!==2) throw new Error('retry did not recover deterministically');
console.log('PLAYER_NEXT_SINGLE_FLIGHT_PASS');
"""
        result = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True, check=True)
        self.assertIn('PLAYER_NEXT_SINGLE_FLIGHT_PASS', result.stdout)

if __name__ == '__main__':
    unittest.main()
