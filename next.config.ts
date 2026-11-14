import type { NextConfig } from "next";

const securityHeaders = [
  // A response is only ever what its content type says: no guessing a script out of a JSON or audio answer.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // A case link is a secret. Other sites never learn it from the address of the page a visitor came from.
  { key: "Referrer-Policy", value: "same-origin" },
  // No other site may show these pages inside a frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // The pages use none of these.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  // The container runs the traced server; native/Vercel builds keep their current mode.
  ...(process.env.KAVERI_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // Cache Components is off on purpose: case pages read live storage on every request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
