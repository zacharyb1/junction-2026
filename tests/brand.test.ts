import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assert, describe, expect, it } from "vitest";

/**
 * The brand is AIDaddy: one name for the product and its butler (decision of Sat 14 Nov 2026). The character name
 * "UKK" is retired everywhere a person can see it. This test reads the source on disk and fails when the name is
 * back: in a sentence, in an identifier or in the name of a file.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = path.relative(ROOT, fileURLToPath(import.meta.url)).split(path.sep).join("/");

// ---- The retired name -------------------------------------------------------------------------------------------

/**
 * The name as a name, not as letters inside a word. Finnish has many words with these letters in them (ukko,
 * Ukkonen, aukkoja, joulupukki, kukka). In each of them a letter stands before the three letters, or the word goes
 * on with o, i or eli (ukko, ukki, ukkeli). Anywhere else the three letters are the name.
 */
const RETIRED = [
  // UKK, UKK's, UKK:lta, UKK_VOICE, FROM_UKK, UKKGate. Not KUKKA, and not UKKONEN in a headline.
  /(?<!\p{Lu})UKK(?!(?:O|I|ELI)(?!\p{Ll}))/u,
  // UkkGate, UkkChat, askUkk(). Not Ukko, Ukki or Ukkonen.
  /Ukk(?!o|i|eli)/u,
  // ukk, /ukk, ukk-chat.tsx, ukk_session, ukk:research, __ukkLoaded, ukkConfigured. Not ukko, kukka or /ukkonen.
  /(?<!\p{L})ukk(?!o|i|eli)/u,
  // The president the character was named after, in every case form: Kekkonen, Kekkosen, Kekkoselle.
  /kekko(?:nen|s)/iu,
];

type Span = { start: number; end: number };

const spans = (pattern: RegExp, text: string): Span[] =>
  Array.from(text.matchAll(new RegExp(pattern, `${pattern.flags.replace("g", "")}g`)), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));

/** Where the retired name stands in a piece of text, from left to right. */
const retiredIn = (text: string): Span[] =>
  RETIRED.flatMap((pattern) => spans(pattern, text)).sort((a, b) => a.start - b.start);

// ---- The names that stay ----------------------------------------------------------------------------------------

/** One thing that keeps the old name: `pattern` says exactly what, in which file, and `why` says who depends on it. */
type Allowed = { file: string; pattern: RegExp; why: string };

/**
 * UKK_API_URL, UKK_API_KEY and NEXT_PUBLIC_UKK_CHAT_URL, or a comment that speaks of them together ("the UKK_ names").
 * The production server's private env file sets them. Renamed here, the /chat page would lose its backend until
 * someone edits that file by hand.
 */
const SERVER_VARIABLES =
  /\b(?:UKK_API_URL|UKK_API_KEY|NEXT_PUBLIC_UKK_CHAT_URL)\b|\bUKK_\*?(?= (?:variable names|names|variables)\b)/;

/**
 * Everything that may still carry the retired name. Nothing else is tolerated, and an entry that excuses nothing fails.
 * The words and addresses of a fetched page are never changed to pass this test: they get an entry when they arrive.
 * Finnish sites call their FAQ "UKK", and vero.fi has /ukk/ in its addresses.
 */
