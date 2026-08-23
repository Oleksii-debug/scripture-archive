from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

DELIVERY_READINESS_INPUT_SCHEMA = "R06_STAGE05_DELIVERY_READINESS_INPUT_v1"
DELIVERY_READINESS_RESULT_SCHEMA = "R06_STAGE05_DELIVERY_READINESS_RESULT_v1"
_SHA1_RE = re.compile(r"^[0-9a-f]{40}$")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_FILENAME_RE = re.compile(r"^[^/\\]+\.zip$")


class IntegrationReadinessError(ValueError):
    """Raised when readiness input itself is malformed or ambiguous."""


@dataclass(frozen=True)
class ExpectedPackage:
    filename: str
    required_head_branches: tuple[str, ...] = ()


@dataclass(frozen=True)
class LaneReadinessSpec:
    lane: str
    required_branches: tuple[str, ...]
    required_packages: tuple[ExpectedPackage, ...]


@dataclass(frozen=True)
class PackageEvidence:
    filename: str
    drive_id: str
    sha256: str
    raw_readback_pass: bool
    zip_crc_pass: bool
    pinned_heads: Mapping[str, str]


@dataclass(frozen=True)
class LaneDeliveryObservation:
    lane: str
    report_status: str
    report_terminal: bool
    report_readback_pass: bool
    integration_allowed: bool
    reported_heads: Mapping[str, str]
    live_heads: Mapping[str, str]
    packages: Mapping[str, PackageEvidence]
    materialization_manifest_verified: bool
    final_input_validation_passed: bool


@dataclass(frozen=True)
class LaneReadinessResult:
    lane: str
    ready: bool
    blockers: tuple[str, ...]
    details: tuple[str, ...]
    live_heads: Mapping[str, str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "lane": self.lane,
            "ready": self.ready,
            "blockers": list(self.blockers),
            "details": list(self.details),
            "live_heads": dict(sorted(self.live_heads.items())),
        }


