import type { Metadata } from "next";
import { DeskHousehold } from "@/components/desk/household";

export const metadata: Metadata = { title: "Your household" };

/** What AIDaddy learned about each person in the family. */
export default function DeskHouseholdPage() {
  return <DeskHousehold />;
}
