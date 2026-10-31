import DoctorsManager from "@/components/admin/DoctorsManager";
import { getStaff,can } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page(){if(!can(await getStaff(),"doctors.manage"))redirect("/admin");return <DoctorsManager/>;}
