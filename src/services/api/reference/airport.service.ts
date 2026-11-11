import type {
  Airport,
  AirportListParams,
  AirportPayload,
  Country,
} from '../../types/reference/reference.types'
import {
  action,
  client,
  getPage,
  ok,
  pageQuery,
  type ApiData,
} from '../shared/client'

const upper = (p: AirportPayload) => ({
  ...p,
  iata_code: p.iata_code.toUpperCase(),
  icao_code: p.icao_code.toUpperCase(),
  country_id: Number(p.country_id),
})

/** /admin/airports (reference.manage); read-only lists come from /reference/* */
export const airportService = {
  list: (params: AirportListParams = {}) =>
    getPage<Airport, Airport>('/admin/airports', pageQuery(params), (a) => a),
  getById: async (id: number) =>
    ok((await client.get<ApiData<Airport>>(`/admin/airports/${id}`)).data),
  create: (payload: AirportPayload) =>
    action(
      client.post<ApiData<Airport>>('/admin/airports', upper(payload)),
      (a) => a
    ),
  update: (id: number, payload: AirportPayload) =>
    action(
      client.put<ApiData<Airport>>(`/admin/airports/${id}`, upper(payload)),
      (a) => a
    ),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/airports/${id}`), () => null),
  countries: async () =>
    ok((await client.get<ApiData<Country[]>>('/reference/countries')).data),
  /** Every active airport, value = airport id */
  options: async () => ok(await airportOptions()),
}

/** Active airports for select fields — value is the airport id (what the API expects) */
export const airportOptions = async () => {
  const res = await client.get<ApiData<Airport[]>>('/reference/airports')
  return res.data.map((a) => ({
    label: `${a.iata_code} — ${a.city}`,
    value: String(a.id),
    iata_code: a.iata_code,
    timezone: a.timezone,
  }))
}

/** Countries for select fields — value is the countries.id the API stores */
export const countryOptions = async () => {
  const res = await client.get<ApiData<Country[]>>('/reference/countries')
  return res.data.map((c) => ({ label: `${c.name} (${c.alpha2})`, value: String(c.id) }))
}

/** An airport of the worldwide IATA list (not one of the airline's stations) */
export interface IataAirport {
  code: string
  icao: string | null
  name: string
  city: string | null
  city_code: string | null
  timezone: string
  country: string
  country_id: number | null
}

export interface CityOption {
  city: string
  city_code: string | null
  timezone: string
}

export const referenceLookupService = {
  /** One airport of the IATA list by its code, or null */
  iataAirport: async (code: string) =>
    (await client.get<ApiData<IataAirport[]>>('/reference/iata-airports', { code })).data[0] ?? null,
  cities: async (countryId: string, search?: string) =>
    (await client.get<ApiData<CityOption[]>>('/reference/cities', { country_id: countryId, search })).data,
  timezones: async (countryId?: string) =>
    (await client.get<ApiData<string[]>>('/reference/timezones', countryId ? { country_id: countryId } : {})).data,
}

/** Airlines for select fields (a non-system administrator gets only their own) */
export const airlineOptions = async () => {
  const res = await client.get<{
    data: { id: number; name: string; iata_code: string }[]
  }>('/admin/airlines', { per_page: 100 })
  return res.data.map((a) => ({
    label: `${a.iata_code} · ${a.name}`,
    value: String(a.id),
  }))
}
