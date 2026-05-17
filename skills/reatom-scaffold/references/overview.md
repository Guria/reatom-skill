# Reatom scaffold overview

Use this file first when the scaffold skill triggers.

The goal is to choose the right reading depth before loading the full checklist.

## When this skill applies

Use `reatom-scaffold` when the task is primarily about:
- creating a new Reatom app or package
- scaffolding a Reatom example or demo
- adding a fresh Reatom app/package inside an existing repo
- establishing the validation pipeline before feature work

If the task is mainly about an existing codebase, API usage, debugging, or migration, switch back to the main `reatom` skill.

## Default execution model

The bootstrap order matters more than any single package choice:

1. scaffold the app/package
2. write the original user request to `GOAL.md`
3. install validation and runtime-checking tools early
4. wire those tools into scripts/configs and run them successfully
5. only then start feature work

This prevents the common failure mode of writing routes, forms, and state code before the project can prove its basic runtime shape.

Installing `oxlint`, `oxfmt`, `fallow`, or Storybook is not enough by itself. A bootstrap is still incomplete if those tools are present in `package.json` but not configured, not exposed through scripts, or never actually executed.

`GOAL.md` is the parking place for the original request. Its job is to stop the agent from half-switching into feature work before the scaffold is proven green. After validation completes, the echoed goal becomes the handoff back to the requested product work.

## Reading strategy

### Read the full scaffold reference when
- the user wants an end-to-end new project bootstrap
- you need to produce files and commands from zero
- the user asked for the recommended default setup
- you are not sure whether a later step depends on an earlier one

In those cases, read [`scaffold.md`](scaffold.md) in full and follow it as an ordered checklist.

### Read only targeted sections of `scaffold.md` when
- the user only asks which packages to install
- the user already has a scaffold and only needs the validation pipeline
- the user only needs the strict-context app entry
- the user only wants the initial browser smoke test or Storybook harness

Suggested entry points in `scaffold.md`:
- package choices only: **Default stack** + **Step 2**
- existing scaffold, need the real quality gate pipeline: **Steps 2–12**
- strict context setup: **Step 9**
- browser smoke test: **Step 10**
- Storybook runtime validation: **Step 11**
- bootstrap completion check: **Step 12** + **After bootstrap**

## Completion reminder

Before saying the bootstrap is done, make sure the answer includes evidence that the pipeline was actually wired and run, not merely installed.

For the default path, the expected proof points are:
- `GOAL.md` exists with the original request
- lint script runs with `oxlint`
- format-check runs with `oxfmt`
- intelligence check runs with `fallow`
- browser smoke test passes
- `npm run validate` passes
- Storybook smoke check passes when Storybook is part of the promised setup

## Cross-skill handoff

- For general Reatom architecture and feature guidance after bootstrap, use the main `reatom` skill.
- When bootstrap finishes or earlier guidance needs correction, read `../../reatom-feedback-loop/references/feedback-loop.md`.
