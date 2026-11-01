import { env } from "cloudflare:workers";

type Locale = "uk" | "ru" | "en";
type Purpose = "verify" | "reset";

const COPY: Record<Locale, Record<Purpose, { subject: string; title: string; body: string; action: string; expiry: string }>> = {
  uk: {
    verify: { subject: "Підтвердіть адресу — Scripture Archive", title: "Підтвердження електронної адреси", body: "Завершіть створення облікового запису Scripture Archive.", action: "Підтвердити адресу", expiry: "Посилання діє 24 години й використовується один раз." },
    reset: { subject: "Новий пароль — Scripture Archive", title: "Встановлення нового пароля", body: "Ви запросили відновлення доступу до Scripture Archive.", action: "Встановити новий пароль", expiry: "Посилання діє 30 хвилин й використовується один раз." },
  },
  ru: {
    verify: { subject: "Подтвердите адрес — Scripture Archive", title: "Подтверждение электронной почты", body: "Завершите создание учётной записи Scripture Archive.", action: "Подтвердить адрес", expiry: "Ссылка действует 24 часа и используется один раз." },
    reset: { subject: "Новый пароль — Scripture Archive", title: "Создание нового пароля", body: "Вы запросили восстановление доступа к Scripture Archive.", action: "Установить новый пароль", expiry: "Ссылка действует 30 минут и используется один раз." },
  },
  en: {
    verify: { subject: "Verify your email — Scripture Archive", title: "Verify your email address", body: "Complete your Scripture Archive account registration.", action: "Verify email", expiry: "This one-time link expires in 24 hours." },
    reset: { subject: "Reset your password — Scripture Archive", title: "Create a new password", body: "A password reset was requested for your Scripture Archive account.", action: "Create new password", expiry: "This one-time link expires in 30 minutes." },
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

// A 2xx transport response alone is not a provider acceptance receipt.
// Resend's send-email endpoint returns a non-empty message id on acceptance.
// Do not tell callers the message was accepted if the provider returned
// malformed JSON, an error object, or a bare HTTP success response.
async function providerAccepted(response: Response | null): Promise<boolean> {
  if (!response?.ok) return false;
  const receipt: unknown = await response.json().catch(() => null);
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return false;
  // A contradictory 2xx payload is not an acceptance receipt, even when
  // it also contains an id. Do not report delivery on provider error shapes.
  if (Object.hasOwn(receipt, "error") || Object.hasOwn(receipt, "errors")) return false;
  const id = (receipt as { id?: unknown }).id;
  return typeof id === "string" && id.trim().length > 0 && id.length <= 200;
}

// Security links contain single-use account tokens. A missing or malformed
// public-origin declaration must never turn a Host-derived fallback into an
// outbound link to an unrelated domain. This checks configuration and URL only;
// it is not a live DNS/TLS or provider-delivery attestation.
function trustedSecurityLink(url: string): boolean {
  const declared = env.APP_BASE_URL;
  if (typeof declared !== "string") return false;
  try {
    const base = new URL(declared), target = new URL(url);
    if (base.protocol !== "https:" ||
        (declared !== base.origin && declared !== `${base.origin}/`)) return false;
    // URL() silently repairs empty userinfo, backslashes, dot segments,
    // padded ports and Unicode before origin comparison. Security emails
    // contain one-time tokens: only send the literal canonical link, never
    // a visually ambiguous spelling that another mail client may reinterpret.
    if (url !== target.href || url.includes("#") ||
        url !== url.trim() || /[\u0000-\u001f\u007f]/u.test(url)) return false;
    return target.protocol === "https:" && target.origin === base.origin &&
      !target.username && !target.password;
  } catch { return false; }
}

export async function sendSecurityEmail(email: string, localeValue: string, purpose: Purpose, url: string) {
  const locale: Locale = localeValue === "ru" || localeValue === "en" ? localeValue : "uk";
  const copy = COPY[locale][purpose];
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return { delivered: false, reason: "email_not_configured" };
  if (!trustedSecurityLink(url)) return { delivered: false, reason: "security_link_origin_unverified" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: copy.subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#152b3c"><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.body)}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;background:#12374a;color:#fff;padding:12px 20px;border-radius:7px;text-decoration:none">${escapeHtml(copy.action)}</a></p><p>${escapeHtml(copy.expiry)}</p><p>Scripture Archive</p></div>`,
      text: `${copy.title}\n\n${copy.body}\n\n${url}\n\n${copy.expiry}\n\nScripture Archive`,
    }),
  }).catch(() => null);
  if (!await providerAccepted(response)) return { delivered: false, reason: "email_provider_error" };
  return { delivered: true };
}

type SupportAttachment = { filename: string; contentType: string; content: string };

export async function sendSupportRequestEmail(input: {
  requestId: string;
  email: string;
  subject: string;
  message: string;
  locale: string;
  userName?: string | null;
  attachments: SupportAttachment[];
}) {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return { delivered: false, reason: "email_not_configured" };
  const recipient = env.SUPPORT_RECIPIENT || "dordiaioleksii1@gmail.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [recipient],
      reply_to: input.email,
      subject: `[Scripture Archive] ${input.subject}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#152b3c"><h1>Нове звернення до служби підтримки</h1><p><strong>ID:</strong> ${escapeHtml(input.requestId)}</p><p><strong>Від:</strong> ${escapeHtml(input.userName || input.email)} &lt;${escapeHtml(input.email)}&gt;</p><p><strong>Мова:</strong> ${escapeHtml(input.locale)}</p><h2>${escapeHtml(input.subject)}</h2><div style="white-space:pre-wrap">${escapeHtml(input.message)}</div></div>`,
      text: `Нове звернення до служби підтримки\n\nID: ${input.requestId}\nВід: ${input.userName || input.email} <${input.email}>\nМова: ${input.locale}\n\n${input.subject}\n\n${input.message}`,
      attachments: input.attachments.map(file => ({ filename: file.filename, content_type: file.contentType, content: file.content })),
    }),
  }).catch(() => null);
  if (!await providerAccepted(response)) return { delivered: false, reason: "email_provider_error" };
  return { delivered: true };
}


