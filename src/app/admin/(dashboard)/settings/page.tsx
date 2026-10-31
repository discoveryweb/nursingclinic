import SettingsForm from "@/components/admin/SettingsForm";
import { getStaff,can } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page(){if(!can(await getStaff(),"settings.manage"))redirect("/admin");return <SettingsForm/>;}
