import { useState } from 'react'
import type {
  PaxCounts,
  Reconciliation,
  ReconciliationResult,
} from '@/services'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyRow, Panel } from '@/features/fare-settings/shared'

type Row = Reconciliation['rows'][number]
type Filter = 'all' | 'go_show' | ReconciliationResult

const RESULT: Record<
  ReconciliationResult,
  { label: string; className: string }
> = {
  flown: {
    label: 'Flown',
    className:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  no_show: {
    label: 'No-show',
    className:
      'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  },
  offloaded: {
    label: 'Offloaded',
    className:
      'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  not_boarded: {
    label: 'Not boarded',
    className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  cancelled: { label: 'Cancelled', className: 'text-muted-foreground' },
  waitlisted: { label: 'Waitlist', className: 'text-muted-foreground' },
}

const GO_SHOW_CLASS =
  'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'

/** Summary lines, in the order of the legacy report */
const SUMMARY: {
  key: keyof Reconciliation['summary']
  label: string
  hint: string
}[] = [
  {
    key: 'pnl',
    label: 'PNL (booked)',
    hint: 'On the name list before check-in',
  },
  { key: 'go_show', label: 'Go-show', hint: 'Added at the counter' },
  { key: 'flown', label: 'Flown', hint: 'Boarded the aircraft' },
  {
    key: 'no_show',
    label: 'No-show',
    hint: 'Booked or checked in, did not board',
  },
  { key: 'offloaded', label: 'Offloaded', hint: 'Taken off at the gate' },
  { key: 'not_boarded', label: 'Not boarded yet', hint: 'Gate still open' },
  { key: 'cancelled', label: 'Cancelled', hint: 'Segment cancelled' },
]

function Chip({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded border px-1.5 text-[10px] font-bold tracking-wide uppercase',
        className
      )}
    >
      {children}
    </span>
  )
}

function CountCells({
  counts,
  strong,
}: {
  counts: PaxCounts
  strong?: boolean
}) {
  return (
    <>
      {(['ADT', 'CHD', 'INF'] as const).map((t) => (
        <TableCell
          key={t}
          className={cn(
            'text-end font-mono',
            counts[t] === 0 && 'text-muted-foreground'
          )}
        >
          {counts[t]}
        </TableCell>
      ))}
      <TableCell
        className={cn('text-end font-mono', strong && 'font-semibold')}
      >
        {counts.total}
      </TableCell>
    </>
  )
}

export function ReconciliationView({ data }: { data: Reconciliation }) {
  const [filter, setFilter] = useState<Filter>('all')
  const { summary, rows, closed } = data

  // "not boarded" only means something while the gate is open
  const lines = SUMMARY.filter(
    (l) =>
      (l.key !== 'not_boarded' || !closed) &&
      (l.key !== 'cancelled' ||
        summary.cancelled.total + summary.cancelled.INF > 0)
  )
  const count = (f: Filter) =>
    f === 'all'
      ? rows.length
      : f === 'go_show'
        ? rows.filter((r) => r.go_show).length
        : rows.filter((r) => r.result === f).length
  const filters: Filter[] = (
    [
      'all',
      'flown',
      'no_show',
      'go_show',
      'offloaded',
      'not_boarded',
      'cancelled',
    ] as Filter[]
  ).filter((f) => f === 'all' || count(f) > 0)
  const visible = rows.filter((r: Row) =>
    filter === 'all'
      ? true
      : filter === 'go_show'
        ? r.go_show
        : r.result === filter
  )

  return (
    <div className='flex flex-col gap-4'>
      {!closed && (
        <div className='flex items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-800 dark:text-sky-200'>
          <Info className='size-4 shrink-0' />
          The gate is not closed yet — passengers who have not boarded are
          counted as “Not boarded”, and become no-shows when the gate closes.
        </div>
      )}

      <Panel
        title='Summary'
        subtitle={`${data.flight.flight_number} ${data.flight.route} · ${data.flight.status.replace('_', ' ')} · total = seats (ADT + CHD), infants apart`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passengers</TableHead>
              <TableHead className='text-end'>ADT</TableHead>
              <TableHead className='text-end'>CHD</TableHead>
              <TableHead className='text-end'>INF</TableHead>
              <TableHead className='text-end'>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.key}>
                <TableCell>
                  <p className='font-medium'>{l.label}</p>
                  <p className='text-muted-foreground text-xs'>{l.hint}</p>
                </TableCell>
                <CountCells counts={summary[l.key]} strong />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>

      <Panel
        title='Passengers'
        subtitle={`${visible.length} of ${rows.length}`}
        actions={
          <div className='flex flex-wrap gap-1.5'>
            {filters.map((f) => (
              <button
                key={f}
                type='button'
                onClick={() => setFilter(f)}
                className={cn(
                  'h-7 rounded-md border px-2.5 text-xs font-medium transition',
                  filter === f
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:bg-muted'
                )}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'go_show'
                    ? 'Go-show'
                    : RESULT[f].label}{' '}
                <span className='font-mono opacity-70'>{count(f)}</span>
              </button>
            ))}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-10'>#</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>PNR</TableHead>
              <TableHead>Ticket</TableHead>
              <TableHead>Cabin / seat</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <EmptyRow colSpan={9}>No passengers.</EmptyRow>
            )}
            {visible.map((r, i) => (
              <TableRow key={r.segment_id}>
                <TableCell className='text-muted-foreground font-mono text-xs'>
                  {i + 1}
                </TableCell>
                <TableCell>
                  <div className='flex flex-wrap gap-1'>
                    <Chip className={RESULT[r.result].className}>
                      {RESULT[r.result].label}
                    </Chip>
                    {r.go_show && (
                      <Chip className={GO_SHOW_CLASS}>Go-show</Chip>
                    )}
                  </div>
                </TableCell>
                <TableCell className='font-medium text-nowrap'>
                  {r.name}
                </TableCell>
                <TableCell className='font-mono text-xs'>{r.type}</TableCell>
                <TableCell className='font-mono text-xs'>
                  {r.pnr ?? '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {r.ticket_number ?? '-'}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {r.cabin_class}
                  {r.seat_number && ` · ${r.seat_number}`}
                </TableCell>
                <TableCell className='text-xs'>
                  {r.agency ?? 'Direct'}
                </TableCell>
                <TableCell className='text-muted-foreground text-xs'>
                  {r.result === 'offloaded'
                    ? [r.offload_type, r.offload_reason]
                        .filter(Boolean)
                        .join(' · ')
                    : r.result === 'no_show' && r.checked_in
                      ? 'Checked in, did not board'
                      : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </div>
  )
}
