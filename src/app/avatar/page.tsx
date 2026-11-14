import type { Metadata } from "next";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { SiteShell } from "@/components/site/site-shell";
import { AvatarDemo } from "@/components/avatar/avatar-demo";
import { demoCodeRequired } from "@/lib/cases";
import { ukkConfigured } from "@/lib/ukk";
import { validateManifest } from "@/lib/avatar/scheduler";
import type { Manifest } from "@/lib/avatar/types";
import type { PerformanceManifest } from "@/lib/avatar/performance";
import type { PreparedMedia, PreparedSceneId } from "@/lib/avatar/prepared-scenes";
import testProfile from "../../../public/avatar/test/manifest.json";

export const metadata: Metadata = { title: "Your companion", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function officeAssetExists(src: unknown): Promise<boolean> {
  if (typeof src !== "string" || !/^\/avatar\/office\/[a-zA-Z0-9_./-]+$/.test(src) || src.split("/").includes("..")) return false;
  try {
    const file = await stat(path.join(process.cwd(), "public", src));
    return file.isFile() && file.size > 0;
  } catch { return false; }
}

async function loadOffice(): Promise<Manifest | null> {
  try {
    const performance = JSON.parse(await readFile(path.join(process.cwd(), "public/avatar/office/takes.json"), "utf8")) as PerformanceManifest;
    if (performance.id !== "office" || typeof performance.label !== "string" ||
        !Number.isFinite(performance.width) || performance.width <= 0 || !Number.isFinite(performance.height) || performance.height <= 0 ||
        !Array.isArray(performance.takes) || !performance.takes.length || !await officeAssetExists(performance.poster)) return null;
    const valid = await Promise.all(performance.takes.map(async (take) =>
      typeof take.id === "string" && typeof take.sourceId === "string" && !!take.sourceId &&
      ["presence", "attention", "work", "handover"].includes(take.kind) &&
      Number.isFinite(take.sourceInMs) && Number.isFinite(take.sourceOutMs) &&
      take.sourceInMs >= 0 && take.sourceOutMs > take.sourceInMs && await officeAssetExists(take.src)));
    if (valid.some((item) => !item) || new Set(performance.takes.map((take) => take.id)).size !== performance.takes.length) return null;
    return {
      profile: "office", label: "Office", width: performance.width, height: performance.height,
      poster: performance.poster, performance, medium: "stock", restPose: "front", clips: [],
      // This profile never enters the legacy pose/loop scheduler.
      activities: {
        idle: { pose: "front", loops: [] }, listening: { pose: "front", loops: [] },
        thinking: { pose: "front", loops: [] }, working: { pose: "front", loops: [] },
        speaking: { pose: "front", loops: [] },
      },
      attribution: { creator: "MART PRODUCTION", title: "Solo office performance", sourceUrl: "https://www.pexels.com/video/a-businesswoman-greeting-and-talking-7643308/", license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", note: "Filmed visual stand-in. No association or endorsement." },
    };
  } catch { return null; }
}

async function loadPreparedMedia(): Promise<PreparedMedia> {
  const result: PreparedMedia = {};
  try {
    const manifest = JSON.parse(await readFile(path.join(process.cwd(), "public/avatar/office/performances.json"), "utf8")) as PreparedMedia;
    for (const scene of ["pregnancy", "clinic", "employer"] satisfies PreparedSceneId[]) {
      const media = manifest[scene];
      if (media && typeof media.transcript === "string" && media.transcript.trim() &&
          ["dubbed", "musetalk"].includes(media.method) &&
          Number.isFinite(media.durationMs) && media.durationMs > 0 &&
          ["experimental", "reviewed"].includes(media.quality) && await officeAssetExists(media.video)) result[scene] = media;
    }
  } catch { /* The prepared text and existing recorded voice remain usable without new media. */ }
  return result;
}

export default async function AvatarPage({ searchParams }: PageProps<"/avatar">) {
  const params = await searchParams;
  const profiles: Manifest[] = [];
  const [office, preparedMedia] = await Promise.all([loadOffice(), loadPreparedMedia()]);
  if (office) profiles.push(office);
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
    if (!office && !validateManifest(generated).length) profiles.unshift(generated);
  } catch { /* A generated profile is optional; the offline walkthrough is always available. */ }
  return (
    <SiteShell bare>
      <AvatarDemo profiles={profiles} preparedMedia={preparedMedia} code={typeof params.code === "string" ? params.code : ""} needsCode={demoCodeRequired()} liveConfigured={Boolean(process.env.AVATAR_UPSTREAM || ukkConfigured())} voiceConfigured={Boolean(process.env.ELEVENLABS_API_KEY)} />
    </SiteShell>
  );
}
