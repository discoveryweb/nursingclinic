"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, Building2, CalendarDays, Check, CheckCircle2, ChevronLeft, Clock3, Copy, LockKeyhole, MapPin, Printer, ShieldCheck, UserRound } from "lucide-react";
import type { Doctor, VisitType } from "@/db/schema";
import { formatJalaliShort, nextDays, toPersianDigits } from "@/lib/date";
import { doctorWorksOnDate } from "@/lib/slots";
import VisitTypePicker from "@/components/booking/VisitTypePicker";
import ReceiptPreview from "@/components/patient/ReceiptPreview";

type Slot = { time: string; available: boolean };
const steps = ["انتخاب متخصص", "زمان و محل", "اطلاعات شما", "ثبت نهایی"];

export default function BookingWizard({ doctors, initialDoctorId, patient, clinicAddress, clinicName, clinicPhone }: {
  doctors: Doctor[];
  initialDoctorId?: number;
  patient: { name: string; phone: string; address: string };
  clinicAddress: string;
  clinicName: string;
  clinicPhone: string;
}) {
  const router = useRouter();
  const initial = doctors.find(item => item.id === initialDoctorId);
  const [step, setStep] = useState(initial ? 1 : 0);
  const [doctorId, setDoctorId] = useState<number | undefined>(initial?.id);
  const [visitType, setVisitType] = useState<VisitType | null>(initial?.visitModes.length === 1 ? initial.visitModes[0] : null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState(patient.address);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const doctor = useMemo(() => doctors.find(item => item.id === doctorId), [doctors, doctorId]);
  const days = useMemo(() => doctor ? nextDays(21).filter(day => doctorWorksOnDate(doctor, day)) : [], [doctor]);

  useEffect(() => {
    if (!doctorId || !date) return;
    const controller = new AbortController();
    fetch(`/api/availability?doctorId=${doctorId}&date=${date}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setSlots(data.slots || []); setLoading(false); })
      .catch(err => { if (err.name !== "AbortError") { setSlots([]); setError("دریافت زمان‌های آزاد انجام نشد. دوباره تلاش کنید."); setLoading(false); } });
    return () => controller.abort();
  }, [doctorId, date]);
  function go(target: number) { setError(""); setStep(target); window.scrollTo({ top: 110, behavior: "smooth" }); }
  function selectDoctor(id: number) { const selected = doctors.find(item => item.id === id); setDoctorId(id); setVisitType(selected?.visitModes.length === 1 ? selected.visitModes[0] : null); setDate(""); setTime(""); setSlots([]); go(1); }
  function selectDate(value: string) { if (value === date) return; setDate(value); setTime(""); setSlots([]); setLoading(true); setError(""); }
  function contactNext() { if (visitType === "home" && address.trim().length < 10) { setError("برای خدمت در محل، نشانی کامل شامل شهر، خیابان و پلاک را وارد کنید."); return; } go(3); }
  async function submit() {
    if (!doctorId || !date || !time || !visitType) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId, visitType, patientAddress: visitType === "home" ? address.trim() : "", patientNote: note.trim(), appointmentDate: date, appointmentTime: time }) });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "LOGIN_REQUIRED" || data.code === "PROFILE_REQUIRED") { router.replace(`/patient/login?next=${encodeURIComponent(`/booking?doctor=${doctorId}`)}`); return; }
        if (data.code === "SLOT_TAKEN") {
          setStep(1); setTime("");
          const refreshed = await fetch(`/api/availability?doctorId=${doctorId}&date=${date}`, { cache: "no-store" }).then(result => result.json());
          setSlots(refreshed.slots || []);
        }
        setError(data.error || "ثبت نوبت ناموفق بود."); return;
      }
      setReference(data.appointment.id);
    } catch { setError("ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  async function copyReference() { if (!reference) return; try { await navigator.clipboard.writeText(String(reference)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setError("امکان کپی خودکار وجود ندارد؛ شماره پیگیری را یادداشت کنید."); } }

  if (reference && doctor && visitType) return (
    <div className="mx-auto max-w-2xl animate-fade-up rounded-[28px] border border-[#d2ebdc] bg-white p-6 text-center shadow-xl sm:p-12">
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[#e5f6eb] text-[#298363]"><CheckCircle2 size={42}/></span>
      <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#edf8f1] px-4 py-1.5 text-xs font-black text-[#2e8264]"><BadgeCheck size={15}/> درخواست با موفقیت ثبت شد</span>
      <h2 className="mt-3 text-2xl font-black text-[#154637] sm:text-3xl">نوبت شما رزرو شد</h2>
      <p className="mt-3 text-sm leading-8 text-[#577a6d]">درخواست شما برای {doctor.name}، {formatJalaliShort(date)} ساعت {toPersianDigits(time)} ثبت شد و در انتظار بررسی پذیرش است.</p>
      {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
      <div className="mt-6 rounded-2xl border border-[#d6ecde] bg-[#f7faf8] p-5 text-right"><div className="flex items-center justify-between border-b border-[#e5f1ea] pb-3"><span className="text-xs font-bold text-[#628b7a]">کد پیگیری</span><div className="flex items-center gap-2"><strong dir="ltr" className="text-lg font-black text-[#1c5040]">#{toPersianDigits(reference)}</strong><button type="button" onClick={copyReference} className="inline-flex items-center gap-1 rounded-lg border border-[#cbe4d5] bg-white px-3 py-2 text-[11px] font-bold text-[#327a61]"><Copy size={13}/>{copied ? "کپی شد" : "کپی"}</button></div></div><div className="mt-4 grid gap-3 text-xs leading-6 text-[#507466] sm:grid-cols-2"><p><span className="text-[#7fa393]">نام بیمار: </span><strong>{patient.name}</strong></p><p><span className="text-[#7fa393]">نوع خدمت: </span><strong>{visitType === "home" ? "در محل شما" : "در کلینیک"}</strong></p>{visitType === "home" && <p className="sm:col-span-2"><span className="text-[#7fa393]">نشانی خدمت: </span><strong>{address}</strong></p>}</div></div>
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#dce9dc] bg-white p-4 text-right"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7ee] text-[#3f855b]"><MapPin size={20}/></span><div><strong className="block text-sm font-extrabold text-[#24583e]">نشانی کلینیک آرامش</strong><p className="mt-1 text-xs leading-7 text-[#607b67]">{clinicAddress || "نشانی کلینیک هنوز ثبت نشده است؛ پیش از مراجعه با پذیرش هماهنگ کنید."}</p></div></div>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => setShowReceipt(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#287c68] px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-[#287c682b]"><Printer size={16}/> مشاهده و چاپ برگهٔ نوبت</button><Link href="/patient" className="inline-flex items-center gap-2 rounded-xl border border-[#cfe2d7] px-6 py-3.5 text-xs font-bold text-[#3d6e5a]"><UserRound size={16}/> پیگیری در حساب من</Link></div>
      {showReceipt && <ReceiptPreview receipt={{ id: reference, patientName: patient.name, patientPhone: patient.phone, doctorName: doctor.name, specialty: doctor.specialty, date, time, visitType, address: visitType === "home" ? address : "", status: "pending", clinicName, clinicAddress, clinicPhone }} onClose={() => setShowReceipt(false)}/>}
    </div>
  );

  return <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
    <div className="min-w-0"><div className="mb-5 flex items-center rounded-[22px] border border-[#e2ede7] bg-white p-4 shadow-sm sm:p-5">{steps.map((label, index) => <div key={label} className="flex flex-1 items-center last:flex-none"><div className="flex items-center gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black ${index < step ? "bg-[#297c67] text-white" : index === step ? "bg-[#18483b] text-white ring-4 ring-[#e5f5eb]" : "bg-[#edf4f0] text-[#78998b]"}`}>{index < step ? <Check size={16}/> : toPersianDigits(index + 1)}</span><span className={`hidden whitespace-nowrap text-xs font-bold sm:block ${index === step ? "text-[#18483b]" : "text-[#8ba699]"}`}>{label}</span></div>{index < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-4 ${index < step ? "bg-[#3ca085]" : "bg-[#e5ede8]"}`}/>}</div>)}</div>
      <div className="min-h-[440px] rounded-[26px] border border-[#dfece4] bg-white p-5 shadow-[0_8px_30px_rgba(33,78,61,.04)] sm:p-8">
        {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs leading-6 text-rose-700">{error}</div>}
        {step === 0 && <section><div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eef4f0] pb-4"><div><h2 className="text-lg font-black text-[#154536] sm:text-xl">متخصص خود را انتخاب کنید</h2><p className="mt-1 text-xs leading-6 text-[#78988a]">برای مشاهدهٔ زمان‌های آزاد، یکی از متخصصان را برگزینید.</p></div><span className="rounded-full bg-[#edf6f1] px-3 py-1.5 text-xs font-bold text-[#2d7965]">{toPersianDigits(doctors.length)} متخصص فعال</span></div>{doctors.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{doctors.map(item => <button type="button" key={item.id} onClick={() => selectDoctor(item.id)} className="group flex items-center gap-3 rounded-2xl border border-[#e5efe8] p-3 text-right transition hover:border-[#a5d2bd] hover:bg-[#f6fbf7]"><span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#edf5f0]"><Image src={item.imageUrl || "/images/doctor-1.jpg"} alt="" fill unoptimized={!!item.imageUrl && !item.imageUrl.startsWith("/")} sizes="64px" className="object-cover"/></span><span className="min-w-0 flex-1"><strong className="block text-sm text-[#1a4b3d]">{item.name}</strong><span className="mt-1 block text-xs leading-5 text-[#488b70]">{item.specialty}</span><span className="mt-1 block text-[10px] text-[#8da797]">{toPersianDigits(item.experienceYears)} سال سابقه</span></span><ChevronLeft size={17} className="text-[#9fc4b2]"/></button>)}</div> : <p className="py-10 text-center text-sm text-[#829e8e]">در حال حاضر متخصص فعالی ثبت نشده است.</p>}</section>}
        {step === 1 && doctor && <section><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef4f0] pb-4"><div><h2 className="text-lg font-black text-[#154536] sm:text-xl">انتخاب زمان و محل خدمت</h2><p className="mt-1 text-xs leading-6 text-[#78988a]">متخصص انتخابی: <strong className="text-[#2d7056]">{doctor.name}</strong></p></div><button type="button" onClick={() => go(0)} className="rounded-xl border border-[#d5e8db] px-3 py-2 text-xs font-bold text-[#4c8066]">تغییر متخصص</button></div><VisitTypePicker modes={doctor.visitModes} value={visitType} onChange={setVisitType} clinicAddress={clinicAddress}/><div className="mt-7"><h3 className="text-sm font-extrabold text-[#2c5849]">۲. روز مراجعه را انتخاب کنید</h3><div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto pb-3">{days.map(day => <button key={day} type="button" onClick={() => selectDate(day)} aria-pressed={date === day} className={`min-w-[105px] shrink-0 rounded-xl border px-3 py-3 text-xs font-bold ${date === day ? "border-[#287c68] bg-[#287c68] text-white" : "border-[#e0ebe4] bg-white text-[#4f7767]"}`}>{formatJalaliShort(day)}</button>)}</div></div>{date && <div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-[#2c5849]">۳. ساعت مراجعه</h3><span className="text-[10px] text-[#91a99a]">زمان‌های خط‌خورده رزرو شده‌اند</span></div>{loading ? <p className="mt-4 rounded-xl bg-[#f7faf8] p-5 text-xs text-[#7c9a88]">در حال دریافت ساعت‌های آزاد...</p> : slots.length ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{slots.map(slot => <button type="button" key={slot.time} disabled={!slot.available} onClick={() => setTime(slot.time)} aria-pressed={time === slot.time} className={`rounded-xl border py-3 text-xs font-bold ${!slot.available ? "border-transparent bg-[#f1f4f1] text-[#b5c4b9] line-through" : time === slot.time ? "border-[#287c68] bg-[#287c68] text-white" : "border-[#dcece1] text-[#42765a] hover:bg-[#eef8f0]"}`}>{toPersianDigits(slot.time)}</button>)}</div> : <p className="mt-4 rounded-xl bg-[#f7faf8] p-5 text-xs text-[#7c9a88]">برای این روز زمان خالی موجود نیست.</p>}</div>}<div className="mt-8 flex justify-between gap-2 border-t border-[#edf4f0] pt-5"><button type="button" onClick={() => go(0)} className="rounded-xl border border-[#d6e7dc] px-4 py-3 text-xs font-bold text-[#57806b]">بازگشت</button><button type="button" disabled={!visitType || !date || !time} onClick={() => go(2)} className="inline-flex items-center gap-2 rounded-xl bg-[#287c68] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">ادامه به اطلاعات تماس <ArrowLeft size={15}/></button></div></section>}
        {step === 2 && <section><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef4f0] pb-4"><div><h2 className="text-lg font-black text-[#154536] sm:text-xl">اطلاعات مراجعه‌کننده</h2><p className="mt-1 text-xs leading-6 text-[#78988a]">اطلاعات از حساب شما به‌صورت خودکار تکمیل شده است.</p></div><Link href="/patient?tab=profile" className="text-xs font-bold text-[#358268]">ویرایش در حساب من</Link></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#527864]">نام و نام خانوادگی<input value={patient.name} readOnly className="booking-input bg-[#f2f7f3]"/></label><label className="text-xs font-bold text-[#527864]">شماره موبایل<input value={patient.phone} readOnly dir="ltr" className="booking-input bg-[#f2f7f3]"/></label>{visitType === "home" ? <label className="text-xs font-bold text-[#527864] sm:col-span-2">نشانی دریافت خدمت در محل <span className="text-rose-500">*</span><textarea value={address} onChange={event => setAddress(event.target.value)} maxLength={500} rows={3} autoComplete="street-address" placeholder="شهر، خیابان، کوچه، پلاک و واحد" className="booking-input resize-y"/><span className="mt-1 block text-[10px] font-normal leading-6 text-[#8da798]">این نشانی برای نوبت در محل و استفادهٔ بعدی در حساب ذخیره می‌شود.</span></label> : <div className="rounded-xl border border-[#deece1] bg-[#f4f9f4] p-4 text-xs leading-7 text-[#567963] sm:col-span-2"><strong className="block">محل مراجعه: کلینیک</strong>{clinicAddress || "نشانی مرکز پس از هماهنگی پذیرش اعلام می‌شود."}</div>}<label className="text-xs font-bold text-[#527864] sm:col-span-2">توضیح برای پذیرش (اختیاری)<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={3} placeholder="فقط اطلاعات ضروری برای هماهنگی را وارد کنید" className="booking-input resize-y"/></label></div><div className="mt-8 flex justify-between gap-2 border-t border-[#edf4f0] pt-5"><button type="button" onClick={() => go(1)} className="rounded-xl border border-[#d6e7dc] px-4 py-3 text-xs font-bold text-[#57806b]">بازگشت</button><button type="button" onClick={contactNext} className="inline-flex items-center gap-2 rounded-xl bg-[#287c68] px-5 py-3 text-xs font-bold text-white">بررسی و تأیید <ArrowLeft size={15}/></button></div></section>}
        {step === 3 && doctor && <section><div className="flex items-center justify-between gap-3 border-b border-[#eef4f0] pb-4"><div><h2 className="text-lg font-black text-[#154536] sm:text-xl">بررسی و ثبت نهایی</h2><p className="mt-1 text-xs leading-6 text-[#78988a]">پیش از ثبت، اطلاعات نوبت را بررسی کنید.</p></div><button type="button" onClick={() => go(2)} className="text-xs font-bold text-[#41896b]">ویرایش</button></div><div className="mt-6 space-y-3 rounded-2xl border border-[#e1eee3] bg-[#f7faf8] p-5"><SummaryRow label="متخصص" value={`${doctor.name} · ${doctor.specialty}`}/><SummaryRow label="تاریخ و ساعت" value={`${formatJalaliShort(date)} · ${toPersianDigits(time)}`}/><SummaryRow label="مراجعه‌کننده" value={patient.name}/><SummaryRow label="موبایل" value={toPersianDigits(patient.phone)}/><SummaryRow label="محل خدمت" value={visitType === "home" ? "در محل شما" : "در کلینیک"}/>{visitType === "home" && <SummaryRow label="نشانی خدمت" value={address}/>}</div><p className="mt-4 flex items-start gap-2 text-xs leading-7 text-[#7e9a89]"><ShieldCheck size={16} className="mt-1 shrink-0"/> پس از ثبت، زمان برای دیگران بسته می‌شود و درخواست برای بررسی به پذیرش می‌رسد.</p><button type="button" disabled={busy} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#287c68] py-4 text-sm font-extrabold text-white disabled:opacity-50">{busy ? "در حال ثبت..." : "ثبت درخواست نوبت"}<Check size={17}/></button></section>}
      </div>
    </div>
    <aside className="space-y-4"><div className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-sm"><h3 className="text-xs font-black text-[#6a8d7e]">خلاصهٔ نوبت</h3>{doctor ? <div className="mt-4"><div className="flex items-center gap-3 border-b border-[#edf4ef] pb-4"><span className="relative h-12 w-12 overflow-hidden rounded-xl"><Image src={doctor.imageUrl || "/images/doctor-1.jpg"} alt="" fill unoptimized={!!doctor.imageUrl && !doctor.imageUrl.startsWith("/")} sizes="48px" className="object-cover"/></span><div className="min-w-0"><strong className="block text-sm text-[#245b45]">{doctor.name}</strong><span className="text-xs text-[#81a08d]">{doctor.specialty}</span></div></div><div className="mt-4 space-y-2.5 text-xs text-[#658774]"><p className="flex items-center gap-2"><MapPin size={15}/>{visitType === "home" ? "در محل شما" : visitType === "clinic" ? "در کلینیک" : "محل خدمت انتخاب نشده"}</p><p className="flex items-center gap-2"><CalendarDays size={15}/>{date ? formatJalaliShort(date) : "تاریخ انتخاب نشده"}</p><p className="flex items-center gap-2"><Clock3 size={15}/>{time ? toPersianDigits(time) : "ساعت انتخاب نشده"}</p></div></div> : <p className="mt-4 text-xs leading-6 text-[#91a99a]">پس از انتخاب متخصص، جزئیات نوبت اینجا نمایش داده می‌شود.</p>}</div><div className="rounded-[24px] border border-[#d4ebe0] bg-[#edf7ef] p-5"><LockKeyhole size={20} className="text-[#3c8b68]"/><h4 className="mt-3 text-xs font-black text-[#315f45]">اطلاعات شما محفوظ است</h4><p className="mt-1.5 text-[11px] leading-6 text-[#73927d]">اطلاعات حساب از پیش تکمیل می‌شود و در بخش حساب کاربری قابل ویرایش است.</p></div></aside>
  </div>;
}
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 border-b border-[#e8f1e9] pb-3 text-xs last:border-0 last:pb-0"><span className="shrink-0 text-[#829b8a]">{label}</span><strong className="text-left leading-6 text-[#315d44]">{value}</strong></div>; }
