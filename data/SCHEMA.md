# Session schema — prototype of the Truth Registry node shape

This schema is a deliverable in its own right: it prototypes how Truth Registry
nodes will be shaped, even though this sandbox's *content* is generated for
geometry testing and must never be migrated into the Registry (it has not
passed Tier 1 translation review or rejected-parallel curation discipline).

One JSON file per session in `data/sessions/`. Types are enforced in
`lib/types.ts`.

## Session

| field | type | notes |
|---|---|---|
| `schemaVersion` | `1` | bump on breaking changes |
| `id` | string | kebab-case, unique, doubles as the URL slug |
| `painCategory` | enum | one of the fixed 10 (below) |
| `surfaceComplaint` | string | the pain in the user's own register — one sentence, first person |
| `complaintBody` | string | 2–4 sentences unpacking the complaint, still surface-level (pre-mechanism) |
| `mechanism` | Mechanism | the named psychological mechanism — the routing key of the whole system |
| `parallels` | Parallel[] | ≥3 accepted from ≥3 distinct lineages, one of which must be `Neuroscience/Psychology`; ≥1 with `status: "rejected"` |
| `payoff` | string | the recognition synthesis — what the parallels jointly reveal; shown at arrival, before practice |
| `practice` | Practice | required. Every session terminates here; no geometry may omit it. This is **the default** — arrival presents exactly this one |
| `alternatePractices` | Practice[]? | ≤2, shown only behind arrival's closed *"another way"* fold — a landing, not a menu (locked decision 12: mechanism→practice is 1:many in data, one practice at arrival in experience) |

## Mechanism

| field | type | notes |
|---|---|---|
| `id` | string | namespaced `mech.<kebab-name>`. **Provisional** — the real mechanism taxonomy does not exist yet; these IDs are ad hoc placeholders, not Registry keys |
| `name` | string | short, precise, non-clinical |
| `provisional` | boolean | `true` for all sandbox content |
| `description` | string | 2–4 sentences: how the mechanism actually works, mechanically, no tradition language |

## Parallel

Parallels — including rejected ones — are first-class nodes, the future
Registry passage shape. A rejected parallel is stored judgment: a passage that
*looks* like it maps to the mechanism but doesn't, with the reason it fails.

| field | type | notes |
|---|---|---|
| `id` | string | kebab-case, unique within session |
| `lineage` | enum | see lineages below |
| `status` | `"accepted"` \| `"rejected"` | rejected parallels render as visually distinct nodes in every geometry |
| `title` | string | short handle for the node label on the map |
| `source` | Source | citation: `{ work, author?, locus?, translationNote? }`. In the Registry this will point at a Tier 1 translation; here it's informal |
| `passage` | string | the quoted or tightly paraphrased passage. For empirical frames this is a findings summary, not scripture — keep the register distinct |
| `reading` | string | how the passage maps onto the mechanism (or appears to). The curated interpretive move — this, not the passage, is the product |
| `deepening` | Deepening? | optional one-level-deeper layer `{ id, title, body }`. Accepted parallels may deepen; **rejected parallels never deepen** — dead ends by design, in data and geometry alike |
| `rejectionReason` | string? | required iff `status: "rejected"`: precisely why the apparent mapping fails. The moat |

## Practice

| field | type | notes |
|---|---|---|
| `id` | string | namespaced `prac.<kebab-name>` |
| `name` | string | |
| `steps` | string[] | concrete, ordered, doable today |
| `durationMinutes` | number? | rough, optional |

## Fixed vocabularies

**Pain categories (10, locked):** Anxiety, Burnout, Meaning Crisis, Identity
Confusion, Decision Paralysis, Relationship Suffering, Anger and Reactivity,
Grief and Loss, Shame and Self-Judgment, Disconnection.

**Lineages (MVP subset of the 9 families):** Stoicism, Buddhism, Hindu/Gītā,
Christianity, Sufism, Taoism, Neuroscience/Psychology.

## Constellation record (persistence stub)

On arrival the app writes a minimal record to `localStorage` under
`uot.constellation.v1` (see `lib/constellation.ts`) shaped for a future
Constellation view:

```json
{
  "sessionId": "anger-reactivity",
  "painCategory": "Anger and Reactivity",
  "mechanismId": "mech.assent-replay-amplification",
  "lineagePath": ["stoic-first-movements", "second-arrow"],
  "practiceId": "prac.ninety-seconds-no-narration",
  "completedAt": "2026-07-06T12:00:00.000Z"
}
```

`lineagePath` is the ordered list of parallel IDs visited (rejected ones
included — visiting a rejection is real exploration).
