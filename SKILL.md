---
name: reatom
description: Expert guide for Reatom v1000+ state management. Use for any task involving @reatom/* packages — reactive state, atoms, actions, computeds, effects, forms, routing, async data, persistence, framework adapters (@reatom/react, @reatom/vue, @reatom/solid-js, @reatom/preact, @reatom/lit, @reatom/jsx), testing, or migrating from v3. Triggers on files importing from @reatom/*, reactive/atom patterns, any Reatom question, or any error mentioning ReatomError, missing async stack, or Reatom runtime exceptions.
---

# Reatom v1000+

Atom-centric reactive state management. All primitives (actions, computeds, effects) are built on a single core — the atom.

## Quick navigation

In-document sections (read top-to-bottom for orientation, jump for lookup):

- [Version policy (v1000 vs v1001)](#version-policy-v1000-vs-v1001) · [Resources](#resources) · [Reference files](#reference-files--read-on-demand)
- [Core Primitives](#core-primitives) · [Extensions](#extensions) · [Built-in Primitives](#built-in-primitives)
- [Routing](#routing) · [Forms](#forms) · [Persistence](#persistence)
- [React Integration](#react-integration) · [Native JSX (@reatom/jsx)](#native-jsx-reatomjsx)
- [Patterns & Architecture](#patterns--architecture) · [Sampling & Events](#sampling--events) · [Retrying Computeds](#retrying-computeds--resetting-dependencies)
- [Lifecycle Queue Priorities](#lifecycle-queue-priorities) · [wrap() Rules](#async-context--wrap-rules) · [App Setup](#app-setup--optional-clearstack-and-contextstart) · [Testing](#testing)
- [Gotchas](#gotchas) (read before writing any Reatom code) · [Anti-patterns](#anti-patterns) · [Package Index](#package-index)

Reference files are loaded on demand — see the [reference table](#reference-files--read-on-demand) below.

> **🚀 Greenfield / bootstrap rule:** if the user is starting a new app, asking how to set up Reatom, choosing packages/tooling, creating a Vite/React project, configuring TypeScript/lint/format/tests, or requesting a production-ready project skeleton, **read [`references/setup/start-from-scratch.md`](references/setup/start-from-scratch.md) first** and follow its checklist before writing code.

> **⚠️ v1000+ only — do not rely on any v3 or earlier packages.** The v3 ecosystem (`@reatom/lens`, `@reatom/hooks`, `@reatom/effects`, `@reatom/persist-web-storage`, etc.) is completely separate and incompatible. v1000+ consolidated everything into `@reatom/core` and `@reatom/react`. When researching, always target the `v1000+` / `v1001` branches — v3 docs will mislead you.

## Version policy (v1000 vs v1001)

When editing an existing project, inspect `package.json` / lockfile and match its installed `@reatom/*` version. Do not apply v1001-only APIs to a v1000.x codebase unless you also upgrade packages.

**Appeared in v1001 — mark these explicitly in answers and migrations:** routing `layout: true` with page routes exact-by-default, URL codecs for `params`/`search`, `route.go.relative()`, React `reatomComponent({ abortOnUnmount })` with default `false`, new `reatomObservable` / `withObservable` producer API, action subscription callbacks `(payload, params)`, `withMiddleware(..., 'read' | 'computed' | 'invalidation')`, `withTransaction({ shouldRollback })`, `fromEntries`, `framePromise()` removed queue arg (v1000 accepts `QueueKind` with default `'effect'`, calling with no args works in both), and `reatomEnum.set` accepting arbitrary strings (runtime-validated).

The **computed factory / scoped model pattern** (`computed` returning scoped atoms/forms/actions, extended with `withAbort()`) works in both v1000 and v1001. Only the surrounding routing syntax is version-sensitive: v1001 uses `layout: true` + default-exact pages, v1000 uses `exactRender: true`. See `references/meta/v1001.md` before version-sensitive work.

## Resources

- **Repo**: https://github.com/reatom/reatom
- **Docs**: https://v1000.reatom.dev
- **Examples**: https://github.com/reatom/reatom/tree/v1000/examples

### Reference files — read on demand

References are grouped into subfolders for fast scanning:

```
references/
├── core/         core primitives, extensions, sampling, architectural patterns
├── features/     forms, routing, persistence (built into @reatom/core)
├── integrations/ framework adapters: React, native JSX runtime
├── meta/         package index, version delta, migration
└── setup/        starting a new project from scratch
```

| File | Read when |
|---|---|
| `references/setup/start-from-scratch.md` | **Read first for any greenfield/bootstrap/setup task**: new TypeScript + Vite + Reatom project, package selection, lint/format/test pipeline, browser smoke test, production defaults, post-bootstrap pitfall summary |
| `references/meta/v1001.md` | Comparing v1001 to v1000, deciding whether an API is v1001-only, migrations from v1000 |
| `references/meta/packages.md` | Looking up which @reatom/* package to install, checking if a v3 package is deprecated |
| `references/meta/reusables.md` | Browsing the [reatom/reusables](https://github.com/reatom/reusables) jsrepo catalog — form helpers, history/undo, logger, test harness, tweakpane integration, etc. |
| `references/meta/migration.md` | Migrating code from v3 to v1000+, mapping old APIs to new |
| `references/core/extensions.md` | Using built-in extensions: `withAsyncData`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withRollback`, `withTransaction`, `framePromise` |
| `references/core/writing-extensions.md` | Writing custom `.extend()` helpers, lifecycle/resource integration, middleware, hooks, type-safe extension APIs |
| `references/core/sampling.md` | Debounce/throttle, `take()`, `onEvent()`, `race()`, `abortVar`, checkpoint pattern |
| `references/core/patterns.md` | Architectural decisions: atomization, computed factory/scoped models, standalone atoms vs lenses, file organization |
| `references/features/routing/index.md` | Working with `reatomRoute`, nested routes, layouts, URL params, navigation, codecs |
| `references/features/routing/loaders.md` | Route loaders: data fetching, factory pattern, dynamic collisions, protected routes |
| `references/features/routing/spa-example.md` | Full end-to-end SPA example combining routing + loaders + components |
| `references/features/forms.md` | Working with `reatomForm`, `bindField`, field validation, form factories |
| `references/features/persistence.md` | Using `withLocalStorage`, `withIndexedDb`, `withCookie`, or any storage adapter |
| `references/integrations/react.md` | Using `@reatom/react`: `reatomComponent`, `bindField`, StrictMode issues |
| `references/integrations/jsx.md` | Using `@reatom/jsx` native JSX runtime, CSS-in-JS, direct DOM bindings |

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

See [references/features/routing/index.md](references/features/routing/index.md) for complete routing API: routes, nested routes, loaders, layout/page routes, protected routes, modal gates, search-only routes, and a full SPA example.: routes, nested routes, loaders, layout/page routes, protected routes, modal gates, search-only routes, and a full SPA example.

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

## App Setup — optional clearStack and context.start

Reatom creates a default global reactive context when `@reatom/core` is imported, so `clearStack()` is optional. Still, **prefer the stricter setup for greenfield production apps**: call `clearStack()` then `context.start()` in the earliest app import. This opts into an explicit app frame and makes accidental work outside it fail loudly:

```typescript
// setup.ts — import before any other module!
import { clearStack, context } from '@reatom/core'
clearStack()  // any atom operation outside context.start() now throws "missing async stack"
export const rootFrame = context.start()
```

**Rules after `clearStack()`:** module evaluation must stay **declarative**. The principle: at module scope you may *create* reactive primitives and *register declaration-time extensions* on them; you may not *read*, *write*, or *attach a live observer* to anything reactive.

- Allowed at module scope: declaring atoms, computeds, actions, routes; calling `.extend(...)` to attach hooks/middleware/persistence/lifecycle to a source (these resolve at the next frame, not at evaluation time).
- Forbidden at module scope: any call that requires an active reactive frame to do its work. The unifying symptom is `missing async stack`. The shared cause is that the operation eagerly enters the reactive system — either it reads/writes atom state, or it registers a live subscriber that needs a context to deliver into. Top-level `effect(() => ...)` is the most familiar example, but the rule applies to any equivalent call regardless of name.

For app-lifetime reactions, attach the behavior to its source (`urlAtom.extend(withChangeHook(...))` for URL normalization, `someAction.extend(withCallHook(...))` for action follow-ups), or encode the decision in route `params()` guards. A `start*Effects()` helper whose only job is to wrap module-level reactions in `rootFrame.run()` hides the lifecycle boundary instead of modeling it.

**Boundary callbacks need a frame.** Any callback that runs as a separate microtask — UI event handlers, timers, third-party library callbacks, anything the host environment schedules — enters a fresh execution context with no active frame. Wrapping the boundary with `wrap()` re-enters the reactive system; without it, the first atom read or write throws `missing async stack`. Adapter helpers that produce these callbacks for you typically wrap internally; callbacks you write by hand do not.

If you need a one-shot side-effect after a successful action (navigate after create, toast after save, focus after open), prefer one of: chain it inline in the call site with `await wrap(action(...))` then act on the returned value; do the work inside the action body itself; or attach it at declaration time via the corresponding source-attached hook. All three keep the side-effect inside an active frame and avoid the module-load trap.

**Don't add `clearStack()` casually** in an existing project that doesn't use it — it changes context assumptions. **Don't remove it** from a project that does — fix the missing `wrap()` instead.

In React apps, pass the root frame to `<reatomContext.Provider value={rootFrame}>` so all `reatomComponent` instances share the same isolated context.

## Testing

```typescript
import { context, mock, clearStack } from '@reatom/core'

// Strict isolation: clearStack() + context.start() per test
clearStack()

beforeEach(() => context.reset())

test('counter increments', () => {
  counter.set(5)
  expect(doubled()).toBe(10)
})

// Mock an atom/action
const unsub = mock(targetAtom, () => 'mocked-value')
// ... test code ...
unsub()  // restore original
```

`context.reset()` is the simpler option — it resets state within the existing context. `clearStack()` + `context.start()` is stricter — it opts tests into an explicit frame, catching missing `wrap()` calls via "missing async stack" errors. Use the stricter pattern for new tests when it matches the app setup; otherwise follow the test suite's existing context strategy.

## Gotchas

These are the most common mistakes. Read before writing any Reatom code.

### Async

- **`status` is disabled by default** on BOTH `withAsync` and `withAsyncData` — pass `{ status: true }` to enable, otherwise `.status()` throws `ReatomError`
- `status.error` does NOT exist — use `submit.error()` (the action's error atom)
- `status.isPending` is a property, not a function — `status.isPending` not `status.isLoading()`
- `.data()`, `.ready()`, `.error()` are atom getters — **call them!** `atom.data()` ✅ not `atom().data()` ❌
- Do NOT destructure: `const { data, ready } = list` breaks reactivity
- **`withAsyncData` has overloaded signatures — do not pass an explicit generic type parameter when you also want `initState`.** Writing `withAsyncData<MyType>({ initState: x })` selects the no-`initState` overload and TypeScript reports `'initState' does not exist in type 'AsyncOptions<...>'`. Either drop the explicit generic and let TS infer from `initState` (`withAsyncData({ initState: null as MyType | null, status: true })`), or annotate the value (`initState: [] as Item[]`). Same trap exists for any extension with multiple overloads where one branch adds option keys.
- Reference atoms directly in action closures — do NOT pass atoms as action parameters:
  ```typescript
  // ❌ Don't pass atoms as action params
  const saveAction = action(async (token: typeof authToken) => { ... })
  // ✅ Reference atoms directly in the closure
  const saveAction = action(async () => {
    const t = authToken()  // atom is in scope
  })
  ```

### Lifecycle & Automatic Cleanup

Reatom's reactive context tracks and disposes effects, aborts, and subscriptions automatically when atoms disconnect or computations rerun. Manual unsubscribe is rarely needed. The context composes across `computed`, `effect`, `withConnectHook`, and `wrap()` — cleanup and abort propagation work across all layers via a single reactive call stack (`abortVar` exposes its abort signal).

`withConnectHook` *does* accept a returned cleanup function for non-Reatom resources (DOM listeners, WebSockets, third-party library instances). For Reatom-managed primitives (`effect`, `computed`, `action` with `withAbort`/`withAsyncData`), don't return their unsubscribe handles — the context already owns them.

### Build & Packages

- **ES2017+ build target required** — `wrap()` relies on native `async`/`await` microtask semantics. If your bundler/TS targets below `es2017`, `async/await` gets compiled to `.then()` chains which breaks `wrap()`'s seal → `"missing async stack"` error. Ensure **all** toolchain targets (TypeScript, bundler, test runner) are `es2017` or higher.
- **Package deduplication** — `@reatom/core` is a **singleton** (uses internal `STACK` and other global variables). If your package manager installs multiple copies, you get type incompatibilities or runtime errors. After updating Reatom packages, always deduplicate:
  ```bash
  # npm
  npm i --prefer-dedupe @reatom/react@latest
  # yarn 3+
  yarn add @reatom/react@latest && yarn dedupe "@reatom/*"
  # pnpm
  pnpm rm @reatom/core @reatom/react && pnpm i @reatom/core@latest @reatom/react@latest
  ```

### Routing

Detailed loader/render patterns are in [`references/features/routing/loaders.md`](references/features/routing/loaders.md). Quick rules:

- **`render` is a route OPTION, not assignable post-hoc.** It must be passed in `reatomRoute({ render: (self) => ... })`. After construction `route.render` is a `Computed<RouteChild | null>` (the rendered output), not a setter. If you need component definitions in a separate file from route definitions, either co-locate them or accept that one circular reference is unavoidable; do not try `route.render = fn`.
- **`RouteChild` is an empty interface waiting for a framework declaration merge.** Without `declare module '@reatom/core' { interface RouteChild extends FrameworkElement {} }` (where `FrameworkElement` is the renderable type for your view layer), `self.outlet()` and `route.render()` return values that the type system can't compose with framework JSX. Do this declaration once in a `*.d.ts` next to your app entry.
- **Loader takes ONE merged argument**: `loader: async (paramsAndSearch) => ...`. Reatom merges the `params` schema and `search` schema into a single `Plain<Params & Search>` payload — do not write `(params, search) => ...`, the second argument is silently `undefined` and TypeScript will complain about the wrong arity.
- **`outlet()` returns an array of `RouteChild`.** Render it via `<>{self.outlet()}</>` (spread / map), not as a single node.
- **Use `retryComputed(self.loader)` for error retry buttons**: `onRetry={wrap(() => retryComputed(self.loader))}`.
- `reatomRoute()` with no arguments throws — use `reatomRoute('')` for root.
- Paths must NOT start with `/` — Reatom auto-prepends it.
- v1001 render semantics: `layout: true` for layout/wrapper routes; page routes are exact-by-default. v1000 has no `layout`; render is match-by-default and `exactRender: true` makes a page route.
- `route.go()` takes params object or nothing — NOT a path string.
- Default to Standard Schema for inbound `params`/`search` validation. Use v1001 codecs only when the route needs a bidirectional contract (`route.go()`/`.path()` accept decoded values, explicit URL encode/decode).
- `urlAtom()` returns a `URL` object — use `urlAtom().pathname`. Never use `urlAtom().startsWith()` — use `route.match()`.
- Put route access and redirect decisions in `params()` (return `null` to block before the loader runs). Don't use loader-`null` for auth/redirect control flow — it makes loader data nullable and weakens narrowing.
- **Separate routes for create vs edit** — don't use `params.id === 'new'` conditionals.
- **Constrain dynamic params next to literal siblings** — `projects/new` and `projects/:projectId` collide unless `:projectId` is validated to reject `new`. Use UUID/numeric/prefixed-ID schemas, not broad `z.string()`.
- Don't hide route collisions by taking `outlet().at(0)` — fix the match instead; the wrong loader still runs.
- Parent route params merge into child params. For auth guards, return `{}` and read shared user atoms in loaders/components instead of injecting params.
- **Guard index child loaders** — v1001 page `render` is exact-by-default but loaders follow route matching. A `{ path: '' }` child under a layout can match descendants and run.
- **Keep loader payloads concrete** — redirects, auth, feature gates belong in route `params()` / parent guards, not in `return null` branches inside the loader.
- **Default redirects are source-attached URL reactions** — register `urlAtom.extend(withChangeHook(...))` at module scope. This is declaration-time extension registration, not a live subscription — do not replace it with a top-level `effect()` or boot-only `start*Effects()` helper.
- **Handle loader async states in route `render(self)`** — read `self.loader.status()`, branch on the discriminated flags, pass narrowed `status.data` (or a typed model) to UI. Don't pass loader props.
- **Use the full status model**: `isFirstPending` for first-load skeletons, `isPending && isEverSettled` for stale-while-refresh, `isFulfilled` for narrowed fulfilled data, `isRejected` for errors.
- **Separate stale-refresh from identity changes** — list/search refreshes can show stale UI; for `:id` pages, fetch the entity in a parent layout that blocks `outlet()` while pending and let children derive scoped models from `await wrap(parentRoute.loader())`.

### Forms

- `submit.error` is an **ATOM** — call it: `submit.error()` not `submit.error`
- `bindField` does NOT work with `<select>` (or any control whose `onChange` receives a raw value instead of a DOM event) — wire `value`/`onChange`/`onBlur`/`onFocus` manually using `field.change(value)` / `field.focus.in()` / `field.focus.out()`. After `clearStack()` those manual handlers must be `wrap()`-ed; `bindField`'s returned handlers are pre-wrapped for you.
- `form()` returns field values — not `form.getValues()`
- **Forms in loaders, not models** — never define `reatomForm` at module scope
- `ifChanged` is not available on atoms — use `computed` / `withComputed` for derived state
- **`field.validation()` returns `{ error, errors, ... }`**: the aggregated single-string message is `error` (singular, `string | undefined`), suitable for direct binding to UI input components. The full structured list is `errors`. Don't write `field.validation().errors[0].message` when the input only shows one line; use `error`.
- **`field.value()` is the user-facing value**, not `field()`. The bare atom call returns the underlying State; transformers (`fromState` / `toState`) make `value` differ from `state`. When in doubt, prefer `field.value()` for reads and `field.change(v)` for writes.
- **Form `onSubmit`'s return value flows through `form.submit()`.** Use this for chaining a one-shot side-effect after a successful submit (navigate, toast, focus): `const saved = await wrap(form.submit()); if (saved) detailRoute.go({ id: saved.id })`. This avoids the module-level `action.subscribe(cb)` trap (forbidden under `clearStack()`) for one of the most common cases.

### React

Deeper React notes (StrictMode, instant-async resolution, choosing `reatomComponent` vs hooks) live in [`references/integrations/react.md`](references/integrations/react.md).

- Treat React as a rendering adapter, not a second state/runtime layer. **React-owned state/effects are a red flag** when they hold domain state, mirror atoms, run Reatom side effects, or coordinate app flow.
- React built-in hooks are fine for view-only glue: refs/focus/measurement, imperative widgets, third-party UI hooks, expensive view memoization, stable DOM callbacks. The warning is about *application state ownership*, not about banning `@reatom/react` adapter APIs.
- **`reatomComponent` is the preferred way to consume atoms in React.** `useAtom` / `useAction` hooks are also valid in hook-style codebases. Match the existing project convention; if uncertain, ask the user and record the choice in `AGENTS.md` / `CLAUDE.md`.
- Components that call atom getters must be `reatomComponent` (including children). `useAtom`-based components don't need it — `useAtom` manages its own subscription via `useSyncExternalStore`.
- **Initial-render + instant-async-completion**: `reatomComponent` subscribes after React commits. An async computed that resolves immediately (cached / no-token branch returning `null`) can settle before subscription mounts. Don't gate first-render boot/auth purely on `.ready()` from an instantly resolving async atom — use a synchronous source (persisted token, URL, route params, explicit init atom) for initial branching.
- **Passing atoms as props is valid and recommended** — unlike Redux, atoms are first-class primitives. `<CheckboxField field={form.fields.rememberMe} />` is the standard reusable-component pattern.
- **React StrictMode is version-sensitive**: v1000 can throw `AbortError: Component unmount`; disable StrictMode or use `clearStack()` + `context.start()`. v1001 defaults `abortOnUnmount: false` on `reatomComponent` — set `{ abortOnUnmount: true }` only for v1000-style cancellation.

### TypeScript

- Calling the same atom getter twice breaks narrowing — capture in a variable:
  ```tsx
  // ❌ {submit.error() && <div>{submit.error().message}</div>}
  // ✅ const error = submit.error(); {error && <div>{error.message}</div>}
  ```
- `Action` type doesn't include `.status()` — define own interface with `withAsync`
- `ReatomForm` is not exported — define inline interface
- Use `React.ReactNode` instead of `JSX.Element`

## Package Index

Full table, deprecation list, and `jsrepo` reusables system in [`references/meta/packages.md`](references/meta/packages.md). Browse the copy-paste reusables catalog (form helpers, undo/redo, logger, test harness, tweakpane integration) in [`references/meta/reusables.md`](references/meta/reusables.md). The most common installs are `@reatom/core` plus one adapter (`@reatom/react`, `@reatom/jsx`, `@reatom/vue`, `@reatom/solid-js`, `@reatom/preact`, or `@reatom/lit`).

> **Do not install** any v3 package (`@reatom/hooks`, `@reatom/async`, `@reatom/persist*`, `@reatom/form`, `@reatom/url`, `@reatom/timer`, `@reatom/lens`, `@reatom/undo`, `@reatom/primitives`, `@reatom/npm-react`, `@reatom/npm-vue`, `@reatom/devtools`) — all merged into `@reatom/core` or obsoleted.

## Anti-patterns

Full rationale for each item is in the corresponding reference (linked where deeper context exists).

- **Manual data fetching** — use `computed` + `withAsyncData`, not `effect` + `action`.
- **Identity actions** — don't wrap `atom.set()` in an action that adds nothing. Expose the atom directly, or use `reatomBoolean`/`reatomEnum` so callers get `.setTrue()`/`.toggle()`/etc. Reserve actions for semantic operations (validation, multi-atom coordination, side effects).
- **Route component checks** — don't `if (!route.match()) return null`; use the `render` option.
- **Passing route loaders into page components** — read `self.loader.status()` in route `render`, branch there, pass typed data/model props down. Loader-as-prop spreads routing/async concerns and tends toward `any`.
- **Nullable loader payloads for redirects** — redirect/auth/feature-gate decisions belong in route `params()` / parent guards, not as `return null` from the loader.
- **Using `.ready()` as the only loading branch** — `.ready()` collapses first-load, refresh, fulfilled, rejected, aborted into one bit. Use `.status()` for route loaders and any UX-sensitive async.
- **Unmounting on background refresh** — search-param changes re-run the loader; `isFulfilled` goes `false` while `status.data` still holds the previous result. Guarding with `!status.isFulfilled` destroys input focus and flashes blank UI. Use `status.isPending && status.isEverSettled` to keep the page mounted with stale data.
- **Treating refresh status as universal** — stale-while-refresh applies to same-identity reloads. On identity changes (`:id` switch) it exposes the previous payload. Block the outlet at a parent identity loader; let children derive scoped models from `await wrap(parentRoute.loader())`.
- **Module-level forms** — create `reatomForm` inside route loaders for proper lifecycle.
- **Single route for create/edit** — separate routes with separate loaders.
- **Broad dynamic routes next to literal routes** — `:id` with `z.string()` beside `new`/`create`/`settings` collides. Use domain-shaped IDs (UUID, numeric, prefixed, slug with reserved-word exclusion) as the params schema.
- **Actions in model files** — create route-specific actions inside route loaders.
- **Syncing atoms with `withChangeHook`** — use `computed` / `withComputed` for derived state. `withChangeHook` is for lifecycle/effect boundaries, not copying one atom's value into another.
- **Boot-only effect helpers** — avoid `start*Effects()` whose only job is to instantiate module-level `effect()` after `clearStack()`. Attach stable reactions to the source with `withChangeHook` / `withCallHook`; put scoped work in route loaders, scoped factories, `withConnectHook`, or semantic actions.
- **Atom + effect bridge for one-shot commands** — don't pair `latestEventAtom` with an `effect()` just to call an imperative API. If the value isn't rendered/persisted/state, call the API from the action. If it is state, keep the atom and use `withChangeHook` on it.
- **Avoiding atom props** — passing atoms to children is the *recommended* decoupling pattern, not an anti-pattern (Redux intuitions don't apply).
- **Misnaming atom factories** — use `reatom*`, not `create*` / `make*`, to align with built-in primitives.
- **React-owned app state** — `useState`/`useReducer`/context owning domain state, mirroring atoms, driving routing/data loading, or coordinating effects mixes two reactive systems. Keep app logic in Reatom; leave React built-in hooks for isolated UI/DOM glue and view-only memoization. (The recommended `oxlint` `no-restricted-imports` rule in `references/setup/start-from-scratch.md` enforces this at the linter level.)

