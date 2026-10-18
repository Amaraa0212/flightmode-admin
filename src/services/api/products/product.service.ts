import type {
  BaggageRule,
  BaggageRulePayload,
  BaggageUsage,
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

type ApiBaggageRule = {
  id: number
  name: string
  type: BaggageRule['type']
  ssr_code: string | null
  cabin_class: BaggageRule['cabin_class']
  pieces: number | null
  weight_kg: string | number | null
  max_quantity: number | null
  price: string | number | null
  currency: string
  is_active: boolean
}

const usageOf = (ssr: string | null): BaggageUsage => {
  const code = (ssr ?? '').toUpperCase()
  return code === 'XBAG' ? 'prepaid' : code === 'EBAG' ? 'excess' : 'free'
}

const toBaggageRule = (r: ApiBaggageRule): BaggageRule => ({
  ...r,
  usage: usageOf(r.ssr_code),
  pieces: r.pieces ?? 0,
  weight_kg: Number(r.weight_kg ?? 0),
  price: Number(r.price ?? 0),
})

const baggageRuleBody = (p: BaggageRulePayload) => ({
  name: p.name.trim(),
  type: p.type,
  ssr_code: p.ssr_code ? p.ssr_code.trim().toUpperCase() : null,
  cabin_class: p.cabin_class === 'ALL' ? null : p.cabin_class,
  pieces: Number(p.pieces),
  weight_kg: Number(p.weight_kg),
  // 0 = unlimited for the counter
  max_quantity: Number(p.max_quantity) > 0 ? Number(p.max_quantity) : null,
  price: Number(p.price),
  is_active: p.is_active,
})

const first = (v: unknown) => (Array.isArray(v) ? v : v ? [v] : []) as string[]

/** /admin/baggage-rules — a short list per airline, so search / filters / paging run here */
export const baggageRuleService = {
  list: async (params: ListParams = {}) => {
    const res = await client.get<ApiData<ApiBaggageRule[]>>('/admin/baggage-rules', { per_page: 500 })
    const q = String(params.query ?? '').trim().toLowerCase()
    const usage = first(params.usage)
    const type = first(params.type)
    const cabins = first(params.cabin_class)
    const active = first(params.is_active)
    const rows = res.data
      .map(toBaggageRule)
      .filter(
        (r) =>
          (!q || `${r.name} ${r.ssr_code ?? ''}`.toLowerCase().includes(q)) &&
          (!usage.length || usage.includes(r.usage)) &&
          (!type.length || type.includes(r.type)) &&
          (!cabins.length || cabins.includes(r.cabin_class ?? 'ALL')) &&
          (!active.length || active.includes(String(r.is_active)))
      )
    const size = params.pageSize ?? 20
    const page = params.current ?? 1
    return ok({ total: rows.length, items: rows.slice((page - 1) * size, page * size) })
  },
  create: (payload: BaggageRulePayload) =>
    action(client.post<ApiData<ApiBaggageRule>>('/admin/baggage-rules', baggageRuleBody(payload)), toBaggageRule),
  update: (id: number, payload: BaggageRulePayload) =>
    action(client.put<ApiData<ApiBaggageRule>>(`/admin/baggage-rules/${id}`, baggageRuleBody(payload)), toBaggageRule),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/baggage-rules/${id}`), () => null),
}
