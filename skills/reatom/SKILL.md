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

## Quick navigation

In-document sections (read top-to-bottom for orientation, jump for lookup):

- [Version policy](#version-policy) · [Resources](#resources) · [Reference files](#reference-files--read-on-demand)
- [Core Primitives](#core-primitives) · [Extensions](#extensions) · [Built-in Primitives](#built-in-primitives)
- [Routing](#routing) · [Forms](#forms) · [Persistence](#persistence)
- [React Integration](#react-integration) · [Native JSX (@reatom/jsx)](#native-jsx-reatomjsx) · [Storybook](#storybook)
- [Patterns & Architecture](#patterns--architecture) · [Sampling & Events](#sampling--events) · [Retrying Computeds](#retrying-computeds--resetting-dependencies)
- [Lifecycle Queue Priorities](#lifecycle-queue-priorities) · [wrap() Rules](#async-context--wrap-rules) · [App Setup](#app-setup--context-options) · [Testing](#testing)
- [High-priority Gotchas](#high-priority-gotchas) · [Package Index](#package-index) · [Architectural Smells](#architectural-smells)

Reference files are loaded on demand — see the [reference table](#reference-files--read-on-demand) below.

> **🚀 Greenfield/bootstrap work lives in the sibling `reatom-scaffold` skill.** Use this `reatom` skill for existing-code guidance, debugging, reviews, architecture decisions, migrations, and API usage. If a task is primarily about creating a new project, scaffold inside another repo, or establishing the validation pipeline from zero, prefer the scaffold skill's ordered workflow instead of improvising setup steps here.

> **⚠️ v1000+ only — do not rely on any v3 or earlier packages.** The v3 ecosystem (`@reatom/lens`, `@reatom/hooks`, `@reatom/effects`, `@reatom/persist-web-storage`, etc.) is completely separate and incompatible. v1000+ consolidated everything into `@reatom/core` and `@reatom/react`. When researching, always target the `v1000+` / `v1001` branches — v3 docs will mislead you.

## Version policy

- **Greenfield projects:** default to the released v1001 line (`@reatom/core@latest`, currently `1001.0.0`) and a matching adapter where one is available.
- **Existing projects:** inspect `package.json` / lockfile and match the installed `@reatom/*` versions. Do not apply v1001-only APIs to a v1000.x codebase unless you also upgrade packages.
- **Version-sensitive work:** read `references/meta/v1001.md` before changing routing, React adapter behavior, action subscriptions, middleware, transactions, observables, or package versions.

**Appeared in v1001 — mark these explicitly in answers and migrations:** routing `layout: true` with page routes exact-by-default, URL codecs for `params`/`search`, `route.go.relative()`, React `reatomComponent({ abortOnUnmount })` with default `false`, new `reatomObservable` / `withObservable` producer API, action subscription callbacks `(payload, params)`, `withMiddleware(..., 'read' | 'computed' | 'invalidation')`, `withTransaction({ shouldRollback })`, `fromEntries`, `framePromise()` removed queue arg (v1000 accepts `QueueKind` with default `'effect'`, calling with no args works in both), and `reatomEnum.set` accepting arbitrary strings (runtime-validated).

The **computed factory / scoped model pattern** (`computed` returning scoped atoms/forms/actions, extended with `withAbort()`) works in both v1000 and v1001. Only the surrounding routing syntax is version-sensitive: v1001 uses `layout: true` + default-exact pages, v1000 uses `exactRender: true`.

## Resources

- **Repo**: https://github.com/reatom/reatom
- **Docs**: https://v1000.reatom.dev — still the closest public docs; for v1001-sensitive APIs, validate against the v1001 source.
- **Examples**: https://github.com/reatom/reatom/tree/v1000/examples
- **Source validation**: prefer the local upstream checkout at `~/ghq/github.com/reatom/reatom` (branch `v1001`) or GitHub links pinned to `v1001`. Detailed references carry canonical source links; SKILL.md is an orientation layer.

### Reference files — read on demand

References are grouped into subfolders for fast scanning:

```
references/
├── core/         core primitives, extensions, sampling, architectural patterns
├── features/     forms, routing, persistence (built into @reatom/core)
├── integrations/ framework adapters: React, native JSX runtime, Storybook
└── meta/         package index, version delta, migration
```

| File | Read when |
|---|---|
| `references/meta/v1001.md` | Comparing v1001 to v1000, deciding whether an API is v1001-only, migrations from v1000 |
| `references/meta/packages.md` | Looking up which @reatom/* package to install, checking if a v3 package is deprecated |
| `references/meta/reusables.md` | Browsing the [reatom/reusables](https://github.com/reatom/reusables) jsrepo catalog — form helpers, history/undo, logger, test harness, tweakpane integration, etc. |
| `references/meta/migration.md` | Migrating code from v3 to v1000+, mapping old APIs to new |
| `references/core/extensions.md` | Using built-in extensions: `withAsyncData`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withRollback`, `withTransaction`, `framePromise` |
| `references/core/writing-extensions.md` | Writing custom `.extend()` helpers, lifecycle/resource integration, middleware, hooks, type-safe extension APIs |
| `references/core/sampling.md` | Debounce/throttle, `take()`, `onEvent()`, `race()`, `abortVar`, checkpoint pattern |
| `references/core/testing.md` | Testing contexts, `clearStack()`, `context.start()`, `context.reset()`, `mock()`, and source-backed examples |
| `references/core/patterns.md` | Architectural decisions: atomization, computed factory/scoped models, standalone atoms vs lenses, file organization |
| `references/features/routing/routes.md` | Working with `reatomRoute`, nested routes, layouts, URL params, navigation, codecs |
| `references/features/routing/loaders.md` | Route loaders: data fetching, factory pattern, dynamic collisions, protected routes |
| `references/features/forms.md` | Working with `reatomForm`, `bindField`, field validation, form factories |
| `references/features/persistence.md` | Using `withLocalStorage`, `withIndexedDb`, `withCookie`, or any storage adapter |
| `references/integrations/react.md` | Using `@reatom/react`: `reatomComponent`, `bindField`, StrictMode issues |
| `references/integrations/jsx.md` | Using `@reatom/jsx` native JSX runtime, CSS-in-JS, direct DOM bindings |
| `references/integrations/storybook.md` | **Storybook + Reatom**: fresh frame per story, routed story setup, optional request mocking, browser-test integration, and pitfalls |

## Core Primitives

### Atom — mutable immutable state

```typescript
import { atom } from '@reatom/core'

const counter = atom(0, 'counter')
counter()       // → 0
counter.set(5)  // → 5
counter.set(v => v + 1)  // → 6
```

### Computed — lazy derived state

```typescript
import { atom, computed } from '@reatom/core'

const counter = atom(0, 'counter')
const doubled = computed(() => counter() * 2, 'doubled')
doubled()  // → 0, recalculates only when subscribed AND counter changes
```

### Action — callable event with call history

```typescript
import { action, wrap } from '@reatom/core'

const fetchData = action(async (id: number) => {
  const res = await wrap(fetch(`/api/data/${id}`))
  return await wrap(res.json())
}, 'fetchData')
```

Action subscription callback shape is version-sensitive: v1001+ uses `action.subscribe((payload, params) => ...)`; v1000 uses call-history arrays `action.subscribe((calls) => ...)`.

### Effect — auto-subscribes for side effects

```typescript
import { atom, effect } from '@reatom/core'

const counter = atom(0, 'counter')
effect(() => {
  console.log('counter changed:', counter())
  // auto-cleans on abort/unmount
}, 'counter.effect')
```

## Extensions

Extensions add capabilities via `.extend()`. See [references/core/extensions.md](references/core/extensions.md) for built-in APIs (`withAsyncData`, `withAsync`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withRollback`, `withTransaction`, `framePromise`). When authoring reusable custom extensions, read [references/core/writing-extensions.md](references/core/writing-extensions.md).

Quick reference — the two most common:

```typescript
// Async data fetching
const list = computed(async () => {
  return await wrap(api.getList())
}, 'list').extend(withAsyncData({ initState: [] }))

list.data()    // fetched data
list.ready()   // false while loading
list.error()   // Error if failed

// Async mutations
const submit = action(async (payload: FormData) => {
  await wrap(fetch('/api/submit', { method: 'POST', body: payload }))
}, 'submit').extend(withAsync())

submit.error()    // Error | undefined (atom getter — call it!)
submit.ready()    // true when not loading
```

## Built-in Primitives

```typescript
import {
  reatomBoolean, reatomEnum, reatomArray, reatomMap,
  reatomSet, reatomRecord, reatomLinkedList,
  reatomNumber, reatomString,
} from '@reatom/core'

const isModalOpen = reatomBoolean(false, 'isModalOpen')
isModalOpen.setTrue()
isModalOpen.setFalse()
isModalOpen.toggle()

// Boolean primitives are good public controls for simple on/off state.
// Prefer these helpers over custom actions that only forward to `.set(true/false)`.

const priority = reatomEnum(['low', 'medium', 'high'], 'priority')
priority.setHigh()
priority()  // 'high'

// v1001+: .set accepts string values too, still runtime-validates against variants
priority.set('low')
```

## Routing

See [references/features/routing/routes.md](references/features/routing/routes.md) for complete routing API: routes, nested routes, loaders, layout/page routes, protected routes, modal gates, and search-only routes.

Routing accepts any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library (Zod, Valibot, ArkType, etc.) for params and search validation.

Quick reference:

```typescript
import { reatomRoute } from '@reatom/core'

const userRoute = reatomRoute('users/:userId')  // NO leading slash
userRoute()           // { userId: '123' } | null
userRoute.match()     // true for /users/123/anything
userRoute.exact()     // true only for /users/123
userRoute.go({ userId: '123' })   // navigate
userRoute.path({ userId: '123' }) // build URL without navigating
```

## Forms

See [references/features/forms.md](references/features/forms.md) for complete forms API: `reatomForm`, React binding with `bindField`, field access patterns, and form factories.

Forms accept any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library (Zod, Valibot, ArkType, etc.) for validation.

Quick reference:

```typescript
import { reatomForm } from '@reatom/core'
import { z } from 'zod/v4'

// with Zod
const form = reatomForm(
  { email: '', password: '' },
  { name: 'loginForm', validateOnBlur: true,
    schema: z.object({ email: z.string().email(), password: z.string().min(8) }) },
)

// with Valibot — same API, any Standard Schema works
import * as v from 'valibot'
const form = reatomForm(
  { email: '', password: '' },
  { name: 'loginForm', validateOnBlur: true,
    schema: v.object({ email: v.pipe(v.string(), v.email()), password: v.pipe(v.string(), v.minLength(8)) }) },
)

form.fields.email     // FieldAtom
form.submit           // Action
form.validation()     // { errors: FieldSetFieldError[], triggered: boolean }
```

## Persistence

See [references/features/persistence.md](references/features/persistence.md) for complete persistence API: all storage adapters, configuration options, version migration, TTL, schema validation, custom storage, and cross-tab sync.

Quick reference:

```typescript
import { atom, withLocalStorage, withSessionStorage, withIndexedDb, withBroadcastChannel, withCookie, withCookieStore, withSearchParams, searchParamsAtom } from '@reatom/core'

const theme = atom<Theme>('light', 'theme').extend(withLocalStorage('theme'))
const prefs = atom({}, 'prefs').extend(withSessionStorage('prefs'))
const cache = atom(new Map(), 'cache').extend(withIndexedDb('my-db'))
const crossTab = atom(0, 'crossTab').extend(withBroadcastChannel('sync'))
const token = atom('', 'token').extend(withCookie({ secure: true })('auth-token'))
const session = atom('', 'session').extend(withCookieStore()('session-id'))

// URL search params — shareable, bookmarkable state
const searchQuery = atom('', 'searchQuery').extend(withSearchParams('q'))
const pageNumber = atom(1, 'pageNumber').extend(withSearchParams('page', {
  parse: (v) => Number(v ?? '1'),
}))
```

## React Integration

See [references/integrations/react.md](references/integrations/react.md) for `reatomComponent`, `useAtom`, `useAction`, `bindField`, StrictMode caveat, and TypeScript gotchas.

Quick reference:

```tsx
import { reatomComponent, bindField } from '@reatom/react'

const Counter = reatomComponent(() => {
  return <div>{counter()}</div>
})
```

## Native JSX (@reatom/jsx)

See [references/integrations/jsx.md](references/integrations/jsx.md) for the native JSX runtime API: zero re-renders, CSS-in-JS (`css` prop), `reatomClassName`, `$spread`, and two-way bindings.

Quick reference:

```tsx
import { atom } from '@reatom/core'
import { mount } from '@reatom/jsx' // no virtual DOM!

const Counter = () => {
  const count = atom(0) // runs once!
  return <button on:click={() => count.set(c => c + 1)}>Count: {count}</button>
}

mount(document.body, <Counter />)
```

## Patterns & Architecture

Full patterns reference — atomization, scoped factories, loader-as-SSOT, file organization — in [`references/core/patterns.md`](references/core/patterns.md). Two pattern reminders that affect day-one decisions:

**Naming convention.** Custom factories that create atom primitives or scoped models use `reatom*` (e.g. `reatomUser`, `reatomSessionForm`), not `create*`/`make*`. Keeps custom primitives visually aligned with built-ins (`reatomBoolean`, `reatomForm`, `reatomRoute`).

**Scoped model factories.** When a feature has several atoms/computeds/actions/hooks that belong together, prefer a `reatom*` factory returning a model object over exporting many module-level primitives. Each call gets its own atom graph; implementation state stays private; the public API is explicit. Use the `name` parameter to namespace internal names. Exporting a singleton from the factory is fine for app-wide state; route loaders, dialogs, repeated widgets create their own instances.

**Boolean state as a lifecycle switch.** When a boolean controls a background resource, model it as `reatomBoolean` and attach lifecycle with `withChangeHook(isEnabled => isEnabled ? run() : run.abort())`. Expose the atom itself so callers use `.setTrue()`/`.setFalse()`/`.toggle()`; add semantic actions only when they enforce extra rules. Change hooks run after atom updates — make cleanup idempotent.

## Retrying Computeds & Resetting Dependencies

- **`reset(target)`** — clears computed atom dependencies without re-running. Invalidates cached resources/effects so the next read triggers fresh computation.
- **`retryComputed(target)`** — resets deps AND immediately re-evaluates. Returns the new value. Propagates through downstream computeds.

Both throw on actions (atoms only). Primary use: **retry failed async loaders** in route `render`:

```typescript
render: (self) => {
  const status = self.loader.status()
  const error = self.loader.error()
  if (status.isPending) return <Loading />
  if (error) return <PageError onRetry={wrap(() => retryComputed(self.loader))} />
  return <Content data={status.data} />
}
```

## Sampling & Events

See [references/core/sampling.md](references/core/sampling.md) for debounce/throttle via `wrap(sleep())`, `take()`, `onEvent()`, `race()`, `all()`, `variable()`, `abortVar`, and the checkpoint pattern.

Quick reference:

```typescript
import { action, wrap, sleep, take, onEvent, race, withAbort } from '@reatom/core'

// Debounce — withAbort cancels previous
const search = action(async (query: string) => {
  await wrap(sleep(500))
  return await wrap(fetchResults(query))
}).extend(withAbort())

// Wait for state change
await wrap(take(formIsValid, (v) => v || throwAbort()))

// Wait for DOM event
await wrap(onEvent(dialog, 'close'))

// First wins, others cancelled
const result = await wrap(race({
  data: take(dataAtom, (v) => v !== null),
  timeout: sleep(5000),
}))
```

## Lifecycle Queue Priorities

Reatom operates queues to manage updates with different priorities, achieving intuitive and efficient execution order with batching. The nested loop execution order is:

1. **Updates** (`anAction(payload)`, `anAtom(newState)`)
2. **Hooks** (`anAtom.extend(withChangeHook(cb))`)
3. **Computations** (`computed(() => ...)` and `effect(() => ...)`)
4. **Cleanups** (temporal state clearing)
5. **Effects** (`anAtom.subscribe(cb)`, `schedule(cb)`, `anAtom.extend(withConnectHook(cb))`)

*Effects are processed after all computations, computations after all hooks, and hooks after all updates (scheduled to next microtask).*

## Async Context — wrap() Rules

`wrap()` preserves async context for actions, effects, computed async bodies, event handlers, and callbacks that read/write atoms across an async boundary. **Keep pure API/helper modules framework-agnostic** — if a module only wraps `fetch`, parses responses, or transforms data without touching atoms, do not add `wrap()`. Wrap the promise/callback in the calling Reatom action/computed/effect.

```typescript
// ✅ Reatom code:
const fetchUser = action(async (id: string) => {
  const res = await wrap(fetch(`/api/users/${id}`))
  userAtom.set(await wrap(res.json()))
})
addEventListener('click', wrap(() => doSomethingWithAtoms()))

// ✅ Plain helpers (no atoms, no Reatom APIs): leave bare.
//   export async function request<T>(url: string) { ... }

// ❌ Anti-patterns:
await wrap(fetch(url)).then(res => res.json())  // chain after wrap
fetch(url).then(res => doSomethingWithAtoms())  // missing wrap around atom work
```

## App Setup — context options

Reatom creates a default global context on import. `clearStack()` is optional and should be treated as an **opinionated strict mode**, not a Reatom requirement. For full greenfield production scaffolds, the setup guide recommends `clearStack()` + `context.start()` in the earliest setup import and passing the resulting frame to adapters such as `<reatomContext.Provider>`.

When a project uses strict setup, `src/setup.ts` is runtime-critical: import it as soon as possible, before any atoms, routes, or components are imported, and keep `import './setup'` as the first import in app entrypoints. Configure linters, formatters, and import-sorting/organize-import tools so they do not move that side-effect import into the middle of the import block.

For greenfield apps and debugging tasks, encourage enabling `connectLogger()` in that same earliest setup import during development. It traces Reatom atoms/actions/computeds with useful call stacks and pairs with the built-in `log` action for source-level debug points that are silent in production. Keep it behind a dev-only guard (`import.meta.env.MODE === 'development'` or equivalent) and register it before feature atoms/actions are created so it observes the app from startup. The setup guide contains the canonical snippet.

Use the project’s existing context style when editing an app. Do not add or remove `clearStack()` casually: adding it makes host callbacks require `wrap()`, removing it weakens isolation and can hide missing async boundaries. For greenfield bootstrap defaults and full setup code, use the sibling `reatom-scaffold` skill.

After `clearStack()`, module scope must stay declarative: create primitives and attach declaration-time extensions, but do not read/write atoms or install live observers at import time. Top-level `effect()` and equivalent live subscribers are the common trap.

Boundary callbacks need a frame. UI events, timers, third-party callbacks, promise continuations, and anything scheduled by the host enter a fresh context. Under strict setup, treat handwritten callbacks that read/write atoms or call Reatom actions as `wrap()` boundaries. This is especially easy to miss with third-party UI controls whose `onChange`/`onClick` callbacks pass raw values or DOM events. Adapter-generated handlers are usually already wrapped; functions you write by hand are not.

For one-shot side effects after a successful action (navigate, toast, focus), prefer `await wrap(action(...))` then act on the returned value, put the side effect inside the action body, or attach it with a source-level hook. Do not create module-level `action.subscribe(...)` / `effect()` bridges after `clearStack()` just to wait for one command.

For app-lifetime reactions, prefer source-attached hooks (`withChangeHook`, `withCallHook`) or route `params()` guards over boot-only `start*Effects()` helpers.

## Testing

Read [`references/core/testing.md`](references/core/testing.md) for source-backed examples. Quick rule:

- Existing/default-context suites: use `context.reset()` in `beforeEach()` and call atoms normally.
- Strict suites that call `clearStack()`: run each test body inside `context.start(() => { ... })` or a project test helper. Atom reads/writes outside that frame throw `missing async stack`.
- Use `mock(target, cb)` inside an active frame and always call the returned unsubscribe.

## High-priority Gotchas

If user follow-up reveals wrong Reatom guidance, prefer the sibling `reatom-feedback-loop` skill after fixing the task.

Keep this section as the always-loaded warning list. For detail, read the linked reference before implementing that area.

### Async, lifecycle, build

- `status` is disabled by default on `withAsync` / `withAsyncData`; pass `{ status: true }` before calling `.status()`. For form submit UI, default to `.ready()`, `.pending()`, and `.error()` unless the submit action was explicitly extended with status.
- Async helper atoms are atom getters: call `.data()`, `.ready()`, `.error()`, `submit.error()`. Do not destructure them into inert values.
- `status.isPending` and friends are properties, not functions. `status.error` does not exist; use the target's `.error()` atom.
- `withAsyncData` overload trap: when using `initState`, let TypeScript infer from `initState` or annotate the value; do not force a generic that selects the no-`initState` overload.
- Reference atoms from action closures instead of passing atom objects as action parameters.
- `wrap()` belongs around async boundaries that touch atoms, not inside plain API helpers. ES2017+ native async/await output is required: if TS/bundler/test targets downlevel async/await to `.then()` chains, context propagation can break with `missing async stack`.
- In strict-context apps, every handwritten UI callback that reads/writes atoms or calls Reatom actions must be wrapped. Third-party controls often provide raw-value callbacks, so they are not covered by adapter helpers like `bindField`.
- For debugging, enable `connectLogger()` in the earliest development setup import and use the built-in `log` action (`LOG(...)`) for traceable debug points. Guard logger setup to development so production output stays clean, and keep the setup side-effect import first so import sorters do not break strict bootstrap order.
- `@reatom/core` is effectively a singleton (`STACK` and global runtime state). After package updates or impossible type/runtime errors, check for duplicate installed copies and dedupe all `@reatom/*` packages.
- Reatom-managed `effect`, `computed`, subscriptions, aborts, and async work are cleaned up by the reactive context. Return cleanup from `withConnectHook` only when the connected work is not already lifecycle-managed. Non-Reatom resources such as DOM listeners, WebSockets, and other imperative registrations clearly need cleanup. Low-level hook/middleware installers that mutate a target outside the reactive subscription graph need cleanup too, because Reatom cannot infer their disconnect lifecycle. Do not return cleanup handles for already-managed reactive subscriptions just to re-clean them.

### Routing

Read [`references/features/routing/routes.md`](references/features/routing/routes.md) and [`references/features/routing/loaders.md`](references/features/routing/loaders.md) before changing routes or loaders.

- `render` is a route option; after construction `route.render` is a computed output, not an assignable callback. If the route module writes JSX inline inside `render`, the file should use a JSX-capable extension (`.tsx` / `.jsx`).
- `RouteChild` needs one framework declaration merge, and `outlet()` returns `RouteChild[]`.
- The root element returned from each route `render` should have a static `key` because parent routes render child outputs as an outlet array. Keep it stable per route; only use params/search in the key when an intentional remount is desired.
- Route paths have no leading `/`; use `reatomRoute('')` for root; `route.go()` takes params (or nothing), not a path string.
- v1001 render semantics: `layout: true` for wrapper routes; page routes are exact-by-default. v1000 uses match-by-default plus `exactRender: true` for pages.
- Loader takes one merged params/search object; `(params, search)` is wrong and the second arg is `undefined`. Handle loader/resource state orchestration in `render(self)` with `.status()`, then pass typed data/model props to route-neutral components instead of passing the loader or inlining full page UI.
- Use the full status model for UX-sensitive async: `isFirstPending` for first skeleton, `isPending && isEverSettled` for stale refresh, `isFulfilled` for narrowed data, `isRejected` for errors. Successful empty collections are fulfilled states too — render intentional empty-state UI rather than an empty table/list/card. `.ready()` is too lossy for route loaders.
- During stale-while-refresh, `status.data` may intentionally be the previous fulfilled loader payload. Keep settled content visible, including empty-state UI when the settled collection is empty; do not bind high-frequency controlled inputs to stale loader payload fields. Use a dedicated atom (often synced with `withSearchParams`) and let the loader read route search for fetching.
- Separate stale-refresh from identity changes: same list/search identity may keep stale UI; `:id` switches should usually block at a parent identity loader and let children derive scoped models from `await wrap(parentRoute.loader())`.
- Auth/redirect/feature-gate decisions belong in `params()` / parent guards, not nullable loader returns.
- Redirects inside reactive guards (`params()`, URL hooks) must be idempotent: before `.go(..., true)`, prove the guard owns the current URL and check that the target route is not already active. Routes that omit `path` inherit the parent's URL scope, so auth/layout guards can observe public siblings unless you explicitly exclude them.
- Root/default redirects must be state-aware. In auth/onboarding apps, branch to the allowed default target directly; do not blindly redirect `/` to a private page and rely on another guard to bounce back. The safest universal check in a `urlAtom` change hook is the concrete pathname (`url.pathname === '/'`). A pathless root route can report `exact()` broadly by design, while an explicit empty-path root route behaves as expected; when in doubt, prefer the raw pathname check because it is independent of route-shape subtleties.
- Dynamic params near literal siblings need constrained schemas; do not hide collisions with `outlet().at(0)` because the wrong loader can still run.
- Guard index child loaders under layout routes: v1001 page `render` is exact-by-default, but loaders follow route matching and a `{ path: '' }` child can match descendants.
- Avoid route/layout import cycles. A route module may import a layout or shell component to render it, but that layout/shell should not import the same route singletons back for navigation state. Pass route-derived navigation items/actions down from the route module, or extract route-neutral view config, so ESM initialization cannot hit temporal-dead-zone runtime errors. For entity links, precompute `href` strings in loaders/models and pass them to components. When a component needs lazy link construction, wrap `route.path(...)` behind small functions created in the route/model layer and pass those functions down instead of importing routes in the component layer. If two core routes genuinely need each other for redirects/guards, co-locate them in the same composition-root module rather than falling back to string-based `urlAtom.go(...)` navigation.
- `urlAtom()` returns a `URL` object; use `urlAtom().pathname`, never `urlAtom().startsWith(...)`. Use `route.match()` for route checks.
- For an index route (`path: ''`) under a layout, prefer `route.exact()` for active navigation state. `match()` can stay true for descendants, making both the index item and a child item appear active.
- Default redirects are source-attached URL reactions: register `urlAtom.extend(withChangeHook(...))` at module scope. Do not replace it with top-level `effect()` or boot-only `start*Effects()`.
- Use `retryComputed(self.loader)` for retry buttons; distinguish stale refresh from identity changes. After a successful mutation, remember that a loader whose params/search did not change may keep its cached payload; explicitly invalidate or retry it when the UI should refresh in place.

### Forms

Read [`references/features/forms.md`](references/features/forms.md) for field APIs, validation, and factories.

- `reatomForm` belongs in route/scoped factories, not as a shared module-level singleton for route-bound data. But route ownership follows product behavior: choose the route boundary from URL/history/state-lifetime semantics before deciding which loader creates the form.
- `bindField` is event-shaped; wire controls like `<select>` manually with `field.change(value)` and wrap handwritten handlers under `clearStack()`.
- Prefer `field.value()` / `field.change(v)` for user-facing values; `field()` is the underlying state.
- `field.validation().error` is the single-field first-error message (a string); `form.validation().errors` is the structured list across all fields. Form-level `validation()` does not have an `.error` property — only individual fields do.
- `form()` returns field values; there is no `form.getValues()`.
- `form.submit.error` is an atom getter; call it (`form.submit.error()` / `submit.error()`), don't render the atom object.
- Put submit mutations in `reatomForm({ onSubmit })` and call `form.submit()`. Separate actions that call `api.save(form())` bypass submit validation unless they explicitly trigger it; semantic commands should wrap/alias `form.submit()` rather than creating a second raw-value submit path.
- Default to inline form creation in the loader when route lifetime and post-submit behavior are part of the same local story. If a form is large enough to extract into its own factory file, keep the factory focused on fields/validation/core mutation and attach route-specific retry, navigation, or focus behavior from the consuming loader via `form.submit.onFulfill` / `form.submit.onReject` hooks.
- `form.submit()` returns the `onSubmit` result, useful for one-shot navigation/toast/focus without module-level subscriptions.
- Do not reset route-loader-created forms just for cleanup when successful submit navigates away; the route lifecycle disposes them. Reset only when staying in the same form lifetime and intentionally preparing another entry/cancel/restart.
- `ifChanged` is not available on atoms; use `computed` / `withComputed` for derived state.

### React and TypeScript

Read [`references/integrations/react.md`](references/integrations/react.md) for StrictMode and consumption patterns.

- Reatom leans heavily on TypeScript inference, so unsafe typing should be treated as architecture debt rather than a harmless shortcut.
- Do not introduce `any` into the codebase. Keep `no-explicit-any` enforced and avoid silencing it just to push a change through.
- Avoid unsafe assertions when a better type model can express the contract: broad `as` casts, double-casts (`as unknown as T`), and casual non-null assertions (`!`) usually hide missing guards or unclear data flow. Prefer parsers, guards, local narrowing, explicit unions, and helper types.
- Prefer `satisfies` for declarative objects and configuration-like shapes when you want conformance checks without throwing away inference.
- Treat React as a rendering adapter. React-owned domain state/effects are an architectural smell, but React hooks are fine for view-only DOM glue and memoization.
- Prefer `reatomComponent`; `useAtom` / `useAction` are valid when matching an existing hook-style codebase. Components that call atom getters must be `reatomComponent`; this includes root components, extracted child/row helpers, and navigation items, not just obvious page components. `useAtom`-based components do not need that wrapper because the hook manages subscription.
- Do not call `wrap(...)` directly in JSX of a plain function component under strict setup. `wrap()` captures the current Reatom frame at call time, so create wrapped callbacks inside `reatomComponent` (or another reactive caller), or pass pre-wrapped callbacks down as props. Treat `const handler = wrap(...)` inside a plain component render as the same mistake.
- Do not gate first-render boot/auth solely on `.ready()` from an async atom that may resolve immediately before `reatomComponent` subscribes. Use a synchronous source (persisted token, URL, route params, explicit init atom) for initial branching.
- Passing atoms as props is recommended for reusable components; avoiding atom props is a Redux intuition, not a Reatom rule.
- v1001 `reatomComponent` defaults `abortOnUnmount: false`; v1000 can throw `AbortError: Component unmount` in React StrictMode, so either disable StrictMode for v1000 or use strict context setup. Set `{ abortOnUnmount: true }` only when v1000-style cancellation is wanted.
- Capture atom getter results once for TypeScript narrowing; repeated calls break narrowing.
- `Action` type does not include extension-added `.status()`; define a local extended interface when needed. `ReatomForm` is not exported; type forms inline from the returned value.

### Storybook

Read [`references/integrations/storybook.md`](references/integrations/storybook.md) when the user wants isolated component work, routed story scenarios, visual review, or browser-driven interaction tests.

- For from-scratch app bootstraps, treat Storybook as part of the runtime validation harness, not as optional decoration. After the app is verified, it is reasonable to offer cleanup if the user wants a leaner setup.
- Every story should get a fresh Reatom frame via `context.start()` so atoms, route registrations, subscriptions, and async work do not leak between stories.
- If the project uses strict context setup, load that setup before story modules that create atoms.
- Routed stories need explicit URL ownership. Storybook owns the iframe URL, so routed story harnesses should usually keep Reatom routing internal to the story frame and stub outward sync with `urlAtom.sync.set(() => noop)`.
- MSW is optional. Use it only for stories that actually perform requests, and prefer stable default handlers with small per-story overrides.
- Keep component stories small and focused; use integration stories only when routing, loaders, or larger app flows are the thing being tested.
- If stories run as browser tests, keep viewport and setup hooks aligned so the visible canvas and CI run exercise the same scenario.
- If using MSW, regenerate `mockServiceWorker.js` after `msw` version bumps.

## Package Index

Full table, deprecation list, and `jsrepo` reusables system live in [`references/meta/packages.md`](references/meta/packages.md) and [`references/meta/reusables.md`](references/meta/reusables.md). The usual install is `@reatom/core` plus one adapter (`@reatom/react`, `@reatom/jsx`, `@reatom/vue`, `@reatom/solid-js`, `@reatom/preact`, or `@reatom/lit`).

> **Do not install** v3 packages (`@reatom/hooks`, `@reatom/async`, `@reatom/persist*`, `@reatom/form`, `@reatom/url`, `@reatom/timer`, `@reatom/lens`, `@reatom/undo`, `@reatom/primitives`, `@reatom/npm-react`, `@reatom/npm-vue`, `@reatom/devtools`) into v1000+ projects.

## Architectural Smells

These are not API traps; they are design choices to question. Read the relevant reference before large rewrites.

- Manual data fetching with `effect` + `action` instead of `computed` + `withAsyncData`.
- Identity actions that only forward to `atom.set()`; expose atoms or use built-in primitives unless the action adds semantics.
- Route components checking `route.match()` or accepting loader props; use route `render(self)`.
- Nullable loader payloads for redirects/auth/feature gates; block in `params()` / parent guards instead.
- Unmounting on background refresh (`!status.isFulfilled`) and losing focus/stale UI; use status flags that preserve settled data during refresh, and treat empty arrays as fulfilled data requiring empty-state UI.
- Module-level forms/actions for route-owned lifecycle; create scoped models in route loaders/factories.
- Syncing atoms with `withChangeHook`; use `computed` / `withComputed` for derivation.
- Atom + effect bridges for one-shot commands (`latestEventAtom` + `effect()`); call the imperative API from the action unless the value is real rendered/persisted state.
- Boot-only `start*Effects()` helpers; attach stable reactions to sources or put scoped work in loaders/factories/hooks.
- Unguarded `.go()` calls inside reactive route guards or URL hooks; redirects must be conditional/idempotent to avoid loops.
- Protected layouts that omit `path` and redirect while public sibling routes are active. Prefer a real private path segment or explicitly exempt public URLs before redirecting.
- Single create/edit route or broad dynamic routes beside literal routes.
- Treating route shape as a purely technical file-organization decision. Routes define URL sharing, Back/Forward behavior, state lifetime, parent context, loading/error boundaries, breadcrumbs, analytics, permissions, and recovery from abandoned work; ask or state the UX tradeoff before choosing page vs child vs layout vs search-param vs modal vs inline state.
- Layout/shell/component modules importing route singletons that import them back; thread navigation config/actions through props or a route-neutral module instead. Prefer passing precomputed `href`s or route-layer path-builder functions from loaders/models into components.
- Controlled search/filter inputs bound to route loader payload while the loader preserves stale data during refresh. Use a dedicated atom for the live input value; sync it to the URL with `withSearchParams` when the value is URL state.
- Index-route nav items using `match()` under a layout route. Use `exact()` for active state and add a pathname guard when the index loader should not run on descendants.
- Avoiding atom props; passing atoms to children is recommended decoupling.
- Misnaming atom factories as `create*` / `make*`; use `reatom*` for custom primitives and scoped models.
- React-owned app state that mirrors atoms or coordinates domain flow. If enforcing this with lint rules, label it as the setup guide's opinionated default, not a Reatom requirement.
