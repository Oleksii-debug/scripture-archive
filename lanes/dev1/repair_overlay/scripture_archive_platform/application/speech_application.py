from __future__ import annotations

import base64
import os
from pathlib import Path
from typing import Any

from runtime_engine.scripture_archive_runtime.speech import (
    ElevenLabsSpeechProvider,
    OpenAISpeechProvider,
    SpeechCache,
    SpeechError,
    SpeechProviderRegistry,
    SpeechRequest,
    SpeechService,
)
from scripture_archive_platform.application.witness_matrix_application import (
    WitnessMatrixPlatformApplication,
)
from scripture_archive_platform.persistence.store import JsonFileStore


_MAX_AUDIO_BYTES = 8 * 1024 * 1024
_MIME_TYPES = {
    "mp3": "audio/mpeg",
    "opus": "audio/ogg",
    "aac": "audio/aac",
    "flac": "audio/flac",
    "wav": "audio/wav",
    "pcm": "application/octet-stream",
}


class SpeechPlatformApplication(WitnessMatrixPlatformApplication):
    """Package presentation-only speech without moving content or grading truth.

    The public synthesis command accepts presentation preferences only. It does
    not accept node ids or speech text. The host resolves the runtime's current
    canonical node and then resolves the exact visible player prompt from the
    canonical loader, so the bridge cannot become an arbitrary-text channel.
    """

    def __init__(
        self,
        *args,
        speech_service: SpeechService | None = None,
        speech_defaults: dict[str, str] | None = None,
        **kwargs,
    ) -> None:
        super().__init__(*args, **kwargs)
        if speech_service is None:
            speech_service, built_defaults = _build_speech_service(self.store.root)
        else:
            built_defaults = {}
        self.speech_service = speech_service
        self.speech_defaults = dict(built_defaults)
        if speech_defaults:
            self.speech_defaults.update({str(k): str(v) for k, v in speech_defaults.items()})

    def _dispatch(self, cmd, payload):
        if cmd == "speech.status":
            if payload:
                raise ValueError("speech.status accepts an empty payload")
            return self._speech_status()
        if cmd == "speech.synthesize_prompt":
            return self._synthesize_prompt(payload)
        return super()._dispatch(cmd, payload)

    def _bootstrap(self):
        data = super()._bootstrap()
        configured = bool(self.speech_service.registry.provider_ids())
        data["capabilities"]["speech"] = bool(self.player_gateway)
        data["capabilities"]["speech_network_configured"] = configured
        return data

    def _speech_status(self) -> dict[str, Any]:
        providers = []
        for provider_id in self.speech_service.registry.provider_ids():
            provider = self.speech_service.registry.get(provider_id)
            providers.append(
                {
                    "provider_id": provider_id,
                    "network": bool(getattr(provider, "is_network", False)),
                    "default_voice": self.speech_defaults.get(provider_id, ""),
                }
            )
        return {
            "schema": "scripture.packaged-speech.v1",
            "available": bool(self.player_gateway and providers),
            "providers": providers,
            "network_consent_required": True,
            "supported_surface": "current_canonical_task_prompt_only",
            "private_text_supported": False,
            "truth_owner": "presentation-only",
        }

    def _current_node_id(self) -> str:
        gateway = self.player_gateway
        getter = getattr(gateway, "_current_node_getter", None) if gateway is not None else None
        if not callable(getter):
            raise ValueError("speech requires the canonical packaged runtime")
        node_id = getter()
        if not isinstance(node_id, str) or not node_id.strip():
            raise ValueError("load a canonical task before requesting speech")
        return node_id.strip()

    def _synthesize_prompt(self, payload: dict[str, Any]) -> dict[str, Any]:
        provider_id = self._id(payload, "provider_id")
        voice_id = self._id(payload, "voice_id")
        allow_network = payload.get("allow_network")
        if type(allow_network) is not bool or not allow_network:
            raise ValueError("explicit network speech consent is required")
        if provider_id not in self.speech_service.registry.provider_ids():
            raise ValueError("speech provider is not configured")
        try:
            speed = float(payload.get("speed", 1.0))
        except (TypeError, ValueError) as exc:
            raise ValueError("speech speed must be numeric") from exc

        node_id = self._current_node_id()
        node = self.loader.load_node(node_id)
        mission = self.loader.mission_for_node(node_id)
        renderable = self.mapper.to_renderable(node, mission)
        prompt = str(renderable.get("prompt") or "").strip()
        if not prompt:
            raise ValueError("canonical player prompt is empty")

        request = SpeechRequest(
            text=prompt,
            provider_id=provider_id,
            voice_id=voice_id,
            response_format="mp3",
            purpose="task_prompt",
            speed=speed,
            private_text=False,
        )
        try:
            artifact = self.speech_service.synthesize(request)
        except SpeechError as exc:
            raise ValueError(f"speech synthesis rejected: {exc}") from None

        cache_root = self.speech_service.cache.root.resolve()
        cache_path = Path(artifact.cache_path)
        if cache_path.is_symlink():
            raise ValueError("speech cache artifact is not a regular file")
        resolved = cache_path.resolve()
        if resolved.parent != cache_root or not resolved.is_file():
            raise ValueError("speech cache artifact escaped the allowlisted cache root")
        size = resolved.stat().st_size
        if size <= 0 or size > _MAX_AUDIO_BYTES:
            raise ValueError("speech audio exceeds packaged playback limit")
        audio = resolved.read_bytes()
        if len(audio) != size:
            raise ValueError("speech audio changed while being read")

        mime_type = _MIME_TYPES.get(artifact.response_format)
        if mime_type is None:
            raise ValueError("unsupported packaged speech audio format")
        return {
            "schema": "scripture.packaged-speech.v1",
            "node_id": node_id,
            "provider_id": artifact.provider_id,
            "voice_id": artifact.voice_id,
            "response_format": artifact.response_format,
            "mime_type": mime_type,
            "audio_base64": base64.b64encode(audio).decode("ascii"),
            "byte_length": size,
            "from_cache": bool(artifact.from_cache),
            "spoken_surface": "current_canonical_task_prompt_only",
            "truth_owner": "presentation-only",
        }


