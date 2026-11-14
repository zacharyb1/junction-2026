#!/usr/bin/env node
// Purpose-made audio for the authored demonstration. No request without --apply.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  apply: { type: "boolean", default: false },
  scene: { type: "string" },
  out: { type: "string", default: ".data/avatar-performance/speech" },
} });
const dialogue = JSON.parse(await readFile("src/data/avatar-performance-dialogue.json", "utf8"));
const scenes = dialogue.scenes.filter((scene) => !values.scene || scene.id === values.scene);
if (!scenes.length) throw new Error("Unknown scene. Choose pregnancy, clinic or employer.");
if (!values.apply) {
  console.log(JSON.stringify({ model: dialogue.model, voice: dialogue.voice, requests: scenes.length, out: values.out,
    scenes: scenes.map(({ id, speech }) => ({ id, speech })),
    note: "Dry run. --apply uses the configured Gemini account. Confirm its free-tier status or approved spending budget before running." }, null, 2));
  process.exit(0);
}
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error("Load GEMINI_API_KEY from the local environment, never a command argument.");
await mkdir(values.out, { recursive: true });
for (const scene of scenes) {
  const body = {
    model: dialogue.model,
    input: [{ type: "user_input", content: [{ type: "text", text: scene.speech,
      annotations: [{ type: "speech_metadata", style: dialogue.style }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: dialogue.voice }] },
  };
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(120_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}; no automatic retry or paid-provider fallback.`);
  const audio = (result.steps ?? []).flatMap((step) => step.content ?? []).findLast((part) => part.type === "audio" && part.data);
  if (!audio || audio.mime_type !== "audio/wav") throw new Error("Expected WAV audio from Gemini.");
  const output = path.join(values.out, `${scene.id}.wav`);
  await writeFile(output, Buffer.from(audio.data, "base64"));
  await writeFile(path.join(values.out, `${scene.id}.json`), JSON.stringify({ ...body, generatedAt: new Date().toISOString(),
    researchRecordedAt: dialogue.researchRecordedAt, citations: scene.citations }, null, 2) + "\n");
  console.log(`${scene.id}: saved ${output}`);
}
