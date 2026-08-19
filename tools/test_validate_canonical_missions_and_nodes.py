#!/usr/bin/env python3
from __future__ import annotations
import copy, json, shutil, subprocess, sys, tempfile
from pathlib import Path

REPO=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]
VALIDATOR=REPO/'tools'/'validate_canonical_missions_and_nodes.py'
SOURCE=REPO/'docs'/'campaigns'/'LN'/'LN-02_CANONICAL_v1.2'


def run(root:Path):
    p=subprocess.run([sys.executable,str(VALIDATOR),str(root)],text=True,capture_output=True)
    return p.returncode,p.stdout+p.stderr


def main():
    with tempfile.TemporaryDirectory(prefix='r05_validator_fixture_') as td:
        td=Path(td)
        # GOOD baseline.
        good=td/'good'/'LN-02_CANONICAL_v1.2'; good.parent.mkdir(parents=True); shutil.copytree(SOURCE,good)
        rc_good,out_good=run(td/'good')
        if rc_good!=0:
            print('GOOD_FIXTURE_FAIL'); print(out_good); return 1

        # BAD: inject exactly the R04 class of defect.
        bad=td/'bad'/'LN-02_CANONICAL_v1.2'; bad.parent.mkdir(parents=True); shutil.copytree(SOURCE,bad)
        idx=json.loads((bad/'MISSION_INDEX.json').read_text(encoding='utf-8'))
        nf=bad/idx['node_files'][0]; nd=json.loads(nf.read_text(encoding='utf-8'))
        n=nd['nodes'][0]
        original={k:copy.deepcopy(n[k]) for k in ['success_feedback','partial_feedback','failure_feedback','hints','on_hint_threshold','mastery_mode']}
        n['success_feedback']='Відповідь джерельно коректна.'
        n['partial_feedback']='Виправте лише неточний елемент.'
        n['failure_feedback']='Перечитайте вказаний уривок і повторіть.'
        n['hints']['H7']='Guided answer with mastery downgrade'
        nf.write_text(json.dumps(nd,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        rc_bad,out_bad=run(td/'bad')
        if rc_bad==0 or ('placeholder H7' not in out_bad and 'generic feedback placeholder' not in out_bad):
            print('BAD_FIXTURE_NOT_REJECTED'); print(out_bad); return 1

        # OVERLAY REPAIR: same bad base, repaired only through allowed overlay keys.
        repaired=td/'overlay'/'LN-02_CANONICAL_v1.2'; repaired.parent.mkdir(parents=True); shutil.copytree(bad,repaired)
        ovdir=td/'overlay'/'R05_PEDAGOGY_OVERLAYS'; ovdir.mkdir()
        chunk='fixture_overlay.json'
        (ovdir/'R05_PEDAGOGY_OVERLAY_INDEX.json').write_text(json.dumps({'chunks':[chunk]},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (ovdir/chunk).write_text(json.dumps({'schema_version':'CONTENT_NODE_PEDAGOGY_OVERLAY_v1.0','patches':{n['node_id']:original}},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        rc_overlay,out_overlay=run(td/'overlay')
        if rc_overlay!=0:
            print('OVERLAY_FIXTURE_FAIL'); print(out_overlay); return 1

        print('GOOD_FIXTURE=PASS')
        print('BAD_PLACEHOLDER_FIXTURE=REJECTED')
        print('OVERLAY_REPAIR_FIXTURE=PASS')
        return 0

if __name__=='__main__': raise SystemExit(main())
