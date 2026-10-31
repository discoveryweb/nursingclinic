import { getStaff,can } from "@/lib/auth";
import AdminOverview from "@/components/admin/AdminOverview";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getStaff();return <AdminOverview name={user?.name||""} canView={can(user,"appointments.view")} canNotify={can(user,"notifications.view")}/>;}
