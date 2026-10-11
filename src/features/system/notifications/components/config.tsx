import { z } from 'zod'
import {
  requiredNotificationService,
  type RequiredNotification,
} from '@/services'
import { col, dateTime, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'
import { StatusChip } from '@/components/status-chip'

const schema = z.object({
  title: z.string().trim().min(3),
  body: z.string().trim().min(3),
  agency: z.string(),
  is_required: z.boolean(),
})
type Form = z.infer<typeof schema>

const REQUIRED = {
  true: { label: 'Must acknowledge', tone: 'amber' as const },
  false: { label: 'Info', tone: 'slate' as const },
}

export const pageConfig: Omit<
  ResourcePageProps<RequiredNotification, Form>,
  'search' | 'navigate'
> = {
  title: 'Notifications',
  description:
    'Messages shown to agencies on login (required ones must be acknowledged)',
  queryKey: 'admin-notifications',
  list: requiredNotificationService.list,
  searchPlaceholder: 'Title, text or agency',
  filters: [
    {
      columnId: 'is_required',
      title: 'Required',
      options: [
        { label: 'Required', value: 'true' },
        { label: 'Info', value: 'false' },
      ],
    },
  ],
  columns: [
    col<RequiredNotification>('title', 'Title', (r) => (
      <div className='max-w-md'>
        <p className='font-medium'>{r.title}</p>
        <p className='text-muted-foreground truncate text-xs'>{r.body}</p>
      </div>
    )),
    col<RequiredNotification>('airline', 'Airline', (r) => muted(r.airline)),
    col<RequiredNotification>('agency', 'Agent', (r) =>
      muted(r.agency ?? 'All agencies')
    ),
    col<RequiredNotification>(
      'is_required',
      'Required',
      (r) => <StatusChip value={String(r.is_required)} map={REQUIRED} />,
      { accessor: (r) => String(r.is_required) }
    ),
    col<RequiredNotification>('created_by', 'Created by', (r) =>
      muted(r.created_by)
    ),
    col<RequiredNotification>('created_at', 'Created at', (r) =>
      dateTime(r.created_at)
    ),
  ],
  form: {
    entity: 'notification',
    schema,
    empty: { title: '', body: '', agency: '', is_required: false },
    fromRow: (r) => ({
      title: r.title,
      body: r.body,
      agency: r.agency ?? '',
      is_required: r.is_required,
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
        name: 'body',
        label: 'Message',
        type: 'textarea',
        rows: 5,
        required: true,
        gridCols: 2,
      },
      {
        name: 'agency',
        label: 'Agency (empty = all)',
        type: 'text',
        gridCols: 1,
      },
      {
        name: 'is_required',
        label: 'Must acknowledge',
        type: 'checkbox',
        gridCols: 1,
      },
    ],
    create: (v) => requiredNotificationService.create(v),
    update: (row, v) => requiredNotificationService.update(row.id, v),
  },
  remove: {
    run: (r) => requiredNotificationService.remove(r.id),
    label: (r) => r.title,
  },
}
