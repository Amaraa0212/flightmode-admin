import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { RbdFareClass } from '@/features/fare-settings/rbd-fare-class'

export const Route = createFileRoute(
  '/_authenticated/fare-settings/rbd-fare-class/'
)({
  validateSearch: z.object({ rbd: z.number().optional() }),
  component: RbdFareClass,
})
