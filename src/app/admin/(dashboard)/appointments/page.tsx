import AppointmentsManager from "@/components/admin/AppointmentsManager";
import { getStaff,can } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page(){if(!can(await getStaff(),"appointments.view"))redirect("/admin");return <AppointmentsManager/>;}
