/** Dry-run-first avatar asset preparation, with offline fixtures by default. */
import { appendFile, copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { appearance, acting, clips, makeManifest } from './template.mjs';
import { createFixtureRenderer, createGeminiRenderer } from './renderers.mjs';

const { values } = parseArgs({ options: {
  provider: { type: 'string', default: 'fixture' },
  stage: { type: 'string', default: 'clips' },
  clips: { type: 'string', default: 'idle' },
  apply: { type: 'boolean', default: false },
  'max-requests': { type: 'string', default: '1' },
  'max-video-seconds': { type: 'string', default: '4' },
  help: { type: 'boolean', default: false },
} });

if (values.help) {
  console.log(`Usage: node [--env-file=.env.local] scripts/avatar/generate.mjs
  --provider fixture|gemini          default: fixture (offline test assets)
  --stage front|desk|clips|publish|all  default: clips; all is fixture-only
  --clips idle|all|id,id             default: idle
  --apply                           render or publish; default is dry-run
  --max-requests 1                   Gemini cap per invocation; failures count
  --max-video-seconds 4              Gemini cap per invocation

Without --apply: print the plan, check prerequisites, do not write or call APIs.
Fixture mode never reads a key or calls the network. It writes explicitly labelled
test assets under .data/avatar-generation/preview, then public/avatar/preview.
Gemini mode uses GEMINI_API_KEY or GOOGLE_API_KEY and the default profile folder.
No automatic retries and no overwriting existing outputs.`);
  process.exit(0);
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = values.provider === 'fixture';
const profile = fixture ? 'preview' : appearance.profile;
const output = path.join(root, '.data/avatar-generation', profile);
const maxRequests = Number(values['max-requests']);
const maxSeconds = Number(values['max-video-seconds']);
let requests = 0;

function ensure(condition, message) { if (!condition) throw new Error(message); }
async function exists(file) { return stat(file).then(() => true, () => false); }
async function frame(pose, preview) {
  for (const extension of ['png', 'jpg', 'webp']) {
    const filename = path.join(output, `${pose}.${extension}`);
    if (await exists(filename)) return {
      pose, mimeType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      bytes: preview ? undefined : await readFile(filename),
    };
  }
  ensure(preview, `Missing ${pose} frame; run --stage ${pose} first.`);
  return { pose, missing: true, mimeType: 'image/png' };
}

async function render(renderer, job) {
  if (!fixture) ensure(requests < maxRequests, 'Request cap reached.');
  requests++;
  // Record before rendering: a failed/timeout network attempt can still be billed.
  await appendFile(path.join(output, 'attempts.jsonl'), JSON.stringify({
    at: new Date().toISOString(), provider: values.provider, id: job.id,
    kind: job.kind, requestedSeconds: job.durationMs ? job.durationMs / 1000 : null,
  }) + '\n');
  const media = await renderer.render(job);
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4' }[media.mimeType];
  ensure(extension, 'Unsupported media MIME type; no file written.');
  await writeFile(path.join(output, `${job.id}.${extension}`), media.bytes, { flag: 'wx' });
  console.log(`Saved ${path.relative(root, output)}/${job.id}.${extension}`);
}

async function publish() {
  const target = path.join(root, 'public/avatar', profile);
  const inputs = clips.map(clip => path.join(output, `${clip.id}.mp4`));
  const front = (await readdir(output).catch(() => [])).find(name => /^front\.(png|jpg|webp)$/.test(name));
  const missing = [];
  for (const file of inputs) if (!(await exists(file))) missing.push(path.basename(file));
  if (!front) missing.push('front image');
  console.log(JSON.stringify({ stage: 'publish', provider: values.provider, destination: target, missing,
    note: fixture ? 'Offline playback fixtures; no generated human or verified natural joins.' : 'Inspect all clips and joins before publishing. Native audio will be removed.',
  }, null, 2));
  if (!values.apply) return;
  ensure(missing.length === 0, 'Complete and review the asset set before publishing.');
  ensure(!(await exists(target)), 'Profile already published. Review/remove that profile explicitly before replacing it.');
  for (const binary of ['ffmpeg', 'ffprobe']) ensure(spawnSync(binary, ['-version'], { stdio: 'ignore' }).status === 0, `${binary} must be installed.`);
  await mkdir(path.dirname(target), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(target), `.${profile}-`));
  try {
    const durations = {};
    for (const clip of clips) {
      const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', path.join(output, `${clip.id}.mp4`), '-an', '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2', '-r', '24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(staging, `${clip.id}.mp4`)], { stdio: 'inherit' });
      ensure(result.status === 0, `ffmpeg failed for ${clip.id}; nothing published.`);
      const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path.join(staging, `${clip.id}.mp4`)], { encoding: 'utf8' });
      durations[clip.id] = Math.round(Number(probe.stdout?.trim()) * 1000);
      ensure(probe.status === 0 && durations[clip.id] > 0, `Could not probe ${clip.id}.`);
    }
    const poster = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', path.join(output, front), '-frames:v', '1', path.join(staging, 'poster.jpg')], { stdio: 'inherit' });
    ensure(poster.status === 0, 'Could not make poster.');
    const manifest = makeManifest(profile, fixture ? 'Offline assembly (test clips)' : appearance.label, durations, fixture);
    // Both adapters publish the same normalized JPEG poster format.
    manifest.poster = `/avatar/${profile}/poster.jpg`;
    await writeFile(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await copyFile(new URL('./template.mjs', import.meta.url), path.join(output, 'used-template.mjs'));
    ensure(!(await exists(target)), 'Profile was published by another process; nothing replaced.');
    await rename(staging, target);
    console.log(`Published ${path.relative(root, target)}/manifest.json`);
  } catch (error) {
    // This exact directory was created by this invocation; never remove a published profile.
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  ensure(['fixture', 'gemini'].includes(values.provider), 'Unknown provider. Use fixture or gemini.');
  ensure(['front', 'desk', 'clips', 'publish', 'all'].includes(values.stage), 'Unknown stage. See --help.');
  ensure(Number.isInteger(maxRequests) && maxRequests >= 1 && maxRequests <= 10, '--max-requests must be an integer from 1 to 10.');
  ensure(Number.isFinite(maxSeconds) && maxSeconds >= 0 && maxSeconds <= 100, '--max-video-seconds must be from 0 to 100.');
  if (values.stage === 'all') {
    ensure(fixture, '--stage all is available only for offline fixtures. Run paid stages separately.');
    values.clips = 'all';
    for (const stage of ['front', 'desk', 'clips', 'publish']) {
      values.stage = stage;
      await main();
    }
    return;
  }
  if (values.stage === 'publish') return publish();
  const preview = !values.apply;
  const jobs = [];
  if (values.stage === 'front' || values.stage === 'desk') {
    const stage = values.stage;
    jobs.push({ id: stage, kind: 'image', images: stage === 'desk' ? [await frame('front', preview)] : [],
      prompt: [appearance.person, appearance.scene,
        stage === 'desk' ? 'Edit the supplied generated front pose. Preserve the exact person, scene, camera and framing. Change only their pose.' : 'Create the canonical front pose for an assistant avatar.',
        acting.poses[stage], 'No captions, visible branding or graphics.'].join(' '),
    });
  } else {
    const selected = values.clips === 'all' ? clips : values.clips.split(',').map(id => {
      const clip = clips.find(item => item.id === id);
      ensure(clip, `Unknown clip ${id}.`); return clip;
    });
    ensure(new Set(selected.map(clip => clip.id)).size === selected.length, 'Duplicate clip ids are not allowed.');
    for (const clip of selected) jobs.push({ id: clip.id, kind: 'video', durationMs: clip.durationMs,
      images: [await frame(clip.from, preview), await frame(clip.to, preview)],
      prompt: [appearance.person, appearance.scene, acting.shared, `The first image is the first frame (${clip.from}); the second image is the final frame (${clip.to}).`, clip.direction].join(' '),
    });
  }
  const seconds = jobs.reduce((sum, job) => sum + (job.durationMs ?? 0) / 1000, 0);
  console.log(JSON.stringify({ dryRun: preview, provider: values.provider, paidRequests: fixture ? 0 : jobs.length,
    requestedVideoSeconds: seconds, caps: fixture ? null : { maxRequests, maxSeconds },
    output: path.relative(root, output), jobs: jobs.map(({ id, kind, prompt, images, durationMs }) => ({
      id, kind, prompt, images: images.map(({ pose, missing }) => ({ pose, missing: Boolean(missing) })), durationMs,
    })),
  }, null, 2));
  if (preview) return;
  // Reading a Gemini key is restricted to the explicitly selected paid adapter.
  const renderer = fixture ? createFixtureRenderer({ fixtureDir: path.join(root, 'public/avatar/test') })
    : createGeminiRenderer({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY });
  if (!fixture) {
    ensure(jobs.length <= maxRequests, 'Planned requests exceed --max-requests.');
    ensure(seconds <= maxSeconds, 'Planned video duration exceeds --max-video-seconds.');
  }
  // Check all targets before making any paid requests or local writes.
  for (const job of jobs) for (const extension of job.kind === 'image' ? ['png', 'jpg', 'webp'] : ['mp4']) {
    ensure(!(await exists(path.join(output, `${job.id}.${extension}`))), `Output already exists: ${job.id}.${extension}.`);
  }
  await mkdir(output, { recursive: true });
  for (const job of jobs) await render(renderer, job);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
