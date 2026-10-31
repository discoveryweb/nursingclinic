"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, MapPin, PhoneCall, X } from "lucide-react";
import type { Doctor, VisitType } from "@/db/schema";
import { doctorWorksOnDate } from "@/lib/slots";
import { formatJalaliShort, nextDays, toPersianDigits } from "@/lib/date";
import { normalizeDigits } from "@/lib/client-utils";

type Slot = { time: string; available: boolean };
export default function ManualBookingDialog({ doctors, onClose, onCreated }: {
  doctors: Doctor[]; onClose: () => void; onCreated: () => void;
}) {
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: number; linkedToAccount: boolean } | null>(null);
  const doctor = doctors.find(item => item.id === doctorId);
  const days = useMemo(() => doctor ? nextDays(21).filter(item => doctorWorksOnDate(doctor, item)) : [], [doctor]);

  useEffect(() => {
    if (!doctorId || !date) return;
    const controller = new AbortController();
    fetch(`/api/availability?doctorId=${doctorId}&date=${date}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { setSlots(data.slots || []); setLoadingSlots(false); })
      .catch(error => { if (error.name !== "AbortError") { setError("دریافت زمان‌های آزاد انجام نشد."); setLoadingSlots(false); } });
    return () => controller.abort();
  }, [doctorId, date]);

  function selectDoctor(id: number) {
    const choice = doctors.find(item => item.id === id);
    setDoctorId(id); setVisitType(choice?.visitModes.length === 1 ? choice.visitModes[0] : null);
    setDate(""); setTime(""); setSlots([]); setError("");
  }
  function selectDate(value: string) {
    if (value === date) return;
    setDate(value); setTime(""); setSlots([]); setLoadingSlots(true); setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!doctorId || !visitType || !date || !time) { setError("متخصص، محل خدمت، روز و ساعت را انتخاب کنید."); return; }
    if (name.trim().length < 2 || !/^0?9\d{9}$/.test(normalizeDigits(phone))) { setError("نام و شماره موبایل معتبر بیمار را وارد کنید."); return; }
    if (visitType === "home" && address.trim().length < 10) { setError("برای خدمت در محل، نشانی کامل بیمار را وارد کنید."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, visitType, appointmentDate: date, appointmentTime: time,
          patientName: name.trim(), patientPhone: normalizeDigits(phone), patientAddress: visitType === "home" ? address.trim() : "", patientNote: note.trim() }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "ثبت نوبت انجام نشد.");
        if (response.status === 409) { setTime(""); const fresh = await fetch(`/api/availability?doctorId=${doctorId}&date=${date}`, { cache: "no-store" }).then(r => r.json()); setSlots(fresh.slots || []); }
        return;
      }
      setCreated(result.appointment); onCreated();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[65] flex items-end justify-center bg-[#112f24]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
    <div role="dialog" aria-modal="true" aria-labelledby="manual-title" className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] bg-white shadow-2xl sm:rounded-[26px]">
      <div className="flex shrink-0 items-center justify-between border-b border-[#e4ede5] px-5 py-4 sm:px-7"><div><span className="flex items-center gap-2 text-[11px] font-bold text-[#5b9471]"><PhoneCall size={15} /> ثبت توسط پذیرش</span><h2 id="manual-title" className="mt-1 text-lg font-black text-[#1d4c38]">نوبت تلفنی جدید</h2></div><button type="button" onClick={onClose} aria-label="بستن فرم" className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f6f1] text-[#567461]"><X size={19} /></button></div>
      <div className="scrollbar-thin overflow-y-auto px-5 py-5 sm:px-7">
        {created ? <div className="py-5 text-center"><CheckCircle2 size={46} className="mx-auto text-[#449267]" /><h3 className="mt-4 text-xl font-black text-[#1e503b]">نوبت تلفنی ثبت و تأیید شد</h3><p className="mt-2 text-sm text-[#668474]">شمارهٔ پیگیری: #{toPersianDigits(created.id)}</p><p className="mx-auto mt-5 max-w-md rounded-xl bg-[#f1f8f2] p-4 text-xs leading-7 text-[#567561]">{created.linkedToAccount ? "نوبت در حساب موجود بیمار نیز قابل مشاهده است." : "برای این شماره حسابی یافت نشد. نوبت در پذیرش ثبت است و پس از ورود بیمار با تأیید شماره، به حساب او متصل می‌شود."} وضعیت ارسال پیامک را در بخش اعلان‌ها بررسی کنید.</p><button type="button" onClick={onClose} className="mt-6 rounded-xl bg-[#287a5b] px-8 py-3 text-xs font-bold text-white">بازگشت به نوبت‌ها</button></div> : <form onSubmit={submit} className="space-y-5">
          <div><label htmlFor="manual-doctor" className="text-xs font-bold text-[#436c52]">متخصص / پرستار</label><select id="manual-doctor" required value={doctorId ?? ""} onChange={event => selectDoctor(Number(event.target.value))} className="booking-input"><option value="">انتخاب متخصص</option>{doctors.map(item => <option key={item.id} value={item.id}>{item.name} · {item.specialty}</option>)}</select></div>
          {doctor && <fieldset><legend className="text-xs font-bold text-[#436c52]">محل دریافت خدمت</legend><div className="mt-2 grid grid-cols-2 gap-2">{doctor.visitModes.map(mode => <button key={mode} type="button" onClick={() => setVisitType(mode)} aria-pressed={visitType === mode} className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold transition ${visitType === mode ? "border-[#5ba476] bg-[#eaf6ed] text-[#23694b]" : "border-[#e3ebe4] text-[#708675]"}`}>{mode === "home" ? <MapPin size={17} /> : <Building2 size={17} />}{mode === "home" ? "در محل بیمار" : "در کلینیک"}</button>)}</div></fieldset>}
          {doctor && <div><p className="text-xs font-bold text-[#436c52]">تاریخ مراجعه</p><div className="scrollbar-thin mt-2 flex gap-2 overflow-x-auto pb-2">{days.map(day => <button key={day} type="button" onClick={() => selectDate(day)} className={`min-w-[101px] shrink-0 rounded-xl border px-3 py-2.5 text-center text-xs font-bold ${date === day ? "border-[#358a62] bg-[#358a62] text-white" : "border-[#e4ede5] text-[#597a62]"}`}>{formatJalaliShort(day)}</button>)}</div></div>}
          {date && <div><p className="mb-2 text-xs font-bold text-[#436c52]">ساعت‌های خالی</p>{loadingSlots ? <p className="rounded-xl bg-[#f6faf6] p-4 text-xs text-[#849b89]">در حال بارگذاری...</p> : slots.length ? <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{slots.map(slot => <button key={slot.time} type="button" disabled={!slot.available} onClick={() => setTime(slot.time)} className={`rounded-lg border py-2.5 text-xs font-bold ${!slot.available ? "border-transparent bg-[#f1f3f1] text-[#bac7bc] line-through" : time === slot.time ? "border-[#368363] bg-[#368363] text-white" : "border-[#dce9df] text-[#467457]"}`}>{toPersianDigits(slot.time)}</button>)}</div> : <p className="text-xs text-[#849b89]">در این روز زمان آزادی وجود ندارد.</p>}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[#436c52]">نام و نام خانوادگی بیمار<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={150} required placeholder="مثلاً مریم رضایی" className="booking-input" /></label><label className="text-xs font-bold text-[#436c52]">موبایل بیمار<input dir="ltr" inputMode="tel" value={phone} onChange={event => setPhone(normalizeDigits(event.target.value))} required placeholder="09123456789" className="booking-input" /></label></div>
          {visitType === "home" && <label className="block text-xs font-bold text-[#436c52]">نشانی دریافت خدمت در محل<input value={address} onChange={event => setAddress(event.target.value)} required minLength={10} maxLength={500} placeholder="شهر، خیابان، پلاک و واحد" className="booking-input" /></label>}
          <label className="block text-xs font-bold text-[#436c52]">توضیحات پذیرش (اختیاری)<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={2} placeholder="اطلاعات ضروری برای هماهنگی" className="booking-input resize-y" /></label>
          <p className="rounded-xl bg-[#f3f8f3] p-3 text-[11px] leading-6 text-[#72907b]">نوبت تلفنی پس از ثبت تأیید می‌شود و زمان برای دیگران بسته خواهد شد. اگر بیمار حسابی با این شماره دارد، نوبت در آن نمایش داده می‌شود.</p>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700">{error}</p>}
          <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-[#e6eee7] bg-white p-4 sm:-mx-7 sm:px-7"><button type="submit" disabled={busy || !doctor || !visitType || !date || !time} className="w-full rounded-xl bg-[#287a5b] py-3.5 text-sm font-bold text-white shadow-md disabled:opacity-40">{busy ? "در حال ثبت نوبت..." : "ثبت و تأیید نوبت تلفنی"}</button></div>
        </form>}
      </div>
    </div>
  </div>;
}
