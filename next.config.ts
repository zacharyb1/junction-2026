import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
