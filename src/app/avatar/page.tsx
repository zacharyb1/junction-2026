import type { Metadata } from "next";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { SiteShell } from "@/components/site/site-shell";
import { AvatarDemo } from "@/components/avatar/avatar-demo";
import { demoCodeRequired } from "@/lib/cases";
import { aidaddyConfigured } from "@/lib/aidaddy";
import { validateManifest } from "@/lib/avatar/scheduler";
import type { Manifest } from "@/lib/avatar/types";
import { validatePresence, type PresenceManifest, type PresenceSpeechSet } from "@/lib/avatar/presence";
import testProfile from "../../../public/avatar/test/manifest.json";

export const metadata: Metadata = { title: "Your companion", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function deskFileExists(src: string): Promise<boolean> {
  // validatePresence already confined every path to /avatar/desk/ without traversal.
  try {
    const file = await stat(path.join(process.cwd(), "public", src));
    return file.isFile() && file.size > 0;
  } catch { return false; }
}

/** The filmed desk presence, offered only when its manifest is valid and every file it names is present. */
async function loadDesk(): Promise<Manifest | null> {
  try {
    const presence = JSON.parse(await readFile(path.join(process.cwd(), "public/avatar/desk/presence.json"), "utf8")) as PresenceManifest;
    if (presence?.id !== "desk" || validatePresence(presence).length) return null;
    const files = await Promise.all([presence.poster, ...presence.segments.map((segment) => segment.src)].map(deskFileExists));
    if (files.some((exists) => !exists)) return null;
    // A prepared answer without its audio file falls back to the readable text.
    const speech: PresenceSpeechSet = {};
    for (const [scene, entry] of Object.entries(presence.speech) as [keyof PresenceSpeechSet, NonNullable<PresenceSpeechSet[keyof PresenceSpeechSet]>][]) {
      if (await deskFileExists(entry.src)) speech[scene] = entry;
    }
    const { creator, sourceUrl, license, licenseUrl, note } = presence.attribution;
    return {
      profile: "desk", label: presence.label, width: presence.width, height: presence.height,
      poster: presence.poster, presence: { ...presence, speech }, medium: "stock", restPose: "hub", clips: [],
      // This profile never enters the legacy pose/loop scheduler.
      activities: {
        idle: { pose: "hub", loops: [] }, listening: { pose: "hub", loops: [] },
        thinking: { pose: "hub", loops: [] }, working: { pose: "hub", loops: [] },
        speaking: { pose: "hub", loops: [] },
      },
      attribution: { creator, title: "Desk footage", sourceUrl, license, licenseUrl, note },
    };
  } catch { return null; }
}

export default async function AvatarPage({ searchParams }: PageProps<"/avatar">) {
  const params = await searchParams;
  const profiles: Manifest[] = [];
  const desk = await loadDesk();
  if (desk) profiles.push(desk);
  for (const name of ["ari", "noor"]) {
    try {
      const profile = JSON.parse(await readFile(path.join(process.cwd(), `public/avatar/${name}/manifest.json`), "utf8")) as Manifest;
      if ((profile.medium === "illustrated" || profile.medium === "stock") && !validateManifest(profile).length) profiles.push(profile);
    } catch { /* Locally rendered characters are optional before asset preparation. */ }
  }
  if (!profiles.length) profiles.push(testProfile as Manifest);
  // An offline publication exercises the same complete-profile handoff as generation.
  try {
    const preview = JSON.parse(await readFile(path.join(process.cwd(), "public/avatar/preview/manifest.json"), "utf8")) as Manifest;
    if (profiles[0].placeholder && preview.placeholder === true && !validateManifest(preview).length) profiles[0] = preview;
  } catch { /* The bundled test profile remains usable before any local publication. */ }
  // The generation script installs this profile only after every clip is present.
  try {
    const generated = JSON.parse(await readFile(path.join(process.cwd(), "public/avatar/default/manifest.json"), "utf8")) as Manifest;
    if (!desk && !validateManifest(generated).length) profiles.unshift(generated);
  } catch { /* A generated profile is optional; the offline walkthrough is always available. */ }
  return (
    <SiteShell bare>
      <AvatarDemo profiles={profiles} code={typeof params.code === "string" ? params.code : ""} needsCode={demoCodeRequired()} liveConfigured={Boolean(process.env.AVATAR_UPSTREAM || aidaddyConfigured())} voiceConfigured={Boolean(process.env.ELEVENLABS_API_KEY)} />
    </SiteShell>
  );
}
