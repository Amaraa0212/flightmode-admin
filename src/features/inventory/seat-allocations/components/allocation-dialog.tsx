import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agencyOptions,
  flightOptions,
  inventoryAllocationService,
  type CabinCode,
  type FlightInventory,
} from '@/services'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useOptions } from '@/hooks/use-options'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CABIN_NAMES, SeatInput } from './shared'

const ONE_WAY = 'none'

/** Mutation that refreshes the seat inventory and the allocation list */
export function useAllocationMutation<V>(
  run: (v: V) => Promise<{ message: string }>,
  onDone?: () => void
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['admin-allocations'] })
      onDone?.()
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

/**
 * Give / change an agency's seats on this flight, per cabin. Each cabin is capped by what is still free in it
 * (cabin seats − other allocations − direct sales), the same check the API makes.
 */
export function AllocationDialog({
  data,
  allocationId,
  onClose,
}: {
  data: FlightInventory
  /** edit this allocation; empty = new */
  allocationId?: number
  onClose: () => void
}) {
  const rows = data.agencies.filter((a) => a.allocation_id === allocationId)
  const current = rows[0]
  const departure = (data.flight.scheduled_departure_local ?? '').slice(0, 10)

  const agencies = useOptions('agencies', agencyOptions)
  const flights = useOptions('flights-upcoming', () => flightOptions())

  const [agencyId, setAgencyId] = useState(
    current ? String(current.agency_id) : ''
  )
  const [returnId, setReturnId] = useState(
    current?.return_flight_id ? String(current.return_flight_id) : ONE_WAY
  )
  const [deadline, setDeadline] = useState(
    current?.deadline ?? dayBefore(departure)
  )
  const [waitlist, setWaitlist] = useState(current?.is_waitlist ?? false)
  // pool: the agencies sell the flight's free seats together, nothing is taken out
  const [mode, setMode] = useState<'fixed' | 'pool'>(current?.mode ?? 'fixed')
  const [poolCabins, setPoolCabins] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      data.cabins.map((c) => [
        c.cabin_class,
        current?.mode === 'pool'
          ? rows.some((r) => r.cabin_class === c.cabin_class)
          : true,
      ])
    )
  )
  const [poolLimit, setPoolLimit] = useState<number | ''>(
    current?.mode === 'pool' ? current.allocation_seats || '' : ''
  )
  const pool = mode === 'pool'
  const [seats, setSeats] = useState<Record<string, number | ''>>(() =>
    Object.fromEntries(
      data.cabins.map((c) => [
        c.cabin_class,
        rows.find((r) => r.cabin_class === c.cabin_class)?.seats ?? '',
      ])
    )
  )

  // own seats count as free when editing; free_for_allocation is negative when the cabin is over-allocated
  const maxOf = (cabin: string) =>
    Math.max(
      0,
      data.cabins.find((c) => c.cabin_class === cabin)!.free_for_allocation +
        (rows.find((r) => r.cabin_class === cabin)?.seats ?? 0)
    )
  const invalid = pool
    ? []
    : data.cabins.filter(
        (c) => Number(seats[c.cabin_class] || 0) > maxOf(c.cabin_class)
      )
  const total = Object.values(seats).reduce<number>(
    (sum, n) => sum + Number(n || 0),
    0
  )
  // the outbound flight of a round trip allocation is the other flight
  const outboundId = current?.outbound_flight_id ?? data.flight.id
  const isReturnSide =
    !!current && current.outbound_flight_id !== data.flight.id

  const save = useAllocationMutation(
    () =>
      inventoryAllocationService.save(
        {
          mode,
          seats: pool ? Number(poolLimit || 0) : undefined,
          agency_id: Number(agencyId),
          outbound_flight_id: outboundId,
          return_flight_id: returnId === ONE_WAY ? null : Number(returnId),
          deadline,
          is_waitlist: waitlist,
          cabins: (pool
            ? Object.fromEntries(
                Object.entries(poolCabins)
                  .filter(([, on]) => on)
                  .map(([c]) => [c, 0])
              )
            : Object.fromEntries(
                Object.entries(seats).map(([c, n]) => [c, Number(n || 0)])
              )) as Partial<Record<CabinCode, number>>,
        },
        allocationId
      ),
    onClose
  )

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={
        current
          ? `Edit ${current.agency ?? 'allocation'}`
          : 'Add agency allocation'
      }
      description={`${data.flight.flight_number} ${data.flight.origin?.iata_code}-${data.flight.destination?.iata_code} · ${data.flight.scheduled_departure_local}`}
      maxWidth='lg'
      className='p-1'
      submitButton={{
        text: current ? 'Save' : 'Add allocation',
        onClick: () => save.mutate(undefined),
        loading: save.isPending,
        disabled:
          !agencyId ||
          !deadline ||
          (pool
            ? !Object.values(poolCabins).some(Boolean)
            : total < 1 || invalid.length > 0),
      }}
    >
      <div className='grid gap-4'>
        <div className='grid gap-1.5'>
          <Label>Agency</Label>
          <Select value={agencyId} onValueChange={setAgencyId}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Choose an agency' />
            </SelectTrigger>
            <SelectContent>
              {agencies.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-1.5'>
          <Label>Type</Label>
          <div className='grid grid-cols-2 gap-2'>
            {(
              [
                [
                  'fixed',
                  'Fixed seats',
                  'Seats are taken out of the flight for this agency',
                ],
                [
                  'pool',
                  'Pool (free sale)',
                  'Sells the free seats together with the other pool agencies',
                ],
              ] as const
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type='button'
                onClick={() => setMode(value)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-start transition',
                  mode === value
                    ? 'border-primary bg-primary/10'
                    : 'hover:bg-muted'
                )}
              >
                <p className='text-sm font-medium'>{title}</p>
                <p className='text-muted-foreground text-xs'>{hint}</p>
              </button>
            ))}
          </div>
        </div>

        {pool ? (
          <div className='grid gap-1.5'>
            <Label>Cabins the agency may sell</Label>
            <div className='divide-y rounded-lg border'>
              {data.cabins.map((c) => (
                <label
                  key={c.cabin_class}
                  className='flex items-center justify-between gap-3 px-3 py-2'
                >
                  <span className='flex items-center gap-2 text-sm'>
                    <Checkbox
                      checked={!!poolCabins[c.cabin_class]}
                      onCheckedChange={(v) =>
                        setPoolCabins((p) => ({
                          ...p,
                          [c.cabin_class]: v === true,
                        }))
                      }
                    />
                    <span className='font-mono font-semibold'>
                      {c.cabin_class}
                    </span>
                    {CABIN_NAMES[c.cabin_class]}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {Math.max(0, c.free_for_allocation)} free on the flight
                  </span>
                </label>
              ))}
            </div>
            <div className='mt-2 grid gap-1.5'>
              <Label htmlFor='pool-limit'>Limit for this agency</Label>
              <Input
                id='pool-limit'
                type='number'
                min={0}
                placeholder='No limit — every free seat'
                value={poolLimit}
                onChange={(e) =>
                  setPoolLimit(
                    e.target.value === ''
                      ? ''
                      : Math.max(0, Number(e.target.value))
                  )
                }
              />
              <p className='text-muted-foreground text-xs'>
                Nothing is taken out of the flight. A seat one pool agency holds
                or sells is gone for the others.
              </p>
            </div>
          </div>
        ) : (
          <div className='grid gap-1.5'>
            <Label>Seats per class of service</Label>
            <div className='divide-y rounded-lg border'>
              {data.cabins.map((c) => {
                const max = maxOf(c.cabin_class)
                return (
                  <div
                    key={c.cabin_class}
                    className='flex items-center justify-between gap-3 px-3 py-2'
                  >
                    <div>
                      <p className='text-sm'>
                        <span className='font-mono font-semibold'>
                          {c.cabin_class}
                        </span>{' '}
                        {CABIN_NAMES[c.cabin_class]}
                      </p>
                      <p
                        className={
                          invalid.includes(c)
                            ? 'text-xs text-red-600 dark:text-red-400'
                            : 'text-muted-foreground text-xs'
                        }
                      >
                        {invalid.includes(c) && 'Too many — '}
                        {max} free of{' '}
                        {c.is_set
                          ? (c.seats ?? 0) + c.oversell - c.curtail
                          : c.aircraft_seats}{' '}
                        in the cabin
                      </p>
                    </div>
                    <SeatInput
                      label={`${c.cabin_class} seats for the agency`}
                      value={seats[c.cabin_class]}
                      placeholder='0'
                      max={Math.max(max, Number(seats[c.cabin_class] || 0))}
                      invalid={invalid.includes(c)}
                      disabled={max === 0 && !seats[c.cabin_class]}
                      hint={`Max ${max}`}
                      onChange={(v) =>
                        setSeats((s) => ({ ...s, [c.cabin_class]: v }))
                      }
                    />
                  </div>
                )
              })}
              <div className='flex items-center justify-between px-3 py-2 text-sm font-semibold'>
                <span>Total</span>
                <span className='font-mono'>{total}</span>
              </div>
            </div>
            {current?.uses_fare_quotas && (
              <p className='text-muted-foreground text-xs'>
                Fare quotas of this allocation stay as they are (edit them under
                Assign quota to agency).
              </p>
            )}
          </div>
        )}

        {!isReturnSide && (
          <div className='grid gap-1.5'>
            <Label>Return flight</Label>
            <Select value={returnId} onValueChange={setReturnId}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ONE_WAY}>One way</SelectItem>
                {flights
                  .filter((f) => f.value !== String(data.flight.id))
                  .map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='grid grid-cols-2 items-end gap-4'>
          <div className='grid gap-1.5'>
            <Label htmlFor='alloc-deadline'>Names deadline</Label>
            <Input
              id='alloc-deadline'
              type='date'
              max={departure || undefined}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <label className='flex h-8 items-center gap-2 text-sm'>
            <Checkbox
              checked={waitlist}
              onCheckedChange={(v) => setWaitlist(v === true)}
            />
            Allow waitlist
          </label>
        </div>
      </div>
    </BaseDialog>
  )
}

function dayBefore(date: string) {
  if (!date) return ''
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}
