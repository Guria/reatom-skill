# Writing Reatom Extensions

Use this when creating custom `.extend(...)` helpers for Reatom atoms, actions, forms, routes, or third-party integrations. For built-in extension APIs, read `references/extensions.md` first.

## Core model

A Reatom extension is a function applied to an atom/action/form-like target:

```ts
import type { AtomLike, Ext } from '@reatom/core'

type Extra = { /* added methods/atoms/actions */ }

export const withFeature = <Target extends AtomLike>(): Ext<Target, Extra> =>
  (target) => {
    // attach hooks, middleware, derived atoms, or actions
    return { /* properties assigned to target */ }
  }
```

`.extend()` preserves the original target reference and assigns returned properties onto it. This is why extensions compose well: they add focused behavior without wrapping or replacing the primitive.

Important constraints from the core implementation:

- Return the same `target` when the extension only installs middleware/hooks.
- Return an object when adding properties, methods, atoms, or actions.
- Do not return a different atom/action reference; `.extend()` rejects atom replacement.
- Do not return `undefined`; every extension must return `target` or an object.
- Do not override existing properties with different values; `.extend()` rejects method collisions.
- `.extend()` has typed overloads up to 10 extensions. If inference fails with many extensions, split into multiple `.extend()` calls.

## When to write an extension

Prefer an extension when you need to modify or enrich an existing Reatom primitive:

- Add a focused capability (`reset`, `history`, `handleSubmit`, `preventNavigation`).
- Connect a primitive to an external system while preserving its public API.
- React to target lifecycle, calls, or state changes.
- Intercept reads/writes/calls with middleware.
- Compose behavior onto forms/routes/resources without duplicating their factory signatures.

Prefer a plain helper or factory when there is no existing primitive to extend, or when the whole unit must always be created together.

## Design workflow

1. **Find the primitive** — identify the atom/action/form that sits at the boundary you need to adapt.
2. **Find leverage points** — choose state changes, action calls, lifecycle connection, async abort, middleware, or derived atoms.
3. **Inject the smallest behavior** — one extension should do one thing and expose a small API.
4. **Compose instead of wrapping** — let callers mix extensions in `.extend(...)` rather than forcing a broad custom factory.
5. **Name derived pieces from `target.name`** — debugging is much easier when added actions/atoms have stable names.

## Extension shapes

| Need | Use | Notes |
|---|---|---|
| Add a method/action | Return `{ method: action(...) }` | Most common assigner pattern |
| Add derived state | Return `{ value: computed(...) }` | Read `target()` inside computed to subscribe |
| Observe atom changes | `withChangeHook` | Stable, definition-time hook; fires in the hook queue |
| Observe action calls | `withCallHook` | Only for actions; for `withAsync`, hook `onFulfill`/`onReject`/`onSettle` when completion matters |
| Start work on first subscriber | `withConnectHook` | Return cleanup for non-Reatom resources |
| Clean up on disconnect | `withDisconnectHook` | Built on `withConnectHook` |
| Cancel async/resource work | `withAbort`, `abortVar.subscribe(...)` | Use for last-in-win work and lifecycle-bound disposals |
| Intercept behavior | `withMiddleware` | Use for logging, validation, parameter/result transformation |
| Transform parameters | `withParams` | Safer than trying to replace `.set` |
| Add computed write semantics | `withComputed` | Use instead of syncing atoms with hooks |
| Dynamic temporary hook | `addChangeHook` / `addCallHook` | Rare; prefer `effect`, `take`, or `getCalls` in dynamic scopes |

## Common patterns

### Add a method/action

```ts
import {
  action,
  type Action,
  type Atom,
  type AtomState,
  type Ext,
} from '@reatom/core'

type ResetExt<State> = {
  reset: Action<[], State>
}

export const withReset =
  <Target extends Atom>(
    initialValue: AtomState<Target>,
  ): Ext<Target, ResetExt<AtomState<Target>>> =>
  (target) => ({
    reset: action(() => target.set(initialValue), `${target.name}.reset`),
  })
```

