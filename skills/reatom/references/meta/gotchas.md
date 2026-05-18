# Gotchas and Architectural Smells

> Load this before editing code in an area that looks fragile, or when debugging behavior that feels surprising.

## High-priority Gotchas

If user follow-up reveals wrong Reatom guidance, prefer the sibling `reatom-feedback-loop` skill after fixing the task.

Keep this section as the always-loaded warning list. For detail, read the linked reference before implementing that area.

### Async, lifecycle, build

- `status` is disabled by default on `withAsync` / `withAsyncData`; pass `{ status: true }` before calling `.status()`. For form submit UI, default to `.ready()`, `.pending()`, and `.error()` unless the submit action was explicitly extended with status.
- Async helper atoms are atom getters: call `.data()`, `.ready()`, `.error()`, `submit.error()`. Do not destructure them into inert values.
- `status.isPending` and friends are properties, not functions. `status.error` does not exist; use the target's `.error()` atom.
- `withAsyncData` overload trap: when using `initState`, let TypeScript infer from `initState` or annotate the value; do not force a generic that selects the no-`initState` overload.
- Reference atoms from action closures instead of passing atom objects as action parameters.
- `wrap()` belongs around async boundaries that touch atoms, not inside plain API helpers. ES2017+ native async/await output is required: if TS/bundler/test targets downlevel async/await to `.then()` chains, context propagation can break with `missing async stack`.
- In strict-context apps, every handwritten UI callback that reads/writes atoms or calls Reatom actions must be wrapped. Third-party controls often provide raw-value callbacks, so they are not covered by adapter helpers like `bindField`.
- For debugging, enable `connectLogger()` in the earliest development setup import and use the built-in `log` action (`LOG(...)`) for traceable debug points. Guard logger setup to development so production output stays clean, and keep the setup side-effect import first so import sorters do not break strict bootstrap order.
- `@reatom/core` is effectively a singleton (`STACK` and global runtime state). After package updates or impossible type/runtime errors, check for duplicate installed copies and dedupe all `@reatom/*` packages.
- A draft that introduces an explicit `ctx` parameter, `ctx.spy(...)`, `ctx.schedule(...)`, `ctx.get(...)`, or other v3-style imperative context APIs into ordinary v1000+ app code is wrong by default. Treat that as a self-check failure: reread this skill and validate the needed v1000+ primitive from source before continuing.
- Reatom-managed `effect`, `computed`, subscriptions, aborts, and async work are cleaned up by the reactive context. Return cleanup from `withConnectHook` only when the connected work is not already lifecycle-managed. Non-Reatom resources such as DOM listeners, WebSockets, and other imperative registrations clearly need cleanup. Low-level hook/middleware installers that mutate a target outside the reactive subscription graph need cleanup too, because Reatom cannot infer their disconnect lifecycle. Do not return cleanup handles for already-managed reactive subscriptions just to re-clean them.

### Routing

Read [`references/features/routing/routes.md`](references/features/routing/routes.md) and [`references/features/routing/loaders.md`](references/features/routing/loaders.md) before changing routes or loaders.

