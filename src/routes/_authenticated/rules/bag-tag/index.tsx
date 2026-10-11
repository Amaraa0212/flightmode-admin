import { createFileRoute } from '@tanstack/react-router'
import { listSearchSchema } from '@/lib/list-search'
import { BagTagPosition } from '@/features/rules/bag-tag'

export const Route = createFileRoute('/_authenticated/rules/bag-tag/')({
  validateSearch: listSearchSchema,
  component: BagTagPosition,
})
