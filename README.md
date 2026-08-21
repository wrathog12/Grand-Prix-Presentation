# BotGods — The Silent Co-Driver · Presentation Site

A scroll-animated presentation site for **The Silent Co-Driver**, built for
**AI Race Month · GrandPrix**, problem statement 1 — *Racing Strategy &
Decision-Making*.

> Reads driver stress and fatigue from team-radio audio and turns it into
> pit-wall strategy calls.

**Team BotGods** — Abhishek Choudhary · Shreevats Dhyani · Akshat Saraswat ·
Divyanshu Kaherwal

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # static bundle → dist/
npm run preview    # serve the built bundle
```

Requires Node 20.19+.

## Presenting it

A **FULLSCREEN** button sits in the bottom-right corner. Click it, or press
**`F`** from anywhere on the page. `Escape` or `F` again exits; the button
recedes to 25 % opacity once you're fullscreen so it isn't sitting on the deck
all presentation, and comes back on hover.

Note that no site can enter fullscreen on load by itself — the Fullscreen API
requires a user gesture, so the click (or the `F`) is that gesture.

The section rail on the right edge also works as navigation: click any mark to
jump straight to that page instead of scrolling through the ones before it.

## It runs offline

The judged round assumes venue wifi is dead, so nothing here reaches the network
at runtime:

- All three variable fonts (Archivo, Inter, JetBrains Mono) are bundled from npm
  into `dist/assets` — no webfont request.
- Every number and string is local, in `src/content.ts`.
- `base: './'` in the Vite config, so the built bundle runs from any path.

## The seven pages

| # | Section | File |
|---|---|---|
| 00 | Cover — start-light sequence, team, event | `src/sections/Cover.tsx` |
| 01 | The problem — the deaf pit wall | `src/sections/Problem.tsx` |
| 02 | The solution — no model has a word for tired | `src/sections/Solution.tsx` |
| 03 | Technical depth — eleven stages, six silent bugs | `src/sections/Technical.tsx` |
| 04 | The model — four models, one fitted head | `src/sections/Model.tsx` |
| 05 | Why fusion — the Naive/Fusion toggle | `src/sections/Versus.tsx` |
| 06 | Impact, business, cost — and the honest ledger | `src/sections/Impact.tsx` |

## How it is put together

- **React 19 + TypeScript + Vite 7** — static, no backend.
- **Tailwind 4**, with the design tokens lifted from the dashboard's own
  `index.css` (cyan brand, red reserved for critical only, Calm green / Tired
  amber / Stressed red). Custom utilities — `display`, `tower`, `eyebrow`,
  `mono`, `panel` — live in `src/index.css`.
- **Motion** for scroll-linked animation, **Lenis** for smooth scrolling. Both
  stand down under `prefers-reduced-motion`.
- **All copy and data lives in `src/content.ts`**, separate from the components,
  so the content can be edited without touching a single component.

## Two rules this site follows

Inherited from the project it presents:

1. **Every figure is traceable to `PROJECT_KNOWLEDGE_BASE.md`**, which was
   verified against source and data files on 2026-08-21. Nothing is invented,
   and none of the stale README numbers appear.
2. **Anything modelled, inferred or illustrative is labelled on screen.** The
   session timeline in section 05 carries an `illustrative` tag because it is
   not a measured payload — the marker mix follows the real 855-clip label
   distribution, and the mechanism it demonstrates (the naive path has no route
   to `Tired`) is exact. Swap in a real `GET /api/timeline/...` response and the
   label comes off.
