---
name: process-feedback
description: >
  Local maintenance workflow for this reatom-skill repo. Use when processing
  feedback sessions, failed model transcripts, correction threads, or bootstrap
  postmortems into durable skill/reference/eval improvements. Extract
  misconceptions, identify instruction-shape failures, generalize fixes without
  project-specific leakage, and maintain repo-local guidance. Git may be used
  only for read-only exploration; never touch the index, staged changes, or
  commits.
metadata:
  internal: true
allowed-tools: read Bash edit write
---

# Process feedback for reatom-skill maintenance

Use this local-only skill when a user provides one or more sessions/transcripts showing a model failing to follow the Reatom skills, asks for root-cause analysis, or wants skill updates based on corrections.

This skill is for maintaining this repository's skill text. It is intentionally stored under `.agents/skills/` so it is available in this repo only and is not distributed as part of the packaged Reatom skills.

## Non-negotiable repository safety

Git is read-only exploration here.

Allowed git commands:
- `git status --short`
- `git diff`, `git diff --stat`, `git diff -- <path>`
- `git log`, `git show`

Forbidden git commands:
- `git add`
- `git commit`
- `git reset`
- `git restore`
- `git checkout`
- `git stash`
- `git apply --cached`
- any command that changes the index, staged area, branch, commit history, or working tree through git

If staged changes already exist, treat them as someone else's state. Do not stage, unstage, amend, reset, or clean them. If you need to understand them, inspect only with read-only git commands and report what you observed.

## Core principle

A useful feedback response does not say "next time the model will follow the instruction." Fresh model runs do not have durable memory. Convert repeated failures into better skill mechanics:

- stronger top-level guardrails;
- explicit gates and exit artifacts;
- proof commands for completion claims;
- reading-order constraints;
- out-of-order recovery rules;
- compact preflight checklists near risky seams;
- eval prompts that reproduce the failure.

## Intake workflow

When a feedback session arrives:

1. **Preserve the user's evidence.** Do not reinterpret the transcript as a vague complaint. Extract the actual action sequence.
2. **Identify the phase.** Examples: scaffold, validation, routing skeleton, feature implementation, forms, tests, extension extraction, feedback-loop analysis.
3. **Separate claim from proof.** Note every place the model claimed completion, checked a box, reported success, or committed before a proof command/artifact existed.
4. **Name the misconception.** Prefer mental-model labels over line-by-line bug lists.
5. **Find the instruction-shape failure.** Ask why the existing skill text did not stop the action before it happened.
6. **Propose a durable change.** Name the target file/section and the preventive mechanism.
7. **Generalize wording before editing.** Do not paste model names, project paths, one-off library names, or incidental app details into distributed skill docs unless the topic truly belongs there.
8. **Add or update evals when the failure is reproducible.** Evals should describe the failure pattern generically enough to catch future regressions.

## Misconception taxonomy

Use these categories as a starting point; add new ones when the session reveals a distinct wrong mental model.

- **Phase-order misconception** — treating scaffold, `GOAL.md`, validation, routing skeleton, and feature work as a plan rather than gates.
- **Ledger misconception** — treating `GOAL.md` checkboxes as intended future work rather than verified state.
- **Preparation misconception** — reading feature references early feels responsible but primes implementation before the gate allows it.
- **Artifact-free completion misconception** — treating a file edit, package install, or plausible plan as proof without the command/artifact that verifies it.
- **Unvalidated fix misconception** — reporting a test or type fix as complete before rerunning the narrow proving command.
- **Generic React/router habit** — mutating route config after construction, guessing root/provider APIs, or treating Reatom like a hook-first state library.
- **Adapter-style confusion** — mixing `reatomComponent` direct atom reads with `useAtom` hook-return plain values.
- **Browser-test harness misconception** — treating Vitest Browser Mode like repeated jsdom-style entrypoint imports instead of a real app/runtime harness that needs fresh mounts and cleanup.
- **Router source-of-truth misconception** — assuming browser history mutation alone necessarily drives Reatom route state in tests.
- **Third-party UI guessing** — assuming version-pinned UI component APIs from memory instead of checking installed types/docs.
- **Extension extraction misconception** — extracting a generic-looking one-off side effect into shared helpers before it repeats or has a strategic reuse reason.
- **Recovery misconception** — broad rewrites, casts, suppressions, stale status, or commits while validation is red instead of returning to the smallest failing layer and proving it.

