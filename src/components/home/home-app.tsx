"use client";

/**
 * The frame every /home page shares: a phone-width column (centred on a laptop), app-like transitions between the
 * pages (forward slides in from the right, back from the left, tabs fade), a toast for demo notes, and the live
 * hidden opportunities, which start loading for the demo household as soon as any /home page opens.
 *
 * Each screen is its own route; this shell lives in /home's layout, so it stays mounted while they change.
 */

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccessCode } from "@/components/site/access-code";
import type { LiveOpps } from "./hidden";
import { useLiveOpportunities } from "./live-opportunities";
import { EXAMPLES } from "./opportunities";
import { hrefFor, type Nav, NavContext, Toast } from "./ui";
import "./home.css";

type Kind = "push" | "pop" | "tab";

const LiveContext = createContext<{ live: LiveOpps; code: string }>({ live: { status: "loading", rows: [], error: "" }, code: "" });
export const useLive = () => useContext(LiveContext);
/** How many finds the family has: the worked examples plus the live ones. */
export const useFound = () => EXAMPLES.length + useContext(LiveContext).live.rows.length;

/** Where back goes when the page was opened directly, with nothing of the app behind it. */
function parentOf(path: string): string {
  if (path.startsWith("/home/hidden/")) return "/home/hidden";
  if (path === "/home/household") return "/home/connect";
  return "/home";
}

export function HomeShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // The demo's access code: from the address, or remembered by this tab from the page the QR opened.
  const code = useAccessCode();
  const live = useLiveOpportunities(code);
  const [kind, setKind] = useState<Kind>("tab");
  const [note, setNote] = useState("");
  const depth = useRef(0);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The browser's own back button slides the page back too.
  useEffect(() => {
    const onPop = () => {
      depth.current = Math.max(0, depth.current - 1);
      setKind("pop");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback(
    (href: string, how: Kind) => {
      setKind(how);
      setNote("");
      depth.current += 1;
      router.push(href);
    },
    [router],
  );

  const nav = useMemo<Nav>(
    () => ({
      push: (route) => go(hrefFor(route), "push"),
      tab: (t) => go(hrefFor({ s: t }), "tab"),
      back: () => {
        setKind("pop");
        setNote("");
        if (depth.current > 0) {
          depth.current -= 1;
          router.back();
        } else {
          router.push(parentOf(window.location.pathname));
        }
      },
      askHref: () => (code ? `/assistant?code=${encodeURIComponent(code)}` : "/assistant"),
      say: (text) => {
        setNote(text);
        if (hide.current) clearTimeout(hide.current);
        hide.current = setTimeout(() => setNote(""), 4500);
      },
    }),
    [go, router, code],
  );

  const value = useMemo(() => ({ live, code }), [live, code]);

  return (
    <NavContext.Provider value={nav}>
      <LiveContext.Provider value={value}>
        <div className="ukk ukk-stage">
          <div className="ukk-phone">
            <div key={pathname} className={`ukk-layer ukk-enter-${kind}`}>
              {children}
            </div>
            {note && <Toast>{note}</Toast>}
          </div>
        </div>
      </LiveContext.Provider>
    </NavContext.Provider>
  );
}
