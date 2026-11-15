/**
 * The sentences the engine writes itself: the research trail, gap notes, conflict notes,
 * the fallback summary and the errors a person sees. English, and Finnish for a case written in Finnish.
 * Step titles, figures and host names are passed in as they are, and a quote is never translated.
 */

/** Where the case is pinned. `name` is the country's English name. */
type Place = { code: string; name: string; region?: string };

const withRegion = (j: Place, country: string) => `${j.region ? `${j.region}, ` : ""}${country}`;

const en = {
  /** What each search looks for, as named in the research trail and in the progress events. */
  focus: {
    actions: "actions and deadlines",
    money: "money and entitlements",
    apply: "how and where to apply",
    exceptions: "exceptions and missed deadlines",
    options: "options that fit",
    details: "practical details",
    rule: "what the law or customs rule says",
    conditions: "limits, permits and penalties",
    agent: "Exa Agent, research in several steps",
  },

  // Research trail.
  pinnedOpen: (j: Place) =>
    `Pinned to ${withRegion(j, j.name)}. This is a choice, not a rule, so searching the open web and labelling each source.`,
  pinnedOfficial: (j: Place, sites: number) => `Pinned to ${j.name}. Searching ${sites} official sites first.`,
  pinnedNoList: (j: Place) =>
    `Pinned to ${j.name}. No official site list for this country yet, so searching the open web and labelling each source.`,
  searching: (official: boolean, focus: string) => `Exa search on ${official ? "official sites" : "the open web"}: ${focus}`,
  searchingNews: "Exa search on official sites: pages published in the last four months",
  firstLook: (hosts: string[], seconds: string) => `Exa lite search, first look after ${seconds} s: ${hosts.join(", ")}`,
  agentSearching: "Exa Agent: one run that searches, reads and reasons in several steps, official sites first",
  agentFellBack: "The Exa Agent run did not return enough, so the usual Exa searches run as well",
  searchesSkipped: (failed: number, total: number) => `${failed} of ${total} searches failed and were skipped`,
  opening: (pages: number) => `Opening ${pages} cited pages: our own live request plus Exa Contents`,
  readBlocked: (pages: number) => `Read ${pages} blocked pages live through the Oxylabs Web API`,
  checking: "Checking every quote, amount and deadline against the page text",
  foundNews: (pages: number) => `Found ${pages} recent official pages on this topic`,
  building: "Building the case file",

  // Gap notes, listed under "What I could not confirm". `title` is the step's title.
  pageNotOpened: (title: string, host: string) => `${title}: the cited page could not be opened (${host}).`,
  arrivalNotEstablished: (title: string) => `${title}: left out because the family already lives in this country and this move does not establish the source's arrival or initial-application prerequisite.`,
  quoteNotFound: (title: string, host: string) => `${title}: the quoted sentence was not found on ${host}.`,
  figureNotOnPage: (title: string, host: string) => `${title}: this figure is not on ${host}, so the step is left out.`,
  factNotStated: (title: string, value: string, host: string) =>
    `${title}: "${value}" could not be matched to a sentence on the cited page (${host}), so it is left out.`,
  factElsewhere: (title: string, value: string, host: string) =>
    `${title}: "${value}" is on the cited page (${host}), but not in a sentence about this step, so it is not shown with it.`,

  oldSource: (title: string, host: string, year: number) =>
    `${title}: the address of this source on ${host} carries the year ${year}. Check that it is still current.`,
  closed: (title: string, host: string) => `${title}: listed as closed on ${host}, so it is left out.`,
  /** In a chat line, in place of one figure, when two sources give different ones. */
  sourcesDiffer: "sources give different figures, see",

  // Conflict notes. A citation number keeps the form [3] in every language: the engine renumbers it by that form.
  twoFigures: (first: string, firstRef: number, second: string, secondRef: number) =>
    `Two figures found: "${first}" [${firstRef}] and "${second}" [${secondRef}]. Check which one applies to you.`,
  differentFigures: (first: string, firstRef: number, second: string, secondRef: number) =>
    `Different figures appear: "${first}" [${firstRef}] and "${second}" [${secondRef}]. They may apply to different years or cases, so read both quotes.`,

  /** The summary when the search wrote none that the cited pages back. */
  sourcedPlan: (situation: string) => `Sourced plan for: ${situation}`,

  // Errors a person sees.
  unknownCountry: (country: string) => `Unknown country "${country}". Use an English country name or a two-letter code.`,
  unsupportedCountry: "This country is not supported.",
  nothingToResearch:
    "I could not find anything to research in that message. Describe what happened in a sentence or two, for example: “Our landlord wants to raise the rent by 15 percent from next month.”",
  searchFailed: (reason: string) => `Exa search failed: ${reason}`,
  nothingConfirmed: "Sources were found, but no claim could be confirmed on the cited pages.",
};

export type Messages = typeof en;

const finnishCountries = new Intl.DisplayNames(["fi"], { type: "region", fallback: "none" });
/** "Suomi" for FI. A code Intl has no Finnish name for keeps the English name. */
const inFinnish = (j: Place) => {
  try {
    return finnishCountries.of(j.code) ?? j.name;
  } catch {
    return j.name;
  }
};

