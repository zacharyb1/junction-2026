import { providerName } from "@/lib/ai";
import { demoCallConfiguration } from "@/lib/demo-calls";
import { spokenVoice } from "@/lib/speech";

export function GET() {
  const calls = demoCallConfiguration();
  return Response.json({
    ok: true,
    // The scaffold chat's model provider. The Engine does not use it, so "none" here is fine.
    provider: providerName(),
    // What the Engine itself runs on. Only whether a key is set is reported, never a value.
    search: process.env.EXA_API_KEY ? "exa" : "none",
    store: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local",
    voice: process.env.ELEVENLABS_API_KEY ? "elevenlabs" : "none",
    // "premade" once this server's key turned out not to own AIDaddy's voice and speech fell back to a voice
    // every ElevenLabs account has. "own" until something has been spoken and after a key that owns it is installed.
    ...(process.env.ELEVENLABS_API_KEY ? { spokenVoice: spokenVoice() } : {}),
    // Demo calls: "phone" dials the test phone, "browser" rings at a web address, "off" until the operator enables them.
    calls: calls.ready ? calls.line : "off",
    // Vercel sets VERCEL_GIT_COMMIT_SHA; the server deploy script sets KAVERI_COMMIT.
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || process.env.KAVERI_COMMIT)?.slice(0, 7) || "local",
    time: new Date().toISOString(),
  });
}
