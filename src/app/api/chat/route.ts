import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { getModel } from "@/lib/ai";

export const maxDuration = 60;

/** Generic streaming chat endpoint. Replace the system prompt and add tools when the product is known. */
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: "You are a concise, helpful assistant.",
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
