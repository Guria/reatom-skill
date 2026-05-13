# Routing Reference — Loaders

> Core routing API in [`./index.md`](./index.md). Full SPA example in [`./spa-example.md`](./spa-example.md).
>
> Source: [`routing/route.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts) (loader option), [`routing/route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts) (`RouteLoader`), [`async/withAsyncData.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncData.ts) (used internally), [`route.security.test.browser.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.security.test.browser.ts) (guards/collisions). Per-section links inline below.

## Route loaders - data fetching

[`loader` option in `route.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts) · [`RouteLoader` type in `route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts) · [`withAsyncData` (used internally)](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncData.ts)


Route loaders are async computeds with `withAsyncData` built-in. They run when route matches, auto-abort on navigation away. Nested loaders await parents and receive merged params. Effects inside loaders also auto-abort on navigation.

Loader API (same as `withAsyncData`): **route.loader.data()**, **.ready()**, **.error()**, **.retry()**, **.status()**.

Prefer handling loader state in the route `render(self)` instead of inside the page component. `status()` is a discriminated union; checking its flags in `render` lets TypeScript narrow `status.data` before you pass it to typed UI components. It also gives better UX than a single `.ready()` check:

- `isFirstPending` - first load only; use for page skeletons/full loading states.
- `isPending` with existing data - background refresh; keep stale content visible and show an inline spinner/progress affordance.
- `isFulfilled` - normal render; `status.data` is the resolved loader payload.
- `isRejected` - show a full-page error when no useful data has ever loaded, or an inline refresh error when preserving stale data is appropriate for that resource.
- `isEverPending` / `isEverSettled` - historical flags useful for rare aborted/no-data edges.

With concrete loader payloads (no `undefined` branches), TypeScript narrows `status.data` to the full loader type in `AnotherPending`. The branch order handles edge cases: `isFirstPending` covers the initial load, `isRejected` covers failures — by the time you reach `isPending && isEverSettled`, the type system confirms data exists. Only add a `status.data !== undefined` guard if the loader itself returns `undefined` in some branch.

```typescript
const userRoute = reatomRoute({
  path: 'users/:userId',
  async loader(params) {
    const user = await wrap(api.getUser(params.userId))
    return { user }
  },
  render(self) {
    const status = self.loader.status()

    if (status.isFirstPending) return <UserPageSkeleton />

    if (status.isFulfilled) {
      return <UserPage model={status.data} />
    }

    // Once a concrete page model exists, pending means background refresh.
    // Keep it visible; the type system confirms data exists for concrete loader types.
    if (status.isPending && status.isEverSettled) {
      return <UserPage model={status.data} refreshing />
    }

    if (status.isRejected) {
      return <PageError error={self.loader.error() ?? new Error('Request failed')} onRetry={self.loader.retry} />
    }

    return <></>
  },
})

const UserPage = reatomComponent(({
  model,
  refreshing,
}: {
  model: { user: User }
  refreshing?: boolean
}) => {
  return <>
    {refreshing && <InlineSpinner />}
    <h1>{model.user.name}</h1>
  </>
})
```

For list/search routes, avoid replacing the whole page on every search-param change. With a concrete loader model, `isPending` after `isEverSettled` means "refreshing" — keep previous data rendered with a subtle pending indicator. When params identify a different entity, use the parent-loader pattern below instead of preserving the previous entity model.

### Identity-changing routes, parent loader data, and clean scoped state

`status.data` deliberately keeps the last fulfilled loader payload while a new loader run is pending. That is helpful for list/search refreshes because it preserves focus and stale results, but it can briefly show the previous entity on detail/edit pages while a new `:id` loads.

For identity pages, shape the route tree around the identity: put the entity fetch in a parent layout route, then let child routes create route-specific forms/actions from the parent loader data. Nested loaders can call `await wrap(parentRoute.loader())`. Reatom starts child loaders in parallel and exposes the child result only after the parent loader settles successfully, so the child model is fresh for the current identity without a duplicate entity fetch.

