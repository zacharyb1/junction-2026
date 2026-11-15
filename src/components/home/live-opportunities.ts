"use client";

/**
 * Finds the demo household's hidden opportunities live on the web (/api/opportunities), so the phone app and the
 * desktop app show the same finds.
 *
 * One scan per tab every half hour: reloading during a demo shows the same finds and spends no more search credit.
 * It waits for the browser, where a remembered access code can be read, so the scan runs once.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Opportunity, OpportunityScan } from "@/lib/engine/opportunities";
import { HOUSEHOLD } from "@/lib/home-demo";
import type { LiveOpps } from "./hidden";
import { liveRow } from "./opportunities";

const SCAN_KEY = "ukk-home-opportunities";
const SCAN_TTL_MS = 30 * 60 * 1000;

function readScan(): Opportunity[] | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(SCAN_KEY) ?? "null") as { at: number; found: Opportunity[] } | null;
    return saved && Date.now() - saved.at < SCAN_TTL_MS && Array.isArray(saved.found) ? saved.found : null;
  } catch {
    return null;
  }
}

function saveScan(found: Opportunity[]) {
  try {
    window.sessionStorage.setItem(SCAN_KEY, JSON.stringify({ at: Date.now(), found }));
  } catch {
    // Storage off: the next load scans again.
  }
}

const subscribe = () => () => {};

export function useLiveOpportunities(code: string): LiveOpps {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [live, setLive] = useState<LiveOpps>({ status: "loading", rows: [], error: "" });

  useEffect(() => {
    if (!hydrated) return;
    let gone = false;
    const cached = readScan();
    const scan: Promise<Opportunity[]> = cached
      ? Promise.resolve(cached)
      : fetch("/api/opportunities", {
          method: "POST",
          headers: { "content-type": "application/json", "x-demo-code": code },
          body: JSON.stringify(HOUSEHOLD),
        }).then(async (res) => {
          const body = (await res.json().catch(() => null)) as (OpportunityScan & { error?: string }) | null;
          if (!res.ok || !body?.opportunities) throw new Error(res.status === 401 ? "it needs the demo's access code (open /home?code=…)" : (body?.error ?? `search failed (${res.status})`));
          saveScan(body.opportunities);
          return body.opportunities;
        });
    scan
      .then((found) => {
        if (!gone) setLive({ status: "ok", rows: found.map(liveRow), error: "" });
      })
      .catch((e: unknown) => {
        if (!gone) setLive({ status: "error", rows: [], error: e instanceof Error ? e.message : "search failed" });
      });
    return () => {
      gone = true;
    };
  }, [code, hydrated]);

  return live;
}
