import { Fragment, type ReactNode } from "react";
import type { ConversationTurn } from "./use-avatar-conversation";

/** Small, text-only Markdown rendering: raw HTML is never interpreted. */
function inline(text: string, sources?: ConversationTurn["sources"]): ReactNode[] {
  const parts = text.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+|\*\*[^*]+\*\*|\[\d+\])/g);
  return parts.map((part, i) => {
    const citation = part.match(/^\[(\d+)\]$/);
    const source = citation && sources?.find((item) => item.n === Number(citation[1]));
    if (source) return <a key={i} className="studio-citation" href={source.url} target="_blank" rel="noreferrer" aria-label={`Source ${source.n}: ${source.label}`} title={source.quote}>{part}</a>;
    const linked = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linked) return <a key={i} href={linked[2]} target="_blank" rel="noreferrer">{linked[1]}</a>;
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,;!?)]+$/, "");
      return <Fragment key={i}><a href={url} target="_blank" rel="noreferrer">{url}</a>{part.slice(url.length)}</Fragment>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

export function ReplyContent({ text, sources }: { text: string; sources?: ConversationTurn["sources"] }) {
  return <div className="studio-prose">{text.split(/\n\s*\n/).map((block, index) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+[.)]\s+/, ""), sources)}</li>)}</ol>;
    if (lines.every((line) => /^[-*]\s+/.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^[-*]\s+/, ""), sources)}</li>)}</ul>;
    return <p key={index}>{lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{inline(line.replace(/^#{1,6}\s+/, ""), sources)}</Fragment>)}</p>;
  })}</div>;
}
