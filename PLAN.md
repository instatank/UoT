# PLAN — Truth Unites: geometry sandbox

Architecture reference. For product decisions and constraints, see CLAUDE.md; for the product roadmap, PRODUCT.md (ratified 2026-07-06 on §6/§8.1/§8.2/§8.3). For the running build log (what changed, why, and lessons learned), see NOTES.md — this file describes current-state architecture, not build history.

## Goal

A Next.js sandbox that runs one full Pain → Parallels → Payoff → Practice session, renderable in three switchable within-session geometries (bounded radial, braided river, descent strata) on identical data, so AA can feel and compare them. Sandbox for one user; not a consumer app — but built to feel like a real product, not a wireframe, since AA's judgment of the geometries depends on feeling them properly.

## Architecture

- **Next.js App Router, TypeScript, static JSON, no backend.** Session pages are statically generated from `/data`.
- **One shared session-state model, three rendering layers.** Geometry components are pure views over the same state + data; switching geometry preserves exploration progress.
- **SVG for all three maps**, rendered into a shared camera engine (`MapViewport`) rather than laid out flat — see below. No chart library — layouts are simple enough to compute by hand, and full control keeps the contemplative aesthetic.
- **No new runtime dependencies.** Camera gestures are hand-rolled pointer events + rAF; voice is the browser's Web Speech API; ambience is generated WebAudio. `package.json` still lists only next/react/typescript.

## Next steps — planned with AA (2026-07-10)

AA signed off on the Voyage's first look ("intuitive, natural, interactive and immersive — good job") and directed: take the learnings, note the pending steps, build later. Queue item #1 — **the atmosphere pass** — is now built and merged to `main`/production (see "The atmosphere pass" under the Voyage section below), **but AA has not visually reviewed it yet** — it shipped to give a planning session full context, so its on-device review is still owed and is the first open item. Still open, in rough priority order:

0. **AA's review of the Retreat** (built on branch `claude/wellness-retreat-ui-design-oeg8mp`, now integrated with the mobile-polish pass and merged into `main`) — the photoreal first-person valley presentation, built 2026-07-13 at AA's ask. The code is merged; what's still owed is AA's eyes on a real-GPU device: Playwright verification ran on a software rasterizer (worst case) where the adaptive tiers engage; on-device feel, thermals, and walking pace are open questions.
1. **AA's visual/on-device review of the atmosphere pass** — it's live in production but has never had AA's eyes on it moving. Confirm it feels right (nebulae, thread dust, approach detail, lineage skyboxes) and doesn't thermal-throttle real phones; anything wrong lands as new commits on `main`. This overlaps #5 (real-device pass) — do them together.
2. **Pacing dials** — AA calls current pacing "decent, we'll refine later." The dials are named in code: idle-drift delay (7 s) and turn rate (0.35 rad/s) in `engine.ts` `freeFlight`; gaze settle (1.7 s, `orientToward`); cruise/thrust (`CRUISE`/`THRUST_MAX`); orbit speed; autopilot duration. Tune with AA on-device, not in review.
3. **Deferred review findings** — ranked list at the end of NOTES.md "Adversarial review pass" (thread near-plane clipping, orbit-entry continuity, label caching, DPR-3 label softness, StrictMode double-write in `state.ts`, chamber focus restore; the two per-frame-gradient findings — Christianity world beams, gate pillar — were cashed in during the atmosphere pass).
4. **Voyage ↔ bird's-eye state carry-over** — the two routes hold separate `useSessionState` instances; progress resets when switching. Lift to a store or sessionStorage snapshot keyed by session id.
5. **Voyage on real devices** — drag feel, pinch feel, thermals, iOS Safari canvas perf, and now atmosphere blit cost on real GPUs. All Playwright-verified only so far.
6. **The actual product priority beneath all presentation work** (PRODUCT.md Phase 1): the Admission Gauntlet kill-pass on `registry/drafts/anxiety-gauntlet.md` — AA's judgment-hours, not code. The Voyage is a reader; the Registry is the company.

## The Voyage (first-person pass)

