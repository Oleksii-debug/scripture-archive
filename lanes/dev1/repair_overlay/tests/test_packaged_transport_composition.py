import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TRANSPORT = ROOT / "frontend" / "transport.js"


class PackagedTransportCompositionTests(unittest.TestCase):
    def test_packaged_and_coordinator_call_shapes_share_one_adapter(self):
        source = TRANSPORT.read_text(encoding="utf-8")
        marker = "// Supplemental packaged read-only canonical review surface."
        self.assertIn(marker, source)
        core = source.split(marker, 1)[0]

        with tempfile.TemporaryDirectory() as temp_dir:
            temp = Path(temp_dir)
            (temp / "transport.mjs").write_text(core, encoding="utf-8")
            (temp / "probe.mjs").write_text(
                """
globalThis.window = {
  pywebview: {
    api: {
      invoke: async request => ({ok: true, data: {command: request.command, payload: request.payload}})
    }
  }
};
globalThis.location = {protocol: 'file:'};
const mod = await import('./transport.mjs');
const adapter = mod.chooseTransport();
if (!adapter || typeof adapter.invoke !== 'function') throw new Error('chooseTransport did not return an adapter synchronously');
const daily = await mod.unwrap(await adapter.invoke('player.get_daily_case', {}));
if (daily.command !== 'player.get_daily_case') throw new Error('coordinator direct-response unwrap shape failed');
const packs = await mod.unwrap(adapter, 'content_packs.list', {});
if (packs.command !== 'content_packs.list') throw new Error('packaged adapter unwrap shape failed');
""",
                encoding="utf-8",
            )
            result = subprocess.run(
                ["node", str(temp / "probe.mjs")],
                cwd=temp,
                text=True,
                capture_output=True,
                check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)


if __name__ == "__main__":
    unittest.main()
