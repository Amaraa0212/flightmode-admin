import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { PaxSearch } from '@/features/reports/pax-search'

export const Route = createFileRoute('/_authenticated/reports/pax-search/')({
  validateSearch: listSearchSchema,
  component: PaxSearch,
})
