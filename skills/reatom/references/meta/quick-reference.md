# Quick Reference

> Load this when you need examples, syntax refreshers, or compact API reminders before reading the deeper topic references.

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

Extension decision ladder:

1. **Built-in core first** — if `@reatom/core` already has the primitive or extension, use it directly.
2. **Reusables second** — if the pattern is generic and repeated (form submit wiring, focus-on-error, unsaved-warning, history/reset/test helpers), scan [`references/meta/reusables.md`](references/meta/reusables.md) before inventing a new helper.
3. **Custom extension third** — if there is an existing primitive to enrich but no reusable fits, add a narrow `.extend(...)` helper.
4. **`reatom*` factory last** — if the pattern is domain-shaped or must create several primitives together, model it as a local `reatom*` factory instead of a generic extension.

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

Routing accepts any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library for params and search validation. Preserve the existing validator choice when the project already has one; if there is no validator preference yet, default to Valibot unless the user asks for something else.

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

Forms accept any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library for validation. Preserve the existing validator choice when the project already has one; if there is no validator preference yet, default to Valibot unless the user asks for something else.

Quick reference:

```typescript
import { reatomForm } from '@reatom/core'
import { loginSchema } from './validation'

const form = reatomForm(
  { email: '', password: '' },
  {
    name: 'loginForm',
    validateOnBlur: true,
    schema: loginSchema,
  },
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

For greenfield apps and debugging tasks, default to enabling `connectLogger()` in that same earliest setup import during development and keep it on until the risky behavior is proven correct. It traces Reatom atoms/actions/computeds with useful call stacks and pairs with the built-in `log` action for source-level debug points that are silent in production. Keep it behind a dev-only guard (`import.meta.env.MODE === 'development'` or equivalent) and register it before feature atoms/actions are created so it observes the app from startup. The setup guide contains the canonical snippet.

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
