import NotificationsLog from "@/components/admin/NotificationsLog";
import { getStaff,can } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function Page(){if(!can(await getStaff(),"notifications.view"))redirect("/admin");return <NotificationsLog/>;}
