import {chooseTransport, unwrap} from './transport.js';

const PREF_KEY = 'scripture.archive.speech.preferences.v1';
let transport = null;

async function api(command, payload = {}) {
  if (!transport) transport = chooseTransport();
  return await unwrap(transport, command, payload);
}

function make(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function readPrefs() {
  try {
    const value = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) {
    return {};
  }
}

function writePrefs(value) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(value));
  } catch (_) {
    // Preference persistence is best-effort; speech itself remains usable.
  }
}

function requireStatus(data) {
  if (!data || data.schema !== 'scripture.packaged-speech.v1' || data.truth_owner !== 'presentation-only' || data.supported_surface !== 'current_canonical_task_prompt_only' || data.private_text_supported !== false || !Array.isArray(data.providers)) {
    throw new Error('Speech status failed packaged contract validation');
  }
  return data;
}

function requireAudio(data) {
  if (!data || data.schema !== 'scripture.packaged-speech.v1' || data.truth_owner !== 'presentation-only' || data.spoken_surface !== 'current_canonical_task_prompt_only') {
    throw new Error('Speech response failed packaged contract validation');
  }
  if (typeof data.audio_base64 !== 'string' || !data.audio_base64 || typeof data.mime_type !== 'string' || !data.mime_type.startsWith('audio/') || !Number.isInteger(data.byte_length) || data.byte_length <= 0) {
    throw new Error('Speech response did not contain valid audio');
  }
  return data;
}

function buildSurface(config) {
  const prompt = document.getElementById('player-prompt');
  if (!prompt || document.getElementById('packaged-speech')) return false;

  const prefs = readPrefs();
  const section = make('section');
  section.id = 'packaged-speech';
  section.setAttribute('aria-labelledby', 'packaged-speech-heading');

  const heading = make('h3', 'Озвучення поточного завдання');
  heading.id = 'packaged-speech-heading';
  const scope = make('p', 'Озвучення є лише presentation layer. Host передає провайдеру тільки canonical prompt поточного завдання після явної згоди; нотатки, відповіді, evidence і grading не передаються.');

  const providerLabel = make('label', 'Провайдер ');
  providerLabel.htmlFor = 'speech-provider';
  const provider = make('select');
  provider.id = 'speech-provider';
  for (const item of config.providers) {
    if (!item || typeof item.provider_id !== 'string' || !item.provider_id) continue;
    const option = make('option', item.provider_id);
    option.value = item.provider_id;
    provider.append(option);
  }

  const voiceLabel = make('label', ' Voice ID ');
  voiceLabel.htmlFor = 'speech-voice';
  const voice = make('input');
  voice.id = 'speech-voice';
  voice.type = 'text';
  voice.autocomplete = 'off';
  voice.maxLength = 256;

  const speedLabel = make('label', ' Швидкість ');
  speedLabel.htmlFor = 'speech-speed';
  const speed = make('input');
  speed.id = 'speech-speed';
  speed.type = 'number';
  speed.min = '0.7';
  speed.max = '1.2';
  speed.step = '0.1';
  speed.value = String(Number(prefs.speed) >= 0.7 && Number(prefs.speed) <= 1.2 ? Number(prefs.speed) : 1.0);

  const consentLabel = make('label');
  const consent = make('input');
  consent.type = 'checkbox';
  consent.id = 'speech-network-consent';
  consentLabel.append(consent, document.createTextNode(' Дозволити мережевий TTS для canonical prompt цього запиту'));

  const prepare = make('button', 'Підготувати аудіо');
  prepare.type = 'button';
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'none';
  audio.setAttribute('aria-label', 'Озвучення поточного canonical завдання');
  audio.hidden = true;
  const status = make('p', 'Озвучення готове до налаштування.');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.className = 'notice info';

  function selectedConfig() {
    return config.providers.find(item => item.provider_id === provider.value) || null;
  }
  function applyVoice() {
    const voices = prefs.voices && typeof prefs.voices === 'object' ? prefs.voices : {};
    const saved = voices[provider.value];
    const fallback = selectedConfig()?.default_voice || '';
    voice.value = typeof saved === 'string' && saved ? saved : fallback;
  }
  function persist() {
    const next = readPrefs();
    next.provider_id = provider.value;
    next.speed = Number(speed.value) || 1.0;
    next.voices = next.voices && typeof next.voices === 'object' ? next.voices : {};
    next.voices[provider.value] = voice.value;
    writePrefs(next);
  }

  if (config.providers.length) {
    const preferred = config.providers.find(item => item.provider_id === prefs.provider_id);
    provider.value = preferred ? preferred.provider_id : config.providers[0].provider_id;
    applyVoice();
  } else {
    prepare.disabled = true;
    provider.disabled = true;
    voice.disabled = true;
    speed.disabled = true;
    consent.disabled = true;
    status.textContent = 'Мережевий TTS не налаштовано в host environment. Жоден секрет не передано у WebView.';
  }

  provider.addEventListener('change', () => { applyVoice(); persist(); });
  voice.addEventListener('change', persist);
  speed.addEventListener('change', persist);
  prepare.addEventListener('click', async () => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.hidden = true;
    if (!consent.checked) {
      status.textContent = 'Для мережевого озвучення потрібна явна згода на цей запит.';
      consent.focus();
      return;
    }
    if (!voice.value.trim()) {
      status.textContent = 'Вкажіть Voice ID.';
      voice.focus();
      return;
    }
    prepare.disabled = true;
    status.textContent = 'Готується аудіо canonical prompt…';
    persist();
    try {
      const data = requireAudio(await api('speech.synthesize_prompt', {
        provider_id: provider.value,
        voice_id: voice.value.trim(),
        speed: Number(speed.value),
        allow_network: true,
      }));
      audio.src = `data:${data.mime_type};base64,${data.audio_base64}`;
      audio.hidden = false;
      status.textContent = `Аудіо готове (${data.byte_length} байт${data.from_cache ? ', cache' : ''}). Натисніть Play у стандартних аудіоконтролах.`;
      audio.focus();
    } catch (error) {
      status.textContent = `Озвучення недоступне: ${error.message}`;
    } finally {
      prepare.disabled = false;
      consent.checked = false;
    }
  });

  const controls = make('div');
  controls.className = 'action-row';
  providerLabel.append(provider);
  voiceLabel.append(voice);
  speedLabel.append(speed);
  controls.append(providerLabel, voiceLabel, speedLabel, prepare);
  section.append(heading, scope, controls, consentLabel, status, audio);
  prompt.insertAdjacentElement('afterend', section);
  return true;
}

export async function installSpeechSurface() {
  try {
    const bootstrap = await api('system.bootstrap', {});
    if (bootstrap?.capabilities?.speech !== true) return;
    const status = requireStatus(await api('speech.status', {}));
    buildSurface(status);
  } catch (_) {
    // Capability discovery fails closed; the existing packaged app remains usable.
  }
}
