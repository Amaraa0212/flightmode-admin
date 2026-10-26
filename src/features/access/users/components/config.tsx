import { z } from 'zod'
import {
  agencyOptions,
  airlineOptions,
  airportOptions,
  userService,
  type User,
} from '@/services'
import {
  ACTIVE_OPTIONS,
  ROLE_SCOPE,
  ROLE_SCOPE_OPTIONS,
  type StatusMeta,
} from '@/constants/status'
import { chip, col, dateTime, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const TWO_FACTOR: Record<string, StatusMeta> = {
  true: { label: 'On', tone: 'green' },
}

const schema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim(),
  role_id: z.string().min(1, 'Role is required'),
  // required for a new user (checked in create); empty on edit keeps the password
  password: z
    .string()
    .refine((v) => v === '' || v.length >= 8, 'At least 8 characters'),
  airline_id: z.string(),
  airport_id: z.string(),
  agency_id: z.string(),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

export const pageConfig: Omit<
  ResourcePageProps<User, Form>,
  'search' | 'navigate'
> = {
  title: 'Users',
  description: 'Back office, station and agency accounts',
  queryKey: 'admin-users',
  list: userService.list,
  searchPlaceholder: 'Name, email or phone',
  filters: [
    { columnId: 'scope', title: 'Scope', options: ROLE_SCOPE_OPTIONS },
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'users.xlsx',
  columns: [
    col<User>('name', 'Name', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<User>('email', 'Email', (r) => muted(r.email)),
    col<User>('phone', 'Phone', (r) => mono(r.phone)),
    col<User>('role', 'Role', (r) => r.role.name, {
      accessor: (r) => r.role.name,
    }),
    col<User>('scope', 'Scope', (r) => chip(r.role.scope, ROLE_SCOPE), {
      accessor: (r) => r.role.scope,
    }),
    col<User>(
      'org',
      'Airline / Agency / Station',
      (r) =>
        muted(
          r.airline?.name ?? r.agency?.name ?? r.airport?.iata_code ?? 'All'
        ),
      {
        accessor: (r) =>
          r.airline?.name ?? r.agency?.name ?? r.airport?.iata_code,
      }
    ),
    col<User>(
      'two_factor_enabled',
      '2FA',
      (r) => (r.two_factor_enabled ? chip('true', TWO_FACTOR) : muted('—')),
      { accessor: (r) => (r.two_factor_enabled ? 'On' : 'Off') }
    ),
    col<User>('last_login_at', 'Last login', (r) => dateTime(r.last_login_at)),
    col<User>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'user',
    schema,
    empty: {
      name: '',
      email: '',
      phone: '',
      role_id: '',
      password: '',
      airline_id: '',
      airport_id: '',
      agency_id: '',
      is_active: true,
    },
    fromRow: (r) => ({
      name: r.name,
      email: r.email,
      phone: r.phone ?? '',
      role_id: String(r.role.id),
      password: '',
      airline_id: r.airline ? String(r.airline.id) : '',
      airport_id: r.airport ? String(r.airport.id) : '',
      agency_id: r.agency ? String(r.agency.id) : '',
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        gridCols: 1,
      },
      { name: 'phone', label: 'Phone', type: 'text', gridCols: 1 },
      {
        name: 'role_id',
        label: 'Role',
        type: 'select',
        loadOptions: userService.roleOptions,
        required: true,
        gridCols: 1,
      },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        placeholder: 'New user: required · edit: leave empty to keep',
        gridCols: 1,
      },
      {
        name: 'airline_id',
        label: 'Airline (airline & station staff)',
        type: 'select',
        options: [{ label: 'None', value: '' }],
        loadOptions: airlineOptions,
        gridCols: 1,
      },
      {
        name: 'airport_id',
        label: 'Station (station / gate agents)',
        type: 'select',
        options: [{ label: 'None', value: '' }],
        loadOptions: airportOptions,
        gridCols: 1,
      },
      {
        name: 'agency_id',
        label: 'Agency (agency users)',
        type: 'select',
        options: [{ label: 'None', value: '' }],
        loadOptions: agencyOptions,
        gridCols: 1,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 1 },
    ],
    create: (v) => {
      if (!v.password) throw new Error('Password is required for a new user')
      return userService.create(v)
    },
    update: (row, v) => userService.update(row.id, v),
  },
  remove: { run: (r) => userService.remove(r.id), label: (r) => r.email },
}
