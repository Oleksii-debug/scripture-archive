import Link from "next/link";

export default function NotFound() {
  return <main className="shell prose"><p className="eyebrow">Scripture Archive</p><h1>Сторінку не знайдено</h1><p>The requested page could not be found. / Запрошенная страница не найдена.</p><Link className="button primary" href="/">На головну · Home</Link></main>;
}
