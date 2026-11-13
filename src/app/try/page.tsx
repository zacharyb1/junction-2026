import type { Metadata } from "next";
import Link from "next/link";
import { TryForm } from "@/components/try-form";

export const metadata: Metadata = {
  title: "Try Kaveri in the browser",
  description: "Describe a life event, pick your country, and watch the butler research it on official sources with Exa.",
};

export default async function TryPage({ searchParams }: PageProps<"/try">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Kaveri
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Try it on your own life</h1>
        <p className="text-muted-foreground">
          Same engine the butler uses in the family chat. It searches the live web with Exa, official sites first, opens
          every page it cites, and keeps only what it can point at.
        </p>
      </header>
      <TryForm code={code} />
      <p className="text-xs text-muted-foreground">
        This is research, not legal advice. Do not paste anything you would not show a stranger: this demo stores the case
        under an unguessable link.
      </p>
    </main>
  );
}
