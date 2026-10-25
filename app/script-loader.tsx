"use client";
import { useEffect } from "react";

const LOADER_COPY = {
  uk: {
    title: "Не вдалося відкрити сторінку",
    detail: "Не завантажився інтерфейс Архіву Писання. Перевірте з'єднання та повторіть спробу.",
    retry: "Повторити завантаження",
    reload: "Перезавантажити сторінку",
    loading: "Повторне завантаження інтерфейсу…",
    loadingFirst: "Завантаження інтерфейсу…",
    storage: "Браузер заблокував доступ до локальних даних сайту. Перевірте налаштування конфіденційності та повторіть спробу.",
  },
  ru: {
    title: "Не удалось открыть страницу",
    detail: "Не загрузился интерфейс Архива Писания. Проверьте соединение и повторите попытку.",
    retry: "Повторить загрузку",
    reload: "Перезагрузить страницу",
    loading: "Повторная загрузка интерфейса…",
    loadingFirst: "Загрузка интерфейса…",
    storage: "Браузер заблокировал доступ к локальным данным сайта. Проверьте настройки конфиденциальности и повторите попытку.",
  },
  en: {
    title: "The page could not open",
    detail: "The Scripture Archive interface did not load. Check your connection and try again.",
    retry: "Retry loading",
    reload: "Reload the page",
    loading: "Reloading the interface…",
    loadingFirst: "Loading the interface…",
    storage: "Your browser blocked access to the site’s local data. Check your privacy settings and try again.",
  },
} as const;

type Language = keyof typeof LOADER_COPY;

function loaderLanguage(): Language {
  // Match the canonical app's explicit ?lang= precedence over saved settings.
  // An error shown before /app.js initializes must use the same language.
  const requested = new URLSearchParams(window.location.search).get("lang");
  if (requested === "uk" || requested === "ru" || requested === "en") return requested;
  let value: string | null = null;
  try {
    value = window.localStorage.getItem("sa.lang");
  } catch {
    // Private browsing or blocked storage must not hide the recovery control.
  }
  if (value !== "uk" && value !== "ru" && value !== "en") {
    value = (document.getElementById("language") as HTMLSelectElement | null)?.value ?? "uk";
  }
  return value === "ru" || value === "en" ? value : "uk";
}

export default function ScriptLoader() {
  useEffect(() => {
    const analytics = document.createElement("script");
    analytics.src = "/analytics.js";
    document.body.appendChild(analytics);

    let active = true;
    let appScript: HTMLScriptElement | null = null;
    let attempt = 0;
    let moduleEvaluating = false;
    let moduleRuntimeFailed = false;
    const main = document.getElementById("main");
    const announcer = document.getElementById("announcer");
    let loaderAnnouncement = "";

    const startLoading = () => {
      const copy = LOADER_COPY[loaderLanguage()];
      loaderAnnouncement = attempt === 0 ? copy.loadingFirst : copy.loading;
      main?.setAttribute("aria-busy", "true");
      if (announcer) announcer.textContent = loaderAnnouncement;
    };

    const finishLoading = () => {
      main?.setAttribute("aria-busy", "false");
      // Leave route-specific announcements written by the real app intact.
      if (announcer && announcer.textContent === loaderAnnouncement) announcer.textContent = "";
      loaderAnnouncement = "";
    };

    const showFailure = (storageBlocked = false) => {
      if (!active) return;
      finishLoading();
      if (!main || main.childElementCount > 0) return;
      const copy = LOADER_COPY[loaderLanguage()];
      const notice = document.createElement("section");
      notice.className = "notice";
      notice.setAttribute("role", "alert");
      const heading = document.createElement("h1");
      heading.textContent = copy.title;
      const description = document.createElement("p");
      description.textContent = storageBlocked ? copy.storage : copy.detail;
      const retry = document.createElement("button");
      retry.className = "button primary";
      retry.type = "button";
      retry.textContent = storageBlocked ? copy.retry : attempt > 1 ? copy.reload : copy.retry;
      retry.addEventListener("click", () => {
        if (!active) return;
        if (attempt > 1 && !storageBlocked) {
          window.location.reload();
          return;
        }
        main.replaceChildren();
        main.focus();
        loadApp();
      });
      notice.append(heading, description, retry);
      main.replaceChildren(notice);
      retry.focus();
    };

    // A module can download successfully but throw while evaluating. Browsers
    // dispatch a window error followed by script.onload (not script.onerror).
    // Only recover when the currently injected canonical /app.js itself fails;
    // unrelated page/analytics errors must not replace the application UI.
    const onModuleRuntimeError = (event: ErrorEvent) => {
      if (!active || !moduleEvaluating || !appScript || !event.filename) return;
      try {
        const requested = new URL(appScript.src, document.baseURI);
        const failed = new URL(event.filename, document.baseURI);
        if (requested.pathname !== "/app.js" || failed.href !== requested.href) return;
      } catch {
        return;
      }
      moduleRuntimeFailed = true;
      moduleEvaluating = false;
      showFailure();
    };
    window.addEventListener("error", onModuleRuntimeError);

    const loadApp = () => {
      if (!active) return;
      appScript?.remove();
      // The canonical app reads these keys at module initialization. If
      // storage access throws, executing /app.js would leave #main blank;
      // a script onerror does not fire for a module's runtime exception.
      try {
        window.localStorage.getItem("sa.lang");
        window.localStorage.getItem("sa.ukSpelling");
      } catch {
        showFailure(true);
        return;
      }
      // Count only real script injections. Storage-denied retries never
      // fetched a module, so they must not consume the network retry budget.
      startLoading();
      moduleRuntimeFailed = false;
      moduleEvaluating = true;
      attempt += 1;
      const script = document.createElement("script");
      script.type = "module";
      // Failed module fetches can be memoized by the browser module map.
      // Each retry must request a fresh URL for the same canonical file.
      script.src = attempt === 1 ? "/app.js" : `/app.js?sa-retry=${attempt - 1}`;
      script.onerror = () => {
        if (!active || appScript !== script) return;
        moduleEvaluating = false;
        showFailure();
      };
      script.onload = () => {
        if (!active || appScript !== script) return;
        moduleEvaluating = false;
        if (!moduleRuntimeFailed) finishLoading();
      };
      appScript = script;
      document.body.appendChild(script);
    };
    loadApp();
    return () => {
      active = false;
      window.removeEventListener("error", onModuleRuntimeError);
      appScript?.remove();
      finishLoading();
      analytics.remove();
    };
  }, []);
  return null;
}
