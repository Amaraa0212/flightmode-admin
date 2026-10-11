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

export interface Agency extends Record<string, unknown> {
  id: number
  name: string
  code: string
  email: string
  phone: string
  address: string
  registration_no: string
  api_enabled: boolean
  is_active: boolean
  airlines: { id: number; name: string; contract_active: boolean }[]
}

export interface AgencyListParams extends ListParams {
  is_active?: string
  api_enabled?: string
}

export interface AgencyPayload {
  name: string
  code: string
  email: string
  phone: string
  address: string
  registration_no: string
  api_enabled: boolean
  is_active: boolean
}

export interface Role extends Record<string, unknown> {
  id: number
  name: string
  slug: string
  scope: RoleScope
  permissions: string[]
  users_count: number
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
