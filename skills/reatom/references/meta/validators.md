# Validator choices for Standard Schema

> Source anchors:
>
> - Reatom form support: [`packages/core/src/form/reatomForm.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomForm.ts)
> - Reatom route validation/types: [`packages/core/src/routing/route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts)
> - Reatom v1001 notes on codecs: [`references/meta/v1001.md`](v1001.md)
> - Valibot migration guide: <https://valibot.dev/guides/migrate-from-zod/>
>
> Read this when choosing a Standard Schema validator for forms, routes, or other schema-backed surfaces, or when translating an existing schema example into the current project preference.

## Repo policy

- Preserve the validator already used by the target codebase.
- If there is **no existing validator preference**, default to **Valibot**.
- Use Zod when the project already uses it, when the user explicitly asks for it, or when the surrounding examples are already written in Zod.
- Use ArkType when the project already uses it or when the user explicitly prefers its DSL.

This file is about **choosing examples and defaults**, not about claiming that Reatom itself requires one validator over another. Reatom accepts Standard Schema-compatible validators generically.

## Comparison table

| Library | Default status here | API feel | Good fit | Migration / notes |
|---|---|---|---|---|
| **Valibot** | Default for new choices | Functional, modular helpers (`v.object`, `v.pipe(...)`) | New forms/routes when the repo has no prior validator choice | Simple Zod-shaped examples often translate directly by swapping imports and moving chained refinements into `v.pipe(...)` |
| **Zod** | Keep when already present | Chainable schema API (`z.string().email()`) | Existing Zod codebases, Zod-first examples, or explicit Zod requests | Reatom examples/source already include plenty of Zod usage, so it remains a normal supported choice |
| **ArkType** | Opt-in / existing-project choice | DSL-style schema definitions (`type({ email: 'string.email' })`) | Projects that already standardized on ArkType or prefer its compact syntax | Syntax differs more from Zod/Valibot, so prefer it when the codebase already chose it rather than as a surprise default |

## Usage snippets

Use the same mental model in Reatom everywhere: define a schema once, then pass it to the form/route/persistence API.

### Valibot

```ts
import * as v from 'valibot'

export const loginSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  password: v.pipe(v.string(), v.minLength(8)),
})
```

### Zod

```ts
import { z } from 'zod/v4'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
```

### ArkType

```ts
import { type } from 'arktype'

export const loginSchema = type({
  email: 'string.email',
  password: 'string>=8',
})
```

### Passing the schema into Reatom

```ts
import { reatomForm } from '@reatom/core'
import { loginSchema } from './validation'

export const loginForm = reatomForm(
  { email: '', password: '' },
  {
    name: 'loginForm',
    validateOnBlur: true,
    schema: loginSchema,
  },
)
```

## Valibot migration notes for Zod-shaped examples

When an example currently looks Zod-first but the target project has no validator preference yet, the usual Valibot translation is:

1. replace the import
2. replace `z.` calls with `v.` calls
3. convert chained string/object refinements into `v.pipe(...)` steps when needed
4. keep the surrounding Reatom usage the same — only the schema value changes

Example:

```ts
// Zod
z.object({ email: z.string().email() })

// Valibot
v.object({ email: v.pipe(v.string(), v.email()) })
```

Keep the migration advice small and local. Do not turn a validator choice into a broad rewrite unless the user actually asked for migration.
