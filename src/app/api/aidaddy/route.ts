import { z } from "zod";
import { aidaddyConfigured, chatUrl, cookieValue, readSession, SESSION_COOKIE, signSession } from "@/lib/aidaddy";
import { mayResearch, readJson } from "@/lib/cases";
import { detectEmergency, emergencyText, guessLanguage } from "@/lib/emergency";
import { allow } from "@/lib/rate-limit";

// An AIDaddy turn can include a full research run (about 10 to 40 seconds).
export const maxDuration = 300;

const Input = z.object({ message: z.string().trim().min(1).max(1500) });

/**
 * Hermes reports this channel only as "api_server", so AIDaddy cannot tell that it is on the web page. This line
 * tells it, so the web rules in hermes/SOUL.md and the skills apply: no reminders, no memory.
 */
const WEB_CONTEXT =
  "This conversation is on the AIDaddy web page (/chat), not Telegram. Every message is addressed to you. " +
  "You have no memory and no reminders here: ask for the city when you need it, never offer to set reminders, " +
  "and say reminders work when AIDaddy is added to a Telegram group. " +
  // Visitors here are anonymous and deep research costs several times more, so the web page asks for the fast mode.
  "Research in the fast mode here: call research_case with depth fast, also when a visitor asks for deep research.";

const json = (body: unknown, status: number) => Response.json(body, { status });

/** A fixed reply in the same stream format as Hermes, so the chat page shows it like any other answer. */
function fixedReply(text: string): Response {
  const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(chunk, { status: 200, headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}

/**
 * Chat with AIDaddy from the /chat page. Forwards one message to the web-only Hermes instance
 * (OpenAI-compatible, streaming) and streams the reply back. The key stays on this server.
 * Each visitor's Hermes session lives in a signed, httpOnly cookie.
 */
export async function POST(req: Request) {
  const parsed = Input.safeParse(await readJson(req, 10_000).catch(() => null));
  if (!parsed.success) return json({ error: "Write a message of up to 1,500 characters." }, 400);
  // An emergency gets the fixed "call 112" reply at once: no access code, no rate limit, no model, nothing to wait for.
  const emergency = detectEmergency(parsed.data.message);
  if (emergency) return fixedReply(emergencyText(emergency.kind, guessLanguage(parsed.data.message)));
  if (!mayResearch(req)) return json({ error: "unauthorised" }, 401);
  if (!allow(req, false)) return json({ error: "AIDaddy is busy, try again in a minute." }, 429);
  if (!aidaddyConfigured()) return json({ error: "The chat runs on the team's server.", chatUrl: chatUrl() }, 503);

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
      // The web-only Hermes instance was set up with the model name "ukk". Like the UKK_* variables, it predates the rename.
      body: JSON.stringify({ model: "ukk", stream: true, messages: [
          { role: "system", content: WEB_CONTEXT },
          { role: "user", content: parsed.data.message },
        ] }),
      signal: AbortSignal.timeout(280_000),
    });
  } catch (error) {
    console.error("AIDaddy backend unreachable", error);
    return json({ error: "AIDaddy cannot be reached right now. Please try again in a minute." }, 502);
  }
  if (upstream.status === 429) return json({ error: "AIDaddy is busy, try again in a minute." }, 429);
  if (!upstream.ok || !upstream.body) {
    console.error("AIDaddy backend failed", upstream.status);
    return json({ error: "AIDaddy cannot answer right now. Please try again in a minute." }, 502);
  }

  const out = new Headers({ "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" });
  const next = upstream.headers.get("x-hermes-session-id");
  if (next && next !== session && /^[A-Za-z0-9_-]{1,128}$/.test(next)) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    // The path is this route's own address: if the route moves and the path stays, the browser stops sending the cookie.
    out.append(
      "set-cookie",
      `${SESSION_COOKIE}=${encodeURIComponent(signSession(next))}; Path=/api/aidaddy; Max-Age=86400; HttpOnly; SameSite=Lax${secure}`,
    );
  }
  return new Response(upstream.body, { status: 200, headers: out });
}
