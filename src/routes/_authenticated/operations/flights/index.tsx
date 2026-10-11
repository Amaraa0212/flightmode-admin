import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Flights } from '@/features/operations/flights'

export const Route = createFileRoute('/_authenticated/operations/flights/')({
  validateSearch: withFilters('status'),
  component: Flights,
})
