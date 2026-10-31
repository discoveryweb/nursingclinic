import { getStaff,can } from "@/lib/auth";
import { redirect } from "next/navigation";
import RecordsList from "@/components/admin/RecordsList";
export const dynamic="force-dynamic";
export default async function Page(){if(!can(await getStaff(),"audit.view"))redirect("/admin");return <RecordsList type="audit"/>;}
