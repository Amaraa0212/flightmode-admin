import { z } from 'zod'
import { taxCodeService, type TaxCode } from '@/services'
import { ACTIVE_OPTIONS } from '@/constants/status'
import { col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{1,10}$/, 'A-Z / 0-9, max 10'),
  name: z.string().max(255),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

export const pageConfig: Omit<
  ResourcePageProps<TaxCode, Form>,
  'search' | 'navigate'
> = {
  title: 'Tax Code',
  description:
    'Tax codes used by fare taxes (e.g. YQ fuel surcharge, MN airport fee)',
  queryKey: 'admin-tax-codes',
  list: taxCodeService.list,
  searchPlaceholder: 'Code',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'tax-codes.xlsx',
  columns: [
    col<TaxCode>('code', 'Tax code', (r) => mono(r.code, 'font-semibold')),
    col<TaxCode>('name', 'Name', (r) => muted(r.name || '-')),
    col<TaxCode>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      {
        accessor: (r) => String(r.is_active),
      }
    ),
  ],
  form: {
    entity: 'tax code',
    schema,
    maxWidth: 'md',
    empty: { code: '', name: '', is_active: true },
    fromRow: (r) => ({
      code: r.code,
      name: r.name ?? '',
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'code',
        label: 'Tax code',
        type: 'text',
        required: true,
        placeholder: 'YQ',
        gridCols: 2,
      },
      { name: 'name', label: 'Name', type: 'text', gridCols: 2 },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 1 },
    ],
    create: (v) => taxCodeService.create(v),
    update: (row, v) => taxCodeService.update(row.id, v),
  },
  remove: {
    run: (r) => taxCodeService.remove(r.id),
    label: (r) => r.code,
  },
}
