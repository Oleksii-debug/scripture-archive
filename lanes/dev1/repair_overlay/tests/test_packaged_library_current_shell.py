from pathlib import Path
import hashlib
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1] / "frontend"
EXPECTED_LIBRARY_UI_BLOB = "471991931544e3c83baaed34cdbfa6806d85bb69"


def git_blob_sha(data: bytes) -> str:
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


class PackagedLibraryCurrentShellTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transport = (ROOT / "transport.js").read_text(encoding="utf-8")
        cls.library = (ROOT / "library-ui.js").read_text(encoding="utf-8")
        cls.compat = (ROOT / "library-shell-compat.js").read_text(encoding="utf-8")
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")

    def test_qualified_library_donor_blob_is_exact(self):
        donor = (ROOT / "library-ui.js").read_text(encoding="utf-8").encode("utf-8")
        self.assertEqual(git_blob_sha(donor), EXPECTED_LIBRARY_UI_BLOB)

    def test_current_transport_preserves_package_loaders_and_composes_coordinator_surfaces(self):
        self.assertIn("export function chooseTransport", self.transport)
        self.assertIn("export async function unwrap", self.transport)
        expected_loaders = {
            "./review-queue-ui.js",
            "./library-ui.js",
            "./library-shell-compat.js",
            "./daily-case-ui.js",
            "./content-pack-manager.js",
            "./evidence-graph-ui.js",
            "./witness-matrix-ui.js",
            "./constructor-v2-ui.js",
            "./speech-ui.js",
        }
        imports = set(re.findall(r"void import\('([^']+)'\)", self.transport))
        self.assertEqual(imports, expected_loaders)
        for loader in expected_loaders:
            self.assertEqual(self.transport.count(f"void import('{loader}')"), 1)
        self.assertIn(
            "void import('./content-pack-manager.js').then(({installContentPackManagerSurface})=>installContentPackManagerSurface());",
            self.transport,
        )
        self.assertIn(
            "void import('./evidence-graph-ui.js').then(({installEvidenceGraphSurface})=>installEvidenceGraphSurface());",
            self.transport,
        )
        self.assertIn(
            "void import('./witness-matrix-ui.js').then(({installWitnessMatrixSurface})=>installWitnessMatrixSurface());",
            self.transport,
        )
        self.assertIn(
            "void import('./speech-ui.js').then(({installSpeechSurface})=>installSpeechSurface());",
            self.transport,
        )
        self.assertIn("import './chronology-lab-ui.js';", self.compat)

    def test_library_calls_only_read_only_canonical_contracts(self):
        commands = set(re.findall(r"api\('([^']+)'", self.library))
        self.assertEqual(commands, {"library.catalog", "library.search"})
        self.assertIn("command !== 'library.catalog' && command !== 'library.search'", self.library)
        for forbidden in ("player.load_node", "player.next", "player.navigate_branch", "authoring.", "settings.set"):
            self.assertNotIn(forbidden, self.library)

    def test_library_source_truth_and_absent_full_text_are_explicit(self):
        for token in (
            "scripture.library.catalog.v1",
            "scripture.library.search.v1",
            "derived_index !== true",
            "source_of_truth !== 'CanonicalContentLoader'",
            "bundled_full_bible_text",
            "text_provider_available",
            "Результати не додають нових source claims",
            "Відсутній текст не вигадується",
        ):
            self.assertIn(token, self.library)

    def test_read_only_library_eligibility_is_fail_closed_and_user_visible(self):
        for token in (
            "requireContentAccess",
            "read_only_qualified_sources",
            "content_access",
            "gradeable_runtime_eligible",
            "Gradeable authority",
            "Library-qualified read-only sources",
            "лише Library, без player/grading",
            "Library також може показувати явно позначені Library-qualified read-only джерела",
            "source_audit_status",
            "Library eligibility не означає завершений independent source audit",
            "source audit: ${row.source_audit_status || 'статус не надано'}",
            "results[${index}].source_audit_status",
            "Source audit: ${row.source_audit_status || 'статус не надано'}",
            "цей запис не є доступним для player або grading",
        ):
            self.assertIn(token, self.library)
        self.assertIn("row.gradeable_runtime_eligible", self.library)
        self.assertIn("data.read_only_qualified_sources.length", self.library)
        self.assertIn("function requireAccessTruth", self.library)
        self.assertIn("content_access/gradeable_runtime_eligible mismatch", self.library)
        self.assertIn("requireReadOnlyAudit: true", self.library)
        self.assertEqual(self.library.count("  requireAccessTruth(row,"), 3)

    def test_access_truth_validators_execute_fail_closed(self):
        runner = r"""
import assert from 'node:assert/strict';
import fs from 'node:fs';

const libraryPath = process.argv[2];
let source = fs.readFileSync(libraryPath, 'utf8');
const transportImport = "import {chooseTransport, unwrap} from './transport.js';";
assert.ok(source.startsWith(transportImport), 'unexpected library-ui import boundary');
source = source.slice(transportImport.length);

const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
const {validateCatalogResponse, validateSearchResponse} = await import(moduleUrl);

const readOnlyMission = {
  campaign_id: 'OT-R06-D4',
  mission_id: 'OT-AB-01',
  title: 'Read-only mission',
  source_audit_status: 'DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING',
  content_access: 'READ_ONLY_LIBRARY',
  gradeable_runtime_eligible: false,
};
const readOnlyCampaign = {
  campaign_id: 'OT-R06-D4',
  title: 'Read-only campaign',
  mission_count: 1,
  machine_node_count: 1,
  content_access: 'READ_ONLY_LIBRARY',
  gradeable_runtime_eligible: false,
};
const validCatalog = {
  schema: 'scripture.library.catalog.v1',
  source_of_truth: 'CanonicalContentLoader',
  derived_index: true,
  bundled_full_bible_text: false,
  text_provider_available: false,
  machine_node_count: 1,
  read_only_qualified_sources: ['OT-R06-D4'],
  campaigns: [readOnlyCampaign],
  missions: [readOnlyMission],
  source_references: ['Genesis 12:1'],
};
assert.equal(validateCatalogResponse(validCatalog), validCatalog);
assert.throws(
  () => validateCatalogResponse({...validCatalog, campaigns: [{...readOnlyCampaign, gradeable_runtime_eligible: true}]}),
  /content_access\/gradeable_runtime_eligible mismatch/
);
assert.throws(
  () => validateCatalogResponse({...validCatalog, missions: [{...readOnlyMission, source_audit_status: null}]}),
  /source_audit_status/
);

const readOnlyResult = {
  kind: 'task',
  id: 'OTAB01-N001',
  campaign_id: 'OT-R06-D4',
  mission_id: 'OT-AB-01',
  title: 'Read-only task',
  snippet: 'Genesis 12:1',
  source_references: ['Genesis 12:1'],
  source_audit_status: 'DEVELOPER_SOURCE_AUDITED / INDEPENDENT_AUDIT_PENDING',
  content_access: 'READ_ONLY_LIBRARY',
  gradeable_runtime_eligible: false,
};
const validSearch = {
  schema: 'scripture.library.search.v1',
  source_of_truth: 'CanonicalContentLoader',
  derived_index: true,
  bundled_full_bible_text: false,
  query: 'Genesis 12:1',
  filters: {campaign_id: 'OT-R06-D4', mission_id: null},
  total: 1,
  results: [readOnlyResult],
};
assert.equal(validateSearchResponse(validSearch), validSearch);
assert.throws(
  () => validateSearchResponse({...validSearch, results: [{...readOnlyResult, content_access: 'GRADEABLE_RUNTIME'}]}),
  /content_access\/gradeable_runtime_eligible mismatch/
);
assert.throws(
  () => validateSearchResponse({...validSearch, results: [{...readOnlyResult, source_audit_status: undefined}]}),
  /source_audit_status/
);
assert.equal(
  validateSearchResponse({
    ...validSearch,
    results: [{
      ...readOnlyResult,
      content_access: 'GRADEABLE_RUNTIME',
      gradeable_runtime_eligible: true,
      source_audit_status: null,
    }],
  }).results[0].gradeable_runtime_eligible,
  true
);
"""
        with tempfile.TemporaryDirectory() as tmp:
            runner_path = Path(tmp) / "validate-library-access.mjs"
            runner_path.write_text(runner, encoding="utf-8")
            completed = subprocess.run(
                ["node", str(runner_path), str(ROOT / "library-ui.js")],
                text=True,
                capture_output=True,
                check=False,
            )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)

    def test_dynamic_content_remains_inert_and_bounded(self):
        self.assertNotIn("innerHTML", self.library)
        self.assertNotIn("insertAdjacentHTML", self.library)
        self.assertIn("textContent", self.library)
        self.assertIn("const SEARCH_LIMIT = 50", self.library)
        self.assertIn("const MAX_RESULT_REFS = 25", self.library)
        self.assertIn("const MAX_FILTER_OPTIONS = 1000", self.library)
        self.assertIn("slice(0, SEARCH_LIMIT)", self.library)
        self.assertIn("slice(0, MAX_RESULT_REFS)", self.library)

    def test_current_shell_compatibility_is_dynamic_not_a_stale_view_list(self):
        self.assertIn("Array.from(main.children)", self.compat)
        self.assertIn("node?.tagName === 'SECTION'", self.compat)
        self.assertIn("node.id !== LIBRARY_VIEW_ID", self.compat)
        self.assertIn("event.target?.closest?.('#nav-library')", self.compat)
        self.assertIn("new MutationObserver", self.compat)
        self.assertIn("subtree: true", self.compat)
        self.assertNotIn("BASE_VIEW_IDS", self.compat)
        self.assertNotIn("innerHTML", self.compat)
        self.assertNotIn("eval(", self.compat)

    def test_existing_current_packaged_views_are_preserved(self):
        for view_id in (
            "home-view",
            "mission-view",
            "player-view",
            "research-view",
            "mastery-view",
            "authoring-view",
            "application-update-view",
        ):
            self.assertIn(f'id="{view_id}"', self.index)
        for script in ("app.js", "mastery.js", "application-update.js"):
            self.assertIn(f'src="{script}"', self.index)

    def test_javascript_syntax(self):
        for path in (
            ROOT / "transport.js",
            ROOT / "library-ui.js",
            ROOT / "library-shell-compat.js",
            ROOT / "daily-case-ui.js",
            ROOT / "chronology-lab-ui.js",
            ROOT / "content-pack-manager.js",
            ROOT / "evidence-graph-ui.js",
            ROOT / "witness-matrix-ui.js",
            ROOT / "constructor-v2-ui.js",
            ROOT / "speech-ui.js",
        ):
            completed = subprocess.run(
                ["node", "--check", str(path)],
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)


if __name__ == "__main__":
    unittest.main()
