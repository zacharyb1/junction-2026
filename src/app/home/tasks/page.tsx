import type { Metadata } from "next";
import { TasksScreen } from "@/components/home/tasks";

export const metadata: Metadata = { title: "Get it done" };

/** 5 · AI agents call for quotes. ?job=... starts with another job. */
export default async function TasksPage({ searchParams }: PageProps<"/home/tasks">) {
  const { job } = await searchParams;
  return <TasksScreen job={typeof job === "string" ? job.slice(0, 300) : undefined} />;
}
