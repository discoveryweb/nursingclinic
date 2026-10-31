import { toJalaali } from "jalaali-js";
import { iranNow } from "@/lib/slots";
const days = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const digits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
export function toPersianDigits(input: string | number) { return String(input).replace(/[0-9]/g, d => digits[Number(d)]); }
export function toIsoDate(date: Date) { return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Tehran",year:"numeric",month:"2-digit",day:"2-digit"}).format(date); }
export function isoDateToJalali(iso: string) { const [y,m,d] = iso.split("-").map(Number); return toJalaali(y,m,d); }
export function formatJalaliLong(iso: string) { const {jy,jm,jd} = isoDateToJalali(iso); return `${days[new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${toPersianDigits(jd)} ${months[jm-1]} ${toPersianDigits(jy)}`; }
export function formatJalaliShort(iso: string) { const {jm,jd} = isoDateToJalali(iso); return `${days[new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${toPersianDigits(jd)} ${months[jm-1]}`; }
export function formatJalaliDateTime(iso: string, time: string) { return `${formatJalaliLong(iso)} ساعت ${toPersianDigits(time)}`; }
export function weekdayName(dayIndex: number) { return days[dayIndex] ?? ""; }
export function nextDays(count: number) { const d = new Date(`${iranNow().date}T00:00:00Z`); return Array.from({length: count}, (_, i) => new Date(d.getTime() + i * 86400000).toISOString().slice(0,10)); }
