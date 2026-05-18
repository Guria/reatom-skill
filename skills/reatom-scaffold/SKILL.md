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

The goal is not just to list packages. The important part is the **order**: scaffold first, write `GOAL.md`, finish the validation pipeline on the untouched Vite scaffold, and only then let later stages resume from the checklist in `GOAL.md`.

The common failure mode is that an agent installs tooling such as `oxlint`, `oxfmt`, `fallow`, but never actually wires them into a working pipeline. Treat that as an incomplete bootstrap, not as a minor omission.

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
- Before the first green `npm run validate`, the only active goal is the validation pipeline on the Vite-scaffolded source. Do not write Reatom code yet.
- Keep the broader Reatom implementation guidance out of the validation phase. Bring the main `reatom` skill in only when `GOAL.md` reaches routing or later feature work.
- Preserve explicit user constraints, but do not drift into feature work before the bootstrap gate is green unless the user knowingly asked for a lighter path.
- If the Vite template ships ESLint, remove or neutralize it in favor of the installed `oxlint` setup unless the user explicitly asked to keep ESLint.
- Do not stop at dependency installation. The job is only complete when the tools are configured, exposed through scripts, and actually run successfully.
- After the first green pipeline, let `GOAL.md` hand work over to the main `reatom` skill: sketch the routing scheme with placeholders and layout/page outlets first, validate again, and only then continue to the original product request.
- When bootstrap finishes, switch to the `reatom-feedback-loop` skill's pitfall summary flow so the run improves the skill, not only the project.

## Completion contract

Do not report bootstrap work as done until all relevant parts of the promised pipeline exist and have been executed successfully.

For the default recommended flow, that means the agent should normally complete and report evidence for:
- `GOAL.md` exists as a staged todo list and preserves the parked original request
- `npm run lint` using `oxlint`
- `npm run format:check` using `oxfmt`
- `npm run intel` using `fallow`
- browser smoke test on the Vite-scaffolded app
- `npm run validate`
- Storybook smoke validation when Storybook is part of the requested bootstrap
- only after that, a separate routing-scheme pass driven by `GOAL.md`

If one of these is intentionally omitted, say that explicitly and explain what confidence is being traded away. Do not silently downgrade the pipeline.

## Reference files

- `references/overview.md` — first read; scope check, reading strategy, and cross-skill handoff.
- `references/scaffold.md` — full ordered bootstrap workflow with commands, configs, validation gates, and post-bootstrap handoff.
