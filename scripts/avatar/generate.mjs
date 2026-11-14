/** Dry-run-first Gemini asset preparation. No SDK or new dependency required. */
import { appendFile, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { appearance, acting, clips, makeManifest } from './template.mjs';

const { values } = parseArgs({ options: {
  stage: { type: 'string', default: 'clips' },
  clips: { type: 'string', default: 'idle' },
  apply: { type: 'boolean', default: false },
  'max-requests': { type: 'string', default: '1' },
  'max-video-seconds': { type: 'string', default: '4' },
  help: { type: 'boolean', default: false },
} });

if (values.help) {
  console.log(`Usage: node [--env-file=.env.local] scripts/avatar/generate.mjs
  --stage front|desk|clips|publish    default: clips
  --clips idle|all|id,id             default: idle
  --apply                           make API requests (or publish local assets)
  --max-requests 1                   per invocation; failures count; no retry
  --max-video-seconds 4              per invocation; sum of requested durations

Without --apply: print the exact plan, check local prerequisites, do not write or call APIs.
API keys: GEMINI_API_KEY or GOOGLE_API_KEY. No values are printed.
Generated files stay under .data/avatar-generation/default until reviewed and published.`);
  process.exit(0);
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, '.data/avatar-generation', appearance.profile);
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const imageModel = 'gemini-nano-banana-2.1';
const videoModel = 'gemini-omni-1.2-flash';
const maxRequests = Number(values['max-requests']);
const maxSeconds = Number(values['max-video-seconds']);
let requests = 0;

function ensure(condition, message) { if (!condition) throw new Error(message); }
async function exists(file) { return stat(file).then(() => true, () => false); }
async function frame(pose, preview) {
  for (const extension of ['png', 'jpg', 'webp']) {
    const filename = path.join(output, `${pose}.${extension}`);
    if (await exists(filename)) return {
      type: 'image', mime_type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      data: preview ? `[local ${pose}.${extension}]` : (await readFile(filename)).toString('base64'),
    };
  }
  ensure(preview, `Missing generated ${pose} frame; run --stage ${pose} first.`);
  return { type: 'image', mime_type: 'image/png', data: `[missing: generate ${pose} frame first]` };
}

async function request(body, kind, filename) {
  ensure(requests < maxRequests, 'Request cap reached.');
  ensure(!(await exists(filename)), `Refusing to overwrite ${path.basename(filename)}; review or move it before another paid attempt.`);
  requests++;
  // Record the attempt before sending: a timeout may still have been billed. Never retry automatically.
  await appendFile(path.join(output, 'attempts.jsonl'), JSON.stringify({ at: new Date().toISOString(), model: body.model, output: path.basename(filename), requestedSeconds: body.response_format?.duration ?? null }) + '\n');
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ ...body, background: false, store: false, stream: false }),
    signal: AbortSignal.timeout(600_000),
  });
  // Do not print the response body: provider errors may echo inputs or credentials.
  ensure(response.ok, `Gemini returned HTTP ${response.status}; attempt recorded, no retry. Check model access, billing and quota.`);
  const result = await response.json();
  const media = result.steps?.filter(step => step.type === 'model_output')
    .flatMap(step => step.content ?? []).find(part => part.type === kind && part.data);
  ensure(media, `No inline ${kind} returned (status ${String(result.status)}). Attempt recorded, no retry.`);
  if (kind === 'image') {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[media.mime_type];
    ensure(extension, 'Unsupported image MIME type; no file written.');
    filename = filename.replace(/\.png$/, `.${extension}`);
  }
  await writeFile(filename, Buffer.from(media.data, 'base64'), { flag: 'wx' });
  console.log(`Saved ${path.relative(root, filename)}`);
}

async function publish() {
  const target = path.join(root, 'public/avatar', appearance.profile);
  const inputs = clips.map(clip => path.join(output, `${clip.id}.mp4`));
  const front = (await readdir(output).catch(() => [])).find(name => /^front\.(png|jpg|webp)$/.test(name));
  const missing = [];
  for (const file of inputs) if (!(await exists(file))) missing.push(path.basename(file));
  if (!front) missing.push('front image');
  console.log(JSON.stringify({ stage: 'publish', destination: target, missing, note: 'Run only after inspecting all clips and their joins. Removes native audio and normalizes browser playback.' }, null, 2));
  if (!values.apply) return;
  ensure(missing.length === 0, 'Complete and review the asset set before publishing.');
  ensure(!(await exists(target)), 'Profile already published. Review/remove that profile explicitly before replacing it.');
  for (const binary of ['ffmpeg', 'ffprobe']) ensure(spawnSync(binary, ['-version'], { stdio: 'ignore' }).status === 0, `${binary} must be installed.`);
  await mkdir(target, { recursive: true });
  const durations = {};
  for (const clip of clips) {
    const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', path.join(output, `${clip.id}.mp4`), '-an', '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2', '-r', '24', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(target, `${clip.id}.mp4`)], { stdio: 'inherit' });
    ensure(result.status === 0, `ffmpeg failed for ${clip.id}; published profile is incomplete.`);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path.join(target, `${clip.id}.mp4`)], { encoding: 'utf8' });
    durations[clip.id] = Math.round(Number(probe.stdout.trim()) * 1000);
    ensure(probe.status === 0 && durations[clip.id] > 0, `Could not probe ${clip.id}.`);
  }
  const poster = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-n', '-i', path.join(output, front), '-frames:v', '1', path.join(target, 'poster.jpg')], { stdio: 'inherit' });
  ensure(poster.status === 0, 'Could not make poster.');
  await writeFile(path.join(target, 'manifest.json'), JSON.stringify(makeManifest(appearance.profile, appearance.label, durations), null, 2) + '\n');
  await copyFile(new URL('./template.mjs', import.meta.url), path.join(output, 'used-template.mjs'));
  console.log(`Published ${path.relative(root, target)}/manifest.json`);
}

