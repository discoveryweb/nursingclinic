import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { canModerateReviews, getStaff } from "@/lib/auth";
import { reviewContentError } from "@/lib/review-moderation";
import { audit, sameOrigin } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const staff = await getStaff();
  if (!canModerateReviews(staff)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
  if (!review) return Response.json({ error: "نظر یافت نشد." }, { status: 404 });
  const contentError = reviewContentError(review.content);
  if (contentError) return Response.json({ error: contentError }, { status: 400 });
  if (review.status !== "pending") return Response.json({ error: "این نظر قبلاً بررسی شده است." }, { status: 409 });
  const [approved] = await db.update(reviews).set({ status: "approved", updatedAt: new Date() })
    .where(eq(reviews.id, id)).returning({ id: reviews.id });
  await audit(staff!.name, "تأیید نظر مراجعه‌کننده", `نظر #${approved.id}`);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return Response.json({ error: "درخواست نامعتبر است." }, { status: 403 });
  const staff = await getStaff();
  if (!canModerateReviews(staff)) return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const [removed] = await db.delete(reviews).where(eq(reviews.id, id)).returning({ id: reviews.id });
  if (!removed) return Response.json({ error: "نظر یافت نشد." }, { status: 404 });
  await audit(staff!.name, "حذف نظر مراجعه‌کننده", `نظر #${removed.id}`);
  return Response.json({ ok: true });
}
