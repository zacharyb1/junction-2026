import type { Metadata } from "next";
import { ChatScreen } from "@/components/chat-screen";

const title = "Chat with AIDaddy";
const description = "Talk to AIDaddy, the family butler of AIDaddy: gifts, medicines, moves and official letters, with sources.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * The full-screen chat with AIDaddy in its own family look, so it works as an app on a phone as well as on a laptop.
 * It has no site header or footer and does not use the site's dark frame.
 */
export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.trim() : "";
  // ?q=... is a question sent from another screen, asked as soon as the chat opens.
  const first = typeof params.q === "string" ? params.q.trim().slice(0, 1500) : undefined;
  return <ChatScreen code={code} first={first} />;
}
