import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PnlReport } from '@/features/reports/pnl'

export const Route = createFileRoute('/_authenticated/reports/pnl/')({
  validateSearch: z.object({ flight: z.number().optional() }),
  component: PnlReport,
})
