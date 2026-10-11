import { flightSeriesService, type FlightSeries } from '@/services'
import { cn } from '@/lib/utils'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export function DaysCell({ days }: { days: number[] }) {
  return (
    <div className='flex gap-0.5'>
      {WEEKDAYS.map((d, i) => (
        <span
          key={d}
          className={cn(
            'flex size-5 items-center justify-center rounded text-[9px] font-bold',
            days.includes(i + 1)
              ? 'bg-cyan-400/20 text-cyan-600 dark:text-cyan-300'
              : 'text-muted-foreground/40'
          )}
        >
          {d}
        </span>
      ))}
    </div>
  )
}

export const pageConfig: Omit<
  ResourcePageProps<FlightSeries>,
  'search' | 'navigate'
> = {
  title: 'Frequency-based flight',
  description: 'Weekly series that generate dated flights for a period',
  queryKey: 'admin-flight-series',
  list: flightSeriesService.list,
  searchPlaceholder: 'Flight number, route or aircraft',
  columns: [
    col<FlightSeries>('flight_number', 'Flight no', (r) =>
      brand(r.flight_number)
    ),
    col<FlightSeries>(
      'route',
      'Route',
      (r) => `${r.origin} → ${r.destination}`,
      { accessor: (r) => `${r.origin}-${r.destination}` }
    ),
    col<FlightSeries>(
      'days_of_week',
      'Days',
      (r) => <DaysCell days={r.days_of_week} />,
      { accessor: (r) => r.days_of_week.join(',') }
    ),
    col<FlightSeries>(
      'times',
      'Dep / Arr',
      (r) => mono(`${r.departure_time} – ${r.arrival_time}`),
      { accessor: (r) => r.departure_time }
    ),
    col<FlightSeries>('aircraft', 'Aircraft', (r) => mono(r.aircraft)),
    col<FlightSeries>(
      'valid',
      'Period',
      (r) => mono(`${r.valid_from} → ${r.valid_to}`),
      { accessor: (r) => r.valid_from }
    ),
    col<FlightSeries>('flights_count', 'Flights', (r) =>
      muted(r.flights_count)
    ),
  ],
  remove: {
    run: (r) => flightSeriesService.remove(r.id),
    label: (r) => `${r.flight_number} ${r.origin}-${r.destination}`,
  },
}
