"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "aidaddy-access-code";
const subscribe = () => () => {};
const none = () => "";

function current(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("code") ?? "";
  if (fromUrl) return fromUrl;
  try {
    return window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    // Storage can be switched off; the address is then the only place the code lives.
    return "";
  }
}

/**
 * The demo's access code, as this browser tab knows it.
 *
 * The QR at the table opens one page with ?code=...; /try, /ukk and /autopilot read the code from their address.
 * The tab remembers it, so a link in the header still carries it after a visit to a page that had no use for it.
 * It is the public demo code, not a secret. Empty on the server and before the script loads.
 */
export function useAccessCode(): string {
  const code = useSyncExternalStore(subscribe, current, none);
  useEffect(() => {
    if (!code) return;
    try {
      window.sessionStorage.setItem(KEY, code);
    } catch {
      // Nothing to do: the code stays in the address.
    }
  }, [code]);
  return code;
}

/** The pages that read ?code=... from their address. */
const TAKES_CODE = /^\/(try|ukk|autopilot)(?=$|[/?#])/;

/** Adds the access code to a site path that reads one. Every other address comes back unchanged. */
export function withCode(href: string, code: string): string {
  if (!code || !TAKES_CODE.test(href)) return href;
  const [path, hash = ""] = href.split("#");
  const joined = `${path}${path.includes("?") ? "&" : "?"}code=${encodeURIComponent(code)}`;
  return hash ? `${joined}#${hash}` : joined;
}
