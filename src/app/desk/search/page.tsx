import type { Metadata } from "next";
import { DeskSearch } from "@/components/desk/search";

export const metadata: Metadata = { title: "Shopping from your chats" };

/** Things the family needs, noticed in its messages. ?q=... searches shops for it straight away. */
export default async function DeskSearchPage({ searchParams }: PageProps<"/desk/search">) {
  const { q } = await searchParams;
  const asked = typeof q === "string" ? q.slice(0, 300) : undefined;
  return <DeskSearch key={asked ?? ""} first={asked} />;
}
