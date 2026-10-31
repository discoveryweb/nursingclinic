import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patients, phoneVerifications } from "@/db/schema";
import { createSession, getPatient, revokeSessions } from "@/lib/auth";
import { otpHash, otpMatches, otpSecretConfigured } from "@/lib/otp";
import { consumeRateLimit, logServerError, normalizeDigits, normalizePhone, readJsonLimited, RequestBodyError, sameOrigin } from "@/lib/security";

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const patient = await getPatient();
  if (!patient) return Response.json({ error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  if (!otpSecretConfigured()) return Response.json({ error: "تأیید شماره هنوز تنظیم نشده است؛ با پذیرش تماس بگیرید." }, { status: 503 });
  let input: unknown;
  try { input = await readJsonLimited(request, 8192); }
  catch (error) { return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "درخواست نامعتبر است." }, { status: 400 }); }
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  const code = normalizeDigits(typeof body.code === "string" ? body.code : "").trim();
  if (!/^09\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) return Response.json({ error: "شماره و کد شش‌رقمی معتبر وارد کنید." }, { status: 400 });
  if (phone === patient.phone) return Response.json({ error: "این شماره هم‌اکنون روی حساب شما ثبت است." }, { status: 400 });
  if (await consumeRateLimit(`change-phone:${patient.id}`, 15, 3600, 3600)) return Response.json({ error: "تعداد تلاش‌ها زیاد است؛ بعداً دوباره تلاش کنید." }, { status: 429 });
  try {
    const result = await db.transaction(async tx => {
      const [verification] = await tx.select().from(phoneVerifications).where(and(eq(phoneVerifications.phone, phone), eq(phoneVerifications.purpose, "change_phone"))).for("update").limit(1);
      if (!verification || verification.expiresAt <= new Date() || verification.attempts >= 5) return "invalid" as const;
      if (!otpMatches(verification.codeHash, otpHash(phone, "change_phone", code))) {
        await tx.update(phoneVerifications).set({ attempts: verification.attempts + 1 }).where(eq(phoneVerifications.id, verification.id));
        return "invalid" as const;
      }
      await tx.delete(phoneVerifications).where(eq(phoneVerifications.id, verification.id));
      const [existing] = await tx.select({ id: patients.id }).from(patients).where(eq(patients.phone, phone)).limit(1);
      if (existing) return "in_use" as const;
      await tx.update(patients).set({ phone, phoneVerified: true, updatedAt: new Date() }).where(eq(patients.id, patient.id));
      return "updated" as const;
    });
    if (result === "invalid") return Response.json({ error: "کد صحیح نیست، منقضی شده یا قبلاً استفاده شده است." }, { status: 400 });
    if (result === "in_use") return Response.json({ error: "این شماره به حساب دیگری تعلق دارد؛ با پذیرش تماس بگیرید." }, { status: 409 });
    await revokeSessions("patient", patient.id);
    await createSession("patient", patient.id);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const dbError = error as { code?: string; cause?: { code?: string } };
    if (dbError?.code === "23505" || dbError?.cause?.code === "23505") return Response.json({ error: "این شماره به حساب دیگری تعلق دارد." }, { status: 409 });
    logServerError("Patient phone update failed", error);
    return Response.json({ error: "تغییر شماره انجام نشد؛ دوباره تلاش کنید." }, { status: 500 });
  }
}
