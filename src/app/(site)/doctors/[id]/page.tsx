import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, HeartHandshake, MapPin, MessageSquareQuote, ShieldCheck, Star } from "lucide-react";
import { db } from "@/db";
import { doctors, reviews } from "@/db/schema";
import { toPersianDigits, weekdayName } from "@/lib/date";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) return { title: "متخصص یافت نشد" };
  const [doctor] = await db.select({ name: doctors.name, specialty: doctors.specialty }).from(doctors).where(and(eq(doctors.id, id), eq(doctors.active, true))).limit(1);
  return doctor ? { title: `${doctor.name} | ${doctor.specialty}`, description: `پروفایل ${doctor.name}، برنامهٔ کاری، نظرهای تأییدشده و رزرو نوبت آنلاین.` } : { title: "متخصص یافت نشد" };
}

export default async function DoctorProfile({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [doctor] = await db.select().from(doctors).where(and(eq(doctors.id, id), eq(doctors.active, true))).limit(1);
  if (!doctor) notFound();
  const [reviewRows, [ratingStats]] = await Promise.all([
    db.select({ id: reviews.id, rating: reviews.rating, content: reviews.content, createdAt: reviews.createdAt })
      .from(reviews).where(and(eq(reviews.doctorId, id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt)).limit(30),
    db.select({ count: sql<number>`count(*)::int`, average: sql<number>`coalesce(round(avg(${reviews.rating})::numeric, 1), 0)::float` })
      .from(reviews).where(and(eq(reviews.doctorId, id), eq(reviews.status, "approved"))),
  ]);
  const count = Number(ratingStats?.count || 0);
  const average = Number(ratingStats?.average || 0);
  const weekdays = [6, 0, 1, 2, 3, 4, 5];

  return (
    <main id="main-content" className="bg-[#f7faf7] pb-28 lg:pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-xs text-[#819788]"><Link href="/" className="hover:text-[#277054]">خانه</Link><span>/</span><Link href="/#doctors" className="hover:text-[#277054]">متخصصان</Link><span>/</span><span className="font-bold text-[#37654a]">{doctor.name}</span></nav>
        <div className="mt-7 grid gap-7 lg:grid-cols-[300px_1fr]">
          <aside className="self-start overflow-hidden rounded-[28px] border border-[#dfece2] bg-white p-3 shadow-[0_15px_45px_rgba(31,73,48,.08)] lg:sticky lg:top-24">
            <div className="relative aspect-square overflow-hidden rounded-[20px] bg-[#e8f1e9]"><Image src={doctor.imageUrl || "/images/doctor-1.jpg"} alt={`تصویر ${doctor.name}`} fill unoptimized={!!doctor.imageUrl && !doctor.imageUrl.startsWith("/")} sizes="(max-width:1024px) 90vw, 300px" className="object-cover object-[center_28%]" /></div>
            <div className="px-3 pb-3 pt-5"><p className="text-xs font-bold text-[#77a487]">متخصص کلینیک آرامش</p><h1 className="mt-1 text-xl font-black text-[#204836]">{doctor.name}</h1><p className="mt-1 text-sm font-semibold text-[#50866a]">{doctor.specialty}</p>
              <div className="mt-5 flex items-center gap-2 border-t border-[#edf3ed] pt-4 text-xs text-[#708b79]"><Clock3 size={16} className="text-[#5a9971]" />{doctor.startTime} تا {doctor.endTime} · هر نوبت {toPersianDigits(doctor.slotMinutes)} دقیقه</div>
              <Link href={`/booking?doctor=${doctor.id}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#287c68] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#287c6830] transition hover:bg-[#1e6754]">رزرو نوبت با {doctor.name.split(" ").at(-1)} <ArrowLeft size={17} /></Link>
            </div>
          </aside>
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#205740] to-[#327e61] p-6 text-white sm:p-9"><div aria-hidden className="absolute -left-12 -top-12 h-44 w-44 rounded-full border-[20px] border-white/10" /><p className="text-xs font-bold text-[#c5e8d0]">آشنایی با متخصص</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">مراقبت حرفه‌ای، با همراهی انسانی</h2><p className="mt-4 max-w-2xl text-sm leading-8 text-[#e1f3e5]">{doctor.bio || `برای انتخاب زمان مناسب و دریافت خدمت ${doctor.specialty}، برنامهٔ کاری ${doctor.name} را بررسی کنید.`}</p><div className="mt-6 flex flex-wrap gap-3 text-xs"><span className="rounded-xl bg-white/15 px-4 py-2.5">{toPersianDigits(doctor.experienceYears)} سال سابقهٔ ثبت‌شده</span>{count > 0 && <span className="flex items-center gap-1 rounded-xl bg-white/15 px-4 py-2.5"><Star size={15} fill="currentColor" />{toPersianDigits(average)} از ۵ · {toPersianDigits(count)} نظر</span>}</div></section>
            <section className="grid gap-5 sm:grid-cols-2"><div className="rounded-[24px] border border-[#e2ece3] bg-white p-6"><div className="flex items-center gap-2 text-[#30785c]"><CalendarDays size={21} /><h2 className="text-sm font-black">روزهای حضور</h2></div><div className="mt-5 grid grid-cols-7 gap-1.5">{weekdays.map(day => <div key={day} className={`rounded-xl px-1 py-3 text-center text-[10px] font-bold ${doctor.workDays.includes(day) ? "bg-[#e8f5ea] text-[#27704f]" : "bg-[#f5f7f5] text-[#abb9ae]"}`}><span aria-label={`${weekdayName(day)}، ${doctor.workDays.includes(day) ? "روز کاری" : "بدون نوبت"}`}><span className="sm:hidden">{["ی", "د", "س", "چ", "پ", "ج", "ش"][day]}</span><span className="hidden sm:inline">{weekdayName(day)}</span></span><span aria-hidden className="mt-1 block text-base">{doctor.workDays.includes(day) ? "●" : "–"}</span></div>)}</div></div><div className="rounded-[24px] border border-[#e2ece3] bg-white p-6"><div className="flex items-center gap-2 text-[#30785c]"><HeartHandshake size={21} /><h2 className="text-sm font-black">شیوه‌های ارائهٔ خدمت</h2></div><div className="mt-5 space-y-3 text-xs leading-7 text-[#5d7866]">{doctor.visitModes.includes("clinic") && <p className="flex items-start gap-2 rounded-xl bg-[#f3f8f3] p-3"><HeartHandshake size={17} className="mt-1 shrink-0" />مراجعه به کلینیک؛ نشانی مرکز پس از هماهنگی پذیرش اعلام می‌شود.</p>}{doctor.visitModes.includes("home") && <p className="flex items-start gap-2 rounded-xl bg-[#f3f8f3] p-3"><MapPin size={17} className="mt-1 shrink-0" />مراقبت در محل شما؛ نشانی فقط هنگام انتخاب این شیوه در فرم پرسیده می‌شود.</p>}</div></div></section>
            <section id="reviews" className="rounded-[26px] border border-[#e2ece3] bg-white p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold text-[#6da47b]">تجربهٔ مراجعان</p><h2 className="mt-1 text-xl font-black text-[#204836]">نظرها دربارهٔ {doctor.name}</h2></div>{count > 0 && <span className="flex items-center gap-1.5 rounded-full bg-[#fff8e9] px-3 py-1.5 text-xs font-bold text-[#9d712c]"><Star size={15} fill="currentColor" />{toPersianDigits(average)} · {toPersianDigits(count)} نظر تأییدشده</span>}</div><p className="mt-3 flex items-start gap-2 text-xs leading-6 text-[#839889]"><ShieldCheck size={15} className="mt-1 shrink-0" />فقط مراجعه‌کنندگان دارای نوبت انجام‌شده می‌توانند نظر ثبت کنند؛ نظرها پس از بررسی مدیر نمایش داده می‌شوند.</p>
              {reviewRows.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{reviewRows.map(review => <article key={review.id} className="rounded-2xl border border-[#e7efe7] bg-[#fbfdfb] p-5"><div className="flex items-center justify-between gap-2"><span className="font-bold text-[#447453]">مراجعه‌کنندهٔ کلینیک</span><time className="text-xs text-[#9aae9c]">{review.createdAt.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" })}</time></div><div className="mt-3 flex gap-1 text-[#e2a745]" aria-label={`${toPersianDigits(review.rating)} ستاره از پنج`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={16} fill={i < review.rating ? "currentColor" : "none"} />)}</div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-8 text-[#526c59]">{review.content}</p></article>)}</div> : <div className="mt-6 rounded-2xl bg-[#f4f9f4] p-8 text-center text-sm text-[#7b9b82]"><MessageSquareQuote size={28} className="mx-auto mb-3 text-[#9ac3a1]" />هنوز نظری برای این متخصص منتشر نشده است.</div>}
              <Link href="/patient" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#36795a]">پس از دریافت خدمت، از حساب خود نظر ثبت کنید <ArrowRight size={15} /></Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
