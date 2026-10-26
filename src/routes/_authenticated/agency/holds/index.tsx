import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AgencyHolds } from '@/features/agency/holds'

export const Route = createFileRoute('/_authenticated/agency/holds/')({
  validateSearch: z.object({ status: z.enum(['active', 'all']).optional() }),
  component: AgencyHolds,
})
