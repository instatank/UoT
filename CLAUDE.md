# CLAUDE.md — Truth Unites

Read this fully before any work. It encodes decisions made across months of product sessions. Do not re-litigate locked decisions; do flag genuine contradictions.

## What this project is

Truth Unites is a personal spiritual wisdom app built by AA (solo founder, non-engineer, vibe-codes via Claude Code, deploys Next.js on Vercel). It applies the **Pain → Parallels → Payoff → Practice** framework: a user's pain point is mapped to a precise psychological mechanism, then illuminated through parallels from multiple wisdom traditions plus science, resolving into a concrete practice.

Parent project: **Unity of Truths (UoT)** — thesis: all major wisdom traditions (Hinduism, Buddhism, Christianity, Islam/Sufism, Stoicism, Taoism) plus neuroscience, evolutionary biology, and depth psychology describe the same underlying mechanisms of human suffering and transformation. Tagline: "Recognition, not argument." Voice: sharp warm friend — precise, practical, modern, never preachy.

Backend source of truth (future): the **Truth Registry** — a curated database of mechanism-tagged passages from Tier 1 (philologically rigorous) translations. Not wired into this MVP; MVP uses static JSON that prototypes the Registry node shape.

## Locked decisions — do not revisit

1. **Mechanism-first, never tradition-first.** Pain → named mechanism → parallels. Traditions are exhibits of mechanisms, not the organizing structure. Schema and retrieval route through `mechanism`.
2. **Rejected parallels are first-class.** The product's moat is stored *judgment* — especially near-parallels that look right but don't hold ("this resembles the Stoic point but isn't, because…"). LLMs can synthesize accepted parallels on demand; they can't replicate curated rejection. UI must be able to surface rejected parallels as visually distinct nodes.
3. **Session geometry: Descent** (excavation arc: surface complaint → mechanism → parallels → practice) governs the single-session flow. Within-session branching navigation lives *inside* Descent.
4. **Constellation = cross-session memory layer only.** A star-field of everything explored over time; sessions light new stars. NOT a within-session navigation model. Out of MVP scope except a persistence stub (session record: pain category, mechanism, lineage path, practice reached).
5. **Every session reaches an arrival state.** No unbounded branching. Depth resolves into practice. The test distinguishing contemplative exploration from an engagement loop: does depth ever resolve into arrival, or just keep branching? If no arrival, it's a loop — banned.
6. **No engagement-loop gamification.** No streaks, points, badges, variable rewards, infinite feeds. Contemplative visual interactivity (atmosphere, smooth transitions, exploration) is encouraged. Architecture may leave room for lightweight progression signals later but none are built now. Flag it if dopamine-loop design creeps in. (Map motion — breathing cues, glow, self-drawing edges, ambient sound — was checked against this before being added; the only "reward" surface remains arrival itself.)
7. **No personified guru/avatar/authority figures** on any surface. Contradicts the mechanism-first thesis (reintroduces authority-by-person). Symbolic/atmospheric imagery only. (The optional voice-narration feature uses a neutral system reading voice, not a character/persona voice — this was a deliberate choice to stay compliant with this decision, not an oversight. If AA wants a "real" voice product later, that's a content/product decision to revisit explicitly, not a default to slide into.)
8. **Aesthetic: contemplative map.** Dark, spacious, unhurried. Not a dashboard, not a game.
9. **Practice is not optional.** The framework ends in Practice; every session dataset and every geometry must terminate there, even if MVP practice content is thin.
10. **Geometry homes (ratified 2026-07-06, PRODUCT.md §6).** The three geometries don't compete — each has a home: **Descent strata = the session spine**, **bounded radial = the Constellation** (cross-session star-field), **braided river = the Convergence stage and the public Atlas graphic**. Nothing built gets deleted; the sandbox is the component library of the real product. The in-product geometry switcher dies in Phase 3 but survives at a `/lab` URL.
11. **Cold start = the Two Doors + crisis off-ramp (ratified 2026-07-06, PRODUCT.md §8.1).** Way in #1: "Say it" — one quiet free-text box, the user's own words. Way in #2: the ten pains as a browse list. The runtime LLM's only job is classification into the fixed taxonomy — `{painCategory, candidateMechanismIds[2–3], crisisFlag}` — never generation (trust boundary, PRODUCT.md §9.1: *the LLM shapes the journey; only the Registry speaks*). "None of these" is always present and falls back to browsing; every miss is logged (anonymously, locally at first) as taxonomy feedback. The **crisis off-ramp ships day one of intake** — acute-danger signals bypass the Descent and land on a calm full-screen resources page. The Door never asks who you are or what you believe.
12. **Practice granularity (ratified 2026-07-06, PRODUCT.md §8.2).** Data: mechanism → practices is **1:many** in the Registry. Experience: arrival presents **exactly one** default practice with a closed *"another way"* fold holding 1–2 alternates — never a menu at the moment of surrender. Which practice is default is editorial at first, Echo-informed later.
13. **Mechanism taxonomy via the Admission Gauntlet (ratified 2026-07-06, PRODUCT.md §8.3).** A mechanism earns a slot only if: ≥3 independent lineages attest it (with candidate passages), ≥1 empirical frame exists, it names a *moving part* not a theme, and it stings in first person (2–3 recognition lines AA feels somatically). Naming: plain modern English, ≤6 words, no Sanskrit/Greek/Pali/Latin, no DSM borrowings. Structure: two levels — 10 pain categories → 3–6 mechanisms each; 30–45 target in v0.1, hard cap 60; many-to-many allowed but flagged at 4+ categories. Everything ships `provisional: true`, hardened only by Naming hit-rates. Tensions (genuine cross-tradition disagreements) are recorded from day one.

## Current MVP scope (architecture sandbox)

Goal: let AA *feel* the core session loop and compare three within-session navigation geometries on identical content:
- **Bounded radial** — pain at center, parallels radial by lineage, depth = radius, outer ring = practice edge.
- **Braided river** — left-to-right lineage streams that can drift near each other (cross-tradition serendipity) but reconverge into one practice pool.
- **Descent strata** — vertical excavation: complaint → mechanism → parallels → practice.

Shared session state and data model; only the rendering layer varies. Geometry switcher for comparison. This is a sandbox for AA (the only user), not a polished consumer app — but AA's judgment of which geometry wins depends on the maps feeling like a real, live product rather than a static wireframe, so build quality (motion, responsiveness, interaction feel) matters even though the user count is one. See PLAN.md for current architecture (map camera engine, staged detail sheet, voice/ambience) and NOTES.md for the build log and rationale behind specific calls.

**Status as of the latest pass:** mobile-responsive (all three geometries adapted for portrait phones, not shrunk), plus a product pass adding a pan/zoom/pinch map camera, a staged (peek/half/full) detail sheet with pill-and-fold content instead of prose walls, optional per-node voice narration, and an optional generated ambient sound bed. Deployed to production at **https://uo-t.vercel.app** (auto-deploys from `main` via Vercel's git integration). **Ratification pass (2026-07-06, on branch `claude/unity-truths-plan-review-i0cvea`):** PRODUCT.md §6/§8.1/§8.2/§8.3 ratified and folded in as decisions 10–13; built: the `registry/` scaffold + `npm run registry:check` + Anxiety gauntlet drafts, the Door (`/door`, flag-gated) with `/api/naming` and the crisis off-ramp, one-practice arrival with the "another way" fold, and the Thread card (minted at arrival, exportable as PNG). Not yet merged to `main`/production.

## Data / schema

- Seed content: 2–3 hardcoded sessions as JSON in `/data` with documented schema. The schema prototypes the future Registry node shape — treat it as a deliverable.
- Each session: surface complaint, pain category, named mechanism, ≥3 parallels from ≥3 distinct lineages (one empirical/neuroscience frame mandatory), ≥1 rejected parallel, a practice.
- **10 pain categories (fixed taxonomy):** Anxiety, Burnout, Meaning Crisis, Identity Confusion, Decision Paralysis, Relationship Suffering, Anger and Reactivity, Grief and Loss, Shame and Self-Judgment, Disconnection.
- 9 lineage families in the broader system; MVP seed can use: Stoicism, Buddhism, Hindu/Gītā, Christianity, Sufism, Taoism, neuroscience/psychology.
- **Sandbox content is NOT Registry content.** Seed JSON here is generated for geometry testing and has not passed Tier 1 translation / rejected-parallel discipline. Never migrate it into the Truth Registry.

## Open problems — status after the 2026-07-06 ratification

The three long-standing open problems are **resolved as decisions** (locked decisions 11–13 above; detail in PRODUCT.md §8, which is now the product roadmap). What remains genuinely open:

- **The taxonomy artifact itself does not exist yet.** The Admission Gauntlet (decision 13) is the locked *process*; the content is Phase 1 work requiring AA's kill-pass. Candidate drafts live in `registry/drafts/` — they are drafts, not admitted mechanisms, until AA runs the recognition test on himself. Seed-session mechanism IDs remain ad hoc and provisional.
- **Phase gates and business model** (PRODUCT.md §10, §12) have not been ruled on — still proposals.

## How to work with AA

- Direct, zero sycophancy, no praise-first framing. State a view, defend it, update on good counter-arguments. Accuracy over agreeableness — but pushback must be precise, not reflexive.
- Co-founder posture, not vendor. Form opinions; recommend, don't survey.
- Simplest thing that works. No speculative abstractions, no features beyond spec.
- AA reviews visually — prefer running prototypes over prose descriptions of what they'd look like.
- Do not deploy to Vercel or push to remotes without being asked. **This still holds** — recent pushes straight to `main` (which auto-deploys) happened because AA explicitly asked for them each time (e.g. "push to production"), not because this rule relaxed. Don't treat that history as standing permission to push unprompted.

## Stack

Next.js, deployed on Vercel. Static JSON data. No database, no auth in this MVP; server compute is exactly one API route — `/api/naming`, the ratified classification endpoint (PRODUCT.md §9.3), which degrades to a local keyword heuristic when no `ANTHROPIC_API_KEY` is configured. No runtime dependencies beyond next/react — map pan/zoom is hand-rolled pointer events, voice narration uses the browser's Web Speech API, ambient sound is generated with WebAudio (no audio assets, no third-party audio library), the Thread card is hand-rolled SVG→PNG.

**Note on deployment cadence:** earlier guidance here said deploys were manual/on-request. In practice, Vercel's git integration is wired to auto-deploy every push to `main`, and recent work has been pushed straight to `main` and gone live without a separate "deploy" step or explicit ask each time. If this project should move to a staged/preview-then-promote flow instead, that needs an explicit decision with AA — don't assume the auto-deploy wiring should be left as-is or removed without asking.
