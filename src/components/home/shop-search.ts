"use client";

/**
 * "Shopping from your chats", shared by the phone and desktop pages: what the family needs, noticed in its messages,
 * and the shop search behind it (/api/gifts), so a parent sees real products with the price each shop's page states.
 *
 * A need is sent where it can be answered: a product to the shop search (a gift with who it is for, what they like,
 * the budget and the date, so a product that would arrive late is marked), a household job to Get it done, and
 * anything else to the chat. The messages are the demo family's examples; every search is real.
 */

import { useRef, useState } from "react";
import type { GiftIdea, GiftInput, GiftResult } from "@/lib/engine/gifts";
import type { AppName } from "@/lib/home-demo";

export type Need = {
  label: string;
  /** Where the need was noticed, for the needs from the family's messages. */
  app?: AppName;
  from?: string;
  to: "shop" | "job" | "chat";
  /** The words sent to Get it done or the chat, and the search's heading. */
  ask: string;
  /** The shop search, when `to` is "shop". */
  shop?: GiftInput;
};

/** Eino turns 5 on 12 December, as the family calendar says (FACTS). */
const EINO_GIFT: GiftInput = {
  recipient: "Eino",
  clues: ["turns 5 on 12 December", "loves drawing", "goes to daycare in Helsinki"],
  occasion: "2026-12-12",
  budget: 40,
  country: "FI",
};

export const APPS: AppName[] = ["WhatsApp", "Telegram", "Gmail", "Calendar", "Wilma"];

export const QUICK: Need[] = [
  { label: "Gift for Eino", to: "shop", ask: "A birthday present for Eino", shop: EINO_GIFT },
  { label: "Boots for Aino", to: "shop", ask: "Winter boots for Aino", shop: { prompt: "Warm winter boots for a 9-month-old, size 20", country: "FI" } },
  { label: "Weekend with kids", to: "chat", ask: "What can we do with a 4-year-old and a baby in Helsinki this weekend?" },
  { label: "Dinner ideas", to: "chat", ask: "Quick family dinner ideas for tonight, with a 4-year-old and a baby" },
];

export const NEEDS: Need[] = [
  { app: "Calendar", label: "A gift for Eino's 5th birthday", from: "Eino turns 5 on 12 Dec", to: "shop", ask: "A birthday present for Eino", shop: EINO_GIFT },
  { app: "WhatsApp", label: "Winter boots for Aino", from: "“Her boots are too small again”", to: "shop", ask: "Winter boots for Aino", shop: { prompt: "Warm winter boots for a 9-month-old, size 20", country: "FI" } },
  { app: "Wilma", label: "Rain clothes for daycare", from: "“Please bring rain clothes on Friday”", to: "shop", ask: "Rain clothes for Eino", shop: { prompt: "Rain jacket and rain trousers for a 4-year-old, for daycare", country: "FI" } },
  { app: "Telegram", label: "A babysitter for Saturday", from: "“Can anyone watch the kids Sat evening?”", to: "job", ask: "Babysitter for Saturday evening in Kallio" },
  { app: "Gmail", label: "A cheaper electricity contract", from: "“Your fixed-price contract ends 31 Dec”", to: "chat", ask: "Our fixed-price electricity contract ends on 31 December. Which contract is cheapest for a family flat in Helsinki?" },
  { app: "Calendar", label: "Something for your jazz evening", from: "Thursday evening is free", to: "chat", ask: "Where is there jazz in Helsinki on Thursday evening?" },
];

/** When a product arrives, from its shop page, and whether that is too late for the occasion. */
export function arrival(idea: GiftIdea): { text: string; late: boolean } | null {
  if (idea.late) return { text: "Arrives after the birthday", late: true };
  if (!idea.arrivesBy) return null;
  const day = new Date(`${idea.arrivesBy}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { text: `Arrives by ${day}`, late: false };
}

export type ShopFound = { status: "idle" | "searching" | "ok" | "error"; heading: string; ideas: GiftIdea[]; error: string };

export function useShopSearch(code: string) {
  const [found, setFound] = useState<ShopFound>({ status: "idle", heading: "", ideas: [], error: "" });
  const latest = useRef(0);

  async function search(heading: string, input: GiftInput) {
    const run = ++latest.current;
    setFound({ status: "searching", heading, ideas: [], error: "" });
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code },
        body: JSON.stringify(input),
      });
      const body = (await res.json().catch(() => null)) as (GiftResult & { error?: string }) | null;
      if (!res.ok || !body?.ideas) throw new Error(res.status === 401 ? "this page needs the demo's access code" : (body?.error ?? `search failed (${res.status})`));
      // A slower, older search must not replace the newest one. Products that arrive in time come first.
      if (latest.current === run) setFound({ status: "ok", heading, ideas: [...body.ideas].sort((a, b) => Number(Boolean(a.late)) - Number(Boolean(b.late))), error: "" });
    } catch (e) {
      if (latest.current === run) setFound({ status: "error", heading, ideas: [], error: e instanceof Error ? e.message : "search failed" });
    }
  }

  /** A typed search is a plain product search. */
  const searchText = (text: string) => {
    const prompt = text.trim().slice(0, 300);
    if (prompt.length >= 3) void search(prompt, { prompt, country: "FI" });
  };

  return { found, search, searchText };
}
