import type { AllocationMode } from '../../types/operations/flight.types'
import { action, client, ok, type ApiData } from '../shared/client'

/** One agency on a flight (AllocationBoard::overview) */
export type BoardAllocation = {
  allocation_id: number
  agency: { id: number; name: string | null }
  mode: AllocationMode
  /** fixed: its seats; pool: a limit, 0 = none */
  seats: number
  cabins: Record<string, number>
  used: number
  held: number
  /** what the agency can still sell */
  remaining: number
  deadline: string
  /** deadline on the departure day: names close this many hours before check-in opens */
  deadline_hours: number | null
  /** when names close (deadline + hours, or check-in) */
  names_deadline_at: string
  is_waitlist: boolean
  /** sells at the fare settings prices instead of fare buckets */
  uses_published_fares: boolean
  /** unsold fixed seats given back at the names deadline (null = not released) */
  released_seats: number | null
  outbound_flight_id: number
  return_flight_id: number | null
}

export type FlightQuota = {
  flight: {
    id: number
    flight_number: string
    route: string
    scheduled_departure_at: string
    status: string
    service_type: 'scheduled' | 'charter'
    flight_series_id: number | null
  }
  capacity: number
  cabins: { cabin_class: string; seats: number; free: number }[]
  fixed_seats: number
  fixed_sold: number
  /** seats nobody has: not in a fixed allocation, not sold, not held by a pool agency */
  free: number
  given_percent: number
  allocations: BoardAllocation[]
}

export type DistributeRow = {
  allocation_id?: number
  agency_id: number
  mode: AllocationMode
  seats: number
  cabins?: Record<string, number>
  deadline?: string
  deadline_hours?: number | null
  uses_published_fares?: boolean
}

export type SeriesDistributeResult = {
  flights: number
  saved: number
  failed: {
    flight_id: number
    flight_number: string
    date: string
    message: string
  }[]
}

/** Quota per flight: by-flight view, handing out to several agencies at once, moving seats */
export const allocationBoardService = {
  board: async (from?: string, to?: string) =>
    ok(
      (
        await client.get<ApiData<FlightQuota[]>>('/admin/allocations-board', {
          from,
          to,
        })
      ).data
    ),

  overview: async (flightId: number) =>
    ok(
      (
        await client.get<ApiData<FlightQuota>>(
          `/admin/flights/${flightId}/allocations-overview`
        )
      ).data
    ),

  distribute: (
    flightId: number,
    rows: DistributeRow[],
    remove: number[],
    deadline?: string,
    /** same-day deadline: hours before check-in opens */
    deadlineHours?: number,
    /** the deadline replaces every agency's deadline (released seats come back when it moves later) */
    applyDeadlineToAll = false
  ) =>
    action(
      client.post<ApiData<FlightQuota>>(
        `/admin/flights/${flightId}/allocations/distribute`,
        {
          rows,
          remove,
          deadline,
          deadline_hours: deadlineHours ?? null,
          apply_deadline_to_all: applyDeadlineToAll,
        }
      ),
      (r) => r
    ),

  /** The same rows on every flight of a series between two dates (existing agency allocations are updated) */
  distributeSeries: (
    seriesId: number,
    body: {
      date_from: string
      date_to: string
      deadline_days_before: number
      deadline_hours?: number
      rows: Omit<
        DistributeRow,
        'allocation_id' | 'deadline' | 'deadline_hours'
      >[]
    }
  ) =>
    action(
      client.post<ApiData<SeriesDistributeResult>>(
        `/admin/flight-series/${seriesId}/allocations/distribute`,
        body
      ),
      (r) => r
    ),

  move: (body: {
    from_allocation_id: number
    to_allocation_id: number
    cabin_class: string
    seats: number
  }) =>
    action(
      client.post<ApiData<FlightQuota>>('/admin/allocations/move', body),
      (r) => r
    ),
}
