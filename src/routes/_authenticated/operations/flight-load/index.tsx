import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { withFilters } from '@/lib/list-search'
import { FlightLoad } from '@/features/operations/flight-load'

export const Route = createFileRoute('/_authenticated/operations/flight-load/')(
  {
    // view: day (default) or month calendar; month = YYYY-MM
    validateSearch: withFilters('status', 'service_type').extend({
      view: z.enum(['day', 'month']).optional(),
      month: z.string().optional(),
    }),
    component: FlightLoad,
  }
)
