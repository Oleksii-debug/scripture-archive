import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://scripture-archive.com"),
  title: "Архів Писання · Scripture Archive",
  description: "Доступна тримовна біблійна читальня та навчально-дослідницькі місії.",
  icons: { icon: "/scripture-archive-logo.svg" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    title: "Архів Писання · Scripture Archive",
    description: "Біблійна читальня, дослідницькі завдання та домашні групи.",
    images: [{ url: "/scripture-archive-hero-v2.png", width: 1920, height: 820 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const organization = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Scripture Archive",
    alternateName: "Архів Писання",
    url: "https://scripture-archive.com/",
    inLanguage: ["uk", "ru", "en"],
  };
  return <html lang="uk"><head><link rel="stylesheet" href="/styles.css" /><meta name="sa-ga4-id" content={process.env.NEXT_PUBLIC_GA4_ID || ""} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} /></head><body>{children}</body></html>;
}