- `render` is a route option; after construction `route.render` is a computed output, not an assignable callback. If the route module writes JSX inline inside `render`, the file should use a JSX-capable extension (`.tsx` / `.jsx`).
- `RouteChild` needs one framework declaration merge, and `outlet()` returns `RouteChild[]`.
- The root element returned from each route `render` should have a static `key` because parent routes render child outputs as an outlet array. Keep it stable per route; only use params/search in the key when an intentional remount is desired.
- Route paths have no leading `/`; use `reatomRoute('')` for root; `route.go()` takes params (or nothing), not a path string.
- v1001 render semantics: `layout: true` for wrapper routes; page routes are exact-by-default. v1000 uses match-by-default plus `exactRender: true` for pages.
- Loader takes one merged params/search object; `(params, search)` is wrong and the second arg is `undefined`. Handle loader/resource state orchestration in `render(self)` with `.status()`, then pass typed data/model props to route-neutral components instead of passing the loader or inlining full page UI.
- Use the full status model for UX-sensitive async: `isFirstPending` for first skeleton, `isPending && isEverSettled` for stale refresh, `isFulfilled` for narrowed data, `isRejected` for errors. Successful empty collections are fulfilled states too — render intentional empty-state UI rather than an empty table/list/card. `.ready()` is too lossy for route loaders.
- During stale-while-refresh, `status.data` may intentionally be the previous fulfilled loader payload. Keep settled content visible, including empty-state UI when the settled collection is empty; do not bind high-frequency controlled inputs to stale loader payload fields. Use a dedicated atom (often synced with `withSearchParams`) and let the loader read route search for fetching.
- Separate stale-refresh from identity changes: same list/search identity may keep stale UI; `:id` switches should usually block at a parent identity loader and let children derive scoped models from `await wrap(parentRoute.loader())`.
- Auth/redirect/feature-gate decisions belong in `params()` / parent guards, not nullable loader returns.
- Redirects inside reactive guards (`params()`, URL hooks) must be idempotent: before `.go(..., true)`, prove the guard owns the current URL and check that the target route is not already active. Routes that omit `path` inherit the parent's URL scope, so auth/layout guards can observe public siblings unless you explicitly exclude them.
- Root/default redirects must be state-aware. In auth/onboarding apps, branch to the allowed default target directly; do not blindly redirect `/` to a private page and rely on another guard to bounce back. The safest universal check in a `urlAtom` change hook is the concrete pathname (`url.pathname === '/'`). A pathless root route can report `exact()` broadly by design, while an explicit empty-path root route behaves as expected; when in doubt, prefer the raw pathname check because it is independent of route-shape subtleties.
- Dynamic params near literal siblings need constrained schemas; do not hide collisions with `outlet().at(0)` because the wrong loader can still run.
- Guard index child loaders under layout routes: v1001 page `render` is exact-by-default, but loaders follow route matching and a `{ path: '' }` child can match descendants.
- Avoid route/layout import cycles. A route module may import a layout or shell component to render it, but that layout/shell should not import the same route singletons back for navigation state. Pass route-derived navigation items/actions down from the route module, or extract route-neutral view config, so ESM initialization cannot hit temporal-dead-zone runtime errors. For entity links, precompute `href` strings in loaders/models and pass them to components. When a component needs lazy link construction, wrap `route.path(...)` behind small functions created in the route/model layer and pass those functions down instead of importing routes in the component layer. If two core routes genuinely need each other for redirects/guards, co-locate them in the same composition-root module rather than falling back to string-based `urlAtom.go(...)` navigation.
- `urlAtom()` returns a `URL` object; use `urlAtom().pathname`, never `urlAtom().startsWith(...)`. Use `route.match()` for route checks.
- For an index route (`path: ''`) under a layout, prefer `route.exact()` for active navigation state. `match()` can stay true for descendants, making both the index item and a child item appear active.
- Default redirects are source-attached URL reactions: register `urlAtom.extend(withChangeHook(...))` at module scope. Do not replace it with top-level `effect()` or boot-only `start*Effects()`.
- Use `retryComputed(self.loader)` for retry buttons; distinguish stale refresh from identity changes. After a successful mutation, remember that a loader whose params/search did not change may keep its cached payload; explicitly invalidate or retry it when the UI should refresh in place.

### Forms

Read [`references/features/forms.md`](references/features/forms.md) for field APIs, validation, and factories.

