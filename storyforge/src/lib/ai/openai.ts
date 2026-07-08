import OpenAI from "openai";
import type { AIProvider } from "./provider";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export function createOpenAIProvider(): AIProvider {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  return {
    name: "openai",

    async *stream({ system, messages, maxTokens = 16000 }) {
      const stream = await client.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: "system" as const, content: system }, ...messages],
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) yield text;
      }
    },

    async complete({ system, messages, maxTokens = 4000 }) {
      const res = await client.chat.completions.create({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: "system" as const, content: system }, ...messages],
      });
      return res.choices[0]?.message?.content ?? "";
    },
  };
}
