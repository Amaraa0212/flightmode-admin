import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { Allocations } from '@/features/operations/allocations'

export const Route = createFileRoute('/_authenticated/operations/allocations/')(
  {
    validateSearch: listSearchSchema,
    component: Allocations,
  }
)
