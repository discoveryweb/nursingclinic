"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpLeft, CalendarDays, HeartPulse, MapPin, Menu, Phone, UserRound, X } from "lucide-react";

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
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <div className="bg-[#0f2e26] px-4 py-2.5 text-[11px] font-medium tracking-wide text-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
          <span className="flex items-center gap-2"><span className="hidden sm:inline">پاسخ‌گویی همه‌روزه ۸ تا ۱۹ •</span> مراقبت حرفه‌ای در منزل و کلینیک</span>
          {clinicPhone && <a href={`tel:${clinicPhone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-bold text-[#d1e8d6] hover:bg-white/15 transition-colors"><Phone size={13} />{clinicPhone}</a>}
        </div>
      </div>
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-all duration-300 ${scrolled ? "border-[#d8ebe1] bg-white/90 shadow-[0_8px_24px_rgba(16,46,32,0.07)]" : "border-[#e8f1ec] bg-white/75"}`}>
        <nav aria-label="ناوبری اصلی" className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-5 lg:px-10">
          <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="صفحه اصلی کلینیک آرامش">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#2c7e6c] to-[#184632] text-white shadow-md shadow-[#2c7e6c/20] transition-all group-hover:scale-105 group-hover:shadow-lg"><HeartPulse size={21} /></span>
            <span className="leading-tight"><strong className="block text-[15px] font-black tracking-tight text-[#12382c] sm:text-[16px]">کلینیک آرامش</strong><small className="block text-[10px] font-bold tracking-wider text-[#6b9a84]">ARAMESH CARE</small></span>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">{links.map(link => <Link key={link.href} href={link.href} className="rounded-full px-3.5 py-2 text-[13px] font-bold text-[#3d5a4e] transition hover:bg-[#eaf5ef] hover:text-[#1a5a3d]">{link.label}</Link>)}</div>
          <div className="hidden items-center gap-2 lg:flex">
            <Link href={patientName ? "/patient" : "/patient/login"} className="inline-flex items-center gap-2 rounded-full border border-[#d4e7dd] bg-white px-4 py-2.5 text-[13px] font-bold text-[#2f5a45] hover:bg-[#f2f8f4] hover:border-[#b8d9c2] transition-all"><UserRound size={15} />{patientName ? "حساب من" : "ورود"}</Link>
            <Link href="/booking" className="inline-flex items-center gap-2 rounded-full bg-[#174a36] px-5 py-2.5 text-[13px] font-black text-white shadow-[0_8px_20px_rgba(23,74,54,0.2)] hover:bg-[#0f2e26] hover:shadow-[0_12px_28px_rgba(23,74,54,0.25)] transition-all">رزرو نوبت <ArrowUpLeft size={15} /></Link>
          </div>
          <button type="button" aria-label={open ? "بستن منو" : "باز کردن منو"} aria-expanded={open} aria-controls="site-mobile-menu" onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#d2e7dc] bg-white text-[#1a4a36] shadow-sm lg:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </nav>
        {open && <div id="site-mobile-menu" className="border-t border-[#e2efe8] bg-white/95 backdrop-blur-xl px-5 pb-6 pt-4 shadow-2xl lg:hidden"><div className="mx-auto max-w-xl space-y-1">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-4 py-3 text-[14px] font-bold text-[#2e4d3e] hover:bg-[#f0f8f3]">{link.label}<span aria-hidden className="text-[#9bb3a8]">←</span></Link>)}{patientName && <Link href="/patient?tab=address" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl bg-[#edf7ef] px-4 py-3 text-sm font-bold text-[#2b7552]"><MapPin size={16} />نشانی من</Link>}<div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e9f2ee] pt-4"><Link href={patientName ? "/patient" : "/patient/login"} onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl border border-[#cfe5d9] bg-white py-3 text-[13px] font-bold text-[#234636]"><UserRound size={16} />حساب من</Link><Link href="/booking" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-xl bg-[#1a4a36] py-3 text-[13px] font-black text-white"><CalendarDays size={16} />رزرو نوبت</Link></div></div></div>}
      </header>
    </>
  );
}
