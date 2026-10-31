import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { can,getStaff } from "@/lib/auth";
import { desc } from "drizzle-orm";
export const dynamic="force-dynamic";
export async function GET(){const user=await getStaff();if(!can(user,"audit.view"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});return Response.json({logs:await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300)});}
