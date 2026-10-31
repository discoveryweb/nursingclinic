import Link from "next/link";
import { ArrowUpLeft, HeartPulse, MapPin, Phone, ShieldCheck } from "lucide-react";

export default function Footer({ settings }: { settings: Record<string, string> }) {
  const phone = settings.clinic_phone?.trim();
  const address = settings.clinic_address?.trim();
  const clinicName = settings.clinic_name || "کلینیک پرستاری آرامش";

  return (
    <footer id="contact" className="relative overflow-hidden bg-[#143b30] pb-28 pt-16 text-white lg:pb-9">
      <div aria-hidden className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#38876c]/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-5 sm:grid-cols-2 lg:grid-cols-[1.25fr_0.8fr_1fr] lg:px-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#7fc7a7] text-[#174f3b]"><HeartPulse size={25} /></span>
            <span><strong className="block text-lg font-black">{clinicName}</strong><small className="text-[11px] text-[#b2d3bd]">مراقبت، با احترام به انتخاب شما</small></span>
          </Link>
          <p className="mt-5 max-w-sm text-xs leading-8 text-[#bfd4c6]">متخصص مناسب را پیدا کنید، نوبت آزاد را انتخاب کنید و درخواست خود را از حساب شخصی پیگیری کنید.</p>
          <p className="mt-5 flex items-start gap-2 text-[11px] leading-6 text-[#b0cfb9]"><ShieldCheck size={17} className="mt-0.5 shrink-0" /> اطلاعات نوبت شما فقط در اختیار کارکنان دارای مجوز قرار می‌گیرد.</p>
        </div>

        <nav aria-label="پیوندهای پایین صفحه">
          <h3 className="mb-5 text-sm font-extrabold">دسترسی سریع</h3>
          <ul className="space-y-3 text-xs font-medium text-[#bed5c6]">
            <li><Link className="hover:text-white" href="/#services">خدمات مراقبتی</Link></li>
            <li><Link className="hover:text-white" href="/#doctors">متخصصان و پرستاران</Link></li>
            <li><Link className="hover:text-white" href="/booking">رزرو آنلاین نوبت</Link></li>
            <li><Link className="hover:text-white" href="/patient/login">حساب مراجعه‌کننده</Link></li>
            <li><Link className="hover:text-white" href="/privacy">حریم خصوصی</Link></li>
            <li><Link className="hover:text-white" href="/terms">شرایط استفاده</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="mb-5 text-sm font-extrabold">ارتباط با پذیرش</h3>
          <div className="space-y-4 text-xs leading-7 text-[#bed5c6]">
            {phone ? (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-white"><Phone size={16} className="shrink-0 text-[#85c6a4]" /><span dir="ltr">{phone}</span></a>
            ) : (
              <p>شماره پذیرش پس از تنظیم در پنل کلینیک نمایش داده می‌شود.</p>
            )}
            {address && <p className="flex items-start gap-2"><MapPin size={16} className="mt-1 shrink-0 text-[#85c6a4]" />{address}</p>}
            <Link href="/booking" className="inline-flex items-center gap-2 rounded-xl bg-[#e7f4e9] px-5 py-3 font-bold text-[#246849] transition hover:bg-white">ثبت درخواست نوبت <ArrowUpLeft size={15} /></Link>
          </div>
        </div>
      </div>
      <div className="relative mx-auto mt-12 max-w-[1280px] border-t border-white/10 px-5 pt-6 text-center text-[11px] text-[#9dbdac] lg:px-10">© کلینیک آرامش · همراه شما در مسیر مراقبت</div>
    </footer>
  );
}
