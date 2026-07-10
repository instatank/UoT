# The Truth Registry

The curated corpus behind everything — mechanisms, passages, parallels (accepted
AND rejected), practices, and compiled Descents. Per PRODUCT.md §3: **the
Registry is the company.** It compounds, it's defensible, it survives any
redesign of the app.

## Ground rules (all ratified — see PRODUCT.md, CLAUDE.md)

1. **Git is the CMS; Claude Code is the editor** (PRODUCT.md §9.2). No admin
   panel, no database until strangers have accounts. Git history is the
   editorial audit trail — every rejection, reworded reading, and demoted
   practice is a diff with a commit message.
2. **The trust boundary** (PRODUCT.md §9.1): *the LLM shapes the journey; only
   the Registry speaks.* Claude drafts offline, into this folder, where AA
   judges before anything ships. Nothing in the app renders contemplative
   content that isn't in here.
3. **Sandbox content never migrates here.** `/data/sessions/*.json` is
   geometry-testing content — it has not passed Tier 1 translation review or
   rejected-parallel discipline. It retires with honors; it does not move in.
4. **No passage ships without a rights status** (PRODUCT.md §9.5). Enforced by
   `npm run registry:check`.
5. **Nothing enters `taxonomy.json` without passing the Admission Gauntlet**
   (CLAUDE.md locked decision 13). Candidates awaiting AA's kill-pass live in
   `drafts/` — drafts are Claude's proposals, not content.

## Layout

```
registry/
  taxonomy.json        mechanisms: the spine. Empty until the Phase 1 gauntlet runs.
  passages/<lineage>/  cited passages: work, author, locus, translation, tier, rights, text
  parallels/<mech-id>/ passage↔mechanism mappings, status accepted|rejected, with readings
  practices/           practices; mechanisms[] is 1:many (locked decision 12)
  descents/            compiled session graphs (the evolved data/sessions shape)
  drafts/              gauntlet candidates awaiting AA judgment — NOT shipped content
  schema/REGISTRY.md   field-by-field schema
```

## Validation

```
npm run registry:check          # validate everything in this folder
npm run registry:check -- --self-test   # prove the validator catches what it must
```

The check enforces: citations resolve, rejected ⇒ reason, every Descent reaches
practice, rights present, the admission rule's structural half (≥3 lineages,
≥1 empirical, ≤6-word names, 2–3 recognition lines), the 60-mechanism hard cap,
and the ≤2-alternates arrival rule. What it cannot enforce — does the mechanism
name a moving part, do the lines sting — is AA's job. That's the point.
