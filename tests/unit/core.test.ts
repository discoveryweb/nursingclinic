import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDigits, normalizePhone } from "@/lib/security";
import { canCancelAppointment, buildDaySlots, doctorWorksOnDate, isBookableDate, iranNow } from "@/lib/slots";
import { safePatientNext } from "@/lib/patient-redirect";
import { reviewContentError } from "@/lib/review-moderation";
import { otpHash, otpMatches } from "@/lib/otp";

test("normalizes Persian and Arabic numerals and Iranian mobile formatting", () => {
  assert.equal(normalizeDigits("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
  assert.equal(normalizeDigits("٠٩١٢٣٤٥٦٧٨٩"), "09123456789");
  assert.equal(normalizePhone("۹۱۲-۳۴۵-۶۷۸۹"), "09123456789");
});

test("cancellation cutoff compares exact clinic-local minutes across midnight", () => {
  const now = { date: "2026-05-01", minute: 23 * 60 };
  assert.equal(canCancelAppointment("2026-05-02", "00:59", now), false);
  assert.equal(canCancelAppointment("2026-05-02", "01:00", now), false);
  assert.equal(canCancelAppointment("2026-05-02", "01:01", now), true);
  assert.equal(canCancelAppointment("2026-04-30", "23:30", now), false);
});

test("uses calendar validity and 21-day booking boundary", () => {
  assert.equal(isBookableDate("2026-02-30"), false);
  assert.equal(isBookableDate("not-a-date"), false);
  assert.equal(isBookableDate("2099-01-01"), false);
  assert.equal(isBookableDate(iranNow().date), true);
});

test("generates only complete working slots and respects weekdays", () => {
  assert.deepEqual(buildDaySlots({ startTime: "09:00", endTime: "10:00", slotMinutes: 30 }), ["09:00", "09:30"]);
  assert.deepEqual(buildDaySlots({ startTime: "23:30", endTime: "23:59", slotMinutes: 30 }), []);
  assert.equal(doctorWorksOnDate({ workDays: [5] }, "2026-05-01"), true);
  assert.equal(doctorWorksOnDate({ workDays: [6] }, "2026-05-01"), false);
});

test("patient return path rejects external redirects and unapproved paths", () => {
  assert.equal(safePatientNext("/booking?doctor=12"), "/booking?doctor=12");
  assert.equal(safePatientNext("/patient?tab=address"), "/patient?tab=address");
  assert.equal(safePatientNext("https://evil.example"), "/patient");
  assert.equal(safePatientNext("//evil.example"), "/patient");
  assert.equal(safePatientNext("/admin"), "/patient");
  assert.equal(safePatientNext("/booking?doctor=1&next=https://evil"), "/booking?doctor=1");
});

test("moderates profanity, obfuscated spelling, contact data and hostile markup", () => {
  assert.match(reviewContentError("این نظر حاوی عبارت کیــر نامناسب است و نباید منتشر شود") || "", /نامناسب/);
  assert.match(reviewContentError("شماره من ۰۹۱۲۳۴۵۶۷۸۹ است و به من زنگ بزنید") || "", /شماره تلفن/);
  assert.match(reviewContentError("این لینک را ببینید https://example.invalid/review") || "", /لینک/);
  assert.match(reviewContentError("پیام > مشکوک < است و بررسی نیاز دارد") || "", /نامعتبر/);
  assert.equal(reviewContentError("خدمت منظم بود و برخورد متخصص بسیار محترمانه و دقیق بود"), null);
  assert.equal(reviewContentError("تجربهٔ خوبی داشتم، متخصص با دقت و احترام از من مراقبت کرد."), null);
});

test("OTP uses an HMAC and compares the digest in constant-time helper", () => {
  process.env.OTP_SECRET = process.env.OTP_SECRET || "test-secret-at-least-32-characters-long-12345";
  const a = otpHash("09123456789", "login", "123456");
  const b = otpHash("09123456789", "login", "123456");
  const c = otpHash("09123456789", "change_phone", "123456");
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.equal(otpMatches(a, b), true);
  assert.equal(otpMatches(a, c), false);
});
