"use client";

import { Building2, Check, MapPin } from "lucide-react";
import type { VisitType } from "@/db/schema";

export default function VisitTypePicker({
  modes,
  value,
  onChange,
  clinicAddress,
}: {
  modes: VisitType[];
  value: VisitType | null;
  onChange: (mode: VisitType) => void;
  clinicAddress: string;
}) {
  const options = [
    {
      mode: "clinic" as const,
      icon: Building2,
      title: "مراجعه به کلینیک",
      description: clinicAddress ? `در نشانی مرکز: ${clinicAddress}` : "نشانی مرکز پس از هماهنگی پذیرش اعلام می‌شود.",
    },
    {
      mode: "home" as const,
      icon: MapPin,
      title: "خدمت در محل شما",
      description: "پرستار به نشانی‌ای که در مرحلهٔ بعد ثبت می‌کنید مراجعه می‌کند.",
    },
  ].filter(option => modes.includes(option.mode));
  return (
    <fieldset className="mt-7">
      <legend className="text-sm font-extrabold text-[#2c5849]">۱. محل دریافت خدمت را انتخاب کنید</legend>
      <p className="mt-1 text-xs leading-6 text-[#84998a]">نشانی منزل فقط برای خدمت در محل دریافت می‌شود.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map(option => {
          const selected = option.mode === value;
          return (
            <button
              type="button"
              key={option.mode}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.mode)}
              className={`relative flex min-h-[110px] items-start gap-3 rounded-2xl border-2 p-4 text-right transition-all duration-200 active:scale-[.99] ${selected ? "border-[#398971] bg-[#eef8f0] shadow-sm" : "border-[#e5eee7] bg-white hover:border-[#acd4b6] hover:bg-[#fbfdfb]"}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-[#d4eee0] text-[#287b59]" : "bg-[#f1f6f2] text-[#70a184]"}`}><option.icon size={20} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-[#234f3b]">{option.title}</strong><span className="mt-1 block text-[11px] leading-6 text-[#718f7d]">{option.description}</span></span>
              {selected && <Check size={17} className="shrink-0 text-[#277d5c]" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
