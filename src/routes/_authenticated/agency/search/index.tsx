import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AgencySearch } from '@/features/agency/search'

export const Route = createFileRoute('/_authenticated/agency/search/')({
  validateSearch: z.object({ date: z.string().optional() }),
  component: AgencySearch,
})
