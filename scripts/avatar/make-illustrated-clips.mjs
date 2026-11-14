#!/usr/bin/env node
/** Render the original SVG rig locally. Uses Next's installed sharp and the machine's ffmpeg. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { illustratedProfiles, renderIllustration } from './illustrated-scene.mjs';
import { clips, makeManifest } from './template.mjs';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const root = fileURLToPath(new URL('../../', import.meta.url));
const width = 800, height = 450, fps = 24;
// Keep the longest wait for a new action short enough for the recorded research run.
const clipSeconds = {
  idle: 1.5, listening: 2.5, thinking: 2.5, speaking: 3,
  'to-desk': 1, 'working-a': 2, 'working-b': 2, 'to-front': 1,
};
const requested = process.argv.slice(2);
const profiles = requested.length ? requested : Object.keys(illustratedProfiles);

for (const profile of profiles) {
  const definition = illustratedProfiles[profile];
  if (!definition) throw new Error(`Choose a known profile: ${Object.keys(illustratedProfiles).join(', ')}`);
  const output = path.join(root, 'public/avatar', profile);
  await mkdir(output, { recursive: true });
  const poster = renderIllustration(profile, 'idle', 0);
  await writeFile(path.join(output, 'poster.svg'), `${poster}\n`);
  const durations = {};
  for (const clip of clips) {
    const frames = clipSeconds[clip.id] * fps;
    durations[clip.id] = frames / fps * 1000;
    const encoder = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
      '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0', '-an',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart', path.join(output, `${clip.id}.mp4`),
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const finished = once(encoder, 'close');
    encoder.stdin.on('error', () => {});
    for (let frame = 0; frame < frames; frame++) {
      // Two identical frames at each boundary make explicit canonical poses inspectable.
      const progress = Math.max(0, Math.min(1, (frame - 1) / (frames - 3)));
      const svg = renderIllustration(profile, clip.id, progress);
      const rgb = await sharp(Buffer.from(svg)).flatten({ background: '#eee9df' }).removeAlpha().raw().toBuffer();
      if (!encoder.stdin.write(rgb)) await once(encoder.stdin, 'drain');
    }
    encoder.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(`ffmpeg failed for ${profile}/${clip.id}`);
    console.log(`${profile}/${clip.id}: ${durations[clip.id]} ms`);
  }
  const manifest = {
    ...makeManifest(profile, definition.label, durations, false), width, height,
    medium: 'illustrated', poster: `/avatar/${profile}/poster.svg`,
  };
  await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}
