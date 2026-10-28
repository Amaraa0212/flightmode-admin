import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { flightOpsService, type CalendarFlight } from '@/services'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Below this share of seats taken the flight shows red */
const LOW_LOAD = 0.6
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Flight number small on top, free seats big in the middle, booked / seats on the side; charter / scheduled by colour */
function FlightChip({
  flight,
  onOpen,
}: {
  flight: CalendarFlight
  onOpen: () => void
}) {
  const load = flight.capacity ? flight.booked.total / flight.capacity : 0
  const low = load < LOW_LOAD
  const charter = flight.service_type === 'charter'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          onClick={onOpen}
          className={cn(
            'bg-background hover:bg-muted block w-full min-w-0 overflow-hidden rounded-md border border-s-4 px-1.5 py-1 text-start transition',
            charter ? 'border-s-violet-500' : 'border-s-sky-500',
            flight.status === 'cancelled' && 'line-through opacity-50'
          )}
        >
          <p className='text-muted-foreground truncate font-mono text-[10px] leading-tight'>
            {flight.flight_number} · {flight.time}
          </p>
          <div className='flex items-baseline justify-between gap-1'>
            <span
              className={cn(
                'font-mono text-lg leading-tight font-semibold',
                low && 'text-rose-600 dark:text-rose-400'
              )}
            >
              {flight.free}
            </span>
            <span
              className={cn(
                'truncate font-mono text-[11px]',
                low
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              )}
            >
              {flight.booked.total}/{flight.capacity}
            </span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent side='top' className='font-mono text-xs'>
        <p className='font-semibold'>
          {flight.flight_number} {flight.route} · {flight.time}{' '}
          {charter ? 'Charter' : 'Scheduled'}
        </p>
        <p>
          ADT {flight.booked.ADT} · CHD {flight.booked.CHD} · INF{' '}
          {flight.booked.INF}
        </p>
        <p>
          {flight.free} free of {flight.capacity} · {Math.round(load * 100)}%
          load
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Flight load by month: a calendar with every flight of each day — free seats big, booked / seats beside,
 * red under 60% load, ADT / CHD / INF on hover. Clicking a flight opens that day in the day view.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  onOpenDay,
}: {
  /** YYYY-MM */
  month: string
  onMonthChange: (month: string) => void
  onOpenDay: (date: string) => void
}) {
  const first = parseISO(`${month}-01`)
  const { data = [], isLoading } = useQuery({
    queryKey: ['flight-load-calendar', month],
    queryFn: async () => (await flightOpsService.calendar(month)).body,
  })
  const byDay = new Map<string, CalendarFlight[]>()
  for (const f of data) byDay.set(f.date, [...(byDay.get(f.date) ?? []), f])
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(first), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(first), { weekStartsOn: 1 }),
  })
  const today = format(new Date(), 'yyyy-MM-dd')
  const shift = (n: number) =>
    onMonthChange(format(addMonths(first, n), 'yyyy-MM'))

  return (
    <div className='fm-panel overflow-hidden'>
      <div className='flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3'>
        <div className='flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label='Previous month'
            onClick={() => shift(-1)}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <p className='min-w-36 text-center text-sm font-semibold'>
            {format(first, 'MMMM yyyy')}
          </p>
          <Button
            variant='ghost'
            size='icon'
            className='size-8'
            aria-label='Next month'
            onClick={() => shift(1)}
          >
            <ChevronRight className='size-4' />
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='ms-1 h-8'
            onClick={() => onMonthChange(format(new Date(), 'yyyy-MM'))}
          >
            This month
          </Button>
          {isLoading && (
            <Loader2 className='text-muted-foreground ms-2 size-4 animate-spin' />
          )}
        </div>
        <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-xs'>
          <span className='flex items-center gap-1'>
            <span className='size-2.5 rounded-sm bg-sky-500' /> Scheduled
          </span>
          <span className='flex items-center gap-1'>
            <span className='size-2.5 rounded-sm bg-violet-500' /> Charter
          </span>
          <span className='flex items-center gap-1'>
            <span className='size-2.5 rounded-sm bg-rose-500' /> Under{' '}
            {LOW_LOAD * 100}% load
          </span>
          <span>{data.length} flight(s)</span>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <div className='grid min-w-[56rem] grid-cols-7'>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className='text-muted-foreground border-b px-2 py-1.5 text-xs font-medium'
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const date = format(day, 'yyyy-MM-dd')
            const flights = byDay.get(date) ?? []
            return (
              <div
                key={date}
                className={cn(
                  'min-h-28 min-w-0 border-e border-b p-1.5 [&:nth-child(7n)]:border-e-0',
                  !isSameMonth(day, first) && 'bg-muted/40'
                )}
              >
                <button
                  type='button'
                  onClick={() => onOpenDay(date)}
                  className={cn(
                    'mb-1 rounded px-1 font-mono text-xs hover:underline',
                    date === today
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </button>
                <div className='grid gap-1'>
                  {flights.map((f) => (
                    <FlightChip
                      key={f.id}
                      flight={f}
                      onOpen={() => onOpenDay(date)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
