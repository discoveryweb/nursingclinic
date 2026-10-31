import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { doctors, patients, reviews } from "@/db/schema";
import { canModerateReviews, getStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  const staff = await getStaff();
  if (!canModerateReviews(staff)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const rows = await db.select({
    id: reviews.id, appointmentId: reviews.appointmentId,
    doctorId: reviews.doctorId, doctorName: doctors.name,
    patientName: patients.name, rating: reviews.rating, content: reviews.content,
    status: reviews.status, createdAt: reviews.createdAt,
  }).from(reviews)
    .innerJoin(doctors, eq(reviews.doctorId, doctors.id))
    .innerJoin(patients, eq(reviews.patientId, patients.id))
    .orderBy(desc(reviews.createdAt)).limit(300);
  return Response.json({ reviews: rows }, { headers: { "Cache-Control": "private, no-store" } });
}
