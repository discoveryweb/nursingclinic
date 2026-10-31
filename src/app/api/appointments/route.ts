import { eq } from "drizzle-orm";
import { z } from "zod";
import { after } from "next/server";
import { db } from "@/db";
import { appointments, doctors, notifications, patients, visitTypes } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { formatJalaliDateTime } from "@/lib/date";
import { consumeRateLimit, logServerError, readJsonLimited, RequestBodyError, requestIp, sameOrigin } from "@/lib/security";
import { notificationRecipients, deliverAppointmentSms } from "@/lib/sms";
import { buildDaySlots, doctorWorksOnDate, filterPastSlotsIfToday, isBookableDate } from "@/lib/slots";

export const dynamic = "force-dynamic";
const schema = z.object({
  doctorId: z.coerce.number().int().positive(),
  visitType: z.enum(visitTypes),
  patientAddress: z.string().trim().max(500).optional().default(""),
  patientNote: z.string().trim().max(500).optional().default(""),
  appointmentDate: z.string().max(10),
  appointmentTime: z.string().max(5),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const patient = await getPatient();
  if (!patient) return Response.json({ error: "پیش از رزرو، با شماره همراه خود وارد شوید.", code: "LOGIN_REQUIRED" }, { status: 401 });
  if (patient.name.trim().length < 2) return Response.json({ error: "ابتدا نام خود را در حساب کاربری تکمیل کنید.", code: "PROFILE_REQUIRED" }, { status: 400 });
  if (await consumeRateLimit(`booking-patient:${patient.id}`, 12, 86400, 3600) || await consumeRateLimit(`booking-ip:${requestIp(request)}`, 30, 600, 900)) {
    return Response.json({ error: "تعداد درخواست‌ها زیاد است؛ لطفاً بعداً دوباره تلاش کنید." }, { status: 429 });
  }
  let data: z.infer<typeof schema>;
  try { data = schema.parse(await readJsonLimited(request, 16384)); }
  catch (error) {
    return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "اطلاعات نوبت و شیوهٔ مراجعه را کامل وارد کنید." }, { status: 400 });
  }
  const address = data.visitType === "home" ? data.patientAddress : "";
  if (data.visitType === "home" && address.length < 10) return Response.json({ error: "برای خدمت در محل، نشانی کامل شامل خیابان و پلاک را وارد کنید." }, { status: 400 });
  const [doctor] = await db.select().from(doctors).where(eq(doctors.id, data.doctorId)).limit(1);
  if (!doctor?.active) return Response.json({ error: "متخصص انتخاب‌شده در دسترس نیست." }, { status: 404 });
  if (!doctor.visitModes.includes(data.visitType)) return Response.json({ error: "این شیوهٔ خدمت برای متخصص فعال نیست." }, { status: 400 });
  if (!isBookableDate(data.appointmentDate) || !doctorWorksOnDate(doctor, data.appointmentDate) || !filterPastSlotsIfToday(data.appointmentDate, buildDaySlots(doctor)).includes(data.appointmentTime)) {
    return Response.json({ error: "تاریخ یا ساعت انتخاب‌شده معتبر نیست. لطفاً زمان دیگری انتخاب کنید." }, { status: 400 });
  }
  const recipients = await notificationRecipients();
  try {
    const result = await db.transaction(async tx => {
      const [lockedDoctor] = await tx.select().from(doctors).where(eq(doctors.id, doctor.id)).for("update").limit(1);
      if (!lockedDoctor?.active || !lockedDoctor.visitModes.includes(data.visitType) || !doctorWorksOnDate(lockedDoctor, data.appointmentDate) || !filterPastSlotsIfToday(data.appointmentDate, buildDaySlots(lockedDoctor)).includes(data.appointmentTime)) throw new Error("SCHEDULE_CHANGED");
      if (data.visitType === "home" && address !== patient.address) await tx.update(patients).set({ address, updatedAt: new Date() }).where(eq(patients.id, patient.id));
      const [appointment] = await tx.insert(appointments).values({
        doctorId: doctor.id, patientId: patient.id, patientName: patient.name, patientPhone: patient.phone,
        visitType: data.visitType, patientAddress: address, patientNote: data.patientNote,
        appointmentDate: data.appointmentDate, appointmentTime: data.appointmentTime, status: "pending",
      }).returning({ id: appointments.id, status: appointments.status });
      const when = formatJalaliDateTime(data.appointmentDate, data.appointmentTime);
      const place = data.visitType === "home" ? `در محل مراجعه‌کننده · ${address}` : "در کلینیک";
      const panelMessage = `نوبت جدید #${appointment.id}\n${patient.name} · ${patient.phone}\n${doctor.name}\n${when}\n${place}${data.patientNote ? `\nیادداشت: ${data.patientNote}` : ""}`;
      const smsMessage = `درخواست نوبت جدید #${appointment.id} · ${when} · ${data.visitType === "home" ? "در محل" : "در کلینیک"}. جزئیات در پنل امن کلینیک.`;
      await tx.insert(notifications).values([
        { appointmentId: appointment.id, channel: "dashboard", recipient: "panel", message: panelMessage, status: "sent" },
        ...(recipients.length ? recipients : [""]).map(recipient => ({ appointmentId: appointment.id, channel: "sms", recipient, message: smsMessage, status: "pending" })),
      ]);
      return appointment;
    });
    after(async () => { try { await deliverAppointmentSms(result.id); } catch (error) { logServerError("Appointment SMS processing failed", error); } });
    return Response.json({ appointment: { id: result.id, status: result.status, visitType: data.visitType } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SCHEDULE_CHANGED") return Response.json({ error: "برنامه متخصص تغییر کرده است؛ زمان دیگری انتخاب کنید.", code: "SLOT_TAKEN" }, { status: 409 });
    const dbError = error as { code?: string; cause?: { code?: string } };
    if (dbError?.cause?.code === "23505" || dbError?.code === "23505") return Response.json({ error: "این زمان به‌تازگی رزرو شده است؛ زمان دیگری انتخاب کنید.", code: "SLOT_TAKEN" }, { status: 409 });
    logServerError("Appointment transaction failed", error);
    return Response.json({ error: "ثبت نوبت انجام نشد. لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}
