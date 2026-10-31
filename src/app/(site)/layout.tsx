import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Info } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import MobileTabBar from "@/components/site/MobileTabBar";
import { getPatient } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: true, follow: true } };
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [patient, settings] = await Promise.all([getPatient(), getAllSettings()]);
  const demoMode = process.env.CLINIC_DEMO_MODE !== "false";
  return <>
    <Navbar patientName={patient?.name} clinicPhone={settings.clinic_phone} />
    {demoMode && <div role="note" className="border-b border-[#eadfbe] bg-[#fffaf0] px-4 py-2"><p className="mx-auto flex max-w-[1200px] items-start gap-2 text-[11px] leading-6 text-[#8b6c38]"><Info size={15} className="mt-1 shrink-0"/>اطلاعات اولیهٔ متخصصان و تصاویر این نسخه نمونه‌اند؛ پیش از ارائهٔ خدمت باید توسط کلینیک بررسی و جایگزین شوند.</p></div>}
    <div>{children}</div>
    <Footer settings={settings} />
    <MobileTabBar signedIn={!!patient} clinicPhone={settings.clinic_phone} />
  </>;
}
