import { db } from "@/db";
import { doctors } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(doctors)
    .where(eq(doctors.active, true))
    .orderBy(asc(doctors.displayOrder));

  return Response.json({ doctors: rows });
}
