# PROMPT — Mechanism hunt (pipeline of record)

Target repo path: `registry/plans/prompts/mechanism-hunt.md`.
Run in Claude Code at the repo root, one mechanism per run, effort `high`
(`xhigh` for the first hunt of a category — it calibrates the rest).
Includes `GROUNDING.md` by reference; its hard rules are restated inline below
and they win over anything else in this prompt.

---

I'm building the Truth Registry for Unity of Truths — the curated corpus
behind the product; the stored judgment IS the moat, and that includes the
record of what was skipped and rejected, not only what was accepted. This run
extracts the dossier for one admitted mechanism. With that in mind:

## Task

Hunt the source library for mechanism `{MECH_ID}` and produce a complete
dossier in `registry/drafts/hunts/{MECH_ID}/`, ready for AA's judgment pass.
Do not touch any other folder.

## Read first

1. `CLAUDE.md` — locked decisions; never re-litigate.
2. `registry/schema/REGISTRY.md` — the destination shapes your staging records
   must map onto.
3. The mechanism's entry in `registry/taxonomy.json` (it must exist and be a
   gauntlet survivor — if `{MECH_ID}` is not in taxonomy.json, stop and say so;
   hunting for unadmitted mechanisms is how drafts masquerade as content).
4. `registry/plans/prompts/GROUNDING.md` — all ten invariants apply.
5. The relevant kill-record in `registry/drafts/*-gauntlet.md` — the verdicts
   and overlap notes tell you which joints belong to neighboring mechanisms.

## Sources

Read only what is on disk under `sources/`. The mechanism's `attestations[]`
pointers are your hunt map — but a pointer whose text is not on disk yields a
`PENDING-IMPORT` staging record with a precise locus, never a reconstruction
from memory. **Hard rule: you never author passage text.** If `sources/` is
empty, the entire run is pointer-verification and staging — say so at the top
of the dossier rather than simulating a reading you didn't do.

## Procedure

1. **Per lineage in the attestations:** locate the pointer's locus; read the
   surrounding section (the whole letter, the whole sutta, the whole pericope
   — never just the verse). Pointers from the gauntlet are candidates, not
   verified citations; your job includes discovering that a pointer is wrong.
2. **Capture candidates** as staging records: precise locus; `whyCaptured`
   (2–3 sentences: which step of the mechanism's moving part this attests);
   draft `line` (one sentence, modern words) and draft `reading` (the
   interpretive move AND where its edges are), both marked PROVISIONAL;
   `text: "PENDING-IMPORT"` unless copied verbatim from disk; translation /
   tier / rights fields per GROUNDING rule 2, with rights proposals per rule 10.
3. **While reading, watch for neighboring joints.** A passage that attests a
   different mechanism gets a cross-reference note filed to that mechanism's
   future hunt — captured once at the passage level, never duplicated, never
   spent twice (schema: passages are mechanism-agnostic; parallels join).
4. **The counter-evidence question, per lineage, mandatory:** what in this
   text cuts against this mechanism's framing? Log the answer in the ledger
   even when it is "none found." Route the findings: an apparent endorsement
   of the pathology → Near Miss candidate; a genuine cross-tradition
   disagreement about the resolution → Tension candidate for `taxonomy.json`;
   a boundary clarification → deepening material.
5. **Near Miss quota: ≥1 candidate** that looks like it maps and does not,
   with a draft `rejectionReason` precise enough to be worth reading aloud
   (direction of fit, wrong joint, inverted mechanics — name the failure).
   If after honest search none exists, write `NEAR-MISS: NONE-FOUND` plus one
   paragraph on why that is itself suspicious for this mechanism.
6. **The consultation ledger — every section you actually read:**
   `CAPTURED (ref)` / `SKIPPED — one-line reason` / `NEAR-MISS (ref)`.
   Compute the skip rate over sections read (not over pointers). Floor: 40%.
   A pointer-led hunt that lands under the floor must flag itself and say why
   (pre-filtered pointers are the acceptable reason; enthusiasm is not).
7. **EMPTY lineages stay empty.** A lineage with no sharp passage is recorded
   `EMPTY` with a one-line note. Do not pad. The ≥3-lineages rule exists to
   kill weak mechanisms, not to force weak passages — if the dossier cannot
   reach 3 lineages + 1 empirical honestly, the correct output is a dossier
   that says the mechanism may need to return to the gauntlet.
8. **Practice candidates:** draft 1–2 against the mechanism (concrete steps,
   doable today, `durationMinutes`, `lineageOrigin` if it has a single home),
   marked PROVISIONAL.
9. **Convergence draft, written last,** against the accepted candidates only:
   2–3 sentences, plain, juxtaposition not assertion, EMPTY lineages and
   Tensions named rather than smoothed. Marked PROVISIONAL.

## Output (all under `registry/drafts/hunts/{MECH_ID}/`)

- `LEDGER.md` — the consultation ledger, counter-evidence answers, skip rate.
- `passages/*.json` — staging passage records (destination shape:
  `registry/schema/REGISTRY.md` §passages).
- `parallels/*.json` — staging joins incl. the Near Miss (destination shape:
  §parallels; `rejectionReason` present on every rejected record).
- `practices/*.json`, `convergence.md` — provisional drafts.
- `JUDGMENT-QUEUE.md` — the run's last act: every decision AA must make,
  as a numbered list of decidable questions (verify locus X; accept/kill join
  Y; rights ruling on Z; does the Near Miss reason sting or explain).

## How to work

You are operating autonomously; AA is not watching in real time. For
reversible drafting under `registry/drafts/`, proceed without asking. Before
ending your turn, check your last paragraph: if it is a plan, a question, or a
promise of work not yet done, do that work now. End only when the dossier and
judgment queue exist on disk. Before reporting, audit each claim against a
file you actually read or wrote this session; a locus you could not verify on
disk is PENDING-IMPORT and is reported as such, never as grounded. Do not
re-derive locked decisions. Never `git push`.
