import { ACTIVITIES, type Activity, type Clip, type Manifest, type PoseId } from "./types";

/** Return the shortest directed path; only transition clips may change pose. */
function transitionPath(manifest: Manifest, from: PoseId, to: PoseId): Clip[] | null {
  if (from === to) return [];
  const queue: { pose: PoseId; path: Clip[] }[] = [{ pose: from, path: [] }];
  const visited = new Set([from]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const clip of manifest.clips) {
      if (clip.kind !== "transition" || clip.from !== current.pose || visited.has(clip.to)) continue;
      const path = [...current.path, clip];
      if (clip.to === to) return path;
      visited.add(clip.to);
      queue.push({ pose: clip.to, path });
    }
  }
  return null;
}

/** Validate once when loading a look, before asking the player to use it. */
export function validateManifest(manifest: Manifest): string[] {
  const errors: string[] = [];
  if (!manifest.restPose) errors.push("A rest pose is required.");
  if (![manifest.width, manifest.height].every((n) => Number.isFinite(n) && n > 0)) {
    errors.push("Video dimensions must be positive numbers.");
  }
  const ids = new Set<string>();
  for (const clip of manifest.clips) {
    if (!clip.id || ids.has(clip.id)) errors.push(`Duplicate or empty clip id: ${clip.id}.`);
    ids.add(clip.id);
    if (!clip.from || !clip.to || !clip.file) errors.push(`Clip ${clip.id} needs a file and both poses.`);
    if (!Number.isFinite(clip.durationMs) || clip.durationMs <= 0) errors.push(`Clip ${clip.id} has no valid duration.`);
    if (clip.kind === "loop" && clip.from !== clip.to) errors.push(`Loop ${clip.id} changes pose.`);
  }
  for (const activity of ACTIVITIES) {
    const entry = manifest.activities[activity];
    if (!entry?.pose || !entry.loops?.length) {
      errors.push(`Activity ${activity} needs a pose and at least one loop.`);
      continue;
    }
    for (const id of entry.loops) {
      const clip = manifest.clips.find((candidate) => candidate.id === id);
      if (!clip || clip.kind !== "loop" || clip.from !== entry.pose || clip.to !== entry.pose) {
        errors.push(`Activity ${activity} references an incompatible loop: ${id}.`);
      }
    }
    const startingPoses = new Set([manifest.restPose, ...manifest.clips.map((clip) => clip.to)]);
    for (const pose of startingPoses) {
      if (!transitionPath(manifest, pose, entry.pose)) {
        errors.push(`No transition from ${pose} to ${entry.pose} for ${activity}.`);
      }
    }
  }
  return errors;
}

/**
 * Call only at a clip boundary, with the pose of the clip that actually finished.
 * Re-evaluate the newest activity at every boundary instead of queuing stale actions.
 * A transition already playing must finish; the following decision can turn back.
 */
export function nextClip(
  manifest: Manifest,
  pose: PoseId,
  activity: Activity,
  loopIndex = 0,
): Clip | null {
  const entry = manifest.activities[activity];
  if (!entry) return null;
  const path = transitionPath(manifest, pose, entry.pose);
  if (!path) return null;
  if (path.length) return path[0];
  const loops = entry.loops
    .map((id) => manifest.clips.find((clip) => clip.id === id))
    .filter((clip): clip is Clip => !!clip && clip.kind === "loop" && clip.from === pose && clip.to === pose);
  if (!loops.length) return null;
  const index = Number.isFinite(loopIndex) ? Math.floor(loopIndex) : 0;
  return loops[((index % loops.length) + loops.length) % loops.length];
}
