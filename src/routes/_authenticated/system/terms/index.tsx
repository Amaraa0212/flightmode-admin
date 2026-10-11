import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Terms } from '@/features/system/terms'

export const Route = createFileRoute('/_authenticated/system/terms/')({
  validateSearch: withFilters('type', 'locale'),
  component: Terms,
})
