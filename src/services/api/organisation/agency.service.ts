import type {
  Agency,
  AgencyListParams,
  AgencyPayload,
} from '../../types/organisation/organisation.types'
import {
  action,
  client,
  getPage,
  ok,
  pageQuery,
  type ApiData,
} from '../shared/client'

/** /admin/agencies — airline users see the agencies contracted with their airline */
const toAgency = (a: Agency): Agency => ({ ...a, airlines: a.airlines ?? [] })

export const agencyService = {
  list: (params: AgencyListParams = {}) =>
    getPage<Agency, Agency>('/admin/agencies', pageQuery(params), toAgency),
  /** Agents permission: also the agencies the airline has no contract with yet */
  contractable: (params: AgencyListParams = {}) =>
    getPage<Agency, Agency>(
      '/admin/agencies',
      { ...pageQuery(params), for_contract: 1 },
      toAgency
    ),
  getById: async (id: number) =>
    ok(
      toAgency(
        (await client.get<ApiData<Agency>>(`/admin/agencies/${id}`)).data
      )
    ),
  create: (payload: AgencyPayload) =>
    action(
      client.post<ApiData<Agency>>('/admin/agencies', {
        ...payload,
        code: payload.code.toUpperCase(),
        // 'all': shared, with a contract with every airline there is now
        owner_airline_id:
          payload.owner_airline_id && payload.owner_airline_id !== 'all'
            ? Number(payload.owner_airline_id)
            : null,
        all_airlines: payload.owner_airline_id === 'all',
      }),
      toAgency
    ),
  /** `ownerChanged`: a system administrator changed whose agency it is (or links it with every airline) */
  update: (id: number, payload: AgencyPayload, ownerChanged = false) =>
    action(
      client.put<ApiData<Agency>>(`/admin/agencies/${id}`, {
        ...payload,
        ...(ownerChanged
          ? {
              owner_airline_id:
                payload.owner_airline_id && payload.owner_airline_id !== 'all'
                  ? Number(payload.owner_airline_id)
                  : null,
              all_airlines: payload.owner_airline_id === 'all',
            }
          : { owner_airline_id: undefined, all_airlines: undefined }),
        code: payload.code.toUpperCase(),
      }),
      toAgency
    ),
  /** The Chinggis push of an agency the airline only has a contract with (the rest is its creator's) */
  setChinggisSync: (id: number, on: boolean) =>
    action(
      client.put<ApiData<Agency>>(`/admin/agencies/${id}`, {
        chinggis_sync: on,
      }),
      toAgency
    ),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/agencies/${id}`), () => null),
}

/** Agents permission: airline ↔ agency contract (PUT/DELETE /admin/airlines/{airline}/agencies/{agency}) */
export const agencyContractService = {
  setContract: async (
    agencyId: number,
    airlineId: number,
    active: boolean | null
  ) => {
    if (active === null) {
      await client.delete(`/admin/airlines/${airlineId}/agencies/${agencyId}`)
    } else {
      await client.put(`/admin/airlines/${airlineId}/agencies/${agencyId}`, {
        is_active: active,
      })
    }
    const agency = (
      await client.get<ApiData<Agency>>(`/admin/agencies/${agencyId}`)
    ).data
    return ok(
      toAgency(agency),
      active === null
        ? 'Contract removed'
        : active
          ? 'Contract activated'
          : 'Contract suspended'
    )
  },
  /** What the agency may do on the airline's flights besides selling */
  setRights: (
    agencyId: number,
    airlineId: number,
    rights: { can_import_passengers?: boolean; can_assign_seats?: boolean }
  ) =>
    action(
      client.put<ApiData<null>>(
        `/admin/airlines/${airlineId}/agencies/${agencyId}`,
        rights
      ),
      () => null
    ),

  airlines: async () => {
    const res = await client.get<{
      data: { id: number; name: string; iata_code: string }[]
    }>('/admin/airlines', { per_page: 100 })
    return ok(
      res.data.map((a) => ({ id: a.id, name: a.name, iata_code: a.iata_code }))
    )
  },
}

/** Active agencies for select fields */
export const agencyOptions = async () => {
  const res = await client.get<{ data: Agency[] }>('/admin/agencies', {
    per_page: 200,
  })
  return res.data
    .filter((a) => a.is_active)
    .map((a) => ({ label: `${a.code} · ${a.name}`, value: String(a.id) }))
}

/**
 * Agencies for giving quota: `suspended` when no active contract (Agents permission) — those are not offered,
 * only shown on quota they already have. An airline user's agency lists only their own airline's contract.
 */
export const quotaAgencyOptions = async () => {
  const res = await client.get<{ data: Agency[] }>('/admin/agencies', {
    per_page: 200,
  })
  return res.data
    .filter((a) => a.is_active)
    .map((a) => {
      const suspended = !(a.airlines ?? []).some((c) => c.contract_active)
      return {
        label: `${a.code} · ${a.name}${suspended ? ' (suspended)' : ''}`,
        value: String(a.id),
        suspended,
      }
    })
}

/** One agency contract with its prepaid balance (null until the first top-up: no balance check yet) */
export interface AgencyAccountRow extends Record<string, unknown> {
  agency_id: number
  agency: string
  contract_active: boolean
  airline: { id: number; name: string; iata_code: string }
  account_id: number | null
  balance: string | null
  currency: string
  updated_at: string | null
}

export interface AgencyAccountTransactionRow {
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

/** /admin/agency-accounts — prepaid agency balances: list, top up / adjust, movements */
export const agencyAccountService = {
  list: async (search?: string) =>
    ok(
      (
        await client.get<ApiData<AgencyAccountRow[]>>(
          '/admin/agency-accounts',
          {
            search,
          }
        )
      ).data
    ),
  topUp: (payload: {
    agency_id: number
    airline_id: number
    amount: number
    type: 'topup' | 'adjustment'
    note: string
  }) =>
    action(
      client.post<ApiData<AgencyAccountTransactionRow>>(
        '/admin/agency-accounts/top-up',
        payload
      ),
      (r) => r
    ),
  transactions: async (accountId: number) =>
    ok(
      (
        await client.get<ApiData<AgencyAccountTransactionRow[]>>(
          `/admin/agency-accounts/${accountId}/transactions`,
          { per_page: 100 }
        )
      ).data
    ),
}
