import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { Roles } from '@/features/access/roles'

export const Route = createFileRoute('/_authenticated/access/roles/')({
  validateSearch: listSearchSchema,
  component: Roles,
})
