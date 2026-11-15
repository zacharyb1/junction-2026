"use client";

/**
 * The two real halves of Get it done on /desk: finding local companies for a job on their own pages (/api/helpers),
 * and a round of phone calls to the team's test phones that stand in for them (/api/calls, a swarm). Nothing here is
 * simulated; what a test phone's person says on the call is what comes back.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Helper, HelperSearch } from "@/lib/engine/helpers";
import { HOUSEHOLD } from "@/lib/home-demo";

type Json = Record<string, unknown>;

async function post(url: string, code: string, body: unknown): Promise<{ status: number; body: Json }> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-demo-code": code }, body: JSON.stringify(body) });
  return { status: res.status, body: ((await res.json().catch(() => null)) ?? {}) as Json };
}

export type CompanySearch = { status: "searching" | "ok" | "error"; helpers: Helper[]; error: string };

/**
 * Real companies for the job, each with the phone and any price its own page lists. It searches once: the page keys
 * its component by the job, so another job starts with a fresh search.
 */
export function useCompanySearch(job: string, code: string): CompanySearch {
  const [state, setState] = useState<CompanySearch>({ status: "searching", helpers: [], error: "" });
  useEffect(() => {
    let gone = false;
    post("/api/helpers", code, { job, city: HOUSEHOLD.city, country: HOUSEHOLD.country })
      .then(({ status, body }) => {
        const found = body as Partial<HelperSearch> & { error?: string };
        if (status !== 200 || !found.helpers) throw new Error(status === 401 ? "this page needs the demo's access code" : (found.error ?? `search failed (${status})`));
        if (!gone) setState({ status: "ok", helpers: found.helpers, error: "" });
      })
      .catch((e: unknown) => {
        if (!gone) setState({ status: "error", helpers: [], error: e instanceof Error ? e.message : "search failed" });
      });
    return () => {
      gone = true;
    };
  }, [job, code]);
  return state;
}

export type CallAnswer = { name: string; answer?: string; price?: number; currency?: string; outcome?: string };
export type CallProgress = { name: string; phoneEnding: string; status: string; answer?: string; price?: number; currency?: string };

export type CallRound = {
  phase: "idle" | "proposing" | "proposed" | "starting" | "calling" | "done" | "error";
  error: string;
  /** Who would be called: the test phones' names and the last four digits. */
  recipients: { name: string; phoneEnding: string }[];
  recorded: boolean;
  calls: CallProgress[];
  answered: CallAnswer[];
  unanswered: { name: string; status: string }[];
  cheapest?: { price: number; currency: string; names: string[] };
};

const IDLE: CallRound = { phase: "idle", error: "", recipients: [], recorded: false, calls: [], answered: [], unanswered: [] };
const POLL_MS = 4000;
const OVER = new Set(["finished", "failed", "cancelled", "unknown"]);

/** One round of calls: propose (nobody rings), the person says yes, every test phone rings at once, then the answers. */
export function useCallRound(code: string) {
  const [round, setRound] = useState<CallRound>(IDLE);
  const id = useRef("");

  const propose = useCallback(
    async (task: string) => {
      setRound({ ...IDLE, phase: "proposing" });
      const { status, body } = await post("/api/calls", code, { task });
      if (status === 201 && typeof body.id === "string") {
        id.current = body.id;
        setRound({ ...IDLE, phase: "proposed", recipients: (body.recipients as CallRound["recipients"]) ?? [], recorded: Boolean(body.recorded) });
        return;
      }
      const why = status === 503 ? "Calls are not set up on this server yet." : status === 401 ? "This page needs the demo's access code." : ((body.error as string) ?? (body.next as string) ?? "The calls could not be prepared.");
      setRound({ ...IDLE, phase: "error", error: why });
    },
    [code],
  );

  const confirm = useCallback(async () => {
    setRound((r) => ({ ...r, phase: "starting" }));
    const { status, body } = await post(`/api/calls/${id.current}/start`, code, { confirmed: true });
    if (status === 200 && (body.status === "calling" || body.status === "starting" || body.status === "already_started")) {
      setRound((r) => ({ ...r, phase: "calling" }));
      return;
    }
    const why = status === 429 ? ((body.note as string) ?? "The calls for this hour are used up. Try again later.") : ((body.note as string) ?? (body.error as string) ?? "The calls could not start.");
    setRound((r) => ({ ...r, phase: "error", error: why }));
  }, [code]);

  // While the phones ring, read the round every few seconds until every call has ended.
  useEffect(() => {
    if (round.phase !== "calling") return;
    let gone = false;
    const read = async () => {
      const res = await fetch(`/api/calls/${id.current}`, { headers: { "x-demo-code": code } }).catch(() => null);
      const body = ((await res?.json().catch(() => null)) ?? {}) as Json & {
        status?: string;
        calls?: CallProgress[];
        comparison?: { answered: CallAnswer[]; unanswered: { name: string; status: string }[]; cheapest?: CallRound["cheapest"] };
      };
      if (gone) return;
      setRound((r) => ({
        ...r,
        calls: body.calls ?? r.calls,
        ...(body.status && OVER.has(body.status)
          ? {
              phase: body.status === "finished" ? "done" : "error",
              error: body.status === "finished" ? "" : "The calls did not finish. Check them before starting new ones.",
              answered: body.comparison?.answered ?? [],
              unanswered: body.comparison?.unanswered ?? [],
              cheapest: body.comparison?.cheapest,
            }
          : {}),
      }));
    };
    void read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      gone = true;
      clearInterval(timer);
    };
  }, [round.phase, code]);

  const reset = useCallback(() => {
    id.current = "";
    setRound(IDLE);
  }, []);

  return { round, propose, confirm, reset };
}
