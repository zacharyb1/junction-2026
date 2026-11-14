import type { Metadata, Viewport } from "next";
import { ChatDemo } from "@/components/chat-demo/chat-demo";
import "@/components/chat-demo/chat-demo.css";

export const metadata: Metadata = {
  title: "UKK in a family chat: demo replay",
  description: "A scripted replay of UKK in a family group chat. The plan and its sources come from a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#517da2" };

/** Issue #33: a replay for the demo video and the screen at the table. Add ?loop=1 to repeat it. */
export default async function ChatDemoPage({ searchParams }: PageProps<"/demo/chat">) {
  const params = await searchParams;
  return (
    <main className="chatdemo-stage">
      <ChatDemo loop={params.loop === "1"} />
      <p className="chatdemo-caption">
        Demo replay with a fictional family. The plan, its sources and the case link come from a real run.
      </p>
    </main>
  );
}
