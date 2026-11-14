import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UkkChat } from "@/components/ukk-chat";

const title = "Talk to UKK";
const description =
  "UKK is Finland's FAQ for newcomers: tell him a life event or an official letter and get a plan with quotes from official pages.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: "UKK", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default async function UkkPage({ searchParams }: PageProps<"/ukk">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center gap-3">
        <Image src="/ukk-avatar.jpg" alt="" width={56} height={56} className="size-14 rounded-full" priority />
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold tracking-tight">UKK</h1>
          <p className="text-sm text-muted-foreground">Finland&apos;s FAQ for newcomers</p>
        </div>
      </header>
      <UkkChat code={code} />
      <footer className="mt-auto flex flex-col gap-2 text-xs text-muted-foreground">
        <p>Research with sources, not legal advice.</p>
        <p>UKK is a made-up character, not an official service.</p>
        <p>
          Prefer Telegram?{" "}
          <a href="https://t.me/junction_kaveri_bot" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Add UKK to your group
          </a>
          . Or{" "}
          <Link href={code ? `/try?code=${encodeURIComponent(code)}` : "/try"} className="underline underline-offset-2">
            run one research case
          </Link>{" "}
          without the chat.
        </p>
      </footer>
    </main>
  );
}
