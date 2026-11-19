/*
| The printed manifest (same template as the DCS counter's "Manifest" print): ManifestService's document and the
| flight's seat map with occupants (/admin/flights/{id}/documents/manifest, …/documents/seat-map).
*/

export interface ApiManifest {
  header: {
    airline: string
    airline_logo: string | null
    flight_number: string
    registration: string | null
    aircraft_type: string | null
    origin: string
    destination: string
    std_date: string
    std_time: string
    etd_date: string | null
    etd_time: string | null
  }
  passengers: {
    rows: {
      segment_id: number
      first_name: string
      last_name: string
      gdr: string
      type: string
      nationality: string | null
      date_of_birth: string | null
      seat_number: string | null
      cabin_class: string
      ssr: string
      remark: string | null
      bag_pieces: number
      bag_weight_kg: number
      online_no_bags: boolean
    }[]
    totals: { ADT: number; CHD: number; INF: number; total: number }
  }
  baggage: {
    rows: {
      id: number
      segment_id: number | null
      passenger: string
      seat_number: string | null
      cabin_class: string | null
      checkin_group_id: number | null
      pieces: number
      weight_kg: number
      tags: string[]
      description: string | null
    }[]
    totals: { pieces: number; weight_kg: number }
  }
  balance: {
    rows: {
      zone: string | null
      total: number
      male_adults: number
      female_adults: number
      children: number
      infants: number
      bags: number
      kg: number
    }[]
    totals: { bags: number; kg: number }
  }
}

export interface ApiSeatMap {
  flight_id: number
  layout: { left: string[]; middle: string[]; right: string[] }
  rows: number[]
  seats: {
    seat_number: string
    row: number
    column: string
    cabin_class: string
    zone: string | null
    is_emergency_exit: boolean
    state: SeatState
    occupant?: { segment_id: number; name: string; status: string; has_infant?: boolean }
  }[]
}

export type SeatState = 'available' | 'occupied' | 'blocked' | 'restricted' | 'held'

export interface Seat {
  number: string
  row: number
  letter: string
  cabin_class: string
  state: SeatState
  zone: string | null
  is_exit: boolean
  segment_id: number | null
  occupant_name: string | null
  has_infant: boolean
  checked_in: boolean
}

/** 'aisle' = gangway, null = no seat at this position */
export type SeatCell = Seat | 'aisle' | null

export interface SeatMapRow {
  row: number
  cabin_class: string
  zone: string | null
  is_exit: boolean
  seats: SeatCell[]
}

export interface SeatMap {
  flight_id: number
  aircraft_type: string
  rows: SeatMapRow[]
}

/** Seat map rows with the aisles in place (same as the DCS counter) */
export function toSeatMap(api: ApiSeatMap, aircraftType: string): SeatMap {
  const sides = (['left', 'middle', 'right'] as const).filter((s) => api.layout[s].length)
  const bySeat = new Map(api.seats.map((s) => [s.seat_number, s]))

  const rows: SeatMapRow[] = api.rows.map((row) => {
    const cells: SeatCell[] = []
    sides.forEach((side, index) => {
      if (index > 0) cells.push('aisle')
      api.layout[side].forEach((letter) => {
        const s = bySeat.get(`${row}${letter}`)
        cells.push(
          s
            ? {
                number: s.seat_number,
                row,
                letter,
                cabin_class: s.cabin_class,
                state: s.state,
                zone: s.zone,
                is_exit: s.is_emergency_exit,
                segment_id: s.occupant?.segment_id ?? null,
                occupant_name: s.occupant?.name ?? null,
                has_infant: !!s.occupant?.has_infant,
                checked_in: !!s.occupant && ['checked_in', 'boarded', 'flown'].includes(s.occupant.status),
              }
            : null
        )
      })
    })
    const seats = cells.filter((c): c is Seat => c !== null && c !== 'aisle')
    return {
      row,
      cabin_class: seats[0]?.cabin_class ?? 'Y',
      zone: seats[0]?.zone ?? null,
      is_exit: seats.some((s) => s.is_exit),
      seats: cells,
    }
  })

  return { flight_id: api.flight_id, aircraft_type: aircraftType, rows }
}
