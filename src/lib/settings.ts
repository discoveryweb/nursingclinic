import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MOCK_SETTINGS } from "@/lib/preview-data";
export const SETTINGS_KEYS = { secretaryPhone: "secretary_phone", clinicName: "clinic_name", clinicPhone: "clinic_phone", clinicAddress: "clinic_address" } as const;
const DEFAULTS: Record<string,string> = { secretary_phone: "", clinic_name: "کلینیک پرستاری آرامش", clinic_phone: "", clinic_address: "" };
export async function getSetting(key: string) {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key,key)).limit(1);
    return row?.value ?? MOCK_SETTINGS[key] ?? DEFAULTS[key] ?? "";
  } catch {
    return MOCK_SETTINGS[key] ?? DEFAULTS[key] ?? "";
  }
}
export async function getAllSettings() {
  try {
    const rows = await db.select().from(settings);
    const map = { ...DEFAULTS, ...MOCK_SETTINGS };
    for (const row of rows) map[row.key] = row.value;
    // Override with real values if DB has them (even empty strings should be kept if intentionally set, but we keep mock as fallback)
    for (const row of rows) if (row.value) map[row.key] = row.value;
    return map;
  } catch {
    return { ...DEFAULTS, ...MOCK_SETTINGS };
  }
}
export async function setSetting(key: string, value: string) { await db.insert(settings).values({key,value,updatedAt:new Date()}).onConflictDoUpdate({target:settings.key,set:{value,updatedAt:new Date()}}); }
