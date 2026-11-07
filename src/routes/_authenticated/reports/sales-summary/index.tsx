import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { SalesSummary } from '@/features/reports/sales-summary'

export const Route = createFileRoute('/_authenticated/reports/sales-summary/')({
  validateSearch: listSearchSchema.extend({
    group: z.enum(['agency', 'month', 'route']).optional(),
  }),
  component: SalesSummary,
})
