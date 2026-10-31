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
// Contact details and user-authored reports must not be silently rewritten.
// Returning null (rather than slicing) rejects oversized inputs before D1/mail.
const exactField = (value: FormDataEntryValue | string | null, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const unavailable = () => Response.json({ error: "support_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store, private" } });

function safeFilename(value: string) {
  const normalized = value.normalize("NFKC").replace(/[\\/:*?"<>|\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, "-").trim();
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
      // Central-directory names alone are attacker-controlled declarations.
      // Bind each claimed DOCX part to its actual local ZIP header and bytes
      // before forwarding this attachment to support D1/email. Keep the
      // existing bounded structural gate; this is not an XML or malware scan.
      const localOffset = u32(offset + 42);
      if (localOffset >= centralStart || localOffset + 30 > centralStart ||
          u32(localOffset) !== 0x04034b50) return false;
      const localNameSize = u16(localOffset + 26), localExtraSize = u16(localOffset + 28);
      const dataStart = localOffset + 30 + localNameSize + localExtraSize;
      if (localNameSize !== nameSize || dataStart > centralStart ||
          u16(localOffset + 6) !== u16(offset + 8) ||
          u16(localOffset + 8) !== u16(offset + 10) ||
          u32(offset + 20) > centralStart - dataStart) return false;
      const centralName = bytes.subarray(offset + 46, offset + 46 + nameSize);
      const localName = bytes.subarray(localOffset + 30, localOffset + 30 + localNameSize);
      if (!centralName.every((byte, index) => byte === localName[index])) return false;
      const name = new TextDecoder().decode(centralName);
      if (name === "[Content_Types].xml" || name === "word/document.xml") parts.add(name);
      offset = next;
    }
    return offset === end && parts.size === 2;
  }
  return false;
}

// Check PNG chunk boundaries, mandatory IHDR/IDAT/IEND ordering and CRC-32.
// This is a bounded structural gate, not a full image decoder or malware scan.
const PNG_CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  return value >>> 0;
});
function pngHasRequiredChunks(bytes: Uint8Array) {
  if (bytes.length < 45 || ![0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((byte, index) => bytes[index] === byte)) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8, hasHeader = false, hasData = false;
  while (offset + 12 <= bytes.length) {
    const size = view.getUint32(offset, false);
    const next = offset + 12 + size;
    if (next > bytes.length) return false;
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    // PNG CRC-32 covers the four-byte chunk type and its data. A valid
    // signature/chunk outline alone must not allow corrupted content in email.
    let crc = 0xffffffff;
    for (let index = offset + 4; index < offset + 8 + size; index++)
      crc = (crc >>> 8) ^ PNG_CRC_TABLE[(crc ^ bytes[index]) & 0xff];
    if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(offset + 8 + size, false)) return false;
    if (!hasHeader) {
      if (type !== "IHDR" || size !== 13 || view.getUint32(offset + 8, false) === 0 || view.getUint32(offset + 12, false) === 0) return false;
      hasHeader = true;
    } else if (type === "IHDR") return false;
    if (type === "IDAT") hasData = true;
    if (type === "IEND") return size === 0 && hasData && next === bytes.length;
    offset = next;
  }
  return false;
}

