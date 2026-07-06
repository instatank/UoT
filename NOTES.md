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

## Corrections that mattered

- SVG node labels have `pointer-events: none` (so text never steals clicks) — any browser automation must click the `circle.core` inside `g.mnode`, not the label text. Also `wrapLabel` splits labels across separate `<text>` elements, so Playwright `hasText` across a wrapped phrase fails (textContent concatenates without spaces); match on a single word.
- MapNode label blocks: when the label sits *below* a node, the leading sublabel needs the block shifted down one line-height or it overlaps the circle. Radial deepening labels on horizontal spokes must go `above` their node — the parallel's label already owns that side.
- Label wrap is 18 chars × max 3 lines; longer node titles get silently truncated on the map (panel always shows the full title). Keep `title` fields ≤ ~45 chars.

## Environment (for future sessions in this container setup)

- Playwright is installed globally: run scripts with `NODE_PATH=/opt/node22/lib/node_modules`; Chromium is preinstalled (no `playwright install`).
- To kill a dev/prod server, use `fuser -k <port>/tcp` — `pkill -f next` matches the invoking shell's own command line and kills the session shell (exit 144).