- `reatomForm` belongs in route/scoped factories, not as a shared module-level singleton for route-bound data. But route ownership follows product behavior: choose the route boundary from URL/history/state-lifetime semantics before deciding which loader creates the form.
- `bindField` is event-shaped; wire controls like `<select>` manually with `field.change(value)` and wrap handwritten handlers under `clearStack()`.
- Prefer `field.value()` / `field.change(v)` for user-facing values; `field()` is the underlying state.
- `field.validation().error` is the single-field first-error message (a string); `form.validation().errors` is the structured list across all fields. Form-level `validation()` does not have an `.error` property — only individual fields do.
- `form()` returns field values; there is no `form.getValues()`.
- `form.submit.error` is an atom getter; call it (`form.submit.error()` / `submit.error()`), don't render the atom object.
- Put submit mutations in `reatomForm({ onSubmit })` and call `form.submit()`. Separate actions that call `api.save(form())` bypass submit validation unless they explicitly trigger it; semantic commands should wrap/alias `form.submit()` rather than creating a second raw-value submit path.
- Default to inline form creation in the loader when route lifetime and post-submit behavior are part of the same local story. If a form is large enough to extract into its own factory file, keep the factory focused on fields/validation/core mutation and attach route-specific retry, navigation, or focus behavior from the consuming loader via `form.submit.onFulfill` / `form.submit.onReject` hooks.
- `form.submit()` returns the `onSubmit` result, useful for one-shot navigation/toast/focus without module-level subscriptions.
- Do not reset route-loader-created forms just for cleanup when successful submit navigates away; the route lifecycle disposes them. Reset only when staying in the same form lifetime and intentionally preparing another entry/cancel/restart.
- `ifChanged` is not available on atoms; use `computed` / `withComputed` for derived state.

### React and TypeScript

Read [`references/integrations/react.md`](references/integrations/react.md) for StrictMode and consumption patterns.

- Reatom leans heavily on TypeScript inference, so unsafe typing should be treated as architecture debt rather than a harmless shortcut.
- Do not introduce `any` into the codebase. Keep `no-explicit-any` enforced and avoid silencing it just to push a change through.
- Avoid unsafe assertions when a better type model can express the contract: broad `as` casts, double-casts (`as unknown as T`), and casual non-null assertions (`!`) usually hide missing guards or unclear data flow. Prefer parsers, guards, local narrowing, explicit unions, and helper types.
- Prefer `satisfies` for declarative objects and configuration-like shapes when you want conformance checks without throwing away inference.
- Treat React as a rendering adapter. React-owned domain state/effects are an architectural smell, but React hooks are fine for view-only DOM glue and memoization.
- Prefer `reatomComponent`; `useAtom` / `useAction` are valid when matching an existing hook-style codebase. Components that call atom getters must be `reatomComponent`; this includes root components, extracted child/row helpers, and navigation items, not just obvious page components. `useAtom`-based components do not need that wrapper because the hook manages subscription.
- Do not call `wrap(...)` directly in JSX of a plain function component under strict setup. `wrap()` captures the current Reatom frame at call time, so create wrapped callbacks inside `reatomComponent` (or another reactive caller), or pass pre-wrapped callbacks down as props. Treat `const handler = wrap(...)` inside a plain component render as the same mistake.
- Do not gate first-render boot/auth solely on `.ready()` from an async atom that may resolve immediately before `reatomComponent` subscribes. Use a synchronous source (persisted token, URL, route params, explicit init atom) for initial branching.
- Passing atoms as props is recommended for reusable components; avoiding atom props is a Redux intuition, not a Reatom rule.
- v1001 `reatomComponent` defaults `abortOnUnmount: false`; v1000 can throw `AbortError: Component unmount` in React StrictMode, so either disable StrictMode for v1000 or use strict context setup. Set `{ abortOnUnmount: true }` only when v1000-style cancellation is wanted.
- Capture atom getter results once for TypeScript narrowing; repeated calls break narrowing.
- `Action` type does not include extension-added `.status()`; define a local extended interface when needed. `ReatomForm` is not exported; type forms inline from the returned value.

### Storybook

Read [`references/integrations/storybook.md`](references/integrations/storybook.md) when the user wants isolated component work, routed story scenarios, visual review, or browser-driven interaction tests.

- For from-scratch app bootstraps, treat Storybook as part of the runtime validation harness, not as optional decoration. After the app is verified, it is reasonable to offer cleanup if the user wants a leaner setup.
- Every story should get a fresh Reatom frame via `context.start()` so atoms, route registrations, subscriptions, and async work do not leak between stories.
- If the project uses strict context setup, load that setup before story modules that create atoms.
- Routed stories need explicit URL ownership. Storybook owns the iframe URL, so routed story harnesses should usually keep Reatom routing internal to the story frame and stub outward sync with `urlAtom.sync.set(() => noop)`.
- MSW is optional. Use it only for stories that actually perform requests, and prefer stable default handlers with small per-story overrides.
- Keep component stories small and focused; use integration stories only when routing, loaders, or larger app flows are the thing being tested.
- If stories run as browser tests, keep viewport and setup hooks aligned so the visible canvas and CI run exercise the same scenario.
- If using MSW, regenerate `mockServiceWorker.js` after `msw` version bumps.

