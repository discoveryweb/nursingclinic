import { db } from "@/db";
import { notifications } from "@/db/schema";
import { can,getStaff } from "@/lib/auth";
import { desc,eq } from "drizzle-orm";
import { sameOrigin } from "@/lib/security";
export const dynamic="force-dynamic";
import { isSmsConfigured, getActiveSmsProviderName } from "@/lib/sms";
export async function GET(){
  const user=await getStaff();
  if(!can(user,"notifications.view"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});
  const rows=await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(200);
  return Response.json({
    notifications:rows,
    smsConfigured: isSmsConfigured(),
    smsProvider: getActiveSmsProviderName(),
  });
}
export async function PATCH(request:Request){const user=await getStaff();if(!can(user,"notifications.view"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});if(!sameOrigin(request))return Response.json({error:"درخواست نامعتبر"},{status:403});await db.update(notifications).set({read:true}).where(eq(notifications.channel,"dashboard"));return Response.json({ok:true});}
