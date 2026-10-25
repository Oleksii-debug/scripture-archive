"use client";
import { useEffect } from "react";

const LOADER_COPY = {
  uk: {
    title: "Не вдалося відкрити сторінку",
    detail: "Не завантажився інтерфейс Архіву Писання. Перевірте з'єднання та повторіть спробу.",
    retry: "Повторити завантаження",
    reload: "Перезавантажити сторінку",
    loading: "Повторне завантаження інтерфейсу…",
    storage: "Браузер заблокував доступ до локальних даних сайту. Перевірте налаштування конфіденційності та повторіть спробу.",
  },
  ru: {
    title: "Не удалось открыть страницу",
    detail: "Не загрузился интерфейс Архива Писания. Проверьте соединение и повторите попытку.",
    retry: "Повторить загрузку",
    reload: "Перезагрузить страницу",
    loading: "Повторная загрузка интерфейса…",
    storage: "Браузер заблокировал доступ к локальным данным сайта. Проверьте настройки конфиденциальности и повторите попытку.",
  },
  en: {
    title: "The page could not open",
    detail: "The Scripture Archive interface did not load. Check your connection and try again.",
    retry: "Retry loading",
    reload: "Reload the page",
    loading: "Reloading the interface…",
    storage: "Your browser blocked access to the site’s local data. Check your privacy settings and try again.",
  },
} as const;

type Language = keyof typeof LOADER_COPY;

function loaderLanguage(): Language {
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
    const main = document.getElementById("main");
    const announcer = document.getElementById("announcer");

    const showFailure = (storageBlocked = false) => {
      if (!active || !main || main.childElementCount > 0) return;
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
        if (announcer) announcer.textContent = LOADER_COPY[loaderLanguage()].loading;
        loadApp();
      });
      notice.append(heading, description, retry);
      main.replaceChildren(notice);
      retry.focus();
    };

    const loadApp = () => {
      if (!active) return;
      appScript?.remove();
      attempt += 1;
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
      const script = document.createElement("script");
      script.type = "module";
      // Failed module fetches can be memoized by the browser module map.
      // Each retry must request a fresh URL for the same canonical file.
      script.src = attempt === 1 ? "/app.js" : `/app.js?sa-retry=${attempt - 1}`;
      script.onerror = () => {
        if (!active || appScript !== script) return;
        showFailure();
      };
      appScript = script;
      document.body.appendChild(script);
    };
    loadApp();
    return () => {
      active = false;
      appScript?.remove();
      analytics.remove();
    };
  }, []);
  return null;
}
