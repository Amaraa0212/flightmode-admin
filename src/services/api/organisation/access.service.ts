import type {
  AdminMenu,
  AdminMenuGroup,
  AdminMenuPayload,
  AirlineIpAccess,
} from '../../types/organisation/organisation.types'
import { action, client, type ApiData } from '../shared/client'

/** /admin/menus, /admin/menu-groups — sidebar menus and their permissions (system administrators) */
export const menuService = {
  tree: async () =>
    (await client.get<ApiData<AdminMenuGroup[]>>('/admin/menus')).data,
  save: (payload: AdminMenuPayload, id?: number) =>
    action(
      id
        ? client.put<ApiData<AdminMenu>>(`/admin/menus/${id}`, payload)
        : client.post<ApiData<AdminMenu>>('/admin/menus', payload),
      (m) => m
    ),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/menus/${id}`), () => null),
  reorder: (items: { id: number; order: number }[]) =>
    action(
      client.put<ApiData<AdminMenuGroup[]>>('/admin/menus/order', { items }),
      (t) => t
    ),
  addAction: (menuId: number, payload: { action: string; name?: string }) =>
    action(
      client.post<ApiData<unknown>>(`/admin/menus/${menuId}/actions`, payload),
      () => null
    ),
  removeAction: (menuId: number, permissionId: number) =>
    action(
      client.delete<ApiData<null>>(
        `/admin/menus/${menuId}/actions/${permissionId}`
      ),
      () => null
    ),
  saveGroup: (payload: { name: string; order?: number }, id?: number) =>
    action(
      id
        ? client.put<ApiData<unknown>>(`/admin/menu-groups/${id}`, payload)
        : client.post<ApiData<unknown>>('/admin/menu-groups', payload),
      () => null
    ),
  removeGroup: (id: number) =>
    action(
      client.delete<ApiData<null>>(`/admin/menu-groups/${id}`),
      () => null
    ),
}

const ipBase = (airlineId: number) => `/admin/ip-access/${airlineId}`

/** /admin/ip-access — airline IP restriction for its back-office staff */
export const ipAccessService = {
  get: async (airlineId?: number) => {
    const res = await client.get<{
      data: AirlineIpAccess | null
      current_ip: string
    }>('/admin/ip-access', airlineId ? { airline_id: airlineId } : {})
    return { access: res.data, currentIp: res.current_ip }
  },
  setEnabled: (airlineId: number, enabled: boolean) =>
    action(
      client.put<ApiData<AirlineIpAccess>>(ipBase(airlineId), { enabled }),
      (a) => a
    ),
  add: (airlineId: number, payload: { ip: string; note?: string }) =>
    action(
      client.post<ApiData<AirlineIpAccess>>(
        `${ipBase(airlineId)}/addresses`,
        payload
      ),
      (a) => a
    ),
  update: (
    airlineId: number,
    id: number,
    payload: { ip: string; note?: string }
  ) =>
    action(
      client.put<ApiData<AirlineIpAccess>>(
        `${ipBase(airlineId)}/addresses/${id}`,
        payload
      ),
      (a) => a
    ),
  remove: (airlineId: number, id: number) =>
    action(
      client.delete<ApiData<AirlineIpAccess>>(
        `${ipBase(airlineId)}/addresses/${id}`
      ),
      (a) => a
    ),
}
