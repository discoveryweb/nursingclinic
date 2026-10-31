import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, doctors, reviews } from "@/db/schema";
import { getPatient } from "@/lib/auth";
import { getAllSettings } from "@/lib/settings";
import { otpConfigured } from "@/lib/otp";
import PatientDashboard from "@/components/patient/PatientDashboard";

export const dynamic = "force-dynamic";
export default async function PatientPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [{ tab }, patient] = await Promise.all([searchParams, getPatient()]);
  if (!patient || patient.name.trim().length < 2) redirect(`/patient/login?next=${encodeURIComponent("/patient")}`);
  const [rows, settings] = await Promise.all([
    db.select({
      id: appointments.id, doctorId: appointments.doctorId,
      patientName: appointments.patientName, patientPhone: appointments.patientPhone,
      date: appointments.appointmentDate, time: appointments.appointmentTime,
      status: appointments.status, visitType: appointments.visitType,
      note: appointments.patientNote, address: appointments.patientAddress,
      doctorName: doctors.name, specialty: doctors.specialty, imageUrl: doctors.imageUrl,
      reviewStatus: reviews.status,
    }).from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id))
      .leftJoin(reviews, eq(reviews.appointmentId, appointments.id))
      .where(eq(appointments.patientId, patient.id))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime)),
    getAllSettings(),
  ]);
  const initialTab = tab === "address" || tab === "profile" || tab === "appointments" ? tab : "home";
  return <PatientDashboard patient={{ name: patient.name, phone: patient.phone, address: patient.address, phoneVerified: patient.phoneVerified }} appointments={rows} clinicAddress={settings.clinic_address} clinicName={settings.clinic_name} clinicPhone={settings.clinic_phone} smsAvailable={otpConfigured()} initialTab={initialTab} />;
}