const ALLOWLIST: Allowed[] = [
  {
    file: "compose.yaml",
    pattern: SERVER_VARIABLES,
    why: "the server's private env file sets these variables, and Compose hands them to the web and hermes-web services",
  },
  {
    file: "containers/hermes/env.web.example",
    pattern: SERVER_VARIABLES,
    why: "tells the operator that the web bot's key comes from UKK_API_KEY, the name the server's private env file sets",
  },
  {
    file: "docs/DEPLOYMENT.md",
    pattern: SERVER_VARIABLES,
    why: "tells the operator which variables the server's private env file must set for the /chat page",
  },
  {
    file: "src/lib/aidaddy.ts",
    pattern: SERVER_VARIABLES,
    why: "reads the three variables under the names the server's private env file sets",
  },
  {
    file: "src/app/api/aidaddy/route.ts",
    pattern: SERVER_VARIABLES,
    why: "reads the backend's address and key under the names the server's private env file sets",
  },
  {
    file: "tests/aidaddy.test.ts",
    pattern: SERVER_VARIABLES,
    why: "sets the variables the chat route reads, under the names the server's private env file sets",
  },
  {
    file: "src/app/api/aidaddy/route.ts",
    pattern: /model: "ukk"|the model name "ukk"/,
    why: "the web-only Hermes instance on the server was set up with the model name ukk, so the route sends that name",
  },
  {
    file: "tests/aidaddy.test.ts",
    pattern: /expect\(body\.model\)\.toBe\("ukk"\)/,
    why: "checks that the route still sends the model name the server's Hermes instance was set up with",
  },
  {
    file: "next.config.ts",
    pattern: /source: "\/ukk"|Its earlier address, \/ukk,/,
    why: "printed QR codes and shared links point at /ukk, so that address redirects to /chat",
  },
  {
    file: "hermes/plugins/kaveri-gate/gate.py",
    pattern: /\|ukk\|kaveri\)|Its earlier names, UKK and Kaveri,/,
    why: "households that met the bot as UKK still call it that, so the gate wakes on the earlier name",
  },
  {
    file: "eval/gate/test_bot_name.py",
    pattern: /"[^"]*\b(?:UKK|ukk)\b[^"]*"/,
    why: "tests, with messages as a person would type them, that the earlier name still wakes the gate",
  },
  {
    file: "hermes/SOUL.md",
    pattern: /your earlier names "UKK" and "Kaveri"/,
    why: "the persona line that tells the bot which earlier names are still addressed to it",
  },
  // The four demo videos, by name. Whoever re-records one removes the old file and deletes its entry here.
  { file: "docs/pitch/ukk-browser-demo.mp4", pattern: /^ukk-browser-demo\.mp4$/, why: "recorded before the rename, not re-recorded yet" },
  { file: "docs/pitch/ukk-calendar-demo.mp4", pattern: /^ukk-calendar-demo\.mp4$/, why: "recorded before the rename, not re-recorded yet" },
  { file: "docs/pitch/ukk-talk-demo.mp4", pattern: /^ukk-talk-demo\.mp4$/, why: "recorded before the rename, not re-recorded yet" },
  { file: "docs/pitch/ukk-telegram-demo.mp4", pattern: /^ukk-telegram-demo\.mp4$/, why: "recorded before the rename, not re-recorded yet" },
];

// ---- What is read -----------------------------------------------------------------------------------------------

/** Folders read all the way down. */
const FOLDERS = ["src", "extension", "hermes", "containers", "scripts", "eval", "public", "tests"];
/** Folders of which only the files directly inside are read. */
const FLAT_FOLDERS = ["docs", "docs/pitch"];
/** Files in the repository root. */
const ROOT_FILES = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GLOSSARY.md",
  "PRODUCT.md",
  "DESIGN.md",
  "compose.yaml",
  "next.config.ts",
  "Dockerfile",
  ".env.example",
];

/**
 * History is never rewritten: the decision log is append-only, plans, specs and research are dated, and results are
 * recorded runs. They keep the name the bot had when they were written.
 */
const HISTORY = ["docs/DECISIONS.md", "docs/superpowers", "docs/research", "eval/results"];

/** Installed packages, build output, and the bytecode Python leaves behind when CI runs its tests before this one. */
const NOT_SOURCE = ["node_modules", ".next", "__pycache__"];

/** Pictures, sound, video, fonts and PDFs have a name to check and no text to read. */
const BINARY = /\.(?:png|jpe?g|webp|ico|mp3|mp4|woff2?|pdf)$/i;

/** One piece of text to check. Line 0 is the name of the file or folder itself. */
type Place = { file: string; line: number; text: string };

/** The name of a file or folder and, when it is a text file, its lines. */
function placesOf(file: string, readable: boolean): Place[] {
  const places: Place[] = [{ file, line: 0, text: path.posix.basename(file) }];
  if (!readable || BINARY.test(file)) return places;
  const bytes = readFileSync(path.join(ROOT, file));
  // A binary file of a kind not listed above (a zero byte near its start) has no lines either.
  if (bytes.subarray(0, 8000).includes(0)) return places;
  const lines = bytes.toString("utf8").split(/\r?\n/);
  return places.concat(lines.map((text, index) => ({ file, line: index + 1, text })));
}

