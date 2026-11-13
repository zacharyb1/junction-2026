import researched from "@/data/official-sources.json";
import seed from "@/data/official-sources.seed.json";

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

const union = (...lists: (string[] | undefined)[]) => [...new Set(lists.flatMap((l) => l ?? []))];

function mergeTopics(a: TopicMap = {}, b: TopicMap = {}): TopicMap {
  const out: TopicMap = {};
  for (const topic of union(Object.keys(a), Object.keys(b))) out[topic] = union(a[topic], b[topic]);
  return out;
}

/**
 * Two files: `official-sources.json` is the researched map (every hostname was checked to answer),
 * `official-sources.seed.json` holds hand-picked additions and publisher names. The researched map wins on order.
 */
function mergeSources(main: SourcesFile, extra: SourcesFile): SourcesFile {
  const countries: Record<string, CountryEntry> = {};
  for (const code of union(Object.keys(main.countries), Object.keys(extra.countries))) {
    const a = main.countries[code];
    const b = extra.countries[code];
    countries[code] = {
      name: a?.name ?? b?.name ?? code,
      languages: a?.languages ?? b?.languages,
      wildcards: union(a?.wildcards, b?.wildcards),
      general: union(a?.general, b?.general),
      topics: mergeTopics(a?.topics, b?.topics),
    };
  }
  return {
    countries,
    eu: {
      wildcards: union(main.eu?.wildcards, extra.eu?.wildcards),
      general: union(main.eu?.general, extra.eu?.general),
      topics: mergeTopics(main.eu?.topics, extra.eu?.topics),
    },
    publishers: { ...extra.publishers, ...main.publishers },
  };
}

const DATA = mergeSources(researched as SourcesFile, seed as SourcesFile);

const EU_MEMBERS = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "),
);

const ALIASES: Record<string, string> = {
  uk: "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  usa: "US",
  "united states of america": "US",
  america: "US",
  holland: "NL",
  "the netherlands": "NL",
  "czech republic": "CZ",
  turkey: "TR",
  korea: "KR",
  "hong kong": "HK",
  macau: "MO",
  "republic of ireland": "IE",
  "ivory coast": "CI",
  uae: "AE",
  bosnia: "BA",
};

// Codes Intl still names but no country uses any more, and codes that are not countries.
const NOT_A_COUNTRY = new Set("AN BU CS DD DY FX HV NH RH SU TP UK VD YD YU ZR EU EZ UN ZZ XA XB QO".split(" "));

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const CODES = new Set<string>();

/** Country names in English and the other answer languages, mapped to ISO codes. */
function nameToCode(): Map<string, string> {
  const map = new Map<string, string>();
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // English first, so an English name always wins a clash. Then the other answer languages.
  const locales = ["en", "fi", "sv", "de", "fr", "es", "et", "uk"].map((l) => new Intl.DisplayNames([l], { type: "region" }));
  for (const a of letters) {
    for (const b of letters) {
      const code = a + b;
      if (NOT_A_COUNTRY.has(code)) continue;
      for (const names of locales) {
        let name: string | undefined;
        try {
          name = names.of(code);
        } catch {
          name = undefined;
        }
        if (!name || name === code) continue;
        CODES.add(code);
        const lower = name.toLowerCase();
        // "Bosnia & Herzegovina", "Myanmar (Burma)", "St. Lucia", "Côte d’Ivoire" should be found however they are typed.
        for (const variant of [lower, lower.replace(/ & /g, " and "), lower.replace(/\s*\(.*\)\s*/g, "").trim(), lower.replace(/^st\. /, "saint "), lower.replace(/’/g, "'")]) {
          if (variant && !map.has(variant)) map.set(variant, code);
        }
      }
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

/** `code` is empty when the country is not recognised. Callers must not guess. */
export function resolveJurisdiction(country: string, region?: string): Jurisdiction {
  const raw = country.trim();
  // "Finland (Espoo)" and "Finland, Espoo" name the country first.
  const lower = raw.toLowerCase().replace(/\s*[(,].*$/, "").replace(/\s+/g, " ").trim();
  const upper = lower.toUpperCase();
  const code = ALIASES[lower] ?? (lower.length === 2 && CODES.has(upper) ? upper : NAME_TO_CODE.get(lower)) ?? "";
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
    code,
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
