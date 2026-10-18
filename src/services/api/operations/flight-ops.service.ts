import type {
  Flight,
  FlightAction,
  FlightOperations,
} from '../../types/operations/flight.types'
import type { FlightPassengerRow } from '../../types/sales/booking.types'
import type { ListParams } from '../../types/shared/common.types'
import { api } from '@/config/api'
import { useAuthStore } from '@/stores/auth-store'
import { client, ok, period, type ApiData } from '../shared/client'

/*
| Flight manager / flight load: /admin/flight-board (one day), status / gate / ETD / gate agents / online check-in,
| /admin/flights/{id}/passengers and the flight documents (manifest json, PNL text).
*/

export interface FlightBoardRow extends Flight {
  ops: FlightOperations
  pax: { booked: number; checked_in: number; boarded: number; capacity: number }
}

type ApiBoardFlight = Flight & {
  off_block_at: string | null
  takeoff_at: string | null
  estimated_arrival_at: string | null
  gate_agents?: { id: number; name: string }[]
  passenger_counts?: { booked: number; checked_in: number; boarded: number }
}

function toBoardRow(f: ApiBoardFlight): FlightBoardRow {
  return {
    ...f,
    segments_count: f.segments_count ?? 0,
    online_checkin: f.online_checkin ?? { enabled: false, opens_minutes: 0, closes_minutes: 0 },
    ops: {
      gate: f.gate,
      estimated_departure_at: f.estimated_departure_at,
      off_block_at: f.off_block_at,
      takeoff_at: f.takeoff_at,
      estimated_arrival_at: f.estimated_arrival_at,
      delay_reason: f.status_reason,
      gate_agents: f.gate_agents ?? [],
      online_checkin_enabled: f.online_checkin?.enabled ?? false,
    },
    pax: {
      booked: f.passenger_counts?.booked ?? f.segments_count ?? 0,
      checked_in: f.passenger_counts?.checked_in ?? 0,
      boarded: f.passenger_counts?.boarded ?? 0,
      capacity: f.aircraft?.total_seats ?? 0,
    },
  }
}

const today = () => new Date().toISOString().slice(0, 10)

async function board(date?: string) {
  const res = await client.get<ApiData<ApiBoardFlight[]>>('/admin/flight-board', { date: date || today() })
  return res.data.map(toBoardRow)
}

export const flightOpsService = {
  /** Flight manager / station board of one day (search / status / paging here) */
  list: async (params: ListParams & { date?: string } = {}) => {
    const rows = await board(period(params).from ?? (params.date as string | undefined))
    const q = String(params.query ?? '').trim().toLowerCase()
    const status = params.status as string | string[] | undefined
    const statuses = status ? (Array.isArray(status) ? status : [status]) : []
    const found = rows.filter(
      (f) =>
        (!q ||
          [f.flight_number, f.origin.iata_code, f.destination.iata_code, f.gate ?? '']
            .join(' ')
            .toLowerCase()
            .includes(q)) &&
        (!statuses.length || statuses.includes(f.status))
    )
    const size = params.pageSize ?? 20
    const page = params.current ?? 1
    return ok({ total: found.length, items: found.slice((page - 1) * size, page * size) })
  },

  getById: async (id: number) => {
    const flight = (await client.get<ApiData<ApiBoardFlight>>(`/admin/flights/${id}`)).data
    // the board of that day carries gate agents and passenger counts
    const row = (await board(flight.scheduled_departure_at.slice(0, 10))).find((f) => f.id === id)
    return ok(row ?? toBoardRow(flight))
  },

  update: async (id: number, patch: Partial<FlightOperations>) => {
    if (patch.gate !== undefined) await client.put(`/admin/flights/${id}/gate`, { gate: patch.gate || null })
    if (patch.estimated_departure_at !== undefined)
      await client.put(`/admin/flights/${id}/estimated-departure`, {
        estimated_departure_at: patch.estimated_departure_at || null,
      })
    if (patch.online_checkin_enabled !== undefined)
      await client.put(`/admin/flights/${id}/online-checkin`, {
        online_checkin_enabled: patch.online_checkin_enabled,
      })
    if (patch.gate_agents)
      await client.put(`/admin/flights/${id}/gate-agents`, { user_ids: patch.gate_agents.map((a) => a.id) })
    const row = await flightOpsService.getById(id)
    return ok(row.body, 'Flight updated')
  },

  action: async (
    id: number,
    action: FlightAction,
    data: { reason?: string; off_block_at?: string; takeoff_at?: string; estimated_arrival_at?: string } = {}
  ) => {
    const res = await client.post<{ message: string }>(`/admin/flights/${id}/status`, { action, ...data })
    const row = await flightOpsService.getById(id)
    return ok(row.body, res.message)
  },

  /** Station / gate agents of the airline who may be assigned to the flight */
  gateAgentCandidates: async (flightId?: number) => {
    if (!flightId) return ok([] as { id: number; name: string }[])
    const res = await client.get<ApiData<{ id: number; name: string }[]>>(
      `/admin/flights/${flightId}/gate-agents/candidates`
    )
    return ok(res.data.map((u) => ({ id: u.id, name: u.name })))
  },
}

