# Reatom Reusables Registry

> Source: [github.com/reatom/reusables](https://github.com/reatom/reusables) · Distribution: [jsrepo](https://www.jsrepo.dev). Per-item source links inline below.

A `shadcn`-style code delivery system for Reatom. Items are not installed as npm packages — they are **copied into your codebase** by [`jsrepo`](https://www.jsrepo.dev) so you own and can edit the source. This makes the catalog ideal for utilities the core library deliberately doesn't bundle, and for app-level patterns you'd otherwise reimplement.

## Bootstrap

Initialize once per project, then add items individually:

```bash
npx jsrepo init https://github.com/reatom/reusables
npx jsrepo add <itemName>            # one item
npx jsrepo add <itemA> <itemB>       # multiple
npx jsrepo add                       # interactive picker
```

Items default into `src/reatom/`; reconfigure paths in the generated `jsrepo.config.mts` before the first `add`. Items declare their own dependencies on other registry items — `jsrepo add` resolves the graph automatically.

## When to reach for reusables (vs. authoring or vs. core)

- **Use core (`@reatom/core`)** for everything covered by the built-in primitives, extensions, async helpers, forms, routing, persistence, and methods. Most apps need nothing else.
- **Use a reusable** when the core covers the *primitive* but not a *common pattern* (history/undo, auto-submit forms, unsaved-changes warnings, a logger, dev tooling integrations, a Reatom-aware test harness).
- **Author your own `reatom*` factory** when the pattern is domain-specific to your codebase. The reusables catalog deliberately stays generic; anything app-shaped should live next to the feature it serves (see `core/patterns.md` → "Scoped model factories").

## Catalog (as of skill authoring)

> Verify the live catalog with `npx jsrepo browse https://github.com/reatom/reusables` or by inspecting [`registry.json`](https://github.com/reatom/reusables/blob/main/registry.json) before relying on a specific item.

| Item | Type | Purpose |
|---|---|---|
| [`withFormAutoFocusOnError`](https://github.com/reatom/reusables/tree/main/src/reusables/form/with-form-auto-focus-on-error.ts) | extension | After a failed submit, move focus to the first invalid field. |
| [`withFormAutoSubmit`](https://github.com/reatom/reusables/tree/main/src/reusables/form/with-form-auto-submit.ts) | extension | Submit on every (debounced) field change instead of waiting for an explicit submit click. |
| [`withFormSubmitHandler`](https://github.com/reatom/reusables/tree/main/src/reusables/form/with-form-submit-handler.ts) | extension | Bind a form's submit to the host environment's submit semantics (Enter key, native form element). |
| [`withFormUnsavedWarning`](https://github.com/reatom/reusables/tree/main/src/reusables/form/with-form-unsaved-warning.ts) | extension | Prompt the user before navigating away from a dirty form. |
| [`withHistory`](https://github.com/reatom/reusables/tree/main/src/reusables/history/with-history.ts) | extension | Undo/redo for any atom. |
| [`hotWrap`](https://github.com/reatom/reusables/tree/main/src/reusables/hot-wrap/hot-wrap.ts) | utility | HMR-friendly variant of `wrap()` that survives module replacements. |
| [`reatomInstance`](https://github.com/reatom/reusables/tree/main/src/reusables/instance/reatom-instance.ts) + [`withInstance`](https://github.com/reatom/reusables/tree/main/src/reusables/instance/with-instance.ts) | factory + extension | Manage external library *instances* (constructors with their own lifecycle) as Reatom-tracked resources. |
| [`withLogger`](https://github.com/reatom/reusables/tree/main/src/reusables/logger/with-logger.ts) | extension | Per-atom debug logging that integrates with the reactive context. |
| [`withReset`](https://github.com/reatom/reusables/tree/main/src/reusables/reset/with-reset.ts) | extension | Adds a `reset()` action restoring the atom to its initial value. |
| [`test`](https://github.com/reatom/reusables/tree/main/src/reusables/test/test.ts) | utility | Vitest test wrapper with automatic Reatom context lifecycle and mock subscription helpers. |
| [`tweakpane`](https://github.com/reatom/reusables/tree/main/src/reusables/tweakpane/) | integration | Bind atoms to [Tweakpane](https://tweakpane.github.io/docs/) controls for runtime tuning. |

The `test` utility is particularly useful when bootstrapping: it bundles the Reatom + Vitest setup the sibling `reatom-scaffold` skill describes by hand, so you can `npx jsrepo add test` instead of writing the harness yourself. Use it whenever the project intends to write meaningful Reatom unit tests; for a single bootstrap smoke test the hand-rolled spy from that scaffold guide is enough.

## How the items differ from `@reatom/core`

The core package is a **published npm dependency** managed by your package manager — version bumps come through `npm/yarn/pnpm update`. Reusables are **vendored source files** under your repo's source tree — version bumps require re-running `jsrepo update <item>`. Choose the npm-package path when you want the maintainer to own the surface; choose the reusable path when you want to read, modify, or fork the implementation in place.

## Caveats

- Reusables target the same Reatom version their `registry.json` declares. When upgrading Reatom (especially v1000 ↔ v1001), re-pull the items so they match the new APIs.
- Item docs live next to the source as `<item>.md`. Read those before relying on undocumented behavior — the README only lists items, not their full options.
- The catalog evolves. If a pattern you need isn't there, prefer authoring a local `reatom*` factory and consider proposing it upstream once it stabilizes.
