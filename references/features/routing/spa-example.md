# Routing Reference — Full SPA Example

> Core routing API in [`./index.md`](./index.md). Loader patterns in [`./loaders.md`](./loaders.md).
>
> See [`reatom/examples/`](https://github.com/reatom/reatom/tree/v1001/examples) for full working SPA examples.

## Full SPA example

Recommended greenfield app entry (import before route/model files):

```ts
// setup.ts - import this file before other app modules in the repo root.
// clearStack() is optional by design, but recommended for new apps that want
// explicit context isolation and loud failures for work outside the app frame.
import { clearStack, context } from '@reatom/core'

clearStack()                    // opt into strict explicit context
export const rootFrame = context.start()  // create isolated app frame

// Optional: dev logging
// if (import.meta.env.MODE === 'development') rootFrame.run(connectLogger)
```

Routes:

```ts
// routes.ts
import { atom, computed, reatomRoute, withAsyncData, wrap } from '@reatom/core'
import { z } from 'zod/v4'

type User = { id: string; name: string; role: string }

// layout - no path, always active, renders outlet
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

// protected route - blocks all children when not authenticated
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
    const status = self.loader.status()
    if (status.isFirstPending) return html`Loading users...`
    // Keep stale data visible during background refresh (search param changes, retry, etc.).
    // Without this guard, typing in a search input would unmount the page.
    if (status.isPending && status.isEverSettled) {
      return html`<ul>${status.data.items.map(
        (u: User) => html`<li>${u.name}</li>`
      )}</ul>`
    }
    if (status.isFulfilled) {
      return html`<ul>${status.data.items.map(
        (u: User) => html`<li>${u.name}</li>`
      )}</ul>`
    }
    return html`Loading...`
  },
})
```
