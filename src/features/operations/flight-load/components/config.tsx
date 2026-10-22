import { flightOpsService, type FlightBoardRow } from '@/services'
import {
  FLIGHT_STATUS,
  FLIGHT_STATUS_OPTIONS,
  SERVICE_TYPE,
  SERVICE_TYPE_OPTIONS,
} from '@/constants/status'
import { Progress } from '@/components/progress-bar'
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
  ResourcePageProps<FlightBoardRow>,
  'search' | 'navigate'
> = {
  title: 'Flight load',
  description:
    'Booked / checked-in / boarded passengers per flight and what each agency sold — click a flight for the list',
  queryKey: 'admin-flight-load',
  list: flightOpsService.list,
  searchPlaceholder: 'Flight number, route or gate',
  filters: [
    { columnId: 'status', title: 'Status', options: FLIGHT_STATUS_OPTIONS },
    { columnId: 'service_type', title: 'Type', options: SERVICE_TYPE_OPTIONS },
  ],
  columns: [
    col<FlightBoardRow>('flight_number', 'Flight', (r) =>
      brand(r.flight_number)
    ),
    col<FlightBoardRow>('service_type', 'Type', (r) =>
      chip(r.service_type, SERVICE_TYPE)
    ),
    col<FlightBoardRow>(
      'route',
      'Route',
      (r) => `${r.origin.iata_code} → ${r.destination.iata_code}`,
      { accessor: (r) => r.destination.iata_code }
    ),
    col<FlightBoardRow>('scheduled_departure_at', 'Departure', (r) =>
      dateTime(r.scheduled_departure_at)
    ),
    col<FlightBoardRow>(
      'tail',
      'Tail',
      (r) => mono(r.aircraft?.registration ?? '-'),
      { accessor: (r) => r.aircraft?.registration }
    ),
    col<FlightBoardRow>(
      'load',
      'Load factor',
      (r) => (
        <div className='w-40 space-y-1'>
          <div className='flex justify-between font-mono text-xs'>
            <span>
              {r.pax.booked} / {r.pax.capacity}
            </span>
            <span>
              {r.pax.capacity
                ? Math.round((r.pax.booked / r.pax.capacity) * 100)
                : 0}
              %
            </span>
          </div>
          <Progress
            value={r.pax.capacity ? r.pax.booked / r.pax.capacity : 0}
          />
        </div>
      ),
      { accessor: (r) => r.pax.booked }
    ),
    col<FlightBoardRow>(
      'checked_in',
      'Checked in',
      (r) => mono(r.pax.checked_in),
      { accessor: (r) => r.pax.checked_in }
    ),
    col<FlightBoardRow>('boarded', 'Boarded', (r) => mono(r.pax.boarded), {
      accessor: (r) => r.pax.boarded,
    }),
    col<FlightBoardRow>(
      'agency_sales',
      'Sold by agency',
      (r) =>
        r.agency_sales.length ? (
          <div className='space-y-0.5 text-xs'>
            {r.agency_sales.map((s) => (
              <div
                key={s.agency?.id ?? 'direct'}
                className='flex justify-between gap-3'
              >
                <span className='max-w-40 truncate'>
                  {s.agency?.name ?? 'Direct (airline)'}
                </span>
                <span className='font-mono'>
                  {s.sold}
                  {s.seats > 0 && (
                    <span className='text-muted-foreground'> / {s.seats}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          muted('-')
        ),
      {
        accessor: (r) =>
          r.agency_sales
            .map((s) => `${s.agency?.name ?? 'Direct'} ${s.sold}/${s.seats}`)
            .join('; '),
      }
    ),
    col<FlightBoardRow>('status', 'Status', (r) =>
      chip(r.status, FLIGHT_STATUS)
    ),
  ],
}
