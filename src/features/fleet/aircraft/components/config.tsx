import { z } from 'zod'
import {
  aircraftService,
  parseSeatConfiguration,
  type Aircraft,
} from '@/services'
import { ACTIVE_OPTIONS } from '@/constants/status'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  registration: z.string().trim().min(4, 'e.g. JU-1088'),
  type: z.string().trim().min(2),
  seat_configuration: z
    .string()
    .trim()
    .refine(
      (v) => parseSeatConfiguration(v) !== null,
      'Cabin letter + seats, e.g. C12Y150 or W16Y120 (F, C, W, Y)'
    ),
  max_infants: z.number().int().min(0),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

export const pageConfig: Omit<
  ResourcePageProps<Aircraft, Form>,
  'search' | 'navigate'
> = {
  title: 'Fleets',
  description:
    'Aircraft of the airline — registration, type, seat configuration',
  queryKey: 'admin-aircraft',
  list: aircraftService.list,
  searchPlaceholder: 'Registration, type or configuration',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'fleet.xlsx',
  columns: [
    col<Aircraft>('registration', 'Registration', (r) => brand(r.registration)),
    col<Aircraft>('type', 'Type', (r) => (
      <span className='font-medium'>{r.type}</span>
    )),
    col<Aircraft>('airline', 'Airline', (r) => muted(r.airline.name), {
      accessor: (r) => r.airline.name,
    }),
    col<Aircraft>('seat_configuration', 'Configuration', (r) =>
      mono(r.seat_configuration)
    ),
    col<Aircraft>(
      'cabins',
      'Cabins',
      (r) => (
        <div className='flex gap-1.5 font-mono text-xs'>
          {Object.entries(r.cabins).map(([cabin, seats]) => (
            <span key={cabin} className='bg-surface rounded border px-1.5'>
              {cabin} {seats}
            </span>
          ))}
        </div>
      ),
      { accessor: (r) => JSON.stringify(r.cabins) }
    ),
    col<Aircraft>('total_seats', 'Seats', (r) => mono(r.total_seats)),
    col<Aircraft>('max_infants', 'Max INF', (r) => mono(r.max_infants)),
    col<Aircraft>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'aircraft',
    schema,
    empty: {
      registration: '',
      type: '',
      seat_configuration: '',
      max_infants: 10,
      is_active: true,
    },
    fromRow: (r) => ({
      registration: r.registration,
      type: r.type,
      seat_configuration: r.seat_configuration ?? '',
      max_infants: r.max_infants,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'registration',
        label: 'Registration',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'type',
        label: 'Type',
        type: 'text',
        placeholder: 'Boeing 737-800',
        required: true,
        gridCols: 1,
      },
      {
        name: 'seat_configuration',
        label:
          'Seat configuration (cabins + seats: W16Y120 → W 16, Y 120 = 136)',
        type: 'text',
        placeholder: 'C12Y150',
        required: true,
        gridCols: 2,
      },
      {
        name: 'max_infants',
        label: 'Max infants',
        type: 'number',
        required: true,
        gridCols: 1,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) => aircraftService.create(v),
    update: (row, v) => aircraftService.update(row.id, v),
  },
  remove: {
    run: (r) => aircraftService.remove(r.id),
    label: (r) => r.registration,
  },
}
