import { can,getStaff } from "@/lib/auth";
import { deliverSms } from "@/lib/sms";
import { audit,sameOrigin } from "@/lib/security";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) { const user=await getStaff();if(!can(user,"notifications.view"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});if(!sameOrigin(request))return Response.json({error:"درخواست نامعتبر"},{status:403});const id=Number((await params).id);if(!Number.isInteger(id)||id<1)return Response.json({error:"شناسه نامعتبر"},{status:400});await deliverSms(id);await audit(user!.name,"تلاش دوباره پیامک",`#${id}`);return Response.json({ok:true});}
