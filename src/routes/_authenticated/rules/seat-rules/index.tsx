import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { SeatRules } from '@/features/rules/seat-rules'

export const Route = createFileRoute('/_authenticated/rules/seat-rules/')({
  validateSearch: withFilters('cabin_class', 'is_active'),
  component: SeatRules,
})
