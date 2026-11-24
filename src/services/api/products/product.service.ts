import type {
  BaggageRuleGroup,
  BaggageRuleGroupPayload,
  BaggageSsrRow,
  Fare,
  FareListParams,
  FarePayload,
} from '../../types/products/product.types'
import type { ListParams } from '../../types/shared/common.types'
import { action, client, getPage, ok, pageQuery, type ApiData } from '../shared/client'

/** Decimals arrive as strings ("595000.00") */
const toFare = (f: Fare): Fare => ({
  ...f,
  base_amount: Number(f.base_amount),
  tax_amount: Number(f.tax_amount ?? 0),
  total_amount: Number(f.total_amount),
  child_discount_percent: Number(f.child_discount_percent ?? 0),
  infant_discount_percent: Number(f.infant_discount_percent ?? 0),
})

const fareBody = (p: FarePayload) => ({
  origin_airport_id: Number(p.origin_airport_id),
  destination_airport_id: Number(p.destination_airport_id),
  trip_type: p.trip_type,
  cabin_class: p.cabin_class,
  fare_class: p.fare_class.trim().toUpperCase(),
  valid_from: p.valid_from,
  valid_to: p.valid_to,
  base_amount: Number(p.base_amount),
  tax_amount: Number(p.tax_amount),
  child_discount_percent: Number(p.child_discount_percent),
  infant_discount_percent: Number(p.infant_discount_percent),
  is_active: p.is_active,
})

/** /admin/fares — search: "UBN-PQC" (direction), an airport or an RBD letter */
export const fareService = {
  list: (params: FareListParams = {}) =>
    getPage<Fare, Fare>('/admin/fares', pageQuery(params), toFare),
  create: (payload: FarePayload) =>
    action(client.post<ApiData<Fare>>('/admin/fares', fareBody(payload)), toFare),
  update: (id: number, payload: FarePayload) =>
    action(client.put<ApiData<Fare>>(`/admin/fares/${id}`, fareBody(payload)), toFare),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/fares/${id}`), () => null),
}

type ApiBaggageRuleGroup = {
  id: number
  name: string
  type: BaggageRuleGroup['type']
  cabin_class: BaggageRuleGroup['cabin_class']
  max_quantity: number | null
  currency: string
  is_active: boolean
  rules?: {
    id: number
    ssr_code: string | null
    pieces: number | null
    weight_kg: string | number | null
    price: string | number | null
  }[]
}

const optionalNumber = (v: unknown) => (v === null || v === undefined || v === '' ? undefined : Number(v))

const toBaggageRuleGroup = (g: ApiBaggageRuleGroup): BaggageRuleGroup => ({
  ...g,
  rules: (g.rules ?? []).map((r) => ({
    rule_id: r.id,
    ssr_code: (r.ssr_code ?? '').toUpperCase() as BaggageSsrRow['ssr_code'],
    pieces: optionalNumber(r.pieces),
    weight_kg: optionalNumber(r.weight_kg),
    price: optionalNumber(r.price),
  })),
})

const baggageRuleGroupBody = (p: BaggageRuleGroupPayload) => ({
  name: p.name.trim(),
  type: p.type,
  cabin_class: p.cabin_class === 'ALL' ? null : p.cabin_class,
  // 0 = unlimited for the counter
  max_quantity: Number(p.max_quantity) > 0 ? Number(p.max_quantity) : null,
  is_active: p.is_active,
  rules: p.rules.map((r) => ({
    id: r.rule_id ?? null,
    ssr_code: r.ssr_code,
    pieces: r.pieces ?? null,
    weight_kg: r.weight_kg ?? null,
    // FBAG is the free allowance: never priced
    price: r.ssr_code === 'FBAG' ? 0 : (r.price ?? 0),
  })),
})

const first = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[]

/**
 * /admin/baggage-rule-groups — a bag's details with one row per SSR (each saved as a baggage rule).
 * A short list per airline, so search / filters / paging run here.
 */
export const baggageRuleGroupService = {
  list: async (params: ListParams = {}) => {
    const res = await client.get<ApiData<ApiBaggageRuleGroup[]>>('/admin/baggage-rule-groups', { per_page: 500 })
    const q = String(params.query ?? '').trim().toLowerCase()
    const ssr = first(params.ssr)
    const type = first(params.type)
    const cabins = first(params.cabin_class)
    const active = first(params.is_active)
    const rows = res.data
      .map(toBaggageRuleGroup)
      .filter(
        (g) =>
          (!q || `${g.name} ${g.rules.map((r) => r.ssr_code).join(' ')}`.toLowerCase().includes(q)) &&
          (!ssr.length || g.rules.some((r) => ssr.includes(r.ssr_code))) &&
          (!type.length || type.includes(g.type)) &&
          (!cabins.length || cabins.includes(g.cabin_class ?? 'ALL')) &&
          (!active.length || active.includes(String(g.is_active)))
      )
    const size = params.pageSize ?? 20
    const page = params.current ?? 1
    return ok({ total: rows.length, items: rows.slice((page - 1) * size, page * size) })
  },
  create: (payload: BaggageRuleGroupPayload) =>
    action(
      client.post<ApiData<ApiBaggageRuleGroup>>('/admin/baggage-rule-groups', baggageRuleGroupBody(payload)),
      toBaggageRuleGroup
    ),
  update: (id: number, payload: BaggageRuleGroupPayload) =>
    action(
      client.put<ApiData<ApiBaggageRuleGroup>>(`/admin/baggage-rule-groups/${id}`, baggageRuleGroupBody(payload)),
      toBaggageRuleGroup
    ),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/baggage-rule-groups/${id}`), () => null),
}
