import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
export const SETTINGS_KEYS = { secretaryPhone: "secretary_phone", clinicName: "clinic_name", clinicPhone: "clinic_phone", clinicAddress: "clinic_address" } as const;
const DEFAULTS: Record<string,string> = { secretary_phone: "", clinic_name: "کلینیک پرستاری آرامش", clinic_phone: "", clinic_address: "" };
export async function getSetting(key: string) { const [row] = await db.select().from(settings).where(eq(settings.key,key)).limit(1); return row?.value ?? DEFAULTS[key] ?? ""; }
export async function getAllSettings() { const rows = await db.select().from(settings); const map = {...DEFAULTS}; for (const row of rows) map[row.key] = row.value; return map; }
export async function setSetting(key: string, value: string) { await db.insert(settings).values({key,value,updatedAt:new Date()}).onConflictDoUpdate({target:settings.key,set:{value,updatedAt:new Date()}}); }
