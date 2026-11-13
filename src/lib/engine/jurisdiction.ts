import sources from "@/data/official-sources.seed.json";

/**
 * Jurisdiction lock. Every case is pinned to a country. Search starts on that
 * country's official domains and widens only when they return too little.
 */

type TopicMap = Record<string, string[]>;
type CountryEntry = { name: string; languages?: string[]; general?: string[]; wildcards?: string[]; topics?: TopicMap };
type SourcesFile = {
  countries: Record<string, CountryEntry>;
  eu?: { general?: string[]; wildcards?: string[]; topics?: TopicMap };
  publishers?: Record<string, string>;
};

const DATA = sources as SourcesFile;

const EU_MEMBERS = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "),
);

const ALIASES: Record<string, string> = {
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  america: "US",
  suomi: "FI",
  deutschland: "DE",
  holland: "NL",
  "the netherlands": "NL",
  czechia: "CZ",
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function nameToCode(): Map<string, string> {
  const map = new Map<string, string>();
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of letters) {
    for (const b of letters) {
      const code = a + b;
      let name: string | undefined;
      try {
        name = regionNames.of(code);
      } catch {
        name = undefined;
      }
      if (name && name !== code) map.set(name.toLowerCase(), code);
    }
  }
  return map;
}
const NAME_TO_CODE = nameToCode();

export type Jurisdiction = {
  code: string;
  name: string;
  region?: string;
  /** Official hostnames for this country, plus EU-wide ones for member states. */
  officialDomains: string[];
  known: boolean;
};

const uniq = (items: string[]) => [...new Set(items.map((h) => h.toLowerCase().replace(/^www\./, "")))];

export function resolveJurisdiction(country: string, region?: string): Jurisdiction {
  const raw = country.trim();
  const lower = raw.toLowerCase();
  let code = ALIASES[lower] ?? (raw.length === 2 ? raw.toUpperCase() : NAME_TO_CODE.get(lower)) ?? "";
  if (code === "UK") code = "GB";

  let name = raw;
  if (code) {
    try {
      name = regionNames.of(code) ?? raw;
    } catch {
      name = raw;
    }
  }

  const entry = code ? DATA.countries[code] : undefined;
  // Exa's includeDomains accepts wildcards such as "*.gov", which covers every city and state site.
  const domains = entry
    ? [...(entry.wildcards ?? []), ...(entry.general ?? []), ...Object.values(entry.topics ?? {}).flat()]
    : [];
  if (code && EU_MEMBERS.has(code) && DATA.eu) {
    domains.push(...(DATA.eu.wildcards ?? []), ...(DATA.eu.general ?? []), ...Object.values(DATA.eu.topics ?? {}).flat());
  }

  return {
    code: code || raw.toUpperCase().slice(0, 2),
    name: entry?.name ?? name,
    region: region?.trim() || undefined,
    officialDomains: uniq(domains),
    known: Boolean(entry),
  };
}

const OFFICIAL_SUFFIXES = [
  ".gov",
  ".gov.uk",
  ".gov.au",
  ".gov.ie",
  ".gov.it",
  ".gov.pl",
  ".gov.pt",
  ".gov.gr",
  ".gov.sg",
  ".gov.in",
  ".govt.nz",
  ".gc.ca",
  ".canada.ca",
  ".mil",
  ".europa.eu",
  ".gouv.fr",
  ".service-public.fr",
  ".bund.de",
  ".admin.ch",
  ".gob.es",
  ".gob.mx",
  ".overheid.nl",
  ".rijksoverheid.nl",
  ".government.nl",
  ".regeringen.se",
  ".eesti.ee",
  ".nhs.uk",
  ".int",
];

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isOfficial(url: string, j: Jurisdiction): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (j.officialDomains.some((d) => (d.startsWith("*.") ? host.endsWith(d.slice(1)) : host === d || host.endsWith(`.${d}`)))) {
    return true;
  }
  return OFFICIAL_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
}

export function publisherOf(url: string): string {
  const host = hostOf(url);
  const known = DATA.publishers ?? {};
  for (const [domain, label] of Object.entries(known)) {
    if (host === domain || host.endsWith(`.${domain}`)) return label;
  }
  return host;
}
