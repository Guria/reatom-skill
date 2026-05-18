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

1. scaffold the app/package with the Vite CLI
2. write `GOAL.md` as a staged todo list
3. ignore the original request and focus only on the validation pipeline
4. wire the tooling into scripts/configs and run it successfully on the untouched Vite scaffold
5. only after the first green pipeline, follow `GOAL.md` into a routing-scheme pass with placeholders and outlets
6. only after routing is validated, resume the original request

This prevents the common failure mode of writing routes, forms, and state code before the project can prove its basic runtime shape.

Installing `oxlint`, `oxfmt`, `fallow`, or optional Storybook is not enough by itself. A bootstrap is still incomplete if the tools the agent chose are present in `package.json` but not configured, not exposed through scripts, or never actually executed.

`GOAL.md` is the parking place for the original request and the source of truth for later stages. Once it is written, the agent should stop following the raw user request directly. After validation completes, the echoed goal becomes the handoff into routing placeholders first, then back to the parked product work.

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
- the user only needs the phase-1 validation pipeline or the post-validate routing handoff
- the user only wants the initial browser smoke test or Storybook harness

Suggested entry points in `scaffold.md`:
- package choices only: **Default stack** + **Step 2**
- existing scaffold, need the real quality gate pipeline: **Steps 2–12**
- phase boundary before any Reatom code: **Step 9**
- browser smoke test: **Step 10**
- Storybook runtime validation: **Step 11**
- routing handoff after the first green pipeline: **After first green validate — routing scheme only**
- bootstrap completion check: **Step 12** + **After bootstrap**

## Completion reminder

Before saying the bootstrap is done, make sure the answer includes evidence that the pipeline was actually wired and run, not merely installed.

For the default path, the expected proof points are:
- `GOAL.md` exists as a staged todo list
- lint script runs with `oxlint`
- format-check runs with `oxfmt`
- intelligence check runs with `fallow`
- browser smoke test passes on the Vite scaffold
- `npm run validate` passes
- Storybook smoke check passes when Storybook is part of the promised setup

## Cross-skill handoff

- After the first green pipeline, use the main `reatom` skill's routing reference (`../../reatom/references/features/routing/routes.md`) to design the route tree with placeholder renders and `outlet()` composition before doing any real feature work.
- For general Reatom architecture and feature guidance after that routing pass, use the main `reatom` skill.
- When bootstrap finishes or earlier guidance needs correction, read `../../reatom-feedback-loop/references/feedback-loop.md`.
