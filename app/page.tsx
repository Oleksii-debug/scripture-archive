/* eslint-disable @next/next/no-html-link-for-pages */
export const dynamic = "force-dynamic";
import ScriptLoader from "./script-loader";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main" data-i18n="skipContent">Перейти до основного вмісту</a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Scripture Archive — головна / главная / home">
          <img className="brand-symbol" src="/scripture-archive-logo.svg" alt="" width="54" height="54" />
          <span><strong>Scripture Archive</strong><small data-i18n="brandSub">Архів Писання</small></span>
        </a>
        <button className="menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" data-i18n="menu">Меню</button>
        <nav id="primary-nav" className="primary-nav" aria-label="Навігація / Навигация / Navigation">
          <a href="/" data-route="" data-workspace="home">Головна</a>
          <a href="/campaigns" data-route="campaigns" data-workspace="campaigns">Кампанії</a>
          <a href="/reader" data-route="reader" data-i18n="reader">Читальня</a>
          <a href="/dossiers" data-route="dossiers" data-workspace="dossiers">Дослідницькі досьє</a>
          <a href="/builder" data-route="builder" data-workspace="builder">Конструктор</a>
          <a href="/progress" data-route="progress" data-workspace="progress">Мій прогрес</a>
          <a href="/groups" data-route="groups" data-i18n="groups">Домашні групи</a>
          <a href="/atlas" data-route="atlas" data-i18n="atlas">Атлас розвитку</a>
          <a href="/support" data-route="support" data-i18n="support">Підтримати</a>
          <a href="/about" data-route="about" data-i18n="about">Про проєкт</a>
          <a href="/account" data-route="account" data-i18n="account">Обліковий запис</a>
        </nav>
        <div className="header-tools">
          <label className="sr-only" htmlFor="language" data-i18n="language">Мова</label>
          <select id="language" defaultValue="uk">
            <option value="uk">Українська</option><option value="ru">Русский</option><option value="en">English</option>
          </select>
        </div>
      </header>
      <div id="announcer" className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      <main id="main" tabIndex={-1} />
      <footer className="site-footer">
        <div><strong>Scripture Archive</strong><p data-i18n="footerLine">Читання, доказ і відповідальний висновок.</p></div>
        <div className="footer-links"><a href="/about" data-i18n="sources">Джерела й права</a><a href="/privacy" data-i18n="privacy">Приватність</a><a href="mailto:dordiaioleksii1@gmail.com">dordiaioleksii1@gmail.com</a></div>
      </footer>
      <noscript><div className="noscript" lang="uk"><p>Для інтерактивних завдань увімкніть JavaScript. Джерела біблійних текстів зазначено на сторінці про проєкт.</p><p lang="ru">Для интерактивных заданий включите JavaScript. Источники библейских текстов указаны на странице о проекте.</p><p lang="en">Enable JavaScript for interactive tasks. Bible text sources are listed on the project page.</p></div></noscript>
      <ScriptLoader />
    </>
  );
}
