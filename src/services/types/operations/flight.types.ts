import type { Airport } from '../reference/reference.types'
import type { ListParams } from '../shared/common.types'

export type FlightStatus =
  | 'scheduled'
  | 'checkin_open'
  | 'checkin_closed'
  | 'gate_closed'
  | 'departed'
  | 'cancelled'

export type FlightAirport = Pick<Airport, 'id' | 'iata_code' | 'name' | 'city'>

export interface Flight extends Record<string, unknown> {
  id: number
  flight_number: string
  airline: { id: number; name: string; iata_code: string }
  aircraft: {
    id: number
    registration: string
    type: string
    total_seats: number
  } | null
  flight_series_id: number | null
  /** scheduled (fares) | charter (free baggage at the counter) */
  service_type: 'scheduled' | 'charter'
  /** series flight changed by hand — saving the series again leaves it as it is */
  is_series_override?: boolean
  origin: FlightAirport
  destination: FlightAirport
  scheduled_departure_at: string
  scheduled_arrival_at: string
  estimated_departure_at: string | null
  terminal: string | null
  gate: string | null
  status: FlightStatus
  status_reason: string | null
  is_published: boolean
  online_checkin: {
    enabled: boolean
    opens_minutes: number
    closes_minutes: number
  }
  segments_count: number
}

export interface FlightListParams extends ListParams {
  status?: string | string[]
  source?: string | string[]
  service_type?: string | string[]
  date?: string
  start_day?: string
  end_day?: string
}

export interface FlightPayload {
  flight_number: string
  service_type: 'scheduled' | 'charter'
  origin_airport_id: string
  destination_airport_id: string
  aircraft_id: string
  scheduled_departure_at: string
  scheduled_arrival_at: string
  terminal?: string
  gate?: string
}

export interface FlightStatistics {
  capacity: number
  booked: number
  checked_in: number
  boarded: number
  infants: number
  by_cabin: { cabin_class: string; booked: number; capacity: number }[]
}

export interface FlightSeries extends Record<string, unknown> {
  id: number
  flight_number: string
  service_type: 'scheduled' | 'charter'
  /** IATA codes (display) */
  origin: string
  destination: string
  origin_airport_id?: number
  destination_airport_id?: number
  aircraft_id?: number | null
  /** aircraft id as a select value */
  aircraft: string
  /** seat allocation template id as a select value ('none' = no template) */
  inventory_template?: string
  departure_time: string
  arrival_time: string
  days_of_week: number[]
  valid_from: string
  valid_to: string
  flights_count: number
}

/** fixed = seats taken out of the flight for the agency; pool = the chosen agencies sell the flight's free seats together */
export type AllocationMode = 'fixed' | 'pool'

export interface Allocation extends Record<string, unknown> {
  id: number
  mode: AllocationMode
  agency: { id: number; name: string }
  outbound_flight: Pick<
    Flight,
    'id' | 'flight_number' | 'scheduled_departure_at'
  > & {
    route: string
  }
  return_flight:
    | (Pick<Flight, 'id' | 'flight_number' | 'scheduled_departure_at'> & {
        route: string
      })
    | null
  seats: number
  deadline: string
  uses_fare_quotas: boolean
  is_waitlist: boolean
  /** seats per cabin class, e.g. { Y: 18, C: 2 } */
  cabins: Record<string, number>
  /** available: seats the agency can still sell (pool: the shared room within its limit) */
  usage: { used: number; held: number; available: number }
  /** last push to the Chinggis agent API */
  chinggis: { synced_at: string | null; error: string | null }
  created_at: string
}

export interface FlightOperations {
  gate: string | null
  estimated_departure_at: string | null
  off_block_at: string | null
  takeoff_at: string | null
  estimated_arrival_at: string | null
  delay_reason: string | null
  gate_agents: { id: number; name: string }[]
  online_checkin_enabled: boolean
}

export type FlightAction =
  | 'open_checkin'
  | 'close_checkin'
  | 'close_gate'
  | 'depart'
  | 'cancel'
  | 'reopen'
