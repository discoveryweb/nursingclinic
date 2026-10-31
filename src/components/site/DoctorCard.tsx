import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, BadgeCheck, CalendarDays, Clock3, HeartHandshake, MapPin, Star } from "lucide-react";
import type { Doctor } from "@/db/schema";
import { toPersianDigits } from "@/lib/date";
const weekdays: Record<number, string> = { 0: "ی", 1: "د", 2: "س", 3: "چ", 4: "پ", 5: "ج", 6: "ش" };

export default function DoctorCard({ doctor }: { doctor: Doctor; index?: number }) {
  const days = [...doctor.workDays].sort((a, b) => a - b);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[#e1ebe3] bg-white p-3 shadow-[0_8px_28px_rgba(22,60,40,.05)] transition-all duration-300 hover:-translate-y-2 hover:border-[#b8d8bf] hover:shadow-[0_20px_48px_rgba(18,54,36,.11)]">
      <Link href={`/doctors/${doctor.id}`} aria-label={`مشاهده پروفایل ${doctor.name}`} className="relative block h-[228px] overflow-hidden rounded-[18px] bg-gradient-to-br from-[#edf5ef] to-[#e2efe6]">
        <Image src={doctor.imageUrl || "/images/doctor-1.jpg"} alt={`تصویر ${doctor.name}`} fill unoptimized={!!doctor.imageUrl && !doctor.imageUrl.startsWith("/")} sizes="(max-width:640px) 92vw, (max-width:1024px) 46vw, 30vw" className="object-cover object-[center_26%] transition-transform duration-700 group-hover:scale-[1.05]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2e26]/60 via-[#0f2e26]/10 to-transparent" />
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#2b6b56] shadow-md">
          <BadgeCheck size={13} className="text-[#3a9b6e]"/> پروفایل
        </span>
        {doctor.experienceYears > 0 && <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-[#0f2e26]/85 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur"><Star size={12} className="fill-[#e9c27a] text-[#e9c27a]"/>{toPersianDigits(doctor.experienceYears)} سال تجربه</span>}
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-3 pt-4">
        <Link href={`/doctors/${doctor.id}`} className="text-[15px] font-black leading-6 text-[#143d30] hover:text-[#2d7a5e] transition-colors line-clamp-1">{doctor.name}</Link>
        <p className="mt-1 text-[12px] font-bold text-[#5a8a70]">{doctor.specialty}</p>
        <p className="mt-3 line-clamp-2 min-h-[44px] text-[11.5px] leading-6 text-[#7a9588]">{doctor.bio || "برای مشاهده برنامهٔ کاری و رزرو زمان آزاد، وارد پروفایل شوید."}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {doctor.visitModes.includes("clinic") && <span className="inline-flex items-center gap-1 rounded-full border border-[#e0ece3] bg-[#f4f9f5] px-3 py-1 text-[10px] font-bold text-[#4a7a5e]"><HeartHandshake size={12} />کلینیک</span>}
          {doctor.visitModes.includes("home") && <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e0] px-3 py-1 text-[10px] font-bold text-[#3a6b4a]"><MapPin size={12} />اعزام به منزل</span>}
        </div>
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2 border-t border-[#edf2ed] pt-3.5">
            <div className="flex items-center gap-1"><CalendarDays size={13} className="text-[#7ab293]" />{days.map(day => <span key={day} className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#f0f7f0] text-[10px] font-black text-[#5e9270]">{weekdays[day]}</span>)}</div>
            <Link href={`/booking?doctor=${doctor.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1f5c46] px-4 py-2 text-[11px] font-black text-white shadow-md hover:bg-[#143d2e] transition-colors">رزرو <ArrowUpLeft size={13} /></Link>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium text-[#9ab3a0]"><Clock3 size={11} />{toPersianDigits(doctor.startTime)} تا {toPersianDigits(doctor.endTime)}</div>
        </div>
      </div>
    </article>
  );
}
