(() => {
  const measurementId = document.querySelector('meta[name="sa-ga4-id"]')?.content?.trim();
  const consentKey = "sa.analyticsConsent";
  const sessionKey = "sa.analyticsSession";
  // Restricted storage must not break browsing or imply analytics consent.
  // Only these two persisted values are meaningful; corrupt values re-prompt.
  let consent = null;
  try {
    const saved = localStorage.getItem(consentKey);
    if (saved === "granted" || saved === "denied") consent = saved;
  } catch { /* browser privacy policy can deny storage */ }
  let heartbeatTimer = 0;
  let lastActiveAt = Date.now();
  const privateRoutes = new Set(["account", "mission", "progress", "editor"]);
  // Only coarse, public route categories may leave this browser. Deep paths
  // can include group identifiers, account reset keys or user-supplied slugs.
  const publicRoutes = new Set(["home", "reader", "missions", "campaigns", "groups", "community",
    "support", "help", "about", "privacy", "dossiers", "academy", "library", "terms"]);
  const firstPartyEvents = new Set(["page_view", "sign_up", "sign_up_error", "login", "login_error", "quiz_start", "quiz_complete", "navigation_click", "support_click", "client_error"]);
  const allowedParameters = new Set(["destination", "error", "language", "method", "mode", "page_location", "page_name", "page_title", "score", "total"]);
  const routeName = () => {
    const source = location.hash.startsWith("#/") ? location.hash.slice(2) : location.pathname.slice(1);
    return source.split("/").filter(Boolean)[0] || "home";
  };
  const safeRouteName = () => {
    const route = routeName();
    return privateRoutes.has(route) || publicRoutes.has(route) ? route : "other";
  };
  const safeLocation = () => {
    const route = safeRouteName();
    return `${location.origin}${route === "home" ? "/" : "/" + route}`;
  };
  // Error messages may contain emails, reset URLs, answers or account data.
  // Both first-party and GA4 analytics receive only known machine-code labels.
  const safeErrorCodes = new Set([
    "email_in_use", "email_not_verified", "too_many_requests",
    "chapter_must_be_read", "sensitive_consent_required", "script_error",
  ]);
  const safeErrorCode = value =>
    typeof value === "string" && safeErrorCodes.has(value) ? value : "other";
  // Analytics arguments are not a free-text channel. A URL, email, group
  // name or recovery token must not be exported even by an accidental caller.
  const allowedValues = {
    destination: new Set([...privateRoutes, ...publicRoutes, "help_request", "monobank"]),
    language: new Set(["uk", "ru", "en"]),
    method: new Set(["password"]),
    mode: new Set(["group", "personal"]),
  };
  const safeParameters = parameters => {
    const safe = {};
    for (const [name, value] of Object.entries(parameters || {})) {
      if (!allowedParameters.has(name)) continue;
      if (name === "error") { safe.error = safeErrorCode(value); continue; }
      // All page descriptors are assigned below from a coarse trusted route
      // during page_view, never accepted from caller-controlled arguments.
      if (name === "page_location" || name === "page_name" || name === "page_title") continue;
      if (name === "score" || name === "total") {
        if (typeof value === "number" && Number.isFinite(value) && value >= 0 &&
            value <= 1000000) safe[name] = value;
        continue;
      }
      if (typeof value === "string" && allowedValues[name])
        safe[name] = allowedValues[name].has(value) ? value : "other";
    }
    return safe;
  };
  const sessionId = (() => {
    let stored = null;
    try { stored = sessionStorage.getItem(sessionKey); } catch {}
    if (/^[0-9a-f-]{36}$/i.test(stored || "")) return stored;
    const created = crypto.randomUUID();
    // Session ID may remain ephemeral if browser storage is restricted.
    try { sessionStorage.setItem(sessionKey, created); } catch {}
    return created;
  })();
  const trafficSource = () => {
    if (new URLSearchParams(location.search).get("utm_source")) return "campaign";
    if (!document.referrer) return "direct";
    try {
      const host = new URL(document.referrer).hostname;
      if (host === location.hostname) return "direct";
      if (/google\.|bing\.|yahoo\.|duckduckgo\./i.test(host)) return "organic";
      if (/facebook\.|instagram\.|t\.co$|youtube\.|tiktok\./i.test(host)) return "social";
    } catch {}
    return "referral";
  };

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

  function loadGoogleAnalytics() {
    if (!measurementId || document.querySelector("script[data-sa-ga4]")) return;
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

  function sendFirstParty(payload, beacon = false) {
    if (consent !== "granted") return;
    const body = JSON.stringify({ sessionId, source: trafficSource(), pageName: safeRouteName(), ...payload });
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
    fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", keepalive: true, body }).catch(() => {});
  }

  function heartbeat(beacon = false) {
    if (consent !== "granted" || document.visibilityState === "hidden" && !beacon) return;
    const now = Date.now(), activeSeconds = Math.min(60, Math.max(0, Math.round((now - lastActiveAt) / 1000)));
    lastActiveAt = now;
    if (activeSeconds >= 5) sendFirstParty({ action: "heartbeat", activeSeconds }, beacon);
  }

  function startEngagement() {
    if (heartbeatTimer || consent !== "granted") return;
    lastActiveAt = Date.now();
    heartbeatTimer = window.setInterval(() => heartbeat(false), 30000);
  }

  function track(name, parameters = {}) {
    if (consent !== "granted" || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) return;
    const values = safeParameters(parameters);
    if (name === "page_view") {
      values.page_location = safeLocation();
      values.page_name = safeRouteName();
      values.page_title = "Scripture Archive — " + values.page_name;
    }
    if (firstPartyEvents.has(name)) sendFirstParty({ action: "event", eventType: name, value: values });
    if (measurementId) {
      loadGoogleAnalytics();
      window.gtag?.("event", name, values);
    }
  }

  window.saAnalytics = { track, pageView: () => track("page_view") };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") heartbeat(true);
    else lastActiveAt = Date.now();
  });
  window.addEventListener("pagehide", () => heartbeat(true));
  window.addEventListener("error", () => track("client_error", { error: "script_error" }));

  if (consent === "granted") {
    loadGoogleAnalytics();
    startEngagement();
  }
  if (consent) return;

  const copy = {
    uk: ["Аналітичні cookie", "За вашою згодою анонімна статистика допомагає покращувати сайт. Вона вимірює сторінки, дії та активний час без передачі паролів, відповідей чи вмісту профілю.", "Дозволити", "Відхилити", "Не вдалося зберегти дозвіл у браузері. Аналітику не ввімкнено; можна відхилити cookie."],
    ru: ["Аналитические cookie", "С вашего согласия анонимная статистика помогает улучшать сайт. Она измеряет страницы, действия и активное время без передачи паролей, ответов или содержимого профиля.", "Разрешить", "Отклонить", "Не удалось сохранить согласие в браузере. Аналитика не включена; можно отклонить cookie."],
    en: ["Analytics cookies", "With your consent, anonymous statistics measure pages, actions, and active time. Passwords, answers, and profile content are never sent.", "Allow", "Decline", "Your browser could not save consent. Analytics is not enabled; you can decline cookies."],
  };
  const language = document.documentElement.lang in copy ? document.documentElement.lang : "uk", text = copy[language];
  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "cookie-title");
  banner.innerHTML = `<div><strong id="cookie-title">${text[0]}</strong><p>${text[1]}</p></div><div class="action-row"><button class="button primary" data-consent="granted">${text[2]}</button><button class="button" data-consent="denied">${text[3]}</button></div>`;
  const notice = document.createElement("p");
  notice.setAttribute("role", "alert");
  notice.hidden = true;
  banner.appendChild(notice);
  banner.addEventListener("click", event => {
    const value = event.target.closest("button")?.dataset.consent;
    if (value !== "granted" && value !== "denied") return;
    if (value === "granted") {
      // Consent must be durably recorded before any analytics is enabled.
      try {
        localStorage.setItem(consentKey, value);
        // A browser shim may silently discard writes; require exact readback.
        if (localStorage.getItem(consentKey) !== value) throw Error("consent not persisted");
      } catch {
        notice.textContent = text[4];
        notice.hidden = false;
        return;
      }
    } else {
      // Denial must work even when persistence is unavailable.
      try { localStorage.setItem(consentKey, value); } catch {}
    }
    consent = value;
    notice.hidden = true;
    window.gtag?.("consent", "update", { analytics_storage: value });
    if (value === "granted") {
      loadGoogleAnalytics();
      startEngagement();
      track("page_view");
    }
    banner.remove();
  });
  document.body.appendChild(banner);
})();
