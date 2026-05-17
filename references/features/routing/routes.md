# Routing Reference — Core API

> Loaders, data fetching, and factory patterns are split out into [`./loaders.md`](./loaders.md).
>
> Source: [`packages/core/src/routing`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/routing) plus [`packages/core/src/web/url.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/url.ts). Per-section source links inline below.

## Table of contents

- [Basic routes](#basic-routes)
- [Nested routes](#nested-routes)
- [Layout routes with render (v1001+ semantics)](#layout-routes-with-render-v1001-semantics)
- [Avoid route/component import cycles](#avoid-routecomponent-import-cycles)
- [Protected routes - auth guard](#protected-routes---auth-guard)
- [Dynamic route collisions with literal siblings](#dynamic-route-collisions-with-literal-siblings)
  - [Parent params and child schemas](#parent-params-and-child-schemas)
- [Modal gate - state in memory, no URL](#modal-gate---state-in-memory-no-url)
- [Search-only routes](#search-only-routes)
  - [Route search schemas vs withSearchParams](#route-search-schemas-vs-withsearchparams)
- [URL codecs (v1001+)](#url-codecs-v1001)
- [Relative navigation (v1001+)](#relative-navigation-v1001)
- [urlAtom and global state](#urlatom-and-global-state)
  - [Default redirect with urlAtom.extend(withChangeHook(...))](#default-redirect-with-urlatomextendwithchangehook)

## Basic routes

[`reatomRoute` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.test.browser.ts)


```typescript
import { reatomRoute, urlAtom, wrap } from '@reatom/core'
import { z } from 'zod/v4'

// Root route - empty string matches any URL
const rootRoute = reatomRoute('')

// String path - NO leading slash (auto-prepended)
const userRoute = reatomRoute('users/:userId')
userRoute()           // { userId: '123' } | null
userRoute.exact()     // true only for /users/123
userRoute.match()     // true for /users/123/anything
// ⚠️ .go() takes a params object (plus optional replace boolean), NOT a path string!
// ❌ loginRoute.go('/login')  // Type error; routes build their own path
// ✅ route.go() with no args for simple routes:
loginRoute.go()
// ✅ route.go({ param: 'value' }) for routes with params:
userDetailRoute.go({ id: '123' })
// ✅ Build URL without navigating:
const userUrl = userDetailRoute.path({ id: '123' })  // '/users/123'
userRoute.path({ userId: '123' }) // build URL without navigating

// Object config - path, search params
const goodsRoute = reatomRoute({
  path: 'goods/:category',
  search: z.object({ sort: z.enum(['asc', 'desc']).optional() }),
})
goodsRoute.go({ category: 'tech', sort: 'asc' })  // /goods/tech?sort=asc

// ⚠️ Routes with `search` often still want an explicit object on `.go(...)`,
// even when the search schema has defaults. Treat navigation as writing a URL
// shape, not as "the route will fill everything in for me".
const tasksRoute = reatomRoute({
  path: 'tasks',
  search: z.object({ q: z.string().default(''), status: z.enum(['all', 'open']).default('all') }),
})
tasksRoute.go({ q: '', status: 'all' })

// Current URL - urlAtom() returns a URL OBJECT, not a string!
const url = urlAtom()
url.pathname  // '/users/123'
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

[`layout` option in `route.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts#L237) · [Type docs in `route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts#L222)


Routes define `render` for framework-agnostic component composition. `render(self)` receives the route: `self()` for params (non-null inside render), `self.loader` for loader data, `self.outlet()` for matched child output.

**Important shape rules:**
- `render` is a route **option**, not a settable property. Pass it inside `reatomRoute({ render: (self) => ... })`. After construction, `route.render` is a `Computed<RouteChild | null>` that returns the rendered output — it is not a function slot you can assign to. If you need to keep components in different files, co-locate the route definition with its render or thread the component through a closure passed to a route factory.
- `self.outlet()` returns `RouteChild[]` (an array, possibly empty), not a single child. Render via `<>{self.outlet()}</>`, `self.outlet().map(...)`, or your framework's spread equivalent.
- The root element returned from every route `render` should have a **static key** (for example `key="users-page"`). Parent routes render children as an outlet array, so framework reconcilers need a stable per-route identity. Do not derive this key from params/search unless you intentionally want remount-on-identity-change behavior.
- `RouteChild` is an empty interface intended for declaration merging; declare it once per app to your framework's element type. See the corresponding integration reference for the exact pattern.

Two kinds of routes in **v1001+**:
- **Layout routes** (`layout: true`) - render on any match, use `self.outlet()` to wrap child content. Use for shells, sidebars, protection layers.
- **Page routes** (default) - render only on exact match. When a child is active, the page steps aside and its content bubbles up to the nearest layout's `outlet()`.

For navigation highlighting, choose the predicate that matches the UX:
- use `route.match()` for sections that should stay active while descendants are open
- use `route.exact()` for index/home items (`path: ''`) or pages that should only be active on their exact URL

An index route under a layout commonly matches descendant URLs for route activity/loader purposes, so using `match()` for its nav item can make both the index item and a child item active. Pair `exact()` active state with the index-loader guard described in [`loaders.md`](./loaders.md#index-child-loaders-under-layout-routes) when the index loader should only run on the parent URL.

**v1000 migration note:** there is no `layout` option. A route with `render` behaves like a layout by default (`match()`); add `exactRender: true` for exact/page behavior. When migrating v1000 → v1001, add `layout: true` to old wrapper routes and remove `exactRender: true` from old page routes.

```typescript
// Layout route - always active, wraps children
const layoutRoute = reatomRoute({
  layout: true,
  render({ outlet }) {
    return <div key="app-layout"><header>App</header><main>{outlet()}</main></div>
  },
})

// Child route with path
const aboutRoute = layoutRoute.reatomRoute({
  path: 'about',
  render() {
    return <h1 key="about-page">About</h1>
  },
})

// ✅ Use route.match() to check current route in components
const isUsersPage = computed(() => usersRoute.match())
const isUserDetailPage = computed(() => userDetailRoute.match())

// ✅ Navigate with route.go() - NEVER with string paths
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

## Avoid route/component import cycles

Routes are singleton atoms/computeds, so treat the route tree as the owner of navigation knowledge. It is fine for a route module to import a layout or page component in its `render`, and that is usually the desired boundary: route modules orchestrate matching, guards, loader state, retries, outlets, and navigation config; components render the substantial UI. Avoid the reverse direction: layout/page/list components should not import route singletons from the same route module when that route module already imports those components. In ESM this can create temporal-dead-zone runtime failures, not just a static design smell.

Prefer one of these shapes:

1. **Pass navigation config from the route layer into components.** Build nav items, active predicates, and `go` callbacks next to the routes, then pass them through `render(self)`.
2. **Precompute entity `href`s in loaders/models.** List/detail loaders already know the route params and loaded entity IDs; add `href` fields to returned view models so components render plain links without importing routes.
3. **Pass path-builder functions down when the component needs lazy construction.** Wrap `route.path(...)` in a small function created in the route/model layer, then pass that function to the component.
4. **Co-locate mutually-referencing routes in a composition-root module.** If two guards or redirects need each other's route singletons, keep those core routes together and let feature-specific child routes import from that shared parent one-way.
5. **Extract route-neutral component config.** If a component and a route both need labels/icons/columns, move that static data to a module that imports neither routes nor components.

```typescript
const itemsRoute = rootRoute.reatomRoute({ path: 'items', layout: true })
const itemRoute = itemsRoute.reatomRoute({ path: ':itemId' })

const itemsIndexRoute = itemsRoute.reatomRoute({
  path: '',
  async loader() {
    const items = await wrap(api.listItems())
    return {
      items: items.map((item) => ({
        ...item,
        href: itemRoute.path({ itemId: item.id }),
      })),
      itemHref: (itemId: string) => itemRoute.path({ itemId }),
    }
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFulfilled) return <ItemsPage model={status.data} />
    return <PageSkeleton />
  },
})

// The component receives plain strings/functions; it does not import routes.
function ItemsPage({ model }: { model: { items: Array<Item & { href: string }>; itemHref: (id: string) => string } }) {
  return <ItemTable rows={model.items} getItemHref={model.itemHref} />
}
```

Use the same pattern for shells/sidebar navigation: create route-derived items where the routes are defined and pass them into the layout. This keeps UI modules reusable and prevents route modules and component modules from initializing each other in a cycle.

## Protected routes - auth guard

Protected routes use a `params()` callback that returns `null` to block the route and all descendants before their render/loaders are exposed. The callback is reactive (it reruns when read atoms change), so it fits auth, roles, feature flags, and wizards. Use the same guard pattern for public pages that should be unavailable in a given state, such as redirecting away from sign-in when a session already exists; keeping the redirect in `params()` keeps loaders concrete.

Redirects inside `params()` must be **idempotent** because `params()` is part of route matching and reruns whenever the atoms it reads change. Before calling `.go(..., true)`, first prove that this guard owns the current URL and that the target route is not already active. Use `!targetRoute.match()` for ordinary cases, or a stricter URL/predicate check when the guard is broad.

For auth redirects, pass `true` as the second `.go()` argument when you want `history.replaceState` semantics. This avoids leaving blocked/private URLs or transient login URLs in the browser history.

When a public-only route and a private/default route redirect to each other, prefer keeping those core routes in the same composition-root module so both sides can continue using typed `.go()` calls. Treat `urlAtom.go('/some/path')` as a low-level primitive, not as the default escape hatch for application navigation.

Be careful with guard routes that omit `path`. In Reatom, omitting `path` means the route contributes no URL segment and can match as broadly as its parent; this is useful for cross-cutting layouts, but dangerous for auth redirects because the guard can observe public sibling routes too. Prefer a real private path segment when the product has a private area, or explicitly exempt public URLs before redirecting. If you mean "index page only", use `path: ''` plus an exact/pathname guard instead of omitting `path`.

```typescript
// The `params` function enables protected routes:
// - Return null to block the route (and all children)
// - Return an object to inject derived parameters
// - Call .go(params, true) inside params for redirects that should replace history
// - Guard .go() with ownership + !targetRoute.match() so params() is idempotent

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
      if (!loginRoute.match()) loginRoute.go(undefined, true)
      return null  // blocks this route and all children
    }

    const userData = user.data()
    // Token exists, so user.ready() represents the real /api/me request.
    if (!userData) {
      if (user.ready() && !loginRoute.match()) loginRoute.go(undefined, true)
      return null
    }
    // Already logged in but on a public-only route: move to the allowed default.
    // The source-route check documents that this broad guard can observe public siblings;
    // the target-route check keeps the redirect idempotent.
    if (loginRoute.match() && !defaultPrivateRoute.match()) {
      defaultPrivateRoute.go(undefined, true)
    }
    // Inject user data as params for child routes
    return { userId: userData.id, role: userData.role }
  },
  render(self) { return self.outlet() },
})

