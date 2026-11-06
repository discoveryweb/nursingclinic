import type { MetadataRoute } from "next";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://aramashclinic.example";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/booking`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    if (!process.env.DATABASE_URL) return staticRoutes;
    const rows = await db.select({ id: doctors.id, updated: doctors.createdAt }).from(doctors).where(eq(doctors.active, true));
    const doctorRoutes: MetadataRoute.Sitemap = rows.map(r => ({
      url: `${base}/doctors/${r.id}`,
      lastModified: r.updated || now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
    return [...staticRoutes, ...doctorRoutes];
  } catch {
    return staticRoutes;
  }
}
