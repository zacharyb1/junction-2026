import type { Metadata } from "next";
import { CommunityScreen } from "@/components/home/community";

export const metadata: Metadata = { title: "Ask parents like you" };

/** 7 · Ask parents like you. The podcast link opens YouTube at 7:01, outside the app. */
export default function CommunityPage() {
  return <CommunityScreen />;
}
