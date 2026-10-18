import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { seatMapService, type SeatCell } from '@/services'
import { Lock, LockOpen, MousePointerClick } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FlightPicker } from '@/components/flight-picker'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { SeatMapGrid } from '@/components/seat-map-grid'

const route = getRouteApi('/_authenticated/dcs/seat-block/')

export function SeatBlock() {
  const { flight } = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: layout, error } = useQuery({
    queryKey: ['admin-seat-block', flight],
    queryFn: async () => (await seatMapService.flightLayout(flight!)).body,
    enabled: !!flight,
  })

  const toggle = useMutation({
    mutationFn: async (block: boolean) =>
      seatMapService.toggleBlock(flight!, [...selected], block),
    onSuccess: (res) => {
      toast.success(res.message)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['admin-seat-block', flight] })
    },
  })

  const onSeatClick = (seat: SeatCell) => {
    if (seat.state === 'occupied')
      return toast.info(`${seat.number} is taken by ${seat.occupant}`)
    const next = new Set(selected)
    if (next.has(seat.number)) next.delete(seat.number)
    else next.add(seat.number)
    setSelected(next)
  }

  const cells =
    layout?.rows.flatMap((r) => r.seats) ?? []
  const blocked = cells.filter((s) => s.state === 'blocked').length
  const selection = cells.filter((s) => selected.has(s.number))

  return (
    <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
      <PageHeader
        title='Seat Block'
        description='Block seats of a flight (crew rest, weight & balance, VIP) — blocked seats cannot be assigned at check-in or online'
        actions={
          <FlightPicker
            value={flight}
            onChange={(id) => {
              setSelected(new Set())
              navigate({ search: { flight: id } })
            }}
            upcomingOnly
          />
        }
      />

      {!flight ? (
        <div className='fm-panel text-muted-foreground flex flex-col items-center gap-3 py-20'>
          <MousePointerClick className='size-8' />
          Select a flight to block seats.
        </div>
      ) : error ? (
        <p className='text-destructive'>{(error as Error).message}</p>
      ) : layout ? (
        <div className='grid grid-cols-[minmax(0,1fr)_280px] items-start gap-4'>
          <div className='fm-panel space-y-3 p-4'>
            <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
              <span className='text-muted-foreground text-xs'>Aircraft</span>
              <span className='font-semibold'>{layout.type || '—'}</span>
              <span className='font-mono text-sm text-cyan-600 dark:text-cyan-300'>
                {layout.registration || 'no tail'}
              </span>
              <span className='text-muted-foreground text-xs'>
                · {cells.length} seats · the seat map follows the aircraft of this flight
              </span>
            </div>
            <SeatMapGrid
              layout={layout}
              selected={selected}
              onSeatClick={onSeatClick}
            />
          </div>
          <div className='fm-panel space-y-4 p-4'>
            <div className='grid grid-cols-2 gap-2 text-center'>
              <div className='fm-inset p-3'>
                <p className='text-2xl font-bold'>{blocked}</p>
                <p className='text-muted-foreground text-xs'>Blocked</p>
              </div>
              <div className='fm-inset p-3'>
                <p className='text-2xl font-bold'>{selected.size}</p>
                <p className='text-muted-foreground text-xs'>Selected</p>
              </div>
            </div>
            <p className='text-muted-foreground min-h-10 font-mono text-xs break-words'>
              {selection.map((s) => s.number).join(', ') ||
                'Click free or blocked seats to select'}
            </p>
            <div className='grid gap-2'>
              <Button
                className='gap-2'
                disabled={
                  !selection.some((s) => s.state === 'available') ||
                  toggle.isPending
                }
                onClick={() => toggle.mutate(true)}
              >
                <Lock className='size-4' />
                Block selected
              </Button>
              <Button
                variant='outline'
                className='gap-2'
                disabled={
                  !selection.some((s) => s.state === 'blocked') ||
                  toggle.isPending
                }
                onClick={() => toggle.mutate(false)}
              >
                <LockOpen className='size-4' />
                Release selected
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Main>
  )
}
