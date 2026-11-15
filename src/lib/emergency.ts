/**
 * Emergencies: someone is having a seizure, is not breathing, is choking, a fire. AIDaddy does no research then.
 * It answers at once with a fixed reply: call 112, and the few first-aid steps that fit.
 *
 * AIDaddy cannot call 112 itself (the bot never contacts anyone real), so the reply tells the people there to.
 * The same kinds and steps are in hermes/SOUL.md (Emergency first) and the gate rule in
 * hermes/plugins/kaveri-gate/gate.py: change all three together.
 *
 * Runs in the browser (/listen) and on the server (/api/aidaddy). No look-behind, so older phones can read it.
 */

export type EmergencyKind =
  | "seizure"
  | "breathing"
  | "choking"
  | "heart"
  | "stroke"
  | "bleeding"
  | "allergy"
  | "poison"
  | "fire"
  | "drowning"
  | "general";

export type Emergency = { kind: EmergencyKind };

/** A whole word or phrase: not the middle of a longer word. `L` stands for "any further letters" (a word ending). */
const words = (alternatives: string) =>
  new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${alternatives.replaceAll("L", "\\p{L}*")})(?![\\p{L}\\p{N}])`, "iu");

const PRONOUN = "(?:his|her|their|my|your|the baby'?s|the child'?s)";

/** The first rule that matches decides, so the most specific come first. */
const RULES: { kind: EmergencyKind; pattern: RegExp }[] = [
  {
    kind: "seizure",
    pattern: words("seizureL|seizing|convulsL|epileptic (?:fit|attack)|having a fit|kouristL|epilepsiakohtauL|kaatumakohtauL"),
  },
  {
    kind: "choking",
    pattern: words(`chokL|(?:something|food|a toy|a piece of [^\\s.?!]+) (?:is )?stuck in ${PRONOUN} throat|tukehtuL|meni henkeen|jäi kurkkuun`),
  },
  {
    kind: "breathing",
    pattern: words(
      "not breathing|stopped breathing|can'?t breathe|cannot breathe|unconscious|unresponsive|(?:he|she|they|someone|somebody|mum|mom|dad|grandma|grandpa|granny|my [^\\s.?!]+) (?:has |just |suddenly )?(?:collapsed|passed out|fainted)|collapsed on the floor|won'?t wake up|not waking up|no pulse|cardiac arrest" +
        "|ei hengitä|lakkasi hengittämästä|ei saa henkeä|tajuton|tajuttomana|menetti tajuntansa|pyörtyL|lyyhistyL|ei herää|ei reagoi",
    ),
  },
  {
    kind: "heart",
    pattern: words(`chest pain|pain in ${PRONOUN} chest|heart attack|rintakipL|sydänkohtauL|sydäninfarktL`),
  },
  {
    kind: "stroke",
    pattern: words(
      "having a stroke|had a stroke|is a stroke|(?:face|mouth) (?:is )?drooping|slurrL (?:speech|words)|speech is slurred|slurring" +
        "|aivoinfarktL|aivoveritulppL|aivohalvauL|puhe sammaltaa|suupieli roikkuu",
    ),
  },
  {
    kind: "bleeding",
    pattern: words(
      "bleeding (?:heavily|a lot|badly|everywhere|so much)|(?:won'?t|will not|doesn'?t|does not) stop bleeding|bleeding (?:won'?t|will not) stop|lots of blood|so much blood" +
        "|vuotaa paljon verta|verenvuoto ei lakkaa|verenvuoto ei loppu|runsas verenvuoto|verta tulee paljon|paljon verta",
    ),
  },
  {
    kind: "allergy",
    pattern: words(
      "anaphylaL|(?:severe |bad )?allergic reaction|(?:throat|tongue|lips?) (?:is |are )?swellL|epipen|epi-pen|adrenaline (?:pen|injector)" +
        "|anafylaL|allerginen reaktio|(?:kurkku|kieli|huulet) turpoaa|adrenaliinikynä",
    ),
  },
  {
    kind: "poison",
    pattern: words(
      "swallowed (?:some |the |a )?(?:pills|tablets|bleach|medicine|detergent|batterL|button batterL|poison|cleaning [^\\s.?!]+)|(?:was|been|got|is|are) poisoned|ate (?:some |the )?poison|overdosL|drank (?:bleach|detergent|cleaning [^\\s.?!]+)" +
        "|nieli[^.?!]{0,20}(?:lääkL|pillerL|tablettL|pesuainL|paristL|myrkL)|myrkytyL|yliannostL",
    ),
  },
  {
    kind: "fire",
    pattern: words(
      "(?:house|home|kitchen|apartment|flat|building|room|car) (?:is )?on fire|there'?s a fire|caught fire|smoke everywhere" +
        "|tulipaloL|(?:talo|keittiö|asunto|rappu|auto) palaa|syttyi palamaan|savua kaikkialla",
    ),
  },
  { kind: "drowning", pattern: words("drowning|drowned|nearly drowned|hukkuL") },
  {
    kind: "general",
    pattern: words(
      "call (?:an|the) ambulance|need an ambulance|call 112|call 911|medical emergency|(?:it'?s|this is) an emergency" +
        "|soita(?:kaa)? 112|soita(?:kaa)? ambulanssi|ambulanssL|hätätilanne",
    ),
  },
];

/** An emergency in this sentence, or null. Over-triggering is the safer failure: a false alarm costs a dismissed note. */
export function detectEmergency(text: string): Emergency | null {
  const sentence = text.replace(/\s+/g, " ").trim();
  if (!sentence) return null;
  const rule = RULES.find((item) => item.pattern.test(sentence));
  return rule ? { kind: rule.kind } : null;
}

type Language = "en" | "fi";

/** The first-aid steps for each kind: short, widely taught, and never a diagnosis. */
const STEPS: Record<EmergencyKind, Record<Language, string[]>> = {
  seizure: {
    en: [
      "Stay with them and note the time it started.",
      "Move hard or sharp things away and put something soft under the head.",
      "Do not hold them down. Put nothing in their mouth.",
      "When the jerking stops, turn them on their side.",
    ],
    fi: [
      "Pysy hänen luonaan ja katso, mihin aikaan kohtaus alkoi.",
      "Siirrä kovat ja terävät esineet pois ja laita jotain pehmeää pään alle.",
      "Älä pidä häntä kiinni. Älä laita mitään suuhun.",
      "Kun nykiminen loppuu, käännä hänet kyljelleen.",
    ],
  },
  breathing: {
    en: [
      "Put the phone on speaker and stay with them.",
      "If they are not breathing normally, start CPR: push hard and fast in the middle of the chest. The 112 operator will guide you.",
      "If they breathe, turn them on their side.",
    ],
    fi: [
      "Laita puhelin kaiuttimelle ja pysy hänen luonaan.",
      "Jos hän ei hengitä normaalisti, aloita painelu: paina lujaa ja nopeasti rintakehän keskeltä. Hätäkeskus neuvoo puhelimessa.",
      "Jos hän hengittää, käännä hänet kyljelleen.",
    ],
  },
  choking: {
    en: [
      "If they can cough, let them keep coughing.",
      "If they cannot cough or breathe: up to 5 firm blows between the shoulder blades, then up to 5 abdominal thrusts. Repeat.",
      "For a baby, the 112 operator will tell you how.",
    ],
    fi: [
      "Jos hän pystyy yskimään, anna hänen yskiä.",
      "Jos hän ei pysty yskimään eikä hengittämään: enintään 5 voimakasta lyöntiä lapaluiden väliin, sitten enintään 5 painallusta ylävatsalle. Toista.",
      "Vauvan kohdalla hätäkeskus neuvoo, miten toimia.",
    ],
  },
  heart: {
    en: ["Help them sit down and rest. Loosen tight clothing.", "Stay with them. If they stop breathing normally, start CPR."],
    fi: ["Auta hänet istumaan ja lepäämään. Löysää kireät vaatteet.", "Pysy hänen luonaan. Jos hän lakkaa hengittämästä normaalisti, aloita painelu."],
  },
  stroke: {
    en: ["Note the time the signs started: the hospital needs it.", "Let them rest. Give no food or drink."],
    fi: ["Katso, mihin aikaan oireet alkoivat: sairaala tarvitsee tiedon.", "Anna hänen levätä. Älä anna ruokaa tai juotavaa."],
  },
  bleeding: {
    en: ["Press hard on the wound with a clean cloth and keep pressing.", "Lay them down. Do not lift the cloth to look."],
    fi: ["Paina haavaa lujasti puhtaalla kankaalla ja jatka painamista.", "Auta hänet makuulle. Älä nosta kangasta katsoaksesi."],
  },
  allergy: {
    en: [
      "If they have an adrenaline pen, use it now in the outer thigh.",
      "Lay them down with legs raised, or let them sit up if breathing is hard.",
    ],
    fi: [
      "Jos hänellä on adrenaliinikynä, käytä se nyt reiden ulkosyrjään.",
      "Auta hänet makuulle jalat koholla, tai anna istua, jos hengittäminen on vaikeaa.",
    ],
  },
  poison: {
    en: [
      "Do not make them vomit. Keep the package or bottle.",
      "If they are awake and breathing normally, the Poison Information Centre answers day and night: 0800 147 111.",
    ],
    fi: [
      "Älä oksennuta. Ota pakkaus tai pullo talteen.",
      "Jos hän on hereillä ja hengittää normaalisti, Myrkytystietokeskus päivystää ympäri vuorokauden: 0800 147 111.",
    ],
  },
  fire: {
    en: ["Get everyone out and close the doors behind you.", "Call 112 from outside. Do not go back in."],
    fi: ["Vie kaikki ulos ja sulje ovet perässäsi.", "Soita 112 ulkoa. Älä mene takaisin sisälle."],
  },
  drowning: {
    en: ["Get them out of the water only if it is safe for you.", "If they are not breathing normally, start CPR. The 112 operator will guide you."],
    fi: ["Nosta hänet vedestä vain, jos se on sinulle turvallista.", "Jos hän ei hengitä normaalisti, aloita painelu. Hätäkeskus neuvoo puhelimessa."],
  },
  general: {
    en: ["Say what happened and where you are. Keep the phone on speaker and do what the operator says."],
    fi: ["Kerro, mitä tapahtui ja missä olette. Laita puhelin kaiuttimelle ja toimi hätäkeskuksen ohjeiden mukaan."],
  },
};

const HEAD: Record<Language, { call: string; cannot: string; note: string }> = {
  en: {
    call: "Call 112 now.",
    cannot: "I cannot call for you.",
    note: "I am a made-up helper, not an emergency service. The 112 operator decides what help comes.",
  },
  fi: {
    call: "Soita 112 nyt.",
    cannot: "En voi soittaa puolestasi.",
    note: "Olen keksitty apuri, en hätäpalvelu. Hätäkeskus päättää, millaista apua tulee.",
  },
};

export type EmergencyReply = { headline: string; steps: string[]; note: string };

export function emergencyReply(kind: EmergencyKind, language: Language = "en"): EmergencyReply {
  const head = HEAD[language];
  return { headline: `${head.call} ${head.cannot}`, steps: STEPS[kind][language], note: head.note };
}

/** The reply as chat text, for the web chat and anywhere plain text goes. */
export function emergencyText(kind: EmergencyKind, language: Language = "en"): string {
  const reply = emergencyReply(kind, language);
  return [reply.headline, "", ...reply.steps.map((step) => `- ${step}`), "", reply.note].join("\n");
}

/** Finnish if the sentence looks Finnish, so the reply is in the language that was used. */
export function guessLanguage(text: string): Language {
  return /[äö]|(?:^|\s)(?:ei|on|hän|soita|apua)(?:\s|$)/i.test(text) ? "fi" : "en";
}
