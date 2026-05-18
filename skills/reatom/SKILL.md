---
name: reatom
description: >
  Expert guide for Reatom v1000+ state management. Use for tasks involving
  @reatom/* imports or explicit Reatom APIs: atom/computed/action from
  @reatom/core, reatomComponent/useAtom/useAction, reatomRoute, reatomForm,
  withAsyncData/withAsync/withAbort/withChangeHook, wrap() async context,
  adapters (@reatom/react, @reatom/vue, @reatom/solid-js, @reatom/preact,
  @reatom/lit, @reatom/jsx), testing, v3 migration, or errors mentioning
  ReatomError, missing async stack, or Reatom runtime exceptions.
allowed-tools: read Bash edit write
---

# Reatom v1000+

Atom-centric reactive state management. All primitives (actions, computeds, effects) are built on a single core — the atom.

Use this file as the **always-loaded safety layer**: version guardrails, anti-v3 overrides, and the routing map to the detailed references. Use the bundled reference files for syntax, examples, and area-specific pitfalls.

## Quick navigation

Read this file top-to-bottom once for orientation. Then load only the topic files you need.

- Safety baseline: [API contract](#api-contract--v1000v1001-userland), [Version policy](#version-policy), [Resources](#resources)
- Fast lookup: [Reference files](#reference-files--read-on-demand)
- Decision rules: [Working mode](#working-mode), [Topic routing](#topic-routing), [High-priority checkpoints](#high-priority-checkpoints)

> **🚀 Greenfield/bootstrap work lives in the sibling `reatom-scaffold` skill.** Use this `reatom` skill for existing-code guidance, debugging, reviews, architecture decisions, migrations, and API usage. If the task is scaffolding a new project, scaffolding inside another repo, or establishing the validation pipeline from zero, stop after taking any needed Reatom orientation and return to the scaffold skill.

> **⚠️ v1000+ only — do not rely on any v3 or earlier packages.** The v3 ecosystem (`@reatom/lens`, `@reatom/hooks`, `@reatom/effects`, `@reatom/persist-web-storage`, etc.) is completely separate and incompatible. v1000+ consolidated everything into `@reatom/core` and `@reatom/react`. When researching, always target the `v1000+` / `v1001` branches — v3 docs will mislead you.
>
> **Hard guardrail: do not rely on stale Reatom memory when v3 patterns appear familiar.** Treat any Reatom knowledge not re-validated from this skill and the current upstream source as suspect. If you catch yourself reaching for `ctx`, `ctx.spy`, `ctx.schedule`, `reatomAsync`, `@reatom/hooks`, or similar pre-v1000 vocabulary, stop immediately, reread this skill, and re-validate against the current source before answering or editing code.
>
> **Red-flag heuristic:** an explicit `ctx` parameter in proposed userland Reatom code is a strong signal that you drifted into v3 thinking. In v1000+ user code, context is implicit and async boundaries are preserved with exported helpers like `wrap()` from `@reatom/core`.

## API contract — v1000/v1001 userland

Use this as the top-level override against stale v3 memory. In ordinary app/library code targeting v1000+:

- `computed(() => atom())` — computed callbacks do not take a `ctx` parameter. Source enforces this with `computedParamsMiddleware`, which throws if args are passed.
- `action((...params) => { ... })` / `action(async (...params) => { ... })` — action callbacks receive direct params, not `ctx` first.
- `atom.set(value)` / `atom.set(prev => next)` — atom writes do not take `ctx`.
- `withChangeHook((state, prevState) => { ... })` — change hooks receive state values, not `ctx`.
- `wrap(promise)` / `wrap(fn)` — preserve async context in userland instead of threading `ctx` manually.

If a draft answer contains `ctx` in those positions, assume the draft is wrong until re-validated from source.

## Version policy

Before giving implementation advice, run this quick mental filter:

- Am I about to suggest any API that is not visible in `@reatom/core` / the active adapter source?
- Does the draft contain explicit `ctx` usage in app code?
- Did the idea come from memory of older Reatom articles/examples rather than this skill or validated source?

If any answer is "yes" or even "maybe", pause and reread the relevant section/reference before proceeding.

- **Greenfield projects:** default to the released v1001 line (`@reatom/core@latest`, currently `1001.0.0`) and a matching adapter where one is available.
- **Existing projects:** inspect `package.json` / lockfile and match the installed `@reatom/*` versions. Do not apply v1001-only APIs to a v1000.x codebase unless you also upgrade packages.
- **Version-sensitive work:** read `references/meta/v1001.md` before changing routing, React adapter behavior, action subscriptions, middleware, transactions, observables, or package versions.

**Appeared in v1001 — mark these explicitly in answers and migrations:** routing `layout: true` with page routes exact-by-default, URL codecs for `params`/`search`, `route.go.relative()`, React `reatomComponent({ abortOnUnmount })` with default `false`, new `reatomObservable` / `withObservable` producer API, action subscription callbacks `(payload, params)`, `withMiddleware(..., 'read' | 'computed' | 'invalidation')`, `withTransaction({ shouldRollback })`, `fromEntries`, `framePromise()` removed queue arg (v1000 accepts `QueueKind` with default `'effect'`, calling with no args works in both), and `reatomEnum.set` accepting arbitrary strings (runtime-validated).

The **computed factory / scoped model pattern** (`computed` returning scoped atoms/forms/actions, extended with `withAbort()`) works in both v1000 and v1001. Only the surrounding routing syntax is version-sensitive: v1001 uses `layout: true` + default-exact pages, v1000 uses `exactRender: true`.

## Resources

- **Repo**: https://github.com/reatom/reatom
- **Docs**: https://v1000.reatom.dev — still the closest public docs; for v1001-sensitive APIs, validate against the v1001 source.
- **Examples**: https://github.com/reatom/reatom/tree/v1000/examples
- **Source validation**: prefer the local upstream checkout or GitHub links pinned to `v1001`. Detailed references carry canonical source links; `SKILL.md` is the orientation layer.

### Reference files — read on demand

References are grouped into subfolders for fast scanning:

```
references/
├── core/         core primitives, extensions, sampling, architectural patterns
├── features/     forms, routing, persistence (built into @reatom/core)
├── integrations/ framework adapters: React, native JSX runtime, Storybook
└── meta/         version delta, package map, migration, quick refs, pitfalls
```

| File | Read when |
|---|---|
| `references/meta/v1001.md` | Comparing v1001 to v1000, deciding whether an API is v1001-only, migrations from v1000 |
| `references/meta/packages.md` | Looking up which `@reatom/*` package to install, checking if a v3 package is deprecated |
| `references/meta/reusables.md` | Browsing the `reatom/reusables` jsrepo catalog before inventing generic helpers |
| `references/meta/migration.md` | Migrating code from v3 to v1000+, mapping old APIs to new |
| `references/meta/quick-reference.md` | Need compact syntax/examples for core primitives, forms, routing, persistence, React, JSX, sampling, setup, or testing |
| `references/meta/gotchas.md` | Need the full preserved pitfall list and architectural smells before editing risky code or debugging surprises |
| `references/core/extensions.md` | Using built-in extensions: `withAsyncData`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withRollback`, `withTransaction`, `framePromise` |
| `references/core/writing-extensions.md` | Writing custom `.extend()` helpers after checking reusables first |
| `references/core/sampling.md` | Debounce/throttle, `take()`, `onEvent()`, `race()`, `abortVar`, checkpoint pattern |
| `references/core/testing.md` | Testing contexts, `clearStack()`, `context.start()`, `context.reset()`, `mock()` |
| `references/core/patterns.md` | Architectural decisions: atomization, computed factory/scoped models, standalone atoms vs lenses, file organization |
| `references/features/routing/routes.md` | Working with `reatomRoute`, nested routes, layouts, URL params, navigation, codecs |
| `references/features/routing/loaders.md` | Route loaders: data fetching, factory pattern, dynamic collisions, protected routes |
| `references/features/forms.md` | Working with `reatomForm`, `bindField`, field validation, form factories |
| `references/features/persistence.md` | Using `withLocalStorage`, `withIndexedDb`, `withCookie`, or any storage adapter |
| `references/integrations/react.md` | Using `@reatom/react`: `reatomComponent`, `useAtom`, `useAction`, `bindField`, StrictMode issues |
| `references/integrations/jsx.md` | Using `@reatom/jsx` native JSX runtime, CSS-in-JS, direct DOM bindings |
| `references/integrations/storybook.md` | Storybook + Reatom: fresh frame per story, routed setup, optional request mocking, browser-test integration |

## Working mode

Use the main file as a **guardrail prompt**, not as the whole manual.

1. **Identify the installed version first** on existing projects.
2. **Stay suspicious of stale memory** whenever code looks like older Reatom.
3. **Read the topic reference before editing** routing, forms, persistence, React integration, JSX, Storybook, extension authoring, or test setup.
4. **Validate non-obvious claims from source** using the local upstream checkout or pinned upstream links.
5. **Prefer narrow, source-backed guidance** over broad “best practice” prose.

## Topic routing

Load these references proactively based on task shape:

- **Core syntax refresh / examples needed** → `references/meta/quick-reference.md`
- **Version mismatch or "is this v1001-only?"** → `references/meta/v1001.md`
- **Package confusion / v3 package names appearing** → `references/meta/packages.md` and `references/meta/migration.md`
- **Generic repeated helper pattern** → `references/meta/reusables.md`, then `references/core/writing-extensions.md`
- **Routing / loaders / auth redirects / nested routes** → `references/features/routing/routes.md` and `references/features/routing/loaders.md`
- **Forms / bindField / validation / submit flow** → `references/features/forms.md`
- **Persistence / search params / storage adapters** → `references/features/persistence.md`
- **React adapter / `reatomComponent` / StrictMode / hook usage** → `references/integrations/react.md`
- **Native JSX runtime** → `references/integrations/jsx.md`
- **Testing / missing async stack in tests / context reset** → `references/core/testing.md`
- **Unexpected behavior, fragile code, or review work** → `references/meta/gotchas.md`
- **Architecture / file layout / model extraction / smell review** → `references/core/patterns.md` and `references/meta/gotchas.md`

## Core mental model

Keep these defaults in mind before reaching for more specialized APIs:

- `atom` = mutable immutable state
- `computed` = lazy derived state
- `action` = callable event/command
- `effect` = side-effectful reactive subscriber
- `.extend(...)` = add behavior such as async state, aborts, hooks, or transactions
- Built-ins like `reatomBoolean`, `reatomEnum`, and `reatomForm` are preferred when they fit the state shape directly

When a feature has several atoms/computeds/actions that belong together, prefer a local `reatom*` factory returning a scoped model instead of exporting many unrelated module-level primitives.

## High-priority checkpoints

These are the frequent failure modes worth keeping always loaded. The full preserved list lives in `references/meta/gotchas.md`.

- **Explicit `ctx` in userland Reatom code usually means the advice drifted into v3.**
- **`status` is disabled by default** on `withAsync` / `withAsyncData`; do not call `.status()` unless status was enabled explicitly.
- **Async helper atoms are getters** — call `.data()`, `.ready()`, `.error()`, `submit.error()`.
- **`wrap()` belongs at async boundaries that touch atoms**, not inside plain framework-agnostic API helpers.
- **Under strict setup, handwritten callbacks that touch Reatom state need `wrap()`**, even when third-party UI libraries make the callback look innocent.
- **Route work is version-sensitive** and should read the routing references first.
- **`reatomComponent` is required for React components that read atoms during render**; inside `reatomComponent`, plain `wrap(...)` is often enough for ordinary handlers, while `useWrap(...)` is useful in hook-style components or when callback identity needs to stay stable.
- **`reatomForm` usage is subtle enough that form edits should read the forms reference first.**
- **When something feels surprising, load `references/meta/gotchas.md` before improvising.**

## Escalation / handoff

- If the task is **greenfield bootstrap**, hand off to `reatom-scaffold`.
- If the user says prior Reatom advice was wrong or wants a correction workflow, use `reatom-feedback-loop`.
- If repeated generic patterns appear, inspect `reatom/reusables` before designing a custom extension.

## Response posture

When answering or editing:

- State version assumptions when they matter.
- Prefer source-backed explanations over memory.
- Keep examples minimal in the main response and load the deep reference when needed.
- If a change touches a risky area, explicitly say which reference was consulted.
