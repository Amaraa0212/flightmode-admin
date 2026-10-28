import type {
  CabinClass,
  Gender,
  PassengerType,
} from '../reference/reference.types'
import type { ListParams } from '../shared/common.types'

/** on_hold: seats kept without tickets until ticketing_deadline_at (fare class TL) */
export type BookingStatus = 'confirmed' | 'on_hold' | 'waitlisted' | 'cancelled'
export type BookingSource =
  'admin' | 'counter' | 'agency' | 'agency_api' | 'import'
export type SegmentStatus =
  'booked' | 'waitlisted' | 'checked_in' | 'boarded' | 'flown' | 'cancelled'

export interface Segment {
  id: number
  flight_id: number
  flight_number: string
  route: string
  departure_at: string
  cabin_class: CabinClass
  fare_class: string
  ticket_number: string
  fare_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  seat_number: string | null
  status: SegmentStatus
}

export interface Passenger {
  id: number
  type: PassengerType
  first_name: string
  last_name: string
  gender: Gender
  date_of_birth: string
  nationality: string
  document_number: string
  document_expires_at: string
  email: string | null
  phone: string | null
  segments: Segment[]
}

export interface Booking extends Record<string, unknown> {
  id: number
  pnr: string
  agency: { id: number; name: string } | null
  source: BookingSource
  status: BookingStatus
  /** on_hold: tickets must be issued before this, or the booking is cancelled */
  ticketing_deadline_at: string | null
  contact_email: string
  contact_phone: string
  passengers: Passenger[]
  total_amount: number
  currency: string
  created_by: { id: number; name: string } | null
  created_at: string
}

export interface BookingListParams extends ListParams {
  status?: string | string[]
  source?: string | string[]
  start_day?: string
  end_day?: string
}

export type CharterRequestStatus =
  'requested' | 'pending' | 'approved' | 'rejected'

export interface CharterRequest extends Record<string, unknown> {
  id: number
  requested_by: { id: number; name: string; email: string }
  origin: string
  destination: string
  departure_date: string
  return_date: string | null
  pax_count: number
  status: CharterRequestStatus
  notes: string | null
  airlines: { id: number; name: string }[]
  created_at: string
}

/** One passenger row of a flight (flight load, manifest, PAX search) */
export interface FlightPassengerRow extends Record<string, unknown> {
  id: number
  pnr: string
  last_name: string
  first_name: string
  type: string
  gender: string
  date_of_birth: string
  nationality: string
  document_number: string
  seat_number: string | null
  cabin_class: string
  status: string
  ssr_codes: string[]
  agency: string | null
  phone: string | null
  flight_id: number
  flight_number: string
  route: string
  departure_at: string
  bags: number
  bag_weight_kg: number
  zone: string | null
}