Keep added actions close to the target and name them from `target.name`.

### Add derived state

```ts
import {
  computed,
  type Atom,
  type AtomState,
  type Computed,
  type Ext,
} from '@reatom/core'

type HistoryExt<State> = {
  history: Computed<[State, ...State[]]>
}

export const withHistory =
  <Target extends Atom>(length = 2): Ext<Target, HistoryExt<AtomState<Target>>> =>
  (target) => ({
    history: computed((prev: [AtomState<Target>, ...AtomState<Target>[]] | undefined) => {
      return [target(), ...(prev ?? []).slice(0, length)]
    }, `${target.name}.history`),
  })
```

Use `computed` for derived state instead of `withChangeHook` plus another writable atom. It keeps dependencies declarative and avoids sync loops.

### Intercept calls with middleware

```ts
import { isAction, type GenericExt, withMiddleware } from '@reatom/core'

type LogEntry = {
  name: string
  params: unknown[]
  result: unknown
}

export const withLogger =
  (logger: (entry: LogEntry) => void = console.log): GenericExt =>
  withMiddleware((target) => (next, ...params) => {
    // Atom read, not a write/call.
    if (!isAction(target) && params.length === 0) return next()

    const result = next(...params)
    logger({ name: target.name, params, result })
    return result
  })
```

Use middleware when behavior must be in the target call path. For simple side effects after atom changes or action calls, prefer hooks.

Middleware placement (**v1001+ appeared**):

- default (`'invalidation'`) — before cache invalidation; typical for writes/calls.
- `'read'` — intercept reads too.
- `'computed'` — runs inside computed middleware so atoms read by the middleware become reactive dependencies.

In v1000 the second argument was an options object: `withMiddleware(cb, { reactive: true })`. That is the closest equivalent of v1001 `'computed'` placement. Do not use the string placement API in v1000 code.

### Connect an external resource lazily

```ts
import {
  type Atom,
  type Ext,
  withConnectHook,
  wrap,
} from '@reatom/core'

export const withEventSource =
  (url: string): Ext<Atom<string | null>> =>
  (target) =>
    target.extend(
      withConnectHook(() => {
        const source = new EventSource(url)
        source.addEventListener(
          'message',
          wrap((event) => target.set(event.data)),
        )

        // Return cleanup only for resources Reatom did not create/manage.
        return () => source.close()
      }),
    )
```

`withConnectHook` runs when the target gets its first subscriber and aborts on disconnect. Use it for DOM listeners, sockets, class instances, timers, and UI library objects.

### Manage imperative instances with automatic disposal

For reusable resources, model the instance itself as a computed atom and bind disposal to the reactive abort signal:

```ts
import {
  abortVar,
  computed,
  reset,
  withAbort,
  withDisconnectHook,
} from '@reatom/core'

export const reatomInstance = <I>(
  create: () => I,
  dispose?: (instance: I) => void,
  name?: string,
) => {
  const resource = computed(() => {
    const instance = create()
    abortVar.subscribe(() => dispose?.(instance))
    return instance
  }, name).extend(
    withAbort(),
    withDisconnectHook(() => {
      resource.abort('disconnect')
      reset(resource)
    }),
  )

  return resource
}
```

This pattern is useful when external instances should be created lazily, recreated when dependencies change, disposed on recompute, and reset on disconnect.

### Extend nested actions or atoms exposed by a target

Many Reatom constructs expose sub-primitives (`submit`, `reset`, `onFulfill`, `fields.*`, `sync`). Extensions can hook those directly:

