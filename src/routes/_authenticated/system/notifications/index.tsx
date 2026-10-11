import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { Notifications } from '@/features/system/notifications'

export const Route = createFileRoute('/_authenticated/system/notifications/')({
  validateSearch: withFilters('is_required'),
  component: Notifications,
})
