"use client";

import Link from "next/link";
import { ArrowRight, Printer } from "lucide-react";

export default function PrintActions() {
  return <div className="print-toolbar mx-auto mb-5 flex max-w-[760px] flex-wrap items-center justify-between gap-3"><Link href="/patient" className="inline-flex items-center gap-2 text-xs font-bold text-[#47735a]"><ArrowRight size={16} />بازگشت به حساب من</Link><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#287456] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#1d5b41]"><Printer size={16} />چاپ یا ذخیرهٔ PDF</button></div>;
}