const defaultPrivateRoute = protectedRoute.reatomRoute({
  path: 'dashboard',
  render(self) {
    const params = self()
    // params has { userId, role } from parent
    return html`<h1>Hello, ${params.userId}</h1>`
  },
})
```

## Dynamic route collisions with literal siblings

[Security tests demonstrating the issue: `route.security.test.browser.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.security.test.browser.ts)


Reatom route matching is pattern-based. A literal route and a dynamic route at the same level can both match the same URL segment:

```typescript
const projectCreateRoute = projectsRoute.reatomRoute({ path: 'new' })
const projectDetailRoute = projectsRoute.reatomRoute({ path: ':projectId' })
// /projects/new matches both unless :projectId rejects "new"
```

This is not just a rendering issue. If both routes match, both can appear in `outlet()` and the dynamic route loader can run with `projectId === 'new'`, often producing a confusing "not found" error below the intended page. Do not fix this by rendering only `outlet().at(0)` - that hides the duplicate match while the wrong route may still be active.

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

Shape the schema to your actual ID format - the broader the `z.string()`, the more likely it collides with a literal sibling:

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
      loginRoute.go(undefined, true)
      return null
    }
    return {} // guard only; don't inject unrelated params
  },
})
```

Inject parent params only when descendants genuinely need those values as route params.

## Modal gate - state in memory, no URL

```typescript
const confirmModal = protectedRoute.reatomRoute({
  params({ message }) { return message ? { message } : null },
  render(self) { return html`<dialog open>${self().message}</dialog>` },
})
confirmModal.go({ message: 'Sure?' })  // opens
confirmModal.go()                       // closes
```

## Search-only routes

[`searchParamsAtom` / `withSearchParams` source](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/searchParams.ts)


```typescript
const dialogRoute = reatomRoute({
  search: z.object({ dialog: z.enum(['login', 'signup']).optional() }),
})
// At URL: /profile?dialog=login
dialogRoute() // { dialog: 'login' }
// Close: dialogRoute.go({})
```

### Route search schemas vs withSearchParams

Route `search` schemas and `withSearchParams` both sync state to URL query params, but serve different purposes:

- **Route `search` schemas** — params that define route state, feed into loaders, and are part of route navigation. They are validated, typed, and scoped to the route lifecycle. Use when the param affects what data the page loads.

- **`withSearchParams`** — standalone atoms that persist to the URL without being tied to a specific route. Use for UI state (filters, tabs, expanded sections, panel sizes) that multiple independent components read/write. See [persistence reference](persistence.md#url-search-params--withsearchparams) for the full API.

For route `params`/`search`, start with a Standard Schema. It is the clearest default for inbound URL validation, defaults, and one-way parsing before the loader runs. Keep the boundary explicit: Standard Schema can give the loader parsed values, while navigation/path-building should remain URL-shaped (strings or omitted query keys) unless you deliberately add a bidirectional contract. When only a few call sites need conveniences like stringifying numbers or omitting defaults, use a small helper that builds URL-shaped params. Reach for a v1001 codec when the route itself should expose a typed outbound contract — `route.go()` / `.path()` accepting decoded domain values — or when URL serialization needs to be centralized and bidirectional.

```typescript
// ✅ Route search — affects loader data
const usersRoute = reatomRoute({
  path: 'users',
  search: z.object({
    q: z.string().default(''),
    page: z.string().regex(/^\d+$/).transform(Number).default(1),
  }),
  async loader({ q, page }) {
    /* page is a number here */
    /* fetch with q + page */
  },
})

