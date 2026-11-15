/**
 * The rules of the listening post (/listen): what AIDaddy does with one sentence it heard.
 *
 * Everything here runs in the browser and sends nothing. A sentence is small talk until it names AIDaddy or
 * matches one of the life events below. The patterns follow the Telegram bot's wake patterns
 * (hermes/config.snippet.yaml), in English and Finnish, without look-behind so older phones can read them.
 */

/** The four desks a matter can go to. They ask the Engine different questions, as the bot's skills do. */
export type Desk = "life" | "legal" | "travel" | "finance";

export type Trigger = {
  /** What it is about, for the "already on it" check: "rent", "travel", "tax", ... or "asked" when only the name was said. */
  kind: string;
  desk: Desk;
  /** Worth a call even before the plan is known: a cancelled trip, an eviction, a fine, a job loss, a sick child. */
  urgent: boolean;
  /** Someone said AIDaddy's name. */
  addressed: boolean;
};

export const DESKS: Record<Desk, { name: string; question: string; scope: "auto" | "official" }> = {
  life: { name: "Life events desk", question: "What do we need to do, by when, and what are we entitled to?", scope: "auto" },
  legal: {
    name: "Legal desk",
    question: "What are my rights here, what is the time limit to object or appeal, and which authority handles it?",
    scope: "official",
  },
  travel: { name: "Travel desk", question: "What am I entitled to, how do I claim it, and by when?", scope: "official" },
  finance: {
    name: "Finance desk",
    question: "Which amounts and limits apply this year, what do I have to file or apply for, and by when?",
    scope: "official",
  },
};

