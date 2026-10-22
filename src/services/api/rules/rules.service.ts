import {
  airlines,
  airlineSsrs,
  bagTagLayouts,
  baggageOverrides,
  flights,
} from '../../mock/db'
import { createMockResource, nextId, nowIso } from '../../mock/utils'
import type {
  AirlineSsr,
  AirlineSsrPayload,
  BagTagLayout,
  BaggageOverride,
  BaggageOverridePayload,
  FlightProducts,
  SeatPrice,
  SeatPricePayload,
  ServiceTemplate,
  ServiceTemplatePayload,
} from '../../types/products/product.types'
import type { ListParams } from '../../types/shared/common.types'
import {
  action,
  client,
  getPage,
  ok,
  pageQuery,
  period,
  type ApiAction,
  type ApiData,
} from '../shared/client'

// TODO(api): /admin/airline-ssrs, airline bag_tag_layout

const first = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[]

/** Short per-airline lists: search / filters / paging run here */
const localPage = <T>(rows: T[], params: ListParams) => {
  const size = params.pageSize ?? 20
  const page = params.current ?? 1
  return ok({ total: rows.length, items: rows.slice((page - 1) * size, page * size) })
}

/** Decimals arrive as strings ("45000.00") */
const toSeatPrice = (p: SeatPrice): SeatPrice => ({ ...p, price: Number(p.price) })

const seatPriceBody = (p: SeatPricePayload) => ({
  name: p.name.trim(),
  cabin_class: p.cabin_class,
  seat_type: p.seat_type || null,
  rows: p.rows.replace(/\s+/g, '') || null,
  position: Number(p.position),
  price: Number(p.price),
  is_active: p.is_active,
})

const loadSeatPrices = async () =>
  (await client.get<ApiData<SeatPrice[]>>('/admin/seat-prices', { per_page: 500 })).data.map(toSeatPrice)

/** /admin/seat-prices — legacy seat_rule; the lowest position matches first */
export const seatPriceService = {
  list: async (params: ListParams = {}) => {
    const q = String(params.query ?? '').trim().toLowerCase()
    const cabins = first(params.cabin_class)
    const active = first(params.is_active)
    const rows = (await loadSeatPrices())
      .filter(
        (r) =>
          (!q || `${r.name} ${r.rows ?? ''}`.toLowerCase().includes(q)) &&
          (!cabins.length || cabins.includes(r.cabin_class)) &&
          (!active.length || active.includes(String(r.is_active)))
      )
      .sort((a, b) => a.position - b.position || a.id - b.id)
    return localPage(rows, params)
  },
  create: (payload: SeatPricePayload) =>
    action(client.post<ApiData<SeatPrice>>('/admin/seat-prices', seatPriceBody(payload)), toSeatPrice),
  update: (id: number, payload: SeatPricePayload) =>
    action(client.put<ApiData<SeatPrice>>(`/admin/seat-prices/${id}`, seatPriceBody(payload)), toSeatPrice),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/seat-prices/${id}`), () => null),
}

export const airlineSsrService = createMockResource<
  AirlineSsr,
  AirlineSsrPayload
>(airlineSsrs, {
  searchKeys: ['code', 'name', 'category'],
  filters: { category: (row) => row.category },
  build: (payload, existing) => ({
    currency: 'MNT',
    ...existing,
    ...payload,
    code: payload.code.toUpperCase(),
    price: payload.price ? Number(payload.price) : null,
    id: existing?.id ?? nextId(),
  }),
})

const templateBody = (p: ServiceTemplatePayload) => ({
  name: p.name.trim(),
  aircraft_id: p.aircraft_id ? Number(p.aircraft_id) : null,
  seat_assignment_profile_id:
    p.aircraft_id && p.seat_assignment_profile_id ? Number(p.seat_assignment_profile_id) : null,
  checkin_opens_minutes: Number(p.checkin_opens_minutes),
  checkin_closes_minutes: Number(p.checkin_closes_minutes),
  baggage_rule_ids: p.baggage_rule_ids.map(Number),
  seat_price_ids: p.seat_price_ids.map(Number),
})

const loadTemplates = async () =>
  (await client.get<ApiData<ServiceTemplate[]>>('/admin/service-templates', { per_page: 500 })).data

/** /admin/service-templates — online check-in window, seat profile, baggage & seat rules applied to flights */
export const serviceTemplateService = {
  list: async (params: ListParams = {}) => {
    const q = String(params.query ?? '').trim().toLowerCase()
    const rows = (await loadTemplates()).filter(
      (t) => !q || `${t.name} ${t.aircraft ?? ''}`.toLowerCase().includes(q)
    )
    return localPage(rows, params)
  },
  create: (payload: ServiceTemplatePayload) =>
    action(client.post<ApiData<ServiceTemplate>>('/admin/service-templates', templateBody(payload)), (t) => t),
  update: (id: number, payload: ServiceTemplatePayload) =>
    action(client.put<ApiData<ServiceTemplate>>(`/admin/service-templates/${id}`, templateBody(payload)), (t) => t),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/service-templates/${id}`), () => null),
  /** A template for one aircraft is refused for flights on another aircraft */
  apply: async (templateId: number, flightIds: number[]) => {
    const res = await client.post<ApiAction<null>>(`/admin/service-templates/${templateId}/apply`, {
      flight_ids: flightIds,
    })
    return ok(null, res.message)
  },
  options: async () =>
    ok(
      (await loadTemplates()).map((t) => ({
        label: t.aircraft ? `${t.name} · ${t.aircraft}` : t.name,
        value: String(t.id),
      }))
    ),
}