```typescript
const itemRoute = itemsRoute.reatomRoute({
  path: ':itemId',
  params: z.object({ itemId: z.string().regex(/^item_/) }),
  layout: true,
  async loader({ itemId }) {
    return await wrap(api.getItem(itemId))
  },
  render(self) {
    const status = self.loader.status()

    // On identity changes, do not render the previous child's outlet while the
    // parent entity is pending. This is intentionally different from list
    // stale-while-refresh behavior.
    if (status.isFirstPending || status.isPending) return <PageSkeleton />
    if (status.isRejected) {
      return <PageError error={self.loader.error() ?? new Error('Failed to load item')} />
    }

    return <>{self.outlet()}</>
  },
})

const itemEditRoute = itemRoute.reatomRoute({
  path: 'edit',
  async loader({ itemId }) {
    const item = await wrap(itemRoute.loader())
    const form = reatomItemForm(item, `itemEdit#${itemId}.form`)

    const save = action(async () => {
      const saved = await wrap(api.saveItem(item.id, form()))
      form.init(saved)
      return saved
    }, `itemEdit#${itemId}.save`).extend(
      withAsync({ status: true }),
      withAbort(),
    )

    return { item, form, save }
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFirstPending || status.isPending) return <PageSkeleton />
    if (status.isFulfilled) return <ItemEditPage model={status.data} />
    if (status.isRejected) {
      return <PageError error={self.loader.error() ?? new Error('Failed to create edit model')} />
    }
    return <PageSkeleton />
  },
})
```

If a child page must mount before the entity request resolves, return a fresh scoped model with `null`/empty atoms and an internal `load` action or async computed. Use that as an intentional alternative for progressive UI, not as a workaround for forgetting that child loaders can reuse parent loader data.

#### Index child loaders under layout routes

A v1001 page route renders exact-by-default, but loader activation follows route matching. A child with `path: ''` under a layout route can match descendant URLs for loader purposes even though its render is exact. If that child is an index/list page with a loader, constrain it explicitly:

```typescript
const itemsIndexRoute = itemsRoute.reatomRoute({
  path: '',
  params(params) {
    const pathname = urlAtom().pathname.replace(/\/$/, '') || '/'
    return pathname === itemsRoute.path() ? params : null
  },
  async loader(params) {
    return await wrap(api.listItems(params))
  },
})
```

This keeps the index loader from running when a nested detail/edit route is active.

## Route loaders - factory pattern (forms + actions)

Loaders are plain async functions — they can return atoms, forms, actions, computed factories. See [`reatomForm`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomForm.ts) and [`computed`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts) for the building blocks used below.


Route loaders are the **single source of truth** for all route-specific state. Create forms, actions, and computed atoms **inside** the loader - they get garbage collected when the route unmounts, giving you automatic memory management with global accessibility.

### Separate routes for create vs edit

**Never** use a single route with conditional logic (`params.id === 'new'`). Use separate routes - each gets its own loader, its own form instance, and automatic cleanup on navigation. Also ensure the dynamic detail/edit route's `params` schema rejects literal siblings such as `new`; separate routes alone do not prevent `:id` from matching a literal segment.

```typescript
// ❌ Bad - single route with conditional logic
const userDetailRoute = usersRoute.reatomRoute({
  path: ':id',
  params: z.object({ id: z.string() }),
  async loader(params) {
    if (params.id === 'new') {
      return { user: null, isNew: true }
    }
    const user = await fetch(`/api/users/${params.id}`)
    return { user, isNew: false }
  },
})

// ✅ Good - separate routes
export const userCreateRoute = usersRoute.reatomRoute({
  path: 'new',
  async loader() {
    const token = authToken()
    if (!token) throw new Error('Not authenticated')

    const form = reatomForm(
      { name: '', email: '', role: 'viewer' as const, active: true },
      { name: 'userForm#create', validateOnBlur: true, schema: userSchema },
    )

    const saveUserAction = action(async () => {
      const values = form()
      const res = await wrap(fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(values),
      }))
      if (!res.ok) throw new Error('Failed to save')
      return wrap(res.json())
    }).extend(withAsync({ status: true }))

    return { form, saveUserAction, user: null, isNew: true }
  },
})

const userIdSchema = z.uuid()

