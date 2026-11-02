import { z } from 'zod'
import { fareFamilyService, type FareFamily } from '@/services'
import { ACTIVE_OPTIONS } from '@/constants/status'
import { col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{1,20}$/, 'A-Z / 0-9 / _, max 20'),
  name: z.string().trim().min(1, 'Required').max(255),
  description: z.string().max(255),
  rank: z.number().int().min(0).max(999),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

export const pageConfig: Omit<
  ResourcePageProps<FareFamily, Form>,
  'search' | 'navigate'
> = {
  title: 'Fare Family',
  description:
    'Fare families (e.g. BASIC, STANDARD, FLEX). Booking classes are assigned to a family on the Booking Class - Fare Base page.',
  queryKey: 'admin-fare-families',
  list: fareFamilyService.list,
  searchPlaceholder: 'Code or name',
  filters: [
    { columnId: 'is_active', title: 'Status', options: ACTIVE_OPTIONS },
  ],
  exportFileName: 'fare-families.xlsx',
  columns: [
    col<FareFamily>('code', 'Code', (r) => mono(r.code, 'font-semibold')),
    col<FareFamily>('name', 'Name', (r) => r.name),
    col<FareFamily>('description', 'Description', (r) =>
      muted(r.description || '-')
    ),
    col<FareFamily>('rank', 'Rank', (r) => mono(String(r.rank))),
    col<FareFamily>(
      'rbds',
      'Booking classes',
      (r) => mono(r.rbds?.length ? r.rbds.join(' · ') : '-'),
      { accessor: (r) => (r.rbds ?? []).join(' ') }
    ),
    col<FareFamily>(
      'is_active',
      'Status',
      (r) => <ActiveBadge active={r.is_active} />,
      {
        accessor: (r) => String(r.is_active),
      }
    ),
  ],
  form: {
    entity: 'fare family',
    schema,
    maxWidth: 'md',
    empty: { code: '', name: '', description: '', rank: 0, is_active: true },
    fromRow: (r) => ({
      code: r.code,
      name: r.name,
      description: r.description ?? '',
      rank: r.rank,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'code',
        label: 'Code',
        type: 'text',
        required: true,
        placeholder: 'FLEX',
        gridCols: 2,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        placeholder: 'Flex',
        gridCols: 2,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 2,
        gridCols: 1,
      },
      { name: 'rank', label: 'Rank', type: 'number', min: '0', gridCols: 2 },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) => fareFamilyService.create(v),
    update: (row, v) => fareFamilyService.update(row.id, v),
  },
  remove: {
    run: (r) => fareFamilyService.remove(r.id),
    label: (r) => r.code,
  },
}
