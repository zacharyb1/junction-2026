import type { Metadata, Viewport } from "next";
import { DemoFrame, demoMode } from "@/components/demo/demo-frame";
import { CASE_URL, TalkDemo } from "@/components/talk-demo/talk-demo";
import "@/components/talk-demo/talk-demo.css";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: "AIDaddy in the background: demo replay" },
  description: "A scripted replay of AIDaddy solving a problem while two people keep talking. Listening itself works at /listen; the research is a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** Issue #35: a replay for the demo video. ?loop=1 repeats it; ?bare=1 shows it without the site around it. */
export default async function TalkDemoPage({ searchParams }: PageProps<"/demo/talk">) {
  const { loop, bare } = demoMode(await searchParams);
  return (
    <DemoFrame
      scene="talk"
      shape="phone"
      bare={bare}
      caption={
        <>
          Scripted replay. Listening itself works on the <a href="/listen">listening page</a>, left open on a device. The research
          and its quotes are a <a href={CASE_URL}>real run</a>{" "}
          on kkv.fi, the Finnish consumer authority.
        </>
      }
    >
      <p className="demo-scene">Kitchen table · Aino and Mikko talking · the phone lies between them</p>
      <TalkDemo loop={loop} />
    </DemoFrame>
  );
}
