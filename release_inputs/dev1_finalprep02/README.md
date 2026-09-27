# DEV1 FINALPREP02 resolved-source build baseline

This directory is the immutable release-build baseline for DEV01 qualification. It was generated only from the canonical readable resolved-source state in the existing Drive handoff; it does **not** introduce or edit Scripture/content truth.

- Drive package: `DEV_LANE_SCRIPTURE_R06_D1_FINALPREP_02.zip`
- Drive file id: `18a3C0tovfcI9uYBLJ_JUCDDi04anb1oo`
- Drive package SHA256: `3d68995a25f61fc9c49735659bb5a0bc58652e76c31c01cc09ae4cfe3a3eb62a`
- Canonical manifest schema: `DEV1_RESOLVED_SOURCE_MANIFEST_v1`
- Canonical manifest file count: `63`
- Canonical manifest aggregate SHA256: `64358455c191e990f31b0d391fa4d05952f476f2b34f9a5bf5781695db3c2497`
- Deterministic repository source archive SHA256: `10fbd546ff4d985465b85b99f4f64bff95d9ec8b1f27132c6d21b4930c344c35`
- Archive entries: `63`
- Archive root: `r06_platform/`

The deterministic archive was built after verifying every resolved source file byte-for-byte against the 63-file canonical manifest. ZIP CRC validation passes. CI must still run the repository fail-closed archive verifier before extraction and must then apply the readable `lanes/dev1/repair_overlay` as the next layer.

Historical `lanes/dev1/source_parts` remain recovery-only evidence. Their current reconstructed ZIP is CRC-corrupt at `r06_platform/frontend/authoring.js`, so those historical recovery bytes are intentionally no longer authoritative release-build input. Do not weaken CRC/path/SHA checks to make that recovery archive pass.