## Analysis template

Use this structure when the user asks what went wrong:

```md
## Feedback analysis

### Expected process
- <the relevant skill/checklist/gate>

### Actual process
- <what the transcript shows, in order>

### Misconceptions
1. **<name>**
   - Bad instinct: <why the model did it>
   - Correct rule: <what should constrain the next run>
   - Practical guard: <artifact/check/preflight/recovery>

### Instruction-shape failure
- Existing guidance: <where it exists, if it does>
- Why it was skippable: <buried/advisory/no proof/no recovery/primed by early reads>

### Skill updates
- `<path>` — <section> — <specific generalized edit>

### Eval updates
- <prompt shape and pass/fail criteria>
```

Avoid filler apologies. If the user is angry, acknowledge the concrete failure and move directly to prevention.

## Editing workflow

Before editing a distributed skill/reference/eval file:

1. Read the current target section.
2. Decide whether the rule belongs in always-loaded `SKILL.md`, a reference file, or an eval.
3. Keep text native to the document. It should read like it was designed for the skill, not pasted from a single current transcript.
4. Prefer generic terms: "version-pinned UI library", "routed Browser Mode test", "one-off side effect", "runtime provider API".
5. Avoid leaking one-off session specifics: model names, local paths, app names, commit hashes, package choices that are not the actual topic.
6. Use `edit` for precise changes and `write` only for new local files or complete rewrites.
7. Validate JSON eval files after editing.
8. Do not run git-mutating commands. Report changed paths and ask for review.

## Where fixes usually belong

- `skills/reatom-scaffold/SKILL.md` — hard gates that must be visible every time the scaffold skill loads.
- `skills/reatom-scaffold/references/overview.md` — phase overview, stoplights, completion reminders.
- `skills/reatom-scaffold/references/scaffold.md` — ordered implementation details, artifact/proof checklists, browser smoke-test guidance.
- `skills/reatom-feedback-loop/SKILL.md` — top-level correction posture and refusal to rely on future promises.
- `skills/reatom-feedback-loop/references/feedback-loop.md` — deviation analysis, misconception taxonomy, recovery branches, suggested issue/eval format.
- `skills/reatom/references/features/routing/routes.md` — route API gotchas, routing skeleton preflight, route-test source-of-truth guidance.
- `skills/reatom/references/integrations/react.md` — React adapter defaults, `reatomComponent` vs hooks, provider/bootstrap verification.
- `skills/reatom/references/features/forms.md` — form binding decisions and third-party control handling.
- `skills/reatom/references/core/writing-extensions.md` — extension extraction threshold and reusable-vs-inline decisions.
- `skills/*/evals/evals.json` — reproducible failure patterns with objective pass criteria.

## Practical prevention patterns

### Gate with next action

Weak: "write GOAL.md early."

Stronger: "After the scaffold command succeeds, the next normal project tool call is writing `GOAL.md`; do not run package installs, package lookups, git init, or feature-reference reads first unless the root is ambiguous."

### Tie checkbox to proof

Weak: "create a checkbox todo list."

Stronger: "A checkbox may be `[x]` only after its artifact exists and its proof command passed. Parent stages stay unchecked until child gates and final validation pass."

### Separate edited from fixed

Weak: "I updated the test."

Stronger: "I edited the test, ran `npm run test -- path/to/test`, and it passed. If it failed, keep the step incomplete and report the observed failure."

### Keep Browser Mode harnesses honest

For the initial plain scaffold, a single entrypoint-import smoke test is fine. For routed Browser Mode tests, prefer a fresh app/route-shell mount per test with cleanup, and drive Reatom route output through `urlAtom.go(...)` or route `.go(...)` when the assertion depends on Reatom routing state.

### Avoid over-extracting one-off extensions

A single atom driving one imperative sink can stay inline with `.extend((target) => target.extend(...))`. Extract to a shared extension when the behavior repeats, has clear options, needs tests/docs as an API, or isolates a substantial external resource.

## Reporting after edits

Use a concise report:

```md
Updated:
- `<path>` — <what changed and why>
- `<path>` — <what changed and why>

Validated:
- JSON eval files parsed successfully / not applicable
- No git-mutating commands run

Next options:
1. Review wording for tone/flow
2. Add evals
3. Apply another transcript
```

Then ask the user for the next instruction.
