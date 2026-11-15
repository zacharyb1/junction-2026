import { z } from "zod";
import { POST as localChat } from "@/app/api/aidaddy/route";
import { mayResearch, readJson } from "@/lib/cases";
import { allow } from "@/lib/rate-limit";

export const maxDuration = 300;

const Persona = z.object({
  name: z.string().trim().min(1).max(32).regex(/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '\u2019-]*$/u),
  role: z.enum(["everyday", "paperwork", "shopping"]),
  tone: z.enum(["calm", "direct", "warm"]),
}).strict();
const Input = z.object({ message: z.string().trim().min(1).max(1500), persona: Persona.optional() }).strict();
const json = (error: string, status: number) => Response.json({ error }, { status });
const AVATAR_COOKIE = "avatar_session";
const REMOTE_COOKIE = "aidaddy_session";
const LOCAL_COOKIE = "aidaddy_session";
// Shape only: the chat server remains the authority that verifies this signature.
const SESSION_VALUE = /^[A-Za-z0-9_-]{1,128}\.[A-Za-z0-9_-]{43}$/;

function sessionValue(raw: string): string | null {
  if (raw.length > 200) return null;
  try {
    const value = decodeURIComponent(raw);
    return SESSION_VALUE.test(value) ? value : null;
  } catch { return null; }
}

function avatarSession(req: Request): string | null {
  const values = (req.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim()).filter((part) => part.startsWith(`${AVATAR_COOKIE}=`));
  return values.length === 1 ? sessionValue(values[0].slice(AVATAR_COOKIE.length + 1)) : null;
}

function cookie(req: Request, value: string, age = 86400): string {
  const url = new URL(req.url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const secure = url.protocol === "https:" || (process.env.NODE_ENV === "production" && !loopback);
  return `${AVATAR_COOKIE}=${encodeURIComponent(value)}; Path=/api/avatar/chat; Max-Age=${age}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function keepSession(upstream: Response, out: Headers, req: Request, expectedName: string) {
  for (const header of upstream.headers.getSetCookie()) {
    const pair = header.split(";", 1)[0].trim();
    if (!pair.startsWith(`${expectedName}=`)) continue;
    const value = sessionValue(pair.slice(expectedName.length + 1));
    if (value) out.set("set-cookie", cookie(req, value));
  }
}

function withPersona(message: string, persona: z.infer<typeof Persona>): string {
  const focus = { everyday: "help with everyday questions", paperwork: "explain official letters and next steps", shopping: "help compare suitable products" };
  const style = { calm: "calm and clear", direct: "brief and direct", warm: "warm and reassuring" };
  return `Your display name is ${JSON.stringify(persona.name)} (not the user's name). Focus: ${focus[persona.role]}. Tone: ${style[persona.tone]}. You remain an AI assistant with no professional credentials. Preserve source checks and tool limits.\n\n${message}`;
}

/**
 * Isolated concept transport. Normally uses the existing local chat handler, including its
 * access and rate limits. Setting AVATAR_UPSTREAM explicitly opts this deployment into
 * relaying to that HTTPS origin's public /api/aidaddy endpoint. No remote default is built in.
 * The remote path is fixed. Only the avatar's signed chat-session token crosses it;
 * unrelated cookies, bearer tokens and proxy headers never reach the remote server.
 */
export async function POST(req: Request) {
  const configured = process.env.AVATAR_UPSTREAM;
  if (!mayResearch(req)) return json("The access code is not valid.", 401);
  const parsed = Input.safeParse(await readJson(req, 10_000).catch(() => null));
  if (!parsed.success) return json("Check the companion settings and write a message of up to 1,500 characters.", 400);
  if (parsed.data.persona && parsed.data.message.length > 1200) return json("With companion settings, write a message of up to 1,200 characters.", 400);
  const message = parsed.data.persona ? withPersona(parsed.data.message, parsed.data.persona) : parsed.data.message;
  if (message.length > 1500) return json("That message is too long. Please shorten it.", 400);
  const session = avatarSession(req);

  if (!configured) {
    // Keep this concept's conversation separate from a visitor's normal /chat conversation.
    const headers = new Headers(req.headers);
    headers.delete("cookie");
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    if (session) headers.set("cookie", `${LOCAL_COOKIE}=${session}`);
    const response = await localChat(new Request(req.url, { method: "POST", headers, body: JSON.stringify({ message }), signal: req.signal }));
    const out = new Headers(response.headers);
    out.delete("set-cookie");
    keepSession(response, out, req, LOCAL_COOKIE);
    return new Response(response.body, { status: response.status, headers: out });
  }

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
    upstream = await fetch(new URL("/api/aidaddy", origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "text/event-stream",
        "x-demo-code": req.headers.get("x-demo-code") ?? "",
        ...(session ? { cookie: `${REMOTE_COOKIE}=${session}` } : {}),
      },
      body: JSON.stringify({ message }),
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
    if (upstream.status === 404) return json("Live chat is unavailable at this address. You can still watch the recorded example.", 502);
    return json("The chat server could not answer. Try again.", 502);
  }

  const out = new Headers({ "content-type": "text/event-stream", "cache-control": "no-store", "x-accel-buffering": "no" });
  keepSession(upstream, out, req, REMOTE_COOKIE);
  return new Response(upstream.body, { status: 200, headers: out });
}

/** Forget this browser's conversation token without touching the shared chat service. */
export async function DELETE(req: Request) {
  if (!mayResearch(req)) return json("The access code is not valid.", 401);
  return new Response(null, { status: 204, headers: { "set-cookie": cookie(req, "", 0), "cache-control": "no-store" } });
}
