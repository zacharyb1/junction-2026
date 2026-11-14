/**
 * Labels for the case page. English is the default. A case written in Finnish
 * gets Finnish labels. Add a language by adding one object here.
 */

/** "3", "3 and 5", "3, 5 and 7", in the language of the labels. */
const listOf = (locale: string, numbers: number[]) =>
  new Intl.ListFormat(locale, { type: "conjunction" }).format(numbers.map(String));

/** The Finnish name of a country stored under its English name. A name Intl does not know stays as written. */
function finnishCountry(name: string): string {
  const english = new Intl.DisplayNames(["en"], { type: "region" });
  const finnish = new Intl.DisplayNames(["fi"], { type: "region", fallback: "none" });
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of letters) {
    for (const b of letters) {
      if (english.of(a + b) === name) return finnish.of(a + b) ?? name;
    }
  }
  return name;
}

const en = {
  locale: "en-GB",
  /** The country in the header, stored in English. */
  country: (name: string) => name,
  updated: "Updated",
  quotesVerified: "quotes verified",
  deadline: "deadline",
  deadlines: "deadlines",
  date: {
    workOut: "Work out the date",
    countsFrom: "Date this counts from",
    addToCalendar: "Add to calendar",
    sourceSays: "The source says",
    passed: "This day has already passed.",
    note: "Arithmetic on the source's wording. Working days skip weekends but not public holidays. The source page decides.",
  },
  waiting: "waiting for you",
  whatToDo: "What to do",
  whatToDoHint: "Numbers link to the sentence each step is based on.",
  todo: "To do",
  needsApproval: "Needs your approval",
  done: "Done",
  approveInChat: "Approve in the chat",
  exaConfidence: "Exa confidence",
  confidence: { low: "low", medium: "medium", high: "high" },
  money: "Money and entitlements",
  drafts: "Drafts ready for you",
  draftsHint: "Nothing is sent without your approval.",
  draftKind: { email: "email", letter: "letter", checklist: "checklist" },
  copy: "Copy",
  copied: "Copied",
  gaps: "What I could not confirm",
  gapsHint: "Listed so you know where the gaps are.",
  sources: "Sources",
  sourcesHint:
    "Each page was opened again, by our own server and through Exa, to check that the quoted sentence is really there.",
  sourcesChecked: (time: string) => `Sources last checked ${time}.`,
  quotesAllThere: (total: number) =>
    total === 1 ? "The quote is still on its page." : `All ${total} quotes are still on their pages.`,
  quotesSomeThere: (found: number, total: number) =>
    total === 1
      ? `The quote was ${found ? "" : "not "}found on its page.`
      : `${found} of ${total} quotes were found on their pages.`,
  quotesGone: (numbers: number[]) =>
    numbers.length === 1
      ? `The page changed: quote ${numbers[0]} is no longer there. Read the step again before you act.`
      : `The pages changed: quotes ${listOf("en-GB", numbers)} are no longer there. Read those steps again before you act.`,
  pagesNotOpened: (numbers: number[]) =>
    `${numbers.length === 1 ? `The page of source ${numbers[0]}` : `The pages of sources ${listOf("en-GB", numbers)}`} did not open this time, which says nothing about the rule.`,
  checkAgain: "Check the sources again",
  checking: "Checking the sources…",
  checkedRecently: "These sources were checked less than 10 minutes ago.",
  checkFailed: "The check did not run. Please try again in a minute.",
  foundLive: "Quote found on the live page",
  foundExa: "Quote found in Exa's copy of the page",
  foundOxylabs: "Quote found on the live page, read through Oxylabs",
  notFound: "Quote not found on the page",
  unreachable: "Page could not be opened",
  official: "Official source",
  secondary: "Secondary source",
  pageDated: "Page dated",
  checked: "Checked",
  memoryVsWeb: "Memory versus web",
  memoryExpected: "From memory the assistant expected:",
  memoryWins: "The live page says otherwise, so the page wins.",
  news: "New on official sites",
  newsHint: "Pages published or updated in the last four months on this topic. They are pointers to read, not part of the checked plan.",
  researched: "How this was researched",
  trail: (searches: number, pages: number, seconds: string) =>
    `${searches} Exa searches, ${pages} pages opened, ${seconds} seconds`,
  trailNote: (domains: number, cost: string) =>
    `${domains ? `Search started on ${domains} official sites for this country.` : "This search ran on the open web, and each source is labelled."} Search cost: $${cost}.`,
  footer: "This is research, not legal advice. Check the linked pages before you act. Found with Exa.",
  notConfirmed: "Not confirmed on a source",
  showOnPage: "Open the page at this sentence",
  mentionsYear: (year: number) => `Names ${year}`,
  listen: "Listen to the plan",
  listenLoading: "Preparing the audio…",
  listenError: "The audio could not be loaded. Try again.",
  // The only words the spoken plan adds to stored case text (src/lib/speech.ts).
  spokenDeadline: "Deadline",
  spokenConflict: "Two different figures were found for this step. See the case file.",
  spokenClosing: (found: number, total: number) =>
    `${found} of ${total} quotes were found on their pages. The sources are in the case file.`,
};

export type Labels = typeof en;

