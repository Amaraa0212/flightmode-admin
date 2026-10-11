import type { CabinClass } from '../reference/reference.types'
import type { ListParams } from '../shared/common.types'

export type TripType = 'OW' | 'RT'

export interface Fare extends Record<string, unknown> {
  id: number
  origin: string
  destination: string
  trip_type: TripType
  cabin_class: CabinClass
  fare_class: string
  valid_from: string
  valid_to: string
  base_amount: number
  tax_amount: number
  total_amount: number
  child_discount_percent: number
  infant_discount_percent: number
  currency: string
  is_active: boolean
}

export interface FareListParams extends ListParams {
  cabin_class?: string | string[]
  trip_type?: string
}

export interface FarePayload {
  origin: string
  destination: string
  trip_type: TripType
  cabin_class: CabinClass
  fare_class: string
  valid_from: string
  valid_to: string
  base_amount: number
  tax_amount: number
  child_discount_percent: number
  infant_discount_percent: number
  is_active: boolean
}

export type BaggageRuleType = 'free' | 'prepaid' | 'excess'

export interface BaggageRulePayload {
  name: string
  type: BaggageRuleType
  ssr_code: string
  cabin_class: string
  pieces: number
  weight_kg: number
  price: number
  is_active: boolean
}

export interface BaggageRule extends Record<string, unknown> {
  id: number
  name: string
  type: BaggageRuleType
  ssr_code: string | null
  cabin_class: CabinClass | null
  pieces: number
  weight_kg: number
  price: number
  currency: string
  is_active: boolean
}

/** Legacy seat rule: paid seats */
export interface SeatPrice extends Record<string, unknown> {
  id: number
  name: string
  aircraft: string | null
  cabin_class: CabinClass
  seat_type: 'window' | 'aisle' | 'middle' | null
  rows: string
  zone: string | null
  position: number
  price: number
  currency: string
  is_active: boolean
}

export interface SeatPricePayload {
  name: string
  cabin_class: CabinClass
  seat_type: string
  rows: string
  zone: string
  position: number
  price: number
  is_active: boolean
}

export interface AirlineSsr extends Record<string, unknown> {
  id: number
  code: string
  name: string
  category: string
  price: number | null
  currency: string
}

export interface AirlineSsrPayload {
  code: string
  name: string
  category: string
  price: number
}

/** Legacy template: products applied to flights (bags, seats, OCI window) */
export interface ServiceTemplate extends Record<string, unknown> {
  id: number
  name: string
  airline: string
  baggage_rule_ids: number[]
  seat_price_ids: number[]
  oci_opens_minutes: number
  oci_closes_minutes: number
  seat_assignment_profile: string | null
}

export interface ServiceTemplatePayload {
  name: string
  baggage_rule_ids: string[]
  seat_price_ids: string[]
  oci_opens_minutes: number
  oci_closes_minutes: number
}

/** Legacy pag_tag_position: bag tag print layout */
export interface BagTagLayout extends Record<string, unknown> {
  id: number
  airline: string
  name: string
  positions: string[]
  created_at: string
}

/** Legacy shop: products per flight */
export interface FlightProducts extends Record<string, unknown> {
  flight_id: number
  flight_number: string
  departure_at: string
  route: string
  baggage_rules: string[]
  seat_prices: number
  seat_profile: string | null
  online_checkin: {
    enabled: boolean
    opens_minutes: number
    closes_minutes: number
  }
  blocked_seats: number
  template: string | null
}

/** Legacy airline_baggage: override baggage allowance (prepaid) */
export interface BaggageOverride extends Record<string, unknown> {
  id: number
  pnr: string
  passenger: string
  flight_number: string
  departure_at: string
  agency: string | null
  pieces: number
  weight_kg: number
}

export interface BaggageOverridePayload {
  pnr: string
  passenger: string
  flight_number: string
  pieces: number
  weight_kg: number
}
