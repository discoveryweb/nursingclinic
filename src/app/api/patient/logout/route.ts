import { logout } from "@/lib/auth";
import { sameOrigin } from "@/lib/security";
export async function POST(request:Request) { if(!sameOrigin(request)) return Response.json({error:"درخواست نامعتبر"},{status:403}); await logout("patient"); return Response.json({ok:true}); }
