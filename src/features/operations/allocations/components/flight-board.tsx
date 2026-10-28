import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { allocationBoardService, type FlightQuota } from '@/services'
import { ArrowLeftRight, Loader2, PlaneTakeoff, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyRow, Panel } from '@/features/fare-settings/shared'
import { DistributeDialog } from './distribute-dialog'
import { MoveSeatsDialog } from './move-seats-dialog'

export const BOARD_QUERY_KEY = 'admin-allocations-board'

const formatDeparture = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Share of the flight given away: fixed sold / fixed unsold / sold or held outside fixed / free */
function FillBar({ quota }: { quota: FlightQuota }) {
  const { capacity, fixed_seats, fixed_sold, free } = quota
  if (!capacity) return null
  const other = Math.max(0, capacity - fixed_seats - free)
  const parts = [
    { value: fixed_sold, className: 'bg-emerald-500', label: 'Fixed · sold' },
    {
      value: fixed_seats - fixed_sold,
      className: 'bg-emerald-500/40',
      label: 'Fixed · unsold',
    },
    {
      value: other,
      className: 'bg-violet-500',
      label: 'Sold / held outside fixed (direct, pool)',
    },
  ]
  return (
    <div className='space-y-1.5'>
      <div className='bg-muted flex h-2 overflow-hidden rounded-full'>
        {parts.map((p) =>
          p.value > 0 ? (
            <div
              key={p.label}
              title={`${p.label}: ${p.value}`}
              className={p.className}
              style={{ width: `${(100 * p.value) / capacity}%` }}
            />
          ) : null
        )}
      </div>
      <div className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]'>
        {parts.map((p) => (
          <span key={p.label} className='flex items-center gap-1'>
            <span className={cn('size-2 rounded-full', p.className)} />
            {p.label} {p.value}
          </span>
        ))}
        <span className='flex items-center gap-1'>
          <span className='bg-muted-foreground/30 size-2 rounded-full' />
          Free {free}
        </span>
      </div>
    </div>
  )
}

function FlightCard({
  quota,
  onDistribute,
  onMove,
}: {
  quota: FlightQuota
  onDistribute: () => void
  onMove: () => void
}) {
  const { flight } = quota
  const fixedCount = quota.allocations.filter((a) => a.mode === 'fixed').length
  return (
    <Panel
      title={`${flight.flight_number} ${flight.route}`}
      subtitle={
        <>
          {formatDeparture(flight.scheduled_departure_at)} ·{' '}
          <span
            className={cn(
              'font-semibold',
              quota.given_percent >= 100
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-foreground'
            )}
          >
            {quota.given_percent}% given
          </span>{' '}
          · {quota.free} of {quota.capacity} free
          {flight.service_type === 'charter' && ' · Charter'}
        </>
      }
      actions={
        <>
          <Button
            size='sm'
            variant='outline'
            className='h-8 gap-2'
            disabled={fixedCount < 2}
            title={fixedCount < 2 ? 'Needs two fixed allocations' : undefined}
            onClick={onMove}
          >
            <ArrowLeftRight className='size-4' />
            Move seats
          </Button>
          <Button size='sm' className='h-8 gap-2' onClick={onDistribute}>
            <Users className='size-4' />
            Distribute
          </Button>
        </>
      }
    >
      <div className='border-b px-4 py-3'>
        <FillBar quota={quota} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agency</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className='text-end'>Quota</TableHead>
            <TableHead className='text-end'>Sold</TableHead>
            <TableHead className='text-end'>Held</TableHead>
            <TableHead className='text-end'>Can sell</TableHead>
            <TableHead>Names deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quota.allocations.map((a) => (
            <TableRow key={a.allocation_id}>
              <TableCell className='font-medium'>
                {a.agency.name}
                {a.return_flight_id && (
                  <span className='text-muted-foreground ms-2 text-xs'>
                    round trip
                  </span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    'rounded border px-1.5 text-[10px] font-bold uppercase',
                    a.mode === 'pool'
                      ? 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  {a.mode}
                </span>
              </TableCell>
              <TableCell className='text-end font-mono'>
                {a.mode === 'pool'
                  ? a.seats
                    ? `≤ ${a.seats}`
                    : 'no limit'
                  : a.seats}
                {a.mode === 'fixed' && Object.keys(a.cabins).length > 1 && (
                  <span className='text-muted-foreground ms-1 text-xs'>
                    (
                    {Object.entries(a.cabins)
                      .map(([c, n]) => `${c} ${n}`)
                      .join(' · ')}
                    )
                  </span>
                )}
              </TableCell>
              <TableCell className='text-end font-mono font-semibold'>
                {a.used}
              </TableCell>
              <TableCell className='text-end font-mono'>{a.held}</TableCell>
              <TableCell
                className={cn(
                  'text-end font-mono',
                  a.remaining === 0 && 'text-muted-foreground'
                )}
              >
                {a.remaining}
              </TableCell>
              <TableCell className='text-muted-foreground font-mono text-xs'>
                {a.deadline}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Panel>
  )
}

/** Quota by flight: one card per flight with what each agency got, sold and can still sell */
export function FlightBoard({ from, to }: { from?: string; to?: string }) {
  const [distributing, setDistributing] = useState<number | 'new' | null>(null)
  const [moving, setMoving] = useState<FlightQuota | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: [BOARD_QUERY_KEY, from, to],
    queryFn: async () => (await allocationBoardService.board(from, to)).body,
  })

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-muted-foreground text-sm'>
          {isLoading
            ? 'Loading…'
            : `${data.length} flight(s) with quota${from ? '' : ' in the next 30 days'}`}
        </p>
        <Button
          size='sm'
          className='h-8 gap-2'
          onClick={() => setDistributing('new')}
        >
          <PlaneTakeoff className='size-4' />
          Distribute a flight
        </Button>
      </div>

      {isLoading && (
        <div className='fm-panel text-muted-foreground flex justify-center py-16'>
          <Loader2 className='size-6 animate-spin' />
        </div>
      )}
      {!isLoading && !data.length && (
        <div className='fm-panel'>
          <Table>
            <TableBody>
              <EmptyRow colSpan={1}>
                No quota on flights in this period — “Distribute a flight” to
                hand one out.
              </EmptyRow>
            </TableBody>
          </Table>
        </div>
      )}
      {data.map((q) => (
        <FlightCard
          key={q.flight.id}
          quota={q}
          onDistribute={() => setDistributing(q.flight.id)}
          onMove={() => setMoving(q)}
        />
      ))}

      {distributing !== null && (
        <DistributeDialog
          flightId={distributing === 'new' ? undefined : distributing}
          onClose={() => setDistributing(null)}
        />
      )}
      {moving && (
        <MoveSeatsDialog quota={moving} onClose={() => setMoving(null)} />
      )}
    </div>
  )
}
