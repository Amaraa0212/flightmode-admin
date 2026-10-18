import type { SeatCell, SeatMapLayout } from '@/services'
import { DoorOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const LEGEND = [
  { label: 'Free', className: 'border-cyan-400/50 bg-cyan-400/5' },
  { label: 'Business', className: 'border-amber-400/50 bg-amber-400/5' },
  { label: 'Occupied', className: 'border-cyan-300 bg-cyan-400' },
  { label: 'Blocked', className: 'border-rose-400/50 bg-rose-500/30' },
  { label: 'Selected', className: 'border-amber-300 bg-amber-400' },
]

function seatClass(seat: SeatCell, selected: boolean) {
  if (selected) return 'border-amber-300 bg-amber-400 text-[#1a1203]'
  if (seat.state === 'blocked')
    return 'border-rose-400/50 bg-rose-500/25 text-rose-300'
  if (seat.state === 'occupied')
    return 'border-cyan-300 bg-cyan-400 text-[#04121c]'
  if (seat.cabin_class === 'C' || seat.cabin_class === 'F')
    return 'border-amber-400/50 bg-amber-400/5 text-amber-600 hover:bg-amber-400/15 dark:text-amber-300'
  return 'border-cyan-400/40 bg-cyan-400/5 text-cyan-700 hover:bg-cyan-400/15 dark:text-cyan-300'
}

const CABIN_NAMES: Record<string, string> = {
  F: 'First',
  C: 'Business',
  W: 'Premium',
  Y: 'Economy',
}

type SeatMapGridProps = {
  layout: SeatMapLayout
  selected?: Set<string>
  onSeatClick?: (seat: SeatCell) => void
  showZones?: boolean
  className?: string
}

const SIDES = ['left', 'middle', 'right'] as const

/**
 * Aircraft seat map (fleet seat maps, seat block, check-in hierarchy preview).
 * Seats sit under their letter column, so a 2-2 business cabin lines up with the
 * window seats of a 3-3 economy cabin; with two aisles the row number shows on both.
 */
export function SeatMapGrid({
  layout,
  selected,
  onSeatClick,
  showZones = true,
  className,
}: SeatMapGridProps) {
  const sides = SIDES.filter((side) => layout.columns[side].length > 0)

  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex flex-wrap gap-x-3 gap-y-1'>
        {LEGEND.map((l) => (
          <span
            key={l.label}
            className='text-muted-foreground flex items-center gap-1 text-[11px]'
          >
            <span className={cn('size-2.5 rounded-sm border', l.className)} />
            {l.label}
          </span>
        ))}
      </div>
      <div className='overflow-x-auto'>
        <div className='mx-auto w-fit rounded-[2.5rem] border bg-gradient-to-b from-cyan-400/5 to-transparent px-8 pt-8 pb-6'>
          {layout.rows.map((row, index) => {
            const prev = layout.rows[index - 1]
            const cabinStart = row.cabin_class !== prev?.cabin_class
            const zoneStart = showZones && row.zone !== prev?.zone
            const bySeat = new Map(row.seats.map((s) => [s.letter, s]))
            return (
              <div key={row.row}>
                {(cabinStart || zoneStart) && (
                  <p className='text-muted-foreground mt-2 mb-1.5 text-center text-[10px] font-semibold tracking-widest uppercase'>
                    {cabinStart && CABIN_NAMES[row.cabin_class]}
                    {cabinStart && zoneStart && ' · '}
                    {zoneStart && `Zone ${row.zone}`}
                  </p>
                )}
                <div className='relative mb-1 flex items-center gap-1'>
                  {sides.map((side, sideIndex) => (
                    <div key={side} className='flex items-center gap-1'>
                      {sideIndex > 0 && (
                        <span className='w-5 text-center font-mono text-[9px] text-slate-500'>
                          {row.row}
                        </span>
                      )}
                      {layout.columns[side].map((letter) => {
                        const seat = bySeat.get(letter)
                        return seat ? (
                          <button
                            key={seat.number}
                            type='button'
                            title={`${seat.number} · ${seat.occupant ?? seat.state}${seat.is_exit ? ' · exit row' : ''}`}
                            onClick={() => onSeatClick?.(seat)}
                            className={cn(
                              'flex h-7 w-8 items-center justify-center rounded-md border font-mono text-[9px] font-bold transition',
                              seatClass(seat, !!selected?.has(seat.number)),
                              !onSeatClick && 'cursor-default'
                            )}
                          >
                            {seat.number}
                          </button>
                        ) : (
                          <span key={letter} className='h-7 w-8' aria-hidden />
                        )
                      })}
                    </div>
                  ))}
                  {sides.length === 1 && (
                    <span className='w-5 text-center font-mono text-[9px] text-slate-500'>
                      {row.row}
                    </span>
                  )}
                  {row.is_exit && (
                    <DoorOpen
                      className='absolute -end-6 size-4 text-emerald-400'
                      aria-label='Exit row'
                    />
                  )}
                </div>
              </div>
            )
          })}
          {!layout.rows.length && (
            <p className='text-muted-foreground px-10 py-16 text-sm'>
              No seat configuration yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
