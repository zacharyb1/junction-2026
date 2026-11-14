#!/usr/bin/env node
/** Normalize inspected, licensed performances. Original speed and frame order only.
 * node scripts/avatar/make-office-takes.mjs --source-dir /tmp/avatar-performance-sources
 * node scripts/avatar/make-office-takes.mjs --download
 * See docs/AVATAR_OFFICE_ASSETS.md. This does not generate speech or a new identity.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'public/avatar/office');
const review = path.join(root, '.data/avatar-office-review');
const width = 1280, height = 720;
const licenseUrl = 'https://www.pexels.com/license/';
const sources = {
  '7643308': { sha256: 'e114e8a3da63c21ca3dd24ea2fd3912c2bfd44c4ecd1410b94df57ef93aa8350', duration: 39.04 },
  '7643844': { sha256: '6808cf99416e4f294ff6d1857d3068a48954688912a330fc45759436e67e5f98', duration: 20.52 },
  '7644018': { sha256: '5e0810f74a6325b1761f4aeb091880f5475f413269b51431d51a2aaf31978937', duration: 19.56,
    page: 'https://www.pexels.com/video/woman-working-using-her-digital-tablet-7644018/' },
  '7643474': { sha256: 'efd645cb0f6b9626b04e96b260fae84b6003bf7d727010ab666ccd05ab9eaf65', duration: 7.32 },
  '7644035': { sha256: '9f469f64383fef360825247785c2046bc822e73e0318baaedbaf90e46e1e222d', duration: 19.52 },
};
const shots = [
  { id: 'attention-open', kind: 'attention', sourceId: '7644035', start: 0, end: 3.4, crop: '1600:900:840:600' },
  { id: 'attention-return', kind: 'handover', sourceId: '7644035', start: 17.4, end: 19.52, crop: '1600:900:840:600' },
  { id: 'work-wide', kind: 'work', sourceId: '7643474', start: 0, end: 7.32 },
  { id: 'work-detail', kind: 'work', sourceId: '7644018', start: 0, end: 19.56 },
  { id: 'attention-late', kind: 'attention', sourceId: '7643844', start: 16, end: 19.2,
    crop: '2100:1312:166+86*t:200', height: 800 },
];

function run(command, args, capture = false) {
  const result = spawnSync(command, args, { stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}: ${result.stderr ?? ''}`);
  return result.stdout;
}
const args = process.argv.slice(2);
let sourceDir, download = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--source-dir') {
    sourceDir = args[++i];
    if (!sourceDir || sourceDir.startsWith('--')) throw new Error('--source-dir needs a directory.');
  } else if (args[i] === '--download') download = true;
  else throw new Error(`Unknown argument: ${args[i]}`);
}
if (sourceDir && download) throw new Error('Choose --source-dir or --download.');
if (!sourceDir && !download) {
  console.log('Use --source-dir containing the five ID.mp4 files, or --download for the documented free originals.');
  process.exit(0);
}
sourceDir = sourceDir ? path.resolve(sourceDir) : path.join(root, '.data/avatar-office-originals');
await mkdir(sourceDir, { recursive: true });
await mkdir(output, { recursive: true });
await mkdir(review, { recursive: true });
for (const [id, source] of Object.entries(sources)) {
  source.downloadUrl = `https://videos.pexels.com/video-files/${id}/${id}-uhd_4096_2160_25fps.mp4`;
  source.sourceUrl = source.page ?? `https://www.pexels.com/video/${id}/`;
  source.path = path.join(sourceDir, `${id}.mp4`);
  if (download) run('curl', ['--fail', '--location', '--max-time', '120', '--max-filesize', '60000000', '--output', source.path, source.downloadUrl]);
  const info = await stat(source.path);
  if (!info.isFile() || info.size > 60_000_000) throw new Error(`Invalid or oversized original ${id}.`);
  if (createHash('sha256').update(await readFile(source.path)).digest('hex') !== source.sha256) {
    throw new Error(`Original ${id} changed. Inspect provenance and footage before updating its expected checksum.`);
  }
}

const takes = [];
for (const shot of shots) {
  const source = sources[shot.sourceId];
  const crop = shot.crop ?? '3840:2160:128:0';
  const filter = `crop=${crop},scale=${width}:${shot.height ?? height}:flags=lanczos,setsar=1`;
  const filename = path.join(output, `${shot.id}.mp4`);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(shot.start), '-i', source.path,
    '-t', String(shot.end - shot.start), '-map', '0:v:0',
    '-vf', filter, '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-crf', '22',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', filename]);
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames', '-of', 'json', filename], true));
  const durationMs = Math.round(Number(probe.format.duration) * 1000);
  if (Math.abs(durationMs - Math.round((shot.end - shot.start) * 1000)) > 40 ||
      probe.streams.length !== 1 || probe.streams[0].codec_type !== 'video' ||
      probe.streams[0].r_frame_rate !== '25/1') throw new Error(`Unexpected duration or streams in ${shot.id}.`);
  // Contact sheets are review artifacts, outside public assets. One frame per second.
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', filename,
    '-vf', "fps=1,scale=320:-1,drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5,tile=5x4",
    path.join(review, `${shot.id}-%02d.jpg`)]);
  takes.push({ id: shot.id, src: `/avatar/office/${shot.id}.mp4`, kind: shot.kind,
    sourceId: shot.sourceId, sourceInMs: Math.round(shot.start * 1000), sourceOutMs: Math.round(shot.end * 1000), durationMs,
    provenance: { creator: 'MART PRODUCTION', sourceUrl: source.sourceUrl, downloadUrl: source.downloadUrl,
      license: 'Pexels License', licenseUrl, sourceSha256: source.sha256,
      sourceIn: shot.start, sourceOut: shot.end, crop, speed: 1, direction: 'forward',
      outputSha256: createHash('sha256').update(await readFile(filename)).digest('hex') } });
  console.log(`${shot.id}: ${durationMs} ms, ${probe.streams[0].nb_frames} frames`);
}

const posterPath = path.join(output, 'poster.jpg');
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '9', '-i', sources['7643308'].path,
  '-vf', 'crop=3840:2160:128:0,scale=1280:720:flags=lanczos,setsar=1', '-frames:v', '1', '-q:v', '2', posterPath]);
const poster = await readFile(posterPath);
const comment = Buffer.from(`Origin: MART PRODUCTION, Pexels video 7643308, source frame at 9s, crop=3840:2160:128:0. ${licenseUrl} Original SHA256 ${sources['7643308'].sha256}. Licensed filmed stand-in; no endorsement or generated identity.`, 'utf8');
const marker = Buffer.alloc(4);
marker.writeUInt16BE(0xfffe, 0); marker.writeUInt16BE(comment.length + 2, 2);
await writeFile(posterPath, Buffer.concat([poster.subarray(0, 2), marker, comment, poster.subarray(2)]));
await writeFile(path.join(output, 'takes.json'), `${JSON.stringify({
  id: 'office', label: 'Office', poster: '/avatar/office/poster.jpg', width, height,
  attribution: { creator: 'MART PRODUCTION', sourceUrl: 'https://www.pexels.com/video/a-businesswoman-greeting-and-talking-7643308/',
    license: 'Pexels License', licenseUrl, note: 'Licensed actor footage edited for this concept. The person shown does not endorse the product. These takes are not generated or lip-synced.' },
  takes,
}, null, 2)}\n`);
console.log(`Wrote ${output}; inspection sheets: ${review}`);
