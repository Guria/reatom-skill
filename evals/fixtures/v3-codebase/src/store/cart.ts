// Eval #7 fixture — v3 Reatom code that needs migration to v1000+.
// The skill must collapse imports to @reatom/core and replace v3-only APIs.
import { atom } from '@reatom/core'
import { onUpdate, onConnect } from '@reatom/hooks'
import { reatomAsync } from '@reatom/async'
import { withLocalStorage } from '@reatom/persist-web-storage'

export interface CartItem {
  id: string
  qty: number
}

export const cartItems = atom<CartItem[]>([], 'cart.items').pipe(
  withLocalStorage('cart.items'),
)

export const fetchCart = reatomAsync(
  async (ctx) => {
    const res = await fetch('/api/cart')
    return (await res.json()) as CartItem[]
  },
  'cart.fetch',
)

onConnect(cartItems, (ctx) => {
  fetchCart(ctx)
})

onUpdate(fetchCart.dataAtom, (ctx, items) => {
  cartItems(ctx, items)
})
