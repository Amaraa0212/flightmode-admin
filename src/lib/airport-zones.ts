/*
| Flight times are kept in UTC; people read them in the local time of the airport (UBN 14:40, not 06:40 UTC and
| not the browser's clock). The time zone of every airport comes from /reference/airports once and is kept here.
*/
import { useQuery } from '@tanstack/react-query'
import { client, type ApiData } from '@/services/api/shared/client'
import { utcToLocal } from './airport-time'
import { formatDate } from './utils'

let zones: Record<string, string> = {}

async function loadZones() {
  const res = await client.get<
    ApiData<{ iata_code: string; timezone: string }[]>
  >('/reference/airports', { all: 1 })
  zones = Object.fromEntries(res.data.map((a) => [a.iata_code, a.timezone]))
  return zones
}

/** IATA code → IANA time zone (re-renders once loaded) */
export function useAirportZones() {
  const { data } = useQuery({
    queryKey: ['airport-zones'],
    queryFn: loadZones,
    staleTime: 60 * 60_000,
  })
  return data ?? zones
}

/** The departure airport of a route: the first code in "UBN-PQC", "UBN → PQC", "MR682 PQC-UBN" */
export const originOf = (route?: string | null) =>
  route?.match(/\b[A-Z]{3}\b/)?.[0]

/**
 * A UTC moment at an airport's clock, e.g. airportTime("2026-11-21T06:40:00Z", "UBN") → "2026-11-21 14:40".
 * Format tokens: YYYY MM DD HH mm. Without a known airport: the browser's clock.
 */
export function airportTime(
  iso: string | null | undefined,
  airport: string | null | undefined,
  format = 'YYYY-MM-DD HH:mm',
  known: Record<string, string> = zones
): string {
  if (!iso) return '-'
  const timezone = airport ? known[airport] : undefined
  if (!timezone) return formatDate(iso, format)
  const { date, time } = utcToLocal(new Date(iso).getTime(), timezone)
  return format
    .replace('YYYY', date.slice(0, 4))
    .replace('MM', date.slice(5, 7))
    .replace('DD', date.slice(8, 10))
    .replace('HH', time.slice(0, 2))
    .replace('mm', time.slice(3, 5))
}
