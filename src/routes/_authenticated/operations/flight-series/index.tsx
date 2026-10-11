import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { FlightSeries } from '@/features/operations/flight-series'

export const Route = createFileRoute(
  '/_authenticated/operations/flight-series/'
)({
  validateSearch: listSearchSchema,
  component: FlightSeries,
})
