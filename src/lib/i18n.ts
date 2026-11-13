/**
 * Labels for the case page. English is the default. A case written in Finnish
 * gets Finnish labels. Add a language by adding one object here.
 */

const en = {
  locale: "en-GB",
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
  money: "Money and entitlements",
  drafts: "Drafts ready for you",
  draftsHint: "Nothing is sent without your approval.",
  copy: "Copy",
  copied: "Copied",
  gaps: "What I could not confirm",
  gapsHint: "Listed so you know where the gaps are.",
  sources: "Sources",
  sourcesHint:
    "Each page was opened again, by our own server and through Exa, to check that the quoted sentence is really there.",
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
  money: "Raha ja etuudet",
  drafts: "Valmiit luonnokset",
  draftsHint: "Mitään ei lähetetä ilman hyväksyntääsi.",
  copy: "Kopioi",
  copied: "Kopioitu",
  gaps: "Mitä en voinut vahvistaa",
  gapsHint: "Listattu, jotta tiedät, missä on aukkoja.",
  sources: "Lähteet",
  sourcesHint:
    "Jokainen sivu avattiin uudelleen, omalta palvelimeltamme ja Exan kautta, jotta varmistettiin, että lainattu lause todella löytyy sivulta.",
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