/** A whole word or phrase: not the middle of a longer word. `L` stands for "any further letters" (a word ending). */
const words = (alternatives: string) =>
  new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${alternatives.replaceAll("L", "\\p{L}*")})(?![\\p{L}\\p{N}])`, "iu");

type Rule = { kind: string; desk: Desk; urgent: boolean; pattern: RegExp };

/** The first rule that matches decides, so the more specific and the more urgent come first. */
const RULES: Rule[] = [
  {
    kind: "travel",
    desk: "travel",
    urgent: true,
    pattern: words(
      "(?:flight|train|ferry|bus)[^.?!]{0,40}(?:cancelL|delayL)|(?:cancelL|delayL)[^.?!]{0,40}(?:flight|train|ferry|bus)|missed (?:the |our |my )?(?:flight|connection|train)|lost (?:my |our |the )?(?:luggage|baggage|passport)|stranded" +
        "|(?:lento|juna|laiva)L[^.?!]{0,30}(?:peruL|myöhäL)|(?:peruttu|peruutettu|myöhäsL)[^.?!]{0,30}(?:lento|juna|laiva)L",
    ),
  },
  { kind: "eviction", desk: "legal", urgent: true, pattern: words("evictL|eviction notice|häätöL|häädetL") },
  {
    kind: "fine",
    desk: "legal",
    urgent: true,
    pattern: words(
      "(?:parking|speeding|traffic) (?:fine|ticket)|got fined|got a fine|penalty (?:fee|charge|notice)|debt collection|sakkoL|sakon|sakot|pysäköintivirhemaksuL|perintätoimistoL|perintäkirjeL",
    ),
  },
  {
    kind: "job-loss",
    desk: "life",
    urgent: true,
    pattern: words("laid off|layoffs?|made redundant|redundancy|got fired|lost my job|losing my job|irtisanoL|lomautL|sain potkut"),
  },
  {
    kind: "sick-child",
    desk: "life",
    urgent: true,
    pattern: words("(?:kid|child|son|daughter|baby) (?:is|has|got) (?:sick|ill|a fever)|lapsi on (?:sairas|kipeä)|lapsella on kuumeL"),
  },
  {
    kind: "rent",
    desk: "legal",
    urgent: false,
    pattern: words(
      "landlord|rent (?:increase|rise|hike)|raisL (?:the|our|my) rent|rent (?:is|was) (?:going up|raised)|(?:my|our|the) deposit|vuokranantajL|vuokrankorotuL|vuokraL nousL|vakuusmaksuL",
    ),
  },
  {
    kind: "tax",
    desk: "finance",
    urgent: false,
    pattern: words(
      "tax (?:letter|return|card|refund|decision|office|bill|credit|deduction)|back taxes|verokortL|veroilmoituL|veropäätöL|veronpalautuL|jäännösverL|mätkyL|kotitalousvähennyL",
    ),
  },
  {
    kind: "benefit",
    desk: "finance",
    urgent: false,
    pattern: words(
      "(?:housing|child|unemployment|sickness|parental|maternity) (?:benefit|allowance|grant)|kela|kelaan|kelalta|kelasta|asumistuL|lapsilisL|toimeentulotuL|työttömyysturvaL",
    ),
  },
  {
    kind: "permit",
    desk: "life",
    urgent: false,
    pattern: words(
      "residence permit|work permit|visa|citizenship|immigration|personal identity code|migri|migristä|migriin|oleskelulupL|viisumiL|kansalaisuuL|henkilötunnuL",
    ),
  },
  {
    kind: "family",
    desk: "life",
    urgent: false,
    pattern: words(
      "pregnanL|expecting (?:a|our|another) (?:baby|child)|having a baby|due date|gave birth|giving birth|newborn|maternity|paternity|parental leave|daycare" +
        "|raskaaL|raskauL|odota(?:n|mme) vauvaa|laskettu aika|vastasyntynL|äitiysL|isyysL|vanhempainvapaaL|neuvolaL|päiväkotL",
    ),
  },
  {
    kind: "job",
    desk: "life",
    urgent: false,
    pattern: words("new job|job offer|unemployL|resignL|työttömL|uusi työL|työtarjouL"),
  },
  {
    kind: "moving",
    desk: "life",
    urgent: false,
    pattern: words(
      "moving (?:out|in|house|home|to)|we are moving|we're moving|new (?:flat|apartment|lease)|change of address|muutamme|muutetaan|muutimme|muuttoL|uusi asunto",
    ),
  },
  {
    kind: "letter",
    desk: "legal",
    urgent: false,
    pattern: words("letter from|got a letter|official letter|invoice|sain kirjeen|kirje (?:kelalta|verolta|migristä|vuokranantajalta|poliisilta)"),
  },
  {
    kind: "consumer",
    desk: "legal",
    urgent: false,
    pattern: words(
      "warranty|stopped working|broke down|price (?:increase|rise|hike)|subscription (?:went up|price)|takuuL|meni rikki|hajosi|hinnankorotuL",
    ),
  },
  {
    kind: "allowed",
    desk: "legal",
    urgent: false,
    pattern: words(
      "customs|duty[- ]free|is it (?:legal|illegal|allowed)|can (?:i|we) (?:bring|take|carry|import)|tulliL|saa(?:ko|nko) (?:tuoda|viedä)|onko (?:laillista|sallittua)",
    ),
  },
];

/** The name as written, anywhere in the sentence: "AIDaddy", "AI Daddy", "A.I. daddy". */
const NAME = /(?:^|[^\p{L}\p{N}])(?:ai\s?dadd(?:y|ie)|a\.\s?i\.?\s?dadd(?:y|ie))(?![\p{L}\p{N}])/iu;
/**
 * What speech recognition often makes of the name: "eye daddy", "I daddy", "a daddy". Only at the start of a sentence,
 * so "I'm a daddy" is not a call. A child's "Daddy, ..." and "Hey daddy" are left alone on purpose.
 */
const NAME_AS_HEARD = /^\s*(?:(?:hey|hi|ok|okay|hei)[,\s]+)?(?:eye|i|a)\s+dadd(?:y|ie)[,\s]/iu;

export const isAddressed = (text: string): boolean => NAME.test(text) || NAME_AS_HEARD.test(text);

/** The sentence without the name it was addressed to. */
export function withoutName(text: string): string {
  return text
    .replace(/^\s*(?:(?:hey|hi|ok|okay|hei)[,\s]+)?(?:ai\s?dadd(?:y|ie)|a\.\s?i\.?\s?dadd(?:y|ie)|(?:eye|i|a)\s+dadd(?:y|ie))[,\s]*/iu, "")
    .trim();
}

/** What one heard sentence is: a matter for a desk, or nothing (small talk). */
export function decide(text: string): Trigger | null {
  const sentence = text.replace(/\s+/g, " ").trim();
  if (!sentence) return null;
  const addressed = isAddressed(sentence);
  const rule = RULES.find((item) => item.pattern.test(sentence));
  if (rule) return { kind: rule.kind, desk: rule.desk, urgent: rule.urgent, addressed };
  // Its name without a known topic: research what was asked, if it is long enough to be a question.
  if (addressed && withoutName(sentence).split(" ").length >= 3) return { kind: "asked", desk: "life", urgent: false, addressed };
  return null;
}

export type Heard = { text: string; at: number };

/** How far back and forward the sentences around a life event still belong to it. */
const BEFORE_MS = 45_000;
const AROUND = 2;

/**
 * The question sent to the Engine: the sentence that started it, the two sentences before and after it when
 * they were said close to it, and the desk's question. Nothing else that was heard is sent.
 */
export function situation(lines: Heard[], index: number, desk: Desk): string {
  const trigger = lines[index];
  const before = lines.slice(Math.max(0, index - AROUND), index).filter((line) => trigger.at - line.at <= BEFORE_MS);
  const after = lines.slice(index + 1, index + 1 + AROUND);
  const said = [...before, trigger, ...after]
    .map((line) => withoutName(line.text).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => (/[.!?…]$/.test(line) ? line : `${line}.`))
    .join(" ");
  return `${said.slice(0, 1100)} ${DESKS[desk].question}`.trim();
}

/** A plan line carries a deadline when what follows its title names a time. Source numbers are not part of it. */
const TIME =
  /\b(?:days?|weeks?|months?|years?|before|after|within|until|by|no later|at the latest|deadline|immediately|as soon as|january|february|march|april|may|june|july|august|september|october|november|december)\b|päiv|viiko|kuukau|vuo(?:si|den|tta)|ennen|mennessä|viimeistään|kuluessa|heti/iu;

export function hasDeadline(planLine: string): boolean {
  const fact = planLine.replace(/\s*\[\d+\]/g, "").split(/:\s+/).slice(1).join(": ");
  return TIME.test(fact);
}

/**
 * How AIDaddy comes back: it calls when what it heard is urgent or the plan has a deadline, and pings otherwise.
 * A plan with nothing confirmed is never worth a call.
 */
export function importance(trigger: Pick<Trigger, "urgent">, result: { plan: string[]; evidenceVerified: number }): "call" | "ping" {
  if (!result.plan.length || !result.evidenceVerified) return "ping";
  return trigger.urgent || result.plan.some(hasDeadline) ? "call" : "ping";
}

/** What AIDaddy says when the call is answered: the stored plan, nothing added. */
export function spoken(result: { title: string; plan: string[]; evidenceVerified: number; evidenceTotal: number }, language: "en" | "fi"): string {
  const lines = result.plan.map((line) => line.replace(/\s*\[\d+\]/g, "").replace(/\s*\(\d+\)/g, "").trim()).map((line) => (/[.!?…]$/.test(line) ? line : `${line}.`));
  const closing =
    language === "fi"
      ? `${result.evidenceVerified} lainausta ${result.evidenceTotal}:sta löytyi lähdesivuilta. Lähteet ovat ruudulla.`
      : `${result.evidenceVerified} of ${result.evidenceTotal} quotes were found on their pages. The sources are on the screen.`;
  return [`${result.title}.`, ...lines, closing].join(" ");
}
