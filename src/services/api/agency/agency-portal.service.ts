import type { ListParams } from '../../types/shared/common.types'
import { client, ok, type ApiData } from '../shared/client'

/*
| Agency portal (/agency/*): an agency user sees only their own agency's seat quotas and passengers.
*/

type ApiFlight = {
  flight_number: string
  scheduled_departure_at: string
  origin?: { iata_code: string }
  destination?: { iata_code: string }
}

type ApiQuota = {
  id: number
  airline?: { id: number; name: string } | null
  airline_id: number
  outbound_flight: ApiFlight
  return_flight: ApiFlight | null
  seats: number
  deadline: string
  is_waitlist: boolean
  cabins?: Record<string, number>
  usage?: { used: number; remaining: number; is_open_for_names: boolean; names_deadline_at: string }
}

export interface AgencyQuota extends Record<string, unknown> {
  id: number
  airline: string
  flight_number: string
  route: string
  departure_at: string
  return_flight: string | null
  seats: number
  used: number
  remaining: number
  cabins: string
  /** cabin classes of the quota (Y, C …) */
  cabin_classes: string[]
  names_deadline_at: string | null
  is_open_for_names: boolean
}

export interface AgencyPassenger {
  id: number
  pnr: string
  name: string
  type: string
  document_number: string | null
  phone: string | null
  ticket_number: string | null
  seat_number: string | null
  status: string
}

const route = (f: ApiFlight | null) =>
  f ? `${f.origin?.iata_code ?? ''}-${f.destination?.iata_code ?? ''}` : ''

const toQuota = (a: ApiQuota): AgencyQuota => ({
  id: a.id,
  airline: a.airline?.name ?? '',
  flight_number: a.outbound_flight.flight_number,
  route: route(a.outbound_flight),
  departure_at: a.outbound_flight.scheduled_departure_at,
  return_flight: a.return_flight ? `${a.return_flight.flight_number} ${route(a.return_flight)}` : null,
  seats: a.seats,
  used: a.usage?.used ?? 0,
  remaining: a.usage?.remaining ?? a.seats,
  cabins: Object.entries(a.cabins ?? {})
    .map(([cabin, seats]) => `${cabin} ${seats}`)
    .join(' · '),
  cabin_classes: Object.entries(a.cabins ?? {})
    .filter(([, seats]) => seats > 0)
    .map(([cabin]) => cabin),
  names_deadline_at: a.usage?.names_deadline_at ?? null,
  is_open_for_names: a.usage?.is_open_for_names ?? false,
})

/** One passenger of a new agency booking (PassengerFields on the API) */
export interface AgencyBookingPassenger {
  last_name: string
  first_name: string
  gender: 'M' | 'F'
  date_of_birth: string
  nationality: string
  document_number: string
  document_expires_at: string
  phone: string
  email: string
  cabin_class: string
}

const upper = (v: string) => v.trim().toUpperCase()
const orNull = (v: string) => (v.trim() ? v.trim() : null)

export const agencyPortalService = {
  /** status: '' (upcoming) | 'past' (last 3 months) */
  quotas: async (params: ListParams & { status?: string | string[] } = {}) => {
    const status = Array.isArray(params.status) ? params.status[0] : params.status
    const res = await client.get<{ data: ApiQuota[]; meta?: { total: number } }>('/agency/allocations', {
      status: status || undefined,
      page: params.current ?? 1,
      per_page: params.pageSize ?? 20,
    })
    const q = String(params.query ?? '').trim().toLowerCase()
    const items = res.data
      .map(toQuota)
      .filter((r) => !q || `${r.flight_number} ${r.route}`.toLowerCase().includes(q))
    return ok({ total: q ? items.length : (res.meta?.total ?? items.length), items })
  },

  /** POST /agency/bookings — one PNR for the passengers, on the quota's flight */
  book: async (quotaId: number, passengers: AgencyBookingPassenger[], contact: { phone: string; email: string }) => {
    const res = await client.post<{ message: string; data: { pnr: string } }>('/agency/bookings', {
      allocation_id: quotaId,
      contact_phone: orNull(contact.phone),
      contact_email: orNull(contact.email),
      passengers: passengers.map((p) => ({
        last_name: upper(p.last_name),
        first_name: upper(p.first_name),
        gender: p.gender,
        date_of_birth: orNull(p.date_of_birth),
        nationality: upper(p.nationality) || null,
        document_type: p.document_number.trim() ? 'passport' : null,
        document_number: p.document_number.trim() ? upper(p.document_number) : null,
        document_expires_at: orNull(p.document_expires_at),
        phone: orNull(p.phone),
        email: orNull(p.email),
        cabin_class: p.cabin_class,
      })),
    })
    return ok(res.data, `${res.message} PNR ${res.data.pnr}`)
  },

  /** A passenger this agency booked before, by passport number (to fill the form) — null when unknown */
  lookup: async (documentNumber: string) => {
    const res = await client.get<
      ApiData<{
        first_name: string
        last_name: string
        gender: 'M' | 'F' | null
        date_of_birth: string | null
        nationality: string | null
        document_number: string | null
        document_expires_at: string | null
        phone: string | null
        email: string | null
      } | null>
    >('/agency/passenger-lookup', { document_number: documentNumber.trim().toUpperCase() })
    return res.data
  },

  /** Passengers booked on a quota (infants travel with their adult) */
  passengers: async (quotaId: number) => {
    const res = await client.get<
      ApiData<
        {
          id: number
          pnr?: string
          type: string
          first_name: string
          last_name: string
          document_number: string | null
          phone: string | null
          segments?: { ticket_number: string | null; seat_number: string | null; status: string }[]
        }[]
      >
    >(`/agency/allocations/${quotaId}/passengers`)
    return ok(
      res.data.map(
        (p): AgencyPassenger => ({
          id: p.id,
          pnr: p.pnr ?? '',
          name: `${p.last_name}/${p.first_name}`,
          type: p.type,
          document_number: p.document_number,
          phone: p.phone,
          ticket_number: p.segments?.[0]?.ticket_number ?? null,
          seat_number: p.segments?.[0]?.seat_number ?? null,
          status: p.segments?.[0]?.status ?? '',
        })
      )
    )
  },
}
