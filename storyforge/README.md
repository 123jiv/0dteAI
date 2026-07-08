# StoryForge ✒️

An AI-powered interactive story studio. Type a single prompt — *"a slow-burn romance on a spaceship"* — and StoryForge writes an immersive story chapter by chapter, remembers everything (characters, relationships, locations, timelines, lore), and lets you steer every twist without ever restarting.

## Features

- **One-prompt generation** — a large ChatGPT-style prompt box with optional fine-grained story controls (genre, romance level, tone, POV, pacing, themes, plot twists, ending style, and more)
- **Character Builder** — unlimited characters with name, age (adults only), appearance, personality, goals, occupation, relationships, secrets, and an optional image
- **Story memory** — every chapter is summarized into rolling memory (relationships, locations, timeline, lore) so the AI stays consistent across unlimited chapters
- **AI assistant side panel** — continue, rewrite chapters, raise the tension, turn up the heat, change tone, add characters, or summarize — mid-story, without restarting
- **Beautiful reader** — large serif typography, adjustable font size, dark/light mode, reading progress, chapter navigation, bookmarks, estimated reading time, keyboard shortcuts
- **Library** — search, collections, favorites, duplication, and export to **Markdown**, **EPUB**, and **PDF**
- **Dashboard** — recently read, continue writing, favorites, drafts, completed, word counts and reading stats
- **Autosave everywhere** — local-first persistence, with optional Supabase auth + cloud sync

## Tech stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Zustand · Supabase · Anthropic / OpenAI (swappable provider abstraction)

## Getting started

```bash
cd storyforge
npm install
cp .env.example .env.local   # add your keys (optional — see Demo mode)
npm run dev
```

Open http://localhost:3000.

### AI providers

Set one of these in `.env.local`:

| Provider  | Env vars |
| --------- | -------- |
| Anthropic (recommended) | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` (default `claude-opus-4-8`) |
| OpenAI    | `AI_PROVIDER=openai`, `OPENAI_API_KEY`, optional `OPENAI_MODEL` (default `gpt-4o`) |
| Demo      | `AI_PROVIDER=demo` (or simply no keys) — streams sample prose so the full app works with zero setup |

The provider abstraction lives in `src/lib/ai/` — each backend implements one small `AIProvider` interface (`stream` + `complete`), so adding a new provider is a single file.

### Supabase (optional)

Without Supabase, StoryForge runs in local-first mode (everything persists in the browser). To enable accounts + cloud sync:

1. Create a Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Run the SQL documented at the top of `src/lib/supabase.ts` (one `stories` table + RLS policy)

## Paywall (optional)

StoryForge ships with a Stripe-powered subscription paywall that stays **dormant until configured** — without the keys, the app is fully open as before.

**Model:** free users get `FREE_CHAPTERS_PER_MONTH` (default 5) generated chapters per month; **Pro** subscribers get unlimited. Enforcement happens server-side in `/api/ai`.

Setup:

1. **Supabase** — set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, and run the full SQL documented at the top of `src/lib/supabase.ts` (stories + profiles + usage tables).
2. **Stripe** — create a Product ("StoryForge Pro") with a recurring monthly Price. Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` (starts with `price_`).
3. **Webhook** — in Stripe: Developers → Webhooks → Add endpoint pointing at `https://YOUR-DOMAIN/api/billing/webhook`, subscribed to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Set the signing secret as `STRIPE_WEBHOOK_SECRET`.
4. Optionally set `PRO_PRICE_LABEL` (shown in the upgrade modal) and `FREE_CHAPTERS_PER_MONTH`.

Flow: unauthenticated users are asked to create a free account when they generate; free users who hit the monthly limit see the upgrade modal → Stripe Checkout → the webhook flips their plan to `pro` → unlimited. Users manage/cancel via the Stripe billing portal from the Account page.

## Keyboard shortcuts (reader)

| Key | Action |
| --- | ------ |
| `←` / `→` | Previous / next chapter |
| `+` / `-` | Font size |
| `b` | Bookmark current position |
| `c` | Toggle AI assistant |
| `s` | Toggle chapter list |
| `⌘↵` | Generate (home prompt box) |

## Content note

StoryForge is built for adult fiction: all characters are adults, all romance is between consenting adults, and the "Romance Level" control scales from none up to steamy mature romance.

## Architecture

```
src/
├── app/               # Next.js App Router pages + the /api/ai streaming route
├── components/        # UI primitives, home controls, reader, chat panel, library
└── lib/
    ├── ai/            # Provider abstraction: anthropic | openai | demo
    ├── prompts.ts     # System-prompt builder incl. story memory
    ├── store.ts       # Zustand stores (library + reader prefs), local persistence
    ├── use-generation.ts  # Streaming generation hook + memory updates
    ├── export.ts      # Markdown / EPUB / PDF exporters
    └── supabase.ts    # Optional auth + cloud sync
```
