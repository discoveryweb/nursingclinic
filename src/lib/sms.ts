import { and, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications, staffUsers } from "@/db/schema";
import { getSetting, SETTINGS_KEYS } from "@/lib/settings";
import { normalizePhone } from "@/lib/security";

/** Checks if either Melipayamak (primary) or secondary gateway is configured */
export function isSmsConfigured(): boolean {
  const hasMelipayamak = !!process.env.MELIPAYAMAK_USERNAME && !!process.env.MELIPAYAMAK_PASSWORD;
  const hasKavenegar = !!process.env.KAVENEGAR_API_KEY;
  return hasMelipayamak || hasKavenegar;
}

export function getActiveSmsProviderName(): string {
  if (process.env.MELIPAYAMAK_USERNAME && process.env.MELIPAYAMAK_PASSWORD) {
    return "ملی‌پیامک (Melipayamak)";
  }
  if (process.env.KAVENEGAR_API_KEY) {
    return "کاوه‌نگار (Kavenegar)";
  }
  return "تنظیم‌نشده (شبیه‌سازی)";
}

export async function notificationRecipients() {
  const configured = await getSetting(SETTINGS_KEYS.secretaryPhone);
  const staff = await db
    .select({ phone: staffUsers.phone, role: staffUsers.role, permissions: staffUsers.permissions })
    .from(staffUsers)
    .where(eq(staffUsers.active, true));
  const numbers = [
    configured,
    ...staff.filter(s => s.role === "super_admin" || (s.permissions || []).includes("notifications.view")).map(s => s.phone),
  ];
  return [...new Set(numbers.map(normalizePhone).filter(phone => /^09\d{9}$/.test(phone)))];
}

/**
 * Sends a generic SMS using the configured provider.
 * Melipayamak REST API is the primary gateway.
 */
async function sendSmsViaProvider(to: string, message: string): Promise<{ ok: boolean; responseText: string }> {
  // 1. Primary: Melipayamak REST
  const mpUser = process.env.MELIPAYAMAK_USERNAME?.trim();
  const mpPass = process.env.MELIPAYAMAK_PASSWORD?.trim();
  const mpFrom = process.env.MELIPAYAMAK_FROM?.trim() || "50004";

  if (mpUser && mpPass) {
    try {
      const response = await fetch("https://rest.melipayamak.com/v1/SendSMS", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: mpFrom,
          to,
          text: message,
          username: mpUser,
          password: mpPass,
        }),
        signal: AbortSignal.timeout(9_000),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      // Melipayamak SendSMS returns { Value: "12345678", RetStatus: 1, StrRetStatus: "Ok" } on success
      const ok = response.ok && (
        (typeof data?.Value === "string" && data.Value.length > 5) ||
        data?.RetStatus === 1 ||
        Number(data?.Value) > 1000
      );
      const resp = typeof data === "object" ? JSON.stringify(data) : String(data);
      return { ok, responseText: `ملی‌پیامک: ${resp}` };
    } catch (e) {
      return { ok: false, responseText: `خطای اتصال به ملی‌پیامک: ${e instanceof Error ? e.message : "نامشخص"}` };
    }
  }

  // 2. Secondary fallback: Kavenegar
  const kvApiKey = process.env.KAVENEGAR_API_KEY?.trim();
  if (kvApiKey) {
    try {
      const params = new URLSearchParams({ receptor: to, message });
      if (process.env.KAVENEGAR_SENDER) params.set("sender", process.env.KAVENEGAR_SENDER);
      const response = await fetch(`https://api.kavenegar.com/v1/${kvApiKey}/sms/send.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
        signal: AbortSignal.timeout(9_000),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      const ok = response.ok && data?.return?.status === 200;
      return { ok, responseText: `کاوه‌نگار: ${JSON.stringify(data)}` };
    } catch (e) {
      return { ok: false, responseText: `خطای اتصال به کاوه‌نگار: ${e instanceof Error ? e.message : "نامشخص"}` };
    }
  }

  return { ok: false, responseText: "هیچ درگاه پیامکی (ملی‌پیامک یا کاوه‌نگار) در متغیرهای سرور تنظیم نشده است." };
}

/** Atomically claims one queued message; duplicate concurrent retries cannot send it twice. */
export async function deliverSms(id: number) {
  const staleSendingCutoff = new Date(Date.now() - 5 * 60 * 1000);
  const [row] = await db
    .update(notifications)
    .set({ status: "sending", updatedAt: new Date(), providerResponse: "" })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.channel, "sms"),
        or(
          inArray(notifications.status, ["pending", "failed", "not_configured", "simulated"]),
          and(eq(notifications.status, "sending"), lt(notifications.updatedAt, staleSendingCutoff)),
        ),
      ),
    )
    .returning();

  if (!row) return;

  const recipient = /^09\d{9}$/.test(row.recipient)
    ? row.recipient
    : normalizePhone(await getSetting(SETTINGS_KEYS.secretaryPhone));

  if (!isSmsConfigured() || !/^09\d{9}$/.test(recipient)) {
    await db
      .update(notifications)
      .set({
        status: "not_configured",
        providerResponse: !isSmsConfigured()
          ? "درگاه پیامک (ملی‌پیامک/کاوه‌نگار) تنظیم نشده است."
          : "شماره دریافت‌کننده تنظیم نشده است.",
        updatedAt: new Date(),
      })
      .where(eq(notifications.id, id));
    return;
  }

  if (recipient !== row.recipient) {
    await db.update(notifications).set({ recipient }).where(eq(notifications.id, id));
  }

  const { ok, responseText } = await sendSmsViaProvider(recipient, row.message);

  await db
    .update(notifications)
    .set({
      status: ok ? "sent" : "failed",
      providerResponse: responseText,
      updatedAt: new Date(),
    })
    .where(eq(notifications.id, id));
}

export async function deliverAppointmentSms(appointmentId: number) {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.appointmentId, appointmentId),
        eq(notifications.channel, "sms"),
        eq(notifications.status, "pending"),
      ),
    );
  await Promise.all(rows.map(row => deliverSms(row.id)));
}
