---
name: reatom-debug
description: >
  Structured debugging workflow for Reatom v1000+ runtime, routing, React, and
  test failures. Use when behavior feels surprising, errors mention missing
  async stack, AbortError, root/provider setup, route ownership, duplicate
  @reatom packages, or when a Reatom app needs a source-backed debug plan that
  first verifies observability, including dev-time connectLogger setup.
allowed-tools: read Bash edit write
---

# Reatom debugging workflow

Use this skill when the job is **debugging an active Reatom problem**, not broad architecture design and not greenfield scaffold order.

This skill adds a **debugging procedure** on top of the main `reatom` reference set: preserve the exact symptom, verify observability early, classify the failure by layer, repair the smallest broken boundary, and prove the fix with the narrowest useful command.

## First read

Before changing code, read these in order:

1. `../reatom/SKILL.md`
2. `references/debugging.md`
3. `../reatom/references/meta/gotchas.md`
4. Then load the symptom-specific reference:
   - React/bootstrap/root/provider → `../reatom/references/integrations/react.md`
   - tests / `clearStack()` / `context.start()` → `../reatom/references/core/testing.md`
   - routing / redirects / loader aborts → `../reatom/references/features/routing/routes.md` and `../reatom/references/features/routing/loaders.md`

## Core debugging loop

### 1. Freeze the symptom

Start with the smallest concrete failure:

- exact error text
- exact screen or test where it happens
- current proof command (`npm run test -- path/to/test`, `npm run typecheck`, local repro path, etc.)

Do not widen scope before you can name the failing layer.

### 2. Identify the context style

Determine whether the project is using:

- the default global context, or
- strict setup with `clearStack()` + `context.start()`.

Many Reatom debugging decisions depend on that answer. Do not add or remove `clearStack()` casually just to quiet an error.

### 3. Verify observability before deep surgery

For app/runtime debugging, inspect the earliest setup import first.

If the project is using greenfield-style strict setup, verify whether development-time logging is wired there before doing broader rewrites:

- `connectLogger()` should be connected in development from the earliest setup import;
- that setup import should stay first in the app entry;
- keep logger visibility on while proving route ownership, async boundaries, or abort behavior.

If logger setup is missing and the bug needs runtime tracing, add or restore that observability first unless the user explicitly wants a no-logger path.

### 4. Route the problem by symptom

#### `missing async stack`

Default suspicion order:

1. host callback/timer/promise continuation touching atoms without `wrap()`;
2. strict test body not running inside `context.start(...)` or a test helper;
3. setup/import order drift after `clearStack()`;
4. downleveled async target breaking native async boundary behavior.

#### root/provider/bootstrap failures

Check the React boundary seam first:

- provider value must be a `Frame`;
- the first component that reads atoms/routes must render under `<reatomContext.Provider>`;
- under strict bootstrap, setup should create/export the frame before UI reads.

#### `AbortError` noise, redirect flicker, route loaders re-running

Keep debug visibility on. Repeated aborts often indicate wrong route ownership, broad redirects, or loader invalidation assumptions — not a reason to remove logging first.

#### impossible runtime/type behavior after installs or version churn

Check package graph sanity before patching app code:

- dedupe `@reatom/*` packages;
- confirm versions match project intent;
- avoid broad casts or tsconfig churn until package duplication is ruled out.

#### React hook/value confusion

If errors say `Boolean/String/... has no call signatures`, check whether hook-return plain values were mixed with direct atom-call style.

### 5. Repair the smallest failing boundary

Prefer a narrow fix over broad cleanup:

- wrap the specific host callback;
- fix the specific provider boundary;
- correct the exact route guard/owner;
- wrap the exact strict test body;
- restore logger/setup ordering instead of rewriting unrelated modules.

Do not respond to Reatom confusion with `any`, `ts-expect-error`, search-replace rewrites, or unrelated config churn.

### 6. Prove the fix

A debug change is not complete until the closest proof passes.

Examples:

- failing test file rerun passes;
- failing route/navigation repro stops producing the specific error;
- typecheck turns green on the affected layer;
- logger output confirms the expected owner/boundary transition.

If the proof still fails, report the observed result and continue from that boundary. Do not call it fixed because the code edit looks plausible.

## Response format

Use this structure when reporting back:

## Debug triage
- Symptom:
- Active proof command / repro:
- Context style:
- Observability status (`connectLogger` / setup import / test harness):

## Likely boundary
- <smallest failing layer>

## Checks run
- <files/source/commands inspected>

## Fix
- <minimal repair>

## Proof
- <command/result>

## Debugging posture

- Preserve exact errors; do not paraphrase away the useful parts.
- Keep logs/observability until ownership and boundaries are proven.
- Match the project's existing context style unless the bug is the setup itself.
- Say which Reatom reference/source was consulted when the area is risky.
- Prefer source-backed explanations over generic React/router habits.
