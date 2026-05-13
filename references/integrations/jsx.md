# Native JSX Reference (`@reatom/jsx`)

## Sources

Package: [`packages/jsx`](https://github.com/reatom/reatom/tree/v1001/packages/jsx)

- Runtime entry: [`packages/jsx/src/index.ts`](https://github.com/reatom/reatom/blob/v1001/packages/jsx/src/index.ts)
- Type definitions: [`packages/jsx/src/jsx.d.ts`](https://github.com/reatom/reatom/blob/v1001/packages/jsx/src/jsx.d.ts)
- Utilities (CSS-in-JS, helpers): [`packages/jsx/src/utils.ts`](https://github.com/reatom/reatom/blob/v1001/packages/jsx/src/utils.ts)
- Tests / examples: [`packages/jsx/src/index.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/jsx/src/index.test.tsx), [`linked-list.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/jsx/src/linked-list.test.tsx), [`unmount.test.tsx`](https://github.com/reatom/reatom/blob/v1001/packages/jsx/src/unmount.test.tsx)

`@reatom/jsx` is a native JSX runtime (no Virtual DOM) that binds DOM elements to Reatom reactively with zero re-renders. It is an alternative to `@reatom/react` for framework-less applications.

## Setup

**Vite (`vite.config.js`)**:
```js
export default defineConfig({
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'hf',
    jsxInject: `import { h, hf } from "@reatom/jsx"`,
  },
})
```

**TypeScript (`tsconfig.json`)**:
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@reatom/jsx"
  }
}
```

## Mounting

```tsx
import { context, clearStack } from '@reatom/core'
import { mount } from '@reatom/jsx'
import { App } from './App'

clearStack()
const rootContext = context.start()

const { unmount } = mount(document.getElementById('app')!, <App />)
```

## Props and Attributes

- **Default**: Guesses between property or attribute.
- **`prop:*`**: Explicitly sets a DOM property.
- **`attr:*`**: Explicitly sets a DOM attribute.
- **`on:*`**: Registers an event listener. Functions are automatically wrapped in `wrap()` to preserve Reatom async context.
- **`model:*`**: Two-way binding. Supports `model:value`, `model:valueAsNumber`, `model:checked`.

All values can be primitives or `AtomLike` (automatically tracked).

```tsx
const enabled = atom(true)
const value = atom('')

<input
  model:value={value}
  attr:type="text"
  prop:disabled={() => !enabled()}
  on:input={(event) => console.log(event.currentTarget.value)}
/>
```

## Styling

### `style` and `style:*`
```tsx
<div style={{ top: 0, display: hidden() && 'none' }} />

// Individual reactive styles (no automatic 'px' addition)
<div style:top={atom('10px')} style:bottom={undefined} />
```

### `class` and `reatomClassName`
The `class` prop natively uses `reatomClassName` logic (similar to `clsx` but fully reactive).

```tsx
<button class={[
  'btn',
  `btn--${props.theme}`,
  { 'btn--active': props.isActive() }
]} />
```

### `css` (CSS-in-JS)
Write CSS directly on elements. Dynamic values are passed as CSS variables (`css:*`). No build step needed; generates an isolated `data-reatom-style` rule.

```tsx
const size = atom(3)

<input
  css:size={size}
  css="font-size: calc(1em + var(--size) * 0.1em);"
/>
```

## Components

Components are executed **once** on mount. They do not re-render. State changes update the DOM directly via atom subscriptions.

```tsx
const Counter = () => {
  const count = atom(0) // Safe to define inside, runs once!
  return (
    <button on:click={() => count.set(c => c + 1)}>
      Count: {count}
    </button>
  )
}
```

### ⚠️ Do Not Reuse Elements
JSX elements are real DOM nodes. Reusing an instance means it is moved, not copied. Always instantiate fresh components.

```tsx
const Shared = () => <span>{valueAtom}</span>

// ✅ Correct
<>
  <div><Shared /></div>
  <p><Shared /></p>
</>
```

## Advanced Utilities

### `$spread`
Declaratively bind multiple props/attributes. Can be reactive.
```tsx
<div $spread={() => valid() ? { disabled: true } : { disabled: false }} />
```

### `<Bind>`
Add `@reatom/jsx` reactive features to an existing DOM element returned from a 3rd-party library.
```tsx
import { Bind } from '@reatom/jsx'

const container = new SomeLibrary()
return <Bind element={container} class={() => visible() ? 'active' : ''} />
```

### `ref` unmount
The `ref` callback can return a cleanup function, executed on unmount.
```tsx
<div ref={(el) => {
  console.log('mounted')
  return () => console.log('unmounted')
}} />
```
