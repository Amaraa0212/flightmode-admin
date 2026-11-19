import { getRouteApi } from '@tanstack/react-router'
import { airlineOptions, type AirlineSsr } from '@/services'
import { useAuthStore } from '@/stores/auth-store'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { col, muted } from '@/components/resource/columns'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig, ssrFields } from './components/config'

const route = getRouteApi('/_authenticated/rules/ssr/')

/**
 * The SSRs an airline offers — saved per airline; the DCS, the agency portal and online check-in show these on
 * the airline's flights. A system administrator sees every airline's and picks the airline when adding one.
 */
export function SsrCodes() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const isSystemAdmin = !!useAuthStore((s) => s.auth.user?.is_system_admin)
  const form = pageConfig.form!

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      columns={
        isSystemAdmin
          ? [
              ...pageConfig.columns,
              col<AirlineSsr>('airline', 'Airline', (r) => muted(r.airline ?? '')),
            ]
          : pageConfig.columns
      }
      form={{
        ...form,
        fields: isSystemAdmin
          ? [
              {
                name: 'airline_id',
                label: 'Airline',
                type: 'select',
                required: true,
                loadOptions: airlineOptions,
                gridCols: 2,
              },
              ...ssrFields(false),
            ]
          : form.fields,
      }}
    />
  )
}
