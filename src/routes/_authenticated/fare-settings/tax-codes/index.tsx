import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { TaxCodes } from '@/features/fare-settings/tax-codes'

export const Route = createFileRoute(
  '/_authenticated/fare-settings/tax-codes/'
)({
  validateSearch: withFilters('is_active'),
  component: TaxCodes,
})
