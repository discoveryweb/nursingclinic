import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
export const metadata: Metadata = { title: "شرایط استفاده", description: "شرایط ثبت و پیگیری درخواست نوبت در سامانه کلینیک آرامش." };
const sections = [
  { title: "ثبت درخواست و تأیید نهایی", text: "ثبت آنلاین، زمان انتخابی را برای دیگران می‌بندد و درخواست را برای بررسی پذیرش ارسال می‌کند. تا زمانی که وضعیت در حساب به تأییدشده تغییر نکرده است، هماهنگی نهایی را قطعی تلقی نکنید. برگهٔ چاپ، رسید ثبت درخواست است و تأیید پرداخت یا خدمت نیست." },
  { title: "خدمت در کلینیک یا در محل", text: "هنگام رزرو، شیوهٔ ارائهٔ خدمت را از گزینه‌های فعال هر متخصص انتخاب کنید. برای خدمت در محل، واردکردن نشانی کامل الزامی است؛ برای مراجعه به کلینیک، نشانی بیمار درخواست نمی‌شود. نشانی مرکز، اگر ثبت شده باشد، در رسید و حساب بیمار نمایش داده می‌شود." },
  { title: "ورود و ثبت تلفنی", text: "پیش از رزرو آنلاین، ورود با کد یک‌بارمصرف و تأیید مالکیت شماره انجام می‌شود. پذیرش مجاز می‌تواند نوبت تلفنی را روی زمان آزاد ثبت کند؛ اطلاعات نوبت‌های تلفنی پس از تأیید مالکیت شماره به حساب بیمار متصل می‌شوند. ارسال پیامک به فعال‌بودن درگاه بستگی دارد." },
  { title: "نظرهای مراجعین", text: "ثبت نظر فقط برای بیمار صاحب نوبتِ انجام‌شده امکان‌پذیر است. متن‌های نامناسب، شماره تماس یا پیوند از نظر حذف می‌شوند و نظرها قبل از نمایش عمومی بررسی می‌شوند. مدیر مجاز می‌تواند نظر را حذف کند." },
  { title: "لغو و پیگیری", text: "نوبت آینده را تا دو ساعت پیش از زمان مراجعه از حساب خود می‌توانید لغو کنید. برای تغییر نزدیک به نوبت با پذیرش تماس بگیرید. اگر پیامک به دستتان نرسید، وضعیت را از حساب خود بررسی کنید." },
  { title: "حدود خدمت", text: "این وب‌سایت ابزار هماهنگی و نوبت‌دهی است، نه جایگزین تشخیص یا خدمت اورژانسی. در شرایط اضطراری با اورژانس ۱۱۵ تماس بگیرید." },
];
export default function TermsPage() {
  return <main id="main-content" className="mx-auto min-h-[65vh] max-w-4xl px-5 py-14 lg:py-20"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf5eb] text-[#5e9a70]"><ClipboardList size={23} /></span><div><p className="section-kicker">شفافیت خدمات</p><h1 className="section-title mt-1">شرایط استفاده</h1></div></div><p className="mt-5 text-xs leading-8 text-[#829388]">لطفاً این موارد را پیش از ثبت یا پیگیری درخواست نوبت مطالعه کنید.</p><div className="mt-6 space-y-4">{sections.map((section, index) => <section key={section.title} className="rounded-2xl border border-[#e7eee8] bg-white p-5 sm:p-6"><h2 className="text-sm font-extrabold text-[#315c44]">{index + 1}. {section.title}</h2><p className="mt-2 text-xs leading-8 text-[#829388]">{section.text}</p></section>)}</div></main>;
}
