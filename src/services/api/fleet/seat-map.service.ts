import {
  aircraft,
  flightPassengers,
  flightSeatBlocks,
  flights,
  loadZones,
  seatAssignmentProfiles,
  seatBlocks,
} from '../../mock/db'
import {
  createMockResource,
  fail,
  mockList,
  nextId,
  ok,
} from '../../mock/utils'
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
import type { ListParams } from '../../types/shared/common.types'

// TODO(api): /admin/aircraft/{id}/seats (generate, destroyRows, patch), /load-zones, /seat-assignment-profiles

/** Seat blocks → rows of cells (null = aisle) */
export function buildLayout(
  aircraftId: number,
  occupied = new Map<string, string>(),
  blocked = new Set<string>()
): SeatMapLayout | null {
  const plane = aircraft.find((a) => a.id === aircraftId)
  if (!plane) return null
  const blocks = seatBlocks
    .filter((b) => b.aircraft_id === aircraftId)
    .sort((a, b) => a.row_from - b.row_from)
  const rows: SeatMapLayout['rows'] = []
  blocks.forEach((b) => {
    for (let row = b.row_from; row <= b.row_to; row++) {
      const seats: (SeatCell | null)[] = []
      ;[b.left, b.middle, b.right].filter(Boolean).forEach((group, gi) => {
        if (gi > 0) seats.push(null)
        group.split('').forEach((letter) => {
          const number = `${row}${letter}`
          seats.push({
            number,
            row,
            letter,
            cabin_class: b.cabin_class,
            zone: b.zone,
            is_exit: b.exit_rows.includes(row),
            state: occupied.has(number)
              ? 'occupied'
              : blocked.has(number)
                ? 'blocked'
                : 'available',
            occupant: occupied.get(number) ?? null,
          })
        })
      })
      rows.push({
        row,
        cabin_class: b.cabin_class,
        zone: b.zone,
        is_exit: b.exit_rows.includes(row),
        seats,
      })
    }
  })
  return {
    aircraft_id: plane.id,
    registration: plane.registration,
    type: plane.type,
    rows,
  }
}

const toBlock = (
  aircraftId: number,
  payload: SeatBlockPayload,
  existing?: SeatBlock
): SeatBlock => ({
  ...existing,
  id: existing?.id ?? nextId(),
  aircraft_id: aircraftId,
  row_from: Number(payload.row_from),
  row_to: Number(payload.row_to),
  cabin_class: payload.cabin_class,
  left: payload.left.toUpperCase().replace(/[^A-Z]/g, ''),
  middle: payload.middle.toUpperCase().replace(/[^A-Z]/g, ''),
  right: payload.right.toUpperCase().replace(/[^A-Z]/g, ''),
  zone: payload.zone.toUpperCase(),
  exit_rows: payload.exit_rows
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => n > 0),
})

export const seatMapService = {
  blocks: (aircraftId: number) =>
    ok(
      seatBlocks
        .filter((b) => b.aircraft_id === aircraftId)
        .sort((a, b) => a.row_from - b.row_from)
    ),

  layout: (aircraftId: number) => {
    const layout = buildLayout(aircraftId)
    return layout ? ok(layout) : fail('Aircraft not found')
  },

  saveBlock: (aircraftId: number, payload: SeatBlockPayload, id?: number) => {
    if (Number(payload.row_to) < Number(payload.row_from))
      return fail('Row end must be after row start')
    const overlap = seatBlocks.some(
      (b) =>
        b.aircraft_id === aircraftId &&
        b.id !== id &&
        Number(payload.row_from) <= b.row_to &&
        Number(payload.row_to) >= b.row_from
    )
    if (overlap) return fail('Rows overlap an existing block')
    if (id) {
      const index = seatBlocks.findIndex((b) => b.id === id)
      seatBlocks[index] = toBlock(aircraftId, payload, seatBlocks[index])
      return ok(seatBlocks[index], 'Seat block updated')
    }
    const block = toBlock(aircraftId, payload)
    seatBlocks.push(block)
    return ok(block, 'Seat block created')
  },

  removeBlock: (id: number) => {
    const index = seatBlocks.findIndex((b) => b.id === id)
    if (index < 0) return fail('Not found')
    seatBlocks.splice(index, 1)
    return ok(null, 'Seat block deleted')
  },

  /** Seat Block page: flight seat map with occupied / blocked seats */
  flightLayout: (flightId: number) => {
    const flight = flights.find((f) => f.id === flightId)
    if (!flight?.aircraft) return fail('Flight has no aircraft')
    const occupied = new Map(
      flightPassengers(flightId)
        .filter((p) => p.seat_number)
        .map((p) => [p.seat_number!, `${p.last_name}/${p.first_name}`])
    )
    const layout = buildLayout(
      flight.aircraft.id,
      occupied,
      flightSeatBlocks.get(flightId) ?? new Set()
    )
    return layout ? ok(layout) : fail('Aircraft has no seat map')
  },

  toggleBlock: (flightId: number, seats: string[], block: boolean) => {
    const set = flightSeatBlocks.get(flightId) ?? new Set<string>()
    seats.forEach((s) => (block ? set.add(s) : set.delete(s)))
    flightSeatBlocks.set(flightId, set)
    return ok(
      null,
      block
        ? `${seats.length} seat(s) blocked`
        : `${seats.length} seat(s) released`
    )
  },

  blockedCount: (flightId: number) => flightSeatBlocks.get(flightId)?.size ?? 0,
}

const zoneResource = createMockResource<LoadZone, LoadZonePayload>(loadZones, {
  build: (payload, existing) => ({
    ...existing,
    id: existing?.id ?? nextId(),
    aircraft_id: Number(payload.aircraft_id),
    zone: payload.zone.toUpperCase(),
    pax_from: Number(payload.pax_from),
    pax_to: Number(payload.pax_to),
  }),
})

export const loadZoneService = {
  ...zoneResource,
  list: (params: ListParams) =>
    mockList(
      [...loadZones].sort(
        (a, b) => a.aircraft_id - b.aircraft_id || a.pax_from - b.pax_from
      ),
      params,
      {
        searchKeys: ['zone'],
        filters: { aircraft_id: (row) => row.aircraft_id },
      }
    ),
}

const profileResource = createMockResource<
  SeatAssignmentProfile,
  SeatAssignmentProfilePayload
>(seatAssignmentProfiles, {
  build: (payload, existing) => ({
    ...existing,
    id: existing?.id ?? nextId(),
    aircraft_id: Number(payload.aircraft_id),
    aircraft:
      aircraft.find((a) => a.id === Number(payload.aircraft_id))
        ?.registration ?? '-',
    name: payload.name,
    zones: payload.zones
      .split(/[,>\s]+/)
      .map((z) => z.trim().toUpperCase())
      .filter(Boolean),
    is_default: payload.is_default,
  }),
})

export const seatProfileService = {
  ...profileResource,
  list: (params: ListParams) =>
    mockList(seatAssignmentProfiles, params, {
      searchKeys: ['name', 'aircraft'],
      filters: { aircraft_id: (row) => row.aircraft_id },
    }),
}

export const aircraftOptions = () =>
  aircraft.map((a) => ({
    label: `${a.registration} · ${a.type}`,
    value: String(a.id),
  }))
