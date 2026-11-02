import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { AgencyManageBookings } from '@/features/agency/manage'

export const Route = createFileRoute('/_authenticated/agency/bookings/')({
  validateSearch: z.object({ q: z.string().optional() }),
  component: AgencyManageBookings,
})
