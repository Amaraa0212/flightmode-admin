import { airportTime, useAirportZones } from '@/lib/airport-zones'
import { cn } from '@/lib/utils'

/** A flight time at the airport's own clock (UBN 14:40), whatever the browser's time zone */
export function AirportTime({
  at,
  airport,
  format = 'YYYY-MM-DD HH:mm',
  className,
}: {
  at: string | null | undefined
  /** IATA code of the airport the time belongs to (departure: origin, arrival: destination) */
  airport: string | null | undefined
  format?: string
  className?: string
}) {
  const zones = useAirportZones()
  if (!at) return <>-</>
  return (
    <span className={cn('text-xs text-nowrap', className)}>
      {airportTime(at, airport, format, zones)}
    </span>
  )
}
