import { getRouteApi } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { ResourcePage } from '@/components/resource/resource-page'
import { airlinePageConfig } from './components/config'

const route = getRouteApi('/_authenticated/company/airlines/')

export function Airlines() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const isSystemAdmin = useAuthStore((s) => !!s.auth.user?.is_system_admin)

  return (
    <ResourcePage
      {...airlinePageConfig(isSystemAdmin)}
      search={search}
      navigate={navigate as unknown as NavigateFn}
    />
  )
}
