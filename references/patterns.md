# Patterns Reference

## Atomization pattern

Keep immutable structure as plain data, lift mutable fields into atoms.

Keep state transitions in the Reatom model layer (atoms, actions, computeds, hooks/extensions). React components should bind and render atoms, not mirror Reatom state into React state or use lifecycle effects to maintain model invariants.

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
- Use factory pattern: `reatomUser(userDto, 'users' + userDto.id)`

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

**Rule of thumb:** If it's specific to a route (form, action, route-scoped data), it lives in the loader. If it's shared across the app (auth state, persisted settings, pagination), it lives in model files.
