import { and, count, desc, eq, gt, gte, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doctors, notifications } from "@/db/schema";
import { can, getStaff } from "@/lib/auth";
import { iranNow } from "@/lib/slots";
import { isSmsConfigured, getActiveSmsProviderName } from "@/lib/sms";

export const dynamic = "force-dynamic";
export async function GET() {
  const staff = await getStaff();
  if (!staff || staff.mustChangePassword) return Response.json({ error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  const canView = can(staff, "appointments.view");
  const canNotify = can(staff, "notifications.view");
  const now = iranNow();
  const currentTime = `${String(Math.floor(now.minute / 60)).padStart(2, "0")}:${String(now.minute % 60).padStart(2, "0")}`;
  // Specialists may only see appointments assigned to their own profile.
  const scope = staff.role === "specialist" ? eq(appointments.doctorId, staff.doctorId ?? -1) : undefined;
  const countAppointments = async (condition: ReturnType<typeof and>) => {
    const [row] = await db.select({ value: count() }).from(appointments).where(and(scope, condition));
    return row?.value ?? 0;
  };
  const [today, pending, upcoming, recent, unread] = await Promise.all([
    canView ? countAppointments(and(eq(appointments.appointmentDate, now.date), inArray(appointments.status, ["pending", "confirmed", "done"]))) : 0,
    canView ? countAppointments(and(eq(appointments.status, "pending"))) : 0,
    canView ? countAppointments(and(inArray(appointments.status, ["pending", "confirmed"]), or(gt(appointments.appointmentDate, now.date), and(eq(appointments.appointmentDate, now.date), gte(appointments.appointmentTime, currentTime))))) : 0,
    canView ? db.select({ id: appointments.id, patientName: appointments.patientName, patientPhone: appointments.patientPhone, doctorName: doctors.name, appointmentDate: appointments.appointmentDate, appointmentTime: appointments.appointmentTime, status: appointments.status }).from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).where(scope).orderBy(desc(appointments.createdAt), desc(appointments.id)).limit(8) : [],
    canNotify ? db.select({ value: count() }).from(notifications).where(and(eq(notifications.channel, "dashboard"), eq(notifications.read, false))).then(rows => rows[0]?.value ?? 0) : 0,
  ]);
  return Response.json({
    stats: { today, pending, upcoming, unread },
    recent,
    smsConfigured: canNotify ? isSmsConfigured() : null,
    smsProvider: canNotify ? getActiveSmsProviderName() : null,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
