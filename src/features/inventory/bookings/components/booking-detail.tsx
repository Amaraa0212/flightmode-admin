import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { bookingService } from '@/services'
import { Ban, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatMnt } from '@/lib/utils'
import {
  BOOKING_SOURCE,
  BOOKING_STATUS,
  CABIN_CLASS,
  SEGMENT_STATUS,
} from '@/constants/status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InfoPill, StatusChip } from '@/components/status-chip'
import { pageConfig } from './config'

export function BookingDetail({
  id,
  onClose,
}: {
  id: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data: booking } = useQuery({
    queryKey: [pageConfig.queryKey, 'detail', id],
    queryFn: async () => (await bookingService.getById(id)).body,
  })
  const cancel = useMutation({
    mutationFn: () => bookingService.cancel(id),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [pageConfig.queryKey] })
      onClose()
    },
  })

  if (!booking) return <Skeleton className='h-96' />

  return (
    <div className='space-y-4 pb-6'>
      <div className='flex flex-wrap items-center gap-2'>
        <InfoPill label='PNR' value={booking.pnr} />
        <StatusChip value={booking.status} map={BOOKING_STATUS} size='md' />
        <StatusChip
          value={booking.source}
          map={BOOKING_SOURCE}
          size='md'
          dot={false}
        />
      </div>

      <div className='fm-inset grid grid-cols-2 gap-3 p-3 text-sm'>
        <div>
          <p className='text-muted-foreground text-xs'>Agency</p>
          <p className='font-medium'>{booking.agency?.name ?? 'Direct'}</p>
        </div>
        <div>
          <p className='text-muted-foreground text-xs'>Issued</p>
          <p className='font-mono'>
            {formatDate(booking.created_at, 'YYYY-MM-DD HH:mm')}
          </p>
        </div>
        <p className='flex items-center gap-2 text-xs'>
          <Mail className='size-3.5' />
          {booking.contact_email}
        </p>
        <p className='flex items-center gap-2 font-mono text-xs'>
          <Phone className='size-3.5' />
          {booking.contact_phone}
        </p>
      </div>

      <div className='space-y-2'>
        <p className='fm-label'>Passengers</p>
        {booking.passengers.map((p) => (
          <div key={p.id} className='fm-inset space-y-2 p-3'>
            <div className='flex items-center justify-between'>
              <p className='font-semibold'>
                {p.last_name}/{p.first_name}{' '}
                <span className='text-muted-foreground text-xs font-normal'>
                  {p.type} · {p.gender} · {p.date_of_birth}
                </span>
              </p>
              <span className='font-mono text-xs'>{p.document_number}</span>
            </div>
            {p.segments.map((s) => (
              <div
                key={s.id}
                className='bg-card flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs'
              >
                <span className='text-brand font-mono font-semibold'>
                  {s.flight_number}
                </span>
                <span>{s.route}</span>
                <span className='font-mono'>
                  {formatDate(s.departure_at, 'YYYY-MM-DD HH:mm')}
                </span>
                <StatusChip
                  value={s.cabin_class}
                  map={CABIN_CLASS}
                  dot={false}
                />
                <span className='font-mono'>RBD {s.fare_class}</span>
                <span className='font-mono'>ETKT {s.ticket_number}</span>
                <span className='ms-auto font-mono'>
                  {formatMnt(s.total_amount)}
                </span>
                <StatusChip value={s.status} map={SEGMENT_STATUS} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className='flex items-center justify-between border-t pt-3'>
        <span className='text-sm'>
          Total <b className='font-mono'>{formatMnt(booking.total_amount)}</b>
        </span>
        {booking.status !== 'cancelled' && (
          <Button
            variant='destructive'
            size='sm'
            className='gap-2'
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            <Ban className='size-4' />
            Cancel booking
          </Button>
        )}
      </div>
    </div>
  )
}
