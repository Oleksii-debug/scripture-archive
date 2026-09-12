from __future__ import annotations

import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

from scripture_archive_runtime.speech import (
    ElevenLabsSpeechProvider,
    OpenAISpeechProvider,
    RetryPolicy,
    SpeechCache,
    SpeechConfigurationError,
    SpeechProviderError,
    SpeechProviderRegistry,
    SpeechRequest,
    SpeechService,
    SpeechValidationError,
)


class _Response:
    def __init__(self, payload: bytes = b"AUDIO") -> None:
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self) -> bytes:
        return self.payload


class _CapturingOpener:
    def __init__(self, payload: bytes = b"AUDIO") -> None:
        self.payload = payload
        self.requests = []

    def __call__(self, request, *, timeout):
        self.requests.append((request, timeout))
        return _Response(self.payload)


class _FakeProvider:
    provider_id = "fake"
    is_network = False
    max_chars = None

    def __init__(self) -> None:
        self.calls = 0
        self.last_request = None

    def cache_descriptor(self, request):
        return {
            "provider_id": self.provider_id,
            "model": request.model or "fake-v1",
            "adapter_contract": "fake_v1",
        }

    def synthesize(self, request):
        self.calls += 1
        self.last_request = request
        return b"FAKE-AUDIO"


class SpeechContractTests(unittest.TestCase):
    def test_request_preserves_exact_text_and_validates_presentation_fields(self):
        text = "  Ісус сказав: «Я є дорога».  "
        request = SpeechRequest(
            text=text,
            provider_id="fake",
            voice_id="reader",
            purpose="scripture",
            speed=1.25,
        ).validated()
        self.assertEqual(request.text, text)
        self.assertEqual(request.speed, 1.25)

        with self.assertRaises(SpeechValidationError):
            SpeechRequest(
                text="x",
                provider_id="fake",
                voice_id="reader",
                purpose="speaker_inference",
            ).validated()

    def test_registry_rejects_duplicate_provider_without_explicit_replace(self):
        registry = SpeechProviderRegistry()
        registry.register(_FakeProvider())
        with self.assertRaises(SpeechConfigurationError):
            registry.register(_FakeProvider())
        self.assertEqual(registry.provider_ids(), ("fake",))

    def test_cache_deduplicates_without_persisting_plain_text(self):
        provider = _FakeProvider()
        registry = SpeechProviderRegistry()
        registry.register(provider)
        with tempfile.TemporaryDirectory() as tmp:
            service = SpeechService(registry, SpeechCache(tmp))
            request = SpeechRequest(
                text="Блаженні миротворці",
                provider_id="fake",
                voice_id="neutral",
                model="fake-v1",
            )
            first = service.synthesize(request)
            second = service.synthesize(request)

            self.assertFalse(first.from_cache)
            self.assertTrue(second.from_cache)
            self.assertEqual(provider.calls, 1)
            self.assertEqual(first.cache_key, second.cache_key)
            self.assertEqual(Path(first.cache_path).read_bytes(), b"FAKE-AUDIO")
            self.assertNotIn("Блаженні", first.cache_path)
            self.assertRegex(Path(first.cache_path).name, r"^[0-9a-f]{64}\.mp3$")

    def test_cache_key_does_not_depend_on_provider_secret(self):
        opener = _CapturingOpener()
        provider = OpenAISpeechProvider(opener=opener)
        request = SpeechRequest(
            text="Test",
            provider_id="openai",
            voice_id="alloy",
        )
        with tempfile.TemporaryDirectory() as tmp:
            cache = SpeechCache(tmp)
            with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-one"}, clear=False):
                key_one = cache.make_key(request, provider)
            with patch.dict(os.environ, {"OPENAI_API_KEY": "secret-two"}, clear=False):
                key_two = cache.make_key(request, provider)
        self.assertEqual(key_one, key_two)

    def test_service_reports_effective_default_model(self):
        provider = _FakeProvider()
        registry = SpeechProviderRegistry()
        registry.register(provider)
        with tempfile.TemporaryDirectory() as tmp:
            artifact = SpeechService(registry, SpeechCache(tmp)).synthesize(
                SpeechRequest(text="x", provider_id="fake", voice_id="reader")
            )
        self.assertEqual(artifact.model, "fake-v1")


