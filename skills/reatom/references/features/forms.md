# Forms Reference

> Source: [`packages/core/src/form`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/form). React binding lives in [`packages/react/src/bindField.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/bindField.ts). Per-API source links inline below.

Forms accept any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library for validation. Any compatible schema works through the `schema` option. **Check the target codebase's `package.json` to see which validation library is already in use and prefer that one; if there is no validator preference yet, default to Valibot unless the user explicitly asks for something else.**

## Basic form

[`reatomForm` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomForm.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomForm.test.ts)


```typescript
import { reatomForm, wrap } from '@reatom/core'
import { z } from 'zod/v4'

const registerForm = reatomForm(
  {
    email: '',
    password: '',
    confirmPassword: '',
  },
  {
    name: 'registerForm',
    validateOnBlur: true,
    schema: z.object({
      email: z.string().email(),
      password: z.string().min(8),
      confirmPassword: z.string().min(1),
    }),
    onSubmit: async (values) => {
      const res = await wrap(fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      }))
      return await wrap(res.json())
    },
  },
)

registerForm.fields.email      // FieldAtom — atom with value, focus, validation, disabled
registerForm.submit            // Action — call to submit
registerForm.submit.error()    // Error | undefined (atom getter — call it)
registerForm.validation()      // { errors: FieldSetFieldError[], triggered: boolean }
// Each FieldSetFieldError has: { field: FieldAtom, message: string, source: string }
```

## React form binding

[`bindField` source](https://github.com/reatom/reatom/blob/v1001/packages/react/src/bindField.ts)


```tsx
import { wrap } from '@reatom/core'
import { reatomComponent, bindField } from '@reatom/react'

const LoginForm = reatomComponent(() => {
  const { fields, submit, validation } = loginForm
  const error = submit.error()

  return (
    <form onSubmit={wrap((e) => { e.preventDefault(); submit() })}>
      <input type="email" {...bindField(fields.email)} />
      <input type="password" {...bindField(fields.password)} />
      <button type="submit" disabled={!submit.ready()}>Login</button>
      {/* ⚠️ form.submit uses withAsyncData() without status by default */}
      {/* Use submit.ready(), submit.pending(), and submit.error() for normal form UI */}
      {/* ⚠️ validation().errors is FieldSetFieldError[], not strings */}
      {validation().errors.length > 0 && <div>Fix errors</div>}
      {/* ⚠️ submit.error() is a FUNCTION call (it's an atom) */}
      {error && <div>{error.message}</div>}
    </form>
  )
})

// ⚠️ bindField does NOT work with <select> — handle manually:
// ⚠️ Initial value must be typed as the UNION, not a literal, to allow all options:
//   role: 'viewer' as 'admin' | 'editor' | 'viewer'  ✅
//   role: 'viewer' as const                            ❌ (locks type to literal 'viewer')
<select
  value={fields.role.value()}
  onChange={(e) => fields.role.set(e.target.value as 'admin' | 'editor' | 'viewer')}
>
  <option value="admin">Admin</option>
  <option value="editor">Editor</option>
  <option value="viewer">Viewer</option>
</select>
```

`bindField(field)` returns the field's bound `value`/`checked`, `onChange`, `onBlur`, `onFocus`, **and** `error`. Spread it directly into ordinary inputs and avoid passing a second `error` prop from `field.validation().error` unless you are intentionally overriding the bound one.

### Binding third-party UI controls

Decide the binding shape before writing a form UI. Do not mix `bindField`, ad-hoc casts, and guessed field methods in the same form just to silence types.

| Control shape | Default binding |
|---|---|
| Native-like `input` / `textarea` that passes a DOM event | `...bindField(field)` |
| Checkbox-like control with `checked` and DOM event | `...bindField(field)` if the component accepts those props unchanged |
| Select/date/UI-library control whose `onChange` receives a raw value | Manual `value={field.value()}` and `onChange={wrap((value) => field.change(value))}` |
| Component has a separate `error` prop | Prefer `bindField` only if it already maps the prop correctly; otherwise pass `field.validation().error` manually with the control's expected type |

If the first UI-library binding attempt fails, pause and classify the component shape. Do not respond by casting the whole field to `any` or rewriting unrelated form/model code. Type errors like "possibly undefined" under `noUncheckedIndexedAccess` should be solved by preserving the typed field set shape, not by search-and-replace casts that can corrupt JSX.

## Form field access patterns

[`reatomField` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomField.ts) · [`reatomFieldArray` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomFieldArray.ts) · [`reatomFieldSet` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomFieldSet.ts)


```typescript
// Field value — atom getter, call it!
const name = fields.name.value()

