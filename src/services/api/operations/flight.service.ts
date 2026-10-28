import type {
  Allocation,
  AllocationMode,
  Flight,
  FlightListParams,
  FlightPayload,
  FlightSeries,
  FlightStatistics,
  FlightStatus,
} from '../../types/operations/flight.types'
import type { ListParams } from '../../types/shared/common.types'
import { action, client, getPage, ok, pageQuery, period, type ApiData } from '../shared/client'

/*
| /admin/flights, /admin/flight-series, /admin/allocations — every list is limited by the API
| to the user's airline (all airlines for a system administrator).
*/

type ApiFlight = Flight & { segments_count?: number }

const toFlight = (f: ApiFlight): Flight => ({
  ...f,
  service_type: f.service_type ?? 'scheduled',
  segments_count: f.segments_count ?? 0,
  online_checkin: f.online_checkin ?? { enabled: false, opens_minutes: 0, closes_minutes: 0 },
})

const route = (f: { origin?: { iata_code: string }; destination?: { iata_code: string } } | null) =>
  f ? `${f.origin?.iata_code ?? ''}-${f.destination?.iata_code ?? ''}` : ''

/** datetime-local value (airport local time as typed) → ISO for Laravel */
const iso = (value: string) => (value ? new Date(value).toISOString() : value)

type FlightBody = FlightPayload & { airline_id?: string }

const flightBody = (p: FlightBody) => ({
  flight_number: p.flight_number.toUpperCase(),
  service_type: p.service_type,
  origin_airport_id: Number(p.origin_airport_id),
  destination_airport_id: Number(p.destination_airport_id),
  aircraft_id: Number(p.aircraft_id),
  scheduled_departure_at: iso(p.scheduled_departure_at),
  scheduled_arrival_at: iso(p.scheduled_arrival_at),
  terminal: p.terminal || null,
  gate: p.gate || null,
  ...(p.airline_id ? { airline_id: Number(p.airline_id) } : {}),
})

/** API action names for the old status values of the screens */
const STATUS_ACTION: Partial<Record<FlightStatus, string>> = {
  checkin_open: 'open_checkin',
  checkin_closed: 'close_checkin',
  gate_closed: 'close_gate',
  departed: 'depart',
  cancelled: 'cancel',
}

type ApiStatistics = {
  capacity: { total: number; cabins: Record<string, number> }
  booked: { total: number; INF: number }
  checked_in: { total: number }
  boarded: { total: number }
  by_cabin: Record<string, { total: number }>
}

/** POST /admin/flights/bulk: one flight on several local days */
export interface FlightsBulkPayload {
  airline_id?: number
  aircraft_id: number
  flight_number: string
  origin_airport_id: number
  destination_airport_id: number
  service_type: 'scheduled' | 'charter'
  /** HH:MM, local time of the origin */
  departure_time: string
  block_minutes: number
  terminal?: string
  gate?: string
  /** YYYY-MM-DD, local days of the origin */
  dates: string[]
}

/** GET /admin/flights/latest: what the latest flight with a number had */
export interface FlightTemplate {
  aircraft_id: number
  origin_airport_id: number
  destination_airport_id: number
  service_type: 'scheduled' | 'charter'
  departure_time: string
  block_minutes: number
  terminal: string | null
  last_date: string
}

