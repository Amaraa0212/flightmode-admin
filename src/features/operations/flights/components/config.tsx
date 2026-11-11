import { flightService, type Flight } from '@/services'
import { dayDifference, dayMark } from '@/lib/airport-time'
import {
  FLIGHT_STATUS,
  FLIGHT_STATUS_OPTIONS,
  SERVICE_TYPE,
  SERVICE_TYPE_OPTIONS,
} from '@/constants/status'
import { AirportTime } from '@/components/airport-time'
import { brand, chip, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<Flight>,
  'search' | 'navigate'
> = {
  title: 'All flights',
  description:
    'Every dated flight — created one by one (single) or generated from a frequency-based series',
  queryKey: 'admin-flights',
  list: flightService.list,
  searchPlaceholder: 'Flight number, route or tail',
  filters: [
    { columnId: 'status', title: 'Status', options: FLIGHT_STATUS_OPTIONS },
    { columnId: 'service_type', title: 'Type', options: SERVICE_TYPE_OPTIONS },
    {
      columnId: 'source',
      title: 'Source',
      options: [
        { label: 'Single', value: 'single' },
        { label: 'Series', value: 'series' },
      ],
    },
  ],
  exportFileName: 'flights.xlsx',
  columns: [
    col<Flight>('tail', 'Tail', (r) => mono(r.aircraft?.registration ?? '-'), {
      accessor: (r) => r.aircraft?.registration,
    }),
    col<Flight>('flight_number', 'Flight no', (r) => brand(r.flight_number)),
    col<Flight>(
      'source',
      'Source',
      (r) =>
        muted(
          r.flight_series_id
            ? r.is_series_override
              ? 'Series · edited'
              : 'Series'
            : 'Single'
        ),
      { accessor: (r) => (r.flight_series_id ? 'series' : 'single') }
    ),
    col<Flight>('service_type', 'Type', (r) =>
      chip(r.service_type, SERVICE_TYPE)
    ),
    col<Flight>(
      'route',
      'Route',
      (r) => `${r.origin.iata_code} → ${r.destination.iata_code}`,
      { accessor: (r) => `${r.origin.iata_code}-${r.destination.iata_code}` }
    ),
    col<Flight>(
      'scheduled_departure_at',
      'Departure (local)',
      (r) =>
        r.scheduled_departure_local ?? (
          <AirportTime
            at={r.scheduled_departure_at}
            airport={r.origin.iata_code}
          />
        ),
      { accessor: (r) => r.scheduled_departure_local }
    ),
    col<Flight>(
      'scheduled_arrival_at',
      'Arrival (local)',
      (r) => {
        const days =
          r.scheduled_departure_local && r.scheduled_arrival_local
            ? dayDifference(
                r.scheduled_departure_local.slice(0, 10),
                r.scheduled_arrival_local.slice(0, 10)
              )
            : 0
        return (
          <>
            {r.scheduled_arrival_local?.slice(11, 16) ?? (
              <AirportTime
                at={r.scheduled_arrival_at}
                airport={r.destination.iata_code}
                format='HH:mm'
              />
            )}
            {days !== 0 && (
              <span className='ms-1 rounded bg-amber-500/15 px-1 font-mono text-xs font-bold text-amber-600 dark:text-amber-300'>
                {dayMark(days)}
              </span>
            )}
          </>
        )
      },
      { accessor: (r) => r.scheduled_arrival_local }
    ),
    col<Flight>(
      'load',
      'PAX / Seats',
      (r) => mono(`${r.segments_count} / ${r.aircraft?.total_seats ?? '-'}`),
      { accessor: (r) => r.segments_count }
    ),
    col<Flight>('gate', 'Gate', (r) => muted(r.gate ?? '-')),
    col<Flight>('status', 'Status', (r) => chip(r.status, FLIGHT_STATUS)),
  ],
  // new and edit: NewFlightsDialog
  remove: {
    run: (r) => flightService.remove(r.id),
    label: (r) =>
      `${r.flight_number} ${(r.scheduled_departure_local ?? r.scheduled_departure_at).slice(0, 10)}`,
  },
}