// Field state — the validated value
const nameState = fields.name.state()

// Setting field value
fields.name.set('new value')

// Field validation
fields.name.validation().error  // string | undefined
fields.name.validation().trigger()  // Action

// Form validation (aggregate of all fields)
validation().errors  // FieldSetFieldError[]
// Each error: { field: FieldAtom, message: string, source: string }

// Form submission
submit.ready()    // true when not loading
submit.pending()  // number of in-flight submits
submit.error()    // Error | undefined (FUNCTION call!)
submit.retry()    // retry last submission
// ⚠️ submit.status() is not available by default on reatomForm submit
```

## Submit wrapper pattern

A common route-loader shape is: the form owns validation and submit semantics, while a separate semantic action (`save`, `create`, `publish`) exists only to expose UI-friendly async helpers or a clearer intent name.

Keep that action as a thin wrapper around `form.submit()`.

```typescript
import { action, reatomForm, withAbort, withAsync, wrap } from '@reatom/core'

const form = reatomForm(
  { title: '', description: '' },
  {
    name: 'entityForm',
    validateOnBlur: true,
    schema: entitySchema,
    onSubmit: async (values) => {
      const res = await wrap(fetch('/api/entities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      }))
      return await wrap(res.json())
    },
  },
)

const save = action(async () => {
  return await wrap(form.submit())
}, 'entityForm.save').extend(withAsync(), withAbort())

onClick={wrap(async () => {
  const saved = await wrap(save())
  navigateToEntity(saved.id)
})}
```

This keeps one submit pipeline: validation runs first, `onSubmit` owns the mutation, and callers can use the resolved payload for one-shot follow-up work without inventing a parallel raw-value save path.

## Consumer-side submit hooks

When the route-specific follow-up work is small, keep the form inline in the loader and await `form.submit()` directly where the UI command happens.

When the form definition is large enough to justify moving it into a separate factory file, keep that factory focused on field state, validation, and the core mutation. Then let the consuming loader attach route-specific reactions to the created form instance.

```typescript
// forms/entityForm.ts
export const createEntityForm = (initialState: EntityDraft) =>
  reatomForm(initialState, {
    name: 'entityForm',
    schema: entitySchema,
    onSubmit: async (values) => {
      return await wrap(api.saveEntity(values))
    },
  })
```

```typescript
// route loader
import { action, withAbort, withAsync, withCallHook, wrap } from '@reatom/core'

const form = createEntityForm({ title: entity.title, description: entity.description })

form.submit.onFulfill.extend(
  withCallHook(({ payload: saved }) => {
    form.init(saved)
    refreshCurrentResource()
    navigateToEntity(saved.id)
  }),
)

form.submit.onReject.extend(
  withCallHook(() => {
    focusFirstInvalidField(form)
  }),
)

const save = action(() => wrap(form.submit()), 'entityForm.save').extend(
  withAsync(),
  withAbort(),
)
```

This keeps route knowledge out of the factory. The factory owns submit semantics; the consumer owns what should happen after success or failure in that particular route.

Prefer `withCallHook` on `form.submit.onFulfill` / `onReject` when command completion is the thing you care about. Reach for `addCallHook` only when the hook truly needs runtime attach/detach behavior.

`withChangeHook` / `addChangeHook` are for atoms, so they fit `form.submit.data`, `form.submit.error`, or an explicit status atom when changed state is the source of truth. They are usually the wrong first choice for post-submit navigation or retry logic, where action lifecycle hooks express the intent more directly.

## Form gotchas

- `validation()` on a form returns a `FieldSetValidation` with `errors: FieldSetFieldError[]`, `triggered: boolean`, and `validating`. It does not have an `.error` string property — that only exists on individual field validation (`field.validation().error`). For form-level error display, read the first element from `errors` or aggregate them.
- `submit.error` is an **ATOM** — call it: `submit.error()` not `submit.error`
- `submit.status()` is only usable when the underlying async extension was configured with `{ status: true }`. `reatomForm` submit is built with `withAsyncData(...)`, so `.status()` throws by default. For ordinary form UI, use `submit.ready()`, `submit.pending()` (count), and `submit.error()` unless you explicitly enabled status on a separate custom async action.
- **`fields.name.value()` is the user-facing value**; `fields.name.set(value)` and `fields.name.change(value)` write it. The bare `field()` returns the underlying state, which may differ from `value` when `fromState`/`toState` transformers are used. Default to `value` and `change` in UI code.
- `bindField` does NOT work with controls whose `onChange` receives a raw value instead of a DOM event. Wire `value`/`onChange`/`onBlur`/`onFocus` manually using `field.change(v)` / `field.focus.in()` / `field.focus.out()`. After `clearStack()` those manual handlers must be `wrap()`-ed; `bindField`'s returned handlers are pre-wrapped.
- `form()` is the field set atom (returns values), not `form.getValues()`
- `form.reset()` resets to initial values, not to empty state
- `form.init({ ... })` updates initial values (affects reset)
- **Put submit mutations on `reatomForm({ onSubmit })` and call `form.submit()`.** A separate action that does `api.save(form())` reads raw values and bypasses the form's submit validation pipeline unless it manually triggers validation. If you expose a semantic command such as `save`/`create`, make it an alias or wrapper around `form.submit()`, not a parallel raw-value submit path. If route-specific retry, navigation, or focus work would make `onSubmit` noisy, attach that behavior from the consuming loader via `form.submit.onFulfill` / `form.submit.onReject` hooks instead of pushing route knowledge back into the factory.
- **When the submit flow needs “validate form, then call another async Reatom action”, prefer a dedicated orchestration action over hiding that second action call in a fragile async callback path.** Good shape: a render-time wrapped UI handler calls `submitFormFlow()`, and `submitFormFlow` does `await wrap(form.submit())`, reads validated state, then `await wrap(runCommand(...))`. Use this when the second action is a reusable semantic command or wider workflow step rather than the form's own direct API call.
- **Handwritten form handlers still need `wrap()` under `clearStack()`.** `bindField` returns pre-wrapped field handlers, but a handwritten `<form onSubmit={...}>` callback is still your callback. Wrap it when it calls `form.submit()`, `field.change(...)`, or any other Reatom primitive.
- **Only reset after submit when staying in the same form lifetime.** If a route-loader-created form successfully submits and navigation leaves that route, route lifecycle disposes the form; `form.reset()` is redundant. Use `form.reset()` after submit when the intended UX is to remain on the same form and prepare another entry, or when the user explicitly cancels/restarts within the same route.
- **Forms in loaders, not models** — never define `reatomForm` at module scope. Create forms inside route loaders for automatic lifecycle management.
- **`form.submit()` returns whatever your `onSubmit` callback returns.** This is the canonical way to chain a one-shot side-effect after a successful submit (navigate, toast, focus) without registering a live observer at module scope:
  ```typescript
  onClick={wrap(async () => {
    const saved = await wrap(form.submit())
    navigateToEntity(saved.id)
  })}
  ```
  Reach for the inline-await pattern first. When the form comes from an extracted factory and the follow-up behavior belongs to the consuming route, attach it with `form.submit.onFulfill` / `form.submit.onReject` hooks on that created instance rather than adding module-level observers — those don't run under the strict `clearStack()` setup.
- **Don't use `ifChanged` on atoms** — `ifChanged` is not available on atoms. Read atom values directly in loaders or use `computed` for derived state.
- **Validation error `.field` is the atom reference, not a name string** — compare by reference: `e.field === form.fields.email`
