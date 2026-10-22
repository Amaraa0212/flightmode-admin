import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { IssueReports } from '@/features/system/issue-reports'

export const Route = createFileRoute('/_authenticated/system/issue-reports/')({
  validateSearch: withFilters('status'),
  component: IssueReports,
})
