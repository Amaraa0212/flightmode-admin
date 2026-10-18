import type { CabinClass } from '../reference/reference.types'
import type { ListParams } from '../shared/common.types'

export type TripType = 'OW' | 'RT'

export interface Fare extends Record<string, unknown> {
  id: number
  origin: string
  destination: string
  origin_airport_id: number
  destination_airport_id: number
  /** set when the fare is priced from a fare class (Fare classes screen) */
  fare_class_id: number | null
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
  trip_type?: string | string[]
}

export interface FarePayload {
  origin_airport_id: string
  destination_airport_id: string
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

/**
 * How a rule limits bags (API `type`): piece = max pieces (max_quantity), each with weight_kg free;
 * weight = all kg is excess; combined = max pieces and one shared free kg pool (weight_kg × pieces).
 */
export type BaggageRuleType = 'piece' | 'weight' | 'combined'

/** What the bag is for at the counter, from the SSR code: XBAG prepaid, EBAG excess, otherwise free */
export type BaggageUsage = 'free' | 'prepaid' | 'excess'

export interface BaggageRulePayload {
  name: string
  type: BaggageRuleType
  ssr_code: string
  cabin_class: string
  pieces: number
  weight_kg: number
  max_quantity: number
  price: number
  is_active: boolean
}

export interface BaggageRule extends Record<string, unknown> {
  id: number
  name: string
  type: BaggageRuleType
  usage: BaggageUsage
  ssr_code: string | null
  cabin_class: CabinClass | null
  pieces: number
  weight_kg: number
  /** max pieces per passenger, null = unlimited */
  max_quantity: number | null
  price: number
  currency: string
  is_active: boolean
}

/** Legacy seat rule: paid seats */
/** Legacy seat_rule: the first matching rule (lowest position, then the most specific) prices a seat */
export interface SeatPrice extends Record<string, unknown> {
  id: number
  name: string
  cabin_class: CabinClass
  seat_type: 'window' | 'aisle' | 'middle' | null
  /** "14-15" or "1-3,12"; null = all rows */
  rows: string | null
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
  /** null = any aircraft of the airline (then no seat assignment profile) */
  aircraft_id: number | null
  aircraft: string | null
  seat_assignment_profile_id: number | null
  seat_assignment_profile: string | null
  baggage_rule_ids: number[]
  seat_price_ids: number[]
  checkin_opens_minutes: number
  checkin_closes_minutes: number
}

export interface ServiceTemplatePayload {
  name: string
  /** '' = any aircraft */
  aircraft_id: string
  seat_assignment_profile_id: string
  baggage_rule_ids: string[]
  seat_price_ids: string[]
  checkin_opens_minutes: number
  checkin_closes_minutes: number
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