const fi: Messages = {
  focus: {
    actions: "tehtävät ja määräajat",
    money: "raha ja etuudet",
    apply: "miten ja mistä haetaan",
    exceptions: "poikkeukset ja määräajasta myöhästyminen",
    options: "sopivat vaihtoehdot",
    details: "käytännön tiedot",
    rule: "mitä laki tai tullisääntö sanoo",
    conditions: "rajat, luvat ja seuraamukset",
    agent: "Exa Agent, monivaiheinen tutkimus",
  },

  pinnedOpen: (j) =>
    `Paikka: ${withRegion(j, inFinnish(j))}. Kyse on valinnasta eikä säännöstä, joten haku tehdään avoimesta verkosta ja jokaisesta lähteestä kerrotaan, onko se virallinen.`,
  pinnedOfficial: (j, sites) => `Maa: ${inFinnish(j)}. Haku aloitetaan ${sites} virallisesta sivustosta.`,
  pinnedNoList: (j) =>
    `Maa: ${inFinnish(j)}. Tälle maalle ei ole vielä virallisten sivustojen luetteloa, joten haku tehdään avoimesta verkosta ja jokaisesta lähteestä kerrotaan, onko se virallinen.`,
  searching: (official, focus) => `Exa-haku ${official ? "virallisilta sivustoilta" : "avoimesta verkosta"}: ${focus}`,
  searchingNews: "Exa-haku virallisilta sivustoilta: neljän viime kuukauden aikana julkaistut sivut",
  firstLook: (hosts, seconds) => `Exa lite -haku, ensimmäinen silmäys ${seconds} sekunnissa: ${hosts.join(", ")}`,
  agentSearching: "Exa Agent: yksi ajo, joka hakee, lukee ja päättelee useassa vaiheessa, viralliset sivustot ensin",
  agentFellBack: "Exa Agent -ajo ei tuottanut tarpeeksi, joten myös tavalliset Exa-haut tehdään",
  searchesSkipped: (failed, total) => `${total} hausta ${failed} epäonnistui, ja ${failed === 1 ? "se" : "ne"} ohitettiin`,
  opening: (pages) =>
    `Avataan ${pages === 1 ? "1 lähdesivu" : `${pages} lähdesivua`} omalta palvelimeltamme ja Exa Contents -palvelun kautta`,
  readBlocked: (pages) =>
    pages === 1
      ? "1 sivu esti oman pyyntömme, joten se luettiin Oxylabsin Web API -palvelun kautta"
      : `${pages} sivua esti oman pyyntömme, joten ne luettiin Oxylabsin Web API -palvelun kautta`,
  checking: "Tarkistetaan jokainen lainaus, summa ja määräaika sivun tekstistä",
  foundNews: (pages) =>
    `Aiheesta löytyi ${pages === 1 ? "1 tuore sivu" : `${pages} tuoretta sivua`} virallisilta sivustoilta`,
  building: "Kootaan tapaussivu",

  pageNotOpened: (title, host) => `${title}: lähdesivua ei voitu avata (${host}).`,
  arrivalNotEstablished: (title) => `${title}: jätetty pois, koska perhe asuu jo tässä maassa eikä tämä muutto osoita lähteen edellyttämää maahantuloa tai ensimmäistä hakemusta.`,
  quoteNotFound: (title, host) => `${title}: lainattua lausetta ei löytynyt sivustolta ${host}.`,
  figureNotOnPage: (title, host) => `${title}: tätä lukua ei ole sivustolla ${host}, joten vaihe on jätetty pois.`,
  factNotStated: (title, value, host) =>
    `${title}: tietoa ”${value}” ei voitu yhdistää yhteenkään lauseeseen lähdesivulla (${host}), joten se on jätetty pois.`,
oldSource: (title, host, year) => `${title}: tämän lähteen osoitteessa sivustolla ${host} on vuosi ${year}. Tarkista, että tieto on yhä ajan tasalla.`,
  closed: (title, host) => `${title}: sivuston ${host} mukaan paikka on suljettu, joten se on jätetty pois.`,
  sourcesDiffer: "lähteissä on eri lukuja, katso",
    factElsewhere: (title, value, host) =>
    `${title}: tieto ”${value}” on sivustolla ${host}, mutta eri asiaa koskevassa lauseessa, joten se on jätetty pois.`,

  twoFigures: (first, firstRef, second, secondRef) =>
    `Löytyi kaksi eri lukua: ”${first}” [${firstRef}] ja ”${second}” [${secondRef}]. Tarkista, kumpi koskee sinua.`,
  differentFigures: (first, firstRef, second, secondRef) =>
    `Lähteissä on eri lukuja: ”${first}” [${firstRef}] ja ”${second}” [${secondRef}]. Ne voivat koskea eri vuosia tai eri tilanteita, joten lue molemmat lainaukset.`,

  sourcedPlan: (situation) => `Lähteisiin perustuva suunnitelma tilanteeseen: ${situation}`,

  unknownCountry: (country) => `Maata ”${country}” ei tunnistettu. Kirjoita maan nimi tai kaksikirjaiminen maakoodi.`,
  unsupportedCountry: "Tämä maa ei ole mukana palvelussa.",
  nothingToResearch:
    "En löytänyt viestistä mitään selvitettävää. Kerro yhdellä tai kahdella lauseella, mitä tapahtui, esimerkiksi: ”Vuokranantajamme haluaa korottaa vuokraa 15 prosenttia ensi kuun alusta.”",
  searchFailed: (reason) => `Exa-haku epäonnistui: ${reason}`,
  nothingConfirmed: "Lähteitä löytyi, mutta yhtäkään tietoa ei voitu vahvistaa lähdesivuilta.",
};

/** Finnish for a request in Finnish, English for every other language. Read like `LANGUAGE_NAMES` in research.ts. */
export function messages(language: string): Messages {
  return language.toLowerCase().slice(0, 2) === "fi" ? fi : en;
}
