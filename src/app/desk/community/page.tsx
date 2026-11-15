import type { Metadata } from "next";
import { DeskCommunity } from "@/components/desk/community";

export const metadata: Metadata = { title: "Ask parents like you" };

/** Where other parents talk about the family's question. */
export default function DeskCommunityPage() {
  return <DeskCommunity />;
}
