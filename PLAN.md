# PLAN — Truth Unites: geometry sandbox

Architecture reference. For product decisions and constraints, see CLAUDE.md. For the running build log (what changed, why, and lessons learned), see NOTES.md — this file describes current-state architecture, not build history.

## Goal

A Next.js sandbox that runs one full Pain → Parallels → Payoff → Practice session, renderable in three switchable within-session geometries (bounded radial, braided river, descent strata) on identical data, so AA can feel and compare them. Sandbox for one user; not a consumer app — but built to feel like a real product, not a wireframe, since AA's judgment of the geometries depends on feeling them properly.

## Architecture

- **Next.js App Router, TypeScript, static JSON, no backend.** Session pages are statically generated from `/data`.
- **One shared session-state model, three rendering layers.** Geometry components are pure views over the same state + data; switching geometry preserves exploration progress.
- **SVG for all three maps**, rendered into a shared camera engine (`MapViewport`) rather than laid out flat — see below. No chart library — layouts are simple enough to compute by hand, and full control keeps the contemplative aesthetic.
- **No new runtime dependencies.** Camera gestures are hand-rolled pointer events + rAF; voice is the browser's Web Speech API; ambience is generated WebAudio. `package.json` still lists only next/react/typescript.

## The world layer (immersive pass)

The app now reads as one continuous world — a night sky the user dwells in — rather than screens:

- **The Atlas** (`components/AtlasHome.tsx`) is the home surface: a canvas starfield (`components/Starfield.tsx` — layered stars, twinkle, pointer parallax on fine pointers, rare meteor; static single frame under reduced motion) with two kinds of objects in it. **Doors**: each session is an arched threshold (SVG, hairline masonry, inner light, a preview constellation of its parallels — rejected as dashed ember). Clicking one swings the arch (CSS perspective), floods light from that door (`.door-pass`), then routes to the session. **Constellations**: completed descents, read from the localStorage stub, drawn as small star-figures (visited parallels in lineage colors, rejected dashed, arrival star in gold) placed deterministically (`lib/rand.ts` seeded PRNG) in the top band of the sky, clear of the title. Memory made visible — deliberately not a score.
- **The threshold** (`SessionView`): a session opens with a breath at the surface — pain category, the complaint as an inscription, then the map fades in. Auto-lifts (~2.6 s), tap to skip, skipped entirely under reduced motion.
- **Living maps**: nodes are stars (blurred aura, fine setting ring, one-shot reveal ripple), parallels carry their lineage's **glyph** (`components/LineageGlyph.tsx` — stroke-only geometric seals: wheel, cross, spiral, flame, watercourse, citadel, neuron; symbolic per decision 7, never figures). Light pulses (`Flow` in `geometries/common.tsx` — pathLength dash trick) travel the live edges/streams; the selected node's thread lights up in its lineage color; the practice terminal is a gated double ring that turns once unlocked; a dim starfield sits behind every map.
- **Insight chambers**: selecting a parallel/deepening pours that lineage's atmosphere over the whole experience — the reading surface tints (`--sel-wash` on the sheet), the aurora behind the map takes the lineage hue (`--aurora`), a large faint glyph watermarks the panel, content arrives as a staged cascade, and the ambient bed (if on) re-voices to the tradition's interval (`lineageAtmosphere` in `lib/lineage.ts`, `tintAmbience` in `lib/ambience.ts` — root never moves; the second partial slides to a just-intonation interval and the lowpass ceiling shifts). Rejected parallels get the ember room (minor third, low ceiling).
- **Gravitation**: selection moves the camera toward the node — mobile centers it in the band above the sheet; desktop uses `approach()` (centers + eases zoom to ~1.35× fit, because at fit scale the clamp makes plain focus a no-op). Dismissing arrival fits back out to see the whole dug map.
- **Arrival is a star-birth**: the overlay ignites a gold star (flare, expanding halos, slow-turning rays) above the payoff, and the closing line links to the Atlas, where the new constellation now shines.

## Map camera (`components/MapViewport.tsx`)

Each geometry no longer renders a flat `<svg>` — it exports pure SVG content plus a `layout()` function (canvas size + a `pos(ref: NodeRef)` lookup), and `MapViewport` owns the camera on top of it:

