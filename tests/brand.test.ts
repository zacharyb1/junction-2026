import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assert, describe, expect, it } from "vitest";

/**
 * The brand is AIDaddy: one name for the product and its butler (decision of Sat 14 Nov 2026). The character name
 * "UKK" is retired everywhere a person can see it. This test reads the source on disk and fails when the name is
 * back, in a sentence, in an identifier or in the name of a file, or when one of the character's own phrases is.
 *
 * What it reads is listed under "What is read" below. It does not read the history (decision log, dated plans,
 * research, recorded results), the text of the recorded runs in src/data, the third-party skills in .claude/skills,
 * the lockfile, hidden files that are not named here, installed packages or build output.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = path.relative(ROOT, fileURLToPath(import.meta.url)).split(path.sep).join("/");

// ---- The retired name -------------------------------------------------------------------------------------------

/**
 * The name as a name, not as letters inside a word. Finnish has many words with these letters in them (ukko,
 * Ukkonen, aukkoja, joulupukki, kukka). In each of them a letter stands before the three letters, or the word goes
 * on with o, i or eli (ukko, ukki, ukkeli). Anywhere else the three letters are the name. After the name come the
 * phrases the character was introduced with. A word that ordinary text also uses is not listed.
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
  // What the character called itself: "Finland's FAQ", with the apostrophe as a sentence, a string or a page writes it.
  /Finland\\?(?:['’]|&apos;|&#39;|&#x27;|&rsquo;)s FAQ/iu,
  /FAQ for newcomers/iu,
  // The Finnish words the three letters stood for, in every form: usein kysytyt kysymykset, usein kysyttyä.
  /usein kysyt/iu,
];

type Span = { start: number; end: number };

const spans = (pattern: RegExp, text: string): Span[] =>
  Array.from(text.matchAll(new RegExp(pattern, `${pattern.flags.replace("g", "")}g`)), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));

/** Where the retired name, or one of the phrases that went with it, stands in a piece of text, from left to right. */
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
 * Each entry is a name that another machine, a printed link or a household from before the rename depends on, or a
 * recording that is replaced later. The words and addresses of a fetched page are never changed to pass this test:
 * the recorded runs in src/data are not read for that reason (NAMES_ONLY below), and a page quoted anywhere else
 * gets an entry when it arrives. Finnish sites call their FAQ "UKK", and vero.fi has /ukk/ in its addresses.
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
    // The four messages of the test of the earlier name, and the comment above them. Nothing else in that file.
    pattern: /"UKK, we got a letter"|"hei ukk"|"@UKK help"|"kysyin UKK:lta"|"UKK:lta" is "from UKK"/,
    why: "tests, with messages as a person would type them, that the earlier name still wakes the gate",
  },
  {
    file: "hermes/SOUL.md",
    pattern: /your earlier names "UKK" and "Kaveri"/,
    why: "the persona line that tells the bot which earlier names are still addressed to it",
  },
];

// ---- What is read -----------------------------------------------------------------------------------------------

/**
 * Folders read all the way down: every folder Git tracks in the repository root. Of .claude only the team's own
 * commands are read: .claude/skills holds third-party text, and .claude/worktrees holds other checkouts.
 */
const FOLDERS = [
  "src",
  "extension",
  "hermes",
  "containers",
  "scripts",
  "eval",
  "public",
  "tests",
  "docs",
  "assets",
  ".github",
  ".claude/commands",
];

/**
 * Files in the repository root: every one Git tracks, except pnpm-lock.yaml, whose hashes can hold any three letters.
 * Other hidden files in the root are private env files and are never read.
 */
const ROOT_FILES = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "GLOSSARY.md",
  "PRODUCT.md",
  "DESIGN.md",
  "LICENSE",
  "compose.yaml",
  "Dockerfile",
  "next.config.ts",
  "eslint.config.mjs",
  "vitest.config.mts",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "components.json",
  "vercel.json",
  ".env.example",
  ".gitignore",
  ".dockerignore",
];

/**
 * History is never rewritten: the decision log is append-only, plans, specs and research are dated, and results are
 * recorded runs. They keep the name the bot had when they were written.
 */
const HISTORY = ["docs/DECISIONS.md", "docs/superpowers", "docs/research", "eval/results"];

