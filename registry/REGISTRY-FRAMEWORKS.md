# Registry Construction Frameworks — the Phase 2 factory

**Status: PROPOSAL (planning deliverable, 2026-07-14).** Target repo path:
`registry/plans/REGISTRY-FRAMEWORKS.md`. For AA to rule on section by section
(§9 lists every decision as a decidable question). This document produces **no
Registry content**: every JSON block in it is illustrative, marked provisional,
and would fail `registry:check` on purpose (`PENDING-IMPORT` text, candidate
mechanism IDs). Nothing here enters `taxonomy.json`, `passages/`, `parallels/`,
`practices/`, or `descents/` without AA's hand.

---

## 0. What this decides — and what it inherits

**It decides the factory:** the repeatable process by which a source text
becomes Registry nodes that compile deterministically into Descents, Threads,
and content. Schema v1 (`registry/schema/REGISTRY.md`) already decided the
**warehouse** — where content lands and what shape it has. The factory is the
open question; the warehouse is not.

**One structural fact does most of the work in this document.** Schema v1
separates the *passage* (mechanism-agnostic evidence: work, locus, translation,
tier, rights, text) from the *parallel* (the judgment join: passage ↔ mechanism,
accepted/rejected, line/reading, rejectionReason). Because evidence and
judgment are already different objects, the three frameworks below do not
differ on where content lives. They differ on exactly two things:

1. **What drives the reading order** — the text, the mechanism, or the claim.
2. **What gets recorded when the text doesn't serve the goal** — the skip, the
   counter-evidence, the empty slot.

Those two properties determine grounding strength, confirmation-bias exposure,
AA-cost, and churn resistance. Everything else is inherited and not
re-litigated here:

| inherited constraint | source |
|---|---|
| Mechanism-first; traditions are exhibits | CLAUDE.md locked 1 |
| Near Misses first-class, rejectionReason mandatory | CLAUDE.md locked 2; schema `parallels` |
| Trust boundary: model drafts offline; only the Registry speaks; no model-authored passage text ever | PRODUCT.md §9.1 |
| Depth Dial: `line` / passage / `reading` stored as fields, never runtime rewrites | PRODUCT.md §7.5; schema `parallels` |
| Deterministic assembly: Descents compiled offline by rules; variation from node breadth, not generation | PRODUCT.md §9.1/§9.3 |
| Unity emergent, never asserted; Tensions recorded, not smoothed | PRODUCT.md §5.4, §8.3 |
| 10 pain categories fixed; free-text pain handled by runtime Naming, never stored in the Registry | CLAUDE.md; PRODUCT.md §5.1–5.2 |
| Rights status required per passage | PRODUCT.md §9.5; `registry:check` |
| Taxonomy provisional until gauntlet-hardened; hard cap 60 | CLAUDE.md locked 13 |
| Skip rate 40–60%+ is the curation floor | working principle, PRODUCT.md §13.1 logic |
| Sandbox content never migrates | registry/README rule 3 |

**Dependency, stated plainly:** all demonstrations run against **candidates**
in `registry/drafts/anxiety-gauntlet.md`, chiefly candidate #1 (*Rehearsal
billed as the event*). Nothing below presumes admission. If the kill-pass
kills #1, the demonstration corpus re-homes under the surviving mechanism whose
joint it attests (most loci below also serve #7 or #2). If fewer than 3
anxiety candidates survive, Phase 1 restarts on a new draft and the factory
waits — the factory is worthless until the taxonomy calibrates. **The
kill-pass is the prerequisite for everything in §8.**

---

## 1. The shared demonstration corpus (fixed, identical across frameworks)

Six loci, chosen against the gauntlet draft's attestation pointers. This is
the geometry-sandbox move applied to construction: identical data, structural
variation isolated — so the frameworks are compared on process, not on
cherry-picked material.

| # | locus | lineage | serves candidates | role in the demo | text status |
|---|---|---|---|---|---|
| P1 | Seneca, *Letters to Lucilius* 13 | Stoicism | #1, #6 | core accepted parallel | PENDING-IMPORT |
| P2 | Seneca, *Letters* 24 (the premeditatio passages) | Stoicism | #1 (as Near Miss) | **the designed Near Miss** — surface match, inverted mechanics | PENDING-IMPORT |
| P3 | *Madhupiṇḍika Sutta*, MN 18 (papañca) | Buddhism | #1, #8 | multi-joint passage — tests cross-reference discipline | PENDING-IMPORT |
| P4 | *Bhaddekaratta Sutta*, MN 131 | Buddhism | #7 (vs #1) | **the assignment-ambiguity test** — does it attest simulation-under-threat or attention posture? | PENDING-IMPORT |
| P5 | Matthew 6:25–34 | Christianity | #1, #2, #4, #7 | **the multi-mechanism passage** — tests reuse (capture once, join many) | PENDING-IMPORT |
| P6 | Grupe & Nitschke 2013, *Nat. Rev. Neurosci.* (anticipatory anxiety) | Neuroscience/Psychology | #1 | the sole empirical frame (exactly one, per rule) | findings summary, register distinct |

Corpus properties, by design: 4 distinct lineages; exactly 1 empirical; ≥1
designed Near Miss; one ambiguity case; one reuse case. Enough to compile one
full Descent for candidate #1 (4 accepted across 4 lineages incl. empirical +
1 rejected) with P4 demonstrating a recorded *skip*.

