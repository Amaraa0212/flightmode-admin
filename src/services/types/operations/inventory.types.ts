import type { CabinCode } from '../products/fare-setting.types'
import type { Flight } from './flight.types'

/** Flight as FlightResource returns it, with local times */
export interface LocalFlight extends Flight {
  departure_local: string | null
  scheduled_departure_local: string | null
  scheduled_arrival_local: string | null
}

/** /admin/inventory/flights row: a flight with its seat inventory totals */
export interface InventoryFlight extends LocalFlight {
  inventory: {
    /** false: no cabin rows yet, the flight sells without class limits */
    is_controlled: boolean
    /** aircraft total seats */
    capacity: number
    /** cabin seats set on the flight (null when not controlled) */
    allocated: number | null
    sold: number
  }
}

export interface InventoryCabin {
  cabin_class: CabinCode
  aircraft_seats: number
  is_set: boolean
  seats: number | null
  oversell: number
  curtail: number
  sold: number
  infants: number
  /** agency allocation seats not sold yet (held back from direct sale) */
  agency_unsold: number
  /** seats still free to give to agency allocations in this cabin */
  free_for_allocation: number
  available: number
}

export interface InventoryAgency {
  allocation_id: number
  agency_id: number
  agency: string | null
  cabin_class: CabinCode
  seats: number
  sold: number
  available: number
  is_waitlist: boolean
  /** whole allocation (all cabins) */
  allocation_seats: number
  outbound_flight_id: number
  return_flight_id: number | null
  deadline: string | null
  uses_fare_quotas: boolean
}

/** POST / PUT /admin/allocations from the seat allocation screen */
export interface AllocationCabinPayload {
  agency_id: number
  outbound_flight_id: number
  return_flight_id: number | null
  deadline: string
  is_waitlist: boolean
  /** seats per cabin, e.g. { C: 2, Y: 18 } */
  cabins: Partial<Record<CabinCode, number>>
}

export interface InventoryRbd {
  rbd_id: number
  code: string
  cabin_class: CabinCode
  rank: number
  parent_id: number | null
  parent_code: string | null
  /** depth in the nesting tree, 0 = root of the cabin */
  level: number
  is_active: boolean
  /** has a limit on this flight */
  is_set: boolean
  /** nested limit: this class and every class below it together */
  seats: number | null
  is_closed: boolean
  sold: number
  subtree_sold: number
  available: number
}

/** GET /admin/flights/{flight}/inventory */
export interface FlightInventory {
  flight: LocalFlight
  is_controlled: boolean
  cabins: InventoryCabin[]
  agencies: InventoryAgency[]
  rbds: InventoryRbd[]
  warnings: string[]
}

export interface CabinLimitPayload {
  cabin_class: CabinCode
  seats: number
  oversell?: number
  curtail?: number
}

export interface RbdLimitPayload {
  rbd_id: number
  seats: number
  is_closed?: boolean
}

export interface InventoryApplyResult {
  flight_id: number
  flight_number: string
  departure_local: string
  status: 'applied' | 'skipped'
  reason: string | null
}

export interface RollForwardPayload {
  date_to: string
  /** ISO weekdays 1 (Mon) – 7 (Sun); empty = every day */
  days_of_week?: number[]
  overwrite?: boolean
}

export interface InventoryTemplate extends Record<string, unknown> {
  id: number
  airline_id: number
  aircraft_id: number | null
  aircraft: { id: number; registration: string; type: string } | null
  name: string
  description: string | null
  cabins: Array<{
    cabin_class: CabinCode
    seats: number
    oversell: number
    curtail: number
  }>
  rbds: Array<{
    rbd_id: number
    code: string | null
    cabin_class: CabinCode | null
    seats: number
    is_closed: boolean
  }>
  created_by: string | null
  created_at: string | null
}

export interface InventoryTemplatePayload {
  name?: string
  description?: string | null
  aircraft_id?: number | null
  cabins?: CabinLimitPayload[]
  rbds?: RbdLimitPayload[]
}
