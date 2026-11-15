"use client";

/**
 * The desktop start page: one big box to say what is on your mind, and four everyday photos to start from, so a
 * parent at a laptop begins the way they would in a chat app. A household job goes to Get it done; anything else
 * opens the chat with UKK.
 */

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Icon } from "@/components/home/ui";
import { isJob } from "@/lib/home-demo";
import { useDesk } from "./desk-shell";

const STARTS: { href: string; photo: string; alt: string; label: string }[] = [
  { href: "/desk/feed", photo: "/assistant/family.jpg", alt: "Laura with Eino and Aino at home", label: "What is my family missing?" },
  { href: "/desk/tasks", photo: "/home/photos/tap.jpg", alt: "A dripping kitchen tap", label: "Tap is leaking…" },
  { href: "/desk/feed", photo: "/home/photos/papers.jpg", alt: "Forms and bills on the table", label: "Kela forms…" },
  { href: "/desk/feed", photo: "/home/photos/winter.jpg", alt: "Kids on a sled in the snow", label: "Winter boots…" },
];

export function DeskStart() {
  const router = useRouter();
  const { code } = useDesk();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  function send(e: FormEvent) {
    e.preventDefault();
    const job = text.trim();
    if (!job) return;
    if (isJob(job)) router.push(`/desk/tasks?job=${encodeURIComponent(job)}`);
    else setNote("UKK answers this in the chat. To see agents at work, try “Kitchen tap is leaking”.");
  }

  return (
    <div className="box-border flex min-h-dvh flex-col items-center justify-center gap-7 px-8 py-10">
      <h1 className="m-0 text-center text-4xl font-semibold tracking-[-0.02em]">Help for your family, right now</h1>
      <form onSubmit={send} className="box-border flex w-full max-w-[720px] flex-col gap-2.5 rounded-3xl border border-[#e4ddd3] bg-white py-3.5 pl-5 pr-3.5 shadow-[0_6px_24px_rgba(42,36,32,.06)]">
        <label htmlFor="ask" className="sr-only">
          Tell me what your family needs
        </label>
        <textarea
          id="ask"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Tell me what's on your mind. I find the money and help you're missing, and nothing is sent or paid without your yes."
          className="resize-none border-0 bg-transparent text-base leading-normal text-[#2a2420] outline-none"
        />
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#7a6e66]">Reads your family&apos;s apps</span>
          <button type="submit" aria-label="Send" className="ml-auto flex size-10 items-center justify-center rounded-full bg-[#c4572f] text-white">
            <Icon d="M12 19V5M6 11l6-6 6 6" size={18} width={2.2} />
          </button>
        </div>
      </form>
      {note && (
        <p role="status" className="m-0 flex max-w-[720px] flex-wrap items-center gap-2 text-sm text-[#5a4f47]">
          {note}
          <a href={code ? `/assistant?code=${encodeURIComponent(code)}` : "/assistant"} className="font-semibold">
            Open the chat
          </a>
        </p>
      )}
      <ul aria-label="Start from" className="m-0 grid w-full max-w-[720px] list-none grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-2.5 p-0">
        {STARTS.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex flex-col overflow-hidden rounded-[14px] border border-[#ece6dc] bg-white no-underline">
              <Image src={s.photo} alt={s.alt} width={240} height={100} className="h-[100px] w-full object-cover" />
              <span className="px-3 py-2.5 font-semibold">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
