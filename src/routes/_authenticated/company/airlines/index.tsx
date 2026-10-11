import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Airlines } from '@/features/company/airlines'

export const Route = createFileRoute('/_authenticated/company/airlines/')({
  validateSearch: withFilters('is_active'),
  component: Airlines,
})
