import type { Metadata, Viewport } from "next";
import { BrowserDemo, CASE_URL } from "@/components/browser-demo/browser-demo";
import "@/components/browser-demo/browser-demo.css";

export const metadata: Metadata = {
  title: "UKK in the browser: demo replay",
  description: "A scripted replay of UKK noticing someone stuck on a tax return. Illustrative form; the rules come from a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#14202c" };

/** Issue #34: a replay for the demo video. Add ?loop=1 to repeat it. */
export default async function BrowserDemoPage({ searchParams }: PageProps<"/demo/browser">) {
  const params = await searchParams;
  return (
    <main className="bdemo-stage">
      <BrowserDemo loop={params.loop === "1"} />
      <p className="bdemo-caption">
        Concept demo. The form is illustrative, not a real tax service, and the call is a concept. The rules UKK quotes come
        from vero.fi in a <a href={CASE_URL}>real run</a>.
      </p>
    </main>
  );
}
