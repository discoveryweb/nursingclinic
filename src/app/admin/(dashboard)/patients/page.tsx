import { getStaff,can } from "@/lib/auth";
import { redirect } from "next/navigation";
import RecordsList from "@/components/admin/RecordsList";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getStaff();if(!can(user,"patients.view")||user?.role==="specialist")redirect("/admin");return <RecordsList type="patients"/>;}
