import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { after } from "next/server";
import { db } from "@/db";
import { appointments, appointmentStatusValues, doctors, notifications, patients, visitTypes } from "@/db/schema";
import { can, getStaff } from "@/lib/auth";
import { formatJalaliDateTime } from "@/lib/date";
import { audit, consumeRateLimit, logServerError, normalizeDigits, normalizePhone, readJsonLimited, requestIp, RequestBodyError, sameOrigin } from "@/lib/security";
import { deliverAppointmentSms, notificationRecipients } from "@/lib/sms";
import { buildDaySlots, doctorWorksOnDate, filterPastSlotsIfToday, isBookableDate, isValidDate } from "@/lib/slots";

export const dynamic = "force-dynamic";
const manualSchema = z.object({
  doctorId: z.number().int().positive(),
  patientName: z.string().trim().min(2).max(150),
  patientPhone: z.string().trim().min(10).max(30),
  visitType: z.enum(visitTypes),
  patientAddress: z.string().trim().max(500).optional().default(""),
  patientNote: z.string().trim().max(500).optional().default(""),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function GET(request: Request) {
  const user = await getStaff();
  if (!can(user, "appointments.view")) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const date = params.get("date");
  const doctorId = params.get("doctorId");
  const visitType = params.get("visitType");
  const search = normalizeDigits(params.get("search") || "").trim().slice(0, 100);
  const requestedPage = Math.max(1, Math.min(100000, Number.parseInt(params.get("page") || "1", 10) || 1));
  const pageSize = 30;
  const conditions: SQL[] = [];
  if (status && status !== "all") {
    if (!appointmentStatusValues.includes(status as typeof appointmentStatusValues[number])) return Response.json({ error: "وضعیت نامعتبر است." }, { status: 400 });
    conditions.push(eq(appointments.status, status));
  }
  if (date) {
    if (!isValidDate(date)) return Response.json({ error: "تاریخ نامعتبر است." }, { status: 400 });
    conditions.push(eq(appointments.appointmentDate, date));
  }
  if (visitType) {
    if (!visitTypes.includes(visitType as typeof visitTypes[number])) return Response.json({ error: "نوع خدمت نامعتبر است." }, { status: 400 });
    conditions.push(eq(appointments.visitType, visitType));
  }
  if (user?.role === "specialist") {
    if (!user.doctorId) return Response.json({ appointments: [], total: 0, page: 1, totalPages: 1, canManage: false, canCreate: false });
    conditions.push(eq(appointments.doctorId, user.doctorId));
  } else if (doctorId) {
    if (!Number.isInteger(Number(doctorId)) || Number(doctorId) < 1 || Number(doctorId) > 2147483647) return Response.json({ error: "متخصص نامعتبر است." }, { status: 400 });
    conditions.push(eq(appointments.doctorId, Number(doctorId)));
  }
  if (search) {
    const numericId = /^\d{1,9}$/.test(search) ? Number(search) : null;
    const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    const filter = or(ilike(appointments.patientName, term), ilike(appointments.patientPhone, term), ilike(doctors.name, term), numericId ? eq(appointments.id, numericId) : undefined);
    if (filter) conditions.push(filter);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [countRow] = await db.select({ value: count() }).from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).where(where);
  const total = countRow?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const rows = await db.select({
    id: appointments.id, doctorId: appointments.doctorId,
    doctorName: doctors.name, doctorSpecialty: doctors.specialty,
    patientName: appointments.patientName, patientPhone: appointments.patientPhone,
    visitType: appointments.visitType, patientAddress: appointments.patientAddress,
    patientNote: appointments.patientNote,
    appointmentDate: appointments.appointmentDate, appointmentTime: appointments.appointmentTime,
    status: appointments.status, createdAt: appointments.createdAt,
  }).from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).where(where)
    .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime), desc(appointments.id))
    .limit(pageSize).offset((page - 1) * pageSize);
  return Response.json({ appointments: rows, total, page, totalPages, canManage: can(user, "appointments.manage"), canCreate: user?.role !== "specialist" && can(user, "appointments.manage") }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff || staff.role === "specialist" || !can(staff, "appointments.manage")) {
    return Response.json({ error: "ثبت نوبت تلفنی فقط برای کادر پذیرش مجاز است." }, { status: 403 });
  }
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  if (await consumeRateLimit(`manual-booking:${staff.id}:${requestIp(request)}`, 200, 86400, 3600)) {
    return Response.json({ error: "سقف درخواست‌های ثبت دستی پر شده است؛ با مدیر هماهنگ کنید." }, { status: 429 });
  }
  let body: unknown;
  try { body = await readJsonLimited(request, 16384); }
  catch (error) {
    return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "اطلاعات ارسالی نامعتبر است." }, { status: 400 });
  }
  const parsed = manualSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "نام، شماره، متخصص، محل خدمت و زمان را کامل وارد کنید." }, { status: 400 });
  const data = parsed.data;
  const phone = normalizePhone(data.patientPhone);
  const address = data.visitType === "home" ? data.patientAddress : "";
  if (!/^09\d{9}$/.test(phone)) return Response.json({ error: "شماره موبایل بیمار معتبر نیست." }, { status: 400 });
  if (data.visitType === "home" && address.length < 10) return Response.json({ error: "نشانی کامل برای خدمت در محل الزامی است." }, { status: 400 });
  if (!isBookableDate(data.appointmentDate)) return Response.json({ error: "تاریخ باید در ۲۱ روز آینده باشد." }, { status: 400 });

  try {
    const recipients = await notificationRecipients();
    const result = await db.transaction(async tx => {
      const [doctor] = await tx.select().from(doctors).where(eq(doctors.id, data.doctorId)).for("update").limit(1);
      if (!doctor?.active || !doctor.visitModes.includes(data.visitType) || !doctorWorksOnDate(doctor, data.appointmentDate) || !filterPastSlotsIfToday(data.appointmentDate, buildDaySlots(doctor)).includes(data.appointmentTime)) {
        throw new Error("INVALID_SLOT");
      }
      const [patient] = await tx.select({ id: patients.id }).from(patients).where(eq(patients.phone, phone)).limit(1);
      // Never create a passwordless patient account from a phone conversation.
      const [appointment] = await tx.insert(appointments).values({
        doctorId: doctor.id, patientId: patient?.id ?? null,
        patientName: data.patientName, patientPhone: phone,
        visitType: data.visitType, patientAddress: address, patientNote: data.patientNote,
        appointmentDate: data.appointmentDate, appointmentTime: data.appointmentTime, status: "confirmed",
      }).returning({ id: appointments.id });
      const time = formatJalaliDateTime(data.appointmentDate, data.appointmentTime);
      const place = data.visitType === "home" ? "در محل بیمار" : "در کلینیک";
      await tx.insert(notifications).values([
        { appointmentId: appointment.id, channel: "dashboard", recipient: "panel", message: `نوبت تلفنی #${appointment.id} توسط ${staff.name}\n${data.patientName} · ${phone}\n${doctor.name} · ${time}\n${place}${address ? `\nنشانی: ${address}` : ""}`, status: "sent" },
        { appointmentId: appointment.id, channel: "sms", recipient: phone, message: `کلینیک آرامش · نوبت تلفنی #${appointment.id} با ${doctor.name} در ${time} ${place} ثبت و تأیید شد.`, status: "pending" },
        ...recipients.filter(number => number !== phone).map(number => ({ appointmentId: appointment.id, channel: "sms", recipient: number, message: `نوبت تلفنی جدید #${appointment.id} · ${time} · ${place}. جزئیات در پنل کلینیک.`, status: "pending" })),
      ]);
      return { id: appointment.id, linkedToAccount: !!patient };
    });
    await audit(staff.name, "ثبت نوبت تلفنی", `نوبت #${result.id}`);
    after(async () => { try { await deliverAppointmentSms(result.id); } catch (error) { logServerError("Manual appointment SMS processing failed", error); } });
    return Response.json({ appointment: { id: result.id, status: "confirmed", linkedToAccount: result.linkedToAccount } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SLOT") return Response.json({ error: "این زمان یا شیوهٔ خدمت برای متخصص در دسترس نیست." }, { status: 400 });
    const dbError = error as { code?: string; cause?: { code?: string } };
    if (dbError?.code === "23505" || dbError?.cause?.code === "23505") return Response.json({ error: "این ساعت قبلاً رزرو شده است؛ زمان دیگری انتخاب کنید." }, { status: 409 });
    logServerError("Manual appointment failed", error);
    return Response.json({ error: "ثبت نوبت تلفنی انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
