import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { FlightProducts } from '@/features/rules/flight-products'

export const Route = createFileRoute('/_authenticated/rules/flight-products/')({
  validateSearch: listSearchSchema,
  component: FlightProducts,
})
