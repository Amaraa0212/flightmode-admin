import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Agencies } from '@/features/company/agencies'

export const Route = createFileRoute('/_authenticated/company/agencies/')({
  validateSearch: withFilters('is_active', 'api_enabled'),
  component: Agencies,
})
