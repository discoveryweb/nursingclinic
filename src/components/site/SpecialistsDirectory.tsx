"use client";

import { useMemo, useState } from "react";
import { Building2, MapPin, Search, SlidersHorizontal, UsersRound, X } from "lucide-react";
import type { Doctor } from "@/db/schema";
import { toPersianDigits } from "@/lib/date";
import DoctorCard from "@/components/site/DoctorCard";
import Reveal from "@/components/site/Reveal";

type Mode = "all" | "clinic" | "home";
function normalize(value: string) { return value.toLocaleLowerCase("fa").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim(); }

export default function SpecialistsDirectory({ doctors }: { doctors: Doctor[] }) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const visible = useMemo(() => {
    const query = normalize(search);
    return doctors.filter(doctor => (mode === "all" || doctor.visitModes.includes(mode)) && (!query || normalize(`${doctor.name} ${doctor.specialty} ${doctor.bio}`).includes(query)));
  }, [doctors, search, mode]);
  const filters: { value: Mode; label: string; Icon: typeof UsersRound }[] = [
    { value: "all", label: "همه متخصصان", Icon: UsersRound },
    { value: "clinic", label: "در کلینیک", Icon: Building2 },
    { value: "home", label: "در محل شما", Icon: MapPin },
  ];
  return <div>
    <div className="mt-8 rounded-[22px] border border-[#e1ede4] bg-white p-3 shadow-[0_8px_30px_rgba(31,75,45,.035)] sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block min-w-0 flex-1"><span className="sr-only">جست‌وجوی متخصص یا تخصص</span><Search size={18} className="pointer-events-none absolute right-4 top-3.5 text-[#93ad9d]"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="جست‌وجوی نام یا تخصص موردنظر..." className="h-12 w-full rounded-xl border border-[#e4eee7] bg-[#f9fcf9] py-3 pr-11 pl-10 text-sm text-[#345c45] outline-none transition placeholder:text-[#a5b7aa] focus:border-[#87bd9b] focus:ring-4 focus:ring-[#eaf6ec]"/>{search && <button type="button" onClick={() => setSearch("")} aria-label="پاک کردن جست‌وجو" className="absolute left-3 top-3 grid h-6 w-6 place-items-center rounded-lg text-[#8aa392]"><X size={15}/></button>}</label>
        <div className="grid grid-cols-3 gap-1.5 sm:flex" role="group" aria-label="فیلتر محل ارائهٔ خدمت">{filters.map(filter => <button key={filter.value} type="button" aria-pressed={mode === filter.value} onClick={() => setMode(filter.value)} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[11px] font-bold transition sm:px-4 ${mode === filter.value ? "bg-[#2b795e] text-white shadow-sm" : "bg-[#f2f7f3] text-[#688676] hover:bg-[#e8f3eb]"}`}><filter.Icon size={15} className="shrink-0"/><span>{filter.label}</span></button>)}</div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 px-1 text-[11px] text-[#8ca395]"><span className="inline-flex items-center gap-1"><SlidersHorizontal size={13}/> {toPersianDigits(visible.length)} متخصص در این انتخاب</span>{(search || mode !== "all") && <button type="button" onClick={() => { setSearch(""); setMode("all"); }} className="font-bold text-[#4b8b6d]">پاک‌کردن فیلترها</button>}</div>
    </div>
    {visible.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map((doctor, index) => <Reveal key={doctor.id} delay={Math.min(index, 5) * 45}><DoctorCard doctor={doctor}/></Reveal>)}</div> : <div className="mt-5 rounded-[22px] border border-dashed border-[#cfe2d3] bg-white px-5 py-12 text-center"><Search size={26} className="mx-auto text-[#a0c4a8]"/><p className="mt-3 text-sm font-bold text-[#577c62]">متخصصی با این شرایط پیدا نشد.</p><p className="mt-1 text-xs leading-6 text-[#95a99b]">واژهٔ دیگری جست‌وجو کنید یا فیلترها را تغییر دهید.</p><button type="button" onClick={() => { setSearch(""); setMode("all"); }} className="mt-4 rounded-xl bg-[#edf7ef] px-5 py-2.5 text-xs font-bold text-[#397d5a]">نمایش همهٔ متخصصان</button></div>}
  </div>;
}
