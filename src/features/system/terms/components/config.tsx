import { z } from 'zod'
import { policyDocumentService, type PolicyDocument } from '@/services'
import { col, dateTime, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { ActiveBadge } from '@/components/status-badge'

const schema = z.object({
  title: z.string().trim().min(2),
  body: z.string().trim().min(3),
  type: z.enum(['cabin', 'checked']),
  locale: z.enum(['mn', 'en']),
  is_active: z.boolean(),
})
type Form = z.infer<typeof schema>

const TYPES = [
  { label: 'Cabin baggage', value: 'cabin' },
  { label: 'Checked baggage', value: 'checked' },
]
const LOCALES = [
  { label: 'Монгол', value: 'mn' },
  { label: 'English', value: 'en' },
]

export const pageConfig: Omit<
  ResourcePageProps<PolicyDocument, Form>,
  'search' | 'navigate'
> = {
  title: 'Terms & conditions',
  description:
    'Baggage policy texts shown in booking, e-ticket and online check-in',
  queryKey: 'admin-terms',
  list: policyDocumentService.list,
  searchPlaceholder: 'Title or text',
  filters: [
    { columnId: 'type', title: 'Type', options: TYPES },
    { columnId: 'locale', title: 'Lang', options: LOCALES },
  ],
  columns: [
    col<PolicyDocument>('title', 'Title', (r) => (
      <div className='max-w-md'>
        <p className='font-medium'>{r.title}</p>
        <p className='text-muted-foreground truncate text-xs'>{r.body}</p>
      </div>
    )),
    col<PolicyDocument>('type', 'Type', (r) =>
      muted(r.type === 'cabin' ? 'Cabin' : 'Checked')
    ),
    col<PolicyDocument>('locale', 'Lang', (r) => mono(r.locale.toUpperCase())),
    col<PolicyDocument>(
      'is_active',
      'Active',
      (r) => <ActiveBadge active={r.is_active} />,
      { accessor: (r) => String(r.is_active) }
    ),
    col<PolicyDocument>('created_at', 'Created at', (r) =>
      dateTime(r.created_at)
    ),
  ],
  form: {
    entity: 'document',
    schema,
    maxWidth: 'xl',
    empty: {
      title: '',
      body: '',
      type: 'cabin',
      locale: 'mn',
      is_active: true,
    },
    fromRow: (r) => ({
      title: r.title,
      body: r.body,
      type: r.type,
      locale: r.locale,
      is_active: r.is_active,
    }),
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        gridCols: 2,
      },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: TYPES,
        gridCols: 1,
      },
      {
        name: 'locale',
        label: 'Language',
        type: 'select',
        options: LOCALES,
        gridCols: 1,
      },
      {
        name: 'body',
        label: 'Text',
        type: 'textarea',
        rows: 8,
        required: true,
        gridCols: 2,
      },
      { name: 'is_active', label: 'Active', type: 'checkbox', gridCols: 2 },
    ],
    create: (v) => policyDocumentService.create(v),
    update: (row, v) => policyDocumentService.update(row.id, v),
  },
  remove: {
    run: (r) => policyDocumentService.remove(r.id),
    label: (r) => r.title,
  },
}
