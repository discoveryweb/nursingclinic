import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "کلینیک پرستاری آرامش | مراقبت در منزل", template: "%s | کلینیک آرامش" },
  description: "مشاهده متخصصان پرستاری، انتخاب زمان‌های آزاد و ثبت و پیگیری درخواست مراقبت در منزل از طریق حساب مراجعه‌کننده.",
  applicationName: "کلینیک پرستاری آرامش",
  keywords: ["کلینیک پرستاری", "پرستاری در منزل", "رزرو نوبت پرستار", "مراقبت در منزل"],
  robots: { index: false, follow: false },
  openGraph: { type: "website", locale: "fa_IR", siteName: "کلینیک پرستاری آرامش", title: "کلینیک پرستاری آرامش | مراقبت در منزل", description: "متخصص مناسب را انتخاب کنید، زمان آزاد را ببینید و نوبت خود را آنلاین پیگیری کنید." },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-[#fbfdfb] font-sans text-slate-800 antialiased">
        <a href="#main-content" className="skip-link">رفتن به محتوای اصلی</a>
        {children}
      </body>
    </html>
  );
}
