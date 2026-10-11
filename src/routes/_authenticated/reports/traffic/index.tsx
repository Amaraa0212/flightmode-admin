import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { TrafficReport } from '@/features/reports/traffic'

export const Route = createFileRoute('/_authenticated/reports/traffic/')({
  validateSearch: listSearchSchema,
  component: TrafficReport,
})
