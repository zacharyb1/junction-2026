import type { Metadata, Viewport } from "next";
import { ChatDemo } from "@/components/chat-demo/chat-demo";
import { DemoFrame, demoMode } from "@/components/demo/demo-frame";
import "@/components/chat-demo/chat-demo.css";

export const metadata: Metadata = {
  title: "UKK in a family chat: demo replay",
  description: "A scripted replay of UKK in a family group chat. The plan and its sources come from a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** Issue #33: a replay for the demo video and the screen at the table. ?loop=1 repeats it; ?bare=1 shows it without the site around it. */
export default async function ChatDemoPage({ searchParams }: PageProps<"/demo/chat">) {
  const { loop, bare } = demoMode(await searchParams);
  return (
    <DemoFrame
      scene="chat"
      shape="phone"
      bare={bare}
      caption={<>Demo replay with a fictional family. The plan, its sources and the case link come from a real run.</>}
    >
      <ChatDemo loop={loop} />
    </DemoFrame>
  );
}
