# PLAN — Truth Unites: geometry sandbox MVP

## Goal

A Next.js sandbox that runs one full Pain → Parallels → Payoff → Practice session, renderable in three switchable within-session geometries (bounded radial, braided river, descent strata) on identical data, so AA can feel and compare them. Sandbox for one user; not a consumer app.

## Architecture

- **Next.js App Router, TypeScript, static JSON, no backend.** Session pages are statically generated from `/data`.
- **One shared session-state model, three rendering layers.** Geometry components are pure views over the same state + data; switching geometry preserves exploration progress.
- **SVG for all three maps.** No chart library — layouts are simple enough to compute by hand, and full control keeps the contemplative aesthetic.

## Session interaction model (shared across geometries)

Progressive excavation, same in every geometry:

1. Only the **surface complaint** node is live at first. Selecting it surfaces the **mechanism**.
2. Selecting the mechanism surfaces all **parallels** — accepted and rejected, rejected visually distinct (dashed, ember-toned, marked).
3. Selecting a parallel marks it visited and surfaces its **deepening** node (one optional deeper layer per accepted parallel; rejected parallels are dead ends — they never deepen).
4. The **practice** terminal is always visible but locked until the mechanism is revealed and ≥1 *accepted* parallel visited. Selecting it triggers **arrival**: an overlay showing the payoff (recognition synthesis), then the practice. Bounded: nothing branches past this.
5. On arrival, a minimal session record is persisted to `localStorage` (Constellation stub).

State shape: `{ complaintTouched, mechanismRevealed, visitedParallels[], visitedDeepenings[], selected, arrived }`. Selection also drives a detail panel (right column) showing the node's full content — passage, reading, citation, rejection reason.

## Geometries

- **Radial** (`RadialGeometry`): complaint at center; mechanism drawn as a thin ring around it (everything routes through mechanism); parallels at mid radius spread by angle, colored by lineage; deepenings further out on the same spoke; outermost dashed circle = practice edge, clickable when unlocked. Depth = literal radius.
- **River** (`RiverGeometry`): complaint + mechanism at left source; one stream per parallel flowing right, drifting toward neighbors mid-stream; accepted streams reconverge into a single practice pool at right; the rejected stream is dashed and dries up before the pool (dead-end terminator).
- **Descent** (`DescentGeometry`): horizontal strata bands darkening with depth; complaint at surface, mechanism stratum below, one stratum row per parallel (rejected as an offset pocket), practice at bedrock; a central shaft line ties the dig together.

## File structure

```
data/
  SCHEMA.md                    — documented schema (Registry node-shape prototype; deliverable)
  sessions/
    anxiety-first-date.json
    anger-reactivity.json
    burnout.json
lib/
  types.ts                     — schema types (SessionData, Parallel, NodeRef, …)
  sessions.ts                  — static JSON loader
  state.ts                     — useSessionState hook (shared state machine)
  constellation.ts             — localStorage stub: save/load session records
  lineage.ts                   — lineage → color map
components/
  SessionView.tsx              — client shell: header, switcher, geometry, panel, arrival
  NodePanel.tsx                — detail panel for selected node
  ArrivalOverlay.tsx           — payoff → practice → recorded-to-constellation
  geometries/
    RadialGeometry.tsx
    RiverGeometry.tsx
    DescentGeometry.tsx
app/
  layout.tsx, globals.css
  page.tsx                     — session picker (cold start; provisional, flagged)
  session/[id]/page.tsx        — statically generated session view
```

## Schema (prototype of Registry node shape — see data/SCHEMA.md for full doc)

Session: `id, painCategory (fixed 10), surfaceComplaint, complaintBody, mechanism {id, name, provisional, description}, parallels[], payoff, practice {id, name, steps[]}`.
Parallel: `id, lineage (fixed enum), status: accepted|rejected, title, source {work, author, locus}, passage, reading, deepening? {id, title, body}, rejectionReason?` (required iff rejected). Mechanism IDs are namespaced `mech.*` and marked provisional — the real mechanism taxonomy doesn't exist yet.

## Build order

1. PLAN.md, scaffold (package.json, tsconfig, app shell), `npm install`
2. Schema doc + three seed sessions
3. types / sessions / state / constellation / lineage libs
4. SessionView + NodePanel + ArrivalOverlay
5. Three geometry components
6. Styling pass (contemplative map: dark, spacious, slow transitions)
7. `npm run build`, drive it in a browser, screenshot each geometry, fix, commit, push
