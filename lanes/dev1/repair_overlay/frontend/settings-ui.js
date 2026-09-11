const THEMES = new Set(['system', 'light', 'dark']);
const FONT_SCALES = new Map([[1, '100'], [1.125, '1125'], [1.25, '125'], [1.5, '150']]);
const SCALE_VALUES = new Map([...FONT_SCALES].map(([value, token]) => [token, value]));

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeSettings(raw) {
  const value = isRecord(raw) ? raw : {};
  const theme = typeof value.theme === 'string' && THEMES.has(value.theme) ? value.theme : 'system';
  const fontScale = typeof value.font_scale === 'number' && Number.isFinite(value.font_scale) && FONT_SCALES.has(value.font_scale)
    ? value.font_scale
    : 1;
  return Object.freeze({
    theme,
    font_scale: fontScale,
    high_contrast_mode: typeof value.high_contrast_mode === 'boolean' ? value.high_contrast_mode : false,
    reduced_motion: typeof value.reduced_motion === 'boolean' ? value.reduced_motion : false,
  });
}

function hasCanonicalSettingsShape(raw) {
  if (!isRecord(raw)) return false;
  const keys = Object.keys(raw).sort();
  const expected = ['font_scale', 'high_contrast_mode', 'reduced_motion', 'theme'];
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) return false;
  if (typeof raw.theme !== 'string' || !THEMES.has(raw.theme)) return false;
  if (typeof raw.font_scale !== 'number' || !Number.isFinite(raw.font_scale) || !FONT_SCALES.has(raw.font_scale)) return false;
  return typeof raw.high_contrast_mode === 'boolean' && typeof raw.reduced_motion === 'boolean';
}

