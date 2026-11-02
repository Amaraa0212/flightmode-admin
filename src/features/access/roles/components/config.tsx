import { roleService, type Role } from '@/services'
import { ROLE_SCOPE, ROLE_SCOPE_OPTIONS } from '@/constants/status'
import { chip, col, mono } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<
  ResourcePageProps<Role>,
  'search' | 'navigate'
> = {
  title: 'Roles & permission',
  description:
    'Roles by scope (system, airline, airport, agency) and their menu permissions (view / create / update / delete)',
  queryKey: 'admin-roles',
  list: roleService.list,
  searchPlaceholder: 'Role name or slug',
  columns: [
    col<Role>('name', 'Role', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<Role>('slug', 'Slug', (r) => mono(r.slug)),
    col<Role>('scope', 'Scope', (r) => chip(r.scope, ROLE_SCOPE)),
    col<Role>('airline', 'Airline', (r) =>
      r.airline ? (
        <span>
          {r.airline.iata_code} · {r.airline.name}
        </span>
      ) : (
        <span className='text-muted-foreground'>Shared</span>
      )
    ),
    col<Role>('permissions', 'Permissions', (r) => mono(r.permissions.length), {
      accessor: (r) => r.permissions.length,
    }),
    col<Role>('users_count', 'Users', (r) => mono(r.users_count)),
  ],
  remove: { run: (r) => roleService.remove(r.id), label: (r) => r.name },
}

export { ROLE_SCOPE_OPTIONS }
