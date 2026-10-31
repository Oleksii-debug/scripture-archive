# R06 DEV3 — Gospel quality + contract repair 01

Base lane HEAD: `1a54ae3f4002cabced8c22d4830ce392c571c0a5`.
Repair branch: `r06-dev3-gospels-repair-01`.
Historical/main R05 is not promoted by this lane.

## Scope
This repair preserves the existing 360 Gospel candidate nodes and addresses pre-integration findings R06-PRE-005, R06-PRE-006, R06-PRE-008 and R06-PRE-009 without changing Gospel source truth, confidence codes, TX1 assignments or evidence provenance.

## Repaired corpus
- missions: 15
- nodes: 360
- evidence records retained: 240
- task types retained: 12
- confidence retained: T1 242 / T2 108 / D1 10
- TX1 retained: 22
- duplicated Gospel-name artifacts: 0
- generic equivalence-policy accepted variants: 0
- grading objects: 360/360
- runtime submission examples: 360/360
- success feedback unique: 360/360
- partial feedback unique: 360/360
- failure feedback unique: 360/360
- each hint level H1..H7 unique: 360/360

## Runtime contract proof
Using the exact D5 package SHA-256 `89e82fe87d2b8f384ca9c882515eb6ed3ebd0aa256573c8b4ea575a6ba140c1a`:
- current D5 `ContentRepository.from_json_files` loads the repaired top-level nodes file: 360/360;
- current D5 registry grades all already-supported DEV3 task nodes: 285 CORRECT / 0 PARTIAL / 0 INCORRECT;
- the remaining 75 are exactly the known unsupported mappings: SPEAKER_RECIPIENT 60 and PARALLEL_WITNESS_COMPARE 15;
- registering those two types through D5's existing public `GraderRegistry.register` mechanism (`grade_matching` for speaker/recipient; `grade_single_choice` for parallel-witness witness-label selection) yields 360/360 CORRECT without modifying D5 source.

Permanent registration remains DEV5/integration responsibility, so this lane does not claim the runtime defect itself independently closed.

## Canonical delivery
The complete repaired JSON, runtime-loadable top-level node materialization, answer contract, validators, test evidence and reports are delivered in the non-overwriting Drive package `DEV_LANE_SCRIPTURE_R06_D3_REPAIR_01.zip` after final package readback.
