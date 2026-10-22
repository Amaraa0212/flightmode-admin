import type {
  Aircraft,
  AircraftListParams,
  AircraftPayload,
} from '../../types/fleet/aircraft.types'
import { action, client, getPage, ok, type ApiData } from '../shared/client'

type AircraftBody = AircraftPayload & { airline_id?: string }

/**
 * "W16Y120" / "C12 Y150" → { W: 16, Y: 120 }. Cabin letters F, C, W, Y; null when the text has anything else
 * or a cabin twice, so a typo never silently turns into one economy cabin.
 */
export function parseSeatConfiguration(
  value: string
): Partial<Record<'F' | 'C' | 'W' | 'Y', number>> | null {
  const text = value.toUpperCase().replace(/[\s,/-]+/g, '')
  if (!/^([FCWY]\d+)+$/.test(text)) return null
  const cabins: Partial<Record<'F' | 'C' | 'W' | 'Y', number>> = {}
  for (const [, cabin, seats] of text.matchAll(/([FCWY])(\d+)/g)) {
    const key = cabin as 'F' | 'C' | 'W' | 'Y'
    if (cabins[key] !== undefined) return null
    cabins[key] = Number(seats)
  }
  return cabins
}

const toBody = (p: AircraftBody) => {
  // cabins and total seats come from the configuration (W16Y120 = W 16 + Y 120 = 136)
  const cabins = parseSeatConfiguration(p.seat_configuration) ?? {}
  return {
    registration: p.registration.toUpperCase(),
    type: p.type,
    seat_configuration: p.seat_configuration.toUpperCase().replace(/\s+/g, ''),
    total_seats: Object.values(cabins).reduce((sum, n) => sum + (n ?? 0), 0),
    max_infants: Number(p.max_infants),
    is_active: p.is_active,
    cabins,
    ...(p.airline_id ? { airline_id: Number(p.airline_id) } : {}),
  }
}

const withDefaults = (a: Aircraft): Aircraft => ({ ...a, cabins: a.cabins ?? {} })

/** /admin/aircraft — the user's airline fleet (all airlines for a system administrator) */
export const aircraftService = {
  list: async (params: AircraftListParams = {}) => {
    const res = await getPage<Aircraft, Aircraft>('/admin/aircraft', {}, withDefaults)
    // the API returns the whole fleet: search / filter / page here
    const q = (params.query ?? '').toLowerCase()
    const rows = res.body.items.filter(
      (a) =>
        (!q || `${a.registration} ${a.type} ${a.seat_configuration ?? ''}`.toLowerCase().includes(q)) &&
        (params.is_active === undefined || params.is_active === '' || String(a.is_active) === String(params.is_active))
    )
    const size = params.pageSize ?? 20
    const page = params.current ?? 1
    return ok({ total: rows.length, items: rows.slice((page - 1) * size, page * size) })
  },
  getById: async (id: number) =>
    ok(withDefaults((await client.get<ApiData<Aircraft>>(`/admin/aircraft/${id}`)).data)),
  create: (payload: AircraftBody) =>
    action(
      client.post<ApiData<Aircraft>>('/admin/aircraft', toBody(payload)),
      withDefaults
    ),
  update: (id: number, payload: AircraftBody) =>
    action(
      client.put<ApiData<Aircraft>>(`/admin/aircraft/${id}`, toBody(payload)),
      withDefaults
    ),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/aircraft/${id}`), () => null),
}

/** Aircraft for select fields, value = aircraft id */
export const aircraftOptions = async () => {
  const res = await client.get<ApiData<Aircraft[]>>('/admin/aircraft')
  return res.data
    .filter((a) => a.is_active)
    .map((a) => ({ label: `${a.registration} · ${a.type}`, value: String(a.id) }))
}