- Pinch-zoom, drag-pan with momentum glide, mouse-wheel/trackpad zoom, double-tap zoom, and `+`/`◎`/`−` controls.
- `focusOn(x, y, {k, ms})` animates the camera to center a point — used whenever a node is selected, so the selection glides into the band of screen the detail sheet doesn't cover.
- `bottomInset` (a ref, not a prop, to avoid re-render churn) tells the camera how many px of the viewport the sheet currently occupies.
- Reads `prefers-reduced-motion` once and skips animated transitions when set.

Each geometry's `layout()` export (`radialLayout`, `riverLayout`, `descentLayout`) is the single source of truth for "where is node X" — `SessionView` uses it to compute camera targets, so a new geometry only needs to implement `layout()` correctly to get free camera support.

## Session interaction model (shared across geometries)

Progressive excavation, same in every geometry:

1. Only the **surface complaint** node is live at first. Selecting it surfaces the **mechanism**.
2. Selecting the mechanism surfaces all **parallels** — accepted and rejected, rejected visually distinct (dashed, ember-toned, marked).
3. Selecting a parallel marks it visited and surfaces its **deepening** node (one optional deeper layer per accepted parallel; rejected parallels are dead ends — they never deepen).
4. The **practice** terminal is always visible but locked until the mechanism is revealed and ≥1 *accepted* parallel visited. Selecting it triggers **arrival**: an overlay showing the payoff (recognition synthesis), then the practice. Bounded: nothing branches past this.
5. On arrival, a minimal session record is persisted to `localStorage` (Constellation stub).

State shape: `{ complaintTouched, mechanismRevealed, visitedParallels[], visitedDeepenings[], selected, arrived }` (`lib/state.ts`, unchanged since first build). Selection also drives the detail sheet — see below.

## Detail sheet (`components/NodePanel.tsx` inside `SessionView.tsx`)

- **Desktop (≥769px):** fixed right column, always visible, empty state when nothing selected.
- **Mobile (≤768px):** a staged bottom sheet with three positions — **peek** (title strip only, map fully visible), **half** (default on selection — map focused above, content below), **full** (content fills the screen; the map dims and scales down slightly behind it — "reading mode"). Drag the grip to move between states (velocity-based snapping on release), tap the grip to toggle half↔full, tap the map background to drop to peek.
- **Content language: pills + folds, not prose walls.** Every node detail leads with a pill row (kind, lineage color, `≉ rejected`, `▷ listen`). Secondary commentary ("the reading") is collapsed by default behind a `Fold`; the *rejection reason* fold is the one exception and starts open, since curated rejection is the product's moat and should stay foregrounded, not hidden. Practice steps render as numbered cards.

## Voice + ambience (optional, off by default)

- `lib/voice.ts` — `useVoice()` wraps the Web Speech API. `▷ listen` appears on every node detail and on the arrival overlay; it reads the full content of that node, including anything visually collapsed behind a fold, so voice is a genuine low-text path, not a shorter version. Uses a **neutral system reading voice**, deliberately not a persona/character voice — see CLAUDE.md decision 7 (no guru/authority figures).
- `lib/ambience.ts` — `toggleAmbience()` is a generated WebAudio drone (two soft sine partials a fifth apart, under a slowly-breathing lowpass filter; no samples, no loop points, no rhythm). Toggled by the `♪` icon in the session header. Starts only on user gesture (autoplay-safe) and fades in/out rather than cutting.
- Both are genuinely optional and start silent — neither is a variable-reward mechanic; see CLAUDE.md decision 6.

## Geometries

