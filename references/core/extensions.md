# Extensions Reference

## Sources

All extensions live in [`packages/core/src/extensions`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/extensions) and async helpers in [`packages/core/src/async`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/async).

| Extension | Source | Tests |
|---|---|---|
| `withAsyncData` | [`async/withAsyncData.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncData.ts) | [`withAsyncData.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncData.test.ts) |
| `withAsync` | [`async/withAsync.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsync.ts) | [`withAsync.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsync.test.ts) |
| `withAsyncStatus` | [`async/withAsyncStatus.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncStatus.ts) | [`withAsyncStatus.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncStatus.test.ts) |
| `withAbort` | [`extensions/withAbort.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withAbort.ts) | [`withAbort.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withAbort.test.ts) |
| `withChangeHook` | [`extensions/withChangeHook.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withChangeHook.ts) | [`withChangeHook.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withChangeHook.test.ts) |
| `withConnectHook` | [`extensions/withConnectHook.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withConnectHook.ts) | [`withConnectHook.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withConnectHook.test.ts) |
| `withComputed` | [`extensions/withComputed.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withComputed.ts) | [`withComputed.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withComputed.test.ts) |
| `withSuspense` | [`extensions/withSuspense.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withSuspense.ts) | [`withSuspense.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withSuspense.test.ts) |
| `withInit` | [`extensions/withInit.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withInit.ts) | [`withInit.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withInit.test.ts) |
| `withMemo` | [`extensions/withMemo.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withMemo.ts) | [`withMemo.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withMemo.test.ts) |
| `withTransaction` / rollback | [`methods/transaction.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/transaction.ts) | [`transaction.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/transaction.test.ts) |
| `framePromise` | [`methods/framePromise.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/framePromise.ts) | [`framePromise.test.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/framePromise.test.ts) |

## Contents

