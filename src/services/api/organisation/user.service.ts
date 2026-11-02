import type {
  PermissionMatrixGroup,
  Role,
  User,
  UserListParams,
  UserPayload,
} from '../../types/organisation/organisation.types'
import {
  action,
  client,
  getPage,
  ok,
  pageQuery,
  type ApiData,
} from '../shared/client'

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
  getById: async (id: number) =>
    ok((await client.get<ApiData<User>>(`/admin/users/${id}`)).data),
  create: (payload: UserPayload) =>
    action(
      client.post<ApiData<User>>('/admin/users', toUserBody(payload)),
      (u) => u
    ),
  update: (id: number, payload: UserPayload) =>
    action(
      client.put<ApiData<User>>(`/admin/users/${id}`, toUserBody(payload)),
      (u) => u
    ),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/users/${id}`), () => null),
  /** Lost phone: turns Google Authenticator off (system administrators only) */
  resetTwoFactor: (id: number) =>
    action(
      client.delete<ApiData<User>>(`/admin/users/${id}/two-factor`),
      (u) => u
    ),
  /** Roles this administrator may assign */
  roleOptions: async () => {
    const res = await client.get<
      ApiData<{ id: number; name: string; scope: string }[]>
    >('/admin/users/role-options')
    return res.data.map((r) => ({
      label: `${r.name} (${r.scope})`,
      value: String(r.id),
    }))
  },
}

export interface RolePayload {
  name: string
  slug: string
  scope: Role['scope']
  /** system administrators: the airline the role belongs to (null = shared) */
  airline_id?: number | null
  permissions: string[]
}

/** /admin/roles (roles.*): airline administrators manage their airline's roles within their own permissions */
export const roleService = {
  list: async () => {
    const res = await client.get<ApiData<Role[]>>('/admin/roles')
    return ok({
      total: res.data.length,
      items: res.data.map((r) => ({ ...r, permissions: r.permissions ?? [] })),
    })
  },
  getById: async (id: number) =>
    ok((await client.get<ApiData<Role>>(`/admin/roles/${id}`)).data),
  remove: (id: number) =>
    action(client.delete<ApiData<null>>(`/admin/roles/${id}`), () => null),
  save: (payload: RolePayload, id?: number) =>
    action(
      id
        ? client.put<ApiData<Role>>(`/admin/roles/${id}`, payload)
        : client.post<ApiData<Role>>('/admin/roles', payload),
      (r) => r
    ),
  /** GET /admin/permissions — the menu permission matrix */
  matrix: async () =>
    (await client.get<ApiData<PermissionMatrixGroup[]>>('/admin/permissions'))
      .data,
  options: async () => {
    const res = await client.get<ApiData<Role[]>>('/admin/roles')
    return ok(res.data.map((r) => ({ label: r.name, value: String(r.id) })))
  },
}
