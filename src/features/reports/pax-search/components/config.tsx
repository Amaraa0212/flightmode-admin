import { reportService, type FlightPassengerRow } from '@/services'
import { SEGMENT_STATUS } from '@/constants/status'
import {
  brand,
  chip,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<FlightPassengerRow>,
  'search' | 'navigate'
> = {
  title: 'PAX search',
  description:
    'Find a passenger on any flight by name, PNR, passport or phone (min. 2 characters)',
  queryKey: 'admin-pax-search',
  list: reportService.paxSearch,
  searchPlaceholder: 'Name, PNR, passport or phone',
  columns: [
    col<FlightPassengerRow>('flight_number', 'Flight number', (r) =>
      brand(r.flight_number)
    ),
    col<FlightPassengerRow>('route', 'Route', (r) => r.route),
    col<FlightPassengerRow>('departure_at', 'Departure date', (r) =>
      dateTime(r.departure_at)
    ),
    col<FlightPassengerRow>('pnr', 'PNR', (r) => mono(r.pnr)),
    col<FlightPassengerRow>('last_name', 'Last name', (r) => (
      <span className='font-medium'>{r.last_name}</span>
    )),
    col<FlightPassengerRow>('first_name', 'First name', (r) => r.first_name),
    col<FlightPassengerRow>('date_of_birth', 'DOB', (r) =>
      mono(r.date_of_birth)
    ),
    col<FlightPassengerRow>('document_number', 'Passport', (r) =>
      mono(r.document_number)
    ),
    col<FlightPassengerRow>('agency', 'Agent name', (r) =>
      muted(r.agency ?? 'Direct')
    ),
    col<FlightPassengerRow>('phone', 'Mobile', (r) => mono(r.phone ?? '-')),
    col<FlightPassengerRow>('status', 'Status', (r) =>
      chip(r.status, SEGMENT_STATUS)
    ),
  ],
}
