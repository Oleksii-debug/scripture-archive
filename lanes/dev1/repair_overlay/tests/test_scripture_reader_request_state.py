import subprocess
import textwrap
import unittest
from pathlib import Path


class ScriptureReaderRequestStateTests(unittest.TestCase):
    def test_failed_requests_clear_stale_results_and_empty_query_preserves_them(self):
        overlay = Path(__file__).resolve().parents[1]
        ui_path = overlay / 'frontend' / 'scripture-reader-ui.js'
        script = textwrap.dedent(
            r"""
            import {readFileSync} from 'node:fs';

            let source = readFileSync(process.argv[1], 'utf8');
            source = source.replace(
              "import {chooseTransport, unwrap} from './transport.js';",
              "const chooseTransport=()=>Promise.resolve({}); const unwrap=async(_transport,command,payload)=>globalThis.__api(command,payload);"
            );
            source = source.replace(
              "const catalog = validateTextCatalog(await api('library.text_catalog'));",
              "const catalog={books:[],verse_rows:38058,source_snapshot_status:'AUDITED_PINNED_SNAPSHOT',upstream_monitoring:{status:'MATCH_PINNED_AUTHORITY'}};"
            );

            let focused = null;
            const nodes = new Map();
            class FakeNode {
              constructor(tag) {
                this.tagName = String(tag).toUpperCase();
                this.children = [];
                this.attributes = {};
                this.listeners = {};
                this.textContent = '';
                this.value = '';
                this.disabled = false;
                this.isConnected = true;
              }
              setAttribute(name, value) {
                const text = String(value);
                this.attributes[name] = text;
                if (name === 'id') { this.id = text; nodes.set(text, this); }
                if (name === 'value') this.value = text;
              }
              append(...children) { this.children.push(...children); }
              replaceChildren(...children) { this.children = [...children]; }
              addEventListener(name, handler) { this.listeners[name] = handler; }
              focus() { focused = this; }
            }

            const library = new FakeNode('main');
            library.id = 'library-view';
            nodes.set('library-view', library);
            globalThis.document = {
              createElement: tag => new FakeNode(tag),
              getElementById: id => nodes.get(id) || null,
            };

            let apiCalls = [];
            globalThis.__api = async(command, payload) => {
              apiCalls.push([command, payload]);
              if (command === 'library.read_chapter') {
                const host = nodes.get('scripture-reader-verses');
                if (host.children.length !== 0) throw new Error('chapter stale content reached transport');
                throw new Error('simulated chapter transport failure');
              }
              if (command === 'library.text_search') {
                const host = nodes.get('scripture-reader-search-results');
                if (host.children.length !== 0) throw new Error('search stale content reached transport');
                throw new Error('simulated search transport failure');
              }
              throw new Error(`unexpected command ${command}`);
            };

            const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
            await mod.installScriptureReaderSurface();

            const readForm = nodes.get('scripture-reader-form');
            const searchForm = nodes.get('scripture-reader-text-search');
            const verses = nodes.get('scripture-reader-verses');
            const results = nodes.get('scripture-reader-search-results');
            const query = nodes.get('scripture-reader-query');
            const status = nodes.get('scripture-reader-status');
            if (!readForm?.listeners.submit || !searchForm?.listeners.submit) {
              throw new Error('reader submit handlers were not installed');
            }

            verses.append(new FakeNode('p'));
            await readForm.listeners.submit({preventDefault(){}});
            if (verses.children.length !== 0) throw new Error('failed chapter request left stale result content');
            if (!status.textContent.includes('Не вдалося прочитати')) throw new Error('chapter failure status was not bounded');

            results.append(new FakeNode('ol'));
            query.value = '';
            focused = null;
            const callsBeforeEmpty = apiCalls.length;
            await searchForm.listeners.submit({preventDefault(){}});
            if (apiCalls.length !== callsBeforeEmpty) throw new Error('empty search query dispatched transport');
            if (results.children.length !== 1) throw new Error('empty query erased the last valid search result');
            if (focused !== query) throw new Error('empty query did not return focus to the search input');

            query.value = 'beginning';
            await searchForm.listeners.submit({preventDefault(){}});
            if (results.children.length !== 0) throw new Error('failed search request left stale result content');
            if (!status.textContent.includes('Не вдалося виконати пошук')) throw new Error('search failure status was not bounded');
            """
        )
        result = subprocess.run(
            ['node', '--input-type=module', '-e', script, str(ui_path)],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(0, result.returncode, result.stderr or result.stdout)


if __name__ == '__main__':
    unittest.main()
