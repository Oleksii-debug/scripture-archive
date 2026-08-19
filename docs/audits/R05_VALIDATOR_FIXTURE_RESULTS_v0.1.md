# R05 Validator Fixture Results v0.1

**Date:** 2026-08-19  
**Round:** DEV R05 / independent audit pending

The R05 validator regression suite was executed against a clean archive of current GitHub `main`.

## Fixtures
1. **GOOD baseline:** repaired LN-02 canonical mission is accepted.
2. **BAD R04-class fixture:** one node is mutated to the exact defect class reported by AUDIT R04: generic success/partial/failure feedback plus placeholder H7 `Guided answer with mastery downgrade`. Validator must return non-zero and report the placeholder/generic defect.
3. **OVERLAY repair fixture:** the same bad base node is repaired only through allowed pedagogy overlay keys; effective-node validation must return zero.

## Required result
- GOOD fixture: PASS.
- BAD placeholder fixture: REJECTED.
- OVERLAY repair fixture: PASS.

The executable fixture is `tools/test_validate_canonical_missions_and_nodes.py`.

Static validation is a regression guard only. It does **not** substitute for independent semantic source/pedagogy audit.