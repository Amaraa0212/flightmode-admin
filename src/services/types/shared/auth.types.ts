/** GET /auth/me (flightmode-api AuthController::profile) */
export interface AuthUser {
  id: number
  name: string
  email: string
  role: {
    id: number
    name: string
    slug: string
    scope: 'admin' | 'airline' | 'airport' | 'agency'
  } | null
  airline: { id: number; name: string } | null
  agency: { id: number; name: string } | null
  airport: {
    id: number
    iata_code: string
    name: string
    city: string | null
  } | null
  /** permission keys, e.g. flights.view — every key for a system administrator */
  permissions: string[]
  is_system_admin: boolean
  /** Google Authenticator on: login asks for a 6-digit code */
  two_factor_enabled?: boolean
  /** Sidebar the user may see (menus table, filtered by role scope and permissions) */
  menus: AuthMenuGroup[]
}

/** A menu entry of /auth/me; `key` is the prefix of its permissions (flights → flights.view, flights.create ...) */
export interface AuthMenu {
  id: number
  key: string | null
  name: string
  icon: string | null
  path: string | null
  /** permission needed to see it */
  permission: string | null
  children: AuthMenu[]
}

export interface AuthMenuGroup {
  id: number
  name: string
  items: AuthMenu[]
}

/** POST /auth/login, POST /auth/two-factor-challenge */
export interface LoginResponse {
  token: string
  user: AuthUser
}

/** /auth/login when Google Authenticator is on → POST /auth/two-factor-challenge */
export interface TwoFactorChallenge {
  two_factor_required: true
  challenge: string
}

export type LoginResult = LoginResponse | TwoFactorChallenge

/** POST /auth/two-factor/setup */
export interface TwoFactorSetup {
  secret: string
  otpauth_url: string
}

export interface LoginParams {
  email: string
  password: string
}
