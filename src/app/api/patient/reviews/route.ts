import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, reviews } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { reviewContentError } from "@/lib/review-moderation";
import { consumeRateLimit, logServerError, readJsonLimited, requestIp, RequestBodyError, sameOrigin } from "@/lib/security";
import { iranNow } from "@/lib/slots";

const reviewSchema = z.object({
  appointmentId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(12).max(600),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const patient = await getPatient();
  if (!patient) return Response.json({ error: "برای ثبت نظر ابتدا وارد حساب خود شوید." }, { status: 401 });
  if (await consumeRateLimit(`review:${patient.id}:${requestIp(request)}`, 8, 3600, 3600)) {
    return Response.json({ error: "تعداد درخواست‌های شما زیاد است؛ بعداً تلاش کنید." }, { status: 429 });
  }
  let body: unknown;
  try { body = await readJsonLimited(request, 8192); }
  catch (error) {
    return error instanceof RequestBodyError
      ? Response.json({ error: error.message }, { status: error.status })
      : Response.json({ error: "ساختار درخواست معتبر نیست." }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "امتیاز یا متن نظر معتبر نیست؛ حداقل ۱۲ نویسه وارد کنید." }, { status: 400 });
  const { appointmentId, rating, content } = parsed.data;
  const contentError = reviewContentError(content);
  if (contentError) return Response.json({ error: contentError }, { status: 400 });
  const [appointment] = await db.select({ id: appointments.id, doctorId: appointments.doctorId }).from(appointments).where(and(
    eq(appointments.id, appointmentId),
    eq(appointments.patientId, patient.id),
    eq(appointments.status, "done"),
    lte(appointments.appointmentDate, iranNow().date),
  )).limit(1);
  if (!appointment) return Response.json({ error: "نظر فقط پس از انجام خدمت و برای نوبت متعلق به خودتان ثبت می‌شود." }, { status: 403 });
  try {
    const [review] = await db.insert(reviews).values({
      appointmentId, doctorId: appointment.doctorId, patientId: patient.id, rating, content, status: "pending",
    }).returning({ id: reviews.id });
    return Response.json({ review: { id: review.id, status: "pending" }, message: "سپاس از شما! نظر پس از بررسی مدیر نمایش داده می‌شود." }, { status: 201 });
  } catch (error) {
    const dbError = error as { code?: string; cause?: { code?: string } };
    if (dbError?.code === "23505" || dbError?.cause?.code === "23505") {
      return Response.json({ error: "برای این نوبت قبلاً نظر ثبت شده است." }, { status: 409 });
    }
    logServerError("Review creation failed", error);
    return Response.json({ error: "ثبت نظر انجام نشد؛ دوباره تلاش کنید." }, { status: 500 });
  }
}
