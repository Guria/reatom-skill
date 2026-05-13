# Sampling & Events Reference

> Sources: [`packages/core/src/methods`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/methods) and [`packages/core/src/web/onEvent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/onEvent.ts). Per-API source links inline below.

Sampling is a core Reatom pattern: reading state and awaiting events procedurally inside async actions. It replaces debounce/throttle libraries and RxJS-style operators with native async/await.

## Debounce with wrap(sleep())

[`wrap` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/wrap.ts) · [`sleep` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/setTimeout.ts) · [`withAbort` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/extensions/withAbort.ts)


Instead of lodash `debounce`, use `wrap(sleep())` inside an action with `withAbort()`. The abort extension cancels previous executions automatically.

```typescript
import { action, wrap, sleep, withAbort } from '@reatom/core'

// ❌ Traditional debounce
import { debounce } from 'lodash'
const debouncedSearch = debounce((query) => fetchResults(query), 500)
input.addEventListener('input', (e) => debouncedSearch(e.target.value))

// ✅ Reatom — native async/await, auto-cancellation
const handleSearch = action(async (event: Event) => {
  const query = (event.target as HTMLInputElement).value
  await wrap(sleep(500))           // debounce delay
  await wrap(fetchResults(query))  // auto-cancelled if new call arrives
}).extend(withAbort())

input.addEventListener('input', handleSearch)
```

Conditional debounce — no separate functions needed:

```typescript
const handleSearch = action(async (event: Event) => {
  const query = (event.target as HTMLInputElement).value
  if (query.length > 3) {
    await wrap(sleep(500))  // debounce only for long queries
  }
  await wrap(fetchResults(query))
}).extend(withAbort())
```

## Throttle with withAbort('first-in-win')

Use `'first-in-win'` strategy to process the first call and ignore subsequent ones during the delay:

```typescript
import { action, wrap, sleep, withAbort } from '@reatom/core'

const handleResize = action(async () => {
  const width = window.innerWidth
  const height = window.innerHeight
  const newLayout = recalculateLayout(width, height)
  await wrap(updateDOM(newLayout))
  await wrap(sleep(100))  // throttle — ignore events during delay
}).extend(withAbort('first-in-win'))

window.addEventListener('resize', handleResize)
```

`'first-in-win'` ensures:
1. First resize event processes immediately
2. Subsequent events during delay are ignored
3. After delay, next execution can begin

## take — await the next state change or action call

[Source: `methods/take.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/take.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/take.test.ts)


`take` lets you `await` the next update of an atom or the next call of an action. Always use `wrap(take(target))`.

```typescript
import { atom, action, take, wrap, throwAbort } from '@reatom/core'

const formIsValid = atom(false, 'formIsValid')

const submitForm = action(async () => {
  if (!formIsValid()) {
    // Wait until formIsValid becomes true
    // throwAbort() rejects the take if the action is aborted while waiting
    await wrap(take(formIsValid, (isValid) => isValid || throwAbort()))
  }
  await wrap(fetch('/api/submit', { method: 'POST' }))
}, 'submitForm')
```

The second argument is a filter function: the promise resolves only when the filter returns a truthy value.

### Awaiting action calls

```typescript
import { action, take, wrap } from '@reatom/core'

const confirmAction = action(() => {}, 'confirm')

const deleteItem = action(async (itemId: string) => {
  showConfirmDialog()
  await wrap(take(confirmAction))  // wait for user confirmation
  await wrap(fetch(`/api/items/${itemId}`, { method: 'DELETE' }))
}, 'deleteItem')
```

### Subscribing to action calls

Actions are observable reactive events. The subscription callback shape changed in **v1001**.

```typescript
// v1001+
increment.subscribe((payload, params) => {
  console.log('Call:', { payload, params })
})

increment()
increment(5)
// Effect queue: callback receives (payload, params) for each call
```

```typescript
// v1000.x
increment.subscribe((calls) => {
  console.log('Calls:', ...calls)
})
// Often called initially with [] and then with call-history arrays:
// [{ params: [], payload: 11 }, { params: [5], payload: 16 }]
```

When writing version-agnostic guidance, prefer `take(action)` or `withCallHook` unless direct subscription is required; if using `.subscribe`, match the installed Reatom version.

## onEvent — await DOM/external events

