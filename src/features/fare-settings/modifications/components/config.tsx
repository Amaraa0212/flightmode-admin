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

const TIME_UNITS = [
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
]
const PENALTY_KINDS = [
  { label: 'No penalty', value: 'none' },
  { label: 'Fixed amount', value: 'amount' },
  { label: 'Percentage of the fare', value: 'percentage' },
]
const CURRENCIES = ['MNT', 'USD', 'EUR', 'CNY', 'KRW', 'JPY', 'RUB'].map(
  (c) => ({ label: c, value: c })
)

/** Stored in hours; shown in days when it is whole days */
const timeframeLabel = (hours: number) =>
  hours && hours % 24 === 0 ? `< ${hours / 24} d` : `< ${hours} h`

const schema = z
  .object({
    rbd_id: z.string().min(1, 'Select an RBD'),
    type: z.string().min(1),
    timeframe: z.number().int().min(0),
    timeframe_unit: z.enum(['hours', 'days']),
    penalty: z.enum(['none', 'amount', 'percentage']),
    amount: z.number().min(0),
    currency: z.string(),
    percentage: z.number().int().min(0).max(100),
    is_allowed: z.boolean(),
  })
  .refine((v) => v.penalty !== 'amount' || v.currency.length === 3, {
    path: ['currency'],
    message: 'Choose the currency',
  })
type Form = z.infer<typeof schema>

// one of amount (with its currency) or percentage; the API refuses both
const toPayload = (v: Form) => ({
  rbd_id: Number(v.rbd_id),
  type: v.type,
  timeframe_hours: v.timeframe_unit === 'days' ? v.timeframe * 24 : v.timeframe,
  amount: v.penalty === 'amount' ? v.amount : null,
  currency: v.penalty === 'amount' ? v.currency : null,
  percentage: v.penalty === 'percentage' ? v.percentage : null,
  is_allowed: v.is_allowed,
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
      mono(timeframeLabel(r.timeframe_hours))
    ),
    col<RbdModification>('amount', 'Amount', (r) =>
      r.amount === null
        ? muted('-')
        : mono(
            `${Number(r.amount).toLocaleString('en-US')} ${r.currency ?? ''}`
          )
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
    description:
      'The penalty is a fixed amount or a percentage of the fare. The timeframe is saved in hours.',
    empty: {
      rbd_id: '',
      type: 'REFUND',
      timeframe: 24,
      timeframe_unit: 'hours',
      penalty: 'percentage',
      amount: 0,
      currency: 'MNT',
      percentage: 0,
      is_allowed: true,
    },
    fromRow: (r) => {
      const days = r.timeframe_hours > 0 && r.timeframe_hours % 24 === 0
      return {
        rbd_id: String(r.rbd_id),
        type: r.type,
        timeframe: days ? r.timeframe_hours / 24 : r.timeframe_hours,
        timeframe_unit: days ? 'days' : 'hours',
        penalty:
          r.amount !== null
            ? 'amount'
            : r.percentage !== null
              ? 'percentage'
              : 'none',
        amount: Number(r.amount ?? 0),
        currency: r.currency ?? 'MNT',
        percentage: r.percentage ?? 0,
        is_allowed: r.is_allowed,
      }
    },
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
        name: 'timeframe',
        label: 'Timeframe (before departure)',
        type: 'number',
        min: '0',
        gridCols: 2,
      },
      {
        name: 'timeframe_unit',
        label: 'Unit',
        type: 'select',
        options: TIME_UNITS,
        gridCols: 2,
      },
      {
        name: 'penalty',
        label: 'Penalty',
        type: 'select',
        options: PENALTY_KINDS,
        gridCols: 1,
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        min: '0',
        gridCols: 2,
        showWhen: { field: 'penalty', value: 'amount' },
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'select',
        options: CURRENCIES,
        gridCols: 2,
        showWhen: { field: 'penalty', value: 'amount' },
      },
      {
        name: 'percentage',
        label: 'Percentage (%)',
        type: 'number',
        min: '0',
        gridCols: 2,
        showWhen: { field: 'penalty', value: 'percentage' },
      },
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
