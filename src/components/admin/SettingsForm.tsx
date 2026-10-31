"use client";

import { useEffect, useState } from "react";
import { Check, Info, MessageSquare, PhoneCall, Save, ShieldCheck } from "lucide-react";

export default function SettingsForm() {
  const [form, setForm] = useState({
    secretary_phone: "",
    clinic_name: "",
    clinic_phone: "",
    clinic_address: "",
  });
  const [configured, setConfigured] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error();
        setForm((f) => ({ ...f, ...d.settings }));
        setConfigured(!!d.smsConfigured);
        setProviderName(d.smsProvider || "");
      })
      .catch(() => setError("دریافت تنظیمات ناموفق بود."))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "خطا در ذخیره تنظیمات.");
        return;
      }
      setMessage("تنظیمات با موفقیت ذخیره شد و در تمامی بخش‌های سایت و اعلان‌ها اعمال گردید.");
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-[#194a3c] sm:text-2xl">
          تنظیمات عمومی کلینیک و درگاه پیامک
        </h1>
        <p className="mt-1 text-xs text-[#719284]">
          مدیریت شماره تلفن همراه منشی جهت دریافت بلادرنگ پیامک‌های رزرو، مشخصات نمایشی و نشانی
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-[#dfece4] bg-white p-12 text-center text-xs text-[#8ca79b]">
          در حال بارگذاری اطلاعات تنظیمات...
        </div>
      ) : (
        <div className="grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Settings Form */}
          <form
            onSubmit={save}
            className="space-y-4 rounded-[26px] border border-[#dfece4] bg-white p-6 sm:p-7 shadow-sm"
          >
            {error && (
              <div role="alert" className="rounded-2xl border border-[#f5cfcc] bg-[#fff5f4] p-3 text-xs leading-6 text-[#b03d36]">
                {error}
              </div>
            )}
            {message && (
              <div role="status" className="rounded-2xl border border-[#c9ecd5] bg-[#eaf6ee] p-3 text-xs leading-6 text-[#1b6b4a]">
                {message}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#446d5c]">
                شماره موبایل منشی برای دریافت فوری پیامک نوبت‌های جدید
                <input
                  dir="ltr"
                  inputMode="tel"
                  value={form.secretary_phone}
                  onChange={(e) => setForm({ ...form, secretary_phone: e.target.value })}
                  placeholder="09123456789"
                  className="booking-input"
                />
              </label>
              <span className="mt-1.5 block text-[11px] text-[#789b8d]">
                به محض ثبت هر نوبت توسط بیمار، پیامکی شامل مشخصات بیمار، ساعت و پزشک به این شماره ارسال خواهد شد.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#446d5c]">
                نام رسمی کلینیک
                <input
                  value={form.clinic_name}
                  onChange={(e) => setForm({ ...form, clinic_name: e.target.value })}
                  className="booking-input"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#446d5c]">
                تلفن تماس ثابت کلینیک (نمایش در هدر و فوتر سایت)
                <input
                  dir="ltr"
                  value={form.clinic_phone}
                  onChange={(e) => setForm({ ...form, clinic_phone: e.target.value })}
                  placeholder="021-22000000"
                  className="booking-input"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#446d5c]">
                نشانی مرکز و دفتر مرکزی اعزام پرستاران
                <textarea
                  rows={3}
                  value={form.clinic_address}
                  onChange={(e) => setForm({ ...form, clinic_address: e.target.value })}
                  placeholder="تهران، خیابان ولیعصر، نرسیده به توانیر..."
                  className="booking-input resize-y"
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-[#2c7f6b] to-[#1c5d4d] px-7 py-3 text-xs font-black text-white shadow-md disabled:opacity-60"
              >
                <Save size={16} />
                <span>{busy ? "در حال ذخیره..." : "ذخیره تغییرات تنظیمات"}</span>
              </button>
            </div>
          </form>

          {/* SMS Status & Server Guide Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-[24px] border border-[#dfece4] bg-white p-5 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#edf7f1] text-[#2f836b]">
                <MessageSquare size={20} />
              </span>
              <h3 className="mt-3.5 text-xs font-black text-[#1a4b3d]">وضعیت درگاه پیامک ملی‌پیامک (Melipayamak)</h3>

              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${
                    configured ? "bg-[#e5f6eb] text-[#1c694a]" : "bg-[#fef3db] text-[#8e6318]"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${configured ? "bg-[#10b981]" : "bg-[#f59e0b]"}`} />
                  <span>{configured ? `درگاه پیامک فعال: ${providerName || "ملی‌پیامک"}` : "درگاه پیامکی هنوز تنظیم نشده"}</span>
                </span>
              </div>

              <p className="mt-3 text-[11px] leading-6 text-[#5b8070]">
                برای ارسال پیامک به منشی و بیماران، متغیرهای{" "}
                <code className="rounded bg-[#f0f4f2] px-1 py-0.5 text-[10px]" dir="ltr">
                  MELIPAYAMAK_USERNAME
                </code>{" "}
                و{" "}
                <code className="rounded bg-[#f0f4f2] px-1 py-0.5 text-[10px]" dir="ltr">
                  MELIPAYAMAK_PASSWORD
                </code>{" "}
                و شماره خط فرستنده{" "}
                <code className="rounded bg-[#f0f4f2] px-1 py-0.5 text-[10px]" dir="ltr">
                  MELIPAYAMAK_FROM
                </code>{" "}
                را در متغیرهای هاست Runflare وارد نمایید. جهت عبور از بلک‌لیست مخابرات برای کدهای ورود، شناسه قالب خدماتی را در{" "}
                <code className="rounded bg-[#f0f4f2] px-1 py-0.5 text-[10px]" dir="ltr">
                  MELIPAYAMAK_OTP_BODY_ID
                </code>{" "}
                قرار دهید.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#d2ebdc] bg-gradient-to-br from-[#f2f8f4] to-[#e4f3ea] p-5">
              <ShieldCheck size={20} className="text-[#2c7f6b]" />
              <h4 className="mt-2 text-xs font-black text-[#1b5040]">امنیت داده‌ها</h4>
              <p className="mt-1 text-[11px] leading-6 text-[#527768]">
                اطلاعات تماس و نشانی بیماران منحصراً برای اعضای دارای مجوز سازمانی مجاز در دسترس است.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
