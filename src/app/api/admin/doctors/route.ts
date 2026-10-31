import { asc,eq } from "drizzle-orm";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { can,getStaff } from "@/lib/auth";
import { doctorSchema } from "@/lib/doctor-schema";
import { audit,readJsonLimited,RequestBodyError,sameOrigin } from "@/lib/security";
export const dynamic="force-dynamic";
export async function GET(){const user=await getStaff();if(!can(user,"doctors.manage"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});return Response.json({doctors:await db.select().from(doctors).orderBy(asc(doctors.displayOrder))},{headers:{"Cache-Control":"no-store, private"}});}
export async function POST(request:Request){const user=await getStaff();if(!can(user,"doctors.manage"))return Response.json({error:"دسترسی مجاز نیست."},{status:403});if(!sameOrigin(request))return Response.json({error:"درخواست نامعتبر است."},{status:403});let body:unknown;try{body=await readJsonLimited(request,16384);}catch(error){return error instanceof RequestBodyError?Response.json({error:error.message},{status:error.status}):Response.json({error:"اطلاعات نامعتبر است."},{status:400});}const parsed=doctorSchema.safeParse(body);if(!parsed.success)return Response.json({error:parsed.error.issues[0]?.message||"اطلاعات نامعتبر است."},{status:400});const [doctor]=await db.insert(doctors).values(parsed.data).returning();await audit(user!.name,"افزودن متخصص",doctor.name);return Response.json({doctor},{status:201});}