// ✅ withSearchParams — standalone UI state, no loader involvement
const sidebarCollapsed = atom(false, 'sidebar').extend(
  withSearchParams('sidebar', {
    parse: (v) => v === '1',
    serialize: (v) => (v ? '1' : undefined),
  }),
)
```

## URL codecs (v1001+)

[`Codec` interface in `route.types.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.types.ts) · [Tests: `route.codec.test.browser.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.codec.test.browser.ts)


v1001 adds bidirectional codecs for route params/search. A codec is a route-level serialization contract: `decode` reads raw URL strings into typed values, `encode` writes typed values back to URL-safe strings, and `route.go()` / `route.path()` accept the decoded/output types.

Use codecs when that bidirectionality is part of the route's public API, not just because a loader wants parsed data. Good fits include numeric IDs that navigation should pass as numbers, structured values encoded into one path segment, dates with a canonical URL format, or search params where many call sites should navigate with domain values while one central encoder controls default omission and serialization. If a Standard Schema can validate/parse the inbound URL and call sites can pass URL-shaped params, keep the simpler Standard Schema form.

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

[`route.go.relative` in `route.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/route.ts#L537)


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

[Source: `web/url.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/web/url.ts)


`urlAtom()` reads the current `URL` object, `urlAtom.catchLinks(false)` disables SPA link interception, `urlAtom.routes` is a registry of all created routes, and `isSomeLoaderPending` tracks global loading state across all route loaders.

Prefer `someRoute.go(...)` / `someRoute.path(...)` for ordinary application navigation. Reach for `urlAtom.go(...)` or `urlAtom.set(...)` only when the task is truly URL-level: tests, boot/default URL normalization, integration with another router/history owner, or raw URL manipulation that is not naturally owned by one route singleton.

### Default redirect with urlAtom.extend(withChangeHook(...))

A common pattern is redirecting the root URL to a default page. Use `urlAtom.extend(withChangeHook(...))` at module scope (typically in the app entry file) to watch every URL change and redirect when needed. In apps with auth, onboarding, tenant selection, or feature gates, the "default page" is conditional — do not blindly redirect `/` to a private page and rely on a later guard to recover.

```typescript
// App.tsx (or app entry file)
import { urlAtom, withChangeHook } from '@reatom/core'
import { signInRoute, defaultPrivateRoute } from '#shared/router'
import { hasAccessToPrivateArea } from '#shared/session'

// Redirect root URL to the appropriate default page.
// Uses replace (second arg `true`) so the root URL doesn't appear in browser history.
urlAtom.extend(
  withChangeHook((url) => {
    // For global root redirects, prefer the concrete URL pathname over a route
    // predicate. A root route with no explicit path/no segments reports `exact`
    // broadly by design, and layout predicates can be shaped by the route tree.
    if (url.pathname !== '/') return

    if (hasAccessToPrivateArea()) {
      if (!defaultPrivateRoute.match()) defaultPrivateRoute.go(undefined, true)
    } else {
      if (!signInRoute.match()) signInRoute.go(undefined, true)
    }
  }),
)
```

Key details:
- `urlAtom.extend(...)` at module scope is a **deliberate declaration-time side effect** — it attaches middleware once when the module loads and persists for the app lifetime. The middleware does not run until `urlAtom` changes, which makes it appropriate for app-level routing setup.
- Use `.go(undefined, true)` (replace) so the redirect doesn't create a history entry — the back button skips the root and goes to whatever was before.
- For global redirects from `/`, prefer checking the concrete `url.pathname === '/'` from the `withChangeHook` callback. A route predicate such as `rootRoute.exact()` can be shaped by the route tree; in the current source, a root route with no explicit path/no segments reports `exact` as true broadly, so it is not the same as a raw pathname check.
- Make default redirects state-aware. If the default target depends on auth or setup state, branch before navigating instead of causing `/` → private page → public page cascades.
- Redirects from URL reactions and route guards should be idempotent: check the target route before calling `.go()`.
- Do not replace this with a top-level `effect()` or a `start*Effects()` boot helper. `effect()` subscribes immediately and needs an active reactive frame after `clearStack()`; a source-attached `withChangeHook` models the app-lifetime URL reaction without a separate activation step.
- This same pattern works for other URL-source reactions such as navigation analytics or scroll restoration. Keep purely imperative one-shot work in the action that causes it; only store an event in an atom when other code actually reads that state.

