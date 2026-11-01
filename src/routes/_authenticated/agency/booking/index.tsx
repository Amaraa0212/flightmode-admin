import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AgencyBooking } from '@/features/agency/booking'

export const Route = createFileRoute('/_authenticated/agency/booking/')({
  // cmd: command line search from the home page (UBNICN25DEC)
  validateSearch: z.object({ cmd: z.string().optional() }),
  component: AgencyBooking,
})
