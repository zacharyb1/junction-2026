import type { Metadata } from "next";
import { DeskChat } from "@/components/desk/chat";

export const metadata: Metadata = { title: "Chat" };

/** The chat with AIDaddy. ?q=... sends that first question. */
export default async function DeskChatPage({ searchParams }: PageProps<"/desk/chat">) {
  const { q } = await searchParams;
  return <DeskChat first={typeof q === "string" ? q.trim().slice(0, 1500) : undefined} />;
}
