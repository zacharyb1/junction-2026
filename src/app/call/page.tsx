import type { Metadata } from "next";
import { CallDesk } from "@/components/call/call-desk";
import { SiteLink } from "@/components/site/site-link";
import { SiteShell } from "@/components/site/site-shell";
import { demoCodeRequired } from "@/lib/cases";
import { webCallsAvailable } from "@/lib/demo-calls";

const title = "Let AIDaddy make the call";
const description =
  "Say what a call is about. AIDaddy shows what it will say, calls only after you approve, and tells you what was agreed.";

export const metadata: Metadata = {
  // The name is already in the title, so the layout's " · AIDaddy" ending is left off.
  title: { absolute: title },
  description,
  openGraph: { title, description, siteName: "AIDaddy", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

// Whether calls are on is the server's setting at the time of the visit, not at build time.
export const dynamic = "force-dynamic";

export default async function CallPage({ searchParams }: PageProps<"/call">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code.trim() : "";
  const link = "text-foreground underline underline-offset-4 hover:text-primary";
  return (
    <SiteShell>
      {/* The same column and the same head as /try and the chat with AIDaddy. */}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-14">
        <header className="flex flex-col gap-3">
          <p className="site-eyebrow">AIDaddy calls for you</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Let AIDaddy make the call</h1>
          <p className="leading-relaxed text-muted-foreground">
            Say what the call is about. AIDaddy shows you what it will say, calls only after you approve, and tells you what
            was agreed.
          </p>
        </header>
        {webCallsAvailable() ? (
          <CallDesk code={code} needsCode={demoCodeRequired()} />
        ) : (
          <p className="rounded-lg border bg-card p-5 leading-relaxed">
            Calls are switched off on this server right now. When they are on, you write what the call is about, approve
            the exact wording, and AIDaddy speaks with whoever answers.
          </p>
        )}
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            This is a demo. The conversation is real, with a voice from ElevenLabs, but the call goes to our own test line,
            never to a real office or shop. Any booking, order or payment in it is role-play.
          </p>
          <p>
            Do not include anything you would not say to a stranger. For rules and deadlines, with quotes from official
            pages,{" "}
            <SiteLink href="/chat" className={link}>
              talk to AIDaddy
            </SiteLink>
            .
          </p>
        </div>
      </main>
    </SiteShell>
  );
}
