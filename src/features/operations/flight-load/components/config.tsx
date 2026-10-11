import { flightOpsService, type FlightBoardRow } from '@/services'
import { FLIGHT_STATUS, FLIGHT_STATUS_OPTIONS } from '@/constants/status'
import { Progress } from '@/components/progress-bar'
import { brand, chip, col, dateTime, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<FlightBoardRow>,
  'search' | 'navigate'
> = {
  title: 'Flight load',
  description:
    'Booked / checked-in / boarded passengers per flight — click a flight for the list',
  queryKey: 'admin-flight-load',
  list: flightOpsService.list,
  searchPlaceholder: 'Flight number, route or gate',
  filters: [
    { columnId: 'status', title: 'Status', options: FLIGHT_STATUS_OPTIONS },
  ],
  columns: [
    col<FlightBoardRow>('flight_number', 'Flight', (r) =>
      brand(r.flight_number)
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
    col<FlightBoardRow>('status', 'Status', (r) =>
      chip(r.status, FLIGHT_STATUS)
    ),
  ],
}
