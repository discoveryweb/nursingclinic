import Link from "next/link";
import { ArrowUpLeft, Award, Clock3, HeartPulse, MapPin, Phone, ShieldCheck } from "lucide-react";

export default function Footer({ settings }: { settings: Record<string, string> }) {
  const phone = settings.clinic_phone?.trim();
  const address = settings.clinic_address?.trim();
  const clinicName = settings.clinic_name || "کلینیک پرستاری آرامش";

  return (
    <footer id="contact" className="relative overflow-hidden bg-[#0f2e26] pb-28 pt-16 text-white lg:pb-10">
      <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#2a7a5e]/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#e9d8a8]/8 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.1fr] lg:px-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 group">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#7fc7a7] to-[#4a9e7a] text-[#0f3326] shadow-lg shadow-[#7fc7a7/20] transition-transform group-hover:scale-105"><HeartPulse size={25} /></span>
            <span><strong className="block text-[17px] font-black tracking-tight">{clinicName}</strong><small className="text-[11px] font-medium tracking-wide text-[#a8d5bc]">مراقبت حرفه‌ای • احترام به انتخاب شما</small></span>
          </Link>
          <p className="mt-5 max-w-sm text-[13px] leading-8 text-[#c8ddd2]">با انتخاب متخصص مناسب و زمان آزاد، درخواست مراقبت در منزل را به‌آسانی ثبت و از حساب شخصی خود پیگیری کنید.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-[#c8e5d0]"><ShieldCheck size={13}/> اطلاعات محفوظ</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-[#c8e5d0]"><Award size={13}/> کادر مجرب</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-[#c8e5d0]"><Clock3 size={13}/> پاسخ‌گویی سریع</span>
          </div>
        </div>

        <nav aria-label="پیوندهای پایین صفحه">
          <h3 className="mb-5 text-[13px] font-black tracking-wide text-white">دسترسی سریع</h3>
          <ul className="space-y-3 text-[13px] font-medium text-[#b8d5c4]">
            <li><Link className="inline-flex items-center gap-2 hover:text-white transition-colors" href="/#services">خدمات مراقبتی</Link></li>
            <li><Link className="inline-flex items-center gap-2 hover:text-white transition-colors" href="/#doctors">متخصصان و پرستاران</Link></li>
            <li><Link className="inline-flex items-center gap-2 hover:text-white transition-colors" href="/booking">رزرو آنلاین نوبت</Link></li>
            <li><Link className="inline-flex items-center gap-2 hover:text-white transition-colors" href="/patient/login">حساب مراجعه‌کننده</Link></li>
            <li><Link className="inline-flex items-center gap-2 hover:text-white transition-colors" href="/privacy">حریم خصوصی</Link></li>
            <li><Link className="inline-flex items-center gap-2 hover:text-white transition-colors" href="/terms">شرایط استفاده</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="mb-5 text-[13px] font-black tracking-wide text-white">ارتباط با پذیرش</h3>
          <div className="space-y-4 text-[13px] leading-7 text-[#c2d9cc]">
            {phone ? (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"><Phone size={18} className="shrink-0 text-[#7ec49e] group-hover:text-white" /><span dir="ltr" className="font-bold tracking-wide">{phone}</span><span className="mr-auto text-[10px] text-[#9ec2ad]">تماس مستقیم</span></a>
            ) : (
              <p className="text-[#a8c4b4]">شماره پذیرش پس از تنظیم در پنل نمایش داده می‌شود.</p>
            )}
            {address && <p className="flex items-start gap-2.5 leading-7"><MapPin size={16} className="mt-1 shrink-0 text-[#7ec49e]" />{address}</p>}
            <div className="flex items-center gap-2 text-[11px] text-[#9ec2ad]"><Clock3 size={14}/> ساعات پاسخ‌گویی: ۸:۰۰ تا ۱۹:۰۰ • هفت روز هفته</div>
            <Link href="/booking" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#e7f4e9] to-white px-6 py-3.5 text-[13px] font-black text-[#1a4d38] shadow-lg shadow-black/10 hover:shadow-xl hover:from-white hover:to-[#f0f7f1] transition-all">ثبت درخواست نوبت <ArrowUpLeft size={16} /></Link>
          </div>
        </div>
      </div>
      <div className="relative mx-auto mt-10 max-w-[1280px] flex flex-col gap-3 border-t border-white/10 px-5 pt-6 text-center sm:flex-row sm:justify-between sm:text-right lg:px-10">
        <p className="text-[11px] font-medium text-[#8fb8a3]">© {new Date().getFullYear()} کلینیک آرامش • تمامی حقوق محفوظ است. طراحی و توسعه با استانداردهای حرفه‌ای.</p>
        <p className="text-[11px] text-[#7fa89b]">پشتیبانی: بر اساس نوبت‌های ثبت‌شده در سامانه</p>
      </div>
    </footer>
  );
}
