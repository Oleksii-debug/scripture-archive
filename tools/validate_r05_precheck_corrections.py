#!/usr/bin/env python3
"""Validate R05 PRE-R05 semantic/evidence correction layers.

Static regression guard. It validates correction semantics and precedence metadata;
it is not a substitute for independent semantic/source audit.
"""
from __future__ import annotations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
NODE_CORR = ROOT / "docs/campaigns/LN/LN-11_CANONICAL_v1.2/PRE_R05_SEMANTIC_CORRECTIONS_v1.0.json"
EV_CORR = ROOT / "docs/evidence/R05_EVIDENCE_PROVENANCE_CORRECTIONS_v0.1.json"

REQUIRED_NODE_IDS = {"LN11-N01","LN11-N02","LN11-N03","LN11-N04","LN11-N07","LN11-N09"}
REQUIRED_EVIDENCE_IDS = {"EVR-R05-0061","EVR-R05-0062","EVR-R05-0063","EVR-R05-0064","EVR-R05-0067","EVR-R05-0069"}
ALLOWED_CONF = {"T1","T2","C1","I1","D1"}
ALLOWED_TX = {"none","TX1"}

def load(p: Path):
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

def require(cond: bool, msg: str, errors: list[str]):
    if not cond:
        errors.append(msg)

def main() -> int:
    errors: list[str] = []
    nc = load(NODE_CORR)
    ec = load(EV_CORR)
    np = nc.get("patches", {})
    ep = ec.get("patches", {})

    require(set(np) == REQUIRED_NODE_IDS, f"node patch set mismatch: {sorted(np)}", errors)
    require(set(ep) == REQUIRED_EVIDENCE_IDS, f"evidence patch set mismatch: {sorted(ep)}", errors)

    for node_id, p in np.items():
        require(p.get("confidence_code") in ALLOWED_CONF or "confidence_code" not in p,
                f"{node_id}: invalid confidence", errors)
        require(p.get("textual_variant_flag") in ALLOWED_TX or "textual_variant_flag" not in p,
                f"{node_id}: invalid TX flag", errors)

    # PRE-R05-001
    for node_id in ("LN11-N02","LN11-N03","LN11-N07"):
        t = json.dumps(np[node_id], ensure_ascii=False)
        require("Jn 18:10" in t, f"{node_id}: John 18:10 missing", errors)
        require("Lk 22:50" in t, f"{node_id}: Luke 22:50 missing", errors)
        require(("Lk 22:51" in t) or ("Luke 22:51" in t), f"{node_id}: Luke 22:51 missing", errors)
        require("right ear" in t.lower(), f"{node_id}: right-ear wording missing", errors)
        require("healing" in t.lower(), f"{node_id}: healing distinction missing", errors)
    t7 = json.dumps(np["LN11-N07"], ensure_ascii=False)
    require("Mt 26:51" in t7 and "Mk 14:47" in t7, "LN11-N07: Matthew/Mark ear boundary missing", errors)

    for ev_id in ("EVR-R05-0062","EVR-R05-0063","EVR-R05-0067"):
        t = json.dumps(ep[ev_id], ensure_ascii=False)
        require("Jn 18:10" in t and "Lk 22:50" in t and (("Lk 22:51" in t) or ("Luke 22:51" in t)),
                f"{ev_id}: corrected right-ear/healing provenance incomplete", errors)

    # PRE-R05-002
    require(np["LN11-N04"].get("textual_variant_flag") == "TX1", "LN11-N04 must be TX1", errors)
    require("NOTICE BEFORE GRADING" in np["LN11-N04"].get("source_scope_visible_to_player",""),
            "LN11-N04 must expose pre-grading TX1 notice", errors)
    require(ep["EVR-R05-0064"].get("textual_variant_flag") == "TX1", "EVR-R05-0064 must be TX1", errors)

    # PRE-R05-003
    require(np["LN11-N09"].get("confidence_code") == "D1", "LN11-N09 must be D1", errors)
    require(ep["EVR-R05-0069"].get("confidence_code") == "D1", "EVR-R05-0069 must be D1", errors)
    require("not established" in np["LN11-N09"].get("accepted_answer","").lower(),
            "LN11-N09 must preserve not-established boundary", errors)

    # PRE-R05-004
    require(np["LN11-N01"].get("confidence_code") == "C1", "LN11-N01 must be C1", errors)
    require(ep["EVR-R05-0061"].get("confidence_code") == "C1", "EVR-R05-0061 must be C1", errors)
    require("direct Scriptural" in np["LN11-N01"].get("source_scope_visible_to_player",""),
            "LN11-N01 must say campaign order is not direct Scripture", errors)

    if errors:
        print("PRE_R05_CORRECTION_ERRORS=", len(errors))
        for e in errors:
            print("ERROR:", e)
        return 1
    print("PRE_R05_CORRECTION_ERRORS=0")
    print("NODE_PATCHES=6")
    print("EVIDENCE_PATCHES=6")
    print("PRE-R05-001..004 STATIC REGRESSION=PASS")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
