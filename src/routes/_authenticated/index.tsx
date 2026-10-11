import { createFileRoute, redirect } from '@tanstack/react-router'
import { can, useAuthStore } from '@/stores/auth-store'
import { firstAllowedUrl } from '@/components/layout/data/sidebar-data'
import { Dashboard } from '@/features/dashboard'

export const Route = createFileRoute('/_authenticated/')({
  // station staff have no dashboard — open their first screen instead
  beforeLoad: () => {
    if (!can('dashboard.view')) {
      const to = firstAllowedUrl(useAuthStore.getState().auth.user)
      if (to && to !== '/') throw redirect({ to })
    }
  },
  component: Dashboard,
})
