# Forms Reference

> Source: [`packages/core/src/form`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/form). React binding lives in [`packages/react/src/bindField.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/bindField.ts). Per-API source links inline below.

Forms accept any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library for validation — Zod, Valibot, ArkType, etc. Examples below use Zod, but any Standard Schema works identically via the `schema` option. **Check the target codebase's `package.json` to see which validation library is already in use and prefer that one.**

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
registerForm.submit.error      // Error | undefined (property, NOT a function!)
registerForm.validation()      // { errors: FieldSetFieldError[], triggered: boolean }
// Each FieldSetFieldError has: { field: FieldAtom, message: string, source: string }
```

## React form binding

[`bindField` source](https://github.com/reatom/reatom/blob/v1001/packages/react/src/bindField.ts)


```tsx
import { reatomComponent, bindField } from '@reatom/react'

const LoginForm = reatomComponent(() => {
  const { fields, submit, validation } = loginForm

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }}>
      <input type="email" {...bindField(fields.email)} />
      <input type="password" {...bindField(fields.password)} />
      <button type="submit" disabled={!submit.ready()}>Login</button>
      {/* ⚠️ validation().errors is FieldSetFieldError[], not strings */}
      {validation().errors.length > 0 && <div>Fix errors</div>}
      {/* ⚠️ submit.error() is a FUNCTION call (it's an atom) */}
      {submit.error() && <div>{submit.error().message}</div>}
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
submit.ready()  // true when not loading
submit.error()  // Error | undefined (FUNCTION call!)
submit.retry()  // retry last submission
```

## Form gotchas

- `validation()` on a form returns a `FieldSetValidation` with `errors: FieldSetFieldError[]`, `triggered: boolean`, and `validating`. It does not have an `.error` string property — that only exists on individual field validation (`field.validation().error`). For form-level error display, read the first element from `errors` or aggregate them.
- `submit.error` is an **ATOM** — call it: `submit.error()` not `submit.error`
- **`fields.name.value()` is the user-facing value**; `fields.name.set(value)` and `fields.name.change(value)` write it. The bare `field()` returns the underlying state, which may differ from `value` when `fromState`/`toState` transformers are used. Default to `value` and `change` in UI code.
- `bindField` does NOT work with controls whose `onChange` receives a raw value instead of a DOM event (most third-party `<Select>` and `<Combobox>` components). Wire `value`/`onChange`/`onBlur`/`onFocus` manually using `field.change(v)` / `field.focus.in()` / `field.focus.out()`. After `clearStack()` those manual handlers must be `wrap()`-ed; `bindField`'s returned handlers are pre-wrapped.
- `form()` is the field set atom (returns values), not `form.getValues()`
- `form.reset()` resets to initial values, not to empty state
- `form.init({ ... })` updates initial values (affects reset)
- **Put submit mutations on `reatomForm({ onSubmit })` and call `form.submit()`.** A separate action that does `api.save(form())` reads raw values and bypasses the form's submit validation pipeline unless it manually triggers validation. If you expose a semantic command such as `save`/`create`, make it an alias or wrapper around `form.submit()`, not a parallel raw-value submit path.
- **Only reset after submit when staying in the same form lifetime.** If a route-loader-created form successfully submits and navigation leaves that route, route lifecycle disposes the form; `form.reset()` is redundant. Use `form.reset()` after submit when the intended UX is to remain on the same form and prepare another entry, or when the user explicitly cancels/restarts within the same route.
- **Forms in loaders, not models** — never define `reatomForm` at module scope. Create forms inside route loaders for automatic lifecycle management.
- **`form.submit()` returns whatever your `onSubmit` callback returns.** This is the canonical way to chain a one-shot side-effect after a successful submit (navigate, toast, focus) without registering a live observer at module scope:
  ```typescript
  onClick={wrap(async () => {
    const saved = await wrap(form.submit())
    if (saved) detailRoute.go({ id: saved.id })
  })}
  ```
  Reach for the inline-await pattern (or the action's body, or a declaration-time hook on the source) before any module-level observer registration — those don't run under the strict `clearStack()` setup.
- **Don't use `ifChanged` on atoms** — `ifChanged` is not available on atoms. Read atom values directly in loaders or use `computed` for derived state.
- **Validation error `.field` is the atom reference, not a name string** — compare by reference: `e.field === form.fields.email`
