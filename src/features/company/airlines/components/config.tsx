import { z } from 'zod'
import { airlineService, type Airline, type AirlinePayload } from '@/services'
import { ACTIVE_OPTIONS } from '@/constants/status'
import type { FormFieldConfig } from '@/components/ui/config-form-dialog'
import { brand, col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  iata_code: z.string().trim().length(2, '2 letters'),
  icao_code: z.string().trim().length(3, '3 letters'),
  numeric_code: z
    .string()
    .trim()
    .regex(/^\d{3}$/, '3 digits (ticket / bag tag prefix)'),
  email: z.email(),
  phone: z.string().trim().min(5),
  address: z.string().trim(),
  currency: z.string().trim().length(3),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

/** Codes, name, currency and status: system administrators only (the API ignores them for airline users) */
const SYSTEM_ONLY: (keyof Form)[] = [
  'name',
  'iata_code',
  'icao_code',
  'numeric_code',
  'currency',
  'is_active',
]

export const airlinePageConfig = (
  isSystemAdmin: boolean
): Omit<ResourcePageProps<Airline, Form>, 'search' | 'navigate'> => ({
  title: 'Company',
  description:
    'Airlines operating in FlightMode — codes, contacts and ticket prefix',
  queryKey: 'admin-airlines',
  list: airlineService.list,
  searchPlaceholder: 'Name, IATA / ICAO code, email',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'airlines.xlsx',
  columns: [
    col<Airline>('name', 'Airline', (r) => (
      <div className='flex items-center gap-2'>
        <span
          className='size-3 rounded-full'
          style={{ background: r.brand_color }}
        />
        <span className='font-medium'>{r.name}</span>
      </div>
    )),
    col<Airline>('iata_code', 'IATA / ICAO', (r) =>
      brand(`${r.iata_code} / ${r.icao_code}`)
    ),
    col<Airline>('numeric_code', 'Numeric', (r) => mono(r.numeric_code)),
    col<Airline>('email', 'Email', (r) => muted(r.email)),
    col<Airline>('phone', 'Phone', (r) => mono(r.phone)),
    col<Airline>('registration_no', 'Registration', (r) =>
      mono(r.registration_no)
    ),
    col<Airline>('agencies_count', 'Agencies', (r) => mono(r.agencies_count)),
    col<Airline>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
  ],
  form: {
    entity: 'airline',
    schema,
    empty: {
      name: '',
      iata_code: '',
      icao_code: '',
      numeric_code: '',
      email: '',
      phone: '',
      address: '',
      currency: 'MNT',
      is_active: true,
    },
    fromRow: (r) => ({
      name: r.name,
      iata_code: r.iata_code,
      icao_code: r.icao_code,
      numeric_code: r.numeric_code,
      email: r.email,
      phone: r.phone,
      address: r.address ?? '',
      currency: r.currency,
      is_active: r.is_active,
    }),
    fields: (
      [
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          gridCols: 2,
        },
        {
          name: 'iata_code',
          label: 'IATA code',
          type: 'text',
          required: true,
          gridCols: 1,
        },
        {
          name: 'icao_code',
          label: 'ICAO code',
          type: 'text',
          required: true,
          gridCols: 1,
        },
        {
          name: 'numeric_code',
          label: 'Numeric code',
          type: 'text',
          required: true,
          gridCols: 1,
        },
        {
          name: 'currency',
          label: 'Currency',
          type: 'text',
          required: true,
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
          label: 'Official address',
          type: 'text',
          gridCols: 2,
        },
        { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
      ] satisfies FormFieldConfig<Form>[]
    ).map((f) =>
      !isSystemAdmin && SYSTEM_ONLY.includes(f.name as keyof Form)
        ? { ...f, disabled: true }
        : f
    ),
    create: (v) => airlineService.create(v as AirlinePayload),
    update: (row, v) => airlineService.update(row.id, v as AirlinePayload),
  },
  remove: isSystemAdmin
    ? { run: (r) => airlineService.remove(r.id), label: (r) => r.name }
    : undefined,
})
