import { eq } from "drizzle-orm";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { audit, readJsonLimited, RequestBodyError, sameOrigin } from "@/lib/security";
export async function PATCH(request:Request){
  const user=await getPatient();
  if(!user) return Response.json({error:"ابتدا وارد شوید."},{status:401});
  if(!sameOrigin(request)) return Response.json({error:"درخواست نامعتبر است."},{status:403});
  let body:unknown;
  try{ body=await readJsonLimited(request,8192); }
  catch(error){ return error instanceof RequestBodyError?Response.json({error:error.message},{status:error.status}):Response.json({error:"درخواست نامعتبر است."},{status:400});}
  const data=body&&typeof body==="object"?body as Record<string,unknown>:{};
  const name=typeof data.name==="string"?data.name.trim():"";
  const address=typeof data.address==="string"?data.address.trim():"";
  if(name.length<2||name.length>150||address.length>500) return Response.json({error:"اطلاعات واردشده معتبر نیست."},{status:400});
  await db.update(patients).set({name,address,updatedAt:new Date()}).where(eq(patients.id,user.id));
  // ثبت لاگ برای ممیزی تغییرات پروفایل بیمار (بدون ذخیره اطلاعات حساس)
  try { await audit(`بیمار #${user.id}`, "ویرایش پروفایل", name !== user.name ? "نام به‌روزرسانی شد" : "نشانی به‌روزرسانی شد"); } catch {}
  return Response.json({ok:true});
}
