import { can,getStaff } from "@/lib/auth";
import { getAllSettings,setSetting } from "@/lib/settings";
import { audit,normalizePhone,readJsonLimited,RequestBodyError,sameOrigin } from "@/lib/security";
export const dynamic="force-dynamic";
import { isSmsConfigured, getActiveSmsProviderName } from "@/lib/sms";
export async function GET(){
  const user=await getStaff();
  if(!can(user,"settings.manage"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});
  return Response.json({
    settings:await getAllSettings(),
    smsConfigured: isSmsConfigured(),
    smsProvider: getActiveSmsProviderName(),
  },{headers:{"Cache-Control":"no-store, private"}});
}
export async function PUT(request:Request){const user=await getStaff();if(!can(user,"settings.manage"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});if(!sameOrigin(request))return Response.json({error:"درخواست نامعتبر است."},{status:403});let input:unknown;try{input=await readJsonLimited(request,8192);}catch(error){return error instanceof RequestBodyError?Response.json({error:error.message},{status:error.status}):Response.json({error:"اطلاعات نامعتبر است."},{status:400});}const body=input&&typeof input==="object"?input as Record<string,unknown>:{};const allowed=["secretary_phone","clinic_name","clinic_phone","clinic_address"] as const;for(const key of allowed)if(typeof body[key]!=="string"||(body[key] as string).length>500)return Response.json({error:"اطلاعات نامعتبر است."},{status:400});const secretaryPhone=normalizePhone(body.secretary_phone as string);if(secretaryPhone&&!/^09\d{9}$/.test(secretaryPhone))return Response.json({error:"شماره موبایل منشی معتبر نیست."},{status:400});for(const key of allowed)await setSetting(key,key==="secretary_phone"?secretaryPhone:(body[key] as string).trim());await audit(user!.name,"ویرایش تنظیمات کلینیک");return Response.json({settings:await getAllSettings()});}
