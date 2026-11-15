import type { Metadata } from "next";
import { ChatScreen } from "@/components/chat-screen";

const title = "Chat with UKK";
const description = "Talk to UKK, the family butler of AIDaddy: gifts, medicines, moves and official letters, with sources.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/**
 * The full-screen chat with UKK in its own family look, so it works as an app on a phone as well as on a laptop.
 * It has no site header or footer and does not use the site's dark frame.
 */
export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.trim() : "";
  // A first question from the /home app's Ask tab or start box.
  const ask = typeof params.ask === "string" ? params.ask.trim().slice(0, 500) : "";
  return <ChatScreen code={code} ask={ask} />;
}
