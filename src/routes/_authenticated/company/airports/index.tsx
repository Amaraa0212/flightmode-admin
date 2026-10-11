import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Airports } from '@/features/company/airports'

export const Route = createFileRoute('/_authenticated/company/airports/')({
  validateSearch: withFilters('is_active'),
  component: Airports,
})
