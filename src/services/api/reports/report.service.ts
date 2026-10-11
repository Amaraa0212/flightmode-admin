import type { Booking, FlightPassengerRow } from '../../types/sales/booking.types'
import type { ListParams } from '../../types/shared/common.types'
import { bookingService } from '../sales/booking.service'
import { client, ok, type ApiData } from '../shared/client'

/*
| /admin/reports/* — every report is limited by the API to the user's airline / station.
| The API returns whole lists for the period; search and paging run here.
*/

export interface TrafficRow extends Record<string, unknown> {
  id: number
  flight_number: string
  date: string
  route: string
  tail: string
  oci: number
  go_show: number
  no_show: number
  bags: number
  bag_kg: number
  flown: number
  capacity: number
}

export interface StationRow extends Record<string, unknown> {
  id: number
  date: string
  flight_number: string
  route: string
  bags: number
  bag_kg: number
  off_block_at: string | null
  takeoff_at: string | null
  estimated_arrival_at: string | null
  delay_reason: string | null
  pax: number
}

export interface SalesRow extends Record<string, unknown> {
  id: number
  pnr: string
  name: string
  route: string
  departure_at: string
  rbd: string
  issued_at: string
  agency: string
  fare: number
  tax: number
}

type ApiTraffic = {
  flight_id: number
  flight_number: string
  route: string
  departure_at: string
  status: string
  aircraft_type: string | null
  capacity: number
  booked: number
  flown: number
  no_show: number | null
  go_show: number
  online_checkin: number
  baggage_pieces: number
  baggage_weight_kg: number
}

type ApiFlightOps = {
  id: number
  off_block_at: string | null
  takeoff_at: string | null
  estimated_arrival_at: string | null
  status_reason: string | null
  aircraft: { registration: string } | null
}

/** start_day / end_day (also inside sortDate from useFilterParams) → from / to */
function period(params: ListParams) {
  const range = params.sortDate as { start_day?: string; end_day?: string } | undefined
  return {
    from: (params.start_day as string | undefined) ?? range?.start_day,
    to: (params.end_day as string | undefined) ?? range?.end_day,
  }
}

/** search + page a full list on the client */
function pageRows<T extends Record<string, unknown>>(rows: T[], params: ListParams, keys: (keyof T)[]) {
  const q = String(params.query ?? '').trim().toLowerCase()
  const found = q ? rows.filter((r) => keys.some((k) => String(r[k] ?? '').toLowerCase().includes(q))) : rows
  const size = params.pageSize ?? 20
  const page = params.current ?? 1
  return ok({ total: found.length, items: found.slice((page - 1) * size, page * size) })
}

async function traffic(params: ListParams, departedOnly = false) {
  return (
    await client.get<ApiData<ApiTraffic[]>>('/admin/reports/traffic', {
      ...period(params),
      departed_only: departedOnly ? 1 : undefined,
    })
  ).data
}

