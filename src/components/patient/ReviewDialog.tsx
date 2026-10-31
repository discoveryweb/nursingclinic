"use client";

import { useState } from "react";
import { MessageSquareQuote, Star, X } from "lucide-react";
import { toPersianDigits } from "@/lib/date";

export default function ReviewDialog({ appointmentId, doctorName, onClose, onSuccess }: {
  appointmentId: number;
  doctorName: string;
  onClose: () => void;
  onSuccess: (appointmentId: number) => void;
}) {
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) { setError("لطفاً از ۱ تا ۵ ستاره امتیاز دهید."); return; }
    if (content.trim().length < 12) { setError("تجربهٔ خود را در حداقل ۱۲ نویسه بنویسید."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/patient/reviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, rating, content: content.trim() }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "ثبت نظر ناموفق بود."); return; }
      onSuccess(appointmentId);
    } catch { setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید."); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#112d24]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[26px] bg-white p-6 shadow-2xl sm:rounded-[26px] sm:p-8">
        <div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f5e9] text-[#40835e]"><MessageSquareQuote size={24} /></span><button type="button" onClick={onClose} aria-label="بستن فرم نظر" className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f6f2] text-[#557260]"><X size={19} /></button></div>
        <h2 id="review-dialog-title" className="mt-4 text-xl font-black text-[#194a37]">تجربهٔ شما از خدمت</h2>
        <p className="mt-2 text-xs leading-7 text-[#718f7b]">نظر شما دربارهٔ {doctorName}، پس از بررسی مدیر در پروفایل متخصص نمایش داده می‌شود. نام شما به‌صورت عمومی منتشر نخواهد شد.</p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <fieldset><legend className="mb-2 text-sm font-bold text-[#3e6550]">امتیاز شما</legend><div className="flex gap-1" dir="ltr">{[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${toPersianDigits(value)} ستاره`} aria-pressed={rating === value} className={`grid h-11 w-11 place-items-center rounded-xl transition ${value <= rating ? "text-[#e9af47]" : "text-[#c9d4c7] hover:text-[#e9af47]"}`}><Star size={29} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div></fieldset>
          <label className="block text-sm font-bold text-[#3e6550]">نظر شما<textarea value={content} onChange={event => setContent(event.target.value)} maxLength={600} rows={5} placeholder="از کیفیت خدمت، برخورد و هماهنگی برایمان بنویسید..." className="booking-input mt-2 resize-y" /><span className="mt-1 block text-[11px] font-normal text-[#90a792]">{toPersianDigits(content.length)} / ۶۰۰ نویسه · از نوشتن اطلاعات خصوصی یا شماره تلفن خودداری کنید.</span></label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs leading-6 text-rose-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={onClose} className="rounded-xl border border-[#d4e4d6] px-5 py-3 text-xs font-bold text-[#5b7861]">انصراف</button><button disabled={busy} type="submit" className="flex-1 rounded-xl bg-[#287a5c] px-5 py-3 text-xs font-extrabold text-white disabled:opacity-50">{busy ? "در حال ثبت..." : "ثبت نظر برای بررسی"}</button></div>
        </form>
      </div>
    </div>
  );
}
