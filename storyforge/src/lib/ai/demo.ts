import type { AIProvider } from "./provider";

/**
 * Zero-key demo provider. Generates believable sample prose so the whole app
 * is usable before any API key is configured. Not meant to be good literature —
 * meant to exercise streaming, memory, chapters, and the reader end-to-end.
 */

const CHAPTER = (n: number, hint: string) => `# Chapter ${n}: ${n === 1 ? "The Spark" : n === 2 ? "Closer" : "No Way Back"}

${hint ? `*(Demo mode — no API key configured. Your prompt: "${hint.slice(0, 120)}")*\n\n` : ""}The city exhaled rain onto the windows of the little bar on Delancey, and she told herself — again — that she was only here for the whiskey. Not for him. Definitely not for the way he looked at her across the room like a question she'd been avoiding for years.

"You're late," he said, sliding into the seat across from her without asking. His voice was low, amused, maddening.

"I'm exactly on time. You're early." She didn't look up from her glass. Looking up was how this always started.

"I couldn't wait." He said it simply, without armor, and the honesty of it landed somewhere beneath her ribs and stayed there, warm and inconvenient.

Outside, thunder rolled across the skyline. Inside, the space between them shrank by degrees — an elbow on the table, a knee brushing hers, the slow gravity of two people pretending they weren't already falling.

"This is a terrible idea," she whispered, when his hand finally found hers.

"The best ones usually are." His thumb traced the inside of her wrist, and her pulse betrayed her completely. "Tell me to stop."

She didn't.

The rain kept falling. Neither of them noticed when the bar emptied, when the candle burned down, when the night quietly rearranged both their lives. There would be consequences — there were always consequences — but they belonged to tomorrow.

Tonight belonged to them.`;

const CHAT_REPLY = `Happy to help shape the story. In demo mode I can't actually rewrite the prose, but once you add an ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local I can rewrite chapters, raise the tension, change the tone, add characters, or continue from any point — just ask here.`;

const SUMMARY = JSON.stringify({
  summary:
    "The two leads meet at a bar on Delancey during a storm; long-simmering attraction breaks the surface and they cross a line they can't uncross.",
  relationships: ["Leads: reluctant attraction → openly romantic, consequences pending"],
  locations: ["A small bar on Delancey Street"],
  timeline: ["Night one — the storm, the confession"],
  lore: [],
});

async function* streamText(text: string): AsyncGenerator<string> {
  const words = text.split(/(?<=\s)/);
  for (let i = 0; i < words.length; i += 3) {
    yield words.slice(i, i + 3).join("");
    await new Promise((r) => setTimeout(r, 24));
  }
}

export function createDemoProvider(): AIProvider {
  return {
    name: "demo",

    async *stream({ system, messages }) {
      const last = messages[messages.length - 1]?.content ?? "";
      if (system.includes("side-panel writing assistant")) {
        yield* streamText(CHAT_REPLY);
        return;
      }
      const chapterMatch = system.match(/(\d+) chapters? so far/);
      const n = chapterMatch ? parseInt(chapterMatch[1], 10) + 1 : 1;
      const quoted = last.match(/this prompt:\s*\n\n"([\s\S]*?)"\n/);
      yield* streamText(CHAPTER(n, n === 1 ? (quoted?.[1] ?? last) : ""));
    },

    async complete({ system }) {
      if (system.includes("memory keeper")) return SUMMARY;
      return CHAT_REPLY;
    },
  };
}
