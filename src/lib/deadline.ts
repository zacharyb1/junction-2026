import { isNumber, tokens } from "@/lib/text";

/**
 * Deadline arithmetic. A source says "no later than two months before the expected date of birth".
 * The family gives the date that counts from and gets a day for the calendar.
 * This is arithmetic on the source's wording and nothing more: a phrase that is not
 * one clear period counted once is left alone.
 */

export type Unit = "day" | "week" | "month" | "year";

export type ParsedDeadline = {
  amount: number;
  unit: Unit;
  direction: "before" | "after";
  /** What the period counts from, in the source's own words: "the expected date of birth of the child". */
  anchor?: string;
  /** "3 business days": Saturdays and Sundays are skipped. Public holidays are not known here. */
  workingDays?: boolean;
};

// \b does not treat ä, ö, å as letters, so word edges are spelled out.
const word = (alternatives: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, "giu");

const UNIT_WORD = "days?|weeks?|months?|years?|dag(?:ar)?|veck(?:a|or)|månad(?:er)?|år";
const FINNISH_UNIT = "päivän|vuorokauden|viikon|kuukauden|vuoden|päivää|vuorokautta|viikkoa|kuukautta|vuotta";

/** Wordings that `tokens` does not make canonical, rewritten before it runs. None of them touches the anchor. */
const REWRITES: [RegExp, string][] = [
  [word("(?:arki|työ|pankki)päivä(?:n|ä)?|(?:arbets|var|bank)dag(?:ar|ars)?"), "working day"],
  // "a month", "en vecka": one, written as an article.
  [word(`(?:an?|en|ett)(?=\\s+(?:(?:calendar|working|business|banking)\\s+)?(?:${UNIT_WORD})(?![\\p{L}\\p{N}]))`), "1"],
  // Finnish has no article: "viikon kuluessa" is within one week. Only where the phrase opens with it,
  // because any word before the unit ("puolen", "toisen") could change the amount.
  [new RegExp(`(?<=^\\s*(?:viimeistään\\s+)?)(?=(?:${FINNISH_UNIT})\\s+(?:kuluessa|sisällä|kuluttua|ennen)(?!\\p{L}))`, "iu"), "1 "],
  [word("in advance|beforehand|ahead of|prior to|etukäteen|i förväg|på förhand"), "before"],
  [word("sisällä"), "within"],
  [word("kuluttua"), "after"],
  [word("kk"), "kuukautta"],
  [word("vk"), "viikkoa"],
  [word("vrk|pv"), "päivää"],
  // "30 days from the decision", "60 days following receipt of the notice".
  [word(`(${UNIT_WORD})\\s+(?:from|since|following|från)`), "$1 after"],
];

// `tokens` reads one to twelve. These are the larger number words that deadlines are written with.
const SPELLED: Record<string, string> = {
  fourteen: "14", fifteen: "15", "twenty-one": "21", twenty: "20", thirty: "30", sixty: "60", ninety: "90",
  neljäntoista: "14", kolmenkymmenen: "30", fjorton: "14", trettio: "30",
};
const SPELLED_RE = word(Object.keys(SPELLED).join("|"));

