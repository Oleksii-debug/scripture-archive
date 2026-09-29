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
    LATEST_UPSTREAM_ARCHIVE_SHA256,
    LATEST_UPSTREAM_CHANGED_REFERENCE,
    LATEST_UPSTREAM_CURRENT_LINE_SHA256,
    LATEST_UPSTREAM_PINNED_LINE_SHA256,
    LATEST_UPSTREAM_VPL_SHA256,
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
        self.assertEqual('SOURCE_REAUDIT_REQUIRED', upstream['status'])
        self.assertEqual(LATEST_UPSTREAM_ARCHIVE_SHA256, upstream['observed_archive_sha256'])
        self.assertEqual(LATEST_UPSTREAM_VPL_SHA256, upstream['observed_vpl_sha256'])
        self.assertEqual(1, upstream['changed_reference_count'])
        self.assertEqual(0, upstream['added_reference_count'])
        self.assertEqual(0, upstream['removed_reference_count'])
        self.assertEqual([LATEST_UPSTREAM_CHANGED_REFERENCE], upstream['changed_references'])
        self.assertEqual(1, len(upstream['changed_reference_details']))
        detail = upstream['changed_reference_details'][0]
        self.assertEqual(LATEST_UPSTREAM_CHANGED_REFERENCE, detail['reference'])
        self.assertEqual(LATEST_UPSTREAM_PINNED_LINE_SHA256, detail['pinned_line_sha256'])
        self.assertEqual(LATEST_UPSTREAM_CURRENT_LINE_SHA256, detail['current_line_sha256'])
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

    def test_runtime_rejects_tampered_upstream_monitoring(self):
        source_data = (
            Path(__file__).resolve().parents[1]
            / 'scripture_archive_platform'
            / 'content'
            / 'data'
        )
        authority = json.loads((source_data / 'engwebu_authority.json').read_text(encoding='utf-8'))
        mutations = [
            ('status', 'MATCH_PINNED_AUTHORITY'),
            ('evidence_run_id', 0),
            ('observed_archive_sha256', '0' * 64),
            ('observed_vpl_sha256', '0' * 64),
            ('changed_reference_count', 0),
            ('changed_references', []),
        ]
        with tempfile.TemporaryDirectory() as td:
            target = Path(td)
            shutil.copy2(source_data / 'engwebu_vpl.txt', target / 'engwebu_vpl.txt')
            for field, bad_value in mutations:
                with self.subTest(field=field):
                    payload = json.loads(json.dumps(authority))
                    payload['upstream_monitoring'][field] = bad_value
                    (target / 'engwebu_authority.json').write_text(
                        json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
                        encoding='utf-8',
                    )
                    with self.assertRaises(ValueError):
                        BundledScriptureText(target)

            payload = json.loads(json.dumps(authority))
            payload['upstream_monitoring']['changed_reference_details'][0]['current_line_sha256'] = '0' * 64
            (target / 'engwebu_authority.json').write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
                encoding='utf-8',
            )
            with self.assertRaisesRegex(ValueError, 'source-drift evidence'):
                BundledScriptureText(target)

            payload = json.loads(json.dumps(authority))
            payload['upstream_monitoring']['changed_reference_details'][0]['current_line'] += ' tampered'
            (target / 'engwebu_authority.json').write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + '\n',
                encoding='utf-8',
            )
            with self.assertRaisesRegex(ValueError, 'source-drift evidence'):
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

    def test_chapter_preserves_pinned_audited_text_and_source_empty_rows(self):
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

        wisdom = provider.chapter('WIS', 18)
        wis181 = next(row for row in wisdom['verses'] if row['verse'] == 1)
        self.assertIn('counted it a happy thing that they too had suffered,', wis181['text'])
        self.assertNotIn('counted it a happy thing that they had not suffered,', wis181['text'])

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
            self.assertEqual('SOURCE_REAUDIT_REQUIRED', catalog['data']['upstream_monitoring']['status'])
            monitoring = catalog['data']['upstream_monitoring']
            self.assertEqual(LATEST_UPSTREAM_ARCHIVE_SHA256, monitoring['observed_archive_sha256'])
            self.assertEqual(LATEST_UPSTREAM_VPL_SHA256, monitoring['observed_vpl_sha256'])
            self.assertEqual([LATEST_UPSTREAM_CHANGED_REFERENCE], monitoring['changed_references'])
            bootstrap = call('system.bootstrap')
            self.assertTrue(bootstrap['ok'])
            self.assertTrue(bootstrap['data']['capabilities']['bundled_full_bible_text'])
            chapter = call('library.read_chapter', {'book': 'GEN', 'chapter': 1})
            self.assertTrue(chapter['ok'])
            self.assertEqual('GEN 1:1', chapter['data']['verses'][0]['reference'])

            wisdom = call('library.read_chapter', {'book': 'WIS', 'chapter': 18})
            self.assertTrue(wisdom['ok'])
            wis181 = next(row for row in wisdom['data']['verses'] if row['verse'] == 1)
            self.assertIn('they too had suffered,', wis181['text'])
            self.assertNotIn('they had not suffered,', wis181['text'])
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
              translation_id:'engwebu',
              translation_name:'World English Bible Updated',
              source_tier:'TX1',
              license:'Public Domain',
              source_url:'https://ebible.org/Scriptures/engwebu_vpl.zip',
              source_site:'https://ebible.org/engwebu/',
              archive_sha256:'1007fb45782a4abd9444d4225fd768fb00a150466b9fb9fcf6f6ad175b73feb6',
              vpl_sha256:'8cac735abda379045fa2c5f43217410ad47a45ac592f3801116ab0da41a810d8',
              runtime_network_required:false,
              source_snapshot_status:'AUDITED_PINNED_SNAPSHOT',
              source_reaudit:{
                status:'SOURCE_IDENTITY_RECONCILED',
                independent_audit_claimed:false,
                changed_reference_count:10,
                added_reference_count:0,
                removed_reference_count:0
              },
              verse_rows:38058, source_empty_rows:29,
              books:[
                {code:'GEN', chapter_count:1, chapters:[1]},
                ...Array.from({length:80}, (_, index) => ({
                  code:`X${String(index).padStart(2, '0')}`,
                  chapter_count:1,
                  chapters:[1]
                }))
              ],
              upstream_monitoring:{
                status:'SOURCE_REAUDIT_REQUIRED',
                observed_archive_sha256:'cbed8914abff11ff715242ae06351ef7cc77931b89968c6c57142bb8616ddb82',
                observed_vpl_sha256:'5507aa8b7dc4cde0cc385e4b61c76a33223769aba7b8a9c708de81a40403d4ae',
                changed_reference_count:1,
                added_reference_count:0,
                removed_reference_count:0,
                changed_references:['WIS 18:1'],
                changed_reference_details:[{
                  reference:'WIS 18:1',
                  pinned_line:'WIS 18:1 But for your holy ones there was great light. Their enemies, hearing their voice but not seeing their form, counted it a happy thing that they too had suffered,',
                  current_line:'WIS 18:1 But for your holy ones there was great light. Their enemies, hearing their voice but not seeing their form, counted it a happy thing that they had not suffered,',
                  pinned_line_sha256:'48259c1b7540ba6589c9a24a2ba54289503d747cadfaab333273076c180f5759',
                  current_line_sha256:'92b8897d7e1a3fb2d34fcbeed5e17bdb72eeb2feffcb7eb698c9a40922b05850'
                }]
              }
            };
            mod.validateTextCatalog(catalog);
            reject(()=>mod.validateTextCatalog({...catalog, runtime_network_required:true}), 'network-required catalog');
            reject(()=>mod.validateTextCatalog({...catalog, translation_id:'other'}), 'wrong translation');
            reject(()=>mod.validateTextCatalog({...catalog, license:'Unverified'}), 'wrong license');
            reject(()=>mod.validateTextCatalog({...catalog, vpl_sha256:'0'.repeat(64)}), 'wrong VPL identity');
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                source_reaudit:{...catalog.source_reaudit, independent_audit_claimed:true}
              }),
              'independent-audit promotion'
            );
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                upstream_monitoring:{...catalog.upstream_monitoring, observed_vpl_sha256:'0'.repeat(64)}
              }),
              're-audit status with wrong VPL hash'
            );
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                upstream_monitoring:{...catalog.upstream_monitoring, changed_reference_count:0}
              }),
              're-audit status with wrong drift count'
            );
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                upstream_monitoring:{...catalog.upstream_monitoring, changed_reference_details:[]}
              }),
              're-audit status without drift detail'
            );
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                upstream_monitoring:{
                  ...catalog.upstream_monitoring,
                  changed_reference_details:[{
                    ...catalog.upstream_monitoring.changed_reference_details[0],
                    current_line:catalog.upstream_monitoring.changed_reference_details[0].current_line + ' tampered'
                  }]
                }
              }),
              're-audit status with tampered current line'
            );
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                upstream_monitoring:{...catalog.upstream_monitoring, status:'MATCH_PINNED_AUTHORITY'}
              }),
              'MATCH status with known drift evidence'
            );
            reject(()=>mod.validateTextCatalog({...catalog, verse_rows:38057}), 'wrong corpus row count');
            reject(()=>mod.validateTextCatalog({...catalog, source_empty_rows:28}), 'wrong source-empty count');
            reject(()=>mod.validateTextCatalog({...catalog, books:catalog.books.slice(0,80)}), 'incomplete book catalog');
            reject(
              ()=>mod.validateTextCatalog({
                ...catalog,
                books:catalog.books.map((item, index) => index === 0
                  ? {...item, chapter_count:2, chapters:[1,1]}
                  : item)
              }),
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

    def test_frontend_result_focus_is_executable_without_bulk_live_regions(self):
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
            source = source.replace('function renderVerses(data) {', 'export function renderVerses(data) {');
            source = source.replace('function renderSearch(data) {', 'export function renderSearch(data) {');

            let focused = null;
            class FakeNode {
              constructor(tag) {
                this.tagName = String(tag).toUpperCase();
                this.textContent = '';
                this.children = [];
                this.attributes = {};
                this.tabIndex = 0;
              }
              setAttribute(name, value) { this.attributes[name] = String(value); }
              append(...nodes) { this.children.push(...nodes); }
              replaceChildren(...nodes) { this.children = [...nodes]; }
              focus() { focused = this; }
            }
            const nodes = new Map([
              ['scripture-reader-verses', new FakeNode('div')],
              ['scripture-reader-search-results', new FakeNode('div')],
            ]);
            globalThis.document = {
              createElement: tag => new FakeNode(tag),
              getElementById: id => nodes.get(id) || null,
            };

            const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
            const verse = {
              book:'GEN', chapter:1, verse:1, reference:'GEN 1:1',
              text:'In the beginning', text_state:'present',
              translation_id:'engwebu', source_tier:'TX1'
            };
            mod.renderVerses({
              schema:'scripture.library.chapter.v1',
              translation_id:'engwebu', source_tier:'TX1',
              book:'GEN', chapter:1, verses:[verse], source_empty_rows:0
            });
            if (!focused || focused.tagName !== 'H4' || focused.textContent !== 'GEN 1') {
              throw new Error('chapter result heading did not receive focus');
            }
            const chapterList = nodes.get('scripture-reader-verses').children[1];
            const chapterItem = chapterList?.children?.[0];
            if (!chapterItem || chapterItem.children?.[1]?.attributes?.lang !== 'en') {
              throw new Error('chapter source text is not marked as English');
            }

            focused = null;
            mod.renderSearch({
              schema:'scripture.library.text-search.v1',
              translation_id:'engwebu', source_tier:'TX1',
              query:'beginning', total:1, results:[verse]
            });
            const resultsHost = nodes.get('scripture-reader-search-results');
            if (!focused || focused.tagName !== 'H4' || focused.textContent !== 'Результати пошуку') {
              throw new Error('search result heading did not receive focus');
            }
            if (focused.attributes.id !== 'scripture-reader-search-results-heading') {
              throw new Error('search result heading identity is missing');
            }
            const list = resultsHost.children[1];
            if (!list || list.attributes['aria-labelledby'] !== 'scripture-reader-search-results-heading') {
              throw new Error('search result list is not labelled by its focused heading');
            }
            if (list.children?.[0]?.children?.[1]?.attributes?.lang !== 'en') {
              throw new Error('search source text is not marked as English');
            }

            focused = null;
            mod.renderSearch({
              schema:'scripture.library.text-search.v1',
              translation_id:'engwebu', source_tier:'TX1',
              query:'absent', total:0, results:[]
            });
            if (!focused || focused.textContent !== 'Результати пошуку') {
              throw new Error('empty search result heading did not receive focus');
            }
            if (!resultsHost.children[1] || !resultsHost.children[1].textContent.includes('збігів не знайдено')) {
              throw new Error('empty search result message is missing');
            }
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
        self.assertEqual(1, frontend.count("'aria-live': 'polite'"))
        self.assertIn("'aria-atomic': 'true'", frontend)
        self.assertIn("lang: 'en'", frontend)
        self.assertIn('Повний текст Писання — WEBU', frontend)
        self.assertIn('Результати пошуку', frontend)
        self.assertNotIn('Full Scripture text — WEBU', frontend)
        self.assertNotIn('status(`Постачальник повного тексту недоступний: ${error.message}`)', frontend)
        self.assertNotIn('status(`Не вдалося прочитати розділ: ${error.message}`)', frontend)
        self.assertNotIn('status(`Не вдалося виконати пошук у тексті Писання: ${error.message}`)', frontend)
        self.assertIn("console.error('Scripture reader catalog initialization failed', error)", frontend)
        self.assertIn("console.error('Scripture reader chapter load failed', error)", frontend)
        self.assertIn("console.error('Scripture reader text search failed', error)", frontend)
        self.assertNotIn("id: 'scripture-reader-verses', 'aria-live'", frontend)
        self.assertNotIn("id: 'scripture-reader-search-results', 'aria-live'", frontend)
        self.assertIn("id: 'scripture-reader-search-results-heading'", frontend)
        self.assertIn("'aria-labelledby': 'scripture-reader-search-results-heading'", frontend)
        self.assertGreaterEqual(frontend.count('heading.focus()'), 2)
        self.assertIn('AUDITED_PINNED_SNAPSHOT', frontend)
        self.assertIn('SOURCE_REAUDIT_REQUIRED', frontend)
        self.assertIn('потрібен повторний аудит upstream-джерела', frontend)
        self.assertIn('Відомі змінені посилання:', frontend)
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
            'SOURCE_REAUDIT_REQUIRED does not match current drift evidence',
            'source drift detail identity is invalid',
            'chapter verses must be unique and ascending',
            'duplicate source reference',
        ):
            self.assertIn(token, frontend)
        self.assertIn("validateTextCatalog(await api('library.text_catalog'))", frontend)
        self.assertIn("validateChapter(await api('library.read_chapter'", frontend)
        self.assertIn("validateTextSearch(await api('library.text_search'", frontend)
        workflow = (
            overlay.parents[2]
            / '.github'
            / 'workflows'
            / 'r06-webu-source-authority.yml'
        ).read_text(encoding='utf-8')
        self.assertIn("monitoring_matches={'true' if monitoring_matches else 'false'}", workflow)
        self.assertIn('WEBU_SOURCE_MONITORING_TRUTH_PASS', workflow)
        self.assertIn("'SOURCE_REAUDIT_REQUIRED'", workflow)
        self.assertNotIn('steps.source_audit.outputs.source_matches', workflow)

        accessibility_workflow = (
            overlay.parents[2]
            / '.github'
            / 'workflows'
            / 'r06-dev02-accessibility-qualification.yml'
        ).read_text(encoding='utf-8')
        self.assertIn("'lanes/dev1/repair_overlay/frontend/scripture-reader-ui.js'", accessibility_workflow)
        self.assertIn("'lanes/dev1/repair_overlay/tests/test_scripture_text_provider.py'", accessibility_workflow)
        self.assertIn('node --check frontend/scripture-reader-ui.js', accessibility_workflow)
        self.assertIn(
            'python -m unittest discover -s tests -p "test_scripture_text_provider.py" -v',
            accessibility_workflow,
        )

        completed = subprocess.run(
            ['node', '--check', str(overlay / 'frontend' / 'scripture-reader-ui.js')],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(0, completed.returncode, completed.stderr or completed.stdout)


if __name__ == '__main__':
    unittest.main()
