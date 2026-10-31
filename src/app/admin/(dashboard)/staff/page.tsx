import { getStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import StaffManager from "@/components/admin/StaffManager";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getStaff();if(!user||user.role!=="super_admin"||user.mustChangePassword)redirect("/admin");return <StaffManager/>;}
