import base64
import tempfile
import unittest
from pathlib import Path

from _fixture import make_repo
from runtime_engine.scripture_archive_runtime.speech import SpeechCache, SpeechProviderRegistry, SpeechService
from scripture_archive_platform.application.speech_application import SpeechPlatformApplication
from scripture_archive_platform.persistence.store import JsonFileStore
from scripture_archive_platform.transport.contracts import validate_request_shape


class FakeNetworkProvider:
    provider_id = 'fake'
    is_network = True
    max_chars = None

    def __init__(self):
        self.requests = []

    def cache_descriptor(self, request):
        return {'provider_id': self.provider_id, 'model': 'fake-v1', 'adapter_contract': 'test-only'}

    def synthesize(self, request):
        self.requests.append(request)
        return b'ID3-packaged-speech-proof'


class FakeGateway:
    def __init__(self, node_id='LN01-N01'):
        self._current_node_getter = lambda: node_id


class PackagedSpeechTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.repo = make_repo(root / 'repo')
        self.provider = FakeNetworkProvider()
        registry = SpeechProviderRegistry()
        registry.register(self.provider)
        service = SpeechService(registry, SpeechCache(root / 'speech-cache'))
        self.app = SpeechPlatformApplication(
            self.repo,
            store=JsonFileStore(root / 'store'),
            player_gateway=FakeGateway(),
            speech_service=service,
            speech_defaults={'fake': 'voice-a'},
        )

    def tearDown(self):
        self.temp.cleanup()

    def request(self, command, payload):
        return self.app.handle({
            'api_version': 'scripture.transport.v1',
            'request_id': 'speech-test',
            'command': command,
            'payload': payload,
        })

    def test_status_exposes_no_secret_and_is_current_prompt_only(self):
        response = self.request('speech.status', {})
        self.assertTrue(response['ok'], response)
        data = response['data']
        self.assertTrue(data['available'])
        self.assertEqual('current_canonical_task_prompt_only', data['supported_surface'])
        self.assertFalse(data['private_text_supported'])
        self.assertEqual('fake', data['providers'][0]['provider_id'])
        self.assertNotIn('secret', repr(data).lower())
        self.assertNotIn('api_key', repr(data).lower())

    def test_transport_rejects_arbitrary_text_node_and_path_fields(self):
        base = {'provider_id': 'fake', 'voice_id': 'voice-a', 'speed': 1.0, 'allow_network': True}
        for forbidden in ('text', 'node_id', 'path', 'model', 'instructions', 'private_text'):
            payload = dict(base)
            payload[forbidden] = 'attacker-controlled'
            with self.assertRaisesRegex(ValueError, 'presentation preferences only'):
                validate_request_shape({
                    'api_version': 'scripture.transport.v1',
                    'request_id': 'security',
                    'command': 'speech.synthesize_prompt',
                    'payload': payload,
                })

    def test_explicit_network_consent_is_required(self):
        response = self.request('speech.synthesize_prompt', {
            'provider_id': 'fake', 'voice_id': 'voice-a', 'speed': 1.0, 'allow_network': False,
        })
        self.assertFalse(response['ok'])
        self.assertIn('explicit network speech consent', response['error']['message'])
        self.assertEqual([], self.provider.requests)

    def test_synthesis_uses_exact_current_canonical_prompt_and_hides_cache_path(self):
        expected = self.app.mapper.to_renderable(
            self.app.loader.load_node('LN01-N01'),
            self.app.loader.mission_for_node('LN01-N01'),
        )['prompt'].strip()
        response = self.request('speech.synthesize_prompt', {
            'provider_id': 'fake', 'voice_id': 'voice-a', 'speed': 1.0, 'allow_network': True,
        })
        self.assertTrue(response['ok'], response)
        data = response['data']
        self.assertEqual('LN01-N01', data['node_id'])
        self.assertEqual(expected, self.provider.requests[-1].text)
        self.assertFalse(self.provider.requests[-1].private_text)
        self.assertEqual('task_prompt', self.provider.requests[-1].purpose)
        self.assertEqual(b'ID3-packaged-speech-proof', base64.b64decode(data['audio_base64']))
        self.assertNotIn('cache_path', data)
        self.assertNotIn('text', data)
        self.assertEqual('presentation-only', data['truth_owner'])


if __name__ == '__main__':
    unittest.main()
