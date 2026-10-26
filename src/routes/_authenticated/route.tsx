import { createFileRoute, redirect } from '@tanstack/react-router'
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
    // the menu hides what the role may not use; a URL typed in by hand is checked the same way
    if (!canOpenPath(user, location.pathname)) {
      throw redirect({ to: '/403' })
    }
  },
  component: AuthenticatedLayout,
})
