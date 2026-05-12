# Persistence Reference

State persistence allows your application to maintain state across browser sessions, page refreshes, and different tabs. All adapters support the same configuration options and automatically fall back to memory storage when unavailable.

**Check the target codebase's `package.json` to see which storage adapters are already in use and prefer those.**

## Quick Start

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

## Custom Storage Implementation

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