AA's explicit direction (2026-07-10, amending decision 8's presentation half): not a bird's-eye map but *being in* the space — "flying around in a galaxy, getting gravitationally pulled through different planets and stars." Built as a fourth presentation of the same session state machine, at **`/voyage/[id]`** (Atlas doors open here; `◈ bird's-eye` in the HUD returns to the map lenses at `/session/[id]`, `✦ voyage` in the session header goes the other way — the two views hold separate in-memory state, an accepted sandbox limitation). After AA's first real test exposed a discoverability failure, a **navigation pass** was added: forward-descending scene arc (everything reachable is visible), gaze guidance onto the next destination after each release, breathing cue halos, persistent arc hints, an on-screen compass (chevrons look; ◉ carries you onward), arrow-keys-look / W-sails / pinch-dolly, and an idle auto-voyage (7 s of stillness and the ship drifts toward the undiscovered; any input takes the helm back). Verified with real input only: full loop by clicks, by compass alone, and by pure idleness.

- **`lib/voyage/engine.ts`** — a dependency-free 3D engine on Canvas 2D: perspective projection (yaw/pitch camera), a sky sphere of stars + near-field dust for motion parallax, free flight (drag to look; W/↑/space or scroll to thrust; gentle auto-cruise), **gravity** (active bodies bend your path; get close and you're captured into orbit), click/tap-to-travel autopilot with eased gaze, an **escape/lift-off** on release (without it gravity instantly re-captures the body you just left), soft world bounds, adaptive quality (thins the sky if frames sag), and the **reveal**: a pull-back flight after arrival that draws the visited path — beacon → sun → worlds → gate — into one golden figure.
- **`lib/voyage/worlds.ts`** — procedural per-lineage world painters (symbolic geometry only, decision 7): Stoic square-in-circle, Buddhist eight-spoke wheel, Gītā flame petals, Christian light-beams, Sufi spiral of motes, Taoist watercourse, neuroscience axon filaments with travelling signals; the rejected parallel is an **ember mirage** — flickering, broken rings, a glitching double, no thread to the gate. Pre-rendered glow sprites (per-frame gradients are too slow).
- **`components/VoyageView.tsx`** — React shell: builds the scene from SessionData (seeded PRNG layout), syncs the session arc into target states (beacon → sun active after complaint → worlds surface after mechanism → gate ignites when practice unlocks), opens full-screen **chambers** in orbit (lineage wash + watermark + passage/reading/folds + voice + re-voiced ambience), and runs arrival (gate capture → `arrive()` → reveal → ArrivalOverlay with the Thread). Reduced motion: no drift, instant travel cuts, static orbits.
- The session arc is enforced exactly as in the maps: dim bodies are unclickable and exert no gravity until the arc surfaces them; the gate is sealed until an accepted parallel has landed.

### The atmosphere pass (2026-07-10) — what you fly through between stops

Queue item #1 after AA's sign-off (AA: "totally with you"), layered onto the navigation without touching it — all in `engine.ts`/`worlds.ts`, `VoyageView` unchanged:

- **Nebula fields** — four far nebulae fixed on the sky sphere (cool slate/violet/teal/dun gauze behind the stars) plus lineage-hued wisps anchored around each world (`nebulaSprite`: seeded blob-walk under a circular falloff mask, pre-rendered per color+seed). Dim worlds keep one ghost wisp at low alpha, so the "worlds have surfaced" beat also pours their atmosphere in.
- **Dust streams on the threads** — alongside the existing pulse, ~9 motes ride each live thread outward from the sun with a slow sine wander (a current, not beads). Allocation-free; the rejected world's broken thread carries nothing.
- **Worlds grow richer on approach** — a `detail` factor (0→1 with screen radius) resolves per-lineage structure (Stoic inner keep + watch-fires, Buddhist rim ticks + hub, Gītā brazier + rising sparks, Christian slanted beams + high lights, Sufi counter-turning arm, Taoist eddies, neuro synapse terminals) plus a generic tilted orbital band with two companions. The **mirage inverts it**: up close its ring gaps widen, the glitch-double shows more often, static slices the disc — it thins where real worlds deepen.
- **Per-lineage skyboxes** — nearing a world its air pours in: the backdrop tints toward the lineage hue, a wide `skySprite` wash floods the sky behind the stars, and the near-field dust breathes the same color (cached quantized tint strings — no per-frame gradient or string churn).
- **Perf discipline**: every gradient is a pre-rendered sprite; hot loops stay allocation-free; the adaptive quality drop now also thins wisps/streams/nebulae; a 3 s warm-up grace stops first-paint sag from permanently degrading the sky; the two flagged per-frame gradients (Christianity beams, gate pillar) moved to a shared soft-edged `beamSprite`. Under reduced motion the streams are skipped and world/atmosphere time is frozen (worlds previously kept rotating — fixed en route). Cost was gated on a headless A/B against the pre-atmosphere build, not a feeling — method and numbers in NOTES.md.

## The Retreat (photoreal valley pass — merged into `main`, AA on-device review still owed)

AA's direction (2026-07-13): another UI design — "a realistic wellness nature retreat experience… photo-realistic, 3D… as if the user is moving about this space," using voice, image, animation, and text together. Built as a **fifth presentation of the same session state machine** at **`/retreat/[id]`** (linked from the session header `⛰ retreat` and the Voyage HUD; Atlas doors still open the Voyage). Hand-rolled **WebGL** — raw browser API, `package.json` untouched.

The session as a *place*: you arrive at a **trailhead arch** (the complaint), walk a worn trail down to a **spring in the meadow** (the mechanism — every trail radiates from it, so all journeys pass through the mechanism, as on the maps), visit the **lineage sites** that wake around it (Stoic monolith + bench, Buddhist stone stack, Gītā flame plinth, Christian standing arch with light shaft, Sufi spiral terrace, Taoist mirror pool, a clean observation deck for the empirical frame — symbolic structures only, decision 7), pass the **dry hollow** (the rejected parallel: cracked basin, dead tree, an ember lantern that gutters — it *runs dry* where real sites deepen), and when a place has truly landed the **jetty lanterns** light and the walk ends over water. Arrival: dusk falls, the camera rises off the dock, and the walked figure glows below — then the standard ArrivalOverlay/Thread.

- **`lib/retreat/engine.ts`** — dependency-free WebGL world: procedural terrain heightfield (polar mesh, dense where you walk; spot pads flattened in; trails raised into causeways where they cross wet dips), atmospheric sky (sun/clouds/day-phase keyframes — the light leans from morning toward dusk as the session deepens), reflective lake + mirror pools (one sky function, rendered and reflected), billboard trees/grass painted onto canvas atlases at load, lantern point-lights + glow sprites (cue lanterns breathe; a soft column marks the arc's next destination), pollen/fireflies, first-person walk controller (drag/arrows look, tap-to-walk with ray-marched ground picking, WASD, trail-following autopilot with a stall watchdog, head bob + footfall events, tree collision, idle auto-walk after 10 s), 2D label overlay canvas (the Voyage's etched-label language), adaptive quality (two tiers: DPR 1.0, then 0.72 + grass/motes off), reduced-motion = instant cuts + frozen world time. View convention matches the Voyage (yaw 0 = +z, east on screen-right; face culling off — see `viewProj()` note).
- **`lib/retreat/nature.ts`** — generated outdoor soundscape (same contract as `ambience.ts`: gesture-start, off by default): valley wind with incommensurate gust LFOs + leaf shimmer, synthesized birdsong motifs at irregular intervals, lake water that swells near the shore (engine feeds proximity), faint footfalls on walk cadence; chamber tint = quiet lineage-interval pad + wind ceiling shift, birds hold their song while reading; dusk settles everything at arrival.
- **`components/RetreatView.tsx`** — mirrors VoyageView: same state machine, chambers (reusing `.vchamber` with a warm `retreat-chamber` glass), persistent stage-direction hints, gaze guidance after each release, compass (◉ = walk onward), sr-nav keyboard path, intro threshold, WebGL-unavailable fallback linking to the other presentations.
- Verified via Playwright: full loop by test hook, by **real clicks only**, by **compass alone** (390×844 touch), and by **keyboard sr-nav under reduced motion**; all three seed sessions lay out; zero console errors. Headless SwiftShader runs it at the lowest quality tier (~worst-case old phone); real-GPU/on-device feel is untested — same caveat as every pass.

### The character pass (2026-07-13, same branch — AA's five refinements)

AA's direction after first look ("beautifully done… a few things to change, refine, upgrade"): per-stop character, more world, text-as-experience, easier navigation/discovery, human voices. What was built:

- **Every site is its own experience.** Sound: each site carries a synthesized motif that crossfades in by proximity (`setSiteAtmos` — singing bowl at the stupa, fire + low drone at the flame plinth, organ swells in the chapel, breath-flute at the spiral, brook water at the mirror pool, stone hum in the fortress, sputtering ember at the hollow, brighter birdsong at the deck) — sound neighborhoods, never tracks. Sight/staging: the Stoic site is now a **ruined fortress with a dry moat** (the trail's causeway is the only bridge) and the passage is *carved on the stele*; the Christian site is a **roofless chapel** whose window pours the light shaft onto an altar; the stupa gains **prayer flags** and a **bodhi tree with the seat beneath it**; every site has a **seat** the camera settles into on capture, facing what that place faces (the spiral seats you at its exact center; the mirror pool sits you looking down into the water).
- **More world:** a **waterfall headland** on the west shore dropping braided white water straight into the lake (mist + foam + proximity-driven roar; visible across the water from the jetty), wildflower drifts + a flower ring around the spiral, benches on the trail and at the shore, a rocky crown on the headland.
- **The teaching arrives in its place's own way** (`StagedText`, passage-level): *typed* character-by-character with a caret (the empirical frame — and your own complaint at the trailhead), *carved* letter-by-letter small-caps on stone, *breath* phrase-by-phrase, *ember* words rising warm, *illuminated* with a golden drop cap, *turning* words, *welling* water-words (Taoism + the spring), and *guttering* for the rejected parallel — words that thin and flicker after landing. Tap the passage to let it all land at once; reduced motion gets plain text; each mode tints its chamber's reading surface (stone/parchment/ember/teal glass). Folds, readings, and the arrival flow unchanged.
- **Discovery/navigation:** floating **glyph medallions** above every awakened site (pre-rendered lineage seals on a sprite atlas — the Atlas's pulling-light language planted in the world; breathing while unvisited, dim once visited), labels readable to ~250 m for unvisited sites, bigger tap targets, and **light motes drifting along the trail toward the cue**. Tap-anywhere walking, site taps at range, compass, and idle-walk carry the back-and-forth.
- **Voices** (`lib/voice.ts`, benefits every surface): smarter voice selection (quality hints + gender pools from whatever the device offers), therapeutic pacing (sentence-by-sentence utterances — which also dodges Chrome's long-utterance cutoff), and a **register per lineage** — an older measured man for Stoicism, a warm woman for Buddhism, lighter and luminous for Christianity, etc. (`lineageSpeakStyle`). Explicitly an AA-directed amendment to the single-neutral-voice stance — *reading registers* only; decision 7 still bars personas/figures, so AA's "arriving to a teacher who reads to you" idea is implemented voice-forward (a place that reads aloud) with no person on any surface.

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

## The Door (`/door`, behind a flag) + `/api/naming`

The ratified cold start (locked decision 11), trialed inside the sandbox behind `lib/flags.ts` (`doorsEnabled`: on in dev, `NEXT_PUBLIC_DOORS=1` in prod). Client state machine with four stages: **door** ("Say it" textarea + browse link) → **naming** (2–3 curated recognition-line cards + "none of these") → **browse** (the ten pains; unmapped categories shown honestly as dim rows) → **crisis** (full-screen off-ramp, `components/CrisisOfframp.tsx`).

- `/api/naming` (the product's only server compute): POST free text → `{painCategory, candidateMechanismIds, crisisFlag, via}`. With `ANTHROPIC_API_KEY`: a small-model call with a schema-forced tool whose enums are the taxonomy — output re-validated server-side down to known IDs. Without a key (or on any model failure/timeout): the keyword heuristic in `lib/naming.ts`. **Trust boundary (§9.1): the route returns IDs only; every sentence the user reads is looked up from curated data (`data/naming.ts`).**
- Crisis detection is layered: local regex floor runs client-side *before any network call* (crisis text ideally never leaves the device), again server-side, and in the model call when a key exists. False positives land on a calm screen with a way back — that cost is accepted.
- Misses ("none of these" and no-match) log to `localStorage['uot.naming-misses.v1']` as taxonomy feedback; crisis text is never logged.
- `data/naming.ts` holds sandbox recognition lines + heuristic keywords for the three seed mechanisms — never-migrate draft content, retired when the gauntlet ships real lines.

## The Thread (arrival artifact)

`lib/thread.ts` mints ThreadData from the session + visit log (one cited line per visited lineage, accepted parallels only, first-per-lineage in visit order; convergence = payoff, sentence-capped; practice; date). `components/ThreadCard.tsx` renders it as a 720-wide SVG using literal fonts/colors (no CSS vars — the SVG is serialized standalone for export) with hand-rolled greedy text wrapping. "Save as image" rasterizes to a 2× PNG client-side (SVG → blob → Image → canvas → download). The constellation record already contains everything needed to re-mint a Thread, so no new persistence.

## The Registry (`registry/`)

The future backend source of truth, scaffolded per PRODUCT.md §9.2 (git is the CMS). `registry/schema/REGISTRY.md` is the contract; `npm run registry:check` (`scripts/registry-check.mjs`, no deps) validates it — citations resolve, rejected ⇒ reason, descents reach practice, rights present, admission-rule structure, caps; `-- --self-test` proves the validator against 13 fixture mutations. `registry/drafts/` holds Admission Gauntlet candidates awaiting AA's kill-pass (Anxiety drafted). Taxonomy is empty until the Phase 1 gauntlet runs; sandbox `/data` content never migrates in.

## Geometries

- **Radial** (`RadialGeometry` / `radialLayout`): complaint at center; mechanism drawn as a thin ring around it (everything routes through mechanism); parallels at mid radius spread by angle, colored by lineage; deepenings further out on the same spoke; outermost dashed circle = practice edge, clickable when unlocked. Depth = literal radius.
- **River** (`RiverGeometry` / `riverLayout`): complaint + mechanism at left source; one stream per parallel flowing right, drifting toward neighbors mid-stream; accepted streams reconverge into a single practice pool at right; the rejected stream is dashed and dries up before the pool (dead-end terminator).
- **Descent** (`DescentGeometry` / `descentLayout`): vertical strata bands darkening with depth; complaint at surface, mechanism stratum below, one stratum row per parallel (rejected as an offset pocket), practice at bedrock; a central shaft line ties the dig together. Has two layouts (desktop-wide vs compact-portrait, chosen via `useCompact()`) — the only geometry that does, because a wide horizontal pit doesn't fit a phone's width the way the other two adapt by panning.

## Motion (all killed by `prefers-reduced-motion`)

The next node in the excavation arc (complaint → mechanism → practice) breathes with a slow cue-ring pulse; visited nodes glow; edges/streams draw themselves in on reveal; the unlocked practice edge slowly rotates its dashes; a faint aurora gradient drifts behind the map; the arrival overlay reveals in stages (eyebrow → payoff → practice → footer). None of this is a progression mechanic — it's atmosphere on top of a session that still only has one exit (arrival). Checked against CLAUDE.md decision 6 before adding.

## File structure

```
registry/                      — the Truth Registry scaffold (see its README.md)
  taxonomy.json                — empty until the Phase 1 gauntlet
  schema/REGISTRY.md           — field-by-field contract
  drafts/anxiety-gauntlet.md   — candidates awaiting AA's kill-pass
  passages/ parallels/ practices/ descents/
