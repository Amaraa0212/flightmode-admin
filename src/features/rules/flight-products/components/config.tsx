import { flightProductService, type FlightProducts } from '@/services'
import {
  brand,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const minutes = (m: number) => (m >= 60 ? `${m / 60}h` : `${m}m`)

export const pageConfig: Omit<
  ResourcePageProps<FlightProducts>,
  'search' | 'navigate'
> = {
  title: 'Shop items',
  description:
    'Products per flight — baggage, paid seats, zone profile, online check-in window',
  queryKey: 'admin-flight-products',
  list: flightProductService.list,
  rowKey: 'flight_id',
  searchPlaceholder: 'Flight, route or template',
  columns: [
    col<FlightProducts>('flight_number', 'Flight no', (r) =>
      brand(r.flight_number)
    ),
    col<FlightProducts>('departure_at', 'Dep datetime', (r) =>
      dateTime(r.departure_at)
    ),
    col<FlightProducts>('route', 'Route', (r) => r.route),
    col<FlightProducts>('template', 'Template', (r) => (
      <span className='font-medium'>{r.template ?? '-'}</span>
    )),
    col<FlightProducts>(
      'baggage_rules',
      'Baggages',
      (r) => muted(r.baggage_rules.join(', ') || '-'),
      { accessor: (r) => r.baggage_rules.join(', ') }
    ),
    col<FlightProducts>('seat_prices', 'Seats', (r) =>
      mono(`${r.seat_prices} rule(s)`)
    ),
    col<FlightProducts>('seat_profile', 'Zone name', (r) =>
      muted(r.seat_profile ?? '-')
    ),
    col<FlightProducts>(
      'oci',
      'OCI open / close',
      (r) =>
        r.online_checkin.enabled
          ? mono(
              `${minutes(r.online_checkin.opens_minutes)} / ${minutes(r.online_checkin.closes_minutes)}`
            )
          : muted('Off'),
      { accessor: (r) => r.online_checkin.enabled }
    ),
    col<FlightProducts>('blocked_seats', 'Blocked', (r) =>
      mono(r.blocked_seats)
    ),
  ],
}
