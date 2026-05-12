# Routing Reference

## Contents

- [Basic routes](#basic-routes)
- [Nested routes](#nested-routes)
- [Layout routes with render (v1001+ semantics)](#layout-routes-with-render-v1001-semantics)
- [Protected routes — auth guard](#protected-routes--auth-guard)
- [Dynamic route collisions with literal siblings](#dynamic-route-collisions-with-literal-siblings)
- [Route loaders — data fetching](#route-loaders--data-fetching)
- [Route loaders — factory pattern (forms + actions)](#route-loaders--factory-pattern-forms--actions)
- [Modal gate — state in memory, no URL](#modal-gate--state-in-memory-no-url)
- [Search-only routes](#search-only-routes)
- [URL codecs (v1001+)](#url-codecs-v1001)
- [Relative navigation (v1001+)](#relative-navigation-v1001)
- [urlAtom and global state](#urlatom-and-global-state)
- [Full SPA example](#full-spa-example)

Routing validates params and search with any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library — Zod, Valibot, ArkType, etc. Examples below use Zod, but any Standard Schema works identically. **Check the target codebase's `package.json` to see which validation library is already in use and prefer that one.**

**Version note:** this reference is written for v1001 routing. In v1000, `layout: true`, URL codecs, and `route.go.relative()` are not available. v1000 `render` matches partially by default; use `exactRender: true` for page/exact rendering. In v1001, page routes are exact-by-default and wrapper routes need `layout: true`.

## Basic routes

```typescript
import { reatomRoute, urlAtom, wrap } from '@reatom/core'
import { z } from 'zod/v4'

// Root route — empty string matches any URL
const rootRoute = reatomRoute('')

// String path — NO leading slash (auto-prepended)
const userRoute = reatomRoute('users/:userId')
userRoute()           // { userId: '123' } | null
userRoute.exact()     // true only for /users/123
userRoute.match()     // true for /users/123/anything
// ⚠️ .go() takes params object, NOT a path string!
// ❌ loginRoute.go('/login')  // TypeError: Expected 2 arguments, got 1
// ✅ route.go() with no args for simple routes:
loginRoute.go()
// ✅ route.go({ param: 'value' }) for routes with params:
userDetailRoute.go({ id: '123' })
// ✅ Build URL without navigating:
const url = userDetailRoute.path({ id: '123' })  // '/users/123'
userRoute.path({ userId: '123' }) // build URL without navigating

// Object config — path, search params
const goodsRoute = reatomRoute({
  path: 'goods/:category',
  search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
})
goodsRoute.go({ category: 'tech', sort: 'asc' })  // /goods/tech?sort=asc

// Current URL — urlAtom() returns a URL OBJECT, not a string!
const url = urlAtom()
url.pathname  // '/users/123?tab=posts'
url.search    // '?tab=posts'

// ⚠️ DO NOT use string methods on urlAtom() directly!
// ❌ urlAtom().startsWith('/users')  // TypeError
// ✅ Use route.match() instead:
if (usersRoute.match()) { /* URL starts with /users */ }
if (usersRoute.exact()) { /* URL is exactly /users */ }
```

## Nested routes

```typescript
// Nest by chaining .reatomRoute() on parent
const dashboardRoute = reatomRoute('dashboard')
const usersRoute = dashboardRoute.reatomRoute('users')
const userRoute = usersRoute.reatomRoute(':userId')
// At URL: /dashboard/users/123
userRoute()      // { userId: '123' }
usersRoute()     // { }
usersRoute.exact() // false (child is active)
```

## Layout routes with render (v1001+ semantics)

Routes define `render` for framework-agnostic component composition. `render(self)` receives the route: `self()` for params (non-null inside render), `self.loader` for loader data.

Two kinds of routes in **v1001+**:
- **Layout routes** (`layout: true`) — render on any match, use `self.outlet()` to wrap child content. Use for shells, sidebars, protection layers.
- **Page routes** (default) — render only on exact match. When a child is active, the page steps aside and its content bubbles up to the nearest layout's `outlet()`.

**v1000 migration note:** there is no `layout` option. A route with `render` behaves like a layout by default (`match()`); add `exactRender: true` for exact/page behavior. When migrating v1000 → v1001, add `layout: true` to old wrapper routes and remove `exactRender: true` from old page routes.

```typescript
// Layout route — always active, wraps children
const layoutRoute = reatomRoute({
  layout: true,
  render({ outlet }) {
    return html`<div><header>App</header><main>${outlet()}</main></div>`
  },
})

// Child route with path
const aboutRoute = layoutRoute.reatomRoute({
  path: 'about',
  render() {
    return html`<h1>About</h1>`
  },
})

// ✅ Use route.match() to check current route in components
const isUsersPage = computed(() => usersRoute.match())
const isUserDetailPage = computed(() => userDetailRoute.match())

// ✅ Navigate with route.go() — NEVER with string paths
export const goLogin = () => loginRoute.go()
export const goUserDetail = (id: string) => userDetailRoute.go({ id })
export const goBackToUsers = () => usersRoute.go()

// ✅ Use route.match() in navigation items
const navItems = [
  { label: 'Dashboard', route: dashboardRoute },
  { label: 'Users', route: usersRoute },
]

// In Sidebar:
{navItems.map(item => (
  <button
    className={item.route.match() ? 'active' : ''}
    onClick={() => item.route.go()}
  >
    {item.label}
  </button>
))}
```

Typical app structure: root layout → optional auth/protection layers (also layout) → page routes. Entire app renders from root: `computed(() => layoutRoute.render())`.

## Protected routes — auth guard

Protected routes use `params()` callback returning `null` to block the route and all descendants. Reactive: re-runs when read atoms change — use for auth, roles, feature flags, wizards.

```typescript
// The `params` function enables protected routes:
// - Return null to block the route (and all children)
// - Return an object to inject derived parameters
// - Call .go() inside params for redirects

const authToken = atom(localStorage.getItem('token'), 'authToken')

const user = computed(async () => {
  const token = authToken()
  if (!token) return null
  return await wrap(fetch('/api/me').then((r) => r.json()))
}, 'user').extend(withAsyncData())

const protectedRoute = layoutRoute.reatomRoute({
  layout: true,
  params() {
    const token = authToken()
    // No-token is a synchronous auth decision; do not wait on user.ready().
    if (!token) {
      if (!loginRoute.match()) loginRoute.go()
      return null  // blocks this route and all children
    }

    const userData = user.data()
    // Token exists, so user.ready() represents the real /api/me request.
    if (!userData) {
      if (user.ready() && !loginRoute.match()) loginRoute.go()
      return null
    }
    // Already logged in but on login page — redirect to dashboard
    if (loginRoute.match()) {
      dashboardRoute.go()
    }
    // Inject user data as params for child routes
    return { userId: userData.id, role: userData.role }
  },
  render(self) { return self.outlet() },
})

const dashboardRoute = protectedRoute.reatomRoute({
  path: 'dashboard',
  render(self) {
    const params = self()
    // params has { userId, role } from parent
    return html`<h1>Hello, ${params.userId}</h1>`
  },
})
```

## Dynamic route collisions with literal siblings

Reatom route matching is pattern-based. A literal route and a dynamic route at the same level can both match the same URL segment:

```typescript
const projectCreateRoute = projectsRoute.reatomRoute({ path: 'new' })
const projectDetailRoute = projectsRoute.reatomRoute({ path: ':projectId' })
// /projects/new matches both unless :projectId rejects "new"
```

This is not just a rendering issue. If both routes match, both can appear in `outlet()` and the dynamic route loader can run with `projectId === 'new'`, often producing a confusing “not found” error below the intended page. Do not fix this by rendering only `outlet().at(0)` — that hides the duplicate match while the wrong route may still be active.

Use the dynamic route's `params` as a match predicate. Prefer a direct Standard Schema over manual parsing in a function; decode failures make the route unmatched.

```typescript
import { z } from 'zod/v4'

const projectIdSchema = z.string().regex(/^p_(?:\d+|[0-9a-f-]{36})$/)

const projectCreateRoute = projectsRoute.reatomRoute({
  path: 'new',
  // create loader/form
})

const projectDetailRoute = projectsRoute.reatomRoute({
  path: ':projectId',
  params: z.object({ projectId: projectIdSchema }),
  async loader({ projectId }) {
    return await wrap(api.getProject(projectId))
  },
})
```

Shape the schema to your actual ID format — the broader the `z.string()`, the more likely it collides with a literal sibling:

- UUID database IDs: `z.uuid()` or your validation library's UUID schema.
- Numeric IDs: `z.string().regex(/^\d+$/).transform(Number)` (or a v1001 codec if navigation should accept numbers too).
- Prefixed IDs: `z.string().regex(/^usr_[\w-]+$/)` / `project_...`.
- Slugs with reserved words: reject reserved literals (`new`, `create`, `settings`, `edit`) with a schema refinement or choose a route structure that avoids ambiguity.
- Known type segments: use an enum/union schema so unrelated literals do not match.

Route order is not the main tool here; make each dynamic segment describe what it is allowed to be. This keeps matching, loaders, outlets, and navigation types aligned.

### Parent params and child schemas

Nested route params are merged. If a parent protected route injects `{ user }`, a child `params` schema may need to accept that merged input, and `go()` typing can become more cumbersome. For auth guards, prefer returning `{}` when children can read the user from a shared atom/resource:

```typescript
const protectedRoute = rootRoute.reatomRoute({
  layout: true,
  params() {
    if (!authToken()) {
      loginRoute.go()
      return null
    }
    return {} // guard only; don't inject unrelated params
  },
})
```

Inject parent params only when descendants genuinely need those values as route params.

## Route loaders — data fetching

Route loaders are async computeds with `withAsyncData` built-in. They run when route matches, auto-abort on navigation away. Nested loaders await parents and receive merged params. Effects inside loaders also auto-abort on navigation.

Loader API (same as `withAsyncData`): **route.loader.data()**, **.ready()**, **.error()**, **.retry()**, **.status()**.

Prefer handling loader state in the route `render(self)` instead of inside the page component. `status()` is a discriminated union; checking its flags in `render` lets TypeScript narrow `status.data` before you pass it to typed UI components. It also gives better UX than a single `.ready()` check:

- `isFirstPending` — first load only; use for page skeletons/full loading states.
- `isPending` with existing data — background refresh; keep stale content visible and show an inline spinner/progress affordance.
- `isFulfilled` — normal render; `status.data` is the resolved loader payload.
- `isRejected` — show a full-page error when no useful data has ever loaded, or an inline refresh error when preserving stale data is appropriate for that resource.
- `isEverPending` / `isEverSettled` — historical flags useful for rare aborted/no-data edges.

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

    // After the first success, a pending status means background refresh.
    // Keep the previous page model visible and show a subtle refresh affordance.
    if (status.isPending && status.data) {
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

For list/search routes, avoid replacing the whole page on every search-param change. After the first successful load, `isPending` means “refreshing”; keep previous data rendered and show a small inline pending indicator. If your loader/data shape preserves stale data on refresh failures, show the error inline instead of throwing away usable content.

## Route loaders — factory pattern (forms + actions)

Route loaders are the **single source of truth** for all route-specific state. Create forms, actions, and computed atoms **inside** the loader — they get garbage collected when the route unmounts, giving you automatic memory management with global accessibility.

### Separate routes for create vs edit

**Never** use a single route with conditional logic (`params.id === 'new'`). Use separate routes — each gets its own loader, its own form instance, and automatic cleanup on navigation. Also ensure the dynamic detail/edit route's `params` schema rejects literal siblings such as `new`; separate routes alone do not prevent `:id` from matching a literal segment.

```typescript
// ❌ Bad — single route with conditional logic
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

// ✅ Good — separate routes
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
- Each route gets its own loader instance — navigating from `/users/123/edit` → `/users/456/edit` creates a **fresh form** for user 456
- No `memo()` needed — separate routes handle lifecycle naturally
- No stale state — old form is garbage collected on route unmount
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

Do not put auth redirects or guard decisions inside a loader by returning `null`. That turns the loader payload into `T | null`, so every render and component has to defend against impossible `null` cases and TypeScript can no longer express “this page has a model”. Put route-blocking decisions in `params()` (or a parent guard route) before the loader runs, and keep the loader return type concrete.

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
    if (status.isPending && status.data) return <LoginPage model={status.data} refreshing />
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

## Modal gate — state in memory, no URL

```typescript
const confirmModal = protectedRoute.reatomRoute({
  params({ message }) { return message ? { message } : null },
  render(self) { return html`<dialog open>${self().message}</dialog>` },
})
confirmModal.go({ message: 'Sure?' })  // opens
confirmModal.go()                       // closes
```

## Search-only routes

```typescript
const dialogRoute = reatomRoute({
  search: z.object({ dialog: z.enum(['login', 'signup']).optional() }),
})
// At URL: /profile?dialog=login
dialogRoute() // { dialog: 'login' }
// Close: dialogRoute.go({})
```

## URL codecs (v1001+)

v1001 adds bidirectional codecs for route params/search. `decode` reads raw URL strings into typed values; `encode` writes typed values back to URL-safe strings. `route.go()` and `route.path()` accept the decoded/output types.

```typescript
const itemRoute = reatomRoute({
  path: 'items/:id',
  params: {
    decode: (input: { id: string }) => ({ id: Number(input.id) }),
    encode: (output: { id: number }) => ({ id: String(output.id) }),
  },
  search: {
    decode: (input: { page?: string }) => ({ page: input.page ? Number(input.page) : 1 }),
    encode: (output: { page: number }) => ({ page: String(output.page) }),
  },
})

itemRoute.go({ id: 42, page: 3 }) // /items/42?page=3
itemRoute() // { id: 42, page: 3 } | null
```

Zod codecs such as `z.codec(...)` and `z.stringbool()` also work in v1001. Decode errors make the route unmatched (`null`). In v1000, manually encode/decode and pass URL-string-shaped params to `go()`.

## Relative navigation (v1001+)

`route.go.relative(params?)` merges currently matched parent params, useful for sibling navigation.

```typescript
const projectRoute = reatomRoute('projects/:projectId')
const settingsRoute = projectRoute.reatomRoute('settings')
const reviewRoute = projectRoute.reatomRoute('review')

settingsRoute.go({ projectId: '123' }) // /projects/123/settings
reviewRoute.go.relative()             // /projects/123/review
```

It throws if the parent route is not currently matched. In v1000, call `reviewRoute.go({ projectId })` explicitly.

## urlAtom and global state

`urlAtom.go('/path')` navigates, `urlAtom()` reads `{ pathname, search, hash }`, `urlAtom.catchLinks(false)` disables SPA link interception, `urlAtom.routes` is a registry of all created routes. `isSomeLoaderPending` tracks global loading state across all route loaders.

## Full SPA example

Setup logging system:

```ts
// setup.ts — import this file before others in the repo root!
import { connectLogger, log } from '@reatom/core'
if (import.meta.env.MODE === 'development') connectLogger()
declare global {
  var LOG: typeof log
}
globalThis.LOG = log
```

Routes:

```ts
// routes.ts
import { atom, computed, reatomRoute, withAsyncData, wrap } from '@reatom/core'
import { z } from 'zod/v4'

type User = { id: string; name: string; role: string }

// layout — no path, always active, renders outlet
export const layoutRoute = reatomRoute({
  layout: true,
  render({ outlet }) {
    return html`<div>My App${outlet()}</div>`
  },
})

// public login page
export const loginRoute = layoutRoute.reatomRoute({
  path: 'login',
  render() {
    return html`Login Form`
  },
})

// auth state
const authToken = atom(localStorage.getItem('token'), 'authToken')

const user = computed(async () => {
  const token = authToken()
  if (!token) return null
  return await wrap(fetch('/api/me').then((r) => r.json()))
}, 'user').extend(withAsyncData())

// protected route — blocks all children when not authenticated
export const protectedRoute = layoutRoute.reatomRoute({
  layout: true,
  params() {
    const token = authToken()
    if (!token) {
      if (!loginRoute.match()) loginRoute.go()
      return null
    }

    const userData = user.data()
    if (!userData) {
      if (user.ready() && !loginRoute.match()) loginRoute.go()
      return null
    }
    if (loginRoute.match()) dashboardRoute.go()
    return userData
  },
  render(self) {
    return self.outlet()
  },
})

export const dashboardRoute = protectedRoute.reatomRoute({
  path: 'dashboard',
  render() {
    return html`Dashboard`
  },
})

// users list with search params and loader
export const usersRoute = protectedRoute.reatomRoute({
  path: 'users',
  search: z.object({
    q: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  }),
  async loader({ q, page }) {
    const response = await wrap(
      fetch(`/api/users?q=${encodeURIComponent(q ?? '')}&page=${page}`),
    )
    return await wrap(response.json())
  },
  render(self) {
    const { isPending, data } = self.status()
    if (isPending) return html`Loading users...`
    return html`<ul>${data.items.map(
      (u: User) => html`<li>${u.name}</li>`
    )}</ul>`
  },
})
```
