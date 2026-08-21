from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripture_archive_runtime.integration_materializer import PackageSpec, materialize_packages
from scripture_archive_runtime.package_adapters import load_package_nodes
from scripture_archive_runtime.strict_conformance import check_nodes_strict


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--d2', required=True)
    p.add_argument('--d3', required=True)
    p.add_argument('--d4', required=True)
    p.add_argument('--out', required=True)
    args = p.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    specs = [
        PackageSpec('D2', args.d2, '65677caba4d73a0a654dc70c63c183864910f5f9d9a44df5f99f12e689660890', '1hRzCKbN3Dhbd3qlti-CGnlYMLi8XdJw1', '08f6f7f0d941397623fc7bd96abf73744c214871',
            ('CHANGED_FILES/docs/campaigns/PA/R06_DEV2_LANE_v1.1/PA_R06_D2_RUNTIME_NODES_v1.0.json',),
            ('CHANGED_FILES/docs/evidence/PA_R06_D2_EVIDENCE_v1.1.json',), 386, 184),
        PackageSpec('D3', args.d3, '9a302d32421ad2c9c704290eec3dbe5d84d28e5cc8c7d41daf0a430df5646913', '10soveW2htOitjEPXIUByjjQIvqykaGpt', '78cb22e4086ca34605aa2dd1506e46059163d1d4',
            ('CHANGED_FILES/docs/campaigns/GW/R06_DEV3_REPAIR_01/GW_NODES_RUNTIME_v1.1.json',),
            ('CHANGED_FILES/docs/campaigns/GW/R06_DEV3_REPAIR_01/GW_EVIDENCE_BOARD_REGISTRY_v1.1.json',), 360, 240),
        PackageSpec('D4', args.d4, '36316fd08a55e8e4a4863bc06ead1f097bd46223be0eaabaf5906306f2d054cf', '1x7j1AMvqn83N1itRahFhRwNzzeyJUj7X', '18753878601cf52dc9ffef8de2c3348332b6861f',
            tuple(f'CHANGED_FILES/docs/campaigns/OT/R06_D4_OT_CANONICAL_v1.0/nodes_part_{i:02d}.json' for i in range(1,6)),
            ('CHANGED_FILES/docs/evidence/OT_R06_D4_EVIDENCE_REGISTRY_v1.0.json',), 450, 90),
    ]
    manifest = materialize_packages(specs, out / 'materialized')
    reports = {}
    for spec in specs:
        nodes = load_package_nodes([out/'materialized'/spec.lane.lower()/'nodes.json'])
        reports[spec.lane] = check_nodes_strict(nodes, lane=spec.lane)
        (out/f'{spec.lane.lower()}_strict_conformance.json').write_text(json.dumps(reports[spec.lane], ensure_ascii=False, indent=2), encoding='utf-8')
    combined_total = sum(r['total'] for r in reports.values())
    combined_pass = sum(r['strict_release_pass_count'] for r in reports.values())
    result = {
        'schema':'R06_DEV5_FINALPREP_GATE_v1',
        'materializer': manifest,
        'lanes': {k:{x:v for x,v in r.items() if x!='blockers'} for k,r in reports.items()},
        'total_nodes':combined_total,
        'strict_release_pass_count':combined_pass,
        'strict_release_blocker_count':combined_total-combined_pass,
        'strict_release_pass': combined_total == combined_pass,
    }
    (out/'finalprep_gate_summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['strict_release_pass'] else 2

if __name__ == '__main__':
    raise SystemExit(main())
