import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agencyOptions,
  allocationService,
  flightOptions,
  type Allocation,
} from '@/services'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/progress-bar'
import {
  brand,
  col,
  dateTime,
  mono,
  muted,
} from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const MODE_OPTIONS = [
  { label: 'Fixed — seats taken out for the agency', value: 'fixed' },
  { label: 'Pool — agencies sell the free seats together', value: 'pool' },
]

const schema = z
  .object({
    mode: z.enum(['fixed', 'pool']),
    agency_id: z.string().min(1, 'Agency is required'),
    outbound_flight_id: z.string().min(1, 'Flight is required'),
    return_flight_id: z.string(),
    // pool: a limit, 0 = none
    seats: z.number().int().min(0),
    business_seats: z.number().int().min(0),
    deadline: z.string().min(1, 'Names deadline is required'),
    is_waitlist: z.boolean(),
  })
  .refine((v) => v.mode === 'pool' || v.seats >= 1, {
    path: ['seats'],
    message: 'At least 1 seat',
  })
type Form = z.infer<typeof schema>

/** Last push to the Chinggis agent API, with "push now" */
function ChinggisCell({ r }: { r: Allocation }) {
  const queryClient = useQueryClient()
  const push = useMutation({
    mutationFn: () => allocationService.pushToChinggis(r.id),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['admin-allocations'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })
  return (
    <div className='flex items-center gap-1.5'>
      {r.chinggis.error ? (
        <span
          className='text-xs text-rose-600 dark:text-rose-400'
          title={r.chinggis.error}
        >
          Failed
        </span>
      ) : r.chinggis.synced_at ? (
        <span
          className='font-mono text-xs text-emerald-600 dark:text-emerald-400'
          title='Last sent'
        >
          ✓ {r.chinggis.synced_at.slice(5, 16).replace('T', ' ')}
        </span>
      ) : (
        muted('-')
      )}
      <Button
        variant='ghost'
        size='sm'
        className='h-6 px-1.5 text-xs'
        disabled={push.isPending}
        title='Send to the Chinggis agent API now'
        onClick={(e) => {
          e.stopPropagation()
          push.mutate()
        }}
      >
        <Send className='size-3' />
      </Button>
    </div>
  )
}

/** Sold / quota; a pool shows what it may still sell from the shared seats */
export function QuotaCell({ r }: { r: Allocation }) {
  if (r.mode === 'pool') {
    return (
      <div className='space-y-0.5'>
        <span className='rounded border border-violet-500/40 bg-violet-500/10 px-1.5 text-[10px] font-bold text-violet-700 uppercase dark:text-violet-300'>
          Pool
        </span>
        <div className='font-mono text-xs'>
          {r.usage.used} sold{r.seats ? ` / max ${r.seats}` : ''} ·{' '}
          {r.usage.available} free
        </div>
      </div>
    )
  }
  return (
    <div className='w-32 space-y-1'>
      {mono(`${r.usage.used} / ${r.seats}`)}
      <Progress value={r.seats ? r.usage.used / r.seats : 0} />
    </div>
  )
}

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
    'Seat allocations per agency and flight. Fixed: seats taken out for the agency. Pool: the chosen agencies sell the free seats together (a seat one holds is gone for the others), each up to an optional limit.',
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
    col<Allocation>('usage', 'Sold / Quota', (r) => <QuotaCell r={r} />, {
      accessor: (r) => r.usage.used,
    }),
    col<Allocation>('deadline', 'Names deadline', (r) => mono(r.deadline)),
    col<Allocation>('chinggis', 'Chinggis', (r) => <ChinggisCell r={r} />, {
      accessor: (r) => r.chinggis.synced_at ?? '',
    }),
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
      mode: 'fixed',
      agency_id: '',
      outbound_flight_id: '',
      return_flight_id: '',
      seats: 20,
      business_seats: 0,
      deadline: '',
      is_waitlist: false,
    },
    fromRow: (r) => ({
      mode: r.mode,
      agency_id: String(r.agency.id),
      outbound_flight_id: String(r.outbound_flight.id),
      return_flight_id: r.return_flight ? String(r.return_flight.id) : '',
      seats: r.seats,
      business_seats: r.cabins.C ?? 0,
      deadline: r.deadline,
      is_waitlist: r.is_waitlist,
    }),
    fields: [
      {
        name: 'mode',
        label: 'Type',
        type: 'select',
        options: MODE_OPTIONS,
        gridCols: 1,
      },
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
        label: 'Seats (pool: limit, 0 = every free seat)',
        type: 'number',
        min: '0',
        required: true,
        gridCols: 1,
      },
      {
        name: 'business_seats',
        label: 'Of which business (C)',
        type: 'number',
        gridCols: 1,
        showWhen: { field: 'mode', value: 'fixed' },
      },

      {
        name: 'deadline',
        label: 'Names deadline',
        type: 'date',
        required: true,
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
