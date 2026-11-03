import type { ListParams } from '../shared/common.types'
import type { TripType } from './product.types'

export type CabinCode = 'F' | 'C' | 'W' | 'Y'
export type PaxType = 'ADT' | 'CHD' | 'INF'

/** /admin/fare-families — brand booking classes are sold under */
export interface FareFamily extends Record<string, unknown> {
  id: number
  code: string
  name: string
  description: string | null
  rank: number
  is_active: boolean
  created_by: string | null
  /** booking class codes of the family */
  rbds?: string[]
  rbds_count?: number
}

export interface FareFamilyPayload {
  code: string
  name: string
  description: string
  rank: number
  is_active: boolean
}

/** /admin/rbds — booking class letter inside a cabin */
export interface Rbd extends Record<string, unknown> {
  id: number
  airline_id: number
  code: string
  cabin_class: CabinCode
  rank: number
  parent_id: number | null
  parent_code: string | null
  fare_family_id: number | null
  fare_family_code: string | null
  fare_family_name: string | null
  /** sold only this many days or more before departure (null = any time) */
  advance_booking_days: number | null
  is_upgrade: boolean
  description: string | null
  is_active: boolean
  created_by: string | null
  fare_classes_count?: number
  children_count?: number
}

export interface RbdPayload {
  /** system administrators: the airline it is created for */
  airline_id?: number
  code: string
  cabin_class: CabinCode
  rank: number
  parent_id: number | null
  fare_family_id: number | null
  advance_booking_days: number | null
  is_upgrade: boolean
  description: string
  is_active: boolean
}

export interface FareDiscount extends Record<string, unknown> {
  id: number
  fare_class_id: number
  passenger_type: PaxType
  age_from: number | null
  age_to: number | null
  percentage: number
}

export interface FareDiscountPayload {
  passenger_type: PaxType
  age_from: number | null
  age_to: number | null
  percentage: number
}

/** /admin/fare-classes */
export interface FareClass extends Record<string, unknown> {
  id: number
  rbd_id: number
  rbd_code: string
  cabin_class: CabinCode
  booking_code: string
  description: string | null
  status: 'HK' | 'SA'
  waitlist: boolean
  is_visible: boolean
  trip_type: 'OW' | 'RT'
  /** stay in days between departure and return (null = no limit) */
  min_stay_days: number | null
  max_stay_days: number | null
  rule: string | null
  is_group: boolean
  group_min: number | null
  group_max: number | null
  /** TL: tickets due this many hours after booking (null = no hold) */
  ticket_time_limit_hours: number | null
  /** TL: and at the latest this many hours before departure */
  ticket_time_limit_before_departure_hours: number | null
  is_active: boolean
  discounts: FareDiscount[]
  fares_count?: number
}

export interface FareClassPayload {
  /** system administrators: the airline it is created for */
  airline_id?: number
  rbd_id: number
  booking_code: string
  description: string
  status: 'HK' | 'SA'
  waitlist: boolean
  is_visible: boolean
  trip_type: 'OW' | 'RT'
  min_stay_days: number | null
  max_stay_days: number | null
  rule: string
  is_group: boolean
  group_min: number | null
  group_max: number | null
  ticket_time_limit_hours: number | null
  ticket_time_limit_before_departure_hours: number | null
  is_active: boolean
}

/** /admin/fare-combinations — two fare bases that may be sold together */
export interface FareCombinationBase {
  id: number
  booking_code: string
  rbd_code: string | null
  trip_type: 'OW' | 'RT'
}

export interface FareCombination extends Record<string, unknown> {
  id: number
  fare_class_id: number
  combinable_fare_class_id: number
  fare_class: FareCombinationBase
  combinable_fare_class: FareCombinationBase
  created_by: string | null
  created_at: string
}

export interface FareCombinationPayload {
  fare_class_id: number
  combinable_fare_class_ids: number[]
}

/** /admin/fares linked to a fare class */
export interface FareEntry extends Record<string, unknown> {
  id: number
  fare_class_id: number | null
  booking_code: string | null
  origin: string
  destination: string
  origin_airport_id: number
  destination_airport_id: number
  cabin_class: CabinCode
  fare_class: string
  trip_type: 'OW' | 'RT'
  valid_from: string
  valid_to: string
  base_amount: string
  tax_amount: string
  total_amount: string
  currency: string
  is_active: boolean
}

export interface FareEntryPayload {
  fare_class_id: number
  origin_airport_id: number
  destination_airport_id: number
  base_amount: number
  currency: string
  valid_from: string
  valid_to: string
  is_active: boolean
}

export interface FareEntryListParams extends ListParams {
  origin_airport_id?: number
  destination_airport_id?: number
}

/** /admin/tax-codes */
export interface TaxCode extends Record<string, unknown> {
  id: number
  code: string
  name: string | null
  is_active: boolean
}

export interface TaxCodePayload {
  code: string
  name: string
  is_active: boolean
}

/** /admin/fare-taxes — departure airport default per trip type (fare_id null) or a fare override */
export interface FareTax extends Record<string, unknown> {
  id: number
  tax_code_id: number
  tax_code: string
  airport_id: number | null
  airport: string | null
  /** charged on fares of this trip type departing the airport; an override has its fare's */
  trip_type: TripType
  fare_id: number | null
  passenger_type: PaxType
  amount: string
  currency: string
  refundable: boolean
}

export interface FareTaxPayload {
  tax_code_id: number
  airport_id: number | null
  fare_id: number | null
  trip_type: TripType
  passenger_type: PaxType
  amount: number
  currency: string
  refundable: boolean
}

/** /admin/rbd-modifications — change / refund penalties per RBD */
export interface RbdModification extends Record<string, unknown> {
  id: number
  rbd_id: number
  rbd_code: string
  cabin_class: CabinCode
  type: string
  timeframe_hours: number
  amount: string | null
  currency: string | null
  percentage: number | null
  is_allowed: boolean
}

export interface RbdModificationPayload {
  rbd_id: number
  type: string
  timeframe_hours: number
  amount: number | null
  currency: string | null
  percentage: number | null
  is_allowed: boolean
}
