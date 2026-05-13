# Patterns Reference

> Sources: [`reatom/examples/`](https://github.com/reatom/reatom/tree/v1001/examples) (especially [`mantine-dashboard`](https://github.com/reatom/reatom/tree/v1001/examples/mantine-dashboard)) for end-to-end pattern usage · [`core/atom.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/atom.ts), [`core/action.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/core/action.ts), [`methods/variable.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/methods/variable.ts) for the primitives used.

## Atomization pattern

Keep immutable structure as plain data, lift mutable fields into atoms.

Keep state transitions in the Reatom model layer (atoms, actions, computeds, hooks/extensions). React components should bind and render atoms, not mirror Reatom state into React state or use lifecycle effects to maintain model invariants.

React-owned application state is an architecture smell in Reatom apps. If a value affects routing, data loading, forms, auth, permissions, business state, persistence, or cross-component coordination, model it as a Reatom atom/computed/action instead of `useState`, `useReducer`, React context, or `useEffect`. React built-in hooks remain useful for isolated view/DOM integration, view-only memoization/callbacks, and third-party UI glue. This warning does not prohibit `@reatom/react` adapter APIs such as `reatomComponent`, `useAtom`, or `useWrap` when a project uses hook-style Reatom integration.

When a child component reads atoms directly, make that child a `reatomComponent` too. Passing atoms into a plain React component and calling atom getters there can lose Reatom's reactive subscription boundary for that subtree.

```typescript
import { atom, action } from '@reatom/core'

type UserDto = { id: string; name: string }
type UserModel = { id: string; name: Atom<string> }

const users = atom<UserModel[]>([], 'users').extend((target) => ({
  fromDto(dto: UserDto[]) {
    return target.set(dto.map(user => ({
      id: user.id,
      name: atom(user.name, `users#${user.id}.name`),
      remove: action(() => {
        target.set(state => state.filter(u => u.id !== user.id))
      }, `users#${user.id}.remove`),
    })))
  },
}))
```

## Commands, state, and side-effect boundaries

Some events are commands, not state. If a semantic action performs a command and no component, computed, persistence layer, or later action needs to read the latest payload, call the imperative boundary directly inside that action. A `latestEventAtom` observed only by an `effect()` records non-domain state and creates a subscription lifecycle for no benefit.

When the last value is meaningful state, keep it as an atom and attach the side effect to that source with `withChangeHook`. When the side effect follows a route, form, selected item, or mounted resource, create it inside the loader/model factory or use `withConnectHook` so the lifecycle follows the scope. Boot helpers whose only job is to instantiate top-level effects usually signal that the reaction belongs on a source atom/action hook or in a scoped model instead.

## Individual atoms vs. lenses

When a grouped object has fields that are set or toggled independently, you have two patterns — both avoid identity actions.

**Option A: Standalone atoms** — each field is its own atom, persisted separately.

```typescript
import { atom, computed } from '@reatom/core'

// ❌ Bad — grouped atom + identity actions
const settings = atom({ theme: 'light', notifications: true }, 'settings')
const setTheme = action((t: 'light' | 'dark') => settings.set(s => ({ ...s, theme: t })))

// ✅ Standalone atoms
const themeAtom = atom<'light' | 'dark'>('settings.theme')
const notificationsAtom = atom(true, 'settings.notifications')

themeAtom.set('dark')
notificationsAtom.set(prev => !prev)

// Grouped derived atom if you need the full object for API calls
const settingsObject = computed(() => ({
  theme: themeAtom(),
  notifications: notificationsAtom(),
}), 'settingsObject')
```

**Option B: Lenses** — a single persisted atom with lens atoms that focus into nested properties.

```typescript
import { atom, reatomLens } from '@reatom/core'

const settingsAtom = atom({ theme: 'light', notifications: true }, 'settings')

const themeAtom = reatomLens(settingsAtom, 'theme')
const notificationsAtom = reatomLens(settingsAtom, 'notifications')

themeAtom.set('dark')
notificationsAtom.set(prev => !prev)
```

| | Standalone atoms | Lenses |
|---|---|---|
| **Persistence** | Each atom persists to its own key | One key for the whole snapshot |
| **Reactivity** | Fine-grained — subscribe to one field | Same — lens is an atom |
| **Migration** | Per-key versioning | Single version for the whole object |
| **Code** | More atoms to declare | Fewer atoms, depends on parent |

Both patterns eliminate identity actions. Choose based on whether you want granular persistence keys (standalone) or a single snapshot (lenses).

## Naming tips

- Use `#${ID}` pattern for dynamically created atoms: `goods.list#${id}.addToCart`
- Duplicate structure depth in names: `users.paging.current`
- Name reusable factories that create atom primitives/scoped models with the `reatom*` convention: `reatomUser(userDto, 'users' + userDto.id)`, `reatomSessionForm(...)`, `reatomFeatureFlag(...)`. Prefer this over generic `create*` / `make*` names so custom factories look like Reatom primitives.

## Model factory pattern

When a feature grows from one atom into a small state machine or cohesive model, extract it into a `reatom*` factory that creates and returns the atoms, computeds, actions, and lifecycle hooks for one instance. This is the scalable form of the module-level atom pattern: the module may still export a singleton for global state, but the implementation is reusable, testable, and namespaced.

```typescript
import { action, atom, computed, reatomBoolean, withChangeHook } from '@reatom/core'

const reatomProcess = (initialValue = 0, name = 'process') => {
  const value = atom(initialValue, `${name}.value`)
  const enabled = reatomBoolean(false, `${name}.enabled`).extend(
    withChangeHook((isEnabled) => {
      if (isEnabled) {
        // start resource or background work
      } else {
        // stop/cleanup resource or background work
      }
    }),
  )
  const label = computed(() => String(value()), `${name}.label`)
  const reset = action(() => value.set(initialValue), `${name}.reset`)

  return { value, enabled, label, reset }
}

export type ProcessModel = ReturnType<typeof reatomProcess>
export const process = reatomProcess()
```

