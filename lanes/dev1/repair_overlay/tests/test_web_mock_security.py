import unittest
from pathlib import Path

class WebMockSecurityTests(unittest.TestCase):
    def test_loopback_only_and_generic_errors(self):
        src=(Path(__file__).parents[1]/"run_web_mock.py").read_text(encoding="utf-8")
        self.assertIn('(\"127.0.0.1\", args.port)',src)
        self.assertNotIn('"message":str(exc)',src)
        self.assertIn('X-Content-Type-Options',src)
        self.assertIn('Content-Security-Policy',src)
