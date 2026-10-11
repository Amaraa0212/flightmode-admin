import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { CheckinHierarchy } from '@/features/rules/checkin-hierarchy'

export const Route = createFileRoute(
  '/_authenticated/rules/checkin-hierarchy/'
)({
  validateSearch: z.object({ aircraft: z.number().optional() }),
  component: CheckinHierarchy,
})
