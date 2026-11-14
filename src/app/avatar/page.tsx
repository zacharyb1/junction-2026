import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SiteShell } from "@/components/site/site-shell";
import { AvatarDemo } from "@/components/avatar/avatar-demo";
import { demoCodeRequired } from "@/lib/cases";
import { ukkConfigured } from "@/lib/ukk";
import { validateManifest } from "@/lib/avatar/scheduler";
import type { Manifest } from "@/lib/avatar/types";
import testProfile from "../../../public/avatar/test/manifest.json";

export const metadata: Metadata = { title: "Avatar concept", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AvatarPage({ searchParams }: PageProps<"/avatar">) {
  const params = await searchParams;
  const profiles: Manifest[] = [];
  for (const name of ["ari", "noor"]) {
    try {
      const profile = JSON.parse(await readFile(path.join(process.cwd(), `public/avatar/${name}/manifest.json`), "utf8")) as Manifest;
      if (profile.medium === "illustrated" && !validateManifest(profile).length) profiles.push(profile);
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
    if (!validateManifest(generated).length) profiles.unshift(generated);
  } catch { /* A generated profile is optional; the offline walkthrough is always available. */ }
  return (
    <SiteShell>
      <main className="avatar-concept">
        <header><p className="text-sm text-muted-foreground">Separate prototype · for team review</p>
          <h1>An assistant with a presence</h1>
          <p>Watch the assistant turn to its work, then return to you. Pre-rendered movements follow the actions of the agent.</p>
        </header>
        <AvatarDemo profiles={profiles} code={typeof params.code === "string" ? params.code : ""} needsCode={demoCodeRequired()} liveConfigured={Boolean(process.env.AVATAR_UPSTREAM || ukkConfigured())} />
      </main>
    </SiteShell>
  );
}
