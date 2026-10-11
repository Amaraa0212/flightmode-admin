/** GET /auth/me (flightmode-api AuthController::profile) */
export interface AuthUser {
  id: number
  name: string
  email: string
  role: { id: number; name: string; slug: string; scope: 'admin' | 'airline' | 'airport' | 'agency' } | null
  airline: { id: number; name: string } | null
  agency: { id: number; name: string } | null
  airport: { id: number; iata_code: string; name: string; city: string | null } | null
  /** permission keys, e.g. flights.view — every key for a system administrator */
  permissions: string[]
  is_system_admin: boolean
}

export interface LoginParams {
  email: string
  password: string
}
