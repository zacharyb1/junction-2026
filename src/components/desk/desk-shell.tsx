"use client";

/**
 * The frame every /desk page shares: UKK on a laptop, laid out like a chat app, so a parent at a desk gets the
 * sections in a sidebar and the work in a wide column. It loads the household's live finds once, for every page.
 *
 * Every section has its own desktop page; they share their data and logic with the /home phone pages.
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { LiveOpps } from "@/components/home/hidden";
import { useLiveOpportunities } from "@/components/home/live-opportunities";
import { EXAMPLES } from "@/components/home/opportunities";
import { Icon, ICON } from "@/components/home/ui";
import { useAccessCode } from "@/components/site/access-code";
import "@/components/home/home.css";

const DeskContext = createContext<{ live: LiveOpps; code: string }>({ live: { status: "loading", rows: [], error: "" }, code: "" });
export const useDesk = () => useContext(DeskContext);

type Item = { href: string; label: string; icon: string; badge?: (found: number) => ReactNode };

const SECTIONS: Item[] = [
  {
    href: "/desk/feed",
    label: "Hidden opportunities",
    icon: ICON.sparkle,
    badge: (found) => <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#c4572f] px-1.5 text-[11px] font-bold text-white">{found}</span>,
  },
  { href: "/desk/tasks", label: "Get it done", icon: ICON.phone },
  { href: "/desk/community", label: "Ask parents like you", icon: ICON.people },
  { href: "/desk/search", label: "Search", icon: ICON.search },
  { href: "/desk/household", label: "Household", icon: ICON.home },
  { href: "/desk/apps", label: "Connected apps", icon: ICON.link },
];

export function DeskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const code = useAccessCode();
  const live = useLiveOpportunities(code);
  const value = useMemo(() => ({ live, code }), [live, code]);
  const found = EXAMPLES.length + live.rows.length;
  const chat = code ? `/assistant?code=${encodeURIComponent(code)}` : "/assistant";
  const item = "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm no-underline";

  return (
    <DeskContext.Provider value={value}>
      <div className="ukk flex min-h-dvh flex-wrap bg-[#fbf8f3] text-sm">
        <nav aria-label="Sections" className="box-border flex max-w-full flex-[1_1_260px] flex-col gap-[18px] bg-[#f3eee7] px-3 py-4 lg:sticky lg:top-0 lg:h-dvh">
          <Link href="/desk" className="px-2 text-lg font-bold text-[#c4572f] no-underline">
            ukk
          </Link>
          <a href={chat} className={`${item} font-semibold`}>
            <Icon d="M12 5v14M5 12h14" size={18} width={2} />
            New chat
          </a>
          <div className="flex flex-col gap-0.5">
            {SECTIONS.map((s) => {
              const on = pathname === s.href;
              return (
                <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} className={`${item} ${on ? "bg-white font-semibold" : ""}`}>
                  <Icon d={s.icon} size={18} width={2} />
                  <span className="flex-1">{s.label}</span>
                  {s.badge?.(found)}
                </Link>
              );
            })}
          </div>
          <Link href="/desk/household" className="mt-auto flex items-center gap-2.5 rounded-xl px-2.5 py-2 no-underline">
            <Image src="/assistant/family.jpg" alt="" width={32} height={32} className="size-8 rounded-full object-cover" />
            <span className="flex flex-col">
              <span className="font-semibold">Laura</span>
              <span className="text-xs text-[#7a6e66]">with Eino and Aino</span>
            </span>
          </Link>
        </nav>
        <main className="box-border min-w-0 flex-[999_1_640px]">{children}</main>
      </div>
    </DeskContext.Provider>
  );
}
