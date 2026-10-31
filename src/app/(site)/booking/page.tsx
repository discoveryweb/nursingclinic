import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import BookingWizard from "@/components/booking/BookingWizard";
import { MOCK_DOCTORS } from "@/lib/preview-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "رزرو آنلاین نوبت", robots: { index: false, follow: false } };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ doctor?: string }> }) {
  const sp = await searchParams;
  const doctor = sp.doctor && /^\d{1,9}$/.test(sp.doctor) && Number(sp.doctor) > 0 ? Number(sp.doctor) : undefined;
  const nextPath = doctor ? `/booking?doctor=${doctor}` : "/booking";
  const patient = await getPatient();
  // For preview: provide mock patient when DB unavailable so booking wizard still renders
  const previewPatient = patient || { name: "مهمان پیش‌نمایش", phone: "09123456789", address: "" };
  if (!patient || patient.name.trim().length < 2) {
    // In preview mode (no real session), allow viewing wizard with mock patient
    try {
      // try real auth redirect, but fallback to preview if DB fails
      if (!patient) {
        // check if we are in preview (no DB) - still render wizard with mock
        const isPreview = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dummy");
        if (!isPreview) redirect(`/patient/login?next=${encodeURIComponent(nextPath)}`);
      } else {
        redirect(`/patient/login?next=${encodeURIComponent(nextPath)}`);
      }
    } catch {
      // next redirect throws, let it through; if preview we continue
      const isPreview = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes("dummy");
      if (!isPreview) throw new Error("NEXT_REDIRECT");
    }
  }
  let allDoctors: typeof MOCK_DOCTORS = [];
  let settings: Record<string,string> = {};
  try {
    [allDoctors, settings] = await Promise.all([
      db.select().from(doctors).where(eq(doctors.active, true)).orderBy(asc(doctors.displayOrder)),
      getAllSettings(),
    ]);
    if (!allDoctors.length) allDoctors = MOCK_DOCTORS;
  } catch {
    allDoctors = MOCK_DOCTORS;
    settings = await getAllSettings();
  }
  const effectivePatient = patient && patient.name.trim().length >=2 ? patient : previewPatient;
  return <main id="main-content" className="min-h-[70vh] bg-[#f7faf8] px-4 pb-20 pt-10 sm:px-6 lg:px-10"><div className="mx-auto max-w-[1120px]"><div className="mb-8 text-center"><span className="section-kicker">نوبت‌دهی آنلاین</span><h1 className="section-title">با آرامش، نوبت بگیرید</h1><p className="section-subtitle">متخصص، شیوهٔ دریافت خدمت و زمان مناسب خود را انتخاب کنید.</p></div><BookingWizard doctors={allDoctors} initialDoctorId={doctor} patient={{ name: effectivePatient.name, phone: effectivePatient.phone, address: effectivePatient.address }} clinicAddress={settings.clinic_address} clinicName={settings.clinic_name} clinicPhone={settings.clinic_phone} /></div></main>;
}
