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

The goal is not just to list packages. The important part is the **order**: scaffold first, install the validation pipeline early, prove the app mounts, and only then start feature work.

## Read first

- Read [`references/scaffold.md`](references/scaffold.md) in full for greenfield/bootstrap work.

## Scope

This skill is for:
- new Reatom apps
- demos and examples that should still follow production-safe bootstrap habits
- adding a new Reatom package/app inside an existing monorepo or repo
- setting up lint/format/typecheck/test/browser validation before feature code

This skill is not the best fit for ordinary bug fixing or API lookup in an existing Reatom codebase. For that, use the general `reatom` skill.

## Working style

- Treat the scaffold reference as an ordered checklist, not background reading.
- Preserve explicit user constraints, but do not drift into feature work before the bootstrap gate is green unless the user knowingly asked for a lighter path.
- When bootstrap finishes, switch to the `reatom-feedback-loop` skill's pitfall summary flow so the run improves the skill, not only the project.
