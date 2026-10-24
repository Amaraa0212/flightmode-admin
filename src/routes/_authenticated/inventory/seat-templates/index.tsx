import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SeatTemplates } from '@/features/inventory/seat-templates'

export const Route = createFileRoute(
  '/_authenticated/inventory/seat-templates/'
)({
  validateSearch: z.object({ template: z.number().optional() }),
  component: SeatTemplates,
})