**Grounding rule in force everywhere below:** no source texts exist in this
repo, therefore no `text` field below contains passage text. Text enters the
Registry in exactly one way: pasted/imported by AA from the designated
translation, with `translation`, `tier`, and `rights` set at import. Model
memory of scripture is not a source. Attestation pointers are pointers.

---

## 2. Framework A — Passage-first (corpus-up)

**Atom: the passage.** Direction: text → corpus → joins.

### 2.1 How it works

Sweep each anchor text once, front to back, in its natural units (letter,
sutta, chapter, pericope). Every unit is either **captured** as a staging
passage record (locus, why it matters, non-binding candidate-mechanism hints)
or **skipped with a one-line reason**. Mechanism assignment does not happen
during the sweep. A second pass — the *join pass* — walks the captured corpus
per mechanism and drafts parallels (accepted and Near Miss), which AA judges.
Descent compilation is a third, purely editorial pass.

### 2.2 Where content lands; amendment footprint

Final nodes land exactly in schema v1 (`passages/`, then `parallels/`,
`descents/`). **Amendment footprint: none to shipped schema.** Adds one
staging convention: `registry/drafts/extractions/<work-slug>/` holding sweep
records + the skip ledger. Staging records may carry `rights: "PENDING"`;
shipped passages may not.

