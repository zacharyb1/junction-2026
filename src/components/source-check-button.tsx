"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Props = { id: string; label: string; busyLabel: string; recentLabel: string; failedLabel: string };

/** Asks the server to open every cited page of the case again, then reloads the page with the result. */
export function SourceCheckButton({ id, label, busyLabel, recentLabel, failedLabel }: Props) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [reloading, startReload] = useTransition();
  const [note, setNote] = useState("");
  const busy = asking || reloading;

  async function check() {
    setAsking(true);
    setNote("");
    try {
      const res = await fetch(`/api/cases/${id}/check`, { method: "POST" });
      if (!res.ok) throw new Error(`check failed (${res.status})`);
      const body = (await res.json()) as { fresh?: boolean };
      // The server reads a case at most once in 10 minutes. Without a new reading, say why nothing moved.
      if (!body.fresh) setNote(recentLabel);
      startReload(() => router.refresh());
    } catch {
      setNote(failedLabel);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button variant="outline" size="lg" onClick={check} disabled={busy}>
        <RefreshCw className={busy ? "animate-spin motion-reduce:animate-none" : undefined} />
        {busy ? busyLabel : label}
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {note}
      </p>
    </div>
  );
}
