import { answerDemoLine, getDemoLine } from "@/lib/demo-calls";
import { allow } from "@/lib/rate-limit";

const json = (body: { status: string }, status = 200) =>
  Response.json(body, { status: body.status === "not_found" ? 404 : status, headers: { "cache-control": "no-store" } });

/** Whether this line is still ringing. The answering page learns who is calling, never what the household asked. */
export async function GET(_req: Request, { params }: RouteContext<"/api/calls/line/[answerId]">) {
  return json(await getDemoLine((await params).answerId));
}

/**
 * Answer the call. The reply holds a one-time link to the agent; the page opens it with the visitor's microphone.
 * The address itself is the permission: it is unguessable and was handed out by the person who confirmed the call.
 */
export async function POST(req: Request, { params }: RouteContext<"/api/calls/line/[answerId]">) {
  if (!allow(req, false)) return Response.json({ status: "busy", error: "AIDaddy is busy, try again in a minute." }, { status: 429 });
  return json(await answerDemoLine((await params).answerId));
}