/**
 * Folders whose files have a name to check and text that is not ours to word. src/data holds recorded runs and
 * source lists: the words and addresses of fetched official pages, which a refreshed scorecard or replay replaces.
 */
const NAMES_ONLY = ["src/data"];

/** Installed packages, build output, and the bytecode Python leaves behind when CI runs its tests before this one. */
const NOT_SOURCE = ["node_modules", ".next", "__pycache__"];

/** Pictures, sound, video, fonts and PDFs have a name to check and no text to read. */
const BINARY = /\.(?:png|jpe?g|webp|ico|mp3|mp4|woff2?|pdf)$/i;

/** One piece of text to check. Line 0 is the name of the file or folder itself. */
type Place = { file: string; line: number; text: string };

/** The name of a file or folder and, when it is a text file, its lines. `root` is the repository, or a copy in a test. */
function placesOf(file: string, readable: boolean, root = ROOT): Place[] {
  const places: Place[] = [{ file, line: 0, text: path.posix.basename(file) }];
  if (!readable || BINARY.test(file)) return places;
  const bytes = readFileSync(path.join(root, file));
  // A binary file of a kind not listed above (a zero byte near its start) has no lines either.
  if (bytes.subarray(0, 8000).includes(0)) return places;
  const lines = bytes.toString("utf8").split(/\r?\n/);
  return places.concat(lines.map((text, index) => ({ file, line: index + 1, text })));
}

/** Is this file or folder one of the listed ones, or inside one of them? */
const within = (file: string, listed: string[]) => listed.some((one) => file === one || file.startsWith(`${one}/`));

/** The names and the text under a folder, all the way down. */
function inFolder(folder: string, root = ROOT): Place[] {
  return readdirSync(path.join(root, folder), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const file = `${folder}/${entry.name}`;
      // Hidden files and folders are editor, cache and private env files: none of them is source that people see,
      // and a line of a private env file must never be printed by a failing test.
      if (entry.name.startsWith(".") || NOT_SOURCE.includes(entry.name)) return [];
      if (HISTORY.includes(file) || file === SELF) return [];
      if (entry.isDirectory()) return [...placesOf(file, false, root), ...inFolder(file, root)];
      return placesOf(file, entry.isFile() && !within(file, NAMES_ONLY), root);
    });
}

