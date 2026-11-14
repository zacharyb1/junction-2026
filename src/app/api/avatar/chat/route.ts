import { z } from "zod";
import { POST as localChat } from "@/app/api/ukk/route";
import { mayResearch, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 300;

const Input = z.object({ message: z.string().trim().min(1).max(1500) }).strict();
const json = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Isolated concept transport. Normally uses the existing local chat handler, including its
 * access and rate limits. Setting AVATAR_UPSTREAM explicitly opts this deployment into
 * relaying to that HTTPS origin's public /api/ukk endpoint. No remote default is built in.
 * The remote path is fixed and neither cookies, bearer tokens nor proxy headers cross it.
 */
export async function POST(req: Request) {
  const configured = process.env.AVATAR_UPSTREAM;
  if (!configured) return localChat(req);

  if (!mayResearch(req)) return json("The access code is not valid.", 401);
  const parsed = Input.safeParse(await readJson(req, 10_000).catch(() => null));
  if (!parsed.success) return json("Write a message of up to 1,500 characters.", 400);

  let origin: URL;
  try {
    origin = new URL(configured);
    if (origin.protocol !== "https:" || origin.username || origin.password ||
        origin.pathname !== "/" || origin.search || origin.hash) throw new Error("Invalid origin");
  } catch {
    return json("The avatar chat server is not configured correctly.", 503);
  }
  if (!allow(req, false)) return json("The assistant is busy. Try again in a minute.", 429);

  const signal = AbortSignal.any([req.signal, AbortSignal.timeout(280_000)]);
  let upstream: Response;
  try {
    upstream = await fetch(new URL("/api/ukk", origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
        "x-demo-code": req.headers.get("x-demo-code") ?? "",
      },
      body: JSON.stringify(parsed.data),
      redirect: "error",
      cache: "no-store",
      signal,
    });
  } catch {
    if (req.signal.aborted) return json("Request cancelled.", 499);
    return json("The chat server could not be reached. Try again.", signal.aborted ? 504 : 502);
  }

  if (!upstream.ok || !upstream.body || !upstream.headers.get("content-type")?.includes("text/event-stream")) {
    await upstream.body?.cancel().catch(() => {});
    if (upstream.status === 401) return json("The access code is not valid on the chat server.", 401);
    if (upstream.status === 429) return json("The assistant is busy. Try again in a minute.", 429);
    if (upstream.status === 503) return json("Live chat is not available on this server.", 503);
    return json("The chat server could not answer. Try again.", 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
