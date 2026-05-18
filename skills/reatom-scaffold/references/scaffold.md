# Scaffolding a Reatom Project

Use this when bootstrapping a brand-new project around Reatom. The default stack below is opinionated for production use; **adjust any layer if the user already specified a preference**. If the user has not, **use this default and verify current package versions with the available tooling before pinning** (`npm view <pkg> dist-tags`).

For greenfield work, treat this as the default sequence: scaffold, write `GOAL.md`, install the validation pipeline, configure quality gates, run validation on the untouched scaffolded baseline, then let the staged checklist in `GOAL.md` unlock routing work and later feature code. Existing examples are useful for local style and package shape, but sample them narrowly so they do not replace the bootstrap sequence.

This pipeline is intentionally **shift-left**: it is designed to surface tooling and runtime-integration mistakes as early as possible, while the app is still cheap to correct. Until the first green `npm run validate`, the only active goal is the validation pipeline; no Reatom code should be written yet.

> **This applies to examples and demos too.** The validation pipeline is not ceremony for "later" or only for "real apps". It catches failures that `tsc --noEmit` and `vite build` will happily miss, especially strict-context runtime errors such as `missing async stack`, invalid async-status assumptions, and browser-only mount problems. If you deliberately want a lighter bootstrap, say what confidence is being traded away.

> Prefer `npm create vite@latest` for the scaffold itself when practical. For packages installed after scaffolding, run `npm view <pkg> version` (or `dist-tags`) first.

## Execution guard for greenfield bootstraps

Use this as the **default sequence** for new apps/examples/packages. It exists to counter a common agent failure mode — jumping into feature code before the scaffold and validation harness exist. It should make the workflow harder to accidentally skip, not override explicit user constraints or common sense.

By default:

1. **Do not hand-write `package.json` or app entry files first.** Run the scaffold step first unless the user explicitly asked for manual scaffolding.
2. **As soon as the scaffold root exists, write `GOAL.md` as a checkbox todo list.** It should park the original request, list the later stages, and become the only roadmap after that point.
3. **Once `GOAL.md` exists, ignore the original request until the checklist brings it back.** The current job is now the validation pipeline only.
4. **Keep the broader implementation guidance out of the validation phase.** Stay inside this scaffold checklist and its tooling guidance until the bootstrap gate is green.
5. **Do not install feature dependencies first.** Install the requested validation/tooling dependencies immediately after the scaffold.
6. **Do not write Reatom code before the bootstrap is green.** No routes, pages, forms, loaders, or state code before the validate pipeline, browser smoke test, and post-validate reminder are in place.
7. **If the starter ships overlapping validation tooling, reconcile it with the stack you chose** unless the user explicitly wants both.
8. **Do not treat examples, demos, or standalone packages as automatic exceptions.** They teach by example, so the bootstrap quality bar often matters more, not less.
9. **If the user gave target-path constraints, preserve them while still following the sequence.** For example, a standalone package inside `./examples/...` still starts with the scaffold step inside that directory.
10. **If the user intentionally wants a lighter path, say what is being skipped and why.** Adapt deliberately instead of drifting out of order by accident.
If you catch yourself planning pages, routes, models, Reatom app entry, or pulling in the main `reatom` skill before Step 12, you are probably out of order. Stop, check whether the user explicitly narrowed the scope, and otherwise resume the checklist from the earliest incomplete step.

Before substantial feature work, verify this gate explicitly:

- [ ] scaffold exists and installs cleanly;
- [ ] `GOAL.md` exists as a staged todo list;
- [ ] validation tooling is installed;
- [ ] overlapping starter tooling was reconciled deliberately;
- [ ] `npm run typecheck` passes;
- [ ] `npm run lint` passes;
- [ ] browser smoke test passes;
- [ ] `npm run validate` is green;
- [ ] if Storybook was intentionally added, its smoke check passes.

If any box is unchecked, the next task is still bootstrap work, not routing or feature work.

