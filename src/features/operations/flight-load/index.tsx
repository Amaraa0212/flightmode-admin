import { getRouteApi } from '@tanstack/react-router'
import { useDrawer } from '@/context/drawer-provider'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { FlightPassengersTable } from '@/components/flight-passengers-table'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/operations/flight-load/')

export function FlightLoad() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { openDrawer } = useDrawer()

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      onRowClick={(row) =>
        openDrawer({
          title: `${row.flight_number} ${row.origin.iata_code}-${row.destination.iata_code}`,
          description: `${row.pax.booked} booked · ${row.pax.checked_in} checked in · ${row.pax.boarded} boarded`,
          className: 'sm:max-w-5xl',
          content: <FlightPassengersTable flightId={row.id} />,
        })
      }
    />
  )
}
