export const PERMISSIONS = [
  { key: "appointments.view", label: "مشاهده نوبت‌ها" },
  { key: "appointments.manage", label: "تأیید و لغو نوبت‌ها" },
  { key: "patients.view", label: "مشاهده فهرست بیماران" },
  { key: "patients.verify_phone", label: "تأیید تلفنی شماره بیمار" },
  { key: "doctors.manage", label: "مدیریت متخصصان" },
  { key: "reviews.manage", label: "تأیید و حذف نظرهای مراجعین" },
  { key: "notifications.view", label: "مشاهده اعلان‌ها و پیامک‌ها" },
  { key: "settings.manage", label: "تنظیمات کلینیک" },
  { key: "audit.view", label: "گزارش فعالیت‌ها" },
] as const;
export type Permission = (typeof PERMISSIONS)[number]["key"];
export const ROLE_LABELS: Record<string, string> = { super_admin: "مدیر ارشد", admin: "مدیر", secretary: "منشی", specialist: "متخصص" };
export const ROLE_DEFAULTS: Record<string, string[]> = {
  admin: ["appointments.view", "appointments.manage", "patients.view", "patients.verify_phone", "doctors.manage", "reviews.manage", "notifications.view", "settings.manage", "audit.view"],
  secretary: ["appointments.view", "appointments.manage", "patients.view", "notifications.view"],
  specialist: ["appointments.view"],
};
