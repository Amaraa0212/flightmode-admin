import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { StationReport } from '@/features/reports/station'

export const Route = createFileRoute('/_authenticated/reports/station/')({
  validateSearch: listSearchSchema,
  component: StationReport,
})
