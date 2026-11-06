import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aramashclinic.example";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "کلینیک پرستاری آرامش | مراقبت در منزل", template: "%s | کلینیک آرامش" },
  description: "مشاهده متخصصان پرستاری، انتخاب زمان‌های آزاد و ثبت و پیگیری درخواست مراقبت در منزل از طریق حساب مراجعه‌کننده.",
  applicationName: "کلینیک پرستاری آرامش",
  keywords: ["کلینیک پرستاری", "پرستاری در منزل", "رزرو نوبت پرستار", "مراقبت در منزل"],
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "fa_IR", siteName: "کلینیک پرستاری آرامش", title: "کلینیک پرستاری آرامش | مراقبت در منزل", description: "متخصص مناسب را انتخاب کنید، زمان آزاد را ببینید و نوبت خود را آنلاین پیگیری کنید.", url: siteUrl },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
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
