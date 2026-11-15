import { words } from "@/lib/listen";

/**
 * Emergencies on the listening page (/listen): what AIDaddy says, by itself and at once, when it hears one.
 *
 * Nothing here is researched or written by a model. The words are fixed and follow the Finnish Red Cross first aid
 * instructions (SOURCES below, read on 15 November 2026). The first thing said is always to call the emergency
 * number. AIDaddy cannot call it: it tells the people in the room to. The sentences begin with "if", so a sentence
 * heard from a film or about last year does no harm.
 */

export type Emergency = "seizure" | "unresponsive" | "choking" | "help";

type Rule = { kind: Emergency; pattern: RegExp; not?: RegExp };

/** The first rule that matches decides: "shaking and not answering" is a seizure before it is "not answering". */
const RULES: Rule[] = [
  {
    kind: "seizure",
    pattern: words(
      "seizures?|seizing|convulsL|epileptic (?:fit|attack)|having a fit|foaming at the mouth" +
        "|shaking[^.?!]{0,60}(?:not|isn'?t|won'?t|doesn'?t|does not|will not) (?:answerL|respondL|reactL|wakL|talkL)" +
        "|(?:not|isn'?t|won'?t|doesn'?t) (?:answerL|respondL|reactL)[^.?!]{0,60}shaking" +
        "|shaking (?:uncontrollably|all over|on the (?:floor|ground))" +
        "|kouristL|epilepsiakohtauL|täris(?:ee|evät)[^.?!]{0,40}(?:ei|eikä) (?:vastaa|reagoi|herää)",
    ),
  },
  {
    kind: "unresponsive",
    pattern: words(
      "(?:not|isn'?t|stopped|is not) breathing|unconscious|unresponsive|(?:won'?t|will not|doesn'?t|does not|not) wak(?:e|ing) up" +
        "|(?:he|she|they|someone|somebody|dad|daddy|mom|mum|grandma|grandpa|granny|the baby)(?:'s| is| has| just| has just)? (?:collapsed|passed out|fainted)" +
        "|(?:he|she|someone|somebody)(?:'s| is) not (?:answering|responding|reacting|moving)" +
        "|ei hengitä|tajuton|tajuttomL|menetti tajuntansa|ei herää|ei reagoi|pyörtyi|lyyhistyi",
    ),
    // "He's not answering his phone" is small talk.
    not: words("phones?|calls?|texts?|emails?|messages?|puhelimeen|viesteihin|viestiin"),
  },
  { kind: "choking", pattern: words("choking|choked on|tukehtuL") },
  {
    kind: "help",
    pattern: words(
      "call (?:an |the )?ambulance|call (?:112|911|999|one one two|nine one one|nine nine nine)|(?:this is|it'?s) an emergency" +
        "|having a (?:heart attack|stroke)|chest pains?|bleeding (?:badly|heavily|a lot|out)|can'?t breathe|cannot breathe|overdosL" +
        "|soit(?:a|takaa) (?:ambulanssiL|112|hätänumeroon)|hätätilanne|sydänkohtauL|aivohalvauL|aivoinfarkL|rintakipuL|vuotaa (?:pahasti|paljon verta)|e[in] saa henkeä",
    ),
  },
];

/** The emergency in one heard sentence, or null. */
export function emergencyIn(text: string): Emergency | null {
  const sentence = text.replace(/\s+/g, " ").trim();
  const rule = RULES.find((item) => item.pattern.test(sentence) && !item.not?.test(sentence));
  return rule ? rule.kind : null;
}

/** The number to call where the device is set to be. 112 works across the European Union. */
export function emergencyNumber(country: string): "112" | "911" | "999" {
  if (country === "US" || country === "CA") return "911";
  if (country === "GB") return "999";
  return "112";
}

type Language = "en" | "fi";
type Words = { title: string; lines: string[] };

