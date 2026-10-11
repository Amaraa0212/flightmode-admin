import type {
  Agency,
  AgencyListParams,
  AgencyPayload,
} from '../../types/organisation/organisation.types'
import { action, client, getPage, ok, pageQuery, type ApiData } from '../shared/client'

/** /admin/agencies — airline users see the agencies contracted with their airline */
const toAgency = (a: Agency): Agency => ({ ...a, airlines: a.airlines ?? [] })

export const agencyService = {
  list: (params: AgencyListParams = {}) =>
    getPage<Agency, Agency>('/admin/agencies', pageQuery(params), toAgency),
  getById: async (id: number) =>
    ok(toAgency((await client.get<ApiData<Agency>>(`/admin/agencies/${id}`)).data)),
  create: (payload: AgencyPayload) =>
    action(client.post<ApiData<Agency>>('/admin/agencies', { ...payload, code: payload.code.toUpperCase() }), toAgency),
  update: (id: number, payload: AgencyPayload) =>
    action(client.put<ApiData<Agency>>(`/admin/agencies/${id}`, { ...payload, code: payload.code.toUpperCase() }), toAgency),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/agencies/${id}`), () => null),
}

/** Agents permission: airline ↔ agency contract (PUT/DELETE /admin/airlines/{airline}/agencies/{agency}) */
export const agencyContractService = {
  setContract: async (agencyId: number, airlineId: number, active: boolean | null) => {
    if (active === null) {
      await client.delete(`/admin/airlines/${airlineId}/agencies/${agencyId}`)
    } else {
      await client.put(`/admin/airlines/${airlineId}/agencies/${agencyId}`, { is_active: active })
    }
    const agency = (await client.get<ApiData<Agency>>(`/admin/agencies/${agencyId}`)).data
    return ok(
      toAgency(agency),
      active === null ? 'Contract removed' : active ? 'Contract activated' : 'Contract suspended'
    )
  },
  airlines: async () => {
    const res = await client.get<{ data: { id: number; name: string; iata_code: string }[] }>(
      '/admin/airlines',
      { per_page: 100 }
    )
    return ok(res.data.map((a) => ({ id: a.id, name: a.name, iata_code: a.iata_code })))
  },
}

/** Active agencies for select fields */
export const agencyOptions = async () => {
  const res = await client.get<{ data: Agency[] }>('/admin/agencies', { per_page: 200 })
  return res.data
    .filter((a) => a.is_active)
    .map((a) => ({ label: `${a.code} · ${a.name}`, value: String(a.id) }))
}
