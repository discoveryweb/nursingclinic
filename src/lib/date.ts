import { toJalaali } from "jalaali-js";
import { iranNow } from "@/lib/slots";
const days = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function toPersianDigits(input: string | number) { return String(input).replace(/[0-9]/g, d => digits[Number(d)]); }
export function toIsoDate(date: Date) { return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(date); }
export function isoDateToJalali(iso: string) { const [y,m,d] = iso.split("-").map(Number); return toJalaali(y,m,d); }
// Tehran-aware weekday: “2026-05-01” must map to Tehran calendar day, not UTC.
export function tehranWeekday(iso: string): number {
  const dt = new Date(`${iso}T12:00:00+03:30`);
  if (Number.isNaN(dt.getTime())) return new Date(`${iso}T00:00:00Z`).getUTCDay();
  const w = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" }).format(dt);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? new Date(`${iso}T00:00:00Z`).getUTCDay();
}
export function formatJalaliLong(iso: string) { const {jy,jm,jd} = isoDateToJalali(iso); return `${days[tehranWeekday(iso)]} ${toPersianDigits(jd)} ${months[jm-1]} ${toPersianDigits(jy)}`; }
export function formatJalaliShort(iso: string) { const {jm,jd} = isoDateToJalali(iso); return `${days[tehranWeekday(iso)]} ${toPersianDigits(jd)} ${months[jm-1]}`; }
export function formatJalaliDateTime(iso: string, time: string) { return `${formatJalaliLong(iso)} ساعت ${toPersianDigits(time)}`; }
export function weekdayName(dayIndex: number) { return days[dayIndex] ?? ""; }
export function nextDays(count: number) { const d = new Date(`${iranNow().date}T00:00:00Z`); return Array.from({length: count}, (_, i) => new Date(d.getTime() + i * 86400000).toISOString().slice(0,10)); }
