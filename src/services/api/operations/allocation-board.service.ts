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
  is_waitlist: boolean
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
    deadline?: string
  ) =>
    action(
      client.post<ApiData<FlightQuota>>(
        `/admin/flights/${flightId}/allocations/distribute`,
        {
          rows,
          remove,
          deadline,
        }
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
