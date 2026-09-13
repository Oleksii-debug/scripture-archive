from __future__ import annotations

import hashlib
import json
import os
import random
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any, Callable, Mapping, Protocol

_ALLOWED_FORMATS = frozenset({"mp3", "opus", "aac", "flac", "wav", "pcm"})
_ALLOWED_PURPOSES = frozenset(
    {
        "scripture",
        "task_prompt",
        "feedback",
        "hint",
        "ui",
        "research",
        "personal_note",
    }
)
_NETWORK_SCHEMES = frozenset({"https"})


class SpeechError(RuntimeError):
    """Base error for the presentation-only speech subsystem."""


class SpeechValidationError(SpeechError):
    """Raised when a request violates the stable speech contract."""


class SpeechConfigurationError(SpeechError):
    """Raised when provider configuration is incomplete or unsafe."""


class SpeechProviderError(SpeechError):
    """Sanitized provider failure. Provider response bodies are intentionally omitted."""

    def __init__(
        self,
        message: str,
        *,
        provider_id: str,
        status_code: int | None = None,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.provider_id = provider_id
        self.status_code = status_code
        self.retryable = retryable


@dataclass(frozen=True, slots=True)
class SpeechRequest:
    """Exact text to synthesize.

    `voice_id` and `purpose` are presentation metadata only. They must never be
    used to infer source truth, speaker identity, witness harmonization, or grading.
    """

    text: str
    provider_id: str
    voice_id: str
    model: str | None = None
    response_format: str = "mp3"
    language: str | None = None
    purpose: str = "scripture"
    speed: float = 1.0
    instructions: str | None = None
    private_text: bool = False

    def validated(self) -> "SpeechRequest":
        if not isinstance(self.text, str) or not self.text.strip():
            raise SpeechValidationError("Speech text must be non-empty")
        if "\x00" in self.text:
            raise SpeechValidationError("Speech text must not contain NUL")
        provider_id = _require_identifier(self.provider_id, "provider_id")
        voice_id = _require_identifier(self.voice_id, "voice_id")
        response_format = str(self.response_format).strip().lower()
        if response_format not in _ALLOWED_FORMATS:
            raise SpeechValidationError(
                f"Unsupported response_format: {response_format or '<empty>'}"
            )
        purpose = str(self.purpose).strip().lower()
        if purpose not in _ALLOWED_PURPOSES:
            raise SpeechValidationError(f"Unsupported speech purpose: {purpose or '<empty>'}")
        try:
            speed = float(self.speed)
        except (TypeError, ValueError) as exc:
            raise SpeechValidationError("Speech speed must be numeric") from exc
        if not 0.25 <= speed <= 4.0:
            raise SpeechValidationError("Speech speed must be between 0.25 and 4.0")
        model = _optional_clean(self.model, "model")
        language = _optional_clean(self.language, "language")
        instructions = _optional_clean(self.instructions, "instructions", max_length=2000)
        return replace(
            self,
            provider_id=provider_id,
            voice_id=voice_id,
            model=model,
            response_format=response_format,
            language=language,
            purpose=purpose,
            speed=speed,
            instructions=instructions,
            private_text=bool(self.private_text),
        )


@dataclass(frozen=True, slots=True)
class SpeechArtifact:
    provider_id: str
    voice_id: str
    model: str | None
    response_format: str
    cache_key: str
    cache_path: str
    byte_length: int
    from_cache: bool


@dataclass(frozen=True, slots=True)
class RetryPolicy:
    max_attempts: int = 3
    initial_delay_seconds: float = 0.25
    max_delay_seconds: float = 2.0
    jitter_fraction: float = 0.2

    def __post_init__(self) -> None:
        if not 1 <= int(self.max_attempts) <= 6:
            raise SpeechConfigurationError("max_attempts must be between 1 and 6")
        if self.initial_delay_seconds < 0 or self.max_delay_seconds < 0:
            raise SpeechConfigurationError("Retry delays must be non-negative")
        if self.max_delay_seconds < self.initial_delay_seconds:
            raise SpeechConfigurationError("max_delay_seconds must be >= initial_delay_seconds")
        if not 0 <= self.jitter_fraction <= 1:
            raise SpeechConfigurationError("jitter_fraction must be between 0 and 1")


class SpeechProvider(Protocol):
    provider_id: str
    is_network: bool
    max_chars: int | None

    def synthesize(self, request: SpeechRequest) -> bytes:
        ...

    def cache_descriptor(self, request: SpeechRequest) -> Mapping[str, Any]:
        ...


class SpeechProviderRegistry:
    """Registry keeps vendor selection outside domain/game logic."""

    def __init__(self) -> None:
        self._providers: dict[str, SpeechProvider] = {}

    def register(self, provider: SpeechProvider, *, replace_existing: bool = False) -> None:
        provider_id = _require_identifier(provider.provider_id, "provider.provider_id")
        if provider_id in self._providers and not replace_existing:
            raise SpeechConfigurationError(f"Speech provider already registered: {provider_id}")
        self._providers[provider_id] = provider

    def get(self, provider_id: str) -> SpeechProvider:
        provider_id = _require_identifier(provider_id, "provider_id")
        try:
            return self._providers[provider_id]
        except KeyError as exc:
            raise SpeechConfigurationError(
                f"Speech provider is not registered: {provider_id}"
            ) from exc

    def provider_ids(self) -> tuple[str, ...]:
        return tuple(sorted(self._providers))


class SpeechCache:
    """Content-addressed cache; text and secrets are never written to metadata."""

    def __init__(self, root: str | Path) -> None:
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def make_key(request: SpeechRequest, provider: SpeechProvider) -> str:
        validated = request.validated()
        descriptor = {
            "contract": "SCRIPTURE_ARCHIVE_SPEECH_CACHE_v1",
            "provider": dict(provider.cache_descriptor(validated)),
            "request": {
                "provider_id": validated.provider_id,
                "voice_id": validated.voice_id,
                "model": validated.model,
                "response_format": validated.response_format,
                "language": validated.language,
                "purpose": validated.purpose,
                "speed": validated.speed,
                "instructions": validated.instructions,
                "private_text": validated.private_text,
                "text": validated.text,
            },
        }
        canonical = json.dumps(
            descriptor,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        return hashlib.sha256(canonical).hexdigest()

    def path_for(self, key: str, response_format: str) -> Path:
        if len(key) != 64 or any(ch not in "0123456789abcdef" for ch in key):
            raise SpeechValidationError("Invalid cache key")
        response_format = str(response_format).strip().lower()
        if response_format not in _ALLOWED_FORMATS:
            raise SpeechValidationError("Invalid cache format")
        return self.root / f"{key}.{response_format}"

    def get(self, key: str, response_format: str) -> Path | None:
        path = self.path_for(key, response_format)
        if path.is_symlink():
            return None
        if path.is_file() and path.stat().st_size > 0:
            return path
        return None

    def put(self, key: str, response_format: str, audio: bytes) -> Path:
        if not isinstance(audio, (bytes, bytearray)) or not audio:
            raise SpeechProviderError(
                "Speech provider returned empty audio",
                provider_id="cache",
                retryable=False,
            )
        target = self.path_for(key, response_format)
        tmp_name: str | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=".speech-",
                suffix=".tmp",
                dir=self.root,
                delete=False,
            ) as handle:
                tmp_name = handle.name
                handle.write(bytes(audio))
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_name, target)
            tmp_name = None
            _fsync_directory(self.root)
            return target
        finally:
            if tmp_name:
                try:
                    Path(tmp_name).unlink(missing_ok=True)
                except OSError:
                    pass


