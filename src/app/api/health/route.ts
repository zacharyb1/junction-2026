import { providerName } from "@/lib/ai";

export function GET() {
  return Response.json({
    ok: true,
    provider: providerName(),
    // Vercel sets VERCEL_GIT_COMMIT_SHA; the server deploy script sets KAVERI_COMMIT.
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.KAVERI_COMMIT)?.slice(0, 7) || "local",
    time: new Date().toISOString(),
  });
}
