import { getRouteApi } from '@tanstack/react-router'
import { useDrawer } from '@/context/drawer-provider'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { ResourcePage } from '@/components/resource/resource-page'
import { BookingDetail } from './components/booking-detail'
import { pageConfig } from './components/config'

const route = getRouteApi('/_authenticated/inventory/bookings/')

export function Bookings() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { openDrawer, closeDrawer } = useDrawer()

  return (
    <ResourcePage
      {...pageConfig}
      search={search}
      navigate={navigate as unknown as NavigateFn}
      onRowClick={(row) =>
        openDrawer({
          title: `Booking ${row.pnr}`,
          description: 'Passengers, segments and tickets',
          content: <BookingDetail id={row.id} onClose={closeDrawer} />,
        })
      }
    />
  )
}
