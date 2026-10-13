import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Modifications } from '@/features/fare-settings/modifications'

export const Route = createFileRoute(
  '/_authenticated/fare-settings/modifications/'
)({
  validateSearch: withFilters('type'),
  component: Modifications,
})
