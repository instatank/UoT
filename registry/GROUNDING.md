# GROUNDING — shared invariants for all Registry extraction prompts

Target repo path: `registry/plans/prompts/GROUNDING.md`. Every extraction
prompt in this folder includes these rules by reference AND restates the hard
ones inline. They are not style preferences; violating any of them makes the
output unusable for the Registry.

1. **You never author passage text.** Not from memory, not even text you are
   certain of, not "approximately." A `text` field is either copied verbatim
   from a source file present on disk (`sources/`) or set to
   `"PENDING-IMPORT"`. Passage text enters the Registry in exactly one way:
   pasted/imported by AA from the designated translation. Model memory of
   scripture, Stoics, or sutta is a pointer, never a source.
2. **Provenance is complete or the record says so.** Every passage record
   carries `work`, `author`, `locus` (precise enough to check), `translation`,
   `tier`, `rights`. In staging, `translation`/`tier`/`rights` may be
   `"PENDING"`; a shipped passage may carry no PENDING anywhere
   (`registry:check` enforces rights).
3. **Interpretive fields are drafts.** `line`, `reading`, `rejectionReason`,
   recognition lines, convergence text, practice steps: yours to draft, always
   marked PROVISIONAL, always referencing the loci they interpret. AA's
   judgment pass is what turns a draft into content.
4. **Skips are recorded, with reasons.** Every section you actually read gets
   a ledger entry: CAPTURED / SKIPPED(one-line reason) / NEAR-MISS. Report the
   skip rate over sections read. Under ~40% skipped means over-inclusion —
   flag it yourself; never present raw capture count as a win.
5. **NOT-FOUND and EMPTY are valid, reportable results.** A lineage with no
   sharp passage stays empty. Padding a lineage to satisfy a quota is the
   cardinal sin of this entire system: it manufactures the lazy perennialism
   the product exists to refuse.
6. **The counter-evidence question is mandatory.** For each lineage consulted:
   *what in this text cuts against the framing being extracted for?* Log the
   answer even when it is "none found." Its outputs become Near Misses,
   boundary notes, and Tensions ledger entries — divergence is content.
7. **Unity is never asserted.** No user-facing field states the unity thesis.
   Convergence text juxtaposes cited parallels and lets recognition happen;
   where traditions genuinely disagree, the Tension is named, not smoothed.
8. **Sandbox content never migrates.** Nothing from `data/sessions/` is a
   source, a passage, or a template for Registry content.
9. **Write boundaries.** Extraction runs write only under `registry/drafts/`.
   `taxonomy.json`, `passages/`, `parallels/`, `practices/`, `descents/` are
   AA-gated — promotion is a human act. Never `git push`: `main` auto-deploys
   to production; pushing is AA's call.
10. **Rights are load-bearing.** If a captured passage's translation is
    copyrighted, the staging record notes it and proposes `quotation` +
    `contextUrl`, or flags a public-domain alternative for AA's tier ruling.
    No recommendation ever treats a Tier 2 or bridging source as equivalent to
    Tier 1 without flagging it explicitly.
