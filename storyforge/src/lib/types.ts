export interface Character {
  id: string;
  name: string;
  age: string; // adults only (18+), enforced in UI + prompt
  appearance: string;
  personality: string;
  goals: string;
  occupation: string;
  relationships: string;
  secrets: string;
  imageUrl?: string;
}

export interface StorySettings {
  title: string;
  genre: string;
  romanceLevel: string;
  tone: string;
  setting: string;
  timePeriod: string;
  pov: string;
  length: string;
  dialogueAmount: string;
  pacing: string;
  themes: string;
  plotTwists: string;
  endingStyle: string;
  instructions: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  chapterId: string;
  label: string;
  progress: number; // 0..1 scroll position within the chapter
  createdAt: number;
}

/** Rolling memory the AI uses to stay consistent across chapters. */
export interface StoryMemory {
  chapterSummaries: string[];
  relationships: string[];
  locations: string[];
  timeline: string[];
  lore: string[];
}

export type StoryStatus = "draft" | "writing" | "completed";

export interface Story {
  id: string;
  prompt: string;
  settings: StorySettings;
  characters: Character[];
  chapters: Chapter[];
  memory: StoryMemory;
  bookmarks: Bookmark[];
  favorite: boolean;
  status: StoryStatus;
  collection: string;
  createdAt: number;
  updatedAt: number;
  lastReadAt: number;
  lastChapterId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AITask =
  | "generate" // first chapter from a fresh prompt
  | "continue" // next chapter
  | "rewrite" // rewrite a specific chapter
  | "chat" // free-form side-panel conversation
  | "summarize"; // update story memory (returns JSON)

export interface AIRequest {
  task: AITask;
  prompt?: string;
  settings: StorySettings;
  characters: Character[];
  memory: StoryMemory;
  /** Full text of the most recent chapter (context for continue/chat). */
  lastChapter?: string;
  /** Text of the chapter being rewritten. */
  targetChapter?: string;
  /** Extra instruction, e.g. "make the ending happier". */
  instruction?: string;
  /** Prior side-panel messages for chat. */
  chatHistory?: { role: "user" | "assistant"; content: string }[];
}

export const emptyMemory = (): StoryMemory => ({
  chapterSummaries: [],
  relationships: [],
  locations: [],
  timeline: [],
  lore: [],
});

export const defaultSettings = (): StorySettings => ({
  title: "",
  genre: "",
  romanceLevel: "",
  tone: "",
  setting: "",
  timePeriod: "",
  pov: "",
  length: "",
  dialogueAmount: "",
  pacing: "",
  themes: "",
  plotTwists: "",
  endingStyle: "",
  instructions: "",
});
