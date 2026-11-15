import type { Metadata } from "next";
import { DeskTasks } from "@/components/desk/tasks";

export const metadata: Metadata = { title: "Get it done" };

/** Real companies for a job and calls for quotes to the team's test phones. ?job=... starts with another job. */
export default async function DeskTasksPage({ searchParams }: PageProps<"/desk/tasks">) {
  const { job } = await searchParams;
  const asked = typeof job === "string" ? job.slice(0, 300) : undefined;
  // Keyed by the job, so another job starts with a fresh search and no calls from the last one.
  return <DeskTasks key={asked ?? ""} job={asked} />;
}
