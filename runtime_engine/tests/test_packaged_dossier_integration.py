from pathlib import Path
import shutil
import subprocess
import sys
import textwrap
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
PLATFORM_ROOT = REPO_ROOT / "lanes" / "dev1" / "repair_overlay"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(PLATFORM_ROOT) not in sys.path:
    sys.path.insert(0, str(PLATFORM_ROOT))

# This runtime-level suite may import only self-contained repair-overlay modules.
# PlatformApplication depends on the immutable DEV1 base package, which is restored
# only by r06-dev1-platform.yml before the overlay is applied. Its real composition
# and output-attestation regression therefore lives in
# lanes/dev1/repair_overlay/tests/test_dossier_composition.py, where that topology
# exists. Importing PlatformApplication directly from the partial overlay here makes
# unrelated runtime workflows fail before exercising any Dossier production bytes.
from scripture_archive_platform.application.runtime_gateway import build_runtime_dossier
from scripture_archive_platform.transport.contracts import validate_request_shape
from runtime_engine.scripture_archive_runtime.evidence import Claim, EvidenceRecord, EvidenceRuntime
from runtime_engine.scripture_archive_runtime.models import Confidence


class PackagedDossierIntegrationTests(unittest.TestCase):
    def test_allowlisted_contract_rejects_extended_control_separators(self):
        request = {
            "api_version": "scripture.transport.v1",
            "request_id": "dossier-ci",
            "command": "dossier.get",
            "payload": {"subject_id": "PERSON:PAUL", "display_name": "Paul", "kind": "PERSON"},
        }
        self.assertEqual(validate_request_shape(request)[1], "dossier.get")
        for key, bad in (
            ("subject_id", "PERSON:PAUL\u0085X"),
            ("display_name", "Paul\u2028Injected"),
            ("display_name", "Paul\u2029Injected"),
        ):
            payload = dict(request["payload"])
            payload[key] = bad
            with self.subTest(key=key, bad=repr(bad)):
                with self.assertRaises(ValueError):
                    validate_request_shape({**request, "payload": payload})

    def test_runtime_projection_stays_unlocked_only_and_hides_locked_dependencies(self):
        evidence = EvidenceRuntime()
        evidence.add_evidence(EvidenceRecord(
            evidence_id="EV-VISIBLE",
            passage_refs=(),
            proposition="Visible canonical proposition",
            confidence=Confidence.T1,
            entity_ids=("PERSON:PAUL",),
        ))
        evidence.add_evidence(EvidenceRecord(
            evidence_id="EV-LOCKED",
            passage_refs=(),
            proposition="Locked proposition",
            confidence=Confidence.T1,
            entity_ids=("PERSON:PAUL",),
        ))
        evidence.add_claim(Claim(
            claim_id="CL-LOCKED",
            proposition="Claim needing locked evidence",
            confidence=Confidence.T2,
            required_evidence_ids=("EV-VISIBLE", "EV-LOCKED"),
        ))
        evidence.unlock("EV-VISIBLE")
        runtime = type("Runtime", (), {"evidence": evidence})()

        dossier = build_runtime_dossier(runtime, "PERSON:PAUL", "Paul", "PERSON")["dossier"]
        self.assertEqual(dossier["evidence_scope"], "unlocked_only")
        self.assertEqual([row["row_id"] for row in dossier["rows"]], ["EV-VISIBLE"])
        rendered = "\n".join(dossier["linear"])
        self.assertIn("EV-VISIBLE", rendered)
        self.assertNotIn("EV-LOCKED", rendered)
        self.assertNotIn("CL-LOCKED", rendered)
        self.assertNotIn("Locked proposition", rendered)

    def test_deferred_ui_completion_is_inert_after_leave_and_reopen(self):
        node = shutil.which("node")
        self.assertIsNotNone(node, "hosted integration runner must expose Node for executable WebView module regression")
        ui_path = PLATFORM_ROOT / "frontend" / "dossier-ui.js"
        script = textwrap.dedent(
            r"""
            import {readFileSync} from 'node:fs';
            const source=readFileSync(process.argv[1],'utf8');
            const {DossierUI}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
            const resolvers=[];const announcements=[];const renders=[];let focusCount=0;let active=true;
            const ui=new DossierUI({invoke:()=>new Promise(resolve=>resolvers.push(resolve)),announce:text=>announcements.push(text),showView:()=>{},isActiveView:()=>active,enabled:true});
            Object.assign(ui,{subjectId:{value:'PERSON:PAUL'},displayName:{value:'Paul'},kind:{value:'PERSON'},submit:{disabled:false},status:{textContent:''},tbody:{replaceChildren(){}},summary:{textContent:''},linear:{textContent:''},resultHeading:{focus(){focusCount+=1;}}});
            ui.render=d=>renders.push(d.subject.display_name);
            const response=(id,name)=>({dossier:{schema:'scripture.dossier-view.v1',subject:{subject_id:id,display_name:name,kind:'PERSON'},stated:false,status_text:'No cited support available in current scope',rows:[],linear:['No cited support available in current scope'],evidence_scope:'unlocked_only'}});
            const assert=(value,message)=>{if(!value)throw new Error(message);};

            ui.setVisible(true);const first=ui.load();assert(resolvers.length===1,'first request missing');
            active=false;ui.setVisible(false);resolvers[0](response('PERSON:PAUL','Paul'));await first;
            assert(renders.length===0&&announcements.length===0&&focusCount===0,'late leave completion was not inert');

            active=true;ui.setVisible(true);const old=ui.load();assert(resolvers.length===2,'old reopen request missing');
            active=false;ui.setVisible(false);active=true;ui.setVisible(true);ui.subjectId.value='PERSON:PETER';ui.displayName.value='Peter';
            const fresh=ui.load();assert(resolvers.length===3,'fresh request blocked by stale promise');
            resolvers[1](response('PERSON:PAUL','Paul'));await old;
            assert(renders.length===0&&announcements.length===0&&focusCount===0,'old completion mutated reopened view');
            resolvers[2](response('PERSON:PETER','Peter'));await fresh;
            assert(renders.length===1&&renders[0]==='Peter','fresh completion did not exclusively render');
            assert(announcements.length===1&&focusCount===1,'fresh completion accessibility effects incorrect');
            """
        )
        result = subprocess.run(
            [node, "--input-type=module", "-e", script, str(ui_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
