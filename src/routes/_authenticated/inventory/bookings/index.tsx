import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Bookings } from '@/features/inventory/bookings'

export const Route = createFileRoute('/_authenticated/inventory/bookings/')({
  validateSearch: withFilters('status', 'source'),
  component: Bookings,
})
