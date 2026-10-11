import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SeatMaps } from '@/features/fleet/seat-maps'

export const Route = createFileRoute('/_authenticated/fleet/seat-maps/')({
  validateSearch: z.object({ aircraft: z.number().optional() }),
  component: SeatMaps,
})
