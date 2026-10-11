import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { SalesReport } from '@/features/reports/sales'

export const Route = createFileRoute('/_authenticated/reports/sales/')({
  validateSearch: listSearchSchema,
  component: SalesReport,
})
