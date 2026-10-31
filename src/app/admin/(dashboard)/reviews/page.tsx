import { redirect } from "next/navigation";
import { canModerateReviews, getStaff } from "@/lib/auth";
import ReviewsManager from "@/components/admin/ReviewsManager";

export const dynamic = "force-dynamic";
export default async function AdminReviewsPage() {
  const staff = await getStaff();
  if (!canModerateReviews(staff)) redirect("/admin");
  return <ReviewsManager />;
}
