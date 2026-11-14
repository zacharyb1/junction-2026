import type { Metadata } from "next";
import { ChatScreen } from "@/components/chat-screen";
import { SiteShell } from "@/components/site/site-shell";

const title = "Chat with UKK";
const description = "Talk to UKK, the butler of AIDaddy: life in Finland, official letters, and finding anything to buy, with sources.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

/** The full-screen chat with UKK, laid out like a chat app, so it works as an app on a phone as well as on a laptop. */
export default async function AssistantPage({ searchParams }: PageProps<"/assistant">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.trim() : "";
  // bare: no site header or footer, the chat fills the screen.
  return (
    <SiteShell bare>
      <ChatScreen code={code} />
    </SiteShell>
  );
}
