# PRODUCT.md — Unity of Truths: the product plan

**Status: proposal, drafted 2026-07-06.** For AA to ratify, amend, or strike section by section. It inherits every locked decision in CLAUDE.md and does not re-litigate them; where it resolves one of the three open problems, the resolution is marked **PROPOSAL** and needs explicit ratification before it becomes a locked decision. Once ratified, fold the verdicts into CLAUDE.md and treat this file as the product roadmap.

This plan also absorbs the original "content engine" concept (the Pain → Parallels → Payoff diagram with social channels). That diagram survives — but content becomes a *compiled output* of the product's data, not a separate track. One source of truth, several surfaces. That's the noise-removal move.

---

## 1. Why this exists, and what it is

**The mission, in AA's words:** *we are not as divided and different as we think we are. Human problems are universal, and the wisdom disciplines that address them — Eastern and Western religions, philosophy, science, psychology — are describing the same truths in different languages. You don't have to subscribe to one over the other, and you don't have to treat the people who did as enemies. The way to bring that to the world is not to argue it, but to make it* useful — *to solve people's day-to-day problems with it.*

That last clause is the entire product strategy. Nobody's mind was ever changed by a lecture on the unity of religions. But someone who came in at 2am for their anxiety and walked out having *felt* the Stoics, the Buddha, the Gītā, the Gospels, Rumi, and a neuroscience lab agree about the exact thing eating them — that person has experienced the unity thesis as a fact about their own life. The product smuggles the biggest idea through the smallest door: what hurts today. Utility is the delivery vehicle; unity is the payload.

**One sentence:** a contemplative reference product that takes a person's present pain, names the psychological mechanism underneath it, shows them — with real, cited passages — that half a dozen wisdom traditions and modern science have all mapped that exact mechanism, and lands them in one concrete practice.

The event the product is built around is **recognition**, and it always fires twice: the personal recognition — *my private pain is a mapped territory, not my defect* — and, riding silently on top of it, the collective one — *the mappers, who supposedly disagree about everything, agree about me. We are less divided than we think.* Both from one session, and only the first one has to be asked for. Everything in the product exists to manufacture honest recognition moments and refuse fake ones.

**Why now — the honest version:**

1. **LLMs made synthesis free, which made judgment scarce.** Anyone can ask a chatbot for "what Buddhism and Stoicism say about anxiety" and get plausible slop with invented quotes. The defensible asset is no longer the parallels — it's the *curation*: verified passages, Tier 1 translations, and above all the stored record of parallels that look right and aren't. A rejection corpus cannot be prompted into existence.
2. **The meaning market is mainstream and underserved at the depth end.** "Spiritual but not religious" is roughly a third of adults and growing; the products serving them are either engagement-loop mindfulness apps (Calm, Headspace), single-tradition brands (Daily Stoic), or teacher-centric platforms (Waking Up). Nobody owns *convergence* — the cross-tradition mechanism view — as a product.
3. **The engagement backlash is real.** A session that ends on purpose — that resolves into arrival instead of branching forever — is now a differentiator, not a bug. We are structurally incapable of becoming a doomscroll, and that's marketing.
4. **One person can now run an editorial institution.** The Registry pipeline (draft → verify → judge → publish) used to need a staff. AA + Claude is the staff. The founder's actual job is the judgment layer, which is exactly the layer that can't be delegated to the model.

**Positioning line:** *Recognition, not argument.* (Already the tagline; it is also the product spec.)

**What it is not:** not therapy, not a religion, not a chatbot, not a course platform, not a quote app. See §14.

---

## 2. Who it's for

**The first user is AA.** That stays true through Phase 3 — the sandbox discipline (build what one person can feel and judge) is why this project is real while most solo-founder projects are decks.

**The first stranger** — the wedge persona, chosen deliberately narrow:

> Reads Marcus Aurelius and Thich Nhat Hanh without belonging to either. Listens to Huberman but is quietly bored of protocol-maxxing. Has a meditation app installed and opens it four times a year. Allergic to preachiness, allergic to "manifest your abundance," allergic to being sold enlightenment. In real pain sometimes — work, love, self-worth — and handles it by reading. Trusts citations more than vibes.

This person is *tradition-homeless but depth-hungry*. They are also, usefully, the exact person who makes wisdom content go viral when it's precise and sourced — the wedge persona and the distribution channel are the same human.

