import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { FlightLoad } from '@/features/operations/flight-load'

export const Route = createFileRoute('/_authenticated/operations/flight-load/')(
  {
    validateSearch: withFilters('status'),
    component: FlightLoad,
  }
)
