import type { Metadata, Viewport } from "next";
import { CASE_URL, TalkDemo } from "@/components/talk-demo/talk-demo";
import "@/components/talk-demo/talk-demo.css";

export const metadata: Metadata = {
  title: "UKK in the background: demo replay",
  description: "A scripted replay of UKK solving a problem while two people keep talking. Concept; the research is a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#2b2118" };

/** Issue #35: a replay for the demo video. Add ?loop=1 to repeat it. */
export default async function TalkDemoPage({ searchParams }: PageProps<"/demo/talk">) {
  const params = await searchParams;
  return (
    <main className="tdemo-stage">
      <p className="tdemo-scene">Kitchen table · Aino and Mikko talking · the phone lies between them</p>
      <TalkDemo loop={params.loop === "1"} />
      <p className="tdemo-caption">
        Concept demo: UKK cannot listen on the phone yet. The research and its quotes are a <a href={CASE_URL}>real run</a>{" "}
        on kkv.fi, the Finnish consumer authority.
      </p>
    </main>
  );
}
