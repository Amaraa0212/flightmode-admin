import { z } from 'zod'
import { agencyService, type Agency } from '@/services'
import { ACTIVE_OPTIONS } from '@/constants/status'
import { Badge } from '@/components/ui/badge'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().min(5),
  address: z.string().trim(),
  registration_no: z.string().trim(),
  api_enabled: z.boolean(),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

const API_OPTIONS = [
  { label: 'API enabled', value: 'true' },
  { label: 'Portal only', value: 'false' },
]

export const pageConfig: Omit<
  ResourcePageProps<Agency, Form>,
  'search' | 'navigate'
> = {
  title: 'Agencies',
  description: 'Travel agencies selling allocations (portal and partner API)',
  queryKey: 'admin-agencies',
  list: agencyService.list,
  searchPlaceholder: 'Name, code, email, registration',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
    { columnId: 'api_enabled', title: 'API', options: API_OPTIONS },
  ],
  exportFileName: 'agencies.xlsx',
  columns: [
    col<Agency>('code', 'Code', (r) => brand(r.code)),
    col<Agency>('name', 'Agency', (r) => (
      <span className='font-medium'>{r.name}</span>
    )),
    col<Agency>('email', 'Email', (r) => muted(r.email)),
    col<Agency>('phone', 'Phone', (r) => mono(r.phone)),
    col<Agency>('registration_no', 'Registration', (r) =>
      mono(r.registration_no)
    ),
    col<Agency>(
      'airlines',
      'Contracts',
      (r) => (
        <div className='flex flex-wrap gap-1'>
          {r.airlines.map((a) => (
            <Badge key={a.id} variant='outline' className='text-[10px]'>
              {a.name.split(' ')[0]}
            </Badge>
          ))}
        </div>
      ),
      { accessor: (r) => r.airlines.map((a) => a.name).join(', ') }
    ),
    col<Agency>(
      'api_enabled',
      'API',
      (r) => (r.api_enabled ? brand('API') : muted('Portal')),
      { accessor: (r) => String(r.api_enabled) }
    ),
    col<Agency>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'agency',
    schema,
    empty: {
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      registration_no: '',
      api_enabled: false,
      is_active: true,
    },
    fromRow: (r) => ({
      name: r.name,
      code: r.code,
      email: r.email,
      phone: r.phone,
      address: r.address,
      registration_no: r.registration_no,
      api_enabled: r.api_enabled,
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
        name: 'code',
        label: 'Code',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'registration_no',
        label: 'Registration no',
        type: 'text',
        gridCols: 1,
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        required: true,
        gridCols: 1,
      },
      {
        name: 'phone',
        label: 'Phone',
        type: 'text',
        required: true,
        gridCols: 1,
      },
      {
        name: 'address',
        label: 'Address',
        type: 'textarea',
        rows: 2,
        gridCols: 2,
      },
      {
        name: 'api_enabled',
        label: 'Partner API enabled',
        type: 'checkbox',
        gridCols: 1,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 1 },
    ],
    create: (v) => agencyService.create(v),
    update: (row, v) => agencyService.update(row.id, v),
  },
  remove: { run: (r) => agencyService.remove(r.id), label: (r) => r.name },
}
