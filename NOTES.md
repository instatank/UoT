# NOTES — running log

Working notes: corrections and confirmed approaches. PLAN.md has the architecture; data/SCHEMA.md has the schema.

## Confirmed approaches

- **One state machine, three views** works as intended: exploration state (visited nodes, unlock, selection) lives in `lib/state.ts`; geometry components are stateless renderers, so switching geometry mid-session preserves progress. Verified in-browser: visited a parallel in radial, switched to river and descent, state carried over, arrival fired from descent.
- **Rejected parallels never deepen** — encoded in schema (no `deepening` on rejected), and each geometry expresses the dead end natively: radial rejected spoke never reaches the practice edge, river's rejected stream "runs dry" before the pool, descent puts it in an offset pocket off the shaft. This is a design decision, not an omission.
- **Practice unlock rule**: mechanism revealed + ≥1 *accepted* parallel visited. Visiting only the rejected parallel does not unlock practice — rejection is real exploration (it's recorded in `lineagePath`) but can't be the payoff.
- **Constellation record shape verified** end-to-end: arrival writes `{sessionId, painCategory, mechanismId, lineagePath, practiceId, completedAt}` to `localStorage['uot.constellation.v1']`; `lineagePath` is ordered and includes rejected visits.
- All three seed sessions carry 5 parallels (4 accepted across ≥4 lineages incl. one empirical, 1 rejected). Geometry layout math assumes nothing about N except spreading evenly, but labels were only visually tuned at N=5 — if a session ever has 7+, expect label collisions.

## Mobile adaptation (portrait phones, ≤768px)

Decisions, each reasoned from the geometry's shape — not a shrink-to-fit:

- **Shell**: detail panel becomes a **bottom sheet** (rises on node selection, max 56dvh, tap the handle to tuck it, "detail ↑" pill to bring it back). Header wraps to two rows; the geometry switcher gets a full-width row of ≥44px buttons. Map fills the rest of the screen.
- **Radial — pan + auto-center, not shrink.** The full 800×800 map renders at 1:1 label scale inside a natively scrollable container (both axes); on entry it centers on the complaint, and each selection pans gently so the selected node sits in the band the sheet doesn't cover. Depth-as-radius stays literal and legible; the whole field is reachable by thumb pan. Chose native scroll over custom pinch-zoom: momentum and feel come free, zero gesture code.
- **River — stays horizontal; swipe along the river.** Considered rotating the metaphor vertical for portrait, rejected: Descent already owns the vertical axis, and the sandbox exists to compare geometries — two vertical flows would blur exactly the distinction being tested. Left→right is also load-bearing (source → reconvergence into the pool). The 1000×640 canvas renders near 1:1 and you swipe downstream. Flag for AA: this is my call, provisional until AA feels it (CLAUDE.md update only if confirmed as standing).
- **Descent — compact portrait strata.** Only geometry with a second layout: a 430-wide viewBox variant (same structure — shaft, alternating dig sides, rejected pocket, bedrock) that fits the viewport width exactly, so the only axis is down. Rows are taller (148 vs 80) and deepenings step *inward* toward the shaft (no room outward); rejected labels go below instead of right. ~2 screens of vertical travel to bedrock — scroll is the dig, no snap points, no feed mechanics.
- **Touch targets**: every MapNode gets an invisible hit circle (min r=26 SVG units ≈ ≥44px at rendered scales); the radial practice ring's transparent hit stroke widened 18→44. No functionality was hover-only (hover effects are cosmetic), so nothing needed a tap equivalent.
- **Safe areas**: `viewport-fit=cover` + `env(safe-area-inset-*)` on header, sheet bottom, arrival overlay, home.

Lessons:

- **Scroll room under the sheet**: with the sheet open, the map's natural scroll range ends with bottom content (practice at bedrock!) still hidden behind the sheet — caught because the Playwright tap on practice landed on the sheet. Fix: `margin-bottom: 58dvh` on the svg while the sheet is open, so any node can be panned above the sheet and tapped.
- The compact/desktop split in DescentGeometry is a `useCompact()` matchMedia hook (in `geometries/common.tsx`, breakpoint shared with SessionView's pan logic as `MOBILE_QUERY`). It initializes false to match the SSG'd desktop markup and corrects after hydration — a one-frame desktop-layout flash on phones is the accepted cost.
- Verified with Playwright (Chromium) at 390×844 and 360×780: full session loop to arrival in all three geometries, no horizontal page overflow, sheet/peek cycle, desktop 1440×900 regression. **Not verified on a real device**: iOS Safari dvh-vs-toolbar behavior, actual safe-area insets on a notched phone, momentum-scroll feel, backdrop-filter performance.

## Product pass (post-mobile feedback from AA)

AA's critique of the first mobile pass: maps too static, text overlay basic/cut-off, too texty, wants pills/collapse-expand as the app's UI language, wants a voice option. What changed:

- **Map engine** (`components/MapViewport.tsx`): all three geometries now render into a shared camera — pinch-zoom, drag-pan with momentum, wheel/trackpad zoom, double-tap zoom, zoom/fit controls, and animated focus (selection glides into the band above the sheet). Geometries became pure SVG content + a `layout()` export (canvas size + node positions) so the camera can find any node. No dependency added; pointer events + rAF.
- **Staged detail sheet**: peek (title strip) / half / full, draggable by the grip with velocity snapping, grip-tap toggles half↔full, background tap drops to peek. At full, the map sinks (dim + slight scale) behind the expanded text — reading mode. Desktop keeps the right column, same content components.
- **Pills + folds as the UI language**: every node detail leads with a pill row (kind, lineage-colored, ≉ rejected in ember, ▷ listen); commentary ("the reading") is collapsed by default; the rejection reason is an *open* ember fold (the moat stays foregrounded); practice steps render as numbered cards. Home cards got lineage-dot previews (rejected = dashed ember ring).
- **Motion with restraint**: the next node in the arc breathes (complaint → mechanism → practice); visited nodes glow; edges draw themselves in; the unlocked practice edge slowly rotates its dashes; a faint aurora drifts behind the map; arrival reveals in stages. All killed by `prefers-reduced-motion`. No streaks/points/variable rewards — checked against the engagement-loop ban; the only "reward" surface is arrival itself, which was already the design.
- **Sound, both optional and off by default**: ▷ listen reads any node (Web Speech API, calm settings, deliberately *neutral system voice* — a reading voice, not a persona, per the no-guru decision); ♪ in the header starts a generated WebAudio drone (two soft partials + slow-breathing filter, no assets, no loop points, autoplay-safe). Voice quality varies by device — iOS voices are decent, Android varies; revisit with recorded audio only if AA wants a real voice product.
- **Fixed en route**: the radial practice ring's 44px invisible hit stroke let a stray background tap trigger *arrival* (and write a constellation record) — caught by an automated tap test. Hit stroke tightened; all decorative SVG (strata rects, rings, streams, edges) made `pointer-events: none` so background taps are predictable.

Verified via Playwright at 390×844 (full loop to arrival across all three geometries, sheet states, folds, background-tap behavior, zoom controls, no page errors) and 1440×900 (right-column panel, wheel zoom, drag-pan with click suppression, empty state). Still device-untested: real pinch feel, iOS voice quality, ambience level on phone speakers.

## Ratification pass (2026-07-06): registry, Door, one-practice arrival, Thread

AA ratified PRODUCT.md §6/§8.1/§8.2/§8.3 ("my response to proposals 6, 8.1, 8.2, 8.3 is yes"); verdicts folded into CLAUDE.md as locked decisions 10–13, then the three "buildable immediately" items were built in the plan's order, plus the §8.2 arrival change:

- **Registry scaffold** (`registry/` + `npm run registry:check`): validator is dependency-free Node with a `--self-test` that mutates a fixture registry 13 ways and asserts each rule fires — chosen over testing against the live registry because the live registry is legitimately empty until the gauntlet runs. The Anxiety gauntlet draft (8 candidates) deliberately includes weak-attestation candidates (#4, #6) — the kill-pass demonstrating rejection is part of calibrating the process. The seed session's fused mechanism enters as two candidates (#1 rehearsal, #8 the watcher split).
- **The Door**: crisis floor runs *client-side before the network call* — crisis text should ideally never leave the device, and the off-ramp must work offline. The classifier is isomorphic (`lib/naming.ts`) so the API route and the client fallback share one implementation; the model path (schema-forced tool call, enum-constrained, revalidated server-side) engages only when `ANTHROPIC_API_KEY` is set. Wire note: no key is configured in this environment yet, so the deployed Door runs on the heuristic until AA adds the key in Vercel env settings.
- **Heuristic gotcha fixed en route**: plain substring keyword matching false-positived — "presentation" contains "resent" and pulled the anger mechanism into anxiety intakes. Keywords now match at a word-boundary start (suffix growth still allowed: "rehears" → "rehearsing"). Caught by curling the API with test intakes.
- **One-practice arrival (decision 12)**: `alternatePractices` (≤2) on SessionData; arrival + practice panel render the default plus a closed "another way" fold. Voice deliberately reads only the default practice — reading a menu aloud at the moment of surrender would contradict the single-landing intent, a knowing exception to "listen reads everything including folds."
- **The Thread**: SVG with literal fonts/hex colors because export serializes it as a standalone document where page CSS (and CSS variables) don't exist. Text wrapping is greedy char-count estimation (Georgia ≈0.5em budget, sans 0.62) — measured against a rendered card; cites wrap too (empirical citations run long). Export rasterizes at 2× via canvas; verified an actual PNG downloads with correct content.
- Verified via Playwright (Chromium): desktop 1440×900 — home Door entry → Door → naming (2 candidates on a mixed anxiety/burnout intake) → picked line routes into the session → full radial loop visiting 4 lineages → arrival with working "another way" fold → Thread card → PNG download; none-of-these logs a miss; grief text yields category-only classification with honest "not yet mapped" browse (3 linked, 7 dim rows). Mobile 390×844 — crisis off-ramp (client-side, network-independent) and back, browse list. Zero page errors. Screenshot timing lesson: `riseIn … both` animations mean screenshots need ~1.7s settle or elements are still at opacity 0.

## Corrections that mattered

- SVG node labels have `pointer-events: none` (so text never steals clicks) — any browser automation must click the `circle.core` inside `g.mnode`, not the label text. Also `wrapLabel` splits labels across separate `<text>` elements, so Playwright `hasText` across a wrapped phrase fails (textContent concatenates without spaces); match on a single word.
- MapNode label blocks: when the label sits *below* a node, the leading sublabel needs the block shifted down one line-height or it overlaps the circle. Radial deepening labels on horizontal spokes must go `above` their node — the parallel's label already owns that side.
- Label wrap is 18 chars × max 3 lines; longer node titles get silently truncated on the map (panel always shows the full title). Keep `title` fields ≤ ~45 chars.

## Environment (for future sessions in this container setup)

- Playwright is installed globally: run scripts with `NODE_PATH=/opt/node22/lib/node_modules`; Chromium is preinstalled (no `playwright install`).
- To kill a dev/prod server, use `fuser -k <port>/tcp` — `pkill -f next` matches the invoking shell's own command line and kills the session shell (exit 144).
