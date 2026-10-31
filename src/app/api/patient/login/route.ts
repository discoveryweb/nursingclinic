import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { appointments, patients, phoneVerifications } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { otpHash, otpMatches, otpSecretConfigured } from "@/lib/otp";
import { consumeRateLimit, logServerError, normalizeDigits, normalizePhone, readJsonLimited, RequestBodyError, requestIp, sameOrigin } from "@/lib/security";

/** Verify and consume a single-use code, then create/reuse the patient's account. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  if (!otpSecretConfigured()) return Response.json({ error: "ورود امن هنوز روی سرور پیکربندی نشده است؛ با پذیرش تماس بگیرید." }, { status: 503 });
  let raw: unknown;
  try { raw = await readJsonLimited(request, 8192); }
  catch (error) { return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "اطلاعات ورود معتبر نیست." }, { status: 400 }); }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  const code = normalizeDigits(typeof body.code === "string" ? body.code : "").trim();
  if (!/^09\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) return Response.json({ error: "شماره موبایل و کد شش‌رقمی معتبر وارد کنید." }, { status: 400 });
  if (await consumeRateLimit(`otp-verify-ip:${requestIp(request)}`, 30, 600, 900)) return Response.json({ error: "تلاش‌های ورود زیاد است؛ چند دقیقه دیگر دوباره تلاش کنید." }, { status: 429 });
  try {
    const patient = await db.transaction(async tx => {
      const [verification] = await tx.select().from(phoneVerifications).where(and(eq(phoneVerifications.phone, phone), eq(phoneVerifications.purpose, "login"))).for("update").limit(1);
      if (!verification || verification.expiresAt <= new Date() || verification.attempts >= 5) return null;
      if (!otpMatches(verification.codeHash, otpHash(phone, "login", code))) {
        await tx.update(phoneVerifications).set({ attempts: verification.attempts + 1 }).where(eq(phoneVerifications.id, verification.id));
        return null;
      }
      await tx.delete(phoneVerifications).where(eq(phoneVerifications.id, verification.id));
      // New patient accounts are passwordless; ownership is proven by the one-time code.
      await tx.insert(patients).values({ phone, name: "", phoneVerified: true }).onConflictDoNothing({ target: patients.phone });
      const [account] = await tx.update(patients).set({ phoneVerified: true, updatedAt: new Date() }).where(eq(patients.phone, phone)).returning({ id: patients.id, name: patients.name });
      // Link past telephone bookings only after verifying the number's ownership.
      await tx.update(appointments).set({ patientId: account.id }).where(and(eq(appointments.patientPhone, phone), isNull(appointments.patientId)));
      return account;
    });
    if (!patient) return Response.json({ error: "کد صحیح نیست، منقضی شده یا قبلاً استفاده شده است." }, { status: 400 });
    await createSession("patient", patient.id);
    return Response.json({ ok: true, needsProfile: patient.name.trim().length < 2 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logServerError("Patient OTP login failed", error);
    return Response.json({ error: "ورود انجام نشد؛ لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}
