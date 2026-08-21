#!/usr/bin/env python3
from __future__ import annotations
import json,re,sys
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[1]/'docs'/'campaigns'/'PA'/'R06_DEV2_FINALPREP_02'
FIELDS=('player_prompt','success_feedback','partial_feedback','failure_feedback','rejection_reason','functional_nonvisual_equivalent')
BAD_LITERAL=('конкретний твердження','Після після','локальний твердження','чужий свідчення','supported propositions','harmonized over','passage anchor','speaker/recipient','speaker/narrator','source scope','source boundary','source unit','Evidence cards','node grading','canonical evidence','evidence record','source-cited','forced harmonization',' rows','target ','proposition ')
DUP_WORD=re.compile(r'(?iu)(?<![\w])([A-Za-zА-ЯІЇЄҐа-яіїєґ]{3,})(?:\s+|\s*[—–-]\s*)\1(?![\w])')
DUP_PUNCT=re.compile(r'(?<!\.)\.\.|,,|;;|::|!!|\?\?')
errs=[]; scanned=0; nodes=0
for p in sorted(ROOT.glob('PA??_CANONICAL_v1.1.json')):
    d=json.loads(p.read_text(encoding='utf-8'))
    nodes += len(d['nodes'])
    for n in d['nodes']:
        texts=[]
        for f in FIELDS:
            if isinstance(n.get(f),str): texts.append((f,n[f]))
        for hk,hv in (n.get('hints') or {}).items():
            if isinstance(hv,str): texts.append((f'hints.{hk}',hv))
        for loc,s in texts:
            scanned += 1
            low=s.casefold()
            for bad in BAD_LITERAL:
                if bad.casefold() in low: errs.append(f"{n['node_id']} {loc}: forbidden generated phrase {bad!r}")
            m=DUP_WORD.search(s)
            if m: errs.append(f"{n['node_id']} {loc}: doubled word {m.group(0)!r}")
            m=DUP_PUNCT.search(s)
            if m: errs.append(f"{n['node_id']} {loc}: doubled punctuation {m.group(0)!r}")
print(json.dumps({'nodes':nodes,'text_fields_scanned':scanned,'errors':len(errs),'error_list':errs[:100]},ensure_ascii=False,indent=2))
raise SystemExit(1 if errs else 0)