Staging record (illustrative — the sweep prompt's output shape):

```json
{
  "stage": "sweep-capture",
  "work": "Letters to Lucilius", "author": "Seneca", "locus": "Ep. 13.4–13.11",
  "lineage": "Stoicism",
  "whyCaptured": "Accounting argument: imagined evils collect real payment, more often than real ones. Sharp, load-bearing, quotable at verse grain.",
  "candidateMechanismHints": ["mech-candidate.rehearsal-billed-as-event", "mech-candidate.relief-that-proves-danger"],
  "text": "PENDING-IMPORT",
  "translation": "PENDING — AA designates Tier 1 edition (candidate: Graver & Long 2015; PD fallback: Gummere 1917 — tier ruling is AA's, see §9 D4)",
  "tier": "PENDING", "rights": "PENDING"
}
```

### 2.3 Pipeline and AA checkpoints

1. **Source prep** (AA, once per text): place the designated translation under
   `sources/` (gitignored if rights require), rule on tier.
2. **Sweep** (Claude, prompt: `prompts/corpus-sweep.md`): capture/skip ledger
   for the whole text. Skip rate reported per sweep; floor 40–60%.
3. **Sweep review** (AA): approve/kill captures. *This is the expensive step:
   an anchor text yields 30–80 captures; review is hours per text.*
4. **Join pass** (Claude): per admitted mechanism, draft parallels from the
   approved corpus — including Near Miss candidates.
5. **Judgment pass** (AA): accept/reject/edit lines, readings, rejection
   reasons; import passage text for the survivors; set rights.
6. **Compile** (Claude): Descent drafts → AA edits convergence → `registry:check`.

### 2.4 Organization and churn

Passages carry no mechanism reference — **the corpus is taxonomy-churn-proof**.
A mechanism rename/split/merge touches only `parallels/<mech-id>/` files (file
moves + re-judged readings). Dedup is natural: one passage file, many joins
(P5 joins four candidate mechanisms without re-extraction).

### 2.5 Presentation compilation

Identical to all frameworks (the warehouse compiles, not the factory):
`recognitionLines` → the Naming; parallel `line`/passage/`reading` → the Dig's
three depths; `convergence` + Tensions → the Convergence stage; `practice` →
arrival; Thread card = mechanism + one `line` per visited lineage + convergence
+ practice + date; content compiler per PRODUCT.md §9.4 (line → hook, passage
→ body, reading → caption, Near Miss → the "actually…" beat).

### 2.6 Failure modes and honest costs

- **Review burden front-loads**: AA pays sweep-review hours before any Descent
  exists. Estimated 2–4 AA-hours per anchor text, ~6 anchor texts for Phase 2.
- **Unattached backlog**: most captures won't map to the 3–6 admitted anxiety
  mechanisms — they wait, possibly years, for mechanisms that may never admit.
  Compounding for the reference-work decade; dead weight for Phase 2.
- **Confirmation bias: lowest of the three.** The text speaks before the
  mechanism asks. Skip rate is natively honest (measured over a whole text).
- **When A is the right choice:** if AA's priority is the citable corpus over
  shipped Descents — the ten-year Registry over the twelve-Descent Phase 2.

### 2.7 Demo (corpus → Descent)

Sweep of *Letters* 1–30 (excerpt of the ledger the sweep prompt produces):

```
SWEEP LEDGER — Letters to Lucilius 1–30 — 2026-07-14
Ep. 5  → SKIP — hope/fear coupling: a real joint, but no admitted or drafted mechanism owns it yet; noted for future gauntlet rounds
Ep. 13 → CAPTURE (P1) — hints: #1, #6
Ep. 18 → SKIP — voluntary poverty practice; practice-shaped, revisit in practice sourcing, not passage corpus
Ep. 24 → CAPTURE (P2) — hints: #1 as NEAR-MISS (premeditatio: deliberate, settled-state, attachment-retiring — inverted direction of fit), #6 accepted-candidate
...
sweep skip rate: 24/30 units skipped (80%) — healthy for a corpus pass
```

Join pass then produces the same parallels shown in §3.7 (identical warehouse
destination — the difference is that A paid for 30 letters to get them, and
banked 4 additional captures no current mechanism owns).

---

## 3. Framework B — Mechanism-dossier (hub-down)

**Atom: the dossier.** Direction: mechanism → hunt → joins.

### 3.1 How it works

For each **admitted** mechanism (gauntlet survivor, `provisional: true`), run a
targeted hunt across the library. The hunt map already exists: the mechanism's
`attestations[]` pointers, produced by Phase 1. The hunt reads each pointer's
locus *in its surrounding section* (never just the verse), captures candidates,
drafts lines/readings, and fills a dossier: accepted parallels per lineage, ≥1
Near Miss, the empirical frame, practice candidates, Tension candidates. AA
judges the dossier; survivors become `passages/` + `parallels/` files; a
Descent compiles.

### 3.2 The hazard, named before the pitch

**Mechanism-first extraction is confirmation-seeking by construction.** Hunt
any rich text for evidence of a pre-named mechanism and you will "find" it —
that is precisely how lazy perennialism gets manufactured, and it is the §13.4
critique aimed at our own pipeline. If the Registry is built by motivated
reading, *recognition, not argument* becomes argument wearing recognition's
clothes. Framework B is therefore specified **only** with three structural
counterweights bolted on (without them, B is disqualified, not discounted):

1. **The consultation ledger.** Every section read during a hunt is logged
   CAPTURED / SKIPPED(reason) / NEAR-MISS — Framework A's discipline imported
   wholesale. Skip rate is computed over *sections actually read* (pointer-led
   hunts pre-filter, so the 40% floor applies to reading, not to pointers) and
   reported per hunt. A hunt that returns only confirmations flags itself.
2. **The counter-evidence question, mandatory per lineage:** *"What in this
   text cuts against this mechanism's framing?"* The answer is a required
   ledger field even when it is "none found." Its outputs feed Near Misses and
   the Tensions ledger — divergence documented as content, per §8.3.
3. **NOT-FOUND is a valid result.** A lineage with no sharp passage is recorded
   EMPTY and stays empty. Padding a lineage to reach the ≥3 rule is the
   cardinal sin; the ≥3 rule exists to kill weak mechanisms (gauntlet rule 1),
   not to force weak passages.

### 3.3 Where content lands; amendment footprint

**Zero amendments.** Dossiers stage in `registry/drafts/hunts/<mech-id>/`;
survivors land as schema-v1 `passages/` and `parallels/` files. Passages remain
mechanism-agnostic per schema — so B inherits A's reuse and churn resistance
*at the warehouse level* for free (P5 is captured once even though hunt #1
found it; hunts #2/#4/#7 join to the same passage file).

### 3.4 Pipeline and AA checkpoints (the candidate pipeline of record — full SOP in §7)

1. Hunt (Claude, `prompts/mechanism-hunt.md`) → dossier + ledger in drafts.
2. AA verification: check each candidate locus against the library; **import
   passage text**; set translation/tier/rights. (~5–10 min per passage — the
   only step where text enters the system.)
3. AA judgment: accept/reject/edit lines and readings; polish the Near Miss
   rejectionReason (it's a public genre — it must be worth reading aloud).
4. Practice: Claude drafts against the mechanism; AA edits or swaps.
5. Convergence written **last**, against the assembled accepted parallels,
   with any EMPTY lineage and any Tension named, not smoothed (see §6 —
   Framework C's move, demoted to an editorial step).
6. Compile Descent → `registry:check` → commit (message = audit trail).

### 3.5 Organization and churn

Dossiers key to mechanism IDs: a **split/merge costs re-filing
`parallels/<mech-id>/` and re-judging readings** — medium churn exposure,
bounded by the fact that taxonomy v0.1 ships provisional and hardens by Naming
hit-rates (PRODUCT.md §11) before mass extraction ever gets ahead of it.

### 3.6 Failure modes and honest costs

- Confirmation bias: highest raw exposure; mitigated to acceptable by §3.2 —
  but the counterweights are process, and process erodes. The ledger's
  presence in every commit is the audit; a hunt committed without a ledger is
  a red flag AA can see in the diff.
- Duplicate-extraction risk across hunts: bounded by dedup-at-passage-file
  (one file per locus; hunts join, never re-create).
- **When B is the right choice:** when the near-term target is 12 excellent
  Descents and taxonomy calibration — i.e., exactly Phase 2.

### 3.7 Demo (hunt → dossier → Descent)

Consultation ledger for candidate #1 (what the hunt prompt actually outputs):

```
LEDGER — hunt: rehearsal-billed-as-event (CANDIDATE, pre-kill-pass) — 2026-07-14
read: Seneca Ep. 13 (whole letter)        → CAPTURED  (P1)
read: Seneca Ep. 24 (whole letter)        → NEAR-MISS (P2) — premeditatio: deliberate, brief, settled-state, attachment-retiring; inverted direction of fit
read: Seneca Ep. 5 (hope/fear close)      → SKIPPED — different joint (fear–hope coupling); no drafted mechanism owns it; noted
read: MN 18 (madhupiṇḍika, full sutta)    → CAPTURED  (P3) — papañca; NOTE: also attests candidate #8 at a different joint; cross-ref recorded, not duplicated
read: MN 131 (bhaddekaratta, full sutta)  → SKIPPED for this mechanism — attests attention posture (#7), not threat simulation; filed to #7's future hunt
read: Matthew 6:25–34 (pericope)          → CAPTURED  (P5) — 6:34 is this joint; 6:27 belongs to #2's hunt — do not spend it here
read: Grupe & Nitschke 2013               → CAPTURED  (P6) — empirical frame
counter-evidence:
  Stoicism     → premeditatio appears to ENDORSE rehearsal → logged as the Near Miss (the objection becomes content)
  Christianity → Luke 14:28 (count the tower's cost) endorses planning → boundary note: costing once ≠ body-billed loops; candidate deepening material
  Buddhism     → none found against
  Neuro        → imaginal exposure is therapeutic rehearsal → boundary shares premeditatio's answer: dosed, deliberate, extinction-directed
skip rate (sections read): 2/7 (29%) — pointer-led hunt; below the 40% reading floor, acceptable only because 5/7 pointers were pre-filtered by the gauntlet draft; flagged per rule.
```

Dossier survivors, in schema v1 shape (illustrative; would fail
`registry:check` until text imports — by design):

```json
// passages/stoicism/seneca-ep-13.json
{ "id": "pass.stoicism.seneca-ep-13", "lineage": "Stoicism",
  "work": "Letters to Lucilius", "author": "Seneca", "locus": "Ep. 13.4–13.11",
  "translation": "PENDING — AA designates (see §9 D4)", "tier": 1,
  "rights": "quotation", "rightsNote": "PENDING-IMPORT; PD if Gummere designated",
  "text": "PENDING-IMPORT" }

// parallels/mech.rehearsal-billed-as-event/stoicism-seneca-13.json
{ "id": "par.anx-rehearsal-seneca-13",
  "mechanismId": "mech.rehearsal-billed-as-event",
  "passageRef": "pass.stoicism.seneca-ep-13", "status": "accepted",
  "line": "Most of what you are suffering from has not happened.",
  "reading": "PROVISIONAL — Seneca's move is an accounting claim, not optimism: imagined evils collect payment in real currency, and more often than real ones. Maps to the billing step of the mechanism. Edge: his remedy leans on probability judgment, which a modern reader can mistake for reassurance-seeking — keep the diagnosis, hold the remedy loosely." }

// parallels/mech.rehearsal-billed-as-event/stoicism-premeditatio-nearmiss.json
{ "id": "par.anx-rehearsal-premeditatio",
  "mechanismId": "mech.rehearsal-billed-as-event",
  "passageRef": "pass.stoicism.seneca-ep-24", "status": "rejected",
  "line": "Don't the Stoics tell you to rehearse the worst — isn't that what I'm already doing?",
  "reading": "Surface match near-perfect: Seneca explicitly instructs rehearsing exile, poverty, death in advance.",
  "rejectionReason": "Inverted direction of fit. Premeditatio is brief, deliberate, and run from a settled state, aimed at retiring the future's leverage; anxious rehearsal is involuntary, repetitive, and run from an unsettled state, aimed at controlling the future — which renews its leverage on every pass. Same imagery, opposite mechanics: one lowers the threat-flag, the other re-arms it. This is exactly what the Near Miss genre exists to catch." }

// practices/scheduled-rehearsal.json  (PROVISIONAL DRAFT for AA judgment)
{ "id": "prac.scheduled-rehearsal", "name": "The scheduled rehearsal",
  "steps": [
    "Pick a daily 15-minute appointment for worrying — same time, same chair.",
    "When rehearsal starts outside the appointment, write the topic in one line and defer it. Deferral, not suppression: it keeps its slot.",
    "At the appointment, rehearse deliberately, on paper, until the timer ends. Notice how many deferred items arrive already flat — that is data, not luck.",
    "Close by naming one thing that is actually today's." ],
  "durationMinutes": 15, "lineageOrigin": "Neuroscience/Psychology",
  "mechanisms": ["mech.rehearsal-billed-as-event"] }
```

Compiled Descent outline (`descents/anxiety-rehearsal.json`):
surfaceComplaint drafted in the seed session's register; mechanismId
`mech.rehearsal-billed-as-event`; parallels = [seneca-13, mn18, matthew-6,
grupe-nitschke, premeditatio(rejected)] — 4 accepted / 4 lineages / 1 empirical
/ 1 Near Miss ✓; practice default `prac.scheduled-rehearsal`, alternates ≤2;
convergence (PROVISIONAL, written last): *"The event costs once; the rehearsal
bills you every time. Four maps, drawn centuries apart, mark the same toll
booth — and none of them tells you to win the argument with the future; all of
them show you the moment the billing starts."* No Tension for this mechanism;
the premeditatio boundary rides in the Near Miss where it belongs.

---

## 4. Framework C — Thread-first (claim-centric)

**Atom: the convergence claim.** Direction: claim → slots → evidence.

### 4.1 How it works

The unit of construction is a precise, one-breath **claim** about a mechanism
(*"imagined threat collects real payment: the body cannot tell a rehearsal from
a premiere"*). Each claim carries per-lineage **evidence slots**, and a slot has
exactly three legal states: **filled** (a grounded parallel), **EMPTY** (no
sharp passage — recorded, never padded), or **near-miss** (looks right, doesn't
hold, with the reason). Extraction is slot-filling; the payoff synthesis is not
assembled later — it *is* the atom.

### 4.2 Where content lands; amendment footprint

Slots resolve to ordinary schema-v1 passages and parallels. But the claim
object itself has no home in schema v1 — **AMENDMENT required**: a new
`threads/` collection (namespace `thread.`), validated for: claim ≤ one breath,
slots reference resolving parallels, ≥3 filled lineages incl. one empirical
before a thread may back a public surface, EMPTY slots carry a note.

```json
// threads/rehearsal-bills-in-real-currency.json   (AMENDMENT: new collection)
{ "id": "thread.rehearsal-bills-in-real-currency",
  "mechanismId": "mech.rehearsal-billed-as-event",
  "claim": "Imagined threat collects real payment: the body cannot tell a rehearsal from a premiere, so each simulation is billed at nearly the event's full price.",
  "slots": {
    "Stoicism":                { "state": "filled", "parallelRef": "par.anx-rehearsal-seneca-13" },
    "Buddhism":                { "state": "filled", "parallelRef": "par.anx-rehearsal-mn18" },
    "Christianity":            { "state": "filled", "parallelRef": "par.anx-rehearsal-matthew-6" },
    "Neuroscience/Psychology": { "state": "filled", "parallelRef": "par.anx-rehearsal-grupe-nitschke" },
    "Sufism":  { "state": "EMPTY", "note": "khawāṭir belongs to candidate #3's joint, not this one. The empty slot is the record — do not force." },
    "Taoism":  { "state": "EMPTY", "note": "presence pointers diffuse (gauntlet #7 note); unresolved." } },
  "nearMissSlots": [ { "lineage": "Stoicism", "parallelRef": "par.anx-rehearsal-premeditatio" } ],
  "tensionRefs": [] }
```

### 4.3 Pipeline

1. Per mechanism, AA + Claude draft 1–3 claims (claims are judgment-dense —
   this is AA-authored in a way readings are not).
2. Slot-filling hunts per claim (a narrower Framework-B hunt with the same
   three counterweights).
3. AA verifies, imports text, judges slots; EMPTY discipline enforced.
4. Descent compiles *from a thread*: the convergence text is generated
   deterministically from the claim + filled slots; the Thread card is nearly
   a rendering of the thread object.

### 4.4 Failure modes and honest costs

- **Procrustean risk: highest.** A claim is a bed; passages get stretched or
  cut to fit it. The EMPTY discipline and near-miss slots are real
  counterweights, but the gravity of a well-written claim is strong — this is
  confirmation-seeking one level up, aimed by better prose.
- **Churn exposure: worst.** Claims are finer-grained than mechanisms; every
  mechanism rename/split ripples through its threads *and* their slots — and
  the taxonomy is provisional by design right now.
- **AA-cost: highest.** Claim authoring is the most expensive judgment in the
  system (30–60 min each, before any slot is judged).
- **Where C is unbeatable:** convergence quality, the Thread card, the Atlas,
  and the content compiler — a thread ≈ a content unit; the §9.4 compiler
  becomes nearly a formatter. The EMPTY slot is also the strongest structural
  answer to the perennialism critique this system can make: the map shows the
  blank regions.
- **When C is the right choice:** Phase 4 — when the Atlas needs cross-Descent
  objects and the taxonomy has hardened enough to hang claims on.

---

## 5. Comparison matrix

| criterion | A — passage-first | B — dossier (w/ counterweights) | C — thread-first |
|---|---|---|---|
| grounding strength | **highest** (text speaks first) | high (ledger + counter-evidence) | medium (claim gravity) |
| confirmation-bias exposure | **lowest** | highest raw → mitigated | high, one level up |
| AA-hours per shipped Descent | 3–5 early (sweep amortization) | **1.5–2.5** | 3–4 |
| AA-hours to Phase 2 target (12 Descents) | ~40–60 | **~20–30** | ~36–48 |
| taxonomy-churn cost | **lowest** (agnostic corpus) | medium (re-file + re-judge joins) | worst (claims finer than mechanisms) |
| compilation determinism | high | high | **highest** (thread → convergence is mechanical) |
| recombination breadth | **highest** (banked corpus) | grows per mechanism | thread combinatorics, claim-locked |
| content-compiler leverage | indirect | good | **native** (thread ≈ content unit) |
| amendment footprint | staging convention only | **none** | new `threads/` collection |
| what it optimizes | the ten-year corpus | **the twelve Descents** | the payoff & the Atlas |

---

## 6. Recommendation — one, argued

**Adopt Framework B as the pipeline of record, with Framework A's epistemics
bolted on as mandatory process, and Framework C demoted from atom to editorial
step.** Call it what it is: *dossier-driven extraction with a consultation
ledger.*

Concretely, three rules make the hybrid:

1. **Every hunt keeps the ledger** (§3.2.1–2): consultation log with skips and
   reasons, per-lineage counter-evidence question, skip rate over sections
   read, NOT-FOUND as a first-class result. This is Framework A's honesty at
   Framework B's price — and because the ledger lives in `drafts/hunts/` and
   travels in commits, its *absence* is visible in the diff, which makes the
   process self-auditing rather than self-reported.
2. **Passages stay mechanism-agnostic** — which schema v1 already mandates. B
   therefore inherits A's reuse and most of its churn resistance for free; the
   join layer alone carries churn cost, and it is the cheapest layer to re-judge.
3. **Convergence is written last, against the assembled parallels, with EMPTY
   lineages and Tensions named** — C's core insight (the payoff is a claim
   with evidence slots) captured as a discipline for one Descent field, without
   paying C's schema amendment or its churn bill. The `threads/` collection is
   **deferred, not rejected**: revisit at Phase 4 when the Atlas needs
   cross-Descent objects and hit-rate data has hardened the taxonomy (§9 D3).

Why not pure A now: A optimizes the reference-work decade at the direct
expense of the Phase 2 exit criterion ("12 Descents AA would put in front of a
stranger"), front-loads AA's scarcest resource into sweep review, and banks
captures that no admitted mechanism can spend yet. **Revisit A after the
taxonomy hardens** — commissioned sweeps of anchor texts are exactly how the
Registry deepens from product asset into citable corpus, and the sweep prompt
ships today (`prompts/corpus-sweep.md`) so that decision costs nothing later.

Why not C now: the taxonomy is provisional by design, and C is the framework
most punished by churn; claim authoring is the most expensive judgment in the
system and Phase 2's bottleneck is exactly AA-judgment-hours; and C's genuine
advantages (Thread card, Atlas, compiler leverage) all live in Phase 3–4, not
Phase 2.

The economics, stated once: at ~20–30 AA-hours for twelve Descents, the hybrid
fits PRODUCT.md §13.1's own estimate ("weeks of AA's judgment") with the
ledger discipline as the anti-slop insurance. The moat math holds only if the
skip-and-rejection record accumulates alongside the accepted content — the
ledger is not overhead, it *is* the product the trust page displays.

---

## 7. The pipeline of record (operational SOP for the hybrid)

Per mechanism, per Descent — after the kill-pass has admitted it:

| step | actor | artifact | AA-minutes (est.) |
|---|---|---|---|
| 1. Hunt (`prompts/mechanism-hunt.md`) | Claude | dossier + ledger in `drafts/hunts/<mech-id>/` | 0 |
| 2. Locus verification + **text import** + rights/tier | AA | `passages/*.json` complete | 5–10 / passage (~40–60 / Descent) |
| 3. Judgment pass on joins: accept / reject / edit `line` + `reading` | AA | `parallels/<mech-id>/*.json` | 3–5 / parallel (~20–30) |
| 4. Near Miss polish — the reason must be worth reading aloud | AA | rejectionReason final | ~10 |
| 5. Practice draft → judgment | Claude → AA | `practices/*.json` | 10–15 |
| 6. Convergence written last; EMPTY lineages + Tensions named | Claude drafts → AA edits | Descent `convergence` | ~10 |
| 7. Compile Descent → `registry:check` → commit | Claude | `descents/*.json`, green check | 5 |

**Per-Descent AA budget: ~1.5–2.5 hours. Proposed timebox: 2.5 hours hard**
(PRODUCT.md §13.1: timebox per node). A Descent over budget ships provisional
or gets parked — it does not eat the week. Reporting convention: every hunt
commit includes its ledger; skip rate and counter-evidence answers appear in
the commit message body. That is the judgment ledger accumulating in the exact
medium PRODUCT.md §9.2 chose for it.

---

## 8. Roadmap and gates (slotting into PRODUCT.md §10)

- **Gate R0 — the kill-pass (prerequisite; AA solo; ~90 min).** Run the
  Anxiety kill-pass per `drafts/anxiety-gauntlet.md`. *Exit: every VERDICT
  line filled; 3–6 survivors promoted to `taxonomy.json` provisional;
  `registry:check` green.* Nothing else in this roadmap starts first — the
  factory has no work order until this runs. (This is Phase 1's first
  category, as PRODUCT.md §15.2 already scheduled it.)
- **Gate R1 — rule on this document (AA; ~30 min).** Framework verdict +
  decisions D1–D6 (§9). *Exit: the pipeline of record is named in CLAUDE.md.*
- **Gate R2 — the pilot vertical slice (1–2 weeks elapsed; the calibration
  run).** Import the §1 corpus for real (AA designates translations, pastes
  text, sets rights); run the SOP end-to-end for **one or two** Anxiety
  Descents on admitted mechanisms; `registry:check` green. *Exit: one Descent
  AA would put in front of a stranger without apologizing — the Phase 2 bar,
  applied early to one instance.* Timing data from R2 recalibrates the §7
  budget before scaling.
- **Gate R3 — scale (Phase 2 proper, interleaved with Phase 3 build).**
  Category order: Anxiety and Burnout doubled first (the front doors), then
  the remaining eight. Cadence target from R2's measured budget (~2 Descents
  per week of AA-time at the estimate). Every hunt commits with its ledger;
  skip rate reported; Near Miss counter increments on the future trust page.
  *Exit: PRODUCT.md Phase 2's own criterion — 12 Descents, no apologies.*

Not in scope here, flagged once: the app currently reads `data/sessions/`;
Phase 3 owns the switch to reading `registry/descents/`. R2 may render its
pilot Descent behind a flag if AA wants to *feel* it, but the factory does not
gate on the reader.

---

## 9. Decisions required from AA

Each stated as a decidable question, with my recommendation.

- **D1 — Kill-pass timing.** Run R0 before anything else in this plan?
  *Recommend: yes — it is the prerequisite, ~90 minutes, and the §1 corpus
  re-homes cleanly if candidate #1 dies.*
- **D2 — Framework verdict.** Adopt the §6 hybrid (B + ledger + convergence-last)
  as the pipeline of record? Alternatives: pure A / pure B / C / other.
  *Recommend: the hybrid, for §6's reasons.*
- **D3 — The `threads/` amendment.** Adopt Framework C's thread collection now,
  or defer to the Phase 4 Atlas decision? *Recommend: defer; convergence
  remains a Descent field; revisit with hit-rate data in hand.*
- **D4 — Tier 1 designations (genuinely yours; tier discipline is your line).**
  Per anchor text, which translation is THE Tier 1 identity for v1, and is a
  public-domain fallback acceptable where it exists (e.g., Gummere 1917 for
  Seneca; which English rendering rides on the NA28 base for Matthew; whose
  MN for 18/131 — Ānandajoti / Sujato / Bodhi)? Rights default per §9.5
  follows from this.
- **D5 — Ledger home and retention.** `registry/drafts/hunts/<mech-id>/`
  (and `drafts/extractions/` for future sweeps), retained forever as the
  judgment ledger? *Recommend: yes — deletion would be deleting the moat.*
- **D6 — The timebox.** 2.5 AA-hours hard cap per Descent in Phase 2,
  over-budget Descents ship provisional or park? *Recommend: yes, recalibrate
  after R2's measured timings.*

---

*Appendices — the extraction prompts, as standalone reusable artifacts:*
`prompts/GROUNDING.md` (shared invariants, referenced by all three) ·
`prompts/mechanism-hunt.md` (the pipeline of record) ·
`prompts/corpus-sweep.md` (Framework A, held for post-hardening) ·
`prompts/thread-slots.md` (Framework C, held for Phase 4).
