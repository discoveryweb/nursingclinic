import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import BookingWizard from "@/components/booking/BookingWizard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "رزرو آنلاین نوبت", robots: { index: false, follow: false } };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ doctor?: string }> }) {
  const sp = await searchParams;
  const doctor = sp.doctor && /^\d{1,9}$/.test(sp.doctor) && Number(sp.doctor) > 0 ? Number(sp.doctor) : undefined;
  const nextPath = doctor ? `/booking?doctor=${doctor}` : "/booking";
  const patient = await getPatient();
  if (!patient || patient.name.trim().length < 2) redirect(`/patient/login?next=${encodeURIComponent(nextPath)}`);
  const [allDoctors, settings] = await Promise.all([
    db.select().from(doctors).where(eq(doctors.active, true)).orderBy(asc(doctors.displayOrder)),
    getAllSettings(),
  ]);
  return <main id="main-content" className="min-h-[70vh] bg-[#f7faf8] px-4 pb-20 pt-10 sm:px-6 lg:px-10"><div className="mx-auto max-w-[1120px]"><div className="mb-8 text-center"><span className="section-kicker">نوبت‌دهی آنلاین</span><h1 className="section-title">با آرامش، نوبت بگیرید</h1><p className="section-subtitle">متخصص، شیوهٔ دریافت خدمت و زمان مناسب خود را انتخاب کنید.</p></div><BookingWizard doctors={allDoctors} initialDoctorId={doctor} patient={{ name: patient.name, phone: patient.phone, address: patient.address }} clinicAddress={settings.clinic_address} clinicName={settings.clinic_name} clinicPhone={settings.clinic_phone} /></div></main>;
}
