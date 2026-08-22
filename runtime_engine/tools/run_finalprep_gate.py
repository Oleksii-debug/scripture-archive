from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripture_archive_runtime.integration_materializer import PackageSpec, materialize_packages
from scripture_archive_runtime.package_adapters import load_package_nodes
from scripture_archive_runtime.strict_conformance import check_nodes_strict


def current_closure_specs(d2: str, d3: str, d4: str) -> list[PackageSpec]:
    return [
        PackageSpec(
            'D2', d2,
            '1aa4ac4fb0476dd5b58a5bfe396af4890e9e9f5288b2cc904526162123c0cd6e',
            '1WxlVVZDqXcCMwkcgZIL3viZJrDAT3fFN',
            '5f5a869d0a2313c10fa2d0740080b664de6d9caa',
            ('CANONICAL_MATERIALIZATION/PA_R06_D2_RUNTIME_NODES_v1.0.json',),
            ('CANONICAL_MATERIALIZATION/PA_R06_D2_EVIDENCE_v1.1.json',), 386, 184,
        ),
        PackageSpec(
            'D3', d3,
            '9a302d32421ad2c9c704290eec3dbe5d84d28e5cc8c7d41daf0a430df5646913',
            '10soveW2htOitjEPXIUByjjQIvqykaGpt',
            '78cb22e4086ca34605aa2dd1506e46059163d1d4',
            ('CHANGED_FILES/docs/campaigns/GW/R06_DEV3_REPAIR_01/GW_NODES_RUNTIME_v1.1.json',),
            ('CHANGED_FILES/docs/campaigns/GW/R06_DEV3_REPAIR_01/GW_EVIDENCE_BOARD_REGISTRY_v1.1.json',), 360, 240,
        ),
        PackageSpec(
            'D4', d4,
            'e8b008c31462d7ed9388a7a84f73bb8666c8449181000751e9da45c2468779c9',
            '188Pswz0qdGZJ5h4gyM8KPpQUfTGGr0y6',
            '85b7ee6990f966a29f7bf1a6dd712e60c1f6026c',
            tuple(f'docs/campaigns/OT/R06_D4_OT_CANONICAL_v1.0/nodes_part_{i:02d}.json' for i in range(1, 6)),
            ('docs/evidence/OT_R06_D4_EVIDENCE_REGISTRY_v1.0.json',), 450, 90,
        ),
    ]


def specs_from_json(path: str) -> list[PackageSpec]:
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    rows = data.get('packages') if isinstance(data, dict) else data
    if not isinstance(rows, list) or not rows:
        raise ValueError('spec JSON must contain a non-empty packages list')
    result = []
    for row in rows:
        item = dict(row)
        item['node_members'] = tuple(item['node_members'])
        item['evidence_members'] = tuple(item['evidence_members'])
        result.append(PackageSpec(**item))
    return result


def main() -> int:
    p = argparse.ArgumentParser(description='R06 DEV5 closure strict provenance + materialization gate')
    p.add_argument('--d2')
    p.add_argument('--d3')
    p.add_argument('--d4')
    p.add_argument('--specs-json', help='Exact hash-pinned PackageSpec list; preferred for later CLOSURE_03 packages')
    p.add_argument('--out', required=True)
    args = p.parse_args()
    if args.specs_json:
        specs = specs_from_json(args.specs_json)
    else:
        if not all((args.d2, args.d3, args.d4)):
            p.error('provide --specs-json or all of --d2 --d3 --d4')
        specs = current_closure_specs(args.d2, args.d3, args.d4)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = materialize_packages(specs, out / 'materialized')
    reports = {}
    for spec in specs:
        nodes = load_package_nodes([out / 'materialized' / spec.lane.lower() / 'nodes.json'])
        reports[spec.lane] = check_nodes_strict(nodes, lane=spec.lane)
        (out / f'{spec.lane.lower()}_strict_conformance.json').write_text(
            json.dumps(reports[spec.lane], ensure_ascii=False, indent=2), encoding='utf-8'
        )
    total = sum(r['total'] for r in reports.values())
    passed = sum(r['strict_release_pass_count'] for r in reports.values())
    result = {
        'schema': 'R06_DEV5_CLOSURE03_GATE_v1',
        'materializer': manifest,
        'lanes': {k: {x: v for x, v in r.items() if x not in {'blockers', 'items'}} for k, r in reports.items()},
        'total_nodes': total,
        'strict_release_pass_count': passed,
        'strict_release_blocker_count': total - passed,
        'strict_release_pass': total == passed,
    }
    (out / 'closure03_gate_summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['strict_release_pass'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
