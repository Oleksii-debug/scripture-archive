from pathlib import Path
import shutil
import subprocess
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"


class DossierUiContractTests(unittest.TestCase):
    def test_dossier_ui_is_reachable_and_uses_only_allowlisted_query(self):
        app = (FRONTEND / "app.js").read_text(encoding="utf-8")
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        self.assertIn("DossierUI", app)
        self.assertIn("'dossier'", app)
        self.assertIn("bootstrap.capabilities?.dossiers", app)
        self.assertIn("this.invoke('dossier.get',request)", ui)
        for forbidden in ("include_locked", "filesystem", "shell", "eval(", "fetch("):
            self.assertNotIn(forbidden, ui)

    def test_untrusted_runtime_strings_are_text_only(self):
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        self.assertIn("node.textContent=text", ui)
        self.assertIn("this.linear.textContent=d.linear.join", ui)
        self.assertNotIn("innerHTML", ui)
        self.assertNotIn("insertAdjacentHTML", ui)
        self.assertNotIn("document.write", ui)

    def test_keyboard_labels_live_status_focus_and_linear_equivalent_are_explicit(self):
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        for token in (
            "heading.tabIndex=-1",
            "resultHeading.tabIndex=-1",
            "linear.tabIndex=0",
            "aria-live",
            "idLabel.htmlFor='dossier-subject-id'",
            "nameLabel.htmlFor='dossier-display-name'",
            "kindLabel.htmlFor='dossier-kind'",
            "Повний лінійний еквівалент",
            "No cited support available in current scope",
        ):
            self.assertIn(token, ui)

    def test_client_rejects_scope_subject_schema_and_oversize_results(self):
        ui = (FRONTEND / "dossier-ui.js").read_text(encoding="utf-8")
        self.assertIn("d.schema!=='scripture.dossier-view.v1'", ui)
        self.assertIn("d.evidence_scope!=='unlocked_only'", ui)
        self.assertIn("d.subject.subject_id!==request.subject_id", ui)
        self.assertIn("d.rows.length>1000", ui)
        self.assertIn("d.linear.length>2000", ui)
        self.assertIn("code>=0x7f&&code<=0x9f", ui)
        self.assertIn("code===0x2028||code===0x2029", ui)

    @unittest.skipUnless(shutil.which("node"), "node is required for executable Dossier UI lifecycle regression")
    def test_late_completion_is_inert_after_leave_and_after_reopen(self):
        script = textwrap.dedent(
            r"""
            import {readFileSync} from 'node:fs';
            const source=readFileSync(process.argv[1],'utf8');
            const moduleUrl='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
            const {DossierUI}=await import(moduleUrl);

            const resolvers=[];
            const announcements=[];
            const renders=[];
            let focusCount=0;
            let active=true;
            const invoke=(_command,_request)=>new Promise(resolve=>resolvers.push(resolve));
            const ui=new DossierUI({
              invoke,
              announce:text=>announcements.push(text),
              showView:()=>{},
              isActiveView:()=>active,
              enabled:true,
            });
            Object.assign(ui,{
              subjectId:{value:'PERSON:PAUL'},
              displayName:{value:'Paul'},
              kind:{value:'PERSON'},
              submit:{disabled:false},
              status:{textContent:''},
              tbody:{replaceChildren(){}},
              summary:{textContent:''},
              linear:{textContent:''},
              resultHeading:{focus(){focusCount+=1;}},
            });
            ui.render=d=>renders.push(d.subject.display_name);
            const response=name=>({dossier:{
              schema:'scripture.dossier-view.v1',
              subject:{subject_id:name==='Peter'?'PERSON:PETER':'PERSON:PAUL',display_name:name,kind:'PERSON'},
              stated:false,
              status_text:'No cited support available in current scope',
              rows:[],
              linear:['No cited support available in current scope'],
              evidence_scope:'unlocked_only',
            }});
            const assert=(condition,message)=>{if(!condition)throw new Error(message);};

            ui.setVisible(true);
            const left=ui.load();
            assert(resolvers.length===1,'first request did not start');
            active=false;
            ui.setVisible(false);
            resolvers[0](response('Paul'));
            await left;
            assert(renders.length===0,'late completion rendered after leave');
            assert(announcements.length===0,'late completion announced after leave');
            assert(focusCount===0,'late completion moved focus after leave');

            active=true;
            ui.setVisible(true);
            ui.subjectId.value='PERSON:PAUL';ui.displayName.value='Paul';
            const oldRequest=ui.load();
            assert(resolvers.length===2,'old request did not start');
            active=false;
            ui.setVisible(false);
            active=true;
            ui.setVisible(true);
            ui.subjectId.value='PERSON:PETER';ui.displayName.value='Peter';
            const newRequest=ui.load();
            assert(resolvers.length===3,'reopen was blocked by stale promise');
            resolvers[1](response('Paul'));
            await oldRequest;
            assert(renders.length===0,'old request rendered into reopened view');
            assert(announcements.length===0,'old request announced into reopened view');
            assert(focusCount===0,'old request moved focus in reopened view');
            resolvers[2](response('Peter'));
            await newRequest;
            assert(renders.length===1&&renders[0]==='Peter','new request did not exclusively render');
            assert(announcements.length===1,'new request announcement missing or duplicated');
            assert(focusCount===1,'new request focus transition missing or duplicated');
            """
        )
        result = subprocess.run(
            [shutil.which("node"), "--input-type=module", "-e", script, str(FRONTEND / "dossier-ui.js")],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
