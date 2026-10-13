import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/access/users/')

/** Organisation fields an agency administrator does not choose — the API puts new users in their agency */
const ORG_FIELDS = ['airline_id', 'airport_id', 'agency_id']

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const user = useAuthStore((s) => s.auth.user)
  const isAgency = user?.role?.scope === 'agency'

  const config = useMemo(() => {
    if (!isAgency || !pageConfig.form) return pageConfig
    return {
      ...pageConfig,
      title: 'Агентууд',
      description: `${user?.agency?.name ?? 'Agency'} — ticketing agents and administrators`,
      filters: pageConfig.filters?.filter((f) => f.columnId !== 'scope'),
      form: {
        ...pageConfig.form,
        fields: pageConfig.form.fields.filter((f) => !ORG_FIELDS.includes(String(f.name))),
        // a new person is a ticketing agent unless changed (role ids come from /admin/users/role-options)
        empty: { ...pageConfig.form.empty, role_id: '' },
      },
    }
  }, [isAgency, user?.agency?.name])

  return <ResourcePage {...config} search={search} navigate={navigate as unknown as NavigateFn} />
}
