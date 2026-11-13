import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { env } from '../../config/env'

const dir = () => resolve(env.DATA_DIR, 'exa-cache')

function fileFor(method: string, request: unknown): string {
  const key = createHash('sha256')
    .update(JSON.stringify([method, request]))
    .digest('hex')
  return join(dir(), `${method}-${key.slice(0, 32)}.json`)
}

export interface CacheEntry<T> {
  method: string
  request: unknown
  /** When the live Exa call was made. */
  fetchedAt: string
  response: T
}

/**
 * Disk cache for Exa responses, keyed by method + exact request.
 * On in dev so repeated demo runs do not burn credits; `pnpm reset` clears it.
 * A cache hit still reports the original `fetchedAt`, so dates shown to users stay honest.
 */
export async function withExaCache<T>(
  method: string,
  request: unknown,
  fetchLive: () => Promise<T>,
): Promise<CacheEntry<T> & { cached: boolean }> {
  const file = fileFor(method, request)
  if (env.exaCache) {
    try {
      return { ...(JSON.parse(readFileSync(file, 'utf8')) as CacheEntry<T>), cached: true }
    } catch {
      // miss
    }
  }
  const entry: CacheEntry<T> = { method, request, fetchedAt: new Date().toISOString(), response: await fetchLive() }
  if (env.exaCache) {
    mkdirSync(dir(), { recursive: true })
    writeFileSync(file, JSON.stringify(entry, null, 2))
  }
  return { ...entry, cached: false }
}
