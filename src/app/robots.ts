import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://aramashclinic.example";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/patient/", "/api/", "/secretary/", "/specialist/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
