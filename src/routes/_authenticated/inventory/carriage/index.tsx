import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Carriage } from '@/features/inventory/carriage'

export const Route = createFileRoute('/_authenticated/inventory/carriage/')({
  validateSearch: z.object({ airline: z.number().optional() }),
  component: Carriage,
})
