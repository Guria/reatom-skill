# React Reference

## reatomComponent

Wrap any React component that reads atom values with `reatomComponent`. This establishes a reactive subscription boundary — the component re-renders when read atoms change.

```tsx
import { reatomComponent } from '@reatom/react'

const Counter = reatomComponent(() => {
  return <div>{counter()}</div>
})
```

Components that call atom getters must be wrapped with `reatomComponent`; this applies to extracted child/row components as well as page-level components.

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

## React-specific rules

- Do not use React `useEffect`/`useState` to synchronize or mutate Reatom model state. Put state transitions in atoms, actions, computeds, or Reatom hooks/extensions; React should render and bind atoms, not own Reatom invariants.
- Components that call atom getters must be wrapped with `reatomComponent`; this applies to extracted child/row components as well as page-level components.
- **Passing atoms as props is perfectly valid** — unlike Redux where passing state to children is sometimes discouraged, Reatom atoms are first-class primitives. Passing them as props (e.g., `<CheckboxField field={form.fields.rememberMe} />`) is the standard way to build abstract, reusable components and avoid prop drilling of values.

## StrictMode caveat

**`@reatom/react` does NOT support React StrictMode yet** — in development, StrictMode double-mounts components, which breaks Reatom's abort controller and implicit stack mechanism. This causes `AbortError: Component unmount` or actions executing twice on first click ([`reatomAbstractRender.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/core/src/reatomAbstractRender.ts#L97), [`reatomComponent.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/react/src/reatomComponent.ts#L122)). The fix is tracked in v1001 (not yet released). **Workaround**: Disable StrictMode in dev or use `clearStack()` at app bootstrap.

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
