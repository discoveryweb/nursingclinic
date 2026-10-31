import type { ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import MobileTabBar from "@/components/site/MobileTabBar";
import { getPatient } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: true, follow: true } };
export default async function SiteLayout({ children }: { children: ReactNode }) {
  let patient: Awaited<ReturnType<typeof getPatient>> = null;
  let settings: Record<string,string>;
  try {
    [patient, settings] = await Promise.all([getPatient(), getAllSettings()]);
  } catch {
    const { MOCK_SETTINGS } = await import("@/lib/preview-data");
    settings = MOCK_SETTINGS;
  }
  return <>
    <Navbar patientName={patient?.name} clinicPhone={settings.clinic_phone} />
    <div>{children}</div>
    <Footer settings={settings} />
    <MobileTabBar signedIn={!!patient} clinicPhone={settings.clinic_phone} />
  </>;
}
