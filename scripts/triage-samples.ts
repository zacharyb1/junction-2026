// Runs triage over sample messages and prints the verdicts. Needs the model key in .env.
//   pnpm triage:samples
import { modelKeyName } from '../src/config/env'
import { decide, triageMessage, type TriageDecision } from '../src/mastra/agents/triage'

const samples: { text: string; expect: TriageDecision | 'offer|clarify' }[] = [
  { text: 'lol ok', expect: 'silent' },
  { text: "what's for dinner", expect: 'silent' },
  { text: 'did you pay the electricity bill?', expect: 'silent' },
  { text: 'my sister is pregnant again haha', expect: 'silent' },
  { text: 'imagine if we won the lottery and moved to Spain', expect: 'silent' },
  { text: 'mitä syötäis tänään?', expect: 'silent' },
  { text: 'OMG 2 bars 😭', expect: 'offer|clarify' },
  { text: 'I just took a test and it is positive. We are having a baby!!', expect: 'offer' },
  { text: 'Tein testin, kaksi viivaa 😭❤️ ollaan raskaana!', expect: 'offer' },
  { text: 'I GOT THE JOB!!! starting in January', expect: 'offer' },
  { text: 'they let me go today. whole team laid off.', expect: 'offer' },
  { text: 'so... it finally happened 😳', expect: 'offer|clarify' },
]

if (!process.env[modelKeyName()]?.trim()) {
  console.error(`${modelKeyName()} is not set, so triage cannot run. Add it to .env and retry.`)
  process.exit(1)
}

let mismatches = 0
for (const s of samples) {
  try {
    const v = await triageMessage({ text: s.text })
    const d = decide(v)
    const ok = s.expect.split('|').includes(d)
    if (!ok) mismatches++
    console.log(
      `${ok ? 'ok  ' : 'DIFF'} ${d.padEnd(7)} ${v.eventType.padEnd(15)} conf=${v.confidence.toFixed(2)} lang=${v.language}  ${JSON.stringify(s.text)}` +
        (v.reply ? `\n       reply: ${v.reply}` : ''),
    )
  } catch (err) {
    mismatches++
    console.log(`ERR  ${JSON.stringify(s.text)}: ${(err as Error).message}`)
  }
}
console.log(`\n${samples.length - mismatches}/${samples.length} as expected`)
process.exit(mismatches ? 1 : 0)
