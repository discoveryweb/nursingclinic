import crypto from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { phoneVerifications } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { otpConfigured, otpHash, sendVerificationSms } from "@/lib/otp";
import { consumeRateLimit, normalizePhone, requestIp, safeJson, sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const body = await safeJson(request, 8192);
  const phone = normalizePhone(typeof body?.phone === "string" ? body.phone : "");
  const purpose = body?.purpose === undefined || body.purpose === "login" ? "login" : body.purpose === "change_phone" ? "change_phone" : null;
  if (!/^09\d{9}$/.test(phone) || !purpose) return Response.json({ error: "شماره موبایل معتبر وارد کنید." }, { status: 400 });
  if (purpose === "change_phone") {
    const patient = await getPatient();
    if (!patient) return Response.json({ error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (patient.phone === phone) return Response.json({ error: "این شماره هم‌اکنون روی حساب شما ثبت است." }, { status: 400 });
  }
  if (!otpConfigured()) return Response.json({ error: "ارسال پیامک هنوز فعال نشده است. می‌توانید پس از احراز هویت کد را از پذیرش دریافت کنید.", code: "SMS_UNAVAILABLE" }, { status: 503 });
  const ip = requestIp(request);
  if (await consumeRateLimit(`otp-send-ip:${ip}`, 20, 600, 900) || await consumeRateLimit(`otp-send-phone:${phone}`, 3, 600, 600)) {
    return Response.json({ error: "تعداد درخواست‌های کد زیاد است؛ چند دقیقه بعد تلاش کنید." }, { status: 429 });
  }
  await db.delete(phoneVerifications).where(lt(phoneVerifications.expiresAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = otpHash(phone, purpose, code);
  await db.insert(phoneVerifications).values({ phone, purpose, codeHash, expiresAt: new Date(Date.now() + 300000), attempts: 0, tokenHash: null, verifiedUntil: null })
    .onConflictDoUpdate({ target: [phoneVerifications.phone, phoneVerifications.purpose], set: { codeHash, expiresAt: new Date(Date.now() + 300000), attempts: 0, tokenHash: null, verifiedUntil: null, createdAt: new Date() } });
  if (!await sendVerificationSms(phone, code)) {
    await db.delete(phoneVerifications).where(and(eq(phoneVerifications.phone, phone), eq(phoneVerifications.purpose, purpose), eq(phoneVerifications.codeHash, codeHash)));
    return Response.json({ error: "ارسال کد انجام نشد. لطفاً دوباره تلاش کنید یا برای دریافت کد با پذیرش تماس بگیرید." }, { status: 502 });
  }
  return Response.json({ ok: true, expiresIn: 300 });
}
