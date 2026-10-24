import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BaseResponse, FlightInventory } from '@/services'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export const CABIN_NAMES: Record<string, string> = {
  F: 'First',
  C: 'Business',
  W: 'Premium Economy',
  Y: 'Economy',
}

export const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
]

export const inventoryKey = (flightId?: number) =>
  flightId ? ['inventory', 'flight', flightId] : ['inventory']

/** Small numeric cell input; empty string means "not set". Values above `max` are cut to it. */
export function SeatInput({
  value,
  onChange,
  disabled,
  placeholder = '—',
  label,
  max = 999,
  invalid,
  hint,
}: {
  value: number | '' | null | undefined
  onChange: (value: number | '') => void
  disabled?: boolean
  placeholder?: string
  label: string
  max?: number
  invalid?: boolean
  hint?: string
}) {
  return (
    <Input
      type='number'
      inputMode='numeric'
      min={0}
      max={max}
      aria-label={label}
      aria-invalid={invalid || undefined}
      title={hint}
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) =>
        onChange(
          e.target.value === ''
            ? ''
            : Math.min(max, Math.max(0, Number(e.target.value)))
        )
      }
      className='h-7 w-20 px-2 text-end font-mono'
    />
  )
}

/**
 * Highest limit each class may take: the seats of its nearest ancestor in the same cabin that has a limit,
 * otherwise the cabin (the same rule the API checks).
 */
export function classCaps<
  R extends {
    id: number
    parent_id: number | null
    cabin_class: string
    code: string
  },
>(
  rows: R[],
  seatsOf: (id: number) => number | '' | null | undefined,
  cabinCap: (cabin: string) => number
): Record<number, { cap: number; by: string }> {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const caps: Record<number, { cap: number; by: string }> = {}
  for (const row of rows) {
    let parent = row.parent_id ? byId.get(row.parent_id) : undefined
    while (parent && parent.cabin_class === row.cabin_class) {
      const seats = seatsOf(parent.id)
      if (seats !== '' && seats !== null && seats !== undefined) break
      parent = parent.parent_id ? byId.get(parent.parent_id) : undefined
    }
    caps[row.id] =
      parent && parent.cabin_class === row.cabin_class
        ? { cap: Number(seatsOf(parent.id)), by: `parent ${parent.code}` }
        : { cap: cabinCap(row.cabin_class), by: `cabin ${row.cabin_class}` }
  }
  return caps
}

/** Availability figure: red when nothing is left */
export function AvailCell({
  value,
  muted,
}: {
  value: number
  muted?: boolean
}) {
  return (
    <span
      className={cn(
        'font-mono font-semibold',
        muted
          ? 'text-muted-foreground'
          : value === 0
            ? 'text-red-600 dark:text-red-400'
            : 'text-emerald-600 dark:text-emerald-400'
      )}
    >
      {value}
    </span>
  )
}

/**
 * Write that returns the fresh inventory of the flight: puts it in the cache and refreshes the flight list totals.
 */
export function useInventoryMutation<V>(
  flightId: number,
  run: (v: V) => Promise<BaseResponse<FlightInventory>>,
  onDone?: () => void
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.setQueryData(inventoryKey(flightId), res.body)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'flights'] })
      onDone?.()
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
