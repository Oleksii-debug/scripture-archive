import hashlib
import json
import shutil
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path

from scripture_archive_platform.application.service import PlatformApplication
from scripture_archive_platform.content.scripture_text import (
    BundledScriptureText,
    EXPECTED_ARCHIVE_SHA256,
    EXPECTED_LICENSE,
    EXPECTED_REAUDIT_LINE_SHA256,
    EXPECTED_SOURCE_SITE,
    EXPECTED_SOURCE_URL,
    EXPECTED_TRANSLATION_NAME,
    EXPECTED_VPL_SHA256,
)
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.transport.contracts import ALLOWLISTED_COMMANDS


class _BootstrapOnlyLoader:
    """Provide only the canonical bootstrap dependency this transport test needs."""

    def list_campaigns(self):
        return []


class BundledScriptureTextTests(unittest.TestCase):
    def test_exact_pinned_corpus_and_catalog(self):
        provider = BundledScriptureText()
        raw = provider.vpl_path.read_bytes()
        self.assertEqual(EXPECTED_VPL_SHA256, hashlib.sha256(raw).hexdigest())
        catalog = provider.catalog()
        self.assertEqual('scripture.library.text-catalog.v1', catalog['schema'])
        self.assertEqual('engwebu', catalog['translation_id'])
        self.assertEqual('TX1', catalog['source_tier'])
        self.assertEqual(EXPECTED_TRANSLATION_NAME, catalog['translation_name'])
        self.assertEqual(EXPECTED_LICENSE, catalog['license'])
        self.assertEqual(EXPECTED_SOURCE_URL, catalog['source_url'])
        self.assertEqual(EXPECTED_SOURCE_SITE, catalog['source_site'])
        self.assertEqual(EXPECTED_ARCHIVE_SHA256, catalog['archive_sha256'])
        self.assertEqual(38058, catalog['verse_rows'])
        self.assertEqual(29, catalog['source_empty_rows'])
        self.assertEqual(81, len(catalog['books']))
        self.assertFalse(catalog['runtime_network_required'])
        self.assertEqual('AUDITED_PINNED_SNAPSHOT', catalog['source_snapshot_status'])
        upstream = catalog['upstream_monitoring']
        self.assertEqual('MATCH_PINNED_AUTHORITY', upstream['status'])
        self.assertEqual(EXPECTED_VPL_SHA256, upstream['observed_vpl_sha256'])
        self.assertEqual(0, upstream['changed_reference_count'])
        self.assertEqual(0, upstream['added_reference_count'])
        self.assertEqual(0, upstream['removed_reference_count'])
        self.assertEqual([], upstream['changed_references'])
        reaudit = catalog['source_reaudit']
        self.assertEqual('SOURCE_IDENTITY_RECONCILED', reaudit['status'])
        self.assertFalse(reaudit['independent_audit_claimed'])
        self.assertEqual(10, reaudit['changed_reference_count'])
        self.assertEqual(0, reaudit['added_reference_count'])
        self.assertEqual(0, reaudit['removed_reference_count'])
        self.assertEqual(list(EXPECTED_REAUDIT_LINE_SHA256), reaudit['changed_references'])
        self.assertEqual(EXPECTED_REAUDIT_LINE_SHA256, reaudit['current_line_sha256'])

    def test_runtime_rejects_tampered_source_provenance_manifest(self):
        source_data = (
            Path(__file__).resolve().parents[1]
            / 'scripture_archive_platform'
            / 'content'
            / 'data'
        )
        authority = json.loads((source_data / 'engwebu_authority.json').read_text(encoding='utf-8'))
        mutations = {
            'translation_name': 'Unverified translation name',
            'license': 'Unverified license',
            'source_url': 'https://example.invalid/source.zip',
            'source_site': 'https://example.invalid/',
            'archive_sha256': '0' * 64,
        }
        with tempfile.TemporaryDirectory() as td:
            target = Path(td)
            shutil.copy2(source_data / 'engwebu_vpl.txt', target / 'engwebu_vpl.txt')
            for field, bad_value in mutations.items():
                with self.subTest(field=field):
                    payload = dict(authority)
                    payload[field] = bad_value
                    (target / 'engwebu_authority.json').write_text(
                        json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
                        encoding='utf-8',
                    )
                    with self.assertRaisesRegex(ValueError, 'provenance identity changed'):
                        BundledScriptureText(target)

    def test_parsing_remains_bound_to_the_exact_bytes_verified_at_initialization(self):
        source_data = (
            Path(__file__).resolve().parents[1]
            / 'scripture_archive_platform'
            / 'content'
            / 'data'
        )
        with tempfile.TemporaryDirectory() as td:
            target = Path(td)
            shutil.copy2(source_data / 'engwebu_authority.json', target / 'engwebu_authority.json')
            shutil.copy2(source_data / 'engwebu_vpl.txt', target / 'engwebu_vpl.txt')
            provider = BundledScriptureText(target)
            (target / 'engwebu_vpl.txt').write_bytes(b'TAMPERED AFTER VERIFICATION\n')

            genesis = provider.chapter('GEN', 1)
            self.assertEqual(
                'In the beginning, God created the heavens and the earth.',
                genesis['verses'][0]['text'],
            )
            with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                BundledScriptureText(target)

    def test_chapter_preserves_current_official_text_and_source_empty_rows(self):
        provider = BundledScriptureText()
        gen = provider.chapter('GEN', 1)
        self.assertEqual('In the beginning, God created the heavens and the earth.', gen['verses'][0]['text'])
        dan4 = provider.chapter('DAN', 4)
        dan426 = next(row for row in dan4['verses'] if row['verse'] == 26)
        self.assertEqual(
            'Whereas it was commanded to leave the stump of the roots of the tree, your kingdom will be restored to you after you learn that Heaven rules.',
            dan426['text'],
        )
        dan9 = provider.chapter('DAN', 9)
        dan911 = next(row for row in dan9['verses'] if row['verse'] == 11)
        self.assertIn('turning aside, and not obeying your voice.', dan911['text'])
        acts = provider.chapter('ACT', 8)
        v37 = next(row for row in acts['verses'] if row['verse'] == 37)
        self.assertEqual('', v37['text'])
        self.assertEqual('source_empty', v37['text_state'])

    def test_search_is_bounded_and_does_not_invent_empty_rows(self):
        provider = BundledScriptureText()
        result = provider.search('beginning', limit=3)
        self.assertGreater(result['total'], 0)
        self.assertLessEqual(len(result['results']), 3)
        self.assertTrue(all(row['text'] for row in result['results']))
        for bad in ('', ' ' * 4, 'x' * 129):
            with self.assertRaises(ValueError):
                provider.search(bad)
        for bad in (0, 101, True, '2'):
            with self.assertRaises(ValueError):
                provider.search('God', limit=bad)

    def test_transport_is_allowlisted_and_fail_closed(self):
        for command in ('library.text_catalog', 'library.read_chapter', 'library.text_search'):
            self.assertIn(command, ALLOWLISTED_COMMANDS)
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            repo = root / 'repo'
            repo.mkdir()
            app = PlatformApplication(
                repo,
                store=JsonFileStore(root / 'store'),
                loader=_BootstrapOnlyLoader(),
            )

            def call(command, payload=None):
                return app.handle({
                    'api_version': 'scripture.transport.v1',
                    'request_id': 'webu-test',
                    'command': command,
                    'payload': payload or {},
                })

            catalog = call('library.text_catalog')
            self.assertTrue(catalog['ok'])
            self.assertEqual('engwebu', catalog['data']['translation_id'])
            self.assertEqual('MATCH_PINNED_AUTHORITY', catalog['data']['upstream_monitoring']['status'])
            bootstrap = call('system.bootstrap')
            self.assertTrue(bootstrap['ok'])
            self.assertTrue(bootstrap['data']['capabilities']['bundled_full_bible_text'])
            chapter = call('library.read_chapter', {'book': 'GEN', 'chapter': 1})
            self.assertTrue(chapter['ok'])
            self.assertEqual('GEN 1:1', chapter['data']['verses'][0]['reference'])
            self.assertFalse(call('library.read_chapter', {'book': '../../etc/passwd', 'chapter': 1})['ok'])
            self.assertFalse(call('library.text_search', {'query': 'God', 'limit': 1000})['ok'])
            self.assertFalse(call('library.text_catalog', {'unexpected': True})['ok'])
            self.assertFalse(call('library.read_chapter', {'book': 'GEN', 'chapter': 1, 'path': 'ignored'})['ok'])
            self.assertFalse(call('library.read_chapter', {'book': 'GEN'})['ok'])
            self.assertFalse(call('library.read_chapter', {'book': 'GEN', 'chapter': True})['ok'])
            self.assertFalse(call('library.text_search', {'query': 'God', 'limit': 50, 'scope': 'all'})['ok'])
            self.assertFalse(call('library.text_search', {'limit': 50})['ok'])

    def test_frontend_response_validation_is_executable_and_fail_closed(self):
        overlay = Path(__file__).resolve().parents[1]
        ui_path = overlay / 'frontend' / 'scripture-reader-ui.js'
        script = textwrap.dedent(
            r"""
            import {readFileSync} from 'node:fs';
            let source = readFileSync(process.argv[1], 'utf8');
            source = source.replace(
              "import {chooseTransport, unwrap} from './transport.js';",
              "const chooseTransport=()=>null; const unwrap=async()=>({});"
            );
            const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
            const reject = (fn, label) => {
              let failed = false;
              try { fn(); } catch (_) { failed = true; }
              if (!failed) throw new Error('expected rejection: ' + label);
            };
            const verse = {
              book:'GEN', chapter:1, verse:1, reference:'GEN 1:1',
              text:'In the beginning', text_state:'present',
              translation_id:'engwebu', source_tier:'TX1'
            };
            const catalog = {
              schema:'scripture.library.text-catalog.v1',
              translation_id:'engwebu', source_tier:'TX1',
              runtime_network_required:false,
              source_snapshot_status:'AUDITED_PINNED_SNAPSHOT',
              verse_rows:38058, source_empty_rows:29,
              books:[{code:'GEN', chapter_count:1, chapters:[1]}],
              upstream_monitoring:{
                status:'MATCH_PINNED_AUTHORITY',
                changed_reference_count:0,
                added_reference_count:0,
                removed_reference_count:0,
                changed_references:[]
              }
            };
            mod.validateTextCatalog(catalog);
            reject(()=>mod.validateTextCatalog({...catalog, runtime_network_required:true}), 'network-required catalog');
            reject(()=>mod.validateTextCatalog({...catalog, translation_id:'other'}), 'wrong translation');
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                upstream_monitoring:{...catalog.upstream_monitoring, changed_reference_count:1}
              }),
              'MATCH status with drift count'
            );
            reject(
              ()=>mod.validateTextCatalog({...catalog, books:[{code:'GEN', chapter_count:2, chapters:[1,1]}]}),
              'duplicate catalog chapters'
            );

            const chapter = {
              schema:'scripture.library.chapter.v1',
              translation_id:'engwebu', source_tier:'TX1',
              book:'GEN', chapter:1, verses:[verse], source_empty_rows:0
            };
            mod.validateChapter(chapter);
            reject(
              ()=>mod.validateChapter({...chapter, verses:[{...verse, reference:'GEN 1:2'}]}),
              'inconsistent reference'
            );
            reject(
              ()=>mod.validateChapter({...chapter, verses:[{...verse, text_state:'source_empty'}], source_empty_rows:1}),
              'source-empty row with text'
            );
            reject(
              ()=>mod.validateChapter({...chapter, verses:[verse, {...verse}]}),
              'duplicate chapter verse'
            );

            const search = {
              schema:'scripture.library.text-search.v1',
              translation_id:'engwebu', source_tier:'TX1',
              query:'beginning', total:1, results:[verse]
            };
            mod.validateTextSearch(search);
            reject(
              ()=>mod.validateTextSearch({...search, results:[{...verse, text:''}]}),
              'empty search source text'
            );
            reject(
              ()=>mod.validateTextSearch({...search, total:0}),
              'total smaller than results'
            );
            reject(
              ()=>mod.validateTextSearch({...search, total:2, results:[verse, {...verse}]}),
              'duplicate search reference'
            );
            """
        )
        result = subprocess.run(
            ['node', '--input-type=module', '-e', script, str(ui_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stderr or result.stdout)

    def test_packaging_and_frontend_bindings_are_explicit(self):
        overlay = Path(__file__).resolve().parents[1]
        build = (overlay / 'packaging' / 'build_windows.ps1').read_text(encoding='utf-8')
        self.assertIn('scripture_archive_platform\\content\\data', build)
        repo_root = overlay.parents[2]
        attributes = (repo_root / '.gitattributes').read_text(encoding='utf-8')
        self.assertIn(
            'lanes/dev1/repair_overlay/scripture_archive_platform/content/data/engwebu_vpl.txt -text',
            attributes,
        )
        frontend = (overlay / 'frontend' / 'scripture-reader-ui.js').read_text(encoding='utf-8')
        self.assertIn('library.read_chapter', frontend)
        self.assertIn('library.text_search', frontend)
        self.assertIn('textContent', frontend)
        self.assertNotIn('innerHTML', frontend)
        self.assertIn("role: 'status'", frontend)
        self.assertIn('AUDITED_PINNED_SNAPSHOT', frontend)
        self.assertIn('SOURCE_REAUDIT_REQUIRED', frontend)
        self.assertIn('upstream source re-audit is pending', frontend)
        for token in (
            'validateTextCatalog',
            'validateChapter',
            'validateTextSearch',
            'Invalid WEBU catalog source identity',
            'reference is inconsistent',
            'source-empty row contains text',
            'expected source text',
            'source-empty count is inconsistent',
            'MATCH_PINNED_AUTHORITY conflicts with drift evidence',
            'chapter verses must be unique and ascending',
            'duplicate source reference',
        ):
            self.assertIn(token, frontend)
        self.assertIn("validateTextCatalog(await api('library.text_catalog'))", frontend)
        self.assertIn("validateChapter(await api('library.read_chapter'", frontend)
        self.assertIn("validateTextSearch(await api('library.text_search'", frontend)
        completed = subprocess.run(
            ['node', '--check', str(overlay / 'frontend' / 'scripture-reader-ui.js')],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr or completed.stdout)


if __name__ == '__main__':
    unittest.main()
