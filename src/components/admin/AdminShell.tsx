"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Bell, CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, LogOut, Menu, MessageSquareQuote, Settings, ShieldCheck, Stethoscope, UsersRound, X } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";

type StaffInfo = { name: string; role: string; permissions: string[] };
const items = [
  { href: "/admin", label: "پیشخوان", Icon: LayoutDashboard },
  { href: "/admin/appointments", label: "مدیریت نوبت‌ها", Icon: CalendarDays, permission: "appointments.view" },
  { href: "/admin/patients", label: "مراجعین", Icon: UsersRound, permission: "patients.view" },
  { href: "/admin/doctors", label: "متخصصان", Icon: Stethoscope, permission: "doctors.manage" },
  { href: "/admin/reviews", label: "نظرهای مراجعین", Icon: MessageSquareQuote, permission: "reviews.manage", adminOnly: true },
  { href: "/admin/notifications", label: "اعلان‌ها و پیامک", Icon: Bell, permission: "notifications.view" },
  { href: "/admin/staff", label: "کاربران و دسترسی‌ها", Icon: ShieldCheck, superOnly: true },
  { href: "/admin/audit", label: "گزارش فعالیت", Icon: ClipboardList, permission: "audit.view" },
  { href: "/admin/settings", label: "تنظیمات", Icon: Settings, permission: "settings.manage" },
];

function Sidebar({ staff, pathname, onClose, onLogout }: { staff: StaffInfo; pathname: string; onClose: () => void; onLogout: () => void }) {
  const visible = items.filter(i => {
    if ("superOnly" in i && i.superOnly) return staff.role === "super_admin";
    if ("adminOnly" in i && i.adminOnly && !["super_admin", "admin"].includes(staff.role)) return false;
    return !("permission" in i) || !i.permission || staff.role === "super_admin" || staff.permissions.includes(i.permission);
  });
  return <div className="flex h-full flex-col">
    <Link href="/" className="flex items-center gap-2 px-2 py-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#287c68] text-white"><HeartPulse size={23}/></span><span><strong className="block text-lg font-black leading-5 text-[#285a47]">آرامش</strong><small className="text-[10px] text-[#99ae9e]">پنل مدیریت کلینیک</small></span></Link>
    <div className="my-4 rounded-2xl bg-[#eff8f1] p-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#6aa788]"><UsersRound size={20}/></span><span><strong className="block text-xs text-[#4f7c61]">{staff.name}</strong><small className="mt-1 block text-[10px] text-[#96b3a0]">{ROLE_LABELS[staff.role] || staff.role}</small></span></div></div>
    <nav className="flex-1 space-y-1">{visible.map(i => { const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href); return <Link key={i.href} href={i.href} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold transition ${active ? "bg-[#2d806b] text-white shadow-md shadow-[#2d806b22]" : "text-[#829a8a] hover:bg-[#f1f8f3] hover:text-[#397d62]"}`}><i.Icon size={17}/>{i.label}</Link>; })}</nav>
    <div className="mt-4 space-y-1 border-t border-[#eef4ef] pt-3"><Link href="/admin/change-password" className="flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-[#829a8a]"><ShieldCheck size={17}/> تغییر رمز عبور</Link><button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold text-[#bf8b80]"><LogOut size={17}/> خروج از حساب</button></div>
  </div>;
}

export default function AdminShell({ children, staff }: { children: ReactNode; staff: StaffInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.replace(staff.role === "secretary" ? "/secretary/login" : staff.role === "specialist" ? "/specialist/login" : "/admin/login"); router.refresh(); }
  const sidebarProps = { staff, pathname, onClose: () => setOpen(false), onLogout: logout };
  return <div className="min-h-screen bg-[#f5f9f6] lg:flex" dir="rtl">
    <aside className="hidden min-h-screen w-[240px] shrink-0 border-l border-[#e4eee6] bg-white px-4 py-4 lg:block"><div className="sticky top-4 h-[calc(100vh-2rem)]"><Sidebar {...sidebarProps}/></div></aside>
    <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#e4eee6] bg-white/95 px-5 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button type="button" onClick={() => setOpen(true)} aria-label="باز کردن منو" className="grid h-10 w-10 place-items-center rounded-xl border border-[#e4eee6] text-[#4d8068] lg:hidden"><Menu size={19}/></button><div><p className="text-xs font-extrabold text-[#3a6a53]">پنل {ROLE_LABELS[staff.role] || "کلینیک"}</p><p className="mt-1 text-[10px] text-[#a2b3a7]">کلینیک پرستاری آرامش</p></div></div><div className="flex items-center gap-3"><Link href="/" className="hidden text-xs font-bold text-[#8aa393] sm:block">مشاهده سایت</Link><span className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf5ed] text-[#5d9b7a]"><UsersRound size={17}/></span><span className="hidden text-xs font-bold text-[#5b7e68] sm:block">{staff.name}</span></div></header><main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-7 lg:px-9">{children}</main></div>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-[#183c30]/40" aria-label="بستن منو" onClick={() => setOpen(false)}/><aside className="absolute inset-y-0 right-0 w-[270px] bg-white px-4 py-4 shadow-2xl"><button type="button" onClick={() => setOpen(false)} aria-label="بستن منو" className="absolute left-4 top-5 text-[#8da798]"><X size={20}/></button><Sidebar {...sidebarProps}/></aside></div>}
  </div>;
}
