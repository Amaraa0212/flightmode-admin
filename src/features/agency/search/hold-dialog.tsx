import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { agencyHoldService, type AgencyFlight } from '@/services'
import { toast } from 'sonner'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  formatDateTime,
  formatMoney,
} from '@/features/agency/transactions/transactions-table'

const CABIN: Record<string, string> = {
  F: 'First',
  C: 'Business',
  W: 'Premium',
  Y: 'Economy',
}

/** Keep seats of an allocation now, enter the names later from the holds page */
export function HoldDialog({
  flight,
  onClose,
  onHeld,
}: {
  flight: AgencyFlight
  onClose: () => void
  onHeld: () => void
}) {
  const queryClient = useQueryClient()
  const cabins = flight.cabins.filter((c) => c.remaining > 0)
  const [cabin, setCabin] = useState(cabins[0]?.cabin_class ?? '')
  const fares = flight.fares.filter(
    (f) => f.cabin_class === cabin && (f.remaining === null || f.remaining > 0)
  )
  const [fareId, setFareId] = useState<number | null>(fares[0]?.id ?? null)
  const fare = fares.find((f) => f.id === fareId) ?? null
  const [seats, setSeats] = useState(1)

  const max = Math.min(
    flight.remaining,
    flight.cabins.find((c) => c.cabin_class === cabin)?.remaining ?? 0,
    fare?.remaining ?? Number.MAX_SAFE_INTEGER
  )
  const needsFare = flight.uses_fare_quotas || flight.fares.length > 0

  const save = useMutation({
    mutationFn: () =>
      agencyHoldService.create({
        allocation_id: flight.id,
        cabin_class: cabin,
        seats,
        allocation_fare_id: fareId,
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: ['agency-flights'] })
      queryClient.invalidateQueries({ queryKey: ['agency-holds'] })
      queryClient.invalidateQueries({ queryKey: ['agency-quotas'] })
      onHeld()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const pickCabin = (c: string) => {
    setCabin(c)
    const first = flight.fares.find(
      (f) => f.cabin_class === c && (f.remaining === null || f.remaining > 0)
    )
    setFareId(first?.id ?? null)
    setSeats(1)
  }

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Hold — ${flight.flight_number} ${flight.route}`}
      description={`${flight.departure_local ?? ''} · нэр оруулах хугацаа ${formatDateTime(flight.names_deadline_at)}`}
      maxWidth='md'
      className='p-1'
      submitButton={{
        text: `${seats} суудал hold хийх`,
        onClick: () => save.mutate(),
        loading: save.isPending,
        disabled: !cabin || seats < 1 || seats > max || (needsFare && !fareId),
      }}
    >
      <div className='grid gap-4'>
        <div className='grid gap-1.5'>
          <Label>Cabin</Label>
          <div className='flex flex-wrap gap-1.5'>
            {flight.cabins.map((c) => (
              <Button
                key={c.cabin_class}
                type='button'
                size='sm'
                variant={cabin === c.cabin_class ? 'default' : 'outline'}
                disabled={c.remaining < 1}
                className='h-8 text-xs'
                onClick={() => pickCabin(c.cabin_class)}
              >
                {c.cabin_class} {CABIN[c.cabin_class]} · {c.remaining} үлдсэн
              </Button>
            ))}
          </div>
        </div>

        {needsFare && (
          <div className='grid gap-1.5'>
            <Label>Тариф</Label>
            <div className='grid gap-1.5'>
              {fares.map((f) => (
                <button
                  key={f.id}
                  type='button'
                  onClick={() => setFareId(f.id)}
                  aria-pressed={f.id === fareId}
                  className='hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5 flex items-center justify-between rounded-lg border px-3 py-2 text-start text-sm'
                >
                  <span>
                    <b className='font-mono'>{f.fare_class ?? '—'}</b>{' '}
                    <span className='text-muted-foreground text-xs'>
                      {f.remaining === null
                        ? 'хязгааргүй'
                        : `${f.remaining} үлдсэн`}
                    </span>
                  </span>
                  <span className='font-mono'>
                    {f.price
                      ? formatMoney(Number(f.price.fare) + Number(f.price.tax))
                      : '-'}
                  </span>
                </button>
              ))}
              {!fares.length && (
                <p className='text-muted-foreground text-xs'>
                  Энэ cabin-д үлдсэн тариф алга
                </p>
              )}
            </div>
          </div>
        )}

        <div className='grid gap-1.5'>
          <Label htmlFor='hold-seats'>Суудлын тоо</Label>
          <Input
            id='hold-seats'
            type='number'
            min={1}
            max={max}
            value={seats}
            onChange={(e) =>
              setSeats(Math.max(1, Math.min(max, Number(e.target.value) || 1)))
            }
            className='w-28'
          />
          <p className='text-muted-foreground text-xs'>
            Дээд тал нь {max}. Hold хийхэд мөнгө хасагдахгүй — нэр оруулж тийз
            бичихэд данснаас хасагдана.
          </p>
        </div>
      </div>
    </BaseDialog>
  )
}
