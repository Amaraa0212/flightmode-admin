import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { Templates } from '@/features/rules/templates'

export const Route = createFileRoute('/_authenticated/rules/templates/')({
  validateSearch: listSearchSchema,
  component: Templates,
})
