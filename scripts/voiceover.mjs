#!/usr/bin/env node
/**
 * Renders the video voiceover with ElevenLabs text to speech.
 *
 *   ELEVENLABS_API_KEY=... node scripts/voiceover.mjs            every line in docs/pitch/voiceover.json
 *   ELEVENLABS_API_KEY=... node scripts/voiceover.mjs --only 07-numbers
 *
 * In a Claude cloud session the key is injected by a proxy: run with NODE_USE_ENV_PROXY=1 and no key.
 * Output: docs/pitch/voiceover/<id>.mp3, one file per line, so each can be placed on the video timeline.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const config = JSON.parse(await readFile(path.join(ROOT, "docs/pitch/voiceover.json"), "utf8"));
const outDir = path.join(ROOT, "docs/pitch/voiceover");
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const key = process.env.ELEVENLABS_API_KEY ?? "proxy-injected";

await mkdir(outDir, { recursive: true });
const main = config.lines.filter((l) => !l.alternative);

for (const line of config.lines) {
  if (only && line.id !== only) continue;
  // Neighbouring lines let the voice keep one tone across separately rendered files.
  const i = main.findIndex((l) => l.id === line.id);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: line.text,
        model_id: config.model,
        ...(i > 0 ? { previous_text: main[i - 1].text } : {}),
        ...(i >= 0 && i < main.length - 1 ? { next_text: main[i + 1].text } : {}),
      }),
    },
  );
  if (!res.ok) {
    console.error(`${line.id}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    process.exitCode = 1;
    continue;
  }
  const audio = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(outDir, `${line.id}.mp3`), audio);
  // 128 kbit/s is 16,000 bytes per second.
  console.log(`${line.id}.mp3  ${(audio.length / 16000).toFixed(1)} s  ${line.text.length} characters`);
}
