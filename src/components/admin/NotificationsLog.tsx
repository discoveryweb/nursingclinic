"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, MessageSquare, RefreshCw } from "lucide-react";

type Notice = { id: number; appointmentId: number | null; channel: string; recipient: string; message: string; status: string; providerResponse: string; read: boolean; createdAt: string; updatedAt: string };
const deliveryState: Record<string, { label: string; style: string }> = {
  sent: { label: "پذیرفته‌شده توسط درگاه", style: "bg-[#e8f7ec] text-[#5e9974]" },
  failed: { label: "ناموفق", style: "bg-rose-50 text-rose-600" },
  not_configured: { label: "درگاه/گیرنده تنظیم نشده", style: "bg-amber-50 text-amber-700" },
  simulated: { label: "ارسال نشده", style: "bg-amber-50 text-amber-700" },
  pending: { label: "در صف ارسال", style: "bg-blue-50 text-blue-600" },
  sending: { label: "در حال ارسال؛ وضعیت امن در سرور بررسی می‌شود", style: "bg-violet-50 text-violet-700" },
};

export default function NotificationsLog() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [configured, setConfigured] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/admin/notifications", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "دریافت اعلان‌ها ناموفق بود.");
      setRows(data.notifications || []);
      setConfigured(!!data.smsConfigured);
      setProviderName(data.smsProvider || "");
      setError("");
    } catch (reason) {
      if (reason instanceof Error && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "دریافت اعلان‌ها ناموفق بود.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => { void load(controller.signal); }, 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(controller.signal); }, 30000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  async function retry(id: number) {
    setBusy(id); setError("");
    try {
      const response = await fetch(`/api/admin/notifications/${id}/retry`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تلاش مجدد ناموفق بود.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تلاش مجدد ناموفق بود."); }
    finally { setBusy(null); }
  }
  async function readAll() {
    try {
      const response = await fetch("/api/admin/notifications", { method: "PATCH" });
      if (!response.ok) throw new Error();
      await load();
    } catch { setError("علامت‌گذاری اعلان‌ها ناموفق بود."); }
  }
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-black text-[#2d5d49] sm:text-2xl">اعلان‌ها و پیامک‌ها</h1><p className="mt-2 text-xs leading-7 text-[#738d7c]">«پذیرفته‌شده» به معنی پذیرش سرویس پیامک است و تحویل نهایی روی تلفن را تضمین نمی‌کند.</p></div><button type="button" onClick={() => void readAll()} className="rounded-xl border border-[#dcebe0] bg-white px-4 py-2.5 text-xs font-bold text-[#729681]">خوانده‌شدن اعلان‌های پنل</button></div>
      {!configured ? (
        <p className="mt-5 rounded-xl border border-[#f3e3be] bg-[#fff9eb] p-4 text-xs leading-7 text-[#98733a]">
          درگاه پیامک (ملی‌پیامک/کاوه‌نگار) هنوز در متغیرهای سرور تنظیم نشده است؛ اعلان‌های پنل کامل ثبت می‌شوند اما پیامک واقعی ارسال نمی‌گردد.
        </p>
      ) : (
        <p className="mt-5 rounded-xl border border-[#cfe2d7] bg-[#edf8f2] p-3 text-xs leading-7 text-[#286f52]">
          درگاه فعال پیامک: <strong className="font-extrabold">{providerName || "ملی‌پیامک"}</strong> — پیامک‌ها به صف ارسال فرستاده می‌شوند.
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700">{error}</p>}
      <div className="mt-5 space-y-3">
        {loading ? <p className="p-8 text-center text-xs text-[#9fb1a5]">در حال دریافت...</p> : rows.length ? rows.map(notice => {
          const meta = deliveryState[notice.status] || deliveryState.pending;
          const retryable = notice.channel === "sms" && ["pending", "failed", "not_configured", "simulated", "sending"].includes(notice.status);
          return <article key={notice.id} className="rounded-[20px] border border-[#e4eee7] bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf8ef] text-[#6eaa87]">{notice.channel === "sms" ? <MessageSquare size={17} /> : <Bell size={17} />}</span><span className="text-xs font-extrabold text-[#517962]">{notice.channel === "sms" ? "پیامک" : "اعلان پنل"}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.style}`}>{meta.label}</span>{notice.channel === "dashboard" && !notice.read && <span aria-label="خوانده‌نشده" className="h-2 w-2 rounded-full bg-[#eab667]" />}</div><time className="text-[10px] text-[#899f91]">{new Date(notice.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</time></div>
            <p className="mt-3 whitespace-pre-line break-words text-xs leading-7 text-[#607c68]">{notice.message}</p>
            {notice.channel === "sms" && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f5f1] pt-3 text-[10px] text-[#8ba093]"><span>{notice.recipient ? `گیرنده: ${notice.recipient}` : "گیرنده تعیین نشده"}{notice.providerResponse ? ` · ${notice.providerResponse}` : ""}</span>{retryable && <button type="button" disabled={busy === notice.id} onClick={() => void retry(notice.id)} className="flex items-center gap-1 rounded-lg bg-[#eef7ef] px-3 py-2 font-bold text-[#4a8763] disabled:opacity-50"><RefreshCw size={13} className={busy === notice.id ? "animate-spin" : ""} />تلاش امن برای ارسال</button>}</div>}
          </article>;
        }) : <div className="rounded-2xl bg-white p-12 text-center text-xs text-[#829a88]">هنوز اعلانی ثبت نشده است.</div>}
      </div>
    </div>
  );
}
