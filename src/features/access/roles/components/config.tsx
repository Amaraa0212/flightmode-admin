import { roleService, type Role } from '@/services'
import { ROLE_SCOPE, ROLE_SCOPE_OPTIONS } from '@/constants/status'
import { chip, col, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

/** Permission groups (App\Enums\PermissionKey prefixes) */
export const PERMISSION_GROUPS: { title: string; prefixes: string[] }[] = [
  {
    title: 'Dashboard & reports',
    prefixes: ['dashboard', 'reports', 'activity_logs'],
  },
  {
    title: 'Organisation',
    prefixes: ['airlines', 'agencies', 'users', 'roles', 'reference'],
  },
  {
    title: 'Fleet & products',
    prefixes: ['aircraft', 'fares', 'products', 'seat_blocks'],
  },
  {
    title: 'Flights & sales',
    prefixes: [
      'flights',
      'allocations',
      'bookings',
      'charters',
      'announcements',
    ],
  },
  { title: 'Airport & agency apps', prefixes: ['dcs', 'gate', 'agency'] },
]

export const pageConfig: Omit<
  ResourcePageProps<Role>,
  'search' | 'navigate'
> = {
  title: 'Roles & permission',
  description:
    'Roles by scope (system, airline, airport, agency) and their permissions',
  queryKey: 'admin-roles',
  list: roleService.list,
  searchPlaceholder: 'Role name or slug',
  columns: [
    col<Role>('name', 'Role', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<Role>('slug', 'Slug', (r) => mono(r.slug)),
    col<Role>('scope', 'Scope', (r) => chip(r.scope, ROLE_SCOPE)),
    col<Role>(
      'permissions',
      'Permissions',
      (r) =>
        mono(
          `${r.permissions.length} / ${roleService.permissionKeys().length}`
        ),
      { accessor: (r) => r.permissions.length }
    ),
    col<Role>('users_count', 'Users', (r) => mono(r.users_count)),
  ],
  remove: { run: (r) => roleService.remove(r.id), label: (r) => r.name },
}

export { ROLE_SCOPE_OPTIONS }
