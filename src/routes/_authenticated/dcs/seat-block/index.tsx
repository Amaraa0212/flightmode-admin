import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SeatBlock } from '@/features/dcs/seat-block'

export const Route = createFileRoute('/_authenticated/dcs/seat-block/')({
  validateSearch: z.object({ flight: z.number().optional() }),
  component: SeatBlock,
})