Guidelines:

- Accept a `name` parameter and build all internal names from it, especially for repeated instances.
- Keep private implementation details inside the closure; expose a deliberate model API object.
- Put shared derived values in `computed`s instead of duplicating formatting or projection logic in views.
- Prefer exposing atom primitives directly when their setters are the real API; avoid actions that only forward to `.set()`.
- Use semantic actions when they validate input, coordinate multiple atoms, or represent domain operations.
- Export `ReturnType<typeof reatomX>` for component props and loader/model boundaries if needed.

## Component pattern — route render narrows, components receive models

Route loaders should be the source of route-specific forms/actions/data, while the route `render(self)` should own loader status branching. Page components should receive a typed, concrete model/data prop, not a `loader` prop. This keeps routing and async lifecycle concerns at the route boundary and avoids `any` creeping into form/model props. With concrete loader return types (no `undefined` branches), TypeScript narrows `status.data` to the full type in the refresh branch — no extra guards needed.

That refresh branch is for the same page identity: list filters, search params, or other refreshes where stale content is useful. If route params describe a different entity, shape the tree around that identity: a parent layout route loads the entity, and child routes build scoped page models from `await wrap(parentRoute.loader())`. The parent can render a skeleton instead of `outlet()` while the identity is pending, so children do not display a previous entity by accident.

```tsx
// ❌ Bad — imports route-specific form/actions from model files or passes loader
import { userForm, saveUserAction } from '../usersModel'
const UserFormPage = reatomComponent(({ loader }: { loader: any }) => { /* ... */ })

// ✅ Good — parent loader owns entity data; child loader creates the scoped model
const reatomUserEditModel = (user: User) => {
  const form = reatomUserForm(user)
  const saveUser = action(async () => wrap(api.saveUser(user.id, form()))).extend(
    withAsync({ status: true }),
    withAbort(),
  )
  return { form, saveUser, user }
}

type UserEditModel = ReturnType<typeof reatomUserEditModel>

const userRoute = usersRoute.reatomRoute({
  path: ':id',
  layout: true,
  async loader({ id }) {
    return await wrap(api.getUser(id))
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFirstPending || status.isPending) return <UserPageSkeleton />
    if (status.isRejected) return <PageError error={self.loader.error() ?? new Error('Request failed')} />
    return <>{self.outlet()}</>
  },
})

const userEditRoute = userRoute.reatomRoute({
  path: 'edit',
  async loader() {
    const user = await wrap(userRoute.loader())
    return reatomUserEditModel(user)
  },
  render(self) {
    const status = self.loader.status()
    if (status.isFirstPending || status.isPending) return <UserFormSkeleton />
    if (status.isFulfilled) return <UserFormPage model={status.data} />
    if (status.isRejected) return <PageError error={self.loader.error() ?? new Error('Request failed')} />

    return <></>
  },
})

const UserFormPage = reatomComponent(({
  model,
}: {
  model: UserEditModel
}) => {
  const { form, saveUser } = model
  const saveStatus = saveUser.status()

  return (
    <form onSubmit={(e) => { e.preventDefault(); saveUser() }}>
      <input {...bindField(form.fields.name)} />
      <button disabled={saveStatus.isPending}>Save</button>
    </form>
  )
})
```

Keep model files for shared app-wide state. If a form/action exists only for a route instance, create it in that route loader and expose its type with `ReturnType` from a `reatom*` factory or from the loader model shape. For identity-keyed pages, use parent loader data when the entity is required before the child model exists. If the child model must mount before the entity request resolves, use a fresh `entityAtom = atom<Entity | null>(null)`, a `load` action with `withAsync({ status: true, cacheParams: true })` plus `withAbort()` (or a computed resource with `withAsyncData()`), and domain actions that guard against `null` until the entity loads.

## Computed factory / scoped model pattern

A `computed` can return a scoped model (atoms, forms, actions, effects) whose instance is replaced when dependencies change. Add `withAbort()` when the returned model can start async work so old-scope tasks are cancelled.

```typescript
import { atom, computed, reatomForm, withAbort, wrap } from '@reatom/core'

const editedUserId = atom<string | null>(null, 'editedUserId')

const editedUserModel = computed(() => {
  const id = editedUserId()
  if (!id) return null

  const form = reatomForm(
    { name: '' },
    {
      name: `editedUserForm#${id}`,
      onSubmit: (values) => wrap(fetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(values),
      })),
    },
  )

  return { id, form }
}, 'editedUserModel').extend(withAbort())
```

Use this for selected rows, edit sessions, modals, and route-scoped models. Route loaders are often the best host because the URL already defines the scope.

## File organization

```typescript
// routes.ts — all route definitions with loaders (forms, actions, data)
// features/auth/authForm.ts — form factory functions (schemas)
// features/auth/authModel.ts — shared auth state (authState, authToken, isAuthenticated, currentUser)
// features/settings/settingsModel.ts — persisted setting atoms (themeAtom, etc.)
// features/users/usersModel.ts — shared user state (currentPage)
// features/users/pages/UsersPage.tsx — reads from route loaders
// features/users/pages/UserFormPage.tsx — reads from route loaders
```

**Rule of thumb:** If it's specific to a route (form, action, route-scoped data), it lives in the loader. If it's shared across the app (auth state, persisted settings, pagination), it lives in model files. React components should not become an alternate model layer; when a component starts needing React-owned state/effects to coordinate Reatom state, extract that coordination into a loader/model instead.
