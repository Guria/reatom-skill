---
name: reatom-scaffold
description: >
  Ordered scaffold and bootstrap workflow for new Reatom v1000+ projects.
  Use for greenfield apps, examples, demos, standalone packages, or when the
  user wants to create a new Reatom project or scaffold Reatom inside another
  repo. Focus on setup order, validation pipeline, strict-context bootstrap,
  and initial quality gates before feature work.
allowed-tools: read Bash edit write
---

# Reatom scaffold

Use this skill when the task is primarily about creating a new Reatom codebase or establishing a clean bootstrap baseline.

The goal is not just to list packages. The important part is the **order**: scaffold first, write `GOAL.md`, finish the validation pipeline on the untouched starter project, and only then let later stages resume from the checklist in `GOAL.md`.

The common failure mode is that an agent installs a validation stack, but never actually wires it into a working pipeline. Treat that as an incomplete bootstrap, not as a minor omission.

## Read strategy

Start with [`references/overview.md`](references/overview.md).

Then choose depth deliberately:
- For a full greenfield bootstrap, read [`references/scaffold.md`](references/scaffold.md) in full and follow it as an ordered checklist.
- For narrower bootstrap questions, use the overview to jump to the relevant section of `scaffold.md` instead of loading the whole checklist immediately.

This skill should stay light in always-loaded context. The detailed commands, file contents, and step-by-step bootstrap sequence live in the reference files.

## Scope

This skill is for:
- new Reatom apps
- demos and examples that should still follow production-safe bootstrap habits
- adding a new Reatom package/app inside an existing monorepo or repo
- setting up lint/format/typecheck/test/browser validation before feature code

This skill is not the best fit for ordinary bug fixing or API lookup in an existing Reatom codebase. For that, use the general `reatom` skill.

## Working style

- Decide first whether the user needs the full scaffold flow or only a slice of it.
- Treat the full scaffold reference as an ordered checklist, not background reading.
- As soon as the scaffold root exists, write `GOAL.md` as a checkbox todo list. It should park the original request, list the staged follow-up work, and become the only source of truth for what happens after bootstrap.
- Once `GOAL.md` exists, intentionally ignore the original request until `GOAL.md` tells you to resume it.
- Before the first green `npm run validate`, the only active goal is the validation pipeline on the scaffolded source. Do not write Reatom code yet.
- Keep broader Reatom implementation guidance subordinate to the scaffold ordering. Use targeted references when this checklist points to them, but do not let general feature guidance pull the bootstrap out of sequence.
- Preserve explicit user constraints, but do not drift into feature work before the bootstrap gate is green unless the user knowingly asked for a lighter path.
- If the starter ships overlapping validation tooling, reconcile it with the chosen stack instead of leaving two competing setups by accident.
- Do not stop at dependency installation. The job is only complete when the tools are configured, exposed through scripts, and actually run successfully.
- After the first green pipeline, keep following `GOAL.md` and this scaffold flow. Use the referenced routing material for the routing-only pass, validate the skeleton, and only then resume broader implementation guidance.
- When bootstrap finishes, switch to the `reatom-feedback-loop` skill's pitfall summary flow so the run improves the skill, not only the project.

## Completion contract

Do not report bootstrap work as done until all relevant parts of the promised pipeline exist and have been executed successfully.

For the default recommended flow, that means the agent should normally complete and report evidence for:
- `GOAL.md` exists as a staged todo list and preserves the parked original request
- the promised validation commands are wired and pass
- a browser-level smoke check passes on the scaffolded baseline
- the project's single validation entry point passes
- any additional runtime harness promised during bootstrap also runs successfully
- only after that, a separate routing-scheme pass driven by `GOAL.md`

If one of these is intentionally omitted, say that explicitly and explain what confidence is being traded away. Do not silently downgrade the pipeline.

## Reference files

- `references/overview.md` — first read; scope check, reading strategy, and cross-skill handoff.
- `references/scaffold.md` — full ordered bootstrap workflow with commands, configs, validation gates, and post-bootstrap handoff.
