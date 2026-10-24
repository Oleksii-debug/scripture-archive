"use client";
import { useEffect } from "react";

const LOADER_COPY = {
  uk: {
    title: "Не вдалося відкрити сторінку",
    detail: "Не завантажився інтерфейс Архіву Писання. Перевірте з'єднання та повторіть спробу.",
    retry: "Повторити завантаження",
    reload: "Перезавантажити сторінку",
    loading: "Повторне завантаження інтерфейсу…",
  },
  ru: {
    title: "Не удалось открыть страницу",
    detail: "Не загрузился интерфейс Архива Писания. Проверьте соединение и повторите попытку.",
    retry: "Повторить загрузку",
    reload: "Перезагрузить страницу",
    loading: "Повторная загрузка интерфейса…",
  },
  en: {
    title: "The page could not open",
    detail: "The Scripture Archive interface did not load. Check your connection and try again.",
    retry: "Retry loading",
    reload: "Reload the page",
    loading: "Reloading the interface…",
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

    const loadApp = () => {
      if (!active) return;
      appScript?.remove();
      const script = document.createElement("script");
      script.type = "module";
      // Failed module fetches can be memoized by the browser module map.
      // Each retry must request a fresh URL for the same canonical file.
      script.src = attempt === 0 ? "/app.js" : `/app.js?sa-retry=${attempt}`;
      attempt += 1;
      script.onerror = () => {
        if (!active || appScript !== script || !main || main.childElementCount > 0) return;
        const copy = LOADER_COPY[loaderLanguage()];
        const notice = document.createElement("section");
        notice.className = "notice";
        notice.setAttribute("role", "alert");
        const heading = document.createElement("h1");
        heading.textContent = copy.title;
        const description = document.createElement("p");
        description.textContent = copy.detail;
        const retry = document.createElement("button");
        retry.className = "button primary";
        retry.type = "button";
        // Retrying the top-level URL cannot refresh a failed imported module.
        // A full navigation resets the document-scoped browser module map.
        retry.textContent = attempt > 1 ? copy.reload : copy.retry;
        retry.addEventListener("click", () => {
          if (!active) return;
          if (attempt > 1) {
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
