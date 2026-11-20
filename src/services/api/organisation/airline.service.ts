import type {
  Airline,
  AirlinePayload,
} from '../../types/organisation/organisation.types'
import type { ListParams } from '../../types/shared/common.types'
import {
  action,
  client,
  getPage,
  ok,
  pageQuery,
  type ApiData,
} from '../shared/client'

/** /admin/airlines — a non-system administrator sees only their own airline */
const toAirline = (a: Airline): Airline => ({
  ...a,
  agencies_count: Array.isArray(a.agencies)
    ? a.agencies.length
    : (a.agencies_count ?? 0),
})

export const airlineService = {
  list: (params: ListParams = {}) =>
    getPage<Airline, Airline>('/admin/airlines', pageQuery(params), toAirline),
  getById: async (id: number) =>
    ok(
      toAirline(
        (await client.get<ApiData<Airline>>(`/admin/airlines/${id}`)).data
      )
    ),
  create: (payload: AirlinePayload) =>
    action(
      client.post<ApiData<Airline>>('/admin/airlines', payload),
      toAirline
    ),
  update: (id: number, payload: AirlinePayload) =>
    action(
      client.put<ApiData<Airline>>(`/admin/airlines/${id}`, payload),
      toAirline
    ),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/airlines/${id}`), () => null),
  /** Logo for the e-ticket, boarding pass and bag tag (PNG / JPG / WEBP, up to 2 MB) */
  uploadLogo: (id: number, file: File) => {
    const form = new FormData()
    form.append('logo', file)
    return action(
      client.upload<ApiData<Airline>>(`/admin/airlines/${id}/logo`, form),
      toAirline
    )
  },
  removeLogo: (id: number) =>
    action(
      client.delete<ApiData<Airline>>(`/admin/airlines/${id}/logo`),
      toAirline
    ),
}
