import type { Metadata, Viewport } from "next";
import { CalendarDemo, CASE_URL } from "@/components/calendar-demo/calendar-demo";
import "@/components/calendar-demo/calendar-demo.css";

export const metadata: Metadata = {
  title: "UKK plans a birthday: demo replay",
  description: "A scripted replay of UKK planning a birthday from the calendar. The options come from a real run.",
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#1a2230" };

/** Issue #36: a replay for the demo video. Add ?loop=1 to repeat it. */
export default async function CalendarDemoPage({ searchParams }: PageProps<"/demo/calendar">) {
  const params = await searchParams;
  return (
    <main className="cdemo-stage">
      <CalendarDemo loop={params.loop === "1"} />
      <p className="cdemo-caption">
        Demo replay with a fictional family. The three options and their facts come from a <a href={CASE_URL}>real run</a> on
        the venues&apos; own pages; the booking dates are UKK&apos;s suggestions.
      </p>
    </main>
  );
}
