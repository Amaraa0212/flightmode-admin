import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { FareInfo } from '@/features/reports/fare-info'

export const Route = createFileRoute('/_authenticated/reports/fare-info/')({
  validateSearch: withFilters('cabin_class'),
  component: FareInfo,
})
