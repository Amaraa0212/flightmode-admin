import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { PnlReport } from '@/features/reports/pnl'

export const Route = createFileRoute('/_authenticated/reports/pnl/')({
  validateSearch: z.object({
    flight: z.number().optional(),
    /** report = flown / no-show / go-show (default), telex = the PNL text */
    view: z.enum(['report', 'telex']).optional(),
  }),
  component: PnlReport,
})
