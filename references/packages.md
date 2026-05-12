# Package Index

## Active Packages

| Package | Purpose |
|---|---|
| `@reatom/core` | Core primitives, extensions, forms, routing, persistence, methods |
| `@reatom/react` | React adapter: `reatomComponent`, `bindField` |
| `@reatom/preact` | Preact adapter |
| `@reatom/vue` | Vue adapter |
| `@reatom/solid-js` | Solid adapter |
| `@reatom/lit` | Lit adapter |
| `@reatom/jsx` | Native JSX runtime (no VDOM) — zero re-renders, direct DOM updates, built-in CSS-in-JS |
| `@reatom/zod` | Zod v4 integration |
| `@reatom/eslint-plugin` | ESLint rules |
| `@reatom/admin` | Admin dashboard |

## @reatom/core Exports

`atom`, `computed`, `action`, `effect`, `peek`, `wrap`, `sleep`, `schedule`, `take`, `onEvent`, `race`, `all`, `memo`, `variable`, `abortVar`, `throwAbort`, `log`, `settled`, `suspense`, `ifChanged`, `getCalls`, `deatomize`, `framePromise`, `reatomLens`, `reatomObservable`, `reatomTransaction`, `reatomBoolean`, `reatomEnum`, `reatomArray`, `reatomMap`, `reatomSet`, `reatomRecord`, `reatomLinkedList`, `reatomNumber`, `reatomString`, `reatomForm`, `reatomRoute`, `reatomComponent`, `withAsyncData`, `withAsync`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withSuspenseInit`, `withSuspenseRetry`, `withRollback`, `withTransaction`, `withLocalStorage`, `withSessionStorage`, `withIndexedDb`, `withBroadcastChannel`, `withCookie`, `withCookieStore`, `context`, `mock`

## Reatom Reusables

`shadcn`-like code delivery via `jsrepo` at [github.com/reatom/reusables](https://github.com/reatom/reusables). Copy-paste abstract, pre-built Reatom components and hooks directly into your project.

## Deprecated v1-v3 Packages (DO NOT USE)

These are from the v1-v3 ecosystem. Their functionality has been merged into `@reatom/core` in v1000+.

| Deprecated Package | Use Instead |
|---|---|
| `@reatom/devtools` | Pre-v1000, do not use |
| `@reatom/hooks` | `withChangeHook`, `withConnectHook` from core |
| `@reatom/async` | `withAsync`, `withAsyncData` from core |
| `@reatom/persist` / `@reatom/persist-*` | `withLocalStorage`, `withIndexedDb`, etc. from core |
| `@reatom/form` | `reatomForm` from core |
| `@reatom/url` | `reatomRoute` from core |
| `@reatom/timer` | `wrap(sleep())` or `withAsyncData` polling |
| `@reatom/lens` | `reatomLens` or `withComputed` from core |
| `@reatom/undo` | `withRollback` from core |
| `@reatom/primitives` | `reatomBoolean`, `reatomNumber`, etc. from core |
| `@reatom/npm-react` / `@reatom/npm-vue` | `@reatom/react`, `@reatom/vue` |

## Installation

```bash
npm install @reatom/core @reatom/react  # or your framework adapter
```
