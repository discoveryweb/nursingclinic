import type { Doctor } from "@/db/schema";

export type SlotInfo = { time: string; available: boolean };
type ClinicTime = { date: string; minute: number };

function minutes(time: string) {
  const [hours, minute] = time.split(":").map(Number);
  return hours * 60 + minute;
}
function hhmm(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function iranNow(): ClinicTime {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || "00";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, minute: Number(part("hour")) * 60 + Number(part("minute")) };
}
export function isValidDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
}
export function isBookableDate(iso: string) {
  if (!isValidDate(iso)) return false;
  const days = (Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${iranNow().date}T00:00:00Z`)) / 86400000;
  return days >= 0 && days < 21;
}
export function buildDaySlots(doctor: Pick<Doctor, "startTime" | "endTime" | "slotMinutes">): string[] {
  const start = minutes(doctor.startTime), end = minutes(doctor.endTime), step = Math.max(10, doctor.slotMinutes || 30);
  const result: string[] = [];
  for (let time = start; time + step <= end && time < 1440; time += step) result.push(hhmm(time));
  return result;
}
export function doctorWorksOnDate(doctor: Pick<Doctor, "workDays">, isoDate: string): boolean {
  if (!isValidDate(isoDate)) return false;
  // Tehran calendar day — UTC can be off by one (UTC+3:30)
  const d = new Date(`${isoDate}T12:00:00+03:30`);
  const w = Number.isNaN(d.getTime()) ? new Date(`${isoDate}T00:00:00Z`).getUTCDay()
    : ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short" }).format(d)] ?? new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return (doctor.workDays ?? []).includes(w);
}
export function isTodayOrFuture(isoDate: string): boolean { return isValidDate(isoDate) && isoDate >= iranNow().date; }
export function filterPastSlotsIfToday(isoDate: string, slots: string[]): string[] {
  const now = iranNow();
  return isoDate === now.date ? slots.filter(slot => minutes(slot) > now.minute + 20) : slots;
}

/** Compute in the clinic's calendar, including appointments across midnight. */
export function minutesUntilAppointment(isoDate: string, time: string, now: ClinicTime = iranNow()): number | null {
  if (!isValidDate(isoDate) || !isValidDate(now.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const dayDifference = (Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 86400000;
  return dayDifference * 1440 + minutes(time) - now.minute;
}
export function canCancelAppointment(isoDate: string, time: string, now: ClinicTime = iranNow(), cutoffMinutes = 120): boolean {
  const remaining = minutesUntilAppointment(isoDate, time, now);
  return remaining !== null && remaining > cutoffMinutes;
}
