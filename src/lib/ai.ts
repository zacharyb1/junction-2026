import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

/**
 * Picks a model from whichever provider key is configured.
 * Override per call-site with `getModel("fast")` for cheaper/faster tasks.
 * Add providers here, nowhere else.
 */
export type ModelTier = "smart" | "fast";

export function getModel(tier: ModelTier = "smart"): LanguageModel {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(tier === "smart" ? "claude-opus-5-5" : "claude-haiku-5-5");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai(tier === "smart" ? "gpt-5" : "gpt-5-mini");
  }
  if (process.env.XAI_API_KEY) {
    return xai(tier === "smart" ? "grok-4" : "grok-4-fast");
  }
  throw new Error(
    "No LLM provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY or XAI_API_KEY (see .env.example).",
  );
}

export function providerName(): string {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.XAI_API_KEY) return "xai";
  return "none";
}
