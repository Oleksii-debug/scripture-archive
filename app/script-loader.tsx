"use client";
import { useEffect } from "react";

const LOADER_COPY = {
  uk: {
    title: "Не вдалося відкрити сторінку",
    detail: "Не завантажився інтерфейс Архіву Писання. Перевірте з'єднання та повторіть спробу.",
    retry: "Повторити завантаження",
    loading: "Повторне завантаження інтерфейсу…",
  },
  ru: {
    title: "Не удалось открыть страницу",
    detail: "Не загрузился интерфейс Архива Писания. Проверьте соединение и повторите попытку.",
    retry: "Повторить загрузку",
    loading: "Повторная загрузка интерфейса…",
  },
  en: {
    title: "The page could not open",
    detail: "The Scripture Archive interface did not load. Check your connection and try again.",
    retry: "Retry loading",
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
    const main = document.getElementById("main");
    const announcer = document.getElementById("announcer");

    const loadApp = () => {
      if (!active) return;
      appScript?.remove();
      const script = document.createElement("script");
      script.type = "module";
      script.src = "/app.js";
      script.onerror = () => {
        if (!active || !main || main.childElementCount > 0) return;
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
        retry.textContent = copy.retry;
        retry.addEventListener("click", () => {
          if (!active) return;
          main.replaceChildren();
          if (announcer) announcer.textContent = LOADER_COPY[loaderLanguage()].loading;
          loadApp();
        });
        notice.append(heading, description, retry);
        main.replaceChildren(notice);
        retry.focus();
      };
      document.body.appendChild(script);
      appScript = script;
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