// RIFF/WebP validation: declared length, bounded chunks, and image frame markers.
// This is deliberately not a full WebP decoder or an antivirus scan.
function webpHasImageFrame(bytes: Uint8Array) {
  if (bytes.length < 20 || bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
      bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== bytes.length - 8) return false;
  const fourCC = (at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  const validFrame = (type: string, at: number, size: number) => {
    if (type === "VP8 ") return size >= 10 && bytes[at + 3] === 0x9d && bytes[at + 4] === 0x01 && bytes[at + 5] === 0x2a &&
      (view.getUint16(at + 6, true) & 0x3fff) > 0 && (view.getUint16(at + 8, true) & 0x3fff) > 0;
    return type === "VP8L" && size >= 5 && bytes[at] === 0x2f && (bytes[at + 4] & 0xe0) === 0;
  };
  let offset = 12, frameFound = false, extended = false;
  while (offset + 8 <= bytes.length) {
    const type = fourCC(offset), size = view.getUint32(offset + 4, true);
    const end = offset + 8 + size, next = end + (size & 1);
    if (next > bytes.length) return false;
    if (type === "VP8X") {
      if (offset !== 12 || size !== 10) return false;
      extended = true;
    } else if (type === "VP8 " || type === "VP8L") {
      if (!validFrame(type, offset + 8, size)) return false;
      frameFound = true;
    } else if (type === "ANMF") {
      if (!extended || size < 16) return false;
      let inner = offset + 8 + 16;
      while (inner + 8 <= end) {
        const childType = fourCC(inner), childSize = view.getUint32(inner + 4, true);
        const childEnd = inner + 8 + childSize, childNext = childEnd + (childSize & 1);
        if (childNext > end) return false;
        if (childType === "VP8 " || childType === "VP8L") {
          if (!validFrame(childType, inner + 8, childSize)) return false;
          frameFound = true;
        }
        inner = childNext;
      }
      if (inner !== end) return false;
    }
    offset = next;
  }
  return offset === bytes.length && frameFound;
}

function matchesAttachment(file: File, bytes: Uint8Array) {
  const lowerName = file.name.toLowerCase();
  if (!FILE_SUFFIXES[file.type]?.some(suffix => lowerName.endsWith(suffix))) return false;
  const starts = (...head: number[]) => head.every((value, index) => bytes[index] === value);
  switch (file.type) {
    case "application/pdf": return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
    case "image/jpeg": return starts(0xff, 0xd8, 0xff);
    case "image/png": return pngHasRequiredChunks(bytes);
    case "image/webp": return webpHasImageFrame(bytes);
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

// D1 promises can resolve without confirming that a support row was persisted.
// Require one acknowledged insert per row before reporting receipt or emailing.
function acknowledgedSupportInsert(receipt: unknown): boolean {
  const row = receipt as { success?: unknown; meta?: { changes?: unknown } } | null;
  return row?.success === true && row.meta?.changes === 1;
}

export async function POST(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "cross_origin_request" }, 403);
  // Rate-limit and session storage may fail independently of a bad request.
  let allowed: boolean;
  try { allowed = await rateLimit(`help:${requestAddress(request)}`, 8, 3600); }
  catch { return unavailable(); }
  if (!allowed) return json({ error: "too_many_requests" }, 429);

  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return unavailable(); }
  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "invalid_form" }, 400);
  const rawEmail = exactField(identity?.email || form.get("email"), 254);
  const subject = exactField(form.get("subject"), 160);
  const message = exactField(form.get("message"), 6000);
  const locale = ["uk", "ru", "en"].includes(clean(form.get("locale"), 2)) ? clean(form.get("locale"), 2) : "uk";
  // Do not let a long address become a different recipient after clipping,
  // nor silently omit part of a support message or its subject.
  if (rawEmail === null || subject === null || message === null)
    return json({ error: "invalid_request" }, 400);
  const email = rawEmail.toLowerCase();
  if (email.length > 254 || !EMAIL.test(email) || subject.length < 3 || message.length < 10 || form.get("acceptPrivacy") !== "yes")
    return json({ error: "invalid_request" }, 400);

  // An empty browser file-input placeholder (filename="") means no upload.
  // A *named* zero-byte file is a selected attachment, not a placeholder:
  // rejecting it avoids confirming/sending feedback after silently losing it.
  const fileFields = form.getAll("files");
  const files = fileFields.filter((entry): entry is File => entry instanceof File && entry.name.length > 0);
  if (fileFields.some(entry => (typeof entry === "string" && entry.length > 0) ||
      (entry instanceof File && entry.name.length === 0 && entry.size > 0)) ||
      files.length > MAX_FILES ||
      files.some(file => file.size === 0 || file.size > MAX_FILE_BYTES || !ALLOWED_TYPES.has(file.type)) ||
      files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES)
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
  try {
  const statements = [env.DB.prepare(`INSERT INTO support_requests
      (id,user_id,email,subject,message,locale,status,email_delivered,attachment_count)
      VALUES (?,?,?,?,?,?,'new',0,?)`)
    .bind(requestId, identity?.userId || null, email, subject, message, locale, attachments.length)];
  for (const file of attachments) statements.push(env.DB.prepare(`INSERT INTO support_attachments
      (id,request_id,filename,content_type,size_bytes,content_base64)
      VALUES (?,?,?,?,?,?)`)
    .bind(file.id, requestId, file.filename, file.contentType, file.size, file.content));
  // Do not send or acknowledge an email for a request that D1 did not commit.
  // The batch must have one successful result for the request and each attachment.
    const saved = await env.DB.batch(statements);
    if (!Array.isArray(saved) || saved.length !== statements.length || saved.some(result => !acknowledgedSupportInsert(result)))
      return json({ error: "support_save_failed" }, 503);
  } catch {
    return json({ error: "support_save_failed" }, 503);
  }

  // This request is already committed. An unexpected provider exception does
  // not justify asking the user to submit (and possibly email) it a second time.
  let delivery: Awaited<ReturnType<typeof sendSupportRequestEmail>>;
  try {
    delivery = await sendSupportRequestEmail({
      requestId,
      email,
      subject,
      message,
      locale,
      userName: identity?.fullName,
      attachments,
    });
  } catch {
    return json({ ok: true, requestId, mailStatus: "delivery_unknown" }, 201);
  }
  if (delivery.delivered) {
    // The request itself is already durably accepted. If recording the mail
    // receipt fails after mail delivery, returning 5xx would invite the user
    // to submit and email the same private message a second time.
    try {
      const receipt = await env.DB.prepare("UPDATE support_requests SET email_delivered=1 WHERE id=?").bind(requestId).run();
      if (receipt?.success !== true || receipt.meta?.changes !== 1)
        return json({ ok: true, requestId, mailStatus: "delivery_record_pending" }, 201);
    } catch {
      return json({ ok: true, requestId, mailStatus: "delivery_record_pending" }, 201);
    }
  }
  return json({ ok: true, requestId }, 201);
}

export async function GET(request: Request) {
  if (!env.DB) return json({ error: "database_unavailable" }, 503);
  let identity: Awaited<ReturnType<typeof authenticateRequest>>;
  try { identity = await authenticateRequest(request); }
  catch { return unavailable(); }
  // A matching email string alone is not proof of owner authorization.
  // Unverified accounts and synthetic agents must not read support messages.
  if (!identity || identity.provider === "agent" || !identity.emailVerified ||
      identity.email.toLowerCase() !== OWNER_EMAIL)
    return json({ error: "forbidden" }, 403);
  try {
    const rows = await env.DB.prepare(`SELECT id,email,subject,message,locale,status,email_delivered,attachment_count,created_at
      FROM support_requests ORDER BY created_at DESC LIMIT 100`).all();
    if (!rows.success || !Array.isArray(rows.results)) return json({ error: "support_unavailable" }, 503);
    return json({ items: rows.results });
  } catch {
    return json({ error: "support_unavailable" }, 503);
  }
}

