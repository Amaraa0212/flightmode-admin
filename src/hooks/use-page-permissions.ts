import { useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { menuForPath } from '@/components/layout/data/sidebar-data'

/**
 * CRUD permissions of the page the user is on: the menu of the URL (Access → Menus) gives the key,
 * its actions are `{key}.view`, `{key}.create`, `{key}.update`, `{key}.delete` (+ custom ones such as `close`).
 * The API checks the same keys; this only hides the buttons the role cannot use.
 */
export function usePagePermissions() {
  const user = useAuthStore((s) => s.auth.user)
  const pathname = useLocation({ select: (l) => l.pathname })
  const key = menuForPath(user, pathname)?.key ?? null

  const can = (action: string) =>
    !key ||
    (!!user &&
      (user.is_system_admin || user.permissions.includes(`${key}.${action}`)))

  return {
    key,
    can,
    canCreate: can('create'),
    canUpdate: can('update'),
    canDelete: can('delete'),
  }
}
