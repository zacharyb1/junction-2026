import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

export const partnerSchema = z.object({
  name: z.string(),
  expecting: z.boolean(),
  employer: z.object({
    name: z.string(),
    sector: z.string(),
    role: z.string(),
    collectiveAgreement: z.string(),
  }),
})

export const profileSchema = z.object({
  fictional: z.literal(true),
  id: z.string(),
  country: z.string(),
  municipality: z.string(),
  languages: z.array(z.string()),
  partners: z.array(partnerSchema).length(2),
})

export type Profile = z.infer<typeof profileSchema>
export type Partner = z.infer<typeof partnerSchema>

let cached: Profile | undefined

/**
 * The household profile for a chat. Milestone 2 has exactly one profile:
 * the fictional Espoo couple, used for every chat the bot is in.
 */
export function loadProfile(): Profile {
  cached ??= profileSchema.parse(JSON.parse(readFileSync(resolve('fixtures/couple.espoo.json'), 'utf8')))
  return cached
}
