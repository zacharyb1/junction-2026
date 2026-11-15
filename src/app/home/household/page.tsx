import type { Metadata } from "next";
import { HouseholdScreen } from "@/components/home/household";

export const metadata: Metadata = { title: "Your household" };

/** 3 · Your household: what AIDaddy learns from the family's apps (example facts). */
export default function HouseholdPage() {
  return <HouseholdScreen />;
}
