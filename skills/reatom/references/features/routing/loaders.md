# Routing Reference — Loaders

> Core routing API in [`./routes.md`](./routes.md).
>
> Source: [`routing/route.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts) (loader option), [`routing/route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts) (`RouteLoader`), [`async/withAsyncData.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncData.ts) (used internally), [`route.security.test.browser.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.security.test.browser.ts) (guards/collisions). Per-section links inline below.

## Table of contents

- [Route loaders - data fetching](#route-loaders---data-fetching)
  - [Thin render boundary and empty states](#thin-render-boundary-and-empty-states)
  - [Search params, controlled inputs, and stale loader data](#search-params-controlled-inputs-and-stale-loader-data)
  - [Identity-changing routes, parent loader data, and clean scoped state](#identity-changing-routes-parent-loader-data-and-clean-scoped-state)
    - [Index child loaders under layout routes](#index-child-loaders-under-layout-routes)
- [Route loaders - factory pattern (forms + actions)](#route-loaders---factory-pattern-forms--actions)
  - [Refreshing loaders after mutations](#refreshing-loaders-after-mutations)
  - [Precompute component links in loaders](#precompute-component-links-in-loaders)
  - [Route shape is product architecture](#route-shape-is-product-architecture)
  - [Separate routes for create vs edit](#separate-routes-for-create-vs-edit)
  - [Form factory functions](#form-factory-functions)
    - [Two good organization shapes](#two-good-organization-shapes)
  - [Auth redirects and concrete loader payloads](#auth-redirects-and-concrete-loader-payloads)
  - [Pre-fill settings form from persisted atoms](#pre-fill-settings-form-from-persisted-atoms)

## Route loaders - data fetching

[`loader` option in `route.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts) · [`RouteLoader` type in `route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts) · [`withAsyncData` (used internally)](https://github.com/reatom/reatom/blob/v1001/packages/core/src/async/withAsyncData.ts)


Route loaders are async computeds with `withAsyncData` built-in. They run when route matches, auto-abort on navigation away. Nested loaders await parents and receive merged params. Effects inside loaders also auto-abort on navigation.

Loader API (same as `withAsyncData`): **route.loader.data()**, **.ready()**, **.error()**, **.retry()**, **.status()**.

**The loader takes ONE argument**: `loader: async (paramsAndSearch) => ...`. Reatom merges the route's `params` schema and `search` schema into a single `Plain<Params & Search>` object — do not write `(params, search) => ...`. The second argument is silently `undefined` and the type system reports the loader as taking too few arguments. For routes with both schemas, destructure the keys you need from the merged object.

Prefer handling loader state in the route `render(self)` instead of inside the page component. `status()` is a discriminated union; checking its flags in `render` lets TypeScript narrow `status.data` before you pass it to typed UI components. It also gives better UX than a single `.ready()` check:

- `isFirstPending` - first load only; use for page skeletons/full loading states.
- `isPending` with existing data - background refresh; keep stale content visible and show an inline spinner/progress affordance.
- `isFulfilled` - normal render; `status.data` is the resolved loader payload.
- `isRejected` - show a full-page error when no useful data has ever loaded, or an inline refresh error when preserving stale data is appropriate for that resource.
- `isEverPending` / `isEverSettled` - historical flags useful for rare aborted/no-data edges.

Keep `render(self)` as a route orchestration boundary, not as the page implementation. It should usually compose layouts/outlets, branch on loader/auth/route state, wire retry/navigation callbacks, and pass concrete data or scoped models into route-neutral components. Put substantial page markup, tables, forms, dashboards, and widgets in components imported by the route module. This keeps the route tree readable while preserving the TypeScript narrowing and async UX benefits of route-level status handling.

With concrete loader payloads (no `undefined` branches), TypeScript usually narrows `status.data` to the full loader type in refresh branches. The branch order handles edge cases: `isFirstPending` covers the initial load, `isRejected` covers failures without usable data, and `isPending && isEverSettled` preserves settled content during background refresh.

In practice, some TypeScript versions/toolchains still refuse to narrow as far as intended in a stale-refresh branch. If that happens, do not fight the type system for half a file: capture a local `const data = status.data` and add a tiny fallback guard before rendering the settled branch. That is a tooling workaround, not a sign that the route pattern is wrong.

```typescript
const userRoute = reatomRoute({
  path: 'users/:userId',
  async loader(params) {
    const user = await wrap(api.getUser(params.userId))
    return { user }
  },
  render(self) {
    const status = self.loader.status()
    const error = self.loader.error()

    if (status.isFirstPending) return <UserPageSkeleton />

    if (error && !status.data) {
      return <PageError error={error} onRetry={self.loader.retry} />
    }

    if (!status.data) {
      return <NoDataState />
    }

    return (
      <UserPage
        model={status.data}
        refreshing={status.isPending && status.isEverSettled}
      />
    )
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

### Thin render boundary and empty states

A fulfilled loader can legitimately contain empty collections or optional content. Empty collections are not loading states and are not errors; show an intentional empty state with recovery guidance instead of rendering an empty table/list/card. The route can compute route-level facts such as `isRefreshing` and pass data into components, while the component decides how to present empty sections.

```tsx
render(self) {
  const status = self.loader.status()
  const error = self.loader.error()
  const data = self.loader.data()

  if (status.isFirstPending) return <PageSkeleton />
  if (error && !data) return <PageError error={error} onRetry={self.loader.retry} />
  if (!data) return <NoDataState />

  return (
    <ListPage
      items={data.items}
      isRefreshing={status.isPending && status.isEverSettled}
    />
  )
}

const ListPage = reatomComponent(({
  items,
  isRefreshing,
}: {
  items: Item[]
  isRefreshing?: boolean
}) => (
  <>
    {isRefreshing && <InlineSpinner />}
    {items.length === 0 ? (
      <EmptyState title="No items yet" description="Create an item or change the filters." />
    ) : (
      <ItemTable items={items} />
    )}
  </>
))
```

For list/search routes, avoid replacing the whole page on every search-param change. With a concrete loader model, `isPending` after `isEverSettled` means "refreshing" — keep previous data rendered with a subtle pending indicator, including empty-state UI if the settled collection is empty. When params identify a different entity, use the parent-loader pattern below instead of preserving the previous entity model.

### Search params, controlled inputs, and stale loader data

Stale-while-refresh has an important UI consequence: while a search-param-driven loader is pending, `status.data` may still be the previous fulfilled payload. That is useful for keeping tables and lists stable, but it makes loader fields a poor source of truth for high-frequency controlled inputs. If an input's `value` comes from `status.data.query` and `onChange` updates the route search, the next render may briefly reuse the old loader payload and overwrite what the user just typed.

Use a dedicated atom for the live input value, and sync that atom to the URL when the value is part of navigation state. `withSearchParams` updates the URL from atom changes and initializes from the URL on matching paths; the route loader can still read the validated route search params for fetching.

```typescript
import { atom, withSearchParams } from '@reatom/core'

const itemSearchAtom = atom('', 'itemSearch').extend(
  withSearchParams('q', {
    path: '/items/*',          // scope to the route subtree that owns this search value
    replace: true,             // typing should not usually add a history entry per keypress
    serialize: (value) => value || undefined,
  }),
)

const itemsRoute = rootRoute.reatomRoute({
  path: 'items',
  search: z.object({ q: z.string().default('') }),
  async loader({ q }) {
    const items = await wrap(api.searchItems(q))
    return { items }
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFirstPending) return <PageSkeleton />
    if (status.isFulfilled || (status.isPending && status.isEverSettled)) {
      return <ItemsPage items={status.data.items} refreshing={status.isPending} />
    }
    if (status.isRejected) return <PageError error={self.loader.error() ?? new Error('Failed to load items')} />
    return <PageSkeleton />
  },
})

const ItemsPage = reatomComponent(({ items, refreshing }: { items: Item[]; refreshing?: boolean }) => {
  return <>
    <input
      value={itemSearchAtom()}
      onInput={wrap((event) => itemSearchAtom.set(event.currentTarget.value))}
    />
    {refreshing && <InlineSpinner />}
    <ItemTable items={items} />
  </>
})
```

If you do not want URL synchronization, use a plain atom instead. The key rule is the same: loader payloads are fetched results, not the live buffer for currently typed input.

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

    const form = reatomForm(
      { name: item.name, description: item.description },
      {
        name: `itemEdit#${itemId}.form`,
        schema: itemSchema,
        onSubmit: async (values) => {
          return await wrap(api.saveItem(item.id, values))
        },
      },
    )

    const save = action(async () => {
      const saved = await wrap(form.submit())
      if (saved) form.init(saved)
      return saved
    }, `itemEdit#${itemId}.save`).extend(
      withAsync(),
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

Treat the same route shape as risky even when the child is more than a loader. A `path: ''` child used as a default page, redirect owner, or nav owner under a layout can still observe descendant URLs too broadly. If the page is really "the parent's exact screen", a safer default is often to let the parent route render that page when `self.exact()` is true and reserve child routes for real descendants. Reach for a separate index child only when it buys you something concrete and you also add the exact/pathname guard.

When choosing between a parent exact page and a `path: ''` child, prefer the parent exact page when the child adds no separate URL semantics, no independent loader lifetime, and no distinct descendant behavior. The more the child is acting like a default owner rather than a real descendant, the more likely it should be folded back into the parent.

## Route loaders - factory pattern (forms + actions)

Loaders are plain async functions — they can return atoms, forms, actions, computed factories. See [`reatomForm`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/form/reatomForm.ts) and [`computed`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts) for the building blocks used below.


Route loaders are the **single source of truth** for all route-specific state. Create forms, actions, and computed atoms **inside** the loader - they get garbage collected when the route unmounts, giving you automatic memory management with global accessibility.

### Refreshing loaders after mutations

Route loaders are cached computeds. If a mutation changes the backing data but the current route params/search stay the same, simply navigating back to the same URL may keep showing the previous fulfilled loader payload.

Use one of these patterns deliberately:

- **Route-local retry** — when the mutation lives next to the route and already has access to the loader, call `retryComputed(self.loader)` or `self.loader.retry()` after a successful mutation.
- **Version atom invalidation** — when the mutation lives outside the route module and you want to avoid route/component import cycles, create a small atom that the loader reads and bump it after successful mutations.

```typescript
const listVersionAtom = atom(0, 'listVersion')

const listRoute = rootRoute.reatomRoute({
  path: 'records',
  async loader() {
    listVersionAtom() // dependency for mutation-driven refresh
    return await wrap(api.listRecords())
  },
})

const deleteRecord = action(async (id: string) => {
  await wrap(api.deleteRecord(id))
  listVersionAtom.set((state) => state + 1)
}, 'deleteRecord').extend(withAsync(), withAbort())
```

This pattern is especially useful for list pages that stay on the same search/filter URL after delete, create, or edit. Without an explicit invalidation signal, the loader has no reason to recompute.

When debugging abort-heavy route behavior, keep `connectLogger()` or equivalent visibility on until ownership and invalidation rules are proven correct. Repeated loader aborts are often telling you that a broad route is matching and unmatching, not that the logger itself is the problem. Reduce noise only after proving the route shape is correct on the nearby URLs it can affect.

### Precompute component links in loaders

Loaders are also a good place to convert route knowledge into component-friendly data. If a page component imports a route singleton only to call `route.path(...)` for rows, cards, breadcrumbs, or action links, prefer moving that path construction into the route loader/model. This keeps components route-neutral and avoids route ↔ component import cycles when route modules render those components.

Two useful forms:

- **Precomputed `href` values** for concrete entities returned by the loader.
- **Path-builder functions** for child components that need to build links lazily from an ID or search state.

```typescript
const projectRoute = projectsRoute.reatomRoute({ path: ':projectId' })

const projectsIndexRoute = projectsRoute.reatomRoute({
  path: '',
  async loader() {
    const projects = await wrap(api.listProjects())

    return {
      projects: projects.map((project) => ({
        ...project,
        href: projectRoute.path({ projectId: project.id }),
      })),
      projectHref: (projectId: string) => projectRoute.path({ projectId }),
    }
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFulfilled) return <ProjectsPage model={status.data} />
    if (status.isRejected) return <PageError error={self.loader.error() ?? new Error('Failed to load projects')} />
    return <PageSkeleton />
  },
})

type ProjectsPageModel = {
  projects: Array<Project & { href: string }>
  projectHref: (projectId: string) => string
}

function ProjectsPage({ model }: { model: ProjectsPageModel }) {
  return <ProjectList projects={model.projects} getProjectHref={model.projectHref} />
}
```

This pattern is not only for lists. Detail loaders can return breadcrumb `href`s, form-success redirect targets, tab links, and related-entity link builders. The route layer still owns URL shape and params validation; components receive plain strings/functions and stay easy to test or move.

### Route shape is product architecture

A loader can technically create any route-scoped state, but the route tree should be chosen from the product behavior first. Routes define more than code ownership: they define addressability, history semantics, restoration, access boundaries, data lifetime, page titles, breadcrumbs, analytics events, and how users recover from errors or abandoned work.

Before adding a feature to an existing route, nesting it under a parent, or splitting it into its own route, consider:

- **Addressability:** should this state be shareable, bookmarkable, restorable after reload, or deep-linked from notifications/search?
- **History:** what should browser Back/Forward mean — close an overlay, return to a parent, undo search params, leave a flow, or step within a wizard?
- **State lifetime:** which data should reset on navigation, and which should survive sibling tabs, filters, refreshes, or parent route changes?
- **Data identity:** does the route represent a collection, an entity, a sub-resource, a task, or a transient UI mode?
- **Concurrency:** can multiple instances exist, or is there a single app-wide/page-wide state?
- **Authorization and guards:** should access be blocked at a parent boundary, a specific page, or a sub-flow?
- **Loading and errors:** should failures replace the whole page, preserve stale parent context, or only affect a child region?
- **Product semantics:** do breadcrumbs, document title, analytics, command palette entries, and navigation labels treat this as a distinct screen?

Common route shapes are tools, not defaults:

- **Dedicated page route:** when the state represents a distinct task/view with its own URL, guards, loading/error states, or success navigation.
- **Nested child route:** when the parent context should stay visible while the child owns identity-specific data or a sub-task.
- **Layout route with children:** when a boundary owns shared context, protection, navigation, or stable models for multiple pages.
- **Search-param state:** when the URL should capture lightweight, reversible view state such as filters, sort, tabs, or pagination.
- **Modal/overlay route:** when the user should keep parent context but Back should dismiss and the state may be linkable/restorable.
- **Inline local state:** when the behavior is intentionally ephemeral and not meaningful as navigation.

When the UX is unspecified, state the routing tradeoff briefly instead of silently choosing. Pick the least surprising shape for the requested app, and keep the implementation aligned with that choice: loader-owned models for route lifetime, parent loaders for shared stable context, URL/search atoms for immediate URL-backed UI state, and plain local atoms for ephemeral controls.

### Separate routes for create vs edit

Do not use a single dynamic route with conditional logic such as `params.id === 'new'`. Prefer separate literal routes for create flows and constrained dynamic routes for identity flows. Each route gets its own loader, form instance, and cleanup semantics, and the route tree documents the UX. Also ensure the dynamic detail/edit route's `params` schema rejects literal siblings such as `new`; separate routes alone do not prevent `:id` from matching a literal segment.

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
      {
        name: 'userForm#create',
        validateOnBlur: true,
        schema: userSchema,
        onSubmit: async (values) => {
          const res = await wrap(fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
            body: JSON.stringify(values),
          }))
          if (!res.ok) throw new Error('Failed to save')
          return await wrap(res.json())
        },
      },
    )

    const saveUserAction = action(async () => {
      return await wrap(form.submit())
    }).extend(withAsync(), withAbort())

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
      {
        name: `userForm#edit#${params.id}`,
        validateOnBlur: true,
        schema: userSchema,
        onSubmit: async (values) => {
          const res = await wrap(fetch(`/api/users/${params.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
          }))
          if (!res.ok) throw new Error('Failed to save')
          return await wrap(res.json())
        },
      },
    )

    const saveUserAction = action(async () => {
      return await wrap(form.submit())
    }).extend(withAsync(), withAbort())

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

For forms used by multiple routes or large enough to deserve their own file, extract a factory function. Keep the factory responsible for field state, validation, and the core submit mutation.

```typescript
// forms/authForm.ts
import { reatomForm, wrap } from '@reatom/core'
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
      onSubmit: async (values) => {
        return await wrap(api.login(values))
      },
    },
  )
```

#### Two good organization shapes

**1. Default: create the form inline in the loader**

Use this when the route is the natural lifetime boundary and the form is still readable where it is created. It keeps the route's state model in one place and makes navigation/retry behavior obvious.

**2. Extract the form factory, but keep route reactions in the loader**

When the form definition becomes large, move the form factory out, but do not move route-specific navigation, retry, or parent-resource refresh rules into that factory.

```typescript
// in route loader
import { action, withAbort, withAsync, withCallHook, wrap } from '@reatom/core'
import { createLoginForm } from './forms/authForm'

const loginRoute = rootRoute.reatomRoute({
  path: 'login',
  async loader() {
    const form = createLoginForm()

    form.submit.onFulfill.extend(
      withCallHook(({ payload: result }) => {
        refreshSessionResource()
        navigateAfterLogin(result)
      }),
    )

    form.submit.onReject.extend(
      withCallHook(() => {
        focusFirstInvalidField(form)
      }),
    )

    const loginAction = action(() => wrap(form.submit()), 'loginAction').extend(
      withAsync(),
      withAbort(),
    )

    return { form, action: loginAction }
  },
})
```

This split keeps the factory reusable and keeps route concerns at the route boundary. The route decides what to refresh, where to navigate, and how to handle local UX details after success or failure.

When completion of a command is the real source event, prefer `form.submit.onFulfill` / `form.submit.onReject` with `withCallHook`. Use `withChangeHook` or `addChangeHook` only when an atom state change is what other code actually needs to observe, such as mirroring `form.submit.data()` or reacting to a dedicated status atom.

### Auth redirects and concrete loader payloads

Do not put auth redirects or guard decisions inside a loader by returning `null`. That turns the loader payload into `T | null`, so every render and component has to defend against impossible `null` cases and TypeScript can no longer express "this page has a model". Put route-blocking decisions in `params()` (or a parent guard route) before the loader runs, and keep the loader return type concrete.

```typescript
const loginRoute = rootRoute.reatomRoute({
  path: 'login',
  params() {
    if (authToken()) {
      dashboardRoute.go(undefined, true)
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

Use the same pattern for private route trees: a parent guard route `params()` can redirect unauthenticated users with `loginRoute.go(undefined, true)` and return `{}` for descendants. Descendant loaders can then assume the guard has passed and return typed page models without nullable escape hatches.

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
        onSubmit: async (values) => {
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
        },
      },
    )

    const saveSettingsAction = action(async () => {
      return await wrap(form.submit())
    }).extend(withAsync(), withAbort())

    return { form, action: saveSettingsAction }
  },
})
```

