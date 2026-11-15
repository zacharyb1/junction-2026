import type { Metadata } from "next";
import { ConnectScreen } from "@/components/home/connect";

export const metadata: Metadata = { title: "Connect family apps" };

/** 2 · Connect family apps (a demo: nothing is connected). */
export default function ConnectPage() {
  return <ConnectScreen />;
}
