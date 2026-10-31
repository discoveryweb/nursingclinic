import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doctors } from "@/db/schema";
import { can, getStaff } from "@/lib/auth";
import { doctorSchema } from "@/lib/doctor-schema";
import { audit, readJsonLimited, RequestBodyError, sameOrigin } from "@/lib/security";
import { iranNow } from "@/lib/slots";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const staff = await getStaff();
  if (!can(staff, "doctors.manage")) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  let input: unknown;
  try { input = await readJsonLimited(request, 16_384); }
  catch (error) {
    return error instanceof RequestBodyError ? Response.json({ error: error.message }, { status: error.status }) : Response.json({ error: "اطلاعات نامعتبر است." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "اطلاعات نامعتبر است." }, { status: 400 });

  const outcome = await db.transaction(async tx => {
    const [existing] = await tx.select().from(doctors).where(eq(doctors.id, id)).for("update").limit(1);
    if (!existing) return { error: "متخصص یافت نشد.", status: 404 as const };
    const parsed = doctorSchema.safeParse({ ...existing, ...input });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message || "اطلاعات نامعتبر است.", status: 400 as const };
    const next = parsed.data;
    const scheduleOrAccessChanged = existing.startTime !== next.startTime || existing.endTime !== next.endTime || existing.slotMinutes !== next.slotMinutes
      || JSON.stringify([...existing.workDays].sort()) !== JSON.stringify([...next.workDays].sort())
      || existing.visitModes.some(mode => !next.visitModes.includes(mode)) || (existing.active && !next.active);
    if (scheduleOrAccessChanged) {
      const [future] = await tx.select({ id: appointments.id }).from(appointments).where(and(
        eq(appointments.doctorId, id), gte(appointments.appointmentDate, iranNow().date),
        inArray(appointments.status, ["pending", "confirmed"]),
      )).limit(1);
      if (future) return { error: "این متخصص نوبت فعال آینده دارد. ابتدا نوبت‌ها را تعیین‌تکلیف کنید، سپس برنامه یا شیوهٔ خدمت را تغییر دهید.", status: 409 as const };
    }
    const [doctor] = await tx.update(doctors).set(next).where(eq(doctors.id, id)).returning();
    return { doctor, status: 200 as const };
  });
  if ("error" in outcome) return Response.json({ error: outcome.error }, { status: outcome.status });
  await audit(staff!.name, "ویرایش متخصص", outcome.doctor.name);
  return Response.json({ doctor: outcome.doctor });
}

export async function DELETE(request: Request, { params }: Context) {
  const staff = await getStaff();
  if (!can(staff, "doctors.manage")) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const result = await db.transaction(async tx => {
    const [doctor] = await tx.select().from(doctors).where(eq(doctors.id, id)).for("update").limit(1);
    if (!doctor) return { status: 404 as const };
    const [future] = await tx.select({ id: appointments.id }).from(appointments).where(and(
      eq(appointments.doctorId, id), gte(appointments.appointmentDate, iranNow().date),
      inArray(appointments.status, ["pending", "confirmed"]),
    )).limit(1);
    if (future) return { status: 409 as const };
    await tx.update(doctors).set({ active: false }).where(eq(doctors.id, id));
    return { status: 200 as const, name: doctor.name };
  });
  if (result.status === 404) return Response.json({ error: "متخصص یافت نشد." }, { status: 404 });
  if (result.status === 409) return Response.json({ error: "برای این متخصص نوبت فعال آینده وجود دارد. ابتدا آن‌ها را تعیین‌تکلیف کنید." }, { status: 409 });
  await audit(staff!.name, "غیرفعال‌سازی متخصص", result.name);
  return Response.json({ ok: true });
}
