"use client";

/** Small pieces shared by the /home screens: navigation, the tab bar, line icons and app logos. */

import { createContext, type CSSProperties, type ReactNode, useContext } from "react";
import { type AppName, logo } from "@/lib/home-demo";

export type Route =
  | { s: "start" }
  | { s: "connect" }
  | { s: "household" }
  | { s: "hidden" }
  | { s: "opp"; id: string }
  | { s: "tasks"; job?: string }
  | { s: "search" }
  | { s: "community" };

export type Tab = "hidden" | "tasks" | "search" | "community";

export type Nav = {
  push: (r: Route) => void;
  back: () => void;
  tab: (t: Tab) => void;
  /** Leaves the app for the full chat with UKK at /assistant, with a first question when there is one. */
  askHref: (question?: string) => string;
};

export const NavContext = createContext<Nav | null>(null);
export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error("useNav outside the /home app");
  return nav;
}

export const ICON = {
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z",
  people: "M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6",
  chat: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  coin: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v12",
  baby: "M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  external: "M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5",
  podcast: "M3 14v-2a9 9 0 0 1 18 0v2M3 14h3v6H4a1 1 0 0 1-1-1zM21 14h-3v6h2a1 1 0 0 0 1-1z",
  link: "M9 15l6-6M10.5 6.5l1.8-1.8a4 4 0 0 1 5.7 5.7l-1.8 1.8M13.5 17.5l-1.8 1.8a4 4 0 0 1-5.7-5.7l1.8-1.8",
  star: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
  chevron: "M9 6l6 6-6 6",
  back: "m15 18-6-6 6-6",
} as const;

export function Icon({ d, size = 20, stroke = "currentColor", width = 1.8, className }: { d: string; size?: number; stroke?: string; width?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

/** An app's logo. Decorative unless it carries a label. */
export function AppLogo({ app, size = 18, label, className, style }: { app: AppName; size?: number; label?: string; className?: string; style?: CSSProperties }) {
  return (
    // Small local SVG logos: next/image would add nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo(app)} alt={label ?? ""} title={label} width={size} height={size} className={className} style={{ width: size, height: size, objectFit: "contain", flex: "none", ...style }} />
  );
}

export function BackButton({ label }: { label: string }) {
  const nav = useNav();
  return (
    <button type="button" onClick={nav.back} aria-label={label} className="-ml-2.5 flex size-10 items-center justify-center">
      <Icon d={ICON.back} size={22} width={2} />
    </button>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <span aria-hidden className="ukk-spin box-border block shrink-0 rounded-full border-2 border-[#d9d1c4] border-t-[#c4572f]" style={{ width: size, height: size }} />;
}

/** A screen's scrolling middle. */
export function Main({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`ukk-scroll flex min-h-0 flex-1 flex-col px-6 ${className}`}>{children}</main>;
}

/** The title block at the top of a tab screen. */
export function TabHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <header className={`flex flex-none flex-col gap-3.5 px-6 pb-3 pt-[calc(var(--ukk-top)+16px)] ${className}`}>{children}</header>;
}

export const H1 = ({ children }: { children: ReactNode }) => <h1 className="m-0 text-[26px] font-bold leading-[1.15] tracking-[-0.02em]">{children}</h1>;

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "hidden", label: "Hidden", icon: ICON.sparkle },
  { tab: "tasks", label: "Get it done", icon: ICON.phone },
  { tab: "search", label: "Search", icon: ICON.search },
  { tab: "community", label: "Community", icon: ICON.people },
];

export function TabBar({ current }: { current: Tab }) {
  const nav = useNav();
  const item = "flex flex-col items-center gap-1 text-[10px] no-underline";
  return (
    <nav aria-label="Sections" className="grid flex-none grid-cols-5 border-t border-[#ece6dc] bg-[#fbf8f3] px-1.5 pb-[var(--ukk-bottom)] pt-2.5">
      {TABS.map((t) =>
        t.tab === current ? (
          <span key={t.tab} aria-current="page" className={`${item} font-semibold text-[#c4572f]`}>
            <Icon d={t.icon} size={22} width={2} />
            {t.label}
          </span>
        ) : (
          <button key={t.tab} type="button" onClick={() => nav.tab(t.tab)} className={`${item} text-[#8f8379]`}>
            <Icon d={t.icon} size={22} width={2} />
            {t.label}
          </button>
        ),
      )}
      <a href={nav.askHref()} className={`${item} text-[#8f8379]`}>
        <Icon d={ICON.chat} size={22} width={2} />
        Ask
      </a>
    </nav>
  );
}

/** A short note that slides up from the bottom, for what the demo would do next. */
export function Toast({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="ukk-toast absolute inset-x-3.5 bottom-[calc(var(--ukk-bottom)+16px)] z-10 flex items-center gap-3 rounded-2xl bg-[#2a2420] px-3.5 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,.25)]">
      <span aria-hidden className="flex size-8 flex-none items-center justify-center rounded-full bg-[#c4572f] text-[11px] font-bold">
        UKK
      </span>
      <span className="flex-1 text-[13px] leading-[1.35]">{children}</span>
    </div>
  );
}