async function main() {
  ensure(['front', 'desk', 'clips', 'publish'].includes(values.stage), 'Unknown stage. See --help.');
  ensure(Number.isInteger(maxRequests) && maxRequests >= 1 && maxRequests <= 10, '--max-requests must be an integer from 1 to 10.');
  ensure(Number.isFinite(maxSeconds) && maxSeconds >= 0 && maxSeconds <= 100, '--max-video-seconds must be from 0 to 100.');
  if (values.stage === 'publish') return publish();
  const preview = !values.apply;
  const jobs = [];
  if (values.stage === 'front' || values.stage === 'desk') {
    const stage = values.stage;
    const prompt = [appearance.person, appearance.scene,
      stage === 'desk' ? 'Edit the supplied generated front pose. Preserve the exact person, scene, camera and framing. Change only their pose.' : 'Create the canonical front pose for an assistant avatar.',
      acting.poses[stage], 'No captions, visible branding or graphics.'].join(' ');
    jobs.push({ filename: path.join(output, `${stage}.png`), kind: 'image', body: {
      model: imageModel,
      input: [...(stage === 'desk' ? [await frame('front', preview)] : []), { type: 'text', text: prompt }],
      response_format: { type: 'image', aspect_ratio: '16:9', image_size: '1K' },
    } });
  } else {
    const selected = values.clips === 'all' ? clips : values.clips.split(',').map(id => {
      const clip = clips.find(item => item.id === id);
      ensure(clip, `Unknown clip ${id}.`); return clip;
    });
    ensure(new Set(selected.map(clip => clip.id)).size === selected.length, 'Duplicate clip ids are not allowed.');
    for (const clip of selected) jobs.push({ filename: path.join(output, `${clip.id}.mp4`), kind: 'video', body: {
      model: videoModel,
      input: [await frame(clip.from, preview), await frame(clip.to, preview), { type: 'text', text: [appearance.person, appearance.scene, acting.shared, `The first image is the first frame (${clip.from}); the second image is the final frame (${clip.to}).`, clip.direction].join(' ') }],
      response_format: { type: 'video', aspect_ratio: '16:9', resolution: '720p', duration: `${clip.durationMs / 1000}s` },
    } });
  }
  const seconds = jobs.reduce((sum, job) => sum + (Number.parseFloat(job.body.response_format.duration) || 0), 0);
  console.log(JSON.stringify({ dryRun: preview, keyPresent: Boolean(apiKey), requests: jobs.length, videoSeconds: seconds, caps: { maxRequests, maxSeconds }, output: path.relative(root, output), jobs: preview ? jobs : jobs.map(job => ({ kind: job.kind, filename: path.basename(job.filename), model: job.body.model })) }, null, 2));
  if (preview) return;
  ensure(apiKey, 'Set GEMINI_API_KEY in the environment or ignored .env.local.');
  ensure(jobs.length <= maxRequests, 'Planned requests exceed --max-requests.');
  ensure(seconds <= maxSeconds, 'Planned video duration exceeds --max-video-seconds.');
  // Check all targets before making any paid requests.
  for (const job of jobs) {
    ensure(!(await exists(job.filename)), `Output already exists: ${path.basename(job.filename)}.`);
    if (job.kind === 'image') for (const extension of ['jpg', 'webp']) ensure(!(await exists(job.filename.replace(/\.png$/, `.${extension}`))), 'Image output already exists.');
  }
  await mkdir(output, { recursive: true });
  for (const job of jobs) await request(job.body, job.kind, job.filename);
}

main().catch(error => { console.error(error.name === 'TimeoutError' ? 'Request timed out; it may still be billed. Inspect attempts.jsonl before retrying.' : error.message); process.exitCode = 1; });
