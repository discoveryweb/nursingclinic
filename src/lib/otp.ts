import crypto from "node:crypto";
import { isSmsConfigured } from "@/lib/sms";

/** OTP secrets stay on the server. No development/default code is accepted. */
export function otpSecretConfigured(): boolean {
  return !!process.env.OTP_SECRET && process.env.OTP_SECRET.length >= 32;
}

export function otpConfigured(): boolean {
  return isSmsConfigured() && otpSecretConfigured();
}

export function otpHash(phone: string, purpose: string, code: string) {
  const secret = process.env.OTP_SECRET;
  if (!secret || secret.length < 32) throw new Error("OTP_SECRET is not configured or is too short");
  return crypto.createHmac("sha256", secret).update(`${phone}:${purpose}:${code}`).digest("hex");
}

export function otpMatches(leftHash: string, rightHash: string) {
  const left = Buffer.from(leftHash, "hex");
  const right = Buffer.from(rightHash, "hex");
  return left.length === 32 && right.length === 32 && crypto.timingSafeEqual(left, right);
}

/**
 * Sends OTP verification code.
 * Supports Melipayamak (primary, both ByBaseNumber pattern & SendSMS) and Kavenegar (fallback).
 */
export async function sendVerificationSms(phone: string, code: string): Promise<boolean> {
  if (!otpSecretConfigured()) return false;

  // 1. Primary: Melipayamak
  const mpUser = process.env.MELIPAYAMAK_USERNAME?.trim();
  const mpPass = process.env.MELIPAYAMAK_PASSWORD?.trim();
  const mpBodyId = process.env.MELIPAYAMAK_OTP_BODY_ID?.trim(); // optional pattern id
  const mpFrom = process.env.MELIPAYAMAK_FROM?.trim() || "50004";

  if (mpUser && mpPass) {
    try {
      if (mpBodyId && Number(mpBodyId) > 0) {
        // Melipayamak pattern verification (ByBaseNumber)
        const response = await fetch("https://rest.melipayamak.com/v1/ByBaseNumber", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: mpUser,
            password: mpPass,
            text: code,
            to: phone,
            bodyId: Number(mpBodyId),
          }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);
        if (response.ok && (Number(data?.Value) > 1000 || data?.RetStatus === 1)) {
          return true;
        }
      }

      // Melipayamak standard SendSMS
      const response = await fetch("https://rest.melipayamak.com/v1/SendSMS", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: mpFrom,
          to: phone,
          text: `کد ورود کلینیک آرامش: ${code}\nاین کد ۵ دقیقه معتبر است. آن را در اختیار دیگران قرار ندهید.`,
          username: mpUser,
          password: mpPass,
        }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      return response.ok && (Number(data?.Value) > 1000 || data?.RetStatus === 1);
    } catch {
      // Fallback below if Kavenegar configured
    }
  }

  // 2. Secondary fallback: Kavenegar
  const apiKey = process.env.KAVENEGAR_API_KEY?.trim();
  if (apiKey) {
    const template = process.env.KAVENEGAR_VERIFY_TEMPLATE?.trim();
    const endpoint = template ? "verify/lookup.json" : "sms/send.json";
    const params = template
      ? new URLSearchParams({ receptor: phone, token: code, template })
      : new URLSearchParams({ receptor: phone, message: `کد ورود کلینیک آرامش: ${code}\nاین کد تا ۵ دقیقه معتبر است. آن را در اختیار دیگران قرار ندهید.` });
    if (!template && process.env.KAVENEGAR_SENDER) params.set("sender", process.env.KAVENEGAR_SENDER);

    try {
      const endpointUrl = `https://api.kavenegar.com/v1/${apiKey}/${endpoint}`;
      const response = await fetch(template ? `${endpointUrl}?${params.toString()}` : endpointUrl, {
        method: template ? "GET" : "POST",
        ...(template ? {} : { headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params }),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);
      return response.ok && data?.return?.status === 200;
    } catch {
      return false;
    }
  }

  return false;
}
