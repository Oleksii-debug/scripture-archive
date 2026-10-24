import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../page";

const PUBLIC_ROUTES = new Set(["reader", "campaigns", "missions", "groups", "support", "about", "privacy", "atlas", "dossiers", "builder"]);
const PRIVATE_ROUTES = new Set(["account", "mission", "progress", "editor"]);
const ROUTE_METADATA: Record<string, { title: string; description: string }> = {
  reader: { title: "Біблійна читальня", description: "Читайте доступні біблійні тексти з чітким зазначенням видання, джерела та умов використання." },
  campaigns: { title: "Навчальні кампанії", description: "Послідовні маршрути читання, дослідження тексту та перевірки засвоєного." },
  missions: { title: "Місії", description: "Навчальні місії Scripture Archive для уважного читання й роботи з біблійним текстом." },
  groups: { title: "Домашні групи", description: "Спільне читання, обговорення та прозорий навчальний прогрес домашніх груп." },
  support: { title: "Підтримати Scripture Archive", description: "Офіційна сторінка підтримки розвитку Scripture Archive." },
  about: { title: "Про Scripture Archive", description: "Мета платформи, принципи роботи з джерелами та відомості про засновника." },
  privacy: { title: "Приватність", description: "Як Scripture Archive захищає облікові записи, профіль, прогрес і аналітичні дані." },
  atlas: { title: "Атлас розвитку", description: "Навчальні напрями та поступ у роботі з біблійним текстом." },
  dossiers: { title: "Дослідницькі досьє", description: "Матеріали для зіставлення свідчень, джерел і висновків." },
  builder: { title: "Конструктор", description: "Інструменти підготовки структурованих навчальних матеріалів." },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params, route = slug[0] || "";
  const privateRoute = PRIVATE_ROUTES.has(route);
  const details = ROUTE_METADATA[route];
  return {
    title: details ? `${details.title} · Scripture Archive` : "Scripture Archive",
    description: details?.description,
    alternates: { canonical: privateRoute ? "/" : `/${route}` },
    robots: privateRoute ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: details ? {
      type: "website",
      url: `/${route}`,
      title: `${details.title} · Scripture Archive`,
      description: details.description,
      images: [{ url: "/scripture-archive-hero-v2.png", width: 1920, height: 820 }],
    } : undefined,
  };
}

export default async function PublicRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params, route = slug[0] || "";
  if (!PUBLIC_ROUTES.has(route) && !PRIVATE_ROUTES.has(route)) notFound();
  return <Home />;
}
