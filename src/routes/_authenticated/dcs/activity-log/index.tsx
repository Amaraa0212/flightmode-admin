import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { withFilters } from '@/lib/list-search'
import { ActivityLog } from '@/features/dcs/activity-log'

export const Route = createFileRoute('/_authenticated/dcs/activity-log/')({
  validateSearch: withFilters('channel').extend({
    flight: z.string().optional(),
    passenger: z.string().optional(),
  }),
  component: ActivityLog,
})
