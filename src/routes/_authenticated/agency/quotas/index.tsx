import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { AgencyQuotas } from '@/features/agency/quotas'

export const Route = createFileRoute('/_authenticated/agency/quotas/')({
  validateSearch: withFilters('status'),
  component: AgencyQuotas,
})