export function applySettings(raw, root = document.documentElement) {
  const settings = normalizeSettings(raw);
  if (settings.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = settings.theme;
  root.dataset.fontScale = FONT_SCALES.get(settings.font_scale);
  if (settings.high_contrast_mode) root.dataset.highContrast = 'true';
  else delete root.dataset.highContrast;
  if (settings.reduced_motion) root.dataset.reducedMotion = 'true';
  else delete root.dataset.reducedMotion;
  return settings;
}

function textElement(documentObject, tag, text, attrs = {}) {
  const element = documentObject.createElement(tag);
  element.textContent = text;
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  return element;
}

export class AccessibilitySettingsUI {
  constructor({api, announce, documentObject = document}) {
    this.api = api;
    this.announce = announce;
    this.document = documentObject;
    this.current = normalizeSettings({});
    this.readyPromise = null;
    this.trigger = null;
    this.dialog = null;
    this.controls = null;
  }

  initialize() {
    if (!this.readyPromise) this.readyPromise = this.#initialize();
    return this.readyPromise;
  }

  async #initialize() {
    this.#installStylesheet();
    this.#buildSurface();
    try {
      await this.reload();
    } catch (error) {
      this.current = applySettings({}, this.document.documentElement);
      this.#setStatus('Збережені налаштування недоступні. Застосовано безпечні системні значення.');
    }
  }

  #installStylesheet() {
    if (this.document.getElementById('accessibility-settings-styles')) return;
    const link = this.document.createElement('link');
    link.id = 'accessibility-settings-styles';
    link.rel = 'stylesheet';
    link.href = new URL('./settings.css', import.meta.url).href;
    this.document.head.append(link);
  }

  #buildSurface() {
    if (this.document.getElementById('nav-accessibility')) {
      this.trigger = this.document.getElementById('nav-accessibility');
      this.dialog = this.document.getElementById('accessibility-settings-dialog');
      return;
    }
    const nav = this.document.querySelector('.top-nav');
    if (!nav) throw new Error('main navigation unavailable');

    const trigger = textElement(this.document, 'button', 'Доступність');
    trigger.type = 'button';
    trigger.id = 'nav-accessibility';
    trigger.setAttribute('aria-haspopup', 'dialog');
    nav.append(trigger);

    const dialog = this.document.createElement('dialog');
    dialog.id = 'accessibility-settings-dialog';
    dialog.className = 'accessibility-settings-dialog';
    dialog.setAttribute('aria-labelledby', 'accessibility-settings-heading');

    const heading = textElement(this.document, 'h2', 'Налаштування доступності');
    heading.id = 'accessibility-settings-heading';
    const intro = textElement(this.document, 'p', 'Ці параметри зберігаються локально та змінюють лише подання інтерфейсу.');

    const form = this.document.createElement('form');
    form.id = 'accessibility-settings-form';
    form.addEventListener('submit', event => { event.preventDefault(); this.save(); });

    const fieldset = this.document.createElement('fieldset');
    const legend = textElement(this.document, 'legend', 'Вигляд і рух');
    fieldset.append(legend);

    const themeLabel = textElement(this.document, 'label', 'Тема', {for: 'accessibility-theme'});
    const theme = this.document.createElement('select');
    theme.id = 'accessibility-theme';
    for (const [value, label] of [['system', 'Як у системі'], ['light', 'Світла'], ['dark', 'Темна']]) {
      const option = textElement(this.document, 'option', label);
      option.value = value;
      theme.append(option);
    }

    const scaleLabel = textElement(this.document, 'label', 'Розмір тексту', {for: 'accessibility-font-scale'});
    const scale = this.document.createElement('select');
    scale.id = 'accessibility-font-scale';
    for (const [value, label] of [['100', '100%'], ['1125', '112,5%'], ['125', '125%'], ['150', '150%']]) {
      const option = textElement(this.document, 'option', label);
      option.value = value;
      scale.append(option);
    }

    const contrastLabel = this.document.createElement('label');
    contrastLabel.className = 'check-row';
    const contrast = this.document.createElement('input');
    contrast.type = 'checkbox';
    contrast.id = 'accessibility-high-contrast';
    contrastLabel.append(contrast, this.document.createTextNode(' Підвищений контраст'));

    const motionLabel = this.document.createElement('label');
    motionLabel.className = 'check-row';
    const motion = this.document.createElement('input');
    motion.type = 'checkbox';
    motion.id = 'accessibility-reduced-motion';
    motionLabel.append(motion, this.document.createTextNode(' Зменшити рух та анімацію'));

    fieldset.append(themeLabel, theme, scaleLabel, scale, contrastLabel, motionLabel);

    const status = textElement(this.document, 'p', '');
    status.id = 'accessibility-settings-status';
    status.className = 'notice info';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');

    const actions = this.document.createElement('div');
    actions.className = 'action-row';
    const defaults = textElement(this.document, 'button', 'Системні значення');
    defaults.type = 'button';
    defaults.onclick = () => this.#fill(normalizeSettings({}));
    const cancel = textElement(this.document, 'button', 'Скасувати');
    cancel.type = 'button';
    cancel.onclick = () => dialog.close();
    const save = textElement(this.document, 'button', 'Зберегти');
    save.type = 'submit';
    save.className = 'primary';
    actions.append(defaults, cancel, save);

    form.append(fieldset, status, actions);
    dialog.append(heading, intro, form);
    this.document.body.append(dialog);

    trigger.onclick = () => this.open();
    dialog.addEventListener('close', () => trigger.focus());
    this.trigger = trigger;
    this.dialog = dialog;
    this.controls = {theme, scale, contrast, motion, status, save};
  }

  #setStatus(message) {
    if (this.controls?.status) this.controls.status.textContent = message;
  }

  #fill(settings) {
    if (!this.controls) return;
    this.controls.theme.value = settings.theme;
    this.controls.scale.value = FONT_SCALES.get(settings.font_scale);
    this.controls.contrast.checked = settings.high_contrast_mode;
    this.controls.motion.checked = settings.reduced_motion;
  }

  #readForm() {
    const scale = SCALE_VALUES.get(this.controls.scale.value);
    return normalizeSettings({
      theme: this.controls.theme.value,
      font_scale: scale,
      high_contrast_mode: this.controls.contrast.checked,
      reduced_motion: this.controls.motion.checked,
    });
  }

  async reload() {
    const response = await this.api('settings.get');
    const settings = normalizeSettings(response?.settings);
    this.current = applySettings(settings, this.document.documentElement);
    this.#fill(this.current);
    this.#setStatus('Завантажено збережені параметри.');
    return this.current;
  }

  async open() {
    await this.initialize();
    try {
      await this.reload();
    } catch (error) {
      this.#setStatus('Не вдалося оновити збережені параметри; показано поточні безпечні значення.');
    }
    this.#fill(this.current);
    this.dialog.showModal();
    this.controls.theme.focus();
  }

  async save() {
    const candidate = this.#readForm();
    this.controls.save.disabled = true;
    try {
      const response = await this.api('settings.set', {settings: candidate});
      if (!hasCanonicalSettingsShape(response?.settings)) throw new Error('settings response failed validation');
      this.current = applySettings(response.settings, this.document.documentElement);
      this.#fill(this.current);
      this.#setStatus('Налаштування збережено.');
      this.announce('Налаштування доступності збережено');
      this.dialog.close();
    } catch (error) {
      this.#setStatus('Не вдалося зберегти налаштування. Поточне подання не змінено.');
      this.announce('Помилка збереження налаштувань доступності');
    } finally {
      this.controls.save.disabled = false;
    }
  }
}
