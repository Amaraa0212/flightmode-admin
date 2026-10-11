import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Users } from '@/features/access/users'

export const Route = createFileRoute('/_authenticated/access/users/')({
  validateSearch: withFilters('scope', 'is_active'),
  component: Users,
})
