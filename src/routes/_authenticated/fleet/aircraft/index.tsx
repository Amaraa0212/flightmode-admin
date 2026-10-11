import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Fleets } from '@/features/fleet/aircraft'

export const Route = createFileRoute('/_authenticated/fleet/aircraft/')({
  validateSearch: withFilters('is_active'),
  component: Fleets,
})
