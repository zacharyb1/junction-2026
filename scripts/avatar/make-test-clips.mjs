// Local playback fixtures only. Requires the machine's existing ffmpeg.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { clips, makeManifest } from './template.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'public/avatar/test');
await mkdir(output, { recursive: true });
const width = 640, height = 360, fps = 24;
const durations = {};

for (const clip of clips) {
  const frames = clip.kind === 'transition' ? 24 : 48;
  durations[clip.id] = frames / fps * 1000;
  const ffmpeg = spawn('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
    '-s', `${width}x${height}`, '-r', String(fps), '-i', 'pipe:0', '-an',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', path.join(output, `${clip.id}.mp4`),
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = once(ffmpeg, 'close');
  ffmpeg.stdin.on('error', () => {});
  for (let n = 0; n < frames; n++) {
    // Hold endpoints for four frames: identical rendered poses are visible at every join.
    const t = Math.max(0, Math.min(1, (n - 3) / (frames - 7)));
    const ease = t * t * (3 - 2 * t);
    const start = clip.from === 'front' ? 240 : 400;
    const end = clip.to === 'front' ? 240 : 400;
    const centerX = start + (end - start) * ease;
    const pulse = clip.kind === 'loop' ? Math.sin(Math.PI * t) ** 2 : 0;
    const colors = { idle: [139, 170, 151], listening: [129, 171, 190], thinking: [191, 166, 112], speaking: [184, 143, 156], 'working-a': [144, 159, 195], 'working-b': [144, 159, 195] };
    const accent = colors[clip.id] ?? [139, 170, 151];
    const rgb = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let color = [25, 31, 35];
      if (y >= 266 && y <= 268 && x > 80 && x < 560) color = [80, 93, 99];
      const dist = Math.hypot(x - centerX, y - 170);
      if (dist < 50) color = [185, 199, 198];
      if (dist > 60 && dist < 63 + pulse * 12) color = accent.map((v, i) => Math.round([49, 60, 53][i] * (1 - pulse) + v * pulse));
      // Fixed marks distinguish the two canonical positions without text baked into clips.
      if (y > 291 && y < 296 && ((x > 224 && x < 256) || (x > 384 && x < 416))) color = [80, 93, 99];
      const index = (y * width + x) * 3;
      rgb[index] = color[0]; rgb[index + 1] = color[1]; rgb[index + 2] = color[2];
    }
    if (!ffmpeg.stdin.write(rgb)) await once(ffmpeg.stdin, 'drain');
  }
  ffmpeg.stdin.end();
  const [code] = await done;
  if (code !== 0) throw new Error(`ffmpeg failed for ${clip.id}`);
}
const manifest = { ...makeManifest('test', 'Playback test', durations, true), width, height };
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(output, 'poster.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#191f23"/><path d="M81 267H559M225 293H255M385 293H415" stroke="#505d63" stroke-width="3"/><circle cx="240" cy="170" r="61" fill="none" stroke="#313c35" stroke-width="3"/><circle cx="240" cy="170" r="50" fill="#b9c7c6"/></svg>\n`);
console.log(`Generated ${clips.length} local test clips in ${output}`);
