import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { FareFamilies } from '@/features/fare-settings/fare-families'

export const Route = createFileRoute(
  '/_authenticated/fare-settings/fare-families/'
)({
  validateSearch: withFilters('is_active'),
  component: FareFamilies,
})
