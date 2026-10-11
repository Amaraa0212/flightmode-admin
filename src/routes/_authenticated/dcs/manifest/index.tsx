import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Manifest } from '@/features/dcs/manifest'

export const Route = createFileRoute('/_authenticated/dcs/manifest/')({
  validateSearch: z.object({ flight: z.number().optional() }),
  component: Manifest,
})
