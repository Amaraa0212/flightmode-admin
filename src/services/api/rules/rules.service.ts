import {
  airlines,
  airlineSsrs,
  bagTagLayouts,
  baggageOverrides,
  baggageRules,
  flightSeatBlocks,
  flights,
  seatPrices,
  serviceTemplates,
} from '../../mock/db'
import {
  createMockResource,
  fail,
  mockList,
  nextId,
  nowIso,
  ok,
} from '../../mock/utils'
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

// TODO(api): /admin/seat-prices, /admin/airline-ssrs, /admin/service-templates (+/apply), airline bag_tag_layout

export const seatPriceService = createMockResource<SeatPrice, SeatPricePayload>(
  seatPrices,
  {
    searchKeys: ['name', 'rows', 'zone'],
    filters: {
      cabin_class: (row) => row.cabin_class,
      is_active: (row) => String(row.is_active),
    },
    build: (payload, existing) => ({
      aircraft: null,
      currency: 'MNT',
      ...existing,
      ...payload,
      seat_type: (payload.seat_type || null) as SeatPrice['seat_type'],
      zone: payload.zone || null,
      price: Number(payload.price),
      position: Number(payload.position),
      id: existing?.id ?? nextId(),
    }),
  }
)

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

const templateResource = createMockResource<
  ServiceTemplate,
  ServiceTemplatePayload
>(serviceTemplates, {
  searchKeys: ['name', 'airline'],
  build: (payload, existing) => ({
    airline: airlines[0].name,
    seat_assignment_profile: null,
    ...existing,
    name: payload.name,
    baggage_rule_ids: payload.baggage_rule_ids.map(Number),
    seat_price_ids: payload.seat_price_ids.map(Number),
    oci_opens_minutes: Number(payload.oci_opens_minutes),
    oci_closes_minutes: Number(payload.oci_closes_minutes),
    id: existing?.id ?? nextId(),
  }),
})

/** Which products each flight uses (legacy "Shop items") */
const flightProductState = new Map<number, { template_id: number | null }>()

export const serviceTemplateService = {
  ...templateResource,
  /** POST /admin/service-templates/{id}/apply { flight_ids } */
  apply: async (templateId: number, flightIds: number[]) => {
    const template = serviceTemplates.find((t) => t.id === templateId)
    if (!template) return fail('Template not found')
    flightIds.forEach((id) => {
      flightProductState.set(id, { template_id: templateId })
      const flight = flights.find((f) => f.id === id)
      if (flight) {
        flight.online_checkin = {
          enabled: template.oci_opens_minutes > 0,
          opens_minutes: template.oci_opens_minutes,
          closes_minutes: template.oci_closes_minutes,
        }
      }
    })
    return ok(null, `Template applied to ${flightIds.length} flight(s)`)
  },
  options: () =>
    ok(serviceTemplates.map((t) => ({ label: t.name, value: String(t.id) }))),
}

export const flightProductService = {
  list: (params: ListParams) => {
    const rows: FlightProducts[] = flights
      .filter((f) => f.status !== 'departed' && f.status !== 'cancelled')
      .map((f) => {
        const templateId =
          flightProductState.get(f.id)?.template_id ??
          (f.flight_number.startsWith('MR') ? 2 : 1)
        const template = serviceTemplates.find((t) => t.id === templateId)
        return {
          flight_id: f.id,
          flight_number: f.flight_number,
          departure_at: f.scheduled_departure_at,
          route: `${f.origin.iata_code}-${f.destination.iata_code}`,
          baggage_rules: (template?.baggage_rule_ids ?? [])
            .map((id) => baggageRules.find((r) => r.id === id)?.name)
            .filter((n): n is string => !!n),
          seat_prices: template?.seat_price_ids.length ?? 0,
          seat_profile: template?.seat_assignment_profile ?? null,
          online_checkin: f.online_checkin,
          blocked_seats: flightSeatBlocks.get(f.id)?.size ?? 0,
          template: template?.name ?? null,
        }
      })
    return mockList(rows, params, {
      searchKeys: ['flight_number', 'route', 'template'],
    })
  },
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

export const baggageRuleOptions = () =>
  baggageRules.map((r) => ({ label: r.name, value: String(r.id) }))
export const seatPriceOptions = () =>
  seatPrices.map((p) => ({ label: p.name, value: String(p.id) }))