type ApiFlightProducts = {
  id: number
  flight_number: string
  scheduled_departure_at: string
  origin: { iata_code: string }
  destination: { iata_code: string }
  online_checkin: {
    enabled: boolean
    opens_minutes: number | null
    closes_minutes: number | null
    baggage_rules?: string[]
    seat_prices_count?: number
    seat_assignment_profile?: string | null
  }
  blocked_seats_count?: number
}

const toFlightProducts = (f: ApiFlightProducts): FlightProducts => ({
  flight_id: f.id,
  flight_number: f.flight_number,
  departure_at: f.scheduled_departure_at,
  route: `${f.origin.iata_code}-${f.destination.iata_code}`,
  baggage_rules: f.online_checkin.baggage_rules ?? [],
  seat_prices: f.online_checkin.seat_prices_count ?? 0,
  seat_profile: f.online_checkin.seat_assignment_profile ?? null,
  online_checkin: {
    enabled: f.online_checkin.enabled,
    opens_minutes: f.online_checkin.opens_minutes ?? 0,
    closes_minutes: f.online_checkin.closes_minutes ?? 0,
  },
  blocked_seats: f.blocked_seats_count ?? 0,
})

const isoDate = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

/** Products each flight uses (legacy "Shop items"): /admin/flights?with_products — upcoming, not departed / cancelled */
export const flightProductService = {
  list: (params: ListParams = {}) => {
    const { from, to } = period(params)
    return getPage<ApiFlightProducts, FlightProducts>(
      '/admin/flights',
      pageQuery(params, {
        from: from ?? isoDate(0),
        to: to ?? isoDate(60),
        open: 1,
        with_products: 1,
      }),
      toFlightProducts
    )
  },

  /** What one flight uses now (ids for the edit dialog) — GET /admin/flights/{id} loads rules and seat prices */
  get: async (flightId: number) => {
    const f = (
      await client.get<
        ApiData<{
          aircraft: { id: number } | null
          online_checkin: {
            baggage_rule_ids?: number[]
            seat_price_ids?: number[]
            seat_assignment_profile_id: number | null
          }
        }>
      >(`/admin/flights/${flightId}`)
    ).data
    return ok({
      aircraft_id: f.aircraft?.id ?? null,
      baggage_rule_ids: f.online_checkin.baggage_rule_ids ?? [],
      seat_price_ids: f.online_checkin.seat_price_ids ?? [],
      seat_assignment_profile_id: f.online_checkin.seat_assignment_profile_id,
    })
  },

  /** Shop items of one flight — PUT /admin/flights/{id}/products */
  save: (
    flightId: number,
    payload: {
      baggage_rule_ids: number[]
      seat_price_ids: number[]
      seat_assignment_profile_id: number | null
    }
  ) =>
    action(
      client.put<ApiAction<unknown>>(
        `/admin/flights/${flightId}/products`,
        payload
      ),
      () => null
    ),
}

export const bagTagLayoutService = createMockResource<
  BagTagLayout,
  { name: string; positions: string[] }
>(bagTagLayouts, {
  searchKeys: ['name', 'airline'],
  build: (payload, existing) => ({
    airline: airlines[0].name,
    created_at: nowIso(),
    ...existing,
    name: payload.name,
    positions: payload.positions,
    id: existing?.id ?? nextId(),
  }),
})

export const baggageOverrideService = createMockResource<
  BaggageOverride,
  BaggageOverridePayload
>(baggageOverrides, {
  searchKeys: ['pnr', 'passenger', 'flight_number', 'agency'],
  build: (payload, existing) => ({
    agency: null,
    departure_at:
      flights.find(
        (f) => f.flight_number === payload.flight_number.toUpperCase()
      )?.scheduled_departure_at ?? nowIso(),
    ...existing,
    pnr: payload.pnr.toUpperCase(),
    passenger: payload.passenger.toUpperCase(),
    flight_number: payload.flight_number.toUpperCase(),
    pieces: Number(payload.pieces),
    weight_kg: Number(payload.weight_kg),
    id: existing?.id ?? nextId(),
  }),
})

/** Active baggage rules for select fields (/admin/baggage-rules) */
export const baggageRuleOptions = async () => {
  const res = await client.get<ApiData<{ id: number; name: string; is_active: boolean }[]>>(
    '/admin/baggage-rules',
    { per_page: 500 }
  )
  return res.data
    .filter((r) => r.is_active)
    .map((r) => ({ label: r.name, value: String(r.id) }))
}
/** Active seat rules for select fields (/admin/seat-prices) */
export const seatPriceOptions = async () =>
  (await loadSeatPrices())
    .filter((p) => p.is_active)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ label: p.name, value: String(p.id) }))
