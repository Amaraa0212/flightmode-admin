import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { allocationBoardService, type FlightQuota } from '@/services'
import { toast } from 'sonner'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SimpleSelect } from '@/components/simple-select'
import { BOARD_QUERY_KEY } from './flight-board'

/** Move unsold seats of one cabin from one fixed allocation of the flight to another */
export function MoveSeatsDialog({
  quota,
  onClose,
}: {
  quota: FlightQuota
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const fixed = quota.allocations.filter((a) => a.mode === 'fixed')
  const items = fixed.map((a) => ({
    label: `${a.agency.name} · ${a.seats} seats, ${a.remaining} unsold`,
    value: String(a.allocation_id),
  }))
  const [fromId, setFromId] = useState(items[0]?.value)
  const [toId, setToId] = useState(items[1]?.value)
  const from = fixed.find((a) => String(a.allocation_id) === fromId)
  const cabins = Object.keys(from?.cabins ?? {})
  const [cabin, setCabin] = useState(cabins.includes('Y') ? 'Y' : cabins[0])
  const [seats, setSeats] = useState<number | ''>('')

  const move = useMutation({
    mutationFn: () =>
      allocationBoardService.move({
        from_allocation_id: Number(fromId),
        to_allocation_id: Number(toId),
        cabin_class: cabin!,
        seats: Number(seats),
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.invalidateQueries({ queryKey: [BOARD_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: ['admin-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <BaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Move seats · ${quota.flight.flight_number} ${quota.flight.route}`}
      description='Only unsold seats move. The seats leave one agency and go to the other in one step.'
      maxWidth='md'
      submitButton={{
        text: 'Move',
        onClick: () => move.mutate(),
        loading: move.isPending,
        disabled: !fromId || !toId || fromId === toId || !cabin || !seats,
      }}
    >
      <div className='grid gap-4'>
        <div className='grid gap-1.5'>
          <Label>From</Label>
          <SimpleSelect
            value={fromId}
            onValueChange={(v) => {
              setFromId(v)
              const next = Object.keys(
                fixed.find((a) => String(a.allocation_id) === v)?.cabins ?? {}
              )
              setCabin(next.includes('Y') ? 'Y' : next[0])
            }}
            items={items}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>To</Label>
          <SimpleSelect
            value={toId}
            onValueChange={setToId}
            items={items.filter((i) => i.value !== fromId)}
            placeholder='Choose the agency'
          />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='grid gap-1.5'>
            <Label>Cabin</Label>
            <SimpleSelect
              value={cabin}
              onValueChange={setCabin}
              items={cabins.map((c) => ({ label: c, value: c }))}
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='move-seats'>Seats</Label>
            <Input
              id='move-seats'
              type='number'
              min={1}
              max={from?.remaining}
              value={seats}
              onChange={(e) =>
                setSeats(
                  e.target.value === ''
                    ? ''
                    : Math.max(1, Number(e.target.value))
                )
              }
            />
          </div>
        </div>
      </div>
    </BaseDialog>
  )
}