**Explicitly not targeting (for now):** the acutely mentally ill (we are not care — see §13), the devout-within-one-tradition (they have a home; some will still come), and the wellness-industrial mass market (they want streaks; we refuse streaks).

---

## 3. The shape: three layers

Everything the product will ever be is one of these three layers. Every feature idea should be sortable into exactly one, or it's noise.

```
┌────────────────────────────────────────────────────────────┐
│  SURFACES — where people meet it                           │
│  the app (Descents) · content (compiled) · Atlas (public)  │
├────────────────────────────────────────────────────────────┤
│  ENGINE — the session experience                           │
│  intake → naming → dig → convergence → practice → arrival  │
│  camera/maps/sheet/voice (built) · Constellation memory    │
├────────────────────────────────────────────────────────────┤
│  REGISTRY — the asset                                      │
│  mechanism taxonomy · passages (Tier 1, rights-tracked)    │
│  parallels: accepted AND rejected, with reasons            │
│  practices · tensions (where traditions truly disagree)    │
└────────────────────────────────────────────────────────────┘
```

- **The Registry is the company.** It compounds, it's defensible, it survives any redesign of the app. Ten years out, the Registry is a citable reference work and the app is merely its best reader.
- **The Engine is the craft.** The Descent experience — already substantially built as the geometry sandbox — is how recognition is staged. It's a 8–12 minute arc with dramaturgy, closer to a piece of theatre than a lesson.
- **Surfaces are leverage.** The same Registry node compiles to an app session, an Instagram carousel, a short-video script, an essay, and a public Atlas page. AA curates once, publishes five times.

---

## 4. Product vocabulary

A contemplative product needs its own quiet language. These names are cheap to adopt now and expensive to retrofit later. All of them extend vocabulary already in the codebase.

