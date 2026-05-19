# Reatom debugging reference

> Source anchors:
>
> - `connectLogger` / `log`: [`packages/core/src/methods/connectLogger.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/connectLogger.ts)
> - strict stack handling: [`packages/core/src/core/atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts)
> - provider boundary: [`packages/react/src/reatomComponent.ts`](https://github.com/reatom/reatom/blob/v1001/packages/react/src/reatomComponent.ts)
> - strict setup example: [`packages/react/README.md`](https://github.com/reatom/reatom/blob/v1001/packages/react/README.md)
>
> Read this when debugging runtime failures, route ownership issues, strict-context regressions, or surprising adapter/test behavior.

## Table of contents

- [Debug preflight](#debug-preflight)
- [Connect logger preflight](#connect-logger-preflight)
- [Symptom map](#symptom-map)
- [Proof commands](#proof-commands)

## Debug preflight

Before editing code, capture:

1. exact error text;
2. smallest repro path or failing command;
3. current context style (default strict setup with `clearStack()` vs an existing-code global-context compatibility path);
4. whether the project already has a dedicated setup import / test helper.

Do not start with broad rewrites. Reatom bugs are usually boundary bugs: host callback, provider seam, route owner, loader invalidation, or test harness.

## Connect logger preflight

For app/runtime debugging, inspect the earliest setup import first.

Why this matters:

- upstream `log` is intentionally silent unless `connectLogger()` is connected;
- `clearStack()` removes the implicit default stack, so setup/import order becomes runtime-critical;
- routing and async bugs are much easier to localize when logger output is available before feature atoms/routes initialize.

One supported strict-setup shape:

```ts
// src/setup.ts
import { clearStack, connectLogger, context } from '@reatom/core'

clearStack()
export const frame = context.start()

if (import.meta.env.DEV) {
  frame.run(connectLogger)
}
```

```ts
// src/main.tsx
import './setup'
```

Checks:

- setup import exists and stays first;
- logger setup is dev-only;
- logger is connected before feature atoms/routes are imported;
- if the codebase intentionally does not use strict setup, preserve that existing choice and adapt the debug plan — but do not treat non-strict setup as the planning default.

Optional trace helper from upstream source:

```ts
declare global {
  var LOG: typeof log
}
globalThis.LOG = log
```

Use `LOG(...)` or `LOG.state(...)` for trace points when the logger is connected.

## Symptom map

### `ReatomError: missing async stack`

Most likely causes:

- handwritten UI callback, timer, observer, or promise continuation touches atoms without `wrap()`;
- strict test suite uses bare atom reads/writes outside `context.start(...)`;
- `clearStack()` setup imported too late;
- build/test target downleveled async boundaries.

First checks:

- read setup import;
- read the exact callback/test body that throws;
- verify whether the project uses the reusable strict test harness or manual `context.start(...)`.

### `the root is not set, you probably forgot to specify the provider`

First checks:

- inspect the provider boundary in the app root;
- confirm provider value is a `Frame`;
- ensure the first Reatom-reading component renders under the provider;
- under strict setup, confirm frame creation happens in setup before UI render.

### repeated `AbortError` logs or route flicker

Treat the logs as evidence, not noise.

Likely causes:

- broad/pathless redirect ownership;
- index child loader matching descendants;
- incorrect invalidation assumptions after mutation;
- route/layout owner mismatch.

Keep logger visibility on until the intended route ownership is proven on the nearby URLs.

### tests fail only under strict setup

Likely causes:

- suite calls `clearStack()` but test body is not wrapped in `context.start(...)`;
- host callback inside the test crosses a boundary without `wrap()`;
- custom harness drifted from Reatom's reusable `test` helper pattern.

### impossible behavior after dependency churn

Check for duplicate `@reatom/*` installs before patching app code. Reatom runtime state is effectively singleton-shaped, so duplicate copies can produce type/runtime mismatches that look like app bugs.

## Proof commands

Prefer the narrowest proof that matches the bug:

- single test file: `npm run test -- path/to/file.test.ts`
- type boundary: `npm run typecheck`
- route/runtime repro: run the app and verify the exact path/action that used to fail
- package graph sanity: inspect installed `@reatom/*` versions and duplicates before touching code

A debugging step is complete only when the nearest proof changes from red to green, or yields a clearer failing boundary than before.
