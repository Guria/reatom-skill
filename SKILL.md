---
name: reatom
description: Expert assistant for Reatom v1000+ state management library. Use when building state management, forms, routing, async data fetching, persistence, or extensions with Reatom. Covers @reatom/core, @reatom/react, @reatom/vue, @reatom/solid-js, @reatom/preact, @reatom/lit, @reatom/jsx, @reatom/devtools, @reatom/zod, @reatom/eslint-plugin, @reatom/admin.
---

# Reatom v1000+ Skill

Reatom is a 2 KB gzipped, framework-agnostic reactive state management library. It uses an atom-centric model where all primitives inherit from a single core primitive — the atom.

> **⚠️ v1000+ only — do not rely on any v3 or earlier packages.** The v3 package ecosystem (`@reatom/lens`, `@reatom/hooks`, `@reatom/effects`, `@reatom/persist-web-storage`, etc.) is completely separate and incompatible. v1000+ consolidation moved everything into `@reatom/core` and `@reatom/react`. When researching, always target the `v1000+` branch or tag — v3 docs, examples, and issues will mislead you.

## Core Resources

- **Repo**: https://github.com/reatom/reatom
- **Docs**: https://v1000.reatom.dev
- **Examples**: https://github.com/reatom/reatom/tree/v1000/examples
- **Template (React + Mantine)**: https://stackblitz.com/github/reatom/reatom/tree/v1000/examples/react-search

## Core Primitives

### Atom — mutable immutable state

```typescript
import { atom } from '@reatom/core'

const counter = atom(0, 'counter')
counter()       // → 0
counter.set(5)  // → 5
counter.set(v => v + 1)  // → 6
```

### Computed — lazy derived state

```typescript
import { atom, computed } from '@reatom/core'

const counter = atom(0, 'counter')
const doubled = computed(() => counter() * 2, 'doubled')
doubled()  // → 0, recalculates only when subscribed AND counter changes
```

### Action — callable event with call history

```typescript
import { action, wrap } from '@reatom/core'

const fetchData = action(async (id: number) => {
  const res = await wrap(fetch(`/api/data/${id}`))
  return await wrap(res.json())
}, 'fetchData')
```

### Effect — auto-subscribes for side effects

```typescript
import { atom, effect } from '@reatom/core'

const counter = atom(0, 'counter')
effect(() => {
  console.log('counter changed:', counter())
  // auto-cleans on abort/unmount
}, 'counter.effect')
```

## Extension System

Extensions add capabilities via `.extend()`. This is the primary extension mechanism.

### withAsyncData — async data fetching (recommended pattern)

```typescript
import { atom, computed, withAsyncData, wrap } from '@reatom/core'

const list = computed(async () => {
  return await wrap(api.getList())
}, 'list').extend(withAsyncData({ initState: [] }))

list.data()    // fetched data (atom getter — call it!)
list.ready()   // false while loading, true when loaded
list.error()   // Error if fetch failed
list.retry()   // retry the fetch
list.reset()   // reset to initial state
```

⚠️ **Important**: `.data()`, `.ready()`, `.error()` are atom getters — **call them**.
Do NOT destructure: `const { data, ready } = list` breaks reactivity.

⚠️ **`status` is disabled by default** — both `withAsync` and `withAsyncData` disable the `status` atom unless explicitly enabled. If you access `.status()` without enabling it, you get:
```
ReatomError: status is turned off by default, you need to activate it explicitly in options
```

To enable status tracking, pass `{ status: true }` to `withAsyncData()` or `withAsync()`:

```typescript
const list = computed(async () => {
  return await wrap(api.getList())
}, 'list').extend(withAsyncData({ initState: [], status: true }))

// Now status is available:
const status = list.status()  // AsyncStatusAtom<State, InitState>
status.isPending        // true while loading
status.isFirstPending   // true only for the first call (useful for initial skeleton loading)
status.isFulfilled      // true after success
status.isRejected       // true after failure (NOT status.error!)
status.isSettled        // true when settled (success or error)
status.isEverPending    // true after at least one async operation started
status.isEverSettled    // true after at least one operation completed
status.data             // the current data value (only with withAsyncData)
status.reset()          // reset to initial state, clearing history flags
```

### withAbort — race condition prevention

