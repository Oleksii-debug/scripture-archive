const FALLBACK_SITE_URL = "https://scripture-archive-live.bubblybasil20.chatgpt.site";

export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_BASE_URL || FALLBACK_SITE_URL;
  try {
    const url = new URL(configured);
    return `${url.protocol}//${url.host}`;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteUrl()}/`).toString();
}
