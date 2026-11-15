import type { Metadata } from "next";
import { DetailScreen } from "@/components/home/detail";

const TITLES: Record<string, string> = {
  housing: "Housing allowance",
  boots: "Winter boots for Aino, 40% off",
  art: "Free art club after daycare",
};

export async function generateMetadata({ params }: PageProps<"/home/hidden/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: TITLES[id] ?? "A hidden opportunity" };
}

/** 4a–c · One opportunity: housing allowance, winter boots, art club, or a live find. */
export default async function OpportunityPage({ params }: PageProps<"/home/hidden/[id]">) {
  const { id } = await params;
  return <DetailScreen id={decodeURIComponent(id)} />;
}
