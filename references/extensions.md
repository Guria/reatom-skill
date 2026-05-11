# Extensions Reference

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

```typescript
import { atom, withChangeHook } from '@reatom/core'

const name = atom('John', 'name').extend(
  withChangeHook((next) => api.updateName(next))
)
```

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

## withSuspense — Suspense integration

```typescript
import { computed, withAsyncData, withSuspense, wrap } from '@reatom/core'

const data = computed(async () => {
  return await wrap(api.getData())
}, 'data').extend(withAsyncData()).extend(withSuspense())

// In a Suspense boundary:
// data.suspended() throws the promise
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
- Accepts an optional `queue` parameter (`'effect'` by default)
- Respects `wrap` and `abortVar` policies — aborted operations don't trigger `.catch()`
- Use `.finally()` for cleanup (resources, loading states, etc.)

Source: [`framePromise.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd8793cd4b00d24311cbc3ef2/packages/core/src/methods/framePromise.ts#L1-L80)