def _clean(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise IntegrationReadinessError(f"{label} must be a non-empty string")
    return value.strip()


def _validate_head(value: Any, label: str) -> str:
    text = _clean(value, label).lower()
    if not _SHA1_RE.fullmatch(text):
        raise IntegrationReadinessError(f"{label} must be an exact 40-character Git SHA")
    return text


def _validate_filename(value: Any, label: str) -> str:
    text = _clean(value, label)
    if not _FILENAME_RE.fullmatch(text) or text in {".", ".."}:
        raise IntegrationReadinessError(f"{label} must be an exact ZIP basename")
    return text


def _validate_sha256(value: Any, label: str) -> str:
    text = _clean(value, label).lower()
    if not _SHA256_RE.fullmatch(text):
        raise IntegrationReadinessError(f"{label} must be an exact SHA256 hex digest")
    return text


def _normalized_head_map(values: Mapping[str, str], label: str) -> dict[str, str]:
    if not isinstance(values, Mapping):
        raise IntegrationReadinessError(f"{label} must be an object")
    out: dict[str, str] = {}
    for raw_branch, raw_head in values.items():
        branch = _clean(raw_branch, f"{label} branch")
        if branch in out:
            raise IntegrationReadinessError(f"duplicate branch in {label}: {branch}")
        out[branch] = _validate_head(raw_head, f"{label}[{branch}]")
    return dict(sorted(out.items()))


def _spec_map(specs: Sequence[LaneReadinessSpec]) -> dict[str, LaneReadinessSpec]:
    out: dict[str, LaneReadinessSpec] = {}
    for spec in specs:
        lane = _clean(spec.lane, "spec.lane")
        if lane in out:
            raise IntegrationReadinessError(f"duplicate readiness spec for lane {lane}")
        branches = tuple(_clean(v, f"{lane}.required_branches") for v in spec.required_branches)
        if not branches or len(set(branches)) != len(branches):
            raise IntegrationReadinessError(f"{lane}.required_branches must be unique and non-empty")
        package_names = [_validate_filename(pkg.filename, f"{lane}.required_package") for pkg in spec.required_packages]
        for pkg in spec.required_packages:
            unknown = sorted(set(pkg.required_head_branches) - set(branches))
            if unknown:
                raise IntegrationReadinessError(f"{lane}.{pkg.filename} pins branches outside lane spec: {unknown}")
        if not package_names or len(set(package_names)) != len(package_names):
            raise IntegrationReadinessError(f"{lane}.required_packages must be unique and non-empty")
        out[lane] = spec
    if not out:
        raise IntegrationReadinessError("at least one required lane is needed")
    return out


def _observation_map(observations: Sequence[LaneDeliveryObservation]) -> dict[str, LaneDeliveryObservation]:
    out: dict[str, LaneDeliveryObservation] = {}
    for observation in observations:
        lane = _clean(observation.lane, "observation.lane")
        if lane in out:
            raise IntegrationReadinessError(f"duplicate observation for lane {lane}")
        out[lane] = observation
    return out


def evaluate_lane_readiness(spec: LaneReadinessSpec, observation: LaneDeliveryObservation) -> LaneReadinessResult:
    if spec.lane != observation.lane:
        raise IntegrationReadinessError(f"lane mismatch: spec={spec.lane!r}, observation={observation.lane!r}")

    blockers: set[str] = set()
    details: list[str] = []
    reported = _normalized_head_map(observation.reported_heads, f"{spec.lane}.reported_heads")
    live = _normalized_head_map(observation.live_heads, f"{spec.lane}.live_heads")

    if not observation.report_terminal:
        blockers.add("REPORT_NOT_TERMINAL")
        details.append(f"report status is {observation.report_status!r} and is not explicitly terminal")
    if not observation.report_readback_pass:
        blockers.add("REPORT_READBACK_MISSING")
        details.append("dedicated LATEST_REPORT readback is not PASS")
    if not observation.integration_allowed:
        blockers.add("INTEGRATION_NOT_ALLOWED")
        details.append("lane has not explicitly authorized integration consumption")

    for branch in spec.required_branches:
        if branch not in reported:
            blockers.add("REPORT_HEAD_MISSING")
            details.append(f"report does not pin required branch {branch}")
        if branch not in live:
            blockers.add("LIVE_HEAD_MISSING")
            details.append(f"live GitHub head is missing for required branch {branch}")
        if branch in reported and branch in live and reported[branch] != live[branch]:
            blockers.add("REPORT_HEAD_STALE")
            details.append(f"{branch}: report {reported[branch]} != live {live[branch]}")

    package_by_name: dict[str, PackageEvidence] = {}
    if not isinstance(observation.packages, Mapping):
        raise IntegrationReadinessError(f"{spec.lane}.packages must be an object")
    for key, evidence in observation.packages.items():
        name = _validate_filename(key, f"{spec.lane}.packages key")
        if not isinstance(evidence, PackageEvidence):
            raise IntegrationReadinessError(f"{spec.lane}.packages[{name}] must be PackageEvidence")
        if evidence.filename != name:
            raise IntegrationReadinessError(f"package key/name mismatch for {name}")
        package_by_name[name] = evidence

    for expected in spec.required_packages:
        evidence = package_by_name.get(expected.filename)
        if evidence is None:
            blockers.add("PACKAGE_MISSING")
            details.append(f"required package absent: {expected.filename}")
            continue
        try:
            _clean(evidence.drive_id, f"{expected.filename}.drive_id")
            _validate_sha256(evidence.sha256, f"{expected.filename}.sha256")
            pinned = _normalized_head_map(evidence.pinned_heads, f"{expected.filename}.pinned_heads")
        except IntegrationReadinessError as exc:
            blockers.add("PACKAGE_EVIDENCE_INVALID")
            details.append(str(exc))
            continue
        if not evidence.raw_readback_pass:
            blockers.add("PACKAGE_READBACK_MISSING")
            details.append(f"raw Drive readback is not PASS: {expected.filename}")
        if not evidence.zip_crc_pass:
            blockers.add("PACKAGE_INTEGRITY_UNVERIFIED")
            details.append(f"ZIP CRC/integrity is not PASS: {expected.filename}")
        for branch in expected.required_head_branches:
            if branch not in pinned:
                blockers.add("PACKAGE_HEAD_MISSING")
                details.append(f"{expected.filename} does not pin required branch {branch}")
                continue
            if branch in live and pinned[branch] != live[branch]:
                blockers.add("PACKAGE_HEAD_STALE")
                details.append(f"{expected.filename}:{branch}: pinned {pinned[branch]} != live {live[branch]}")

    if not observation.materialization_manifest_verified:
        blockers.add("MATERIALIZATION_MANIFEST_UNVERIFIED")
        details.append("record-hash materialization manifest/readback has not passed")
    if not observation.final_input_validation_passed:
        blockers.add("FINAL_INPUT_UNVERIFIED")
        details.append("terminal validate_final_input gate has not passed")

    ordered_blockers = tuple(sorted(blockers))
    return LaneReadinessResult(
        lane=spec.lane,
        ready=not ordered_blockers,
        blockers=ordered_blockers,
        details=tuple(details),
        live_heads=live,
    )


def evaluate_stage05_readiness(
    specs: Sequence[LaneReadinessSpec],
    observations: Sequence[LaneDeliveryObservation],
) -> dict[str, Any]:
    required = _spec_map(specs)
    observed = _observation_map(observations)

    missing_lanes = sorted(set(required) - set(observed))
    extra_lanes = sorted(set(observed) - set(required))
    lane_results: list[LaneReadinessResult] = []
    global_blockers: set[str] = set()
    global_details: list[str] = []

    if missing_lanes:
        global_blockers.add("REQUIRED_LANE_MISSING")
        global_details.append(f"missing required lanes: {', '.join(missing_lanes)}")
    if extra_lanes:
        global_blockers.add("UNEXPECTED_LANE_OBSERVATION")
        global_details.append(f"unexpected lane observations: {', '.join(extra_lanes)}")

    for lane in sorted(set(required) & set(observed)):
        result = evaluate_lane_readiness(required[lane], observed[lane])
        lane_results.append(result)
        global_blockers.update(result.blockers)

    ready = not global_blockers and len(lane_results) == len(required)
    return {
        "schema": DELIVERY_READINESS_RESULT_SCHEMA,
        "ready_for_final_1196_gate": ready,
        "required_lanes": sorted(required),
        "lane_results": [result.as_dict() for result in lane_results],
        "blocker_count": sum(len(result.blockers) for result in lane_results)
        + len([code for code in global_blockers if code in {"REQUIRED_LANE_MISSING", "UNEXPECTED_LANE_OBSERVATION"}]),
        "blocker_codes": sorted(global_blockers),
        "details": global_details,
    }


def readiness_from_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        raise IntegrationReadinessError("readiness payload must be an object")
    if payload.get("schema") != DELIVERY_READINESS_INPUT_SCHEMA:
        raise IntegrationReadinessError("unsupported readiness input schema")

    raw_specs = payload.get("specs")
    raw_observations = payload.get("observations")
    if not isinstance(raw_specs, list) or not isinstance(raw_observations, list):
        raise IntegrationReadinessError("specs and observations must be arrays")

    specs: list[LaneReadinessSpec] = []
    for raw in raw_specs:
        if not isinstance(raw, Mapping):
            raise IntegrationReadinessError("each readiness spec must be an object")
        raw_packages = raw.get("required_packages")
        if not isinstance(raw_packages, list):
            raise IntegrationReadinessError("required_packages must be an array")
        packages: list[ExpectedPackage] = []
        for package in raw_packages:
            if not isinstance(package, Mapping):
                raise IntegrationReadinessError("required package spec must be an object")
            required_heads = package.get("required_head_branches", [])
            if not isinstance(required_heads, list):
                raise IntegrationReadinessError("required_head_branches must be an array")
            packages.append(
                ExpectedPackage(
                    filename=_validate_filename(package.get("filename"), "required package filename"),
                    required_head_branches=tuple(_clean(v, "required_head_branch") for v in required_heads),
                )
            )
        branches = raw.get("required_branches")
        if not isinstance(branches, list):
            raise IntegrationReadinessError("required_branches must be an array")
        specs.append(
            LaneReadinessSpec(
                lane=_clean(raw.get("lane"), "spec.lane"),
                required_branches=tuple(_clean(v, "required_branch") for v in branches),
                required_packages=tuple(packages),
            )
        )

    observations: list[LaneDeliveryObservation] = []
    for raw in raw_observations:
        if not isinstance(raw, Mapping):
            raise IntegrationReadinessError("each lane observation must be an object")
        raw_packages = raw.get("packages", {})
        if not isinstance(raw_packages, Mapping):
            raise IntegrationReadinessError("observation.packages must be an object")
        package_map: dict[str, PackageEvidence] = {}
        for name, package in raw_packages.items():
            if not isinstance(package, Mapping):
                raise IntegrationReadinessError("package evidence must be an object")
            pinned = package.get("pinned_heads", {})
            if not isinstance(pinned, Mapping):
                raise IntegrationReadinessError("package pinned_heads must be an object")
            package_name = _validate_filename(name, "package key")
            package_map[package_name] = PackageEvidence(
                filename=_validate_filename(package.get("filename", name), "package filename"),
                drive_id=_clean(package.get("drive_id"), "package drive_id"),
                sha256=_validate_sha256(package.get("sha256"), "package sha256"),
                raw_readback_pass=package.get("raw_readback_pass") is True,
                zip_crc_pass=package.get("zip_crc_pass") is True,
                pinned_heads={str(k): str(v) for k, v in pinned.items()},
            )
        reported_raw = raw.get("reported_heads") or {}
        live_raw = raw.get("live_heads") or {}
        if not isinstance(reported_raw, Mapping) or not isinstance(live_raw, Mapping):
            raise IntegrationReadinessError("reported_heads and live_heads must be objects")
        observations.append(
            LaneDeliveryObservation(
                lane=_clean(raw.get("lane"), "observation.lane"),
                report_status=_clean(raw.get("report_status"), "report_status"),
                report_terminal=raw.get("report_terminal") is True,
                report_readback_pass=raw.get("report_readback_pass") is True,
                integration_allowed=raw.get("integration_allowed") is True,
                reported_heads={str(k): str(v) for k, v in reported_raw.items()},
                live_heads={str(k): str(v) for k, v in live_raw.items()},
                packages=package_map,
                materialization_manifest_verified=raw.get("materialization_manifest_verified") is True,
                final_input_validation_passed=raw.get("final_input_validation_passed") is True,
            )
        )

    return evaluate_stage05_readiness(specs, observations)