export const reportService = {
  traffic: async (params: ListParams = {}) => {
    const flights = await flightsById(params)
    const rows: TrafficRow[] = (await traffic(params))
      .filter((f) => f.status === 'departed' || f.status === 'gate_closed')
      .map((f) => ({
        id: f.flight_id,
        flight_number: f.flight_number,
        date: f.departure_at,
        route: f.route,
        tail: flights.get(f.flight_id)?.aircraft?.registration ?? f.aircraft_type ?? '-',
        oci: f.online_checkin,
        go_show: f.go_show,
        no_show: f.no_show ?? 0,
        bags: f.baggage_pieces,
        bag_kg: f.baggage_weight_kg,
        flown: f.flown,
        capacity: f.capacity,
      }))
    return pageRows(rows, params, ['flight_number', 'route', 'tail'])
  },

  station: async (params: ListParams = {}) => {
    const flights = await flightsById(params)
    const rows: StationRow[] = (await traffic(params))
      .filter((f) => f.status === 'departed' || f.status === 'gate_closed')
      .map((f) => {
        const ops = flights.get(f.flight_id)
        return {
          id: f.flight_id,
          date: f.departure_at,
          flight_number: f.flight_number,
          route: f.route,
          bags: f.baggage_pieces,
          bag_kg: f.baggage_weight_kg,
          off_block_at: ops?.off_block_at ?? null,
          takeoff_at: ops?.takeoff_at ?? null,
          estimated_arrival_at: ops?.estimated_arrival_at ?? null,
          delay_reason: ops?.status_reason ?? null,
          pax: f.flown,
        }
      })
    return pageRows(rows, params, ['flight_number', 'route', 'delay_reason'])
  },

  /** Ticket sales per passenger of the bookings made in the period */
  sales: async (params: ListParams = {}) => {
    const { from, to } = period(params)
    const bookings = (await bookingService.list({ pageSize: 500 })).body.items
    const rows: SalesRow[] = bookings
      .filter((b: Booking) => {
        const day = b.created_at.slice(0, 10)
        return b.status === 'confirmed' && (!from || day >= from) && (!to || day <= to)
      })
      .flatMap((b) =>
        b.passengers
          .filter((p) => p.segments.length)
          .map((p) => ({
            id: p.id,
            pnr: b.pnr,
            name: `${p.last_name}/${p.first_name}`,
            route: p.segments[0].route,
            departure_at: p.segments[0].departure_at,
            rbd: p.segments[0].fare_class,
            issued_at: b.created_at,
            agency: b.agency?.name ?? 'Direct',
            fare: p.segments[0].fare_amount,
            tax: p.segments[0].tax_amount,
          }))
      )
    return pageRows(rows, params, ['pnr', 'name', 'route', 'agency'])
  },

  /** GET /admin/reports/passenger-search — PNR, name, document or ticket (at least 2 characters) */
  paxSearch: async (params: ListParams = {}) => {
    const q = String(params.query ?? '').trim()
    if (q.length < 2) return ok({ total: 0, items: [] as FlightPassengerRow[] })
    const res = await client.get<{ data: ApiSegmentRow[]; meta?: { total: number } }>(
      '/admin/reports/passenger-search',
      { query: q, page: params.current ?? 1, per_page: params.pageSize ?? 50 }
    )
    return ok({ total: res.meta?.total ?? res.data.length, items: res.data.map(toPassengerRow) })
  },

  /** Online check-in share per month (legacy load_factor) */
  onlineCheckin: async (year = new Date().getFullYear()) => {
    const res = await client.get<ApiData<{ month: number; flown: number; online_checkin: number }[]>>(
      '/admin/reports/online-checkin',
      { year }
    )
    return res.data
      .filter((m) => m.flown > 0)
      .map((m) => ({ month: `${year}-${String(m.month).padStart(2, '0')}`, pax: m.flown, oci: m.online_checkin }))
  },
}

/** Flights of the period by id (registration, block times, delay reason) */
async function flightsById(params: ListParams) {
  const res = await client.get<{ data: ApiFlightOps[] }>('/admin/flights', { ...period(params), per_page: 1000 })
  return new Map(res.data.map((f) => [f.id, f]))
}

type ApiSegmentRow = {
  id: number
  flight_id: number
  cabin_class: string
  seat_number: string | null
  status: string
  ssr_codes?: string[]
  flight?: {
    flight_number: string
    scheduled_departure_at: string
    origin?: { iata_code: string }
    destination?: { iata_code: string }
  }
  baggage?: { pieces: number; weight_kg: number | string }[]
  passenger?: {
    pnr?: string
    agency?: { name: string } | null
    type: string
    first_name: string
    last_name: string
    gender: string | null
    date_of_birth: string | null
    nationality: string | null
    document_number: string | null
    phone: string | null
  }
}

const toPassengerRow = (s: ApiSegmentRow): FlightPassengerRow => ({
  id: s.id,
  pnr: s.passenger?.pnr ?? '',
  last_name: s.passenger?.last_name ?? '',
  first_name: s.passenger?.first_name ?? '',
  type: s.passenger?.type ?? 'ADT',
  gender: s.passenger?.gender ?? '',
  date_of_birth: s.passenger?.date_of_birth ?? '',
  nationality: s.passenger?.nationality ?? '',
  document_number: s.passenger?.document_number ?? '',
  seat_number: s.seat_number,
  cabin_class: s.cabin_class,
  status: s.status,
  ssr_codes: s.ssr_codes ?? [],
  agency: s.passenger?.agency?.name ?? null,
  phone: s.passenger?.phone ?? null,
  flight_id: s.flight_id,
  flight_number: s.flight?.flight_number ?? '',
  route: s.flight ? `${s.flight.origin?.iata_code ?? ''}-${s.flight.destination?.iata_code ?? ''}` : '',
  departure_at: s.flight?.scheduled_departure_at ?? '',
  bags: (s.baggage ?? []).reduce((n, b) => n + b.pieces, 0),
  bag_weight_kg: (s.baggage ?? []).reduce((n, b) => n + Number(b.weight_kg), 0),
  zone: null,
})