```typescript
import { action, withAbort, wrap } from '@reatom/core'

const fetchUser = action(async (id: number) => {
  return await wrap(api.getUser(id))
}, 'fetchUser').extend(withAbort())

fetchUser(1)  // aborted when next call comes
fetchUser(2)  // aborted
fetchUser(3)  // wins — previous calls cancelled
```

### withChangeHook — react to state changes

```typescript
import { atom, withChangeHook } from '@reatom/core'

const name = atom('John', 'name').extend(
  withChangeHook((next) => api.updateName(next))
)
```

### withConnectHook — lazy-start on first subscriber

```typescript
import { computed, withAsyncData, withConnectHook, wrap } from '@reatom/core'

const data = computed(async () => {
  return await wrap(api.getData())
}, 'data').extend(
  withAsyncData(),
  withConnectHook(async (target) => {
    // auto-aborts on disconnect
    while (true) {
      await wrap(sleep(1000))
      target.retry()
    }
  })
)
```

### withComputed — writable computed

```typescript
import { atom, withComputed } from '@reatom/core'

const tabs = atom<Tab[]>([], 'tabs')
const currentTab = atom<Tab | null>(null, 'currentTab').extend(
  withComputed(() => tabs().at(-1) ?? currentTab())
)
```

### withAsync — async mutations

```typescript
import { action, withAsync, wrap } from '@reatom/core'

const submit = action(async (payload: FormData) => {
  await wrap(fetch('/api/submit', { method: 'POST', body: payload }))
}, 'submit').extend(withAsync())

submit.error()    // Error | undefined (FUNCTION call - it's an atom!)
submit.ready()    // true when not loading
submit.retry()    // retry the action
submit.onFulfill  // action completed successfully
submit.onReject   // action failed
```

To enable `.status()` tracking, pass `{ status: true }`:

```typescript
const submit = action(async (payload: FormData) => {
  await wrap(fetch('/api/submit', { method: 'POST', body: payload }))
}, 'submit').extend(withAsync({ status: true }))

// ⚠️ Call status() first to get the status object, then access properties
const status = submit.status()

// Current state flags (mutually exclusive when settled):
status.isPending        // true while loading
status.isFulfilled      // true after success
status.isRejected       // true after failure (NOT status.error!)
status.isSettled        // true when settled (success or error)

// Historical tracking flags:
status.isFirstPending   // true only for the first-ever pending state (useful for skeleton loading UI)
status.isEverPending    // true after at least one async operation started
status.isEverSettled    // true after at least one operation completed

// ⚠️ status does NOT have .error() — use submit.error() instead!
// status.error  // ❌ doesn't exist
submit.error()  // ✅ Error | undefined

// Reset clears all history flags so next call becomes "first" again:
status.reset()
```

⚠️ **Abort handling**: Aborted operations don't set `isRejected` — the status reverts to the last settled state (fulfilled/rejected) if one exists, otherwise to a "first aborted" state ([`withAsyncStatus.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/core/src/async/withAsyncStatus.ts#L66-L130)).

**Common pattern in components:**

```typescript
const MyComponent = reatomComponent(() => {
  const status = submitAction.status()  // atom getter → status object
  
  return (
    <button disabled={status.isPending}>
      {status.isPending ? 'Loading...' : 'Submit'}
    </button>
  )
})
```

### withSuspense — Suspense integration

```typescript
import { computed, withAsyncData, withSuspense, wrap } from '@reatom/core'

const data = computed(async () => {
  return await wrap(api.getData())
}, 'data').extend(withAsyncData()).extend(withSuspense())

// In a Suspense boundary:
// data.suspended() throws the promise
```

### withRollback / withTransaction — optimistic updates

```typescript
import { action, atom, withAsync, withRollback, withTransaction, wrap } from '@reatom/core'

const todos = atom<Todo[]>([], 'todos').extend(withRollback())

const saveTodo = action(async (todo: Todo) => {
  todos.set(items => [...items, todo])
  const result = await wrap(api.saveTodo(todo))
  return result
}, 'saveTodo').extend(withAsync(), withTransaction())

// On error: todos automatically roll back
// saveTodo.stop() commits and clears rollback queue
```

## Built-in Primitives

```typescript
import {
  reatomBoolean,
  reatomEnum,
  reatomArray,
  reatomMap,
  reatomSet,
  reatomRecord,
  reatomLinkedList,
  reatomNumber,
  reatomString,
} from '@reatom/core'

const isModalOpen = reatomBoolean(false, 'isModalOpen')
isModalOpen.setTrue()
isModalOpen.setFalse()
isModalOpen.toggle()

const priority = reatomEnum(['low', 'medium', 'high'], 'priority')
priority.setHigh()
priority()  // 'high'
```

