import type { Metadata } from "next";
import { SearchScreen } from "@/components/home/search";

export const metadata: Metadata = { title: "Shopping from your chats" };

/** 6 · Shopping from your chats. ?q=... searches shops for it straight away (a feed card's "Find … in shops"). */
export default async function SearchPage({ searchParams }: PageProps<"/home/search">) {
  const { q } = await searchParams;
  const asked = typeof q === "string" ? q.slice(0, 300) : undefined;
  return <SearchScreen key={asked ?? ""} first={asked} />;
}
