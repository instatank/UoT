#!/usr/bin/env node
// registry:check — validates the Truth Registry (registry/) against the
// ratified rules. Machine-checkable half of the Admission Gauntlet and the
// editorial discipline; the judgment half stays with AA.
//
//   npm run registry:check               validate registry/
//   npm run registry:check -- --self-test  prove the validator catches what it must
//
// Enforced here (sources: CLAUDE.md locked decisions 2, 9, 12, 13; PRODUCT.md §8.3, §9.2, §9.5):
//   - citations resolve: parallel.passageRef → passage, parallel.mechanismId → mechanism,
//     practice.mechanisms[] → mechanisms, descent refs → everything
//   - rejected ⇒ rejectionReason, and rejected parallels never deepen
//   - every descent reaches practice (default resolves; alternates ≤ 2)
//   - every passage has a rights status
//   - admission structure: ≥3 distinct lineages incl. ≥1 empirical, 2–3 recognition
//     lines, ≤6-word plain names, hard cap 60 mechanisms
//   - descent content rule: ≥3 accepted parallels across ≥3 lineages incl. one
//     empirical, ≥1 rejected

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = join(ROOT, 'registry');

const PAIN_CATEGORIES = [
  'Anxiety',
  'Burnout',
  'Meaning Crisis',
  'Identity Confusion',
  'Decision Paralysis',
  'Relationship Suffering',
  'Anger and Reactivity',
  'Grief and Loss',
  'Shame and Self-Judgment',
  'Disconnection',
];
const EMPIRICAL = 'Neuroscience/Psychology';
const RIGHTS = ['public-domain', 'quotation', 'licensed', 'commissioned'];
const MECHANISM_HARD_CAP = 60;
const MAX_ALTERNATES = 2;

// ---------- loading ----------

function jsonFilesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...jsonFilesUnder(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function loadRegistryFromDisk() {
  const problems = [];
  const readJson = (path) => {
    try {
      return JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
      problems.push(`${relative(ROOT, path)}: unparseable JSON — ${e.message}`);
      return null;
    }
  };
  const collect = (sub) =>
    jsonFilesUnder(join(REG, sub))
      .map((p) => ({ file: relative(ROOT, p), data: readJson(p) }))
      .filter((x) => x.data !== null);

  const taxonomyPath = join(REG, 'taxonomy.json');
  const taxonomy = existsSync(taxonomyPath) ? readJson(taxonomyPath) : null;
  if (!taxonomy) problems.push('registry/taxonomy.json: missing or unparseable');

  return {
    taxonomy,
    passages: collect('passages'),
    parallels: collect('parallels'),
    practices: collect('practices'),
    descents: collect('descents'),
    loadProblems: problems,
  };
}

// ---------- validation ----------

function validate(reg) {
  const errors = [];
  const warnings = [];
  const err = (file, msg) => errors.push(`${file}: ${msg}`);
  const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

  for (const p of reg.loadProblems ?? []) errors.push(p);
  const tax = reg.taxonomy;
  if (!tax) return { errors, warnings };

  const taxFile = 'registry/taxonomy.json';

  // taxonomy top level
  const cats = tax.painCategories ?? [];
  if (
    cats.length !== PAIN_CATEGORIES.length ||
    PAIN_CATEGORIES.some((c) => !cats.includes(c))
  ) {
    err(taxFile, 'painCategories must be exactly the locked 10 (see CLAUDE.md)');
  }
  const lineages = tax.lineages ?? [];
  if (!lineages.includes(EMPIRICAL)) {
    err(taxFile, `lineages must include the empirical lineage "${EMPIRICAL}"`);
  }

  // mechanisms
  const mechs = tax.mechanisms ?? [];
  const mechIds = new Map();
  if (mechs.length > MECHANISM_HARD_CAP) {
    err(taxFile, `${mechs.length} mechanisms — hard cap is ${MECHANISM_HARD_CAP} (locked decision 13)`);
  }
  const perCategory = new Map();
  for (const m of mechs) {
    const label = `${taxFile} → ${m.id ?? '(no id)'}`;
    if (!m.id || !m.id.startsWith('mech.')) err(label, 'id must start with "mech."');
    if (m.id) {
      if (mechIds.has(m.id)) err(label, 'duplicate mechanism id');
      mechIds.set(m.id, m);
    }
    if (!m.name) err(label, 'name required');
    else if (m.name.trim().split(/\s+/).length > 6)
      err(label, `name "${m.name}" exceeds 6 words (naming discipline, decision 13)`);
    if (!m.definition) err(label, 'definition required (what it does, step by step)');
    if (typeof m.provisional !== 'boolean') err(label, 'provisional (boolean) required');
    const mCats = m.painCategories ?? [];
    if (mCats.length === 0) err(label, 'painCategories must be non-empty');
    for (const c of mCats) {
      if (!PAIN_CATEGORIES.includes(c)) err(label, `unknown pain category "${c}"`);
      perCategory.set(c, (perCategory.get(c) ?? 0) + 1);
    }
    if (mCats.length >= 4)
      warn(label, `serves ${mCats.length} categories — probably a theme, not a mechanism (rule 3); review`);
    const lines = m.recognitionLines ?? [];
    if (lines.length < 2 || lines.length > 3)
      err(label, `${lines.length} recognition lines — every mechanism ships with 2–3 (rule 4)`);
    const atts = m.attestations ?? [];
    const attLineages = new Set(atts.map((a) => a.lineage));
    for (const a of atts) {
      if (!lineages.includes(a.lineage)) err(label, `attestation has unknown lineage "${a.lineage}"`);
      if (!a.pointer) err(label, 'every attestation needs a pointer (human-readable citation)');
    }
    if (attLineages.size < 3)
      err(label, `attestations cover ${attLineages.size} lineages — admission needs ≥3 (rule 1)`);
    if (!attLineages.has(EMPIRICAL))
      err(label, `no empirical attestation — admission needs ≥1 ${EMPIRICAL} frame (rule 2)`);
  }
  for (const [c, n] of perCategory) {
    if (n > 6) warn(taxFile, `category "${c}" holds ${n} mechanisms — structure says 3–6 per category`);
  }

  // passages
  const passIds = new Map();
  for (const { file, data: p } of reg.passages) {
    if (!p.id || !p.id.startsWith('pass.')) err(file, 'id must start with "pass."');
    if (p.id) {
      if (passIds.has(p.id)) err(file, `duplicate passage id ${p.id}`);
      passIds.set(p.id, p);
    }
    if (!lineages.includes(p.lineage)) err(file, `unknown lineage "${p.lineage}"`);
    if (!p.work) err(file, 'work required');
    if (!p.text) err(file, 'text required');
    if (p.tier !== 1 && p.tier !== 2) err(file, 'tier must be 1 or 2');
    if (!p.rights) err(file, 'rights status required — no passage ships without one (PRODUCT.md §9.5)');
    else if (!RIGHTS.includes(p.rights)) err(file, `rights "${p.rights}" not one of ${RIGHTS.join(', ')}`);
    if (p.rights === 'quotation' && !p.contextUrl)
      warn(file, 'quotation-rights passage should carry a contextUrl ("read it in context")');
  }

  // verified attestation refs resolve (only checkable once passages exist)
  for (const m of mechs) {
    for (const a of m.attestations ?? []) {
      if (a.passageRef && !passIds.has(a.passageRef))
        err(`registry/taxonomy.json → ${m.id}`, `attestation passageRef "${a.passageRef}" does not resolve`);
    }
  }

  // parallels
  const parIds = new Map();
  for (const { file, data: p } of reg.parallels) {
    if (!p.id || !p.id.startsWith('par.')) err(file, 'id must start with "par."');
    if (p.id) {
      if (parIds.has(p.id)) err(file, `duplicate parallel id ${p.id}`);
      parIds.set(p.id, p);
    }
    if (!mechIds.has(p.mechanismId)) err(file, `mechanismId "${p.mechanismId}" does not resolve`);
    if (!passIds.has(p.passageRef)) err(file, `passageRef "${p.passageRef}" does not resolve`);
    if (p.status !== 'accepted' && p.status !== 'rejected')
      err(file, 'status must be "accepted" or "rejected"');
    if (!p.line) err(file, 'line (depth 1, one sentence) required');
    if (!p.reading) err(file, 'reading (depth 3, the interpretive move) required');
    if (p.status === 'rejected') {
      if (!p.rejectionReason)
        err(file, 'rejected parallel without rejectionReason — the reason IS the content (decision 2)');
      if (p.deepening) err(file, 'rejected parallels never deepen — dead ends by design');
    } else if (p.rejectionReason) {
      warn(file, 'accepted parallel carries a rejectionReason — leftover from a status flip?');
    }
  }

  // practices
  const pracIds = new Map();
  for (const { file, data: p } of reg.practices) {
    if (!p.id || !p.id.startsWith('prac.')) err(file, 'id must start with "prac."');
    if (p.id) {
      if (pracIds.has(p.id)) err(file, `duplicate practice id ${p.id}`);
      pracIds.set(p.id, p);
    }
    if (!p.name) err(file, 'name required');
    if (!Array.isArray(p.steps) || p.steps.length === 0) err(file, 'steps must be non-empty');
    const pm = p.mechanisms ?? [];
    if (pm.length === 0) err(file, 'mechanisms must be non-empty (1:many, decision 12)');
    for (const id of pm) if (!mechIds.has(id)) err(file, `mechanisms ref "${id}" does not resolve`);
    if (p.lineageOrigin && !lineages.includes(p.lineageOrigin))
      err(file, `unknown lineageOrigin "${p.lineageOrigin}"`);
  }

  // descents
  const descIds = new Set();
  for (const { file, data: d } of reg.descents) {
    if (!d.id) err(file, 'id required');
    if (d.id) {
      if (descIds.has(d.id)) err(file, `duplicate descent id ${d.id}`);
      descIds.add(d.id);
    }
    if (!PAIN_CATEGORIES.includes(d.painCategory)) err(file, `unknown pain category "${d.painCategory}"`);
    if (!d.surfaceComplaint) err(file, 'surfaceComplaint required');
    if (!mechIds.has(d.mechanismId)) err(file, `mechanismId "${d.mechanismId}" does not resolve`);
    if (!d.convergence) err(file, 'convergence required (the unifying thread — the payoff)');

    const refs = d.parallels ?? [];
    const resolved = refs.map((id) => parIds.get(id)).filter(Boolean);
    for (const id of refs) if (!parIds.has(id)) err(file, `parallel ref "${id}" does not resolve`);
    const accepted = resolved.filter((p) => p.status === 'accepted');
    const rejected = resolved.filter((p) => p.status === 'rejected');
    const acceptedLineages = new Set(
      accepted.map((p) => passIds.get(p.passageRef)?.lineage).filter(Boolean)
    );
    if (accepted.length < 3) err(file, `${accepted.length} accepted parallels — needs ≥3`);
    if (acceptedLineages.size < 3)
      err(file, `accepted parallels span ${acceptedLineages.size} lineages — needs ≥3 distinct`);
    if (!acceptedLineages.has(EMPIRICAL))
      err(file, `no accepted empirical parallel — one ${EMPIRICAL} frame is mandatory`);
    if (rejected.length < 1) err(file, 'no rejected parallel — ≥1 Near Miss is mandatory (decision 2)');

    const prac = d.practice ?? {};
    if (!prac.default) {
      err(file, 'practice.default required — every descent reaches practice (decision 9)');
    } else if (!pracIds.has(prac.default)) {
      err(file, `practice.default "${prac.default}" does not resolve`);
    } else if (!(pracIds.get(prac.default).mechanisms ?? []).includes(d.mechanismId)) {
      warn(file, `default practice "${prac.default}" does not list this descent's mechanism`);
    }
    const alts = prac.alternates ?? [];
    if (alts.length > MAX_ALTERNATES)
      err(file, `${alts.length} alternate practices — arrival holds one default + ≤${MAX_ALTERNATES} behind the fold (decision 12)`);
    for (const id of alts) if (!pracIds.has(id)) err(file, `alternate practice "${id}" does not resolve`);
    if (alts.includes(prac.default)) warn(file, 'default practice repeated in alternates');
  }

  const summary =
    `${mechs.length} mechanism${mechs.length === 1 ? '' : 's'}, ` +
    `${reg.passages.length} passages, ${reg.parallels.length} parallels, ` +
    `${reg.practices.length} practices, ${reg.descents.length} descents`;
  return { errors, warnings, summary };
}

// ---------- self-test ----------

function fixtureRegistry() {
  const mech = {
    id: 'mech.test-fixture',
    name: 'Rehearsal billed as the event',
    definition: 'threat flagged → simulated → body billed per run → relief reinforces the loop',
    provisional: true,
    painCategories: ['Anxiety'],
    recognitionLines: ['I rehearse conversations that have not happened yet.', 'Friday has already happened forty times.'],
    attestations: [
      { lineage: 'Stoicism', pointer: 'Seneca, Letters 13' },
      { lineage: 'Buddhism', pointer: 'MN 18' },
      { lineage: 'Neuroscience/Psychology', pointer: 'Grupe & Nitschke 2013' },
    ],
    tensions: [],
  };
  const passages = [
    ['stoic', 'Stoicism'],
    ['buddhist', 'Buddhism'],
    ['empirical', 'Neuroscience/Psychology'],
    ['christian', 'Christianity'],
  ].map(([slug, lineage]) => ({
    file: `registry/passages/${slug}.json`,
    data: {
      id: `pass.${slug}.one`,
      lineage,
      work: 'Test Work',
      tier: 1,
      rights: 'public-domain',
      text: 'A passage.',
    },
  }));
  const par = (slug, passSlug, status) => ({
    file: `registry/parallels/mech.test-fixture/${slug}.json`,
    data: {
      id: `par.${slug}`,
      mechanismId: 'mech.test-fixture',
      passageRef: `pass.${passSlug}.one`,
      status,
      line: 'One modern sentence.',
      reading: 'The interpretive move.',
      ...(status === 'rejected' ? { rejectionReason: 'Looks right; does not hold, because…' } : {}),
    },
  });
  return {
    taxonomy: {
      schemaVersion: 1,
      painCategories: [...PAIN_CATEGORIES],
      lineages: ['Stoicism', 'Buddhism', 'Hindu/Gītā', 'Christianity', 'Sufism', 'Taoism', EMPIRICAL],
      mechanisms: [mech],
    },
    passages,
    parallels: [par('a', 'stoic', 'accepted'), par('b', 'buddhist', 'accepted'), par('c', 'empirical', 'accepted'), par('d', 'christian', 'rejected')],
    practices: [
      {
        file: 'registry/practices/prac.test.json',
        data: { id: 'prac.test', name: 'Test practice', steps: ['Do the thing.'], mechanisms: ['mech.test-fixture'] },
      },
      {
        file: 'registry/practices/prac.alt.json',
        data: { id: 'prac.alt', name: 'Another way', steps: ['Do the other thing.'], mechanisms: ['mech.test-fixture'] },
      },
    ],
    descents: [
      {
        file: 'registry/descents/test.json',
        data: {
          schemaVersion: 1,
          id: 'test-descent',
          painCategory: 'Anxiety',
          surfaceComplaint: 'I cannot stop rehearsing it.',
          complaintBody: 'Body.',
          mechanismId: 'mech.test-fixture',
          parallels: ['par.a', 'par.b', 'par.c', 'par.d'],
          convergence: 'The unifying thread.',
          practice: { default: 'prac.test', alternates: ['prac.alt'] },
        },
      },
    ],
    loadProblems: [],
  };
}

function selfTest() {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const cases = [
    {
      name: 'valid fixture registry passes clean',
      mutate: () => {},
      expectError: null,
    },
    {
      name: 'rejected parallel without rejectionReason',
      mutate: (r) => delete r.parallels[3].data.rejectionReason,
      expectError: 'rejectionReason',
    },
    {
      name: 'rejected parallel with a deepening',
      mutate: (r) => (r.parallels[3].data.deepening = { id: 'x', title: 't', body: 'b' }),
      expectError: 'never deepen',
    },
    {
      name: 'passage missing rights',
      mutate: (r) => delete r.passages[0].data.rights,
      expectError: 'rights status required',
    },
    {
      name: 'dangling passageRef',
      mutate: (r) => (r.parallels[0].data.passageRef = 'pass.ghost.one'),
      expectError: 'does not resolve',
    },
    {
      name: 'descent without a default practice',
      mutate: (r) => delete r.descents[0].data.practice.default,
      expectError: 'practice.default required',
    },
    {
      name: 'descent with 3 alternates',
      mutate: (r) => (r.descents[0].data.practice.alternates = ['prac.alt', 'prac.alt2', 'prac.alt3']),
      expectError: 'alternate practices',
    },
    {
      name: 'descent with no rejected parallel',
      mutate: (r) => (r.descents[0].data.parallels = ['par.a', 'par.b', 'par.c']),
      expectError: 'Near Miss',
    },
    {
      name: 'mechanism attested by only 2 lineages',
      mutate: (r) => (r.taxonomy.mechanisms[0].attestations = r.taxonomy.mechanisms[0].attestations.slice(0, 2)),
      expectError: 'needs ≥3',
    },
    {
      name: 'mechanism without empirical attestation',
      mutate: (r) => {
        r.taxonomy.mechanisms[0].attestations = [
          { lineage: 'Stoicism', pointer: 'x' },
          { lineage: 'Buddhism', pointer: 'x' },
          { lineage: 'Taoism', pointer: 'x' },
        ];
      },
      expectError: 'empirical',
    },
    {
      name: 'mechanism name over 6 words',
      mutate: (r) => (r.taxonomy.mechanisms[0].name = 'A name that runs to seven words total'),
      expectError: 'exceeds 6 words',
    },
    {
      name: 'only one recognition line',
      mutate: (r) => (r.taxonomy.mechanisms[0].recognitionLines = ['One line.']),
      expectError: 'recognition lines',
    },
    {
      name: 'wrong pain category list',
      mutate: (r) => (r.taxonomy.painCategories = r.taxonomy.painCategories.slice(1)),
      expectError: 'locked 10',
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const reg = clone(fixtureRegistry());
    c.mutate(reg);
    const { errors } = validate(reg);
    const ok =
      c.expectError === null
        ? errors.length === 0
        : errors.some((e) => e.includes(c.expectError));
    if (!ok) {
      failed++;
      console.error(`  ✗ ${c.name}`);
      if (c.expectError === null) for (const e of errors) console.error(`      unexpected: ${e}`);
      else console.error(`      expected an error containing "${c.expectError}"; got: ${errors.join(' | ') || '(none)'}`);
    } else {
      console.log(`  ✓ ${c.name}`);
    }
  }
  console.log(failed === 0 ? `\nself-test: all ${cases.length} cases pass` : `\nself-test: ${failed} case(s) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

// ---------- main ----------

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const reg = loadRegistryFromDisk();
  const { errors, warnings, summary } = validate(reg);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  const empty =
    (reg.taxonomy?.mechanisms ?? []).length === 0 &&
    reg.passages.length + reg.parallels.length + reg.practices.length + reg.descents.length === 0;
  if (errors.length === 0) {
    console.log(`registry:check OK — ${summary}${empty ? ' (empty registry: scaffold valid, awaiting the Phase 1 gauntlet)' : ''}${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);
  } else {
    console.error(`registry:check FAILED — ${errors.length} error(s), ${warnings.length} warning(s)`);
  }
  process.exit(errors.length === 0 ? 0 : 1);
}