class OpenAISpeechProviderTests(unittest.TestCase):
    def setUp(self):
        self.opener = _CapturingOpener(b"OPENAI-AUDIO")
        self.provider = OpenAISpeechProvider(
            opener=self.opener,
            retry_policy=RetryPolicy(max_attempts=1),
        )

    def test_request_matches_official_audio_speech_boundary(self):
        request = SpeechRequest(
            text="Exact canonical visible text.",
            provider_id="openai",
            voice_id="alloy",
            model="gpt-4o-mini-tts",
            response_format="wav",
            speed=1.1,
            instructions="Read clearly; do not paraphrase.",
            purpose="scripture",
        )
        with patch.dict(os.environ, {"OPENAI_API_KEY": "top-secret"}, clear=False):
            audio = self.provider.synthesize(request)

        self.assertEqual(audio, b"OPENAI-AUDIO")
        sent, timeout = self.opener.requests[-1]
        self.assertEqual(sent.full_url, "https://api.openai.com/v1/audio/speech")
        self.assertEqual(timeout, 30.0)
        headers = {key.lower(): value for key, value in sent.header_items()}
        self.assertEqual(headers["authorization"], "Bearer top-secret")
        body = json.loads(sent.data.decode("utf-8"))
        self.assertEqual(body["input"], "Exact canonical visible text.")
        self.assertEqual(body["model"], "gpt-4o-mini-tts")
        self.assertEqual(body["voice"], "alloy")
        self.assertEqual(body["response_format"], "wav")
        self.assertEqual(body["speed"], 1.1)
        self.assertEqual(body["instructions"], "Read clearly; do not paraphrase.")
        self.assertNotIn("top-secret", sent.data.decode("utf-8"))

    def test_missing_secret_fails_closed_without_network_call(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(SpeechConfigurationError) as caught:
                self.provider.synthesize(
                    SpeechRequest(text="x", provider_id="openai", voice_id="alloy")
                )
        self.assertIn("OPENAI_API_KEY", str(caught.exception))
        self.assertEqual(self.opener.requests, [])

    def test_private_text_is_blocked_by_default(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret"}, clear=False):
            with self.assertRaises(SpeechValidationError):
                self.provider.synthesize(
                    SpeechRequest(
                        text="My private note",
                        provider_id="openai",
                        voice_id="alloy",
                        purpose="personal_note",
                        private_text=True,
                    )
                )
        self.assertEqual(self.opener.requests, [])

    def test_tts_1_rejects_unsupported_instructions_before_network(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret"}, clear=False):
            with self.assertRaises(SpeechValidationError):
                self.provider.synthesize(
                    SpeechRequest(
                        text="x",
                        provider_id="openai",
                        voice_id="alloy",
                        model="tts-1",
                        instructions="Whisper",
                    )
                )
        self.assertEqual(self.opener.requests, [])

    def test_http_endpoint_and_embedded_credentials_are_rejected(self):
        with self.assertRaises(SpeechConfigurationError):
            OpenAISpeechProvider(endpoint="http://api.openai.com/v1/audio/speech")
        with self.assertRaises(SpeechConfigurationError):
            OpenAISpeechProvider(endpoint="https://user:pass@example.test/speech")


class ElevenLabsSpeechProviderTests(unittest.TestCase):
    def setUp(self):
        self.opener = _CapturingOpener(b"ELEVEN-AUDIO")
        self.provider = ElevenLabsSpeechProvider(
            opener=self.opener,
            retry_policy=RetryPolicy(max_attempts=1),
        )

    def test_request_matches_official_text_to_speech_boundary(self):
        request = SpeechRequest(
            text="Незмінений текст уривка.",
            provider_id="elevenlabs",
            voice_id="Voice / UA",
            response_format="mp3",
            model="eleven_multilingual_v2",
            purpose="scripture",
        )
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "eleven-secret"}, clear=False):
            audio = self.provider.synthesize(request)

        self.assertEqual(audio, b"ELEVEN-AUDIO")
        sent, _ = self.opener.requests[-1]
        self.assertTrue(
            sent.full_url.startswith(
                "https://api.elevenlabs.io/v1/text-to-speech/Voice%20%2F%20UA?"
            )
        )
        self.assertIn("output_format=mp3_44100_128", sent.full_url)
        headers = {key.lower(): value for key, value in sent.header_items()}
        self.assertEqual(headers["xi-api-key"], "eleven-secret")
        body = json.loads(sent.data.decode("utf-8"))
        self.assertEqual(body["text"], "Незмінений текст уривка.")
        self.assertEqual(body["model_id"], "eleven_multilingual_v2")
        self.assertNotIn("eleven-secret", sent.data.decode("utf-8"))

    def test_openai_style_instructions_are_not_silently_ignored(self):
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "secret"}, clear=False):
            with self.assertRaises(SpeechValidationError):
                self.provider.synthesize(
                    SpeechRequest(
                        text="x",
                        provider_id="elevenlabs",
                        voice_id="v",
                        instructions="Narrate dramatically",
                    )
                )
        self.assertEqual(self.opener.requests, [])

    def test_declared_cache_extension_must_match_elevenlabs_output_format(self):
        with patch.dict(os.environ, {"ELEVENLABS_API_KEY": "secret"}, clear=False):
            with self.assertRaises(SpeechValidationError):
                self.provider.synthesize(
                    SpeechRequest(
                        text="x",
                        provider_id="elevenlabs",
                        voice_id="v",
                        response_format="wav",
                    )
                )

    def test_unknown_elevenlabs_output_format_is_rejected_at_configuration(self):
        with self.assertRaises(SpeechConfigurationError):
            ElevenLabsSpeechProvider(output_format="ulaw_8000")


