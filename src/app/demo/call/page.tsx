import type { Metadata, Viewport } from "next";
import { CallDemo } from "@/components/call-demo/call-demo";
import { DemoFrame, demoMode } from "@/components/demo/demo-frame";
import "@/components/call-demo/call-demo.css";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: "AIDaddy calls your boss: demo replay" },
  description:
    "A scripted replay of AIDaddy calling someone's boss in a copy of their voice. A concept: it asks for the number, waits for a yes, and says at once that an assistant is speaking.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#fbf8f3" };

/** A replay for the demo video. ?loop=1 repeats it; ?bare=1 shows it without the site around it. */
export default async function CallDemoPage({ searchParams }: PageProps<"/demo/call">) {
  const { loop, bare } = demoMode(await searchParams);
  return (
    <DemoFrame
      scene="call"
      shape="phone"
      bare={bare}
      caption={
        <>
          Concept demo. AIDaddy cannot copy a voice or ring a phone number yet, and this call is a script. In the concept it
          asks for the number, calls only after your yes, and says at once that an assistant is speaking with a copy of your
          voice.
        </>
      }
    >
      <p className="demo-scene">Mikko&apos;s phone · 07:40 · he is ill and asks AIDaddy to call his boss</p>
      <CallDemo loop={loop} />
    </DemoFrame>
  );
}