| term | meaning | status |
|---|---|---|
| **Descent** | one full session: pain → mechanism → parallels → practice → arrival | locked (decision 3) |
| **the Naming** | the moment the mechanism is recognized and named — the hinge of the session | new |
| **Parallel** | one tradition's mapping of the mechanism, with cited passage | existing |
| **Near Miss** | user-facing name for a rejected parallel — looks right, doesn't hold, here's why | new (schema: `status: rejected`) |
| **the Thread** | the arrival artifact: mechanism + one line per lineage + the unifying insight + the practice, as a saveable card | new (from AA's own "golden thread") |
| **Constellation** | cross-session memory: every Descent lights a star | locked (decision 4) |
| **Echo** | a practice quietly asking, next visit, whether it met you | new, later phase |
| **Atlas** | the public map of all mechanisms — the marketing site *is* the data | new |
| **Registry** | the curated corpus behind everything | locked |
| **Tension** | a documented point where traditions genuinely disagree | new |

---

## 5. Anatomy of a Descent

The core loop, staged. Stages 3–6 are already built in the sandbox; stages 1–2 are the new product work.

**1. The Door (cold start — PROPOSAL, see §8.1).** Two ways in:
- **"Say it."** A single quiet text box: *"Say it the way you'd say it to a friend at 2am."* The user's own words, unedited, become the surface complaint node of their Descent.
- **"The ten pains."** The fixed pain categories as a spare, unhurried list — the current picker, kept as the browse path.

Note what the Door never asks: who you are, what you believe, which tradition you're from. **Pain is the universal entrance.** Everyone — the Christian, the Buddhist, the atheist materialist — walks in through the same door, because the door is the one thing genuinely shared. That's the mission expressed as an onboarding decision.

**2. The Naming.** The system (LLM against the taxonomy — never freestyle, see §9.1) returns two or three candidate mechanisms, each rendered as a **first-person recognition line** — not a diagnosis, a mirror:

> *"I rehearse conversations that haven't happened yet."*
> *"I can't tell the difference between rest and quitting."*
> *"None of these"* → falls back to the category's mechanism list.

The user picks the one that stings. **The pick is the naming.** Nothing is told to the user; the user recognizes. This is the tagline operating as an interaction design.

**3. The Dig.** The excavation arc as built: mechanism reveals parallels, parallels deepen, Near Misses sit visibly off the path and dead-end by design. Depth dial per node (see §7.5). Voice available per node. 8–12 minutes by design.

**4. The Convergence.** Before practice, the payoff: the unifying thread across the visited lineages, stated plainly. Where a real Tension exists (self vs. no-self, grace vs. effort), it's named rather than smoothed over — unity earned, not asserted.

**5. The Practice.** One practice, concrete, doable today (granularity: §8.2). The session cannot end anywhere else (decision 9).

**6. Arrival & the Thread.** The arrival overlay (built) now *mints something*: the Thread — a typographically serious card recording the mechanism, one cited line per visited lineage, the convergence sentence, the practice, the date. Saved to the Constellation automatically; exportable as an image on request. The Thread is the payoff made tangible, and the product's only share surface — you share a completed recognition, never an invitation loop.

---

## 6. Where the three geometries land

The sandbox's question — which geometry wins — resolves not by picking one and deleting two, but by each finding its natural home. **PROPOSAL, pending AA feeling all three on a phone:**

- **Descent strata → the session spine.** Already locked as the session geometry (decision 3); the strata rendering is its most literal, most legible expression, and the only one with a true portrait-native layout. The Descent *is* the product's core screen.
- **Bounded radial → the Constellation.** A star-field of visited mechanisms radiating by pain category is exactly what the radial engine already draws. The cross-session memory view reuses `radialLayout` + `MapViewport` nearly wholesale. The radial map was never the session — it was always the sky above it.
- **Braided river → the Convergence stage and the Atlas.** Streams that drift near each other and reconverge into one pool is the *visual argument of the entire thesis* — many languages, one truth. Too horizontal for a phone session, perfect as the convergence moment's visualization and as the Atlas's signature graphic on the public site.

Nothing built gets thrown away; the sandbox retroactively becomes the component library of the real product. (If AA disagrees after the phone pass, the fallback is: strata for sessions, radial for Constellation, river archived.)

---

## 7. Signature features

The features that make this product *this product*. Ordered by how much of the soul they carry.

### 7.1 The Naming (recognition-as-interaction)
Covered in §5.2. The technical requirement it creates: every mechanism in the taxonomy ships with 2–3 first-person recognition lines, written to sting. These lines are Registry content, AA-curated, and double as the content engine's best hooks.

### 7.2 Near Misses (the moat, made visible)
Rejected parallels stay first-class in the UI (locked, decision 2) — but go further: make rejection a *public genre*. A "Near Miss" is inherently shareable intellectual drama: **"You've seen the quote 'Buddha said: pain is inevitable, suffering is optional.' He didn't. Here's what the texts actually say, and it's sharper."** As a content series this is a wedge into exactly our persona (citation-trusting, slop-fatigued); in-app it's what makes the product feel *edited* rather than generated — the visible presence of an editor who says no. The trust page (§7.7) runs a public counter: parallels considered / parallels rejected. That ratio is the moat, displayed.

### 7.3 The Thread (arrival artifact)
Spec in §5.6. Implementation note: render as SVG → PNG client-side (no backend), quiet dark card, real citations in small type. Threads are the atomic unit of the Constellation and the only artifact a user ever shows another human. Design bar: someone who has never heard of the app should see a shared Thread and understand the entire thesis in five seconds — six lineages, one line each, one truth underneath. Every Thread is the mission in miniature: a small, cited proof that humanity agrees on more than it disputes, minted from one person's Tuesday.

### 7.4 The Constellation (memory that isn't a graph of guilt)
V1 (Phase 3): the radial star-field of completed Descents, grouped by pain category; tap a star, reopen its Thread. No counts, no completeness meters, no "7-day journey." The Constellation answers one question only: *where have I been?* Its emotional job is quiet accumulated self-knowledge — "my pain has a shape; it's mostly two categories" — which no engagement metric can fake.

### 7.5 The Depth Dial (three readings per node)
Formalize what the staged sheet + folds already do into an explicit content contract. Every Parallel readable at three depths:
1. **the line** — one sentence, modern words (map label / pill row);
2. **the passage** — the actual cited text, Tier 1 translation (sheet, half);
3. **the reading** — the interpretive move: how this maps to the mechanism, where its edges are (sheet, full / fold).
Casual users get resonance; serious users get scholarship; nobody gets a prose wall. This contract is also exactly what the content compiler needs (line → hook, passage → body, reading → caption).

### 7.6 Echoes (practice follow-through without streaks) — later phase
Next time the user opens the app (v0: on-open only, **no notifications**), one question, once: *"Last time you left with the ninety-second practice. Did it meet you?"* — met me / not yet / didn't try. One tap, then the app moves on, and the answer is stored on the Thread. Echoes exist for **content adaptation** (a practice that repeatedly doesn't land gets demoted in the Registry), not for reward. No chains, no history pressure, a "don't ask me this" switch in settings. Designed against decision 6 and reviewed against it before build; if it ever feels like a leash, kill it.

