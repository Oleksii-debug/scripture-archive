import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "../page";

const PUBLIC_ROUTES = new Set(["reader", "campaigns", "groups", "support", "about", "atlas", "dossiers", "builder"]);
const PRIVATE_ROUTES = new Set(["account", "mission", "progress", "editor"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params, route = slug[0] || "";
  const privateRoute = PRIVATE_ROUTES.has(route);
  return {
    alternates: { canonical: privateRoute ? "/" : `/${route}` },
    robots: privateRoute ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function PublicRoute({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params, route = slug[0] || "";
  if (!PUBLIC_ROUTES.has(route) && !PRIVATE_ROUTES.has(route)) notFound();
  return <Home />;
}
