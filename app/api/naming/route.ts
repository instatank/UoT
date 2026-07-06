// /api/naming — the product's only server-side compute (PRODUCT.md §9.3).
// Free text in → {painCategory, candidateMechanismIds, crisisFlag} out.
//
// Trust boundary (§9.1, locked decision 11): the model CLASSIFIES into the
// fixed taxonomy — its output is validated down to known enum values and IDs,
// and the client renders only curated recognition lines looked up by ID. No
// model-generated sentence ever reaches the user. Crisis detection runs
// locally first (the floor) and in the same model call when a key exists.
//
// With no ANTHROPIC_API_KEY configured, the keyword heuristic in lib/naming
// answers instead — the Door degrades gracefully to zero-backend behavior.

import { NextResponse } from 'next/server';
import type { PainCategory } from '@/lib/types';
import { namingCandidates } from '@/data/naming';
import { classifyHeuristically, detectCrisis, type NamingResult } from '@/lib/naming';

const PAIN_CATEGORIES: PainCategory[] = [
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

const KNOWN_MECHANISM_IDS = namingCandidates.map((c) => c.mechanismId);

async function classifyWithModel(text: string, apiKey: string): Promise<NamingResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.NAMING_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        temperature: 0,
        system:
          'You are a classifier inside a contemplative app. You never generate content; you only classify the user\'s words into a fixed taxonomy via the tool. ' +
          'Pick the pain category that best fits (or "none"), up to 3 candidate mechanism ids ordered by fit (only ids whose mechanism plausibly underlies the text — fewer is better than wrong), ' +
          'and set crisisFlag true if the text signals acute danger: self-harm, suicide, harm to others, or medical emergency. When unsure about crisis, flag it.',
        messages: [
          {
            role: 'user',
            content:
              `Text to classify:\n"""\n${text}\n"""\n\nMechanisms:\n` +
              namingCandidates
                .map((c) => `- ${c.mechanismId} (${c.painCategory}): ${c.recognitionLines[0]}`)
                .join('\n'),
          },
        ],
        tools: [
          {
            name: 'classify_pain',
            description: 'Classify the text into the fixed taxonomy.',
            input_schema: {
              type: 'object',
              properties: {
                painCategory: { type: 'string', enum: [...PAIN_CATEGORIES, 'none'] },
                candidateMechanismIds: {
                  type: 'array',
                  items: { type: 'string', enum: KNOWN_MECHANISM_IDS },
                  maxItems: 3,
                },
                crisisFlag: { type: 'boolean' },
              },
              required: ['painCategory', 'candidateMechanismIds', 'crisisFlag'],
            },
          },
        ],
        tool_choice: { type: 'tool', name: 'classify_pain' },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const call = (data.content ?? []).find((b: { type: string }) => b.type === 'tool_use');
    if (!call?.input) return null;
    const input = call.input as {
      painCategory?: string;
      candidateMechanismIds?: unknown;
      crisisFlag?: unknown;
    };
    // Validate down to known values — the schema constrains the model, this
    // constrains everything else.
    const painCategory = PAIN_CATEGORIES.includes(input.painCategory as PainCategory)
      ? (input.painCategory as PainCategory)
      : null;
    const candidateMechanismIds = (Array.isArray(input.candidateMechanismIds)
      ? input.candidateMechanismIds
      : []
    )
      .filter((id): id is string => typeof id === 'string' && KNOWN_MECHANISM_IDS.includes(id))
      .slice(0, 3);
    return { painCategory, candidateMechanismIds, crisisFlag: input.crisisFlag === true, via: 'model' };
  } catch {
    return null; // timeout / network / parse — caller falls back to heuristic
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  const trimmed = text.slice(0, 2000);

  // Local crisis floor — checked before anything else, works with no key.
  if (detectCrisis(trimmed)) {
    const result: NamingResult = {
      painCategory: null,
      candidateMechanismIds: [],
      crisisFlag: true,
      via: 'heuristic',
    };
    return NextResponse.json(result);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const modelResult = await classifyWithModel(trimmed, apiKey);
    if (modelResult) return NextResponse.json(modelResult);
  }

  const result: NamingResult = {
    ...classifyHeuristically(trimmed),
    crisisFlag: false,
    via: 'heuristic',
  };
  return NextResponse.json(result);
}
