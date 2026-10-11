import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { CharterRequests } from '@/features/requests/charter'

export const Route = createFileRoute('/_authenticated/requests/charter/')({
  validateSearch: withFilters('status'),
  component: CharterRequests,
})
