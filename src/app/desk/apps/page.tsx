import type { Metadata } from "next";
import { DeskApps } from "@/components/desk/apps";

export const metadata: Metadata = { title: "Connected apps" };

/** The family apps AIDaddy would read. */
export default function DeskAppsPage() {
  return <DeskApps />;
}
