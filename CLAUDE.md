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
6. **No engagement-loop gamification.** No streaks, points, badges, variable rewards, infinite feeds. Contemplative visual interactivity (atmosphere, smooth transitions, exploration) is encouraged. Architecture may leave room for lightweight progression signals later but none are built now. Flag it if dopamine-loop design creeps in.
7. **No personified guru/avatar/authority figures** on any surface. Contradicts the mechanism-first thesis (reintroduces authority-by-person). Symbolic/atmospheric imagery only.
8. **Aesthetic: contemplative map.** Dark, spacious, unhurried. Not a dashboard, not a game.
9. **Practice is not optional.** The framework ends in Practice; every session dataset and every geometry must terminate there, even if MVP practice content is thin.

## Current MVP scope (architecture sandbox)

Goal: let AA *feel* the core session loop and compare three within-session navigation geometries on identical content:
- **Bounded radial** — pain at center, parallels radial by lineage, depth = radius, outer ring = practice edge.
- **Braided river** — left-to-right lineage streams that can drift near each other (cross-tradition serendipity) but reconverge into one practice pool.
- **Descent strata** — vertical excavation: complaint → mechanism → parallels → practice.

Shared session state and data model; only the rendering layer varies. Geometry switcher for comparison. This is a sandbox for AA (the only user), not a polished consumer app.

## Data / schema

- Seed content: 2–3 hardcoded sessions as JSON in `/data` with documented schema. The schema prototypes the future Registry node shape — treat it as a deliverable.
- Each session: surface complaint, pain category, named mechanism, ≥3 parallels from ≥3 distinct lineages (one empirical/neuroscience frame mandatory), ≥1 rejected parallel, a practice.
- **10 pain categories (fixed taxonomy):** Anxiety, Burnout, Meaning Crisis, Identity Confusion, Decision Paralysis, Relationship Suffering, Anger and Reactivity, Grief and Loss, Shame and Self-Judgment, Disconnection.
- 9 lineage families in the broader system; MVP seed can use: Stoicism, Buddhism, Hindu/Gītā, Christianity, Sufism, Taoism, neuroscience/psychology.
- **Sandbox content is NOT Registry content.** Seed JSON here is generated for geometry testing and has not passed Tier 1 translation / rejected-parallel discipline. Never migrate it into the Truth Registry.

## Known open problems (unsolved, don't pretend otherwise)

- **Cold start:** how the user's pain point gets named at session start (free text? category picker? guided intake?). MVP can use a simple picker; flag that this is provisional.
- **Practice granularity:** single mandatory practice per session vs small menu at the boundary — undecided; affects whether mechanism→practice maps 1:1 or 1:many.
- **Mechanism taxonomy** — the shared spine under retrieval, personalization, and Constellation — does not exist yet. It is the critical next artifact after this sandbox. Don't invent one casually; the seed sessions may name mechanisms ad hoc but mark them as provisional.

## How to work with AA

- Direct, zero sycophancy, no praise-first framing. State a view, defend it, update on good counter-arguments. Accuracy over agreeableness — but pushback must be precise, not reflexive.
- Co-founder posture, not vendor. Form opinions; recommend, don't survey.
- Simplest thing that works. No speculative abstractions, no features beyond spec.
- AA reviews visually — prefer running prototypes over prose descriptions of what they'd look like.
- Do not deploy to Vercel or push to remotes without being asked.

## Stack

Next.js, deployed on Vercel (deployment manual/on-request only). Static JSON data. No backend, no database, no auth in this MVP.
