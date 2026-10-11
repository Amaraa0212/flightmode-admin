import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { FlightManager } from '@/features/dcs/flight-manager'

export const Route = createFileRoute('/_authenticated/dcs/flight-manager/')({
  validateSearch: withFilters('status'),
  component: FlightManager,
})
