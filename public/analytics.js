(() => {
  const measurementId = document.querySelector('meta[name="sa-ga4-id"]')?.content?.trim();
  const key = "sa.analyticsConsent";
  let consent = localStorage.getItem(key);
  const safeParameters = parameters => Object.fromEntries(Object.entries(parameters || {}).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)));

  function load() {
    if (!measurementId || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  function track(name, parameters = {}) {
    if (consent !== "granted" || !measurementId) return;
    load();
    window.gtag?.("event", name, safeParameters(parameters));
  }

  window.saAnalytics = { track };
  if (!measurementId) return;
  if (consent === "granted") load();
  if (consent) return;

  const copy = {
    uk: ["Аналітичні cookie", "За вашою згодою анонімна статистика допомагає покращувати сайт. Електронна пошта, паролі й відповіді не передаються.", "Дозволити", "Відхилити"],
    ru: ["Аналитические cookie", "С вашего согласия анонимная статистика помогает улучшать сайт. Электронная почта, пароли и ответы не передаются.", "Разрешить", "Отклонить"],
    en: ["Analytics cookies", "With your consent, anonymous usage statistics help improve the site. Email, passwords, and answers are never sent.", "Allow", "Decline"],
  };
  const language = document.documentElement.lang in copy ? document.documentElement.lang : "uk", text = copy[language];
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "cookie-title");
  banner.innerHTML = `<div><strong id="cookie-title">${text[0]}</strong><p>${text[1]}</p></div><div class="action-row"><button class="button primary" data-consent="granted">${text[2]}</button><button class="button" data-consent="denied">${text[3]}</button></div>`;
  banner.addEventListener("click", event => {
    const value = event.target.closest("button")?.dataset.consent;
    if (!value) return;
    consent = value;
    localStorage.setItem(key, value);
    if (value === "granted") { load(); track("consent_granted"); }
    banner.remove();
  });
  document.body.appendChild(banner);
})();
