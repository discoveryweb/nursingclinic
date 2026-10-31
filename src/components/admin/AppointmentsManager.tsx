"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { formatJalaliShort, toPersianDigits } from "@/lib/date";
import { minutesUntilAppointment } from "@/lib/slots";
import StatusBadge from "@/components/admin/StatusBadge";
import ManualBookingDialog from "@/components/admin/ManualBookingDialog";
import type { Doctor } from "@/db/schema";

type Row = {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorSpecialty: string;
  patientName: string;
  patientPhone: string;
  visitType: string;
  patientAddress: string;
  patientNote: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
};

export default function AppointmentsManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [visitType, setVisitType] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((d) => setDoctors(d.doctors || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const p = new URLSearchParams();
        if (status !== "all") p.set("status", status);
        if (date) p.set("date", date);
        if (doctorId) p.set("doctorId", doctorId);
        if (visitType) p.set("visitType", visitType);
        if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
        p.set("page", String(page));
        const r = await fetch(`/api/admin/appointments?${p}`, { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (alive) {
          setRows(d.appointments || []);
          setTotal(Number(d.total) || 0);
          setTotalPages(Number(d.totalPages) || 1);
          if (Number(d.page) > 0 && Number(d.page) !== page) setPage(Number(d.page));
          setCanManage(!!d.canManage);
          setCanCreate(!!d.canCreate);
          setError("");
        }
      } catch {
        if (alive) setError("دریافت نوبت‌ها ناموفق بود.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 25000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [status, date, doctorId, visitType, debouncedSearch, page, version]);

  async function update(id: number, next: string) {
    if (next === "cancelled" && !confirm("آیا از لغو این نوبت توسط پذیرش اطمینان دارید؟")) return;
    setBusy(id);
    setError("");
    try {
      const r = await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "تغییر وضعیت ناموفق بود.");
        return;
      }
      setVersion((v) => v + 1);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(null);
    }
  }

  const filteredRows = rows;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1a4a3c] sm:text-2xl">کارتابل مدیریت و هماهنگی نوبت‌ها</h1>
          <p className="mt-1 text-xs text-[#719284]">
            {toPersianDigits(total)} نوبت در این فیلتر · صفحهٔ {toPersianDigits(page)} از {toPersianDigits(totalPages)}
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {canCreate && <button type="button" onClick={() => setShowManual(true)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#287a5b] px-4 py-3 text-xs font-bold text-white shadow-md sm:flex-none"><PhoneCall size={16} />ثبت نوبت تلفنی</button>}
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="inline-flex items-center gap-2 rounded-xl border border-[#d6e6dd] bg-white px-4 py-3 text-xs font-bold text-[#446d5c]"><RefreshCw size={14} />تازه‌سازی</button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-[#f5cfcc] bg-[#fff5f4] p-4 text-xs text-[#b03d36]">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-[#dfece4] bg-white p-4 sm:p-5 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute right-3.5 top-3 text-[#94ab9e]" />
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="جستجوی نام بیمار، شماره موبایل یا کد..."
            className="w-full rounded-xl border border-[#dbe8df] bg-[#f8fbf9] py-2.5 pr-9 pl-3 text-xs outline-none focus:border-[#7bc09e]"
          />
        </div>

        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          aria-label="فیلتر وضعیت"
          className="rounded-xl border border-[#dbe8df] bg-[#f8fbf9] px-3.5 py-2.5 text-xs font-bold text-[#446d5c] outline-none"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار بررسی منشی</option>
          <option value="confirmed">تأیید شده و نهایی</option>
          <option value="done">خدمت انجام شد</option>
          <option value="cancelled">لغو شده</option>
        </select>

        <select
          value={doctorId}
          onChange={(e) => { setPage(1); setDoctorId(e.target.value); }}
          aria-label="فیلتر متخصص"
          className="rounded-xl border border-[#dbe8df] bg-[#f8fbf9] px-3.5 py-2.5 text-xs font-bold text-[#446d5c] outline-none"
        >
          <option value="">همه متخصصان و پرستاران</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select value={visitType} onChange={(e) => { setPage(1); setVisitType(e.target.value); }} aria-label="فیلتر محل خدمت" className="rounded-xl border border-[#dbe8df] bg-[#f8fbf9] px-3.5 py-2.5 text-xs font-bold text-[#446d5c] outline-none">
          <option value="">همهٔ محل‌ها</option><option value="clinic">در کلینیک</option><option value="home">در محل مراجعه‌کننده</option>
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => { setPage(1); setDate(e.target.value); }}
          aria-label="فیلتر تاریخ"
          className="rounded-xl border border-[#dbe8df] bg-[#f8fbf9] px-3.5 py-2.5 text-xs font-bold text-[#446d5c] outline-none"
        />

        {(status !== "all" || date || doctorId || visitType || search) && (
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setStatus("all");
              setDate("");
              setDoctorId("");
              setVisitType("");
              setSearch("");
            }}
            className="rounded-xl border border-[#d6e6dd] px-3.5 py-2.5 text-xs font-bold text-[#2d7d66] hover:bg-[#f0f7f3]"
          >
            پاک کردن فیلترها
          </button>
        )}
      </div>

      {/* Appointments List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="rounded-[24px] border border-[#dfece4] bg-white p-12 text-center text-xs text-[#8ca79b]">
            در حال دریافت و به‌روزرسانی نوبت‌ها...
          </div>
        ) : filteredRows.length ? (
          filteredRows.map((a) => (
            <article
              key={a.id}
              className="rounded-[24px] border border-[#e1ede5] bg-white p-5 shadow-sm transition hover:border-[#b8ddcb]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <strong className="text-sm font-black text-[#1a4a3c]">{a.patientName}</strong>
                    <StatusBadge status={a.status} />
                    <span className="text-[11px] font-bold text-[#8ba79b]">کد نوبت: #{toPersianDigits(a.id)}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <a
                      href={`tel:${a.patientPhone}`}
                      dir="ltr"
                      className="flex items-center gap-1 text-xs font-black text-[#26735e] hover:underline"
                    >
                      <Phone size={13} />
                      <span>{a.patientPhone}</span>
                    </a>
                  </div>
                </div>

                {canManage && (
                  <div className="flex flex-wrap gap-2">
                    {a.status === "pending" && (
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => update(a.id, "confirmed")}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-4 py-2 text-xs font-black text-white shadow-sm hover:scale-105 transition disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        <span>تأیید نوبت و اطلاع‌رسانی</span>
                      </button>
                    )}

                    {a.status === "confirmed" && (
                      <button
                        type="button"
                        disabled={busy === a.id || (minutesUntilAppointment(a.appointmentDate, a.appointmentTime) ?? 1) > 0}
                        title={(minutesUntilAppointment(a.appointmentDate, a.appointmentTime) ?? 1) > 0 ? "پس از شروع زمان نوبت فعال می‌شود" : "ثبت خدمت انجام‌شده"}
                        onClick={() => update(a.id, "done")}
                        className="rounded-xl border border-[#cbe4d5] bg-[#edf7f1] px-3.5 py-2 text-xs font-bold text-[#1f664f] hover:bg-[#d8efe2] transition disabled:opacity-50"
                      >
                        علامت‌گذاری به عنوان انجام شده
                      </button>
                    )}

                    {["pending", "confirmed"].includes(a.status) && (
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => update(a.id, "cancelled")}
                        className="flex items-center gap-1 rounded-xl border border-[#fad8d4] bg-[#fff5f4] px-3 py-2 text-xs font-bold text-[#b03d36] hover:bg-[#fde9e7] transition disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        <span>لغو نوبت</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#edf4ef] pt-3 text-xs text-[#5a7f6f]">
                <span className="font-bold">
                  متخصص: <strong className="text-[#1a4b3d]">{a.doctorName}</strong> ({a.doctorSpecialty})
                </span>
                <span className="rounded-full bg-[#eef7ef] px-2.5 py-1 font-bold text-[#387255]">{a.visitType === "home" ? "خدمت در محل" : "مراجعه به کلینیک"}</span>
                <span className="flex items-center gap-1.5 font-bold">
                  <CalendarDays size={14} className="text-[#3c9077]" />
                  <span>{formatJalaliShort(a.appointmentDate)}</span>
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock3 size={14} className="text-[#3c9077]" />
                  <span>ساعت {toPersianDigits(a.appointmentTime)}</span>
                </span>
              </div>

              {a.visitType === "home" && a.patientAddress && (
                <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-[#f5faf7] p-2.5 text-xs text-[#3d6957]">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[#2f836b]" />
                  <span>نشانی منزل برای اعزام: {a.patientAddress}</span>
                </p>
              )}

              {a.patientNote && (
                <p className="mt-2 rounded-xl bg-[#fafdfb] border border-[#eaf2ed] p-2.5 text-xs leading-6 text-[#698c7e]">
                  توضیحات بیمار: {a.patientNote}
                </p>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-[24px] border border-[#dfece4] bg-white py-14 text-center text-xs text-[#8ca79b]">
            نوبتی با این شرایط فیلتر در سامانه یافت نشد.
          </div>
        )}
      </div>
      {totalPages > 1 && <nav aria-label="صفحه‌بندی نوبت‌ها" className="flex items-center justify-between gap-3 rounded-2xl border border-[#dfece4] bg-white p-4"><button type="button" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-xl border border-[#dceadf] px-4 py-2.5 text-xs font-bold text-[#397357] disabled:opacity-35">صفحهٔ قبل</button><span className="text-xs text-[#789486]">صفحهٔ {toPersianDigits(page)} از {toPersianDigits(totalPages)}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="rounded-xl border border-[#dceadf] px-4 py-2.5 text-xs font-bold text-[#397357] disabled:opacity-35">صفحهٔ بعد</button></nav>}
      {showManual && <ManualBookingDialog doctors={doctors} onClose={() => setShowManual(false)} onCreated={() => setVersion(value => value + 1)} />}
    </div>
  );
}
