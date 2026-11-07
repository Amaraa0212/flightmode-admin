import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { BagTagPosition } from '@/features/rules/bag-tag'

export const Route = createFileRoute('/_authenticated/rules/bag-tag/')({
  validateSearch: z.object({ airline: z.number().optional() }),
  component: BagTagPosition,
})