/** `{n}` stands for the emergency number. The first line is the call; the rest are the first aid steps. */
const WORDS: Record<Emergency, Record<Language, Words>> = {
  seizure: {
    en: {
      title: "A seizure",
      lines: [
        "If someone is having a seizure now, call {n} now and put the phone on speaker.",
        "Do not hold them down or try to stop the movements.",
        "Keep their head from hitting anything.",
        "When the shaking allows, turn them onto their side.",
        "When it stops, check that they are breathing normally, and stay with them.",
      ],
    },
    fi: {
      title: "Kouristelu",
      lines: [
        "Jos joku kouristelee nyt, soita heti hätänumeroon {n} ja laita puhelin kaiuttimelle.",
        "Älä yritä estää kouristusliikkeitä.",
        "Huolehdi, ettei hän kolhi päätään.",
        "Käännä hänet kyljelleen, kun kouristukset sen sallivat.",
        "Kun kouristukset loppuvat, tarkista, hengittääkö hän normaalisti, ja pysy hänen luonaan.",
      ],
    },
  },
  unresponsive: {
    en: {
      title: "Someone does not wake up",
      lines: [
        "If someone does not wake up, call {n} now and put the phone on speaker.",
        "Follow the instructions you are given.",
        "Check whether they are breathing normally: lift the chin, tilt the head back and watch the chest.",
        "If they are breathing normally, turn them onto their side.",
        "If they are not, tell the emergency operator and start resuscitation as they instruct.",
      ],
    },
    fi: {
      title: "Joku ei herää",
      lines: [
        "Jos joku ei herää, soita heti hätänumeroon {n} ja laita puhelin kaiuttimelle.",
        "Toimi saamiesi ohjeiden mukaan.",
        "Tarkista, hengittääkö hän normaalisti: nosta leukaa, taivuta päätä taaksepäin ja katso, liikkuuko rintakehä.",
        "Jos hän hengittää normaalisti, käännä hänet kylkiasentoon.",
        "Jos ei, kerro se hätäkeskukselle ja aloita elvytys ohjeiden mukaan.",
      ],
    },
  },
  choking: {
    en: {
      title: "Choking",
      lines: [
        "If someone is choking and cannot speak, cough or breathe, act quickly. If you are not alone, one of you calls {n} now.",
        "For an adult: bend their upper body forward and slap firmly between the shoulder blades five times.",
        "If that does not clear it and you are alone, call {n}.",
        "Then stand behind them, put a fist below the diaphragm, grab it with your other hand, and thrust sharply inwards and upwards, up to five times.",
        "Alternate five slaps and five thrusts.",
      ],
    },
    fi: {
      title: "Tukehtuminen",
      lines: [
        "Jos joku on tukehtumassa eikä pysty puhumaan, yskimään tai hengittämään, toimi nopeasti. Jos ette ole yksin, yksi soittaa heti numeroon {n}.",
        "Aikuinen: taivuta ylävartaloa alaspäin ja lyö kämmenellä napakasti viisi kertaa lapaluiden väliin.",
        "Jos tukos ei irtoa ja olet yksin, soita {n}.",
        "Asetu sitten hänen taakseen, aseta nyrkki pallean alle, tartu nyrkkiin toisella kädellä ja nykäise rivakasti taakse- ja ylöspäin, enintään viisi kertaa.",
        "Vuorottele viisi lyöntiä ja viisi nykäisyä.",
      ],
    },
  },
  help: {
    en: {
      title: "An emergency",
      lines: [
        "If this is an emergency, call {n} now.",
        "Say what has happened and where you are.",
        "Answer the questions, put the phone on speaker and follow the instructions.",
        "Do not end the call until you are told to.",
      ],
    },
    fi: {
      title: "Hätätilanne",
      lines: [
        "Jos tämä on hätätilanne, soita heti hätänumeroon {n}.",
        "Kerro, mitä on tapahtunut ja missä olet.",
        "Vastaa kysymyksiin, laita puhelin kaiuttimelle ja toimi ohjeiden mukaan.",
        "Älä lopeta puhelua ennen kuin saat luvan.",
      ],
    },
  },
};

/** The pages the words follow. */
export const SOURCES: Record<Emergency, { name: string; url: string }> = {
  seizure: { name: "Finnish Red Cross: Seizures", url: "https://www.redcross.fi/first-aid/first-aid-instructions/seizures" },
  unresponsive: {
    name: "Finnish Red Cross: How to help an unconscious person",
    url: "https://www.redcross.fi/first-aid/first-aid-instructions/how-to-help-an-unconscious-person/how-to-help-an-unconscious-person/",
  },
  choking: {
    name: "Finnish Red Cross: Removing a foreign object in the airways, adult",
    url: "https://www.redcross.fi/first-aid/first-aid-instructions/removing-a-foreign-object-in-the-airways-adult/",
  },
  help: { name: "Finnish Red Cross: Emergency call", url: "https://www.redcross.fi/first-aid/first-aid-instructions/emergency-call/" },
};

/** Digit by digit, so a voice does not say "one hundred and twelve". */
const SAID: Record<Language, Record<string, string>> = {
  en: { "112": "one one two", "911": "nine one one", "999": "nine nine nine" },
  fi: { "112": "yksi yksi kaksi", "911": "yhdeksän yksi yksi", "999": "yhdeksän yhdeksän yhdeksän" },
};

/** What is shown: a title and the lines, with the number as digits. */
export function emergencyWords(kind: Emergency, language: Language, number: string): Words {
  const { title, lines } = WORDS[kind][language];
  return { title, lines: lines.map((line) => line.replaceAll("{n}", number)) };
}

/** What is said aloud: the same lines, with the number spoken digit by digit. */
export function emergencySpeech(kind: Emergency, language: Language, number: string): string {
  return WORDS[kind][language].lines.map((line) => line.replaceAll("{n}", SAID[language][number] ?? number)).join(" ");
}

/** Finnish when the sentence has Finnish letters or words, so the reply is in the language that was used. */
function languageOf(text: string): Language {
  return /[äö]|(?:^|\s)(?:ei|on|hän|soita|soittakaa|apua|joku)(?:\s|$)/i.test(text) ? "fi" : "en";
}

/**
 * The web chat's reply to an emergency, or null: the same fixed words as /listen, with 112 (the chat does not know
 * the visitor's country) and the Red Cross page they follow. Sent before the access code, rate limit or model.
 */
export function emergencyChatReply(text: string): string | null {
  const kind = emergencyIn(text);
  if (!kind) return null;
  const language = languageOf(text);
  const { lines } = emergencyWords(kind, language, "112");
  const cannot = language === "fi" ? "En voi soittaa puolestasi." : "I cannot call for you.";
  const note =
    language === "fi"
      ? "Olen keksitty apuri, en hätäpalvelu. Ohjeet:"
      : "I am a made-up helper, not an emergency service. The steps follow:";
  const [call, ...steps] = lines;
  return [`${call} ${cannot}`, "", ...steps.map((step) => `- ${step}`), "", `${note} ${SOURCES[kind].url}`].join("\n");
}
