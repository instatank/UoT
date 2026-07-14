---
name: ship
description: Close out a completed task on Truth Unites (UoT) — update the project docs, merge the work to `main` and push to production, then give a session recap. Use when a task is finished and the user says "ship it", "wrap up", "close this out", "ship and recap", or otherwise asks to finalize/document/merge/deploy completed work. Do NOT use mid-task or on a change that isn't verified working.
---

# Ship — finish, document, deploy, recap

Run this only when the task is genuinely **complete and verified** (build/typecheck clean, and — for anything with a runtime surface — actually exercised, not just compiled). If it isn't done, stop and say so; don't ship half-work.

Invoking this skill **is** the user's authorization to merge to `main` and push to production (which auto-deploys via Vercel). CLAUDE.md's "don't push/deploy unless asked" rule is satisfied by that ask. If you're unsure the work is actually finished, or the diff is larger/riskier than the conversation implied, pause and confirm with `AskUserQuestion` before the push — the push is the irreversible step.

Work through the three parts in order.

## a) Update the relevant documentation

Truth Unites keeps its living docs in the repo root. Update whichever are actually affected by this task — don't touch docs a change didn't move:

- **`NOTES.md`** — the build log. This is almost always updated. Add a dated section (`## <Thing> (YYYY-MM-DD, branch \`<branch>\`)`) capturing: what the user asked for (quote the ask briefly), the **root cause / rationale** (the *why*, not just the *what* — future sessions read this to avoid re-deriving), the fix, how it was verified, and anything still owed (e.g. "AA's on-device review"). Match the existing entries' voice: terse, specific, lesson-first.
- **`CLAUDE.md`** — only its **"Status as of the latest pass"** paragraph, and only if this task changes the product's live state (a new layer/pass, a shipped fix worth recording in the status narrative). Locked decisions are not yours to edit; flag genuine contradictions, don't rewrite them.
- **`PLAN.md`** — the **"Next steps"** list and any relevant section. Tick off / remove items this task closed; add follow-ups it created; keep the "AA's on-device review still owed" markers honest.
- **`PRODUCT.md`** — only for product/roadmap/decision changes, which is rare for a code fix. Usually skip.

Keep it truthful: if something was skipped, or a review is still owed, say so plainly. Never claim a visual/on-device sign-off AA hasn't given.

Commit the doc changes together with the code (or as a follow-up commit on the same branch) using the repo's commit trailer convention (see any recent `git log` entry: a `Co-Authored-By:` line and a `Claude-Session:` line — do **not** put the model identifier in the message).

## b) Merge to `main` and push to production

Vercel auto-deploys every push to `main`. There is no separate deploy step.

1. Make sure the working tree is committed and the feature branch is pushed:
   `git push -u origin <feature-branch>` (retry on network error: 2s/4s/8s/16s backoff).
2. Fetch and inspect main before merging — clone-time remote refs go stale:
   `git fetch origin main`
   `git rev-list --count origin/main..HEAD` (commits you're adding)
   `git rev-list --count HEAD..origin/main` (commits you'd be behind)
3. Bring the feature branch up to `main`, then move `main`:
   - If the branch is based on current `origin/main` (behind-count 0), a fast-forward is clean:
     `git checkout -B main origin/main && git merge --ff-only <feature-branch>`
   - If `main` has moved on, rebase the feature branch onto `origin/main` first (`git rebase origin/main`), re-run the build, then fast-forward.
4. Push production:
   `git push -u origin main` (same backoff on network error).
5. **Confirm the deploy actually started.** Use the Vercel MCP tools (load via ToolSearch if not present):
   - `list_teams` → team is `team_P4uKN28r7smT5lPcH5jm0Jac` (`ankitanand25-4465s-projects`).
   - `list_deployments` with `projectId: "uo-t"` and that `teamId`.
   - Find the deployment whose `meta.githubCommitSha` matches your pushed commit and `target: "production"`; report its `state` (BUILDING → it's live wiring up; READY → deployed; ERROR → investigate `get_deployment_build_logs`).

Do **not** open a pull request unless the user explicitly asked for one — merging straight to `main` is this project's normal flow.

Return to the feature branch afterward (`git checkout <feature-branch>`) so any follow-up work stays on the designated branch.

## c) Session recap

Close with a short, honest recap (like a `wrap` summary). Cover:

- **What shipped** — one or two lines on the change and *why* (the mechanism/root cause, not just the symptom).
- **Files touched** — the key files, with `path:line` where it helps.
- **Verification** — what you actually ran/observed (build clean, flow exercised), stated plainly. If you couldn't fully verify something, say which part.
- **Deploy status** — commit SHA on `main`, and the production deployment's state from step b.5.
- **Still owed / next** — anything the task left open: AA's on-device review, follow-up items added to PLAN.md, known limitations.

Keep it tight and skimmable. No praise-first framing, no filler — AA wants the state of things, direct.
