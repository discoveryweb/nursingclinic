"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, CalendarDays, HeartPulse, MapPin, Menu, Phone, UserRound, X } from "lucide-react";
import { normalizeDigits } from "@/lib/client-utils";

const links = [
  { href: "/#home", label: "خانه" },
  { href: "/#services", label: "خدمات" },
  { href: "/#doctors", label: "متخصصان" },
  { href: "/#how-it-works", label: "راهنمای رزرو" },
  { href: "/#faq", label: "پرسش‌ها" },
  { href: "/#contact", label: "تماس" },
];

export default function Navbar({ patientName, clinicPhone }: { patientName?: string; clinicPhone?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <div className="bg-[#173e33] px-4 py-2 text-[11px] text-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
          <span>مراقبت را از انتخابی آگاهانه آغاز کنید.</span>
          {clinicPhone && <a href={`tel:${normalizeDigits(clinicPhone).replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 font-bold text-[#c3e5ce]"><Phone size={13} />{clinicPhone}</a>}
        </div>
      </div>
      <header className={`sticky top-0 z-50 border-b transition-all duration-300 ${scrolled ? "border-[#d8ebe1] bg-white/95 shadow-[0_8px_30px_rgba(23,62,51,0.06)] backdrop-blur-md" : "border-[#e8f1ec] bg-[#fbfdfc]/95 backdrop-blur"}`}>
        <nav aria-label="ناوبری اصلی" className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-5 lg:px-10">
          <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="صفحه اصلی کلینیک آرامش">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2c7e6c] to-[#195244] text-white shadow-md shadow-[#2c7e6c33] transition-transform group-hover:scale-105"><HeartPulse size={23} /></span>
            <span className="leading-tight"><strong className="block text-base font-black text-[#14473b] sm:text-lg">کلینیک آرامش</strong><small className="block text-[10px] text-[#6c8b81]">نوبت‌دهی و مراقبت</small></span>
          </Link>
          <div className="hidden items-center gap-0.5 lg:flex">{links.map(link => <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-xs font-bold text-[#446258] transition hover:bg-[#eaf5ef] hover:text-[#216d5b]">{link.label}</Link>)}</div>
          <div className="hidden items-center gap-2.5 lg:flex">
            <Link href={patientName ? "/patient" : "/patient/login"} className="inline-flex items-center gap-2 rounded-xl border border-[#d4e7dd] px-3 py-2.5 text-xs font-bold text-[#346658] transition hover:bg-[#f2f8f4]"><UserRound size={16} />{patientName ? "حساب من" : "ورود مراجعه‌کننده"}</Link>
            <Link href="/booking" className="inline-flex items-center gap-2 rounded-xl bg-[#246e59] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_8px_24px_rgba(35,108,89,0.24)] transition hover:bg-[#195943]">رزرو نوبت <ArrowUpLeft size={16} /></Link>
          </div>
          <button type="button" aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} aria-controls="site-mobile-menu" onClick={() => setOpen(!open)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#d2e7dc] bg-white text-[#216857] lg:hidden">{open ? <X size={21} /> : <Menu size={21} />}</button>
        </nav>
        {open && <div id="site-mobile-menu" className="border-t border-[#e2efe8] bg-white px-5 pb-5 pt-3 shadow-xl lg:hidden"><div className="mx-auto max-w-xl space-y-1">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold text-[#325a4d] hover:bg-[#f0f8f3]">{link.label}<span aria-hidden className="text-[#9bb3a8]">←</span></Link>)}{patientName && <Link href="/patient?tab=address" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl bg-[#edf7ef] px-4 py-3 text-sm font-bold text-[#2b7552]"><MapPin size={17} />نشانی من</Link>}<div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#e9f2ee] pt-3"><Link href={patientName ? "/patient" : "/patient/login"} onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl border border-[#cfe5d9] py-3 text-xs font-bold text-[#236b59]"><UserRound size={16} />حساب من</Link><Link href="/booking" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl bg-[#287c69] py-3 text-xs font-bold text-white"><CalendarDays size={16} />رزرو نوبت</Link></div></div></div>}
      </header>
    </>
  );
}
