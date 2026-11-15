/**
 * Read an OpenAI-compatible chat-completions stream (server-sent events) and hand each piece of
 * reply text to `onText`. Resolves at `data: [DONE]` with the number of characters received, so a
 * caller can show an empty reply as an error. Rejects on an error event, or if the stream closes
 * before `[DONE]`, so a failure shows as an error instead of a spinner or a reply that stops.
 */
export async function readCompletionStream(
  body: ReadableStream<Uint8Array>,
  onText: (delta: string) => void,
): Promise<number> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) throw new Error("stream ended early");
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue; // blank lines, comments, event names
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        await reader.cancel().catch(() => {});
        return received;
      }
      let event: { error?: unknown; choices?: { delta?: { content?: unknown } }[] } | null = null;
      try {
        event = JSON.parse(data);
      } catch {
        continue; // a line that is not JSON carries no reply text
      }
      if (event?.error) {
        await reader.cancel().catch(() => {});
        throw new Error("AIDaddy could not answer");
      }
      const content = event?.choices?.[0]?.delta?.content;
      if (typeof content === "string" && content) {
        received += content.length;
        onText(content);
      }
    }
  }
}
