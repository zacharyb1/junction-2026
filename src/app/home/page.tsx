import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { Route } from "@/components/home/ui";
import { UkkApp } from "@/components/home/ukk-app";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-inter" });

const title = "UKK for your family";
const description = "Help for your family, right now: hidden opportunities, companies called for quotes, and parents like you. Nothing is sent or paid without your yes.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#fbf8f3", viewportFit: "cover" };

const SCREENS = new Set(["start", "connect", "household", "hidden", "opp", "tasks", "search", "community"]);

function routeFrom(params: Record<string, string | string[] | undefined>): Route {
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string).trim() : "");
  const s = one("s");
  if (!SCREENS.has(s)) return { s: "start" };
  if (s === "opp") return one("id") ? { s: "opp", id: one("id") } : { s: "hidden" };
  if (s === "tasks") return one("job") ? { s: "tasks", job: one("job").slice(0, 300) } : { s: "tasks" };
  return { s } as Route;
}

/**
 * UKK's own phone app, in the family look of the Claude Design prototype: start, Get it done, the household map,
 * hidden opportunities, and parents like you. Like /assistant (whose chat is the Ask tab), it has its own full-screen
 * frame instead of the site's header and footer. ?s=<screen> opens a screen directly, for a demo or a reload.
 */
export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.trim() : "";
  return <UkkApp initial={routeFrom(params)} code={code} fontClass={inter.variable} />;
}
