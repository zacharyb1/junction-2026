import { Actions, Button, Card, CardText } from 'chat'
import type { Evidence, Plan } from '../mastra/schemas'
import { t } from './i18n'

/** Action ids. Telegram caps callback data at 64 bytes, so ids stay short and values are a single id. */
export const ACTION = { yes: 'le_yes', no: 'le_no', hr: 'hr_draft' } as const

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Escape characters that would otherwise be read as markdown inside link text. */
const plain = (s: string) =>
  s
    .replace(/[[\]()*_`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Assigns one stable number per distinct source URL, in order of first use. */
export class SourceList {
  private byUrl = new Map<string, { n: number; e: Evidence }>()

  ref(e: Evidence): string {
    let hit = this.byUrl.get(e.sourceUrl)
    if (!hit) {
      hit = { n: this.byUrl.size + 1, e }
      this.byUrl.set(e.sourceUrl, hit)
    }
    return `[[${hit.n}]](${e.sourceUrl})`
  }

  get size() {
    return this.byUrl.size
  }

  render(language: string): string {
    const s = t(language)
    return [...this.byUrl.values()]
      .map(({ n, e }) => {
        const title = plain(e.sourceTitle).slice(0, 70)
        return `${n}. [${title}](${e.sourceUrl}) (${host(e.sourceUrl)}, ${s[e.dateKind]} ${e.publishedOrCrawledDate})`
      })
      .join('\n')
  }
}

/** Warm line plus [Yes, help us] [Not now]. Nothing else. */
export function offerCard(args: { line: string; eventId: string; language: string }) {
  const s = t(args.language)
  return Card({
    children: [
      CardText(args.line),
      Actions([
        Button({ id: ACTION.yes, value: args.eventId, label: s.yes, style: 'primary' }),
        Button({ id: ACTION.no, value: args.eventId, label: s.no }),
      ]),
    ],
  })
}

export function planBody(plan: Plan, language: string): string {
  const s = t(language)
  const sources = new SourceList()
  const lines: string[] = [`**${s.planTitle}**`, '']
  if (plan.items.length === 0) lines.push(s.planEmpty, '')
  plan.items.forEach((item, i) => {
    lines.push(`**${i + 1}. ${plain(item.title)}**`)
    for (const e of item.evidence) lines.push(`${e.claim} ${sources.ref(e)}`)
    lines.push('')
  })
  if (plan.missing.length > 0) lines.push(`${s.missing}: ${plan.missing.join('; ')}.`, '')
  if (sources.size > 0) lines.push(`**${s.sources}**`, sources.render(language))
  return lines.join('\n').trim()
}

/** The "next 7 days" card: 3 to 5 items with numbered source links and the HR button. */
export function planCard(args: { plan: Plan; language: string; runId: string }) {
  return Card({
    children: [
      CardText(planBody(args.plan, args.language)),
      Actions([Button({ id: ACTION.hr, value: args.runId, label: t(args.language).hrButton, style: 'primary' })]),
    ],
  })
}

/** The plan again, without the button, once the HR draft was requested. */
export function planCardDone(args: { plan: Plan; language: string }): { markdown: string } {
  return { markdown: planBody(args.plan, args.language) }
}

export function hrDraftMessage(args: { draft: string; evidence: Evidence[]; language: string }): { markdown: string } {
  const s = t(args.language)
  const sources = new SourceList()
  for (const e of args.evidence) sources.ref(e)
  const lines = [`**${s.hrTitle}**`, '', args.draft.trim(), '']
  if (sources.size > 0) lines.push(`**${s.hrBasedOn}**`, sources.render(args.language))
  else lines.push(`_${s.hrNoEvidence}_`)
  return { markdown: lines.join('\n').trim() }
}

export interface MonitorAlert {
  monitorId?: string
  summary?: string
  results: { title: string; url: string }[]
  simulated?: boolean
}

export function alertMessage(alert: MonitorAlert, language: string): { markdown: string } {
  const s = t(language)
  const lines = [`**${s.alertTitle}**${alert.simulated ? ' (simulated trigger)' : ''}`]
  if (alert.results.length === 0) lines.push('', '_The monitor ran and found nothing new._')
  alert.results.slice(0, 3).forEach((r, i) => {
    lines.push(`${i + 1}. [${plain(r.title).slice(0, 90)}](${r.url}) (${host(r.url)})`)
  })
  return { markdown: lines.join('\n') }
}
