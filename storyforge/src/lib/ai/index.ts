import type { AIProvider } from "./provider";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAIProvider } from "./openai";
import { createDemoProvider } from "./demo";

export type { AIProvider } from "./provider";

/**
 * Provider factory. Set AI_PROVIDER=anthropic|openai|demo, or leave unset to
 * auto-detect from whichever API key is present. Falls back to the demo
 * provider so the app always runs.
 */
export function getProvider(): AIProvider {
  const requested = (process.env.AI_PROVIDER || "").toLowerCase();

  if (requested === "anthropic") return createAnthropicProvider();
  if (requested === "openai") return createOpenAIProvider();
  if (requested === "demo") return createDemoProvider();

  if (process.env.ANTHROPIC_API_KEY) return createAnthropicProvider();
  if (process.env.OPENAI_API_KEY) return createOpenAIProvider();
  return createDemoProvider();
}
