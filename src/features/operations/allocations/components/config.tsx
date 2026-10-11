import { z } from 'zod'
import {
  agencyOptions,
  allocationService,
  flightOptions,
  type Allocation,
} from '@/services'
import { Progress } from '@/components/progress-bar'
import {
  brand,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

const schema = z.object({
  agency_id: z.string().min(1, 'Agency is required'),
  outbound_flight_id: z.string().min(1, 'Flight is required'),
  return_flight_id: z.string(),
  seats: z.number().int().min(1),
  deadline: z.string().min(1, 'Names deadline is required'),
  uses_fare_quotas: z.boolean(),
  is_waitlist: z.boolean(),
})
type Form = z.infer<typeof schema>

const flightCell = (f: Allocation['outbound_flight'] | null) =>
  f ? (
    <div>
      {brand(f.flight_number)} <span className='text-xs'>{f.route}</span>
      <div>{dateTime(f.scheduled_departure_at)}</div>
    </div>
  ) : (
    muted('One way')
  )

export const pageConfig: Omit<
  ResourcePageProps<Allocation, Form>,
  'search' | 'navigate'
> = {
  title: 'Assign quota to agency',
  description:
    'Seat allocations per agency and flight (names deadline, fare quotas, waitlist)',
  queryKey: 'admin-allocations',
  list: allocationService.list,
  searchPlaceholder: 'Agency, flight or route',
  exportFileName: 'allocations.xlsx',
  columns: [
    col<Allocation>(
      'agency',
      'Agency',
      (r) => <span className='font-medium'>{r.agency.name}</span>,
      { accessor: (r) => r.agency.name }
    ),
    col<Allocation>(
      'outbound',
      'Outbound',
      (r) => flightCell(r.outbound_flight),
      { accessor: (r) => r.outbound_flight.flight_number }
    ),
    col<Allocation>('return', 'Return', (r) => flightCell(r.return_flight), {
      accessor: (r) => r.return_flight?.flight_number,
    }),
    col<Allocation>(
      'usage',
      'Sold / Quota',
      (r) => (
        <div className='w-32 space-y-1'>
          {mono(`${r.usage.used} / ${r.seats}`)}
          <Progress value={r.seats ? r.usage.used / r.seats : 0} />
        </div>
      ),
      { accessor: (r) => r.usage.used }
    ),
    col<Allocation>('deadline', 'Names deadline', (r) => mono(r.deadline)),
    col<Allocation>(
      'flags',
      'Options',
      (r) =>
        muted(
          [r.uses_fare_quotas && 'Fare quotas', r.is_waitlist && 'Waitlist']
            .filter(Boolean)
            .join(' · ') || '-'
        ),
      { accessor: (r) => r.is_waitlist }
    ),
  ],
  form: {
    entity: 'quota',
    schema,
    maxWidth: 'xl',
    empty: {
      agency_id: '',
      outbound_flight_id: '',
      return_flight_id: '',
      seats: 20,
      deadline: '',
      uses_fare_quotas: false,
      is_waitlist: false,
    },
    fromRow: (r) => ({
      agency_id: String(r.agency.id),
      outbound_flight_id: String(r.outbound_flight.id),
      return_flight_id: r.return_flight ? String(r.return_flight.id) : '',
      seats: r.seats,
      deadline: r.deadline,
      uses_fare_quotas: r.uses_fare_quotas,
      is_waitlist: r.is_waitlist,
    }),
    fields: [
      {
        name: 'agency_id',
        label: 'Agency',
        type: 'select',
        loadOptions: agencyOptions,
        required: true,
        gridCols: 2,
      },
      {
        name: 'outbound_flight_id',
        label: 'Outbound flight',
        type: 'select',
        loadOptions: () => flightOptions(),
        required: true,
        gridCols: 2,
      },
      {
        name: 'return_flight_id',
        label: 'Return flight (optional)',
        type: 'select',
        options: [{ label: 'One way', value: '' }],
        loadOptions: () => flightOptions(),
        gridCols: 2,
      },
      {
        name: 'seats',
        label: 'Seats',
        type: 'number',
        required: true,
        gridCols: 1,
      },
      {
        name: 'deadline',
        label: 'Names deadline',
        type: 'date',
        required: true,
        gridCols: 1,
      },
      {
        name: 'uses_fare_quotas',
        label: 'Use fare quotas',
        type: 'checkbox',
        gridCols: 1,
      },
      {
        name: 'is_waitlist',
        label: 'Allow waitlist',
        type: 'checkbox',
        gridCols: 1,
      },
    ],
    create: (v) => allocationService.save(v),
    update: (row, v) => allocationService.save(v, row.id),
  },
  remove: {
    run: (r) => allocationService.remove(r.id),
    label: (r) => `${r.agency.name} · ${r.outbound_flight.flight_number}`,
  },
}
