import type { NextConfig } from "next";

/**
 * What a page may ask the browser for. Everything is off except the microphone, which the site's own pages may use:
 * the chat with AIDaddy records a voice note between two taps on its microphone button, and with the microphone off
 * the browser refused it before asking the visitor. The header belongs to the first page a visitor loads, and the
 * site's own links do not load a new document, so allowing it on the chat page alone still refused everyone who
 * arrived through a link. Only /chat ever asks for it.
 */
const permissions = "camera=(), microphone=(self), geolocation=(), payment=(), usb=()";

const securityHeaders = [
  // A response is only ever what its content type says: no guessing a script out of a JSON or audio answer.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // A case link is a secret. Other sites never learn it from the address of the page a visitor came from.
  { key: "Referrer-Policy", value: "same-origin" },
  // No other site may show these pages inside a frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: permissions },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
  // The chat lives at /chat. Its earlier address, /ukk, leads there with its query string, so printed QR codes and
  // shared links keep working.
  redirects: async () => [{ source: "/ukk", destination: "/chat", permanent: false }],
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
