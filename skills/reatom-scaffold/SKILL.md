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

## Bootstrap control protocol

This section is intentionally mechanical. It does not depend on the model judging its own ability. A rich feature request can pull any run into routes, forms, UI, fake APIs, or Reatom models too early, so the feature request is **parked work** until the gates below unlock it.

For full greenfield apps/examples/packages, keep a visible phase ledger:

1. **Scaffold phase** — create the starter project and `GOAL.md` only. After the scaffold command succeeds, the next normal tool call in that root is `write` for `GOAL.md`; do not run `npm install`, `npm view`, read `package.json`, or load feature references first unless you genuinely need to locate the scaffold root.
2. **Validation phase** — wire and run the validation pipeline on the mostly untouched starter. No Reatom app code yet.
3. **Routing-skeleton phase** — after the first green `npm run validate`, add strict setup/dev-time logger wiring plus placeholder routes/layouts and `outlet()` composition.
4. **Feature phase** — only after the routing skeleton validates, resume the parked original request.

Before reading feature docs, writing files, or installing dependencies, ask: "Which phase am I in, and would this tool call cross the current gate?" Feature-reference reads are also phase actions: routing/forms/persistence/React integration docs are not harmless preparation during scaffold/validation. If the tool call would load feature docs or add routes, pages, forms, mocked backend code, rich UI, `@reatom/*` imports, or feature dependencies during the validation phase, stop and return to the earliest unchecked gate.

Concrete gate artifacts for the default path:

- [ ] `GOAL.md` exists, preserves the original request as parked work, and uses honest checkbox state: only verified completed work is checked.
- [ ] validation tools are installed, configured, and exposed through scripts.
- [ ] overlapping starter tooling has been deliberately kept or removed.
- [ ] browser smoke test passes on the scaffolded baseline.
- [ ] `npm run validate` passes before any Reatom runtime code is written.
- [ ] only then, strict setup/dev-time logger wiring plus routing placeholders are added and validated.

If you notice that feature code or `@reatom/core` was added before the first green validate, do not keep debugging the resulting TypeScript errors. Treat it as an out-of-order bootstrap: say which gate was crossed, roll back or isolate the premature feature changes if possible, and resume from the earliest incomplete gate.

## Read strategy

Start with [`references/overview.md`](references/overview.md).

Then choose depth deliberately:
- For a full greenfield bootstrap, read [`references/scaffold.md`](references/scaffold.md) in full and execute it as a gate checklist, not as background context.
- For narrower bootstrap questions, use the overview to jump to the relevant section of `scaffold.md` instead of loading the whole checklist immediately.

For full greenfield bootstraps, do **not** preload feature references such as routing, forms, persistence, extensions, or React integration before the scaffold checklist reaches that phase. Loading those references early primes feature implementation and makes the validation gate easier to skip. Read them only when `GOAL.md` and the scaffold reference point to them. Do not combine scaffold commands with parallel feature-reference reads.

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
- Treat the full scaffold reference as an ordered checklist with exit artifacts, not background reading.
- As soon as the scaffold root exists, write `GOAL.md` as a checkbox todo list. It should park the original request, list the staged follow-up work, and become the only source of truth for what happens after bootstrap. Treat "scaffold succeeded but no GOAL.md" as a red gate: the next normal project tool call is creating `GOAL.md`, not git initialization, package install, package-version lookup, or feature-reference reading.
- `GOAL.md` is a state ledger, not an aspirational template. Do not pre-check future work. Mark a checkbox complete only after its exit artifact has been verified (file exists, script is wired, command passed, or user-requested commit exists). If `postvalidate` or the current `GOAL.md` view still shows a later phase unchecked, do not announce a stage complete yet; repair the ledger first and cite the proof command.
- Once `GOAL.md` exists, intentionally ignore the original request until `GOAL.md` tells you to resume it.
- Before the first green `npm run validate`, the only active goal is the validation pipeline on the scaffolded source. Do not write Reatom code yet.
- Keep broader Reatom implementation guidance subordinate to the scaffold ordering. Use targeted references when this checklist points to them, but do not let general feature guidance pull the bootstrap out of sequence.
- Do not read broad feature references early "to be prepared". During bootstrap, extra feature context is a liability because it encourages implementation before gates are satisfied.
- Preserve explicit user constraints, but do not drift into feature work before the bootstrap gate is green unless the user knowingly asked for a lighter path.
- If the starter ships overlapping validation tooling, reconcile it with the chosen stack instead of leaving two competing setups by accident.
- Do not stop at dependency installation. The job is only complete when the tools are configured, exposed through scripts, and actually run successfully.
- A test edit is not a test fix until the narrow proving command has been rerun and passed. Report the command and result, not the expectation.
- Do not stage or commit a baseline unless the user explicitly asked for it, and even then prefer the validated Step 12 baseline.
- After the first green pipeline, keep following `GOAL.md` and this scaffold flow. Use the referenced routing material for the routing-only pass, validate the skeleton, add browser checks that prove the routes are navigable, and only then resume broader implementation guidance.
- When bootstrap finishes, switch to the `reatom-feedback-loop` skill's pitfall summary flow so the run improves the skill, not only the project.

## Completion contract

Do not report bootstrap work as done until all relevant parts of the promised pipeline exist and have been executed successfully. If a user correction points out false completion or an unvalidated fix, first repair the tracking artifact, then run the missing proof command, then report the observed result.

For the default recommended flow, that means the agent should normally complete and report evidence for:
- `GOAL.md` exists as a staged todo list and preserves the parked original request
- the promised validation commands are wired and pass
- a browser-level smoke check passes on the scaffolded baseline
- once routes exist, browser tests prove the important routes are navigable and stay aligned with the evolving route tree
- the project's single validation entry point passes
- any additional runtime harness promised during bootstrap also runs successfully
- only after that, a separate routing-scheme pass driven by `GOAL.md`

If one of these is intentionally omitted, say that explicitly and explain what confidence is being traded away. Do not silently downgrade the pipeline.

For the default scaffold posture, prioritize route-level browser checks during bootstrap over broader business-logic test expansion. Add deeper behavioral coverage when the user explicitly asks for it or when a specific invariant is risky enough to justify it.

## Reference files

- `references/overview.md` — first read; scope check, reading strategy, and cross-skill handoff.
- `references/scaffold.md` — full ordered bootstrap workflow with commands, configs, validation gates, and post-bootstrap handoff.
