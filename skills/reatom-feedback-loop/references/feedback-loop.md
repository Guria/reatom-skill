# Skill improvement feedback loop

Read this when the user has to steer the agent after an answer, requests follow-up fixes caused by wrong Reatom guidance, explicitly says the skill led the agent in a wrong direction, or when a greenfield bootstrap finishes and you need to report pitfalls.

Treat corrections and bootstrap pitfalls as feedback about the skill, not only as local task fixes.

A future-tense promise from the agent is not a fix. The model that failed this run may not have durable memory next run. A useful correction explains which instruction failed to constrain behavior and how to make that instruction harder to skip.

## Process

1. Finish the user's requested correction first.
2. Identify the likely source of the wrong direction:
   - missing or ambiguous SKILL.md/reference guidance;
   - v1000/v1001 mismatch or accidental v3 knowledge;
   - a reference file that should have been read earlier;
   - a step-by-step guide that was read as background context instead of executed as an ordered checklist;
   - overgeneralizing from other state-management, routing, or frontend habits;
   - project-specific constraints that were not inspected or preserved.
3. If the lesson is reusable beyond the current project, include a concise **Skill feedback** note:
   - what went wrong;
   - which SKILL.md/reference guidance could be improved;
   - a suggested issue title/body for https://github.com/Guria/reatom-skill.
4. When the root cause reveals a reusable technical mistake, distill it into a concrete rule for the most relevant reference or checklist, not only the final message.
5. When the root cause is "the instruction already existed but the model ignored it", still propose a skill improvement. Existing text may be too buried, too advisory, missing an artifact check, or placed in a reference that is loaded after the model has already formed an implementation plan.

Prefer prevention over postmortem detail. The feedback loop should identify what guidance failed and where the preventive rule belongs; the technical rule itself should usually live in the topic reference, gotchas list, or an ordered implementation checklist.

Keep the note short and optional-sounding. Do not ask for an issue when the mistake is only a one-off project oversight with no reusable Reatom-skill lesson.

## Deviation analysis

When the user asks why your work departed from an instruction, guide, or agreed process, pause and compare the actual sequence of actions with that source before continuing. The goal is to find the reusable failure mode, not to recap the transcript.

Keep the analysis compact and useful:

- **Expected process** — the relevant instruction, constraint, or ordering.
- **Actual process** — where the work diverged.
- **Cause** — the assumption, pressure, ambiguity, or missing verification that led to the divergence.
- **Instruction-shape failure** — why the skill text did not stop the model before the bad action. Examples: critical rule was only in a long reference, broad feature references were loaded too early, no concrete artifact check existed, wording was advisory instead of gate-based, or no rollback rule existed after detecting drift.
- **Correction** — the next action and any skill/reference improvement needed.

If the divergence came from a reused habit or assumption, say that explicitly. Feedback is most useful when it names the wrong instinct instead of only describing the local bug.

When the user challenges a claim like "next time I will follow it", agree with the premise: durable behavior comes from skill text and evals, not the agent's memory. Reframe the answer around changes that would make a fresh model behave differently.

Write this as general process feedback. Avoid project names, paths, package choices, or one-off implementation details unless they are necessary evidence for the user's immediate task. If the divergence involved an unfamiliar or fast-moving tool/API, verify it from an authoritative local or upstream source before turning the lesson into guidance.

### Self-evaluation checklist for ignored instructions

Use this checklist when the mistake was caused by skipping a process the agent had already read:

- [ ] Was the critical instruction present in always-loaded `SKILL.md`, or only in a long/deferred reference?
- [ ] Did the skill require a visible artifact or command output before moving to the next phase?
- [ ] Did the skill warn against context priming, such as reading feature references before bootstrap gates?
- [ ] Did the skill define an out-of-order recovery action, or only say what not to do?
- [ ] Could an eval prompt reproduce the failure in a fresh run that is tempted by feature work?

Turn at least one unchecked item into a suggested skill edit or eval case. If all items are checked, propose tightening wording, adding an example of the failure, or moving the gate closer to the top-level skill file.

### Misconception taxonomy

When analyzing a failed Reatom run, name the wrong mental model, not only the broken line of code. Useful categories:

- **Phase-order misconception** — treating `GOAL.md`, validate, routing skeleton, and feature work as a plan rather than gates.
- **Ledger misconception** — treating `GOAL.md` checkboxes as an aspirational template instead of verified state; pre-checking unfinished work hides missing gates.
- **Preparation misconception** — reading feature references early feels responsible but primes implementation before the gate allows it.
- **Generic React/router habit** — mutating route config after creation, approximating provider/bootstrap code, or treating Reatom as another hook state library.
- **Adapter-style confusion** — mixing `reatomComponent` direct atom reads with `useAtom` hook-return plain values.
- **Third-party UI guessing** — assuming version-pinned UI component APIs from memory instead of checking installed types/docs.
- **Recovery misconception** — broad rewrites, casts, suppressions, or commits while typecheck is red instead of returning to the smallest failing layer.

For each category present, suggest a preventive skill change: a gate, a top-level red flag, a reference preflight checklist, or an eval that would reproduce the failure.

## Bootstrap pitfall summary

When finishing a project bootstrap, produce a short pitfall summary in the final message. The goal is to surface anything you tripped on so the user can decide whether the skill or references need updating.

Format as a plain Markdown list. Keep it factual and specific to what happened during this run.

When the run touched a risky subsystem, include at least one checkpoint about how nearby cases were verified before declaring the fix done, and whether useful observability/debug visibility was kept until the behavior was proven correct.

For each pitfall include:
1. **Symptom** — exact error, type-check failure, or unexpected behaviour.
2. **Root cause** — the Reatom rule or API contract that was violated.
3. **Fix applied** — the smallest resolving change.
4. **Where the skill addresses this today**, or **"not in skill yet — candidate for distillation"** if you cannot find it in `SKILL.md` or `references/`.

Close with one of:

- `No pitfalls encountered` — if the bootstrap was clean end-to-end.
- `Suggested skill updates: <bullet list>` — if any item was marked "not in skill yet".

For process failures, suggested updates should be concrete enough to edit: name the target file/section and the preventive mechanism (for example "move gate list into `reatom-scaffold/SKILL.md`", "add no-feature-reference rule before Read strategy", or "add rollback rule for premature Reatom code").
