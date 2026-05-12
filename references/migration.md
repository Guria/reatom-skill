# v3 → v1000+ Migration

> **⚠️ v1000+ only — do not rely on any v3 or earlier packages.** The v3 ecosystem is completely separate and incompatible. v1000+ consolidated everything into `@reatom/core` and `@reatom/react`.

## API Mapping

| v3 | v1000+ |
|---|---|
| `ctx` parameter | implicit context (no `ctx`) |
| `ctx.schedule(promise)` | `wrap(promise)` |
| `ctx.spy(atom)` | `atom()` |
| `ctx.get(atom)` | `peek(atom)` |
| `atom(ctx, value)` | `atom.set(value)` |
| `atom(callback)` | `computed(callback)` |
| `ctx.spy(atom, cb)` | `ifChanged(atom, cb)` |
| `ctx.spy(action, cb)` | `getCalls(action).forEach(cb)` |
| `reatomAsync(cb)` | `action(cb).extend(withAsync())` |
| `reatomResource(cb)` | `computed(cb).extend(withAsyncData())` |
| `reaction` | `effect` |
| `atom.onChange(cb)` | `atom.extend(withChangeHook(cb))` |
| `onConnect(atom, cb)` | `atom.extend(withConnectHook(cb))` |
| `withConcurrency` | `withAbort` |
