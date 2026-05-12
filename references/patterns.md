# Patterns Reference

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

## Component pattern — pull everything from loader

Components should only read from the route loader. Model files contain only shared app-wide state.

```tsx
// ❌ Bad — imports form and actions from model files
import { userForm, saveUserAction } from '../usersModel'

// ✅ Good — everything comes from the route loader
const UserFormPage = reatomComponent(() => {
  const isCreate = userCreateRoute.match()
  const loader = isCreate ? userCreateRoute.loader : userEditRoute.loader

  const ready = loader.ready()
  const data = loader.data()
  const error = loader.error()

  if (!ready) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return null

  const { form, saveUserAction } = data
  const { fields, submit, validation } = form
  const saveStatus = saveUserAction.status()

  return (
    <form onSubmit={(e) => { e.preventDefault(); saveUserAction() }}>
      <input {...bindField(fields.name)} />
      <button disabled={saveStatus.isPending}>Save</button>
    </form>
  )
})
```

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