```ts
import { action, type Action, type Ext, type Form } from '@reatom/core'

type SubmitHandlerExt = {
  handleSubmit: Action<[event?: { preventDefault(): void }], void>
}

export const withSubmitHandler =
  ({ requireDirty = false }: { requireDirty?: boolean } = {}) =>
  <Target extends Form<any>>(form: Target): SubmitHandlerExt => ({
    handleSubmit: action((event) => {
      event?.preventDefault()
      if (requireDirty && !form.focus().dirty) return
      form.submit()
    }, `${form.name}.handleSubmit`),
  })
```

Constrain the target to the smallest type you need. If full exported types are too broad or hard to infer, define a local `FormLike`/`RouteLike`/`ResourceLike` subset containing only the members your extension uses.

## Lifecycle and cleanup rules

- Reatom-managed resources (`effect`, `computed`, actions with `withAbort`, subscriptions created in the current reactive context) are automatically cleaned up by the reactive context.
- Return a cleanup function from `withConnectHook` for non-Reatom resources: DOM listeners, sockets, observers, third-party instances, timers created outside Reatom helpers.
- Use `wrap()` for external callbacks that read/write atoms after leaving the Reatom call stack (`addEventListener`, library `.on(...)`, promise callbacks).
- Use `abortVar.subscribe(cleanup)` inside computed/effect/action bodies to bind cleanup to the current abort signal.
- For action-backed UI/resource extensions, ensure something subscribes to the action call history (`getCalls(action)` in an `effect`, or direct subscription). A connection-driven extension only starts when its target is connected.

## TypeScript guidance

- Use `Ext<Target, Added>` when an extension returns added properties.
- Use `GenericExt<Target>` when an extension only installs middleware/hooks and should preserve the exact target type.
- Use `AssignerExt<Methods, Target>` for simple assigner-style extensions if it reads clearer.
- Keep generics on the extension factory, not only on the returned callback, when options affect added types.
- Prefer small structural constraints over depending on a giant concrete type.
- Return named interfaces for added methods; they improve hover docs and make tests easier.

## Composition guidelines

Good extensions are narrow:

```ts
const form = reatomForm(init, options).extend(
  withSubmitHandler({ requireDirty: true }),
  withUnsavedWarning(),
)
```

Avoid extensions that create unrelated UI, persistence, network, and validation behavior at once. Independent extensions are easier to test, reorder, omit, and reuse.

When a pattern appears only once, inline hooks may be enough. Extract an extension when:

- The same behavior appears in several places.
- The behavior has clear options.
- The behavior belongs to the primitive itself rather than a component.
- Tests would be simpler against a reusable helper.

## Gotchas

- Do not use `withChangeHook` to maintain derived state; use `computed` or `withComputed`.
- Do not use dynamic `addChangeHook` / `addCallHook` as a default. They are for temporary runtime hooks; static extensions should use `withChangeHook` / `withCallHook`.
- Do not manually clean up Reatom effects/subscriptions created inside a reactive context unless you intentionally stepped outside Reatom's lifecycle.
- Do not hide broad factory wrappers behind an extension name. If you duplicate another API's creation options, you inherit its maintenance burden.
- Be careful with `withComputed(..., { tail: false })`; use it only when the dependency set is fixed.
- If an extension reads an imperative instance inside an effect only to mutate it, use `peek` where appropriate to avoid accidental reactive dependencies.
- If an extension adds properties with common names (`reset`, `status`, `data`, `error`), check the target does not already provide them or choose a more specific name.

## Validation checklist

Before finalizing a custom extension:

- [ ] It has one clear responsibility.
- [ ] It preserves the target reference and does not wrap the public API unnecessarily.
- [ ] Added actions/computeds are named from `target.name`.
- [ ] Cleanup is tied to Reatom lifecycle or explicitly returned for external resources.
- [ ] External callbacks that touch atoms are wrapped with `wrap()`.
- [ ] Types expose the added API without losing the original target type.
- [ ] It composes with other extensions in either order, or documents the required order.
- [ ] Tests cover connection/disconnection, repeated calls, and cleanup if lifecycle is involved.
