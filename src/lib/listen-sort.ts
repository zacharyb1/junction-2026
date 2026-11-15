/**
 * The model check behind the listening page's switch: one sentence the phrase list in src/lib/listen.ts did not
 * catch, labelled by the server's local Gemma (the Telegram gate's model, through Ollama). Server-side only.
 *
 * The prompt and examples are the Telegram gate's (hermes/plugins/kaveri-gate/gate.py SYSTEM and SHOTS), so both
 * channels sort sentences the same way. Change them together.
 */

export type Label = "trigger" | "small_talk" | "unsure";

const LABELS: Label[] = ["trigger", "small_talk", "unsure"];

const SYSTEM = `You sort messages from a household's group chat (family, flatmates or newcomers who moved to Finland). Answer with one label.

trigger: the message mentions a life event or a paperwork task for the household. Examples of topics: pregnancy or birth, moving home, losing or changing a job, a sick child, a rent increase, a letter from a landlord or an authority, a fine, a residence permit or visa, registering an address or a personal identity code, a bank ID, a tax card, Kela registration, health centre registration, job-seeker registration, taxes, a benefit decision, a cancelled or delayed flight or train, a broken appliance, a subscription or price change, planning a wedding or anniversary.

small_talk: everyday chatter. Examples of topics: food, shopping, greetings, jokes, who picks up whom, being late, weather, TV, thanks, plans for tonight.

unsure: you cannot tell.

Messages are in English or Finnish. Reply only with JSON like {"label": "small_talk"}.`;

const SHOTS: [string, Label][] = [
  ["see you at 7", "small_talk"],
  ["My job ends next month, they are closing the office", "trigger"],
  ["ostin uudet kengät", "small_talk"],
  ["lapsi on kuumeessa, en pääse töihin", "trigger"],
  ["is the dishwasher done?", "small_talk"],
  ["The train to Turku was two hours late, can we get money back?", "trigger"],
  ["mennäänkö kävelylle?", "small_talk"],
  ["Migristä tuli päätös", "trigger"],
  ["I moved here last week, where do I get a tax card?", "trigger"],
  ["miten rekisteröin osoitteeni DVV:hen?", "trigger"],
];

/** Where Ollama answers. In Compose the web container reaches the bot profile's `ollama` service by name. */
export const sortUrl = () => process.env.KAVERI_GATE_URL || "http://ollama:11434";
const model = () => process.env.KAVERI_GATE_MODEL || "gemma3:1b";

/** One label, or throws when the model is missing, slow or confused. */
export async function sortSentence(text: string, timeoutMs = 8_000): Promise<Label> {
  const messages = [{ role: "system", content: SYSTEM }];
  for (const [shot, label] of SHOTS) {
    messages.push({ role: "user", content: shot }, { role: "assistant", content: JSON.stringify({ label }) });
  }
  messages.push({ role: "user", content: text.slice(0, 600) });
  const res = await fetch(`${sortUrl().replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: model(),
      messages,
      stream: false,
      format: { type: "object", properties: { label: { type: "string", enum: LABELS } }, required: ["label"] },
      keep_alive: "60m",
      options: { temperature: 0, num_predict: 16, num_ctx: 2048 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`model answered ${res.status}`);
  const body = (await res.json()) as { message?: { content?: string } };
  const label = JSON.parse(body.message?.content ?? "{}").label as Label;
  if (!LABELS.includes(label)) throw new Error(`unexpected label: ${String(label)}`);
  return label;
}
