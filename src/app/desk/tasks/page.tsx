import type { Metadata } from "next";
import { DeskTasks } from "@/components/desk/tasks";

export const metadata: Metadata = { title: "Get it done" };

/** AI agents call for quotes. ?job=... starts with another job. */
export default async function DeskTasksPage({ searchParams }: PageProps<"/desk/tasks">) {
  const { job } = await searchParams;
  return <DeskTasks job={typeof job === "string" ? job.slice(0, 300) : undefined} />;
}
