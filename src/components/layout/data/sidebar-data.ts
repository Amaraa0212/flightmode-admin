import type { AuthMenu, AuthUser } from '@/services/types/shared/auth.types'
import { type NavGroup, type NavItem, type SidebarData } from '../types'
import { menuIcon } from './menu-icons'

/** Sidebar user block defaults; the menu itself comes from the API (/auth/me → menus, Access → Menus) */
export const sidebarData: SidebarData = {
  user: { name: 'Admin', email: 'admin@flightmode.mn', avatar: '' },
  teams: [],
  navGroups: [],
}

function toNavItem(menu: AuthMenu): NavItem {
  const icon = menuIcon(menu.icon)
  if (menu.children.length > 0) {
    return {
      title: menu.name,
      icon,
      items: menu.children
        .filter((child) => child.path)
        .map((child) => ({
          title: child.name,
          url: child.path!,
          icon: menuIcon(child.icon),
        })),
    }
  }
  return { title: menu.name, url: menu.path ?? '/', icon }
}

/** The user's sidebar: the API already left out what their role scope / permissions do not allow */
export function visibleNavGroups(user: AuthUser | null): NavGroup[] {
  return (user?.menus ?? [])
    .map((group) => ({
      title: group.name,
      items: group.items
        .map(toNavItem)
        // an agency administrator manages their own ticketing agents on the users page
        .map((item) =>
          user?.role?.scope === 'agency' && item.url === '/access/users'
            ? { ...item, title: 'Агентууд' }
            : item
        ),
    }))
    .filter((group) => group.items.length > 0)
}

/** Any screen at all — a gate-only login uses the gate app */
export function hasBackOfficeAccess(user: AuthUser) {
  return visibleNavGroups(user).length > 0
}

/** URL of the first menu entry the user may open */
export function firstAllowedUrl(user: AuthUser | null): string | undefined {
  const first = visibleNavGroups(user)[0]?.items[0]
  if (!first) return undefined
  return String(first.items ? first.items[0]?.url : first.url)
}

/** Every page menu of the user (sub-menus included) */
function userMenus(user: AuthUser | null): AuthMenu[] {
  const all: AuthMenu[] = []
  const walk = (menus: AuthMenu[]) =>
    menus.forEach((menu) => {
      if (menu.path) all.push(menu)
      walk(menu.children)
    })
  user?.menus.forEach((group) => walk(group.items))
  return all
}

/** The menu a URL belongs to: the entry with the longest matching path (/operations/flights/12 → All flights) */
export function menuForPath(
  user: AuthUser | null,
  pathname: string
): AuthMenu | undefined {
  const path = pathname.replace(/\/+$/, '') || '/'
  let match: AuthMenu | undefined
  for (const menu of userMenus(user)) {
    const url = menu.path!
    if (
      url === '/' ? path !== '/' : !(path === url || path.startsWith(`${url}/`))
    )
      continue
    if (!match || url.length > match.path!.length) match = menu
  }
  return match
}

/**
 * Whether the user may open a URL typed in by hand: it has to belong to one of their menus.
 * The dashboard route itself sends users without it to their first screen.
 */
export function canOpenPath(user: AuthUser | null, pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return true
  return menuForPath(user, path) !== undefined
}