// Opening hours and clock times are not periods.
const CLOCK = /\d{1,2}[:.]\d{2}(?!\d)|\d\s*(?:am|pm|a\.m\.|p\.m\.)(?![\p{L}])|(?<![\p{L}])(?:klo|kello|kl\.|o'clock)(?![\p{L}])/iu;
// "for two months after the birth" says how long something lasts. `tokens` drops "for", so the wording is checked.
const LASTS =
  /\bfor\s+(?:(?:at\s+least|up\s+to|a\s+period\s+of|the\s+(?:first|next|last))\s+)*(?:\d+|an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(?:\S+\s+)?(?:days?|weeks?|months?|years?)\b/i;

// `tokens` drops "not" and runs sentences together, so both are refused on the wording:
// "you do not have to apply within 30 days", "Two months. Before that, ask the clinic."
const NEGATED = /(?<![\p{L}])(?:not(?! later than)|never|cannot|ei|eikä|älä|inte|ej)(?![\p{L}])|n't/iu;
const SECOND_SENTENCE = /[.;!?…]\s+\S/;

const UNITS = new Set(["day", "week", "month", "year"]);
const DIRECTIONS = new Set(["before", "after", "within"]);
const WORKING = new Set(["working", "business", "banking", "bank"]);
const QUALIFIERS = new Set([...WORKING, "calendar", "full", "whole"]);
// "within the next three months": words that may stand between "within" and the number.
const FILLERS = new Set(["next", "first", "coming", "following"]);

/** A rate, a vague amount, a usual duration or an earliest date: not one period counted once. */
const NOT_A_DEADLINE = new Set(
  (
    "every each per once twice times joka välein kerran kertaa varje gång gånger " +
    "half few several couple puoli puolen puolitoista pari parin muutaman usean halv halvt några " +
    "usually normally typically yleensä vanligtvis " +
    "earlier earliest aikaisintaan tidigast"
  ).split(" "),
);
/** Directly before the number these turn it into a bound or an estimate: "more than 3 months", "about 2 weeks". */
const NOT_EXACT = new Set(
  "than over under about approximately around roughly almost nearly yli alle noin lähes över ungefär cirka ca".split(" "),
);

// A floor counted forward or a cap counted back names the earliest day, not the last one:
// "at least 14 days after the notice", "up to 30 days before the move".
const FLOOR = /(?<![\p{L}])(?:at least|minimum|vähintään|minst)(?![\p{L}])/iu;
const CAP = /(?<![\p{L}])(?:at most|up to|maximum|enintään|korkeintaan|högst)(?![\p{L}])/iu;

const PRONOUN = /^(?:it|this|that|these|those|they|then|se|sen|sitä|det att)(?![\p{L}])/iu;
const CONNECTOR = /^(?:of|from|siitä)(?![\p{L}])[\s,]*/iu;
// Finnish names the starting point in the elative: "muutosta", "päätöksen tiedoksisaannista".
const ELATIVE = /^(?:\S+\s+){0,2}\S+(?:sta|stä)(?![\p{L}])/iu;

/** The longest closing run of words that says exactly these tokens, so articles stay in. */
function closingWords(phrase: string, wanted: string[]): string {
  const words = phrase.trim().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const rest = words.slice(i).join(" ");
    const got = tokens(rest);
    if (got.length < wanted.length) break;
    if (got.length === wanted.length && got.every((token, k) => token === wanted[k])) return rest;
  }
  return "";
}

/** The anchor as a short label, or nothing when the words after the period do not name a starting point. */
function tidyAnchor(raw: string, introduced: "direction" | "of" | "elative"): string | undefined {
  let text = raw.replace(/^[\s"'“”‘’([]+/, "");
  if (introduced === "of" && !CONNECTOR.test(text)) return undefined;
  // "ennen kuin vapaa alkaa": the conjunction is not part of the starting point.
  text = text.replace(CONNECTOR, "").replace(/^kuin\s+/iu, "");
  if (introduced === "elative" && !/^kun(?![\p{L}])/iu.test(text) && !ELATIVE.test(text) && !/jälkeen\s*$/iu.test(text)) return undefined;
  // One clause only: "the end of your employment, otherwise the right lapses" stops at the comma.
  text = text
    .split(/[,;:([]|\.\s|…|\.\.\./)[0]
    .replace(/(?<![\p{L}])(?:at the latest|viimeistään|senast|jälkeen)\s*$/iu, "")
    .replace(/[\s.!?'"“”‘’)\]]+$/, "")
    .trim();
  if (!text || text.length > 80 || PRONOUN.test(text) || !tokens(text).length) return undefined;
  return text;
}

/**
 * Read a deadline phrase as one period before or after a starting point.
 * "within N unit [of X]" and "N unit after X" count forward, "N unit before X" counts back.
 * Returns null for anything else: ranges, two numbers, rates, money, clock times, a period with no direction.
 */
export function parseDeadline(text: string): ParsedDeadline | null {
  if (CLOCK.test(text) || LASTS.test(text) || NEGATED.test(text) || SECOND_SENTENCE.test(text.trim())) return null;
  const digits = text.replace(SPELLED_RE, (w) => SPELLED[w.toLowerCase()]);
  const phrase = REWRITES.reduce((s, [from, to]) => s.replace(from, to), digits);
  const all = tokens(phrase);
  // "two (2) months" is one number written twice.
  const t = all.filter((token, i) => !(isNumber(token) && token === all[i - 1]));
  if (t.some((token) => NOT_A_DEADLINE.has(token) || /[%€$£]/.test(token))) return null;

  const numbers = t.filter(isNumber);
  if (numbers.length !== 1) return null;
  const at = t.indexOf(numbers[0]);
  const amount = Number(numbers[0]);
  if (!Number.isInteger(amount) || amount < 1 || amount > 999) return null;
  if (NOT_EXACT.has(t[at - 1])) return null;

  const qualified = QUALIFIERS.has(t[at + 1]);
  const unitAt = at + (qualified ? 2 : 1);
  if (!UNITS.has(t[unitAt])) return null;
  const unit = t[unitAt] as Unit;
  const workingDays = qualified && WORKING.has(t[at + 1]);
  if (workingDays && unit !== "day") return null;

  // One direction only. "within 14 days before the move" is a window, not a deadline.
  const before = t.includes("before");
  if (before === (t.includes("after") || t.includes("within"))) return null;
  if ((before ? CAP : FLOOR).test(text)) return null;

  // The direction word has to belong to the period: right after it, "within" right before it,
  // or the Finnish postposition closing the phrase ("kaksi viikkoa muuton jälkeen").
  const lead = t.slice(0, at).filter((token) => !FILLERS.has(token)).at(-1);
  const rest = t.slice(unitAt + 1);
  const follows = DIRECTIONS.has(rest[0]);
  const postposition = !follows && rest.length > 1 && /jälkeen[\s.,)]*$/iu.test(phrase);
  if (!follows && lead !== "within" && !postposition) return null;

  const anchorTokens = follows ? rest.slice(1) : rest;
  const introduced = follows ? (rest[0] === "within" ? "elative" : "direction") : postposition ? "direction" : "of";
  const anchor = anchorTokens.length ? tidyAnchor(closingWords(phrase, anchorTokens), introduced) : undefined;

  return {
    amount,
    unit,
    direction: before ? "before" : "after",
    ...(anchor ? { anchor } : {}),
    ...(workingDays ? { workingDays: true } : {}),
  };
}

const DAY_MS = 86_400_000;
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day));

/** A plain "YYYY-MM-DD" as a UTC date, or null. "2027-02-30" is not a date. */
export function isoDay(value: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? "");
  if (!m) return null;
  const date = utc(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toIso(date) === m[0] ? date : null;
}

export const toIso = (date: Date) => date.toISOString().slice(0, 10);

/**
 * The day a parsed deadline falls on, counted from the anchor date. Calendar arithmetic in UTC.
 * A month or year step that lands past the end of a month stops at its last day (31 March minus one month is 28 or 29 February).
 * Working days skip Saturday and Sunday only.
 */
export function resolveDeadline(parsed: ParsedDeadline, anchorDate: Date): Date {
  const sign = parsed.direction === "before" ? -1 : 1;
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth();
  const day = anchorDate.getUTCDate();

  if (parsed.unit === "day" && parsed.workingDays) {
    let time = Date.UTC(year, month, day);
    for (let left = parsed.amount; left > 0; ) {
      time += sign * DAY_MS;
      const weekday = new Date(time).getUTCDay();
      if (weekday !== 0 && weekday !== 6) left--;
    }
    return new Date(time);
  }
  if (parsed.unit === "day") return utc(year, month, day + sign * parsed.amount);
  if (parsed.unit === "week") return utc(year, month, day + sign * 7 * parsed.amount);

  const first = utc(year, month + sign * parsed.amount * (parsed.unit === "year" ? 12 : 1), 1);
  const lastDay = utc(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate();
  return utc(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay));
}

export type CalendarEntry = {
  title: string;
  /** The day of the event. Only its UTC year, month and day are used. */
  date: Date;
  description?: string;
  url?: string;
  /** Defaults to a value derived from the entry, so the same deadline downloaded twice is one event. */
  uid?: string;
  /** Time of creation, for DTSTAMP. */
  now?: Date;
};

const escapeText = (text: string) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n")
    // Other control characters are not allowed in a text value.
    .replace(/[\u0000-\u001f\u007f]/g, " ");

const utf8Length = (char: string) => {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
};

/** RFC 5545: a line is at most 75 octets. Longer lines continue on the next one after a space. */
function fold(line: string): string {
  let out = "";
  let size = 0;
  for (const char of line) {
    const length = utf8Length(char);
    if (size + length > 75) {
      out += "\r\n ";
      size = 1;
    }
    out += char;
    size += length;
  }
  return out;
}

const compact = (date: Date) => toIso(date).replace(/-/g, "");

// FNV-1a. Not security: only a stable name for the event.
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

const webUrl = (value: string | undefined) => {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
};

/** An all-day calendar event (RFC 5545) with reminders 7 days and 1 day before. */
export function icsFor({ title, date, description, url, uid, now = new Date() }: CalendarEntry): string {
  const summary = escapeText(title.trim() || "Deadline");
  const link = webUrl(url);
  const alarm = (trigger: string) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${summary}`, `TRIGGER:${trigger}`, "END:VALARM"];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kaveri//Case file deadline//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${escapeText(uid ?? `${compact(date)}-${hash(`${title}|${url ?? ""}`)}@kaveri`)}`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${compact(date)}`,
    // The end of an all-day event is the day after, exclusive.
    `DTEND;VALUE=DATE:${compact(new Date(date.getTime() + DAY_MS))}`,
    `SUMMARY:${summary}`,
    ...(description?.trim() ? [`DESCRIPTION:${escapeText(description.trim())}`] : []),
    ...(link ? [`URL:${link}`] : []),
    "TRANSP:TRANSPARENT",
    ...alarm("-P7D"),
    ...alarm("-P1D"),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
