import { issueReportService, type IssueReport } from '@/services'
import { ISSUE_STATUS, ISSUE_STATUS_OPTIONS } from '@/constants/status'
import { chip, col, dateTime, mono, muted } from '@/components/resource/columns'
import type { ResourcePageProps } from '@/components/resource/resource-page'

export const pageConfig: Omit<ResourcePageProps<IssueReport>, 'search' | 'navigate'> = {
  title: 'Issue reports',
  description:
    'Problems users sent from the “?” help panel of every page — click one to set its status and note',
  queryKey: 'admin-issue-reports',
  list: issueReportService.list,
  searchPlaceholder: 'Message, page or user',
  filters: [{ columnId: 'status', title: 'Status', options: ISSUE_STATUS_OPTIONS }],
  exportFileName: 'issue-reports.xlsx',
  defaultPageSize: 50,
  columns: [
    col<IssueReport>('id', '#', (r) => mono(r.id)),
    col<IssueReport>('created_at', 'Sent', (r) => dateTime(r.created_at, 'MM-DD HH:mm')),
    col<IssueReport>(
      'user',
      'From',
      (r) => (
        <div className='min-w-0'>
          <p className='truncate font-medium'>{r.user?.name ?? '—'}</p>
          <p className='text-muted-foreground truncate text-xs'>
            {r.airline?.name ?? r.agency?.name ?? 'Platform'}
          </p>
        </div>
      ),
      { accessor: (r) => `${r.user?.name ?? ''} ${r.airline?.name ?? r.agency?.name ?? ''}` }
    ),
    col<IssueReport>(
      'page',
      'Page',
      (r) => (
        <div className='min-w-0'>
          <p className='truncate text-sm'>{r.page_title ?? '—'}</p>
          <p className='text-muted-foreground truncate font-mono text-xs'>{r.page_path}</p>
        </div>
      ),
      { accessor: (r) => r.page_path }
    ),
    col<IssueReport>(
      'message',
      'Message',
      (r) => <p className='line-clamp-2 max-w-md text-sm whitespace-pre-line'>{r.message}</p>,
      { accessor: (r) => r.message }
    ),
    col<IssueReport>('status', 'Status', (r) => chip(r.status, ISSUE_STATUS)),
    col<IssueReport>(
      'resolution_note',
      'Note',
      (r) => muted(r.resolution_note ?? '-'),
      { accessor: (r) => r.resolution_note ?? '' }
    ),
  ],
}