### 7.7 The Atlas + Trust page (the public face) — Phase 4
The landing page is not a landing page; it's the **Atlas** — the mechanism taxonomy rendered as an explorable star map (radial engine, reused). Each mechanism gets a public page: definition, recognition lines, a taste of the parallels (one full, others teased), one Near Miss in full (show the judgment!), practice teaser → enter a Descent. This is the SEO organ and the credibility organ in one: long-term, "the mechanism pages" should be what people cite in group chats the way they cite Wikipedia. The Atlas is also the mission's standing public exhibit — an explorable map of everything the traditions agree on, each entry admitted only because ≥3 of them independently attest it. Anyone who wanders it for two minutes leaves with the point made, and nobody argued with them.
The **Trust page** states the method: translation tiers, the admission rule (§8.3), the rejection discipline, rights practices, and the pledge that matters in 2026: **"No machine-attributed quotes. Every passage on every surface has a human-verified citation."**

### 7.8 Voice & ambience (built — hold the line)
Keep the neutral system voice and generated drone exactly as designed (decisions 6, 7). Later option, cost-bounded: pre-render one high-quality *neutral* TTS reading per node at build time (fixed cost per content item, zero per-user cost, cached). Only if AA finds device voices break the spell. A persona voice remains banned.

---

## 8. The three open problems, resolved (PROPOSALS)

### 8.1 Cold start → the Two Doors + crisis off-ramp
As specced in §5.1–5.2. The LLM's only job is mapping free text → `{painCategory, candidateMechanismIds[2–3], crisisFlag}` — a classification into the fixed taxonomy, never generation. "None of these" is always present and falls back to browsing, and every miss is logged (anonymously, locally at first) as taxonomy feedback: repeated misses in a category = missing mechanism.
**The crisis off-ramp ships day one of intake:** if the text signals acute danger (self-harm, harm to others, medical emergency), the Descent does not begin; a calm full-screen hands them real resources (region-appropriate hotlines, a plain "this app is contemplation, not care" line). Cheap to build, non-negotiable to have. This is a floor requirement of operating in this category at all.

### 8.2 Practice granularity → 1:many data, one-practice arrival
- **Data model:** mechanism → practices is 1:many in the Registry (a mechanism accumulates practices from multiple lineages plus empirical ones).
- **Experience:** arrival presents **exactly one** practice — the default — with a closed fold: *"another way"*, holding 1–2 alternates. Rationale: arrival must remain a single bounded landing (decision 5); a menu at the moment of surrender reintroduces deliberation (and would be black comedy in the Decision Paralysis category). Which practice is default is editorial at first, Echo-informed later.

### 8.3 Mechanism taxonomy → the Admission Gauntlet
The critical artifact, built as a process rather than a brainstorm:

**The admission rule — a mechanism earns a slot only if:**
1. **≥3 independent lineages attest it** (each with a real candidate passage — pointers now, Tier 1-verified during Registry build);
2. **≥1 empirical frame exists** (neuroscience/psychology — the mandatory modern attestation, per the existing session rule);
3. **it names a moving part, not a theme.** "Attachment" is a theme; *"assent to the first flash of anger converts a physical reflex into a grievance narrative"* is a mechanism. Test: can you say what it *does*, step by step, in one breath?
4. **it stings in first person** — every mechanism ships with recognition lines, and if none can be written that AA feels somatically, it's not a mechanism, it's an abstraction.

The convergence requirement means **the taxonomy itself is the thesis's evidence**: a mechanism exists in our system precisely because multiple traditions found it independently. The index is the argument.

