import { ArrowRight, ArrowUpRight, ArrowDown, Check as CheckIcon, X, CircleAlert, Bell as BellIcon } from "lucide-react";
import { cn } from "@/lib/utils";
type GlyphProps = { className?: string };
export type ArrowDirection = "right" | "up-right" | "down";
export function Arrow({ dir = "right", className }: GlyphProps & { dir?: ArrowDirection }) {
  const Icon = { right: ArrowRight, "up-right": ArrowUpRight, down: ArrowDown }[dir];
  return <Icon aria-hidden="true" className={cn("l-glyph", className)} strokeWidth={1.75} />;
}
export function Check({ className }: GlyphProps) { return <CheckIcon aria-hidden="true" className={cn("l-glyph", className)} strokeWidth={1.75} />; }
export function Cross({ className }: GlyphProps) { return <X aria-hidden="true" className={cn("l-glyph", className)} strokeWidth={1.75} />; }
export function Attention({ className }: GlyphProps) { return <CircleAlert aria-hidden="true" className={cn("l-glyph", className)} strokeWidth={1.75} />; }
export function Bell({ className }: GlyphProps) { return <BellIcon aria-hidden="true" className={cn("l-glyph", className)} strokeWidth={1.75} />; }
