/**
 * Text helpers shared by the verifier and the grounding code.
 * Everything here compares page text with a claim, so the rules are strict on numbers.
 */

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟«»]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/[^\p{L}\p{N}%€$£.,'-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// English, Finnish (with the common inflected forms) and Swedish.
const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  yksi: "1", yhden: "1", kaksi: "2", kahden: "2", kahta: "2", kolme: "3", kolmen: "3", kolmea: "3",
  neljä: "4", neljän: "4", neljää: "4", viisi: "5", viiden: "5", viittä: "5", kuusi: "6", kuuden: "6",
  seitsemän: "7", kahdeksan: "8", yhdeksän: "9", kymmenen: "10",
  två: "2", tre: "3", fyra: "4", fem: "5", sex: "6", sju: "7", åtta: "8", nio: "9", tio: "10",
};
// \b does not treat ä, ö, å as word characters, so word boundaries are spelled out.
const NUMBER_WORD_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${Object.keys(NUMBER_WORDS).join("|")})(?![\\p{L}\\p{N}])`,
  "giu",
);

/** "two months" and "2 months" are the same fact. */
const numerals = (text: string) => text.replace(NUMBER_WORD_RE, (w) => NUMBER_WORDS[w.toLowerCase()]);

// "1 600", "1,600" and "1.600" are one number. "2,5" and "2.5" are one number. "14 2026" is two.
const NUMBER = /(?<!\d)((?:\d{1,3}(?:[   .,]\d{3}(?!\d))+|\d+))((?:[.,]\d+(?!\d))?)/g;

const canonNumbers = (text: string) =>
  text.replace(NUMBER, (_, whole: string, fraction: string) => {
    const decimals = fraction.slice(1).replace(/0+$/, "");
    return whole.replace(/\D/g, "") + (decimals ? `.${decimals}` : "");
  });

const STOP = new Set(
  "the a an and or of to in on for is are be you your can will it this that with as by at from if not have has".split(" "),
);

// Time units, direction words and money words, so "within 3 months" and "kolmen kuukauden kuluessa" compare equal.
const CANON: Record<string, string> = {
  days: "day", päivä: "day", päivän: "day", päivää: "day", päivänä: "day", vuorokauden: "day", vuorokautta: "day",
  dag: "day", dagar: "day", dagars: "day",
  weeks: "week", viikko: "week", viikon: "week", viikkoa: "week", vecka: "week", veckor: "week", veckors: "week",
  months: "month", kuukausi: "month", kuukauden: "month", kuukautta: "month", månad: "month", månader: "month", månaders: "month",
  years: "year", vuosi: "year", vuoden: "year", vuotta: "year", år: "year", års: "year",
  kuluessa: "within", inom: "within",
  ennen: "before", innan: "before", före: "before",
  jälkeen: "after", efter: "after",
  viimeistään: "latest", senast: "latest",
  eur: "€", euro: "€", euros: "€", euroa: "€", euron: "€",
  percent: "%", prosentti: "%", prosenttia: "%", procent: "%",
};

/** Content words of a text, with numbers and common units in one canonical spelling. */
export function tokens(text: string): string[] {
  return normalise(canonNumbers(numerals(text)))
    .replace(/(\d)(?=[\p{L}%€$£])/gu, "$1 ")
    .replace(/([\p{L}%€$£])(?=\d)/gu, "$1 ")
    .replace(/(\d)-(?=\d)/g, "$1 ")
    .replace(/\b(?:no|not) later than\b|\bat the latest\b/g, "latest")
    .replace(/\bprior to\b/g, "before")
    .replace(/\bper cent\b/g, "percent")
    .split(" ")
    .map((t) => t.replace(/^[.,'-]+|[.,'-]+$/g, ""))
    .map((t) => CANON[t] ?? t)
    .filter((t) => t && (t.length > 1 || /[\d%€$£]/.test(t)) && !STOP.has(t));
}

export const isNumber = (token: string) => /^\d+(\.\d+)?$/.test(token);

/** Every number in a text, as whole canonical tokens. "2" is not found inside "2026" or "12". */
export const numbersIn = (text: string): string[] => tokens(text).filter(isNumber);
