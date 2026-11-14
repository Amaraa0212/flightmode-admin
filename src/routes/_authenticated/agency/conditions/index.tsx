import { createFileRoute } from '@tanstack/react-router'
import { AgencyConditions } from '@/features/agency/conditions'

export const Route = createFileRoute('/_authenticated/agency/conditions/')({
  component: AgencyConditions,
})