[Source: `web/onEvent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/onEvent.ts)


`onEvent` lets you await events from DOM elements, WebSockets, or any EventTarget. Respects Reatom's abort context for proper cleanup.

```typescript
import { action, wrap, onEvent, withAbort } from '@reatom/core'

const confirmDelete = action(async (itemId: string) => {
  const dialog = document.getElementById('confirmDialog') as HTMLDialogElement
  dialog.showModal()

  await wrap(onEvent(dialog, 'close'))

  if (dialog.returnValue === 'confirm') {
    await wrap(fetch(`/api/items/${itemId}`, { method: 'DELETE' }))
  }
}, 'confirmDelete').extend(withAbort())
```

### Checkpoint pattern — listen before long operations

Start listening for an event _before_ a long-running operation, so the event isn't missed if it fires during the operation:

```typescript
const processPayment = action(async (orderId: string, amount: number) => {
  // Start listening BEFORE initiating the charge
  const webhookPromise = onEvent(paymentEvents, 'payment.completed')

  await wrap(
    fetch('/api/payments/charge', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount }),
    }),
  )

  // Webhook may have arrived during the charge — we won't miss it
  const confirmation = await wrap(webhookPromise)
  await wrap(fulfillOrder(orderId, confirmation.data.transactionId))
}, 'processPayment').extend(withAbort())
```

## race — first wins, others abort

Implemented inside [`methods/wrap.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/wrap.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/wrap.test.ts)


`race` resolves with the first promise to settle and automatically aborts all others.

```typescript
import { action, wrap, race, take, sleep, withAbort } from '@reatom/core'

// Timeout pattern
const result = await wrap(
  race({
    success: take(formSubmitSuccess, (v) => v === true),
    cancel: take(cancelRequested, (v) => v === true),
    timeout: sleep(5000),
  }),
)

if (result.success) { /* handle success */ }
else if (result.cancel) { /* handle cancel */ }
else if (result.timeout) { /* handle timeout */ }
```

### race with abortVar.createAndRun — concurrent providers

```typescript
import { action, wrap, race, abortVar, withAbort } from '@reatom/core'

const translate = action(async (text: string, targetLang: string) => {
  const googlePromise = abortVar.createAndRun(translateWithGoogle, text, targetLang)
  const deeplPromise = abortVar.createAndRun(translateWithDeepL, text, targetLang)

  // First translation wins; the slower service is aborted
  const result = await wrap(race(googlePromise, deeplPromise))
  return result
}, 'translate').extend(withAbort('finally'))
```

Key APIs:
- `abortVar.createAndRun(fn, ...args)` — wraps a function into a `ControlledPromise` with an attached `AbortController`
- `race(...)` — resolves with first settler, aborts others with reason `"race"`
- `'finally'` strategy — when action completes, all inner async operations are aborted (prevents resource leaks)

## all — wait for multiple events

Implemented inside [`methods/wrap.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/wrap.ts)


```typescript
import { action, wrap, all, take } from '@reatom/core'

const [userProfile, userPreferences] = await wrap(
  all([
    take(profileLoadedAtom, (profile) => profile !== null),
    take(preferencesLoadedAtom, (prefs) => prefs !== null),
  ]),
)
// Both loaded — proceed
```

## variable — custom async context

[Source: `methods/variable.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/variable.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/variable.test.ts)


`variable()` emulates TC39 `AsyncContext.Variable`. Create shared data accessible across async boundaries without passing it through every function.

```typescript
import { variable, wrap } from '@reatom/core'

const requestIdVar = variable<string>()

const fetchData = async () => {
  const requestId = requestIdVar.get()  // access from async context
  const res = await wrap(fetch('/api/data', {
    headers: { 'X-Request-Id': requestId },
  }))
  return wrap(res.json())
}

// Set context for the chain
await requestIdVar.run('req-123', async () => {
  await wrap(fetchData())  // requestIdVar.get() returns 'req-123'
})
```

## abortVar — built-in abort context

[Source: `methods/abortVar.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/abortVar.ts)


Reatom has a built-in `abortVar` which is automatically tracked by all `wrap` calls. Actions with `withAbort()` automatically manage it.

```typescript
import { abortVar, wrap } from '@reatom/core'

// Manual usage (rare — prefer withAbort() on actions)
let prevAbort = new AbortController()
export const event = async () => {
  prevAbort.abort('concurrent')
  prevAbort = new AbortController()
  await abortVar.run(prevAbort, async () => {
    const a = await wrap(getA())
    const b = await wrap(getB(a))
    setState(b)
  })
}
```

## When to use what

| Pattern | Use when |
|---|---|
| `wrap(sleep(ms))` + `withAbort()` | Debounce — delay then execute, cancel stale |
| `wrap(sleep(ms))` + `withAbort('first-in-win')` | Throttle — execute first, ignore during delay |
| `take(atom, filter)` | Wait for specific state change |
| `take(action)` | Wait for action to be called |
| `onEvent(target, event)` | Wait for DOM/external event |
| `race({...})` | First of multiple events/promises wins |
| `all([...])` | Wait for all events/promises |
| `abortVar.createAndRun(fn)` | Create cancellable concurrent task |
| `variable()` | Custom async context variable |
