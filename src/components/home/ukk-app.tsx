"use client";

/**
 * UKK as a phone app at /home: a stack of screens with app-like transitions (push slides in from the right, back
 * slides out, tabs crossfade), kept in step with the browser's history so its back button and swipe work too.
 * On a phone it fills the screen; on a laptop it sits in a drawn phone with what the presenter says beside it.
 *
 * Hidden opportunities start loading for the demo household as soon as the app opens, so they are ready by the time
 * the presenter gets there.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useAccessCode } from "@/components/site/access-code";
import type { Opportunity, OpportunityScan } from "@/lib/engine/opportunities";
import { HOUSEHOLD } from "@/lib/home-demo";
import { CommunityScreen } from "./community";
import { ConnectScreen } from "./connect";
import { DetailScreen } from "./detail";
import { HiddenScreen, type LiveOpps } from "./hidden";
import { HouseholdScreen } from "./household";
import { EXAMPLES, liveRow } from "./opportunities";
import { SearchScreen } from "./search";
import { StartScreen } from "./start";
import { TasksScreen } from "./tasks";
import { type Nav, NavContext, type Route, type Tab } from "./ui";
import "./home.css";

type Entry = { id: number; route: Route };
type Kind = "push" | "pop" | "tab";
type HistoryState = { ukk: { depth: number; route: Route } };

const ANIM_MS = 520;

const CAPTIONS: Record<Route["s"], [string, string, string]> = {
  start: ["01", "Tell UKK what your family needs", "One place to ask, in your own words."],
  tasks: ["02", "AI agents call for quotes", "Search, call, compare. You approve the booking."],
  connect: ["03", "Connect the apps you already use", "It only reads. Nothing is sent without your yes."],
  household: ["03", "That’s not all: it learns your family", "Facts from 12 apps, each with its source."],
  hidden: ["04", "Hidden opportunities", "Money and help your family is missing."],
  opp: ["04", "Why it fits, and the source", "An estimate, the reasons and the page it comes from."],
  search: ["05", "Shopping from your chats", "Gifts and needs found in family messages."],
  community: ["06", "Ask parents like you", "Forums, groups and podcasts, at the right minute."],
};

/** The address of a screen, so a reload or a shared link opens the same one. The access code travels along. */
function urlFor(route: Route): string {
  const now = new URLSearchParams(window.location.search);
  const q = new URLSearchParams();
  const code = now.get("code");
  if (code) q.set("code", code);
  if (route.s !== "start") q.set("s", route.s);
  if (route.s === "opp") q.set("id", route.id);
  if (route.s === "tasks" && route.job) q.set("job", route.job);
  const s = q.toString();
  return `/home${s ? `?${s}` : ""}`;
}

const subscribe = () => () => {};

// One scan per tab every half hour: reloading during a demo shows the same finds and spends no more search credit.
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