## Atomization Pattern

Keep immutable structure as plain data, lift mutable fields into atoms.

Keep state transitions in the Reatom model layer (atoms, actions, computeds, hooks/extensions). React components should bind and render atoms, not mirror Reatom state into React state or use lifecycle effects to maintain model invariants.

When a child component reads atoms directly, make that child a `reatomComponent` too. Passing atoms into a plain React component and calling atom getters there can lose Reatom's reactive subscription boundary for that subtree.

```typescript
import { atom, action } from '@reatom/core'

type UserDto = { id: string; name: string }
type UserModel = { id: string; name: Atom<string> }

const users = atom<UserModel[]>([], 'users').extend((target) => ({
  fromDto(dto: UserDto[]) {
    return target.set(dto.map(user => ({
      id: user.id,
      name: atom(user.name, `users#${user.id}.name`),
      remove: action(() => {
        target.set(state => state.filter(u => u.id !== user.id))
      }, `users#${user.id}.remove`),
    })))
  },
}))
```

### Individual Atoms vs. Lenses

When a grouped object has fields that are set or toggled independently, you have two patterns — both avoid identity actions.

**Option A: Standalone atoms** — each field is its own atom, persisted separately.

```typescript
import { atom, computed } from '@reatom/core'

// ❌ Bad — grouped atom + identity actions
const settings = atom({ theme: 'light', notifications: true }, 'settings')
const setTheme = action((t: 'light' | 'dark') => settings.set(s => ({ ...s, theme: t })))

// ✅ Standalone atoms
const themeAtom = atom<'light' | 'dark'>('settings.theme')
const notificationsAtom = atom(true, 'settings.notifications')

themeAtom.set('dark')
notificationsAtom.set(prev => !prev)

// Grouped derived atom if you need the full object for API calls
const settingsObject = computed(() => ({
  theme: themeAtom(),
  notifications: notificationsAtom(),
}), 'settingsObject')
```

**Option B: Lenses** — a single persisted atom with lens atoms that focus into nested properties.

```typescript
import { atom, reatomLens } from '@reatom/core'

const settingsAtom = atom({ theme: 'light', notifications: true }, 'settings')

const themeAtom = reatomLens(settingsAtom, 'theme')
const notificationsAtom = reatomLens(settingsAtom, 'notifications')

themeAtom.set('dark')
notificationsAtom.set(prev => !prev)
```

| | Standalone atoms | Lenses |
|---|---|---|
| **Persistence** | Each atom persists to its own key | One key for the whole snapshot |
| **Reactivity** | Fine-grained — subscribe to one field | Same — lens is an atom |
| **Migration** | Per-key versioning | Single version for the whole object |
| **Code** | More atoms to declare | Fewer atoms, depends on parent |

Both patterns eliminate identity actions. Choose based on whether you want granular persistence keys (standalone) or a single snapshot (lenses).

Naming tips:
- Use `#${ID}` pattern for dynamically created atoms: `goods.list#${id}.addToCart`
- Duplicate structure depth in names: `users.paging.current`
- Use factory pattern: `reatomUser(userDto, 'users' + userDto.id)`

## Forms

### Basic form with Zod v4 schema

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

### React form binding

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

### Form field access patterns

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

## Routing

### Basic routes

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

### Nested routes

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

### Layout routes with render

```typescript
// Layout route — no path, always active, wraps children
const layoutRoute = reatomRoute({
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

### Protected routes — auth guard

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

### Route loaders — data fetching

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

### Route loaders — factory pattern (forms + actions)

Route loaders are the **single source of truth** for all route-specific state. Create forms, actions, and computed atoms **inside** the loader — they get garbage collected when the route unmounts, giving you automatic memory management with global accessibility.

#### Separate routes for create vs edit

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

#### Form factory functions

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

#### Auth redirect in loader

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

#### Pre-fill settings form from persisted atoms

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

#### Component pattern — pull everything from loader

Components should only read from the route loader. Model files contain only shared app-wide state.

```tsx
// ❌ Bad — imports form and actions from model files
import { userForm, saveUserAction } from '../usersModel'

