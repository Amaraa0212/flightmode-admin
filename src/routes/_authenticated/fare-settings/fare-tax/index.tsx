import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { FareFareTax } from '@/features/fare-settings/fare-tax'

export const Route = createFileRoute('/_authenticated/fare-settings/fare-tax/')(
  {
    validateSearch: z.object({
      from: z.number().optional(),
      to: z.number().optional(),
    }),
    component: FareFareTax,
  }
)
