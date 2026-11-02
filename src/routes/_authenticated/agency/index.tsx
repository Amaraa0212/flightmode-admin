import { createFileRoute } from '@tanstack/react-router'
import { AgencyHome } from '@/features/agency/home'

export const Route = createFileRoute('/_authenticated/agency/')({
  component: AgencyHome,
})
