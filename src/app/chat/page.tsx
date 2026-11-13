"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Minimal streaming chat to prove the LLM wiring end-to-end. Replace or delete once the product exists. */
export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat();
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Chat smoke test</h1>
      <div className="flex flex-1 flex-col gap-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                : "self-start rounded-lg bg-muted px-3 py-2"
            }
          >
            {m.parts.map((part, i) =>
              part.type === "text" ? <span key={i}>{part.text}</span> : null,
            )}
          </div>
        ))}
        {error && (
          <p className="text-sm text-destructive">
            {error.message}. Set a provider key in .env.local or Vercel env.
          </p>
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || busy) return;
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          disabled={busy}
        />
        <Button type="submit" disabled={busy}>
          Send
        </Button>
      </form>
    </main>
  );
}
