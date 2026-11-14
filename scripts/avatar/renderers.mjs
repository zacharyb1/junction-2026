import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * Both adapters implement render({id, kind, prompt, images, durationMs?}).
 * Images are {bytes, mimeType}; the result is {bytes, mimeType}. Neither adapter
 * writes output files. The caller owns attempt accounting and publication.
 */
export function createGeminiRenderer({ apiKey, fetchImpl = globalThis.fetch }) {
  if (!apiKey) throw new Error('Set GEMINI_API_KEY in the environment or ignored .env.local.');
  return {
    async render(job) {
      if (!['image', 'video'].includes(job.kind)) throw new Error('Unsupported media kind.');
      const body = {
        model: job.kind === 'image' ? 'gemini-nano-banana-2.1' : 'gemini-omni-1.2-flash',
        input: [
          ...job.images.map(image => ({ type: 'image', mime_type: image.mimeType, data: image.bytes.toString('base64') })),
          { type: 'text', text: job.prompt },
        ],
        response_format: job.kind === 'image'
          ? { type: 'image', aspect_ratio: '16:9', image_size: '1K' }
          : { type: 'video', aspect_ratio: '16:9', resolution: '720p', duration: `${job.durationMs / 1000}s` },
        background: false, store: false, stream: false,
      };
      let response;
      try {
        response = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey, 'Api-Revision': '2026-05-20' },
          body: JSON.stringify(body), signal: AbortSignal.timeout(600_000),
        });
      } catch (error) {
        throw new Error(error?.name === 'TimeoutError'
          ? 'Gemini request timed out; it may still be billed. Inspect attempts.jsonl before retrying.'
          : 'Gemini request failed; the attempt may still be billed. No automatic retry.');
      }
      // Provider response bodies can echo credentials and inputs. Never print them.
      if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}; attempt recorded, no retry. Check model access, billing and quota.`);
      let result;
      try { result = await response.json(); } catch { throw new Error('Gemini returned an unreadable response; no retry.'); }
      if (result?.status !== 'completed') throw new Error('Gemini did not complete media generation; attempt recorded, no retry.');
      const media = Array.isArray(result?.steps) && result.steps
        .filter(step => step?.type === 'model_output')
        .flatMap(step => Array.isArray(step.content) ? step.content : [])
        .find(part => part?.type === job.kind && typeof part.data === 'string' && part.data);
      const allowed = job.kind === 'image' ? ['image/png', 'image/jpeg', 'image/webp'] : ['video/mp4'];
      if (!media || !allowed.includes(media.mime_type)) throw new Error(`Gemini returned no supported inline ${job.kind}; attempt recorded, no retry.`);
      const bytes = Buffer.from(media.data, 'base64');
      if (!bytes.length) throw new Error('Gemini returned empty media; attempt recorded, no retry.');
      return { bytes, mimeType: media.mime_type };
    },
  };
}

/** Local fixture adapter: no credentials, fetch, or service SDK are accessed. */
export function createFixtureRenderer({ fixtureDir }) {
  const imageClips = new Map([['front', 'idle'], ['desk', 'working-a']]);
  const videoIds = new Set(['idle', 'listening', 'thinking', 'speaking', 'to-desk', 'working-a', 'working-b', 'to-front']);
  return {
    async render(job) {
      if (job.kind === 'video') {
        if (!videoIds.has(job.id)) throw new Error('Unknown fixture clip.');
        return { bytes: await readFile(path.join(fixtureDir, `${job.id}.mp4`)), mimeType: 'video/mp4' };
      }
      const clip = imageClips.get(job.id);
      if (job.kind !== 'image' || !clip) throw new Error('Unknown fixture pose.');
      const result = spawnSync('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-i', path.join(fixtureDir, `${clip}.mp4`),
        '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', 'pipe:1',
      ], { maxBuffer: 10 * 1024 * 1024 });
      if (result.status !== 0 || !result.stdout?.length) throw new Error('Could not extract the fixture pose; check ffmpeg and local test assets.');
      return { bytes: result.stdout, mimeType: 'image/png' };
    },
  };
}