class RetrySafetyTests(unittest.TestCase):
    def test_retryable_http_error_retries_then_succeeds(self):
        calls = []
        sleeps = []

        def opener(request, *, timeout):
            calls.append(request)
            if len(calls) == 1:
                raise urllib.error.HTTPError(
                    request.full_url,
                    429,
                    "rate limited",
                    hdrs=None,
                    fp=None,
                )
            return _Response(b"OK")

        provider = OpenAISpeechProvider(
            opener=opener,
            retry_policy=RetryPolicy(
                max_attempts=2,
                initial_delay_seconds=0.01,
                max_delay_seconds=0.01,
                jitter_fraction=0,
            ),
            sleep=sleeps.append,
        )
        with patch.dict(os.environ, {"OPENAI_API_KEY": "secret"}, clear=False):
            audio = provider.synthesize(
                SpeechRequest(text="x", provider_id="openai", voice_id="alloy")
            )
        self.assertEqual(audio, b"OK")
        self.assertEqual(len(calls), 2)
        self.assertEqual(sleeps, [0.01])

    def test_terminal_http_error_is_sanitized(self):
        def opener(request, *, timeout):
            raise urllib.error.HTTPError(
                request.full_url,
                401,
                "provider body might contain sensitive material",
                hdrs=None,
                fp=None,
            )

        provider = OpenAISpeechProvider(
            opener=opener,
            retry_policy=RetryPolicy(max_attempts=1),
        )
        with patch.dict(os.environ, {"OPENAI_API_KEY": "never-print-me"}, clear=False):
            with self.assertRaises(SpeechProviderError) as caught:
                provider.synthesize(
                    SpeechRequest(text="x", provider_id="openai", voice_id="alloy")
                )
        message = str(caught.exception)
        self.assertIn("HTTP 401", message)
        self.assertNotIn("never-print-me", message)
        self.assertNotIn("sensitive material", message)
        self.assertFalse(caught.exception.retryable)


if __name__ == "__main__":
    unittest.main()
