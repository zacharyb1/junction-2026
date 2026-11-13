import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { Mastra } from '@mastra/core'
import { LibSQLStore } from '@mastra/libsql'
import { env } from '../config/env'
import { companionAgent } from './agents/companion'
import { researcherAgent } from './agents/researcher'
import { triageAgent } from './agents/triage'
import { lifeEventPlanWorkflow } from './workflows/life-event-plan'

// A local LibSQL file needs its folder to exist. data/ is gitignored and survives container rebuilds.
if (env.DATABASE_URL.startsWith('file:')) {
  mkdirSync(dirname(resolve(env.DATABASE_URL.slice('file:'.length))), { recursive: true })
}

export const mastra = new Mastra({
  agents: { companionAgent, triageAgent, researcherAgent },
  workflows: { lifeEventPlanWorkflow },
  // Workflow snapshots (suspend/resume), channel subscriptions and memory all live here.
  storage: new LibSQLStore({ id: 'mastra-storage', url: env.DATABASE_URL }),
})
