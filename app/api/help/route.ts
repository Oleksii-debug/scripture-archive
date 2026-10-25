import { env } from "cloudflare:workers";
import { authenticateRequest, rateLimit, requestAddress, sameOrigin } from "../../../lib/auth";
import { sendSupportRequestEmail } from "../../../lib/email";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OWNER_EMAIL = "dordiaioleksii1@gmail.com";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 1_500_000;
const MAX_TOTAL_BYTES = 4_000_000;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

const clean = (value: FormDataEntryValue | null, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function safeFilename(value: string) {
  const normalized = value.normalize("NFKC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim();
  return (normalized || "attachment").slice(0, 120);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
  return btoa(binary);
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  if (!await rateLimit(`help:${requestAddress(request)}`, 8, 3600)) return json({ error: "too_many_requests" }, 429);

  const identity = await authenticateRequest(request);
  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "invalid_form" }, 400);
  const email = (identity?.email || clean(form.get("email"), 254)).toLowerCase();
  const subject = clean(form.get("subject"), 160);
  const message = clean(form.get("message"), 6000);
  const locale = ["uk", "ru", "en"].includes(clean(form.get("locale"), 2)) ? clean(form.get("locale"), 2) : "uk";
  if (!EMAIL.test(email) || subject.length < 3 || message.length < 10 || form.get("acceptPrivacy") !== "yes")
    return json({ error: "invalid_request" }, 400);

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > MAX_FILES || files.some(file => file.size > MAX_FILE_BYTES || !ALLOWED_TYPES.has(file.type)) || files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES)
    return json({ error: "invalid_attachment" }, 400);

  const requestId = crypto.randomUUID();
  const attachments = await Promise.all(files.map(async file => ({
    id: crypto.randomUUID(),
    filename: safeFilename(file.name),
    contentType: file.type,
    size: file.size,
    content: toBase64(new Uint8Array(await file.arrayBuffer())),
  })));
  const statements = [env.DB.prepare(`INSERT INTO support_requests
      (id,user_id,email,subject,message,locale,status,email_delivered,attachment_count)
      VALUES (?,?,?,?,?,?,'new',0,?)`)
    .bind(requestId, identity?.userId || null, email, subject, message, locale, attachments.length)];
  for (const file of attachments) statements.push(env.DB.prepare(`INSERT INTO support_attachments
      (id,request_id,filename,content_type,size_bytes,content_base64)
      VALUES (?,?,?,?,?,?)`)
    .bind(file.id, requestId, file.filename, file.contentType, file.size, file.content));
  await env.DB.batch(statements);

  const delivery = await sendSupportRequestEmail({
    requestId,
    email,
    subject,
    message,
    locale,
    userName: identity?.fullName,
    attachments,
  });
  if (delivery.delivered) await env.DB.prepare("UPDATE support_requests SET email_delivered=1 WHERE id=?").bind(requestId).run();
  return json({ ok: true, requestId }, 201);
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  const identity = await authenticateRequest(request);
  if (identity?.email !== OWNER_EMAIL) return json({ error: "forbidden" }, 403);
  const rows = await env.DB.prepare(`SELECT id,email,subject,message,locale,status,email_delivered,attachment_count,created_at
    FROM support_requests ORDER BY created_at DESC LIMIT 100`).all();
  return json({ items: rows.results });
}

