---
name: reatom
description: Expert guide for Reatom v1000+ state management. Use when building reactive state, forms, routing, async data fetching, persistence, or framework integration with @reatom/core and framework adapters (@reatom/react, @reatom/vue, @reatom/solid-js, @reatom/preact, @reatom/lit, @reatom/jsx).
---

# Reatom v1000+

2 KB gzipped, framework-agnostic reactive state management. Atom-centric model where all primitives inherit from a single core — the atom.

> **⚠️ v1000+ only — do not rely on any v3 or earlier packages.** The v3 ecosystem (`@reatom/lens`, `@reatom/hooks`, `@reatom/effects`, `@reatom/persist-web-storage`, etc.) is completely separate and incompatible. v1000+ consolidated everything into `@reatom/core` and `@reatom/react`. When researching, always target the `v1000+` branch — v3 docs will mislead you.

## Resources

- **Repo**: https://github.com/reatom/reatom
- **Docs**: https://v1000.reatom.dev
- **Examples**: https://github.com/reatom/reatom/tree/v1000/examples

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

Extensions add capabilities via `.extend()`. See [references/extensions.md](references/extensions.md) for complete API with examples (`withAsyncData`, `withAsync`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withRollback`, `withTransaction`, `framePromise`).

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

const priority = reatomEnum(['low', 'medium', 'high'], 'priority')
priority.setHigh()
priority()  // 'high'
```

## Routing

See [references/routing.md](references/routing.md) for complete routing API: routes, nested routes, loaders, layout/page routes, protected routes, modal gates, search-only routes, and a full SPA example.

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

See [references/forms.md](references/forms.md) for complete forms API: `reatomForm`, React binding with `bindField`, field access patterns, and form factories.

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

See [references/persistence.md](references/persistence.md) for complete persistence API: all storage adapters, configuration options, version migration, TTL, schema validation, custom storage, and cross-tab sync.

Quick reference:

```typescript
import { atom, withLocalStorage, withSessionStorage, withIndexedDb, withBroadcastChannel, withCookie, withCookieStore } from '@reatom/core'

const theme = atom<Theme>('light', 'theme').extend(withLocalStorage('theme'))
const prefs = atom({}, 'prefs').extend(withSessionStorage('prefs'))
const cache = atom(new Map(), 'cache').extend(withIndexedDb('my-db'))
const crossTab = atom(0, 'crossTab').extend(withBroadcastChannel('sync'))
const token = atom('', 'token').extend(withCookie({ secure: true })('auth-token'))
const session = atom('', 'session').extend(withCookieStore()('session-id'))
```

## React Integration

See [references/react.md](references/react.md) for `reatomComponent`, `bindField`, StrictMode caveat, and TypeScript gotchas.

Quick reference:

```tsx
import { reatomComponent, bindField } from '@reatom/react'

const Counter = reatomComponent(() => {
  return <div>{counter()}</div>
})
```

## Native JSX (@reatom/jsx)

See [references/jsx.md](references/jsx.md) for the native JSX runtime API: zero re-renders, CSS-in-JS (`css` prop), `reatomClassName`, `$spread`, and two-way bindings.

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

See [references/patterns.md](references/patterns.md) for atomization, standalone atoms vs lenses, loader-as-SSOT pattern, component patterns, and file organization.

## Sampling & Events

See [references/sampling.md](references/sampling.md) for debounce/throttle via `wrap(sleep())`, `take()`, `onEvent()`, `race()`, `all()`, `variable()`, `abortVar`, and the checkpoint pattern.

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

`wrap()` preserves async context for actions, effects, computed async bodies, event handlers, and callbacks that read or write atoms after an async boundary.

Keep pure API/helper modules framework-agnostic. If a module only wraps `fetch`, parses responses, or transforms data and does not read/write atoms, do **not** add `wrap()` there. Wrap the promise/callback in the calling Reatom action/computed/effect.

```typescript
// ✅ Good in Reatom code:
const fetchUser = action(async (id: string) => {
  const res = await wrap(fetch(`/api/users/${id}`))
  userAtom.set(await wrap(res.json()))
}, 'fetchUser')

addEventListener('click', wrap(() => doSomethingWithAtoms()))

// ✅ Good in plain helpers (no atoms, no Reatom APIs):
export async function request<T>(url: string) {
  const res = await fetch(url)
  return (await res.json()) as T
}

// ❌ Bad:
await wrap(fetch(url)).then(res => res.json())  // chain after wrap
fetch(url).then(res => doSomethingWithAtoms())  // missing wrap around atom work
```

## Testing

```typescript
import { context, mock } from '@reatom/core'

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

## Gotchas

These are the most common mistakes. Read before writing any Reatom code.

### Async

- **`status` is disabled by default** on BOTH `withAsync` and `withAsyncData` — pass `{ status: true }` to enable, otherwise `.status()` throws `ReatomError`
- `status.error` does NOT exist — use `submit.error()` (the action's error atom)
- `status.isPending` is a property, not a function — `status.isPending` not `status.isLoading()`
- `.data()`, `.ready()`, `.error()` are atom getters — **call them!** `atom.data()` ✅ not `atom().data()` ❌
- Do NOT destructure: `const { data, ready } = list` breaks reactivity
- Reference atoms directly in action closures — do NOT pass atoms as action parameters:
  ```typescript
  // ❌ Don't pass atoms as action params
  const saveAction = action(async (token: typeof authToken) => { ... })
  // ✅ Reference atoms directly in the closure
  const saveAction = action(async () => {
    const t = authToken()  // atom is in scope
  })
  ```

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

- `reatomRoute()` with no arguments throws — use `reatomRoute('')` for root
- Paths must NOT start with `/` — Reatom auto-prepends it
- `route.go()` takes params object or nothing — NOT a path string
- `urlAtom()` returns a `URL` object, not a string — use `urlAtom().pathname`
- Never use `urlAtom().startsWith()` — use `route.match()` instead
- Loader returns `null` to block the route — use for auth redirects
- **Separate routes for create vs edit** — don't use `params.id === 'new'` conditional logic

### Forms

- `submit.error` is an **ATOM** — call it: `submit.error()` not `submit.error`
- `bindField` does NOT work with `<select>` — handle `value`/`onChange` manually
- `form()` returns field values — not `form.getValues()`
- **Forms in loaders, not models** — never define `reatomForm` at module scope
- `ifChanged` is not available on atoms — use `computed` / `withComputed` for derived state

### React

- Do not use React `useEffect`/`useState` to synchronize Reatom state — use atoms, actions, computeds
- Components that call atom getters must be `reatomComponent` — including child components
- **Passing atoms as props is perfectly valid** — unlike Redux where passing state is discouraged, Reatom atoms are first-class primitives. Passing them as props (e.g. `<CheckboxField field={form.fields.rememberMe} />`) is the standard way to build abstract, reusable components.
- **`@reatom/react` does NOT support React StrictMode** — causes `AbortError: Component unmount`. Workaround: disable StrictMode or use `clearStack()`

### TypeScript

- Calling the same atom getter twice breaks narrowing — capture in a variable:
  ```tsx
  // ❌ {submit.error() && <div>{submit.error().message}</div>}
  // ✅ const error = submit.error(); {error && <div>{error.message}</div>}
  ```
- `Action` type doesn't include `.status()` — define own interface with `withAsync`
- `ReatomForm` is not exported — define inline interface
- Use `React.ReactNode` instead of `JSX.Element`

## Anti-patterns

- **Manual data fetching** — use `computed` + `withAsyncData` instead of `effect` + `action`
- **Identity actions** — don't create actions that just forward to `atom.set()`
- **Route component checks** — don't do `if (!route.match()) return null`. Use `render` option
- **Module-level forms** — create inside route loaders for lifecycle management
- **Single route for create/edit** — use separate routes with separate loaders
- **Actions in model files** — create route-specific actions inside route loaders
- **Syncing atoms with change hooks** — use `computed` / `withComputed` instead
- **Avoiding atom props** — thinking that passing atoms to children components is an anti-pattern. It is the recommended way to decouple models from views!

## v3 → v1000+ Migration

| v3 | v1000+ |
|---|---|
| `ctx` parameter | implicit context (no `ctx`) |
| `ctx.schedule(promise)` | `wrap(promise)` |
| `ctx.spy(atom)` | `atom()` |
| `ctx.get(atom)` | `peek(atom)` |
| `atom(ctx, value)` | `atom.set(value)` |
| `atom(callback)` | `computed(callback)` |
| `ctx.spy(atom, cb)` | `ifChanged(atom, cb)` |
| `ctx.spy(action, cb)` | `getCalls(action).forEach(cb)` |
| `reatomAsync(cb)` | `action(cb).extend(withAsync())` |
| `reatomResource(cb)` | `computed(cb).extend(withAsyncData())` |
| `reaction` | `effect` |
| `atom.onChange(cb)` | `atom.extend(withChangeHook(cb))` |
| `onConnect(atom, cb)` | `atom.extend(withConnectHook(cb))` |
| `withConcurrency` | `withAbort` |

## Installation

```bash
npm install @reatom/core @reatom/react  # or your framework adapter
```

## Package Index

| Package | Purpose |
|---|---|
| `@reatom/core` | Core primitives, extensions, forms, routing, persistence, methods (`framePromise`, `peek`, `wrap`, `sleep`, `schedule`, `take`, `onEvent`, `race`, `all`, `memo`, `variable`, `abortVar`, `throwAbort`, `log`, `settled`, `suspense`, `reatomLens`, `reatomObservable`, `ifChanged`, `getCalls`, `deatomize`, `effect`, `reatomTransaction`, `withRollback`, `withTransaction`, `withSuspense`, `withSuspenseInit`, `withSuspenseRetry`) |
| `@reatom/react` | React adapter: `reatomComponent`, `bindField` |
| `@reatom/preact` | Preact adapter |
| `@reatom/vue` | Vue adapter |
| `@reatom/solid-js` | Solid adapter |
| `@reatom/lit` | Lit adapter |
| `@reatom/jsx` | Native JSX runtime (no VDOM) with zero re-renders, direct DOM updates, and built-in CSS-in-JS. An alternative to `@reatom/react` for framework-less apps. |
| `@reatom/devtools` | DevTools for debugging |
| `@reatom/zod` | Zod v4 integration |
| `@reatom/eslint-plugin` | ESLint rules |
| `@reatom/admin` | Admin dashboard |

### Reatom Reusables

Reatom provides a `shadcn`-like code delivery system via `jsrepo` at [github.com/reatom/reusables](https://github.com/reatom/reusables). Use it to copy-paste abstract, pre-built Reatom components and hooks directly into your project.

### Deprecated v1-v3 Packages (DO NOT USE)

The following packages are from the v1-v3 ecosystem and are **deprecated**. Their functionality has been merged into `@reatom/core` in v1000+. **Never use these:**

- `@reatom/hooks` — use `withChangeHook`, `withConnectHook` from core
- `@reatom/async` — use `withAsync`, `withAsyncData` from core
- `@reatom/persist` / `@reatom/persist-*` — use `withLocalStorage`, `withIndexedDb`, etc. from core
- `@reatom/form` — use `reatomForm` from core
- `@reatom/url` — use `reatomRoute` from core
- `@reatom/timer` — use `wrap(sleep())` or `withAsyncData` polling
- `@reatom/lens` — use `reatomLens` or `withComputed` from core
- `@reatom/undo` — use `withRollback` from core
- `@reatom/primitives` — use `reatomBoolean`, `reatomNumber`, etc. from core
- `@reatom/npm-react` / `@reatom/npm-vue` etc. — use `@reatom/react`, `@reatom/vue`
