import { z } from "zod";
import { mayResearch, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";
import { chatUrl, cookieValue, readSession, SESSION_COOKIE, signSession, ukkConfigured } from "@/lib/ukk";

// A UKK turn can include a full research run (about 10 to 40 seconds).
export const maxDuration = 300;

const Input = z.object({ message: z.string().trim().min(1).max(1500) });

/**
 * Hermes reports this channel only as "api_server", so UKK cannot tell it is the web page. This line
 * tells him, so the web rules in hermes/SOUL.md and the skills apply: no reminders, no memory.
 */
const WEB_CONTEXT =
  "This conversation is on the UKK web page (/ukk), not Telegram. Every message is addressed to you. " +
  "You have no memory and no reminders here: ask for the city when you need it, never offer to set reminders, " +
  "and say reminders work when UKK is added to a Telegram group.";

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * Chat with UKK from the /ukk page. Forwards one message to the web-only Hermes instance
 * (OpenAI-compatible, streaming) and streams the reply back. The key stays on this server.
 * Each visitor's Hermes session lives in a signed, httpOnly cookie.
 */
export async function POST(req: Request) {
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  const parsed = Input.safeParse(await readJson(req, 10_000).catch(() => null));
  if (!parsed.success) return json({ error: "Write a message of up to 1,500 characters." }, 400);
  if (!allow(req, false)) return json({ error: "UKK is busy, try again in a minute." }, 429);
  if (!ukkConfigured()) return json({ error: "The chat runs on the team's server.", chatUrl: chatUrl() }, 503);

  const session = readSession(cookieValue(req.headers.get("cookie"), SESSION_COOKIE));
  const headers: Record<string, string> = {
    authorization: `Bearer ${process.env.UKK_API_KEY}`,
    "content-type": "application/json",
    accept: "text/event-stream",
  };
  if (session) headers["x-hermes-session-id"] = session;

  let upstream: Response;
  try {
    upstream = await fetch(`${process.env.UKK_API_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: "ukk", stream: true, messages: [
          { role: "system", content: WEB_CONTEXT },
          { role: "user", content: parsed.data.message },
        ] }),
      signal: AbortSignal.timeout(280_000),
    });
  } catch (error) {
    console.error("ukk backend unreachable", error);
    return json({ error: "UKK cannot be reached right now. Please try again in a minute." }, 502);
  }
  if (upstream.status === 429) return json({ error: "UKK is busy, try again in a minute." }, 429);
  if (!upstream.ok || !upstream.body) {
    console.error("ukk backend failed", upstream.status);
    return json({ error: "UKK cannot answer right now. Please try again in a minute." }, 502);
  }

  const out = new Headers({ "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" });
  const next = upstream.headers.get("x-hermes-session-id");
  if (next && next !== session && /^[A-Za-z0-9_-]{1,128}$/.test(next)) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    out.append(
      "set-cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(signSession(next))}; Path=/api/ukk; Max-Age=86400; HttpOnly; SameSite=Lax${secure}`,
    );
  }
  return new Response(upstream.body, { status: 200, headers: out });
}
