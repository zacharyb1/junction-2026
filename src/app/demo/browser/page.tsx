import type { Metadata, Viewport } from "next";
import { BrowserDemo, CASE_URL } from "@/components/browser-demo/browser-demo";
import { DemoFrame, demoMode } from "@/components/demo/demo-frame";
import "@/components/browser-demo/browser-demo.css";

export const metadata: Metadata = {
  title: "UKK in the browser: demo replay",
  description: "A scripted replay of UKK noticing someone stuck on a tax return. Illustrative form; the rules come from a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** Issue #34: a replay for the demo video. ?loop=1 repeats it; ?bare=1 shows it without the site around it. */
export default async function BrowserDemoPage({ searchParams }: PageProps<"/demo/browser">) {
  const { loop, bare } = demoMode(await searchParams);
  return (
    <DemoFrame
      scene="browser"
      shape="wide"
      bare={bare}
      caption={
        <>
          Concept demo. The form is illustrative, not a real tax service, and the call is a concept. The rules UKK quotes come
          from vero.fi in a <a href={CASE_URL}>real run</a>.
        </>
      }
    >
      <BrowserDemo loop={loop} />
    </DemoFrame>
  );
}
