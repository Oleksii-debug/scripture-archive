import { siteUrl } from "../../lib/site";

const routes = [
  ["/", "weekly", "1.0"],
  ["/reader", "weekly", "0.9"],
  ["/campaigns", "weekly", "0.8"],
  ["/missions", "weekly", "0.8"],
  ["/groups", "weekly", "0.7"],
  ["/support", "monthly", "0.6"],
  ["/about", "monthly", "0.7"],
  ["/privacy", "yearly", "0.4"],
] as const;

export function GET() {
  const base = siteUrl();
  const urls = routes.map(([path, frequency, priority]) =>
    `  <url><loc>${base}${path}</loc><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`,
  ).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
