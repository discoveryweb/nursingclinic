"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, HeartPulse, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

type Area = "admin" | "secretary" | "specialist";
const titles: Record<Area, string> = { admin: "پنل مدیریت", secretary: "پنل پذیرش و منشی", specialist: "پنل متخصصان" };
export default function PortalLogin({ area }: { area: Area }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password, area }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "ورود ناموفق بود."); return; }
      router.replace(result.mustChangePassword ? "/admin/change-password" : "/admin"); router.refresh();
    } catch { setError("ارتباط با سرور برقرار نشد."); }
    finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_#e7f3e9_0%,_#f4faf5_52%,_#edf5f0_100%)] p-4 sm:p-6 lg:p-9"><div className="relative mx-auto grid w-full max-w-[1160px] overflow-hidden rounded-[30px] border border-white bg-white shadow-[0_30px_90px_rgba(27,73,52,.14)] lg:min-h-[680px] lg:grid-cols-2"><section className="flex flex-col px-6 py-7 sm:px-12 lg:px-16"><div className="flex items-center justify-between"><Link href="/" className="flex items-center gap-2.5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#36876c] to-[#205e4b] text-white"><HeartPulse size={23}/></span><span className="text-lg font-black text-[#225643]">آرامش</span></Link><Link href="/" className="flex items-center gap-1 text-xs font-bold text-[#88a493]"><ArrowRight size={15}/> بازگشت به خانه</Link></div><div className="my-auto w-full max-w-[390px] py-10 lg:py-14"><span className="inline-flex items-center gap-2 rounded-full border border-[#dfefe4] bg-[#f4faf5] px-3 py-2 text-[11px] font-bold text-[#609477]"><ShieldCheck size={15}/> ورود محافظت‌شده و امن</span><h1 className="mt-5 text-2xl font-black text-[#214b3c]">{titles[area]}</h1><p className="mt-2 text-sm leading-7 text-[#91a49a]">برای ادامه، از اطلاعات ورود اختصاصی خود استفاده کنید.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-xs font-bold text-[#5b7b6a]">نام کاربری<span className="relative mt-2 block"><input required value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" dir="ltr" className="w-full rounded-xl border border-[#e0ece4] bg-[#fbfdfb] px-4 py-3.5 pr-11 text-sm outline-none focus:border-[#8bc5a5]"/><UserRound size={17} className="absolute right-4 top-3.5 text-[#a3b8aa]"/></span></label><label className="block text-xs font-bold text-[#5b7b6a]">رمز عبور<span className="relative mt-2 block"><input required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" type={show ? "text" : "password"} dir="ltr" className="w-full rounded-xl border border-[#e0ece4] bg-[#fbfdfb] px-11 py-3.5 text-sm outline-none focus:border-[#8bc5a5]"/><LockKeyhole size={17} className="absolute right-4 top-3.5 text-[#a3b8aa]"/><button type="button" onClick={() => setShow(!show)} aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"} className="absolute left-4 top-3.5 text-[#9caf9f]">{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>{error && <p role="alert" className="rounded-xl bg-[#fff5f4] p-3 text-xs leading-6 text-[#b35750]">{error}</p>}<button type="button" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-l from-[#34856a] to-[#24674f] py-4 text-sm font-extrabold text-white disabled:opacity-60">{loading ? "در حال ورود..." : "ورود به حساب"}<ArrowLeft size={17}/></button></form></div><p className="text-xs text-[#b0beb4]">کلینیک پرستاری آرامش · همراه شما</p></section><section className="relative hidden min-h-[680px] overflow-hidden bg-[#e6f2e9] lg:block"><Image src="/images/hero.jpg" fill priority alt="مراقبت پرستاری در آرامش خانه" className="object-cover" sizes="50vw"/><div className="absolute inset-0 bg-gradient-to-t from-[#153f32]/90 via-[#214a39]/10 to-transparent"/><div className="absolute inset-x-0 bottom-0 p-12 text-white"><h2 className="text-3xl font-black leading-[1.7]">مراقبت خوب،<br/>از همراهی خوب شروع می‌شود.</h2><p className="mt-3 text-sm leading-8 text-white/80">فضای اختصاصی کادر درمان و پذیرش</p></div></section></div></main>;
}
