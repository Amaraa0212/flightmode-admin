import type {
  FareClass,
  FareClassPayload,
  FareDiscount,
  FareDiscountPayload,
  FareEntry,
  FareEntryListParams,
  FareEntryPayload,
  FareTax,
  FareTaxPayload,
  Rbd,
  RbdModification,
  RbdModificationPayload,
  RbdPayload,
  TaxCode,
  TaxCodePayload,
} from '../../types/products/fare-setting.types'
import type { ListParams } from '../../types/shared/common.types'
import {
  action,
  client,
  getPage,
  pageQuery,
  type ApiData,
} from '../shared/client'

/** Laravel resource CRUD under /admin/{path} */
function crud<T, P>(path: string, prepare: (p: P) => unknown = (p) => p) {
  return {
    list: (params: ListParams = {}) =>
      getPage<T, T>(`/admin/${path}`, pageQuery(params), (r) => r),
    /** Every row (the fare setting screens are small lists) */
    all: (query: Record<string, unknown> = {}) =>
      getPage<T, T>(`/admin/${path}`, { per_page: 500, ...query }, (r) => r),
    create: (payload: P) =>
      action(
        client.post<ApiData<T>>(`/admin/${path}`, prepare(payload)),
        (r) => r
      ),
    update: (id: number, payload: Partial<P>) =>
      action(
        client.put<ApiData<T>>(`/admin/${path}/${id}`, prepare(payload as P)),
        (r) => r
      ),
    remove: (id: number) =>
      action(client.delete<ApiData<null>>(`/admin/${path}/${id}`), () => null),
  }
}

const upper = (v: string | undefined) => (v ?? '').trim().toUpperCase()

export const rbdService = crud<Rbd, RbdPayload>('rbds', (p) => ({
  ...p,
  code: upper(p.code),
}))

export const fareClassService = {
  ...crud<FareClass, FareClassPayload>('fare-classes', (p) => ({
    ...p,
    booking_code: upper(p.booking_code),
    group_min: p.is_group ? p.group_min : null,
    group_max: p.is_group ? p.group_max : null,
  })),
  createDiscount: (fareClassId: number, payload: FareDiscountPayload) =>
    action(
      client.post<ApiData<FareDiscount>>(
        `/admin/fare-classes/${fareClassId}/discounts`,
        payload
      ),
      (r) => r
    ),
  updateDiscount: (
    fareClassId: number,
    id: number,
    payload: FareDiscountPayload
  ) =>
    action(
      client.put<ApiData<FareDiscount>>(
        `/admin/fare-classes/${fareClassId}/discounts/${id}`,
        payload
      ),
      (r) => r
    ),
  removeDiscount: (fareClassId: number, id: number) =>
    action(
      client.delete<ApiData<null>>(
        `/admin/fare-classes/${fareClassId}/discounts/${id}`
      ),
      () => null
    ),
}

const fareCrud = crud<FareEntry, FareEntryPayload>('fares', (p) => ({
  ...p,
  currency: upper(p.currency) || 'MNT',
}))
export const fareEntryService = {
  ...fareCrud,
  /** Fare-class fares of a route */
  forRoute: (params: FareEntryListParams) => fareCrud.all(params),
}

export const taxCodeService = crud<TaxCode, TaxCodePayload>(
  'tax-codes',
  (p) => ({ ...p, code: upper(p.code) })
)

export const fareTaxService = crud<FareTax, FareTaxPayload>(
  'fare-taxes',
  (p) => ({
    ...p,
    currency: upper(p.currency) || 'MNT',
  })
)

export const rbdModificationService = crud<
  RbdModification,
  RbdModificationPayload
>('rbd-modifications')

/** Select options: value = id */
export const rbdOptions = async () =>
  ((await rbdService.all()).body.items ?? [])
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((r) => ({
      label: `${r.code} · ${r.cabin_class}${r.is_active ? '' : ' (inactive)'}`,
      value: String(r.id),
    }))

export const fareClassOptions = async () =>
  ((await fareClassService.all()).body.items ?? [])
    .sort((a, b) => a.booking_code.localeCompare(b.booking_code))
    .map((c) => ({
      label: `${c.booking_code} · ${c.rbd_code} ${c.trip_type}`,
      value: String(c.id),
    }))

export const taxCodeOptions = async () =>
  ((await taxCodeService.all()).body.items ?? [])
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((t) => ({
      label: t.name ? `${t.code} · ${t.name}` : t.code,
      value: String(t.id),
    }))