// ✅ Good — everything comes from the route loader
const UserFormPage = reatomComponent(() => {
  const isCreate = userCreateRoute.match()
  const loader = isCreate ? userCreateRoute.loader : userEditRoute.loader

  const ready = loader.ready()
  const data = loader.data()
  const error = loader.error()

  if (!ready) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return null

  const { form, saveUserAction } = data
  const { fields, submit, validation } = form
  const saveStatus = saveUserAction.status()

  return (
    <form onSubmit={(e) => { e.preventDefault(); saveUserAction() }}>
      <input {...bindField(fields.name)} />
      <button disabled={saveStatus.isPending}>Save</button>
    </form>
  )
})
```

#### File organization

```typescript
// routes.ts — all route definitions with loaders (forms, actions, data)
// features/auth/authForm.ts — form factory functions (schemas)
// features/auth/authModel.ts — shared auth state (authState, authToken, isAuthenticated, currentUser)
// features/settings/settingsModel.ts — persisted setting atoms (themeAtom, etc.)
// features/users/usersModel.ts — shared user state (currentPage)
// features/users/pages/UsersPage.tsx — reads from route loaders
// features/users/pages/UserFormPage.tsx — reads from route loaders
```

**Rule of thumb:** If it's specific to a route (form, action, route-scoped data), it lives in the loader. If it's shared across the app (auth state, persisted settings, pagination), it lives in model files.

### Modal gate — state in memory, no URL

```typescript
const confirmModal = protectedRoute.reatomRoute({
  params({ message }) { return message ? { message } : null },
  render(self) { return html`<dialog open>${self().message}</dialog>` },
})
confirmModal.go({ message: 'Sure?' })  // opens
confirmModal.go()                       // closes
```

### Search-only routes

```typescript
const dialogRoute = reatomRoute({
  search: z.object({ dialog: z.enum(['login', 'signup']).optional() }),
})
// At URL: /profile?dialog=login
dialogRoute() // { dialog: 'login' }
// Close: dialogRoute.go({})
```

## Persistence

```typescript
import { atom, withLocalStorage, withSessionStorage, withIndexedDb, withBroadcastChannel } from '@reatom/core'

const theme = atom<Theme>('light', 'theme').extend(withLocalStorage('theme'))
const prefs = atom({}, 'prefs').extend(withSessionStorage('prefs'))
const cache = atom(new Map(), 'cache').extend(withIndexedDb('my-db'))
const crossTab = atom(0, 'crossTab').extend(withBroadcastChannel('sync'))
```

## Async Context — wrap() Rules

`wrap()` preserves async context for actions, effects, computed async bodies, event handlers, and callbacks that read or write atoms after an async boundary. Use it at Reatom boundaries where implicit context matters.

Keep pure API/helper modules framework-agnostic. If a module only wraps `fetch`, parses responses, or transforms data and does not read/write atoms or call Reatom APIs, do **not** add `wrap()` or import `@reatom/core` there. Instead, wrap the promise/callback in the calling Reatom action/computed/effect when needed.

For error handling in async actions, `framePromise()` can replace `try/catch` — it captures errors from subsequent `await wrap()` calls in a single declarative line.

**Good in Reatom code:**
```typescript
const fetchUser = action(async (id: string) => {
  const res = await wrap(fetch(`/api/users/${id}`))
  userAtom.set(await wrap(res.json()))
}, 'fetchUser')

addEventListener('click', wrap(() => doSomethingWithAtoms()))
```

**Good in plain helpers:**
```typescript
// shared/api.ts — no atoms, no Reatom APIs
export async function request<T>(url: string) {
  const res = await fetch(url)
  return (await res.json()) as T
}
```

**Bad:**
```typescript
await wrap(fetch(url)).then(res => res.json())  // chain after wrap
fetch(url).then(res => doSomethingWithAtoms())  // missing wrap around atom work
```

## Testing

```typescript
import { context, mock } from '@reatom/core'

beforeEach(() => context.reset())

test('counter increments', () => {
  counter.set(5)
  expect(doubled()).toBe(10)
})

