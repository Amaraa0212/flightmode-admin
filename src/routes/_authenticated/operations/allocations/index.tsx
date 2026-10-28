import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { Allocations } from '@/features/operations/allocations'

export const Route = createFileRoute('/_authenticated/operations/allocations/')(
  {
    // flight (default) = quota by flight, list = one row per allocation
    validateSearch: listSearchSchema.extend({
      view: z.enum(['flight', 'list']).optional(),
    }),
    component: Allocations,
  }
)
