import { getRouteApi } from '@tanstack/react-router'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/fleet/aircraft/')

export function Fleets() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
    />
  )
}