// Mock an atom/action
const unsub = mock(targetAtom, () => 'mocked-value')
// ... test code ...
unsub()  // restore original
```

## v3 → v1000 Migration

| v3 | v1000 |
|---|---|
| `ctx` parameter | implicit context (no `ctx`) |
| `ctx.schedule(promise)` | `wrap(promise)` |
| `ctx.spy(atom)` | `atom()` |
| `ctx.get(atom)` | `peek(atom)` |
| `atom(ctx, value)` | `atom.set(value)` |
| `atom(callback)` | `computed(callback)` |
| `ctx.spy(atom, cb)` | `ifChanged(atom, cb)` |
| `ctx.spy(action, cb)` | `getCalls(action).forEach(cb)` |
| `reatomAsync(cb)` | `action(cb).extend(withAsync())` |
| `reatomResource(cb)` | `computed(cb).extend(withAsyncData())` |
| `reaction` | `effect` |
| `atom.onChange(cb)` | `atom.extend(withChangeHook(cb))` |
| `onConnect(atom, cb)` | `atom.extend(withConnectHook(cb))` |
| `withConcurrency` | `withAbort` |

## Installation

```bash
npm install @reatom/core @reatom/react  # or your framework adapter
```

## Package Index

| Package | Purpose |
|---|---|
| `@reatom/core` | Core primitives, extensions, forms, routing, persistence, methods (`framePromise`, `peek`, `wrap`, `schedule`, `take`, `memo`, `variable`, `log`, `reatomLens`, `reatomObservable`, `ifChanged`, `getCalls`, `deatomize`, `effect`, `reatomTransaction`, `withRollback`, `withTransaction`) |
| `@reatom/react` | React adapter: `reatomComponent`, `bindField` |
| `@reatom/preact` | Preact adapter |
| `@reatom/vue` | Vue adapter |
| `@reatom/solid-js` | Solid adapter |
| `@reatom/lit` | Lit adapter |
| `@reatom/jsx` | JSX utilities |
| `@reatom/devtools` | DevTools for debugging |
| `@reatom/zod` | Zod v4 integration |
| `@reatom/eslint-plugin` | ESLint rules |
| `@reatom/admin` | Admin dashboard |

### framePromise — Error handling without try/catch

`framePromise()` returns a promise that resolves to the current frame's state (action payload or atom state). Call `.catch()` on it at the top of an async action to capture errors from all subsequent `await wrap()` calls — no try/catch needed.

```typescript
import { action, framePromise, wrap } from '@reatom/core'

// ❌ Before: verbose try/catch
export const processPayment = action(async (orderId: string) => {
  try {
    let order = await wrap(fetchOrder(orderId))
    await wrap(validateInventory(order))
    await wrap(chargeCustomer(order))
    await wrap(updateOrderStatus(order, 'completed'))
    return order
  } catch (error) {
    showErrorNotification(error)
    throw error
  }
})

// ✅ After: clean declarative error handling
export const processPayment = action(async (orderId: string) => {
  framePromise().catch((error) => showErrorNotification(error))

  let order = await wrap(fetchOrder(orderId))
  await wrap(validateInventory(order))
  await wrap(chargeCustomer(order))
  await wrap(updateOrderStatus(order, 'completed'))
  return order
})
```

**Key properties:**
- Call `framePromise()` **before** any `await` — it captures the current frame context
- The `.catch()` handler runs when any subsequent `await wrap()` throws
- **Composes into helper functions** — unlike native `using`, a helper can call `framePromise()` and it binds to the *caller's* frame:

```typescript
let withErrorLogging = () => {
  framePromise().catch((error) => logger.error(error))
}

export const processOrder = action(async (orderId: string) => {
  withErrorLogging() // helper uses the SAME action frame!
  await wrap(fetchOrder(orderId))
})
```
- Accepts an optional `queue` parameter (`'effect'` by default)
- Respects `wrap` and `abortVar` policies — aborted operations don't trigger `.catch()`
- Use `.finally()` for cleanup (resources, loading states, etc.)

Source: [`framePromise.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd8793cd4b00d24311cbc3ef2/packages/core/src/methods/framePromise.ts#L1-L80)

## Key Anti-patterns

- **Manual data fetching** — use `computed` + `withAsyncData` instead of `effect` + `action`
- **Identity actions** — don't create actions that just forward to `atom.set`. Use `atom.set` directly. This includes "setter" and "toggle" actions like `setTheme()`, `toggleNotifications()`, `goToPage()` — replace them with `settingsAtom.set((prev) => ({ ...prev, theme: 'dark' }))` or the equivalent spread in the component.
- **Route component checks** — don't do `if (!route.match()) return null` in components. Use the `render` option.
- **Suspense for dynamic data** — use suspense for global initialization, not page data.
- **Syncing atoms with change hooks** — use `computed` / `withComputed` instead.
- **Module-level forms** — don't define `reatomForm` at module scope. Create forms inside route loaders for automatic lifecycle management and per-route isolation.
- **Single route for create/edit** — don't use `params.id === 'new'` conditional logic inside one route. Use separate routes (`userCreateRoute` with path `'new'`, `userEditRoute` with path `:id/edit`) for clean lifecycle management.
- **Actions in model files** — don't define `saveUserAction`, `loginAction`, etc. in model files. Create actions inside route loaders where they belong.
- **`ifChanged` on atoms** — `ifChanged` is not available on atoms. Use `computed` / `withComputed` for derived state, or read atom values directly in loaders.

