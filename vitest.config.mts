import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for the pure, trust-critical code. No network, no server.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
