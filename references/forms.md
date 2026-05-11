# Forms Reference

Forms accept any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library for validation — Zod, Valibot, ArkType, etc. Examples below use Zod, but any Standard Schema works identically via the `schema` option. **Check the target codebase's `package.json` to see which validation library is already in use and prefer that one.**

## Basic form

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

- `validation().errors` is `FieldSetFieldError[]` — each has `.field` and `.message`
- `submit.error` is an **ATOM** — call it: `submit.error()` not `submit.error`
- `fields.name.value()` — get the current value
- `fields.name.set(value)` — set the value
- `bindField` does NOT work with `<select>` — handle `value`/`onChange` manually
- `form()` is the field set atom (returns values), not `form.getValues()`
- `form.reset()` resets to initial values, not to empty state
- `form.init({ ... })` updates initial values (affects reset)
- **Forms in loaders, not models** — never define `reatomForm` at module scope. Create forms inside route loaders for automatic lifecycle management.
- **Don't use `ifChanged` on atoms** — `ifChanged` is not available on atoms. Read atom values directly in loaders or use `computed` for derived state.
- **Validation error `.field` is the atom reference, not a name string** — compare by reference: `e.field === form.fields.email`
