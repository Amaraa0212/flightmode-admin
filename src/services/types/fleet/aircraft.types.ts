import type { CabinClass } from '../reference/reference.types'
import type { ListParams } from '../shared/common.types'

export interface Aircraft extends Record<string, unknown> {
  id: number
  airline: { id: number; name: string }
  registration: string
  type: string
  seat_configuration: string
  total_seats: number
  max_infants: number
  is_active: boolean
  cabins: Partial<Record<CabinClass, number>>
}

export interface AircraftListParams extends ListParams {
  is_active?: string
}

export interface AircraftPayload {
  registration: string
  type: string
  /** e.g. C12Y150 / W16Y120 — gives the cabins and the total seats */
  seat_configuration: string
  max_infants: number
  is_active: boolean
}

/** Seat map block (legacy seatmap: Row Start | Row End | Left | Mid | Right) */
export interface SeatBlock extends Record<string, unknown> {
  id: number
  aircraft_id: number
  row_from: number
  row_to: number
  cabin_class: CabinClass
  left: string
  middle: string
  right: string
  zone: string
  exit_rows: number[]
}

export interface SeatBlockPayload {
  row_from: number
  row_to: number
  cabin_class: CabinClass
  left: string
  middle: string
  right: string
  zone: string
  exit_rows: string
}

export type SeatCellState = 'available' | 'occupied' | 'blocked'

export interface SeatCell {
  number: string
  row: number
  letter: string
  side: 'left' | 'middle' | 'right'
  cabin_class: CabinClass
  zone: string
  is_exit: boolean
  state: SeatCellState
  occupant?: string | null
}

export interface SeatMapLayout {
  aircraft_id: number
  registration: string
  type: string
  /** every seat letter of each side — a row without a letter shows a gap there, so cabins stay aligned */
  columns: { left: string[]; middle: string[]; right: string[] }
  rows: {
    row: number
    cabin_class: CabinClass
    zone: string
    is_exit: boolean
    seats: SeatCell[]
  }[]
}

/** Check-in hierarchy — load zones (legacy airplane_rule: PAX Seq Min / Max / Zone) */
export interface LoadZone extends Record<string, unknown> {
  id: number
  aircraft_id: number
  zone: string
  pax_from: number
  pax_to: number
}

export interface LoadZonePayload {
  aircraft_id: string
  zone: string
  pax_from: number
  pax_to: number
}

/** Legacy seat_zone: auto-seat zone priority */
export interface SeatAssignmentProfile extends Record<string, unknown> {
  id: number
  aircraft_id: number
  name: string
  /** zones in fill order */
  zones: string[]
}

export interface SeatAssignmentProfilePayload {
  aircraft_id: string
  name: string
  zones: string
}
