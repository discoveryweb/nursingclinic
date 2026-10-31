import { desc } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { can, getStaff } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getStaff();
  if (!can(user, "patients.view") || user?.role === "specialist") return Response.json({ error: "دسترسی مجاز نیست." }, { status: 403 });
  const rows = await db.select({
    id: patients.id, name: patients.name, phone: patients.phone,
    phoneVerified: patients.phoneVerified, address: patients.address, createdAt: patients.createdAt,
  }).from(patients).orderBy(desc(patients.createdAt)).limit(500);
  return Response.json({ patients: rows, canVerify: can(user, "patients.verify_phone") }, { headers: { "Cache-Control": "no-store, private" } });
}
