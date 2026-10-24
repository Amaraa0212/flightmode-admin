import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SeatAllocations } from '@/features/inventory/seat-allocations'

export const Route = createFileRoute(
  '/_authenticated/inventory/seat-allocations/'
)({
  validateSearch: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    flight_number: z.string().optional(),
    flight: z.number().optional(),
  }),
  component: SeatAllocations,
})