def _build_speech_service(store_root: Path) -> tuple[SpeechService, dict[str, str]]:
    registry = SpeechProviderRegistry()
    defaults: dict[str, str] = {}

    # Credentials remain process environment only. Their values are never copied
    # into status, transport responses, package files, logs, or browser storage.
    if os.environ.get("OPENAI_API_KEY", "").strip():
        registry.register(OpenAISpeechProvider())
        defaults["openai"] = os.environ.get("SCRIPTURE_ARCHIVE_OPENAI_VOICE", "alloy").strip() or "alloy"
    if os.environ.get("ELEVENLABS_API_KEY", "").strip():
        registry.register(ElevenLabsSpeechProvider())
        defaults["elevenlabs"] = os.environ.get("SCRIPTURE_ARCHIVE_ELEVENLABS_VOICE", "").strip()

    cache = SpeechCache(Path(store_root) / "speech-cache")
    return SpeechService(registry, cache), defaults


def build_default_application(repo_root: Path | None = None, store_root: Path | None = None):
    """Build the exact current packaged app plus the speech presentation adapter."""
    if repo_root is None:
        repo_root = Path(__file__).resolve().parents[3]
    repo_root = Path(repo_root)
    store = JsonFileStore(store_root) if store_root else None
    effective_store = store or JsonFileStore(JsonFileStore.default_root())
    runtime_application = repo_root / "runtime_engine" / "scripture_archive_runtime" / "application.py"
    if runtime_application.exists():
        from scripture_archive_platform.application.runtime_gateway import build_runtime_gateway

        gateway = build_runtime_gateway(repo_root, effective_store.root)
        return SpeechPlatformApplication(repo_root, store=effective_store, player_gateway=gateway)
    return SpeechPlatformApplication(repo_root, store=effective_store)
