"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardList, PhoneCall, Search, UsersRound } from "lucide-react";
import PatientLoginCodeDialog from "@/components/admin/PatientLoginCodeDialog";

type Patient = { id: number; name: string; phone: string; phoneVerified: boolean; address: string; createdAt: string };
type Log = { id: number; actor: string; action: string; detail: string; createdAt: string };

export default function RecordsList({ type }: { type: "patients" | "audit" }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canVerify, setCanVerify] = useState(false);
  const [showLoginCode, setShowLoginCode] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(type === "patients" ? "/api/admin/patients" : "/api/admin/audit", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    if (type === "patients") {
      setPatients(d.patients || []);
      setCanVerify(!!d.canVerify);
    } else {
      setLogs(d.logs || []);
    }
  }, [type]);

  useEffect(() => {
    let active = true;
    const initialLoad = window.setTimeout(() => {
      load().catch(() => { if (active) setError("دریافت اطلاعات ناموفق بود."); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(initialLoad); };
  }, [load]);

  const filteredPatients = patients.filter((p) => `${p.name} ${p.phone}`.includes(search));
  const filteredLogs = logs.filter((l) => `${l.actor} ${l.action} ${l.detail}`.includes(search));

  async function verifyPhone(patient: Patient) {
    if (!confirm(`آیا با ${patient.phone} تماس گرفته‌اید و هویت صاحب شماره را بررسی کرده‌اید؟`)) return;
    const reason = prompt("نتیجه تماس یا دلیل تأیید را ثبت کنید:");
    if (!reason || reason.trim().length < 8) {
      setError("توضیح تأیید باید حداقل ۸ نویسه باشد.");
      return;
    }
    setBusy(patient.id);
    setError("");
    try {
      const r = await fetch(`/api/admin/patients/${patient.id}/verify-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "phone_call", reason: reason.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تأیید تلفنی ناموفق بود.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-black text-[#2c5c48] sm:text-2xl">{type === "patients" ? "مراجعین کلینیک" : "گزارش فعالیت‌ها"}</h1>{type === "patients" && canVerify && <button type="button" onClick={() => setShowLoginCode(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#287a5b] px-4 py-3 text-xs font-bold text-white"><PhoneCall size={16}/> صدور کد ورود تلفنی</button>}</div>
      <p className="mt-2 text-xs leading-6 text-[#9caf9f]">
        {type === "patients"
          ? "حساب‌های مراجعین پس از ورود با کد یک‌بارمصرف ساخته می‌شوند. اطلاعات تماس فقط برای کادر مجاز نمایش داده می‌شود."
          : "رویدادهای مدیریتی و تغییر دسترسی‌های سامانه"}
      </p>
      <div className="relative mt-6 max-w-md">
        <Search size={17} className="absolute right-4 top-3.5 text-[#a3b9a9]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو..."
          className="w-full rounded-xl border border-[#e2eee4] bg-white py-3 pr-11 pl-4 text-xs outline-none focus:border-[#9dcdb0]"
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-600">
          {error}
        </p>
      )}
      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-xs text-[#9cb1a2]">در حال دریافت اطلاعات...</p>
        ) : type === "patients" ? (
          filteredPatients.length ? (
            filteredPatients.map((p) => (
              <article key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e5eee7] bg-white p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#edf7f0] text-[#75ad8b]">
                  <UsersRound size={20} />
                </span>
                <div className="min-w-[150px] flex-1">
                  <p className="text-xs font-extrabold text-[#4b725a]">{p.name}</p>
                  <p className="mt-1 text-[11px] text-[#9cb1a1]" dir="ltr">
                    {p.phone}
                  </p>
                  <span className={`mt-1 inline-block text-[10px] ${p.phoneVerified ? "text-[#65a27d]" : "text-[#c59c66]"}`}>
                    {p.phoneVerified ? "شماره تأیید شده" : "شماره تأیید نشده"}
                  </span>
                </div>
                <p className="max-w-xs text-[11px] leading-6 text-[#9cb1a1]">{p.address || "آدرسی ثبت نشده"}</p>
                {!p.phoneVerified && canVerify && (
                  <button
                    disabled={busy === p.id}
                    onClick={() => verifyPhone(p)}
                    className="flex items-center gap-1.5 rounded-lg bg-[#edf8ef] px-3 py-2 text-[10px] font-bold text-[#4c9067] disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {busy === p.id ? "در حال ثبت..." : "تأیید پس از تماس"}
                  </button>
                )}
                <span className="text-[10px] text-[#b0beb3]">
                  {new Date(p.createdAt).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" })}
                </span>
              </article>
            ))
          ) : (
            <Empty />
          )
        ) : filteredLogs.length ? (
          filteredLogs.map((l) => (
            <article key={l.id} className="flex gap-3 rounded-2xl border border-[#e5eee7] bg-white p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf7f0] text-[#75ad8b]">
                <ClipboardList size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#4b725a]">{l.action}</p>
                <p className="mt-1 text-[11px] leading-6 text-[#9cb1a1]">
                  {l.actor} {l.detail && `· ${l.detail}`}
                </p>
              </div>
              <span className="text-[10px] text-[#b0beb3]">
                {new Date(l.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
              </span>
            </article>
          ))
        ) : (
          <Empty />
        )}
      </div>
      {showLoginCode && <PatientLoginCodeDialog onClose={() => setShowLoginCode(false)} />}
    </div>
  );
}

function Empty() {
  return <div className="rounded-2xl border border-[#e5eee7] bg-white py-12 text-center text-xs text-[#a0b3a4]">موردی برای نمایش وجود ندارد.</div>;
}
