import { isAuthorised } from "@/lib/cases";
import { getSwarmAudio } from "@/lib/swarm-calls";

export const maxDuration = 60;

/** The recording of one call in a recorded swarm, streamed from ElevenLabs. Needs the server secret. */
export async function GET(req: Request, ctx: RouteContext<"/api/swarm/[id]/audio/[recipientId]">) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const { id, recipientId } = await ctx.params;
  return (await getSwarmAudio(id, recipientId)) ?? Response.json({ error: "No recording for this call." }, { status: 404 });
}
