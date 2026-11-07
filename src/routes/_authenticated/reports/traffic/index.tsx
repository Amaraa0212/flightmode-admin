import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { withFilters } from '@/lib/list-search'
import { TrafficReport } from '@/features/reports/traffic'

export const Route = createFileRoute('/_authenticated/reports/traffic/')({
  validateSearch: withFilters('service_type').extend({
    origin: z.string().optional(),
    destination: z.string().optional(),
    /** OW: this direction only, RT: both */
    trip: z.enum(['OW', 'RT']).optional(),
  }),
  component: TrafficReport,
})
