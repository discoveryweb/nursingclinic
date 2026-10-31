import { getStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChangeStaffPassword from "@/components/auth/ChangeStaffPassword";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getStaff();if(!user)redirect("/admin/login");return <ChangeStaffPassword forced={user.mustChangePassword}/>;}
