# React Reference

## Sources

Package: [`packages/react`](https://github.com/reatom/reatom/tree/v1001/packages/react)

| API | Source | Tests |
|---|---|---|
| `reatomComponent` | [`reatomComponent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.ts) | [`reatomComponent.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.test.tsx) |
| `useAtom`, `useAction`, `useWrap`, `useUpdate` | [`hooks.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/hooks.ts) | [`hooks.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/hooks.test.tsx) |
| `bindField` | [`bindField.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/bindField.ts) | — |
| StrictMode behavior | [`reatomStrictMode.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomStrictMode.test.tsx) | — |

## reatomComponent

Wrap any React component that reads atom values with `reatomComponent`. This establishes a reactive subscription boundary — the component re-renders when read atoms change.

```tsx
import { reatomComponent } from '@reatom/react'

const Counter = reatomComponent(() => {
  return <div>{counter()}</div>
})
```

Components that call atom getters must be wrapped with `reatomComponent`; this applies to extracted child/row components as well as page-level components.

**v1001+ appeared:** `reatomComponent` accepts `{ abortOnUnmount?: boolean }` and defaults it to `false`. Set `abortOnUnmount: true` only to restore v1000-style abort-on-unmount behavior.

```tsx
const LegacyUnmountAbort = reatomComponent(
  () => <div>{counter()}</div>,
  { name: 'LegacyUnmountAbort', abortOnUnmount: true },
)
```

## bindField

`bindField` creates `value`/`onChange`/`onFocus`/`onBlur` props for form field atoms. Works with `<input>` and `<textarea>`, but **NOT** with `<select>`.

```tsx
import { reatomComponent, bindField } from '@reatom/react'

const MyForm = reatomComponent(() => {
  return (
    <form>
      <input type="text" {...bindField(form.fields.name)} />
      <input type="email" {...bindField(form.fields.email)} />

      {/* ⚠️ bindField does NOT work with <select> — handle manually: */}
      <select
        value={form.fields.role.value()}
        onChange={(e) => form.fields.role.set(e.target.value as Role)}
      >
        <option value="admin">Admin</option>
        <option value="editor">Editor</option>
        <option value="viewer">Viewer</option>
      </select>
    </form>
  )
})
```

## useAtom and useAction

`@reatom/react` exports `useAtom` and `useAction` as hook-based alternatives to `reatomComponent`. They use `useSyncExternalStore` internally and manage their own subscriptions, so the component does **not** need `reatomComponent`.

### useAtom

```tsx
import { useAtom, useAction } from '@reatom/react'

// Pass an atom directly — returns [state, setter, atom, frame]
const [count, setCount] = useAtom(counterAtom)

// Pass a computed callback — subscribes to the derived value
const [doubled] = useAtom(() => counter() * 2, [counter])

// Pass an initial value — creates a local atom scoped to the component
const [value, setValue] = useAtom(0)
```

`useAtom` also accepts an optional `options` argument for `name` and `subscribe` (pass `{ subscribe: false }` to read without subscribing).

### useAction

```tsx
import { useAction } from '@reatom/react'

// Bind an existing action
const handleIncrement = useAction(incrementAction)

// Inline function (deps array for recreation)
const handleSave = useAction(() => saveForm(form()), [form])
```

### `useAtom` / `useAction` vs `reatomComponent`

`reatomComponent` wraps the entire component in a reactive boundary — any atom getter called inside automatically subscribes. `useAtom` / `useAction` are more granular: each hook manages its own subscription via `useSyncExternalStore`, and the component stays a plain React function component.

Both are valid. `reatomComponent` is more concise when reading many atoms; `useAtom` hooks give more control and may feel more natural in codebases that prefer explicit hook-style composition. Check existing components to see which pattern the project already uses and follow it. If there's no clear pattern, ask the user and offer to persist the preference in `AGENTS.md` or `CLAUDE.md`.

## React-specific rules

### React is only the view adapter

In a Reatom app, React should render and bind atoms; it should not own model invariants. Treat React-owned state/effects as a **red flag** whenever they hold domain state, mirror atom values, trigger Reatom side effects, coordinate navigation/data loading, or decide app lifecycle. Those responsibilities belong in atoms, actions, computeds, route loaders, and Reatom lifecycle extensions.

React built-in hooks are fine for isolated view/DOM integration: refs, focus, measurement, portals, media-query/read-only browser data, third-party UI-library hooks, memoizing expensive view calculations, stable DOM callbacks, or ephemeral widget state that does not affect application behavior. This warning is about React owning or synchronizing application state; it is not a ban on `@reatom/react` adapter APIs such as `reatomComponent`, `useAtom`, or `useWrap` when a codebase intentionally uses hook-style integration.

- Do not use React `useEffect`/`useState` to synchronize or mutate Reatom model state. Put state transitions in atoms, actions, computeds, or Reatom hooks/extensions.
- Components that call atom getters must be wrapped with `reatomComponent`; this applies to extracted child/row components as well as page-level components.
- **Passing atoms as props is perfectly valid** — unlike Redux where passing state to children is sometimes discouraged, Reatom atoms are first-class primitives. Passing them as props (e.g., `<CheckboxField field={form.fields.rememberMe} />`) is the standard way to build abstract, reusable components and avoid prop drilling of values.

## Initial render and instant async completion

`reatomComponent` establishes its React subscription after the component is committed. That is normally fine for network requests and other real async work, but there is a subtle edge case: an async computed extended with `withAsyncData` may resolve in the same microtask as the first render when it has a cached/no-op branch (for example, “no token, return null”). A component that gates rendering only on `.ready()` can render a loading branch, miss the immediate settle notification, and remain stuck until some unrelated atom changes.

Conceptual guidance:

- Do not use an instantly resolving async atom's `.ready()` as the only source of truth for first-render app bootstrapping/auth inside React components.
- Gate initial branching from synchronous state when possible: persisted token atoms, URL/route state, static config, explicit initialized atoms, or route params.
- Use async `.data()`/`.ready()` for data that has a real async boundary (network, IndexedDB, timers) or after a component is already mounted and subscribed.
- Avoid “fixing” this with React `useEffect`/`useState`; that mixes runtimes. Prefer changing the Reatom model so the first branch has a synchronous source of truth or an explicit initialization atom.

## StrictMode caveat

StrictMode behavior is version-sensitive:

- **v1000**: StrictMode double-mount can break the abort controller / implicit stack and cause `AbortError: Component unmount` or actions executing twice on first click. Workaround: disable StrictMode in dev or use `clearStack()` at app bootstrap.
- **v1001+**: `reatomComponent` defaults `abortOnUnmount` to `false`, which avoids the old abort-on-unmount default and improves remount/StrictMode behavior. If code relied on unmount aborting async work, pass `{ abortOnUnmount: true }` explicitly.

## TypeScript gotchas

- **`FieldAtom` has no `.render()` method** — use `bindField(field)` from `@reatom/react` instead
- **`FormAtom` doesn't match `Record<string, ...>`** — it has a `.fields` property, not indexable values. Use `interface HasFields { fields: Record<string, { value: () => unknown }> }`
- **`Action` type from `@reatom/core` doesn't include `.status()`** — `.status()` is added by `withAsync` extension. Define your own interface: `interface ActionWithStatus { status: () => { isPending: boolean }; (...args: unknown[]): unknown }`
- **`ReatomForm` is not exported from `@reatom/core`** — define an inline interface instead
- **Calling the same atom getter twice breaks TypeScript narrowing** — capture in a variable first:
  ```tsx
  // ❌ Wrong — TS2532: Object is possibly 'undefined'
  {submit.error() && <div>{submit.error().message}</div>}
  // ✅ Correct
  const error = submit.error()
  {error && <div>{error.message}</div>}
  ```
- **`JSX.Element` namespace may not be available** — use `React.ReactNode` instead
