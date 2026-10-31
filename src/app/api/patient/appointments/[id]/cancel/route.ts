import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { appointments, doctors, notifications } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { formatJalaliDateTime } from "@/lib/date";
import { logServerError, sameOrigin } from "@/lib/security";
import { deliverAppointmentSms, notificationRecipients } from "@/lib/sms";
import { canCancelAppointment } from "@/lib/slots";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const patient = await getPatient();
  if (!patient) return Response.json({ error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسهٔ نوبت معتبر نیست." }, { status: 400 });
  const [row] = await db.select({ appointment: appointments, doctorName: doctors.name }).from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.id))
    .where(and(eq(appointments.id, id), eq(appointments.patientId, patient.id))).limit(1);
  if (!row) return Response.json({ error: "نوبت یافت نشد." }, { status: 404 });
  const recipients = await notificationRecipients();
  const result = await db.transaction(async tx => {
    const [locked] = await tx.select().from(appointments).where(and(eq(appointments.id, id), eq(appointments.patientId, patient.id))).for("update").limit(1);
    if (!locked || !["pending", "confirmed"].includes(locked.status)) return "unavailable" as const;
    if (!canCancelAppointment(locked.appointmentDate, locked.appointmentTime)) return "too_late" as const;
    await tx.update(appointments).set({ status: "cancelled", updatedAt: new Date() }).where(eq(appointments.id, id));
    const when = formatJalaliDateTime(locked.appointmentDate, locked.appointmentTime);
    const dashboard = `لغو نوبت #${id} توسط مراجعه‌کننده\n${locked.patientName} · ${locked.patientPhone}\n${row.doctorName}\n${when}`;
    const sms = `کلینیک آرامش: نوبت شماره ${id} توسط مراجعه‌کننده لغو شد. برای جزئیات به پنل مراجعه کنید.`;
    await tx.insert(notifications).values([
      { appointmentId: id, channel: "dashboard", recipient: "panel", message: dashboard, status: "sent" },
      ...(recipients.length ? recipients : [""]).map(recipient => ({ appointmentId: id, channel: "sms", recipient, message: sms, status: "pending" })),
    ]);
    return "cancelled" as const;
  });
  if (result === "too_late") return Response.json({ error: "لغو آنلاین تا دو ساعت پیش از نوبت امکان‌پذیر است. لطفاً با پذیرش تماس بگیرید." }, { status: 400 });
  if (result === "unavailable") return Response.json({ error: "این نوبت دیگر قابل لغو نیست." }, { status: 409 });
  after(async () => { try { await deliverAppointmentSms(id); } catch (error) { logServerError("Cancellation SMS processing failed", error); } });
  return Response.json({ ok: true });
}
