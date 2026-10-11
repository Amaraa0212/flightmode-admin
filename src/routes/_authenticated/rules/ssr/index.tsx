import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { SsrCodes } from '@/features/rules/ssr'

export const Route = createFileRoute('/_authenticated/rules/ssr/')({
  validateSearch: withFilters('category'),
  component: SsrCodes,
})
