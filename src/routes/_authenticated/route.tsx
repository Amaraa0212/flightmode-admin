import { createFileRoute, redirect } from '@tanstack/react-router'
import { homeHostFor } from '@/config/app'
import { useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { canOpenPath } from '@/components/layout/data/sidebar-data'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    // flightmode-api Sanctum token + profile (permissions) from POST /auth/login
    const { user, token } = useAuthStore.getState().auth
    if (!user || !token) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
    // agencies use the agency portal host, airline staff the admin host: sign in again there (tokens are per site)
    const home = homeHostFor(user)
    if (home) {
      useAuthStore.getState().auth.reset()
      window.location.assign(`${window.location.protocol}//${home}/sign-in`)
      throw redirect({ to: '/sign-in' })
    }
    // the menu hides what the role may not use; a URL typed in by hand is checked the same way
    if (!canOpenPath(user, location.pathname)) {
      throw redirect({ to: '/403' })
    }
  },
  component: AuthenticatedLayout,
})
