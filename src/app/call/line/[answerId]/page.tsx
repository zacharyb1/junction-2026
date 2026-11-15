import type { Metadata } from "next";
import { CallLine } from "@/components/call/call-line";
import { SiteShell } from "@/components/site/site-shell";
import { Wordmark } from "@/components/site/wordmark";

export const metadata: Metadata = {
  title: { absolute: "AIDaddy is calling" },
  description: "Answer a demonstration call from AIDaddy in your browser.",
  // One call's own address: nothing for a search engine, and no preview that would give the link away.
  robots: { index: false, follow: false },
};

export default async function CallLinePage({ params }: PageProps<"/call/line/[answerId]">) {
  const { answerId } = await params;
  return (
    // A phone screen, not a site page: the header and footer stay out, the name stays in.
    <SiteShell bare>
      <main className="mx-auto flex min-h-dvh w-full flex-col items-center gap-10 px-4 py-10">
        <p className="text-lg">
          <Wordmark />
        </p>
        <div className="flex w-full flex-1 flex-col items-center justify-center pb-16">
          <CallLine answerId={answerId} />
        </div>
      </main>
    </SiteShell>
  );
}
