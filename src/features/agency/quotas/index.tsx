import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { UserPlus, Users } from 'lucide-react'
import type { AgencyQuota } from '@/services'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { BookingDialog } from './components/booking-dialog'
import { PassengersDialog } from './components/passengers-dialog'

const route = getRouteApi('/_authenticated/agency/quotas/')

/** Agency portal: the agency's seat quotas and the passengers sold on them */
export function AgencyQuotas() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [open, setOpen] = useState<AgencyQuota | null>(null)
  const [booking, setBooking] = useState<AgencyQuota | null>(null)

  return (
    <>
      <ResourcePage
        {...pageConfig}
        search={search}
        navigate={navigate as unknown as NavigateFn}
        onRowClick={setOpen}
        customActions={(row) => (
          <div className='flex gap-1' onClick={(e) => e.stopPropagation()}>
            <Button
              size='sm'
              className='h-7 gap-1 px-2 text-xs'
              disabled={!row.is_open_for_names || row.remaining < 1}
              title={
                !row.is_open_for_names
                  ? 'Names deadline has passed'
                  : row.remaining < 1
                    ? 'No seats left on the quota'
                    : 'Add passengers'
              }
              onClick={() => setBooking(row)}
            >
              <UserPlus className='size-3.5' />
              Зорчигч нэмэх
            </Button>
            <Button size='sm' variant='secondary' className='h-7 gap-1 px-2 text-xs' onClick={() => setOpen(row)}>
              <Users className='size-3.5' />
              Passengers
            </Button>
          </div>
        )}
      />
      <PassengersDialog quota={open} onClose={() => setOpen(null)} />
      <BookingDialog quota={booking} onClose={() => setBooking(null)} />
    </>
  )
}
