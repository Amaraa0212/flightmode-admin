import { fail, ok } from '../../mock/utils'
import type { CabinClass } from '../../types/reference/reference.types'
import type {
  LoadZone,
  LoadZonePayload,
  SeatAssignmentProfile,
  SeatAssignmentProfilePayload,
  SeatBlock,
  SeatBlockPayload,
  SeatCell,
  SeatMapLayout,
} from '../../types/fleet/aircraft.types'
import { action, client, type ApiAction, type ApiData } from '../shared/client'

type ApiSeat = {
  id?: number
  seat_number: string
  row: number
  column: string
  side: 'left' | 'middle' | 'right'
  cabin_class: CabinClass
  zone: string | null
  is_emergency_exit: boolean
  is_active?: boolean
  state?: string
  occupant?: { name: string | null } | null
}

type ApiAircraft = { id: number; registration: string; type: string }
type ApiFlightRef = { id: number; aircraft: ApiAircraft | null }

const SIDES = ['left', 'middle', 'right'] as const

/** Seats → rows plus the seat letters of each side (rows of a narrower cabin keep the gaps, see SeatMapGrid) */
export function toLayout(
  seats: ApiSeat[],
  plane: ApiAircraft | null,
  aircraftId: number
): SeatMapLayout {
  const columns = { left: [] as string[], middle: [] as string[], right: [] as string[] }
  const byRow = new Map<number, ApiSeat[]>()
  seats
    .filter((s) => s.is_active !== false)
    .forEach((s) => {
      if (!columns[s.side].includes(s.column)) columns[s.side].push(s.column)
      byRow.set(s.row, [...(byRow.get(s.row) ?? []), s])
    })
  SIDES.forEach((side) => columns[side].sort())

  const rows = [...byRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([row, rowSeats]) => {
      const first = rowSeats[0]
      const isExit = rowSeats.some((s) => s.is_emergency_exit)
      return {
        row,
        cabin_class: first.cabin_class,
        zone: first.zone ?? '',
        is_exit: isExit,
        seats: [...rowSeats]
          .sort((a, b) => a.column.localeCompare(b.column))
          .map(
            (s): SeatCell => ({
              number: s.seat_number,
              row,
              letter: s.column,
              side: s.side,
              cabin_class: s.cabin_class,
              zone: s.zone ?? '',
              is_exit: s.is_emergency_exit,
              state:
                s.state === 'occupied' || s.state === 'blocked'
                  ? s.state
                  : 'available',
              occupant: s.occupant?.name ?? null,
            })
          ),
      }
    })

  return {
    aircraft_id: plane?.id ?? aircraftId,
    registration: plane?.registration ?? '',
    type: plane?.type ?? '',
    columns,
    rows,
  }
}

/** Consecutive rows with the same cabin, letters and zone = one configuration block (the API stores seats) */
export function toBlocks(aircraftId: number, layout: SeatMapLayout): SeatBlock[] {
  const blocks: SeatBlock[] = []
  layout.rows.forEach((row) => {
    const letters = (side: string) =>
      row.seats
        .filter((s) => s.side === side)
        .map((s) => s.letter)
        .join('')
    const shape = {
      cabin_class: row.cabin_class,
      left: letters('left'),
      middle: letters('middle'),
      right: letters('right'),
      zone: row.zone,
    }
    const last = blocks[blocks.length - 1]
    const same =
      last &&
      last.row_to === row.row - 1 &&
      last.cabin_class === shape.cabin_class &&
      last.left === shape.left &&
      last.middle === shape.middle &&
      last.right === shape.right &&
      last.zone === shape.zone
    if (same) {
      last.row_to = row.row
      last.id = last.row_from * 1000 + row.row
      if (row.is_exit) last.exit_rows.push(row.row)
    } else {
      blocks.push({
        id: row.row * 1000 + row.row,
        aircraft_id: aircraftId,
        row_from: row.row,
        row_to: row.row,
        ...shape,
        exit_rows: row.is_exit ? [row.row] : [],
      })
    }
  })
  return blocks
}

const letters = (value: string) => value.toUpperCase().replace(/[^A-Z]/g, '')

async function aircraftLayout(aircraftId: number) {
  const [seats, plane] = await Promise.all([
    client.get<ApiData<ApiSeat[]>>(`/admin/aircraft/${aircraftId}/seats`),
    client.get<ApiData<ApiAircraft>>(`/admin/aircraft/${aircraftId}`),
  ])
  return toLayout(seats.data, plane.data, aircraftId)
}

