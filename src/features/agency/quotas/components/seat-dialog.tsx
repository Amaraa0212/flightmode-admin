import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agencyPortalService, type AgencyQuota, type AgencySeatMap } from '@/services'
import type { SeatCell } from '@/services/types/fleet/aircraft.types'
import { Armchair, Loader2, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BaseDialog } from '@/components/ui/base-dialog'
import { Button } from '@/components/ui/button'
import { SeatMapGrid } from '@/components/seat-map-grid'

/**
 * Charter seat reservation for the agency's passengers (legacy OT). Pick a passenger, then a free seat; a seat of
 * another own passenger swaps the two; the passenger's own seat gives it back. Nobody is checked in.
 */
export function SeatDialog({ quota, onClose }: { quota: AgencyQuota | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [flightId, setFlightId] = useState<number | undefined>(undefined)
  const [active, setActive] = useState<number | null>(null)
  const flight = flightId ?? quota?.flights?.[0]?.id

  const key = ['agency-seat-map', quota?.id, flight]
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () => (await agencyPortalService.seatMap(quota!.id, flight)).body,
    enabled: !!quota,
    retry: false,
  })

  const passengers = data?.passengers ?? []
  const current = passengers.find((p) => p.segment_id === active) ?? null

  const next = (map: AgencySeatMap, after: number | null) =>
    map.passengers.find((p) => !p.seat_number && p.segment_id !== after)?.segment_id ?? after

  const save = useMutation({
    mutationFn: (rows: { segment_id: number; seat_number: string | null }[]) =>
      agencyPortalService.saveSeats(quota!.id, flight, rows),
    onSuccess: (res) => {
      queryClient.setQueryData(key, res.body)
      setActive(next(res.body, active))
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const auto = useMutation({
    mutationFn: () => agencyPortalService.autoSeats(quota!.id, flight),
    onSuccess: (res) => {
      toast.success(res.message)
      queryClient.setQueryData(key, res.body)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const pickSeat = (seat: SeatCell) => {
    if (!current || save.isPending) return
    if (seat.number === current.seat_number) {
      return save.mutate([{ segment_id: current.segment_id, seat_number: null }])
    }
    const other = data?.own[seat.number]
    if (other) {
      // swap with another passenger of the agency
      return save.mutate([
        { segment_id: current.segment_id, seat_number: seat.number },
        { segment_id: other, seat_number: current.seat_number },
      ])
    }
    if (seat.state !== 'available') return toast.error(`Seat ${seat.number} cannot be reserved.`)
    if (seat.cabin_class !== current.cabin_class) return toast.error(`Seat ${seat.number} is in another cabin.`)
    save.mutate([{ segment_id: current.segment_id, seat_number: seat.number }])
  }

  const seated = passengers.filter((p) => p.seat_number).length

  return (
    <BaseDialog
      open={!!quota}
      onOpenChange={(open) => {
        if (!open) {
          setActive(null)
          setFlightId(undefined)
          onClose()
        }
      }}
      title='Суудал захиалах'
      description='Зөвхөн суудал хадгална — check-in-ийг DCS эсвэл online check-in дээр хийхэд энэ суудал үлдэнэ.'
      maxWidth='5xl'
      cancelButton={{ text: 'Хаах' }}
    >
      {quota?.flights && quota.flights.length > 1 && (
        <div className='mb-3 flex gap-2'>
          {quota.flights.map((f) => (
            <Button
              key={f.id}
              size='sm'
              variant={f.id === flight ? 'default' : 'outline'}
              className='h-8'
              onClick={() => {
                setFlightId(f.id)
                setActive(null)
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className='text-muted-foreground flex justify-center py-16'>
          <Loader2 className='size-5 animate-spin' />
        </div>
      )}
      {error && <p className='py-10 text-center text-sm text-rose-600 dark:text-rose-400'>{error.message}</p>}

      {data && (
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]'>
          <SeatMapGrid
            layout={data.layout}
            selected={new Set(current?.seat_number ? [current.seat_number] : [])}
            onSeatClick={pickSeat}
            showZones={false}
          />

          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-semibold'>
                Зорчигчид <span className='text-muted-foreground font-normal'>· {seated}/{passengers.length} суудалтай</span>
              </p>
              <Button
                size='sm'
                variant='outline'
                className='h-8 gap-1.5'
                disabled={auto.isPending || seated === passengers.length}
                onClick={() => auto.mutate()}
              >
                <Wand2 className='size-3.5' />
                Автоматаар
              </Button>
            </div>
            <p className='text-muted-foreground text-xs'>
              Зорчигчийг сонгоод суудал дээр дарна. Өөрийн зорчигчийн суудал дээр дарвал солигдоно.
            </p>
            <div className='max-h-[28rem] divide-y overflow-y-auto rounded-lg border'>
              {passengers.map((p) => (
                <div
                  key={p.segment_id}
                  role='button'
                  tabIndex={0}
                  onClick={() => setActive(p.segment_id)}
                  onKeyDown={(e) => e.key === 'Enter' && setActive(p.segment_id)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm',
                    p.segment_id === active ? 'bg-amber-400/15' : 'hover:bg-muted/50'
                  )}
                >
                  <span className='min-w-0'>
                    <span className='block truncate font-medium'>{p.name}</span>
                    <span className='text-muted-foreground font-mono text-[11px]'>
                      {p.pnr} · {p.cabin_class}
                      {p.person_code ? ` · SAP ${p.person_code}` : ''}
                    </span>
                  </span>
                  {p.seat_number ? (
                    <span className='flex items-center gap-1'>
                      <span className='rounded bg-cyan-400/15 px-1.5 py-0.5 font-mono text-xs font-semibold'>
                        {p.seat_number}
                      </span>
                      <button
                        type='button'
                        aria-label={`Release ${p.seat_number}`}
                        className='text-muted-foreground hover:text-foreground'
                        onClick={(e) => {
                          e.stopPropagation()
                          save.mutate([{ segment_id: p.segment_id, seat_number: null }])
                        }}
                      >
                        <X className='size-3.5' />
                      </button>
                    </span>
                  ) : (
                    <Armchair className='text-muted-foreground size-4' aria-label='No seat' />
                  )}
                </div>
              ))}
              {!passengers.length && (
                <p className='text-muted-foreground px-3 py-8 text-center text-sm'>
                  Суудал захиалах зорчигч алга (check-in хийгдсэн эсвэл бүртгэлгүй).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </BaseDialog>
  )
}
