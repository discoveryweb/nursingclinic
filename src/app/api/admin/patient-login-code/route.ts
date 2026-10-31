import crypto from "node:crypto";
import { db } from "@/db";
import { phoneVerifications } from "@/db/schema";
import { can, getStaff } from "@/lib/auth";
import { otpHash, otpSecretConfigured } from "@/lib/otp";
import { audit, consumeRateLimit, normalizePhone, readJsonLimited, RequestBodyError, requestIp, sameOrigin } from "@/lib/security";

/** The staff member must identify the caller before reading out this one-time code. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const staff = await getStaff();
  if (!can(staff, "patients.verify_phone")) return Response.json({ error: "صدور کد تلفنی در سطح دسترسی شما نیست." }, { status: 403 });
  if (!otpSecretConfigured()) return Response.json({ error: "کلید امنیتی ورود روی سرور تنظیم نشده است." }, { status: 503 });
  let raw: unknown;
  try { raw = await readJsonLimited(request, 8192); }
  catch (error) { return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "اطلاعات معتبر نیست." }, { status: 400 }); }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  if (body.purpose !== undefined && body.purpose !== "login" && body.purpose !== "change_phone") return Response.json({ error: "نوع کد معتبر نیست." }, { status: 400 });
  const purpose = body.purpose === "change_phone" ? "change_phone" : "login";
  if (!/^09\d{9}$/.test(phone) || body.confirmedIdentity !== true) return Response.json({ error: "شماره معتبر و تأیید احراز هویت تلفنی الزامی است." }, { status: 400 });
  if (await consumeRateLimit(`staff-otp:${staff!.id}:${requestIp(request)}`, 30, 3600, 3600)) return Response.json({ error: "تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید." }, { status: 429 });
  const code = String(crypto.randomInt(100000, 1000000));
  await db.insert(phoneVerifications).values({ phone, purpose, codeHash: otpHash(phone, purpose, code), expiresAt: new Date(Date.now() + 300000), attempts: 0, tokenHash: null, verifiedUntil: null })
    .onConflictDoUpdate({ target: [phoneVerifications.phone, phoneVerifications.purpose], set: { codeHash: otpHash(phone, purpose, code), expiresAt: new Date(Date.now() + 300000), attempts: 0, tokenHash: null, verifiedUntil: null, createdAt: new Date() } });
  await audit(staff!.name, purpose === "login" ? "صدور کد ورود تلفنی" : "صدور کد تغییر شماره", `شمارهٔ منتهی به ${phone.slice(-4)}`);
  return Response.json({ code, expiresIn: 300 }, { headers: { "Cache-Control": "private, no-store" } });
}
