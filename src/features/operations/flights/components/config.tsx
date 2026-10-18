import { z } from 'zod'
import {
  aircraftOptions,
  airlineOptions,
  airportOptions,
  flightService,
  type Flight,
} from '@/services'
import { FLIGHT_STATUS, FLIGHT_STATUS_OPTIONS } from '@/constants/status'
import {
  brand,
  chip,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const schema = z
  .object({
    flight_number: z.string().trim().min(3),
    airline_id: z.string(),
    origin_airport_id: z.string().min(1, 'From is required'),
    destination_airport_id: z.string().min(1, 'To is required'),
    aircraft_id: z.string().min(1, 'Aircraft is required'),
    scheduled_departure_at: z.number({ error: 'Departure is required' }),
    scheduled_arrival_at: z.number({ error: 'Arrival is required' }),
    terminal: z.string(),
    gate: z.string(),
  })
  .refine((v) => v.scheduled_arrival_at > v.scheduled_departure_at, {
    message: 'Arrival must be after departure',
    path: ['scheduled_arrival_at'],
  })
type Form = z.infer<typeof schema>

const toPayload = (v: Form) => ({
  ...v,
  scheduled_departure_at: new Date(v.scheduled_departure_at).toISOString(),
  scheduled_arrival_at: new Date(v.scheduled_arrival_at).toISOString(),
})

export const pageConfig: Omit<
  ResourcePageProps<Flight, Form>,
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
    col<Flight>(
      'route',
      'Route',
      (r) => `${r.origin.iata_code} → ${r.destination.iata_code}`,
      { accessor: (r) => `${r.origin.iata_code}-${r.destination.iata_code}` }
    ),
    col<Flight>('scheduled_departure_at', 'Departure (UTC)', (r) =>
      dateTime(r.scheduled_departure_at)
    ),
    col<Flight>('scheduled_arrival_at', 'Arrival (UTC)', (r) =>
      dateTime(r.scheduled_arrival_at, 'HH:mm')
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
  form: {
    entity: 'flight',
    schema: schema as unknown as z.ZodSchema<Form>,
    maxWidth: 'xl',
    empty: {
      flight_number: '',
      airline_id: '',
      origin_airport_id: '',
      destination_airport_id: '',
      aircraft_id: '',
      scheduled_departure_at: undefined as unknown as number,
      scheduled_arrival_at: undefined as unknown as number,
      terminal: 'T1',
      gate: '',
    },
    fromRow: (r) => ({
      flight_number: r.flight_number,
      airline_id: r.airline ? String(r.airline.id) : '',
      origin_airport_id: String(r.origin.id),
      destination_airport_id: String(r.destination.id),
      aircraft_id: String(r.aircraft?.id ?? ''),
      scheduled_departure_at: new Date(r.scheduled_departure_at).getTime(),
      scheduled_arrival_at: new Date(r.scheduled_arrival_at).getTime(),
      terminal: r.terminal ?? '',
      gate: r.gate ?? '',
    }),
    fields: [
      {
        name: 'flight_number',
        label: 'Flight number',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'airline_id',
        label: 'Airline',
        type: 'select',
        placeholder: 'Your airline',
        loadOptions: airlineOptions,
        gridCols: 1,
      },
      {
        name: 'aircraft_id',
        label: 'Aircraft',
        type: 'select',
        loadOptions: aircraftOptions,
        required: true,
        gridCols: 1,
      },
      {
        name: 'origin_airport_id',
        label: 'From',
        type: 'select',
        loadOptions: airportOptions,
        required: true,
        gridCols: 1,
      },
      {
        name: 'destination_airport_id',
        label: 'To',
        type: 'select',
        loadOptions: airportOptions,
        required: true,
        gridCols: 1,
      },
      {
        name: 'scheduled_departure_at',
        label: 'Departure',
        type: 'datetime',
        required: true,
        gridCols: 1,
      },
      {
        name: 'scheduled_arrival_at',
        label: 'Arrival',
        type: 'datetime',
        required: true,
        gridCols: 1,
      },
      { name: 'terminal', label: 'Terminal', type: 'text', gridCols: 1 },
      { name: 'gate', label: 'Gate', type: 'text', gridCols: 1 },
    ],
    create: (v) => flightService.create(toPayload(v)),
    update: (row, v) => flightService.update(row.id, toPayload(v)),
  },
  remove: {
    run: (r) => flightService.remove(r.id),
    label: (r) => `${r.flight_number} ${r.scheduled_departure_at.slice(0, 10)}`,
  },
}
