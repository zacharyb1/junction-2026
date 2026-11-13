import { z } from 'zod'

/** Treat blank values (as left in a freshly copied .env.example) as unset. */
const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)
const opt = z.preprocess(blank, z.string().optional())

const schema = z.object({
  NODE_ENV: z.preprocess(blank, z.enum(['development', 'production', 'test']).default('development')),
  PORT: z.preprocess(blank, z.coerce.number().int().default(4111)),
  MODEL: z.preprocess(blank, z.string().default('anthropic/claude-sonnet-5-5')),
  /** Folder for local state: LibSQL file, Exa cache, remembered chat. */
  DATA_DIR: z.preprocess(blank, z.string().default('data')),
  DATABASE_URL: opt,
  TELEGRAM_BOT_TOKEN: opt,
  TELEGRAM_BOT_USERNAME: opt,
  TELEGRAM_ALLOWED_USER_IDS: opt,
  TELEGRAM_DEMO_CHAT_ID: opt,
  EXA_API_KEY: opt,
  /** Only for the offline smoke test, which points the Exa client at a local fake. */
  EXA_BASE_URL: opt,
  EXA_WEBHOOK_SECRET: opt,
  EXA_CACHE: z.preprocess(blank, z.enum(['on', 'off']).optional()),
})

const parsed = schema.parse(process.env)

export const env = {
  ...parsed,
  DATABASE_URL: parsed.DATABASE_URL ?? `file:./${parsed.DATA_DIR}/mastra.db`,
  isProd: parsed.NODE_ENV === 'production',
  /** Exa cache: on in dev unless switched off, off in production unless switched on. */
  exaCache: parsed.EXA_CACHE ? parsed.EXA_CACHE === 'on' : parsed.NODE_ENV !== 'production',
}

/** Env var holding the API key for the provider named in MODEL. */
export function modelKeyName(model = env.MODEL): string {
  const provider = model.split('/')[0] ?? ''
  if (provider === 'google') return 'GOOGLE_GENERATIVE_AI_API_KEY'
  return `${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`
}

/** Names (never values) of the settings that are missing, with what breaks without them. */
export function missingConfig(): string[] {
  const out: string[] = []
  if (!env.TELEGRAM_BOT_TOKEN) out.push('TELEGRAM_BOT_TOKEN (Telegram channel is disabled)')
  if (!env.EXA_API_KEY) out.push('EXA_API_KEY (research returns "nothing found" unless a cached response exists)')
  const key = modelKeyName()
  if (!process.env[key]?.trim()) out.push(`${key} (model calls for ${env.MODEL} will fail; the bot stays silent)`)
  if (!env.EXA_WEBHOOK_SECRET) out.push('EXA_WEBHOOK_SECRET (POST /webhooks/exa-monitor rejects every request)')
  return out
}
