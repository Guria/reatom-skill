# Testing Reatom Code

> Source: [`context.reset()` docs in `core/atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts#L326-L359), [`clearStack()` / `top()` / `mock()` implementation](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts#L1298-L1389), and adapter tests that wrap test bodies in `context.start(...)` after `clearStack()` (for example [`packages/react/src/index.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/index.test.tsx)).

Use this when writing or fixing Reatom unit tests, especially when a suite mentions `clearStack()`, `context.start()`, `context.reset()`, `mock()`, or `missing async stack`.

## Table of contents

- [Prefer the reusable test harness](#prefer-the-reusable-test-harness)
- [Choose the context style](#choose-the-context-style)
- [Default/global-context tests](#defaultglobal-context-tests)
- [Strict `clearStack()` tests](#strict-clearstack-tests)
- [`mock()` usage](#mock-usage)
- [Checklist](#checklist)

## Prefer the reusable test harness

For new app test setup, prefer the Reatom reusables `test` utility instead of hand-writing a local harness. Add it with `npx jsrepo add test` from the [`reatom/reusables` registry](../meta/reusables.md), then import testing helpers from the generated module/path your project config maps (many Reatom packages alias it as `test`). The reusable calls `clearStack()` once and wraps each test callback in `context.start(...)`, so test bodies can read/write atoms without repeating boilerplate.

```ts
import { expect, subscribe, test } from 'test'
import { atom } from '@reatom/core'

const counter = atom(0, 'counter')

test('counter increments', () => {
  const sub = subscribe(counter)

  counter.set(1)

  expect(counter()).toBe(1)
  expect(sub).toHaveBeenLastCalledWith(1)
  sub.unsubscribe()
})
```

Use the manual patterns below when you are documenting core behavior, working in a repo that has not vendored the reusable yet, or matching an existing suite that deliberately uses a different setup.

## Choose the context style

Reatom pushes a default global context when `@reatom/core` is imported. In that default mode, atom reads/writes in tests work directly and `context.reset()` clears accumulated state between tests.

`clearStack()` removes that default frame. It is useful for strict apps because it catches atom work that happens outside an explicit frame, but it also means test bodies must run inside `context.start(...)` (or a project helper such as the reusable `test` wrapper). Otherwise the first atom read/write throws `ReatomError: missing async stack`.

When editing an existing suite, match its style rather than changing the whole test environment.

## Default/global-context tests

This is the simple pattern documented in the core source comments:

```ts
import { beforeEach, expect, test } from 'vitest'
import { context, mock } from '@reatom/core'
import { counter, doubled } from './counter.model'

beforeEach(() => {
  context.reset()
})

test('counter increments', () => {
  counter.set(5)
  expect(doubled()).toBe(10)
})
```

Use this for libraries/apps that do not call `clearStack()` in tests.

## Strict `clearStack()` tests

If the suite calls `clearStack()`, wrap each test body in a frame:

```ts
import { beforeEach, expect, test } from 'vitest'
import { clearStack, context } from '@reatom/core'
import { counter, doubled } from './counter.model'

clearStack()

beforeEach(() => {
  context.reset()
})

test('counter increments', () =>
  context.start(() => {
    counter.set(5)
    expect(doubled()).toBe(10)
  }),
)
```

For async tests, return/await the `context.start(async () => { ... })` promise and keep Reatom-touching timers, event callbacks, and promise continuations wrapped with `wrap()` when they cross host boundaries.

Two strict-test traps often appear together:

- `context.reset()` also needs an active frame after `clearStack()`, so call it inside `context.start(...)` (or use a reusable helper that already does this) instead of in a bare `beforeEach`.
- `await` exits the active frame. If the next step reads/writes atoms, either pre-import the module synchronously before entering the frame or `wrap(...)` the continuation after the `await`.

If a strict test tries `context.start(async () => { await import(...); atom.set(...) })` and then throws `missing async stack`, the fix is usually the combination above rather than removing strict setup.

## `mock()` usage

`mock(target, cb)` reads the active frame via `top()`, so call it inside an active context. Always restore it with the unsubscribe it returns:

```ts
test('uses mocked value', () =>
  context.start(() => {
    const unmock = mock(userAtom, () => ({ id: 'test', name: 'Test User' }))
    try {
      expect(userName()).toBe('Test User')
    } finally {
      unmock()
    }
  }),
)
```

## Checklist

- Do not combine `clearStack()` with bare atom reads/writes in tests.
- Prefer `context.reset()` for cleanup in default-context suites.
- Use `context.start(...)` or a reusable test helper for strict suites.
- Keep mocks scoped to a test and unsubscribe in `finally` / cleanup.
- If tests fail with `missing async stack`, find the host callback or async continuation that touches atoms and wrap it, rather than removing strict setup blindly.
