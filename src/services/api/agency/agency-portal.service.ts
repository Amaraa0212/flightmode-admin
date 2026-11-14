import type { SeatMapLayout } from '../../types/fleet/aircraft.types'
import type { ListParams } from '../../types/shared/common.types'
import { toLayout } from '../fleet/seat-map.service'
import { action, client, ok, saveBlob, type ApiData } from '../shared/client'

/*
| Agency portal (/agency/*): an agency user sees only their own agency's seat quotas and passengers.
*/

type ApiFlight = {
  id?: number
  service_type?: 'scheduled' | 'charter'
  status?: string
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
  schedule_changes?: AgencyScheduleChanges
  rights?: AgencyRights
  usage?: {
    used: number
    held?: number
    remaining: number
    is_open_for_names: boolean
    names_deadline_at: string
    cabins?: {
      cabin_class: string
      seats: number
      used: number
      held: number
      remaining: number
    }[]
  }
}

export interface AgencyQuota extends Record<string, unknown> {
  id: number
  airline: string
  flight_number: string
  route: string
  departure_at: string
  return_flight: string | null
  /** RT quota: departure of the return flight */
  return_departure_at?: string | null
  seats: number
  used: number
  /** seats held without names (by the agency's users) */
  held: number
  remaining: number
  cabins: string
  /** sold / held / left per cabin, for the tooltip */
  cabin_usage: string
  /** cabin classes of the quota (Y, C …) */
  cabin_classes: string[]
  names_deadline_at: string | null
  is_open_for_names: boolean
  /** a full quota waitlists new passengers */
  is_waitlist: boolean
  schedule_changes: AgencyScheduleChanges
  /** what the airline lets the agency do on this quota (Agents permission) */
  rights?: AgencyRights
  /** charter: seats can be reserved (with the right) while the flight is not open for check-in */
  is_charter?: boolean
  seats_open?: boolean
  /** outbound (+ return) flight of the quota */
  flights?: { id: number; label: string }[]
}

export interface AgencyRights {
  import_passengers: boolean
  assign_seats: boolean
}

const NO_RIGHTS: AgencyRights = {
  import_passengers: false,
  assign_seats: false,
}

/** Departure / arrival / number / route changes of the quota's flights since it was given */
export interface AgencyScheduleChanges {
  unseen: number
  changes: {
    id: number
    leg: 'outbound' | 'return'
    flight_number: string | null
    changed_at: string
    seen: boolean
    changes: { field: string; from: string | null; to: string | null }[]
  }[]
}

const NO_CHANGES: AgencyScheduleChanges = { unseen: 0, changes: [] }

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
  booking_id: number
  /** on_hold: tickets to be issued before ticketing_deadline_at */
  booking_status: string
  ticketing_deadline_at: string | null
  /** infant on the lap: LAST/FIRST */
  infant: string | null
  /** the staff member who issued the ticket (or booked it) */
  issued_by: string | null
}

const route = (f: ApiFlight | null) =>
  f ? `${f.origin?.iata_code ?? ''}-${f.destination?.iata_code ?? ''}` : ''

const toQuota = (a: ApiQuota): AgencyQuota => ({
  id: a.id,
  airline: a.airline?.name ?? '',
  flight_number: a.outbound_flight.flight_number,
  route: route(a.outbound_flight),
  departure_at: a.outbound_flight.scheduled_departure_at,
  return_flight: a.return_flight
    ? `${a.return_flight.flight_number} ${route(a.return_flight)}`
    : null,
  return_departure_at: a.return_flight?.scheduled_departure_at ?? null,
  seats: a.seats,
  used: a.usage?.used ?? 0,
  held: a.usage?.held ?? 0,
  remaining: a.usage?.remaining ?? a.seats,
  cabins: Object.entries(a.cabins ?? {})
    .map(([cabin, seats]) => `${cabin} ${seats}`)
    .join(' · '),
  cabin_usage: (a.usage?.cabins ?? [])
    .map(
      (c) =>
        `${c.cabin_class}: ${c.used} зарагдсан, ${c.held} hold, ${c.remaining} үлдсэн / ${c.seats}`
    )
    .join('\n'),
  cabin_classes: Object.entries(a.cabins ?? {})
    .filter(([, seats]) => seats > 0)
    .map(([cabin]) => cabin),
  names_deadline_at: a.usage?.names_deadline_at ?? null,
  is_open_for_names: a.usage?.is_open_for_names ?? false,
  is_waitlist: a.is_waitlist,
  schedule_changes: a.schedule_changes ?? NO_CHANGES,
  rights: a.rights ?? NO_RIGHTS,
  is_charter: a.outbound_flight.service_type === 'charter',
  seats_open: a.outbound_flight.status === 'scheduled',
  flights: [
    {
      id: a.outbound_flight.id ?? 0,
      label: `${a.outbound_flight.flight_number} ${route(a.outbound_flight)}`,
    },
    ...(a.return_flight?.id
      ? [
          {
            id: a.return_flight.id,
            label: `${a.return_flight.flight_number} ${route(a.return_flight)}`,
          },
        ]
      : []),
  ],
})

