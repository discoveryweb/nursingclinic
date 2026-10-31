import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const frameAncestors = process.env.CLINIC_FRAME_ANCESTORS?.trim();
// Leave embedding configurable so managed previews can work; production operators
// should explicitly restrict ancestors to 'self' or their trusted preview host.
const safeFrameAncestors = frameAncestors && /^[a-zA-Z0-9'*.\-:/ ]+$/.test(frameAncestors) ? frameAncestors : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(safeFrameAncestors ? [`frame-ancestors ${safeFrameAncestors}`] : []),
].join("; ");
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ...(!isDevelopment ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/api/:path*", "/booking/:path*", "/patient/:path*", "/admin/:path*", "/secretary/:path*", "/specialist/:path*"].map(source => ({ source, headers: [{ key: "Cache-Control", value: "no-store, private" }] })),
    ];
  },
};
export default nextConfig;
