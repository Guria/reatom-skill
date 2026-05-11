# Routing Reference

Routing validates params and search with any [Standard Schema](https://github.com/standard-schema/standard-schema) compliant library — Zod, Valibot, ArkType, etc. Examples below use Zod, but any Standard Schema works identically. **Check the target codebase's `package.json` to see which validation library is already in use and prefer that one.**

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

## Layout routes with render

Routes define `render` for framework-agnostic component composition. `render(self)` receives the route: `self()` for params (non-null inside render), `self.loader` for loader data.

Two kinds of routes:
- **Layout routes** (`layout: true`) — render on any match, use `self.outlet()` to wrap child content. Use for shells, sidebars, protection layers.
- **Page routes** (default) — render only on exact match. When a child is active, the page steps aside and its content bubbles up to the nearest layout's `outlet()`.

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

const user = computed(async () => {
  const token = localStorage.getItem('token')
  if (!token) return null
  return await wrap(fetch('/api/me').then((r) => r.json()))
}, 'user').extend(withAsyncData())

const protectedRoute = layoutRoute.reatomRoute({
  layout: true,
  params() {
    const userData = user.data()
    // Not authenticated — redirect to login
    if (!userData) {
      if (user.ready() && !loginRoute.match()) {
        loginRoute.go()
      }
      return null  // blocks this route and all children
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

## Route loaders — data fetching

Route loaders are async computeds with `withAsyncData` built-in. They run when route matches, auto-abort on navigation away. Nested loaders await parents and receive merged params. Effects inside loaders also auto-abort on navigation.

Loader API (same as `withAsyncData`): **route.loader.data()**, **.ready()**, **.error()**, **.retry()**, **.status()**.

```typescript
const userRoute = reatomRoute({
  path: 'users/:userId',
  async loader(params) {
    const user = await wrap(
      fetch(`/api/users/${params.userId}`).then((r) => r.json()),
    )
    return user
  },
})

// Access loader state in components
const UserPage = reatomComponent(() => {
  const params = userRoute()
  if (!params) return null
  const ready = userRoute.loader.ready()
  const user = userRoute.loader.data()
  const error = userRoute.loader.error()
  if (!ready) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div><h1>{user.name}</h1></div>
})
```

## Route loaders — factory pattern (forms + actions)

Route loaders are the **single source of truth** for all route-specific state. Create forms, actions, and computed atoms **inside** the loader — they get garbage collected when the route unmounts, giving you automatic memory management with global accessibility.

### Separate routes for create vs edit

**Never** use a single route with conditional logic (`params.id === 'new'`). Use separate routes — each gets its own loader, its own form instance, and automatic cleanup on navigation.

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

export const userEditRoute = usersRoute.reatomRoute({
  path: ':id/edit',
  params: z.object({ id: z.string() }),
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

### Auth redirect in loader

For auth pages, return `null` from the loader to block the route and redirect already-logged-in users:

```typescript
const loginRoute = rootRoute.reatomRoute({
  path: 'login',
  async loader() {
    const token = authToken()
    if (token) {
      urlAtom.go('/dashboard')  // redirect
      return null  // blocks the route
    }

    const form = createLoginForm()
    // ... create action ...
    return { form, action: loginAction }
  },
})
```

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
import { computed, reatomRoute, withAsyncData, wrap } from '@reatom/core'
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
const user = computed(async () => {
  const token = localStorage.getItem('token')
  if (!token) return null
  return await wrap(fetch('/api/me').then((r) => r.json()))
}, 'user').extend(withAsyncData())

// protected route — blocks all children when not authenticated
export const protectedRoute = layoutRoute.reatomRoute({
  layout: true,
  params() {
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