/** A passenger of the agency on a charter flight, for seat reservation */
export interface AgencySeatPassenger {
  segment_id: number
  passenger_id: number
  name: string
  pnr: string | null
  person_code: string | null
  cabin_class: string
  seat_number: string | null
  status: string
}

export interface AgencySeatMap {
  layout: SeatMapLayout
  passengers: AgencySeatPassenger[]
  /** seat number → segment id of the agency's own passengers */
  own: Record<string, number>
}

type ApiSeatMap = {
  seats: (Parameters<typeof toLayout>[0][number] & {
    own?: boolean
    occupant?: { segment_id: number; name: string | null } | null
  })[]
  passengers: AgencySeatPassenger[]
}

/** Restricted (exit, closed zone) and held seats cannot be reserved: shown as blocked; only own occupants are named */
const toSeatMap = (d: ApiSeatMap): AgencySeatMap => ({
  layout: toLayout(
    d.seats.map((s) => ({
      ...s,
      state:
        s.state === 'available' || s.state === 'occupied' ? s.state : 'blocked',
      occupant: s.own ? s.occupant : null,
    })),
    null,
    0
  ),
  passengers: d.passengers,
  own: Object.fromEntries(
    d.seats
      .filter((s) => s.own && s.occupant)
      .map((s) => [s.seat_number, s.occupant!.segment_id])
  ),
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
  /** special services (WCHR, VGML …) the flight's airline offers */
  ssr_codes?: string[]
  /** infant (under 2) travelling on this adult's lap: no seat, its own ticket */
  infant?: AgencyBookingInfant | null
}

/** An SSR the airline of a quota offers */
export interface AgencySsrOption {
  code: string
  name: string
  category: string | null
}

export interface AgencyBookingInfant {
  last_name: string
  first_name: string
  gender: 'M' | 'F'
  date_of_birth: string
  document_number: string
  document_expires_at: string
}

export interface AgencyPassengerDetail {
  id: number
  first_name: string
  last_name: string
  gender: 'M' | 'F' | null
  date_of_birth: string | null
  nationality: string | null
  document_number: string | null
  document_expires_at: string | null
  phone: string | null
  email: string | null
  segments?: { ssr_codes?: string[] }[]
  infant?: {
    first_name: string
    last_name: string
    gender: 'M' | 'F' | null
    date_of_birth: string | null
    document_number: string | null
    document_expires_at: string | null
  } | null
}

/** null infant: the passenger travels without one (an existing infant is removed) */
export type AgencyPassengerEdit = Omit<AgencyBookingPassenger, 'cabin_class'>

const upper = (v: string) => v.trim().toUpperCase()

/** E-ticket language, and whether the price breakdown and the issue date are printed (the API defaults: English, both shown) */
export interface EticketOptions {
  lang: 'mn' | 'en'
  fare: boolean
  issued: boolean
  /** whose details head the e-ticket: the agency's (default) or the airline's */
  header: 'agency' | 'airline'
}

const eticketQuery = (options?: EticketOptions) =>
  options
    ? {
        lang: options.lang,
        fare: options.fare ? 1 : 0,
        issued: options.issued ? 1 : 0,
        header: options.header,
      }
    : {}
const orNull = (v: string) => (v.trim() ? v.trim() : null)

/** infant of an adult: same nationality as the adult */
const infantPayload = (i: AgencyBookingInfant, nationality: string) => ({
  last_name: upper(i.last_name),
  first_name: upper(i.first_name),
  gender: i.gender,
  date_of_birth: i.date_of_birth,
  nationality: upper(nationality) || null,
  document_type: i.document_number.trim() ? 'passport' : null,
  document_number: i.document_number.trim() ? upper(i.document_number) : null,
  document_expires_at: orNull(i.document_expires_at),
})

export const agencyPortalService = {
  /** Excel / CSV passenger list of a quota (one PNR per row); replace = cancel the quota's passengers first */
  importPassengers: (quotaId: number, file: File, replace: boolean) => {
    const form = new FormData()
    form.append('file', file)
    form.append('replace_existing', replace ? '1' : '0')
    return action(
      client.upload<ApiData<{ created: number; bookings: string[] }>>(
        `/agency/allocations/${quotaId}/import`,
        form
      ),
      (r) => r
    )
  },

  /** Charter seat reservation (no check-in) */
  seatMap: async (quotaId: number, flightId?: number) =>
    ok(
      toSeatMap(
        (
          await client.get<ApiData<ApiSeatMap>>(
            `/agency/allocations/${quotaId}/seat-map`,
            { flight_id: flightId }
          )
        ).data
      )
    ),
  saveSeats: (
    quotaId: number,
    flightId: number | undefined,
    seats: { segment_id: number; seat_number: string | null }[]
  ) =>
    action(
      client.put<ApiData<ApiSeatMap>>(`/agency/allocations/${quotaId}/seats`, {
        flight_id: flightId,
        seats,
      }),
      toSeatMap
    ),
  autoSeats: (quotaId: number, flightId?: number) =>
    action(
      client.post<ApiData<ApiSeatMap>>(
        `/agency/allocations/${quotaId}/seats/auto`,
        { flight_id: flightId }
      ),
      toSeatMap
    ),

  /** status: '' (upcoming) | 'past' (last 3 months) */
  quotas: async (params: ListParams & { status?: string | string[] } = {}) => {
    const status = Array.isArray(params.status)
      ? params.status[0]
      : params.status
    const res = await client.get<{
      data: ApiQuota[]
      meta?: { total: number }
    }>('/agency/allocations', {
      status: status || undefined,
      page: params.current ?? 1,
      per_page: params.pageSize ?? 20,
    })
    const q = String(params.query ?? '')
      .trim()
      .toLowerCase()
    const items = res.data
      .map(toQuota)
      .filter(
        (r) => !q || `${r.flight_number} ${r.route}`.toLowerCase().includes(q)
      )
    return ok({
      total: q ? items.length : (res.meta?.total ?? items.length),
      items,
    })
  },

  /** POST /agency/bookings — one PNR for the passengers, on the quota's flight (or on seats of a hold) */
  book: async (
    quotaId: number,
    passengers: AgencyBookingPassenger[],
    contact: { phone: string; email: string },
    /** seats of a hold (its id), or just the fare bucket (or published fare) picked for every passenger */
    hold?: {
      id?: number
      allocation_fare_id: number | null
      fare_id?: number | null
    },
    /** keep the seats without tickets until the fare's ticket time limit */
    onHold = false,
    /** false: refuse when the quota is full instead of waitlisting */
    waitlist?: boolean
  ) => {
    const res = await client.post<{
      message: string
      data: { id: number; pnr: string; status: string }
    }>('/agency/bookings', {
      allocation_id: quotaId,
      hold_id: hold?.id,
      on_hold: onHold,
      waitlist,
      contact_phone: orNull(contact.phone),
      contact_email: orNull(contact.email),
      passengers: passengers.map((p) => ({
        last_name: upper(p.last_name),
        first_name: upper(p.first_name),
        gender: p.gender,
        date_of_birth: orNull(p.date_of_birth),
        nationality: upper(p.nationality) || null,
        document_type: p.document_number.trim() ? 'passport' : null,
        document_number: p.document_number.trim()
          ? upper(p.document_number)
          : null,
        document_expires_at: orNull(p.document_expires_at),
        phone: orNull(p.phone),
        email: orNull(p.email),
        cabin_class: p.cabin_class,
        ssr_codes: p.ssr_codes?.length ? p.ssr_codes : undefined,
        infant: p.infant ? infantPayload(p.infant, p.nationality) : undefined,
        allocation_fare_id: hold?.allocation_fare_id ?? undefined,
        fare_id: hold?.fare_id ?? undefined,
      })),
    })
    return ok(res.data, `${res.message} PNR ${res.data.pnr}`)
  },

  /** The agency has seen the schedule changes of the quota's flights */
  scheduleChangesSeen: async (quotaId: number) => {
    const res = await client.post<{ message: string }>(
      `/agency/allocations/${quotaId}/schedule-changes/seen`
    )
    return ok(null, res.message)
  },

  /** Issue the tickets of a booking on hold (before its time limit); the account is charged now */
  issue: async (bookingId: number) => {
    const res = await client.post<{ message: string }>(
      `/agency/bookings/${bookingId}/issue`
    )
    return ok(null, res.message)
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
    >('/agency/passenger-lookup', {
      document_number: documentNumber.trim().toUpperCase(),
    })
    return res.data
  },

  /** SSRs the airline of this quota's flights offers (an SSR of another airline is refused) */
  ssrOptions: async (quotaId: number) =>
    (
      await client.get<ApiData<AgencySsrOption[]>>(
        `/agency/allocations/${quotaId}/ssr-codes`
      )
    ).data,

  /** The agency's own conditions of carriage (Markdown) and whether this user may change them */
  conditions: async () =>
    (
      await client.get<
        ApiData<{
          conditions_of_carriage: string | null
          updated_at: string | null
          can_update: boolean
        }>
      >('/agency/conditions')
    ).data,
  saveConditions: async (markdown: string) => {
    const res = await client.put<{ message: string }>('/agency/conditions', {
      conditions_of_carriage: markdown,
    })
    return ok(null, res.message)
  },

  /** One passenger with every field, to edit */
  passenger: async (id: number) =>
    (
      await client.get<ApiData<AgencyPassengerDetail>>(
        `/agency/passengers/${id}`
      )
    ).data,

  /** Name, passport, contact … of a booked passenger (not after check-in) */
  updatePassenger: async (id: number, p: AgencyPassengerEdit) => {
    const res = await client.put<{ message: string }>(
      `/agency/passengers/${id}`,
      {
        last_name: upper(p.last_name),
        first_name: upper(p.first_name),
        gender: p.gender,
        date_of_birth: orNull(p.date_of_birth),
        nationality: upper(p.nationality) || null,
        document_type: p.document_number.trim() ? 'passport' : null,
        document_number: p.document_number.trim()
          ? upper(p.document_number)
          : null,
        document_expires_at: orNull(p.document_expires_at),
        phone: orNull(p.phone),
        email: orNull(p.email),
        ...(p.ssr_codes ? { ssr_codes: p.ssr_codes } : {}),
        infant: p.infant ? infantPayload(p.infant, p.nationality) : null,
      }
    )
    return ok(null, res.message)
  },

  /** E-ticket / itinerary receipt PDF of a ticketed passenger */
  eticketPdf: (id: number, options?: EticketOptions) =>
    client.blob(`/agency/passengers/${id}/eticket`, eticketQuery(options)),
  /** The e-tickets of several passengers in one ZIP */
  downloadEticketsZip: async (ids: number[], options?: EticketOptions) =>
    saveBlob(
      await client.postBlob('/agency/etickets/zip', {
        passenger_ids: ids,
        ...eticketQuery(options),
      }),
      `etickets-${new Date().toISOString().slice(0, 10)}.zip`
    ),
  downloadEticket: async (
    id: number,
    filename: string,
    options?: EticketOptions
  ) =>
    saveBlob(
      await client.blob(
        `/agency/passengers/${id}/eticket`,
        eticketQuery(options)
      ),
      filename
    ),
  /** to the passenger's e-mail, or to `email` */
  emailEticket: async (
    id: number,
    email?: string,
    options?: EticketOptions
  ) => {
    const res = await client.post<{ message: string }>(
      `/agency/passengers/${id}/eticket/email`,
      { email: email || undefined, ...eticketQuery(options) }
    )
    return ok(null, res.message)
  },

  /** Passengers booked on a quota (infants travel with their adult) */
  passengers: async (quotaId: number) => {
    const res = await client.get<
      ApiData<
        {
          id: number
          booking_id: number
          pnr?: string
          booking_status?: string
          ticketing_deadline_at?: string | null
          issued_by?: string | null
          type: string
          first_name: string
          last_name: string
          document_number: string | null
          phone: string | null
          segments?: {
            ticket_number: string | null
            seat_number: string | null
            status: string
          }[]
          infant?: { first_name: string; last_name: string } | null
        }[]
      >
    >(`/agency/allocations/${quotaId}/passengers`)
    return ok(
      res.data.map((p): AgencyPassenger => ({
        id: p.id,
        pnr: p.pnr ?? '',
        name: `${p.last_name}/${p.first_name}`,
        type: p.type,
        document_number: p.document_number,
        phone: p.phone,
        ticket_number: p.segments?.[0]?.ticket_number ?? null,
        seat_number: p.segments?.[0]?.seat_number ?? null,
        status: p.segments?.[0]?.status ?? '',
        booking_id: p.booking_id,
        booking_status: p.booking_status ?? '',
        ticketing_deadline_at: p.ticketing_deadline_at ?? null,
        infant: p.infant
          ? `${p.infant.last_name}/${p.infant.first_name}`
          : null,
        issued_by: p.issued_by ?? null,
      }))
    )
  },
}

// ─── Find flights of a day, hold seats, enter names later ───

export interface AgencyFare {
  id: number
  fare_class: string | null
  cabin_class: string
  seats: number
  sold: number
  held: number
  /** null = no limit on the fare */
  remaining: number | null
  price: { fare: string | number; tax: string | number } | null
  /** published fare (fare settings): `id` is the fare id, sent as fare_id */
  published?: boolean
  fare_family?: { code: string; name: string; rank: number } | null
  rbd_code?: string
  /** booking class sold out: books as waitlist (HL) */
  waitlist?: boolean
  rules?: {
    advance_booking_days: number | null
    min_stay_days: number | null
    max_stay_days: number | null
    ticket_time_limit_hours: number | null
    rule: string | null
  }
}

/** One allocation of the agency on the searched day */
export interface AgencyFlight {
  id: number
  airline: string
  flight_number: string
  route: string
  departure_local: string | null
  arrival_local: string | null
  return_flight: string | null
  seats: number
  used: number
  held: number
  remaining: number
  uses_fare_quotas: boolean
  /** sells at the fare settings prices: its fares are published fare bases */
  uses_published_fares: boolean
  is_waitlist: boolean
  cabins: {
    cabin_class: string
    seats: number
    used: number
    held: number
    remaining: number
  }[]
  fares: AgencyFare[]
  names_deadline_at: string | null
  is_open_for_names: boolean
  schedule_changes: AgencyScheduleChanges
}

export interface AgencyHold {
  id: number
  allocation_id: number
  allocation_fare_id: number | null
  cabin_class: string
  seats: number
  status: 'active' | 'released'
  fare: {
    fare_class: string | null
    price: { fare: string | number; tax: string | number }
  } | null
  flight_number: string
  route: string
  departure_local: string | null
  return_flight: string | null
  names_deadline_at: string | null
  usage: {
    seats: number
    named: number
    remaining: number
    is_open_for_names: boolean
  }
  created_by: string | null
  created_at: string | null
}

export interface AgencyAccount {
  id: number
  airline: { id: number; name: string; iata_code: string } | null
  balance: string
  currency: string
  updated_at: string | null
}

export interface AccountTransaction {
  id: number
  type: 'topup' | 'ticket' | 'refund' | 'adjustment'
  amount: string
  balance_after: string
  note: string | null
  pnr: string | null
  passenger: string | null
  created_by: string | null
  created_at: string | null
}

type ApiLocalFlight = ApiFlight & {
  departure_local?: string | null
  scheduled_arrival_local?: string | null
}

type ApiDayAllocation = Omit<
  ApiQuota,
  'outbound_flight' | 'return_flight' | 'usage'
> & {
  outbound_flight: ApiLocalFlight
  return_flight: ApiLocalFlight | null
  uses_fare_quotas: boolean
  uses_published_fares?: boolean
  usage: {
    used: number
    held: number
    remaining: number
    is_open_for_names: boolean
    names_deadline_at: string
    cabins: AgencyFlight['cabins']
    fares: AgencyFare[]
  }
}

type ApiHold = Omit<
  AgencyHold,
  'flight_number' | 'route' | 'departure_local' | 'return_flight'
> & {
  outbound_flight: ApiLocalFlight | null
  return_flight: ApiLocalFlight | null
}

export const agencyHoldService = {
  /** The agency's allocations whose flight departs on `date` (YYYY-MM-DD, local) */
  flights: async (date: string) => {
    const res = await client.get<ApiData<ApiDayAllocation[]>>(
      '/agency/flights',
      { date }
    )
    return ok(
      res.data.map((a): AgencyFlight => ({
        id: a.id,
        airline: a.airline?.name ?? '',
        flight_number: a.outbound_flight.flight_number,
        route: route(a.outbound_flight),
        departure_local: a.outbound_flight.departure_local ?? null,
        arrival_local: a.outbound_flight.scheduled_arrival_local ?? null,
        return_flight: a.return_flight
          ? `${a.return_flight.flight_number} ${route(a.return_flight)} ${a.return_flight.departure_local ?? ''}`
          : null,
        seats: a.seats,
        used: a.usage.used,
        held: a.usage.held,
        remaining: a.usage.remaining,
        uses_fare_quotas: a.uses_fare_quotas,
        uses_published_fares: a.uses_published_fares ?? false,
        is_waitlist: a.is_waitlist,
        cabins: a.usage.cabins,
        fares: a.usage.fares,
        names_deadline_at: a.usage.names_deadline_at,
        is_open_for_names: a.usage.is_open_for_names,
        schedule_changes: a.schedule_changes ?? NO_CHANGES,
      }))
    )
  },

  /** status: active (default) | all */
  list: async (status: 'active' | 'all' = 'active') => {
    const res = await client.get<ApiData<ApiHold[]>>('/agency/holds', {
      status,
    })
    return ok(
      res.data.map((h): AgencyHold => ({
        ...h,
        flight_number: h.outbound_flight?.flight_number ?? '',
        route: route(h.outbound_flight),
        departure_local: h.outbound_flight?.departure_local ?? null,
        return_flight: h.return_flight
          ? `${h.return_flight.flight_number} ${route(h.return_flight)}`
          : null,
      }))
    )
  },

  create: (payload: {
    allocation_id: number
    cabin_class: string
    seats: number
    allocation_fare_id: number | null
    /** allocation selling at published fares */
    fare_id?: number | null
  }) =>
    action(client.post<ApiData<ApiHold>>('/agency/holds', payload), (h) => h),

  release: (id: number) =>
    action(client.delete<ApiData<ApiHold>>(`/agency/holds/${id}`), (h) => h),
}

export const agencyAccountPortalService = {
  accounts: async () =>
    ok((await client.get<ApiData<AgencyAccount[]>>('/agency/accounts')).data),
  transactions: async (accountId: number) =>
    ok(
      (
        await client.get<ApiData<AccountTransaction[]>>(
          `/agency/accounts/${accountId}/transactions`,
          { per_page: 100 }
        )
      ).data
    ),
}

// ─── Manage booking: find a PNR of the agency, its passengers and coupons ───

export interface AgencyBookingSegment {
  id: number
  flight_number: string
  route: string
  departure_local: string | null
  arrival_local: string | null
  cabin_class: string
  fare_class: string | null
  ticket_number: string | null
  seat_number: string | null
  fare_amount: string | null
  tax_amount: string | null
  total_amount: string | null
  currency: string | null
  status: string
}

export interface AgencyBookingPax {
  id: number
  name: string
  type: string
  document_number: string | null
  phone: string | null
  email: string | null
  segments: AgencyBookingSegment[]
}

export interface AgencyBooking {
  id: number
  pnr: string
  /** confirmed | on_hold | waitlisted | cancelled */
  status: string
  ticketing_deadline_at: string | null
  contact_phone: string | null
  contact_email: string | null
  created_by: string | null
  created_at: string | null
  passengers: AgencyBookingPax[]
}

type ApiSegment = {
  id: number
  flight?: ApiLocalFlight & { scheduled_arrival_local?: string | null }
  cabin_class: string
  fare_class: string | null
  ticket_number: string | null
  seat_number: string | null
  fare_amount: string | null
  tax_amount: string | null
  total_amount: string | null
  currency: string | null
  status: string
}

type ApiBooking = {
  id: number
  pnr: string
  status: string
  ticketing_deadline_at: string | null
  contact_phone: string | null
  contact_email: string | null
  created_by?: { id: number; name: string } | null
  created_at: string | null
  passengers?: {
    id: number
    type: string
    first_name: string
    last_name: string
    document_number: string | null
    phone: string | null
    email: string | null
    segments?: ApiSegment[]
  }[]
}

const toBooking = (b: ApiBooking): AgencyBooking => ({
  id: b.id,
  pnr: b.pnr,
  status: b.status,
  ticketing_deadline_at: b.ticketing_deadline_at,
  contact_phone: b.contact_phone,
  contact_email: b.contact_email,
  created_by: b.created_by?.name ?? null,
  created_at: b.created_at,
  passengers: (b.passengers ?? []).map((p) => ({
    id: p.id,
    name: `${p.last_name}/${p.first_name}`,
    type: p.type,
    document_number: p.document_number,
    phone: p.phone,
    email: p.email,
    segments: (p.segments ?? []).map((s) => ({
      id: s.id,
      flight_number: s.flight?.flight_number ?? '',
      route: route(s.flight ?? null),
      departure_local: s.flight?.departure_local ?? null,
      arrival_local: s.flight?.scheduled_arrival_local ?? null,
      cabin_class: s.cabin_class,
      fare_class: s.fare_class,
      ticket_number: s.ticket_number,
      seat_number: s.seat_number,
      fare_amount: s.fare_amount,
      tax_amount: s.tax_amount,
      total_amount: s.total_amount,
      currency: s.currency,
      status: s.status,
    })),
  })),
})

export const agencyBookingService = {
  /** search: PNR, passenger name, passport or ticket number (empty = latest bookings) */
  list: async (search = '', perPage = 20) => {
    const res = await client.get<ApiData<ApiBooking[]>>('/agency/bookings', {
      search: search.trim() || undefined,
      per_page: perPage,
    })
    return ok(res.data.map(toBooking))
  },

  show: async (id: number) =>
    ok(
      toBooking(
        (await client.get<ApiData<ApiBooking>>(`/agency/bookings/${id}`)).data
      )
    ),

  /** Download the passenger's e-ticket PDF */
  downloadEticket: async (
    passengerId: number,
    filename: string,
    options?: EticketOptions
  ) =>
    saveBlob(
      await client.blob(
        `/agency/passengers/${passengerId}/eticket`,
        eticketQuery(options)
      ),
      filename
    ),

  emailEticket: async (
    passengerId: number,
    email?: string,
    options?: EticketOptions
  ) => {
    const res = await client.post<{ message: string }>(
      `/agency/passengers/${passengerId}/eticket/email`,
      {
        email: email || undefined,
        ...eticketQuery(options),
      }
    )
    return ok(null, res.message)
  },

  cancelPassenger: async (passengerId: number) => {
    const res = await client.delete<{ message: string } | null>(
      `/agency/passengers/${passengerId}`
    )
    return ok(null, res?.message ?? 'Passenger cancelled.')
  },
}
