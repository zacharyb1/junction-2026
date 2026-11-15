import type { Metadata } from "next";
import { DeskFeed } from "@/components/desk/feed";

export const metadata: Metadata = { title: "Hidden opportunities" };

/** The family's hidden opportunities as a feed. */
export default function DeskFeedPage() {
  return <DeskFeed />;
}
