import { CaseInput } from "@/lib/case";
import { baseUrl, isAuthorised, publishCase } from "@/lib/cases";

export const maxDuration = 60;

/** Publish a case. Same operation as the `case_publish` MCP tool, for scripts and curl. */
export async function POST(req: Request) {
  if (!isAuthorised(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const parsed = CaseInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid case", issues: parsed.error.issues }, { status: 400 });
  }
  return Response.json(await publishCase(parsed.data, baseUrl(req)), { status: 201 });
}
