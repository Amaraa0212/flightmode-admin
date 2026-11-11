import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Armchair, FileSpreadsheet, UserPlus, Users } from 'lucide-react'
import type { AgencyQuota } from '@/services'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { Button } from '@/components/ui/button'
import { ResourcePage } from '@/components/resource/resource-page'
import { pageConfig } from './components/config'
import { BookingDialog } from './components/booking-dialog'
import { ImportDialog } from './components/import-dialog'
import { PassengersDialog } from './components/passengers-dialog'
import { SeatDialog } from './components/seat-dialog'

const route = getRouteApi('/_authenticated/agency/quotas/')

/** Agency portal: the agency's seat quotas and the passengers sold on them */
export function AgencyQuotas() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const [open, setOpen] = useState<AgencyQuota | null>(null)
  const [booking, setBooking] = useState<AgencyQuota | null>(null)
  const [importing, setImporting] = useState<AgencyQuota | null>(null)
  const [seating, setSeating] = useState<AgencyQuota | null>(null)

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
              disabled={!row.is_open_for_names || (row.remaining < 1 && !row.is_waitlist)}
              title={
                !row.is_open_for_names
                  ? 'TKT deadline дууссан'
                  : row.remaining < 1
                    ? row.is_waitlist
                      ? 'Квот дүүрсэн — хүлээлгийн жагсаалтад (WL) нэмнэ'
                      : 'Квот дүүрсэн'
                    : 'Add passengers'
              }
              onClick={() => setBooking(row)}
            >
              <UserPlus className='size-3.5' />
              Зорчигч нэмэх
            </Button>
            {/* rights the airline gave the agency (Agents permission) */}
            {row.rights?.import_passengers && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1 px-2 text-xs'
                disabled={!row.is_open_for_names}
                title={row.is_open_for_names ? 'Excel-ээр зорчигч оруулах' : 'TKT deadline дууссан'}
                onClick={() => setImporting(row)}
              >
                <FileSpreadsheet className='size-3.5' />
                Excel
              </Button>
            )}
            {row.rights?.assign_seats && row.is_charter && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 gap-1 px-2 text-xs'
                disabled={!row.seats_open}
                title={row.seats_open ? 'Зорчигчдод суудал захиалах' : 'Check-in эхэлсэн'}
                onClick={() => setSeating(row)}
              >
                <Armchair className='size-3.5' />
                Суудал
              </Button>
            )}
            <Button size='sm' variant='secondary' className='h-7 gap-1 px-2 text-xs' onClick={() => setOpen(row)}>
              <Users className='size-3.5' />
              Passengers
            </Button>
          </div>
        )}
      />
      <PassengersDialog quota={open} onClose={() => setOpen(null)} />
      <BookingDialog quota={booking} onClose={() => setBooking(null)} />
      <ImportDialog quota={importing} onClose={() => setImporting(null)} />
      <SeatDialog quota={seating} onClose={() => setSeating(null)} />
    </>
  )
}