## Common Pitfalls

### TypeScript Types
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
- **Validation error `.field` is the atom reference, not a name string** — compare by reference: `e.field === form.fields.email`

### Routing
- `reatomRoute()` with no arguments throws an error — use `reatomRoute('')` for the root route
- Paths must NOT start with `/` — Reatom auto-prepends it
- `reatomRoute.go('/path')` is wrong — use `route.go()` or `route.go({ param: 'val' })`
- `urlAtom()` returns a `URL` object, not a string — use `urlAtom().pathname`
- **Never** use `urlAtom().startsWith()` — use `route.match()` instead
- Use `route.match()` to check if current URL matches a route pattern
- Use `route.exact()` to check for exact match (no children active)
- **Loader returns `null` to block the route** — return `null` from an auth loader to redirect already-logged-in users (the component receives `null` and shows loading/redirect)
- **Separate routes for create vs edit** — don't use a single route with `params.id === 'new'` conditional logic. Use `userCreateRoute` (path `'new'`) and `userEditRoute` (path `:id/edit`) as separate routes with separate loaders.
- **No `memo()` needed for route state** — separate routes handle lifecycle naturally. Don't use `memo()` to stabilize form creation across route parameter changes.
- **Form factories for schema reuse** — extract `createLoginForm()`, `createRegisterForm()` etc. into separate files when schemas are shared across multiple route loaders.
- **Actions belong in loaders** — don't define `saveUserAction`, `loginAction`, `deleteUserAction` in model files. Create them inside route loaders where they have access to their form instance.

### Forms
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

### React
- Do not use React `useEffect`/`useState` to synchronize or mutate Reatom model state. Put state transitions in atoms, actions, computeds, or Reatom hooks/extensions; React should render and bind atoms, not own Reatom invariants.
- Components that call atom getters must be wrapped with `reatomComponent`; this applies to extracted child/row components as well as page-level components.
- **`@reatom/react` does NOT support React StrictMode yet** — in development, StrictMode double-mounts components, which breaks Reatom's abort controller and implicit stack mechanism. This causes `AbortError: Component unmount` or actions executing twice on first click ([`reatomAbstractRender.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/core/src/reatomAbstractRender.ts#L97), [`reatomComponent.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/react/src/reatomComponent.ts#L122)). The fix is tracked in v1001 (not yet released). **Workaround**: Disable StrictMode in dev or use `clearStack()` at app bootstrap.

### Async
- **`status` is disabled by default on BOTH `withAsync` and `withAsyncData`** — pass `{ status: true }` to enable, otherwise accessing `.status()` throws a `ReatomError` ([`withAsync.ts`](https://github.com/reatom/reatom/blob/dec84cc80804023bd4b00d24311cbc3ef2/packages/core/src/async/withAsync.ts#L18-L22))
- `status.error` does NOT exist — use `submit.error()` (the action's error atom)
- `status.isPending` is a property — use `status.isPending` not `status.isLoading()`
- `status.isRejected` — use this instead of trying to access error from status
- `withAsyncData` atoms: `.data()`, `.ready()`, `.error()` are atom getters — call them!
- Reference atoms directly in action closures — do NOT pass atoms as action parameters. Atoms are singletons accessible in the same module scope:
  ```typescript
  // ❌ Don't pass atoms as action params
  const saveAction = action(async (token: typeof authToken, list: typeof usersList) => { ... })
  saveAction(authToken, usersList)

  // ✅ Reference atoms directly in the closure
  const saveAction = action(async () => {
    const t = authToken()  // atom is in scope
    usersList.retry()     // atom is in scope
  })
  saveAction()  // no atom args needed
  ```
- `computed(async () => ...).extend(withAsyncData())` — call `.data()` on the ATOM, NOT on the atom's value. `atom.data()` ✅ not `atom().data()` ❌
