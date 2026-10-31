import { redirect } from "next/navigation";
import { getPatient } from "@/lib/auth";
import { otpConfigured } from "@/lib/otp";
import { safePatientNext } from "@/lib/patient-redirect";
import { getSetting, SETTINGS_KEYS } from "@/lib/settings";
import PatientLogin from "@/components/auth/PatientLogin";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safePatientNext(params.next);
  const [patient, clinicPhone] = await Promise.all([getPatient(), getSetting(SETTINGS_KEYS.clinicPhone)]);
  if (patient && patient.name.trim().length >= 2) redirect(nextPath);
  return <PatientLogin nextPath={nextPath} smsAvailable={otpConfigured()} clinicPhone={clinicPhone} initialProfile={patient ? { name: patient.name, phone: patient.phone, address: patient.address } : null} />;
}
