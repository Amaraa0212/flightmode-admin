import type { ListParams } from '../shared/common.types'

export type RoleScope = 'admin' | 'airline' | 'agency' | 'airport'

export interface Airline extends Record<string, unknown> {
  id: number
  name: string
  iata_code: string
  icao_code: string
  numeric_code: string
  email: string
  phone: string
  address: string
  registration_no: string
  brand_color: string
  currency: string
  is_active: boolean
  agencies_count: number
}

export interface AirlinePayload {
  name: string
  iata_code: string
  icao_code: string
  numeric_code: string
  email: string
  phone: string
  currency: string
  is_active: boolean
}

/** Sales channel: a travel agency, or the airline's own ticket office / web / call center */
export type AgencyChannel = 'agency' | 'ticket_office' | 'web' | 'call_center'

export interface Agency extends Record<string, unknown> {
  id: number
  name: string
  channel: AgencyChannel
  /** set: a sales channel of this airline only (other airlines never see it) */
  owner_airline_id: number | null
  code: string
  email: string
  phone: string
  address: string
  registration_no: string
  api_enabled: boolean
  /** its allocations are pushed to the Chinggis agent API */
  chinggis_sync: boolean
  is_active: boolean
  airlines: { id: number; name: string; contract_active: boolean }[]
}

export interface AgencyListParams extends ListParams {
  is_active?: string
  api_enabled?: string
  channel?: string[]
}

export interface AgencyPayload {
  name: string
  channel: AgencyChannel
  code: string
  email: string
  phone: string
  address: string
  registration_no: string
  api_enabled: boolean
  chinggis_sync: boolean
  is_active: boolean
}

export interface Role extends Record<string, unknown> {
  id: number
  name: string
  slug: string
  scope: RoleScope
  is_system: boolean
  /** set: a role the airline made for its own staff; null: shared */
  airline_id: number | null
  airline: { id: number; name: string; iata_code: string } | null
  /** false: a shared role (for airline users), another airline's or their own */
  editable: boolean
  permissions: string[]
  users_count: number
}

/** GET /admin/permissions: menu groups → menus → actions the signed-in user may grant */
export interface PermissionMatrixGroup {
  id: number | null
  name: string
  menus: {
    id: number
    key: string
    name: string
    scopes: RoleScope[] | null
    is_active: boolean
    permissions: { key: string; action: string; name: string }[]
  }[]
}

export interface User extends Record<string, unknown> {
  id: number
  name: string
  email: string
  phone: string
  is_active: boolean
  role: { id: number; name: string; slug: string; scope: RoleScope }
  airline: { id: number; name: string } | null
  agency: { id: number; name: string } | null
  airport: { id: number; iata_code: string; name?: string } | null
  /** Google Authenticator on (login asks for a 6-digit code) */
  two_factor_enabled?: boolean
  last_login_at: string | null
  created_at: string
}

export interface UserListParams extends ListParams {
  scope?: string
  is_active?: string
}

export interface UserPayload {
  name: string
  email: string
  phone: string
  role_id: string
  /** required when creating; empty on edit keeps the current password */
  password?: string
  airline_id?: string
  airport_id?: string
  agency_id?: string
  is_active: boolean
}

/** GET /admin/menus: a menu with its sub-menus and the permissions it owns */
export interface AdminMenu {
  id: number
  parent_id: number | null
  menu_group_id: number | null
  key: string | null
  name: string
  icon: string | null
  path: string | null
  /** permission needed to see it when it owns none (agency pages: agency.portal) */
  permission_key: string | null
  scopes: RoleScope[] | null
  order: number
  is_active: boolean
  /** a key the API routes check: cannot be renamed or deleted */
  is_system: boolean
  permissions: {
    id: number
    key: string
    action: string
    name: string
    is_system: boolean
  }[]
  children: AdminMenu[]
}

export interface AdminMenuGroup {
  id: number | null
  name: string
  order: number
  menus: AdminMenu[]
}

export interface AdminMenuPayload {
  parent_id: number | null
  menu_group_id: number | null
  key: string | null
  name: string
  icon: string | null
  path: string | null
  permission_key: string | null
  scopes: RoleScope[] | null
  order: number
  is_active: boolean
  /** create only: permissions to make, default view / create / update / delete */
  actions?: string[]
}

/** GET /admin/ip-access */
export interface AirlineIpAccess {
  airline: { id: number; name: string; iata_code: string }
  enabled: boolean
  addresses: {
    id: number
    ip: string
    note: string | null
    created_at: string
  }[]
}
