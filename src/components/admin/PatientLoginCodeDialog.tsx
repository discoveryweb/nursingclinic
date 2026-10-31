"use client";
import { useState } from "react";
import { PhoneCall, ShieldCheck, X } from "lucide-react";
import { normalizeDigits } from "@/lib/client-utils";
import { toPersianDigits } from "@/lib/date";

export default function PatientLoginCodeDialog({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [confirmedIdentity, setConfirmedIdentity] = useState(false);
  const [purpose, setPurpose] = useState<"login" | "change_phone">("login");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/admin/patient-login-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: normalizeDigits(phone), purpose, confirmedIdentity }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "صدور کد انجام نشد."); return; }
      setCode(data.code);
    } catch { setError("ارتباط با سرور برقرار نشد."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#133a2b]/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="manual-otp-title" className="max-h-[90dvh] w-full max-w-md overflow-auto rounded-t-[26px] bg-white p-6 shadow-2xl sm:rounded-[26px]"><div className="flex items-start justify-between gap-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f5eb] text-[#398361]"><PhoneCall size={21}/></span><button type="button" onClick={onClose} aria-label="بستن پنجره" className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f6f3] text-[#678575]"><X size={18}/></button></div><h2 id="manual-otp-title" className="mt-4 text-lg font-black text-[#204c38]">صدور کد تلفنی</h2><p className="mt-2 text-xs leading-7 text-[#728f7c]">فقط پس از تماس با صاحب شماره و بررسی هویت او، کد را تلفنی به همان فرد اعلام کنید.</p>{code ? <div className="mt-5 rounded-2xl border border-[#cde6d2] bg-[#f3faf4] p-5 text-center"><p className="text-xs text-[#638774]">کد {purpose === "login" ? "ورود" : "تغییر شماره"} برای <span dir="ltr">{toPersianDigits(phone)}</span></p><strong dir="ltr" className="mt-3 block text-3xl font-black tracking-[.25em] text-[#226d4d]">{toPersianDigits(code)}</strong><p className="mt-3 text-xs leading-6 text-[#668975]">کد فقط یک‌بار و تا ۵ دقیقه معتبر است. آن را ثبت یا برای فرد دیگری ارسال نکنید.</p><button type="button" onClick={onClose} className="mt-5 rounded-xl bg-[#287a5b] px-6 py-3 text-xs font-bold text-white">متوجه شدم</button></div> : <form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-xs font-bold text-[#557b64]">هدف کد<select value={purpose} onChange={e => setPurpose(e.target.value === "change_phone" ? "change_phone" : "login")} className="booking-input"><option value="login">ورود بیمار به حساب</option><option value="change_phone">تأیید شمارهٔ جدید بیمار</option></select></label><label className="block text-xs font-bold text-[#557b64]">شماره موبایل مراجعه‌کننده<input dir="ltr" inputMode="tel" required value={phone} onChange={e => setPhone(normalizeDigits(e.target.value))} placeholder="09123456789" className="booking-input"/></label><label className="flex items-start gap-2 rounded-xl bg-[#f5f9f5] p-3 text-xs leading-6 text-[#65836e]"><input type="checkbox" checked={confirmedIdentity} onChange={e => setConfirmedIdentity(e.target.checked)} className="mt-1 accent-[#287a5b]"/><span>با صاحب شماره تماس گرفته‌ام و هویت او را بررسی کرده‌ام.</span></label>{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700">{error}</p>}<button type="submit" disabled={busy || !confirmedIdentity} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#287a5b] py-3.5 text-xs font-bold text-white disabled:opacity-50"><ShieldCheck size={16}/>{busy ? "در حال صدور..." : "صدور کد یک‌بارمصرف"}</button></form>}</div></div>;
}