/** The names and the text under a folder: all the way down, or only what is directly inside it. */
function inFolder(folder: string, deep: boolean): Place[] {
  return readdirSync(path.join(ROOT, folder), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const file = `${folder}/${entry.name}`;
      // Hidden files and folders are editor, cache and private env files: none of them is source that people see,
      // and a line of a private env file must never be printed by a failing test.
      if (entry.name.startsWith(".") || NOT_SOURCE.includes(entry.name)) return [];
      if (HISTORY.includes(file) || file === SELF) return [];
      if (entry.isDirectory()) return [...placesOf(file, false), ...(deep ? inFolder(file, true) : [])];
      return placesOf(file, entry.isFile());
    });
}

/** Everything the guard reads. A listed folder or file that is gone fails loudly, so the lists cannot go stale either. */
function everyPlace(): Place[] {
  const gone = [...FOLDERS, ...FLAT_FOLDERS, ...ROOT_FILES].filter((listed) => !existsSync(path.join(ROOT, listed)));
  if (gone.length > 0) throw new Error(`${SELF} lists what is not on disk: ${gone.join(", ")}. Update its lists.`);
  return [
    ...FOLDERS.flatMap((folder) => inFolder(folder, true)),
    ...FLAT_FOLDERS.flatMap((folder) => inFolder(folder, false)),
    ...ROOT_FILES.flatMap((file) => placesOf(file, true)),
  ];
}

// ---- The check --------------------------------------------------------------------------------------------------

type Offence = Place & { hits: Span[] };

/** Every place where the retired name stands and no entry excuses it, and the entries that excuse nothing. */
function audit(places: Place[], allowlist: Allowed[]): { offences: Offence[]; unused: Allowed[] } {
  const used = new Set<Allowed>();
  const offences: Offence[] = [];
  for (const place of places) {
    const found = retiredIn(place.text);
    if (found.length === 0) continue;
    const excuses = allowlist
      .filter((entry) => entry.file === place.file)
      .map((entry) => ({ entry, covered: spans(entry.pattern, place.text) }));
    // An entry excuses the name only inside what its pattern matches: the same name elsewhere on the line still counts.
    const hits = found.filter((hit) => {
      const by = excuses.filter(({ covered }) => covered.some((span) => span.start <= hit.start && hit.end <= span.end));
      for (const { entry } of by) used.add(entry);
      return by.length === 0;
    });
    if (hits.length > 0) offences.push({ ...place, hits });
  }
  return { offences, unused: allowlist.filter((entry) => !used.has(entry)) };
}

/** "file:line: the line". Of a long line, only the words around each hit. */
function shown({ file, line, text, hits }: Offence): string {
  if (line === 0) return `${file}: the name of this file or folder`;
  const whole = text.trim();
  const around = hits.map((hit) => `…${text.slice(Math.max(0, hit.start - 50), hit.end + 50).trim()}…`);
  return `${file}:${line}: ${whole.length <= 160 ? whole : around.join(" ")}`;
}

const ADVICE =
  "The brand is AIDaddy (decision of Sat 14 Nov 2026): rename it, or, if another machine depends on the name, " +
  `add it to ALLOWLIST in ${SELF} with the reason.`;

describe("the brand guard", () => {
  let checked: ReturnType<typeof audit> | undefined;
  const tree = () => (checked ??= audit(everyPlace(), ALLOWLIST));

  it("finds the retired name UKK nowhere in the source that people see", () => {
    const { offences } = tree();
    const count = `${offences.length} place${offences.length === 1 ? "" : "s"}`;
    const list = offences.map((offence) => `  ${shown(offence)}`).join("\n");
    assert(offences.length === 0, `The retired name is back in ${count}:\n\n${list}\n\n${ADVICE}`);
  });

  it("has no allowlist entry that excuses nothing, so the list cannot outlive what it protects", () => {
    const { unused } = tree();
    const list = unused.map((entry) => `  ${entry.file}  ${entry.pattern}  (${entry.why})`).join("\n");
    assert(
      unused.length === 0,
      `These entries of ALLOWLIST in ${SELF} excuse nothing any more. Delete each one, or bring its pattern up to date ` +
        `if the text it excused was only reworded:\n\n${list}`,
    );
  });
});

