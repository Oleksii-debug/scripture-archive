import json
import unittest
from pathlib import Path

from runtime_engine.scripture_archive_runtime.package_adapters import adapt_node_for_runtime


class CanonicalRuntimeCompatibilityTests(unittest.TestCase):
    def canonical_nodes(self):
        repo_root = Path(__file__).resolve().parents[2]
        for index_path in sorted((repo_root / 'docs' / 'campaigns').rglob('MISSION_INDEX.json')):
            index = json.loads(index_path.read_text(encoding='utf-8'))
            for shard_name in index.get('node_files', []):
                shard_path = index_path.parent / shard_name
                payload = json.loads(shard_path.read_text(encoding='utf-8'))
                for node in payload.get('nodes', []):
                    yield node

    def test_every_machine_readable_canonical_node_adapts_without_invented_truth(self):
        failures = []
        count = 0
        for node in self.canonical_nodes():
            count += 1
            try:
                adapted = adapt_node_for_runtime(node, lane='canonical-regression')
                self.assertEqual(node.get('accepted_answer'), adapted.get('accepted_answer'))
            except Exception as exc:
                failures.append(
                    f"{node.get('node_id')} response_mode={node.get('response_mode')!r} "
                    f"task_family={node.get('task_family')!r}: {type(exc).__name__}: {exc}"
                )
        self.assertGreater(count, 0)
        self.assertEqual([], failures, '\n'.join(failures))

    def test_free_response_synthesis_uses_existing_long_text_dto(self):
        target = next(node for node in self.canonical_nodes() if node.get('response_mode') == 'free response synthesis')
        adapted = adapt_node_for_runtime(target, lane='canonical-regression')
        self.assertEqual('LONG_TEXT', adapted['task_type'])
        self.assertEqual('LONG_TEXT', adapted['answer_dto']['task_type'])
        self.assertEqual(target['accepted_answer'], adapted['answer_dto']['text'])
