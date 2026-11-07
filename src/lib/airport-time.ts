/*
| Flight times are typed in the local time of each airport. The airport's timezone gives its UTC offset on that date
| (summer time included), which is what the duration and the next-day (+1) mark are worked out from.
*/

const pad = (n: number) => String(n).padStart(2, '0')

/** Minutes the timezone is ahead of UTC at this moment */
function offsetMinutes(timezone: string, utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(new Date(utcMs))
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value)
  const asUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute')
  )
  return Math.round((asUtc - Math.floor(utcMs / 60_000) * 60_000) / 60_000)
}

/** "2026-11-09" + "07:30" at the airport → UTC milliseconds */
export function localToUtc(date: string, time: string, timezone: string) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const clock = Date.UTC(y, m - 1, d, hh, mm)
  const first = clock - offsetMinutes(timezone, clock) * 60_000
  return clock - offsetMinutes(timezone, first) * 60_000
}

/** UTC milliseconds → { date: "2026-11-09", time: "07:30" } at the airport */
export function utcToLocal(utcMs: number, timezone: string) {
  const local = new Date(utcMs + offsetMinutes(timezone, utcMs) * 60_000)
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  }
}

/** "UTC+8", "UTC+5:30" on that date */
export function utcLabel(timezone: string, date: string) {
  const offset = offsetMinutes(timezone, localToUtc(date, '12:00', timezone))
  const abs = Math.abs(offset)
  const minutes = abs % 60
  return `UTC${offset < 0 ? '-' : '+'}${Math.floor(abs / 60)}${minutes ? `:${pad(minutes)}` : ''}`
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

/** Days between two local dates: 1 is the +1 mark */
export function dayDifference(from: string, to: string) {
  return Math.round(
    (localToUtc(to, '12:00', 'UTC') - localToUtc(from, '12:00', 'UTC')) /
      86_400_000
  )
}

export interface FlightClock {
  date: string
  departureTime: string
  originTimezone: string
  destinationTimezone: string
}

/**
 * The first time the arrival clock comes after departure: the same day, the next, or (flying west) the day before.
 * Returns the arrival moment, the flight's minutes and the day mark.
 */
export function arrivalFromTime(flight: FlightClock, arrivalTime: string) {
  const departure = localToUtc(
    flight.date,
    flight.departureTime,
    flight.originTimezone
  )
  for (const days of [-1, 0, 1, 2]) {
    const arrival = localToUtc(
      addDays(flight.date, days),
      arrivalTime,
      flight.destinationTimezone
    )
    if (arrival > departure) {
      return {
        arrivalUtc: arrival,
        minutes: Math.round((arrival - departure) / 60_000),
        dayOffset: days,
      }
    }
  }
  return null
}

/** The arrival clock at the destination after this many minutes of flight */
export function arrivalFromMinutes(flight: FlightClock, minutes: number) {
  const departure = localToUtc(
    flight.date,
    flight.departureTime,
    flight.originTimezone
  )
  const local = utcToLocal(
    departure + minutes * 60_000,
    flight.destinationTimezone
  )
  return {
    time: local.time,
    dayOffset: dayDifference(flight.date, local.date),
  }
}

/** "+1", "-1", or nothing for the same day */
export const dayMark = (days: number) =>
  days === 0 ? '' : days > 0 ? `+${days}` : String(days)

export const minutesToHhmm = (minutes: number) =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

export const hhmmToMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