export const userEditRoute = usersRoute.reatomRoute({
  path: ':id/edit',
  // Use the real ID shape here. Avoid broad z.string() when literal sibling
  // routes such as "new" or "settings" share the same parent.
  params: z.object({ id: userIdSchema }),
  async loader(params) {
    const token = authToken()
    if (!token) throw new Error('Not authenticated')

    const res = await wrap(fetch(`/api/users/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }))
    if (!res.ok) throw new Error('User not found')
    const user = await wrap(res.json())

    const form = reatomForm(
      { name: user.name, email: user.email, role: user.role, active: user.active },
      { name: `userForm#edit#${params.id}`, validateOnBlur: true, schema: userSchema },
    )

    const saveUserAction = action(async () => {
      const values = form()
      const res = await wrap(fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      }))
      if (!res.ok) throw new Error('Failed to save')
      return wrap(res.json())
    }).extend(withAsync({ status: true }))

    return { form, saveUserAction, user, isNew: false }
  },
})
```

**Why separate routes?**
- Each route gets its own loader instance - navigating from `/users/123/edit` → `/users/456/edit` creates a **fresh form** for user 456
- No `memo()` needed - separate routes handle lifecycle naturally
- No stale state - old form is garbage collected on route unmount
- No conditional logic inside loaders

### Form factory functions

For schemas used by multiple routes, extract factory functions into a separate file:

```typescript
// src/features/auth/authForm.ts
import { reatomForm } from '@reatom/core'
import { z } from 'zod/v4'

export const createLoginForm = () =>
  reatomForm(
    { email: '', password: '' },
    {
      name: 'authForm#login',
      validateOnBlur: true,
      schema: z.object({
        email: z.string().email('Invalid email'),
        password: z.string().min(4, 'Password must be at least 4 characters'),
      }),
    },
  )

export const createRegisterForm = () =>
  reatomForm(
    { name: '', email: '', password: '', confirmPassword: '' },
    {
      name: 'authForm#register',
      validateOnBlur: true,
      schema: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(4),
        confirmPassword: z.string(),
      }).refine((d) => d.password === d.confirmPassword, {
        message: 'Passwords must match',
        path: ['confirmPassword'],
      }),
    },
  )
```

```typescript
// In route loader
import { createLoginForm } from './authForm'

const loginRoute = rootRoute.reatomRoute({
  path: 'login',
  async loader() {
    const form = createLoginForm()
    // ... create action ...
    return { form, action: loginAction }
  },
})
```

### Auth redirects and concrete loader payloads

Do not put auth redirects or guard decisions inside a loader by returning `null`. That turns the loader payload into `T | null`, so every render and component has to defend against impossible `null` cases and TypeScript can no longer express "this page has a model". Put route-blocking decisions in `params()` (or a parent guard route) before the loader runs, and keep the loader return type concrete.

```typescript
const loginRoute = rootRoute.reatomRoute({
  path: 'login',
  params() {
    if (authToken()) {
      dashboardRoute.go()
      return null // blocks route before loader, but loader data stays concrete
    }
    return {}
  },
  async loader() {
    const form = reatomLoginForm()
    const submit = action(async () => {
      // authenticate, update shared auth atoms, navigate on success
    }).extend(withAsync({ status: true }))

    return { form, submit }
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFirstPending) return <AuthSkeleton />
    if (status.isFulfilled) return <LoginPage model={status.data} />
    if (status.isPending && status.isEverSettled) return <LoginPage model={status.data} refreshing />
    if (status.isRejected) return <PageError error={self.loader.error() ?? new Error('Request failed')} />

    return <></>
  },
})
```

Use the same pattern for private route trees: a parent guard route `params()` can redirect unauthenticated users and return `{}` for descendants. Descendant loaders can then assume the guard has passed and return typed page models without nullable escape hatches.

### Pre-fill settings form from persisted atoms

For settings pages, read persisted atom values at loader time to pre-fill the form:

```typescript
const settingsRoute = rootRoute.reatomRoute({
  path: 'settings',
  async loader() {
    const { themeAtom, languageAtom, notificationsAtom, autoSaveAtom, sidebarCollapsedAtom } =
      await import('./features/settings/settingsModel')

    const form = reatomForm(
      {
        theme: themeAtom(),
        language: languageAtom(),
        notifications: notificationsAtom(),
        autoSave: autoSaveAtom(),
        sidebarCollapsed: sidebarCollapsedAtom(),
      },
      {
        name: 'settingsForm',
        schema: z.object({
          theme: z.enum(['light', 'dark']),
          language: z.string(),
          notifications: z.boolean(),
          autoSave: z.boolean(),
          sidebarCollapsed: z.boolean(),
        }),
      },
    )

    const saveSettingsAction = action(async () => {
      const values = form()
      themeAtom.set(values.theme)
      languageAtom.set(values.language)
      notificationsAtom.set(values.notifications)
      autoSaveAtom.set(values.autoSave)
      sidebarCollapsedAtom.set(values.sidebarCollapsed)

      const res = await wrap(fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(values),
      }))
      if (!res.ok) throw new Error('Failed to save settings')
    }).extend(withAsync({ status: true }))

    return { form, action: saveSettingsAction }
  },
})
```