A package install alone does not count. Validation, formatting, analysis, and optional preview tools only matter if they are configured, reachable through scripts or documented commands, and actually executed.

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
- [Step 9 — Phase boundary: no Reatom code yet](#step-9--phase-boundary-no-reatom-code-yet)
- [Step 10 — Vitest browser smoke test](#step-10--vitest-browser-smoke-test)
- [Step 11 — Optional Storybook](#step-11--optional-storybook)
- [Step 12 — Final validation run](#step-12--final-validation-run)
- [After first green validate — routing scheme only](#after-first-green-validate--routing-scheme-only)
- [Reading list for the next steps](#reading-list-for-the-next-steps)
- [After bootstrap — report pitfalls back to the user](#after-bootstrap--report-pitfalls-back-to-the-user)

## Default stack (verify before installing)

Keep this table as package selection guidance, not a version source. Package versions move faster than this skill, so verify dist-tags immediately before installing and let the scaffold choose its own matching dev dependencies where possible.

| Layer | Package | Notes |
|---|---|---|
| Language | `typescript` | Usually provided by the Vite template; keep target `es2017+` |
| Bundler / dev server | `vite` | Prefer the current Vite scaffold; follow its Node version warning if shown |
| React plugin | `@vitejs/plugin-react` | Only for React projects; normally provided by `react-ts` template |
| State | `@reatom/core` | Install from the current v1000+/v1001 line unless matching an existing project |
| React adapter | `@reatom/react` | Use for React projects |
| Native JSX adapter | `@reatom/jsx` | Use when the project intentionally avoids React |
| Other adapters | `@reatom/vue`, `@reatom/solid-js`, `@reatom/preact`, `@reatom/lit` | Verify published dist-tags; some adapters may lag core releases |
| Linter | `oxlint` | Default fast lint choice; swap if the user/project prefers another linter |
| Formatter | `oxfmt` | Default fast format choice; verify maturity and project preference |
| Code intelligence | `fallow` | Graph/health checks for unused code, cycles, duplication, complexity |
| Test runner | `vitest`, `@vitest/browser`, `@vitest/browser-playwright` | Browser smoke test baseline |
| Browser provider | `playwright` | Install browser binaries after package install |
| Schema (optional) | `zod`, `valibot`, `arktype`, or another Standard Schema library | Prefer whatever the target project already uses |

Adjust freely if the user requested:

- a different framework adapter — swap `@reatom/react` for `@reatom/vue`, `@reatom/solid-js`, `@reatom/preact`, `@reatom/lit`, or use `@reatom/jsx` (no React)
- ESLint/Prettier instead of oxlint/oxfmt
- a different validator (Valibot, ArkType, etc.)
- a different bundler (Rspack, Rsbuild, esbuild) — Reatom is bundler-agnostic provided the build target is `es2017+`

Keep validation proportional, but do not silently drop quality gates just because the app is small, an example, or a prototype. `fallow`, browser smoke testing, and a single `validate` script are part of the recommended greenfield baseline. If the user wants a lighter setup, state what confidence is being traded away and keep the remaining checks runnable.

## Step 1 — Scaffold

By default, do this step before creating `package.json`, `tsconfig.json`, `vite.config.ts`, or feature files by hand unless the user explicitly asked for manual scaffolding.

Immediately after the scaffold root exists, create `GOAL.md` in that root as a checkbox todo list. Keep it short but faithful. The purpose is to preserve the requested app/package outcome while forcing the agent to finish the validation pipeline before acting on that goal.

The checklist should:
- make **validation pipeline** the only active goal at first;
- explicitly defer the main `reatom` skill until the routing stage;
- explicitly park **routing scheme** as the next stage after a green pipeline;
- explicitly park **finish original request** after routing is validated;
- include a pointer to the routing reference bundled with the skill set;
- tell the later routing pass to start with placeholder layouts/pages and `outlet()` rendering only.

Example:

```md
# GOAL

- [ ] Initial validation pipeline
  - Scaffold the project with the chosen starter.
  - Install the requested development dependencies.
  - Reconcile any overlapping default tooling with the selected validation stack.
  - Add `validate` / `postvalidate` scripts.
  - Configure the installed tools.
  - Add a minimal browser smoke check for the scaffolded baseline.
  - Make the baseline pipeline pass without writing Reatom code yet.

- [ ] Routing scheme
  - Bring in the main `reatom` skill.
  - Read the routing reference bundled with the skill set.
  - Start by architecting route placeholders only.
  - Layout routes should render placeholders plus `outlet()` composition in their `render`.
  - Validate the routing skeleton before moving on.

- [ ] Finish original request
  - Keep that skill active and read the relevant references only when the checklist reaches those features.
  - Resume the parked request only after the routing scheme is validated.
  - Original request: <copy the user's request here, verbatim or near-verbatim>
```

Use the official latest Vite CLI with a TypeScript template when it fits the task. It bakes in current Vite defaults and reduces hand-written config mistakes. Manual file-by-file scaffolding is acceptable if the user explicitly requests it or has a strong opinion on how to scaffold the app — in that case, say why you're deviating and verify the result with the same install/typecheck/lint/test/build pipeline before treating it as equivalent to the CLI output.

Treat the Vite scaffold as the starting baseline, not something to immediately fight. Right after the Vite CLI scaffold is in place, wire the validation pipeline before feature work starts. After bootstrap, tweak that pipeline to match the generated project structure and the user's real stack choices rather than preserving every default here verbatim.

For the default React stack:

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

This is the early-feedback stage of the bootstrap: the point is to break fast on wiring mistakes now, instead of discovering them after the route tree, forms, and async flows already exist.

If you are about to add routes, components, forms, models, mocked backend code, or UI dependencies before finishing this step, stop and come back here unless the user explicitly chose a lighter path.

```bash
# Vite's TypeScript template already installs vite/typescript and the framework plugin.
npm i -D oxlint@latest oxfmt@latest fallow@latest \
        vitest@latest @vitest/browser@latest @vitest/browser-playwright@latest \
        playwright@latest
npx playwright install chromium
```

Install Reatom runtime packages later, when the checklist reaches the routing stage. The first pass is intentionally about proving the validation/tooling harness on the untouched Vite scaffold.

For v1001-only APIs (layout routes, URL codecs, action `(payload, params)` subscribe shape, `withMiddleware('read'|'computed'|'invalidation')`, etc.), install `@reatom/core@latest` and the matching adapter version during the routing stage. See [`../../reatom/references/meta/v1001.md`](../../reatom/references/meta/v1001.md) for the full delta.

## Step 3 — `tsconfig.json`

Reatom leans heavily on TypeScript inference and typed composition, so the type system should be treated as part of the app architecture rather than optional polish. Reatom also requires an `es2017+` TypeScript target so `wrap()` keeps native async/await microtask semantics. In an existing or freshly scaffolded `tsconfig.json`, check at least these options:

```jsonc
{
  "compilerOptions": {
    "target": "es2022", // any es2017+ target is acceptable
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Avoid normalizing unsafe escape hatches into the codebase. `any`, broad `as` assertions, double-casts (`as unknown as T`), and casual non-null assertions (`!`) tend to hide modeling problems that TypeScript could catch earlier. Prefer `satisfies` for declarative objects and configuration shapes when you want conformance checks without throwing away useful inference.

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

oxlint reads `.oxlintrc.json` (or `oxlint.json`). The `eslint/no-restricted-imports` rule below is the **non-negotiable Reatom default** — it stops React app state from leaking into the codebase. The lint baseline should also keep `any` out of day-to-day code, because once `any` becomes acceptable it quickly erodes the inference the rest of the model relies on. Adjust other rules to taste.

If the scaffold already ships with ESLint, decide explicitly whether ESLint stays. The default recommendation in this skill is **one primary linter** (`oxlint`), so after the requested dependencies are installed, clean up the scaffolded ESLint setup unless the project truly depends on ESLint-only rules/plugins and you can explain why the overlap is worth it.

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "perf": "warn",
    "suspicious": "warn"
  },
  "plugins": ["typescript", "react", "import"],
  "rules": {
    "typescript/no-explicit-any": "error",
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

Why these specific names? Each one represents React owning state, effects, memoization, or identity that Reatom should own instead. See `../../reatom/references/core/patterns.md` and the **React-owned app state** anti-pattern in `../../reatom/SKILL.md` for the rationale. If you intentionally need one of these for *view-only* concerns (e.g. `useRef` for DOM focus), add a narrow `// oxlint-disable-next-line` with a comment justifying the carve-out.

Keep `typescript/no-explicit-any` enabled as `error`. If a boundary value is genuinely unknown, model it as `unknown`, validate or narrow it, and only then pass it into state or actions. That keeps the type guarantees intact instead of bypassing them with local suppressions.

If the project uses `@reatom/jsx` (no React), replace `"name": "react"` with the relevant target or remove the rule — it's only meaningful when React is on the dependency tree.

## Step 6 — oxfmt configuration

oxfmt currently follows oxc defaults; configuration is minimal at this version. Pin it to the project and run via npm scripts:

```bash
npx oxfmt --check .   # CI / local validation
npx oxfmt .           # write
```

Track [oxc-project/oxc](https://github.com/oxc-project/oxc) for upcoming config keys.

## Step 7 — fallow (code intelligence)

fallow is codebase intelligence for JavaScript/TypeScript. It complements, rather than replaces, TypeScript and linting: TypeScript proves types, oxlint catches lint rules, while fallow inspects the project graph for unused files/exports/dependencies, circular dependencies, duplicate code, complexity hotspots, and optional architecture boundary rules. This is useful during bootstrap because dead exports and import cycles are easier to prevent while the structure is still moving.

fallow is a recent tool and its CLI has changed quickly. Verify the installed CLI instead of assuming older command names or config keys:

```bash
npx fallow --help
npx fallow config-schema | head
```

Current baseline commands:

```bash
npx fallow init                         # generates .fallowrc.json by default
npx fallow --quiet                      # combined dead-code + duplication + health report
npx fallow --quiet --fail-on-issues     # validation gate for npm scripts / CI
npx fallow --format json --quiet        # machine-readable output
npx fallow audit --base main            # changed-file audit for PR/CI workflows
```

A small starter `.fallowrc.jsonc` can stay close to the generated config and tune severities through `rules`:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/fallow-rs/fallow/main/schema.json",
  "entry": ["src/main.{ts,tsx}", "src/index.{ts,tsx}"],
  "ignorePatterns": ["dist/**", "coverage/**"],
  "duplicates": {
    "minOccurrences": 3
  },
  "rules": {
    "unused-files": "error",
    "unused-exports": "error",
    "unused-dependencies": "error",
    "circular-dependencies": "error",
    "boundary-violation": "error"
  }
}
```

Avoid invented commands such as `fallow analyze` or `fallow.config.json` unless the local `--help` / `config-schema` output shows them. When an agent needs JSON output, prefer `--format json --quiet` and remember that issue findings may be a normal non-green result rather than a broken tool invocation.

## Step 8 — npm scripts (`package.json`)

Use this as the recommended shape for a single validation entry point, then tweak it to fit what the Vite scaffold actually generated and what the user decided to keep after bootstrap.

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b --noEmit && vite build",
    "preview": "vite preview",

    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "format": "oxfmt .",
    "format:check": "oxfmt --check .",
    "intel": "fallow --quiet --fail-on-issues",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",

    "validate": "npm run typecheck && npm run lint && npm run test && npm run format:check && npm run intel",
    "postvalidate": "echo '\u23f5  validate green. Resume from GOAL.md:' && cat GOAL.md && echo '' && echo '\u23f5  Do not resume the original request directly. Follow GOAL.md: routing placeholders next, then the parked feature work.' && echo '\u23f5  Then read the reatom-feedback-loop skill and include its bootstrap pitfall summary.'"
  }
}
```

`npm run validate` is the single entry point for CI and local validation. The bootstrap is not complete until the full validate command passes, and the `postvalidate` hook serves three purposes: it re-surfaces `GOAL.md`, it prevents the agent from jumping straight back to the original request, and it reminds the agent to switch into the `reatom-feedback-loop` skill for the bootstrap pitfall summary.

Treat `postvalidate` as part of the workflow, not cosmetic output. It is the mechanism that routes the agent back into the staged checklist after a green run, which helps the next attempt start with sharper guidance instead of repeating the same mistakes.

If the scaffold still has an ESLint setup, either replace it with this oxlint-first baseline or keep both with a deliberate note about why ESLint remains. Avoid drifting into a redundant two-linter setup by accident.

Keep typecheck and emit separate: either set `"noEmit": true` in the TypeScript config or pass `--noEmit` in typecheck/build scripts.

## Step 9 — Phase boundary: no Reatom code yet

Do not add `@reatom/*`, route definitions, `src/setup.ts`, strict-context wiring, loaders, or forms in the first pass. Keep the broader Reatom implementation guidance out of this phase too. The objective of the bootstrap phase is narrower: prove the validation pipeline on the Vite-generated app first.

That means:
- keep `src/main.*` and `src/App.*` close to the Vite scaffold until `npm run validate` is green;
- make the tooling pass on the scaffolded source instead of silently rewriting the app into a Reatom shell;
- use the browser smoke test against the current `App.tsx`, not against an early route tree;
- let `postvalidate` echo `GOAL.md`, then follow its routing stage.

Reatom runtime setup belongs to the next phase, not this one. After the first green pipeline, hand work off to the main `../../reatom/SKILL.md`, then begin the routing-scheme pass by reading [`../../reatom/references/features/routing/routes.md`](../../reatom/references/features/routing/routes.md) and introducing only placeholder routes/layouts whose `render` methods compose `outlet()`.

This keeps the first checkpoint honest: if the toolchain fails, the agent fixes tooling. It does not blur the failure by changing the app architecture at the same time.

## Step 10 — Vitest browser smoke test

The validation pipeline should include one real-browser test from the start. Keep it intentionally small: render the Vite-generated app at `/` and assert the initial page appears. This catches broken Vite/browser setup before any Reatom architecture is introduced.

Why this test matters even before feature work:

- it proves the scaffold can mount in a real browser, not just type-check or bundle;
- it proves the validation harness is wired to the actual app entry;
- it gives you a cheap regression check before the later routing pass starts.

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

Replace `My App` with the actual stable text for the generated landing page. Do not introduce Reatom-only testing helpers yet; this first pass is still validating the plain scaffold. If the project later needs meaningful Reatom unit tests beyond this browser smoke check, pull the `test` utility from the reusables registry (`npx jsrepo add test` after initializing jsrepo against [reatom/reusables](https://github.com/reatom/reusables)) during the routing/feature stage. See [`../../reatom/references/meta/reusables.md`](../../reatom/references/meta/reusables.md) for the wider catalog.

## Step 11 — Optional Storybook

Storybook is optional in this scaffold skill. Add it when the user asked for it, when the example is explicitly component-library oriented, or when you want a reusable isolated UI harness beyond the browser smoke test. If the task is a focused app/bootstrap request, it is valid to skip Storybook and keep the default pipeline smaller.

When you do add Storybook, keep it minimal at first and point it at the existing `App.tsx`.

**Read [`../../reatom/references/integrations/storybook.md`](../../reatom/references/integrations/storybook.md) in full before starting this step.** It covers the Reatom-specific parts that matter here: fresh frame per story, routed story URL ownership, optional MSW setup, browser-test integration, and pitfalls.

### Install Storybook packages

```bash
npm i -D storybook@latest @storybook/react-vite@latest \
  @storybook/addon-vitest@latest @storybook/addon-a11y@latest @storybook/addon-docs@latest

# Optional — only if stories need to mock network requests:
# npm i -D msw@latest msw-storybook-addon@latest
# npx msw init public/ --save
```

Verify versions right before installing:

```bash
npm view storybook dist-tags
# Only if using request mocking:
# npm view msw dist-tags
```

### Follow the reference

Set up the Storybook files your project actually needs (typically `main.ts`, `preview.tsx`, and the Vite integration files) by following [`../../reatom/references/integrations/storybook.md`](../../reatom/references/integrations/storybook.md) only as far as the current phase needs. For the first pass, add a minimal story that exercises `App.tsx`, for example:

```tsx
// src/App.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { App } from './App'

const meta = {
  component: App,
  title: 'App',
} satisfies Meta<typeof App>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
```

Then add the scripts to `package.json`:

```jsonc
{
  "scripts": {
    "storybook": "storybook dev",
    "build:storybook": "storybook build"
  }
}
```

## Step 12 — Final validation run

Do not report bootstrap completion until the validation pipeline is green. At minimum, lint, tests, and format-check must pass; keep typecheck and fallow in the same command so CI has one entry point.

A common weak finish is: dependencies installed, files written, but the pipeline never actually ran. Treat that as unfinished. The completion bar is successful execution, not plausible configuration.

Before the final response, confirm all promised quality gates were both wired and executed:
- `GOAL.md` exists and `postvalidate` can echo it back
- `npm run lint` uses `oxlint`
- `npm run format:check` uses `oxfmt`
- `npm run intel` uses `fallow`
- browser smoke test passes on the Vite scaffold
- `npm run validate` passes
- Storybook smoke validation passes when Storybook is part of the requested bootstrap

If the user explicitly chose a lighter setup, say which gates were skipped and why.


```bash
npm run validate
```

If Storybook is part of the chosen bootstrap, also verify it starts and renders the first story:

```bash
npx storybook dev --smoke-test
```

If it fails, fix the reported issue and rerun `npm run validate`. These checks are the runtime side of the shift-left pipeline: they are meant to prove the tooling against the plain scaffold before architecture work begins.

Only after a passing run should you move to the next stage below: routing design from `GOAL.md`.

## After first green validate — routing scheme only

At this point `postvalidate` should echo `GOAL.md`. Follow it literally.

The next stage is **not** the original feature request yet. It is a routing-only pass:

1. bring in the main `../../reatom/SKILL.md`;
2. install the needed Reatom runtime packages for the chosen adapter;
3. read [`../../reatom/references/features/routing/routes.md`](../../reatom/references/features/routing/routes.md) before writing route code;
4. design the route tree with placeholder pages/layouts only;
5. when using layout routes, have their `render(self)` return placeholder shell content plus `self.outlet()` composition;
6. keep loaders/forms/business logic out of this pass;
7. validate the routing skeleton, then mark the routing checkbox in `GOAL.md` and only then resume the parked original request.

A good first routing pass proves structure, nesting, and outlet composition without conflating them with product logic.

## Reading list for the next steps

**When `GOAL.md` enters feature implementation, keep the main `../../reatom/SKILL.md` active and read these in order:**

1. [`../../reatom/references/core/patterns.md`](../../reatom/references/core/patterns.md) — atomization, scoped factories (`reatom*`), file organization, boolean-as-lifecycle-switch. **Skip this and the codebase will drift** toward identity actions, module-level forms, and React-owned state.
2. The Gotchas + Anti-patterns sections of `../../reatom/SKILL.md` — most production bugs come from violating these.
3. [`../../reatom/references/core/extensions.md`](../../reatom/references/core/extensions.md) — `withAsyncData` + `withAsync` are used in almost every feature; `withChangeHook` and `withConnectHook` cover most lifecycle work.

**Read on demand** when the checklist reaches the relevant feature:

4. [`../../reatom/references/features/routing/routes.md`](../../reatom/references/features/routing/routes.md) — routing API. Read this right before the routing stage starts. Then [`../../reatom/references/features/routing/loaders.md`](../../reatom/references/features/routing/loaders.md) when you write the first loader.
5. [`../../reatom/references/features/forms.md`](../../reatom/references/features/forms.md) — when adding the first form. Read **before** considering React Hook Form / Formik — `reatomForm` covers both.
6. [`../../reatom/references/features/persistence.md`](../../reatom/references/features/persistence.md) — when state needs to survive refresh / cross-tab sync.
7. [`../../reatom/references/integrations/react.md`](../../reatom/references/integrations/react.md) (or [`../../reatom/references/integrations/jsx.md`](../../reatom/references/integrations/jsx.md)) — adapter-specific gotchas, especially the StrictMode and "instant async resolution" notes.
8. [`../../reatom/references/core/sampling.md`](../../reatom/references/core/sampling.md) — when you need debounce/throttle, race conditions, or imperative event awaiting.

**Read once before any v1001-only API call:**

9. [`../../reatom/references/meta/v1001.md`](../../reatom/references/meta/v1001.md) — if you installed `@reatom/core@1001.x`, this lists every API that exists ONLY in v1001. Cite it in PR descriptions when bumping.

**Read when setting up Storybook (Step 11):**

10. [`../../reatom/references/integrations/storybook.md`](../../reatom/references/integrations/storybook.md) — Storybook + Reatom integration patterns: fresh frame per story, routed story setup, optional MSW, browser-test integration, and common pitfalls.

**Reference (look up only):**

- [`../../reatom/references/meta/packages.md`](../../reatom/references/meta/packages.md) — "which package has X?" / "is this v3 package still alive?"
- [`../../reatom/references/meta/migration.md`](../../reatom/references/meta/migration.md) — only when migrating an existing v3 codebase.
- [`../../reatom/references/core/writing-extensions.md`](../../reatom/references/core/writing-extensions.md) — only when authoring a custom `.extend(...)` helper for reuse.

## After bootstrap — report pitfalls back to the user

When you finish bootstrapping a project, read [`../../reatom-feedback-loop/references/feedback-loop.md`](../../reatom-feedback-loop/references/feedback-loop.md) and include its bootstrap pitfall summary in the final response. This turns every greenfield bootstrap into a passive eval of the skill itself; skipping it loses the signal about which guidance is missing or unclear.
