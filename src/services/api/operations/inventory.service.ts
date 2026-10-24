import type {
  AllocationCabinPayload,
  CabinLimitPayload,
  FlightInventory,
  InventoryApplyResult,
  InventoryFlight,
  InventoryTemplate,
  InventoryTemplatePayload,
  RbdLimitPayload,
  RollForwardPayload,
} from '../../types/operations/inventory.types'
import { action, client, getPage, ok, type ApiData } from '../shared/client'

/*
| Seat allocations (flightmode-api InventoryController): cabin seats and nested RBD limits per flight.
| Every write returns the fresh FlightInventory, so the screen never computes availability itself.
*/

const base = (flightId: number) => `/admin/flights/${flightId}/inventory`

export const inventoryService = {
  flights: async (query: {
    from?: string
    to?: string
    flight_number?: string
  }) =>
    ok(
      (
        await client.get<ApiData<InventoryFlight[]>>(
          '/admin/inventory/flights',
          query
        )
      ).data
    ),

  get: async (flightId: number) =>
    ok((await client.get<ApiData<FlightInventory>>(base(flightId))).data),

  saveCabins: (flightId: number, cabins: CabinLimitPayload[]) =>
    action(
      client.put<ApiData<FlightInventory>>(`${base(flightId)}/cabins`, {
        cabins,
      }),
      (r) => r
    ),

  saveRbds: (flightId: number, rbds: RbdLimitPayload[]) =>
    action(
      client.put<ApiData<FlightInventory>>(`${base(flightId)}/rbds`, { rbds }),
      (r) => r
    ),

  updateRbd: (
    flightId: number,
    rbdId: number,
    payload: { seats?: number; is_closed?: boolean }
  ) =>
    action(
      client.patch<ApiData<FlightInventory>>(
        `${base(flightId)}/rbds/${rbdId}`,
        payload
      ),
      (r) => r
    ),

  removeRbd: (flightId: number, rbdId: number) =>
    action(
      client.delete<ApiData<FlightInventory>>(
        `${base(flightId)}/rbds/${rbdId}`
      ),
      (r) => r
    ),

  /** From a template, or from the aircraft cabins with every active class fully open */
  initialize: (
    flightId: number,
    payload: { template_id?: number; overwrite?: boolean } = {}
  ) =>
    action(
      client.post<ApiData<FlightInventory>>(
        `${base(flightId)}/initialize`,
        payload
      ),
      (r) => r
    ),

  reset: (flightId: number) =>
    action(client.delete<ApiData<FlightInventory>>(base(flightId)), (r) => r),

  rollForward: (flightId: number, payload: RollForwardPayload) =>
    action(
      client.post<ApiData<InventoryApplyResult[]>>(
        `${base(flightId)}/roll-forward`,
        payload
      ),
      (r) => r
    ),

  applyTemplate: (templateId: number, flightIds: number[], overwrite = false) =>
    action(
      client.post<ApiData<InventoryApplyResult[]>>(
        '/admin/inventory/apply-template',
        {
          template_id: templateId,
          flight_ids: flightIds,
          overwrite,
        }
      ),
      (r) => r
    ),
}

/** Agency allocations edited per cabin from the seat allocation screen (flightmode-api AllocationController) */
export const inventoryAllocationService = {
  save: (payload: AllocationCabinPayload, id?: number) => {
    const cabins = Object.fromEntries(
      Object.entries(payload.cabins).filter(([, seats]) => (seats ?? 0) > 0)
    )
    const body = {
      ...payload,
      cabins,
      seats: Object.values(cabins).reduce((sum, n) => sum + (n ?? 0), 0),
    }
    return action(
      id
        ? client.put<ApiData<unknown>>(`/admin/allocations/${id}`, body)
        : client.post<ApiData<unknown>>('/admin/allocations', body),
      () => null
    )
  },
  remove: (id: number) =>
    action(
      client.delete<ApiData<null>>(`/admin/allocations/${id}`),
      () => null
    ),
}

export const inventoryTemplateService = {
  all: () =>
    getPage<InventoryTemplate, InventoryTemplate>(
      '/admin/inventory-templates',
      { per_page: 500 },
      (r) => r
    ),
  fromFlight: (
    flightId: number,
    payload: { name: string; description?: string }
  ) =>
    action(
      client.post<ApiData<InventoryTemplate>>(
        `/admin/inventory-templates/from-flight/${flightId}`,
        payload
      ),
      (r) => r
    ),
  update: (id: number, payload: InventoryTemplatePayload) =>
    action(
      client.put<ApiData<InventoryTemplate>>(
        `/admin/inventory-templates/${id}`,
        payload
      ),
      (r) => r
    ),
  remove: (id: number) =>
    action(
      client.delete<ApiData<null>>(`/admin/inventory-templates/${id}`),
      () => null
    ),
}

export const inventoryTemplateOptions = async () =>
  ((await inventoryTemplateService.all()).body.items ?? []).map((t) => ({
    label: t.aircraft ? `${t.name} · ${t.aircraft.registration}` : t.name,
    value: String(t.id),
  }))
