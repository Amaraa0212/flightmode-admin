import type {
  Role,
  User,
  UserListParams,
  UserPayload,
} from '../../types/organisation/organisation.types'
import { action, client, getPage, ok, pageQuery, type ApiData } from '../shared/client'

/** Every permission key of flightmode-api (App\Enums\PermissionKey) */
const PERMISSION_KEYS = [
  'dashboard.view', 'airlines.manage', 'agencies.manage', 'users.manage', 'roles.manage',
  'reference.manage', 'aircraft.manage', 'fares.manage', 'products.manage', 'flights.view',
  'flights.manage', 'flights.operate', 'seat_blocks.manage', 'allocations.manage', 'inventory.view',
  'inventory.manage', 'bookings.view',
  'bookings.manage', 'reports.view', 'activity_logs.view', 'announcements.manage', 'charters.view',
  'charters.manage', 'agency.portal', 'dcs.access', 'dcs.checkin', 'gate.access',
] as const

/** Form values → API (selects hold strings, empty = none) */
function toUserBody(p: UserPayload) {
  const id = (v?: string) => (v ? Number(v) : null)
  return {
    name: p.name,
    email: p.email,
    phone: p.phone || null,
    role_id: Number(p.role_id),
    airline_id: id(p.airline_id),
    airport_id: id(p.airport_id),
    agency_id: id(p.agency_id),
    is_active: p.is_active,
    ...(p.password ? { password: p.password } : {}),
  }
}

/** /admin/users — airline admins see their airline's staff and its agencies' users */
export const userService = {
  list: (params: UserListParams = {}) =>
    getPage<User, User>('/admin/users', pageQuery(params), (u) => u),
  getById: async (id: number) => ok((await client.get<ApiData<User>>(`/admin/users/${id}`)).data),
  create: (payload: UserPayload) =>
    action(client.post<ApiData<User>>('/admin/users', toUserBody(payload)), (u) => u),
  update: (id: number, payload: UserPayload) =>
    action(client.put<ApiData<User>>(`/admin/users/${id}`, toUserBody(payload)), (u) => u),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/users/${id}`), () => null),
  /** Roles this administrator may assign */
  roleOptions: async () => {
    const res = await client.get<ApiData<{ id: number; name: string; scope: string }[]>>(
      '/admin/users/role-options'
    )
    return res.data.map((r) => ({ label: `${r.name} (${r.scope})`, value: String(r.id) }))
  },
}

export interface RolePayload {
  name: string
  slug: string
  scope: Role['scope']
  permissions: string[]
}

/** /admin/roles (roles.manage) */
export const roleService = {
  list: async () => {
    const res = await client.get<ApiData<Role[]>>('/admin/roles')
    return ok({ total: res.data.length, items: res.data.map((r) => ({ ...r, permissions: r.permissions ?? [] })) })
  },
  getById: async (id: number) => ok((await client.get<ApiData<Role>>(`/admin/roles/${id}`)).data),
  remove: (id: number) => action(client.delete<ApiData<null>>(`/admin/roles/${id}`), () => null),
  save: (payload: RolePayload, id?: number) =>
    action(
      id
        ? client.put<ApiData<Role>>(`/admin/roles/${id}`, payload)
        : client.post<ApiData<Role>>('/admin/roles', payload),
      (r) => r
    ),
  permissionKeys: (): string[] => [...PERMISSION_KEYS],
  options: async () => {
    const res = await client.get<ApiData<Role[]>>('/admin/roles')
    return ok(res.data.map((r) => ({ label: r.name, value: String(r.id) })))
  },
}
