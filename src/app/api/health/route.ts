import { providerName } from "@/lib/ai";
import { swarmConfiguration } from "@/lib/swarm-calls";

export function GET() {
  return Response.json({
    ok: true,
    // The scaffold chat's model provider. The Engine does not use it, so "none" here is fine.
    provider: providerName(),
    // What the Engine itself runs on. Only whether a key is set is reported, never a value.
    search: process.env.EXA_API_KEY ? "exa" : "none",
    store: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local",
    voice: process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "none",
    // Swarm calls ring real phones through Twilio; only whether they are fully set up is reported.
    swarm: swarmConfiguration().ready ? "twilio" : "off",
    // Vercel sets VERCEL_GIT_COMMIT_SHA; the server deploy script sets KAVERI_COMMIT.
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.KAVERI_COMMIT)?.slice(0, 7) || "local",
    time: new Date().toISOString(),
  });
}
