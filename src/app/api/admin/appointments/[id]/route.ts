import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { appointments, doctors, notifications } from "@/db/schema";
import { can, getStaff } from "@/lib/auth";
import { formatJalaliDateTime } from "@/lib/date";
import { audit, logServerError, readJsonLimited, RequestBodyError, sameOrigin } from "@/lib/security";
import { deliverSms } from "@/lib/sms";
import { minutesUntilAppointment } from "@/lib/slots";

export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getStaff();
  if (!can(user, "appointments.manage")) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  let body: unknown;
  try { body = await readJsonLimited(request, 8192); }
  catch (error) { return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "درخواست نامعتبر است." }, { status: 400 }); }
  const status = body && typeof body === "object" ? (body as Record<string, unknown>).status : null;
  if (typeof status !== "string" || !["confirmed", "cancelled", "done"].includes(status)) return Response.json({ error: "وضعیت نامعتبر است." }, { status: 400 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const conditions = [eq(appointments.id, id)];
  if (user?.role === "specialist") {
    if (!user.doctorId) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
    conditions.push(eq(appointments.doctorId, user.doctorId));
  }
  const [row] = await db.select({ appointment: appointments, doctorName: doctors.name }).from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id)).where(and(...conditions)).limit(1);
  if (!row) return Response.json({ error: "نوبت یافت نشد." }, { status: 404 });
  const previous = row.appointment.status;
  const allowed = (previous === "pending" && ["confirmed", "cancelled"].includes(status)) || (previous === "confirmed" && ["done", "cancelled"].includes(status));
  if (!allowed) return Response.json({ error: "این تغییر وضعیت مجاز نیست." }, { status: 409 });
  if (status === "done" && (minutesUntilAppointment(row.appointment.appointmentDate, row.appointment.appointmentTime) ?? 1) > 0) {
    return Response.json({ error: "تا شروع زمان نوبت، ثبت وضعیت انجام‌شده امکان‌پذیر نیست." }, { status: 400 });
  }
  const labels: Record<string, string> = { confirmed: "تأیید شد", cancelled: "لغو شد", done: "انجام شد" };
  const result = await db.transaction(async tx => {
    const [updated] = await tx.update(appointments).set({ status, updatedAt: new Date() }).where(and(eq(appointments.id, id), eq(appointments.status, previous))).returning();
    if (!updated) return null;
    const sms = `کلینیک آرامش · نوبت شماره ${id}\nوضعیت نوبت شما ${labels[status]}.\n${formatJalaliDateTime(updated.appointmentDate, updated.appointmentTime)}`;
    const [notice] = await tx.insert(notifications).values({ appointmentId: id, channel: "sms", recipient: updated.patientPhone, message: sms, status: "pending" }).returning({ id: notifications.id });
    return { updated, noticeId: notice.id };
  });
  if (!result) return Response.json({ error: "وضعیت نوبت هم‌زمان تغییر کرده است؛ صفحه را تازه‌سازی کنید." }, { status: 409 });
  await audit(user!.name, "تغییر وضعیت نوبت", `#${id}: ${previous} → ${status}`);
  after(async () => { try { await deliverSms(result.noticeId); } catch (error) { logServerError("Appointment status SMS failed", error); } });
  return Response.json({ appointment: result.updated });
}
export async function DELETE() { return Response.json({ error: "حذف دائمی برای حفظ سوابق غیرفعال است؛ می‌توانید نوبت را لغو کنید." }, { status: 405 }); }
