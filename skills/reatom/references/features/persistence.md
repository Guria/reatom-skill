# Persistence Reference

> Source: [`packages/core/src/persist`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/persist) (core) and [`packages/core/src/persist/web-storage`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/persist/web-storage) (adapters). Per-adapter source links inline below.

State persistence allows your application to maintain state across browser sessions, page refreshes, and different tabs. All adapters support the same configuration options and automatically fall back to memory storage when unavailable.

**Check the target codebase's `package.json` to see which storage adapters are already in use and prefer those.**

## Table of contents

- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Version Migration](#version-migration)
- [Schema Validation](#schema-validation)
- [Adapter Comparison](#adapter-comparison)
- [URL Search Params — withSearchParams](#url-search-params--withsearchparams)
  - [searchParamsAtom — low-level API](#searchparamsatom--low-level-api)
  - [Options](#options)
  - [When to use withSearchParams vs route search schemas](#when-to-use-withsearchparams-vs-route-search-schemas)
- [Custom Storage Implementation](#custom-storage-implementation)
- [Gotchas](#gotchas)

## Quick Start

[`withPersist` core](https://github.com/reatom/reatom/blob/v1001/packages/core/src/persist/index.ts) · [Web storage adapters](https://github.com/reatom/reatom/tree/v1001/packages/core/src/persist/web-storage)


```typescript
import {
  atom,
  withLocalStorage,
  withSessionStorage,
  withBroadcastChannel,
  withIndexedDb,
  withCookie,
  withCookieStore,
} from '@reatom/core'

// Persistent across browser sessions
const userPrefs = atom({ theme: 'light' }, 'userPrefs').extend(
  withLocalStorage('user-preferences'),
)

// Session-only persistence (cleared when tab closes)
const wizardState = atom({ step: 1 }, 'wizardState').extend(
  withSessionStorage('wizard-progress'),
)

// Real-time cross-tab sync (no disk persistence)
const notificationCount = atom(0, 'notificationCount').extend(
  withBroadcastChannel('notification-count'),
)

// Large data (IndexedDB, requires `npm install idb-keyval`)
const cache = atom(new Map(), 'cache').extend(withIndexedDb('api-cache'))

// Server-accessible (sync, 4KB limit)
const authToken = atom('', 'authToken').extend(
  withCookie({ secure: true, sameSite: 'strict' })('auth-token'),
)

// Modern async cookies (Chrome 87+, service workers)
const session = atom('', 'session').extend(withCookieStore()('session-id'))
```

## Configuration Options

Defined by `WithPersistOptions` in [`persist/index.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/persist/index.ts).


All adapters accept either a simple key string or a full config object:

```typescript
// Simple key
const simple = atom(0).extend(withLocalStorage('my-key'))

// Full configuration
const configured = atom({ name: '', age: 0 }).extend(
  withLocalStorage({
    key: 'user-data',

    // Custom serialization — persist only what you need
    toSnapshot: (state) => ({ n: state.name, a: state.age }),
    fromSnapshot: (snapshot: any) => ({ name: snapshot.n, age: snapshot.a }),

    // Schema validation (any Standard Schema — Zod, Valibot, ArkType)
    // schema: UserDataSchema,

    // Version migration
    version: 2,
    migration: (record, currentVersion) => {
      if (record.version === 1) {
        return { name: record.data.userName, age: record.data.userAge }
      }
      return record.data
    },

    // TTL (time to live) in milliseconds
    time: 24 * 60 * 60 * 1000, // 24 hours

    // Cross-tab sync (default: true if storage supports it)
    subscribe: true,
  }),
)
```

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | **required** | Unique storage key |
| `toSnapshot` | `(state) => any` | identity | Serialize before saving |
| `fromSnapshot` | `(snapshot) => state` | identity | Deserialize after loading |
| `schema` | `StandardSchemaV1` | undefined | Validate and transform on restore |
| `version` | `number \| string` | `0` | Version for migration |
| `migration` | `(record, version) => state` | undefined | Migrate old data |
| `time` | `number` | MAX_SAFE_TIMEOUT | TTL in milliseconds |
| `subscribe` | `boolean` | `true` | Enable cross-tab sync |

## Version Migration

Handle data format changes gracefully:

```typescript
const user = atom({ name: '', preferences: {} }).extend(
  withLocalStorage({
    key: 'user',
    version: 3,
    migration: (record, currentVersion) => {
      if (record.version === 1) {
        return { name: record.data.userName, preferences: {} }
      }
      if (record.version === 2) {
        return { ...record.data, preferences: { theme: 'light' } }
      }
      return record.data
    },
  }),
)
```

## Schema Validation

Use any Standard Schema compliant library for automatic validation on restore:

```typescript
import { z } from 'zod/v4'

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
})

const user = atom({ name: '', age: 0 }).extend(
  withLocalStorage({ key: 'user', schema: UserSchema }),
)
// Data validated on restore; throws on invalid data
```

## Adapter Comparison

| Adapter | Persistent? | Cross-tab sync? | Size limit | Server-accessible? |
|---|---|---|---|---|
| `withLocalStorage` | ✅ | ✅ (storage events) | ~5-10MB | ❌ |
| `withSessionStorage` | Session only | ❌ | ~5-10MB | ❌ |
| `withBroadcastChannel` | ❌ (memory) | ✅ (instant) | No limit | ❌ |
| `withIndexedDb` | ✅ | ✅ (BroadcastChannel) | Hundreds of MB | ❌ |
| `withCookie` | ✅ | ❌ | 4KB | ✅ (sync) |
| `withCookieStore` | ✅ | ✅ (change events) | 4KB | ✅ (async, Chrome 87+) |
| `withSearchParams` | ✅ (in URL) | ✅ (URL changes) | URL length limit | ✅ |

## URL Search Params — withSearchParams

[Source: `routing/searchParams.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/searchParams.ts) · [Tests](https://github.com/reatom/reatom/blob/v1001/packages/core/src/routing/searchParams.test.browser.ts)


`withSearchParams` syncs atom state to the browser's URL search parameters. Unlike storage adapters, this persists state in the URL itself — shareable, bookmarkable, and tied to the current page.

```typescript
import { atom, withSearchParams, searchParamsAtom } from '@reatom/core'

// Simple: sync atom to a URL param (string by default)
const searchAtom = atom('', 'search').extend(withSearchParams('q'))

// With parse/serialize for typed values
const pageAtom = atom(1, 'page').extend(
  withSearchParams('page', {
    parse: (value) => Number(value ?? '1'),
    serialize: (value) => String(value),
  }),
)

// Scoped to a specific URL path (atom resets when navigating away)
const filterAtom = atom('all', 'filter').extend(
  withSearchParams('filter', {
    path: '/results',  // only syncs on /results and subpaths
  }),
)

// With replace history (no new history entry on change)
const tabAtom = atom(0, 'tab').extend(
  withSearchParams('tab', {
    parse: (v) => Number(v ?? '0'),
    replace: true,
  }),
)
```

### searchParamsAtom — low-level API

`searchParamsAtom` is the underlying computed that reads all search params and provides `set`/`del`/`lens` methods:

```typescript
import { searchParamsAtom } from '@reatom/core'

// Read all params as Record<string, string>
const params = searchParamsAtom()  // { q: 'hello', page: '2' }

// Set a param (pushes history entry)
searchParamsAtom.set('sort', 'asc')

// Set with replace (no new history entry)
searchParamsAtom.set('sort', 'desc', true)

// Delete a param
searchParamsAtom.del('sort')

// Create a typed lens atom for a specific param
const pageSize = searchParamsAtom.lens('size', {
  parse: (v) => Number(v ?? '20'),
  serialize: (v) => String(v),
})
pageSize()   // 20
pageSize.set(50)  // updates URL ?size=50
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `key` | `string` | **required** | URL parameter name |
| `parse` | `(value?: string) => T` | identity | Parse URL string into typed value |
| `serialize` | `(value: T) => string \| undefined` | `String` | Serialize value back to URL string. Return `undefined` to remove the param |
| `replace` | `boolean` | `false` | Replace history entry instead of pushing |
| `path` | `string` | `''` (any path) | Limit sync to a specific URL path. Append `/` for exact or `/*` for subpaths |

### When to use withSearchParams vs route search schemas

- **Route search schemas** (`reatomRoute({ search: z.object({...}) })`) — for params that define route state, affect loader inputs, and are part of navigation. Validated, typed, scoped to the route.
- **`withSearchParams`** — for standalone atoms that need URL persistence without being tied to a specific route. Useful for UI state (filters, tabs, expanded sections) shared across independent components.

## Custom Storage Implementation

The `PersistStorage` interface is exported from [`persist/index.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/persist/index.ts). For reference adapters see [`web-storage/`](https://github.com/reatom/reatom/tree/v1001/packages/core/src/persist/web-storage) (e.g. [`localStorage.ts`](https://github.com/reatom/reatom/blob/v1001/packages/core/src/persist/web-storage/localStorage.ts) is the smallest complete example).


```typescript
import { PersistStorage, reatomPersist } from '@reatom/core'

const createCustomStorage = (name: string): Omit<PersistStorage, 'cache'> => ({
  name,
  get: ({ key }) => {
    const item = localStorage.getItem(`${name}:${key}`)
    return item ? JSON.parse(item) : null
  },
  set: ({ key }, record) => {
    localStorage.setItem(`${name}:${key}`, JSON.stringify(record))
  },
  clear: ({ key }) => {
    localStorage.removeItem(`${name}:${key}`)
  },
  subscribe: ({ key }, callback) => {
    const handler = (event: StorageEvent) => {
      if (event.key === `${name}:${key}` && event.newValue) {
        callback(JSON.parse(event.newValue))
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  },
})

const withMyStorage = reatomPersist(createCustomStorage('my-app'))
const myAtom = atom('').extend(withMyStorage('my-key'))
```

## Gotchas

- All adapters auto-fallback to memory storage when APIs are unavailable (SSR, incognito, quota exceeded)
- `withIndexedDb` requires `idb-keyval` as peerDependency: `npm install idb-keyval`
- Use descriptive keys: `'user-profile'` not `'data'`
- Always set `version` for production data so you can migrate later
- Only persist what you need — use `toSnapshot` to exclude UI state (isLoading, errors)
- `withCookie` is sync; `withCookieStore` is async (modern browsers only)
- Cookies have a 4KB size limit — avoid storing large objects
- Use `secure: true` and `sameSite: 'strict'` for sensitive data
