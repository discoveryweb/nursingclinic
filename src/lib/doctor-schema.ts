import { z } from "zod";

export const doctorSchema = z.object({
  name: z.string().trim().min(2).max(150),
  specialty: z.string().trim().min(2).max(150),
  bio: z.string().trim().max(1000).default(""),
  imageUrl: z.string().trim().max(500).refine(
    value => !value || /^\/(?!\/)/.test(value) || /^https:\/\//.test(value),
    "مسیر تصویر معتبر نیست.",
  ).default(""),
  experienceYears: z.coerce.number().int().min(0).max(60).default(0),
  workDays: z.array(z.number().int().min(0).max(6)).min(1),
  visitModes: z.array(z.enum(["clinic", "home"])).min(1, "حداقل یک شیوه ارائه خدمت انتخاب کنید.").max(2).refine(
    modes => new Set(modes).size === modes.length,
    "شیوه‌های ارائه خدمت تکراری است.",
  ).default(["clinic", "home"]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  slotMinutes: z.coerce.number().int().min(10).max(180).default(30),
  active: z.boolean().default(true),
  displayOrder: z.coerce.number().int().default(0),
}).refine(data => data.startTime < data.endTime, { message: "ساعت پایان باید بعد از ساعت شروع باشد." });
