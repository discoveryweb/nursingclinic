"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus, ShieldCheck, UserCog, UserX, X } from "lucide-react";
import { PERMISSIONS, ROLE_DEFAULTS, ROLE_LABELS } from "@/lib/permissions";

type Staff = {
  id: number;
  name: string;
  username: string;
  role: string;
  permissions: string[];
  doctorId: number | null;
  phone: string;
  active: boolean;
  mustChangePassword: boolean;
};

type Doctor = { id: number; name: string; specialty: string };

type Form = {
  id?: number;
  name: string;
  username: string;
  role: string;
  permissions: string[];
  doctorId: number | null;
  phone: string;
  active: boolean;
  password: string;
};

const empty = (): Form => ({
  name: "",
  username: "",
  role: "secretary",
  permissions: [...ROLE_DEFAULTS.secretary],
  doctorId: null,
  phone: "",
  active: true,
  password: "",
});

export default function StaffManager() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    const [staffResponse, doctorResponse] = await Promise.all([
      fetch("/api/admin/staff", { cache: "no-store", signal }),
      fetch("/api/admin/doctors", { cache: "no-store", signal }),
    ]);
    const staffData = await staffResponse.json();
    const doctorData = await doctorResponse.json();
    if (!staffResponse.ok || !doctorResponse.ok) throw new Error(staffData.error || doctorData.error || "دریافت اطلاعات کاربران ناموفق بود.");
    if (!signal?.aborted) { setStaff(staffData.staff || []); setDoctors(doctorData.doctors || []); setError(""); setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(() => { void load(controller.signal).catch(error => { if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "دریافت اطلاعات کاربران ناموفق بود."); setLoading(false); } }); }, 0);
    return () => { controller.abort(); window.clearTimeout(initialLoad); };
  }, [load]);

  function edit(s: Staff) {
    setError("");
    setForm({
      id: s.id,
      name: s.name,
      username: s.username,
      role: s.role,
      permissions: s.permissions,
      doctorId: s.doctorId,
      phone: s.phone,
      active: s.active,
      password: "",
    });
  }

  function toggle(p: string) {
    if (!form) return;
    let list = form.permissions.includes(p)
      ? form.permissions.filter((x) => x !== p)
      : [...form.permissions, p];
    if (p === "appointments.manage" && list.includes(p) && !list.includes("appointments.view")) {
      list.push("appointments.view");
    }
    if (p === "appointments.view" && !list.includes(p)) {
      list = list.filter((x) => x !== "appointments.manage");
    }
    setForm({ ...form, permissions: list });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(form.id ? `/api/admin/staff/${form.id}` : "/api/admin/staff", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "ذخیره ناموفق بود.");
        return;
      }
      setForm(null);
      await load();
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#194a3c] sm:text-2xl">
            تعیین و مدیریت سطوح دسترسی کاربران (مخصوص مدیر ارشد)
          </h1>
          <p className="mt-1 text-xs text-[#719284]">
            ایجاد حساب کاربری برای منشی‌ها، پزشکان، کارشناسان پذیرش و تخصیص دانه‌بندی‌شده مجوزها
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("");
            setForm(empty());
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#2c7f6b24]"
        >
          <Plus size={16} />
          <span>افزودن کاربر جدید کادر</span>
        </button>
      </div>

      {error && !form && (
        <div role="alert" className="rounded-2xl border border-[#f5cfcc] bg-[#fff5f4] p-4 text-xs text-[#b03d36]">
          {error}
        </div>
      )}

      {/* Staff Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="col-span-full rounded-[24px] border border-[#dfece4] bg-white p-12 text-center text-xs text-[#8ca79b]">
            در حال دریافت فهرست کاربران و نقش‌ها...
          </div>
        ) : (
          staff.map((s) => (
            <article
              key={s.id}
              className={`rounded-[24px] border p-5 shadow-sm transition hover:shadow-md ${
                s.active ? "border-[#e1ede5] bg-white" : "border-[#ecdcd8] bg-[#fdfaf9]"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#edf7f1] text-[#2f836b]">
                  <UserCog size={22} />
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[10.5px] font-black ${
                    s.active ? "bg-[#e5f6eb] text-[#21734e]" : "bg-[#fbe9e7] text-[#9c3f35]"
                  }`}
                >
                  {s.active ? "حساب فعال" : "غیرفعال‌شده"}
                </span>
              </div>

              <div className="mt-4">
                <strong className="block text-base font-black text-[#1a4b3d]">{s.name}</strong>
                <p className="mt-1 text-xs font-bold text-[#628777]">
                  نقش: <span className="text-[#1c5040]">{ROLE_LABELS[s.role] || s.role}</span>
                  <span className="mx-1.5 text-[#a8c2b5]">•</span>
                  <span dir="ltr">{s.username}</span>
                </p>
                {s.phone && (
                  <p className="mt-1 text-xs text-[#719284]" dir="ltr">
                    تلفن اعلان: {s.phone}
                  </p>
                )}
              </div>

              <div className="mt-4 rounded-xl bg-[#f7faf8] p-3 text-[11px] leading-6 text-[#527768]">
                {s.role === "super_admin" ? (
                  <span className="font-bold text-[#1f664f]">دسترسی نامحدود به تمامی بخش‌ها و تنظیمات ارشد</span>
                ) : (
                  <span>
                    مجوزها: {s.permissions.length} مجوز فعال (
                    {s.permissions
                      .map((p) => PERMISSIONS.find((x) => x.key === p)?.label || p)
                      .slice(0, 3)
                      .join("، ")}
                    {s.permissions.length > 3 && " و..."})
                  </span>
                )}
              </div>

              {s.role !== "super_admin" && (
                <button
                  type="button"
                  onClick={() => edit(s)}
                  className="mt-4 w-full rounded-xl border border-[#cfe2d7] bg-[#f9fcfa] py-2.5 text-xs font-bold text-[#297360] hover:bg-white hover:border-[#8ec5ab] transition"
                >
                  ویرایش سطح دسترسی و مشخصات
                </button>
              )}
            </article>
          ))
        )}
      </div>

      {/* Edit / Create Modal Dialog */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#15382c]/45 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px] sm:p-8">
            <div className="flex items-center justify-between border-b border-[#edf4ef] pb-4">
              <div>
                <h2 className="text-lg font-black text-[#154536]">
                  {form.id ? "ویرایش مشخصات و دسترسی‌های کاربر" : "افزودن کاربر جدید به کادر کلینیک"}
                </h2>
                <p className="mt-0.5 text-xs text-[#719284]">
                  کاربر با این نام کاربری و رمز موقت وارد خواهد شد و در اولین ورود رمز را تغییر می‌دهد.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="بستن پنجره"
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

            <form onSubmit={save} className="mt-5 space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="text-xs font-bold text-[#446d5c]">
                  نام و نام خانوادگی
                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="booking-input"
                    placeholder="مثال: مریم محمدی"
                  />
                </label>

                <label className="text-xs font-bold text-[#446d5c]">
                  نام کاربری انگلیسی
                  <input
                    required
                    disabled={!!form.id}
                    dir="ltr"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                    className="booking-input"
                    placeholder="maryam_nurse"
                  />
                </label>

                <label className="text-xs font-bold text-[#446d5c]">
                  نقش سازمانی
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role: e.target.value,
                        permissions: [...(ROLE_DEFAULTS[e.target.value] || [])],
                        doctorId: null,
                      })
                    }
                    className="booking-input"
                  >
                    <option value="admin">مدیر داخلی کلینیک</option>
                    <option value="secretary">منشی و مسئول پذیرش</option>
                    <option value="specialist">متخصص / پرستار اعزامی</option>
                  </select>
                </label>

                <label className="text-xs font-bold text-[#446d5c]">
                  شماره موبایل جهت دریافت پیامک نوبت
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    dir="ltr"
                    inputMode="tel"
                    placeholder="09123456789"
                    className="booking-input"
                  />
                </label>

                {form.role === "specialist" && (
                  <label className="text-xs font-bold text-[#446d5c] sm:col-span-2">
                    اتصال به پروفایل درمانگر
                    <select
                      value={form.doctorId || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          doctorId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      required
                      className="booking-input"
                    >
                      <option value="">انتخاب متخصص از کادر درمانی</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.specialty})
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[10.5px] font-normal text-[#719284]">
                      متخصص فقط به کارتابل و نوبت‌های اختصاص داده شده به خود دسترسی خواهد داشت.
                    </span>
                  </label>
                )}

                <label className="text-xs font-bold text-[#446d5c] sm:col-span-2">
                  {form.id ? "تنظیم مجدد رمز موقت (اختیاری)" : "رمز عبور موقت اولیه"}
                  <input
                    type="password"
                    required={!form.id}
                    minLength={form.id ? undefined : 8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password"
                    className="booking-input"
                    placeholder="حداقل ۸ کاراکتر"
                  />
                </label>
              </div>

              {/* Permission Matrix */}
              <div className="rounded-2xl border border-[#dfece4] bg-[#f8fbf9] p-4">
                <h3 className="text-xs font-black text-[#1b5040]">مجوزهای دسترسی این کاربر:</h3>
                <p className="mt-0.5 text-[11px] text-[#719284]">
                  سطح دسترسی را دقیقاً بر اساس وظایف پرسنل فعال یا غیرفعال فرمایید.
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {PERMISSIONS.filter(
                    (p) =>
                      (form.role === "admin" || p.key !== "reviews.manage") &&
                      (form.role !== "specialist" || ["appointments.view", "appointments.manage"].includes(p.key))
                  ).map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-xs font-bold text-[#3d6554]">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p.key)}
                        onChange={() => toggle(p.key)}
                        className="h-4 w-4 rounded border-[#bedcca] accent-[#287c69]"
                      />
                      <span>{p.label}</span>
                    </label>
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
                <span>حساب کاربری فعال باشد (امکان ورود به پنل)</span>
              </label>

              <div className="flex justify-end gap-3 border-t border-[#edf4ef] pt-4">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="rounded-xl border border-[#cfe2d7] px-5 py-2.5 text-xs font-bold text-[#4c7565]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-7 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-60"
                >
                  <Check size={16} />
                  <span>{busy ? "در حال ذخیره..." : "ثبت و اعمال دسترسی‌ها"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