export const flightService = {
  createMany: (payload: FlightsBulkPayload) =>
    action(
      client.post<ApiData<{ created: number[]; skipped: string[] }>>('/admin/flights/bulk', payload),
      (r) => r
    ),
  latest: async (flightNumber: string) =>
    ok(
      (await client.get<ApiData<FlightTemplate | null>>('/admin/flights/latest', { flight_number: flightNumber }))
        .data
    ),
  list: (params: FlightListParams = {}) => {
    const {
      start_day: _s,
      end_day: _e,
      date,
      status,
      source,
      service_type,
      query,
      ...rest
    } = params
    const { from, to } = period(params)
    return getPage<ApiFlight, Flight>(
      '/admin/flights',
      {
        ...pageQuery(rest),
        from: from ?? date,
        to: to ?? date,
        status: Array.isArray(status) ? status[0] : status,
        // a single choice only — both selected means everything
        source: Array.isArray(source)
          ? source.length === 1
            ? source[0]
            : undefined
          : source,
        service_type: Array.isArray(service_type)
          ? service_type.length === 1
            ? service_type[0]
            : undefined
          : service_type,
        search: query,
      },
      toFlight
    )
  },
  getById: async (id: number) => ok(toFlight((await client.get<ApiData<ApiFlight>>(`/admin/flights/${id}`)).data)),
  create: (payload: FlightBody) =>
    action(client.post<ApiData<ApiFlight>>('/admin/flights', flightBody(payload)), toFlight),
  update: (id: number, payload: FlightBody) =>
    action(client.put<ApiData<ApiFlight>>(`/admin/flights/${id}`, flightBody(payload)), toFlight),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/flights/${id}`), () => null),

  statistics: async (id: number) => {
    const s = (await client.get<ApiData<ApiStatistics>>(`/admin/flights/${id}/statistics`)).data
    const stats: FlightStatistics = {
      capacity: s.capacity.total,
      booked: s.booked.total,
      checked_in: s.checked_in.total,
      boarded: s.boarded.total,
      infants: s.booked.INF,
      by_cabin: Object.entries(s.capacity.cabins).map(([cabin, capacity]) => ({
        cabin_class: cabin,
        capacity,
        booked: s.by_cabin[cabin]?.total ?? 0,
      })),
    }
    return ok(stats)
  },

  changeStatus: (id: number, status: FlightStatus, reason?: string) =>
    action(
      client.post<ApiData<ApiFlight>>(`/admin/flights/${id}/status`, {
        action: STATUS_ACTION[status] ?? status,
        reason,
      }),
      toFlight
    ),

  options: async () => ok(await flightOptions(false)),
}

// ─── Frequency-based flights ───
export interface FlightSeriesPayload {
  service_type?: 'scheduled' | 'charter'
  flight_number: string
  /** airport ids */
  origin: string
  destination: string
  /** aircraft id */
  aircraft: string
  /** seat allocation template id applied to new flights; 'none' / empty = none */
  inventory_template?: string
  departure_time: string
  arrival_time: string
  days_of_week: string[]
  valid_from: string
  valid_to: string
  airline_id?: string
}

type ApiSeries = {
  id: number
  flight_number: string
  service_type?: 'scheduled' | 'charter'
  origin: string
  destination: string
  origin_airport_id: number
  destination_airport_id: number
  aircraft_id: number | null
  inventory_template_id?: number | null
  period_start: string
  period_end: string
  days_of_week: number[]
  departure_time: string
  arrival_time: string
  flights_count?: number
}

const toSeries = (s: ApiSeries): FlightSeries => ({
  id: s.id,
  flight_number: s.flight_number,
  service_type: s.service_type ?? 'scheduled',
  origin: s.origin,
  destination: s.destination,
  origin_airport_id: s.origin_airport_id,
  destination_airport_id: s.destination_airport_id,
  aircraft_id: s.aircraft_id,
  aircraft: s.aircraft_id ? String(s.aircraft_id) : '',
  inventory_template: s.inventory_template_id ? String(s.inventory_template_id) : 'none',
  departure_time: s.departure_time,
  arrival_time: s.arrival_time,
  days_of_week: s.days_of_week,
  valid_from: s.period_start,
  valid_to: s.period_end,
  flights_count: s.flights_count ?? 0,
})

export const flightSeriesService = {
  list: (params: ListParams = {}) =>
    getPage<ApiSeries, FlightSeries>('/admin/flight-series', pageQuery(params), toSeries),

  /** POST /admin/flight-series — generates the dated flights (FlightSeriesService) */
  save: (payload: FlightSeriesPayload, id?: number) => {
    const body = {
      flight_number: payload.flight_number.toUpperCase(),
      service_type: payload.service_type ?? 'scheduled',
      origin_airport_id: Number(payload.origin),
      destination_airport_id: Number(payload.destination),
      aircraft_id: payload.aircraft ? Number(payload.aircraft) : null,
      inventory_template_id:
        payload.inventory_template && payload.inventory_template !== 'none'
          ? Number(payload.inventory_template)
          : null,
      departure_time: payload.departure_time,
      arrival_time: payload.arrival_time,
      days_of_week: payload.days_of_week.map(Number).sort(),
      period_start: payload.valid_from,
      period_end: payload.valid_to,
      ...(payload.airline_id ? { airline_id: Number(payload.airline_id) } : {}),
    }
    return action(
      id
        ? client.put<ApiData<ApiSeries>>(`/admin/flight-series/${id}`, body)
        : client.post<ApiData<ApiSeries>>('/admin/flight-series', body),
      toSeries
    )
  },

  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/flight-series/${id}`), () => null),
}

