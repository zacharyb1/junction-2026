import { createTool } from '@mastra/core/tools'
import Exa from 'exa-js'
import { z } from 'zod'
import { env } from '../../config/env'
import { withExaCache } from './exa-cache'

export class ExaUnavailableError extends Error {}

let client: Exa | undefined
function exa(): Exa {
  if (!env.EXA_API_KEY) throw new ExaUnavailableError('EXA_API_KEY is not set')
  client ??= new Exa(env.EXA_API_KEY, env.EXA_BASE_URL)
  return client
}

export const exaSearchInput = z.object({
  query: z.string().describe('Natural-language search query. Use the language the sources are written in.'),
  numResults: z.number().int().min(1).max(10).default(5),
  includeDomains: z
    .array(z.string())
    .optional()
    .describe('Restrict to these domains or path prefixes, e.g. ["kela.fi"].'),
  userLocation: z.string().length(2).optional().describe('Two-letter country code of the end user, e.g. "FI".'),
  snapshotAsOf: z
    .string()
    .optional()
    .describe('ISO datetime. Return the page as Exa stored it at or before this instant (research preview).'),
})
export type ExaSearchInput = z.input<typeof exaSearchInput>

export const exaResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  /** Estimated publication date from Exa, when it has one. */
  publishedDate: z.string().optional(),
  /** Crawl instant of the stored version, only for snapshotAsOf requests. */
  snapshotAt: z.string().optional(),
  /** Query-relevant verbatim excerpts from the page. */
  highlights: z.array(z.string()),
})
export type ExaResult = z.infer<typeof exaResultSchema>

export const exaSearchOutput = z.object({
  results: z.array(exaResultSchema),
  /** When the live Exa request was made (earlier than now on a cache hit). */
  fetchedAt: z.string(),
  cached: z.boolean(),
})
export type ExaSearchOutput = z.infer<typeof exaSearchOutput>

interface RawResult {
  title?: string | null
  url: string
  publishedDate?: string
  snapshotAt?: string
  highlights?: string[]
}

function normalise(results: RawResult[]): ExaResult[] {
  return results.map((r) => ({
    title: r.title?.trim() || r.url,
    url: r.url,
    publishedDate: r.publishedDate || undefined,
    snapshotAt: r.snapshotAt || undefined,
    highlights: (r.highlights ?? []).filter((h) => h.trim().length > 0),
  }))
}

/** Exa web search with highlights. The single entry point for all research. */
export async function exaSearch(input: ExaSearchInput): Promise<ExaSearchOutput> {
  const req = exaSearchInput.parse(input)
  const entry = await withExaCache('search', req, async () => {
    const res = await exa().search(req.query, {
      type: 'auto',
      numResults: req.numResults,
      includeDomains: req.includeDomains,
      userLocation: req.userLocation,
      contents: { highlights: true, ...(req.snapshotAsOf ? { snapshotAsOf: req.snapshotAsOf } : {}) },
    })
    return normalise(res.results as RawResult[])
  })
  return { results: entry.response, fetchedAt: entry.fetchedAt, cached: entry.cached }
}

export const exaContentsInput = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
  query: z.string().optional().describe('What to look for on the pages; steers which excerpts are returned.'),
  snapshotAsOf: z.string().optional().describe('ISO datetime. Read the stored version at or before this instant.'),
})
export type ExaContentsInput = z.input<typeof exaContentsInput>

/** Fetch highlights for known URLs, optionally as an older stored snapshot. */
export async function exaContents(input: ExaContentsInput): Promise<ExaSearchOutput> {
  const req = exaContentsInput.parse(input)
  const entry = await withExaCache('contents', req, async () => {
    const res = await exa().getContents(req.urls, {
      highlights: req.query ? { query: req.query } : true,
      ...(req.snapshotAsOf ? { snapshotAsOf: req.snapshotAsOf } : {}),
    })
    return normalise(res.results as RawResult[])
  })
  return { results: entry.response, fetchedAt: entry.fetchedAt, cached: entry.cached }
}

export const exaSearchTool = createTool({
  id: 'exa-search',
  description:
    'Search the live web with Exa. Returns pages with title, url, publishedDate and verbatim highlights. ' +
    'This is the only allowed source of facts: cite the url of the result a fact came from.',
  inputSchema: exaSearchInput,
  outputSchema: exaSearchOutput,
  execute: async (input) => exaSearch(input),
})

export const exaContentsTool = createTool({
  id: 'exa-contents',
  description:
    'Read specific URLs with Exa and return verbatim highlights. With snapshotAsOf it returns an older stored ' +
    'version of the page, useful to compare what a rule said before and now.',
  inputSchema: exaContentsInput,
  outputSchema: exaSearchOutput,
  execute: async (input) => exaContents(input),
})
