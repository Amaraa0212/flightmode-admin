import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  agencyOptions,
  allocationBoardService,
  flightOptions,
  type AllocationMode,
  type DistributeRow,
  type FlightQuota,
} from '@/services'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useOptions } from '@/hooks/use-options'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleSelect } from '@/components/simple-select'
import { BOARD_QUERY_KEY } from './flight-board'

type Row = {
  key: string
  allocation_id?: number
  agency_id: string
  mode: AllocationMode
  /** fixed: seats per cabin */
  cabins: Record<string, number | ''>
  /** pool: limit, '' = none */
  limit: number | ''
}

const MODES = [
  { label: 'Fixed', value: 'fixed' },
  { label: 'Pool', value: 'pool' },
]

const dayBefore = (iso: string) => {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

const rowsOf = (q: FlightQuota): Row[] =>
  q.allocations.map((a) => ({
    key: String(a.allocation_id),
    allocation_id: a.allocation_id,
    agency_id: String(a.agency.id),
    mode: a.mode,
    cabins: Object.fromEntries(
      q.cabins.map((c) => [c.cabin_class, a.cabins[c.cabin_class] ?? ''])
    ),
    limit: a.mode === 'pool' && a.seats ? a.seats : '',
  }))

const fixedSeats = (r: Row) =>
  Object.values(r.cabins).reduce<number>((s, n) => s + Number(n || 0), 0)

/**
 * Hand out one flight's quota: every agency as a row (fixed seats per cabin, or pool with an optional limit),
 * with what stays free per cabin as you type. Saved in one request (POST …/allocations/distribute).
 */
export function DistributeDialog({
  flightId: initialFlightId,
  onClose,
}: {
  /** empty: choose the flight in the dialog */
  flightId?: number
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [flightId, setFlightId] = useState(initialFlightId)
  const flights = useOptions('flights-upcoming', () => flightOptions())
  const agencies = useOptions('agencies', agencyOptions)

  const { data: quota, isLoading } = useQuery({
    queryKey: ['allocation-overview', flightId],
    queryFn: async () =>
      (await allocationBoardService.overview(flightId!)).body,
    enabled: !!flightId,
  })

  // edits start from the flight's allocations once they are loaded
  const [edited, setEdited] = useState<{
    flightId?: number
    rows: Row[]
    remove: number[]
  } | null>(null)
  const current = edited && edited.flightId === flightId ? edited : null
  const rows = useMemo(
    () => current?.rows ?? (quota ? rowsOf(quota) : []),
    [current, quota]
  )
  const remove = current?.remove ?? []
  const setRows = (next: Row[], nextRemove = remove) =>
    setEdited({ flightId, rows: next, remove: nextRemove })
  const update = (key: string, patch: Partial<Row>) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const [deadline, setDeadline] = useState('')
  const defaultDeadline = quota
    ? dayBefore(quota.flight.scheduled_departure_at)
    : ''

  // per cabin: free now + what the current fixed allocations give back − what the rows take
  const cabinsAfter = useMemo(() => {
    if (!quota) return []
    return quota.cabins.map((c) => {
      const before = quota.allocations
        .filter((a) => a.mode === 'fixed')
        .reduce((s, a) => s + (a.cabins[c.cabin_class] ?? 0), 0)
      const after = rows
        .filter((r) => r.mode === 'fixed')
        .reduce((s, r) => s + Number(r.cabins[c.cabin_class] || 0), 0)
      return { ...c, given: after, free: c.free + before - after }
    })
  }, [quota, rows])
  const over = cabinsAfter.filter((c) => c.free < 0)
  const capacity = quota?.capacity ?? 0
  const freeAfter = quota
    ? quota.free +
      quota.fixed_seats -
      rows
        .filter((r) => r.mode === 'fixed')
        .reduce((s, r) => s + fixedSeats(r), 0)
    : 0
  const givenPercent = capacity
    ? Math.round((100 * (capacity - freeAfter)) / capacity)
    : 0

  const usedAgencies = new Set(rows.map((r) => r.agency_id))
  const incomplete = rows.some(
    (r) => !r.agency_id || (r.mode === 'fixed' && fixedSeats(r) < 1)
  )

  const save = useMutation({
    mutationFn: () =>
      allocationBoardService.distribute(
        flightId!,
        rows.map((r): DistributeRow => ({
          allocation_id: r.allocation_id,
          agency_id: Number(r.agency_id),
          mode: r.mode,
          seats: r.mode === 'pool' ? Number(r.limit || 0) : fixedSeats(r),
          cabins:
            r.mode === 'pool'
              ? undefined
              : Object.fromEntries(
                  Object.entries(r.cabins)
                    .map(([c, n]) => [c, Number(n || 0)])
                    .filter(([, n]) => Number(n) > 0)
                ),
        })),
        remove,
        deadline || defaultDeadline
      ),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [BOARD_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['admin-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['allocation-overview'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        quota
          ? `Distribute ${quota.flight.flight_number} ${quota.flight.route}`
          : 'Distribute a flight'
      }
      description='Fixed: seats taken out of the flight for the agency. Pool: the agencies sell the free seats together, each up to its limit.'
      maxWidth='3xl'
      submitButton={{
        text: 'Save quota',
        onClick: () => save.mutate(),
        loading: save.isPending,
        disabled: !quota || incomplete || over.length > 0,
      }}
    >
      <div className='grid gap-4'>
        {!initialFlightId && (
          <div className='grid gap-1.5'>
            <Label>Flight</Label>
            <SimpleSelect
              value={flightId ? String(flightId) : undefined}
              onValueChange={(v) => setFlightId(Number(v))}
              items={flights}
              placeholder='Choose a flight'
            />
          </div>
        )}

        {flightId && isLoading && (
          <div className='text-muted-foreground flex justify-center py-8'>
            <Loader2 className='size-5 animate-spin' />
          </div>
        )}

        {quota && (
          <>
            {/* what stays free per cabin, as you type */}
            <div className='grid gap-2 rounded-lg border p-3'>
              <div className='flex items-center justify-between text-sm'>
                <span className='font-medium'>
                  {givenPercent}% of {capacity} seats given
                </span>
                <span
                  className={cn(
                    'font-mono text-xs',
                    freeAfter < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {freeAfter} free
                </span>
              </div>
              <div className='bg-muted h-2 overflow-hidden rounded-full'>
                <div
                  className={cn(
                    'h-full rounded-full',
                    givenPercent > 100
                      ? 'bg-rose-500'
                      : givenPercent === 100
                        ? 'bg-emerald-500'
                        : 'fm-gradient'
                  )}
                  style={{ width: `${Math.min(100, givenPercent)}%` }}
                />
              </div>
              <div className='flex flex-wrap gap-3 text-xs'>
                {cabinsAfter.map((c) => (
                  <span
                    key={c.cabin_class}
                    className={cn(
                      'font-mono',
                      c.free < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {c.cabin_class}: {c.given} fixed · {c.free} free of{' '}
                    {c.seats}
                  </span>
                ))}
              </div>
            </div>

            <div className='divide-y rounded-lg border'>
              <div className='text-muted-foreground grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_2rem] gap-2 px-3 py-2 text-xs font-medium'>
                <span>Agency</span>
                <span>Type</span>
                <span>Seats</span>
                <span />
              </div>
              {rows.map((r) => (
                <div
                  key={r.key}
                  className='grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)_2rem] items-center gap-2 px-3 py-2'
                >
                  <SimpleSelect
                    value={r.agency_id || undefined}
                    onValueChange={(v) => update(r.key, { agency_id: v })}
                    items={agencies.filter(
                      (a) =>
                        a.value === r.agency_id || !usedAgencies.has(a.value)
                    )}
                    placeholder='Agency'
                  />
                  <SimpleSelect
                    value={r.mode}
                    onValueChange={(v) =>
                      update(r.key, { mode: v as AllocationMode })
                    }
                    items={MODES}
                  />
                  {r.mode === 'pool' ? (
                    <Input
                      type='number'
                      min={0}
                      placeholder='No limit'
                      aria-label='Limit'
                      value={r.limit}
                      onChange={(e) =>
                        update(r.key, {
                          limit:
                            e.target.value === ''
                              ? ''
                              : Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  ) : (
                    <div className='flex gap-1.5'>
                      {quota.cabins.map((c) => (
                        <label key={c.cabin_class} className='relative flex-1'>
                          <span className='text-muted-foreground pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 font-mono text-xs'>
                            {c.cabin_class}
                          </span>
                          <Input
                            type='number'
                            min={0}
                            className='ps-6'
                            aria-label={`${c.cabin_class} seats`}
                            value={r.cabins[c.cabin_class] ?? ''}
                            onChange={(e) =>
                              update(r.key, {
                                cabins: {
                                  ...r.cabins,
                                  [c.cabin_class]:
                                    e.target.value === ''
                                      ? ''
                                      : Math.max(0, Number(e.target.value)),
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  )}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='size-8'
                    aria-label='Remove'
                    onClick={() =>
                      setRows(
                        rows.filter((x) => x.key !== r.key),
                        r.allocation_id ? [...remove, r.allocation_id] : remove
                      )
                    }
                  >
                    <X className='size-4' />
                  </Button>
                </div>
              ))}
              <div className='px-3 py-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 gap-2'
                  onClick={() =>
                    setRows([
                      ...rows,
                      {
                        key: `new-${Date.now()}`,
                        agency_id: '',
                        mode: 'fixed',
                        cabins: Object.fromEntries(
                          quota.cabins.map((c) => [c.cabin_class, ''])
                        ),
                        limit: '',
                      },
                    ])
                  }
                >
                  <Plus className='size-4' />
                  Add agency
                </Button>
              </div>
            </div>

            <div className='grid max-w-60 gap-1.5'>
              <Label htmlFor='distribute-deadline'>
                Names deadline (new agencies)
              </Label>
              <Input
                id='distribute-deadline'
                type='date'
                value={deadline || defaultDeadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {over.length > 0 && (
              <p className='text-xs text-rose-600 dark:text-rose-400'>
                {over
                  .map((c) => `${c.cabin_class}: ${-c.free} seat(s) too many`)
                  .join(' · ')}{' '}
                — lower the fixed seats.
              </p>
            )}
          </>
        )}
      </div>
    </BaseDialog>
  )
}
