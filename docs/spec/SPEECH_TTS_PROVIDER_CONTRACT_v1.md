# SPEECH / TTS PROVIDER CONTRACT v1

Status: R06 foundation contract  
Scope: presentation-layer speech synthesis for Scripture Archive  
Primary runtime: Windows 11 x64; web portability required

## 1. Purpose

Scripture Archive may speak Scripture text, task prompts, feedback, hints, research text, and selected UI text through external text-to-speech providers. Speech is an optional presentation layer. It never replaces semantic HTML, NVDA, keyboard operation, or complete visible text.

The speech subsystem MUST NOT become a source of biblical truth. The exact already-authorized player-visible text is the synthesis input. A provider may render that text as audio; it may not rewrite, summarize, harmonize, infer a missing speaker, or change grading/evidence semantics.

## 2. Source-safety rules

1. Audio text is derived from the exact canonical/player-visible string supplied by the caller.
2. Voice selection is presentation metadata only. A voice called `narrator`, `male`, `Paul`, or any other label does not prove speaker identity.
3. No witness detail may be imported from another witness to improve narration.
4. TX1, T1/T2/C1/I1/D1, evidence IDs, passage scopes, accepted answers, and grading remain owned by canonical content/runtime layers.
5. When a cited text does not establish a speaker or fact, speech must not imply that it does.
6. TTS errors never change task correctness, mastery, branching, or source truth.

## 3. Stable internal API

`SpeechRequest` carries:
- exact `text`;
- `provider_id`;
- `voice_id`;
- optional `model`;
- `response_format`;
- optional `language`;
- presentation-only `purpose`;
- playback-generation `speed`;
- optional provider-supported `instructions`;
- `private_text` privacy flag.

`SpeechProviderRegistry` resolves provider adapters. Domain/game logic must depend on the registry/service contract, not vendor HTTP APIs.

`SpeechService`:
1. validates the request;
2. resolves the provider;
3. computes a deterministic cache key;
4. reuses a cached artifact when available;
5. otherwise calls the provider;
6. atomically writes the generated audio;
7. returns metadata/path, not source-truth changes.

## 4. Current adapters

### OpenAI

Adapter ID: `openai`

Current official endpoint:
`POST https://api.openai.com/v1/audio/speech`

Credential reference:
`OPENAI_API_KEY`

The key is read from the environment at request time and is never stored in content, state, cache metadata, Git, or release ZIPs.

The adapter supports the shared response formats accepted by the current OpenAI speech endpoint. The default model is configurable and currently defaults to `gpt-4o-mini-tts`. Provider-specific instructions are rejected when the selected model does not support them.

The OpenAI endpoint currently documents a 4096-character request-input limit. Longer Scripture/research narration must be segmented by a higher presentation layer; the foundation fails closed rather than silently truncating text.

### ElevenLabs

Adapter ID: `elevenlabs`

Current official endpoint:
`POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`

Credential reference:
`ELEVENLABS_API_KEY`

The voice ID is explicit presentation configuration. The current default model is configurable and defaults to `eleven_multilingual_v2`. The configured ElevenLabs `output_format` must map to the cache format; the adapter refuses mismatched declarations rather than writing MP3 bytes under a WAV filename.

OpenAI-style `instructions` are not silently discarded by this adapter; unsupported controls fail closed.

## 5. Privacy boundary

Network speech is OFF for `private_text=True` unless the provider adapter is explicitly configured with `allow_private_text=True`.

This matters for:
- personal notes;
- private research annotations;
- imported user text;
- future connected/private sources.

A future UI must state clearly when a network provider will receive text. The application must remain usable with TTS disabled.

Secrets:
- are referenced only by environment-variable name;
- do not participate in cache keys;
- do not appear in sanitized provider errors;
- must never be exported in content packs, research exports, state files, logs, or release packages.

## 6. Cache and offline behavior

Generated audio is content-addressed by a SHA-256 over canonical request/provider settings. The plain synthesis text is not used as a filename and is not written to speech-cache metadata by this foundation.

Cache writes are atomic (`fsync` + replace). A cached artifact can be replayed without another paid/network request.

Long-term release behavior should support:
- configurable cache location and size limit;
- clear-cache command;
- offline replay of already cached speech;
- optional OS/local speech provider as a no-network fallback;
- explicit indication when requested audio is unavailable offline.

No external API call is required for core gameplay.

## 7. Retry and failure policy

Network adapters:
- use HTTPS-only credential-free endpoints;
- use bounded timeouts;
- retry only transient network errors, HTTP 429, and HTTP 5xx;
- use bounded exponential backoff with jitter;
- do not retry authentication/validation failures as if transient;
- do not include provider response bodies in user-facing/runtime exceptions.

A TTS failure returns a presentation error. It does not fail grading, change mastery, or invalidate canonical text.

## 8. Accessibility / keyboard contract for UI convergence

The eventual packaged UI must provide keyboard-reachable controls for:
- Speak / Play;
- Pause / Resume when the playback backend supports it;
- Stop;
- Replay;
- speech rate;
- provider;
- voice;
- optional automatic reading preferences.

Every control requires a label and visible/focus state. Playback state and errors require text/live-status equivalents. Audio must never be the sole way to receive feedback, hints, evidence, or task instructions.

NVDA speech and application TTS are independent channels. Application audio must not steal focus. Automatic narration must be user-configurable so it does not fight the screen reader.

## 9. Pedagogical contract

Speech supports pedagogy rather than replacing it.

Permitted narration targets include:
- exact cited Scripture/passages;
- task prompts;
- substantive feedback;
- progressive hints;
- retrieval/review prompts;
- research summaries that are already authorized visible text.

Narration must preserve distinctions among:
`EXACT`, `VARIANT`, `PASSAGE_REVISIT`, `CROSS_CONTEXT`, and `SYNTHESIS`.

The scheduler, mastery model, hint cost, attempt independence, due state, fatigue logic, and retrieval spacing remain deterministic runtime state. A spoken replay does not create a new answer, mastery event, source exposure class, or correctness result unless the canonical pedagogy specification explicitly defines such an event.

## 10. Testing requirements

Foundation tests must use fake HTTP/provider boundaries and make no paid network calls.

Required regression coverage:
- registry duplicate prevention;
- exact input preservation;
- deterministic cache reuse;
- no secret in cache identity;
- credential-missing fail-closed behavior;
- private network text blocked by default;
- correct OpenAI HTTP boundary;
- correct ElevenLabs HTTP boundary;
- output-format consistency;
- unsupported provider controls fail closed;
- transient retry behavior;
- sanitized terminal errors;
- HTTPS-only endpoints.

Later UI convergence additionally requires packaged keyboard/accessibility tests and real playback smoke evidence. Automated mocks do not equal physical Windows/WebView2/audio-device or human NVDA acceptance.

## 11. Integration rule

This module is intentionally UI-neutral and vendor-neutral. Desktop WebView2 and future web transports should invoke one application-level speech command layer which then uses this registry/service. Vendor API keys remain host/server-side and never cross into browser JavaScript.

No direct provider call from content JSON, renderer code, or browser frontend is allowed.