export const seatMapService = {
  blocks: async (aircraftId: number) =>
    ok(toBlocks(aircraftId, await aircraftLayout(aircraftId))),

  layout: async (aircraftId: number) => ok(await aircraftLayout(aircraftId)),

  /** Writes the rows of a block (the API replaces seats of those rows); a moved block drops its old rows first */
  saveBlock: async (aircraftId: number, payload: SeatBlockPayload, block?: SeatBlock) => {
    const from = Number(payload.row_from)
    const to = Number(payload.row_to)
    if (to < from) return fail('Row end must be after row start')
    const others = toBlocks(aircraftId, await aircraftLayout(aircraftId)).filter(
      (b) => !block || b.row_from < block.row_from || b.row_to > block.row_to
    )
    if (others.some((b) => from <= b.row_to && to >= b.row_from))
      return fail('Rows overlap an existing block')

    if (block)
      await client.delete(`/admin/aircraft/${aircraftId}/seats`, {
        row_from: block.row_from,
        row_to: block.row_to,
      })

    const exitRows = payload.exit_rows
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => n >= from && n <= to)
    const columns = {
      left: letters(payload.left),
      middle: letters(payload.middle),
      right: letters(payload.right),
    }
    const common = {
      cabin_class: payload.cabin_class,
      zone: payload.zone.toUpperCase() || null,
      columns,
    }
    const res = await client.post<ApiAction<ApiSeat[]>>(`/admin/aircraft/${aircraftId}/seats/generate`, {
      ...common,
      row_from: from,
      row_to: to,
      is_emergency_exit: false,
      skip_rows: exitRows,
    })
    for (const row of exitRows)
      await client.post(`/admin/aircraft/${aircraftId}/seats/generate`, {
        ...common,
        row_from: row,
        row_to: row,
        is_emergency_exit: true,
      })
    return ok(null, block ? 'Seat block updated' : res.message)
  },

  removeBlock: async (block: SeatBlock) => {
    const res = await client.delete<ApiAction<null>>(`/admin/aircraft/${block.aircraft_id}/seats`, {
      row_from: block.row_from,
      row_to: block.row_to,
    })
    return ok(null, res.message)
  },

  /** Seat Block page: flight seat map with occupied / blocked seats, and the aircraft it flies */
  flightLayout: async (flightId: number) => {
    const [map, flight] = await Promise.all([
      client.get<ApiData<{ seats: ApiSeat[] }>>(`/admin/flights/${flightId}/seat-map`),
      client.get<ApiData<ApiFlightRef>>(`/admin/flights/${flightId}`),
    ])
    if (!flight.data.aircraft) return fail('Flight has no aircraft')
    return ok(toLayout(map.data.seats, flight.data.aircraft, flight.data.aircraft.id))
  },

  toggleBlock: async (flightId: number, seats: string[], block: boolean) => {
    const path = `/admin/flights/${flightId}/seat-blocks`
    const res = block
      ? await client.post<ApiAction<null>>(path, { seat_numbers: seats })
      : await client.delete<ApiAction<null>>(path, { seat_numbers: seats })
    return ok(null, res.message)
  },
}

type ApiLoadZone = { id: number; zone: string; pax_from: number; pax_to: number }

const zonesPath = (aircraftId: number) => `/admin/aircraft/${aircraftId}/load-zones`

async function loadZones(aircraftId: number): Promise<LoadZone[]> {
  const res = await client.get<ApiData<ApiLoadZone[]>>(zonesPath(aircraftId))
  return res.data.map((z) => ({ ...z, aircraft_id: aircraftId }))
}

/** PUT replaces the aircraft's whole list; `edit` returns the new list */
async function saveZones(aircraftId: number, edit: (zones: LoadZone[]) => LoadZone[]) {
  const zones = edit(await loadZones(aircraftId)).map(({ zone, pax_from, pax_to }) => ({
    zone: zone.trim().toUpperCase(),
    pax_from: Number(pax_from),
    pax_to: Number(pax_to),
  }))
  const res = await client.put<ApiAction<ApiLoadZone[]>>(zonesPath(aircraftId), { zones })
  return ok(null, res.message)
}

const zoneRow = (p: LoadZonePayload, id = 0): LoadZone => ({
  id,
  aircraft_id: Number(p.aircraft_id),
  zone: p.zone,
  pax_from: Number(p.pax_from),
  pax_to: Number(p.pax_to),
})

/** /admin/aircraft/{id}/load-zones — a short list per aircraft, read and written whole */
export const loadZoneService = {
  list: async (aircraftId: number) => ok(await loadZones(aircraftId)),
  create: (payload: LoadZonePayload) =>
    saveZones(Number(payload.aircraft_id), (zones) => [...zones, zoneRow(payload)]),
  update: (id: number, payload: LoadZonePayload) =>
    saveZones(Number(payload.aircraft_id), (zones) =>
      zones.map((z) => (z.id === id ? zoneRow(payload, id) : z))
    ),
  remove: (zone: LoadZone) =>
    saveZones(zone.aircraft_id, (zones) => zones.filter((z) => z.id !== zone.id)),
}

const profilesPath = (aircraftId: number | string) =>
  `/admin/aircraft/${aircraftId}/seat-assignment-profiles`

const profileBody = (p: SeatAssignmentProfilePayload) => ({
  name: p.name.trim(),
  zones: p.zones
    .split(/[,>\s]+/)
    .map((z) => z.trim().toUpperCase())
    .filter(Boolean),
})

/** /admin/aircraft/{id}/seat-assignment-profiles — auto-seat zone fill order */
export const seatProfileService = {
  list: async (aircraftId: number) =>
    ok((await client.get<ApiData<SeatAssignmentProfile[]>>(profilesPath(aircraftId))).data),
  create: (payload: SeatAssignmentProfilePayload) =>
    action(
      client.post<ApiData<SeatAssignmentProfile>>(profilesPath(payload.aircraft_id), profileBody(payload)),
      (p) => p
    ),
  update: (id: number, payload: SeatAssignmentProfilePayload) =>
    action(
      client.put<ApiData<SeatAssignmentProfile>>(`${profilesPath(payload.aircraft_id)}/${id}`, profileBody(payload)),
      (p) => p
    ),
  remove: (profile: SeatAssignmentProfile) =>
    action(client.delete<ApiData<null>>(`${profilesPath(profile.aircraft_id)}/${profile.id}`), () => null),
}
