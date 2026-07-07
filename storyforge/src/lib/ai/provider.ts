/**
 * Provider abstraction — every backend (Anthropic, OpenAI, demo) implements
 * this one interface, so swapping providers is a single env var.
 */
export interface AIProvider {
  readonly name: string;
  /** Stream a completion as plain text chunks. */
  stream(params: {
    system: string;
    messages: { role: "user" | "assistant"; content: string }[];
    maxTokens?: number;
  }): AsyncIterable<string>;
  /** One-shot completion (used for memory summarization). */
  complete(params: {
    system: string;
    messages: { role: "user" | "assistant"; content: string }[];
    maxTokens?: number;
  }): Promise<string>;
}
