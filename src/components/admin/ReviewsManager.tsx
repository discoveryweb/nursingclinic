"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MessageSquareQuote, RefreshCw, Star, Trash2 } from "lucide-react";
import { toPersianDigits } from "@/lib/date";

type ReviewRow = {
  id: number;
  appointmentId: number;
  doctorId: number;
  doctorName: string;
  patientName: string;
  rating: number;
  content: string;
  status: string;
  createdAt: string;
};

export default function ReviewsManager() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/reviews", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "دریافت نظرها انجام نشد.");
    setRows(result.reviews || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    const initialLoad = window.setTimeout(() => {
      load().catch(() => { if (active) { setError("دریافت نظرها انجام نشد."); setLoading(false); } });
    }, 0);
    return () => { active = false; window.clearTimeout(initialLoad); };
  }, [load]);

  const filtered = useMemo(() => filter === "all" ? rows : rows.filter(row => row.status === filter), [filter, rows]);
  const pendingCount = rows.filter(row => row.status === "pending").length;

  async function act(id: number, method: "PATCH" | "DELETE") {
    if (method === "DELETE" && !window.confirm("این نظر حذف شود؟ این اقدام از پروفایل عمومی نیز آن را برمی‌دارد.")) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, { method });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "انجام عملیات ممکن نشد.");
      await load();
      setMessage(method === "PATCH" ? "نظر تأیید شد و در پروفایل متخصص نمایش داده می‌شود." : "نظر حذف شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطایی رخ داد.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold text-[#599277]">مدیریت بازخورد</p><h1 className="mt-1 text-2xl font-black text-[#194a3c]">نظرهای مراجعین</h1><p className="mt-2 text-xs leading-7 text-[#719284]">فقط نظرهای مربوط به خدمات انجام‌شده ثبت می‌شوند. هر نظر پیش از انتشار باید بررسی شود.</p></div>
        <button type="button" onClick={() => load().catch(() => setError("دریافت نظرها انجام نشد."))} className="inline-flex items-center gap-2 rounded-xl border border-[#d6e7db] bg-white px-4 py-2.5 text-xs font-bold text-[#35765d]"><RefreshCw size={15} />تازه‌سازی</button>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e3ede5] bg-white p-3 sm:p-4">
        {[{ key: "pending", label: "در انتظار بررسی" }, { key: "approved", label: "منتشرشده" }, { key: "all", label: "همه" }].map(item => <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${filter === item.key ? "bg-[#287c68] text-white" : "bg-[#f1f7f2] text-[#577564]"}`}>{item.label}</button>)}
        <span className="mr-auto rounded-full bg-[#fff6e8] px-3 py-1 text-xs font-bold text-[#9d712f]">{toPersianDigits(pendingCount)} نظر در انتظار</span>
      </div>
      {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700">{error}</div>}
      {message && <div role="status" className="rounded-xl bg-[#e8f5ec] p-4 text-xs text-[#327954]">{message}</div>}
      {loading ? <div className="rounded-2xl bg-white p-10 text-center text-sm text-[#809688]">در حال دریافت نظرها...</div> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ede5] bg-white p-12 text-center"><MessageSquareQuote size={32} className="mx-auto text-[#a5c6ae]"/><p className="mt-3 text-sm font-bold text-[#668474]">نظری در این بخش وجود ندارد.</p></div>
      ) : <div className="grid gap-4 lg:grid-cols-2">{filtered.map(row => (
        <article key={row.id} className="rounded-[22px] border border-[#e1ece3] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-sm font-extrabold text-[#20523c]">{row.doctorName}</h2><p className="mt-1 text-xs text-[#829586]">{row.patientName} · نوبت #{toPersianDigits(row.appointmentId)}</p></div><span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${row.status === "pending" ? "bg-[#fff5e5] text-[#a37124]" : "bg-[#e9f6ec] text-[#378056]"}`}>{row.status === "pending" ? "در انتظار" : "منتشرشده"}</span></div>
          <div className="mt-3 flex items-center gap-1 text-[#efb951]" aria-label={`${row.rating} از ۵ ستاره`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={17} fill={i < row.rating ? "currentColor" : "none"} />)}</div>
          <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-[#f7faf7] p-4 text-sm leading-8 text-[#4d6c58]">{row.content}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ed] pt-4"><span className="text-[11px] text-[#95a99b]">{new Date(row.createdAt).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" })}</span><div className="flex gap-2">{row.status === "pending" && <button type="button" disabled={busyId !== null} onClick={() => act(row.id, "PATCH")} className="inline-flex items-center gap-1.5 rounded-lg bg-[#287c68] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check size={15} />تأیید و انتشار</button>}<button type="button" disabled={busyId !== null} onClick={() => act(row.id, "DELETE")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 disabled:opacity-50"><Trash2 size={14} />حذف</button></div></div>
        </article>
      ))}</div>}
    </div>
  );
}
