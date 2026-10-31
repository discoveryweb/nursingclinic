"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HeartPulse, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { normalizeDigits } from "@/lib/client-utils";

export default function PatientLogin({ nextPath, smsAvailable, clinicPhone, initialProfile }: {
  nextPath: string;
  smsAvailable: boolean;
  clinicPhone: string;
  initialProfile: { name: string; phone: string; address: string } | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"phone" | "code" | "profile">(initialProfile ? "profile" : "phone");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [code, setCode] = useState("");
  const [name, setName] = useState(initialProfile?.name || "");
  const [address, setAddress] = useState(initialProfile?.address || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resend, setResend] = useState(0);
  useEffect(() => {
    if (resend <= 0) return;
    const timer = window.setTimeout(() => setResend(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resend]);

  function validPhone() { return /^0?9\d{9}$/.test(normalizeDigits(phone).replace(/[\s()-]/g, "")); }
  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    setError(""); setNotice("");
    if (!validPhone()) { setError("شماره موبایل معتبر وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/patient/verification/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: normalizeDigits(phone) }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "ارسال کد انجام نشد."); return; }
      setStage("code"); setCode(""); setResend(60); setNotice("کد ورود به شماره شما ارسال شد. اعتبار کد ۵ دقیقه است.");
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  function useReceptionCode() {
    setError(""); setNotice("");
    if (!validPhone()) { setError("ابتدا شماره موبایل خود را وارد کنید."); return; }
    setStage("code"); setCode("");
    setNotice("کد دریافت‌شده از پذیرش را وارد کنید. کد یک‌بارمصرف و ۵ دقیقه معتبر است.");
  }
  async function verify(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (normalizeDigits(code).length !== 6) { setError("کد شش‌رقمی را کامل وارد کنید."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/patient/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: normalizeDigits(phone), code: normalizeDigits(code) }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "ورود انجام نشد."); return; }
      if (data.needsProfile) { setStage("profile"); setNotice("شماره شما تأیید شد؛ برای ادامه نام خود را وارد کنید."); return; }
      router.replace(nextPath); router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (name.trim().length < 2) { setError("نام و نام خانوادگی را کامل وارد کنید."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/patient/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), address: address.trim() }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "ذخیره اطلاعات انجام نشد."); return; }
      router.replace(nextPath); router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  const title = stage === "phone" ? "ورود با شماره همراه" : stage === "code" ? "کد تأیید را وارد کنید" : "حساب شما آماده است";
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_#e7f3e9_0%,_#f4faf5_52%,_#edf5f0_100%)] p-4 sm:p-6 lg:p-9">
      <div className="mx-auto grid w-full max-w-[1100px] overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_25px_80px_rgba(27,73,52,.12)] lg:min-h-[650px] lg:grid-cols-2">
        <section className="flex flex-col px-5 py-6 sm:px-12 lg:px-16">
          <div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#287b61] text-white"><HeartPulse size={23}/></span><span className="text-lg font-black text-[#225643]">آرامش</span></Link><Link href="/" className="flex items-center gap-1 text-xs font-bold text-[#779484]"><ArrowRight size={15}/> خانه</Link></div>
          <div className="my-auto w-full max-w-[390px] py-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dfefe4] bg-[#f4faf5] px-3 py-2 text-[11px] font-bold text-[#609477]"><ShieldCheck size={15}/> ورود امن بدون رمز عبور</span>
            <h1 className="mt-5 text-2xl font-black text-[#214b3c]">{title}</h1>
            <p className="mt-2 text-sm leading-7 text-[#82998b]">{stage === "phone" ? "پیش از رزرو، با شماره همراه وارد شوید. کد یک‌بارمصرف جایگزین رمز عبور است." : stage === "code" ? <>کد شش‌رقمی شماره <span dir="ltr" className="font-bold text-[#386d55]">{phone}</span> را وارد کنید.</> : "برای رزرو اول، نام خود را ثبت کنید؛ دفعات بعد اطلاعاتتان خودکار تکمیل می‌شود."}</p>
            {notice && <p role="status" className="mt-5 rounded-xl border border-[#dcefe0] bg-[#f1f9f2] p-3 text-xs leading-6 text-[#4b8060]">{notice}</p>}
            {error && <p role="alert" className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs leading-6 text-rose-700">{error}</p>}
            {stage === "phone" && <form onSubmit={sendCode} className="mt-6 space-y-4">
              <label className="block text-xs font-bold text-[#5b7b6a]">شماره موبایل<input autoFocus autoComplete="tel" inputMode="tel" dir="ltr" maxLength={15} value={phone} onChange={event => setPhone(normalizeDigits(event.target.value))} placeholder="09123456789" className="booking-input mt-2 py-4 text-base" /></label>
              {smsAvailable ? <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#287a5e] py-4 text-sm font-extrabold text-white shadow-lg shadow-[#287a5e20] disabled:opacity-50">{busy ? "در حال ارسال..." : "دریافت کد پیامکی"}<ArrowLeft size={17}/></button> : <div className="rounded-xl border border-[#f1e2bd] bg-[#fffaf0] p-4 text-xs leading-7 text-[#936f38]">درگاه پیامک هنوز فعال نشده است. برای ورود امن، پس از احراز هویت، کد یک‌بارمصرف را از پذیرش دریافت کنید.{clinicPhone && <a href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`} className="mt-2 flex items-center gap-1 font-bold text-[#37785a]"><Phone size={14}/> تماس با پذیرش: <span dir="ltr">{clinicPhone}</span></a>}</div>}
              <button type="button" onClick={useReceptionCode} className="w-full rounded-xl border border-[#d9e9dc] bg-white py-3.5 text-xs font-bold text-[#39765b] transition hover:bg-[#f2f8f3]">کد ورود را از پذیرش دریافت کرده‌ام</button>
            </form>}
            {stage === "code" && <form onSubmit={verify} className="mt-6 space-y-4">
              <label className="block text-xs font-bold text-[#5b7b6a]">کد ورود یک‌بارمصرف<input autoFocus autoComplete="one-time-code" inputMode="numeric" dir="ltr" maxLength={6} value={code} onChange={event => setCode(normalizeDigits(event.target.value).replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className="booking-input mt-2 py-4 text-center text-xl tracking-[.5em]" /></label>
              <button disabled={busy || code.length !== 6} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#287a5e] py-4 text-sm font-extrabold text-white disabled:opacity-50">{busy ? "در حال بررسی..." : "تأیید و ادامه"}<ArrowLeft size={17}/></button>
              <div className="flex items-center justify-between gap-3 text-xs"><button type="button" onClick={() => { setStage("phone"); setCode(""); setError(""); setNotice(""); }} className="font-bold text-[#7c9787]">ویرایش شماره</button>{smsAvailable && <button type="button" disabled={busy || resend > 0} onClick={() => void sendCode()} className="font-bold text-[#33805d] disabled:text-[#b5c9bb]">{resend > 0 ? `ارسال دوباره تا ${resend} ثانیه` : "ارسال دوباره کد"}</button>}</div>
            </form>}
            {stage === "profile" && <form onSubmit={saveProfile} className="mt-6 space-y-4"><label className="block text-xs font-bold text-[#5b7b6a]">نام و نام خانوادگی<input autoFocus required minLength={2} maxLength={150} autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="نام و نام خانوادگی خود را بنویسید" className="booking-input mt-2 py-4 text-sm" /></label><label className="block text-xs font-bold text-[#5b7b6a]">نشانی پیش‌فرض (اختیاری)<textarea maxLength={500} rows={2} autoComplete="street-address" value={address} onChange={event => setAddress(event.target.value)} placeholder="برای خدماتی که در محل ارائه می‌شوند" className="booking-input mt-2 resize-y" /></label><p className="flex items-start gap-2 text-[11px] leading-6 text-[#789485]"><CheckCircle2 size={16} className="mt-1 shrink-0"/> بعداً می‌توانید این اطلاعات را در حساب خود ویرایش کنید.</p><button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#287a5e] py-4 text-sm font-extrabold text-white disabled:opacity-50">{busy ? "در حال ذخیره..." : "ذخیره و ادامه"}<ArrowLeft size={17}/></button></form>}
            <p className="mt-7 text-center text-[11px] leading-6 text-[#9bab9e]">با ادامه، <Link href="/terms" className="font-bold text-[#558b68]">شرایط استفاده</Link> و <Link href="/privacy" className="font-bold text-[#558b68]">حریم خصوصی</Link> را می‌پذیرید.</p>
          </div>
          <p className="text-xs text-[#a0b2a5]">کلینیک پرستاری آرامش · همراه شما</p>
        </section>
        <section className="relative hidden min-h-[650px] overflow-hidden bg-[#e6f2e9] lg:block"><Image src="/images/hero.jpg" fill priority alt="مراقبت پرستاری در خانه" className="object-cover" sizes="50vw"/><div className="absolute inset-0 bg-gradient-to-t from-[#153f32]/90 via-[#214a39]/10 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-12 text-white"><span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs backdrop-blur"><MessageCircle size={15}/> ساده، امن و بدون رمز</span><h2 className="mt-5 text-3xl font-black leading-[1.7]">مراقبت خوب،<br/>از همراهی خوب شروع می‌شود.</h2><p className="mt-3 text-sm leading-8 text-white/80">با یک کد یک‌بارمصرف وارد شوید و نوبت‌هایتان را با خیال آسوده پیگیری کنید.</p></div></section>
      </div>
    </main>
  );
}
