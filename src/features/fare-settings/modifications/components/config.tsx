import { z } from 'zod'
import {
  rbdModificationService,
  rbdOptions,
  type RbdModification,
} from '@/services'
import { col, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { YN } from '../../shared'

export const MODIFICATION_TYPES = [
  { label: 'Refund', value: 'REFUND' },
  { label: 'Name change', value: 'NAME_CHANGE' },
  { label: 'Date change', value: 'DATE_CHANGE' },
  { label: 'Route change', value: 'ROUTE_CHANGE' },
  { label: 'Cancel', value: 'CANCEL' },
  { label: 'No-show', value: 'NOSHOW' },
]
const typeLabel = (v: string) =>
  MODIFICATION_TYPES.find((t) => t.value === v)?.label ?? v

const schema = z.object({
  rbd_id: z.string().min(1, 'Select an RBD'),
  type: z.string().min(1),
  timeframe_hours: z.number().int().min(0),
  amount: z.number().min(0),
  percentage: z.number().int().min(0).max(100),
  is_allowed: z.boolean(),
})
type Form = z.infer<typeof schema>

const toPayload = (v: Form) => ({
  ...v,
  rbd_id: Number(v.rbd_id),
  // 0 = not used
  amount: v.amount || null,
  percentage: v.percentage || null,
})

export const pageConfig: Omit<
  ResourcePageProps<RbdModification, Form>,
  'search' | 'navigate'
> = {
  title: 'Modification',
  description:
    'Refund / change / cancel / no-show penalty per RBD, applied within the timeframe before departure',
  queryKey: 'admin-rbd-modifications',
  list: rbdModificationService.list,
  searchPlaceholder: 'Search',
  filters: [{ columnId: 'type', title: 'Type', options: MODIFICATION_TYPES }],
  exportFileName: 'modifications.xlsx',
  columns: [
    col<RbdModification>('rbd_code', 'RBD', (r) =>
      mono(`${r.rbd_code} · ${r.cabin_class}`, 'font-semibold')
    ),
    col<RbdModification>('type', 'Type', (r) => typeLabel(r.type)),
    col<RbdModification>('timeframe_hours', 'Timeframe', (r) =>
      mono(`< ${r.timeframe_hours} h`)
    ),
    col<RbdModification>('amount', 'Amount', (r) =>
      r.amount === null
        ? muted('-')
        : mono(Number(r.amount).toLocaleString('en-US'))
    ),
    col<RbdModification>('percentage', 'Percentage', (r) =>
      r.percentage === null ? muted('-') : mono(`${r.percentage}%`)
    ),
    col<RbdModification>(
      'is_allowed',
      'Allowed',
      (r) => <YN value={r.is_allowed} />,
      {
        accessor: (r) => String(r.is_allowed),
      }
    ),
  ],
  form: {
    entity: 'modification rule',
    schema,
    maxWidth: 'lg',
    description: 'Leave amount or percentage 0 when not used.',
    empty: {
      rbd_id: '',
      type: 'REFUND',
      timeframe_hours: 24,
      amount: 0,
      percentage: 0,
      is_allowed: true,
    },
    fromRow: (r) => ({
      rbd_id: String(r.rbd_id),
      type: r.type,
      timeframe_hours: r.timeframe_hours,
      amount: Number(r.amount ?? 0),
      percentage: r.percentage ?? 0,
      is_allowed: r.is_allowed,
    }),
    fields: [
      {
        name: 'rbd_id',
        label: 'RBD',
        type: 'select',
        required: true,
        loadOptions: rbdOptions,
        gridCols: 2,
      },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: MODIFICATION_TYPES,
        gridCols: 2,
      },
      {
        name: 'timeframe_hours',
        label: 'Timeframe (hours before departure)',
        type: 'number',
        gridCols: 1,
      },
      { name: 'amount', label: 'Amount', type: 'number', gridCols: 2 },
      { name: 'percentage', label: 'Percentage', type: 'number', gridCols: 2 },
      { name: 'is_allowed', label: 'Allowed', type: 'checkbox', gridCols: 1 },
    ],
    create: (v) => rbdModificationService.create(toPayload(v)),
    update: (row, v) => rbdModificationService.update(row.id, toPayload(v)),
  },
  remove: {
    run: (r) => rbdModificationService.remove(r.id),
    label: (r) => `${r.rbd_code} ${typeLabel(r.type)}`,
  },
}
