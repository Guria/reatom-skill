# Starting a Reatom Project From Scratch

Use this when bootstrapping a brand-new project around Reatom. The default stack below is opinionated for production use; **adjust any layer if the user already specified a preference**. If the user has not, **use this default and verify the current latest versions with the available tooling before pinning** (`npm view <pkg> dist-tags`).

> Use `npm create vite@latest` for the scaffold itself. For packages installed after scaffolding, run `npm view <pkg> version` (or `dist-tags`) first. Versions in this file are verified examples, not pins.

## Table of contents

- [Default stack (verify before installing)](#default-stack-verify-before-installing)
- [Step 1 — Scaffold](#step-1--scaffold)
- [Step 2 — Install the validate pipeline FIRST](#step-2--install-the-validate-pipeline-first)
- [Step 3 — `tsconfig.json`](#step-3--tsconfigjson)
- [Step 4 — `vite.config.ts`](#step-4--viteconfigts)
- [Step 5 — oxlint configuration (`.oxlintrc.json`)](#step-5--oxlint-configuration-oxlintrcjson)
- [Step 6 — oxfmt configuration](#step-6--oxfmt-configuration)
- [Step 7 — fallow (code intelligence)](#step-7--fallow-code-intelligence)
- [Step 8 — npm scripts (`package.json`)](#step-8--npm-scripts-packagejson)
- [Step 9 — Pre-commit hook (lefthook)](#step-9--pre-commit-hook-lefthook)
- [Step 10 — Reatom app entry (strict context, recommended)](#step-10--reatom-app-entry-strict-context-recommended)
- [Step 11 — Vitest browser smoke test](#step-11--vitest-browser-smoke-test)
- [Step 12 — Final validation run](#step-12--final-validation-run)
- [Reading list for the next steps](#reading-list-for-the-next-steps)
- [After bootstrap — report pitfalls back to the user](#after-bootstrap--report-pitfalls-back-to-the-user)

## Default stack (verify before installing)

| Layer | Package | Verified latest at writing time |
|---|---|---|
| Language | `typescript` | `6.0.3` (`latest` dist-tag) |
| Bundler / dev server | `vite` | `8.0.13` (`latest` dist-tag, requires Node `^20.19.0 \|\| >=22.12.0`) |
| React plugin | `@vitejs/plugin-react` | `6.0.2` (`latest` dist-tag) |
| State | `@reatom/core` | `1001.0.0` (`latest` dist-tag) |
| React adapter | `@reatom/react` | `1001.0.0` (`latest` dist-tag) |
| Native JSX adapter | `@reatom/jsx` | `1000.1.0` (`latest` dist-tag) |
| Vue adapter | `@reatom/vue` | `1000.0.0-alpha.31` in v1001 source; verify npm dist-tag before install |
| Solid adapter | `@reatom/solid-js` | `1000.0.0-alpha.30` in v1001 source; verify npm dist-tag before install |
| Preact adapter | `@reatom/preact` | `1000.0.0` (`latest` dist-tag) |
| Lit adapter | `@reatom/lit` | `1000.0.0-alpha.32` in v1001 source; verify npm dist-tag before install |
| Linter | `oxlint` | `1.65.0` ([oxc-project/oxc](https://github.com/oxc-project/oxc)) |
| Formatter | `oxfmt` | `0.50.0` (`oxc-project/oxc` formatter; alpha — track upstream) |
| Code intelligence | `fallow` | `2.75.0` ([fallow-rs/fallow](https://github.com/fallow-rs/fallow)) |
| Test runner | `vitest` / `@vitest/browser` / `@vitest/browser-playwright` | verify npm dist-tags before install |
| Browser provider | `playwright` | verify npm dist-tags before install |
| Git hooks | `lefthook` | `2.1.6` (`latest` dist-tag) |
| Schema (optional) | `zod` | `4.4.3` (Reatom forms/routing accept any [Standard Schema](https://github.com/standard-schema/standard-schema)) |
| Schema (optional) | `valibot` | `1.4.0` (`latest` dist-tag) |
| Schema (optional) | `arktype` | `2.2.0` (`latest` dist-tag) |

Adjust freely if the user requested:

- a different framework adapter — swap `@reatom/react` for `@reatom/vue`, `@reatom/solid-js`, `@reatom/preact`, `@reatom/lit`, or use `@reatom/jsx` (no React)
- ESLint/Prettier instead of oxlint/oxfmt
- a different validator (Valibot, ArkType, etc.)
- a different bundler (Rspack, Rsbuild, esbuild) — Reatom is bundler-agnostic provided the build target is `es2017+`

## Step 1 — Scaffold

Use the official latest Vite CLI with a TypeScript template. For the default React stack:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

For other adapters, pick the closest TypeScript template (`vanilla-ts`, `vue-ts`, `preact-ts`, etc.) and then install the matching `@reatom/*` adapter in Step 2. Vite's current docs list `npm create vite@latest` as the scaffold command and note that modern Vite requires Node `20.19+` or `22.12+`; upgrade Node first if the CLI warns.

If the project should have its own git repo and the parent is not already one, initialize it after scaffolding:

```bash
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || git init -b main
```

Do not stage or commit unless the user explicitly asks. If they do want a baseline commit, do it after Step 12 so the validated bootstrap state is captured before feature work begins.

Verify non-template packages right before installing them:

```bash
npm view @reatom/core dist-tags
npm view oxlint dist-tags
npm view oxfmt dist-tags
npm view fallow dist-tags
npm view vitest dist-tags
npm view @vitest/browser dist-tags
npm view @vitest/browser-playwright dist-tags
npm view playwright dist-tags
```

## Step 2 — Install the validate pipeline FIRST

> Set up lint/format/intel **before** writing any production code. This anchors the conventions and catches drift from line one.

```bash
# Vite's TypeScript template already installs vite/typescript and the framework plugin.
npm i -D oxlint@latest oxfmt@latest fallow@latest lefthook@latest \
        vitest@latest @vitest/browser@latest @vitest/browser-playwright@latest \
        playwright@latest
npx playwright install chromium

npm i @reatom/core@latest
# Pick one framework adapter:
npm i @reatom/react@latest    # or @reatom/jsx, @reatom/vue, @reatom/solid-js, @reatom/preact, @reatom/lit
```

For v1001-only APIs (layout routes, URL codecs, action `(payload, params)` subscribe shape, `withMiddleware('read'|'computed'|'invalidation')`, etc.), install `@reatom/core@latest` and the matching adapter version. See `../meta/v1001.md` for the full delta.

## Step 3 — `tsconfig.json`

Reatom requires an `es2017+` TypeScript target so `wrap()` keeps native async/await microtask semantics. In an existing or freshly scaffolded `tsconfig.json`, check this specific option:

```jsonc
{
  "compilerOptions": {
    "target": "es2022" // any es2017+ target is acceptable
  }
}
```

Keep the rest of the scaffold's TypeScript settings unless the project has a separate reason to change them.

## Step 4 — `vite.config.ts`

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022', // Reatom needs es2017+; align with tsconfig
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
})
```

If using `@reatom/jsx` instead of React, drop `@vitejs/plugin-react` and configure JSX in `tsconfig.json`:

```jsonc
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@reatom/jsx" } }
```

## Step 5 — oxlint configuration (`.oxlintrc.json`)

oxlint reads `.oxlintrc.json` (or `oxlint.json`). The `eslint/no-restricted-imports` rule below is the **non-negotiable Reatom default** — it stops React app state from leaking into the codebase. Adjust other rules to taste.

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "perf": "warn",
    "suspicious": "warn"
  },
  "plugins": ["typescript", "react", "react-hooks", "import"],
  "rules": {
    "eslint/no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "react",
            "importNames": [
              "useEffect",
              "useLayoutEffect",
              "useMemo",
              "useCallback",
              "useState",
              "useRef",
              "useContext",
              "useReducer",
              "useImperativeHandle",
              "useDebugValue",
              "memo"
            ],
            "message": "Find appropriate solution with reatom or ask user for guidance."
          }
        ]
      }
    ]
  },
  "ignorePatterns": ["dist", "build", "coverage", "node_modules"]
}
```

Why these specific names? Each one represents React owning state, effects, memoization, or identity that Reatom should own instead. See `../core/patterns.md` and the **React-owned app state** anti-pattern in `SKILL.md` for the rationale. If you intentionally need one of these for *view-only* concerns (e.g. `useRef` for DOM focus), add a narrow `// oxlint-disable-next-line` with a comment justifying the carve-out.

If the project uses `@reatom/jsx` (no React), replace `"name": "react"` with the relevant target or remove the rule — it's only meaningful when React is on the dependency tree.

## Step 6 — oxfmt configuration

oxfmt currently follows oxc defaults; configuration is minimal at this version. Pin it to the project and run via npm scripts:

```bash
npx oxfmt --check .   # CI / pre-commit
npx oxfmt .           # write
```

Track [oxc-project/oxc](https://github.com/oxc-project/oxc) for upcoming config keys.

## Step 7 — fallow (code intelligence)

fallow finds unused exports, circular imports, code duplication, and complexity hotspots. Keep it in the validate pipeline so dead code does not accumulate.

```bash
npx fallow init                  # generate fallow.config.json
npx fallow analyze               # full report
npx fallow analyze --json | jq   # machine-readable output for CI
```

A reasonable starter `fallow.config.json`:

```jsonc
{
  "include": ["src/**/*.{ts,tsx}"],
  "exclude": ["**/*.test.{ts,tsx}", "**/*.bench.{ts,tsx}"],
  "checks": {
    "unusedExports": "error",
    "circularDependencies": "error",
    "duplication": "warn",
    "complexity": "warn"
  }
}
```

Confirm exact keys with `npx fallow --help` before committing — fallow ships frequently.

## Step 8 — npm scripts (`package.json`)

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",

    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt .",
    "format:check": "oxfmt --check .",
    "intel": "fallow analyze",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",

    "validate": "npm run typecheck && npm run lint && npm run test && npm run format:check && npm run intel && echo '\u23f5  validate green. If this run is part of a bootstrap, end your turn with the pitfall summary described in references/setup/start-from-scratch.md → \"After bootstrap\".'"
  }
}
```

`npm run validate` is the single entry point for CI and pre-push checks. Pre-commit can run faster staged lint/format plus tests, but the bootstrap is not complete until the full validate command passes.

## Step 9 — Pre-commit hook (lefthook)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    typecheck:
      run: npm run typecheck
    lint:
      run: npx oxlint --fix {staged_files}
      stage_fixed: true
      glob: "*.{ts,tsx,js,jsx}"
    test:
      run: npm run test
    format:
      run: npx oxfmt {staged_files}
      stage_fixed: true
      glob: "*.{ts,tsx,js,jsx,json,md}"

pre-push:
  commands:
    validate:
      run: npm run validate
```

Install:

```bash
npx lefthook install
```

## Step 10 — Reatom app entry (strict context, recommended)

```ts
// src/setup.ts — import this file BEFORE any atoms or components
import { clearStack, context } from '@reatom/core'

clearStack()
export const rootFrame = context.start()
```

```tsx
// src/main.tsx
import './setup'           // must be first
import { createRoot } from 'react-dom/client'
import { reatomContext } from '@reatom/react'
import { rootFrame } from './setup'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <reatomContext.Provider value={rootFrame}>
    <App />
  </reatomContext.Provider>,
)
```

See `SKILL.md` → "App Setup — optional clearStack and context.start" for when to use this strict setup vs the default global context.

**Cost of the strict setup**: with `clearStack()` in place, every host-scheduled callback that touches Reatom (UI event handlers, timers, third-party listeners, etc.) must be wrapped with `wrap()` so it re-enters a reactive frame. Adapter helpers that produce callbacks for you wrap internally; ones you author by hand do not. If the discipline is too heavy for an exploratory codebase or one with a large hand-written event surface, drop `clearStack()` and use the default global context: you trade strict early-failure mode for ergonomics. Keep the strict setup for greenfield apps where the explicit boundary pays off; the lenient setup is reasonable for prototypes.

## Step 11 — Vitest browser smoke test

The validation pipeline should include one real-browser test from the start. Keep it intentionally small: render the app at `/` and assert the initial page appears. This catches both broken Vite/browser setup and the canonical strict-context runtime failures that only surface once the app mounts.

Give the initial page a stable heading or text marker, for example:

```tsx
// src/App.tsx
export function App() {
  return (
    <main>
      <h1>My App</h1>
    </main>
  )
}
```

`src/__tests__/root.browser.test.tsx`:

```tsx
import { expect, test, vi } from 'vitest'

test('renders the initial page at root', async () => {
  window.history.replaceState({}, '', '/')
  document.body.innerHTML = '<div id="root"></div>'

  const errors: string[] = []
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((...args) => {
      errors.push(args.map(String).join(' '))
    })

  await import('../main')
  await new Promise((resolve) => requestAnimationFrame(resolve))

  consoleErrorSpy.mockRestore()

  expect(document.getElementById('root')?.textContent).toContain('My App')
  expect(
    errors.filter((e) => /missing async stack|ReatomError/.test(e)),
  ).toEqual([])
})
```

Replace `My App` with the actual stable text for the generated landing page. If the project plans to write meaningful Reatom unit tests beyond this browser smoke check, also pull the `test` utility from the reusables registry (`npx jsrepo add test` after initializing jsrepo against [reatom/reusables](https://github.com/reatom/reusables)). It bundles a Vitest wrapper with automatic Reatom context lifecycle and mock-subscription helpers. See [`../meta/reusables.md`](../meta/reusables.md) for the wider catalog.

## Step 12 — Final validation run

Do not report bootstrap completion until the validation pipeline is green. At minimum, lint, tests, and format-check must pass; keep typecheck and fallow in the same command so CI has one entry point:

```bash
npm run validate
```

If it fails, fix the reported issue and rerun `npm run validate`. Only after a passing run should you give the final bootstrap response and the pitfall summary below.

## Reading list for the next steps

**Must-read before writing the first feature** (in order):

1. [`../core/patterns.md`](../core/patterns.md) — atomization, scoped factories (`reatom*`), file organization, boolean-as-lifecycle-switch. **Skip this and the codebase will drift** toward identity actions, module-level forms, and React-owned state.
2. The Gotchas + Anti-patterns sections of `SKILL.md` — most production bugs come from violating these.
3. [`../core/extensions.md`](../core/extensions.md) — `withAsyncData` + `withAsync` are used in almost every feature; `withChangeHook` and `withConnectHook` cover most lifecycle work.

**Read on demand** when you start the relevant feature:

4. [`../features/routing/index.md`](../features/routing/index.md) — routing API. Then [`../features/routing/loaders.md`](../features/routing/loaders.md) when you write the first loader.
5. [`../features/forms.md`](../features/forms.md) — when adding the first form. Read **before** considering React Hook Form / Formik — `reatomForm` covers both.
6. [`../features/persistence.md`](../features/persistence.md) — when state needs to survive refresh / cross-tab sync.
7. [`../integrations/react.md`](../integrations/react.md) (or [`../integrations/jsx.md`](../integrations/jsx.md)) — adapter-specific gotchas, especially the StrictMode and "instant async resolution" notes.
8. [`../core/sampling.md`](../core/sampling.md) — when you need debounce/throttle, race conditions, or imperative event awaiting.

**Read once before any v1001-only API call:**

9. [`../meta/v1001.md`](../meta/v1001.md) — if you installed `@reatom/core@1001.x`, this lists every API that exists ONLY in v1001. Cite it in PR descriptions when bumping.

**Reference (look up only):**

- [`../meta/packages.md`](../meta/packages.md) — "which package has X?" / "is this v3 package still alive?"
- [`../meta/migration.md`](../meta/migration.md) — only when migrating an existing v3 codebase.
- [`../core/writing-extensions.md`](../core/writing-extensions.md) — only when authoring a custom `.extend(...)` helper for reuse.
- [`../features/routing/spa-example.md`](../features/routing/spa-example.md) — worked example that wires everything together; useful as a sanity check.

## After bootstrap — report pitfalls back to the user

When you (the agent) finish bootstrapping a project, **produce a short pitfall summary as the final message of the bootstrap turn**. The goal is to surface anything you tripped on so the user can decide whether the skill or its references need updating, and so future runs can avoid the same loop.

Format the summary as a plain Markdown list. Keep it factual and specific to what actually happened during this run — do not pad it with general advice or restate things that worked first try. For each pitfall include:

1. **Symptom** — the exact error message, type-check failure, or unexpected behaviour you observed (one line).
2. **Root cause** — the reactive-system rule or API contract that was violated (one line).
3. **Fix applied** — the smallest change that resolved it (one line).
4. **Where the skill addresses this today**, or **"not in skill yet — candidate for distillation"** if you could not find it referenced anywhere in `SKILL.md` or `references/`.

Close the summary with one of:

- `No pitfalls encountered` — if the bootstrap was clean end-to-end.
- `Suggested skill updates: <bullet list>` — if any item was marked "not in skill yet".

This turns every greenfield bootstrap into a passive eval of the skill itself. Skipping it loses the only signal we get about which guidance is missing or unclear.
