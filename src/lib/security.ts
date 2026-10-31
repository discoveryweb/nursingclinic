import crypto from "node:crypto";
import { db } from "@/db";
import { auditLogs, loginAttempts, rateLimits } from "@/db/schema";
import { eq, lt, sql } from "drizzle-orm";

export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632));
}
export function normalizePhone(value: string) {
  const normalized = normalizeDigits(value).replace(/[\s()-]/g, "");
  return normalized.startsWith("9") ? `0${normalized}` : normalized;
}
export function validPassword(value: string) { return typeof value === "string" && value.length >= 8 && value.length <= 128; }
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(derived as Buffer)));
  return `scrypt$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (typeof password !== "string" || password.length > 128) return false;
    const [kind, salt, hex] = stored.split("$");
    if (kind !== "scrypt" || !salt || !/^[a-f0-9]{128}$/i.test(hex || "")) return false;
    const key = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(derived as Buffer)));
    const expected = Buffer.from(hex, "hex");
    return expected.length === key.length && crypto.timingSafeEqual(key, expected);
  } catch { return false; }
}
export function hashToken(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

/** Avoid logging SQL parameters, medical notes, phone numbers, or provider URLs. */
export function logServerError(context: string, error: unknown) {
  const record = error && typeof error === "object" ? error as { code?: unknown; cause?: { code?: unknown }; name?: unknown } : {};
  const rawCode = typeof record.cause?.code === "string" ? record.cause.code : typeof record.code === "string" ? record.code : "unknown";
  const code = /^[A-Z0-9_]{1,24}$/i.test(rawCode) ? rawCode : "unknown";
  console.error(`${context} (code: ${code})`);
}

/** Prefer the address supplied by the trusted ingress; otherwise use the nearest forwarded hop. */
export function requestIp(request: Request) {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real && real.length <= 80) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map(value => value.trim()).filter(Boolean);
  return (forwarded?.at(-1) || "unknown").slice(0, 80);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Browser mutations with cookies must carry Origin or Fetch Metadata.
    if (request.headers.get("cookie")) return request.headers.get("sec-fetch-site") === "same-origin";
    return true; // non-browser public API clients have no ambient session cookie
  }
  try {
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host");
    return !!host && new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch { return false; }
}

export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}
export async function readJsonLimited(request: Request, maxBytes = 32_768): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) throw new RequestBodyError("فرمت درخواست پشتیبانی نمی‌شود.", 415);
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new RequestBodyError("حجم درخواست بیش از حد مجاز است.", 413);
  if (!request.body) throw new RequestBodyError("بدنه درخواست خالی است.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("حجم درخواست بیش از حد مجاز است.", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new RequestBodyError("ساختار درخواست معتبر نیست.", 400); }
}

export async function safeJson(request: Request, maxBytes = 32_768): Promise<Record<string, unknown> | null> {
  try {
    const value = await readJsonLimited(request, maxBytes);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

export async function isLocked(key: string) {
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.key, hashToken(key))).limit(1);
  return !!row?.lockedUntil && row.lockedUntil > new Date();
}
let lastSecurityCleanup = 0;
async function cleanupSecurityCounters() {
  const now = Date.now();
  if (now - lastSecurityCleanup < 60 * 60 * 1000) return;
  lastSecurityCleanup = now;
  try {
    await Promise.all([
      db.delete(loginAttempts).where(lt(loginAttempts.updatedAt, new Date(now - 48 * 60 * 60 * 1000))),
      db.delete(rateLimits).where(lt(rateLimits.updatedAt, new Date(now - 7 * 24 * 60 * 60 * 1000))),
    ]);
  } catch (error) {
    lastSecurityCleanup = 0;
    logServerError("Security counter cleanup failed", error);
  }
}
export async function recordFailure(key: string) {
  await cleanupSecurityCounters();
  const hashed = hashToken(key);
  await db.insert(loginAttempts).values({ key: hashed, attempts: 1, updatedAt: new Date() }).onConflictDoUpdate({
    target: loginAttempts.key,
    set: {
      attempts: sql`CASE WHEN ${loginAttempts.updatedAt} < now() - interval '15 minutes' THEN 1 ELSE ${loginAttempts.attempts} + 1 END`,
      lockedUntil: sql`CASE WHEN ${loginAttempts.updatedAt} >= now() - interval '15 minutes' AND ${loginAttempts.attempts} + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END`,
      updatedAt: new Date(),
    },
  });
}
export async function clearFailures(key: string) { await db.delete(loginAttempts).where(eq(loginAttempts.key, hashToken(key))); }

/** Atomic sliding-window limiter for normal requests (kept separate from failed-login counters). */
export async function consumeRateLimit(key: string, maxRequests: number, windowSeconds: number, blockSeconds: number) {
  await cleanupSecurityCounters();
  const hashed = hashToken(key);
  const [row] = await db.insert(rateLimits).values({ key: hashed, requests: 1, windowStartedAt: new Date(), updatedAt: new Date() }).onConflictDoUpdate({
    target: rateLimits.key,
    set: {
      requests: sql`CASE WHEN ${rateLimits.blockedUntil} > now() THEN ${rateLimits.requests} WHEN ${rateLimits.windowStartedAt} < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE ${rateLimits.requests} + 1 END`,
      windowStartedAt: sql`CASE WHEN ${rateLimits.blockedUntil} > now() THEN ${rateLimits.windowStartedAt} WHEN ${rateLimits.windowStartedAt} < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE ${rateLimits.windowStartedAt} END`,
      blockedUntil: sql`CASE WHEN ${rateLimits.blockedUntil} > now() THEN ${rateLimits.blockedUntil} WHEN ${rateLimits.windowStartedAt} < now() - make_interval(secs => ${windowSeconds}) THEN NULL WHEN ${rateLimits.requests} + 1 > ${maxRequests} THEN now() + make_interval(secs => ${blockSeconds}) ELSE NULL END`,
      updatedAt: new Date(),
    },
  }).returning({ blockedUntil: rateLimits.blockedUntil });
  return !!row?.blockedUntil && row.blockedUntil > new Date();
}
export async function audit(actor: string, action: string, detail = "") {
  try { await db.insert(auditLogs).values({ actor: actor.slice(0, 150), action: action.slice(0, 100), detail: detail.slice(0, 500) }); }
  catch (error) { logServerError("Audit log write failed", error); }
}
