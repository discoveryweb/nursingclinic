"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Building2, CalendarDays, Clock3, HeartPulse, MapPin, Printer, ShieldCheck, Stethoscope, UserRound, X } from "lucide-react";
import { formatJalaliLong, toPersianDigits } from "@/lib/date";

export type ReceiptData = {
  id: number;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  visitType: string;
  address: string;
  status: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
};
const statusLabels: Record<string, string> = { pending: "در انتظار تأیید پذیرش", confirmed: "تأیید شده", cancelled: "لغو شده", done: "خدمت انجام شده" };

export default function ReceiptPreview({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [onClose]);
  if (typeof document === "undefined") return null;
  const isHome = receipt.visitType === "home";
  return createPortal(
    <div id="patient-receipt-print-root" role="dialog" aria-modal="true" aria-labelledby="receipt-heading" className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-[#102c22]/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="receipt-dialog relative flex max-h-[95dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]">
        <div className="receipt-toolbar flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#e7efe8] bg-white px-5 py-4 sm:px-7"><div><h2 id="receipt-heading" className="text-sm font-extrabold text-[#24533b]">پیش‌نمایش برگهٔ نوبت</h2><p className="mt-1 text-[11px] text-[#84988a]">چاپ یا ذخیرهٔ PDF بدون خروج از سایت</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#28785a] px-4 py-3 text-xs font-bold text-white"><Printer size={16}/> چاپ / ذخیره PDF</button><button type="button" onClick={onClose} aria-label="بستن پیش‌نمایش" className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0f6f1] text-[#557767]"><X size={18}/></button></div></div>
        <div className="receipt-scroll overflow-y-auto bg-[#f4f8f4] p-3 sm:p-6">
          <article className="receipt-paper mx-auto overflow-hidden rounded-[18px] border border-[#d9e8dc] bg-white text-[#183e2c] shadow-sm" dir="rtl">
            <header className="receipt-paper-header flex flex-wrap items-center justify-between gap-4 bg-[#205a41] px-6 py-6 text-white sm:px-9"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><HeartPulse size={24}/></span><div><p className="text-lg font-black">{receipt.clinicName || "کلینیک پرستاری آرامش"}</p><p className="mt-1 text-xs text-[#d5eadb]">رسید ثبت درخواست نوبت</p></div></div><div className="receipt-number rounded-xl border border-white/30 px-4 py-2 text-center"><span className="block text-[10px]">شماره پیگیری</span><strong className="block text-xl font-black" dir="ltr">#{toPersianDigits(receipt.id)}</strong></div></header>
            <div className="receipt-paper-body px-6 py-6 sm:px-9 sm:py-8">
              <div className="receipt-status flex items-center justify-between gap-3 rounded-xl border border-[#d9eadd] bg-[#f4faf4] px-4 py-3 text-xs"><span className="font-bold text-[#758e7c]">وضعیت نوبت</span><strong className="text-[#286849]">{statusLabels[receipt.status] || "ثبت شده"}</strong></div>
              <div className="receipt-fields mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field icon={<UserRound size={17}/>} label="نام مراجعه‌کننده" value={receipt.patientName}/><Field icon={<Stethoscope size={17}/>} label="متخصص" value={`${receipt.doctorName} · ${receipt.specialty}`}/><Field icon={<CalendarDays size={17}/>} label="تاریخ مراجعه" value={formatJalaliLong(receipt.date)}/><Field icon={<Clock3 size={17}/>} label="ساعت" value={toPersianDigits(receipt.time)}/><Field icon={isHome ? <MapPin size={17}/> : <Building2 size={17}/>} label="نوع خدمت" value={isHome ? "در محل مراجعه‌کننده" : "مراجعه به کلینیک"}/><Field icon={<UserRound size={17}/>} label="شماره موبایل" value={toPersianDigits(receipt.patientPhone)}/>
              </div>
              <section className="receipt-address mt-6 rounded-xl border border-[#dfece1] p-4"><h3 className="flex items-center gap-2 text-xs font-extrabold text-[#286347]">{isHome ? <MapPin size={17}/> : <Building2 size={17}/>} {isHome ? "نشانی محل خدمت" : "نشانی کلینیک"}</h3><p className="mt-2 break-words text-xs leading-7 text-[#52745d]">{isHome ? receipt.address || "نشانی ثبت نشده؛ با پذیرش هماهنگ کنید." : receipt.clinicAddress || "نشانی مرکز هنوز تنظیم نشده است؛ با پذیرش هماهنگ کنید."}</p></section>
              {isHome && receipt.clinicAddress && <p className="mt-3 break-words text-[11px] leading-6 text-[#829687]">نشانی مرکز کلینیک: {receipt.clinicAddress}</p>}
              <div className="receipt-disclaimer mt-7 border-t border-dashed border-[#cedfd2] pt-4 text-[11px] leading-7 text-[#718c79]"><p className="flex items-start gap-2"><ShieldCheck size={16} className="mt-1 shrink-0 text-[#4e9670]"/>این برگه رسید ثبت نوبت است؛ وضعیت نهایی را از حساب کاربری یا پذیرش پیگیری کنید.</p>{receipt.clinicPhone && <p className="mt-1">تلفن پذیرش: <span dir="ltr">{toPersianDigits(receipt.clinicPhone)}</span></p>}</div>
            </div>
            <footer className="receipt-paper-footer border-t border-[#edf3ed] bg-[#fafdfa] px-6 py-3 text-center text-[10px] text-[#91a396]">کلینیک آرامش · نگهداری این برگه برای پیگیری نوبت</footer>
          </article>
        </div>
      </div>
    </div>, document.body,
  );
}
function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="receipt-field flex items-start gap-2.5 border-b border-[#edf3ed] pb-3"><span className="mt-0.5 text-[#5b9974]">{icon}</span><div className="min-w-0"><span className="block text-[10px] text-[#899f90]">{label}</span><strong className="mt-1 block break-words text-xs font-bold leading-6 text-[#234d34]">{value}</strong></div></div>;
}
