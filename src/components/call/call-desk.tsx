"use client";

import { Check, CircleAlert, CircleHelp, Loader2, Phone, PhoneCall, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** One call as GET /api/calls/<id> returns it (src/lib/demo-calls.ts). */
type Call = {
  id: string;
  status: "proposed" | "starting" | "ringing" | "in_progress" | "finished" | "failed" | "unknown";
  line: "phone" | "browser";
  task: string;
  preferences: string;
  recipient: string;
  summary?: string;
  outcome?: "success" | "failure" | "unknown";
  note?: string;
  phoneEnding?: string;
  answerUrl?: string;
  transcript?: { speaker: "aidaddy" | "recipient"; text: string }[];
  notice: string;
};

const EXAMPLES = [
  {
    label: "Move a collection",
    task: "Call the building office and ask whether the bulky-waste collection for flat B12 can be moved to Saturday.",
    preferences: "Before 11 in the morning.",
  },
  {
    label: "Book a viewing",
    task: "Call the housing office and ask for a viewing of the two-room flat on Hämeenkatu next week.",
    preferences: "On a weekday after 16:00. Two adults will come.",
  },
  {
    label: "Change an appointment",
    task: "Call the dental clinic and move Thursday's check-up for our daughter to another day.",
    preferences: "Not during school hours. The same dentist if possible.",
  },
  {
    label: "Pass on an update",
    task: "Call and say that our written reply to the rent increase is ready, and that we will hand it in on Friday.",
    preferences: "",
  },
];

const ACTIVE = new Set<Call["status"]>(["starting", "ringing", "in_progress"]);
// 44 px tall, so a thumb hits it, and 16 px text on a phone, so iOS does not zoom into the field.
const tall = "h-11 px-3";
const panel = "flex flex-col gap-4 rounded-lg border bg-card p-5";

/** The address where the call rings, as a QR code: the answering device is usually a phone. */
function AnswerCode({ url }: { url: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let current = true;
    QRCode.toString(url, { type: "svg", margin: 1 }).then(
      (drawn) => current && setSvg(drawn),
      () => {}, // the link beside the code still works
    );
    return () => {
      current = false;
    };
  }, [url]);
  if (!svg) return null;
  return (
    // A QR code has to stay dark on white to scan, so this tile does not follow the page's colours.
    <div
      role="img"
      aria-label="QR code that opens the page where the call rings"
      className="size-36 shrink-0 rounded-md bg-white p-1 [&_svg]:size-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function Outcome({ call }: { call: Call }) {
  const [Icon, label] =
    call.status !== "finished"
      ? ([X, call.status === "unknown" ? "Result unknown" : "The call did not happen"] as const)
      : call.outcome === "success"
        ? ([Check, "Call completed"] as const)
        : call.outcome === "failure"
          ? ([X, "Not arranged"] as const)
          : ([CircleHelp, "Result unclear"] as const);
  return (
    <p className="flex items-center gap-2 font-mono text-xs tracking-widest text-primary uppercase">
      <Icon className="size-4" aria-hidden />
      {label}
    </p>
  );
}

export function CallDesk({ code: initialCode, needsCode }: { code: string; needsCode: boolean }) {
  const [task, setTask] = useState("");
  const [preferences, setPreferences] = useState("");
  const [code, setCode] = useState(initialCode);
  const [call, setCall] = useState<Call | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A code from the link that the server refused: show the field so it can be corrected.
  const [rejected, setRejected] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const id = call?.id;
  const active = call ? ACTIVE.has(call.status) : false;
  useEffect(() => {
    if (!id || !active) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${id}`, { cache: "no-store" });
        if (res.ok) setCall((await res.json()) as Call);
      } catch {
        // A missed poll is not news: the next one asks again.
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [id, active]);

  async function send(path: string, body: unknown): Promise<Call | null> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", "x-demo-code": code.trim() },
        body: JSON.stringify(body),
      });
      // Besides a call, the server can answer with a state that is not one: unavailable, busy, already_started.
      const result = (await res.json().catch(() => null)) as (Partial<Omit<Call, "status">> & { status?: string; error?: string }) | null;
      if (res.status === 401) {
        setRejected(true);
        throw new Error("That access code is not valid. Enter the code from the QR code at our table, or ask us for it.");
      }
      if (!res.ok || !result) throw new Error(result?.error ?? `Request failed (${res.status})`);
      setRejected(false);
      if (result.status === "already_started" && result.id) {
        // A second press of the button: the call is already on its way, so show it instead of an error.
        const again = await fetch(`/api/calls/${result.id}`, { cache: "no-store" });
        if (again.ok) return (await again.json()) as Call;
      }
      if (!result.id || !result.task) {
        // An answer that is not a call: the line is busy, switched off, or the proposal no longer fits.
        throw new Error(result.note ?? (result.status === "unavailable" ? "Calls are switched off on this server." : "AIDaddy could not prepare this call."));
      }
      return result as Call;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function prepare(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const prepared = await send("/api/calls", { task, preferences });
    if (prepared) {
      setCall(prepared);
      top.current?.scrollIntoView({ block: "start" });
    }
  }

  async function start() {
    if (busy || !call) return;
    const started = await send(`/api/calls/${call.id}/start`, { confirmed: true });
    if (started) setCall(started);
  }

  const fail = error && (
    <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {error}
    </p>
  );
  const where = call?.line === "phone" ? `the test phone ending ${call.phoneEnding}` : "the test line, which rings in a browser";

  return (
    <div ref={top} className="flex scroll-mt-6 flex-col gap-6 wrap-anywhere">
      {!call && (
        <form onSubmit={prepare} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="call-task" className="text-sm font-medium">
              What should AIDaddy call about?
            </label>
            <Textarea
              id="call-task"
              required
              minLength={3}
              maxLength={1200}
              rows={3}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Say it the way you would ask a friend to make the call for you."
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => {
                    setTask(example.task);
                    setPreferences(example.preferences);
                  }}
                  className="min-h-11 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground motion-reduce:transition-none sm:min-h-9 sm:text-xs"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="call-preferences" className="text-sm font-medium">
              Anything it should keep to? <span className="font-normal text-muted-foreground">Optional</span>
            </label>
            <Input
              id="call-preferences"
              className={tall}
              maxLength={800}
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Before 11 in the morning. Not at the weekend."
            />
          </div>
          {needsCode && (!initialCode || rejected) && (
            <div className="flex flex-col gap-2">
              <label htmlFor="call-code" className="text-sm font-medium">
                Access code
              </label>
              <Input id="call-code" required className={tall} value={code} onChange={(e) => setCode(e.target.value)} placeholder="From the QR code at our table" />
            </div>
          )}
          {fail}
          <Button type="submit" size="lg" disabled={busy} className="h-11 self-start px-4">
            {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Phone aria-hidden />}
            Prepare the call
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">Nothing rings yet. You read what AIDaddy will say first.</p>
        </form>
      )}

      {call?.status === "proposed" && (
        <section aria-labelledby="call-proposal" className={panel}>
          <p className="site-eyebrow">Waiting for your approval</p>
          <h2 id="call-proposal" className="text-xl font-semibold tracking-tight">
            AIDaddy will call {call.recipient}
          </h2>
          <dl className="flex flex-col gap-3 text-sm leading-relaxed">
            <div>
              <dt className="text-muted-foreground">It will ask</dt>
              <dd>{call.task}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">It will keep to</dt>
              <dd>{call.preferences || "Nothing extra. It will only use what is written above."}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">It will ring</dt>
              <dd className="first-letter:uppercase">{where}.</dd>
            </div>
          </dl>
          <p className="text-sm leading-relaxed text-muted-foreground">{call.notice}</p>
          {fail}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={busy} onClick={start} className="h-11 px-4">
              {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <PhoneCall aria-hidden />}
              Call with these details
            </Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => setCall(null)} className="h-11 px-4">
              Change something
            </Button>
          </div>
        </section>
      )}

      {call && active && (
        <section aria-labelledby="call-live" className={panel}>
          <p className="site-eyebrow">You approved this call</p>
          <h2 id="call-live" aria-live="polite" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
            <Loader2 className="size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
            {call.status === "in_progress" ? "AIDaddy is on the call" : call.status === "ringing" ? "The line is ringing" : "AIDaddy is dialing"}
          </h2>
          {call.status === "ringing" && call.answerUrl ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <AnswerCode url={call.answerUrl} />
              <div className="flex flex-col gap-3 text-sm leading-relaxed">
                <p>
                  Play the person being called: scan the code with a phone, or open the line on this device. Whoever taps
                  Answer talks to AIDaddy.
                </p>
                <a
                  href={call.answerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center self-start text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Answer on this device
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="text-muted-foreground">It rings for ten minutes. This page shows the result when the call ends.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {call.status === "in_progress"
                ? "A call lasts up to two minutes. What was agreed appears here when it ends."
                : `Ringing ${where}.`}
            </p>
          )}
          <p className="text-sm leading-relaxed">
            <span className="text-muted-foreground">It is asking: </span>
            {call.task}
          </p>
        </section>
      )}

      {call && !active && call.status !== "proposed" && (
        <section aria-labelledby="call-result" aria-live="polite" className={panel}>
          <Outcome call={call} />
          <h2 id="call-result" className="text-xl font-semibold tracking-tight">
            {call.status === "finished" ? "What happened on the call" : "AIDaddy has no result to report"}
          </h2>
          {call.summary && <p className="leading-relaxed">{call.summary}</p>}
          {call.note && <p className="text-sm leading-relaxed text-muted-foreground">{call.note}</p>}
          {call.transcript && (
            <details className="rounded-md border p-3 text-sm">
              <summary className="min-h-11 content-center cursor-pointer font-medium">What was said</summary>
              <ol className="mt-2 flex flex-col gap-2 leading-relaxed">
                {call.transcript.map((turn, index) => (
                  <li key={index}>
                    <span className="text-muted-foreground">{turn.speaker === "aidaddy" ? "AIDaddy" : "On the line"}: </span>
                    {turn.text}
                  </li>
                ))}
              </ol>
            </details>
          )}
          <p className="text-sm leading-relaxed">
            <span className="text-muted-foreground">You asked: </span>
            {call.task}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{call.notice}</p>
          <Button size="lg" variant="outline" onClick={() => setCall(null)} className="h-11 self-start px-4">
            Prepare another call
          </Button>
        </section>
      )}
    </div>
  );
}