describe("the brand guard's matcher", () => {
  it("flags the retired name wherever it stands as a name", () => {
    const names = [
      // In a sentence, in English and in Finnish.
      "UKK",
      "A link in UKK's reply",
      "Ask UKK.",
      "@UKK help",
      "hei ukk",
      "kysyin UKK:lta",
      "UKK:n suunnitelma",
      // In code.
      "UKK_VOICE",
      "UKK_OFFICIAL_HOSTS",
      "process.env.UKK_API_URL",
      "NEXT_PUBLIC_UKK_CHAT_URL",
      "FROM_UKK",
      "UkkGate.decide(page)",
      "<UkkChat />",
      "UkkAvatar",
      "askUkk()",
      "ukkConfigured()",
      "window.__ukkLoaded",
      "test_ukk_wakes",
      'model: "ukk"',
      '"ukk_session"',
      '"ukk:research"',
      ".ukk {",
      "#ukk-root",
      "ukkbot",
      // In addresses and in the names of files and folders.
      "/ukk",
      "/api/ukk/speak",
      "https://ukk.example/api/ukk",
      "ukk",
      "ukk.ts",
      "ukk-chat.tsx",
      "ukk-avatar.jpg",
      "ukk-focus",
      "UkkChat.tsx",
      // The president the character was named after.
      "Kekkonen",
      "Kekkosen tapaan",
      "kekkonen.jpg",
    ];
    for (const text of names) expect(retiredIn(text), text).not.toEqual([]);
  });

  it("leaves alone the Finnish words that only contain the letters, and the new name", () => {
    const words = [
      // Words that start with the letters and go on.
      "ukko",
      "Ukko",
      "ukko tulee kotiin",
      "ukkonen",
      "Ukkonen",
      "Ukkonen soitti",
      "UKKONEN",
      "ukkosmyrsky",
      "ukki",
      "Ukki",
      "ukkeli",
      "Ukko-Pekka",
      // Words with the letters inside them.
      "aukkoja",
      "Listattu, jotta tiedät, missä on aukkoja.",
      "joulupukki",
      "lumiukko",
      "kukka",
      "KUKKA",
      "Kukkonen",
      "nukkuu",
      "hukkaan",
      "lukko",
      "tukku",
      "bukk",
      // The same words in an address and in the name of a file.
      "https://www.ilmatieteenlaitos.fi/ukkonen",
      "sukka.png",
      // The new name.
      "AIDaddy",
      "AIDaddyn",
      "aidaddy_session",
    ];
    for (const text of words) expect(retiredIn(text), text).toEqual([]);
  });
});

describe("the brand guard's allowlist", () => {
  it("excuses only what an entry names, in its own file, and reports an entry that excuses nothing", () => {
    const allowlist: Allowed[] = [
      { file: "a.ts", pattern: /UKK_API_URL/, why: "another machine sets it" },
      { file: "a.ts", pattern: /"ukk"/, why: "nothing in the file needs it" },
    ];
    const { offences, unused } = audit(
      [
        { file: "a.ts", line: 1, text: "fetch(process.env.UKK_API_URL); // ask UKK" },
        { file: "a.ts", line: 2, text: "const url = process.env.UKK_API_URL;" },
        { file: "b.ts", line: 1, text: "const url = process.env.UKK_API_URL;" },
        { file: "ukk-notes.md", line: 0, text: "ukk-notes.md" },
      ],
      allowlist,
    );
    expect(offences.map(shown)).toEqual([
      "a.ts:1: fetch(process.env.UKK_API_URL); // ask UKK",
      "b.ts:1: const url = process.env.UKK_API_URL;",
      "ukk-notes.md: the name of this file or folder",
    ]);
    expect(offences[0].hits).toHaveLength(1);
    expect(unused).toEqual([allowlist[1]]);
  });
});
