import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "./provider";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export function createAnthropicProvider(): AIProvider {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return {
    name: "anthropic",

    async *stream({ system, messages, maxTokens = 16000 }) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      });
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
    },

    async complete({ system, messages, maxTokens = 4000 }) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      });
      const final = await stream.finalMessage();
      return final.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
    },
  };
}