scripts/
  registry-check.mjs           — npm run registry:check (+ --self-test)
data/
  SCHEMA.md                    — documented schema (Registry node-shape prototype; deliverable)
  naming.ts                    — Door recognition lines + heuristic keywords (sandbox, never migrates)
  sessions/
    anxiety-first-date.json    (carries the one alternatePractices example)
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
  voyage/engine.ts             — first-person Canvas-3D flight engine (no deps) + atmosphere layers
  voyage/worlds.ts             — per-lineage world painters + glow/nebula/sky/beam sprites
  retreat/engine.ts            — first-person WebGL valley (terrain/sky/water/trees/walk/lanterns)
  retreat/nature.ts            — generated outdoor soundscape (wind/birds/water/footfalls)
  flags.ts                     — doorsEnabled
  naming.ts                    — crisis floor, heuristic classifier, miss log (isomorphic)
  thread.ts                    — mintThread, wrapText, exportSvgAsPng
components/
  VoyageView.tsx               — voyage shell: scene, chambers, HUD, arrival
  RetreatView.tsx              — retreat shell: valley, chambers, hints, compass, arrival
  Starfield.tsx                — canvas night sky (twinkle, parallax, rare meteor)
  LineageGlyph.tsx             — stroke-only lineage seals (HTML svg + in-SVG variants)
  AtlasHome.tsx                — the Atlas: sky, constellations, doors, door-pass transition
  MapViewport.tsx              — shared camera: pan/zoom/focus/approach for all geometries
  SessionView.tsx              — client shell: threshold, header, lenses, camera, sheet, arrival
  NodePanel.tsx                — detail content for selected node (pills + folds + chamber)
  ArrivalOverlay.tsx           — star-birth → payoff → practice (+ "another way" fold) → the Thread
  Fold.tsx                     — shared collapse/expand (panel + arrival)
  ThreadCard.tsx               — the Thread as standalone-exportable SVG
  CrisisOfframp.tsx            — full-screen resources page
  geometries/
    common.tsx                 — MapNode (star nodes), Flow, GeometryProps, MapLayout, useCompact()
    RadialGeometry.tsx          (+ radialLayout)
    RiverGeometry.tsx           (+ riverLayout)
    DescentGeometry.tsx         (+ descentLayout)
