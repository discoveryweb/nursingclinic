"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Check, Clock, Plus, Stethoscope, UserCheck, UserX, X } from "lucide-react";
import type { Doctor, VisitType } from "@/db/schema";
import { toPersianDigits } from "@/lib/date";

const WEEKDAYS = [
  { value: 6, label: "شنبه" },
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
];

type FormState = {
  id?: number;
  name: string;
  specialty: string;
  bio: string;
  imageUrl: string;
  experienceYears: number;
  workDays: number[];
  visitModes: VisitType[];
  startTime: string;
  endTime: string;
  slotMinutes: number;
  displayOrder: number;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  specialty: "",
  bio: "",
  imageUrl: "/images/doctor-1.jpg",
  experienceYears: 1,
  workDays: [6, 0, 1, 2, 3],
  visitModes: ["clinic", "home"],
  startTime: "09:00",
  endTime: "17:00",
  slotMinutes: 30,
  displayOrder: 0,
  active: true,
};

export default function DoctorsManager() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/doctors", { cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "دریافت متخصصان ناموفق بود.");
    if (!signal?.aborted) setDoctors(data.doctors ?? []);
    if (!signal?.aborted) setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => { void load(controller.signal).catch(() => setError("دریافت متخصصان ناموفق بود.")); }, 0);
    return () => { controller.abort(); window.clearTimeout(initialLoad); };
  }, [load]);

  function startAdd() {
    setForm(EMPTY_FORM);
    setError(null);
    setShowForm(true);
  }

  function startEdit(doctor: Doctor) {
    setForm({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      bio: doctor.bio,
      imageUrl: doctor.imageUrl,
      experienceYears: doctor.experienceYears,
      workDays: doctor.workDays,
      visitModes: doctor.visitModes,
      startTime: doctor.startTime,
      endTime: doctor.endTime,
      slotMinutes: doctor.slotMinutes,
      displayOrder: doctor.displayOrder,
      active: doctor.active,
    });
    setError(null);
    setShowForm(true);
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(day)
        ? f.workDays.filter((d) => d !== day)
        : [...f.workDays, day],
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.specialty.trim() || form.workDays.length === 0) {
      setError("نام، تخصص و حداقل یک روز کاری الزامی است.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = form.id ? `/api/admin/doctors/${form.id}` : "/api/admin/doctors";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ذخیره اطلاعات.");
        return;
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(doctor: Doctor) {
    setError(null);
    try {
      const response = await fetch(`/api/admin/doctors/${doctor.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !doctor.active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تغییر وضعیت ممکن نشد.");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "خطا در تغییر وضعیت متخصص."); }
  }

  async function removeDoctor(doctor: Doctor) {
    if (!confirm(`آیا از بایگانی ${doctor.name} مطمئن هستید؟ سوابق نوبت‌ها حفظ می‌شوند.`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/admin/doctors/${doctor.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "بایگانی ممکن نشد.");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "خطا در بایگانی متخصص."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#194a3c] sm:text-2xl">
            مدیریت کادر پرستاران و متخصصان
          </h1>
          <p className="mt-1 text-xs text-[#719284]">
            تعریف ساعات نوبت‌دهی، تخصص‌ها، روزهای کاری فعال و مدت هر ویزیت
          </p>
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#2c7f6b24]"
        >
          <Plus size={16} />
          <span>افزودن پرستار جدید</span>
        </button>
      </div>

      {error && !showForm && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700">{error}</div>}
      {loading ? (
        <div className="rounded-[24px] border border-[#dfece4] bg-white p-12 text-center text-xs text-[#8ca79b]">
          در حال دریافت اطلاعات کادر درمان...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <article
              key={doctor.id}
              className={`rounded-[24px] border p-5 shadow-sm transition hover:shadow-md ${
                doctor.active ? "border-[#e1ede5] bg-white" : "border-[#ecdcd8] bg-[#fdfaf9]"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#edf5f0]">
                  <Image
                    src={doctor.imageUrl || "/images/doctor-1.jpg"}
                    alt={doctor.name}
                    fill
                    unoptimized={!!doctor.imageUrl && !doctor.imageUrl.startsWith("/")}
                    sizes="64px"
                    className="object-cover"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-black text-[#1a4b3d]">{doctor.name}</strong>
                  <span className="mt-0.5 block truncate text-xs font-bold text-[#3e856f]">{doctor.specialty}</span>
                  <span className="mt-1 block text-[11px] text-[#719284]">
                    {toPersianDigits(doctor.experienceYears)} سال سابقه
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-black ${
                    doctor.active ? "bg-[#e5f6eb] text-[#21734e]" : "bg-[#fbe9e7] text-[#9c3f35]"
                  }`}
                >
                  {doctor.active ? "فعال" : "بایگانی"}
                </span>
              </div>

              <div className="mt-4 border-t border-[#edf4ef] pt-3 text-xs text-[#527768] space-y-1">
                <p className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[#3c9077]" />
                  <span>
                    ساعات کاری: <span dir="ltr">{doctor.startTime} تا {doctor.endTime}</span> ({toPersianDigits(doctor.slotMinutes)} دقیقه)
                  </span>
                </p>
                <p className="line-clamp-2 text-[11px] leading-6 text-[#719284]">
                  {doctor.bio || "بیوگرافی کوتاهی ثبت نشده است."}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf4ef] pt-3">
                <button
                  type="button"
                  onClick={() => startEdit(doctor)}
                  className="rounded-xl border border-[#cfe2d7] bg-[#f9fcfa] px-3.5 py-1.5 text-xs font-bold text-[#256f5c] hover:bg-white hover:border-[#8ec5ab] transition"
                >
                  ویرایش برنامه
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(doctor)}
                  className="rounded-xl border border-[#dfece4] px-3 py-1.5 text-xs font-bold text-[#557b6a] hover:bg-[#edf5f0] transition"
                >
                  {doctor.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                </button>
                <button
                  type="button"
                  onClick={() => removeDoctor(doctor)}
                  className="rounded-xl border border-[#fbd4cf] bg-[#fff5f4] px-3 py-1.5 text-xs font-bold text-[#b03d36] hover:bg-[#feebe9] transition"
                >
                  بایگانی
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#15382c]/45 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px] sm:p-8">
            <div className="flex items-center justify-between border-b border-[#edf4ef] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#154536]">
                  {form.id ? "ویرایش مشخصات و ساعات پرستار" : "افزودن پرستار / متخصص جدید"}
                </h2>
                <p className="mt-0.5 text-xs text-[#719284]">
                  برنامه زمانی و تخصص در فرم رزرو آنلاین به مراجعین نمایش داده خواهد شد.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-[#7a9a8d] hover:bg-[#f0f5f2]"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div role="alert" className="mt-4 rounded-2xl border border-[#f5cfcc] bg-[#fff5f4] p-3 text-xs leading-6 text-[#b03d36]">
                {error}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#446d5c]">نام و نام خانوادگی</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: خانم سارا کریمی"
                  className="booking-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#446d5c]">عنوان تخصص پزشکی / پرستاری</label>
                <input
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  placeholder="مثال: کارشناس مراقبت نوزاد و مادر"
                  className="booking-input"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#446d5c]">بیوگرافی و شرح سوابق</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={2}
                  placeholder="توضیح کوتاه درباره مهارت‌ها و دوره‌های گذرانده..."
                  className="booking-input resize-y"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#446d5c]">مسیر تصویر پروفایل</label>
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="booking-input"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#446d5c]">سابقه (سال)</label>
                  <input
                    type="number"
                    value={form.experienceYears}
                    onChange={(e) => setForm({ ...form, experienceYears: Number(e.target.value) })}
                    className="booking-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#446d5c]">ساعت شروع</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="booking-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#446d5c]">ساعت پایان</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="booking-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[#446d5c]">مدت زمان هر نوبت (دقیقه)</label>
                <input
                  type="number"
                  value={form.slotMinutes}
                  onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })}
                  className="booking-input"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#446d5c]">روزهای کاری فعال در هفته:</label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        form.workDays.includes(d.value)
                          ? "bg-[#287c69] text-white shadow-sm"
                          : "bg-[#f2f7f4] text-[#557b6b] hover:bg-[#e4eee8]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-[#446d5c]">شیوهٔ ارائه خدمت (حداقل یکی را انتخاب کنید)</p>
                <div className="grid grid-cols-2 gap-2">
                  {([{ value: "clinic", label: "در کلینیک" }, { value: "home", label: "در محل مراجعه‌کننده" }] as const).map(mode => (
                    <button key={mode.value} type="button" onClick={() => setForm(current => ({ ...current, visitModes: current.visitModes.includes(mode.value) ? current.visitModes.filter(value => value !== mode.value) : [...current.visitModes, mode.value] }))} className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${form.visitModes.includes(mode.value) ? "border-[#4a9a70] bg-[#e9f6ed] text-[#286b4e]" : "border-[#dbe8df] text-[#718877]"}`} aria-pressed={form.visitModes.includes(mode.value)}>{mode.label}</button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-[#3d6554]">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-[#bedcca] accent-[#287c69]"
                />
                <span>نمایش به عنوان متخصص فعال در سایت</span>
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3 border-t border-[#edf4ef] pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[#cfe2d7] px-5 py-2.5 text-xs font-bold text-[#4c7565]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-7 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-60"
              >
                <Check size={16} />
                <span>{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
