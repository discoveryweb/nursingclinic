"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Phone, Stethoscope, UserRound } from "lucide-react";

export default function MobileTabBar({ signedIn, clinicPhone }: { signedIn: boolean; clinicPhone?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="ناوبری سریع موبایل" className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-3 mb-2 flex items-center justify-around rounded-[22px] border border-[#d2ebdc] bg-white/95 px-1.5 py-2 shadow-[0_12px_40px_rgba(20,62,49,0.14)] backdrop-blur-lg">
        <Link href="/" className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${pathname === "/" ? "text-[#1d6b54]" : "text-[#709083]"}`}><Home size={19} />خانه</Link>
        <Link href="/#doctors" className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#709083]"><Stethoscope size={19} />متخصصان</Link>
        <Link href="/booking" className="-translate-y-3 rounded-2xl bg-gradient-to-br from-[#2f836f] to-[#164f40] px-4 py-3 text-center text-[10px] font-extrabold text-white shadow-lg shadow-[#2f836f44] active:scale-95"><CalendarDays size={20} className="mx-auto mb-1" />رزرو نوبت</Link>
        <Link href={signedIn ? "/patient" : "/patient/login"} className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${pathname.startsWith("/patient") ? "text-[#1d6b54]" : "text-[#709083]"}`}><UserRound size={19} />حساب من</Link>
        <a href={clinicPhone ? `tel:${clinicPhone.replace(/[^\d+]/g, "")}` : "/#contact"} className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold text-[#709083]"><Phone size={19} />تماس</a>
      </div>
    </nav>
  );
}
