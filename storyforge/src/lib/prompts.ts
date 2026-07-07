import type { AIRequest, Character, StoryMemory, StorySettings } from "./types";

const HEAT_GUIDE: Record<string, string> = {
  None: "No romantic content.",
  Subtle: "Romance stays in glances, tension, and what goes unsaid.",
  Sweet: "Warm, affectionate romance — kisses, closeness, butterflies.",
  Passionate:
    "Openly romantic and physical — charged touches, heated kisses, desire on the page, with intimate scenes tastefully implied.",
  Steamy:
    "Bold, sensual, mature romance between consenting adults. Lean into longing, heat, and physical chemistry; write intimate scenes with confidence and sensory detail while keeping the prose elegant rather than crude.",
  Scorching:
    "Maximum heat for a mature adult audience. Unapologetically sensual, explicit tension and passion between consenting adults, written with craft — evocative, immersive, character-driven, never gratuitous or degrading.",
};

function characterSheet(c: Character): string {
  const lines = [
    `- ${c.name || "Unnamed"}${c.age ? `, ${c.age}` : ""}${c.occupation ? ` — ${c.occupation}` : ""}`,
  ];
  if (c.appearance) lines.push(`  Appearance: ${c.appearance}`);
  if (c.personality) lines.push(`  Personality: ${c.personality}`);
  if (c.goals) lines.push(`  Goals: ${c.goals}`);
  if (c.relationships) lines.push(`  Relationships: ${c.relationships}`);
  if (c.secrets) lines.push(`  Secrets (reveal gradually): ${c.secrets}`);
  return lines.join("\n");
}

function settingsBlock(s: StorySettings): string {
  const rows: [string, string][] = [
    ["Title", s.title],
    ["Genre", s.genre],
    ["Romance level", s.romanceLevel ? `${s.romanceLevel} — ${HEAT_GUIDE[s.romanceLevel] ?? ""}` : ""],
    ["Tone", s.tone],
    ["Setting", s.setting],
    ["Time period", s.timePeriod],
    ["Point of view", s.pov],
    ["Chapter length", s.length],
    ["Dialogue amount", s.dialogueAmount],
    ["Pacing", s.pacing],
    ["Themes", s.themes],
    ["Plot twists to weave in", s.plotTwists],
    ["Ending style to build toward", s.endingStyle],
    ["Additional instructions", s.instructions],
  ];
  const filled = rows.filter(([, v]) => v?.trim());
  return filled.length
    ? filled.map(([k, v]) => `- ${k}: ${v}`).join("\n")
    : "- No explicit preferences; infer everything from the prompt.";
}

function memoryBlock(m: StoryMemory): string {
  const parts: string[] = [];
  if (m.chapterSummaries.length)
    parts.push(
      `Previous chapters:\n${m.chapterSummaries.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`
    );
  if (m.relationships.length)
    parts.push(`Relationship state:\n${m.relationships.map((r) => `  - ${r}`).join("\n")}`);
  if (m.locations.length) parts.push(`Established locations: ${m.locations.join("; ")}`);
  if (m.timeline.length)
    parts.push(`Timeline so far:\n${m.timeline.map((t) => `  - ${t}`).join("\n")}`);
  if (m.lore.length) parts.push(`Established lore:\n${m.lore.map((l) => `  - ${l}`).join("\n")}`);
  return parts.length ? parts.join("\n\n") : "This is the very beginning — nothing established yet.";
}

const BASE = `You are StoryForge, a world-class fiction ghostwriter. You write immersive, emotionally intelligent, publish-quality prose.

Craft rules:
- Show, don't tell. Ground every scene in concrete sensory detail.
- Give characters distinct voices; dialogue should crackle and reveal character.
- Every character is an adult (18+). All romance is between consenting adults. Never write content involving minors.
- Stay rigorously consistent with the established characters, relationships, locations, timeline, and lore provided below. Never contradict them; expand the world naturally instead.
- Keep personalities stable — characters grow, but never act "out of character" without an earned reason.
- Format: begin the chapter with a single markdown heading line "# Chapter N: Title", then prose paragraphs separated by blank lines. Use *italics* for emphasis. No other markdown, no authorial notes, no content outside the story.`;

export function buildStorySystem(req: AIRequest): string {
  const chapterCount = req.memory.chapterSummaries.length;
  return `${BASE}

Story configuration:
${settingsBlock(req.settings)}

Characters:
${req.characters.length ? req.characters.map(characterSheet).join("\n") : "- Invent compelling adult characters that fit the prompt."}

Story memory (${chapterCount} chapters so far):
${memoryBlock(req.memory)}`;
}

export function buildStoryUser(req: AIRequest): string {
  switch (req.task) {
    case "generate":
      return `Write Chapter 1 of a new story based on this prompt:\n\n"${req.prompt}"\n\nHook the reader from the first line. End the chapter on a note that makes it impossible not to keep reading.`;
    case "continue":
      return `Here is the most recent chapter for immediate context:\n\n---\n${req.lastChapter ?? ""}\n---\n\nWrite the next chapter (Chapter ${req.memory.chapterSummaries.length + 1}). Pick up naturally, escalate the stakes, and deepen the relationships.${req.instruction ? `\n\nDirection for this chapter: ${req.instruction}` : ""}`;
    case "rewrite":
      return `Rewrite the following chapter. Keep its place in the story and everything established in memory, but apply this direction: ${req.instruction || "improve the prose significantly"}.\n\n---\n${req.targetChapter ?? ""}\n---\n\nReturn the full rewritten chapter in the same format.`;
    default:
      return req.prompt ?? "";
  }
}

export const CHAT_SYSTEM_SUFFIX = `

You are acting as the reader's side-panel writing assistant for the story described above. Discuss the story, brainstorm, answer questions, and propose concrete revisions. When the user asks for a rewrite, continuation, tone change, or new character, describe exactly what you would change — or provide the revised passage directly. Be concise, collaborative, and keep every suggestion consistent with the story memory. All characters are consenting adults.`;

export function buildChatSystem(req: AIRequest): string {
  return buildStorySystem(req) + CHAT_SYSTEM_SUFFIX;
}

export const SUMMARIZE_SYSTEM = `You are the memory keeper for a serialized story. Read the chapter and return ONLY a JSON object (no markdown fence, no commentary) with this exact shape:
{
  "summary": "2-3 sentence summary of the chapter's events",
  "relationships": ["current state of each significant relationship, one string each"],
  "locations": ["locations that appeared or were established"],
  "timeline": ["one line describing when this chapter happens relative to the story"],
  "lore": ["any new world-building facts, secrets revealed, or rules established"]
}
Arrays may be empty. Be terse and factual — this is machine-readable state, not prose.`;

export function buildSummarizeUser(chapterText: string): string {
  return `Chapter to summarize:\n\n${chapterText}`;
}
