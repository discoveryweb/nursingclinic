import { db } from "@/db";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, ensureSuperAdmin } from "@/lib/auth";
import { audit, clearFailures, isLocked, recordFailure, requestIp, sameOrigin, verifyPassword, safeJson } from "@/lib/security";
export async function POST(request:Request) {
 if (!sameOrigin(request)) return Response.json({error:"درخواست نامعتبر است."},{status:403});
 const data=await safeJson(request,8192); const username=typeof data?.username === "string" ? data.username.trim().toLowerCase().slice(0,80):""; const password=typeof data?.password === "string" ? data.password:""; const area=typeof data?.area === "string" ? data.area : "admin";
 const key=`staff:${requestIp(request)}:${username}`, ipKey=`staff-ip:${requestIp(request)}`;
 if(await isLocked(key)||await isLocked(ipKey)) return Response.json({error:"تلاش‌های ناموفق زیاد است؛ ۱۵ دقیقه بعد تلاش کنید."},{status:429});
 await ensureSuperAdmin();
 const [user]=await db.select().from(staffUsers).where(eq(staffUsers.username,username)).limit(1);
 const ok=await verifyPassword(password,user?.passwordHash || `scrypt$00000000000000000000000000000000$${"0".repeat(128)}`);
 const roleAllowed = !!user && (area === "admin" ? ["super_admin","admin"].includes(user.role) : area === "secretary" ? user.role === "secretary" : area === "specialist" && user.role === "specialist");
 if(!user || !user.active || !ok || !roleAllowed) { await Promise.all([recordFailure(key),recordFailure(ipKey)]); return Response.json({error:"نام کاربری یا رمز عبور صحیح نیست، یا به این پنل دسترسی ندارید."},{status:401}); }
 await Promise.all([clearFailures(key),clearFailures(ipKey)]); await createSession("staff",user.id); await audit(user.name,"ورود به پنل",user.role);
 return Response.json({ok:true,mustChangePassword:user.mustChangePassword});
}
