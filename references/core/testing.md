# Testing Reatom Code

> Source: [`context.reset()` docs in `core/atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts#L326-L359), [`clearStack()` / `top()` / `mock()` implementation](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts#L1298-L1389), and adapter tests that wrap test bodies in `context.start(...)` after `clearStack()` (for example [`packages/react/src/index.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/index.test.tsx)).

Use this when writing or fixing Reatom unit tests, especially when a suite mentions `clearStack()`, `context.start()`, `context.reset()`, `mock()`, or `missing async stack`.

## Table of contents

- [Choose the context style](#choose-the-context-style)
- [Default/global-context tests](#defaultglobal-context-tests)
- [Strict `clearStack()` tests](#strict-clearstack-tests)
- [`mock()` usage](#mock-usage)
- [Checklist](#checklist)

## Choose the context style

Reatom pushes a default global context when `@reatom/core` is imported. In that default mode, atom reads/writes in tests work directly and `context.reset()` clears accumulated state between tests.

`clearStack()` removes that default frame. It is useful for strict apps because it catches atom work that happens outside an explicit frame, but it also means test bodies must run inside `context.start(...)` (or a project helper that does so). Otherwise the first atom read/write throws `ReatomError: missing async stack`.

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
