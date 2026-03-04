# Project Midori — React UI

New frontend for Project Midori built with **Next.js**, **Tailwind**, **shadcn-style components**, **Tremor**, **Magic UI** design tokens, and an embedded **Spline 3D** scene. No logic, API, or `localStorage` changes from the original app; UI and styling only.

## Stack

- **Next.js 14** (Pages Router)
- **Tailwind CSS** (design tokens: `bg`, `green`, `surface`, `border`, etc.)
- **Radix UI** (primitives for Select, Tabs, Accordion, Switch, Avatar, etc.)
- **Tremor** (optional for charts/tables)
- **Spline** (`@splinetool/react-spline`) for 3D hero/panels
- **Lucide React** icons
- **Framer Motion** (optional, for animations)

## Setup

```bash
cd midori-ui
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing (hero + Spline, features, pricing, CTA, footer) |
| `/login` | Login (Spline background, centered card) |
| `/dashboard` | Dashboard (KPI strip, chart area, Spline panel, Daily Brief, setups, events) |
| `/signals` | Signals (mode tabs, regime filter, SignalCard list) |
| `/risk` | Risk Center (guardrails, ATR sizing, cooldown, Account Health, stress test) |
| `/chat` | Chat (messages, suggested prompts, fixed input bar) |
| `/analysis` | Analysis (controls card + results / empty state) |
| `/screener` | Screener (Options / Stocks / Multi / Value tabs, table) |
| `/backtest` | Backtest (equity curve, stats, Quality Report) |
| `/confidence` | Confidence (ticker input, confidence cards with rings) |
| `/academy` | Academy (hero, learning paths, lessons) |
| `/methodology` | Methodology (sections, data sources, activity log) |
| `/community` | Community (Coming Soon cards, email capture) |

## Design tokens (Tailwind)

- **Colors:** `bg`, `bg2`, `bg3`, `green`, `green-dim`, `green-border`, `green-glow`, `surface`, `surface-hover`, `border`, `border-hover`, `text2`, `muted`, `muted2`, `red-dim`, `yellow-dim`
- **Fonts:** `font-display` (Syne), `font-body` (DM Sans), `font-mono` (JetBrains Mono)
- **Animations:** `animate-shimmer`, `animate-fade-up`, `animate-live-pulse`, `animate-typing-bounce`

## Spline

The 3D scene URL is set in:

- `components/SplineScene.tsx` (lazy-loaded, skeleton while loading)
- Used on: Landing (hero), Login (blurred bg), Dashboard (right panel “Market Visualization”)

To use a different scene, replace the URL in `SplineScene` or pass it as the `url` prop where the component is used.

## Backend

This UI is designed to be wired to your existing FastAPI backend. Point `fetch`/API calls to your current backend (e.g. `NEXT_PUBLIC_API_URL` or same origin). All existing API contracts and `localStorage` keys remain unchanged.
