import { createFileRoute } from '@tanstack/react-router'
import { AgencyAccounts } from '@/features/company/agency-accounts'

export const Route = createFileRoute(
  '/_authenticated/company/agency-accounts/'
)({
  component: AgencyAccounts,
})
