import type { NextConfig } from "next";

// Global security response headers (Phase 7D — ISO 27001 hardening).
// NOTE: we set `frame-ancestors 'self'` (clickjacking protection) rather than a
// full resource-restricting Content-Security-Policy. A strict script-src/
// frame-src/connect-src CSP would need to allowlist Razorpay checkout, Supabase
// Realtime (wss), Supabase Storage, YouTube embeds and SCORM iframes — shipping
// that without browser verification risks breaking payments/realtime/embeds.
// Tracked as a follow-up to roll out a full CSP behind report-only first.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
