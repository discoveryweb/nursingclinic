// Content checks are intentionally performed server-side. A word list is only a
// first line of defence; all accepted submissions still require human approval.
const blockedTerms = [
  "کسکش", "کصکش", "کیر", "کص", "جنده", "کون", "گوه", "گایید",
  "گاییدن", "حرومزاده", "حرامزاده", "بی ناموس", "بیشرف", "بی شرف",
  "بیشعور", "بی شعور", "فاحشه", "لاشی", "عوضی", "مادرجنده",
  "fuck", "fucking", "shit", "bitch", "motherfucker",
];

function compact(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ۀة]/g, "ه")
    .replace(/[\u0640\u064b-\u065f\u0670\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

const normalizedTerms = blockedTerms.map(compact);

export function reviewContentError(input: string): string | null {
  const text = input.trim();
  if (text.length < 12 || text.length > 600) {
    return "لطفاً تجربه‌تان را در ۱۲ تا ۶۰۰ نویسه بنویسید.";
  }
  const normalized = compact(text);
  if (normalizedTerms.some((word) => normalized.includes(word))) {
    return "متن نظر حاوی واژهٔ نامناسب است. لطفاً آن را محترمانه بازنویسی کنید.";
  }
  const numericText = text
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/(?<=\d)[\s().-]+(?=\d)/g, "");
  if (/https?:\/\/|www\.|\b\S+@\S+\.\S+\b/i.test(text) || /(?:\+?98|0)9\d{9}/.test(numericText)) {
    return "برای حفظ حریم خصوصی، لینک، ایمیل یا شماره تلفن را در متن نظر وارد نکنید.";
  }
  if (/[<>]/.test(text)) {
    return "از نشانه‌های نامعتبر در متن نظر استفاده نکنید.";
  }
  return null;
}
