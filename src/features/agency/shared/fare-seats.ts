import type { AgencyFare, AgencyFlight } from '@/services'

/**
 * Seats left at a fare: its own quota, or — when the fare has none (seats 0 / published fare of a fixed block) —
 * what is left in its cabin, which is the real limit.
 */
export function fareSeatsLeft(
  flight: AgencyFlight,
  fare: AgencyFare
): number | null {
  return (
    fare.remaining ??
    flight.cabins.find((c) => c.cabin_class === fare.cabin_class)?.remaining ??
    null
  )
}

export function fareSeatsLabel(flight: AgencyFlight, fare: AgencyFare): string {
  if (fare.waitlist) return 'HL (хүлээлгэ)'
  const left = fareSeatsLeft(flight, fare)
  return left === null ? 'хязгааргүй' : `${left} үлдсэн`
}