- [withAsyncData — async data fetching (recommended pattern)](#withasyncdata--async-data-fetching-recommended-pattern)
- [withAbort — race condition prevention](#withabort--race-condition-prevention)
- [withChangeHook — react to state changes](#withchangehook--react-to-state-changes)
- [withConnectHook — lazy-start on first subscriber](#withconnecthook--lazy-start-on-first-subscriber)
- [withComputed — writable computed](#withcomputed--writable-computed)
- [withAsync — async mutations](#withasync--async-mutations)
- [Rich async status for high-quality UX](#rich-async-status-for-high-quality-ux)
- [Suspense — global state initialization](#suspense--global-state-initialization)
- [withRollback / withTransaction — optimistic updates](#withrollback--withtransaction--optimistic-updates)
- [framePromise — Error handling without try/catch](#framepromise--error-handling-without-trycatch)

## withAsyncData — async data fetching (recommended pattern)

```typescript
import { atom, computed, withAsyncData, wrap } from '@reatom/core'

const list = computed(async () => {
  return await wrap(api.getList())
}, 'list').extend(withAsyncData({ initState: [] }))

list.data()    // fetched data (atom getter — call it!)
list.ready()   // false while loading, true when loaded
list.error()   // Error if fetch failed
list.retry()   // retry the fetch
list.reset()   // reset to initial state
```

⚠️ **Important**: `.data()`, `.ready()`, `.error()` are atom getters — **call them**.
Do NOT destructure: `const { data, ready } = list` breaks reactivity.

⚠️ **`status` is disabled by default** — both `withAsync` and `withAsyncData` disable the `status` atom unless explicitly enabled. If you access `.status()` without enabling it, you get:
```
ReatomError: status is turned off by default, you need to activate it explicitly in options
```

To enable status tracking, pass `{ status: true }` to `withAsyncData()` or `withAsync()`:

```typescript
const list = computed(async () => {
  return await wrap(api.getList())
}, 'list').extend(withAsyncData({ initState: [], status: true }))

// Now status is available:
const status = list.status()  // AsyncStatusAtom<State, InitState>
status.isPending        // true while loading
status.isFirstPending   // true only for the first call (useful for initial skeleton loading)
status.isFulfilled      // true after success
status.isRejected       // true after failure (NOT status.error!)
status.isSettled        // true when settled (success or error)
status.isEverPending    // true after at least one async operation started
status.isEverSettled    // true after at least one operation completed
status.data             // the current data value (only with withAsyncData)
status.reset()          // reset to initial state, clearing history flags
```

## withAbort — race condition prevention

```typescript
import { action, withAbort, wrap } from '@reatom/core'

const fetchUser = action(async (id: number) => {
  return await wrap(api.getUser(id))
}, 'fetchUser').extend(withAbort())

fetchUser(1)  // aborted when next call comes
fetchUser(2)  // aborted
fetchUser(3)  // wins — previous calls cancelled
```

## withChangeHook — react to state changes

Use `withChangeHook` when an atom's state is the source of truth and a stable side effect should follow its changes. The hook is attached to the source and runs in Reatom's hook phase after updates, so it fits app-lifetime bridges such as URL normalization, persistence-facing side effects, analytics, or starting/stopping a lifecycle resource from a boolean switch. For action calls, prefer `withCallHook`.

```typescript
import { atom, withChangeHook } from '@reatom/core'

const name = atom('John', 'name').extend(
  withChangeHook((next) => api.updateName(next))
)
```

Prefer this source-attached pattern over a top-level `effect()` plus a boot-time `startEffects()` function. `effect()` subscribes immediately and needs an active reactive frame after `clearStack()`; `withChangeHook` records the reaction as part of the atom model and does not require a separate activation step. If a side effect is just the result of a command and no code reads the intermediate value, call the imperative API directly from the semantic action instead of creating an atom solely to trigger a hook.

## withConnectHook — lazy-start on first subscriber

```typescript
import { computed, withAsyncData, withConnectHook, wrap } from '@reatom/core'

const data = computed(async () => {
  return await wrap(api.getData())
}, 'data').extend(
  withAsyncData(),
  withConnectHook(async (target) => {
    // auto-aborts on disconnect
    while (true) {
      await wrap(sleep(1000))
      target.retry()
    }
  })
)
```

## withComputed — writable computed

```typescript
import { atom, withComputed } from '@reatom/core'

const tabs = atom<Tab[]>([], 'tabs')
const currentTab = atom<Tab | null>(null, 'currentTab').extend(
  withComputed(() => tabs().at(-1) ?? currentTab())
)
```

## withAsync — async mutations

```typescript
import { action, withAsync, wrap } from '@reatom/core'

const submit = action(async (payload: FormData) => {
  await wrap(fetch('/api/submit', { method: 'POST', body: payload }))
}, 'submit').extend(withAsync())

submit.error()    // Error | undefined (FUNCTION call - it's an atom!)
submit.ready()    // true when not loading
submit.retry()    // retry the action
submit.onFulfill  // action completed successfully
submit.onReject   // action failed
```

To enable `.status()` tracking, pass `{ status: true }`:

```typescript
const submit = action(async (payload: FormData) => {
  await wrap(fetch('/api/submit', { method: 'POST', body: payload }))
}, 'submit').extend(withAsync({ status: true }))

// ⚠️ Call status() first to get the status object, then access properties
const status = submit.status()

// Current state flags (mutually exclusive when settled):
status.isPending        // true while loading
status.isFulfilled      // true after success
status.isRejected       // true after failure (NOT status.error!)
status.isSettled        // true when settled (success or error)

// Historical tracking flags:
status.isFirstPending   // true only for the first-ever pending state (useful for skeleton loading UI)
status.isEverPending    // true after at least one async operation started
status.isEverSettled    // true after at least one operation completed

// ⚠️ status does NOT have .error() — use submit.error() instead!
// status.error  // ❌ doesn't exist
submit.error()  // ✅ Error | undefined

// Reset clears all history flags so next call becomes "first" again:
status.reset()
```

⚠️ **Abort handling**: Aborted operations don't set `isRejected` — the status reverts to the last settled state (fulfilled/rejected) if one exists, otherwise to a "first aborted" state ([`withAsyncStatus.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/core/src/async/withAsyncStatus.ts#L66-L130)).

**Common pattern in components:**

```typescript
const MyComponent = reatomComponent(() => {
  const status = submitAction.status()  // atom getter → status object
  
  return (
    <button disabled={status.isPending}>
      {status.isPending ? 'Loading...' : 'Submit'}
    </button>
  )
})
```

## Rich async status for high-quality UX

Prefer `.status()` over a single `.ready()` check whenever the UI has more than one possible async state. The status flags are intentionally richer than “loading/not loading”:

- `isFirstPending`: initial request; show skeletons/full-page loading.
- `isPending` after data exists: background refresh; keep stale content and show a subtle inline pending indicator.
- `isFulfilled`: render the happy path with narrowed `status.data` for `withAsyncData`/route loaders.
- `isRejected`: decide between full error (no usable data yet) and inline refresh error (when stale data remains meaningful).
- `isEverPending` / `isEverSettled`: handle rare aborted or never-started edges.

For route loaders, put these branches in `route.render(self)` so TypeScript can narrow `self.loader.status().data` before it reaches the page component. Passing loaders into components spreads async policy through the view tree and often causes `any` or redundant null checks.

## Suspense — global state initialization

⚠️ **Suspense is recommended only for global states** (user data, settings, feature flags, locale) that load once at app startup. For dynamic data fetching and page-specific content, use `withAsync` / `withAsyncData` instead.

### withSuspense — React Suspense integration

Adds a `.suspended` computed atom. When read: returns value if fulfilled, throws promise if pending (for Suspense to catch), throws error if rejected.

```typescript
import { computed, wrap, withSuspense } from '@reatom/core'

const userSettings = computed(async () => {
  const response = await wrap(fetch('/api/settings'))
  return await wrap(response.json())
}, 'userSettings').extend(withSuspense())

// In React with Suspense boundary:
// userSettings.suspended() — returns settings or throws promise
```

Use `preserve: true` to keep previous data while loading (prevents UI flicker on refresh):

```typescript
const settings = computed(async () => {
  return await wrap(fetch('/api/settings').then(r => r.json()))
}, 'settings').extend(withSuspense({ preserve: true }))
```

### suspense() helper — inline suspended access

Access suspended values without manually applying `withSuspense()`:

```typescript
import { computed, wrap, suspense } from '@reatom/core'

const user = computed(async () => {
  return await wrap(fetch('/api/user').then(r => r.json()))
}, 'user')

const userName = computed(() => {
  const userData = suspense(user)  // throws promise if pending
  return userData.name
}, 'userName')
```

### withSuspenseInit — async init, sync after

For local-first architectures: async load from storage/backend at startup, then operate synchronously. Removes "async coloring" from code.

```typescript
import { atom, withSuspenseInit, withChangeHook } from '@reatom/core'

// Loads from IndexedDB at startup, sync atom after that
const todos = atom<Todo[]>([]).extend(
  withSuspenseInit(async () => {
    const cached = await indexedDB.get('todos')
    return cached ?? []
  }),
  withChangeHook((newState) => {
    indexedDB.set('todos', newState)  // auto-persist changes
  }),
)

// After init: todos() is synchronous, changes auto-persist
```

### withSuspenseRetry — retry when suspended atoms resolve

When an action reads suspended atoms, `withSuspenseRetry` automatically retries until all suspensions resolve:

```typescript
import { action, wrap, withSuspenseRetry } from '@reatom/core'

const fetchUserBooks = action(async () => {
  const { id } = userSettings()  // may throw if pending
  const response = await wrap(fetch(`/api/users/${id}/books`))
  return await wrap(response.json())
}, 'fetchUserBooks').extend(withSuspenseRetry())
```

⚠️ Be careful with non-idempotent operations — the action body may execute multiple times during retries.

### settled() — check promise state without throwing

Standalone utility (works anywhere, not Reatom-specific). Returns fallback if pending, throws if rejected, returns value if fulfilled.

```typescript
import { settled } from '@reatom/core'

const promise = fetch('/api/data').then(r => r.json())
const result = settled(promise, 'loading')  // 'loading' while pending
const maybeValue = settled(promise)          // undefined while pending
```

## withRollback / withTransaction — optimistic updates

```typescript
import { action, atom, withAsync, withRollback, withTransaction, wrap } from '@reatom/core'

const todos = atom<Todo[]>([], 'todos').extend(withRollback())

const saveTodo = action(async (todo: Todo) => {
  todos.set(items => [...items, todo])
  const result = await wrap(api.saveTodo(todo))
  return result
}, 'saveTodo').extend(withAsync(), withTransaction())

// On error: todos automatically roll back
// saveTodo.stop() commits and clears rollback queue
```

**v1001+**: `withTransaction({ shouldRollback })` filters which errors trigger rollback. v1000 rolls back on every non-abort error.

```typescript
class NetworkError extends Error {}

const status = atom<'idle' | 'saving'>('idle', 'status').extend(withRollback())

const save = action(async () => {
  status.set('saving')
  await wrap(api.save())
}, 'save').extend(
  withAsync(),
  withTransaction({
    shouldRollback: (error) => error instanceof NetworkError,
  }),
)
```

## framePromise — Error handling without try/catch

`framePromise()` returns a promise that resolves to the current frame's state (action payload or atom state). Call `.catch()` on it at the top of an async action to capture errors from all subsequent `await wrap()` calls — no try/catch needed.

```typescript
import { action, framePromise, wrap } from '@reatom/core'

// ❌ Before: verbose try/catch
export const processPayment = action(async (orderId: string) => {
  try {
    let order = await wrap(fetchOrder(orderId))
    await wrap(validateInventory(order))
    await wrap(chargeCustomer(order))
    await wrap(updateOrderStatus(order, 'completed'))
    return order
  } catch (error) {
    showErrorNotification(error)
    throw error
  }
})

// ✅ After: clean declarative error handling
export const processPayment = action(async (orderId: string) => {
  framePromise().catch((error) => showErrorNotification(error))

  let order = await wrap(fetchOrder(orderId))
  await wrap(validateInventory(order))
  await wrap(chargeCustomer(order))
  await wrap(updateOrderStatus(order, 'completed'))
  return order
})
```

**Key properties:**
- Call `framePromise()` **before** any `await` — it captures the current frame context
- The `.catch()` handler runs when any subsequent `await wrap()` throws
- **Composes into helper functions** — unlike native `using`, a helper can call `framePromise()` and it binds to the *caller's* frame:

```typescript
let withErrorLogging = () => {
  framePromise().catch((error) => logger.error(error))
}

export const processOrder = action(async (orderId: string) => {
  withErrorLogging() // helper uses the SAME action frame!
  await wrap(fetchOrder(orderId))
})
```
- **v1001+**: takes no arguments and always schedules in the `'effect'` queue. **v1000** accepted an optional queue argument; remove it when migrating.
- Respects `wrap` and `abortVar` policies — aborted operations don't trigger `.catch()`
- Use `.finally()` for cleanup (resources, loading states, etc.)

Source: [`framePromise.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd8793cd4b00d24311cbc3ef2/packages/core/src/methods/framePromise.ts#L1-L80)
