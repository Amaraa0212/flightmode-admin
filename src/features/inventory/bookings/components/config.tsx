import { bookingService, type Booking } from '@/services'
import {
  BOOKING_SOURCE,
  BOOKING_SOURCE_OPTIONS,
  BOOKING_STATUS,
  BOOKING_STATUS_OPTIONS,
} from '@/constants/status'
import {
  brand,
  chip,
  col,
  dateTime,
  money,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<Booking>,
  'search' | 'navigate'
> = {
  title: 'Modification',
  description:
    'Bookings (PNR) — passengers, segments, agency and payment totals',
  queryKey: 'admin-bookings',
  list: bookingService.list,
  searchPlaceholder: 'PNR, contact email / phone or agency',
  filters: [
    { columnId: 'status', title: 'Status', options: BOOKING_STATUS_OPTIONS },
    { columnId: 'source', title: 'Source', options: BOOKING_SOURCE_OPTIONS },
  ],
  exportFileName: 'bookings.xlsx',
  columns: [
    col<Booking>('pnr', 'PNR', (r) => brand(r.pnr)),
    col<Booking>(
      'lead',
      'Lead passenger',
      (r) => (
        <span className='font-medium'>{`${r.passengers[0].last_name}/${r.passengers[0].first_name}`}</span>
      ),
      { accessor: (r) => r.passengers[0].last_name }
    ),
    col<Booking>('pax', 'PAX', (r) => mono(r.passengers.length)),
    col<Booking>(
      'outbound',
      'Outbound',
      (r) =>
        mono(
          `${r.passengers[0].segments[0].flight_number} ${r.passengers[0].segments[0].route}`
        ),
      { accessor: (r) => r.passengers[0].segments[0].flight_number }
    ),
    col<Booking>('agency', 'Agent', (r) => muted(r.agency?.name ?? 'Direct'), {
      accessor: (r) => r.agency?.name,
    }),
    col<Booking>('source', 'Source', (r) => chip(r.source, BOOKING_SOURCE)),
    col<Booking>('total_amount', 'Total', (r) => money(r.total_amount)),
    col<Booking>('status', 'Status', (r) => chip(r.status, BOOKING_STATUS)),
    col<Booking>('created_at', 'Issued', (r) => dateTime(r.created_at)),
  ],
}
