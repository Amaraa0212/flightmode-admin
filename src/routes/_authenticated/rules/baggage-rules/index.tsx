import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { BaggageRules } from '@/features/rules/baggage-rules'

export const Route = createFileRoute('/_authenticated/rules/baggage-rules/')({
  validateSearch: withFilters('usage', 'type', 'cabin_class', 'is_active'),
  component: BaggageRules,
})
