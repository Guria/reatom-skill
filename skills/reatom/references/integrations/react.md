# React Reference

> Source: [`packages/react`](https://github.com/reatom/reatom/tree/v1001/packages/react). Per-API source links inline below each section.

## reatomComponent

[Source: `reatomComponent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.test.tsx)


For greenfield Reatom pages, layouts, and examples, prefer `reatomComponent` as the default style unless the user or existing codebase has already chosen hook-style integration. It keeps the mental model uniform: read atoms/computeds/routes directly during render, and use `wrap(...)` for ordinary handlers inside that reactive boundary. Reach for `useAtom`/`useAction` when matching an established hook-style codebase or when you intentionally need hook-level subscription/control.

Wrap any React component that reads atom values with `reatomComponent`. Under strict setup (`clearStack()`), extend that rule to components that create Reatom callbacks during render too — for example `wrap(...)` handlers, route checks, or other render-time reads of Reatom primitives. `reatomComponent` establishes the reactive boundary the render needs, and the component re-renders when the read atoms change.

```tsx
import { reatomComponent } from '@reatom/react'

const Counter = reatomComponent(() => {
  return <div>{counter()}</div>
})
```

Components that call atom getters must be wrapped with `reatomComponent`; this applies to extracted child/row components, tiny helper components, navigation items, and root/page components alike. If a component looks "too small to matter" but it reads a Reatom primitive or calls `wrap(...)` while rendering, it still needs the wrapper.

### Practical audit rule

When editing or generating React UI under strict setup, treat this as a mechanical check:

A component should be `reatomComponent` if its render path does any of these:

- calls an atom/computed getter such as `someAtom()` or `someComputed()`;
- calls a route getter/check such as `someRoute()`, `someRoute.match()`, or `someRoute.exact()`;
- creates a wrapped callback during render, such as `onClick={wrap(...)}` or `const onSubmit = wrap(...)`;
- reads Reatom async/form helper atoms such as `.data()`, `.ready()`, `.error()`, `.pending()`, or `.status()`.

`useAtom` / `useAction` components are the main exception: those hooks establish their own subscription boundary, so the component can stay a plain React function component.

After a larger UI pass, do a quick audit of plain function components and verify each remaining one is truly Reatom-free. A simple starting grep is:

```bash
grep -rn "^function\|^const .*=(" src/ --include="*.tsx" | grep -v "reatomComponent"
```

**v1001+ appeared:** `reatomComponent` accepts `{ abortOnUnmount?: boolean }` and defaults it to `false`. Set `abortOnUnmount: true` only to restore v1000-style abort-on-unmount behavior.

```tsx
const LegacyUnmountAbort = reatomComponent(
  () => <div>{counter()}</div>,
  { name: 'LegacyUnmountAbort', abortOnUnmount: true },
)
```

### Read atoms under the provider boundary

[Source: `useFrame` in `reatomComponent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.ts)

> **Bootstrap wiring checkpoint:** before writing `main.tsx` / `App.tsx`, re-read this section and the App Setup note in `references/meta/quick-reference.md`. For greenfield strict setup, follow the same split documented there: create/export the frame in `src/setup.ts`, keep `import './setup'` first in the entrypoint, and pass that exported frame to `<reatomContext.Provider>`. If the reference is genuinely ambiguous for the installed version, validate against installed exports or local source.

Before writing the first React root/bootstrap file, verify the exact context/frame creation API from the installed `@reatom/core` / `@reatom/react` exports, the local source, or the setup quick reference. Do not invent names from memory such as `createCtx` unless you have verified they exist in the installed version. The riskiest point in a fresh app is the seam between framework root code and Reatom's frame/provider.

In the v1000+ source, `reatomContext` is `React.createContext<null | Frame>(null)` and `useFrame()` expects a `Frame`; in core source, `context.start()` creates that frame and `clearStack()` removes the implicit default stack. Do not pass the `context` atom itself to the provider when you intend to provide a frame.

`useFrame()` reads `reatomContext` and falls back to `STACK[0]`; if neither exists, it throws that the root/provider is not set. In React structure terms, this means the first component that reads atoms must render **under** `<reatomContext.Provider>` (or another established frame source). Under strict setup, avoid making the top-level wrapper both provide the frame and read atoms before the provider exists.

For greenfield strict setup, prefer this shape:

```tsx
// src/setup.ts
import { clearStack, context } from '@reatom/core'

clearStack()
export const frame = context.start()
```

```tsx
// src/main.tsx
import './setup'
import { reatomComponent, reatomContext } from '@reatom/react'
import { frame } from './setup'

function AppProviders() {
  return (
    <reatomContext.Provider value={frame}>
      <AppRoot />
    </reatomContext.Provider>
  )
}

const AppRoot = reatomComponent(() => {
  return <main>{currentRoute.exact() ? 'ready' : '...'}</main>
})
```

If the project already uses the default global context instead of strict setup, preserve that style; do not add or remove `clearStack()` casually. Avoid a top-level component that reads atoms or routes first and only later returns the provider wrapper. If the render needs Reatom state, split the file into a plain provider wrapper and an inner `reatomComponent` root.

## bindField

[Source: `bindField.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/bindField.ts)


`bindField` creates `value`/`checked`/`onChange`/`onFocus`/`onBlur`/`error` props for form field atoms. Works with `<input>` and `<textarea>`, but **NOT** with `<select>`.

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

## useAtom, useAction, and useWrap

[Source: `hooks.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/hooks.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/react/src/hooks.test.tsx) · [`useWrap` source: `reatomComponent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.ts)


`@reatom/react` exports `useAtom` and `useAction` as hook-based alternatives to `reatomComponent`. It also exports `useWrap`, a hook for creating a stable wrapped callback bound to the current Reatom frame. `useAtom` / `useAction` use `useSyncExternalStore` internally and manage their own subscriptions, so the component does **not** need `reatomComponent`.

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

A value destructured from `useAtom` is a plain React value, not an atom getter. Do not call it like `isOpen()`, `isReady()`, or `selectedEntity()`. TypeScript errors such as `Boolean has no call signatures`, `String has no call signatures`, or `Entity has no call signatures` usually mean hook-return values were mixed with direct atom-call style. Either remove the `()` or convert the file back to `reatomComponent` and read the original atoms directly.

### useAction

```tsx
import { useAction } from '@reatom/react'

// Bind an existing action
const handleIncrement = useAction(incrementAction)

// Inline function (deps array for recreation)
const handleSave = useAction(() => saveForm(form()), [form])
```

### useWrap

```tsx
import { useWrap } from '@reatom/react'

function SaveButton() {
  const onClick = useWrap(() => submit())
  return <button onClick={onClick}>Save</button>
}
```

`useWrap` is the adapter-level convenience for React callback boundaries. It reads the current frame with `useFrame()`, memoizes one stable wrapped function, and keeps the latest callback in a ref-like cell. Use it when you want both of these at once:

- the callback must re-enter Reatom correctly, and
- the callback identity should stay stable across renders.

Typical reasons to prefer `useWrap`:

- passing a handler to a memoized child,
- integrating with a third-party widget that subscribes/unsubscribes by function identity,
- avoiding unnecessary callback churn in hook-style components.

### `useAtom` / `useAction` / `useWrap` vs `reatomComponent`

`reatomComponent` wraps the entire component in a reactive boundary — any atom getter called inside automatically subscribes. `useAtom` / `useAction` are more granular: each hook manages its own subscription via `useSyncExternalStore`, and the component stays a plain React function component.

For callback wrapping, the default rule is:

- **inside `reatomComponent`, plain `wrap(...)` is often enough for ordinary event handlers**;
- **inside hook-style components, or whenever stable callback identity matters, use `useWrap(...)`**.

This distinction matters because `wrap()` captures the current frame at call time. In `reatomComponent`, render already runs inside a Reatom boundary, so creating `wrap(...)` handlers during render is normally fine. In a plain function component under strict setup, render-time `wrap(...)` can capture the wrong context; `useWrap(...)` fixes that by binding to the frame through React hooks.

Both styles are valid. `reatomComponent` is more concise when reading many atoms; hook APIs give more control and may feel more natural in codebases that prefer explicit hook-style composition. Check existing components to see which pattern the project already uses and follow it. In a greenfield example or newly generated app with no existing convention, start with `reatomComponent`; if you choose hooks, keep the entire file in hook semantics and treat hook results as plain values.

## React-specific rules

### Declare `RouteChild` for the framework once

When using routing with React (or any other framework), the `RouteChild` interface from `@reatom/core` is empty by design — it is a declaration-merge slot for the host framework. Without declaring it, `route.render()` and `self.outlet()` return values the type system can't compose with framework JSX, and props typed as `RouteChild | RouteChild[]` won't accept your elements.

Add a single `*.d.ts` file (next to the app entry) once per project:

```typescript
import type { ReactElement } from 'react'

declare module '@reatom/core' {
  interface RouteChild extends ReactElement {}
}

export {}
```

For other framework adapters substitute the renderable element type (`VNode`, `TemplateResult`, etc.).

### Wrap callbacks that cross back into Reatom

UI event handlers, timers, and any host-scheduled callback run in a fresh execution context with no active reactive frame. Under `clearStack()` the first atom read or write inside such a callback throws `missing async stack`; wrapping the callback boundary with `wrap()` re-enters the reactive system. The principle is independent of which framework or which event names are involved — it applies wherever a function leaves the current synchronous frame and is later re-invoked by the host.

```tsx
// ❌ handler runs outside any frame after the host calls it back
<Button onClick={() => count.set(c => c + 1)} />
// ✅ wrap re-enters a frame so atom writes succeed
<Button onClick={wrap(() => count.set(c => c + 1))} />
```

Adapter helpers that *produce* callbacks for you (form binders, link/navigation generators, async sampling primitives like `take`/`onEvent`) wrap internally so you don't double-wrap. Callbacks you write by hand — custom buttons, link-style anchors, `setTimeout`, `requestAnimationFrame`, observers, message-port handlers, or any UI control whose `onChange` hands you a raw value — do not. The rule of thumb: if the callback was constructed by you and reads or writes a Reatom primitive, it needs `wrap()`.

The place where you call `wrap(...)` matters too. `wrap()` captures the current Reatom frame at call time, so creating wrapped callbacks directly inside JSX is only safe when that render already runs inside a reactive boundary such as `reatomComponent`. In a plain function component, `onClick={wrap(doSomething)}` or `const handleClick = wrap(doSomething)` can fail under `clearStack()` because the `wrap(...)` call itself happens during a non-Reatom React render. Fix that by converting the component to `reatomComponent`, using `useWrap(...)`, or by pre-wrapping the callback in a reactive caller and passing the wrapped function down as a prop.

### React is only the view adapter

In a Reatom app, React should render and bind atoms; it should not own model invariants. Treat React-owned state/effects as a **red flag** whenever they hold domain state, mirror atom values, trigger Reatom side effects, coordinate navigation/data loading, or decide app lifecycle. Those responsibilities belong in atoms, actions, computeds, route loaders, and Reatom lifecycle extensions.

React built-in hooks are fine for isolated view/DOM integration: refs, focus, measurement, portals, media-query/read-only browser data, third-party UI-library hooks, memoizing expensive view calculations, stable DOM callbacks, or ephemeral widget state that does not affect application behavior. This warning is about React owning or synchronizing application state; it is not a ban on `@reatom/react` adapter APIs such as `reatomComponent`, `useAtom`, or `useWrap` when a codebase intentionally uses hook-style integration.

- Do not use React `useEffect`/`useState` to synchronize or mutate Reatom model state. Put state transitions in atoms, actions, computeds, or Reatom hooks/extensions.
- Components that read Reatom primitives during render must be wrapped with `reatomComponent`; this includes extracted child/row helpers, navigation items, and root/page components. Under `clearStack()`, treat render-time `wrap(...)` creation the same way.
- **Passing atoms as props is perfectly valid** — unlike Redux where passing state to children is sometimes discouraged, Reatom atoms are first-class primitives. Passing them as props (e.g., `<CheckboxField field={form.fields.rememberMe} />`) is the standard way to build abstract, reusable components and avoid prop drilling of values.

## Initial render and instant async completion

`reatomComponent` establishes its React subscription after the component is committed. That is normally fine for network requests and other real async work, but there is a subtle edge case: an async computed extended with `withAsyncData` may resolve in the same microtask as the first render when it has a cached/no-op branch (for example, “no token, return null”). A component that gates rendering only on `.ready()` can render a loading branch, miss the immediate settle notification, and remain stuck until some unrelated atom changes.

Conceptual guidance:

- Do not use an instantly resolving async atom's `.ready()` as the only source of truth for first-render app bootstrapping/auth inside React components.
- Gate initial branching from synchronous state when possible: persisted token atoms, URL/route state, static config, explicit initialized atoms, or route params.
- Use async `.data()`/`.ready()` for data that has a real async boundary (network, IndexedDB, timers) or after a component is already mounted and subscribed.
- Avoid “fixing” this with React `useEffect`/`useState`; that mixes runtimes. Prefer changing the Reatom model so the first branch has a synchronous source of truth or an explicit initialization atom.

## StrictMode caveat

[Test that pins behavior: `reatomStrictMode.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomStrictMode.test.tsx)


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
- **`JSX.Element` namespace may not be available** — for renderable children/slots, import `ReactNode` as a type from `react` and use that instead