**Naming discipline:** plain modern English, ≤6 words, no Sanskrit/Greek/Pali/Latin, no DSM borrowings, no poetry. (Lineage terms appear *inside* parallels, where they belong.)
**Structure:** two levels only — the 10 locked pain categories → 3–6 mechanisms each. **Target: 30–45 mechanisms in v0.1, hard cap 60.** Many-to-many is allowed (a mechanism may serve two categories) but flagged for review if it serves 4+ (probably a theme, see rule 3).
**Process:** per category — Claude drafts 6–10 candidates with attestation pointers → AA runs the recognition test on himself and kills freely → survivors get the gauntlet → ship v0.1 with everything still marked `provisional: true`. Hardened only by use (Naming hit-rates, §12). Existing seed mechanisms (`mech.assent-replay-amplification` etc.) enter the gauntlet like everyone else.
**Tensions are recorded from day one:** wherever traditions genuinely disagree about a mechanism's resolution, the taxonomy stores it. Perennialism's critics are right about lazy unity; the Tensions ledger is our standing answer.

---

## 9. Architecture

Principle unchanged from the sandbox: **simplest thing that works, nothing to babysit.** A solo non-technical founder must be able to run this entire company from a git repo, a Vercel dashboard, and one API key.

### 9.1 The trust boundary (the architectural decision)

> **The LLM shapes the journey. Only the Registry speaks.**

At runtime, the model may: classify intake into the fixed taxonomy, choose which recognition lines to show, order and pace curated content, and (later, carefully) mirror the user's own phrasing back. The model may **never**, at runtime: generate a quote, a parallel, a payoff, a practice, or anything attributed to a tradition. Every contemplative sentence a user ever reads was placed there by a human editorial pass. Claude drafts *offline*, into the Registry, where AA judges before anything ships.
This single rule is simultaneously: the moat (curation), the safety story (no hallucinated scripture in front of a person in pain), the trust pledge (§7.7), and the cost model (runtime LLM = one cheap classification per session, roughly nothing).

### 9.2 Registry-as-repo (git is the CMS, Claude Code is the editor)

No CMS, no admin panel, no database until strangers have accounts. The Registry is a folder:

```
registry/
  taxonomy.json                      # mechanisms: name, definition, recognitionLines[],
                                     #   painCategories[], attestations, tensions[], provisional
  passages/<lineage>/…​.json          # work, author, locus, translation, tier, rights, text
  parallels/<mechanism-id>/…​.json    # passageRef, status: accepted|rejected, reading,
                                     #   rejectionReason, deepening
  practices/…​.json                   # steps, lineageOrigin?, mechanisms[] (1:many)
  descents/…​.json                    # compiled session graphs (today's data/sessions/, evolved)
  schema/  + `npm run registry:check` # validation: citations resolve, rejected⇒reason,
                                     #   every descent reaches practice, rights present
```

Why this is right and not just cheap: **git history is the editorial audit trail.** Every rejection, every reworded reading, every demoted practice is a diff with a commit message — the stored-judgment moat in literal form, reviewable forever. Claude Code is already AA's working environment; the Registry lives where the judgment happens. Migrate to Postgres (Supabase) only when accounts/search demand it (Phase 5); the JSON shape is designed to map 1:1 onto tables when that day comes.

### 9.3 Runtime

- **App:** the existing Next.js codebase, evolved — not rewritten. Statically built from `registry/` (as today from `/data`). Camera, sheet, voice, ambience, arrival: all keep.
- **One API route** (`/api/naming`): free text in → Claude API (small, fast model; strict JSON schema output constrained to taxonomy IDs; crisis classifier in the same call) → candidates out. The only server-side compute in the product until Phase 5. Rough cost at 1,000 sessions/month: single-digit dollars.
- **Persistence path:** localStorage (today) → **export/import your Constellation** as a JSON file (Phase 3 — data dignity without auth) → Supabase auth + sync (Phase 5, only if strangers stick). No accounts before there's a reason to have one.
- **Dependency policy holds:** next/react + hand-rolled everything, until a dependency earns its way in with a named reason.

### 9.4 The content compiler (the old content engine, absorbed)

A script (`npm run compile -- --mechanism=X --format=carousel|script|essay|atlas`), run by AA in Claude Code, never at runtime: takes one Registry mechanism and drafts platform-native content from its parts (recognition line → hook; passages → body; reading → caption; Near Miss → the "actually..." beat; Thread design → the closing card). Output lands in `content/drafts/` for AA to edit and post by hand. No auto-posting, no social APIs, no scheduler — the founder's taste stays in the loop; the leverage is that curation happens once, in the Registry, and radiates.

### 9.5 Rights (the unsexy load-bearing wall)