## Package Index

Full table, deprecation list, and `jsrepo` reusables system live in [`references/meta/packages.md`](references/meta/packages.md) and [`references/meta/reusables.md`](references/meta/reusables.md). The usual install is `@reatom/core` plus one adapter (`@reatom/react`, `@reatom/jsx`, `@reatom/vue`, `@reatom/solid-js`, `@reatom/preact`, or `@reatom/lit`).

> **Do not install** v3 packages (`@reatom/hooks`, `@reatom/async`, `@reatom/persist*`, `@reatom/form`, `@reatom/url`, `@reatom/timer`, `@reatom/lens`, `@reatom/undo`, `@reatom/primitives`, `@reatom/npm-react`, `@reatom/npm-vue`, `@reatom/devtools`) into v1000+ projects.

## Architectural Smells

These are not API traps; they are design choices to question. Read the relevant reference before large rewrites.

- Manual data fetching with `effect` + `action` instead of `computed` + `withAsyncData`.
- Identity actions that only forward to `atom.set()`; expose atoms or use built-in primitives unless the action adds semantics.
- Route components checking `route.match()` or accepting loader props; use route `render(self)`.
- Nullable loader payloads for redirects/auth/feature gates; block in `params()` / parent guards instead.
- Unmounting on background refresh (`!status.isFulfilled`) and losing focus/stale UI; use status flags that preserve settled data during refresh, and treat empty arrays as fulfilled data requiring empty-state UI.
- Module-level forms/actions for route-owned lifecycle; create scoped models in route loaders/factories.
- Hand-written structural page `*Model` prop types when a `reatom*` factory already exists or can be trivially extracted. Prefer an inferred alias such as `ReturnType<typeof reatomXModel>` and keep route-only callbacks separate.
- Pulling route-builder functions across module boundaries too early. Extract models/forms/shared atoms first; parent-route typing makes route builders a higher-risk cleanup.
- Syncing atoms with `withChangeHook`; use `computed` / `withComputed` for derivation.
- Atom + effect bridges for one-shot commands (`latestEventAtom` + `effect()`); call the imperative API from the action unless the value is real rendered/persisted state.
- Boot-only `start*Effects()` helpers; attach stable reactions to sources or put scoped work in loaders/factories/hooks.
- Unguarded `.go()` calls inside reactive route guards or URL hooks; redirects must be conditional/idempotent to avoid loops.
- Protected layouts that omit `path` and redirect while public sibling routes are active. Prefer a real private path segment or explicitly exempt public URLs before redirecting.
- Single create/edit route or broad dynamic routes beside literal routes.
- Treating route shape as a purely technical file-organization decision. Routes define URL sharing, Back/Forward behavior, state lifetime, parent context, loading/error boundaries, breadcrumbs, analytics, permissions, and recovery from abandoned work; ask or state the UX tradeoff before choosing page vs child vs layout vs search-param vs modal vs inline state.
- Layout/shell/component modules importing route singletons that import them back; thread navigation config/actions through props or a route-neutral module instead. Prefer passing precomputed `href`s or route-layer path-builder functions from loaders/models into components.
- Controlled search/filter inputs bound to route loader payload while the loader preserves stale data during refresh. Use a dedicated atom for the live input value; sync it to the URL with `withSearchParams` when the value is URL state.
- Index-route nav items using `match()` under a layout route. Use `exact()` for active state and add a pathname guard when the index loader should not run on descendants.
- Avoiding atom props; passing atoms to children is recommended decoupling.
- Misnaming atom factories as `create*` / `make*`; use `reatom*` for custom primitives and scoped models.
- React-owned app state that mirrors atoms or coordinates domain flow. If enforcing this with lint rules, label it as the setup guide's opinionated default, not a Reatom requirement.
