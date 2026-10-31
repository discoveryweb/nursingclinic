import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";
export const dynamic="force-dynamic";
export default async function Layout({children}:{children:ReactNode}){const user=await getStaff();if(!user)redirect("/admin/login");if(user.mustChangePassword)redirect("/admin/change-password");return <AdminShell staff={{name:user.name,role:user.role,permissions:user.permissions}}>{children}</AdminShell>;}
