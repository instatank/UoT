# Truth Unites — geometry sandbox

An architecture sandbox for **Truth Unites** (part of the parent **Unity of Truths** project): one Pain → Parallels → Payoff → Practice session, rendered in three switchable within-session navigation geometries (bounded radial, braided river, descent strata), so the founder can feel and compare them on identical content.

**Start here if you're picking this up fresh:**

- **`CLAUDE.md`** — product decisions, locked constraints, and how to work with the founder (AA). Read this first; it overrides default assumptions.
- **`PLAN.md`** — current architecture: the map camera engine, session state model, detail sheet, voice/ambience, file structure.
- **`NOTES.md`** — running build log: what changed in each pass, why, lessons learned, gotchas for testing.
- **`data/SCHEMA.md`** — the session/parallel data schema (a prototype of the future Truth Registry node shape).

## Run locally

```bash
npm install
npm run dev       # http://localhost:3000
```

```bash
npm run build && npm run start   # production build, for parity testing before deploy
```

No environment variables, no database, no auth — everything is static JSON in `/data`.

## Deployment

Vercel project `uo-t`, auto-deploys on every push to `main`. Production: **https://uo-t.vercel.app**. Do not push to `main` (or any remote) without being explicitly asked — see CLAUDE.md.

## Stack

Next.js (App Router) + TypeScript, static JSON data, no backend. No runtime dependencies beyond next/react: map interaction is hand-rolled pointer events, voice narration uses the Web Speech API, ambient sound is generated via WebAudio.
