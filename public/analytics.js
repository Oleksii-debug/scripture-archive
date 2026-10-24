(() => {
  const measurementId = document.querySelector('meta[name="sa-ga4-id"]')?.content?.trim();
  const key = "sa.analyticsConsent";
  let consent = localStorage.getItem(key);
  const privateRoutes = new Set(["account", "mission", "progress", "editor"]);
  const allowedParameters = new Set(["destination", "error", "language", "method", "mode", "page_location", "page_name", "page_title", "score", "total"]);
  const routeName = () => {
    const source = location.hash.startsWith("#/") ? location.hash.slice(2) : location.pathname.slice(1);
    return source.split("/").filter(Boolean)[0] || "home";
  };
  const safeLocation = () => {
    const route = routeName();
    const path = privateRoutes.has(route) ? `/${route}` : location.pathname;
    return `${location.origin}${path || "/"}`;
  };
  const safeParameters = parameters => Object.fromEntries(
    Object.entries(parameters || {})
      .filter(([name, value]) => allowedParameters.has(name) && ["string", "number", "boolean"].includes(typeof value))
      .map(([name, value]) => [name, typeof value === "string" ? value.slice(0, 80) : value]),
  );

  if (measurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: consent === "granted" ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500,
    });
  }

  function load() {
    if (!measurementId || document.querySelector('script[data-sa-ga4]')) return;
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      page_location: safeLocation(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement("script");
    script.async = true;
    script.dataset.saGa4 = "true";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  function track(name, parameters = {}) {
    if (consent !== "granted" || !measurementId || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) return;
    load();
    const values = safeParameters(parameters);
    if (name === "page_view") {
      values.page_location = safeLocation();
      values.page_title = document.title.slice(0, 80);
      values.page_name = routeName();
    }
    window.gtag?.("event", name, values);
  }

  window.saAnalytics = { track, pageView: () => track("page_view") };
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
    window.gtag?.("consent", "update", { analytics_storage: value });
    if (value === "granted") {
      load();
      track("consent_granted");
      track("page_view");
    }
    banner.remove();
  });
  document.body.appendChild(banner);
})();
