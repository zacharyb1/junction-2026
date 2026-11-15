import { createHmac, timingSafeEqual } from "node:crypto";

/** Where the /chat page runs when this deployment has no AIDaddy backend (for example on Vercel). */
export const DEFAULT_CHAT_URL = "https://86.38.238.136.sslip.io/chat";

export const SESSION_COOKIE = "aidaddy_session";

// The UKK_ variable names below predate the rename to AIDaddy and stay, because the server's private env file sets them.

/** True when this deployment can reach the web-only AIDaddy instance (hermes-web on the server). */
export function aidaddyConfigured(): boolean {
  return Boolean(process.env.UKK_API_URL && process.env.UKK_API_KEY);
}

export function chatUrl(): string {
  return process.env.NEXT_PUBLIC_UKK_CHAT_URL || DEFAULT_CHAT_URL;
}

function signature(id: string): string {
  return createHmac("sha256", process.env.UKK_API_KEY ?? "").update(id).digest("base64url");
}

/**
 * Hermes session IDs can be guessed (they start with a timestamp), so the cookie carries the ID
 * with an HMAC. Only an ID this server signed is ever sent back to Hermes.
 */
export function signSession(id: string): string {
  return `${id}.${signature(id)}`;
}

export function readSession(value: string | undefined | null): string | null {
  if (!value || !process.env.UKK_API_KEY) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(signature(id));
  return given.length === expected.length && timingSafeEqual(given, expected) ? id : null;
}

/** The value of one cookie from a Cookie header. */
export function cookieValue(header: string | null, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
