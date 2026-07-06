# NOTES — running log

Working notes: corrections and confirmed approaches. PLAN.md has the architecture; data/SCHEMA.md has the schema.

## Confirmed approaches

- **One state machine, three views** works as intended: exploration state (visited nodes, unlock, selection) lives in `lib/state.ts`; geometry components are stateless renderers, so switching geometry mid-session preserves progress. Verified in-browser: visited a parallel in radial, switched to river and descent, state carried over, arrival fired from descent.
- **Rejected parallels never deepen** — encoded in schema (no `deepening` on rejected), and each geometry expresses the dead end natively: radial rejected spoke never reaches the practice edge, river's rejected stream "runs dry" before the pool, descent puts it in an offset pocket off the shaft. This is a design decision, not an omission.
- **Practice unlock rule**: mechanism revealed + ≥1 *accepted* parallel visited. Visiting only the rejected parallel does not unlock practice — rejection is real exploration (it's recorded in `lineagePath`) but can't be the payoff.
- **Constellation record shape verified** end-to-end: arrival writes `{sessionId, painCategory, mechanismId, lineagePath, practiceId, completedAt}` to `localStorage['uot.constellation.v1']`; `lineagePath` is ordered and includes rejected visits.
- All three seed sessions carry 5 parallels (4 accepted across ≥4 lineages incl. one empirical, 1 rejected). Geometry layout math assumes nothing about N except spreading evenly, but labels were only visually tuned at N=5 — if a session ever has 7+, expect label collisions.

## Corrections that mattered

- SVG node labels have `pointer-events: none` (so text never steals clicks) — any browser automation must click the `circle.core` inside `g.mnode`, not the label text. Also `wrapLabel` splits labels across separate `<text>` elements, so Playwright `hasText` across a wrapped phrase fails (textContent concatenates without spaces); match on a single word.
- MapNode label blocks: when the label sits *below* a node, the leading sublabel needs the block shifted down one line-height or it overlaps the circle. Radial deepening labels on horizontal spokes must go `above` their node — the parallel's label already owns that side.
- Label wrap is 18 chars × max 3 lines; longer node titles get silently truncated on the map (panel always shows the full title). Keep `title` fields ≤ ~45 chars.

## Environment (for future sessions in this container setup)

- Playwright is installed globally: run scripts with `NODE_PATH=/opt/node22/lib/node_modules`; Chromium is preinstalled (no `playwright install`).
- To kill a dev/prod server, use `fuser -k <port>/tcp` — `pkill -f next` matches the invoking shell's own command line and kills the session shell (exit 144).
