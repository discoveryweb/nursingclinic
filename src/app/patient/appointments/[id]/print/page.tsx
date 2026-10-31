import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Building2, CalendarDays, Clock3, HeartPulse, MapPin, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { db } from "@/db";
import { appointments, doctors } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { formatJalaliLong, toPersianDigits } from "@/lib/date";
import { getAllSettings } from "@/lib/settings";
import PrintActions from "@/components/patient/PrintActions";
import "./receipt.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "برگه نوبت", robots: { index: false, follow: false } };
const statusLabels: Record<string, string> = { pending: "در انتظار تأیید پذیرش", confirmed: "تأیید شده", cancelled: "لغو شده", done: "خدمت انجام شده" };

export default async function AppointmentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const patient = await getPatient();
  if (!patient) redirect("/patient/login");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [[row], settings] = await Promise.all([
    db.select({ appointment: appointments, doctorName: doctors.name, specialty: doctors.specialty })
      .from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(and(eq(appointments.id, id), eq(appointments.patientId, patient.id))).limit(1),
    getAllSettings(),
  ]);
  if (!row) notFound();
  const a = row.appointment;
  const isHome = a.visitType === "home";
  const clinicAddress = settings.clinic_address?.trim();
  const clinicPhone = settings.clinic_phone?.trim();
  const status = statusLabels[a.status] || "ثبت شده";
  return (
    <main className="print-page min-h-screen bg-[#eff5f0] px-3 py-6 text-[#183d2e] sm:px-6" dir="rtl">
      <PrintActions />
      <article className="print-receipt mx-auto max-w-[760px] overflow-hidden rounded-[24px] border border-[#d7e5d9] bg-white shadow-[0_20px_65px_rgba(25,70,42,.10)]" aria-label="برگه نوبت مراجعه‌کننده">
        <header className="receipt-header relative overflow-hidden bg-[#1d5941] px-7 py-8 text-white sm:px-10">
          <div aria-hidden className="absolute -left-8 -top-14 h-40 w-40 rounded-full border-[20px] border-white/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><HeartPulse size={26} /></span><div><strong className="block text-lg font-black">{settings.clinic_name || "کلینیک پرستاری آرامش"}</strong><span className="text-xs text-[#c4e4cf]">برگهٔ ثبت درخواست نوبت</span></div></div>
            <div className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-center"><span className="block text-[11px] text-[#c4e4cf]">شماره پیگیری</span><strong className="block text-xl font-black">#{toPersianDigits(a.id)}</strong></div>
          </div>
        </header>
        <div className="px-7 py-8 sm:px-10">
          <div className="receipt-status flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfebe0] bg-[#f5faf5] px-5 py-4"><span className="text-xs font-bold text-[#627e69]">وضعیت فعلی درخواست</span><strong className="text-sm font-black text-[#235d40]">{status}</strong></div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <ReceiptField icon={<UserRound size={17} />} label="نام مراجعه‌کننده" value={a.patientName} />
            <ReceiptField icon={<Stethoscope size={17} />} label="متخصص" value={`${row.doctorName} · ${row.specialty}`} />
            <ReceiptField icon={<CalendarDays size={17} />} label="تاریخ مراجعه (شمسی)" value={formatJalaliLong(a.appointmentDate)} />
            <ReceiptField icon={<Clock3 size={17} />} label="ساعت مراجعه" value={toPersianDigits(a.appointmentTime)} />
            <ReceiptField icon={isHome ? <MapPin size={17} /> : <Building2 size={17} />} label="نوع خدمت" value={isHome ? "در محل مراجعه‌کننده" : "مراجعه به کلینیک"} />
            <ReceiptField icon={<UserRound size={17} />} label="شماره تماس ثبت‌شده" value={toPersianDigits(a.patientPhone)} />
          </div>
          <section className="mt-7 rounded-2xl border border-[#dce9dd] p-5"><h2 className="flex items-center gap-2 text-sm font-extrabold text-[#295e40]">{isHome ? <MapPin size={18} /> : <Building2 size={18} />}{isHome ? "نشانی محل دریافت خدمت" : "نشانی کلینیک"}</h2><p className="mt-2 text-sm leading-8 text-[#456850]">{isHome ? a.patientAddress || "نشانی ثبت نشده است؛ با پذیرش هماهنگ کنید." : clinicAddress || "نشانی مرکز هنوز تنظیم نشده است؛ پیش از مراجعه با پذیرش هماهنگ کنید."}</p></section>
          {clinicAddress && isHome && <p className="mt-4 text-xs leading-7 text-[#829988]">نشانی مرکز کلینیک: {clinicAddress}</p>}
          <div className="mt-9 border-t border-dashed border-[#cbdccf] pt-6 text-xs leading-7 text-[#708575]"><p className="flex items-start gap-2"><ShieldCheck size={17} className="mt-1 shrink-0 text-[#4b9064]" />این برگه تأیید پرداخت یا تأیید قطعی نوبت نیست؛ وضعیت نهایی را از حساب خود یا پذیرش پیگیری کنید.</p>{clinicPhone && <p className="mt-2">پذیرش کلینیک: <span dir="ltr">{clinicPhone}</span></p>}</div>
        </div>
        <footer className="receipt-footer border-t border-[#e7eee8] bg-[#f9fcf9] px-7 py-4 text-center text-[11px] text-[#8ca091] sm:px-10">کلینیک آرامش · نگهداری از این برگه برای پیگیری نوبت توصیه می‌شود</footer>
      </article>
    </main>
  );
}
function ReceiptField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-start gap-3 border-b border-[#eef3ef] pb-4"><span className="mt-0.5 text-[#5b9770]">{icon}</span><div><span className="block text-[11px] text-[#879b8b]">{label}</span><strong className="mt-1 block text-sm font-bold leading-6 text-[#234932]">{value}</strong></div></div>;
}