Tier 1 modern translations are mostly copyrighted. Strategy, tracked per passage in the Registry (`rights` field):
- **public-domain** — prefer where philologically defensible (much of the Stoics, older scripture translations);
- **quotation** — short excerpts with full citation + "read it in context" links to the translation's own home (defensible, respectful, and good for the ecosystem);
- **licensed / commissioned** — the Phase 5+ path for anchor texts if the product earns revenue.
No passage ships without a rights status. This is boring and it is exactly the kind of thing that separates a reference work from a quote app.

---

## 10. Roadmap

Phases gate on **exit criteria, not dates** — a solo founder's calendar is weather. Rough effort is noted honestly. The bottleneck everywhere is AA's judgment-hours, not code: Claude drafts, AA curates, and curation throughput is the company's actual speed limit.

**Phase 0 — Decide (this week).**
AA reads this plan and rules on: the PROPOSALS (§6 geometry homes, §8.1 doors, §8.2 practice, §8.3 gauntlet), and the phase gates below. Fold verdicts into CLAUDE.md.
*Exit: every PROPOSAL marked ratified / amended / rejected.*

**Phase 1 — The Taxonomy (2–4 weeks of curation sessions).**
Run the Admission Gauntlet across all 10 categories. Deliverables: `registry/taxonomy.json` v0.1 (30–45 mechanisms, all provisional), recognition lines for each, Tensions ledger started, attestation pointers for Phase 2 to verify.
*Exit: every category holds ≥2 mechanisms whose recognition lines sting AA in first person.*

**Phase 2 — Registry v1 + twelve real Descents (4–8 weeks, interleaved with Phase 3).**
Stand up `registry/` + validation. Source and verify passages for ~12 Descents covering all 10 categories (double up on Anxiety and Burnout — the front doors). Every Descent: ≥3 accepted parallels across ≥3 lineages incl. one empirical, ≥1 Near Miss with a reason worth reading aloud, 1–2 practices. Sandbox seed content retires with honors (never migrates — locked).
*Exit: 12 Descents AA would put in front of a stranger without apologizing.*

**Phase 3 — Product v1 (parallel with Phase 2; mostly build, moderate).**
One session geometry (per §6). The Two Doors + Naming + crisis off-ramp. The Thread (mint, save, export-as-image). Constellation v1 (radial star-field over localStorage + export/import). Kill the geometry switcher in product (it survives at a `/lab` URL — the sandbox stays a sandbox).
*Exit: a stranger with no coaching completes a Descent on their phone, arrives, and saves a Thread. Watch three of them do it.*

**Phase 4 — The public face (ongoing once content exists).**
Atlas + mechanism pages + Trust page. Content compiler with two formats first (carousel + short-video script); launch the **Near Miss series** as the flagship format. Publish the methodology. Goal: 100 strangers through full Descents.
*Exit: 100 arrivals by people AA has never met; arrival-rate and Thread-save data in hand.*

