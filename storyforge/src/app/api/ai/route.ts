import { NextRequest } from "next/server";
import { getProvider } from "@/lib/ai";
import {
  buildChatSystem,
  buildStorySystem,
  buildStoryUser,
  buildSummarizeUser,
  SUMMARIZE_SYSTEM,
} from "@/lib/prompts";
import type { AIRequest } from "@/lib/types";
import {
  getEntitlement,
  getUserFromRequest,
  paywallEnabled,
  recordChapter,
} from "@/lib/server/billing";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Tasks that produce a chapter and count against the free tier. */
const CHAPTER_TASKS = new Set(["generate", "continue", "rewrite"]);

export async function POST(req: NextRequest) {
  let body: AIRequest;
  try {
    body = (await req.json()) as AIRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.task) {
    return Response.json({ error: "Missing task" }, { status: 400 });
  }

  // Paywall (active only when Stripe + Supabase are configured).
  if (paywallEnabled()) {
    const user = await getUserFromRequest(req);
    if (!user) {
      return Response.json(
        { error: "Create a free account to keep writing.", code: "auth" },
        { status: 401 }
      );
    }
    if (CHAPTER_TASKS.has(body.task)) {
      const ent = await getEntitlement(user.id);
      if (ent.plan !== "pro" && ent.chaptersUsed >= ent.freeLimit) {
        return Response.json(
          {
            error: `You've used all ${ent.freeLimit} free chapters this month.`,
            code: "paywall",
          },
          { status: 402 }
        );
      }
      if (ent.plan !== "pro") await recordChapter(user.id);
    }
  }

  const provider = getProvider();

  try {
    // Memory summarization: one-shot JSON, not streamed.
    if (body.task === "summarize") {
      const raw = await provider.complete({
        system: SUMMARIZE_SYSTEM,
        messages: [{ role: "user", content: buildSummarizeUser(body.targetChapter ?? "") }],
        maxTokens: 2000,
      });
      const cleaned = raw.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      try {
        return Response.json(JSON.parse(cleaned));
      } catch {
        return Response.json({ summary: cleaned.slice(0, 400), relationships: [], locations: [], timeline: [], lore: [] });
      }
    }

    // Everything else streams plain text.
    const isChat = body.task === "chat";
    const system = isChat ? buildChatSystem(body) : buildStorySystem(body);
    const messages: { role: "user" | "assistant"; content: string }[] = isChat
      ? [
          ...(body.chatHistory ?? []).slice(-12),
          {
            role: "user",
            content: `${body.lastChapter ? `(Current chapter for reference:\n${body.lastChapter.slice(0, 6000)}\n)\n\n` : ""}${body.instruction ?? body.prompt ?? ""}`,
          },
        ]
      : [{ role: "user", content: buildStoryUser(body) }];

    const iterator = provider.stream({ system, messages });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          for await (const chunk of iterator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Provider": provider.name,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
