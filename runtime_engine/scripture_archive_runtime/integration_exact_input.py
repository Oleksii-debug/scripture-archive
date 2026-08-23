from __future__ import annotations

import copy
import re
from typing import Any, Mapping

from .integration_delivery_readiness import (
    DELIVERY_READINESS_INPUT_SCHEMA,
    IntegrationReadinessError,
    readiness_from_payload,
)

EXACT_DELIVERY_INPUT_SCHEMA = "R06_STAGE05_EXACT_DELIVERY_INPUT_v1"
EXACT_DELIVERY_RESULT_SCHEMA = "R06_STAGE05_EXACT_DELIVERY_RESULT_v1"
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _clean(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise IntegrationReadinessError(f"{label} must be a non-empty string")
    return value.strip()


def _sha256(value: Any, label: str) -> str:
    text = _clean(value, label).lower()
    if not _SHA256_RE.fullmatch(text):
        raise IntegrationReadinessError(f"{label} must be an exact SHA256 hex digest")
    return text


def _expected_packages(payload: Mapping[str, Any]) -> dict[str, dict[str, tuple[str, str]]]:
    raw_specs = payload.get("specs")
    if not isinstance(raw_specs, list):
        raise IntegrationReadinessError("specs must be an array")

    expected: dict[str, dict[str, tuple[str, str]]] = {}
    for raw_spec in raw_specs:
        if not isinstance(raw_spec, Mapping):
            raise IntegrationReadinessError("each readiness spec must be an object")
        lane = _clean(raw_spec.get("lane"), "spec.lane")
        if lane in expected:
            raise IntegrationReadinessError(f"duplicate readiness spec for lane {lane}")
        raw_packages = raw_spec.get("required_packages")
        if not isinstance(raw_packages, list) or not raw_packages:
            raise IntegrationReadinessError(f"{lane}.required_packages must be a non-empty array")

        lane_packages: dict[str, tuple[str, str]] = {}
        for raw_package in raw_packages:
            if not isinstance(raw_package, Mapping):
                raise IntegrationReadinessError(f"{lane}.required_packages entries must be objects")
            filename = _clean(raw_package.get("filename"), f"{lane}.required_package.filename")
            if filename in lane_packages:
                raise IntegrationReadinessError(f"duplicate required package for {lane}: {filename}")
            expected_drive_id = _clean(
                raw_package.get("expected_drive_id"),
                f"{lane}.{filename}.expected_drive_id",
            )
            expected_sha256 = _sha256(
                raw_package.get("expected_sha256"),
                f"{lane}.{filename}.expected_sha256",
            )
            lane_packages[filename] = (expected_drive_id, expected_sha256)
        expected[lane] = lane_packages
    return expected


def _identity_checks(
    payload: Mapping[str, Any],
    expected: Mapping[str, Mapping[str, tuple[str, str]]],
) -> list[dict[str, Any]]:
    raw_observations = payload.get("observations")
    if not isinstance(raw_observations, list):
        raise IntegrationReadinessError("observations must be an array")

    results: list[dict[str, Any]] = []
    seen_lanes: set[str] = set()
    for raw_observation in raw_observations:
        if not isinstance(raw_observation, Mapping):
            raise IntegrationReadinessError("each lane observation must be an object")
        lane = _clean(raw_observation.get("lane"), "observation.lane")
        if lane in seen_lanes:
            raise IntegrationReadinessError(f"duplicate observation for lane {lane}")
        seen_lanes.add(lane)

        blockers: set[str] = set()
        details: list[str] = []
        expected_lane = expected.get(lane)
        if expected_lane is None:
            # Base readiness owns the canonical unexpected-lane failure. Keep the
            # strict layer deterministic without inventing package expectations.
            results.append({"lane": lane, "ready": True, "blockers": [], "details": []})
            continue

        raw_packages = raw_observation.get("packages")
        if not isinstance(raw_packages, Mapping):
            raise IntegrationReadinessError(f"{lane}.packages must be an object")

        actual_names = {str(name) for name in raw_packages}
        unexpected = sorted(actual_names - set(expected_lane))
        if unexpected:
            blockers.add("UNEXPECTED_PACKAGE_EVIDENCE")
            details.append(f"unexpected package evidence: {', '.join(unexpected)}")

        for filename, (expected_drive_id, expected_sha256) in sorted(expected_lane.items()):
            raw_evidence = raw_packages.get(filename)
            if raw_evidence is None:
                # PACKAGE_MISSING is emitted by the base readiness gate.
                continue
            if not isinstance(raw_evidence, Mapping):
                raise IntegrationReadinessError(f"{lane}.packages[{filename}] must be an object")

            actual_drive_id = _clean(raw_evidence.get("drive_id"), f"{lane}.{filename}.drive_id")
            actual_sha256 = _sha256(raw_evidence.get("sha256"), f"{lane}.{filename}.sha256")
            if actual_drive_id != expected_drive_id:
                blockers.add("PACKAGE_DRIVE_ID_MISMATCH")
                details.append(
                    f"{filename}: observed Drive ID {actual_drive_id!r} != expected {expected_drive_id!r}"
                )
            if actual_sha256 != expected_sha256:
                blockers.add("PACKAGE_SHA256_MISMATCH")
                details.append(
                    f"{filename}: observed SHA256 {actual_sha256} != expected {expected_sha256}"
                )

        ordered = sorted(blockers)
        results.append(
            {
                "lane": lane,
                "ready": not ordered,
                "blockers": ordered,
                "details": details,
            }
        )
    return sorted(results, key=lambda item: item["lane"])


def _base_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    base = copy.deepcopy(dict(payload))
    base["schema"] = DELIVERY_READINESS_INPUT_SCHEMA
    raw_specs = base.get("specs")
    if isinstance(raw_specs, list):
        for raw_spec in raw_specs:
            if not isinstance(raw_spec, dict):
                continue
            raw_packages = raw_spec.get("required_packages")
            if not isinstance(raw_packages, list):
                continue
            for raw_package in raw_packages:
                if isinstance(raw_package, dict):
                    raw_package.pop("expected_drive_id", None)
                    raw_package.pop("expected_sha256", None)
    return base


def exact_readiness_from_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Evaluate Stage05 delivery readiness with exact package identity binding.

    This is a strict orchestration layer over the existing delivery-readiness gate.
    It never infers package identity from filenames, branch heads, or Drive state:
    the expected Drive ID and SHA256 must be supplied explicitly in each required
    package spec, and the observed package must match both exactly.
    """

    if not isinstance(payload, Mapping):
        raise IntegrationReadinessError("exact readiness payload must be an object")
    if payload.get("schema") != EXACT_DELIVERY_INPUT_SCHEMA:
        raise IntegrationReadinessError("unsupported exact readiness input schema")

    expected = _expected_packages(payload)
    identity_results = _identity_checks(payload, expected)
    base_result = readiness_from_payload(_base_payload(payload))

    identity_codes: set[str] = set()
    identity_blocker_count = 0
    for result in identity_results:
        identity_codes.update(result["blockers"])
        identity_blocker_count += len(result["blockers"])

    blocker_codes = sorted(set(base_result.get("blocker_codes", [])) | identity_codes)
    ready = bool(base_result.get("ready_for_final_1196_gate")) and not identity_codes
    return {
        "schema": EXACT_DELIVERY_RESULT_SCHEMA,
        "ready_for_final_1196_gate": ready,
        "blocker_count": int(base_result.get("blocker_count", 0)) + identity_blocker_count,
        "blocker_codes": blocker_codes,
        "package_identity_results": identity_results,
        "base_readiness": base_result,
    }
