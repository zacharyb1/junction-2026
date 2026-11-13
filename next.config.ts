import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
