import { baggageRules, fares } from '../../mock/db'
import { createMockResource, nextId } from '../../mock/utils'
import type {
  BaggageRule,
  BaggageRulePayload,
  Fare,
  FareListParams,
  FarePayload,
} from '../../types/products/product.types'

// TODO(api): /api/v1/admin/fares, /admin/baggage-rules
const fareResource = createMockResource<Fare, FarePayload>(fares, {
  searchKeys: ['origin', 'destination', 'fare_class'],
  filters: {
    cabin_class: (row) => row.cabin_class,
    trip_type: (row) => row.trip_type,
    is_active: (row) => String(row.is_active),
  },
  build: (payload, existing) => ({
    currency: 'MNT',
    ...existing,
    ...payload,
    origin: payload.origin.toUpperCase(),
    destination: payload.destination.toUpperCase(),
    fare_class: payload.fare_class.toUpperCase(),
    base_amount: Number(payload.base_amount),
    tax_amount: Number(payload.tax_amount),
    total_amount: Number(payload.base_amount) + Number(payload.tax_amount),
    child_discount_percent: Number(payload.child_discount_percent),
    infant_discount_percent: Number(payload.infant_discount_percent),
    id: existing?.id ?? nextId(),
  }),
})

export const fareService = {
  ...fareResource,
  list: (params: FareListParams) => fareResource.list(params),
}

export const baggageRuleService = createMockResource<
  BaggageRule,
  BaggageRulePayload
>(baggageRules, {
  searchKeys: ['name', 'ssr_code'],
  filters: {
    type: (row) => row.type,
    cabin_class: (row) => row.cabin_class ?? 'ALL',
    is_active: (row) => String(row.is_active),
  },
  build: (payload, existing) => ({
    currency: 'MNT',
    ...existing,
    ...payload,
    ssr_code: payload.ssr_code ? payload.ssr_code.toUpperCase() : null,
    cabin_class: (payload.cabin_class === 'ALL'
      ? null
      : payload.cabin_class) as BaggageRule['cabin_class'],
    pieces: Number(payload.pieces),
    weight_kg: Number(payload.weight_kg),
    price: Number(payload.price),
    id: existing?.id ?? nextId(),
  }),
})
