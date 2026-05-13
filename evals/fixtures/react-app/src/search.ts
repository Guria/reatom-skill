// Eval #1 fixture — debounced search starting point.
// The skill should turn this into a Reatom-idiomatic debounced fetch.
import { atom } from '@reatom/core'

export const searchQuery = atom('', 'searchQuery')

// TODO: add debounced fetch action / computed wired to searchQuery,
// exposing data + loading + error.
