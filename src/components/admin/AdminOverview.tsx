"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpLeft, Bell, CalendarCheck, CalendarDays, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { formatJalaliShort, toPersianDigits } from "@/lib/date";
import StatusBadge from "@/components/admin/StatusBadge";

type Row = { id: number; patientName: string; patientPhone: string; doctorName: string; appointmentDate: string; appointmentTime: string; status: string };
type Overview = { stats: { today: number; pending: number; upcoming: number; unread: number }; recent: Row[]; smsConfigured: boolean | null; smsProvider?: string | null };

export default function AdminOverview({ name, canView, canNotify }: { name: string; canView: boolean; canNotify: boolean }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setOverview(data); setError("");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError("دریافت آخرین وضعیت انجام نشد؛ اتصال را بررسی و دوباره تلاش کنید.");
    } finally { if (!signal?.aborted) setRefreshing(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => { void load(controller.signal); }, 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(controller.signal); }, 30000);
    return () => { controller.abort(); window.clearTimeout(initialLoad); window.clearInterval(timer); };
  }, [load]);
  const stats = [
    { label: "نوبت‌های امروز", value: overview?.stats.today, Icon: CalendarDays, bg: "#edf8f2", color: "#217056", hint: "نوبت‌های ثبت‌شدهٔ امروز" },
    { label: "در انتظار بررسی", value: overview?.stats.pending, Icon: Clock3, bg: "#fff8eb", color: "#a36e1c", hint: "نیازمند بررسی پذیرش" },
    { label: "نوبت‌های پیش‌رو", value: overview?.stats.upcoming, Icon: CalendarCheck, bg: "#f0f5fc", color: "#2f6ab3", hint: "نوبت‌های آینده و فعال" },
    { label: "اعلان‌های خوانده‌نشده", value: overview?.stats.unread, Icon: Bell, bg: "#f7effc", color: "#8338a8", hint: "اعلان‌های پنل پذیرش" },
  ];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] bg-gradient-to-l from-[#194e3e] to-[#2b7964] p-6 text-white shadow-[0_12px_40px_rgba(25,78,62,.16)] sm:p-8"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold"><ShieldCheck size={14}/> میز مدیریت کلینیک</span><h1 className="mt-3 text-2xl font-black sm:text-3xl">سلام {name} عزیز، روز خوش</h1><p className="mt-2 text-xs leading-6 text-white/80">نمای کلی نوبت‌ها و اعلان‌ها؛ به‌روزرسانی خودکار هر ۳۰ ثانیه</p></div><div className="flex flex-wrap items-center gap-2">{canNotify && overview && <span className={`rounded-xl px-4 py-2.5 text-xs font-bold ${overview.smsConfigured ? "bg-white/15 text-white" : "bg-[#f5d993]/20 text-[#fff0c2]"}`}>{overview.smsConfigured ? `درگاه پیامک: ${overview.smsProvider || "فعال"}` : "درگاه پیامک تنظیم نشده"}</span>}<button type="button" onClick={() => { setRefreshing(true); void load(); }} className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/25"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""}/> به‌روزرسانی</button></div></div>
    {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">{error}</div>}
    {canNotify && overview && !overview.smsConfigured && <div className="rounded-xl border border-[#f2dfb8] bg-[#fff9ec] p-4 text-xs leading-6 text-[#9a733b]">ارسال واقعی پیامک هنوز فعال نشده است. اعلان‌ها در پنل ذخیره می‌شوند و وضعیت آن‌ها از بخش اعلان‌ها قابل پیگیری است.</div>}
    {canView ? <><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.filter(item => item.label !== "اعلان‌های خوانده‌نشده" || canNotify).map(item => <div key={item.label} className="rounded-[22px] border border-[#e1ede5] bg-white p-4 shadow-sm sm:p-5"><span style={{ background: item.bg, color: item.color }} className="grid h-11 w-11 place-items-center rounded-2xl"><item.Icon size={20}/></span><strong className="mt-4 block text-2xl font-black text-[#194a3b] sm:text-3xl">{item.value === undefined ? "—" : toPersianDigits(item.value)}</strong><p className="mt-1 text-xs font-bold leading-6 text-[#3d6857]">{item.label}</p><p className="text-[10px] leading-5 text-[#86a596]">{item.hint}</p></div>)}</div>
      <section className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3 border-b border-[#edf4ef] pb-4"><div><h2 className="text-sm font-black text-[#194a3c]">آخرین نوبت‌های ثبت‌شده</h2><p className="mt-1 text-[11px] leading-6 text-[#78988a]">بر اساس زمان ثبت درخواست</p></div><Link href="/admin/appointments" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#26735e]">مشاهده همه <ArrowUpLeft size={15}/></Link></div>
        {overview?.recent.length ? <><div className="mt-4 space-y-3 sm:hidden">{overview.recent.map(row => <article key={row.id} className="rounded-2xl border border-[#edf3ee] bg-[#fcfefc] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#255440]">{row.patientName}</strong><StatusBadge status={row.status}/></div><p className="mt-2 text-xs text-[#6b8978]">{row.doctorName}</p><p className="mt-2 text-[11px] text-[#8aa293]">{formatJalaliShort(row.appointmentDate)} · {toPersianDigits(row.appointmentTime)} · #{toPersianDigits(row.id)}</p></article>)}</div><div className="mt-4 hidden overflow-x-auto sm:block"><table className="w-full min-w-[700px] text-right text-xs"><thead><tr className="border-b border-[#edf4ef] text-[#719283]"><th className="py-3 font-bold">کد</th><th className="py-3 font-bold">مراجعه‌کننده</th><th className="py-3 font-bold">تماس</th><th className="py-3 font-bold">متخصص</th><th className="py-3 font-bold">تاریخ و ساعت</th><th className="py-3 font-bold">وضعیت</th></tr></thead><tbody>{overview.recent.map(row => <tr key={row.id} className="border-b border-[#f1f6f3] last:border-0"><td className="py-3.5 text-[#719283]">#{toPersianDigits(row.id)}</td><td className="py-3.5 font-bold text-[#1b4d3e]">{row.patientName}</td><td className="py-3.5 text-[#5c8172]" dir="ltr">{toPersianDigits(row.patientPhone)}</td><td className="py-3.5 text-[#3b6b58]">{row.doctorName}</td><td className="py-3.5 text-[#5c8172]">{formatJalaliShort(row.appointmentDate)} · {toPersianDigits(row.appointmentTime)}</td><td className="py-3.5"><StatusBadge status={row.status}/></td></tr>)}</tbody></table></div></> : <div className="py-12 text-center text-xs text-[#8ca79b]">{overview ? "هنوز نوبتی برای نمایش وجود ندارد." : error ? "اطلاعات موقتاً در دسترس نیست." : "در حال دریافت اطلاعات..."}</div>}
      </section></> : <div className="rounded-2xl border border-[#e1ede5] bg-white p-8 text-center text-xs leading-7 text-[#688776]">دسترسی مشاهدهٔ نوبت‌ها برای حساب شما فعال نیست. در صورت نیاز با مدیر ارشد هماهنگ کنید.</div>}
  </div>;
}