export function UkkApp({ initial, code: given, fontClass }: { initial: Route; code: string; fontClass: string }) {
  // The demo's access code: from the address, or remembered by this tab from the page the QR opened.
  const remembered = useAccessCode();
  const code = given || remembered;
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [stack, setStack] = useState<Entry[]>([{ id: 0, route: initial }]);
  const [leaving, setLeaving] = useState<{ entry: Entry; kind: Kind } | null>(null);
  const [kind, setKind] = useState<Kind>("push");
  const [live, setLive] = useState<LiveOpps>({ status: "loading", rows: [], error: "" });
  const stackRef = useRef(stack);
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((next: Entry[], how: Kind) => {
    const before = stackRef.current;
    const top = before[before.length - 1];
    stackRef.current = next;
    setStack(next);
    setKind(how);
    if (top.id !== next[next.length - 1].id) setLeaving({ entry: top, kind: how });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLeaving(null), ANIM_MS);
  }, []);

  const entry = (route: Route): Entry => ({ id: nextId.current++, route });

  // The browser's own back and forward move through the same stack.
  useEffect(() => {
    const first = stackRef.current[0].route;
    window.history.replaceState({ ukk: { depth: 0, route: first } } satisfies HistoryState, "", urlFor(first));
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as HistoryState | null)?.ukk;
      if (!s) return;
      const cur = stackRef.current;
      if (s.depth < cur.length - 1) {
        const below = cur[s.depth];
        go([...cur.slice(0, s.depth), below && below.route.s === s.route.s ? below : { id: nextId.current++, route: s.route }], "pop");
      } else if (s.depth > cur.length - 1) {
        go([...cur, { id: nextId.current++, route: s.route }], "push");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [go]);

  // Hidden opportunities for the demo household, found live on the web.
  useEffect(() => {
    // Wait for the browser, where a remembered code can be read, so the scan runs once.
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
          if (!res.ok || !body?.opportunities) throw new Error(res.status === 401 ? "this demo needs its access code (open /home?code=…)" : (body?.error ?? `search failed (${res.status})`));
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

  const nav = useMemo<Nav>(
    () => ({
      push: (route) => {
        const cur = stackRef.current;
        window.history.pushState({ ukk: { depth: cur.length, route } } satisfies HistoryState, "", urlFor(route));
        go([...cur, entry(route)], "push");
      },
      back: () => {
        const cur = stackRef.current;
        if (cur.length > 1) {
          window.history.back();
          return;
        }
        // Opened straight on an inner screen: back goes to the screen it belongs to.
        const top = cur[0].route;
        const parent: Route = top.s === "opp" ? { s: "hidden" } : { s: "start" };
        window.history.replaceState({ ukk: { depth: 0, route: parent } } satisfies HistoryState, "", urlFor(parent));
        go([entry(parent)], "pop");
      },
      tab: (t: Tab) => {
        const cur = stackRef.current;
        const route: Route = { s: t };
        window.history.replaceState({ ukk: { depth: cur.length - 1, route } } satisfies HistoryState, "", urlFor(route));
        go([...cur.slice(0, -1), entry(route)], "tab");
      },
      askHref: (question) => {
        const q = new URLSearchParams();
        if (code) q.set("code", code);
        if (question) q.set("ask", question);
        const s = q.toString();
        return `/assistant${s ? `?${s}` : ""}`;
      },
    }),
    [go, code],
  );

  const found = EXAMPLES.length + live.rows.length;
  const all = [...EXAMPLES, ...live.rows];

  function screen(route: Route) {
    switch (route.s) {
      case "start":
        return <StartScreen found={found} />;
      case "connect":
        return <ConnectScreen />;
      case "household":
        return <HouseholdScreen found={found} />;
      case "hidden":
        return <HiddenScreen live={live} />;
      case "opp":
        return <DetailScreen row={all.find((r) => r.id === route.id)} />;
      case "tasks":
        return <TasksScreen job={route.job} code={code} />;
      case "search":
        return <SearchScreen />;
      case "community":
        return <CommunityScreen code={code} />;
    }
  }

  const top = stack[stack.length - 1];
  const layers: { entry: Entry; cls: string }[] = leaving
    ? [
        { entry: leaving.entry, cls: `ukk-exit-${leaving.kind}` },
        { entry: top, cls: `ukk-enter-${leaving.kind}` },
      ]
    : [{ entry: top, cls: "" }];
  const [num, title, sub] = CAPTIONS[top.route.s];

  return (
    <NavContext.Provider value={nav}>
      <div className={`ukk ukk-stage ${fontClass}`} data-kind={kind}>
        <aside className="ukk-caption" aria-hidden>
          <div key={top.route.s} className="ukk-rise">
            <div className="text-[22px] font-semibold tracking-[.02em] text-[#c4572f]">{num}</div>
            <p className="m-0 mt-3.5 text-[clamp(32px,4vw,56px)] font-bold leading-[1.05] tracking-[-0.03em]">{title}</p>
            <p className="m-0 mt-5 text-[clamp(18px,1.8vw,24px)] leading-[1.4] text-[#7a6e66]">{sub}</p>
          </div>
        </aside>
        <div className="ukk-phone">
          {layers.map(({ entry: e, cls }) => (
            <div key={e.id} className={`ukk-layer ${cls}`} inert={leaving?.entry.id === e.id}>
              {screen(e.route)}
            </div>
          ))}
        </div>
      </div>
    </NavContext.Provider>
  );
}
