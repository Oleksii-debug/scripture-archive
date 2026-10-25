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


// Browser-provided File.type is only a claim. Check the suffix and basic file
// structure before persisting or forwarding an attachment to support.
const FILE_SUFFIXES: Record<string, readonly string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
};

function docxHasParts(bytes: Uint8Array) {
  // Inspect ZIP central-directory names rather than trusting a PK prefix.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true);
  const u32 = (at: number) => view.getUint32(at, true);
  if (bytes.length < 22 || u32(0) !== 0x04034b50) return false;
  for (let end = bytes.length - 22; end >= Math.max(0, bytes.length - 65557); end--) {
    if (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length) continue;
    if (u16(end + 4) !== 0 || u16(end + 6) !== 0 || u16(end + 8) !== u16(end + 10)) return false;
    const count = u16(end + 10), centralSize = u32(end + 12), centralStart = u32(end + 16);
    if (count < 2 || count > 1000 || centralStart + centralSize !== end) return false;
    let offset = centralStart;
    const parts = new Set<string>();
    for (let index = 0; index < count; index++) {
      if (offset + 46 > end || u32(offset) !== 0x02014b50 || (u16(offset + 8) & 1)) return false;
      const nameSize = u16(offset + 28), extraSize = u16(offset + 30), commentSize = u16(offset + 32);
      const next = offset + 46 + nameSize + extraSize + commentSize;
      if (next > end) return false;
      const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameSize));
      if (name === "[Content_Types].xml" || name === "word/document.xml") parts.add(name);
      offset = next;
    }
    return offset === end && parts.size === 2;
  }
  return false;
}

function matchesAttachment(file: File, bytes: Uint8Array) {
  const lowerName = file.name.toLowerCase();
  if (!FILE_SUFFIXES[file.type]?.some(suffix => lowerName.endsWith(suffix))) return false;
  const starts = (...head: number[]) => head.every((value, index) => bytes[index] === value);
  switch (file.type) {
    case "application/pdf": return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
    case "image/jpeg": return starts(0xff, 0xd8, 0xff);
    case "image/png": return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp": return starts(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return docxHasParts(bytes);
    case "text/plain": {
      try {
        const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content);
      } catch { return false; }
    }
    default: return false;
  }
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

  const attachments: { id: string; filename: string; contentType: string; size: number; content: string }[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesAttachment(file, bytes)) return json({ error: "invalid_attachment" }, 400);
    attachments.push({
      id: crypto.randomUUID(), filename: safeFilename(file.name), contentType: file.type,
      size: file.size, content: toBase64(bytes),
    });
  }
  const requestId = crypto.randomUUID();
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

