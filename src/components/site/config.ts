import examples from "@/data/example-cases.json";

/**
 * Everything the landing page takes from the environment, in one place.
 *
 * All three are NEXT_PUBLIC_ variables, so Next.js inlines them at build time:
 * change one in Vercel, then redeploy. Unset, empty or malformed values come back
 * as null and the page hides the matching piece instead of showing a broken link.
 */
export type LandingConfig = {
  /** Telegram username of the bot, without the @. */
  botUsername: string | null;
  /** Path of the sample case file, for example /c/3C5sH6YwQzT-lhBd. */
  sampleCaseHref: string | null;
  /** Public source repository. */
  repoUrl: string | null;
};

export function landingConfig(): LandingConfig {
  return {
    botUsername: telegramUsername(process.env.NEXT_PUBLIC_BOT_USERNAME),
    // Without a chosen sample, the first case the engine researched for the demo's examples stands in.
    sampleCaseHref: caseHref(process.env.NEXT_PUBLIC_SAMPLE_CASE_ID) ?? caseHref(examples.cases[0]?.id),
    repoUrl: httpUrl(process.env.NEXT_PUBLIC_REPO_URL),
  };
}

/** A value that is set but unusable is a typo someone wants to hear about. */
function rejected(name: string): null {
  console.warn(`[landing] ${name} is set but does not look right, so the page ignores it.`);
  return null;
}

/** Accepts "name", "@name" and "https://t.me/name". */
function telegramUsername(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const name = value.replace(/^https?:\/\/t\.me\//i, "").replace(/^@/, "");
  return /^[A-Za-z0-9_]{4,32}$/.test(name) ? name : rejected("NEXT_PUBLIC_BOT_USERNAME");
}

/** Same id rule as the case store, see `safeId` in src/lib/store.ts. */
function caseHref(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id) return null;
  return /^[A-Za-z0-9_-]{8,40}$/.test(id) ? `/c/${id}` : rejected("NEXT_PUBLIC_SAMPLE_CASE_ID");
}

function httpUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    // falls through to the warning
  }
  return rejected("NEXT_PUBLIC_REPO_URL");
}
