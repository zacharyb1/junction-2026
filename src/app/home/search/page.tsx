import type { Metadata } from "next";
import { SearchScreen } from "@/components/home/search";

export const metadata: Metadata = { title: "Shopping from your chats" };

/** 6 · Shopping from your chats. */
export default function SearchPage() {
  return <SearchScreen />;
}
