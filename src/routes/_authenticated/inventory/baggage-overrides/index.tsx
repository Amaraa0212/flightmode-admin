import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { BaggageOverrides } from '@/features/inventory/baggage-overrides'

export const Route = createFileRoute(
  '/_authenticated/inventory/baggage-overrides/'
)({
  validateSearch: listSearchSchema,
  component: BaggageOverrides,
})
