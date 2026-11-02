import type { AuthUser } from '@/services/types/shared/auth.types'

/*
| One build serves two sites: the airline back office (admin.skythium.com) and the agency portal (res.skythium.com).
| The portal is the same app branded for travel agencies: picked by the host name (res.*), or by an agency user.
*/

export const APP = {
  name: 'Skythium Admin',
  subtitle: 'Back office',
} as const

export const AGENCY_PORTAL = {
  name: 'Skythium Agency Portal',
  subtitle: 'Reservations',
} as const

/**
 * Host of the agency portal (VITE_AGENCY_PORTAL_HOST=res.skythium.com). When set, agency users signed in elsewhere
 * are sent there and other users on it are sent back to the admin host. Unset: everyone uses the current host.
 */
const PORTAL_HOST = String(import.meta.env.VITE_AGENCY_PORTAL_HOST || '').trim()
const ADMIN_HOST = String(import.meta.env.VITE_ADMIN_HOST || '').trim()

const hostname = () => (typeof window === 'undefined' ? '' : window.location.hostname)

export const isAgencyHost = () => hostname().startsWith('res.') || (!!PORTAL_HOST && hostname() === PORTAL_HOST)

export const isAgencyUser = (user: AuthUser | null | undefined) => user?.role?.scope === 'agency'

/** Name and subtitle for the sidebar, sign-in page and tab title */
export const brandFor = (user?: AuthUser | null) =>
  isAgencyHost() || isAgencyUser(user) ? AGENCY_PORTAL : APP

export function applyDocumentTitle(user?: AuthUser | null) {
  if (typeof document !== 'undefined') document.title = brandFor(user).name
}

/**
 * The host this user belongs on, when it is not the current one: agency users on the portal host, everyone else on
 * the admin host. null = stay.
 */
export function homeHostFor(user: AuthUser): string | null {
  const host = hostname()
  if (isAgencyUser(user)) return PORTAL_HOST && host !== PORTAL_HOST ? PORTAL_HOST : null
  if (!isAgencyHost()) return null
  return ADMIN_HOST || host.replace(/^res\./, 'admin.')
}
