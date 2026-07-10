# Registry schema — v1

Field-by-field contract for everything under `registry/`. Enforced (where a
machine can) by `npm run registry:check`; the judgment half of every rule is
AA's. The JSON shape is designed to map 1:1 onto Postgres tables if Phase 5
ever demands them (PRODUCT.md §9.2) — don't add fields casually.

ID namespaces: `mech.` `pass.` `par.` `prac.` — kebab-case after the prefix.
IDs are permanent once shipped; content behind them may be re-edited freely
(git history is the audit trail).

## taxonomy.json

Top level:

| field | type | notes |
|---|---|---|
| `schemaVersion` | `1` | bump on breaking changes |
| `painCategories` | string[10] | the locked taxonomy — must match CLAUDE.md exactly |
| `lineages` | string[] | the lineage families usable in this registry (MVP: 7 of the 9) |
| `mechanisms` | Mechanism[] | **hard cap 60** (locked decision 13); target 30–45 in v0.1 |

Mechanism — admitted only via the Admission Gauntlet:

| field | type | notes |
|---|---|---|
| `id` | string | `mech.<kebab>`. Permanent once shipped |
| `name` | string | plain modern English, **≤6 words**, no Sanskrit/Greek/Pali/Latin, no DSM borrowings |
| `definition` | string | what it *does*, step by step, sayable in one breath — a moving part, not a theme |
| `provisional` | boolean | `true` for everything in v0.1; hardened only by Naming hit-rates |
| `painCategories` | string[] | ⊆ the locked 10; many-to-many allowed, **flagged at ≥4** (probably a theme) |
| `recognitionLines` | string[] | **2–3** first-person lines, written to sting. Registry content, AA-curated; these double as the Naming UI and the content engine's hooks |
| `attestations` | Attestation[] | **≥3 distinct lineages, ≥1 of them Neuroscience/Psychology** |
| `tensions` | Tension[] | optional; genuine cross-tradition disagreements about this mechanism's resolution — recorded from day one |

Attestation: `{ lineage, pointer, passageRef? }` — `pointer` is a human-readable
citation ("Seneca, Letters 13"); `passageRef` links to a verified passage file
once the Registry build (Phase 2) confirms it against a Tier 1 translation.
Pointers are allowed at admission; verified refs are required before the
mechanism appears on a public surface.

Tension: `{ between: string[2+], summary }` — e.g. self vs. no-self, grace vs.
effort. Named, not smoothed over (PRODUCT.md §5.4).

## passages/<lineage-slug>/*.json

One passage per file. Folder slug is a convention (e.g. `stoicism/`,
`neuroscience-psychology/`), not enforced; the `lineage` field is.

| field | type | notes |
|---|---|---|
| `id` | string | `pass.<lineage-slug>.<kebab>` |
| `lineage` | string | ∈ taxonomy.lineages |
| `work` | string | required |
| `author` | string? | |
| `locus` | string? | chapter/verse/page — precise enough to check |
| `translation` | string? | translator/edition — the Tier 1 identity of this text |
| `tier` | 1 \| 2 | translation rigor; public surfaces want tier 1 |
| `rights` | enum | **required**: `public-domain` \| `quotation` \| `licensed` \| `commissioned` |
| `rightsNote` | string? | e.g. licence terms, PD justification |
| `contextUrl` | string? | "read it in context" link — expected for `quotation` |
| `text` | string | the passage itself. For empirical frames: a findings summary, register kept distinct |

## parallels/<mechanism-id>/*.json

One parallel per file, grouped by mechanism. The Depth Dial contract
(PRODUCT.md §7.5): `line` (depth 1) → passage text via `passageRef` (depth 2)
→ `reading` (depth 3).

| field | type | notes |
|---|---|---|
| `id` | string | `par.<kebab>` |
| `mechanismId` | string | must resolve into taxonomy.json |
| `passageRef` | string | must resolve to a passage file — citations resolve, always |
| `status` | enum | `accepted` \| `rejected`. Rejected = a **Near Miss** — first-class, visually distinct, a public genre |
| `line` | string | one sentence, modern words — map label / pill row / content hook |
| `reading` | string | the interpretive move: how the passage maps to the mechanism, where its edges are |
| `rejectionReason` | string | **required iff rejected** — precisely why the apparent mapping fails. The moat |
| `deepening` | `{id,title,body}`? | accepted only — **rejected parallels never deepen** (dead ends by design) |

## practices/*.json

| field | type | notes |
|---|---|---|
| `id` | string | `prac.<kebab>` |
| `name` | string | |
| `steps` | string[] | concrete, ordered, doable today |
| `durationMinutes` | number? | |
| `lineageOrigin` | string? | where the practice comes from, if it has a single home |
| `mechanisms` | string[] | **≥1, all resolving** — mechanism→practice is 1:many (locked decision 12) |

## descents/*.json

Compiled session graphs — the evolved `data/sessions/` shape, now by reference
into the Registry instead of inline content.

| field | type | notes |
|---|---|---|
| `schemaVersion` | `1` | |
| `id` | string | kebab-case, doubles as URL slug |
| `painCategory` | string | ∈ the locked 10 |
| `surfaceComplaint` | string | first person, one sentence |
| `complaintBody` | string | 2–4 sentences, still pre-mechanism |
| `mechanismId` | string | must resolve |
| `parallels` | string[] | parallel IDs. **≥3 accepted across ≥3 distinct lineages, ≥1 empirical among them, ≥1 rejected** |
| `convergence` | string | the unifying thread, stated plainly; where a real Tension exists it is named, not smoothed |
| `practice` | `{ default, alternates[] }` | `default` resolves; **alternates ≤2** — arrival shows exactly one practice plus a closed "another way" fold (locked decision 12) |

## drafts/

Markdown working files for the Admission Gauntlet — Claude's candidates with
attestation pointers, awaiting AA's recognition test and kill-pass. Not
validated, not shipped, not content. Survivors get hand-promoted into
`taxonomy.json` (still `provisional: true`); the kill-record stays in the
draft file as stored judgment.