- **Radial** (`RadialGeometry` / `radialLayout`): complaint at center; mechanism drawn as a thin ring around it (everything routes through mechanism); parallels at mid radius spread by angle, colored by lineage; deepenings further out on the same spoke; outermost dashed circle = practice edge, clickable when unlocked. Depth = literal radius.
- **River** (`RiverGeometry` / `riverLayout`): complaint + mechanism at left source; one stream per parallel flowing right, drifting toward neighbors mid-stream; accepted streams reconverge into a single practice pool at right; the rejected stream is dashed and dries up before the pool (dead-end terminator).
- **Descent** (`DescentGeometry` / `descentLayout`): vertical strata bands darkening with depth; complaint at surface, mechanism stratum below, one stratum row per parallel (rejected as an offset pocket), practice at bedrock; a central shaft line ties the dig together. Has two layouts (desktop-wide vs compact-portrait, chosen via `useCompact()`) — the only geometry that does, because a wide horizontal pit doesn't fit a phone's width the way the other two adapt by panning.

## Motion (all killed by `prefers-reduced-motion`)

The next node in the excavation arc (complaint → mechanism → practice) breathes with a slow cue-ring pulse; visited nodes glow; edges/streams draw themselves in on reveal; the unlocked practice edge slowly rotates its dashes; a faint aurora gradient drifts behind the map; the arrival overlay reveals in stages (eyebrow → payoff → practice → footer). None of this is a progression mechanic — it's atmosphere on top of a session that still only has one exit (arrival). Checked against CLAUDE.md decision 6 before adding.

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
  lineage.ts                   — lineage → color map + per-lineage atmosphere (wash/aurora/voicing)
  rand.ts                      — seeded PRNG (deterministic constellation/door layouts)
  voice.ts                     — Web Speech API wrapper + per-node speech text
  ambience.ts                  — generated WebAudio drone, toggleable + lineage re-voicing
components/
  Starfield.tsx                — canvas night sky (twinkle, parallax, rare meteor)
  LineageGlyph.tsx             — stroke-only lineage seals (HTML svg + in-SVG variants)
  AtlasHome.tsx                — the Atlas: sky, constellations, doors, door-pass transition
  MapViewport.tsx              — shared camera: pan/zoom/focus/approach for all geometries
  SessionView.tsx              — client shell: threshold, header, lenses, camera, sheet, arrival
  NodePanel.tsx                — detail content for selected node (pills + folds + chamber)
  ArrivalOverlay.tsx           — star-birth → payoff → practice → set into the sky
  geometries/
    common.tsx                 — MapNode (star nodes), Flow, GeometryProps, MapLayout, useCompact()
    RadialGeometry.tsx          (+ radialLayout)
    RiverGeometry.tsx           (+ riverLayout)
    DescentGeometry.tsx         (+ descentLayout)
app/
  layout.tsx, globals.css
  page.tsx                     — renders the Atlas (cold start via doors; provisional, flagged)
  session/[id]/page.tsx        — statically generated session view
```

## Schema (prototype of Registry node shape — see data/SCHEMA.md for full doc)

Session: `id, painCategory (fixed 10), surfaceComplaint, complaintBody, mechanism {id, name, provisional, description}, parallels[], payoff, practice {id, name, steps[]}`.
Parallel: `id, lineage (fixed enum), status: accepted|rejected, title, source {work, author, locus}, passage, reading, deepening? {id, title, body}, rejectionReason?` (required iff rejected). Mechanism IDs are namespaced `mech.*` and marked provisional — the real mechanism taxonomy doesn't exist yet.

## Deployment

Vercel project `uo-t`, connected to this repo's `main` branch — every push to `main` triggers a production build automatically (this is Vercel's git integration, not something this codebase configures). Production: **https://uo-t.vercel.app**. `vercel.json` pins the framework preset to `nextjs` (auto-detection previously came back null and mis-built as a static site). No preview-branch workflow is set up; all shipped work currently lands on `main` directly per AA's review pattern so far — confirm with AA before assuming that's still wanted if this changes.

## Build order (historical — first build; kept for reference)

1. PLAN.md, scaffold (package.json, tsconfig, app shell), `npm install`
2. Schema doc + three seed sessions
3. types / sessions / state / constellation / lineage libs
4. SessionView + NodePanel + ArrivalOverlay
5. Three geometry components
6. Styling pass (contemplative map: dark, spacious, slow transitions)
7. `npm run build`, drive it in a browser, screenshot each geometry, fix, commit, push

Subsequent passes (mobile adaptation, then the map-engine/sheet/voice product pass) are logged in NOTES.md, not repeated here.
