import type { Metadata } from "next";
import { DeskSearch } from "@/components/desk/search";

export const metadata: Metadata = { title: "Shopping from your chats" };

/** Things the family needs, noticed in its messages. */
export default function DeskSearchPage() {
  return <DeskSearch />;
}
