# PROMPT — Thread slot-filling (Framework C; HELD for the Phase 4 Atlas decision)

Target repo path: `registry/plans/prompts/thread-slots.md`.
Status: not part of the Phase 2 pipeline of record (REGISTRY-FRAMEWORKS.md §6,
decision D3). Ships now so Framework C is runnable the day AA adopts the
`threads/` amendment. Run in Claude Code, one mechanism per run, effort
`xhigh` — claims are the most judgment-dense objects in the system.
`GROUNDING.md` applies in full.

---

I'm building convergence threads for the Truth Registry: precise claims about
a mechanism, each carrying per-lineage evidence slots that are filled with
grounded parallels, marked EMPTY, or filled by a Near Miss with its reason.
The empty slot is the system's structural honesty — the map that shows its
blank regions is the map that earns trust. With that in mind:

## Task

For admitted mechanism `{MECH_ID}`, draft 1–3 convergence threads with fully
disciplined slots, staged in `registry/drafts/threads/{MECH_ID}/`. Write
nowhere else; never `git push`.

## Prerequisites (stop if unmet, and say which)

- `{MECH_ID}` exists in `registry/taxonomy.json` (gauntlet survivor).
- The mechanism's hunt dossier exists (`registry/drafts/hunts/{MECH_ID}/`) or
  shipped parallels exist under `registry/parallels/{MECH_ID}/` — threads are
  built over judged or staged evidence, never over fresh memory.
- The `threads/` schema amendment is ratified, or this run is explicitly
  staging for the Phase 4 decision (state which at the top of the output).

## Claim discipline

A claim is one breath, plain modern English, and it must satisfy all three:

1. **It says what happens, step-linked** — it restates a joint of the
   mechanism's moving part, not a theme over it.
2. **It could be disagreed with** — a claim no tradition could fail to attest
   is a platitude, and platitudes produce padded slots.
3. **It is the payoff in embryo** — read aloud at arrival, it should already
   do convergence work without naming the unity thesis.

Draft claims are PROVISIONAL; claim authorship is AA-heavy by design — your
drafts are raw material for his edit, and the judgment queue must present
each claim's weakest word.

## Slot discipline

- Slot states: `filled` (parallelRef resolving to a staged/shipped parallel),
  `EMPTY` (one-line note; never padded), `near-miss` (in `nearMissSlots`, with
  the rejectionReason carried on the parallel).
- **Claim gravity is this framework's known hazard** — a well-written claim
  bends readings toward itself. Counterweights, mandatory: the counter-evidence
  question per filled slot (what in this passage resists the claim's wording?);
  and if filling a slot requires stretching a reading, the slot is EMPTY and
  the stretch is logged in the ledger instead.
- A thread may back a public surface only with ≥3 filled lineages including
  one empirical — but this run's job is honesty, not eligibility. An
  ineligible thread with true slots beats an eligible one with forced slots.
- Genuine cross-tradition disagreement about the claim's resolution → Tension
  entry proposal, referenced from `tensionRefs`.

## Output (under `registry/drafts/threads/{MECH_ID}/`)

- `threads/*.json` — per REGISTRY-FRAMEWORKS.md §4.2's shape: `id`
  (`thread.<kebab>`), `mechanismId`, `claim`, `slots`, `nearMissSlots`,
  `tensionRefs`.
- `LEDGER.md` — per-slot counter-evidence answers; every stretch-refusal
  logged; which existing evidence was consulted.
- `JUDGMENT-QUEUE.md` — per claim: the weakest word, the slots needing AA's
  verification, the EMPTY slots he may know a passage for (his library is
  larger than the repo's).

## How to work

Autonomous run; drafting under `registry/drafts/` proceeds without asking.
Threads reference evidence — audit every `parallelRef` against a file on disk
before reporting; a reference you could not resolve is listed as such, never
silently invented. End only when threads, ledger, and judgment queue exist.