**Phase 5 — Membership (gated on signal, not enthusiasm).**
Trigger: ≥30% of Phase 4 strangers return for a second Descent within 30 days, unprompted (we run no prompts — that's the point). Then: Supabase accounts + Constellation sync, Stripe, the free/member split (§13), Echoes v1, possibly pre-rendered neutral voice.
*Exit: first 100 paying members, or an honest decision that this is a beloved free artifact instead — both are legitimate outcomes and the Registry retains its value either way.*

**Horizon (not planned, named so they don't distort earlier phases):** public Registry API for researchers/builders; commissioned translations; field-guide books per pain category; B2B reference licensing (therapists, chaplains, coaches). None of these get a line of code before Phase 5 completes.

---

## 11. Metrics

We measure whether recognition happened, not whether attention was captured.

**Measured:**
- **Naming hit-rate** — % of intakes where a recognition line got picked (vs "none of these"). *This is the taxonomy's grade.*
- **Arrival rate** — % of started Descents that reach arrival. A Descent that doesn't arrive is a design failure, ours not the user's. Bar: ≥70%.
- **Thread saves/exports** — did the payoff feel worth keeping?
- **Echo: "met me" rate** (Phase 5) — the only practice-quality signal that exists anywhere in this market.
- **Unprompted return within 30 days** — return *by choice* is the only retention we count, because it's the only kind we allow ourselves to earn.

**Anti-metrics (tracked to stay small):**
- Time-in-descent drifting past ~15 min → we're becoming a feed; cut content.
- Descents per user per week > ~3 → contemplation is becoming consumption; investigate against decision 5.
- DAU is not a number this company knows.

---

## 12. Business model (sketch — nothing built before Phase 5)

- **Free, forever:** several Descents a month, the Constellation, the full Atlas. The reference layer stays open — that's how a reference work earns citations and trust.
- **Membership** (~$8/mo or ~$64/yr, tuned later): unlimited Descents, Echoes, voice, Constellation sync across devices, Thread exports in print quality, field guides as they exist. The pitch is depth and patronage of the Registry, not withheld necessities.
- **Field Guides** (Phase 5+ one-offs): the 10 pain categories are a natural product line — *The Anxiety Field Guide*: its mechanisms, its parallels, its Near Misses, its practices, beautifully typeset. Registry compilations, priced like serious books.
- **Never:** ads, engagement-priced anything, selling data, dark-pattern trials. (Also strategically correct: our persona pays for seriousness — Waking Up proved the depth end of this market monetizes without manipulation.)

---

## 13. Risks, stated plainly

1. **Curation throughput is the speed limit.** 12 excellent Descents is weeks of AA's judgment and there is no shortcut — the moat *is* the hours. Mitigations: Claude drafts everything first; admission rules make "good enough to ship provisional" a defined bar; timebox per node.
2. **Mental-health adjacency.** People in real pain will type real things into the Door. We hold the line — contemplative education, not care — visibly: the crisis off-ramp from day one, no diagnosis language anywhere (recognition lines are mirrors, not assessments), no outcome promises.
3. **Translation copyright.** Handled structurally (§9.5), but a mistake here damages exactly the trust the product sells. Rights status is a required field, enforced by `registry:check`.
4. **The perennialism critique.** Scholars will say we flatten real differences — and for every lazy unity product ever built, they were right. Our defense is structural, not rhetorical: Near Misses and the Tensions ledger mean we *document* divergence as content. Unity earned, not asserted. If a convergence can't survive that discipline, it doesn't ship.
5. **LLM-slop competition.** A hundred "wisdom apps" will launch with generated content. Our answer is the Trust page, the citation pledge, the visible rejection counter — and patience. Slop doesn't compound; a Registry does.
6. **Solo-founder scope.** This document is itself a risk. The mitigations are the phase gates (each has one exit criterion), the not-building list (§14), and the standing rule: when in doubt, the Registry wins the founder's hours — content over features, judgment over code.

---

## 14. What we will not build

Each refusal traces to a locked decision or to the §9.1 trust boundary.

- **No AI chat companion.** An open-ended "talk to me" surface is the guru by the back door — a personified authority with generated wisdom, violating decision 7 in spirit and §9.1 by letter. The Naming is the LLM's entire on-stage role.
- **No community, comments, or feeds.** Moderation burden aside, social features import engagement gravity into a product whose premise is that sessions *end*.
- **No streaks, badges, scores, or push-notification re-engagement.** Locked (decision 6). The single opt-in Echo (§7.6) is the outer limit, and it ships late and reviewed.
- **No tradition-first navigation as a primary surface.** Mechanism-first is locked (decision 1). A lineage index may exist someday as a *reference* view of the Registry; the front door never becomes "pick your religion."
- **No native apps.** The web product is already phone-first; PWA covers years. Revisit only if a capability (offline, audio background) forces it.
- **No user-generated content, no therapy positioning, no ads.** Ever, per §12–13.

---

## 15. Immediate next actions

1. **AA:** rule on the PROPOSALS (§6, §8.1, §8.2, §8.3) — a yes/no/amend per item is enough; verdicts get folded into CLAUDE.md.
2. **AA + Claude, first working session of Phase 1:** run the Admission Gauntlet on **Anxiety** end-to-end (candidates → recognition test → gauntlet → 3–5 admitted mechanisms) to calibrate the process before sweeping all 10 categories.
3. **Claude, buildable immediately after ratification:** `registry/` scaffold + `registry:check`, the Two Doors + Naming flow behind a flag, and the Thread card renderer — in that order.

The sandbox proved the session can feel alive. The taxonomy makes it true. The Registry makes it last. And the mission stays what it always was: show people — one solved Tuesday at a time — that we were never as divided as we were told.
