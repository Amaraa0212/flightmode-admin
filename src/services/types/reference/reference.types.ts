import type { ListParams } from '../shared/common.types'

export type CabinClass = 'F' | 'C' | 'W' | 'Y'
export type PassengerType = 'ADT' | 'CHD' | 'INF'
export type Gender = 'M' | 'F'

export interface Country {
  id: number
  name: string
  alpha2: string
}

export interface Airport extends Record<string, unknown> {
  id: number
  iata_code: string
  icao_code: string
  name: string
  city: string
  city_code: string
  country: Country | null
  country_id: number
  timezone: string
  latitude: number | null
  longitude: number | null
  is_active: boolean
}

export interface AirportListParams extends ListParams {
  is_active?: string
}

export interface AirportPayload {
  iata_code: string
  icao_code: string
  name: string
  city: string
  city_code: string
  country_id: number
  timezone: string
  is_active: boolean
}

export interface SsrCode extends Record<string, unknown> {
  id: number
  code: string
  name: string
  category: string
}
