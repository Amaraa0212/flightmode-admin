import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { AgencyAccess } from '@/features/company/agency-access'

export const Route = createFileRoute('/_authenticated/company/agency-access/')({
  validateSearch: listSearchSchema,
  component: AgencyAccess,
})
