# Package Index

> Source of truth: [`reatom/packages/`](https://github.com/reatom/reatom/tree/v1001/packages). Each package has its own `package.json` and `src/index.ts` defining the public surface.

## Active Packages

| Package | Current npm version | Purpose |
|---|---:|---|
| `@reatom/core` | `1001.0.0` | Core primitives, extensions, forms, routing, persistence, methods |
| `@reatom/react` | `1001.0.0` | React adapter: `reatomComponent`, `bindField` |
| `@reatom/preact` | `1000.0.0` | Preact adapter |
| `@reatom/vue` | `1000.0.0-alpha.2` | Vue adapter |
| `@reatom/solid-js` | not published on npm | Solid adapter |
| `@reatom/lit` | `1000.0.0-alpha.4` | Lit adapter |
| `@reatom/jsx` | `1000.1.0` | Native JSX runtime (no VDOM) — zero re-renders, direct DOM updates, built-in CSS-in-JS |
| `@reatom/zod` | `1000.0.0-alpha.1` | Zod v4 integration |
| `@reatom/eslint-plugin` | `3.4.3` | ESLint rules |
| `@reatom/admin` | not published on npm | Admin dashboard |

## @reatom/core Exports

`atom`, `computed`, `action`, `effect`, `peek`, `wrap`, `sleep`, `schedule`, `take`, `onEvent`, `race`, `all`, `memo`, `variable`, `abortVar`, `throwAbort`, `log`, `settled`, `suspense`, `ifChanged`, `getCalls`, `deatomize`, `framePromise`, `reatomLens`, `reatomObservable`, `reatomTransaction`, `reatomBoolean`, `reatomEnum`, `reatomArray`, `reatomMap`, `reatomSet`, `reatomRecord`, `reatomLinkedList`, `reatomNumber`, `reatomString`, `reatomForm`, `reatomRoute`, `reatomComponent`, `withAsyncData`, `withAsync`, `withAbort`, `withChangeHook`, `withConnectHook`, `withComputed`, `withSuspense`, `withSuspenseInit`, `withSuspenseRetry`, `withRollback`, `withTransaction`, `withLocalStorage`, `withSessionStorage`, `withIndexedDb`, `withBroadcastChannel`, `withCookie`, `withCookieStore`, `context`, `mock`, `fromEntries` (v1001+)

## Reatom Reusables

**Reusables registry** — a `shadcn`-style code delivery system at [github.com/reatom/reusables](https://github.com/reatom/reusables) distributed via [`jsrepo`](https://www.jsrepo.dev). Items are vendored into your source tree, not installed as npm packages. Catalog covers form helpers (`withFormAutoFocusOnError`, `withFormAutoSubmit`, `withFormSubmitHandler`, `withFormUnsavedWarning`), undo/redo (`withHistory`), logging (`withLogger`), reset (`withReset`), library-instance lifecycle (`reatomInstance` + `withInstance`), HMR-safe wrap (`hotWrap`), a Vitest test harness (`test`), and a Tweakpane integration. See [`./reusables.md`](./reusables.md) for the full catalog with per-item source links and "when to use a reusable vs. core vs. write your own" guidance.

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
