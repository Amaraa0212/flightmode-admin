import { create } from 'zustand'
import type { AuthUser } from '@/services/types/shared/auth.types'

const USER_INFO = 'user_info'
const TOKEN = 'auth_token'

interface AuthState {
  auth: {
    user: AuthUser | null
    /** Sanctum Bearer token from POST /auth/login */
    token: string | null
    setSession: (user: AuthUser, token: string) => void
    setUser: (user: AuthUser | null) => void
    reset: () => void
  }
}

function read<T>(key: string, parse: (raw: string) => T): T | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(key)
    return stored ? parse(stored) : null
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Ignore storage errors.
  }
}

// a user kept by the old mock login has no token / permissions — sign in again
const storedToken = read(TOKEN, (raw) => raw)
const storedUser = storedToken
  ? read(USER_INFO, (raw) => JSON.parse(raw) as AuthUser)
  : null

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: storedUser && Array.isArray(storedUser.permissions) ? storedUser : null,
    token: storedToken,
    setSession: (user, token) => {
      write(USER_INFO, JSON.stringify(user))
      write(TOKEN, token)
      set((state) => ({ ...state, auth: { ...state.auth, user, token } }))
    },
    setUser: (user) => {
      write(USER_INFO, user ? JSON.stringify(user) : null)
      set((state) => ({ ...state, auth: { ...state.auth, user } }))
    },
    reset: () => {
      write(USER_INFO, null)
      write(TOKEN, null)
      set((state) => ({ ...state, auth: { ...state.auth, user: null, token: null } }))
    },
  },
}))

/** Permission check for menus and buttons (system administrators have every key) */
export function can(permission: string | undefined) {
  if (!permission) return true
  const user = useAuthStore.getState().auth.user
  return !!user && (user.is_system_admin || user.permissions.includes(permission))
}

/** Hook version — re-renders when the user changes */
export function useCan() {
  const user = useAuthStore((s) => s.auth.user)
  return (permission: string | undefined) =>
    !permission || (!!user && (user.is_system_admin || user.permissions.includes(permission)))
}