app/
  layout.tsx, globals.css
  page.tsx                     — renders the Atlas (+ Door entry when flagged on)
  door/page.tsx                — the Door (flag-gated)
  api/naming/route.ts          — classification endpoint (the only server compute)
  voyage/[id]/page.tsx         — the Voyage (SSG; Atlas doors open here)
  retreat/[id]/page.tsx        — the Retreat (SSG; linked from session header + Voyage HUD)
  session/[id]/page.tsx        — statically generated session view
```

## Schema (prototype of Registry node shape — see data/SCHEMA.md for full doc)

Session: `id, painCategory (fixed 10), surfaceComplaint, complaintBody, mechanism {id, name, provisional, description}, parallels[], payoff, practice {id, name, steps[]}, alternatePractices[]? (≤2, behind arrival's "another way" fold — decision 12)`.
Parallel: `id, lineage (fixed enum), status: accepted|rejected, title, source {work, author, locus}, passage, reading, deepening? {id, title, body}, rejectionReason?` (required iff rejected). Mechanism IDs are namespaced `mech.*` and marked provisional — the real mechanism taxonomy doesn't exist yet.

## Deployment

Vercel project `uo-t`, connected to this repo's `main` branch — every push to `main` triggers a production build automatically (this is Vercel's git integration, not something this codebase configures). Production: **https://uo-t.vercel.app**. `vercel.json` pins the framework preset to `nextjs` (auto-detection previously came back null and mis-built as a static site). No preview-branch workflow is set up; all shipped work currently lands on `main` directly per AA's review pattern so far — confirm with AA before assuming that's still wanted if this changes.

**Current branch state (2026-07-12):** `main` now includes the atmosphere pass (merged from `claude/atmosphere-interactive-elements-oa2to9`) and has auto-deployed to production. That merge was done at AA's request to give a fresh planning session the full current context — **not** because the atmosphere pass passed review. AA's visual/on-device verdict on it is still outstanding; if it needs changes, they land as new work on `main`, not a revert of a branch. No other branches carry unmerged work.

## Build order (historical — first build; kept for reference)

1. PLAN.md, scaffold (package.json, tsconfig, app shell), `npm install`
2. Schema doc + three seed sessions
3. types / sessions / state / constellation / lineage libs
4. SessionView + NodePanel + ArrivalOverlay
5. Three geometry components
6. Styling pass (contemplative map: dark, spacious, slow transitions)
7. `npm run build`, drive it in a browser, screenshot each geometry, fix, commit, push

Subsequent passes (mobile adaptation, then the map-engine/sheet/voice product pass) are logged in NOTES.md, not repeated here.
