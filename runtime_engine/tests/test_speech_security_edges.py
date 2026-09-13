from __future__ import annotations

import os
import tempfile
import unittest
import urllib.request
from pathlib import Path

from scripture_archive_runtime.speech import SpeechCache, _NoRedirectHandler


class SpeechSecurityEdgeTests(unittest.TestCase):
    def test_credential_bearing_default_handler_refuses_redirect(self):
        handler = _NoRedirectHandler()
        request = urllib.request.Request("https://api.openai.com/v1/audio/speech")
        self.assertIsNone(
            handler.redirect_request(
                request,
                None,
                302,
                "Found",
                {},
                "https://example.test/collect",
            )
        )

    @unittest.skipIf(os.name == "nt", "Windows symlink creation may require elevated rights")
    def test_cache_refuses_symlink_hit_outside_cache_root(self):
        with tempfile.TemporaryDirectory() as cache_dir, tempfile.TemporaryDirectory() as outside_dir:
            cache = SpeechCache(cache_dir)
            key = "a" * 64
            outside = Path(outside_dir) / "outside.mp3"
            outside.write_bytes(b"OUTSIDE")
            cache_path = cache.path_for(key, "mp3")
            cache_path.symlink_to(outside)
            self.assertIsNone(cache.get(key, "mp3"))


if __name__ == "__main__":
    unittest.main()
