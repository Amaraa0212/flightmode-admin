import { createFileRoute } from '@tanstack/react-router'
import { AgencyAccount } from '@/features/agency/account'

export const Route = createFileRoute('/_authenticated/agency/account/')({
  component: AgencyAccount,
})