class SpeechService:
    """Provider-agnostic synthesis boundary used by desktop or future web adapters."""

    def __init__(self, registry: SpeechProviderRegistry, cache: SpeechCache) -> None:
        self.registry = registry
        self.cache = cache

    def synthesize(self, request: SpeechRequest, *, use_cache: bool = True) -> SpeechArtifact:
        validated = request.validated()
        provider = self.registry.get(validated.provider_id)
        if provider.max_chars is not None and len(validated.text) > provider.max_chars:
            raise SpeechValidationError(
                f"Speech text exceeds {provider.provider_id} request limit "
                f"({len(validated.text)} > {provider.max_chars}); segment before synthesis"
            )

        cache_key = self.cache.make_key(validated, provider)
        if use_cache:
            cached = self.cache.get(cache_key, validated.response_format)
            if cached is not None:
                return _artifact_for(
                    validated, provider, cache_key, cached, from_cache=True
                )

        audio = provider.synthesize(validated)
        path = self.cache.put(cache_key, validated.response_format, audio)
        return _artifact_for(
            validated, provider, cache_key, path, from_cache=False
        )


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Credential-bearing API requests must never follow redirects automatically."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class _NetworkProviderBase:
    is_network = True

    def __init__(
        self,
        *,
        provider_id: str,
        secret_env: str,
        endpoint: str,
        timeout_seconds: float = 30.0,
        allow_private_text: bool = False,
        retry_policy: RetryPolicy | None = None,
        opener: Callable[..., Any] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        random_uniform: Callable[[float, float], float] = random.uniform,
    ) -> None:
        self.provider_id = _require_identifier(provider_id, "provider_id")
        self.secret_env = _require_env_name(secret_env)
        self.endpoint = _require_https_endpoint(endpoint)
        self.timeout_seconds = float(timeout_seconds)
        if not 1 <= self.timeout_seconds <= 120:
            raise SpeechConfigurationError("timeout_seconds must be between 1 and 120")
        self.allow_private_text = bool(allow_private_text)
        self.retry_policy = retry_policy or RetryPolicy()
        self._opener = opener or urllib.request.build_opener(_NoRedirectHandler()).open
        self._sleep = sleep
        self._random_uniform = random_uniform

    def _secret(self) -> str:
        value = os.environ.get(self.secret_env, "")
        if not value.strip():
            raise SpeechConfigurationError(
                f"Required speech credential environment variable is not set: {self.secret_env}"
            )
        return value.strip()

    def _guard_request(self, request: SpeechRequest) -> None:
        if request.private_text and not self.allow_private_text:
            raise SpeechValidationError(
                "Private/personal text is blocked for network speech providers unless explicitly enabled"
            )

    def _post(self, *, url: str, headers: Mapping[str, str], body: Mapping[str, Any]) -> bytes:
        endpoint = _require_https_endpoint(url)
        payload = json.dumps(
            dict(body), ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        request = urllib.request.Request(
            endpoint,
            data=payload,
            headers=dict(headers),
            method="POST",
        )
        policy = self.retry_policy
        for attempt in range(1, policy.max_attempts + 1):
            try:
                response = self._opener(request, timeout=self.timeout_seconds)
                if hasattr(response, "__enter__"):
                    with response as opened:
                        data = opened.read()
                else:
                    data = response.read()
                if not data:
                    raise SpeechProviderError(
                        "Speech provider returned empty audio",
                        provider_id=self.provider_id,
                        retryable=False,
                    )
                return bytes(data)
            except urllib.error.HTTPError as exc:
                retryable = exc.code == 429 or 500 <= exc.code <= 599
                if retryable and attempt < policy.max_attempts:
                    self._sleep(self._retry_delay(attempt))
                    continue
                raise SpeechProviderError(
                    f"Speech provider request failed with HTTP {exc.code}",
                    provider_id=self.provider_id,
                    status_code=exc.code,
                    retryable=retryable,
                ) from None
            except urllib.error.URLError:
                retryable = True
                if attempt < policy.max_attempts:
                    self._sleep(self._retry_delay(attempt))
                    continue
                raise SpeechProviderError(
                    "Speech provider network request failed",
                    provider_id=self.provider_id,
                    retryable=True,
                ) from None
            except TimeoutError:
                if attempt < policy.max_attempts:
                    self._sleep(self._retry_delay(attempt))
                    continue
                raise SpeechProviderError(
                    "Speech provider request timed out",
                    provider_id=self.provider_id,
                    retryable=True,
                ) from None
        raise AssertionError("retry loop exhausted unexpectedly")

    def _retry_delay(self, attempt: int) -> float:
        policy = self.retry_policy
        base = min(
            policy.max_delay_seconds,
            policy.initial_delay_seconds * (2 ** max(0, attempt - 1)),
        )
        if base == 0 or policy.jitter_fraction == 0:
            return base
        jitter = self._random_uniform(0.0, base * policy.jitter_fraction)
        return min(policy.max_delay_seconds, base + jitter)


class OpenAISpeechProvider(_NetworkProviderBase):
    """Adapter for OpenAI POST /v1/audio/speech."""

    max_chars = 4096

    def __init__(
        self,
        *,
        secret_env: str = "OPENAI_API_KEY",
        endpoint: str = "https://api.openai.com/v1/audio/speech",
        default_model: str = "gpt-4o-mini-tts",
        timeout_seconds: float = 30.0,
        allow_private_text: bool = False,
        retry_policy: RetryPolicy | None = None,
        opener: Callable[..., Any] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        random_uniform: Callable[[float, float], float] = random.uniform,
    ) -> None:
        super().__init__(
            provider_id="openai",
            secret_env=secret_env,
            endpoint=endpoint,
            timeout_seconds=timeout_seconds,
            allow_private_text=allow_private_text,
            retry_policy=retry_policy,
            opener=opener,
            sleep=sleep,
            random_uniform=random_uniform,
        )
        _require_official_endpoint(
            self.endpoint,
            expected_host="api.openai.com",
            expected_path="/v1/audio/speech",
        )
        self.default_model = _require_identifier(default_model, "default_model", max_length=128)

    def cache_descriptor(self, request: SpeechRequest) -> Mapping[str, Any]:
        return {
            "provider_id": self.provider_id,
            "endpoint": self.endpoint,
            "model": request.model or self.default_model,
            "adapter_contract": "openai_audio_speech_v1",
        }

    def synthesize(self, request: SpeechRequest) -> bytes:
        request = request.validated()
        if request.provider_id != self.provider_id:
            raise SpeechValidationError("Speech request/provider mismatch")
        self._guard_request(request)
        if len(request.text) > self.max_chars:
            raise SpeechValidationError(
                f"OpenAI speech input exceeds {self.max_chars} characters"
            )
        body: dict[str, Any] = {
            "model": request.model or self.default_model,
            "voice": request.voice_id,
            "input": request.text,
            "response_format": request.response_format,
            "speed": request.speed,
        }
        effective_model = request.model or self.default_model
        if request.instructions and effective_model in {"tts-1", "tts-1-hd"}:
            raise SpeechValidationError(
                f"Speech instructions are not supported by OpenAI model {effective_model}"
            )
        if request.instructions:
            body["instructions"] = request.instructions
        return self._post(
            url=self.endpoint,
            headers={
                "Authorization": f"Bearer {self._secret()}",
                "Content-Type": "application/json",
                "Accept": _accept_for_format(request.response_format),
            },
            body=body,
        )


class ElevenLabsSpeechProvider(_NetworkProviderBase):
    """Adapter for ElevenLabs POST /v1/text-to-speech/{voice_id}."""

    max_chars = None

    def __init__(
        self,
        *,
        secret_env: str = "ELEVENLABS_API_KEY",
        endpoint: str = "https://api.elevenlabs.io/v1/text-to-speech",
        default_model: str = "eleven_multilingual_v2",
        output_format: str = "mp3_44100_128",
        timeout_seconds: float = 30.0,
        allow_private_text: bool = False,
        retry_policy: RetryPolicy | None = None,
        opener: Callable[..., Any] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        random_uniform: Callable[[float, float], float] = random.uniform,
    ) -> None:
        super().__init__(
            provider_id="elevenlabs",
            secret_env=secret_env,
            endpoint=endpoint,
            timeout_seconds=timeout_seconds,
            allow_private_text=allow_private_text,
            retry_policy=retry_policy,
            opener=opener,
            sleep=sleep,
            random_uniform=random_uniform,
        )
        _require_official_endpoint(
            self.endpoint,
            expected_host="api.elevenlabs.io",
            expected_path="/v1/text-to-speech",
        )
        self.default_model = _require_identifier(default_model, "default_model", max_length=128)
        self.output_format = _require_identifier(output_format, "output_format", max_length=64)
        self.response_format = _elevenlabs_response_format(self.output_format)

    def cache_descriptor(self, request: SpeechRequest) -> Mapping[str, Any]:
        return {
            "provider_id": self.provider_id,
            "endpoint": self.endpoint,
            "model": request.model or self.default_model,
            "output_format": self.output_format,
            "adapter_contract": "elevenlabs_tts_v1",
        }

    def synthesize(self, request: SpeechRequest) -> bytes:
        request = request.validated()
        if request.provider_id != self.provider_id:
            raise SpeechValidationError("Speech request/provider mismatch")
        self._guard_request(request)
        if request.response_format != self.response_format:
            raise SpeechValidationError(
                f"ElevenLabs output_format {self.output_format} produces {self.response_format}; "
                f"request asked for {request.response_format}"
            )
        if request.instructions:
            raise SpeechValidationError(
                "ElevenLabs adapter does not accept OpenAI-style speech instructions"
            )
        if not 0.7 <= request.speed <= 1.2:
            raise SpeechValidationError(
                "ElevenLabs speech speed must be between 0.7 and 1.2"
            )
        effective_model = request.model or self.default_model
        if request.language and effective_model == "eleven_multilingual_v2":
            raise SpeechValidationError(
                "ElevenLabs multilingual_v2 does not support language_code; "
                "omit language rather than silently ignoring it"
            )
        voice = urllib.parse.quote(request.voice_id, safe="")
        url = f"{self.endpoint.rstrip('/')}/{voice}?{urllib.parse.urlencode({'output_format': self.output_format})}"
        body: dict[str, Any] = {
            "text": request.text,
            "model_id": effective_model,
            "voice_settings": {"speed": request.speed},
        }
        if request.language:
            body["language_code"] = request.language
        return self._post(
            url=url,
            headers={
                "xi-api-key": self._secret(),
                "Content-Type": "application/json",
                "Accept": _accept_for_format(self.response_format),
            },
            body=body,
        )


def build_default_speech_registry(
    *,
    include_openai: bool = True,
    include_elevenlabs: bool = True,
) -> SpeechProviderRegistry:
    registry = SpeechProviderRegistry()
    if include_openai:
        registry.register(OpenAISpeechProvider())
    if include_elevenlabs:
        registry.register(ElevenLabsSpeechProvider())
    return registry


def _artifact_for(
    request: SpeechRequest,
    provider: SpeechProvider,
    cache_key: str,
    path: Path,
    *,
    from_cache: bool,
) -> SpeechArtifact:
    descriptor = dict(provider.cache_descriptor(request))
    model_value = descriptor.get("model")
    return SpeechArtifact(
        provider_id=request.provider_id,
        voice_id=request.voice_id,
        model=str(model_value) if model_value is not None else request.model,
        response_format=request.response_format,
        cache_key=cache_key,
        cache_path=str(path),
        byte_length=path.stat().st_size,
        from_cache=from_cache,
    )


def _require_official_endpoint(
    endpoint: str,
    *,
    expected_host: str,
    expected_path: str,
) -> None:
    parsed = urllib.parse.urlparse(endpoint)
    if (
        (parsed.hostname or "").lower() != expected_host
        or parsed.path.rstrip("/") != expected_path.rstrip("/")
        or parsed.query
        or parsed.fragment
    ):
        raise SpeechConfigurationError(
            f"Official speech adapter endpoint must remain on {expected_host}{expected_path}"
        )


def _elevenlabs_response_format(output_format: str) -> str:
    lowered = output_format.lower()
    if lowered.startswith("mp3_"):
        return "mp3"
    if lowered.startswith("pcm_"):
        return "pcm"
    if lowered.startswith("opus_"):
        return "opus"
    raise SpeechConfigurationError(
        "ElevenLabs output_format must map to a supported cache format (mp3, pcm, or opus)"
    )


def _accept_for_format(response_format: str) -> str:
    return {
        "mp3": "audio/mpeg",
        "opus": "audio/ogg",
        "aac": "audio/aac",
        "flac": "audio/flac",
        "wav": "audio/wav",
        "pcm": "application/octet-stream",
    }[response_format]


def _require_identifier(
    value: str,
    field: str,
    *,
    max_length: int = 256,
) -> str:
    if not isinstance(value, str):
        raise SpeechValidationError(f"{field} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise SpeechValidationError(f"{field} must be non-empty")
    if len(cleaned) > max_length or any(ord(ch) < 32 for ch in cleaned):
        raise SpeechValidationError(f"{field} is invalid")
    return cleaned


def _optional_clean(
    value: str | None,
    field: str,
    *,
    max_length: int = 256,
) -> str | None:
    if value is None:
        return None
    return _require_identifier(value, field, max_length=max_length)


def _require_env_name(value: str) -> str:
    cleaned = _require_identifier(value, "secret_env", max_length=128)
    if not all(ch.isupper() or ch.isdigit() or ch == "_" for ch in cleaned):
        raise SpeechConfigurationError("secret_env must be an uppercase environment variable name")
    return cleaned


def _require_https_endpoint(value: str) -> str:
    cleaned = _require_identifier(value, "endpoint", max_length=2048)
    parsed = urllib.parse.urlparse(cleaned)
    if parsed.scheme not in _NETWORK_SCHEMES or not parsed.netloc or parsed.username or parsed.password:
        raise SpeechConfigurationError("Speech provider endpoint must be credential-free HTTPS")
    return cleaned


def _fsync_directory(path: Path) -> None:
    flags = getattr(os, "O_DIRECTORY", 0)
    try:
        fd = os.open(str(path), os.O_RDONLY | flags)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)
