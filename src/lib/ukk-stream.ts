/**
 * Read an OpenAI-compatible chat-completions stream (server-sent events) and hand each piece of
 * reply text to `onText`. Resolves at `data: [DONE]`; rejects if the stream closes before it,
 * so a dropped connection shows as an error instead of a reply that silently stops.
 */
export async function readCompletionStream(
  body: ReadableStream<Uint8Array>,
  onText: (delta: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
        return;
      }
      try {
        const content = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) onText(content);
      } catch {
        // A line that is not JSON carries no reply text.
      }
    }
  }
}
