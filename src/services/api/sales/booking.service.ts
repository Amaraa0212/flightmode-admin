import type {
  Booking,
  BookingListParams,
  CharterRequest,
  CharterRequestStatus,
  Passenger,
  Segment,
} from '../../types/sales/booking.types'
import type { ListParams } from '../../types/shared/common.types'
import { action, client, getPage, ok, pageQuery, type ApiData } from '../shared/client'

/*
| /admin/bookings (limited by the API to the user's airline / station) and /admin/charter-requests
*/

type ApiSegment = Omit<Segment, 'flight_number' | 'route' | 'departure_at'> & {
  flight?: {
    flight_number: string
    scheduled_departure_at: string
    origin?: { iata_code: string }
    destination?: { iata_code: string }
  }
  fare_amount: number | string
  tax_amount: number | string
  total_amount: number | string
}
type ApiPassenger = Omit<Passenger, 'segments'> & { segments?: ApiSegment[] }
// Booking has an index signature, so Omit would drop its keys — the API row is the Booking minus totals
type ApiBooking = Booking & { passengers?: ApiPassenger[] }

const toSegment = (s: ApiSegment): Segment => ({
  ...s,
  flight_number: s.flight?.flight_number ?? '',
  route: s.flight ? `${s.flight.origin?.iata_code ?? ''}-${s.flight.destination?.iata_code ?? ''}` : '',
  departure_at: s.flight?.scheduled_departure_at ?? '',
  fare_amount: Number(s.fare_amount),
  tax_amount: Number(s.tax_amount),
  total_amount: Number(s.total_amount),
})

const toBooking = (b: ApiBooking): Booking => {
  const passengers = ((b.passengers ?? []) as ApiPassenger[]).map((p) => ({ ...p, segments: (p.segments ?? []).map(toSegment) }))
  const segments = passengers.flatMap((p) => p.segments)
  return {
    ...(b as Booking),
    passengers,
    total_amount: segments.reduce((sum, s) => sum + s.total_amount, 0),
    currency: segments[0]?.currency ?? 'MNT',
  }
}

export const bookingService = {
  list: (params: BookingListParams = {}) => {
    const { status, source: _source, start_day: _from, end_day: _to, ...rest } = params
    return getPage<ApiBooking, Booking>(
      '/admin/bookings',
      pageQuery(rest, { status: Array.isArray(status) ? status[0] : status }),
      toBooking
    )
  },

  getById: async (id: number) => ok(toBooking((await client.get<ApiData<ApiBooking>>(`/admin/bookings/${id}`)).data)),

  /** Issue the tickets of a booking on hold, before its ticket time limit */
  issue: (id: number) =>
    action(client.post<ApiData<ApiBooking>>(`/admin/bookings/${id}/issue`), toBooking),

  /** Cancels every passenger of the booking (infants go with their adult) */
  cancel: async (id: number) => {
    const booking = (await client.get<ApiData<ApiBooking>>(`/admin/bookings/${id}`)).data
    for (const p of booking.passengers ?? []) {
      await client.delete(`/admin/passengers/${p.id}`)
    }
    return ok(toBooking((await client.get<ApiData<ApiBooking>>(`/admin/bookings/${id}`)).data), 'Booking cancelled')
  },
}

export const charterRequestService = {
  list: (params: ListParams = {}) =>
    getPage<CharterRequest, CharterRequest>('/admin/charter-requests', pageQuery(params), (r) => ({
      ...r,
      airlines: r.airlines ?? [],
    })),

  updateStatus: (id: number, status: CharterRequestStatus) =>
    action(client.patch<ApiData<CharterRequest>>(`/admin/charter-requests/${id}/status`, { status }), (r) => r),
}
