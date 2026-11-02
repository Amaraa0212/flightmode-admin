import { authService } from '@/services'
import { useAuthStore } from '@/stores/auth-store'

/** Reload /auth/me: permissions and the sidebar menus changed by an administrator apply without signing in again */
export async function refreshProfile() {
  const res = await authService.me()
  if (res.body) useAuthStore.getState().auth.setUser(res.body)
}
