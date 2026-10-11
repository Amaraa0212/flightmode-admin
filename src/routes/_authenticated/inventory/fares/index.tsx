import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Fares } from '@/features/inventory/fares'

export const Route = createFileRoute('/_authenticated/inventory/fares/')({
  validateSearch: withFilters('cabin_class', 'trip_type', 'is_active'),
  component: Fares,
})
