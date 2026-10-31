import Image from "next/image";
import Link from "next/link";
import { ArrowUpLeft, CalendarDays, Clock3, HeartHandshake, MapPin } from "lucide-react";
import type { Doctor } from "@/db/schema";
import { toPersianDigits } from "@/lib/date";
const weekdays: Record<number, string> = { 0: "ی", 1: "د", 2: "س", 3: "چ", 4: "پ", 5: "ج", 6: "ش" };

export default function DoctorCard({ doctor }: { doctor: Doctor; index?: number }) {
  const days = [...doctor.workDays].sort((a, b) => a - b);
  return (
    <article className="group h-full overflow-hidden rounded-[24px] border border-[#e1ebe3] bg-white p-3 shadow-[0_8px_30px_rgba(31,75,45,.045)] transition duration-300 hover:-translate-y-1.5 hover:border-[#c7dfcb] hover:shadow-[0_19px_42px_rgba(31,75,45,.12)]">
      <Link href={`/doctors/${doctor.id}`} aria-label={`مشاهده پروفایل ${doctor.name}`} className="relative block h-[225px] overflow-hidden rounded-[17px] bg-[#edf5ef]">
        <Image src={doctor.imageUrl || "/images/doctor-1.jpg"} alt={`تصویر ${doctor.name}`} fill unoptimized={!!doctor.imageUrl && !doctor.imageUrl.startsWith("/")} sizes="(max-width:640px) 92vw, (max-width:1024px) 46vw, 30vw" className="object-cover object-[center_28%] transition-transform duration-700 group-hover:scale-[1.045]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#183d2d]/50 via-transparent to-transparent" />
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#367b68]">مشاهده پروفایل</span>
        {doctor.experienceYears > 0 && <span className="absolute bottom-3 right-4 text-xs font-bold text-white">{toPersianDigits(doctor.experienceYears)} سال سابقه</span>}
      </Link>
      <div className="px-2 pb-2 pt-4">
        <Link href={`/doctors/${doctor.id}`} className="text-[15px] font-extrabold text-[#1e4837] hover:text-[#39866c]">{doctor.name}</Link>
        <p className="mt-1 text-xs font-bold text-[#6b9677]">{doctor.specialty}</p>
        <p className="mt-3 line-clamp-2 min-h-[44px] text-[11px] leading-6 text-[#87988c]">{doctor.bio || "برنامهٔ کاری و زمان‌های آزاد این متخصص را در پروفایل مشاهده کنید."}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#689076]">
          {doctor.visitModes.includes("clinic") && <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5f0] px-2.5 py-1"><HeartHandshake size={12} />در کلینیک</span>}
          {doctor.visitModes.includes("home") && <span className="inline-flex items-center gap-1 rounded-full bg-[#eef5f0] px-2.5 py-1"><MapPin size={12} />در محل شما</span>}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#edf2ed] pt-4">
          <div className="flex items-center gap-1"><CalendarDays size={14} className="text-[#78a987]" />{days.map(day => <span key={day} className="grid h-5 w-5 place-items-center rounded-full bg-[#f0f7f0] text-[9px] font-bold text-[#699178]">{weekdays[day]}</span>)}</div>
          <Link href={`/booking?doctor=${doctor.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#eaf5ec] px-3 py-2 text-[11px] font-extrabold text-[#317455] transition hover:bg-[#2e7958] hover:text-white">رزرو نوبت <ArrowUpLeft size={14} /></Link>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-[#9caf9d]"><Clock3 size={12} />ساعات کاری: {doctor.startTime} تا {doctor.endTime}</div>
      </div>
    </article>
  );
}