// ─── Agency quotas ───
export interface AllocationPayload {
  mode: AllocationMode
  agency_id: string
  outbound_flight_id: string
  return_flight_id: string
  /** fixed: the seats; pool: a limit, 0 = none */
  seats: number
  /** business seats inside `seats`; the rest is economy (fixed only) */
  business_seats: number
  deadline: string
  is_waitlist: boolean
}

type ApiAllocation = {
  id: number
  mode?: AllocationMode
  agency: { id: number; name: string }
  outbound_flight: ApiFlight
  return_flight: ApiFlight | null
  seats: number
  deadline: string
  uses_fare_quotas: boolean
  is_waitlist: boolean
  cabins?: Record<string, number> | []
  usage?: { used: number; held?: number; remaining: number }
  chinggis?: { synced_at: string | null; error: string | null }
  created_at: string
}

const flightRef = (f: ApiFlight) => ({
  id: f.id,
  flight_number: f.flight_number,
  scheduled_departure_at: f.scheduled_departure_at,
  route: route(f),
})

export const toAllocation = (a: ApiAllocation): Allocation => ({
  id: a.id,
  mode: a.mode ?? 'fixed',
  agency: a.agency,
  outbound_flight: flightRef(a.outbound_flight),
  return_flight: a.return_flight?.id ? flightRef(a.return_flight) : null,
  seats: a.seats,
  deadline: a.deadline,
  uses_fare_quotas: a.uses_fare_quotas,
  is_waitlist: a.is_waitlist,
  cabins: Array.isArray(a.cabins) ? {} : (a.cabins ?? {}),
  usage: {
    used: a.usage?.used ?? 0,
    held: a.usage?.held ?? 0,
    available: a.usage?.remaining ?? a.seats,
  },
  chinggis: a.chinggis ?? { synced_at: null, error: null },
  created_at: a.created_at,
})

export const allocationService = {
  save: (payload: AllocationPayload, id?: number) => {
    const pool = payload.mode === 'pool'
    const body = {
      mode: payload.mode,
      agency_id: Number(payload.agency_id),
      outbound_flight_id: Number(payload.outbound_flight_id),
      return_flight_id: payload.return_flight_id ? Number(payload.return_flight_id) : null,
      seats: Number(payload.seats),
      deadline: payload.deadline,
      is_waitlist: payload.is_waitlist,
      // fare buckets are not edited here — the API keeps them when "fares" is left out;
      // a pool without cabins sells every cabin of the aircraft
      cabins: pool
        ? {}
        : {
            C: Number(payload.business_seats) || 0,
            Y: Math.max(0, Number(payload.seats) - (Number(payload.business_seats) || 0)),
          },
    }
    return action(
      id
        ? client.put<ApiData<ApiAllocation>>(`/admin/allocations/${id}`, body)
        : client.post<ApiData<ApiAllocation>>('/admin/allocations', body),
      toAllocation
    )
  },

  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/allocations/${id}`), () => null),

  /** Send the allocation to the Chinggis agent API now */
  pushToChinggis: (id: number) =>
    action(client.post<ApiData<ApiAllocation>>(`/admin/allocations/${id}/chinggis-push`), toAllocation),

  list: (params: ListParams = {}) =>
    getPage<ApiAllocation, Allocation>('/admin/allocations', pageQuery(params), toAllocation),
}

/** Flights for select fields (upcoming by default), value = flight id */
export const flightOptions = async (upcomingOnly = true) => {
  const today = new Date().toISOString().slice(0, 10)
  const res = await client.get<{ data: ApiFlight[] }>('/admin/flights', {
    from: upcomingOnly ? today : undefined,
    to: new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10),
    per_page: 500,
  })
  return res.data
    .filter((f) => !upcomingOnly || new Date(f.scheduled_departure_at) > new Date())
    .map((f) => ({
      label: `${f.flight_number} ${route(f)} · ${f.scheduled_departure_at.slice(0, 16).replace('T', ' ')}`,
      value: String(f.id),
    }))
}