const fi: Labels = {
  locale: "fi-FI",
  country: finnishCountry,
  updated: "Päivitetty",
  quotesVerified: "lainausta vahvistettu",
  deadline: "määräaika",
  deadlines: "määräaikaa",
  date: {
    workOut: "Laske päivämäärä",
    countsFrom: "Päivä, josta aika lasketaan",
    addToCalendar: "Lisää kalenteriin",
    sourceSays: "Lähteen mukaan",
    passed: "Tämä päivä on jo mennyt.",
    note: "Laskettu lähteen sanamuodosta. Arkipäivissä ohitetaan viikonloput, mutta ei pyhäpäiviä. Lähdesivu ratkaisee.",
  },
  waiting: "odottaa sinua",
  whatToDo: "Mitä tehdä",
  whatToDoHint: "Numerot vievät lauseeseen, johon kukin vaihe perustuu.",
  todo: "Tekemättä",
  needsApproval: "Odottaa hyväksyntääsi",
  done: "Valmis",
  approveInChat: "Hyväksy keskustelussa",
  exaConfidence: "Exan varmuus",
  confidence: { low: "pieni", medium: "kohtalainen", high: "suuri" },
  money: "Raha ja etuudet",
  drafts: "Valmiit luonnokset",
  draftsHint: "Mitään ei lähetetä ilman hyväksyntääsi.",
  draftKind: { email: "sähköposti", letter: "kirje", checklist: "tarkistuslista" },
  copy: "Kopioi",
  copied: "Kopioitu",
  gaps: "Mitä en voinut vahvistaa",
  gapsHint: "Listattu, jotta tiedät, missä on aukkoja.",
  sources: "Lähteet",
  sourcesHint:
    "Jokainen sivu avattiin uudelleen, omalta palvelimeltamme ja Exan kautta, jotta varmistettiin, että lainattu lause todella löytyy sivulta.",
  sourcesChecked: (time) => `Lähteet tarkistettu viimeksi ${time}.`,
  quotesAllThere: (total) =>
    total === 1 ? "Lainaus on yhä sivullaan." : `Kaikki ${total} lainausta ovat yhä sivuillaan.`,
  quotesSomeThere: (found, total) =>
    total === 1
      ? found
        ? "Lainaus löytyi sivultaan."
        : "Lainausta ei löytynyt sivultaan."
      : `${total} lainauksesta ${found} löytyi sivultaan.`,
  quotesGone: (numbers) =>
    numbers.length === 1
      ? `Sivu on muuttunut: lainausta ${numbers[0]} ei enää löydy. Lue vaihe uudelleen ennen kuin toimit.`
      : `Sivut ovat muuttuneet: lainauksia ${listOf("fi-FI", numbers)} ei enää löydy. Lue vaiheet uudelleen ennen kuin toimit.`,
  pagesNotOpened: (numbers) =>
    `${numbers.length === 1 ? `Lähteen ${numbers[0]} sivu ei auennut` : `Lähteiden ${listOf("fi-FI", numbers)} sivut eivät auenneet`} tällä kertaa, mikä ei kerro säännöstä mitään.`,
  checkAgain: "Tarkista lähteet uudelleen",
  checking: "Tarkistetaan lähteitä…",
  checkedRecently: "Nämä lähteet tarkistettiin alle 10 minuuttia sitten.",
  checkFailed: "Tarkistus ei onnistunut. Yritä hetken kuluttua uudelleen.",
  foundLive: "Lainaus löytyi sivulta",
  foundExa: "Lainaus löytyi Exan tallentamasta sivusta",
  foundOxylabs: "Lainaus löytyi sivulta, luettu Oxylabsin kautta",
  notFound: "Lainausta ei löytynyt sivulta",
  unreachable: "Sivua ei voitu avata",
  official: "Virallinen lähde",
  secondary: "Muu lähde",
  pageDated: "Sivu päivätty",
  checked: "Tarkistettu",
  memoryVsWeb: "Muisti vastaan verkko",
  memoryExpected: "Avustaja oletti muistin perusteella:",
  memoryWins: "Sivu sanoo toisin, joten sivu ratkaisee.",
  news: "Uutta virallisilla sivustoilla",
  newsHint: "Aiheesta viimeisen neljän kuukauden aikana julkaistuja tai päivitettyjä sivuja. Ne ovat lukuvinkkejä, eivät osa tarkistettua suunnitelmaa.",
  researched: "Miten tämä selvitettiin",
  trail: (searches, pages, seconds) => `${searches} Exa-hakua, ${pages} sivua avattu, ${seconds} sekuntia`,
  trailNote: (domains, cost) =>
    `${domains ? `Haku aloitettiin ${domains} virallisesta sivustosta tässä maassa.` : "Tämä haku tehtiin avoimesta verkosta, ja jokainen lähde on merkitty."} Haun hinta: $${cost}.`,
  footer:
    "Tämä on tiedonhakua, ei oikeudellista neuvontaa. Tarkista linkitetyt sivut ennen kuin toimit. Haettu Exalla.",
  notConfirmed: "Ei vahvistettu lähteestä",
  showOnPage: "Avaa sivu tämän lauseen kohdalta",
  mentionsYear: (year) => `Mainitsee vuoden ${year}`,
  listen: "Kuuntele suunnitelma",
  listenLoading: "Ääntä valmistellaan…",
  listenError: "Ääntä ei voitu ladata. Yritä uudelleen.",
  spokenDeadline: "Määräaika",
  spokenConflict: "Tälle vaiheelle löytyi kaksi eri lukua. Katso tapaussivu.",
  // Numbers stay in their basic form, so the voice does not have to inflect them.
  spokenClosing: (found, total) =>
    `Lainauksia on ${total}. Niistä ${found} löytyi sivultaan. Lähteet ovat tapaussivulla.`,
};

const ALL: Record<string, Labels> = { en, fi };

export function labels(language: string | undefined): Labels {
  return ALL[(language ?? "en").toLowerCase().slice(0, 2)] ?? en;
}
