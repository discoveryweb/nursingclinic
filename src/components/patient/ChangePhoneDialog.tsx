"use client";
import { useState } from "react";
import { ArrowLeft, Phone, ShieldCheck, X } from "lucide-react";
import { normalizeDigits } from "@/lib/client-utils";

export default function ChangePhoneDialog({ currentPhone, smsAvailable, clinicPhone, onClose, onSuccess }: { currentPhone: string; smsAvailable: boolean; clinicPhone: string; onClose: () => void; onSuccess: () => void }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  function validPhone() { return /^0?9\d{9}$/.test(normalizeDigits(phone).replace(/[\s()-]/g, "")); }
  function enterReceptionCode() { setError(""); if (!validPhone()) { setError("شماره همراه جدید معتبر نیست."); return; } setNotice("کد مخصوص تغییر شماره را که از پذیرش گرفته‌اید وارد کنید."); setStage("code"); }
  async function send(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (!validPhone()) { setError("شماره همراه جدید معتبر نیست."); return; }
    setBusy(true);
    try { const response = await fetch("/api/patient/verification/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: normalizeDigits(phone), purpose: "change_phone" }) }); const data = await response.json(); if (!response.ok) { setError(data.error || "ارسال کد ناموفق بود."); return; } setNotice("کد به شماره جدید ارسال شد و تا ۵ دقیقه معتبر است."); setStage("code"); }
    catch { setError("ارتباط با سرور برقرار نشد."); } finally { setBusy(false); }
  }
  async function confirm(event: React.FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { const response = await fetch("/api/patient/phone", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: normalizeDigits(phone), code: normalizeDigits(code) }) }); const data = await response.json(); if (!response.ok) { setError(data.error || "تغییر شماره ناموفق بود."); return; } onSuccess(); }
    catch { setError("ارتباط با سرور برقرار نشد."); } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#133a2b]/50 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="change-phone-title" className="max-h-[90dvh] w-full max-w-md overflow-auto rounded-t-[26px] bg-white p-6 shadow-2xl sm:rounded-[26px]"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f5eb] text-[#398361]"><Phone size={21}/></span><button type="button" onClick={onClose} aria-label="بستن پنجره تغییر شماره" className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f6f3] text-[#678575]"><X size={18}/></button></div><h2 id="change-phone-title" className="mt-4 text-lg font-black text-[#204c38]">تغییر امن شماره همراه</h2><p className="mt-2 text-xs leading-7 text-[#728f7c]">شماره فعلی: <span dir="ltr">{currentPhone}</span>. پس از تأیید مالکیت شمارهٔ جدید، ورودهای بعدی با شمارهٔ جدید انجام می‌شوند.</p>{notice && <p role="status" className="mt-4 rounded-xl bg-[#edf8ef] p-3 text-xs leading-6 text-[#4f8261]">{notice}</p>}{error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700">{error}</p>}{stage === "phone" ? <form onSubmit={send} className="mt-5 space-y-3"><label className="block text-xs font-bold text-[#557b64]">شماره همراه جدید<input required inputMode="tel" autoComplete="tel" dir="ltr" value={phone} onChange={e => setPhone(normalizeDigits(e.target.value))} placeholder="09123456789" className="booking-input"/></label>{smsAvailable ? <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#287a5b] py-3.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال ارسال..." : "دریافت کد تأیید"}</button> : <p className="rounded-xl bg-[#fff9ec] p-3 text-xs leading-6 text-[#936f38]">درگاه پیامک فعال نیست؛ کد مخصوص تغییر شماره را پس از احراز هویت از پذیرش دریافت کنید.{clinicPhone && <a className="mt-1 block font-bold text-[#397c5c]" href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`}>تماس با پذیرش: <span dir="ltr">{clinicPhone}</span></a>}</p>}<button type="button" onClick={enterReceptionCode} className="w-full rounded-xl border border-[#d9e9dc] py-3 text-xs font-bold text-[#39765b]">کد را از پذیرش دریافت کرده‌ام</button></form> : <form onSubmit={confirm} className="mt-5 space-y-4"><label className="block text-xs font-bold text-[#557b64]">کد تأیید شماره جدید<input required inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={e => setCode(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0,6))} placeholder="کد ۶ رقمی" className="booking-input text-center text-base tracking-[.4em]"/></label><p className="flex items-start gap-2 text-[11px] leading-6 text-[#789485]"><ShieldCheck size={16} className="mt-1 shrink-0"/>پس از تغییر، نشست دستگاه‌های قبلی برای امنیت حساب بسته می‌شوند.</p><button type="submit" disabled={busy || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#287a5b] py-3.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال تأیید..." : "تأیید و تغییر شماره"}<ArrowLeft size={16}/></button><button type="button" onClick={() => { setStage("phone"); setCode(""); setError(""); setNotice(""); }} className="w-full text-xs font-bold text-[#6e927a]">ویرایش شماره</button></form>}</div></div>;
}