// ─── Passengers of a flight ───
type ApiSegment = {
  id: number
  flight_id: number
  cabin_class: string
  seat_number: string | null
  status: string
  ssr_codes?: string[]
  baggage?: { pieces: number; weight_kg: number | string }[]
  passenger?: {
    pnr?: string
    agency?: { name: string } | null
    type: string
    first_name: string
    last_name: string
    gender: string | null
    date_of_birth: string | null
    nationality: string | null
    document_number: string | null
    phone: string | null
  }
}

type ApiManifest = {
  header: { flight_number: string }
  passengers: {
    rows: {
      segment_id: number
      first_name: string
      last_name: string
      gender: string | null
      type: string
      nationality: string | null
      date_of_birth: string | null
      pnr: string
      cabin_class: string
      seat_number: string | null
      ssr: string
      bag_pieces: number
      bag_weight_kg: number
    }[]
  }
  balance: {
    rows: {
      zone: string | null
      male_adults: number
      female_adults: number
      children: number
      infants: number
      total: number
      bags: number
      kg: number
    }[]
  }
}

export const flightPassengerService = {
  list: async (flightId: number, params: ListParams = {}) => {
    const res = await client.get<ApiData<ApiSegment[]>>(`/admin/flights/${flightId}/passengers`, {
      search: params.query,
      status: params.status as string | undefined,
    })
    const flight = (await client.get<ApiData<Flight>>(`/admin/flights/${flightId}`)).data
    const rows = res.data
      .filter((s) => !params.cabin_class || s.cabin_class === params.cabin_class)
      .map((s): FlightPassengerRow => ({
        id: s.id,
        pnr: s.passenger?.pnr ?? '',
        last_name: s.passenger?.last_name ?? '',
        first_name: s.passenger?.first_name ?? '',
        type: s.passenger?.type ?? 'ADT',
        gender: s.passenger?.gender ?? '',
        date_of_birth: s.passenger?.date_of_birth ?? '',
        nationality: s.passenger?.nationality ?? '',
        document_number: s.passenger?.document_number ?? '',
        seat_number: s.seat_number,
        cabin_class: s.cabin_class,
        status: s.status,
        ssr_codes: s.ssr_codes ?? [],
        agency: s.passenger?.agency?.name ?? null,
        phone: s.passenger?.phone ?? null,
        flight_id: s.flight_id,
        flight_number: flight.flight_number,
        route: `${flight.origin.iata_code}-${flight.destination.iata_code}`,
        departure_at: flight.scheduled_departure_at,
        bags: (s.baggage ?? []).reduce((n, b) => n + b.pieces, 0),
        bag_weight_kg: (s.baggage ?? []).reduce((n, b) => n + Number(b.weight_kg), 0),
        zone: null,
      }))
    const size = params.pageSize ?? 1000
    const page = params.current ?? 1
    return ok({ total: rows.length, items: rows.slice((page - 1) * size, page * size) })
  },

  /** Manifest: checked-in passengers + zone / baggage summary (ManifestService) */
  manifest: async (flightId: number) => {
    const [doc, flight] = await Promise.all([
      client.get<ApiData<ApiManifest>>(`/admin/flights/${flightId}/documents/manifest`, {
        parts: ['passengers', 'balance'],
      }),
      flightOpsService.getById(flightId),
    ])
    const passengers: FlightPassengerRow[] = doc.data.passengers.rows.map((p) => ({
      id: p.segment_id,
      pnr: p.pnr,
      last_name: p.last_name,
      first_name: p.first_name,
      type: p.type,
      gender: p.gender ?? '',
      date_of_birth: p.date_of_birth ?? '',
      nationality: p.nationality ?? '',
      document_number: '',
      seat_number: p.seat_number,
      cabin_class: p.cabin_class,
      status: 'checked_in',
      ssr_codes: p.ssr ? p.ssr.split(' ') : [],
      agency: null,
      phone: null,
      flight_id: flightId,
      flight_number: doc.data.header.flight_number,
      route: '',
      departure_at: '',
      bags: p.bag_pieces,
      bag_weight_kg: p.bag_weight_kg,
      zone: null,
    }))
    return ok({
      flight: flight.body,
      passengers,
      zones: doc.data.balance.rows.map((z) => ({
        zone: z.zone ?? '-',
        male: z.male_adults,
        female: z.female_adults,
        children: z.children,
        infants: z.infants,
        total: z.total,
        bags: z.bags,
        kg: z.kg,
      })),
    })
  },

  /** PNL telex text (PnlGenerator) */
  pnl: async (flightId: number) => {
    const token = useAuthStore.getState().auth.token
    const res = await fetch(`${api.base}/admin/flights/${flightId}/documents/pnl`, {
      headers: { Accept: 'text/plain', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error(res.status === 403 ? 'You do not have permission for this.' : 'PNL is not available')
    return ok(await res.text())
  },
}

export type { FlightPassengerRow }
