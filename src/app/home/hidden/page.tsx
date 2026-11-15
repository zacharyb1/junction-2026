import type { Metadata } from "next";
import { HiddenScreen } from "@/components/home/hidden";

export const metadata: Metadata = { title: "Hidden opportunities" };

/** 4 · Hidden opportunities. */
export default function HiddenPage() {
  return <HiddenScreen />;
}
