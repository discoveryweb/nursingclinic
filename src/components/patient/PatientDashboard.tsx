"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPin,
  Building2,
  MessageSquareQuote,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { formatJalaliShort, toPersianDigits } from "@/lib/date";
import { canCancelAppointment, iranNow, minutesUntilAppointment } from "@/lib/slots";
import ReviewDialog from "@/components/patient/ReviewDialog";
import ReceiptPreview from "@/components/patient/ReceiptPreview";
import ChangePhoneDialog from "@/components/patient/ChangePhoneDialog";

type Appointment = {
  id: number;
  doctorId: number;
  patientName: string;
  patientPhone: string;
  date: string;
  time: string;
  status: string;
  visitType: string;
  reviewStatus: string | null;
  note: string;
  address: string;
  doctorName: string;
  specialty: string;
  imageUrl: string;
};

type Patient = {
  name: string;
  phone: string;
  address: string;
  phoneVerified: boolean;
};

const statusMap: Record<string, { label: string; style: string; badge: string }> = {
  pending: {
    label: "در انتظار بررسی پذیرش",
    style: "bg-[#fff7e8] border-[#fde4be] text-[#9b6818]",
    badge: "bg-[#fbe8c7] text-[#805008]",
  },
  confirmed: {
    label: "تأیید شده و نهایی",
    style: "bg-[#edf8f1] border-[#c9ecd5] text-[#1c694a]",
    badge: "bg-[#d3f1dd] text-[#145a3e]",
  },
  cancelled: {
    label: "لغو شده",
    style: "bg-[#fff2f0] border-[#fcd5d0] text-[#9c453c]",
    badge: "bg-[#fadcd8] text-[#85342c]",
  },
  done: {
    label: "خدمت انجام شد",
    style: "bg-[#f1f5f2] border-[#e0eae3] text-[#557564]",
    badge: "bg-[#e2ebe5] text-[#476354]",
  },
};

const tabs = [
  { id: "home", label: "پیشخوان", Icon: LayoutDashboard },
  { id: "appointments", label: "نوبت‌ها", Icon: CalendarDays },
  { id: "address", label: "نشانی من", Icon: MapPin },
  { id: "profile", label: "مشخصات", Icon: UserRound },
  { id: "security", label: "امنیت", Icon: ShieldCheck },
] as const;

type Tab = (typeof tabs)[number]["id"];

