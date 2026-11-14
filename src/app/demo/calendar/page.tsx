import type { Metadata, Viewport } from "next";
import { CalendarDemo, CASE_URL } from "@/components/calendar-demo/calendar-demo";
import { DemoFrame, demoMode } from "@/components/demo/demo-frame";
import "@/components/calendar-demo/calendar-demo.css";

export const metadata: Metadata = {
  title: "UKK plans a birthday: demo replay",
  description: "A scripted replay of UKK planning a birthday from the calendar. The options come from a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#05080d" };

/** Issue #36: a replay for the demo video. ?loop=1 repeats it; ?bare=1 shows it without the site around it. */
export default async function CalendarDemoPage({ searchParams }: PageProps<"/demo/calendar">) {
  const { loop, bare } = demoMode(await searchParams);
  return (
    <DemoFrame
      scene="calendar"
      shape="wide"
      bare={bare}
      caption={
        <>
          Concept: UKK cannot read or write a calendar yet. Demo replay with a fictional family. The three options and their facts come from a <a href={CASE_URL}>real run</a> on
          the venues&apos; own pages; the booking dates are UKK&apos;s suggestions.
        </>
      }
    >
      <CalendarDemo loop={loop} />
    </DemoFrame>
  );
}
