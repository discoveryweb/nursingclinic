import { db } from "@/db";
import { appointments, doctors } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { buildDaySlots, doctorWorksOnDate, filterPastSlotsIfToday, isBookableDate } from "@/lib/slots";
import { consumeRateLimit, requestIp } from "@/lib/security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
 // جلوگیری از اسکرپینگ - محدودیت نرخ ۱۲۰ درخواست در دقیقه برای هر IP
 if (await consumeRateLimit(`availability:${requestIp(request)}`, 120, 60, 60)) {
   return Response.json({ error: "تعداد درخواست‌ها زیاد است؛ لطفاً کمی صبر کنید." }, { status: 429 });
 }
 const params = new URL(request.url).searchParams; const doctorId = Number(params.get("doctorId")); const date = params.get("date") || "";
 if (!Number.isInteger(doctorId) || doctorId < 1 || !isBookableDate(date)) return Response.json({error:"تاریخ یا متخصص نامعتبر است."},{status:400});
 const [doctor] = await db.select().from(doctors).where(eq(doctors.id,doctorId)).limit(1);
 if (!doctor?.active) return Response.json({error:"متخصص یافت نشد."},{status:404});
 if (!doctorWorksOnDate(doctor,date)) return Response.json({slots:[]});
 const booked = await db.select({time:appointments.appointmentTime}).from(appointments).where(and(eq(appointments.doctorId,doctorId),eq(appointments.appointmentDate,date),ne(appointments.status,"cancelled")));
 const taken = new Set(booked.map(b => b.time));
 return Response.json({slots:filterPastSlotsIfToday(date,buildDaySlots(doctor)).map(time => ({time,available:!taken.has(time)}))},{headers:{"Cache-Control":"no-store"}});
}
