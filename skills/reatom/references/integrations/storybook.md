# Storybook Integration Patterns

Use this reference when the user wants isolated component work, visual review, routed story scenarios, or browser-driven interaction tests around a Reatom app.

The examples below use **React + Vite** because that is the most common setup in this skill. Adapt the Storybook renderer and framework package if the project uses a different UI adapter.

## Table of contents

- [Overview](#overview)
- [When Storybook is worth adding](#when-storybook-is-worth-adding)
- [Packages](#packages)
- [Minimal configuration](#minimal-configuration)
  - [main.ts](#maints)
  - [preview.tsx](#previewtsx)
  - [Routed stories and URL ownership](#routed-stories-and-url-ownership)
- [Optional request mocking with MSW](#optional-request-mocking-with-msw)
- [Story patterns](#story-patterns)
  - [Component stories](#component-stories)
  - [Integration stories](#integration-stories)
- [Optional browser-test integration](#optional-browser-test-integration)
- [Pitfalls](#pitfalls)

## Overview

Storybook is useful for two different kinds of work:

1. **Component stories** — isolate a single UI surface with a fresh Reatom context.
2. **Integration stories** — render a larger app slice with routing, async data, and interaction flows.

For Reatom, the important part is not Storybook itself — it is **story isolation**. Each story should start with a fresh frame so atoms, route registrations, subscriptions, and async work do not leak into the next story.

If the app uses strict context setup (`clearStack()` + `context.start()`), keep that setup active in Storybook too. The story environment should reflect the runtime model the app actually uses.

## When Storybook is worth adding

Add Storybook when the user wants one or more of these:

- isolated UI work without booting the whole app
- repeatable interaction checks around a feature
- routed scenarios that are easier to reason about as fixed starting states
- visual review or design collaboration
- browser-level checks that reuse stories as executable test cases

## Packages

| Package | Purpose |
|---|---|
| `storybook` | Core Storybook CLI |
| `@storybook/react-vite` | React + Vite renderer/framework |
| `@storybook/addon-a11y` | Accessibility checks in stories |
| `@storybook/addon-docs` | Auto-generated docs tab |
| `@storybook/addon-vitest` | Reuse stories in Vitest browser runs |
| `msw` | Optional HTTP mocking for stories that perform requests |
| `msw-storybook-addon` | Optional MSW wiring and per-story handler overrides |
| `@vitest/browser-playwright` | Browser provider for Vitest story runs |

Verify versions before installing because Storybook moves quickly:

```bash
npm view storybook dist-tags
npm view @storybook/react-vite dist-tags
npm view @storybook/addon-vitest dist-tags
npm view msw dist-tags
```

If the project uses another renderer, swap only the framework package and type imports. The Reatom-specific parts of this guide stay the same.

## Minimal configuration

### main.ts

Use a small config first. Add extra addons only when the user needs them.

```ts
import { defineMain } from '@storybook/react-vite/node'

export default defineMain({
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    // 'msw-storybook-addon', // only if stories perform HTTP requests
  ],
  // staticDirs: ['../public'], // only if using MSW's service worker
})
```

Keep the config boring unless the project has a real reason not to. Storybook should be a stable harness, not another custom platform to debug.

### preview.tsx

The core Reatom requirement is a **fresh frame per story**.

```tsx
import '../src/setup' // must stay the first import if the project uses clearStack()

import { context, noop, urlAtom } from '@reatom/core'
import { reatomContext } from '@reatom/react'
import addonA11y from '@storybook/addon-a11y'
import { definePreview } from '@storybook/react-vite'
import { useMemo, type PropsWithChildren } from 'react'

// Optional MSW wiring:
// import { initialize, mswLoader } from 'msw-storybook-addon'
// initialize({
//   onUnhandledRequest: 'bypass',
//   quiet: true,
//   serviceWorker: {
//     url: `${import.meta.env['BASE_URL']}mockServiceWorker.js`,
//   },
// })

function createStoryFrame(initialPath = '/') {
  const frame = context.start()

  frame.run(() => {
    urlAtom.routes = {}
    urlAtom.sync.set(() => noop)
    urlAtom.go(initialPath)
  })

  return frame
}

function ReatomDecorator({
  children,
  initialPath = '/',
}: PropsWithChildren<{ initialPath?: string }>) {
  const frame = useMemo(() => createStoryFrame(initialPath), [initialPath])
  return <reatomContext.Provider value={frame}>{children}</reatomContext.Provider>
}

const preview = definePreview({
  addons: [addonA11y()],
  // loaders: [mswLoader], // enable only when using MSW
  decorators: [
    (Story, { parameters }) => (
      <ReatomDecorator initialPath={parameters['initialPath']}>
        <Story />
      </ReatomDecorator>
    ),
  ],
  parameters: {
    a11y: { test: 'todo' },
    // msw: { handlers }, // add only when using MSW
  },
})

export default preview
```

Why this shape matters:

- `import '../src/setup'` stays first when the app relies on strict setup; configure import sorters/organize-import tools so they do not move it.
- `context.start()` creates story isolation.
- `urlAtom.routes = {}` clears prior route registrations for routed stories.
- `urlAtom.sync.set(() => noop)` prevents routed stories from fighting Storybook's own iframe URL.
- `initialPath` lets integration stories start at a known route.

If a story does not touch routing, this still works; it just keeps the story harness consistent.

### Routed stories and URL ownership

Storybook owns the iframe URL. A routed Reatom app also wants to own URL state. Decide that boundary explicitly.

For most Storybook setups, the simplest rule is:

- keep Reatom routing **internal to the story frame**
- disable outward URL synchronization with `urlAtom.sync.set(() => noop)`
- seed the route state from a story parameter like `initialPath`

That is enough for isolated routed scenarios without mutating Storybook navigation itself.

If the app already has a custom router bridge, keep the same mental model here: one side owns the browser URL, the other side mirrors or stubs it. Do not let two systems compete for `window.location` in the same story.

## Optional request mocking with MSW

MSW is useful when stories or interaction tests perform real HTTP requests. It is unnecessary for purely presentational stories or stories whose state is provided directly by atoms/props.

### When to use it

Use MSW for:

- async lists/details loaded by a story
- retry, empty, loading, and error state coverage
- integration stories that exercise a realistic request flow

Skip it for:

- presentational components
- stories that only depend on local atoms
- simple interaction examples with no network boundary

### Minimal setup

```bash
npm i -D msw@latest msw-storybook-addon@latest
npx msw init public/ --save
```

Then uncomment the MSW parts in `main.ts` and `preview.tsx`.

A good handler shape is a stable default map plus small per-story overrides:

```ts
import { delay, http, HttpResponse } from 'msw'

export const itemCollection = {
  default: http.get('/api/items', async () => {
    await delay()
    return HttpResponse.json([{ id: '1', title: 'First item' }])
  }),
  error: http.get('/api/items', async () => {
    await delay()
    return HttpResponse.error()
  }),
  loading: http.get('/api/items', async () => new Promise(() => {})),
}

export const handlers = {
  itemCollection: itemCollection.default,
}
```

Then override only what changes in a specific story:

```ts
parameters: {
  msw: {
    handlers: {
      itemCollection: itemCollection.error,
    },
  },
}
```

This pattern keeps stories readable and avoids copying entire mock setups into every scenario.

## Story patterns

### Component stories

Use these when the component can be understood in isolation.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'

import { CounterPanel } from './CounterPanel'

const meta = {
  title: 'Features/CounterPanel',
  component: CounterPanel,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof CounterPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { name: /counter/i })).toBeInTheDocument()
  },
}
```

Use a component story when you want to check rendering, local interaction, and edge states without bringing in the whole app shell.

### Integration stories

Use these when the feature only makes sense with routing, loaders, or a larger layout around it.

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'

import { AppShell } from '../AppShell'
import { itemCollection } from '../mocks/handlers'

const meta = {
  title: 'Integration/Items',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
    initialPath: '/items',
  },
} satisfies Meta<typeof AppShell>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('main')).toBeInTheDocument()
  },
}

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: {
        itemCollection: itemCollection.error,
      },
    },
  },
}

export const NavigateToDetail: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('link', { name: /first item/i }))
    await expect(
      await canvas.findByRole('heading', { name: /first item/i }),
    ).toBeInTheDocument()
  },
}
```

Integration stories are where `initialPath`, fresh frames, and optional MSW pay off.

## Optional browser-test integration

If the user wants stories to double as executable browser checks, wire Storybook into Vitest.

```ts
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.resolve('.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
```

If the stories use named viewports, keep the browser test viewport aligned with the same story setting in `preview` hooks. Otherwise the CI run and the visible Storybook canvas can drift apart.

## Pitfalls

- **No fresh frame per story** — atoms, route state, and subscriptions leak between stories.
- **Strict setup imported too late** — if `clearStack()` is part of the app setup, the setup module must load before story modules that create atoms, and formatter/linter import sorting must not reorder it below normal imports.
- **Routed stories fighting the iframe URL** — stub or bridge `urlAtom.sync`; do not let Storybook and Reatom both own `window.location`.
- **MSW enabled by default without need** — it adds moving parts; keep it optional.
- **Stale `mockServiceWorker.js`** — regenerate it after `msw` updates.
- **Huge story fixtures** — prefer small, named scenarios over one giant integration story with many branches.
- **Story-only hacks leaking into app code** — keep harness code in Storybook files or test utilities, not in feature modules.
- **Overprescribing Storybook in bootstrap flows** — add it because the user needs it, not because it exists.