export default function PatientDashboard({
  patient,
  appointments,
  clinicAddress,
  clinicName,
  clinicPhone,
  smsAvailable,
  initialTab = "home",
}: {
  patient: Patient;
  appointments: Appointment[];
  clinicAddress: string;
  clinicName: string;
  clinicPhone: string;
  smsAvailable: boolean;
  initialTab?: "home" | "address" | "profile" | "appointments";
}) {
  const router = useRouter();
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [submittedReviews, setSubmittedReviews] = useState<number[]>([]);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [name, setName] = useState(patient.name);
  const [address, setAddress] = useState(patient.address);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [changingPhone, setChangingPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const now = iranNow();
  const upcoming = appointments
    .filter(a => ["pending", "confirmed"].includes(a.status) && (minutesUntilAppointment(a.date, a.time, now) ?? -1) > 0)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const filteredAppointments = appointments.filter(a => {
    const matchStatus = filterStatus === "all" || (filterStatus === "upcoming"
      ? ["pending", "confirmed"].includes(a.status) && (minutesUntilAppointment(a.date, a.time, now) ?? -1) > 0
      : a.status === filterStatus);
    const query = search.trim();
    return matchStatus && (!query || a.doctorName.includes(query) || a.specialty.includes(query) || String(a.id).includes(query));
  });
  const reviewingAppointment = appointments.find(item => item.id === reviewingId);
  const printingAppointment = appointments.find(item => item.id === printingId);

  function switchTab(t: Tab) {
    setTab(t);
    setMessage("");
    setError("");
  }

  async function logout() {
    await fetch("/api/patient/logout", { method: "POST" });
    router.replace("/patient/login");
    router.refresh();
  }

  async function cancel(id: number) {
    if (!confirm("آیا از لغو این نوبت مطمئن هستید؟ پس از لغو، زمان به سایر مراجعین اختصاص خواهد یافت.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`/api/patient/appointments/${id}/cancel`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "لغو نوبت ناموفق بود.");
        return;
      }
      setMessage("نوبت با موفقیت لغو شد و پذیرش کلینیک مطلع گردید.");
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/patient/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error);
        return;
      }
      setMessage("اطلاعات نشانی و پرونده شما با موفقیت ذخیره شد.");
      router.refresh();
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOtherSessions() {
    if (!window.confirm("از خروج حساب در دستگاه‌های دیگر مطمئن هستید؟")) return;
    setMessage(""); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/patient/sessions/revoke", { method: "POST" });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "انجام عملیات ممکن نشد."); return; }
      setMessage("نشست‌های قبلی بسته شدند و این دستگاه همچنان وارد است.");
    } catch { setError("خطا در ارتباط با سرور."); }
    finally { setBusy(false); }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f8f5]">
      {/* Patient Header */}
      <header className="sticky top-0 z-30 border-b border-[#e1ece4] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#2a7a67] to-[#184f42] text-white shadow-md shadow-[#2a7a6729]">
              <HeartPulse size={22} strokeWidth={2} />
            </span>
            <span className="leading-tight">
              <strong className="block text-base font-black text-[#1a4a3c]">کلینیک آرامش</strong>
              <small className="text-[10.5px] font-medium text-[#6f9084]">کارتابل پرونده سلامت بیمار</small>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/booking"
              aria-label="رزرو نوبت جدید"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-3 py-2.5 text-xs font-black text-white shadow-md shadow-[#2c7f6b2b] transition hover:scale-105 sm:px-4"
            >
              <Plus size={16} />
              <span className="hidden min-[390px]:inline">نوبت جدید</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 rounded-xl border border-[#d6e6dd] bg-white px-3.5 py-2.5 text-xs font-bold text-[#628575] hover:bg-[#f3f9f5] transition"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">خروج از حساب</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-7 lg:px-10">
        {/* Mobile Horizontal Tabs */}
        <nav aria-label="بخش‌های حساب بیمار" className="mb-4 grid grid-cols-5 gap-0.5 rounded-2xl border border-[#dfece4] bg-white p-1.5 shadow-sm lg:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[9px] leading-tight font-bold transition ${
                tab === t.id
                  ? "bg-[#25735f] text-white shadow-md shadow-[#25735f33]"
                  : "text-[#557769]"
              }`}
            >
              <t.Icon size={17} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          {/* Desktop Sidebar Navigation */}
          <aside className="hidden self-start rounded-[24px] border border-[#dfece4] bg-white p-4 shadow-sm lg:block">
            <div className="flex items-center gap-3 border-b border-[#edf4ef] px-2 pb-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7f1] text-[#2f836b]">
                <UserRound size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-black text-[#1d4d3e]">{patient.name}</strong>
                <span dir="ltr" className="block text-xs font-bold text-[#628777]">
                  {toPersianDigits(patient.phone)}
                </span>
                <span
                  className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-black ${
                    patient.phoneVerified ? "bg-[#e5f6eb] text-[#247952]" : "bg-[#fef3db] text-[#8e6318]"
                  }`}
                >
                  <ShieldCheck size={11} />
                  <span>{patient.phoneVerified ? "شماره تأیید شده" : "تأیید تلفنی"}</span>
                </span>
              </div>
            </div>

            <nav className="mt-4 space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => switchTab(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-right text-xs font-bold transition ${
                    tab === t.id
                      ? "bg-[#eaf5ef] text-[#1e6653] font-black"
                      : "text-[#5e8172] hover:bg-[#f6faf7] hover:text-[#236b58]"
                  }`}
                >
                  <t.Icon size={17} />
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-6 border-t border-[#edf4ef] pt-4">
              <Link
                href="/booking"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] py-3 text-xs font-black text-white shadow-md shadow-[#2c7f6b24]"
              >
                <Plus size={15} />
                <span>دریافت نوبت جدید</span>
              </Link>
            </div>
          </aside>

          {/* Tab Content Area */}
          <main className="min-w-0">
            {error && (
              <div role="alert" className="mb-5 animate-fade-up rounded-2xl border border-[#f5cfcc] bg-[#fff5f4] px-5 py-4 text-xs leading-6 text-[#b03d36]">
                <strong className="block font-black">توجه:</strong>
                <span>{error}</span>
              </div>
            )}
            {message && (
              <div role="status" className="mb-5 animate-fade-up rounded-2xl border border-[#c9ecd5] bg-[#eaf6ee] px-5 py-4 text-xs leading-6 text-[#1b6b4a]">
                <strong className="block font-black">نتیجه:</strong>
                <span>{message}</span>
              </div>
            )}

            {/* TAB 1: Home Overview */}
            {tab === "home" && (
              <div className="space-y-6">
                {/* Reassuring Welcome Hero Banner */}
                <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-l from-[#1e5d48] to-[#2e7d66] p-6 sm:p-8 text-white shadow-[0_12px_40px_rgba(30,93,72,0.18)]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                    <HeartPulse size={14} /> کارتابل همراه بیمار کلینیک آرامش
                  </span>
                  <h1 className="mt-4 text-2xl font-black sm:text-3xl">سلام {patient.name} عزیز، خوش آمدید</h1>
                  <p className="mt-2 max-w-xl text-xs sm:text-sm leading-7 text-white/85">
                    اینجا می‌توانید تمامی نوبت‌های پرستاری، زمان‌های ملاقات در منزل و اطلاعات پرونده‌تان را با آسودگی خاطر مدیریت کنید.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/booking"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-black text-[#1e5d48] shadow-md hover:bg-[#f2faf5] transition"
                    >
                      <span>ثبت نوبت جدید</span>
                      <ArrowLeft size={15} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => switchTab("appointments")}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
                    >
                      <span>مشاهده همه نوبت‌ها</span>
                    </button>
                  </div>
                </div>

                {/* Patient Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    icon={<CalendarDays size={20} />}
                    label="کل نوبت‌های ثبت‌شده"
                    value={appointments.length}
                    bg="#f0f7f3"
                    color="#2b7b64"
                  />
                  <StatCard
                    icon={<Clock3 size={20} />}
                    label="نوبت‌های پیش‌رو"
                    value={upcoming.length}
                    bg="#eff7f2"
                    color="#1e7359"
                  />
                  <StatCard
                    icon={<CalendarCheck size={20} />}
                    label="نوبت‌های تأیید شده"
                    value={appointments.filter((a) => a.status === "confirmed").length}
                    bg="#eaf5ed"
                    color="#206a53"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dcebe0] bg-white p-4 shadow-sm"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf5ec] text-[#3a805a]"><MapPin size={19} /></span><div className="min-w-0"><p className="text-xs font-extrabold text-[#24563c]">نشانی پیش‌فرض دریافت خدمت در محل</p><p className="mt-1 max-w-[420px] truncate text-[11px] text-[#849789]">{address || "هنوز نشانی ثبت نشده است؛ هنگام نیاز آن را اضافه کنید."}</p></div></div><button type="button" onClick={() => switchTab("address")} className="rounded-lg bg-[#eaf5ec] px-3 py-2 text-[11px] font-bold text-[#2d7553]">{address ? "ویرایش نشانی" : "افزودن نشانی"}</button></div>

                {/* Upcoming appointments quick card */}
                <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#edf4ef] pb-4">
                    <div>
                      <h2 className="text-sm font-black text-[#1a4a3c]">نوبت‌های پیش‌رو و آتی</h2>
                      <p className="mt-0.5 text-[11px] text-[#719283]">درخواست‌هایی که هنوز موعد آن‌ها فرانرسیده است</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchTab("appointments")}
                      className="flex items-center gap-1 text-xs font-black text-[#26735e] hover:text-[#184b3d]"
                    >
                      <span>فهرست کامل</span>
                      <ChevronLeft size={16} />
                    </button>
                  </div>

                  <div className="mt-5">
                    {upcoming.length ? (
                      <div className="space-y-3">
                        {upcoming.slice(0, 3).map((a) => (
                          <AppointmentCard key={a.id} a={a} busy={busy} onCancel={cancel} onReview={setReviewingId} onPrint={setPrintingId} reviewed={submittedReviews.includes(a.id)} clinicAddress={clinicAddress} />
                        ))}
                      </div>
                    ) : (
                      <EmptyAppointments />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: All Appointments with Filters */}
            {tab === "appointments" && (
              <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 sm:p-7 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf4ef] pb-5">
                  <div>
                    <h1 className="text-xl font-black text-[#194a3c]">تاریخچه نوبت‌های من</h1>
                    <p className="mt-1 text-xs text-[#719283]">
                      مجموع {toPersianDigits(appointments.length)} نوبت در پرونده سلامت شما ثبت شده است.
                    </p>
                  </div>

                  <Link
                    href="/booking"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#2c7f6b24]"
                  >
                    <Plus size={15} />
                    <span>نوبت جدید</span>
                  </Link>
                </div>

                {/* Filters */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {[
                      { id: "all", label: "همه" },
                      { id: "upcoming", label: "پیش‌رو" },
                      { id: "pending", label: "در انتظار بررسی" },
                      { id: "confirmed", label: "تأیید شده" },
                      { id: "done", label: "انجام شده" },
                      { id: "cancelled", label: "لغو شده" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilterStatus(f.id)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                          filterStatus === f.id
                            ? "bg-[#25735f] text-white shadow-sm"
                            : "bg-[#f2f7f4] text-[#557a6b] hover:bg-[#e4eee8]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative mr-auto min-w-[200px]">
                    <Search size={15} className="absolute right-3.5 top-2.5 text-[#9cb1a5]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="جستجوی متخصص یا کد..."
                      className="w-full rounded-xl border border-[#dcebe1] bg-[#fbfdfb] py-2 pr-9 pl-3 text-xs outline-none focus:border-[#7ec1a0]"
                    />
                  </div>
                </div>

                {/* Appointments List */}
                <div className="mt-6 space-y-3.5">
                  {filteredAppointments.length ? (
                    filteredAppointments.map((a) => (
                      <AppointmentCard key={a.id} a={a} busy={busy} onCancel={cancel} onReview={setReviewingId} onPrint={setPrintingId} reviewed={submittedReviews.includes(a.id)} clinicAddress={clinicAddress} />
                    ))
                  ) : (
                    <EmptyAppointments />
                  )}
                </div>

                <div className="mt-6 rounded-2xl bg-[#f5faf7] p-4 text-xs leading-6 text-[#587a6c]">
                  💡 <strong>قانون لغو آنلاین:</strong> امکان لغو اینترنتی نوبت تا ۲ ساعت پیش از ساعت مراجعه فعال است. برای لغو فوری در فواصل کمتر، لطفاً مستقیماً با پذیرش کلینیک تماس حاصل فرمایید.
                </div>
              </div>
            )}

            {tab === "address" && (
              <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-sm sm:p-7">
                <div className="flex items-center gap-3 border-b border-[#edf4ef] pb-5"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f5eb] text-[#37815c]"><MapPin size={23} /></span><div><h1 className="text-xl font-black text-[#194a3c]">نشانی من</h1><p className="mt-1 text-xs leading-6 text-[#719283]">نشانی پیش‌فرض فقط برای نوبت‌های «در محل شما» استفاده می‌شود.</p></div></div>
                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]"><form onSubmit={saveProfile} className="space-y-4"><label className="block text-xs font-bold text-[#446d5c]">نشانی محل دریافت خدمت<textarea rows={5} maxLength={500} value={address} onChange={event => setAddress(event.target.value)} placeholder="شهر، خیابان، کوچه، پلاک، طبقه و واحد..." className="booking-input resize-y" /></label><p className="text-[11px] leading-7 text-[#81998a]">در هر رزرو خدمت در محل می‌توانید نشانی آن نوبت را جداگانه تغییر دهید. برای مراجعه به کلینیک، این نشانی درخواست نمی‌شود.</p><button type="submit" disabled={busy} className="rounded-xl bg-[#287a5b] px-6 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال ذخیره..." : "ذخیره نشانی پیش‌فرض"}</button></form><aside className="self-start rounded-2xl border border-[#e2eee4] bg-[#f5faf6] p-5"><Building2 size={21} className="text-[#499168]" /><h2 className="mt-3 text-xs font-extrabold text-[#2b6347]">نشانی مرکز کلینیک</h2><p className="mt-2 text-xs leading-7 text-[#698572]">{clinicAddress || "نشانی مرکز هنوز تنظیم نشده است؛ پیش از مراجعه با پذیرش هماهنگ کنید."}</p></aside></div>
              </div>
            )}

            {/* TAB 3: Personal profile */}
            {tab === "profile" && (
              <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 sm:p-7 shadow-sm">
                <div className="border-b border-[#edf4ef] pb-4">
                  <h1 className="text-xl font-black text-[#194a3c]">مشخصات فردی</h1>
                  <p className="mt-1 text-xs text-[#719283]">نام و شمارهٔ حساب خود را مشاهده کنید. نشانی پیش‌فرض را از بخش «نشانی من» ویرایش کنید.</p>
                </div>

                <form onSubmit={saveProfile} className="mt-6 max-w-2xl space-y-4">
                  <label className="block text-xs font-bold text-[#446d5c]">
                    نام و نام خانوادگی بیمار
                    <input
                      required
                      minLength={2}
                      maxLength={150}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="booking-input"
                    />
                  </label>

                  <label className="block text-xs font-bold text-[#446d5c]">
                    شماره همراه (شناسه یکتای حساب)
                    <input value={patient.phone} dir="ltr" disabled className="booking-input" />
                    <span className="mt-1.5 block text-[11px] text-[#789b8d]">
                      شماره همراه شناسه ورود شماست. برای تغییر آن باید مالکیت شمارهٔ جدید تأیید شود.{" "}
                      {patient.phoneVerified ? "شماره فعلی تأیید شده است." : "مالکیت شماره نیازمند تأیید است."}
                    </span>
                  </label>

                  <button type="button" onClick={() => setChangingPhone(true)} className="block rounded-xl border border-[#cfe2d7] px-4 py-3 text-xs font-bold text-[#35725e]">تغییر امن شماره همراه</button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-7 py-3 text-xs font-black text-white shadow-md disabled:opacity-60"
                  >
                    {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
                  </button>
                </form>
              </div>
            )}

            {tab === "security" && (
              <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-sm sm:p-7">
                <div className="border-b border-[#edf4ef] pb-4"><h1 className="text-xl font-black text-[#194a3c]">امنیت حساب</h1><p className="mt-2 text-xs leading-7 text-[#719283]">ورود به حساب شما با کد یک‌بارمصرف شماره همراه انجام می‌شود و نیازی به تعیین رمز عبور نیست.</p></div>
                <div className="mt-6 max-w-xl space-y-4"><div className="flex items-start gap-3 rounded-2xl bg-[#edf7ef] p-4 text-xs leading-7 text-[#4b7659]"><ShieldCheck size={20} className="mt-0.5 shrink-0"/><p>کد ورود را با هیچ‌کس به اشتراک نگذارید. در صورت نگرانی درباره دسترسی دیگران، نشست دستگاه‌های قبلی را ببندید.</p></div><button type="button" onClick={revokeOtherSessions} disabled={busy} className="rounded-xl border border-[#cfe3d5] bg-white px-5 py-3 text-xs font-bold text-[#327355] disabled:opacity-50">{busy ? "در حال انجام..." : "خروج از دستگاه‌های دیگر"}</button></div>
              </div>
            )}
          </main>
        </div>
      </div>
      {reviewingAppointment && <ReviewDialog appointmentId={reviewingAppointment.id} doctorName={reviewingAppointment.doctorName} onClose={() => setReviewingId(null)} onSuccess={id => { setSubmittedReviews(previous => [...previous, id]); setReviewingId(null); setMessage("نظر شما ثبت شد و پس از تأیید مدیر در پروفایل متخصص نمایش داده می‌شود."); router.refresh(); }} />}
      {printingAppointment && <ReceiptPreview receipt={{ id: printingAppointment.id, patientName: printingAppointment.patientName, patientPhone: printingAppointment.patientPhone, doctorName: printingAppointment.doctorName, specialty: printingAppointment.specialty, date: printingAppointment.date, time: printingAppointment.time, visitType: printingAppointment.visitType, address: printingAppointment.address, status: printingAppointment.status, clinicName, clinicAddress, clinicPhone }} onClose={() => setPrintingId(null)} />}
      {changingPhone && <ChangePhoneDialog currentPhone={patient.phone} smsAvailable={smsAvailable} clinicPhone={clinicPhone} onClose={() => setChangingPhone(false)} onSuccess={() => { setChangingPhone(false); setMessage("شماره همراه با تأیید مالکیت تغییر کرد. ورودهای بعدی با شماره جدید انجام می‌شود."); router.refresh(); }} />}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  bg,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#e1ede5] bg-white p-4 sm:p-5 shadow-sm">
      <span
        style={{ background: bg, color: color }}
        className="grid h-12 w-12 place-items-center rounded-2xl shadow-sm"
      >
        {icon}
      </span>
      <div>
        <strong className="block text-2xl font-black text-[#1b4d3f]">{toPersianDigits(value)}</strong>
        <span className="text-xs font-bold text-[#719284]">{label}</span>
      </div>
    </div>
  );
}

function EmptyAppointments() {
  return (
    <div className="rounded-2xl border border-dashed border-[#dcebe1] bg-[#f9fcfa] px-4 py-12 text-center">
      <CalendarDays size={32} className="mx-auto text-[#9fc2b0]" />
      <p className="mt-3 text-sm font-bold text-[#476c5b]">نوبتی برای نمایش در این بخش یافت نشد.</p>
      <p className="mt-1 text-xs text-[#829e91]">می‌توانید همین حالا اولین نوبت آنلاین خود را ثبت کنید.</p>
      <Link
        href="/booking"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#287c69] px-5 py-2.5 text-xs font-black text-white shadow-sm"
      >
        <Plus size={15} />
        <span>رزرو نوبت جدید</span>
      </Link>
    </div>
  );
}

function AppointmentCard({
  a,
  busy,
  onCancel,
  onReview,
  onPrint,
  reviewed,
  clinicAddress,
}: {
  a: Appointment;
  busy: boolean;
  onCancel: (id: number) => void;
  onReview: (id: number) => void;
  onPrint: (id: number) => void;
  reviewed: boolean;
  clinicAddress: string;
}) {
  const meta = statusMap[a.status] || statusMap.pending;
  const now = iranNow();
  const canCancel = ["pending", "confirmed"].includes(a.status) && canCancelAppointment(a.date, a.time, now);

  return (
    <article className="rounded-2xl border border-[#e2ece5] bg-[#fbfdfb] p-4 sm:p-5 transition hover:border-[#b8ddcb] hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span className="relative h-13 w-13 shrink-0 overflow-hidden rounded-2xl bg-[#edf5f0]">
            <Image
              src={a.imageUrl || "/images/doctor-1.jpg"}
              alt={a.doctorName}
              fill
              unoptimized={!!a.imageUrl && !a.imageUrl.startsWith("/")}
              sizes="52px"
              className="object-cover"
            />
          </span>
          <div>
            <strong className="block text-sm font-black text-[#1b4d3f]">{a.doctorName}</strong>
            <span className="mt-0.5 block text-xs font-bold text-[#3d836e]">{a.specialty}</span>
          </div>
        </div>

        <span className={`inline-flex items-center rounded-xl border px-3 py-1 text-xs font-bold ${meta.style}`}>
          {meta.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#edf4ef] pt-3 text-xs text-[#5c8172]">
        <span className="flex items-center gap-1.5 font-bold">
          <CalendarDays size={14} className="text-[#3c9077]" />
          <span>{formatJalaliShort(a.date)}</span>
        </span>
        <span className="flex items-center gap-1.5 font-bold">
          <Clock3 size={14} className="text-[#3c9077]" />
          <span>ساعت {toPersianDigits(a.time)}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6ee] px-2.5 py-1 text-[11px] font-bold text-[#397356]">{a.visitType === "home" ? <MapPin size={13} /> : <Building2 size={13} />}{a.visitType === "home" ? "در محل شما" : "در کلینیک"}</span>
        <span className="text-[#8ba79b]">کد پیگیری: #{toPersianDigits(a.id)}</span>

        <div className="mr-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <button type="button" onClick={() => onPrint(a.id)} aria-label={`چاپ برگه نوبت ${toPersianDigits(a.id)}`} className="inline-flex items-center gap-1 rounded-lg border border-[#cfe2d7] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#35725e]"><Printer size={13} />چاپ برگه</button>
          {/* Quick re-book button */}
          <Link
            href={`/booking?doctor=${a.doctorId}`}
            className="flex items-center gap-1 rounded-lg border border-[#cfe2d7] bg-white px-2.5 py-1 text-[11px] font-bold text-[#35725e] hover:bg-[#edf7f2] transition"
          >
            <RotateCcw size={12} />
            <span>نوبت مجدد</span>
          </Link>

          {a.status === "done" && a.date <= now.date && !a.reviewStatus && !reviewed && (
            <button type="button" onClick={() => onReview(a.id)} className="inline-flex items-center gap-1 rounded-lg bg-[#eaf5eb] px-3 py-1.5 text-[11px] font-bold text-[#287552]"><MessageSquareQuote size={14} />ثبت نظر و امتیاز</button>
          )}
          {(reviewed || a.reviewStatus === "pending") && <span className="rounded-lg bg-[#fff5e8] px-2.5 py-1.5 text-[11px] font-bold text-[#a27132]">نظر در انتظار بررسی</span>}
          {a.reviewStatus === "approved" && <Link href={`/doctors/${a.doctorId}#reviews`} className="rounded-lg bg-[#e9f6ed] px-2.5 py-1.5 text-[11px] font-bold text-[#287552]">مشاهده نظر منتشرشده</Link>}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onCancel(a.id)}
              className="rounded-lg border border-[#fadad6] bg-[#fff5f4] px-2.5 py-1 text-[11px] font-bold text-[#b03d36] hover:bg-[#fdebe9] transition disabled:opacity-50"
            >
              لغو نوبت
            </button>
          )}
        </div>
      </div>

      {a.visitType === "home" && a.address && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-[#4c7564]">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#3c9077]" />
          <span>نشانی اعزام: {a.address}</span>
        </p>
      )}

      {a.visitType === "clinic" && clinicAddress && <p className="mt-3 flex items-start gap-1.5 text-xs text-[#4c7564]"><Building2 size={14} className="mt-0.5 shrink-0" />نشانی کلینیک: {clinicAddress}</p>}
      {a.note && (
        <p className="mt-1.5 rounded-xl bg-[#f4f8f5] p-2.5 text-xs leading-6 text-[#698c7e]">
          یادداشت شما: {a.note}
        </p>
      )}
    </article>
  );
}
