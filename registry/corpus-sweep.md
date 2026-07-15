# PROMPT — Corpus sweep (Framework A; HELD until the taxonomy hardens)

Target repo path: `registry/plans/prompts/corpus-sweep.md`.
Status: shipped now so the pure-A decision costs nothing later; per
REGISTRY-FRAMEWORKS.md §6 this prompt is **not** part of the Phase 2 pipeline
of record. Run in Claude Code, one source text per run, effort `high`.
`GROUNDING.md` applies in full; hard rules restated inline win over everything.

---

I'm deepening the Truth Registry from product asset into citable corpus: a
front-to-back sweep of one anchor text, capturing mechanism-agnostic passage
records and — just as deliberately — the skip ledger. The skip record is
stored judgment; the Registry stores what doesn't fit as much as what does.
With that in mind:

## Task

Sweep `{SOURCE_FILE}` (on disk under `sources/` — if it is not on disk, stop;
a sweep of remembered text is not a sweep) and produce a capture/skip ledger
plus staging passage records in `registry/drafts/extractions/{WORK_SLUG}/`.
Write nowhere else. Never `git push`.

## Procedure

1. **Read `registry/taxonomy.json` first** — the admitted mechanisms are
   *hints*, not targets. A sweep is reading-driven: you record what the text
   says, not what the taxonomy needs.
2. **Chunk by the text's own natural units** — letter, sutta, chapter,
   pericope, section. Every unit gets exactly one ledger verdict.
3. **CAPTURE when a unit is sharp**: it names a moving part of human suffering
   or transformation concretely enough to be quotable at verse/section grain,
   in the text's own terms. Staging record: precise locus; `whyCaptured`;
   non-binding `candidateMechanismHints[]` (admitted mechanism IDs where
   plausible, plain-language joint descriptions where no mechanism exists yet
   — never invent mechanism IDs); `text` copied verbatim from disk (with
   translation/tier/rights per GROUNDING rules 2 and 10) or `PENDING-IMPORT`.
4. **SKIP with a one-line reason** everything else: doctrinal scaffolding,
   narrative connective tissue, themes without moving parts, material whose
   joint no current or plausible mechanism owns (say so — those notes seed
   future gauntlet rounds). The skip reason is a deliverable, not an apology.
5. **Capture once, join never.** Sweeps produce no parallels. Multi-joint
   passages get multiple hints on one record, not multiple records.
6. **Report the skip rate** over units read. For a full-text sweep the healthy
   range starts at 40–60% skipped and honest sweeps of rich texts often run
   far higher. Under 40% means over-inclusion: flag it in the ledger header
   and tighten before finishing — never present capture count as the result.
7. **Counter-evidence discipline still applies** (GROUNDING rule 6), aimed
   generally: where the text cuts against a framing the Registry currently
   holds (an admitted mechanism's definition, an accepted parallel elsewhere),
   log it — those entries are Tension and Near Miss seed material.

## Output (all under `registry/drafts/extractions/{WORK_SLUG}/`)

- `LEDGER.md` — one line per unit, verdicts + reasons, skip rate in header.
- `captures/*.json` — staging passage records.
- `NOTES.md` — joints with no owning mechanism (future gauntlet seed),
  counter-evidence entries, translation/rights questions for AA.
- `JUDGMENT-QUEUE.md` — AA's review list: approve/kill per capture, tier and
  rights rulings.

## How to work

Autonomous run; reversible drafting proceeds without asking. Sections read
must be sections actually on disk — audit before reporting; nothing is
"captured" whose text you did not see. End only when ledger, captures, and
judgment queue exist. Do not assemble parallels, Descents, or convergence
text in this run — the sweep banks evidence; judgment spends it later.