/** Everything the guard reads. A listed folder or file that is gone fails loudly, so the lists cannot go stale either. */
function everyPlace(root = ROOT): Place[] {
  const gone = [...FOLDERS, ...ROOT_FILES, ...HISTORY, ...NAMES_ONLY].filter((listed) => !existsSync(path.join(root, listed)));
  if (gone.length > 0) throw new Error(`${SELF} lists what is not on disk: ${gone.join(", ")}. Update its lists.`);
  return [
    ...FOLDERS.flatMap((folder) => inFolder(folder, root)),
    ...ROOT_FILES.flatMap((file) => placesOf(file, true, root)),
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
  "The brand is AIDaddy (decision of Sat 14 Nov 2026), and the character UKK is retired with its phrases: rename or " +
  `reword it, or, if another machine depends on the name, add it to ALLOWLIST in ${SELF} with the reason.`;

describe("the brand guard", () => {
  let checked: ReturnType<typeof audit> | undefined;
  const tree = () => (checked ??= audit(everyPlace(), ALLOWLIST));

  it("finds the retired name UKK and the character's phrases nowhere in what it reads", () => {
    const { offences } = tree();
    const count = `${offences.length} place${offences.length === 1 ? "" : "s"}`;
    const list = offences.map((offence) => `  ${shown(offence)}`).join("\n");
    assert(offences.length === 0, `The retired name or one of its phrases is back in ${count}:\n\n${list}\n\n${ADVICE}`);
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

  it("flags the phrases that went with the character", () => {
    const phrases = [
      "Finland's FAQ",
      "Finland's FAQ for newcomers. Life events and official letters.",
      // The apostrophe as a page, a string and a typesetter write it.
      "Finland&apos;s FAQ",
      "Finland&#39;s FAQ",
      "'Finland\\'s FAQ'",
      "Finland’s FAQ",
      "FINLAND'S FAQ",
      "A FAQ for newcomers",
      // The Finnish words the three letters stood for.
      "usein kysytyt kysymykset",
      "Usein kysytyt kysymykset",
      "(*usein kysytyt kysymykset*)",
      "usein kysyttyä",
    ];
    for (const text of phrases) expect(retiredIn(text), text).not.toEqual([]);
  });

  it("leaves alone the same words where they are not the character's phrase", () => {
    const words = [
      "FAQ",
      "Other failures are listed in the Ollama FAQ: https://docs.ollama.com/faq",
      "Frequently asked questions",
      "Finland's official sites",
      "newcomers to Finland",
      "usein myöhässä",
      "kysytyt kysymykset",
    ];
    for (const text of words) expect(retiredIn(text), text).toEqual([]);
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

describe("what the brand guard reads", () => {
  /** A small repository in a temporary folder: everything the guard lists, empty, plus the given files. */
  function scratchRepository(files: Record<string, string>): string {
    const root = mkdtempSync(path.join(tmpdir(), "brand-guard-"));
    const write = (file: string, text: string) => {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), text);
    };
    const isFile = (listed: string) => listed.endsWith(".md");
    for (const folder of [...FOLDERS, ...NAMES_ONLY, ...HISTORY.filter((listed) => !isFile(listed))]) {
      mkdirSync(path.join(root, folder), { recursive: true });
    }
    for (const file of [...ROOT_FILES, ...HISTORY.filter(isFile)]) write(file, "");
    for (const [file, text] of Object.entries(files)) write(file, text);
    return root;
  }

  it("catches the name wherever the team's own words are kept, and stays out of everything else", () => {
    const root = scratchRepository({
      // Read: text and names in the listed folders, all the way down, and the listed root files.
      "src/app/chat/page.tsx": "<p>Finland&apos;s FAQ for newcomers</p>",
      "docs/handover/notes.md": "Ask UKK.",
      "docs/pitch/voiceover/09-ukk.mp3": "",
      "assets/ukk-portrait.jpg": "",
      ".github/PULL_REQUEST_TEMPLATE.md": "What UKK says now",
      ".claude/commands/pitch.md": "UKK, the butler",
      "package.json": '{ "description": "UKK, the butler" }',
      LICENSE: "Copyright the UKK team",
      // Names only: a recorded run holds the words and addresses of fetched pages, which are not ours to change.
      "src/data/replay.json": '{ "url": "https://www.vero.fi/ukk/verokortti/", "quote": "UKK: usein kysytyt kysymykset" }',
      "src/data/ukk-replay.json": "{}",
      // Not read: history, third-party skills, the lockfile, packages, build output, bytecode and hidden files.
      "docs/DECISIONS.md": "[Sat 16:45] The bot is UKK",
      "docs/superpowers/plans/2026-11-14-ukk-identity.md": "UKK",
      "docs/research/notes.md": "UKK",
      "eval/results/latest.md": "UKK",
      ".claude/skills/third-party/SKILL.md": "UKK",
      "pnpm-lock.yaml": "resolution: {integrity: sha512-UKK}",
      "node_modules/pkg/index.js": "UKK",
      "src/node_modules/pkg/index.js": "UKK",
      ".next/server/app.js": "UKK",
      "hermes/__pycache__/gate.pyc": "UKK",
      ".env.local": "UKK_API_KEY=not-for-a-test-log",
      "scripts/.scratch.mjs": "UKK",
    });
    try {
      const { offences } = audit(everyPlace(root), []);
      expect(offences.map(shown).sort()).toEqual(
        [
          "src/app/chat/page.tsx:1: <p>Finland&apos;s FAQ for newcomers</p>",
          "docs/handover/notes.md:1: Ask UKK.",
          "docs/pitch/voiceover/09-ukk.mp3: the name of this file or folder",
          "assets/ukk-portrait.jpg: the name of this file or folder",
          ".github/PULL_REQUEST_TEMPLATE.md:1: What UKK says now",
          ".claude/commands/pitch.md:1: UKK, the butler",
          'package.json:1: { "description": "UKK, the butler" }',
          "LICENSE:1: Copyright the UKK team",
          "src/data/ukk-replay.json: the name of this file or folder",
        ].sort(),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails loudly when a folder or file it lists is gone", () => {
    const root = scratchRepository({});
    rmSync(path.join(root, "src/data"), { recursive: true });
    try {
      expect(() => everyPlace(root)).toThrow(/lists what is not on disk: src\/data\./);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
